import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

// 转写扣点端点标识:写入 credit_transactions.endpoint / ai_usage.endpoint(与控制器路由模板同口径)。
const TRANSCRIBE_ENDPOINT = '/api/interviews/:id/transcribe';

// 「一次录音转写复盘」总成本 = 7 点。这是 ASR 转写 + LLM 角色打标 + LLM 复盘分析三段重活的合计定价。
// 计费铁律:整条复盘链路只在「转写+打标真实成功」(落 awaiting_confirm)那一刻一次性扣满 7 点;
// 后续 confirm/analyze 段不再额外扣点(避免双扣),故用户一次完整复盘恰好扣 7 点,不多不少。
const TRANSCRIBE_DEBRIEF_CREDIT_COST = 7;

/** POST /interviews/:id/transcribe 的 202 响应:仅回 taskId,前端据此轮询 status。 */
export interface TranscribeStartedResponse {
  taskId: string;
}

/**
 * POST /interviews/:id/upload-token 的响应:scoped 一次性令牌 + 手机端直传路径。
 * 前端把 uploadPath 拼上站点 origin 编成二维码;手机扫码打开豁免页(无需登录)直传音频。
 */
export interface QrUploadTokenResponse {
  /** scoped 短令牌(不透明随机 id,服务端映射绑定 interviewId+user,60s 过期,一次性)。 */
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
  segmentsJson: LabeledSegment[] | null;
}

// 前端展示用角色前缀,组装喂给 DebriefService.analyze 的带角色 transcript。
const SPEAKER_PREFIX: Record<LabeledSegment['speaker'], string> = {
  interviewer: '面试官',
  candidate: '用户',
};

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
   * 任务建成后由 controller 烧令牌(失败不烧,允许 60s 内重试)。
   */
  async transcribeViaQrToken(
    interviewId: string,
    userId: string,
    audio: Buffer,
    mimeType: string,
  ): Promise<TranscribeStartedResponse> {
    return this.transcribe(interviewId, userId, audio, mimeType);
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
  ): Promise<TranscribeStartedResponse> {
    // 所有权校验:非本人面试 → 404(不泄露存在性)。建任务前先校验,不为越权请求建任务。
    const interview = await this.findOne(id, userId);

    // 余额预检:整条复盘链路总成本 7 点,接活前校验余额 ≥ 7,不足 → 402 且不建任务。
    // CreditGuard 只保证 ≥ 1(够付不代表够付 7),故重端点的足额预检放在 service 内由本方法兜住。
    const enough = await this.credit.hasBalance(userId, TRANSCRIBE_DEBRIEF_CREDIT_COST);
    if (!enough) {
      throw new HttpException(
        { message: `点数不足，本次录音转写复盘需 ${TRANSCRIBE_DEBRIEF_CREDIT_COST} 点，请联系管理员充值` },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const hotwords = this.buildHotwords(interview);

    const task = await this.taskRepo.save(
      this.taskRepo.create({
        interview_id: interview.id,
        user_id: userId,
        status: 'submitted',
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
   * 成功(落 awaiting_confirm)时调 chargeTranscribe 扣 1 点 + 记 ai_usage(真实成功才计费);
   * 任一阶段失败 → 标 task=failed + 记 failed_at_stage,不扣点(失败不计费)。
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

      // 转写+打标"真实成功" → 此刻扣 1 点 + 记 ai_usage(失败不会走到这里,故失败不计费)。
      await this.chargeTranscribe(userId);
    } catch (err) {
      // 失败:标 task=failed + 记 failed_at_stage,不扣点;前端轮询看到 failed + errorMessage。
      await this.markTaskFailed(task, err);
      this.logger.error(
        `后台转写失败 taskId=${taskId} stage=${task.failed_at_stage}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * 转写"真实成功"后一次性扣满 7 点(整条复盘链路总成本)+ 记一条 ai_usage(双轨计账,与
   * CreditInterceptor/AiUsageInterceptor 同口径:credit 账务、ai_usage 运营)。
   * 这是全链路唯一的扣点点——后续 confirm/analyze 段不再扣,故一次完整复盘恰好扣 7 点(不双扣)。
   * 扣点/记账失败均不抛错(不能让计账失败回滚已完成的转写)——仅记日志,与拦截器 fire-and-forget catch 同语义。
   */
  private async chargeTranscribe(userId: string): Promise<void> {
    try {
      await this.credit.consume(userId, TRANSCRIBE_ENDPOINT, TRANSCRIBE_DEBRIEF_CREDIT_COST);
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
      segmentsJson: task.segments_json,
    };
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
    if (task.status !== 'awaiting_confirm') {
      throw new BadRequestException('该转写任务当前状态不可确认');
    }

    // 按 idx 覆盖 speaker:校验一一对应,越界/缺/多 → 400(防篡改:客户端不得改 text、不得伪造 idx)。
    const merged = this.applyCorrections(stored, corrections);

    try {
      task.segments_json = merged;
      await this.setTaskStatus(task, 'analyzing');

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
