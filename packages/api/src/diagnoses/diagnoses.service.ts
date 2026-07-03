import * as crypto from 'crypto';
import NodeCache from 'node-cache';
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Diagnosis } from './entities/diagnosis.entity';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateCampusDiagnosisDto } from './dto/create-campus-diagnosis.dto';
import { ResumesService } from '../resumes/resumes.service';
import { ParserService, isResumeParseMeaningful } from '../ai/parser.service';
import { AnalyzerService } from '../ai/analyzer.service';
import { RewriterService } from '../ai/rewriter.service';
import { ProfessionPresetsService } from '../profession-presets/profession-presets.service';
import { ConcurrencyLimiter } from '../ai/concurrency-limiter';
import { CreditService } from '../credit/credit.service';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { renderResumeForReview } from '../ai/prompts/analyze-profession-standard';
import { DiagnosisEventStream } from './diagnosis-event-stream';
import { DiagnosisResponseDto } from './dto/diagnosis-response.dto';
import type {
  ParsedJD,
  ParsedResume,
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
  // done 携带的诊断走 DTO 白名单投影(与 GET/POST 同口径),不把 failure_reason/pipeline_error_message
  // 随 SSE 帧泄露;前端 done 处理只读 diagnosisId(见 diagnoses/new|campus page),投影后契约不破。
  | { type: 'done'; diagnosisId: string; diagnosis: DiagnosisResponseDto }
  | { type: 'error'; message: string };

// 单次诊断失败归类(落 diagnoses.failure_reason)。按【流水线阶段】判定为主,辅以错误特征细分:
//   input_validation —— 入参校验未过(JD/简历过短等 BadRequestException)。
//   parser_error     —— 解析简历/JD 阶段抛错。
//   analyzer_timeout —— 整体墙钟超时护栏触发(单次 AI 卡死)。
//   analyzer_error   —— 分析阶段抛错(落库前)。
//   rewriter_error   —— 改写阶段抛错(分析已落库 → status=partial)。
//   client_disconnect—— 客户端断开导致中止(本架构后台不随断开中止,保留枚举以备扩展)。
//   orphaned         —— 进行中(running)行超 15 分钟仍未落终态(疑似进程重启遗留),读取时惰性判失败。
//   unknown          —— 未归类。
export type DiagnosisFailureReason =
  | 'input_validation'
  | 'parser_error'
  | 'analyzer_timeout'
  | 'analyzer_error'
  | 'rewriter_error'
  | 'client_disconnect'
  | 'orphaned'
  | 'unknown';

// 流水线运行上下文:work() 边跑边填,供失败归类与状态机记账使用。
//   phase            —— 当前阶段;失败时据此归类 failure_reason。
//   resumeId         —— 由 dto 预填(发起即插 running 行需要),使「落库前失败」也能归因到该行。
//   mode             —— 诊断形态。
//   savedId          —— 诊断行 id。S0 后:发起即插的 running 行 id,恒等于本次诊断落库行——
//                       markSuccess/recordFailure 一律更新这一行,不再分裂成「更新 vs 补插」两条路径。
//   analysisPersisted—— 分析结果是否已落库(分析 update 之后置 true)。失败记账据此判 partial(已落) / failed(未落),
//                       替代旧的「savedId 有无」判据(现 savedId 恒有值,不能再用它区分阶段)。
interface PipelineContext {
  phase: 'preparing' | 'analyzing' | 'suggesting';
  resumeId?: string;
  mode: 'jd_match' | 'profession_standard';
  savedId?: string;
  analysisPersisted?: boolean;
}

@Injectable()
export class DiagnosesService {
  private readonly logger = new Logger(DiagnosesService.name);
  private readonly jdCache = new NodeCache({ stdTTL: 7 * 24 * 3600 });

  // 孤儿 running 行的惰性判死阈值(15 分钟)。健康流水线有 600s(默认)墙钟超时护栏,其自身超时
  // 处理器会在 10 分钟内把行标 failed,故一条 running 行存活超过 15 分钟只可能是【进程重启遗留的孤儿】。
  // 读取(findOne/findAllByUser)与防重复查重(findRunningConflict)时命中即就地判 failed —— 无清扫 cron。
  private static readonly ORPHAN_TIMEOUT_MS = 15 * 60 * 1000;

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
    // resumeId 传给 runPipeline 用于「发起即插 running 行」(ctx.resumeId 预置);skipLimiter=true
    // 贯穿所有内层 AI 调用(prepare/analyzer/rewriter)——外层 runObservable 已持槽,避免嵌套自锁(D1)。
    return this.runPipeline(userId, dto.resume_id, endpoint, 'profession_standard', async (out, ctx) => {
      const prepared = await this.prepareProfessionStandard(userId, dto, true);
      ctx.resumeId = prepared.resume.id;
      ctx.phase = 'analyzing';
      out.push({ type: 'step', stage: 'analyzing', label: '正在按职业标尺逐维度诊断…' });

      const analysis = await this.analyzer.analyzeAgainstPreset(
        renderResumeForReview(prepared.parsedResume),
        prepared.preset,
        prepared.jdJson,
        prepared.parsedResume,
        prepared.resumeRawText,
        true, // skipLimiter
      );

      // 不变量:analysis 事件发出前诊断行必须已落库(suggestions 暂空),diagnosisId 一到前端即可跳已存结果。
      // S0 后复用发起即插的 running 行:用分析结果 UPDATE 它(状态留 running 至 markSuccess),不再新插一行。
      const saved = await this.persistAnalysisRow(
        ctx,
        this.buildProfessionEntity(userId, prepared, dto, analysis, []),
      );
      ctx.phase = 'suggesting';
      out.push({ type: 'analysis', diagnosisId: saved.id, payload: analysis });

      out.push({ type: 'step', stage: 'suggesting', label: '正在生成针对性改写建议…' });
      const suggestions = await this.rewriter.suggestAgainstPreset(
        prepared.resumeRawText,
        prepared.preset,
        analysis,
        true, // skipLimiter
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
    return this.runPipeline(userId, dto.resume_id, endpoint, 'jd_match', async (out, ctx) => {
      const prepared = await this.prepareJdMatch(userId, dto, true);
      ctx.resumeId = prepared.resume.id;
      ctx.phase = 'analyzing';
      out.push({ type: 'step', stage: 'analyzing', label: '正在分析简历与 JD 的多维匹配…' });

      const matchResult = await this.analyzer.analyze(
        JSON.stringify(prepared.parsedResume),
        JSON.stringify(prepared.parsedJD),
        true, // skipLimiter
      );

      // 复用发起即插的 running 行(见 streamCreateProfessionStandard 注释)。
      const saved = await this.persistAnalysisRow(
        ctx,
        this.buildJdMatchEntity(userId, prepared, dto, matchResult, []),
      );
      ctx.phase = 'suggesting';
      out.push({ type: 'analysis', diagnosisId: saved.id, payload: matchResult.dimensions });

      out.push({ type: 'step', stage: 'suggesting', label: '正在生成针对性改写建议…' });
      const suggestions = await this.rewriter.suggest(
        prepared.resumeText,
        dto.jd_text,
        JSON.stringify(matchResult),
        true, // skipLimiter
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
    resumeId: string,
    endpoint: string,
    mode: 'jd_match' | 'profession_standard',
    work: (
      out: DiagnosisEventStream<DiagnosisStreamEvent>,
      ctx: PipelineContext,
    ) => Promise<Diagnosis>,
  ): AsyncIterable<DiagnosisStreamEvent> {
    const out = new DiagnosisEventStream<DiagnosisStreamEvent>();
    // 成败记账上下文:phase 起于 preparing(解析阶段);resumeId 预置(发起即插 running 行需要它,
    // 也使落库前失败能归因到该行);savedId 由 insertRunningRow 立即填入。
    const ctx: PipelineContext = { phase: 'preparing', mode, resumeId };
    // 流水线级 abort(watchdog-v2):超时时 abort,令 runObservable 内的任务立即 reject →
    // finally 释放 limiter 槽。此前 withPipelineTimeout 用 Promise.race 只 reject 了调用方,
    // runObservable 的 task 仍 hang、finally 不跑、槽位永占。
    const pipelineAbort = new AbortController();

    // 后台任务:独立于消费者运行,确保断开也跑完落库。不 await,异步推进。
    void (async () => {
      try {
        // S0「回来可见 / 防重复扣费」:限流 acquire 之前先插一行 status=running 的最小行,ctx.savedId 立即拿到。
        // 之后分析落库 / markSuccess / recordFailure 全部 UPDATE 这一行(不再新插),故诊断一发起即在 DB 可见——
        // 断流或离开页面回来仍能查到进行中态并轮询至终态。插入失败(极少见,如无效 resume_id 的 FK 违规)
        // 不设 savedId,交由失败路径兜底补记(与改动前无 running 行时的行为一致)。
        await this.insertRunningRow(userId, ctx);

        // 整体墙钟超时护栏:单 AI 调用各自有超时,但整条流水线(排队 + 多次调用)无总上限,
        // 任一环节卡死会让本后台任务永挂、占住并发槽与 SSE 连接。超时后 abort pipelineAbort →
        // raceAbortSignal 令 runObservable 的 task 立即 reject → finally release 槽位。
        // 孤儿 work() 若仍在跑,其 DB 写入无害(数据保全);push 到已关闭的 out 为空操作。
        const diagnosis = await this.withPipelineTimeout(
          this.limiter.runObservable<Diagnosis>(
            async () => {
              out.push({ type: 'step', stage: 'parsing', label: '正在解析简历与岗位信息…' });
              return this.raceAbortSignal(work(out, ctx), pipelineAbort.signal);
            },
            (position) => {
              if (position > 0) out.push({ type: 'queue', position });
            },
          ),
          pipelineAbort,
        );

        // 成功记账:整条流水线跑完 → 该行 status=success(与 happy path 行为无关,纯补记)。
        await this.markSuccess(diagnosis.id);
        diagnosis.status = 'success';

        // 投影脱敏后再推:剥掉 failure_reason/pipeline_error_message(成功路径恒 null,但白名单一律封全)。
        out.push({
          type: 'done',
          diagnosisId: diagnosis.id,
          diagnosis: DiagnosisResponseDto.fromEntity(diagnosis),
        });

        // 成功后计费(扣点 + ai_usage),失败不阻断已交付的结果。
        await this.bill(userId, endpoint);
      } catch (err) {
        // 失败记账:归类原因 + 把状态落到诊断行(已落库则更新,未落库则补记一行 failed),
        // 与既有 error 事件/计费跳过行为同构,纯增量,不改 happy path。
        await this.recordFailure(userId, endpoint, ctx, err);
        out.push({ type: 'error', message: this.readableError(err) });
      } finally {
        out.close();
      }
    })();

    return out;
  }

  /**
   * S0:发起即插一行 status='running' 的最小诊断行,ctx.savedId 立即拿到(限流 acquire 之前)。
   * 只写 user_id / resume_id / mode / status 四列(其余留 null,分析阶段再 UPDATE 补齐)。
   * 插入失败(极少见:如 resume_id 无效导致 FK 违规)吞掉并记日志、不设 savedId——后续 work() 内的
   * resumes.findOne 会抛 NotFound 走失败路径,recordFailure 的兜底分支(无 savedId)与改动前行为一致。
   */
  private async insertRunningRow(userId: string, ctx: PipelineContext): Promise<void> {
    if (!ctx.resumeId) return;
    try {
      const res = await this.repo.insert({
        user_id: userId,
        resume_id: ctx.resumeId,
        mode: ctx.mode,
        status: 'running',
      });
      const id = res.identifiers[0]?.id;
      if (typeof id === 'string') ctx.savedId = id;
    } catch (err) {
      this.logger.warn(
        `running 行插入失败 userId=${userId} resumeId=${ctx.resumeId}: ${String(err)}`,
      );
    }
  }

  /**
   * 分析结果落库(analysis 事件发出前的不变量)。S0 后复用发起即插的 running 行:把分析列 UPDATE 进去,
   * 状态仍留 running(改写阶段还在跑),成功走 markSuccess 翻 success、改写失败走 recordFailure 翻 partial。
   * repo.save(带 id)对既有行走 UPDATE(created_at 不变,15 分钟孤儿判据据此);running 插入失败(无 savedId)
   * 的兜底:新插一行并回填 savedId,保证 analysis 帧永远带一个真实存在的 diagnosisId。
   */
  private async persistAnalysisRow(ctx: PipelineContext, entity: Diagnosis): Promise<Diagnosis> {
    entity.status = 'running';
    if (ctx.savedId) entity.id = ctx.savedId;
    const saved = (await this.repo.save(entity)) as Diagnosis;
    ctx.savedId = saved.id;
    ctx.analysisPersisted = true;
    return saved;
  }

  // 成功记账:把该诊断行标 success(记账失败不抛,不污染已交付结果)。
  private async markSuccess(diagnosisId: string): Promise<void> {
    try {
      await this.repo.update(diagnosisId, { status: 'success' });
    } catch (err) {
      this.logger.error(`诊断成败记账(success)写入失败 id=${diagnosisId}: ${String(err)}`);
    }
  }

  /**
   * 失败记账(纯增量,与计费跳过同构):
   *  - 归类 failure_reason(按阶段 + 错误特征);
   *  - 分析已落库(ctx.analysisPersisted)→ partial(分析成功、仅改写阶段失败);否则 failed(含解析/校验阶段失败)。
   *    S0 后 ctx.savedId 恒指向发起即插的 running 行,故一律 UPDATE 该行到终态,不再新插;
   *    partial/failed 的区分改由 analysisPersisted 承担(旧代码用 savedId 有无区分,现已失效)。
   *  - 兜底:running 行插入失败(极少见,无 savedId)→ 补记一行(resume_id 缺失则不记,避免违反非空约束)。
   * 端点入参仅用于记账失败时的日志定位,不进库。任何记账自身错误都吞掉并记日志,绝不二次抛错。
   */
  private async recordFailure(
    userId: string,
    endpoint: string,
    ctx: PipelineContext,
    err: unknown,
  ): Promise<void> {
    const reason = this.categorizeFailure(ctx, err);
    const message = this.readableError(err).slice(0, 2000);
    const status: 'partial' | 'failed' = ctx.analysisPersisted ? 'partial' : 'failed';
    try {
      if (ctx.savedId) {
        // 更新发起即插的 running 行(或分析已落库的行)到终态。
        await this.repo.update(ctx.savedId, {
          status,
          failure_reason: reason,
          pipeline_error_message: message,
        });
      } else {
        // running 行插入失败的兜底:补记一行(resume_id 缺失则不记,归类仍进日志)。
        if (!ctx.resumeId) {
          this.logger.warn(
            `诊断失败但无 running 行且无 resume_id,跳过记账 userId=${userId} endpoint=${endpoint} reason=${reason}`,
          );
          return;
        }
        await this.repo.insert({
          user_id: userId,
          resume_id: ctx.resumeId,
          mode: ctx.mode,
          status,
          failure_reason: reason,
          pipeline_error_message: message,
        });
      }
    } catch (writeErr) {
      this.logger.error(
        `诊断成败记账(failed/partial)写入失败 userId=${userId} endpoint=${endpoint} reason=${reason}: ${String(writeErr)}`,
      );
    }
  }

  /**
   * 错误归类(按【流水线阶段】为主,辅以错误特征):
   *  - 墙钟超时(特定中文错误)→ analyzer_timeout(无论卡在哪个阶段,语义都是「等待 AI 超时」)。
   *  - BadRequestException(入参校验)→ input_validation。
   *  - 否则按 ctx.phase:preparing → parser_error;analyzing → analyzer_error;suggesting → rewriter_error。
   *  - 兜底 unknown。
   */
  private categorizeFailure(ctx: PipelineContext, err: unknown): DiagnosisFailureReason {
    if (this.isPipelineTimeout(err)) return 'analyzer_timeout';
    if (err instanceof BadRequestException) return 'input_validation';
    switch (ctx.phase) {
      case 'preparing':
        return 'parser_error';
      case 'analyzing':
        return 'analyzer_error';
      case 'suggesting':
        return 'rewriter_error';
      default:
        return 'unknown';
    }
  }

  // 墙钟超时识别:withPipelineTimeout 以固定中文错误 reject;据此与普通阶段错误区分。
  private isPipelineTimeout(err: unknown): boolean {
    return (
      err instanceof Error && err.message === '诊断流水线超时,已中止以保护服务器资源'
    );
  }

  /**
   * 给整条流水线 Promise 套一个墙钟超时:超时则 reject 中文错误;无论成功/失败都 clearTimeout,
   * happy path 不留悬挂定时器(否则会拖住事件循环 / 内存泄漏)。默认 600000ms,经
   * DIAGNOSIS_PIPELINE_TIMEOUT_MS 覆盖(非正/非数 → 缺省)。
   *
   * watchdog-v2:超时时同时 abort pipelineAbort,令 raceAbortSignal 包裹的 task 立即 reject →
   * runObservable.finally 释放 limiter 槽(此前 Promise.race 只 reject 了调用方,task 仍 hang)。
   */
  private withPipelineTimeout(
    promise: Promise<Diagnosis>,
    pipelineAbort?: AbortController,
  ): Promise<Diagnosis> {
    const timeoutMs = this.pipelineTimeoutMs();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        pipelineAbort?.abort();
        reject(new Error('诊断流水线超时,已中止以保护服务器资源'));
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  private pipelineTimeoutMs(): number {
    const parsed = Number.parseInt(process.env.DIAGNOSIS_PIPELINE_TIMEOUT_MS ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 600000;
  }

  /**
   * Race a promise against an AbortSignal(watchdog-v2):signal 触发时立即 reject,
   * 使 runObservable 的 task 快速 settle → finally release 释放 limiter 槽位。
   * 原 promise(work)继续运行但已脱管:其 DB 写入无害(数据保全),push 到已关闭 out 为空操作。
   */
  private raceAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      return Promise.reject(new Error('诊断流水线超时,已中止以保护服务器资源'));
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        reject(new Error('诊断流水线超时,已中止以保护服务器资源'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      promise.then(
        (val) => { signal.removeEventListener('abort', onAbort); resolve(val); },
        (err) => { signal.removeEventListener('abort', onAbort); reject(err as Error); },
      );
    });
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

  // skipLimiter:流式管线调用置 true —— 本方法内部的 parser 调用在外层 runObservable 槽内,须跳过二次 acquire(D1)。
  private async prepareJdMatch(
    userId: string,
    dto: CreateDiagnosisDto,
    skipLimiter = false,
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

    const parsedResume = await this.resolveParsedResume(resume, skipLimiter);

    const jdHash = crypto.createHash('md5').update(dto.jd_text).digest('hex');
    let parsedJD = this.jdCache.get<ParsedJD>(jdHash);
    if (!parsedJD) {
      parsedJD = await this.parser.parseJD(dto.jd_text, skipLimiter);
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
      // 显式置 mode(与 buildProfessionEntity 的 'profession_standard' 对称)。S0 前走 repo.save 新插,
      // INSERT 会把 mode 列默认值 'jd_match' 回填进内存实体;S0 后 persistAnalysisRow 复用 running 行走
      // UPDATE(entity.id 已设),UPDATE 不回填默认值 → done 事件内存实体 mode 会是 undefined。显式赋值兜住。
      mode: 'jd_match',
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

  /**
   * 解析简历(缓存优先 + 退化自愈),两条诊断路径共用。
   *
   * - 缓存命中且内容有效 → 直接复用(省一次 AI 调用)。
   * - 缓存缺失,或缓存命中但是「全空退化解析」(历史毒化的 parsed_json,见 isResumeParseMeaningful)
   *   → 重新解析。parser.parseResume 现已对空解析抛 503,故能返回到此处的必是有效解析;
   *   有效后才落库,绝不把空解析写回缓存——既治新发(不再毒化)、又自愈旧毒(命中即重解)。
   *
   * 注:原文 ≥30 字闸由调用方在更早处校验,此处只负责「拿到一份可用的结构化简历」。
   */
  private async resolveParsedResume(
    resume: { id: string; raw_text: string; parsed_json: ParsedResume | null },
    skipLimiter = false,
  ): Promise<ParsedResume> {
    if (resume.parsed_json && isResumeParseMeaningful(resume.parsed_json)) {
      return resume.parsed_json;
    }
    const parsed = await this.parser.parseResume(resume.raw_text, skipLimiter);
    await this.resumes.updateParsedJson(resume.id, parsed);
    return parsed;
  }

  // skipLimiter:流式管线调用置 true —— 本方法内部的 parser 调用在外层 runObservable 槽内,须跳过二次 acquire(D1)。
  private async prepareProfessionStandard(
    userId: string,
    dto: CreateCampusDiagnosisDto,
    skipLimiter = false,
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
      this.resolveParsedResume(resume, skipLimiter),
      dto.jd_text
        ? this.parser.parseJD(dto.jd_text, skipLimiter).then((jd) => JSON.stringify(jd))
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

  async findAllByUser(userId: string): Promise<Diagnosis[]> {
    const list = await this.repo.find({
      where: { user_id: userId },
      relations: { resume: true },
      order: { created_at: 'DESC' },
    });
    // 防僵尸(读取时惰性兜底):进程重启遗留的孤儿 running 行(超 15 分钟)就地判 failed,
    // 使「回来可见」列表不再展示永久卡死的进行中卡片。健康流水线永不触发(其 600s 墙钟先翻终态)。
    for (const d of list) await this.failIfOrphan(d);
    return list;
  }

  async findOne(id: string, userId: string): Promise<Diagnosis> {
    const diagnosis = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { resume: true },
    });
    if (!diagnosis) throw new NotFoundException();
    // 轮询 GET /diagnoses/:id 命中孤儿 running 行 → 惰性判 failed,让前端「进行中」轮询能收敛到终态。
    await this.failIfOrphan(diagnosis);
    return diagnosis;
  }

  /**
   * 防重复(S0):查同用户同 mode 的「未超时」进行中诊断。返回非空则控制器据此回 409(携带该 id)。
   *
   * 关键顺序(D 审计点名的死锁风险点,审计会重点核):【先惰性判死、再判 409】。
   * 必须先把超时的 running 行就地标 failed,再看是否仍有真正 running 的行——否则一条卡死的僵尸 running 行
   * 会让用户永远拿到 409、永久卡在「进行中」错觉里(比原 bug 更差的死锁)。按 created_at DESC 取最新的
   * 未超时 running 行作为冲突对象。
   */
  async findRunningConflict(
    userId: string,
    mode: 'jd_match' | 'profession_standard',
  ): Promise<Diagnosis | null> {
    const running = await this.repo.find({
      where: { user_id: userId, mode, status: 'running' },
      order: { created_at: 'DESC' },
    });
    let active: Diagnosis | null = null;
    for (const row of running) {
      // 先惰性判死:超时的孤儿就地标 failed(不计入 409 判定);未超时的最新一条才是真冲突。
      const failed = await this.failIfOrphan(row);
      if (!failed && !active) active = row;
    }
    return active;
  }

  // 孤儿判定:running 且 created_at 距今超过 ORPHAN_TIMEOUT_MS(15 分钟)。
  private isRunningOrphan(d: Diagnosis): boolean {
    return (
      d.status === 'running' &&
      Date.now() - new Date(d.created_at).getTime() > DiagnosesService.ORPHAN_TIMEOUT_MS
    );
  }

  // 命中孤儿 running 行 → 就地标 failed(reason=orphaned)并同步入参实体(使调用方返回对象反映终态)。
  // 返回是否发生判死。写库失败吞掉记日志、不抛:读路径绝不因惰性记账失败而 500。
  private async failIfOrphan(d: Diagnosis): Promise<boolean> {
    if (!this.isRunningOrphan(d)) return false;
    const message = '诊断进行中状态超过 15 分钟仍未落终态(疑似进程重启遗留),已惰性判定为失败。';
    try {
      await this.repo.update(d.id, {
        status: 'failed',
        failure_reason: 'orphaned',
        pipeline_error_message: message,
      });
    } catch (err) {
      this.logger.error(`孤儿 running 行惰性判死写入失败 id=${d.id}: ${String(err)}`);
      return false;
    }
    d.status = 'failed';
    d.failure_reason = 'orphaned';
    d.pipeline_error_message = message;
    return true;
  }
}
