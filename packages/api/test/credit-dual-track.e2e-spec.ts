/**
 * 剧本 2:双轨计账验证
 * AI 成功调用后:
 *  - credit_transactions 新增 1 条 consume(账务口径)
 *  - ai_usage 也新增 1 条(运营口径)
 * 两轨独立,一次 AI 调用同时触发。
 *
 * 剧本 3:AI 失败不扣点,也不写 ai_usage。
 */
import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { request } from './test-utils';

let failMode = false;

const STRATEGY_RESULT = {
  summary: '双轨测试',
  confidence: 'low',
  evidence_used: [{ source: 'user_profile', content: '前端工程师，3年经验' }],
  recommendations: ['核实'], risks: ['偏差'], next_actions: ['验证'],
  follow_up_questions: [], cannot_determine: [],
  target_company_tiers: [],
  application_sequence: [],
  daily_action_plan: [],
  risk_assessment: { main_risks: [], mitigation: [] },
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(() => {
    if (failMode) {
      return Promise.reject(new ServiceUnavailableException('AI 不可用(测试注入)'));
    }
    return Promise.resolve(STRATEGY_RESULT);
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

describe('双轨计账 — credit + ai_usage (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<CreditTransaction>;
  let aiUsageRepo: Repository<AiUsage>;

  beforeAll(async () => {
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'credit-admin@coach.dev';
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
    txRepo = moduleRef.get<Repository<CreditTransaction>>(getRepositoryToken(CreditTransaction));
    aiUsageRepo = moduleRef.get<Repository<AiUsage>>(getRepositoryToken(AiUsage));
  }, 30000);

  afterAll(async () => {
    await app.close();
    failMode = false;
  });

  beforeEach(() => {
    failMode = false;
  });

  // ─── 剧本 2: 成功 → 双轨均写入 ────────────────────────────────────────────
  it('剧本 2:AI 成功调用 → credit_transactions + ai_usage 各新增 1 条', async () => {
    const email = `dual-track-ok-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '双轨测试');
    const u = await userRepo.findOneByOrFail({ email });

    // 统计调用前的两表条数
    const beforeCredit = await txRepo.count({ where: { user_id: u.id, type: 'consume' } });
    const beforeUsage = await aiUsageRepo.count({ where: { user_id: u.id } });

    // 调用 AI 端点
    const res = await request(app.getHttpServer())
      .post('/api/applications/strategy')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_profile: '前端工程师，3年经验，熟悉 React 与工程化。' });
    expect(res.status).toBe(201);

    // 等待拦截器异步写入(consume + ai_usage 均为 fire-and-forget)
    await new Promise((r) => setTimeout(r, 200));

    const afterCredit = await txRepo.count({ where: { user_id: u.id, type: 'consume' } });
    const afterUsage = await aiUsageRepo.count({ where: { user_id: u.id } });

    // 账务口径:新增 1 条 consume
    expect(afterCredit - beforeCredit).toBe(1);

    // 运营口径:新增 1 条 ai_usage
    expect(afterUsage - beforeUsage).toBe(1);

    // 余额减 1
    const ufter = await userRepo.findOneByOrFail({ id: u.id });
    expect(ufter.credit_balance).toBe(49);
  }, 30000);

  // ─── 剧本 3: 失败 → 双轨均不写入 ──────────────────────────────────────────
  it('剧本 3:AI 失败(503) → credit_transactions + ai_usage 均无新增', async () => {
    const email = `dual-track-fail-${Date.now()}@coach.dev`;
    const token = await registerUser(app, email, '双轨失败测试');
    const u = await userRepo.findOneByOrFail({ email });

    const beforeCredit = await txRepo.count({ where: { user_id: u.id, type: 'consume' } });
    const beforeUsage = await aiUsageRepo.count({ where: { user_id: u.id } });

    failMode = true;
    const res = await request(app.getHttpServer())
      .post('/api/applications/strategy')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_profile: '前端工程师，3年经验，熟悉 React 与工程化。' });
    expect(res.status).toBe(503);

    await new Promise((r) => setTimeout(r, 200));

    const afterCredit = await txRepo.count({ where: { user_id: u.id, type: 'consume' } });
    const afterUsage = await aiUsageRepo.count({ where: { user_id: u.id } });

    // 失败:两轨均无新增
    expect(afterCredit - beforeCredit).toBe(0);
    expect(afterUsage - beforeUsage).toBe(0);

    // 余额不变
    const ufter = await userRepo.findOneByOrFail({ id: u.id });
    expect(ufter.credit_balance).toBe(50);
  }, 30000);
});
