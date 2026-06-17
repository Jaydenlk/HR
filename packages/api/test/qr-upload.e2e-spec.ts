/**
 * 扫码上传(QR scoped 一次性短令牌)端到端 e2e。
 *
 * 走真实 HTTP 链路(supertest),验证 /upload/:token 豁免控制器的安全语义,均以"找茬"为目标:
 *  ① 正常闭环:电脑端登录用户 POST :id/upload-token 拿短令牌 → 凭令牌 POST /upload/:token 上传
 *     成功(202 + taskId)→ 后台跑完 → 电脑端 GET :id/transcribe/status 见 awaiting_confirm,
 *     证明令牌真的建起了绑定 interview 的转写任务。
 *  ② 一次性:同一令牌第二次上传 → 拒(401),且不重复建任务。
 *  ③ 不可伪造 / 不命中映射:乱码、未签发的随机串、主登录令牌(Bearer 用)拿来当上传令牌 → 一律 401,
 *     不建任务。短令牌是服务端发的不透明随机 id,任何不在内存映射里的字符串都进不来——这取代了
 *     旧 JWT 版的"签名/过期/用途"伪造测试(攻击者已无从伪造一个"碰巧存在"的令牌)。
 *     (过期路径在 qr-upload-token.service.spec.ts 用 fake timers 覆盖,e2e 层不便快进 60s TTL。)
 *  ④ scoped 归属红线(双保险):
 *     - 归属一律取自服务端映射(签发时绑定的 interviewId/userId),无法被请求体里的 interviewId/userId
 *       覆写去传别人的 interview。
 *     - service.transcribe 内部仍 findOne(interviewId, userId) 再兜一层(即便归属错配也会 404),
 *       此兜底由 qr-upload-token.service.spec / interviews 单测覆盖,e2e 无从构造错配输入(令牌不可伪造)。
 *  ⑤ mobile-gate 只豁免 /upload/[token]:前端 client 组件,无法在后端 e2e 跑;静态核实见下方注释。
 *
 * ASR 与 LLM 全部 mock(不触真实 StepFun/中转),复用 transcribe-async.e2e-spec 同款假 provider。
 * 隔离:唯一临时内存 sqlite(setupFiles 已设 DB_PATH=:memory:),JWT_SECRET=test-secret。
 *
 * ⑤ 静态核实(mobile-gate 只豁免 /upload/[token]):
 *   packages/web/src/components/ui/mobile-gate.tsx:34
 *     if (pathname === '/landing' || pathname === '/' || pathname.startsWith('/upload/')) return null;
 *   该行是唯一的放行判断:仅 /landing、根 /、以及前缀 /upload/(覆盖 [token] 动态段)被放行;
 *   其余任何移动端路由在 isMobile(视口<768)为真时渲染全屏 zIndex=2147483647 覆盖层拦死(行 37-115),
 *   且无"继续访问"逃生门(行 6-7 注释)。故 mobile-gate 仅对 /upload/[token] 豁免、其它移动路由仍拦,成立。
 *   (该组件依赖 window.innerWidth,属浏览器运行时,后端 e2e 不覆盖;以源码行为依据。)
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
import { InterviewTranscribeTask } from '../src/speech/entities/transcribe-task.entity';
import { request } from './test-utils';

// 与 transcribe-async.e2e 同款假 ASR:可控延迟,默认成功(本套件不测失败路径)。
let asrDelayMs = 0;

// 真实面试量级:≥3 段、合并正文 ≥50 字(过非面试闸门);complete mock 默认回非「否」→ 主题闸放行。
const FAKE_SEGMENTS: TranscriptSegment[] = [
  { text: '你好,先做个自我介绍吧。', startMs: 0, endMs: 2000 },
  { text: '我叫小明,本科计算机专业,做过两个全栈项目,主要用 React 和 NestJS。', startMs: 2000, endMs: 6000 },
  { text: '能讲讲你在第二个项目里负责的核心模块吗?', startMs: 6000, endMs: 9000 },
  { text: '我主要负责支付链路的对账服务,从设计到上线都参与了。', startMs: 9000, endMs: 13000 },
];

const fakeSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  async transcribeFile(): Promise<TranscriptSegment[]> {
    if (asrDelayMs > 0) await new Promise((r) => setTimeout(r, asrDelayMs));
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
    { question: '自我介绍', tone: 'good', coach_note: '清晰', better_answer: '更优示例', blind_spots: [] },
  ],
  prediction: { next_round_topics: [{ topic: '项目深挖', probability: 70 }] },
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation((params: { toolName?: string }) => {
    if (params.toolName === 'label_speakers') return Promise.resolve(LABEL_RESULT);
    if (params.toolName === 'interview_debrief') return Promise.resolve(DEBRIEF_RESULT);
    return Promise.reject(new Error(`未预期的 toolName: ${params.toolName ?? '(无)'}`));
  }),
};

// 同 transcribe-async：1x1 极小"音频"buffer;mimetype 必须 audio/* 才过 multer fileFilter。
const FAKE_AUDIO = Buffer.from('fake-audio-bytes');

const JWT_SECRET = 'test-secret';

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
  // POST /interviews 挂 CreditInterceptor(创建即扣 1,fire-and-forget),等其落库再继续。
  await new Promise((r) => setTimeout(r, 200));
  return res.body.id as string;
}

async function pollStatus(
  app: INestApplication,
  token: string,
  interviewId: string,
  until: (status: string) => boolean,
  timeoutMs = 8000,
): Promise<{ status: string; segmentsJson: unknown; taskId: string }> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await request(app.getHttpServer())
      .get(`/api/interviews/${interviewId}/transcribe/status`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    if (until(res.body.status as string)) return res.body;
    if (Date.now() > deadline) throw new Error(`轮询超时,最后状态=${res.body.status}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('扫码上传 scoped 一次性短令牌 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let taskRepo: Repository<InterviewTranscribeTask>;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = JWT_SECRET;
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
    taskRepo = moduleRef.get<Repository<InterviewTranscribeTask>>(
      getRepositoryToken(InterviewTranscribeTask),
    );
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    asrDelayMs = 0;
  });

  // 取 /upload/:token 路径里的 token(端点返回 { token, uploadPath: '/upload/<token>', expiresInSec })。
  async function issueUploadToken(
    token: string,
    interviewId: string,
  ): Promise<{ uploadToken: string; uploadPath: string; expiresInSec: number }> {
    const res = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/upload-token`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    // 短令牌契约:url-safe 短 id,远短于 JWT(此前数百字符),保证拼成 URL 后能塞进低版本二维码。
    expect(res.body.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(res.body.token.length).toBeLessThanOrEqual(24);
    expect(res.body.uploadPath).toBe(`/upload/${res.body.token}`);
    expect(res.body.expiresInSec).toBe(600);
    return {
      uploadToken: res.body.token,
      uploadPath: res.body.uploadPath,
      expiresInSec: res.body.expiresInSec,
    };
  }

  // ── ① 正常闭环:发令牌 → 凭令牌上传成功(202+taskId)→ 后台跑完 → 电脑端见 awaiting_confirm ──
  it('① 发令牌→凭令牌 /upload/:token 上传成功(202+taskId)→ 建起绑定 interview 的转写任务', async () => {
    const email = `qr-ok-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '扫码成功');
    const interviewId = await createInterview(app, accessToken);

    const { uploadToken } = await issueUploadToken(accessToken, interviewId);

    // 手机端"未登录"直传:仅靠 URL 令牌,不带 Authorization 头。
    const up = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    expect(up.status).toBe(202);
    expect(up.body.taskId).toBeTruthy();

    // 任务确实建在该令牌绑定的 interview 上,且 user_id 取自令牌签发者(归属落库正确)。
    const user = await userRepo.findOneByOrFail({ email });
    const task = await taskRepo.findOneByOrFail({ id: up.body.taskId });
    expect(task.interview_id).toBe(interviewId);
    expect(task.user_id).toBe(user.id);

    // 电脑端轮询既有 status 端点,后台跑完落 awaiting_confirm、segmentsJson 非空。
    const done = await pollStatus(
      app,
      accessToken,
      interviewId,
      (s) => s === 'awaiting_confirm' || s === 'failed',
    );
    expect(done.status).toBe('awaiting_confirm');
    expect(done.taskId).toBe(up.body.taskId);
    const segs = done.segmentsJson as Array<{ idx: number; speaker: string }>;
    expect(Array.isArray(segs)).toBe(true);
    expect(segs).toHaveLength(4);
  }, 30000);

  // ── ② 一次性:同令牌第二次上传 → 401,且不重复建任务 ──────────────────────────────
  it('② 一次性:同一令牌第二次上传 → 401(用后即焚),且不重复建任务', async () => {
    const email = `qr-once-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '一次性');
    const interviewId = await createInterview(app, accessToken);
    const { uploadToken } = await issueUploadToken(accessToken, interviewId);

    const first = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(first.status).toBe(202);
    expect(first.body.taskId).toBeTruthy();

    // 同一令牌再传一次:已烧 → 401。
    const second = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(second.status).toBe(401);

    // 第二次未建新任务:该 interview 名下转写任务恰为 1 条。
    const count = await taskRepo.count({ where: { interview_id: interviewId } });
    expect(count).toBe(1);
  }, 30000);

  // ── ③ 不命中映射:未签发的随机串 → 401,不建任务 ────────────────────────────────
  it('③ 未签发的随机串(不命中服务端映射)→ 401,不建任务', async () => {
    const email = `qr-unknown-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '未签发');
    const interviewId = await createInterview(app, accessToken);

    // 攻击者随手编一个 url-safe 串(从未由后端签发)→ 不在映射里 → 401。
    const up = await request(app.getHttpServer())
      .post(`/api/upload/AbCdEf0123456789xyzXYZ`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);

    const count = await taskRepo.count({ where: { interview_id: interviewId } });
    expect(count).toBe(0);
  }, 30000);

  // ── ③b 用途红线:主登录令牌(Bearer 用)拿来当 /upload 令牌 → 401(不命中映射) ──────
  it('③b 主登录令牌(Bearer 用)拿来当 /upload 令牌 → 401', async () => {
    const email = `qr-misuse-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '冒用');

    // 直接把登录 access_token(长 JWT)塞进 /upload/:token:它从未由 QrUploadTokenService 签发,
    // 不命中映射 → 401(顺带证明:长 JWT 即便被拿来当 token 也无效,正是本次改短令牌的初衷)。
    const up = await request(app.getHttpServer())
      .post(`/api/upload/${encodeURIComponent(accessToken)}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);
  }, 30000);

  // ── ④ 归属取自令牌、不可被请求体覆写:body 里塞 interviewId/userId 无效 ────────────
  it('④ 归属一律取自令牌,请求体里的 interviewId/userId 字段被忽略', async () => {
    const aToken = await registerUser(app, `qr-bind-A-${Date.now()}@coach.dev`, '绑定甲');
    const bToken = await registerUser(app, `qr-bind-B-${Date.now()}@coach.dev`, '绑定乙');
    const interviewA = await createInterview(app, aToken);
    const interviewB = await createInterview(app, bToken);

    // A 为自己 interviewA 签真实令牌,却在 body 里塞 B 的 interviewId 想越权。
    const { uploadToken } = await issueUploadToken(aToken, interviewA);
    const up = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .field('interviewId', interviewB) // 恶意覆写尝试
      .field('userId', 'someone-else') // 恶意覆写尝试
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });

    // 归属取自令牌映射(interviewA + A),body 覆写无效 → 任务落在 A 的 interviewA、不落 B。
    expect(up.status).toBe(202);
    const task = await taskRepo.findOneByOrFail({ id: up.body.taskId });
    expect(task.interview_id).toBe(interviewA);
    expect(task.interview_id).not.toBe(interviewB);

    const userA = await userRepo.findOneByOrFail({ name: '绑定甲' });
    expect(task.user_id).toBe(userA.id);

    // B 的 interview 未被这次上传污染。
    const countB = await taskRepo.count({ where: { interview_id: interviewB } });
    expect(countB).toBe(0);
  }, 30000);

  // ── 结构红线:乱码 token → 401,不建任务 ─────────────────────────────────────────
  it('乱码 token → 401', async () => {
    const up = await request(app.getHttpServer())
      .post('/api/upload/not-a-real-token')
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);
  }, 30000);
});
