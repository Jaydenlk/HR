import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// 管理面板 Phase2 — 越狱渗透 e2e(规格 §3③:①③⑤⑥⑦⑧)
//
// ① JWT 改 sub 不重签 → 401(验签失败)
// ③ token 塞 role:'admin' → 403(AdminGuard 查库,不信 claim)
// ⑤ user-activity 传非UUID / `' OR '1'='1` / 不存在UUID → @IsUUID 400 不进库;合法他人 id → 只返回该 id
// ⑥ 日期/排序传 `;DROP TABLE` / `union select` → QueryBuilder 绑定 + 排序枚举白名单 → 无效无泄漏
// ⑦ updateUser body 塞 credit_balance/role → whitelist 剥离不写入(断言库里没变)
// ⑧ ops_event.detail 含模拟 token,查 error-stream → 响应白名单剔除
//
// ②(dev-secret 自签)④(prod devLogin/DEV_LOGIN=1+prod 自检拒启)→ 见
// env-validation.spec.ts 与 main-bootstrap-guards.spec.ts(对自检纯函数断言 throw,不真启进程)。
// ─────────────────────────────────────────────────────────────────────────────

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockResolvedValue({ summary: 'mock' }),
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

describe('Admin 越狱渗透 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let opsRepo: Repository<OpsEvent>;
  let jwt: JwtService;

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
    process.env.ADMIN_EMAILS = 'jb-admin@coach.dev';
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
    jwt = moduleRef.get(JwtService);

    adminToken = await registerUser(app, 'jb-admin@coach.dev', '越狱超管');
    adminId = (await userRepo.findOneBy({ email: 'jb-admin@coach.dev' }))!.id;

    userToken = await registerUser(app, 'jb-user@coach.dev', '越狱普通');
    userId = (await userRepo.findOneBy({ email: 'jb-user@coach.dev' }))!.id;
  }, 90000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // ─── ① JWT 改 sub 不重签 → 401 ──────────────────────────────────────────────
  describe('① JWT 改 sub 不重签', () => {
    it('篡改 payload(把 sub 换成 admin id)但不重签 → 401 验签失败', async () => {
      // 拿普通用户的真实 token,解出三段,篡改 payload.sub=adminId,保留原签名段。
      const [h, p, sig] = userToken.split('.');
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as Record<string, unknown>;
      payload.sub = adminId; // 想冒充管理员
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const forged = `${h}.${tamperedPayload}.${sig}`;

      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('对照:用合法 user token 调 admin 端点 → 403(证明上面是验签失败而非别的)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ─── ③ token 塞 role:'admin' → 403(AdminGuard 查库) ────────────────────────
  describe('③ token 伪造 role 声明', () => {
    it('用真密钥自签一个 sub=普通用户、附带 role:admin 的 token → 仍 403(查库 role=user)', async () => {
      // 验签通过(同密钥),但 AdminGuard 不读 claim,按 sub 查库 → role=user → 403。
      const forged = jwt.sign({ sub: userId, email: 'jb-user@coach.dev', role: 'admin', is_admin: true });
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无管理员权限');
    });

    it('自签 sub=不存在的随机 UUID + role:admin → 401(查库无此用户)', async () => {
      const forged = jwt.sign({ sub: '00000000-0000-4000-8000-000000000000', email: 'ghost@coach.dev', role: 'admin' });
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forged}`);
      // jwt.strategy.validate 查库 null → 401「账号已被停用」。
      expect(res.status).toBe(401);
    });
  });

  // ─── ⑤ user-activity userId 校验 ────────────────────────────────────────────
  describe('⑤ user-activity userId 注入/非法值', () => {
    it('非 UUID → 400(@IsUUID 拦截,不进库)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/user-activity?userId=not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it("SQL 注入串 `' OR '1'='1` → 400(@IsUUID 拦截)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${encodeURIComponent("' OR '1'='1")}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('合法但不存在的 UUID → 200 且全为空计数(不报错、不泄露)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/user-activity?userId=11111111-1111-4111-8111-111111111111')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('11111111-1111-4111-8111-111111111111');
      expect(res.body.aiCallsTotal).toBe(0);
      expect(res.body.creditConsumeTotal).toBe(0);
      expect(res.body.aiCallsByEndpoint).toEqual([]);
    });

    it('合法他人 id → 200 且 userId 回显等于被查 id(只返回该 id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userId);
    });
  });

  // ─── ⑥ 日期/排序注入 → QueryBuilder 绑定 + 排序白名单 ───────────────────────
  describe('⑥ 日期/排序参数注入', () => {
    it('orderBy=`;DROP TABLE ai_usage;--` → 400(@IsIn 枚举白名单拦截)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}&orderBy=${encodeURIComponent(';DROP TABLE ai_usage;--')}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('orderBy=`union select`  → 400(非枚举值)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}&orderBy=${encodeURIComponent('union select')}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('from=`2026-01-01;DROP TABLE users` → 400(@IsISO8601 拦截,不进 WHERE)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}&from=${encodeURIComponent('2026-01-01;DROP TABLE users')}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('合法 orderBy=endpoint + 合法 from/to → 200(白名单值放行,表仍在、可继续查)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}&orderBy=endpoint&from=2026-01-01&to=2026-12-31`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      // 注入未生效的反证:users 表仍可被管理端点读取(没被 DROP)。
      const stillThere = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(stillThere.status).toBe(200);
      expect(Array.isArray(stillThere.body)).toBe(true);
      expect(stillThere.body.length).toBeGreaterThan(0);
    });

    it('error-stream type=`union select 1` → 400(@IsIn 枚举白名单)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/error-stream?type=${encodeURIComponent('union select 1')}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('ops-events limit=999999 → 400(@Max(200) 拦截);limit=50 → 200', async () => {
      const tooBig = await request(app.getHttpServer())
        .get('/api/admin/ops-events?limit=999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(tooBig.status).toBe(400);
      const ok = await request(app.getHttpServer())
        .get('/api/admin/ops-events?limit=50')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(ok.status).toBe(200);
    });
  });

  // ─── ⑦ updateUser body 塞 credit_balance/role 越权字段 ──────────────────────
  describe('⑦ updateUser whitelist 剥离未声明字段', () => {
    it('PATCH 塞 credit_balance/daily_quota_override(未声明字段)→ 被剥离,库里余额不变', async () => {
      const before = await userRepo.findOneBy({ id: userId });
      const beforeBalance = before!.credit_balance;

      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active', credit_balance: 999999, daily_quota_override: 888 });
      expect(res.status).toBe(200);

      const after = await userRepo.findOneBy({ id: userId });
      // credit_balance 未在 UpdateUserDto 声明 → whitelist 剥离 → 不写入。
      expect(after!.credit_balance).toBe(beforeBalance);
      expect(after!.credit_balance).not.toBe(999999);
      expect(after!.daily_quota_override).toBe(before!.daily_quota_override);
    });

    it('PATCH 只塞未声明字段(无 status/role)→ 400「请至少修改一项」(声明字段全空)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ credit_balance: 123456 });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('请至少修改一项');
      const after = await userRepo.findOneBy({ id: userId });
      expect(after!.credit_balance).not.toBe(123456);
    });

    it('PATCH role=admin 合法声明字段 → 写入生效(对照:声明字段确实能改,证明剥离的是「未声明」而非全部)', async () => {
      // 用一次性用户验证 role 字段确实可写(避免污染主用户)。
      await registerUser(app, 'jb-promote@coach.dev', '待提升');
      const promoteId = (await userRepo.findOneBy({ email: 'jb-promote@coach.dev' }))!.id;
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/users/${promoteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });
      expect(res.status).toBe(200);
      expect((await userRepo.findOneBy({ id: promoteId }))!.role).toBe('admin');
    }, 30000);
  });

  // ─── ⑧ ops_event.detail 含模拟 token,查 error-stream → 白名单剔除 ───────────
  describe('⑧ error-stream detail 白名单剔除敏感字段', () => {
    it('直接落一条 detail 含 token/raw_text/transcript 的 ops_event → 响应里这些字段被剔除,白名单字段保留', async () => {
      // 模拟一条「脏」事件:detail 混入 token / 原始正文 / 转写文本(攻击者/旧代码可能写入)。
      await opsRepo.save(
        opsRepo.create({
          type: 'AI_CALL_FAILED',
          detail: {
            endpoint: '/api/diagnoses',
            error: 'timeout',
            // 以下都是「禁出现在响应」的敏感字段:
            token: 'Bearer eyJhbGciOi.LEAKED.SECRET',
            access_token: 'sk-should-not-leak',
            raw_text: '这是用户简历原文，绝不能出现在管理面板响应里。',
            transcript: '这是面试转写文本，禁止泄露。',
            prompt: '内部 system prompt 不应外泄',
            messages: [{ role: 'user', content: '对话正文' }],
          },
        }),
      );

      const res = await request(app.getHttpServer())
        .get('/api/admin/error-stream?type=AI_CALL_FAILED')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const dirty = (res.body as { type: string; detail: Record<string, unknown> | null }[]).find(
        (e) => e.detail && e.detail.endpoint === '/api/diagnoses' && e.detail.error === 'timeout',
      );
      expect(dirty).toBeDefined();
      const detail = dirty!.detail!;
      // 白名单字段保留。
      expect(detail.endpoint).toBe('/api/diagnoses');
      expect(detail.error).toBe('timeout');
      // 敏感字段一律被剔除。
      expect(detail).not.toHaveProperty('token');
      expect(detail).not.toHaveProperty('access_token');
      expect(detail).not.toHaveProperty('raw_text');
      expect(detail).not.toHaveProperty('transcript');
      expect(detail).not.toHaveProperty('prompt');
      expect(detail).not.toHaveProperty('messages');
      // 整段序列化里不得出现敏感值字面量。
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('LEAKED');
      expect(serialized).not.toContain('sk-should-not-leak');
      expect(serialized).not.toContain('简历原文');
      expect(serialized).not.toContain('转写文本');
    });
  });
});
