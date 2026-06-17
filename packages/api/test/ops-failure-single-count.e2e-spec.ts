import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { OpsEventsService } from '../src/ops/ops-events.service';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// #4 修复:单次失败 AI 请求 = 恰好一条「请求级失败」信号(AI_CALL_FAILED)
//
// 背景(审计 IMPORTANT,metric accuracy):一次真正的 AI 全败请求在生产里会先经
//   AiService.withFailover 写若干诊断事件(AI_FAILOVER 每跳一条 + AI_BOTH_DOWN,
//   见 ai.service.ts:197-216 / 262-274),再抛 503,而那个 503 又被 AiUsageInterceptor
//   记成一条 AI_CALL_FAILED。若成功率分母把三类都算失败,一次失败请求被放大成 3-4 条,
//   失败数虚高,违背「准确成功率」目标。更关键:AI_FAILOVER 之后请求可能被备通道救活而
//   最终【成功】,把它算失败方向就错了。
//
// 修复:AdminService.AI_FAILURE_TYPES 只含 AI_CALL_FAILED(每个失败请求恰一条);
//   AI_FAILOVER/AI_BOTH_DOWN 退为纯诊断事件,仍可在 error-stream 流水查看,但不进分母。
//
// 本套件直接经【同一个 OpsEventsService.record】落库 —— 与生产 withFailover 写诊断事件、
// interviews 写转写失败的【完全同一写入口】—— 复现「一次失败请求落 3 条 ops_events」的真实
// 数据形态,再断言成功率分母只计 AI_CALL_FAILED。这是数据口径级的精确验证,锁住单计数语义。
//
// 注:此处不走「全 AppModule HTTP + 真实 withFailover」来产生诊断事件,因为 NestJS 测试容器
// 对 AiService 的 @Optional() OpsEventsService 跨模块解析为 undefined(实测:全真实 HTTP 降级
// 只落 AI_CALL_FAILED,诊断事件不写;production 注入正常,见 ops-events.e2e-spec.ts Suite 2 用
// 手动注入 opsEvents 证明 withFailover 写诊断事件的代码本身正确)。故本套件按生产真实「数据形态」
// 直接经同一 record 落库,口径等价且确定性更高。(a) 仍走真实 HTTP 产生真正的 AI_CALL_FAILED。
// ─────────────────────────────────────────────────────────────────────────────

const AI_FAILURE_MESSAGE = 'AI 主备通道均不可用(测试注入)';

// 出题走 completeStructured;统一 reject,使 POST /mock-sessions 在出题阶段抛错,
// 错误穿过 AiUsageInterceptor(catchError 记真正的 AI_CALL_FAILED 后 rethrow)。
const mockAiService = {
  completeStructured: jest.fn().mockRejectedValue(new Error(AI_FAILURE_MESSAGE)),
  complete: jest.fn().mockRejectedValue(new Error(AI_FAILURE_MESSAGE)),
  testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 10 }),
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

// 取 success-stats 今日 failed(days=1 → 数组仅含今日一行)。
async function todayFailed(app: INestApplication, adminToken: string): Promise<number> {
  const res = await request(app.getHttpServer())
    .get('/api/admin/success-stats?days=1')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  return res.body[res.body.length - 1].failed as number;
}

describe('#4 单次失败 = 恰好一条 AI_CALL_FAILED(诊断事件不进分母) (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let opsRepo: Repository<OpsEvent>;
  let opsEvents: OpsEventsService;

  let userToken: string;
  let userId: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'ofsc-admin@coach.dev';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    opsRepo = moduleRef.get<Repository<OpsEvent>>(getRepositoryToken(OpsEvent));
    opsEvents = moduleRef.get(OpsEventsService);

    userToken = await registerUser(app, 'ofsc-user@coach.dev', '单计数测试用户');
    userId = (await userRepo.findOneBy({ email: 'ofsc-user@coach.dev' }))!.id;

    adminToken = await registerUser(app, 'ofsc-admin@coach.dev', '单计数测试超管');
    expect((await userRepo.findOneBy({ email: 'ofsc-admin@coach.dev' }))!.role).toBe('admin');
  }, 120000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // (a) 一次「真实失败请求 + 其诊断兄弟事件」共存于库:success-stats.failed 恰好 +1,绝非 3 ──
  it('(a) 单次全败请求落 AI_FAILOVER+AI_BOTH_DOWN+AI_CALL_FAILED 三条,但 success-stats.failed 仅 +1', async () => {
    const failedBefore = await todayFailed(app, adminToken);
    const callFailedBefore = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });

    // 1) 真实 HTTP 失败请求:出题 AI 必 reject → 拦截器记一条真正的 AI_CALL_FAILED 并 rethrow(503)。
    const res = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ role: '后端开发工程师' });
    expect(res.status).toBeGreaterThanOrEqual(500);

    // 拦截器写库为 fire-and-forget(void record),让出一拍确保落定。
    await new Promise((resolve) => setImmediate(resolve));
    const callFailedAfter = await opsRepo.count({ where: { type: 'AI_CALL_FAILED' } });
    expect(callFailedAfter).toBe(callFailedBefore + 1); // 这次请求只产生一条请求级失败信号

    // 2) 复现这同一次全败请求在生产 withFailover 里会先写的两条【诊断】事件
    //    (与 ai.service.ts 完全同一写入口 OpsEventsService.record)。
    await opsEvents.record('AI_FAILOVER', {
      op: 'completeStructured',
      primary: 'relay',
      fallback: 'deepseek',
      error: AI_FAILURE_MESSAGE,
    });
    await opsEvents.record('AI_BOTH_DOWN', {
      op: 'completeStructured',
      providers: 'relay,deepseek',
      error: AI_FAILURE_MESSAGE,
    });

    // 现在库里这次失败请求对应 3 条 ops_events(1 FAILOVER + 1 BOTH_DOWN + 1 CALL_FAILED)。
    // 核心断言:成功率分母只 +1(只数 AI_CALL_FAILED),没有被诊断事件放大成 +3。
    const failedAfter = await todayFailed(app, adminToken);
    expect(failedAfter).toBe(failedBefore + 1);
  });

  // (b) 降级救活(主挂、备成功、最终无 503 无 AI_CALL_FAILED):AI_FAILOVER 不计失败,failed +0 ──
  it('(b) 降级救活只产生 AI_FAILOVER(无 AI_CALL_FAILED):success-stats.failed +0', async () => {
    const failedBefore = await todayFailed(app, adminToken);

    // 一次「主通道挂、备通道救活」的请求:withFailover 写一条 AI_FAILOVER 后成功返回,
    // 全程不抛 503、拦截器不会记 AI_CALL_FAILED(成功请求只写 ai_usage)。
    await opsEvents.record('AI_FAILOVER', {
      op: 'completeStructured',
      primary: 'relay',
      fallback: 'deepseek',
      error: '主通道超时,已降级备通道并成功',
    });

    // 核心断言:救活请求的 AI_FAILOVER 绝不计入失败 —— failed 纹丝不动。
    const failedAfter = await todayFailed(app, adminToken);
    expect(failedAfter).toBe(failedBefore);
  });

  // (c) 转写式 record(AI_CALL_FAILED,{stage:transcribe}) 仍恰好 +1 ────────────────
  it('(c) 转写失败(同一 OpsEventsService 直接记 AI_CALL_FAILED)使 failed 恰好 +1', async () => {
    const failedBefore = await todayFailed(app, adminToken);

    await opsEvents.record('AI_CALL_FAILED', {
      endpoint: '/api/interviews/:id/transcribe',
      stage: 'transcribe',
      user_id: userId,
      error: 'ASR 转写失败(测试注入)',
    });

    const failedAfter = await todayFailed(app, adminToken);
    expect(failedAfter).toBe(failedBefore + 1);
  });

  // (d) 诊断事件仍可在 error-stream 流水查看(只是不进成功率分母)──────────────────
  it('(d) AI_FAILOVER/AI_BOTH_DOWN 仍作为诊断事件出现在 error-stream(可见但不计失败)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/error-stream?limit=200')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const types = (res.body as Array<{ type: string }>).map((e) => e.type);
    // 前述用例已写入若干 AI_FAILOVER + 一条 AI_BOTH_DOWN,诊断流水应可见。
    expect(types).toContain('AI_FAILOVER');
    expect(types).toContain('AI_BOTH_DOWN');
  });
});
