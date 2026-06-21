/**
 * 分段计费 + 重试不双扣 e2e
 *
 * 被测逻辑(interviews.service.ts 新计费模型):
 *  - TRANSCRIPT_CREDIT_COST=1:转写+打标成功(落 awaiting_confirm)时扣。
 *  - ANALYSIS_CREDIT_COST=6:confirm 分析成功(落 completed)时扣,task.analysis_charged 幂等护栏。
 *  - FULL_DEBRIEF_CREDIT_COST=7:提交前余额预检仍要 >=7。
 *
 * 成功判据(先于代码定义):
 *  (a) transcribe+label 成功落 awaiting_confirm → 恰扣 1(delta=-1),ai_usage +1,余额 -1。
 *  (b) confirm → analysis 成功(completed)→ 再扣 6,合计 -7;task.analysis_charged=true;ai_usage +1。
 *  (c) analysis 失败 → 合计仍只扣 1;status=failed,failed_at_stage=analyzing;analysis_charged=false。
 *  (d) 重试:failed@analyzing 任务再 PATCH confirm → 成功 → 只补扣 6,合计 7,不双扣;analysis_charged=true。
 *  (e) transcribing/labeling 阶段失败任务再 confirm → 400 '该转写任务当前状态不可确认'。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type {
  SpeechProvider,
  TranscriptSegment,
} from '../src/speech/providers/speech.provider';
import { User } from '../src/users/entities/user.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { InterviewTranscribeTask } from '../src/speech/entities/transcribe-task.entity';
import { request } from './test-utils';

// ── ASR 开关 ──
let asrFailMode = false;
let asrSegmentsOverride: TranscriptSegment[] | null = null;

const FAKE_SEGMENTS: TranscriptSegment[] = [
  { text: '你好,先做个自我介绍吧。', startMs: 0, endMs: 2000 },
  { text: '我叫小明,本科计算机专业,做过两个全栈项目,主要用 React 和 NestJS。', startMs: 2000, endMs: 6000 },
  { text: '能讲讲你在第二个项目里负责的核心模块吗?', startMs: 6000, endMs: 9000 },
  { text: '我主要负责支付链路的对账服务,从设计到上线都参与了。', startMs: 9000, endMs: 13000 },
];

const fakeSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  async transcribeFile(): Promise<TranscriptSegment[]> {
    if (asrFailMode) throw new Error('ASR 上游不可用(测试注入)');
    if (asrSegmentsOverride !== null) return asrSegmentsOverride.map((s) => ({ ...s }));
    return FAKE_SEGMENTS.map((s) => ({ ...s }));
  },
};

const LABEL_RESULT = {
  segments: [
    { idx: 0, speaker: 'interviewer' },
    { idx: 1, speaker: 'candidate' },
    { idx: 2, speaker: 'interviewer' },
    { idx: 3, speaker: 'candidate' },
  ],
};

const DEBRIEF_RESULT = {
  overall_grade: 'B+',
  overall_note: '整体表现稳健。',
  scores: [{ dimension: '技术深度', score: 80, tone: 'good', comment: 'ok' }],
  questions: [
    {
      question: '自我介绍',
      tone: 'good',
      coach_note: '清晰',
      better_answer: '更优示例',
      blind_spots: [],
    },
  ],
  prediction: { next_round_topics: [{ topic: '项目深挖', probability: 70 }] },
};

// 分析失败开关:首次调用 interview_debrief 时抛错;关闭后恢复成功。
let debriefFailMode = false;

const mockAiService = {
  complete: jest.fn().mockImplementation(() => Promise.resolve('是')),
  completeStructured: jest.fn().mockImplementation((params: { toolName?: string }) => {
    if (params.toolName === 'label_speakers') {
      return Promise.resolve(LABEL_RESULT);
    }
    if (params.toolName === 'interview_debrief') {
      if (debriefFailMode) {
        return Promise.reject(new Error('AI 分析失败(测试注入)'));
      }
      return Promise.resolve(DEBRIEF_RESULT);
    }
    return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
  }),
};

const FAKE_AUDIO = Buffer.from('fake-audio-bytes');

const CONFIRM_SEGMENTS = [
  { idx: 0, speaker: 'interviewer' },
  { idx: 1, speaker: 'candidate' },
  { idx: 2, speaker: 'interviewer' },
  { idx: 3, speaker: 'candidate' },
];

// ── 辅助函数 ──

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string;
  if (!devCode) throw new Error(`无 dev_code: ${JSON.stringify(codeRes.body)}`);
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

async function createInterview(app: INestApplication, token: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/interviews')
    .set('Authorization', `Bearer ${token}`)
    .send({ round: '技术一面', company: 'Acme', role: '全栈工程师' });
  expect(res.status).toBe(201);
  await new Promise((r) => setTimeout(r, 200));
  return res.body.id as string;
}

async function pollStatus(
  app: INestApplication,
  token: string,
  interviewId: string,
  until: (status: string) => boolean,
  timeoutMs = 10000,
): Promise<{ status: string; segmentsJson: unknown; taskId: string; errorMessage: string | null; failedAtStage: string | null }> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const res = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (until(res.body.status as string)) return res.body;
    if (Date.now() > deadline) throw new Error(`轮询超时,最后状态=${res.body.status as string}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

// ── 测试套件 ──

describe('分段计费 + 重试不双扣 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<CreditTransaction>;
  let aiUsageRepo: Repository<AiUsage>;
  let taskRepo: Repository<InterviewTranscribeTask>;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.STEP_API_KEY = 'test-step-key';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .overrideProvider(SPEECH_PROVIDER)
      .useValue(fakeSpeechProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    txRepo = moduleRef.get<Repository<CreditTransaction>>(getRepositoryToken(CreditTransaction));
    aiUsageRepo = moduleRef.get<Repository<AiUsage>>(getRepositoryToken(AiUsage));
    taskRepo = moduleRef.get<Repository<InterviewTranscribeTask>>(getRepositoryToken(InterviewTranscribeTask));
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    asrFailMode = false;
    asrSegmentsOverride = null;
    debriefFailMode = false;
    jest.clearAllMocks();
    // 重置 mock 实现,clearAllMocks 只清调用记录不还原实现
    (mockAiService.complete as jest.Mock).mockImplementation(() => Promise.resolve('是'));
    (mockAiService.completeStructured as jest.Mock).mockImplementation((params: { toolName?: string }) => {
      if (params.toolName === 'label_speakers') return Promise.resolve(LABEL_RESULT);
      if (params.toolName === 'interview_debrief') {
        if (debriefFailMode) return Promise.reject(new Error('AI 分析失败(测试注入)'));
        return Promise.resolve(DEBRIEF_RESULT);
      }
      return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
    });
  });

  // ── (a) transcribe 成功落 awaiting_confirm → 恰扣 1 点 ────────────────────
  it('(a) transcribe 成功落 awaiting_confirm → 恰扣 1(delta=-1),ai_usage +1,余额 -1', async () => {
    const email = `billing-a-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '计费测试a');
    const interviewId = await createInterview(app, token);

    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const beforeUsageCount = await aiUsageRepo.count({ where: { user_id: user.id } });

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);

    // 等待落 awaiting_confirm
    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');

    // 验证:恰新增 1 条 consume,delta=-1,余额 -1
    const afterConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsumeCount - beforeConsumeCount).toBe(1);

    const lastConsume = await txRepo.findOne({
      where: { user_id: user.id, type: 'consume' },
      order: { created_at: 'DESC' },
    });
    expect(lastConsume?.delta).toBe(-1);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 1);

    // ai_usage +1(转写段)
    const afterUsageCount = await aiUsageRepo.count({ where: { user_id: user.id } });
    expect(afterUsageCount - beforeUsageCount).toBe(1);
  }, 30000);

  // ── (b) confirm 分析成功 → 再扣 6,合计 7;analysis_charged=true ────────────
  it('(b) confirm 分析成功(completed)→ 再扣 6,合计余额 -7;task.analysis_charged=true;ai_usage 共 +2', async () => {
    const email = `billing-b-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '计费测试b');
    const interviewId = await createInterview(app, token);

    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const beforeUsageCount = await aiUsageRepo.count({ where: { user_id: user.id } });

    // 1) transcribe → awaiting_confirm(扣 1)
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;

    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');

    // 转写段:已扣 1
    const midBalance = (await userRepo.findOneByOrFail({ id: user.id })).credit_balance;
    expect(midBalance).toBe(beforeBalance - 1);

    // 2) confirm → analysis 成功(扣 6)
    const confirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: CONFIRM_SEGMENTS });
    expect(confirm.status).toBe(200);

    // 等待 fire-and-forget 的 chargeAnalysis + AiUsageInterceptor 落库
    await new Promise((r) => setTimeout(r, 300));

    // credit 新增 2 条 consume(-1 和 -6),合计余额 -7
    const afterConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsumeCount - beforeConsumeCount).toBe(2);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 7);

    // 最新 consume 是 -6 的分析费
    const consumes = await txRepo.find({
      where: { user_id: user.id, type: 'consume' },
      order: { created_at: 'ASC' },
    });
    const deltas = consumes.slice(-2).map((c) => c.delta);
    expect(deltas).toContain(-1);
    expect(deltas).toContain(-6);

    // analysis_charged=true
    const task = await taskRepo.findOne({ where: { id: taskId } });
    expect(task?.analysis_charged).toBe(true);
    expect(task?.status).toBe('completed');

    // ai_usage +2(转写 1 + confirm AiUsageInterceptor 1)
    const afterUsageCount = await aiUsageRepo.count({ where: { user_id: user.id } });
    expect(afterUsageCount - beforeUsageCount).toBe(2);
  }, 30000);

  // ── (c) analysis 失败 → 合计仍只扣 1;status=failed,failed_at_stage=analyzing ─
  it('(c) analysis 失败 → 只扣 1;task.status=failed,failed_at_stage=analyzing;analysis_charged=false', async () => {
    const email = `billing-c-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '计费测试c');
    const interviewId = await createInterview(app, token);

    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });

    // 1) transcribe → awaiting_confirm(扣 1)
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;

    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');

    // 2) 让分析失败
    debriefFailMode = true;
    (mockAiService.completeStructured as jest.Mock).mockImplementation((params: { toolName?: string }) => {
      if (params.toolName === 'label_speakers') return Promise.resolve(LABEL_RESULT);
      if (params.toolName === 'interview_debrief') return Promise.reject(new Error('AI 分析失败(测试注入)'));
      return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
    });

    const confirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: CONFIRM_SEGMENTS });
    // confirm 抛出分析失败 → 500 或 503(分析失败上抛)
    expect(confirm.status).toBeGreaterThanOrEqual(400);

    await new Promise((r) => setTimeout(r, 200));

    // 合计只扣 1(分析失败不扣 6)
    const afterConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsumeCount - beforeConsumeCount).toBe(1);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 1);

    // task.status=failed,failed_at_stage=analyzing,analysis_charged=false
    const task = await taskRepo.findOne({ where: { id: taskId } });
    expect(task?.status).toBe('failed');
    expect(task?.failed_at_stage).toBe('analyzing');
    expect(task?.analysis_charged).toBe(false);
  }, 30000);

  // ── (d) 重试:failed@analyzing 再 confirm 成功 → 只补扣 6,合计 7,不双扣 ─────
  it('(d) 重试 failed@analyzing → 只补扣 6,合计 7,不双扣;analysis_charged=true', async () => {
    const email = `billing-d-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '计费测试d');
    const interviewId = await createInterview(app, token);

    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });

    // 1) transcribe → awaiting_confirm(扣 1)
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;

    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');

    // 2) 第一次 confirm:分析失败 → failed@analyzing
    (mockAiService.completeStructured as jest.Mock).mockImplementation((params: { toolName?: string }) => {
      if (params.toolName === 'label_speakers') return Promise.resolve(LABEL_RESULT);
      if (params.toolName === 'interview_debrief') return Promise.reject(new Error('AI 分析失败(测试注入)'));
      return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
    });

    const firstConfirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: CONFIRM_SEGMENTS });
    expect(firstConfirm.status).toBeGreaterThanOrEqual(400);

    await new Promise((r) => setTimeout(r, 200));

    // 确认 task 变 failed@analyzing
    const failedTask = await taskRepo.findOne({ where: { id: taskId } });
    expect(failedTask?.status).toBe('failed');
    expect(failedTask?.failed_at_stage).toBe('analyzing');
    expect(failedTask?.analysis_charged).toBe(false);

    // 此时只扣了 1
    const midBalance = (await userRepo.findOneByOrFail({ id: user.id })).credit_balance;
    expect(midBalance).toBe(beforeBalance - 1);

    // 3) 重试:恢复分析成功
    (mockAiService.completeStructured as jest.Mock).mockImplementation((params: { toolName?: string }) => {
      if (params.toolName === 'label_speakers') return Promise.resolve(LABEL_RESULT);
      if (params.toolName === 'interview_debrief') return Promise.resolve(DEBRIEF_RESULT);
      return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
    });

    const retryConfirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: CONFIRM_SEGMENTS });
    expect(retryConfirm.status).toBe(200);

    await new Promise((r) => setTimeout(r, 300));

    // 总共扣 1+6=7,不双扣(不是 13)
    const afterConsumeCount = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsumeCount - beforeConsumeCount).toBe(2); // 转写 1 + 分析 1

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 7);

    // task.analysis_charged=true,不会再扣
    const retriedTask = await taskRepo.findOne({ where: { id: taskId } });
    expect(retriedTask?.analysis_charged).toBe(true);
    expect(retriedTask?.status).toBe('completed');

    // 两条 consume 的 delta 分别是 -1 和 -6
    const consumes = await txRepo.find({
      where: { user_id: user.id, type: 'consume' },
      order: { created_at: 'ASC' },
    });
    const recentDeltas = consumes.slice(-2).map((c) => c.delta);
    expect(recentDeltas).toContain(-1);
    expect(recentDeltas).toContain(-6);
  }, 45000);

  // ── (e) transcribing/labeling 阶段失败 → confirm 被拒 400 ──────────────────
  // 注:ASR 失败时 segments_json=null,confirmTranscribe 先命中"尚无可确认的标注内容"守卫(L581),
  // 而不是"当前状态不可确认"守卫(L592)。这两个守卫都属于正确拒绝,均返回 400。
  // 核心验收点:failed@transcribing(非 analyzing)任务不得进入分析,confirm 必须被 400 拒掉。
  it('(e) transcribing 阶段失败任务再 confirm → 400 拒绝(segments 为空或状态不可确认)', async () => {
    const email = `billing-e-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '计费测试e');
    const interviewId = await createInterview(app, token);

    // 让 ASR 失败 → failed_at_stage=transcribing,segments_json=null
    asrFailMode = true;

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;

    // 等任务落 failed
    const done = await pollStatus(app, token, interviewId, (s) => s === 'failed' || s === 'awaiting_confirm');
    expect(done.status).toBe('failed');

    // 确认 failed_at_stage 是 transcribing(不是 analyzing)
    const task = await taskRepo.findOne({ where: { id: taskId } });
    expect(task?.failed_at_stage).toBe('transcribing');
    // ASR 失败时 segments_json 为 null(无可用转写内容)
    expect(task?.segments_json).toBeNull();

    // 再 PATCH confirm → 400(被"尚无可确认标注内容"或"当前状态不可确认"守卫挡下)
    asrFailMode = false; // 不影响 confirm 路径
    const confirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ segments: CONFIRM_SEGMENTS });

    expect(confirm.status).toBe(400);
    // 两个守卫都是正确拒绝:segments 为空或状态不可确认均属于此任务不可重试的情形
    const body = JSON.stringify(confirm.body);
    expect(
      body.includes('该转写任务尚无可确认的标注内容') ||
      body.includes('该转写任务当前状态不可确认'),
    ).toBe(true);
  }, 30000);
});
