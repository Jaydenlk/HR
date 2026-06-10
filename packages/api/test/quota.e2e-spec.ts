import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { request } from './test-utils';

// ─── QuotaGuard + AiUsageInterceptor e2e ──────────────────────────────────────
//
// 用 /api/salary/analyze 作为受测 AI 端点(已挂 @UseGuards(QuotaGuard) +
// @UseInterceptors(AiUsageInterceptor))。AiService 被 mock:
//   - failMode=false → 返回结构化结果 → 201(计一次)
//   - failMode=true  → 抛 ServiceUnavailableException → 503(不计数)
//
// QuotaModule 已被各 AI feature module import,故只 import AppModule 即可达;
// 无需改 app.module(QuotaModule 经 feature module 传递接入)。

let failMode = false;

const ANALYSIS_RESULT = {
  summary: '测试用薪资分析结果(历史知识库,仅供参考)。',
  confidence: 'low',
  salary_range: {
    p25: 22000,
    p50: 27000,
    p75: 31000,
    unit: 'monthly_rmb',
    year: '2025',
    city: '北京',
    role: '后端工程师',
    grade: 'B',
    freshness: 'stale',
  },
  data_sources: [
    { source_name: 'BOSS直聘', grade: 'B', url: 'https://www.zhipin.com/report', date: '2025-01' },
  ],
  comparison: [{ dimension: '中位数', value: '约27k/月', grade: 'B' }],
  recommendations: ['核实具体公司薪资'],
  risks: ['历史数据可能偏差'],
  next_actions: ['BOSS直聘搜索验证'],
  follow_up_questions: [],
  cannot_determine: [],
  data_freshness: 'stale',
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(() => {
    if (failMode) {
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }
    return Promise.resolve(ANALYSIS_RESULT);
  }),
};

// 用新认证契约自助申码登录(auth 轨已并入 dev:request-code → login)。
async function login(
  app: INestApplication,
  email: string,
  name: string,
): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email });
  const devCode = codeRes.body.dev_code as string | undefined;
  if (!devCode) {
    throw new Error(`request-code 未返回 dev_code(SMTP 应未配置):${JSON.stringify(codeRes.body)}`);
  }
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

function callAnalyze(app: INestApplication, token: string) {
  return request(app.getHttpServer())
    .post('/api/salary/analyze')
    .set('Authorization', `Bearer ${token}`)
    .send({ role: '后端工程师', city: '北京' });
}

describe('Quota (QuotaGuard + AiUsageInterceptor) e2e', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    // 注:全局 DAILY_AI_QUOTA 由 jest-setup-env 设为高值(100000),且因 ConfigModule cache:true
    // 在 AppModule import 时快照,运行时无法覆盖。故本套件的封顶用例统一改用 per-user
    // daily_quota_override(DB 运行时读取、优先于全局),不依赖全局 env 设定具体上限。
    // 确保 SMTP 未配置 → request-code 回吐 dev_code。
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
  }, 30000);

  afterAll(async () => {
    await app.close();
    failMode = false;
  });

  beforeEach(() => {
    failMode = false;
  });

  // ─── 守卫顺序:Jwt 先行 → 未认证应 401(而非配额 429)────────────────────────
  describe('守卫顺序 Jwt 先于 Quota', () => {
    it('无 JWT 调用 AI 端点 → 401(QuotaGuard 不抢在 Jwt 之前)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .send({ role: '后端工程师', city: '北京' });
      expect(res.status).toBe(401);
    });
  });

  // ─── 基本配额封顶:override=3 → 第 4 次 429 ──────────────────────────────────
  describe('每日配额封顶(override=3)', () => {
    it('前 3 次 201,第 4 次 429(中文 message)', async () => {
      const email = 'quota-basic@coach.dev';
      const token = await login(app, email, '配额基础');
      await userRepo.update({ email }, { daily_quota_override: 3 });

      for (let i = 1; i <= 3; i++) {
        const res = await callAnalyze(app, token);
        expect(res.status).toBe(201);
      }

      const fourth = await callAnalyze(app, token);
      expect(fourth.status).toBe(429);
      expect(fourth.body.message).toContain('今日 AI 次数已用完');
    }, 30000);
  });

  // ─── 失败调用(AI 503)不计数 ────────────────────────────────────────────────
  describe('失败调用不计数', () => {
    it('2 次 503 + 3 次成功仍可,第 4 次成功才 429', async () => {
      const email = 'quota-fail@coach.dev';
      const token = await login(app, email, '配额失败');
      await userRepo.update({ email }, { daily_quota_override: 3 });

      // 两次 AI 故障 → 503,绝不能占用配额。
      failMode = true;
      const f1 = await callAnalyze(app, token);
      expect(f1.status).toBe(503);
      const f2 = await callAnalyze(app, token);
      expect(f2.status).toBe(503);

      // 恢复后 3 次成功(若 503 计了数,这里第 2/3 次就会提前 429)。
      failMode = false;
      for (let i = 1; i <= 3; i++) {
        const res = await callAnalyze(app, token);
        expect(res.status).toBe(201);
      }

      const fourth = await callAnalyze(app, token);
      expect(fourth.status).toBe(429);
    }, 30000);
  });

  // ─── daily_quota_override=5 → 第 6 次才 429 ───────────────────────────────────
  describe('per-user override=5', () => {
    it('override 用户前 5 次 201,第 6 次 429', async () => {
      const email = 'quota-override@coach.dev';
      const token = await login(app, email, '配额提额');

      // 登录后直接调高该用户的每日额度覆盖值。
      await userRepo.update({ email }, { daily_quota_override: 5 });

      for (let i = 1; i <= 5; i++) {
        const res = await callAnalyze(app, token);
        expect(res.status).toBe(201);
      }

      const sixth = await callAnalyze(app, token);
      expect(sixth.status).toBe(429);
    }, 30000);
  });

  // ─── 不同用户互不影响 ────────────────────────────────────────────────────────
  describe('用户间配额隔离', () => {
    it('用户 A 用满 429 后,用户 B 仍可正常调用', async () => {
      const emailA = 'quota-iso-a@coach.dev';
      const emailB = 'quota-iso-b@coach.dev';
      const tokenA = await login(app, emailA, '隔离A');
      const tokenB = await login(app, emailB, '隔离B');
      await userRepo.update({ email: emailA }, { daily_quota_override: 3 });
      await userRepo.update({ email: emailB }, { daily_quota_override: 3 });

      // A 用满 3 次并触发 429。
      for (let i = 1; i <= 3; i++) {
        expect((await callAnalyze(app, tokenA)).status).toBe(201);
      }
      expect((await callAnalyze(app, tokenA)).status).toBe(429);

      // B 不受 A 影响,首次即 201。
      expect((await callAnalyze(app, tokenB)).status).toBe(201);
    }, 30000);
  });
});
