/**
 * Credit 计费体系 e2e:CreditGuard(402)/ CreditInterceptor(成功扣 1、失败不扣)/ 注册赠送 /
 * /me 三端点 / 管理员充值。受测 AI 端点用 /api/salary/analyze(已挂 CreditGuard + 双拦截器)。
 *
 * AiService 被 mock:failMode=false → 201(成功,扣 1);failMode=true → 503(失败,不扣)。
 */
import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { request } from './test-utils';

let failMode = false;

const ANALYSIS_RESULT = {
  summary: '测试用薪资分析结果。',
  confidence: 'low',
  salary_range: {
    p25: 22000, p50: 27000, p75: 31000,
    unit: 'monthly_rmb', year: '2025', city: '北京', role: '后端工程师', grade: 'B', freshness: 'stale',
  },
  data_sources: [{ source_name: 'BOSS直聘', grade: 'B', url: 'https://www.zhipin.com', date: '2025-01' }],
  comparison: [{ dimension: '中位数', value: '约27k/月', grade: 'B' }],
  recommendations: ['核实'], risks: ['偏差'], next_actions: ['验证'],
  follow_up_questions: [], cannot_determine: [], data_freshness: 'stale',
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(() => {
    if (failMode) {
      return Promise.reject(new ServiceUnavailableException('AI 服务暂时不可用(测试注入)。'));
    }
    return Promise.resolve(ANALYSIS_RESULT);
  }),
};

async function register(app: INestApplication, email: string, name: string): Promise<string> {
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

function callAnalyze(app: INestApplication, token: string) {
  return request(app.getHttpServer())
    .post('/api/salary/analyze')
    .set('Authorization', `Bearer ${token}`)
    .send({ role: '后端工程师', city: '北京' });
}

describe('Credit 计费体系 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let txRepo: Repository<CreditTransaction>;

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
  }, 30000);

  afterAll(async () => {
    await app.close();
    failMode = false;
  });

  beforeEach(() => {
    failMode = false;
  });

  // ─── step5:注册赠送 ────────────────────────────────────────────────────────
  describe('注册赠送 50 点', () => {
    it('新用户注册后余额=50,流水恰好 1 条 signup_grant(balance_after=50)', async () => {
      const email = 'credit-signup@coach.dev';
      await register(app, email, '注册赠送');
      const u = await userRepo.findOneByOrFail({ email });
      expect(u.credit_balance).toBe(50);
      const txs = await txRepo.find({ where: { user_id: u.id } });
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe('signup_grant');
      expect(txs[0].delta).toBe(50);
      expect(txs[0].balance_after).toBe(50);
    }, 30000);
  });

  // ─── step4:守卫顺序 + 402 + 扣点 + 失败不扣 ──────────────────────────────────
  describe('CreditGuard / CreditInterceptor', () => {
    it('无 JWT 调 AI 端点 → 401(Jwt 先于 Credit)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .send({ role: '后端工程师', city: '北京' });
      expect(res.status).toBe(401);
    });

    it('余额 0 调 AI 端点 → 402 + 指定文案,且不产生 consume 流水', async () => {
      const email = 'credit-zero@coach.dev';
      const token = await register(app, email, '零余额');
      const u = await userRepo.findOneByOrFail({ email });
      await userRepo.update({ id: u.id }, { credit_balance: 0 });

      const res = await callAnalyze(app, token);
      expect(res.status).toBe(402);
      expect(res.body.message).toBe('点数不足，请联系管理员充值');

      const consumes = await txRepo.find({ where: { user_id: u.id, type: 'consume' } });
      expect(consumes).toHaveLength(0);
    }, 30000);

    it('成功调用扣 1 点,流水 endpoint 正确', async () => {
      const email = 'credit-consume@coach.dev';
      const token = await register(app, email, '扣点');
      const u = await userRepo.findOneByOrFail({ email });
      expect(u.credit_balance).toBe(50);

      const res = await callAnalyze(app, token);
      expect(res.status).toBe(201);

      const after = await userRepo.findOneByOrFail({ id: u.id });
      expect(after.credit_balance).toBe(49);
      const consumes = await txRepo.find({ where: { user_id: u.id, type: 'consume' } });
      expect(consumes).toHaveLength(1);
      expect(consumes[0].delta).toBe(-1);
      expect(consumes[0].balance_after).toBe(49);
      expect(consumes[0].endpoint).toBe('/api/salary/analyze');
    }, 30000);

    it('失败调用(AI 503)不扣点、不产生 consume 流水', async () => {
      const email = 'credit-fail@coach.dev';
      const token = await register(app, email, '失败不扣');
      const u = await userRepo.findOneByOrFail({ email });

      failMode = true;
      const res = await callAnalyze(app, token);
      expect(res.status).toBe(503);

      const after = await userRepo.findOneByOrFail({ id: u.id });
      expect(after.credit_balance).toBe(50); // 余额不变
      const consumes = await txRepo.find({ where: { user_id: u.id, type: 'consume' } });
      expect(consumes).toHaveLength(0);
    }, 30000);
  });

  // ─── step6:/me 三端点 ──────────────────────────────────────────────────────
  describe('/me 端点', () => {
    it('GET /me → 基本信息 + credit_balance', async () => {
      const email = 'credit-me@coach.dev';
      const token = await register(app, email, '我的页');
      const res = await request(app.getHttpServer())
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        email,
        name: '我的页',
        invite_code: 'COACH2026',
        credit_balance: 50,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('avatar_url');
      expect(res.body).toHaveProperty('created_at');
      // 不应泄露内部字段。
      expect(res.body).not.toHaveProperty('role');
      expect(res.body).not.toHaveProperty('status');
    }, 30000);

    it('GET /me 未登录 → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/me');
      expect(res.status).toBe(401);
    });

    it('GET /me/credits → 倒序流水 + total', async () => {
      const email = 'credit-me-tx@coach.dev';
      const token = await register(app, email, '流水');
      // 触发一次 consume,使流水含 signup_grant + consume 两条。
      await callAnalyze(app, token);

      const res = await request(app.getHttpServer())
        .get('/api/me/credits?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toHaveLength(2);
      // 倒序:最近的 consume 在前。
      expect(res.body.items[0].type).toBe('consume');
      expect(res.body.items[0].delta).toBe(-1);
      expect(res.body.items[0].endpoint).toBe('/api/salary/analyze');
      expect(res.body.items[1].type).toBe('signup_grant');
      // 不暴露 created_by/user_id。
      expect(res.body.items[0]).not.toHaveProperty('created_by');
      expect(res.body.items[0]).not.toHaveProperty('user_id');
    }, 30000);

    it('POST /me/avatar 正常上传(png) → {avatar_url} 并更新用户', async () => {
      const email = 'credit-avatar@coach.dev';
      const token = await register(app, email, '头像');
      const res = await request(app.getHttpServer())
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'a.png', contentType: 'image/png' });
      expect(res.status).toBe(201);
      expect(typeof res.body.avatar_url).toBe('string');
      expect(res.body.avatar_url).toMatch(/^avatars\//);
      const u = await userRepo.findOneByOrFail({ email });
      expect(u.avatar_url).toBe(res.body.avatar_url);
    }, 30000);

    it('POST /me/avatar 非图片(text) → 400', async () => {
      const email = 'credit-avatar-bad@coach.dev';
      const token = await register(app, email, '坏头像');
      const res = await request(app.getHttpServer())
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('JPEG');
    }, 30000);

    it('POST /me/avatar 超 2MB → 413(Multer 硬上限拦截)', async () => {
      const email = 'credit-avatar-big@coach.dev';
      const token = await register(app, email, '大头像');
      const big = Buffer.alloc(2 * 1024 * 1024 + 1, 1);
      const res = await request(app.getHttpServer())
        .post('/api/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', big, { filename: 'big.png', contentType: 'image/png' });
      // Multer fileSize 上限触发 → Nest 默认 413 Payload Too Large。
      expect(res.status).toBe(413);
    }, 30000);
  });

  // ─── step7:管理员充值 + /admin/users 含余额 ──────────────────────────────────
  describe('管理员充值', () => {
    async function loginAdmin(): Promise<string> {
      return register(app, 'credit-admin@coach.dev', '管理员');
    }

    it('POST /admin/users/:id/credits 正整数充值 → {credit_balance} 增加 + admin_grant 流水(用户侧可见)', async () => {
      const adminToken = await loginAdmin();
      const userToken = await register(app, 'credit-recharge@coach.dev', '被充值');
      const u = await userRepo.findOneByOrFail({ email: 'credit-recharge@coach.dev' });

      const res = await request(app.getHttpServer())
        .post(`/api/admin/users/${u.id}/credits`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ delta: 100, note: '测试充值' });
      expect(res.status).toBe(201);
      expect(res.body.credit_balance).toBe(150); // 50 + 100

      // 用户侧流水即时可见,显示 admin_grant + 备注。
      const meCredits = await request(app.getHttpServer())
        .get('/api/me/credits')
        .set('Authorization', `Bearer ${userToken}`);
      const grant = meCredits.body.items.find((i: { type: string }) => i.type === 'admin_grant');
      expect(grant).toBeDefined();
      expect(grant.delta).toBe(100);
      expect(grant.balance_after).toBe(150);
      expect(grant.note).toBe('测试充值');
    }, 30000);

    it('非管理员充值 → 403', async () => {
      const userToken = await register(app, 'credit-noadmin@coach.dev', '非管理员');
      const target = await userRepo.findOneByOrFail({ email: 'credit-noadmin@coach.dev' });
      const res = await request(app.getHttpServer())
        .post(`/api/admin/users/${target.id}/credits`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ delta: 10 });
      expect(res.status).toBe(403);
    }, 30000);

    it('delta 非正整数 → 400', async () => {
      const adminToken = await loginAdmin();
      const target = await userRepo.findOneByOrFail({ email: 'credit-recharge@coach.dev' });
      for (const bad of [0, -5, 1.5]) {
        const res = await request(app.getHttpServer())
          .post(`/api/admin/users/${target.id}/credits`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ delta: bad });
        expect(res.status).toBe(400);
      }
    }, 30000);

    it('GET /admin/users 每行含 credit_balance', async () => {
      const adminToken = await loginAdmin();
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const row of res.body) {
        expect(row).toHaveProperty('credit_balance');
        expect(typeof row.credit_balance).toBe('number');
      }
    }, 30000);
  });
});
