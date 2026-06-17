import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { SPEECH_PROVIDER } from '../src/speech/providers/speech.provider';
import type {
  SpeechProvider,
  SynthesizedAudio,
  TranscriptSegment,
} from '../src/speech/providers/speech.provider';
import { User } from '../src/users/entities/user.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// #4 AI/ASR 失败落库 — e2e
//
// 证明三件事(对照交付清单):
//   (a) 一次失败的 AI 调用经 AiUsageInterceptor 记下 ops_events AI_CALL_FAILED(且原样 rethrow)。
//   (b) 管理后台成功率(GET /admin/success-stats)把这次失败计入分母(failed≥1、success_rate<1)。
//   (c) GET /admin/recent-failures 返回这条失败,带【打码】用户标识 + 失败原因 + 端点。
//   (d) interviews 组经【真实 runTranscribe 路径】写的转写失败,也被计数与展示覆盖,
//       且 recent-failures 行的 原因/用户/端点 均非空(检验生产 detail 键与 DTO 对齐,绝不手写键掩盖)。
//
// AI 失败用 override AiService 制造:completeStructured 必 reject,使 POST /mock-sessions
// 在出题阶段抛错,错误穿过 AiUsageInterceptor(catchError 记 AI_CALL_FAILED 后 rethrow)。
// 无 company 入参 → 不触发联网搜索,出题前唯一外部调用就是被我们打挂的 AI,确定性高。
// ─────────────────────────────────────────────────────────────────────────────

const AI_FAILURE_MESSAGE = 'AI 主备通道均不可用(测试注入)';
// (d) 用真实转写路径制造失败:注入一个 transcribeFile 必 reject 的 SpeechProvider,
// 让 interviews.service.runTranscribe 的 catch 块发出真实 OpsEvent(而非测试手写 detail 键)。
const ASR_FAILURE_MESSAGE = 'ASR 上游不可用(测试注入)';

const mockAiService = {
  // 出题走 completeStructured;统一 reject 制造失败路径。
  completeStructured: jest.fn().mockRejectedValue(new Error(AI_FAILURE_MESSAGE)),
  complete: jest.fn().mockRejectedValue(new Error(AI_FAILURE_MESSAGE)),
  testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
};

// 失败版语音供应商:transcribeFile 必抛 → 走 interviews 真实失败分支(转写阶段),发真实 AI_CALL_FAILED。
const failingSpeechProvider: SpeechProvider = {
  capabilities: { diarization: false, channelSplit: false, realtime: false },
  transcribeFile(): Promise<TranscriptSegment[]> {
    return Promise.reject(new Error(ASR_FAILURE_MESSAGE));
  },
  synthesize(): Promise<SynthesizedAudio> {
    return Promise.reject(new Error(ASR_FAILURE_MESSAGE));
  },
};

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string | undefined;
  if (!devCode) throw new Error(`无 dev_code:${JSON.stringify(codeRes.body)}`);
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

describe('#4 AI 调用失败落库 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let usageRepo: Repository<AiUsage>;
  let opsRepo: Repository<OpsEvent>;

  let userToken: string;
  let userId: string;
  let userEmail: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'ofl-admin@coach.dev';
    process.env.STEP_API_KEY = 'test-step-key';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .overrideProvider(SPEECH_PROVIDER)
      .useValue(failingSpeechProvider)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    usageRepo = moduleRef.get<Repository<AiUsage>>(getRepositoryToken(AiUsage));
    opsRepo = moduleRef.get<Repository<OpsEvent>>(getRepositoryToken(OpsEvent));

    userEmail = 'ofl-user@coach.dev';
    userToken = await registerUser(app, userEmail, '失败测试用户');
    userId = (await userRepo.findOneBy({ email: userEmail }))!.id;

    adminToken = await registerUser(app, 'ofl-admin@coach.dev', '失败测试超管');
    expect((await userRepo.findOneBy({ email: 'ofl-admin@coach.dev' }))!.role).toBe('admin');
  }, 120000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // (a) 失败的 AI 调用 → 拦截器记 AI_CALL_FAILED 且原样 rethrow ───────────────────
  it('(a) 一次失败 AI 调用经拦截器记下 AI_CALL_FAILED,且错误原样上抛(非 2xx)', async () => {
    const before = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });

    const res = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: '后端开发工程师' });

    // 错误绝不被吞:拦截器记完事件后 rethrow,HTTP 仍是失败(5xx)。
    expect(res.status).toBeGreaterThanOrEqual(500);

    const after = await opsRepo.find({ where: { type: 'AI_CALL_FAILED' }, order: { created_at: 'DESC' } });
    expect(after.length).toBe(before + 1);

    const latest = after[0];
    expect(latest.detail).toMatchObject({
      endpoint: '/api/mock-sessions',
      user_id: userId,
      error: AI_FAILURE_MESSAGE,
    });
  });

  // (a2) 4xx 客户端错误(畸形入参)不计为 AI 调用失败 ─────────────────────────────
  it('(a2) 处理器抛 4xx(缺 role)不记 AI_CALL_FAILED(不污染失败率)', async () => {
    const before = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });

    // 缺 role → MockService.create 抛 BadRequestException(400),早于 AI 调用。
    const res = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ jd_text: 'x' });

    expect(res.status).toBe(400);
    const after = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
    expect(after).toBe(before);
  });

  // (b) 成功率把失败计入分母 ─────────────────────────────────────────────────────
  it('(b) GET /admin/success-stats 把这次失败计入分母(failed≥1、success_rate<1)', async () => {
    // 制造同日一次「成功」(ai_usage 成功才写),让 success_rate 有意义的分母。
    await usageRepo.insert({ user_id: userId, endpoint: '/api/mock-sessions' });

    const res = await request(app.getHttpServer())
      .get('/api/admin/success-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const today = res.body[res.body.length - 1];
    expect(today.failed).toBeGreaterThanOrEqual(1);
    expect(today.success).toBeGreaterThanOrEqual(1);
    expect(today.success_rate).not.toBeNull();
    expect(today.success_rate).toBeLessThan(1);
  });

  // (c) recent-failures 返回失败 + 打码用户 + 原因 ───────────────────────────────
  it('(c) GET /admin/recent-failures 返回这条失败,用户已打码、含原因与端点', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/recent-failures?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    const row = res.body[0];
    expect(row.reason).toBe(AI_FAILURE_MESSAGE);
    expect(row.endpoint).toBe('/api/mock-sessions');

    // 用户标识必须是打码形式:绝不能等于完整邮箱,也不能等于裸 user_id。
    expect(row.user).toBeTruthy();
    expect(row.user).not.toBe(userEmail);
    expect(row.user).not.toBe(userId);
    expect(row.user).toContain('*');
    // 打码后仍是邮箱形态(含 @ 与 TLD),便于排障辨认。
    expect(row.user).toMatch(/@.*\./);

    // 出站绝不泄露完整邮箱:整个响应文本里不得出现原始邮箱。
    expect(JSON.stringify(res.body)).not.toContain(userEmail);
  });

  // (d) interviews 组【真实转写路径】失败也被计数与展示覆盖 ──────────────────────
  // 关键:驱动真实上传 → runTranscribe 调被注入的 failingSpeechProvider(reject)→ service catch 块发真实 OpsEvent。
  // 这条断言对 reason/user/endpoint 三者都做非空检查,正是检验生产 detail 键是否与 recent-failures DTO 对齐:
  //  - 若生产用错键(旧版 {reason,userId})→ DTO 读 detail.error/user_id/endpoint 全 null → 本用例 FAIL(fail-before)。
  //  - 修复后用 {endpoint,user_id,error,stage} → 三者全非空 → PASS(pass-after)。不再手写 record,绝不掩盖键名缺陷。
  it('(d) 真实转写失败(经 interviews.service runTranscribe)同样进成功率分母,且 recent-failures 带非空 原因/用户/端点', async () => {
    const beforeStats = await request(app.getHttpServer())
      .get('/api/admin/success-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    const beforeFailed = beforeStats.body[beforeStats.body.length - 1].failed as number;

    // 建一个面试,再真实上传一段音频,触发后台转写;failingSpeechProvider 让 transcribeFile reject → 转写阶段真实失败。
    const ivRes = await request(app.getHttpServer())
      .post('/api/interviews')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ round: '技术一面', company: 'Acme', role: '后端开发工程师' });
    expect(ivRes.status).toBe(201);
    const interviewId = ivRes.body.id as string;
    await new Promise((r) => setTimeout(r, 200));

    const post = await request(app.getHttpServer())
      .post(`/api/interviews/${interviewId}/transcribe`)
      .set('Authorization', `Bearer ${userToken}`)
      .field('consent', 'true')
      .attach('file', Buffer.from('fake-audio-ofl-transcribe'), {
        filename: 'ofl.m4a',
        contentType: 'audio/mp4',
      });
    expect(post.status).toBe(202);

    // 轮询到 failed(后台 runTranscribe 已 catch ASR reject 并发出真实 AI_CALL_FAILED)。
    const deadline = Date.now() + 8000;
    let lastStatus = '';
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const st = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}/transcribe/status`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(st.status).toBe(200);
      lastStatus = st.body.status as string;
      if (lastStatus === 'failed') break;
      if (Date.now() > deadline) throw new Error(`转写未在预期内失败,最后状态=${lastStatus}`);
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(lastStatus).toBe('failed');

    const afterStats = await request(app.getHttpServer())
      .get('/api/admin/success-stats?days=1')
      .set('Authorization', `Bearer ${adminToken}`);
    const afterFailed = afterStats.body[afterStats.body.length - 1].failed as number;
    expect(afterFailed).toBe(beforeFailed + 1);

    const failures = await request(app.getHttpServer())
      .get('/api/admin/recent-failures?limit=20')
      .set('Authorization', `Bearer ${adminToken}`);
    const transcribeRow = (
      failures.body as Array<{
        stage: string | null;
        reason: string | null;
        user: string | null;
        endpoint: string | null;
      }>
    ).find((r) => r.stage === 'transcribe');
    expect(transcribeRow).toBeDefined();
    // 检验生产 detail 键已对齐 DTO:原因/用户/端点三者均非空(键名不匹配时三者会是 null,本用例即 FAIL)。
    expect(transcribeRow!.reason).toBe(ASR_FAILURE_MESSAGE);
    expect(transcribeRow!.endpoint).toBe('/api/interviews/:id/transcribe');
    expect(transcribeRow!.user).toBeTruthy();
    expect(transcribeRow!.user).toContain('*');
  }, 30000);

  // 鉴权护栏:recent-failures 走 JwtAuthGuard + AdminGuard ────────────────────────
  it('recent-failures 无 token → 401;普通用户 → 403', async () => {
    const noToken = await request(app.getHttpServer()).get('/api/admin/recent-failures');
    expect(noToken.status).toBe(401);

    const asUser = await request(app.getHttpServer())
      .get('/api/admin/recent-failures')
      .set('Authorization', `Bearer ${userToken}`);
    expect(asUser.status).toBe(403);
  });
});
