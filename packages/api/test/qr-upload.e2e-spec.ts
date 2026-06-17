/**
 * 扫码上传(QR scoped 一次性令牌)端到端 e2e。
 *
 * 走真实 HTTP 链路(supertest),验证 /upload/:token 豁免控制器的安全语义,均以"找茬"为目标:
 *  ① 正常闭环:电脑端登录用户 POST :id/upload-token 拿令牌 → 凭令牌 POST /upload/:token 上传
 *     成功(202 + taskId)→ 后台跑完 → 电脑端 GET :id/transcribe/status 见 awaiting_confirm,
 *     证明令牌真的建起了绑定 interview 的转写任务。
 *  ② 一次性:同一令牌第二次上传 → 拒(401),且不重复建任务。
 *  ③ 过期:伪造一个已过期(exp 在过去)的合法签名令牌 → 拒(401),不建任务。
 *  ④ scoped 归属红线(双保险):
 *     - 伪造一个签名正确、但 interviewId 指向"他人 interview"的令牌 → 上传被 service.findOne
 *       兜住 404(令牌持有的 userId 与目标 interview 物主不符,即跨 user/跨 interview)。
 *     - 用 A 用户为自己 interview 签的真实令牌,其解出的归属恒为 A+A 的 interview,无法被请求体
 *       覆写去传 B 的 interview(归属一律取自令牌)。
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
import { JwtService } from '@nestjs/jwt';
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

const FAKE_SEGMENTS: TranscriptSegment[] = [
  { text: '你好,先做个自我介绍吧。', startMs: 0, endMs: 2000 },
  { text: '我叫小明,本科计算机专业,做过两个全栈项目。', startMs: 2000, endMs: 6000 },
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

// e2e 里 JWT_SECRET=test-secret(setupFiles 默认)。我们用同 secret 的独立 JwtService 伪造
// "签名正确但语义恶意"的令牌(过期 / 跨归属),以验证 service 兜底。
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

describe('扫码上传 scoped 一次性令牌 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let taskRepo: Repository<InterviewTranscribeTask>;
  let jwt: JwtService;

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
    jwt = new JwtService({ secret: JWT_SECRET });
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
    expect(res.body.uploadPath).toBe(`/upload/${res.body.token}`);
    expect(res.body.expiresInSec).toBe(60);
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
    expect(segs).toHaveLength(2);
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

    // 同一令牌再传一次:jti 已烧 → 401。
    const second = await request(app.getHttpServer())
      .post(`/api/upload/${uploadToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(second.status).toBe(401);

    // 第二次未建新任务:该 interview 名下转写任务恰为 1 条。
    const count = await taskRepo.count({ where: { interview_id: interviewId } });
    expect(count).toBe(1);
  }, 30000);

  // ── ③ 过期:伪造一个 exp 在过去、签名正确的令牌 → 401,不建任务 ───────────────────
  it('③ 过期:已过期(exp 在过去)的合法签名令牌 → 401,不建任务', async () => {
    const email = `qr-expired-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '过期');
    const interviewId = await createInterview(app, accessToken);
    const user = await userRepo.findOneByOrFail({ email });

    // 用同 secret 签一个立即过期的合法 payload(expiresIn 负值)。
    const expired = jwt.sign(
      { purpose: 'audio_upload', interviewId, sub: user.id, jti: 'expired-jti-1' },
      { expiresIn: -10 },
    );

    const up = await request(app.getHttpServer())
      .post(`/api/upload/${expired}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);

    // 过期令牌挡在 verify,未建任务。
    const count = await taskRepo.count({ where: { interview_id: interviewId } });
    expect(count).toBe(0);
  }, 30000);

  // ── ③b 篡改签名:用错误 secret 签的令牌 → 401(签名红线) ─────────────────────────
  it('③b 错误 secret 签的令牌 → 401(签名校验)', async () => {
    const email = `qr-forged-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '伪签');
    const interviewId = await createInterview(app, accessToken);
    const user = await userRepo.findOneByOrFail({ email });

    const forge = new JwtService({ secret: 'attacker-secret' });
    const forged = forge.sign({
      purpose: 'audio_upload',
      interviewId,
      sub: user.id,
      jti: 'forged-jti-1',
    });

    const up = await request(app.getHttpServer())
      .post(`/api/upload/${forged}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);

    const count = await taskRepo.count({ where: { interview_id: interviewId } });
    expect(count).toBe(0);
  }, 30000);

  // ── ④ scoped 归属:令牌绑定 A 的 interview;伪造令牌指向 B 的 interview / 跨 user → 拒 ──
  it('④ 跨 user/跨 interview:令牌的 userId 与目标 interview 物主不符 → 404(service findOne 兜底),不建任务', async () => {
    // A 拥有 interviewA;B 拥有 interviewB。
    const aToken = await registerUser(app, `qr-A-${Date.now()}@coach.dev`, '甲');
    const bToken = await registerUser(app, `qr-B-${Date.now()}@coach.dev`, '乙');
    const interviewA = await createInterview(app, aToken);
    void interviewA;
    const interviewB = await createInterview(app, bToken);

    // 攻击者持有 A 的 userId,却把令牌 interviewId 指向 B 的 interview(跨 interview/跨 user)。
    // 签名正确,但 service.findOne(interviewB, A) 查不到属于 A 的 interviewB → 404。
    const userA = await userRepo.findOneByOrFail({ name: '甲' });

    const crossToken = jwt.sign({
      purpose: 'audio_upload',
      interviewId: interviewB, // 指向 B 的面试
      sub: userA.id, // 持令牌人是 A
      jti: `cross-jti-${Date.now()}`,
    });

    const up = await request(app.getHttpServer())
      .post(`/api/upload/${crossToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    // 令牌签名/用途/jti 都过,但归属在 service.findOne(interviewB, A) 兜底 → 404。
    expect(up.status).toBe(404);

    // B 的 interview 未被建任务(归属红线守住:A 的令牌传不进 B 的 interview)。
    const count = await taskRepo.count({ where: { interview_id: interviewB } });
    expect(count).toBe(0);

    // 反证:同样持 A 的 sub、但指向"压根不存在的 interview"→ 同样 404,不建任务。
    const ghostToken = jwt.sign({
      purpose: 'audio_upload',
      interviewId: 'non-existent-interview-id',
      sub: userA.id,
      jti: `ghost-jti-${Date.now()}`,
    });
    const up2 = await request(app.getHttpServer())
      .post(`/api/upload/${ghostToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up2.status).toBe(404);
  }, 30000);

  // ── ④b 用途红线:主登录令牌(无 purpose)拿来当上传令牌 → 401 ─────────────────────
  it('④b 主登录令牌(Bearer 用)拿来当 /upload 令牌 → 401(用途校验)', async () => {
    const email = `qr-misuse-${Date.now()}@coach.dev`;
    const accessToken = await registerUser(app, email, '冒用');

    // 直接把登录 access_token 塞进 /upload/:token(它形如 {sub,email},无 purpose/interviewId)。
    const up = await request(app.getHttpServer())
      .post(`/api/upload/${accessToken}`)
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);
  }, 30000);

  // ── ④c 归属取自令牌、不可被请求体覆写:body 里塞 interviewId/userId 无效 ────────────
  it('④c 归属一律取自令牌,请求体里的 interviewId/userId 字段被忽略', async () => {
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

    // 归属取自令牌(interviewA + A),body 覆写无效 → 任务落在 A 的 interviewA、不落 B。
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
      .post('/api/upload/not-a-jwt')
      .field('consent', 'true')
      .attach('file', FAKE_AUDIO, { filename: 'a.mp3', contentType: 'audio/mpeg' });
    expect(up.status).toBe(401);
  }, 30000);
});
