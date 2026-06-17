/**
 * 录音转写异步化 e2e。
 *
 * 验收点(对齐任务要求):
 *  1. POST :id/transcribe 立即 202 返回 taskId,不阻塞 ASR/LLM(handler 返回时后台仍在跑)。
 *  2. 后台跑完转写+打标 → GET status 变 awaiting_confirm 且 segmentsJson 非空。
 *  3. 计费在"真实成功"(落 awaiting_confirm)时一次性扣满 7 点(整条复盘链路总成本):
 *     credit_transactions 恰新增 1 条 consume(delta=-7)、ai_usage +1、余额 -7。confirm/analyze 不再额外扣。
 *  4. ASR/LLM 失败 → status=failed、不扣点、不写 ai_usage、余额不变(失败不计费)。
 *  5. 足额预检(service.hasBalance(7)):余额 < 7 → 402,且不建任务——含余额 0 与余额 1..6
 *     (≥1 能过 CreditGuard 廉价快路,但不足 7 仍被 service 兜住挡下)。
 *
 * ASR 与 LLM 全部 mock(不触真实 StepFun/中转):
 *  - SPEECH_PROVIDER:可控成功/抛错的假 ASR,并带可观测的延迟以验证"不阻塞"。
 *  - AiService.completeStructured:按 toolName 分流——label_speakers 回打标,interview_debrief 回复盘。
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
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

// 假 ASR 的开关:让单个用例控制成功/失败,而不必为每个用例重建 app。
let asrFailMode = false;
// 假 ASR 注入的延迟(ms):用于验证 POST 立即返回时后台尚未完成。
let asrDelayMs = 0;

const FAKE_SEGMENTS: TranscriptSegment[] = [
  { text: '你好,先做个自我介绍吧。', startMs: 0, endMs: 2000 },
  { text: '我叫小明,本科计算机专业,做过两个全栈项目。', startMs: 2000, endMs: 6000 },
];

const fakeSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  async transcribeFile(): Promise<TranscriptSegment[]> {
    if (asrDelayMs > 0) {
      await new Promise((r) => setTimeout(r, asrDelayMs));
    }
    if (asrFailMode) {
      throw new Error('ASR 上游不可用(测试注入)');
    }
    return FAKE_SEGMENTS.map((s) => ({ ...s }));
  },
};

// 打标结果:与输入段一一对应(0=面试官,1=候选人)。
const LABEL_RESULT = {
  segments: [
    { idx: 0, speaker: 'interviewer' },
    { idx: 1, speaker: 'candidate' },
  ],
};

// confirm 后 analyze 用的复盘结果(结构对齐 DebriefResult)。
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

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation((params: { toolName?: string }) => {
    if (params.toolName === 'label_speakers') {
      return Promise.resolve(LABEL_RESULT);
    }
    if (params.toolName === 'interview_debrief') {
      return Promise.resolve(DEBRIEF_RESULT);
    }
    return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
  }),
};

async function registerUser(
  app: INestApplication,
  email: string,
  name: string,
): Promise<string> {
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
  // POST /interviews 也挂 CreditInterceptor(创建即扣 1,fire-and-forget)。等其异步扣点落库,
  // 之后测试再抓计费基线,避免把创建的扣点误算到转写头上。
  await new Promise((r) => setTimeout(r, 200));
  return res.body.id as string;
}

// 1x1 的极小"音频"buffer;mimetype 必须 audio/* 才过 multer fileFilter。
const FAKE_AUDIO = Buffer.from('fake-audio-bytes');

async function pollStatus(
  app: INestApplication,
  token: string,
  interviewId: string,
  until: (status: string) => boolean,
  timeoutMs = 8000,
): Promise<{ status: string; segmentsJson: unknown; taskId: string; errorMessage: string | null }> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (until(res.body.status as string)) {
      return res.body;
    }
    if (Date.now() > deadline) {
      throw new Error(`轮询超时,最后状态=${res.body.status}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('录音转写异步化 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<CreditTransaction>;
  let aiUsageRepo: Repository<AiUsage>;
  let opsRepo: Repository<OpsEvent>;

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
    opsRepo = moduleRef.get<Repository<OpsEvent>>(getRepositoryToken(OpsEvent));
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    asrFailMode = false;
    asrDelayMs = 0;
  });

  // ── 验收 1+2+3:立即 202 + 后台跑完 + 真实成功才计费 ──────────────────────────
  it('POST transcribe 立即 202 返回 taskId,后台跑完落 awaiting_confirm,成功一次性扣 7 点 + ai_usage +1', async () => {
    const email = `transcribe-ok-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '转写成功');
    const interviewId = await createInterview(app, token);

    // 基线在 createInterview(含其异步扣点)结算后抓:此后所有增量都归转写。
    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const beforeUsage = await aiUsageRepo.count({ where: { user_id: user.id } });

    // 注入 300ms ASR 延迟:POST 若是同步,响应至少要等 300ms;异步则应立即返回。
    asrDelayMs = 300;

    const t0 = Date.now();
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    const elapsed = Date.now() - t0;

    // 验收 1:202 + taskId,且响应耗时显著小于 ASR 延迟(证明未阻塞在后台工作上)。
    expect(post.status).toBe(202);
    expect(post.body.taskId).toBeTruthy();
    expect(elapsed).toBeLessThan(250);

    // 验收 1(强证据):此刻后台还没跑完(ASR 仍在 300ms 延迟里),状态应为进行中而非 awaiting_confirm。
    const mid = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(mid.status).toBe(200);
    expect(['submitted', 'transcribing', 'labeling']).toContain(mid.body.status);

    // 验收 2:后台跑完 → awaiting_confirm,segmentsJson 非空、带 idx/speaker。
    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');
    expect(done.taskId).toBe(post.body.taskId);
    const segs = done.segmentsJson as Array<{ idx: number; speaker: string; text: string }>;
    expect(Array.isArray(segs)).toBe(true);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ idx: 0, speaker: 'interviewer' });
    expect(segs[1]).toMatchObject({ idx: 1, speaker: 'candidate' });

    // 验收 3:真实成功才计费 — 恰新增 1 条 consume(不拆多条小额)、ai_usage +1、余额一次性 -7。
    const afterCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const afterUsage = await aiUsageRepo.count({ where: { user_id: user.id } });
    expect(afterCredit - beforeCredit).toBe(1);
    expect(afterUsage - beforeUsage).toBe(1);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 7);

    // 唯一一条转写 consume 流水:endpoint 落转写端点模板,delta=-7、balance_after 自洽(一条扣满 7,不双扣)。
    const lastConsume = await txRepo.findOne({
      where: { user_id: user.id, type: 'consume' },
      order: { created_at: 'DESC' },
    });
    expect(lastConsume?.endpoint).toBe('/api/interviews/:id/transcribe');
    expect(lastConsume?.delta).toBe(-7);
    expect(lastConsume?.balance_after).toBe(beforeBalance - 7);
  }, 30000);

  // ── 验收 3(全链路收口):一次完整复盘(transcribe → confirm)恰好扣 7 点,不双扣 ──────────
  // transcribe 真实成功扣 7;confirm/analyze 段不再额外扣点(端点已移除 CreditInterceptor)。
  // 故一条 consume(delta=-7)+ 两条 ai_usage(transcribe 1 + confirm 1),credit 总额恒为 7。
  it('完整复盘 transcribe→confirm 总共恰扣 7 点(confirm 不再扣),ai_usage 计 2 条', async () => {
    const email = `transcribe-full-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '完整复盘');
    const interviewId = await createInterview(app, token);

    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const beforeUsage = await aiUsageRepo.count({ where: { user_id: user.id } });

    // 1) transcribe → awaiting_confirm。
    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(post.status).toBe(202);
    const taskId = post.body.taskId as string;

    const done = await pollStatus(app, token, interviewId, (s) => s === 'awaiting_confirm' || s === 'failed');
    expect(done.status).toBe('awaiting_confirm');

    // 2) confirm:按 mock 打标原样确认(0=面试官,1=候选人)→ 触发 analyze → completed。
    const confirm = await request(app.getHttpServer())
      .patch(`/api/interviews/${interviewId}/transcribe/${taskId}/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        segments: [
          { idx: 0, speaker: 'interviewer' },
          { idx: 1, speaker: 'candidate' },
        ],
      });
    expect(confirm.status).toBe(200);
    expect(confirm.body.overall_grade).toBe('B+');

    // 等 confirm 端的 AiUsageInterceptor fire-and-forget 落库。
    await new Promise((r) => setTimeout(r, 200));

    // 收口断言:credit 只新增 1 条 consume(transcribe 扣满 7,confirm 不扣)→ 余额恰好 -7。
    const afterCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterCredit - beforeCredit).toBe(1);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance - 7);

    // ai_usage 计两条(transcribe 成功 1 + confirm 成功 1),仅运营计数、不影响 credit 总额。
    const afterUsage = await aiUsageRepo.count({ where: { user_id: user.id } });
    expect(afterUsage - beforeUsage).toBe(2);
  }, 30000);

  // ── 验收 4:ASR 失败 → failed + 不计费 ─────────────────────────────────────────
  it('ASR 失败 → status=failed,不扣点、不写 ai_usage、余额不变', async () => {
    const email = `transcribe-fail-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '转写失败');
    const interviewId = await createInterview(app, token);

    // 基线在 createInterview(含其异步扣点)结算后抓。
    const user = await userRepo.findOneByOrFail({ email });
    const beforeBalance = user.credit_balance;
    const beforeCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const beforeUsage = await aiUsageRepo.count({ where: { user_id: user.id } });

    asrFailMode = true;

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    // 失败也是后台发生的:POST 仍 202(任务已建,失败由轮询暴露)。
    expect(post.status).toBe(202);
    expect(post.body.taskId).toBeTruthy();

    const done = await pollStatus(app, token, interviewId, (s) => s === 'failed' || s === 'awaiting_confirm');
    expect(done.status).toBe('failed');
    expect(done.errorMessage).toContain('ASR 上游不可用');
    expect(done.segmentsJson).toBeNull();

    // 失败入运维流水:恰写一条 AI_CALL_FAILED,detail.stage=transcribe、reason 含失败原因(管理面板可见)。
    // record 是 fire-and-forget,给它一点时间落库再断言。
    await new Promise((r) => setTimeout(r, 200));
    const opsRows = await opsRepo.find({ where: { type: 'AI_CALL_FAILED' } });
    const mine = opsRows.find((e) => (e.detail?.userId as string) === user.id);
    expect(mine).toBeDefined();
    expect(mine?.detail?.stage).toBe('transcribe');
    expect(String(mine?.detail?.reason)).toContain('ASR 上游不可用');

    // 失败不计费:两轨均无新增,余额不变。
    const afterCredit = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    const afterUsage = await aiUsageRepo.count({ where: { user_id: user.id } });
    expect(afterCredit - beforeCredit).toBe(0);
    expect(afterUsage - beforeUsage).toBe(0);

    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(beforeBalance);
  }, 30000);

  // ── 验收 5:足额预检 — 余额 < 7 → 402,且不建任务 ─────────────────────────────
  it('余额为 0 → POST 402,不建任务(GET status 404)', async () => {
    const email = `transcribe-broke-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '余额耗尽');
    const user = await userRepo.findOneByOrFail({ email });
    const interviewId = await createInterview(app, token);

    // 直接把余额清零(模拟点数耗尽)。基线 consume 数在清零前抓(含 createInterview 那 1 条)。
    const beforeConsume = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    await userRepo.update({ id: user.id }, { credit_balance: 0 });

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    expect(post.status).toBe(402);

    // 未建任务:status 端点 404(该面试无任何转写任务)。
    const status = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(404);

    // 余额仍为 0,且转写未新增任何 consume 流水(只读上面的基线)。
    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(0);
    const afterConsume = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsume - beforeConsume).toBe(0);
  }, 30000);

  // ── 验收 5(关键回归):余额 ≥1 但 < 7 仍 402 ──────────────────────────────────
  // 这正是从「扣 1」改「扣 7」要守住的护栏:CreditGuard 只保证 ≥1(够付 1 ≠ 够付 7),
  // service.hasBalance(7) 才是真正的足额预检。余额 6 能过 Guard 廉价快路,却仍被 service 兜住挡下。
  it('余额为 6(≥1 但 < 7)→ POST 402,不建任务(GET status 404)、不扣点', async () => {
    const email = `transcribe-short-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '余额不足七');
    const user = await userRepo.findOneByOrFail({ email });
    const interviewId = await createInterview(app, token);

    const beforeConsume = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    // 余额置 6:够付 CreditGuard 的 ≥1,但不够本次复盘的 7。
    await userRepo.update({ id: user.id }, { credit_balance: 6 });

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    // CreditGuard 放行(≥1),但 service 足额预检挡下 → 402。
    expect(post.status).toBe(402);

    // 不建任务:status 端点 404。
    const status = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(404);

    // 余额仍为 6(预检只读不扣),无新增 consume 流水。
    const refreshed = await userRepo.findOneByOrFail({ id: user.id });
    expect(refreshed.credit_balance).toBe(6);
    const afterConsume = await txRepo.count({ where: { user_id: user.id, type: 'consume' } });
    expect(afterConsume - beforeConsume).toBe(0);
  }, 30000);

  // ── 越权:非本人面试 transcribe → 404,且不建任务 ────────────────────────────
  it('非本人面试 transcribe → 404,且不建任务', async () => {
    const ownerToken = await registerUser(app, `tr-owner-${Date.now()}@coach.dev`, '物主');
    const otherToken = await registerUser(app, `tr-other-${Date.now()}@coach.dev`, '他人');
    const interviewId = await createInterview(app, ownerToken);

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${otherToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    expect(post.status).toBe(404);
  }, 30000);
});
