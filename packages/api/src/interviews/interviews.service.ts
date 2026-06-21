import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interview } from './entities/interview.entity';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { DebriefService } from './debrief.service';
import { SpeechService } from '../speech/speech.service';
import { LabelService } from '../speech/label.service';
import {
  InterviewTranscribeTask,
  LabeledSegment,
  TranscribeStatus,
} from '../speech/entities/transcribe-task.entity';
import { LabelCorrectionDto } from '../speech/dto/confirm-labels.dto';
import { CreditService } from '../credit/credit.service';
import { AiUsage } from '../quota/entities/ai-usage.entity';
import { QrUploadTokenService } from './qr-upload-token.service';
import { OpsEventsService } from '../ops/ops-events.service';
import { isAiCallFailure } from '../quota/ai-usage.interceptor';
import { AiService } from '../ai/ai.service';
import type { TranscriptSegment } from '../speech/providers/speech.provider';

// 转写扣点端点标识:写入 credit_transactions.endpoint / ai_usage.endpoint(与控制器路由模板同口径)。
const TRANSCRIBE_ENDPOINT = '/api/interviews/:id/transcribe';

// 「一次录音转写复盘」按进度分两段计费,总成本 = 7 点(ASR 转写 + LLM 角色打标 + LLM 复盘分析三段重活的合计定价)。
// 计费铁律(按进度计费 + 幂等不双扣):
//  - 转写费 1 点:在「转写+打标真实成功」(落 awaiting_confirm)那一刻扣(chargeTranscribe)。
//  - 分析费 6 点:在 confirm「分析真实成功」(落 completed)那一刻扣(chargeAnalysis),且以 task.analysis_charged 幂等护栏保证最多扣一次。
//  - 分析失败:止于已扣的 1 点(不扣 6);用户可在 failed/analyzing 态免重传重试,重试成功只补扣那一次 6,合计仍恰好 7,绝不双扣。
//  - awaiting_confirm 后放弃(不 confirm):止于 1 点。
// 故一次完整复盘恰好扣 7 点(1 + 6),按进度兑现、失败按已交付段计费、重试不双扣。
const TRANSCRIPT_CREDIT_COST = 1; // 转写费(转写+打标成功扣)
const ANALYSIS_CREDIT_COST = 6; // 分析费(confirm 分析成功扣,幂等)
// 提交前足额预检仍按完整链路总额 7 校验(用户须付得起整条复盘),402 文案数字同源。
const FULL_DEBRIEF_CREDIT_COST = TRANSCRIPT_CREDIT_COST + ANALYSIS_CREDIT_COST;

// 非面试内容闸门(放在转写之后、昂贵的打标/复盘之前,省额度):
//  - 段数下限:真实面试至少多句问答;不足此数大概率是空录音/误传/几秒杂音。
const MIN_INTERVIEW_SEGMENTS = 3;
//  - 合并正文字数下限:不足此数说明几乎无可分析内容(无人声/极短)。
const MIN_INTERVIEW_TRANSCRIPT_CHARS = 50;
// 送给"是否面试"廉价判别的转写摘录上限:只取开头若干字够判主题,避免把长面试整篇塞进去烧 token。
const INTERVIEW_GATE_EXCERPT_CHARS = 600;

/** POST /interviews/:id/transcribe 的 202 响应:仅回 taskId,前端据此轮询 status。 */
export interface TranscribeStartedResponse {
  taskId: string;
}

/**
 * 上传文件元数据:由 controller 从 multer 注入的 file 上取得(originalname/size/mimetype)。
 * 仅元数据(非音频内容),用于桌面端「已收到上传」回执展示——不违反音频不落盘的隐私铁律。
 */
export interface UploadMeta {
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string;
}

/**
 * POST /interviews/:id/upload-token 的响应:scoped 一次性令牌 + 手机端直传路径。
 * 前端把 uploadPath 拼上站点 origin 编成二维码;手机扫码打开豁免页(无需登录)直传音频。
 */
export interface QrUploadTokenResponse {
  /** scoped 短令牌(不透明随机 id,服务端映射绑定 interviewId+user,10 分钟过期,一次性)。 */
  token: string;
  /** 手机端上传页相对路径(/upload/<token>);前端拼 origin 后生成二维码。 */
  uploadPath: string;
  /** 令牌有效期(秒),供前端做倒计时/到期重新生成提示。 */
  expiresInSec: number;
}

/** GET /interviews/:id/transcribe/status 的响应:任务态 + 标注结果(awaiting_confirm 起非空)。 */
export interface TranscribeStatusResponse {
  taskId: string;
  status: TranscribeStatus;
  errorMessage: string | null;
  // 失败发生在哪个阶段(仅 status=failed 时有值):前端据此区分「分析失败可免重传重试」与「需重新上传」。
  failedAtStage: string | null;
  segmentsJson: LabeledSegment[] | null;
  // 上传元数据回执(收到上传即非空;无元数据的旧任务为 null)。非音频内容。
  originalFilename: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  uploadedAt: string | null; // ISO 字符串
}

// 前端展示用角色前缀,组装喂给 DebriefService.analyze 的带角色 transcript。
const SPEAKER_PREFIX: Record<LabeledSegment['speaker'], string> = {
  interviewer: '面试官',
  candidate: '用户',
};

/**
 * 把可空时间列安全转 ISO 字符串。双端驱动取出的列值类型不保证一致(postgres/sqlite 多为 Date,
 * 但部分驱动/配置下可能已是字符串),故对 Date 调 toISOString(),已是 string 则原样回,避免强转穿透。
 */
function toIsoString(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @InjectRepository(Interview)
    private readonly repo: Repository<Interview>,
    @InjectRepository(InterviewTranscribeTask)
    private readonly taskRepo: Repository<InterviewTranscribeTask>,
    @InjectRepository(AiUsage)
    private readonly aiUsageRepo: Repository<AiUsage>,
    private readonly debrief: DebriefService,
    private readonly speech: SpeechService,
    private readonly label: LabelService,
    private readonly credit: CreditService,
    private readonly qrToken: QrUploadTokenService,
    private readonly opsEvents: OpsEventsService,
    private readonly ai: AiService,
  ) {}

  async create(userId: string, dto: CreateInterviewDto): Promise<Interview> {
    const interview = this.repo.create({
      user_id: userId,
      round: dto.round,
      company: dto.company,
      role: dto.role,
      interview_at: dto.interview_at,
      duration_min: dto.duration_min,
      interviewer: dto.interviewer,
      transcript: dto.transcript,
      application_id: dto.application_id,
    });

    // 提供了非空 transcript 即承诺当场复盘:先分析后落盘。
    // analyze 过短(BadRequest 400)/AI 故障(ServiceUnavailable 503)都直接上抛,
    // 绝不静默吞掉、绝不创建一条 scores 全 null 却返 201 的假"成功"记录。
    // 未提供 transcript(null/缺省/空白)时是合法草稿:不分析,scores 保持 null,前端走"手动分析"。
    if (dto.transcript?.trim()) {
      const result = await this.debrief.analyze(
        dto.transcript,
        dto.company,
        dto.role,
        dto.round,
      );
      Object.assign(interview, result);
    }

    return this.repo.save(interview);
  }

  findAllByUser(userId: string): Promise<Interview[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: { application: true },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Interview> {
    const interview = await this.repo.findOne({
      where: { id, user_id: userId },
      relations: { application: true },
    });
    if (!interview) throw new NotFoundException();
    return interview;
  }

  async update(id: string, userId: string, dto: UpdateInterviewDto): Promise<Interview> {
    const interview = await this.findOne(id, userId);
    const hadTranscript = !!interview.transcript?.trim();

    Object.assign(interview, dto);

    // 新增了非空 transcript 且尚无评分时,当场复盘:先分析后落盘。
    // analyze 过短(400)/AI 故障(503)都直接上抛,不静默吞掉、不留下"有记录无评分"的假态。
    const transcriptAdded = !hadTranscript && !!interview.transcript?.trim();
    const noScores = !interview.scores || interview.scores.length === 0;
    if (transcriptAdded && noScores) {
      const result = await this.debrief.analyze(
        interview.transcript,
        interview.company ?? undefined,
        interview.role ?? undefined,
        interview.round,
      );
      Object.assign(interview, result);
    }

    return this.repo.save(interview);
  }

  async analyze(id: string, userId: string): Promise<Interview> {
    const interview = await this.findOne(id, userId);
    if (!interview.transcript) {
      throw new BadRequestException('请先添加面试记录内容（transcript），再进行复盘分析');
    }

    const result = await this.debrief.analyze(
      interview.transcript,
      interview.company ?? undefined,
      interview.role ?? undefined,
      interview.round,
    );
    Object.assign(interview, result);
    await this.repo.save(interview);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const interview = await this.findOne(id, userId);
    await this.repo.remove(interview);
  }

  /**
   * 为「已登录用户的某个 interview」签发扫码上传的 scoped 一次性令牌。
   *
   * 归属红线:先 findOne(id, userId) —— 非本人 / 不存在的 interview 直接 404,绝不为越权请求发令牌。
   * 校验通过后才生成一枚短随机 id 令牌,服务端映射记下它绑定的 {interviewId:id, userId},
   * 令牌天然只能传它绑定的这一个 interview、且落库 user_id 恒为签发者本人。
   */
  async issueUploadToken(
    id: string,
    userId: string,
  ): Promise<QrUploadTokenResponse> {
    // 归属校验:非本人面试 → 404(不泄露存在性),不为越权请求签发令牌。
    await this.findOne(id, userId);

    const { token, expiresInSec } = this.qrToken.sign(id, userId);
    return { token, uploadPath: `/upload/${token}`, expiresInSec };
  }

  /**
   * 凭已校验的 scoped 令牌接收手机端音频:走与登录端点完全相同的转写 pipeline。
   *
   * 调用前置(由 controller 完成):QrUploadTokenService.verify 已校验令牌命中映射 + 未过期 + 未用过,
   * 并取出绑定的 interviewId+userId。这里复用 transcribe()——其内部仍会 findOne(interviewId, userId)
   * 再做一次归属校验(双保险:即便归属不匹配,也会在此 404)+ 余额 ≥7 预检 + 建任务。
   * 任务建成后由 controller 烧令牌(失败不烧,允许有效期内重试)。
   */
  async transcribeViaQrToken(
    interviewId: string,
    userId: string,
    audio: Buffer,
    mimeType: string,
    meta?: UploadMeta,
  ): Promise<TranscribeStartedResponse> {
    return this.transcribe(interviewId, userId, audio, mimeType, meta);
  }

  /**
   * 上传音频 → 立即建 task 返回 taskId(不阻塞)→ 后台跑转写+打标 → 落 awaiting_confirm。
   *
   * 异步编排(fire-and-forget):重活(StepFun ASR + LLM 打标)放后台跑,用户不白等;前端拿
   * taskId 后轮询 GET status 看进度。这与同步版的本质差别在计费时机——同步版靠拦截器在 handler
   * 返回时扣点,异步版 handler 立即 202 返回,故扣点必须挪到后台任务"真实成功"(落 awaiting_confirm)
   * 时由本 service 内部完成(chargeTranscribe),对齐 check-in"真实成功才计费"理念。
   *
   * 防编造红线:
   *  - SpeechService/LabelService 内部对上游失败/空结果均显式抛错,后台 runner 不吞错、不兜底空。
   *  - 任一阶段异常 → 标 task.status=failed + 记 failed_at_stage,且不扣点(前端轮询见 failed)。
   * 隐私铁律:audio Buffer 仅在内存存活,转写结束即出作用域 GC;interview.audio_url 全程 null。
   */
  async transcribe(
    id: string,
    userId: string,
    audio: Buffer,
    mimeType: string,
    meta?: UploadMeta,
  ): Promise<TranscribeStartedResponse> {
    // 所有权校验:非本人面试 → 404(不泄露存在性)。建任务前先校验,不为越权请求建任务。
    const interview = await this.findOne(id, userId);

    // 余额预检:整条复盘链路总成本 7 点(转写 1 + 分析 6),接活前校验余额 ≥ 7,不足 → 402 且不建任务。
    // CreditGuard 只保证 ≥ 1(够付不代表够付 7),故重端点的足额预检放在 service 内由本方法兜住。
    const enough = await this.credit.hasBalance(userId, FULL_DEBRIEF_CREDIT_COST);
    if (!enough) {
      throw new HttpException(
        { message: `点数不足，本次录音转写复盘需 ${FULL_DEBRIEF_CREDIT_COST} 点，请联系管理员充值` },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const hotwords = this.buildHotwords(interview);

    // 建任务时落上传元数据(仅文件名/字节数/MIME/收到时刻,非音频内容):桌面端「已收到上传」回执据此即时渲染。
    // uploaded_at 始终记为「收到 multipart 那一刻」(meta 有无均记);三项文件元数据仅 meta 提供时落,否则 null。
    const task = await this.taskRepo.save(
      this.taskRepo.create({
        interview_id: interview.id,
        user_id: userId,
        status: 'submitted',
        original_filename: meta?.originalFilename ?? null,
        file_size_bytes: meta?.fileSizeBytes ?? null,
        mime_type: meta?.mimeType ?? null,
        uploaded_at: new Date(),
      }),
    );

    // 后台跑转写+打标:不 await,handler 立即 202 返回 taskId。runner 自身吞掉所有异常
    // (内部已标 task=failed),故这里 void 即可,不会留下未处理的 rejection。
    void this.runTranscribe(task.id, userId, audio, mimeType, hotwords);

    return { taskId: task.id };
  }

  /**
   * 后台转写+打标 runner。由 transcribe() fire-and-forget 调起,不向调用方抛错。
   *
   * 成功(落 awaiting_confirm)时调 chargeTranscribe 扣转写费 1 点 + 记 ai_usage(真实成功才计费);
   * 任一阶段失败 → 标 task=failed + 记 failed_at_stage,不扣点(失败不计费)。分析费 6 点不在此扣,见 chargeAnalysis。
   */
  private async runTranscribe(
    taskId: string,
    userId: string,
    audio: Buffer,
    mimeType: string,
    hotwords: string[],
  ): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) {
      // 理论不达:任务刚由 transcribe() 落库。极端竞态(任务被删)下仅记日志,不扣点。
      this.logger.error(`后台转写找不到任务 taskId=${taskId},放弃执行`);
      return;
    }

    try {
      // 1) 转写:岗位/技术热词传入纠正同音黑话(全栈→全站)。
      await this.setTaskStatus(task, 'transcribing');
      const segments = await this.speech.transcribeFile(audio, mimeType, hotwords);

      // 1.5) 非面试内容闸门:转写已得、打标/复盘未起,此处快闸把空录音/误传/非面试录音挡在
      //      昂贵的 LLM 打标 + 复盘之前,省用户额度。判定为非面试 → 抛友好错(走 catch → failed),
      //      用户可在失败态删除/重新上传。失败不计费(扣点在落 awaiting_confirm 时才发生)。
      await this.assertLooksLikeInterview(segments);

      // 2) 角色打标:LLM 判 interviewer|candidate,失败/漂移在 LabelService 内抛错。
      await this.setTaskStatus(task, 'labeling');
      const labeled = await this.label.label(segments);

      // 3) 补 idx(LabelService 输出无 idx,落库/前端/confirm 均按数组下标定位)→ 落 segments_json。
      const withIdx: LabeledSegment[] = labeled.map((seg, idx) => ({
        idx,
        text: seg.text,
        startMs: seg.startMs,
        endMs: seg.endMs,
        speaker: seg.speaker,
      }));
      task.segments_json = withIdx;
      task.status = 'awaiting_confirm';
      await this.taskRepo.save(task);

      // 转写+打标"真实成功" → 此刻扣转写费 1 点 + 记 ai_usage(失败不会走到这里,故失败不计费)。
      await this.chargeTranscribe(userId);
    } catch (err) {
      // 失败:标 task=failed + 记 failed_at_stage,不扣点;前端轮询看到 failed + errorMessage。
      await this.markTaskFailed(task, err);
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `后台转写失败 taskId=${taskId} stage=${task.failed_at_stage}: ${reason}`,
      );
      // 仅「真正的 AI/ASR 失败」(5xx/超时/provider-down/非 HttpException)才入运维流水(AI_CALL_FAILED)。
      // 非面试闸门拒绝(assertLooksLikeInterview 抛 BadRequestException,4xx 客户端类)是预期的用户输入
      // 拒绝、不是 AI 坏了:不发此事件,以免污染管理面板成功率分母、并在 recent-failures 里冒充 AI 故障。
      // 与 HTTP 层 AiUsageInterceptor 共用同一 isAiCallFailure 判定(单一真相源)。task 仍标 failed
      // (用户能看原因 + 删除/重传),只是 4xx 不发 ops 事件。
      // record 内部不抛错(写失败仅 warn),故 fire-and-forget,不影响失败态落库。
      // detail 键对齐 AiUsageInterceptor 约定(endpoint/user_id/error),否则 recent-failures DTO
      // 读不到(它取 detail.endpoint/user_id/error),转写失败在管理面板会丢失「谁/为何」;stage 额外标转写阶段。
      if (isAiCallFailure(err)) {
        void this.opsEvents.record('AI_CALL_FAILED', {
          endpoint: TRANSCRIBE_ENDPOINT,
          user_id: userId,
          error: reason,
          stage: 'transcribe',
        });
      }
    }
  }

  /**
   * 非面试内容闸门:在转写之后、昂贵的打标+复盘之前,用两道廉价检查挡掉空录音/误传/非面试录音,
   * 省用户额度。不通过 → 抛友好中文错(由 runTranscribe 的 catch 标 task=failed,失败不计费)。
   *
   * 两道闸:
   *  (a) 结构闸(零成本):段数 < MIN_INTERVIEW_SEGMENTS 或合并正文 < MIN_INTERVIEW_TRANSCRIPT_CHARS
   *      → 直接判定内容过短/无人声,不必动用 LLM。
   *  (b) 主题闸(一次最廉价的 flash 裸文本调用,非结构化工具、极少 token):问模型"是否面试对话,
   *      只回 是/否"。明确回"否"才拦;空回复/异常/含糊一律放行(treat ambiguous as 是),
   *      宁可放过个别非面试,也绝不误杀真实面试。
   */
  private async assertLooksLikeInterview(
    segments: TranscriptSegment[],
  ): Promise<void> {
    // (a) 结构闸:段数 / 合并正文字数。
    const mergedText = segments
      .map((s) => s.text?.trim() ?? '')
      .filter((t) => t.length > 0)
      .join('');
    if (
      segments.length < MIN_INTERVIEW_SEGMENTS ||
      mergedText.length < MIN_INTERVIEW_TRANSCRIPT_CHARS
    ) {
      throw new BadRequestException('录音内容过短或无人声，请上传完整的面试录音');
    }

    // (b) 主题闸:一次最廉价的裸文本 yes/no(flash 档,不走结构化工具,只回单字)。
    //     仅取开头摘录够判主题,长面试不整篇塞进去。
    const excerpt = mergedText.slice(0, INTERVIEW_GATE_EXCERPT_CHARS);
    let answer: string;
    try {
      answer = await this.ai.complete({
        system: '你是面试内容判别器。只输出一个汉字:是 或 否,不要任何解释或标点。',
        prompt: `下面是否为一段求职面试对话?只回 是 或 否:\n${excerpt}`,
        tier: 'flash',
        maxTokens: 8,
      });
    } catch (err) {
      // 判别调用本身失败(通道抖动/超时):不拦,放行让正常流程继续(避免因闸门误杀真实面试)。
      this.logger.warn(
        `非面试闸判别调用失败,放行继续:${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    // 只有明确以"否"开头才拦;含糊/空/带其他字一律视作"是"(放行),宁放过不误杀。
    if (answer.trim().startsWith('否')) {
      throw new BadRequestException(
        '这段录音不像面试内容，已停止分析以免浪费额度，请上传面试录音',
      );
    }
  }

  /**
   * 转写"真实成功"后扣转写费 1 点 + 记一条 ai_usage(双轨计账,与 CreditInterceptor/AiUsageInterceptor
   * 同口径:credit 账务、ai_usage 运营)。这是转写段的唯一扣点;分析费 6 点由 chargeAnalysis 在 confirm
   * 分析成功时另扣,故一次完整复盘恰好扣 7 点(1 + 6,不双扣)。
   * 扣点/记账失败均不抛错(不能让计账失败回滚已完成的转写)——仅记日志,与拦截器 fire-and-forget catch 同语义。
   */
  private async chargeTranscribe(userId: string): Promise<void> {
    try {
      await this.credit.consume(userId, TRANSCRIBE_ENDPOINT, TRANSCRIPT_CREDIT_COST);
    } catch (err) {
      this.logger.error(
        `转写扣点失败 userId=${userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    try {
      await this.aiUsageRepo.insert({ user_id: userId, endpoint: TRANSCRIBE_ENDPOINT });
    } catch (err) {
      this.logger.error(
        `转写 ai_usage 写入失败 userId=${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * confirm 分析"真实成功"后扣分析费 6 点(幂等 + 并发安全:同一 task 的 6 点最多扣一次)。
   *
   * 幂等护栏改为 **DB 级原子 CAS**(compare-and-set)而非内存读 flag:并发 confirm/重试可能同时读到
   * analysis_charged=false 都进来扣 6(双扣)。这里以 `UPDATE ... SET analysis_charged=true
   * WHERE id=? AND analysis_charged=false` 的 affected 行数仲裁结算权:
   *  - affected===1:本请求抢到「结算权」(由 false→true 那一手只可能有一个赢家)→ 扣 6。
   *  - affected===0:已被另一个并发请求/此前重试结清(或被 B 迁移回填成 true)→ 不扣,直接返回。
   * 这样无论多少个并发 confirm 同时跑,DB 原子条件更新保证只有一个赢家扣费,钱绝不双扣。
   *
   * consume 仍包 try/catch 仅记日志、不抛错(沿用「计费尽力而为、不回滚已交付的分析结果」哲学)。
   * 注意:CAS 已先把 flag 置 true,consume 之后抛错的极罕见漏扣边角保持现状,不为它加复杂回滚。
   * 内存 task.analysis_charged 同步置 true,保持调用方拿到的实体与库一致。
   * 不在此记 ai_usage:confirm 端点已挂 AiUsageInterceptor,运营计数由它负责(一次成功 confirm = 一条 ai_usage),
   * 此处再插会破坏既有「confirm 共 2 条 ai_usage」断言,故仅扣 credit。
   */
  private async chargeAnalysis(
    userId: string,
    task: InterviewTranscribeTask,
  ): Promise<void> {
    // 原子领取结算权:仅当库中该行仍 analysis_charged=false 时置 true,affected 行数即仲裁结果。
    let affected = 0;
    try {
      const result = await this.taskRepo.update(
        { id: task.id, analysis_charged: false },
        { analysis_charged: true },
      );
      affected = result.affected ?? 0;
    } catch (casErr) {
      // CAS 自身落库异常(极罕见):记日志并视为未抢到(不扣,避免在不确定是否置位时扣费)。
      this.logger.error(
        `分析计费 CAS 失败 taskId=${task.id}: ${String(casErr)}`,
      );
      return;
    }

    // 内存实体同步置 true,保持调用方拿到的 task 与库一致(无论是否本请求结清)。
    task.analysis_charged = true;

    if (affected !== 1) {
      // 已被另一并发/重试结清(或迁移回填):不重复扣 6。
      return;
    }

    // 本请求抢到结算权:扣分析费 6 点(失败仅记日志,不回滚已交付的分析结果)。
    try {
      await this.credit.consume(userId, TRANSCRIBE_ENDPOINT, ANALYSIS_CREDIT_COST);
    } catch (err) {
      this.logger.error(
        `分析扣点失败 userId=${userId} taskId=${task.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * 轮询任务状态。返回最新一条该面试的转写任务(按创建时间倒序),非本人面试 → 404。
   * segmentsJson 仅在 awaiting_confirm 及之后非空(供前端渲染可纠正列表)。
   */
  async getTranscribeStatus(
    id: string,
    userId: string,
  ): Promise<TranscribeStatusResponse> {
    // 先校验面试所有权(404 不泄露存在性)。
    await this.findOne(id, userId);

    const task = await this.taskRepo.findOne({
      where: { interview_id: id, user_id: userId },
      order: { created_at: 'DESC' },
    });
    if (!task) throw new NotFoundException();

    return {
      taskId: task.id,
      status: task.status,
      errorMessage: task.error_message,
      failedAtStage: task.failed_at_stage,
      segmentsJson: task.segments_json,
      // 上传元数据回执(非音频内容):桌面端据此即时渲染「已收到上传」。
      originalFilename: task.original_filename,
      fileSizeBytes: task.file_size_bytes,
      mimeType: task.mime_type,
      uploadedAt: toIsoString(task.uploaded_at),
    };
  }

  /**
   * 删除某条转写任务(硬删)。严格双重所有权:任务须属于该面试,且该面试须属于当前用户,否则 404。
   *
   * 用途:失败态恢复——「重新上传」(清掉 failed task 后让用户重新上传一段录音,因音频已 GC、
   * 无法服务端重转写)与「删除记录」(把失败任务清掉回到上传前态)。不限定 status:
   * 删任意属于自己的任务(端点宽于「仅 failed」,前端只在 failed 分支暴露入口)。
   * 隐私无涉:任务表本就不存音频,删行不触及任何音频(本就没有)。
   */
  async deleteTranscribeTask(
    id: string,
    taskId: string,
    userId: string,
  ): Promise<void> {
    // 1) 面试所有权:非本人/不存在 → 404(不泄露存在性)。
    await this.findOne(id, userId);

    // 2) 任务须同时匹配 interview_id + user_id(双重所有权),否则 404。
    const task = await this.taskRepo.findOne({
      where: { id: taskId, interview_id: id, user_id: userId },
    });
    if (!task) throw new NotFoundException();

    await this.taskRepo.remove(task);
  }

  /**
   * 用户确认/纠正角色后触发分析:按 idx 覆盖 speaker(只改 speaker 不改 text,防篡改)→
   * 组装带角色前缀的 transcript → DebriefService.analyze(签名零改动)→ 写回 Interview → completed。
   *
   * 同步编排:analyze 失败(过短 400 / AI 故障 503)直接上抛 → 失败不计费;任务标 failed。
   * 非本人面试/任务不匹配 → 404;idx 越界/缺/多 → 400(防篡改与防编造双重校验)。
   * 不造假态:成功 completed 前 Interview.scores 保持原值(此前为 null)。
   */
  async confirmTranscribe(
    id: string,
    taskId: string,
    userId: string,
    corrections: LabelCorrectionDto[],
  ): Promise<Interview> {
    const interview = await this.findOne(id, userId);

    const task = await this.taskRepo.findOne({
      where: { id: taskId, interview_id: id, user_id: userId },
    });
    if (!task) throw new NotFoundException();

    const stored = task.segments_json;
    if (!stored || stored.length === 0) {
      throw new BadRequestException('该转写任务尚无可确认的标注内容');
    }
    // 守卫放宽:允许两种状态进入 confirm/重试 ——
    //  (1) awaiting_confirm:首次确认。
    //  (2) failed 且 failed_at_stage==='analyzing':分析阶段失败的免重传重试(转写已存于 segments_json,可直接重跑)。
    // 其它一律拒:特别地,failed 但 failed_at_stage 为 transcribing/labeling(或其它)的没有可用 transcript,
    // 必须重新上传,不在此放行。
    const isFirstConfirm = task.status === 'awaiting_confirm';
    const isAnalysisRetry =
      task.status === 'failed' && task.failed_at_stage === 'analyzing';
    if (!isFirstConfirm && !isAnalysisRetry) {
      throw new BadRequestException('该转写任务当前状态不可确认');
    }

    // 按 idx 覆盖 speaker:校验一一对应,越界/缺/多 → 400(防篡改:客户端不得改 text、不得伪造 idx)。
    const merged = this.applyCorrections(stored, corrections);

    // 并发认领:原子地把该 task 从「可确认态」翻到 'analyzing',affected 仲裁唯一执行者。
    // 两个并发 confirm(同 user 同 task)都会先读到同一可确认态,但只有一个的条件 UPDATE 能命中
    // (status 由可确认态翻成 analyzing 后,另一个的 WHERE 不再匹配)→ affected≠1 直接 409 拒绝,
    // 避免两路都跑一遍昂贵的 LLM analyze。WHERE 精确锁定本请求观察到的那一态(首次确认 awaiting_confirm,
    // 或分析重试 failed@analyzing),防止误抢到中途被改成别的态的 task。
    // 注:这步是省 token + 防态 churn;钱的不双扣由 chargeAnalysis 的 CAS 兜底,即便此处被绕过也不会多扣。
    const claimWhere = isFirstConfirm
      ? { id: task.id, status: 'awaiting_confirm' as TranscribeStatus }
      : {
          id: task.id,
          status: 'failed' as TranscribeStatus,
          failed_at_stage: 'analyzing',
        };
    const claim = await this.taskRepo.update(claimWhere, { status: 'analyzing' });
    if ((claim.affected ?? 0) !== 1) {
      throw new ConflictException('该任务正在分析中,请勿重复提交');
    }
    // 认领成功:内存实体同步到 analyzing(后续 markTaskFailed 据 task.status 记 failed_at_stage)。
    task.status = 'analyzing';

    try {
      task.segments_json = merged;
      await this.taskRepo.save(task);

      // 组装带角色前缀的转写正文喂现有 analyze(text 以服务端 segments_json 为准)。
      const transcript = merged
        .map((seg) => `[${SPEAKER_PREFIX[seg.speaker]}] ${seg.text}`)
        .join('\n');

      const result = await this.debrief.analyze(
        transcript,
        interview.company ?? undefined,
        interview.role ?? undefined,
        interview.round,
      );

      // analyze 成功才写回 Interview:scores 此刻才非空,之前保持 null(不造假态)。
      interview.transcript = transcript;
      Object.assign(interview, result);
      await this.repo.save(interview);

      task.status = 'completed';
      await this.taskRepo.save(task);

      // 分析"真实成功"那一刻扣分析费 6 点(幂等:task.analysis_charged 护栏,重试不双扣)。
      await this.chargeAnalysis(userId, task);

      return this.findOne(id, userId);
    } catch (err) {
      await this.markTaskFailed(task, err);
      throw err;
    }
  }

  /** 把纠正项按 idx 覆盖到存储段的 speaker;严格校验一一对应(防篡改 + 防编造)。 */
  private applyCorrections(
    stored: LabeledSegment[],
    corrections: LabelCorrectionDto[],
  ): LabeledSegment[] {
    if (corrections.length !== stored.length) {
      throw new BadRequestException(
        `提交的标注数量(${corrections.length})与转写段落数量(${stored.length})不一致`,
      );
    }

    const byIdx = new Map<number, LabelCorrectionDto['speaker']>();
    for (const c of corrections) {
      if (c.idx < 0 || c.idx >= stored.length) {
        throw new BadRequestException(
          `标注下标越界 idx=${c.idx}(有效范围 0..${stored.length - 1})`,
        );
      }
      if (byIdx.has(c.idx)) {
        throw new BadRequestException(`标注下标重复 idx=${c.idx}`);
      }
      byIdx.set(c.idx, c.speaker);
    }

    return stored.map((seg) => {
      const speaker = byIdx.get(seg.idx);
      if (speaker === undefined) {
        throw new BadRequestException(`缺少下标 idx=${seg.idx} 的标注`);
      }
      // 只覆盖 speaker,text/startMs/endMs/idx 一律以服务端存储为准(防篡改)。
      return { ...seg, speaker };
    });
  }

  /** 由面试公司/岗位/轮次构造热词,纠正同音技术黑话;去空去重。 */
  private buildHotwords(interview: Interview): string[] {
    const raw = [interview.company, interview.role, interview.round];
    const seen = new Set<string>();
    const hotwords: string[] = [];
    for (const item of raw) {
      const v = item?.trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        hotwords.push(v);
      }
    }
    return hotwords;
  }

  private async setTaskStatus(
    task: InterviewTranscribeTask,
    status: TranscribeStatus,
  ): Promise<void> {
    task.status = status;
    await this.taskRepo.save(task);
  }

  /** 标记任务失败:记当前阶段 + 错误信息(不含敏感堆栈),供前端轮询展示。 */
  private async markTaskFailed(
    task: InterviewTranscribeTask,
    err: unknown,
  ): Promise<void> {
    task.failed_at_stage = task.status;
    task.status = 'failed';
    task.error_message = err instanceof Error ? err.message : String(err);
    try {
      await this.taskRepo.save(task);
    } catch (saveErr) {
      // 标失败态本身落库失败:仅记日志,不掩盖原始错误(原始错误仍会被调用方上抛)。
      this.logger.error(`标记转写任务失败态时落库出错: ${String(saveErr)}`);
    }
  }
}
