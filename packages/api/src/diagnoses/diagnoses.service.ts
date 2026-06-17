import * as crypto from 'crypto';
import NodeCache from 'node-cache';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateCampusDiagnosisDto } from './dto/create-campus-diagnosis.dto';
import { ResumesService } from '../resumes/resumes.service';
import { ParserService } from '../ai/parser.service';
import { AnalyzerService } from '../ai/analyzer.service';
import { RewriterService } from '../ai/rewriter.service';
import { ProfessionPresetsService } from '../profession-presets/profession-presets.service';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import { CreditService } from '../credit/credit.service';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { renderResumeForReview } from '../ai/prompts/analyze-profession-standard';
import { DiagnosisEventStream } from './diagnosis-event-stream';
import type {
  ParsedJD,
  MatchDimensions,
  ProfessionPreset,
  ProfessionStandardResult,
  RewriteSuggestion,
} from '../common/types';

// SSE 事件契约(与前端逐字一致):
//   queue    被并发限流排队时推送当前排位(position>0)
//   step     某真实阶段完成时推送(parsing/analyzing/suggesting + 中文文案)
//   analysis 分析完成并落库后推送(带 diagnosisId + 分析结果),核心价值前置;此刻 suggestions 仍为 []
//   done     改写完成、同行 UPDATE 后推送完整 Diagnosis 实体
//   error    任一步抛错时推送中文可读错误
export type DiagnosisStreamEvent =
  | { type: 'queue'; position: number }
  | { type: 'step'; stage: 'parsing' | 'analyzing' | 'suggesting'; label: string }
  | {
      type: 'analysis';
      diagnosisId: string;
      payload: ProfessionStandardResult | MatchDimensions;
    }
  | { type: 'done'; diagnosisId: string; diagnosis: Diagnosis }
  | { type: 'error'; message: string };

@Injectable()
export class DiagnosesService {
  private readonly logger = new Logger(DiagnosesService.name);
  private readonly jdCache = new NodeCache({ stdTTL: 7 * 24 * 3600 });

  constructor(
    @InjectRepository(Diagnosis) private readonly repo: Repository<Diagnosis>,
    @InjectRepository(AiUsage) private readonly usageRepo: Repository<AiUsage>,
    private readonly resumes: ResumesService,
    private readonly parser: ParserService,
    private readonly analyzer: AnalyzerService,
    private readonly rewriter: RewriterService,
    private readonly presets: ProfessionPresetsService,
    private readonly limiter: ConcurrencyLimiter,
    private readonly credit: CreditService,
  ) {}

  // ── 非流式(向后兼容兜底,行为保持不变)────────────────────────────────────

  async create(userId: string, dto: CreateDiagnosisDto): Promise<Diagnosis> {
    const prepared = await this.prepareJdMatch(userId, dto);
    const matchResult = await this.analyzer.analyze(
      JSON.stringify(prepared.parsedResume),
      JSON.stringify(prepared.parsedJD),
    );
    const suggestions = await this.rewriter.suggest(
      prepared.resumeText,
      dto.jd_text,
      JSON.stringify(matchResult),
    );
    const diagnosis = this.buildJdMatchEntity(userId, prepared, dto, matchResult, suggestions);
    return this.repo.save(diagnosis) as Promise<Diagnosis>;
  }

  async createProfessionStandard(
    userId: string,
    dto: CreateCampusDiagnosisDto,
  ): Promise<Diagnosis> {
    const prepared = await this.prepareProfessionStandard(userId, dto);
    const analysis = await this.analyzer.analyzeAgainstPreset(
      renderResumeForReview(prepared.parsedResume),
      prepared.preset,
      prepared.jdJson,
      prepared.parsedResume,
      prepared.resumeRawText,
    );
    const suggestions = await this.rewriter.suggestAgainstPreset(
      prepared.resumeRawText,
      prepared.preset,
      analysis,
    );
    const diagnosis = this.buildProfessionEntity(userId, prepared, dto, analysis, suggestions);
    return this.repo.save(diagnosis) as Promise<Diagnosis>;
  }

  // ── 流式(SSE):真进度 + 兜底永不丢 ─────────────────────────────────────

  /**
   * 校招职业标尺诊断 — 流式。返回的异步生成器只负责"消费"事件;真正的流水线在
   * {@link runPipeline} 里作为独立后台任务运行,**不绑定本生成器的迭代生命周期**——
   * 客户端断开后台流水线仍跑完并落库,结果永不丢。
   */
  streamCreateProfessionStandard(
    userId: string,
    dto: CreateCampusDiagnosisDto,
    endpoint: string,
  ): AsyncIterable<DiagnosisStreamEvent> {
    return this.runPipeline(userId, endpoint, async (out) => {
      const prepared = await this.prepareProfessionStandard(userId, dto);
      out.push({ type: 'step', stage: 'analyzing', label: '正在按职业标尺逐维度诊断…' });

      const analysis = await this.analyzer.analyzeAgainstPreset(
        renderResumeForReview(prepared.parsedResume),
        prepared.preset,
        prepared.jdJson,
        prepared.parsedResume,
        prepared.resumeRawText,
      );

      // 不变量:analysis 事件发出前诊断行必须已落库(suggestions 暂空),diagnosisId 一到前端即可跳已存结果。
      const diagnosis = this.buildProfessionEntity(userId, prepared, dto, analysis, []);
      const saved = (await this.repo.save(diagnosis)) as Diagnosis;
      out.push({ type: 'analysis', diagnosisId: saved.id, payload: analysis });

      out.push({ type: 'step', stage: 'suggesting', label: '正在生成针对性改写建议…' });
      const suggestions = await this.rewriter.suggestAgainstPreset(
        prepared.resumeRawText,
        prepared.preset,
        analysis,
      );
      await this.repo.update(saved.id, { suggestions });
      saved.suggestions = suggestions;
      return saved;
    });
  }

  /** JD 匹配诊断 — 流式。结构同上;analyzeAgainstPreset 的对位是 analyzer.analyze。 */
  streamCreate(
    userId: string,
    dto: CreateDiagnosisDto,
    endpoint: string,
  ): AsyncIterable<DiagnosisStreamEvent> {
    return this.runPipeline(userId, endpoint, async (out) => {
      const prepared = await this.prepareJdMatch(userId, dto);
      out.push({ type: 'step', stage: 'analyzing', label: '正在分析简历与 JD 的多维匹配…' });

      const matchResult = await this.analyzer.analyze(
        JSON.stringify(prepared.parsedResume),
        JSON.stringify(prepared.parsedJD),
      );

      const diagnosis = this.buildJdMatchEntity(userId, prepared, dto, matchResult, []);
      const saved = (await this.repo.save(diagnosis)) as Diagnosis;
      out.push({ type: 'analysis', diagnosisId: saved.id, payload: matchResult.dimensions });

      out.push({ type: 'step', stage: 'suggesting', label: '正在生成针对性改写建议…' });
      const suggestions = await this.rewriter.suggest(
        prepared.resumeText,
        dto.jd_text,
        JSON.stringify(matchResult),
      );
      await this.repo.update(saved.id, { suggestions });
      saved.suggestions = suggestions;
      return saved;
    });
  }

  /**
   * 流式流水线骨架(两种诊断共用)。
   *
   * - 并发护栏:重 AI 工作整体走 limiter.runObservable;排队时把排位作为 queue 事件推给前端。
   * - 落库铁律:work() 内部的 repo.save / repo.update 在后台任务里执行,不随消费者(SSE 连接)生死;
   *   即使客户端断开,本任务仍跑完落库,故结果永不丢。
   * - 计费:仅当整条流水线成功(done)后才扣 1 点 + 记一条 ai_usage(对齐非流式端点的两枚拦截器语义,
   *   失败/排队满/抛错均不扣不记);余额前置校验由 CreditGuard 完成。
   * - 解析阶段:work() 第一步先发 parsing step(解析简历/JD 属真实工作),analyzing/suggesting 由 work() 内部按真实完成推送。
   */
  private runPipeline(
    userId: string,
    endpoint: string,
    work: (out: DiagnosisEventStream<DiagnosisStreamEvent>) => Promise<Diagnosis>,
  ): AsyncIterable<DiagnosisStreamEvent> {
    const out = new DiagnosisEventStream<DiagnosisStreamEvent>();

    // 后台任务:独立于消费者运行,确保断开也跑完落库。不 await,异步推进。
    void (async () => {
      try {
        // 整体墙钟超时护栏:单 AI 调用各自有超时,但整条流水线(排队 + 多次调用)无总上限,
        // 任一环节卡死会让本后台任务永挂、占住并发槽与 SSE 连接。超时后抛中文错误,经下方 catch
        // 推 error 事件、finally 关流,与其它失败路径同构。注:超时只中止「等待」,不强杀底层 AI
        // 工作(它仍受各自单调用超时约束,跑完即被丢弃,不再落库)。
        const diagnosis = await this.withPipelineTimeout(
          this.limiter.runObservable<Diagnosis>(
            async () => {
              out.push({ type: 'step', stage: 'parsing', label: '正在解析简历与岗位信息…' });
              return work(out);
            },
            (position) => {
              if (position > 0) out.push({ type: 'queue', position });
            },
          ),
        );

        out.push({ type: 'done', diagnosisId: diagnosis.id, diagnosis });

        // 成功后计费(扣点 + ai_usage),失败不阻断已交付的结果。
        await this.bill(userId, endpoint);
      } catch (err) {
        out.push({ type: 'error', message: this.readableError(err) });
      } finally {
        out.close();
      }
    })();

    return out;
  }

  /**
   * 给整条流水线 Promise 套一个墙钟超时:超时则 reject 中文错误;无论成功/失败都 clearTimeout,
   * happy path 不留悬挂定时器(否则会拖住事件循环 / 内存泄漏)。默认 600000ms,经
   * DIAGNOSIS_PIPELINE_TIMEOUT_MS 覆盖(非正/非数 → 缺省)。
   */
  private withPipelineTimeout(promise: Promise<Diagnosis>): Promise<Diagnosis> {
    const timeoutMs = this.pipelineTimeoutMs();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('诊断流水线超时,已中止以保护服务器资源')),
        timeoutMs,
      );
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  private pipelineTimeoutMs(): number {
    const parsed = Number.parseInt(process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 600000;
  }

  /** 扣 1 点 + 记一条 ai_usage(对齐非流式端点 CreditInterceptor + AiUsageInterceptor;均失败不阻断)。 */
  private async bill(userId: string, endpoint: string): Promise<void> {
    try {
      await this.credit.consume(userId, endpoint);
    } catch (err) {
      this.logger.error(
        `CREDIT_CONSUME_FAILED userId=${userId} endpoint=${endpoint}: ${this.readableError(err)}`,
      );
    }
    try {
      await this.usageRepo.insert({ user_id: userId, endpoint });
    } catch (err) {
      this.logger.error(`写入 ai_usage 失败 userId=${userId} endpoint=${endpoint}: ${String(err)}`);
    }
  }

  // ── 共用阶段:输入校验 / 解析 / 实体构建 ────────────────────────────────

  private async prepareJdMatch(
    userId: string,
    dto: CreateDiagnosisDto,
  ): Promise<{
    resume: Awaited<ReturnType<ResumesService['findOne']>>;
    resumeText: string;
    parsedResume: NonNullable<Awaited<ReturnType<ParserService['parseResume']>>>;
    parsedJD: ParsedJD;
  }> {
    const jdText = dto.jd_text?.trim() ?? '';
    if (jdText.length < 50) {
      throw new BadRequestException(
        'JD 文本至少需要 50 字，包含岗位职责和要求。仅提供公司名称无法进行有效匹配。',
      );
    }

    const resume = await this.resumes.findOne(dto.resume_id, userId);
    const resumeText = resume.raw_text?.trim() ?? '';
    if (resumeText.length < 30) {
      throw new BadRequestException(
        '简历内容不足，请上传包含完整工作经历和技能的简历（至少 30 字）。',
      );
    }

    let parsedResume = resume.parsed_json;
    if (!parsedResume) {
      parsedResume = await this.parser.parseResume(resume.raw_text);
      await this.resumes.updateParsedJson(resume.id, parsedResume);
    }

    const jdHash = crypto.createHash('md5').update(dto.jd_text).digest('hex');
    let parsedJD = this.jdCache.get<ParsedJD>(jdHash);
    if (!parsedJD) {
      parsedJD = await this.parser.parseJD(dto.jd_text);
      this.jdCache.set(jdHash, parsedJD);
    }

    return { resume, resumeText: resume.raw_text, parsedResume, parsedJD };
  }

  private buildJdMatchEntity(
    userId: string,
    prepared: { resume: { id: string }; parsedJD: ParsedJD },
    dto: CreateDiagnosisDto,
    matchResult: { total_score: number; dimensions: MatchDimensions },
    suggestions: RewriteSuggestion[],
  ): Diagnosis {
    return this.repo.create({
      user_id: userId,
      resume_id: prepared.resume.id,
      jd_text: dto.jd_text,
      jd_parsed: prepared.parsedJD,
      jd_company: prepared.parsedJD.company ?? undefined,
      jd_role: prepared.parsedJD.job_title ?? undefined,
      score: matchResult.total_score,
      dimensions: matchResult.dimensions,
      keywords_hit: matchResult.dimensions.skills.matched,
      keywords_miss: matchResult.dimensions.skills.missing,
      suggestions,
    });
  }

  private async prepareProfessionStandard(
    userId: string,
    dto: CreateCampusDiagnosisDto,
  ): Promise<{
    preset: ReturnType<ProfessionPresetsService['resolveByProfession']>;
    resume: Awaited<ReturnType<ResumesService['findOne']>>;
    resumeRawText: string;
    parsedResume: NonNullable<Awaited<ReturnType<ParserService['parseResume']>>>;
    jdJson: string | null;
  }> {
    const preset = this.presets.resolveByProfession(dto.profession, dto.tier ?? 'standard');

    const resume = await this.resumes.findOne(dto.resume_id, userId);
    const resumeText = resume.raw_text?.trim() ?? '';
    if (resumeText.length < 30) {
      throw new BadRequestException(
        '简历内容不足，请上传包含完整工作经历和技能的简历（至少 30 字）。',
      );
    }

    const [parsedResume, jdJson] = await Promise.all([
      (async () => {
        if (resume.parsed_json) return resume.parsed_json;
        const parsed = await this.parser.parseResume(resume.raw_text);
        await this.resumes.updateParsedJson(resume.id, parsed);
        return parsed;
      })(),
      dto.jd_text
        ? this.parser.parseJD(dto.jd_text).then((jd) => JSON.stringify(jd))
        : Promise.resolve(null),
    ]);

    return { preset, resume, resumeRawText: resume.raw_text, parsedResume, jdJson };
  }

  private buildProfessionEntity(
    userId: string,
    prepared: { resume: { id: string }; preset: ProfessionPreset },
    dto: CreateCampusDiagnosisDto,
    analysis: ProfessionStandardResult,
    suggestions: RewriteSuggestion[],
  ): Diagnosis {
    return this.repo.create({
      user_id: userId,
      resume_id: prepared.resume.id,
      mode: 'profession_standard',
      profession: prepared.preset.profession,
      preset_id: prepared.preset.id,
      tier: prepared.preset.tier,
      jd_text: dto.jd_text,
      score: analysis.total_score,
      dimensions: analysis,
      keywords_hit: [],
      keywords_miss: [],
      suggestions,
    });
  }

  private readableError(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message: unknown }).message;
      if (typeof m === 'string' && m.length > 0) return m;
    }
    return 'AI 服务暂时不可用，请稍后重试。';
  }

  // ── 查询 ────────────────────────────────────────────────────────────────

  findAllByUser(userId: string): Promise<Diagnosis[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: { resume: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Diagnosis> {
    const diagnosis = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { resume: true },
    });
    if (!diagnosis) throw new NotFoundException();
    return diagnosis;
  }
}
