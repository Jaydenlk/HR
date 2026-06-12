import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { request } from './test-utils';

// ─── 管理后台 e2e(AdminController + AdminGuard)──────────────────────────────
//
// 用 AppModule(QuotaGuard 已接入 AI 控制器),mock AiService 让 /api/salary/analyze
// 成功返回结构化结果(201,计一次配额),以验证「配额覆盖即时生效」。
// admin 账户经 ADMIN_EMAILS=admin@coach.dev 引导;普通用户走邀请码注册。

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
  completeStructured: jest.fn().mockResolvedValue(ANALYSIS_RESULT),
};

// 普通用户登录(注册):request-code → dev_code → login(带 COACH2026 + 姓名)。
async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
  const codeRes = await request(app.getHttpServer()).post('/api/auth/request-code').send({ email, terms_agreed: true });
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

describe('Admin (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'admin@coach.dev';
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

    // admin 账户:邮箱命中 ADMIN_EMAILS → 注册即 admin。
    adminToken = await registerUser(app, 'admin@coach.dev', '超管');
    const admin = await userRepo.findOneBy({ email: 'admin@coach.dev' });
    adminId = admin!.id;
    expect(admin!.role).toBe('admin');

    // 普通用户。
    userToken = await registerUser(app, 'normal@coach.dev', '普通');
    const normal = await userRepo.findOneBy({ email: 'normal@coach.dev' });
    userId = normal!.id;
    expect(normal!.role).toBe('user');
  }, 60000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // ─── 鉴权:AdminGuard ──────────────────────────────────────────────────────
  describe('AdminGuard 鉴权', () => {
    it('无 token 访问 → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/users');
      expect(res.status).toBe(401);
    });

    it('普通用户访问 → 403「无管理员权限」', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无管理员权限');
    });

    it('admin 访问 → 200 含字段(含最近登录 IP/归属/时间四个新字段)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const admin = res.body.find((u: { email: string }) => u.email === 'admin@coach.dev');
      expect(admin).toMatchObject({
        email: 'admin@coach.dev',
        role: 'admin',
        status: 'active',
      });
      expect(admin).toHaveProperty('usage_today');
      expect(admin).toHaveProperty('usage_total');
      expect(admin).toHaveProperty('daily_quota_override');
      expect(admin).toHaveProperty('created_at');

      // 契约 3:每行带出最近登录四字段。admin 经真实登录注册 → IP/时间必非空;
      // supertest 本机回环 → 归属「内网」,city null。
      expect(typeof admin.last_login_ip).toBe('string');
      expect(admin.last_login_ip.length).toBeGreaterThan(0);
      expect(admin.last_login_province).toBe('内网');
      expect(admin.last_login_city).toBeNull();
      // JSON 序列化后时间为字符串,须可解析为有效日期。
      expect(typeof admin.last_login_at).toBe('string');
      expect(Number.isNaN(new Date(admin.last_login_at).getTime())).toBe(false);
    });
  });

  // ─── 封禁:即时生效 ────────────────────────────────────────────────────────
  describe('封禁用户即时生效', () => {
    it('admin 封禁普通用户 → 该用户携旧 token 请求 → 401', async () => {
      // 先注册一个一次性用户拿 token。
      const victimToken = await registerUser(app, 'victim@coach.dev', '待封');
      const victim = await userRepo.findOneBy({ email: 'victim@coach.dev' });
      const victimId = victim!.id;

      // 封禁前可正常访问 /me。
      const before = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${victimToken}`);
      expect(before.status).toBe(200);

      // admin 封禁。
      const ban = await request(app.getHttpServer())
        .patch(`/api/admin/users/${victimId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'banned' });
      expect(ban.status).toBe(200);
      expect(ban.body.status).toBe('banned');

      // 旧 token 立即失效(jwt.strategy.validate 查库判 banned)。
      const after = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${victimToken}`);
      expect(after.status).toBe(401);
      expect(after.body.message).toBe('账号已被停用');
    }, 30000);

    it('admin 解封后该用户重新登录可用', async () => {
      const unban = await request(app.getHttpServer())
        .patch(`/api/admin/users/${(await userRepo.findOneBy({ email: 'victim@coach.dev' }))!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active' });
      expect(unban.status).toBe(200);
      expect(unban.body.status).toBe('active');

      // 重新登录(老用户只需 email+code)。
      const codeRes = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email: 'victim@coach.dev', terms_agreed: true });
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'victim@coach.dev', code: codeRes.body.dev_code });
      expect(loginRes.status).toBe(201);
    }, 30000);
  });

  // ─── PATCH 空 body 校验 ────────────────────────────────────────────────────
  describe('PATCH /api/admin/users/:id 空 body', () => {
    it('空 body → 400「请至少修改一项」', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('请至少修改一项');
    });
  });

  // ─── 自操作约束 ────────────────────────────────────────────────────────────
  describe('自操作约束', () => {
    it('admin 封禁自己 → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'banned' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('不能封禁自己');
    });

    it('admin 把自己降级为 user → 400', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('不能撤销自己的管理员权限');
    });
  });

  // ─── 配额覆盖:QuotaGuard 阈值变化 ─────────────────────────────────────────
  describe('配额覆盖即时生效', () => {
    let quotaToken: string;
    let quotaUserId: string;

    beforeAll(async () => {
      quotaToken = await registerUser(app, 'quota-admin@coach.dev', '配额测试');
      const quotaUser = await userRepo.findOneBy({ email: 'quota-admin@coach.dev' });
      quotaUserId = quotaUser!.id;
    }, 30000);

    it('admin 设 override=2 → 该用户第 3 次调用 429', async () => {
      const patch = await request(app.getHttpServer())
        .patch(`/api/admin/users/${quotaUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daily_quota_override: 2 });
      expect(patch.status).toBe(200);
      expect(patch.body.daily_quota_override).toBe(2);

      expect((await callAnalyze(app, quotaToken)).status).toBe(201);
      expect((await callAnalyze(app, quotaToken)).status).toBe(201);
      const third = await callAnalyze(app, quotaToken);
      expect(third.status).toBe(429);
    }, 30000);

    it('admin 提额 override=10 → 阈值上移,该用户可继续调用', async () => {
      // 上一用例已计 2 次成功(+1 次 429 不计)。提额到 10 后应能继续到 201。
      const patch = await request(app.getHttpServer())
        .patch(`/api/admin/users/${quotaUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ daily_quota_override: 10 });
      expect(patch.status).toBe(200);
      expect(patch.body.daily_quota_override).toBe(10);

      // 阈值变化即时生效:第 3 次成功调用(此前被 429 卡住)现在应 201。
      expect((await callAnalyze(app, quotaToken)).status).toBe(201);
    }, 30000);
  });

  // ─── 邀请码管理 ────────────────────────────────────────────────────────────
  describe('邀请码管理', () => {
    it('admin 创建邀请码(指定 code)→ 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'ADMINCODE1', max_uses: 5 });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe('ADMINCODE1');
      expect(res.body.max_uses).toBe(5);
      expect(res.body.used_count).toBe(0);
      expect(res.body.disabled).toBe(false);
    });

    it('admin 创建邀请码(不传 code)→ 随机 8 位', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ max_uses: 3 });
      expect(res.status).toBe(201);
      expect(typeof res.body.code).toBe('string');
      expect(res.body.code.length).toBe(8);
    });

    it('重复邀请码 → 409「邀请码已存在」', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'ADMINCODE1', max_uses: 5 });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe('邀请码已存在');
    });

    it('GET /api/admin/invites 含已建码', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.some((i: { code: string }) => i.code === 'ADMINCODE1')).toBe(true);
    });

    it('停用邀请码 → 登录路径拒绝该码', async () => {
      // 先取该码 id。
      const list = await request(app.getHttpServer())
        .get('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`);
      const target = list.body.find((i: { code: string }) => i.code === 'ADMINCODE1');
      expect(target).toBeDefined();

      // 停用。
      const patch = await request(app.getHttpServer())
        .patch(`/api/admin/invites/${target.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ disabled: true });
      expect(patch.status).toBe(200);
      expect(patch.body.disabled).toBe(true);

      // 新用户用已停用码注册 → 403。
      const codeRes = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email: 'new-with-disabled@coach.dev', terms_agreed: true });
      const reg = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'new-with-disabled@coach.dev',
          code: codeRes.body.dev_code,
          invite_code: 'ADMINCODE1',
          name: '停用码用户',
        });
      expect(reg.status).toBe(403);
    }, 30000);
  });

  // ─── 用量概览 ──────────────────────────────────────────────────────────────
  describe('GET /api/admin/usage', () => {
    it('admin → 200 含 daily(7 项)与 today_by_user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/usage')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.daily)).toBe(true);
      expect(res.body.daily.length).toBe(7);
      expect(res.body.daily[0]).toHaveProperty('date');
      expect(res.body.daily[0]).toHaveProperty('count');
      expect(Array.isArray(res.body.today_by_user)).toBe(true);
    });

    it('普通用户访问 usage → 403', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/usage')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('用户表标注的 id 与 admin/user 匹配(自洽性)', () => {
      expect(adminId).not.toBe(userId);
    });
  });
});
