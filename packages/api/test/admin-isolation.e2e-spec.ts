import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// 管理面板 Phase2 — 隔离对抗 e2e(规格 §3①)
//
// 验收点:
//   1. 403 矩阵:现有 7 + 新增 6 端点 × {无token→401、role=user→403、banned→401、admin→非401/403}
//   2. 跨用户零泄露:user-activity?userId=X 只含 X;对 /admin/users、/admin/error-stream、
//      /admin/user-activity 响应做 Object.keys ⊆ 白名单断言;出现 password_hash/raw_text/
//      transcript/token/任何正文字段即 FAIL。
//   3. 本人隔离回归:普通用户带他人业务资源 id 调本人业务端点 → 404(不泄露存在性)。
//
// 复用:test-utils.request + 双账户(admin / 普通)+ AppModule + 内存 sqlite。
// AiService mock:AppModule 校验 AI 配置存在但本套件不真打 AI。
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

// 端点矩阵定义:method + path 工厂(部分需目标用户 id)。
// admin 期望:GET → 200;写端点 → 非 401/403(可能 200/201/400/404,均代表「通过了鉴权」)。
type Method = 'get' | 'post' | 'patch';
interface EndpointCase {
  name: string;
  method: Method;
  path: () => string;
  body?: Record<string, unknown>;
}

describe('Admin 隔离对抗 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let usageRepo: Repository<AiUsage>;
  let creditTxRepo: Repository<CreditTransaction>;

  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;
  let bannedToken: string; // 普通用户登录后被封禁,持旧 token
  let otherUserId: string; // 跨用户零泄露:第三个用户,有自己的活动数据
  let inviteId: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'iso-admin@coach.dev';
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
    usageRepo = moduleRef.get<Repository<AiUsage>>(getRepositoryToken(AiUsage));
    creditTxRepo = moduleRef.get<Repository<CreditTransaction>>(getRepositoryToken(CreditTransaction));

    adminToken = await registerUser(app, 'iso-admin@coach.dev', '隔离超管');
    adminId = (await userRepo.findOneBy({ email: 'iso-admin@coach.dev' }))!.id;
    expect((await userRepo.findOneBy({ email: 'iso-admin@coach.dev' }))!.role).toBe('admin');

    userToken = await registerUser(app, 'iso-user@coach.dev', '隔离普通');
    userId = (await userRepo.findOneBy({ email: 'iso-user@coach.dev' }))!.id;

    otherUserId = (await (async () => {
      await registerUser(app, 'iso-other@coach.dev', '他人');
      return (await userRepo.findOneBy({ email: 'iso-other@coach.dev' }))!.id;
    })());

    // banned 账户:登录拿 token 后改库封禁(jwt.strategy 每请求查库 → 旧 token 立即 401)。
    bannedToken = await registerUser(app, 'iso-banned@coach.dev', '待封');
    const bannedId = (await userRepo.findOneBy({ email: 'iso-banned@coach.dev' }))!.id;
    await userRepo.update({ id: bannedId }, { status: 'banned' });

    // 邀请码:供 PATCH /admin/invites/:id 矩阵用例。
    const inv = await request(app.getHttpServer())
      .post('/api/admin/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'ISOINVITE1', max_uses: 5 });
    inviteId = inv.body.id as string;

    // 跨用户零泄露:给 otherUser 与 user 各塞活动数据(ai_usage + credit consume),
    // 用于断言 user-activity?userId=other 只反映 other 的计数。
    await usageRepo.save([
      usageRepo.create({ user_id: otherUserId, endpoint: '/api/diagnoses' }),
      usageRepo.create({ user_id: otherUserId, endpoint: '/api/diagnoses' }),
      usageRepo.create({ user_id: otherUserId, endpoint: '/api/conversations' }),
      usageRepo.create({ user_id: userId, endpoint: '/api/applications/strategy' }),
    ]);
    await creditTxRepo.save([
      creditTxRepo.create({ user_id: otherUserId, delta: -1, type: 'consume', balance_after: 49, endpoint: '/api/diagnoses', note: null, created_by: null }),
      creditTxRepo.create({ user_id: userId, delta: -1, type: 'consume', balance_after: 49, endpoint: '/api/applications/strategy', note: null, created_by: null }),
    ]);

    // ops_events 里塞一条含「模拟敏感字段」的 ADMIN_ACTION,用于 error-stream / ops-events 白名单断言。
    // 通过真实管理操作(updateUser)产生 ADMIN_ACTION;detail 仅含白名单字段。
    await request(app.getHttpServer())
      .patch(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
  }, 90000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // ─── 1. 403 矩阵:13 端点 × 4 主体 ──────────────────────────────────────────
  describe('403 矩阵(7 现有 + 6 新增 端点)', () => {
    const endpoints = (): EndpointCase[] => [
      // 现有 7
      { name: 'GET /admin/users', method: 'get', path: () => '/api/admin/users' },
      { name: 'PATCH /admin/users/:id', method: 'patch', path: () => `/api/admin/users/${userId}`, body: { status: 'active' } },
      { name: 'POST /admin/users/:id/credits', method: 'post', path: () => `/api/admin/users/${userId}/credits`, body: { delta: 1, note: 't' } },
      { name: 'GET /admin/invites', method: 'get', path: () => '/api/admin/invites' },
      { name: 'POST /admin/invites', method: 'post', path: () => '/api/admin/invites', body: { max_uses: 1 } },
      { name: 'PATCH /admin/invites/:id', method: 'patch', path: () => `/api/admin/invites/${inviteId}`, body: { disabled: false } },
      { name: 'GET /admin/usage', method: 'get', path: () => '/api/admin/usage' },
      // 新增 6
      { name: 'GET /admin/ops-events', method: 'get', path: () => '/api/admin/ops-events' },
      { name: 'GET /admin/ops-stats', method: 'get', path: () => '/api/admin/ops-stats' },
      { name: 'GET /admin/health-snapshot', method: 'get', path: () => '/api/admin/health-snapshot' },
      { name: 'GET /admin/user-activity', method: 'get', path: () => `/api/admin/user-activity?userId=${userId}` },
      { name: 'GET /admin/error-stream', method: 'get', path: () => '/api/admin/error-stream' },
      { name: 'GET /admin/success-stats', method: 'get', path: () => '/api/admin/success-stats' },
    ];

    function call(ep: EndpointCase, token?: string) {
      const server = app.getHttpServer();
      let req = request(server)[ep.method](ep.path());
      if (token) req = req.set('Authorization', `Bearer ${token}`);
      if (ep.body && ep.method !== 'get') req = req.send(ep.body);
      return req;
    }

    it('无 token → 全部 401', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep);
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 401 });
      }
    });

    it('role=user → 全部 403(无管理员权限)', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, userToken);
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 403 });
        expect(res.body.message).toBe('无管理员权限');
      }
    });

    it('banned(持旧 token)→ 全部 401(jwt.strategy 查库即时拒绝)', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, bannedToken);
        // 封禁优先在 JwtAuthGuard 层 401,早于 AdminGuard 403。
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 401 });
      }
    });

    it('admin → 全部通过鉴权(非 401/403)', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, adminToken);
        // GET 必 200;写端点可能 200/201/400/404,但绝不能是鉴权失败 401/403。
        expect([401, 403]).not.toContain(res.status);
        if (ep.method === 'get') {
          expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 200 });
        }
      }
    });
  });

  // ─── 2. 跨用户零泄露 + 出站白名单 ──────────────────────────────────────────
  describe('跨用户零泄露 + 出站字段白名单', () => {
    // 禁出现的「敏感正文」字段名:任一出现即视为泄露。
    const FORBIDDEN_KEYS = [
      'password',
      'password_hash',
      'passwordHash',
      'raw_text',
      'rawText',
      'transcript',
      'token',
      'access_token',
      'accessToken',
      'code_hash',
      'jd_text',
      'content',
      'messages',
      'parsed_json',
    ];

    function assertNoForbiddenKeysDeep(obj: unknown, ctx: string): void {
      if (obj === null || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach((v, i) => assertNoForbiddenKeysDeep(v, `${ctx}[${i}]`));
        return;
      }
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.includes(key)) {
          throw new Error(`泄露:${ctx} 出现禁字段「${key}」`);
        }
        assertNoForbiddenKeysDeep((obj as Record<string, unknown>)[key], `${ctx}.${key}`);
      }
    }

    it('/admin/users 行 keys ⊆ AdminUserRow 白名单(无 invite_code/avatar_url/terms_agreed_at 等内部列)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const ALLOWED = new Set([
        'id', 'email', 'name', 'role', 'status', 'credit_balance', 'created_at',
        'last_login_ip', 'last_login_province', 'last_login_city', 'last_login_at',
        'usage_today', 'usage_total',
      ]);
      for (const row of res.body as Record<string, unknown>[]) {
        const keys = Object.keys(row);
        const extra = keys.filter((k) => !ALLOWED.has(k));
        expect({ extra, row: row.email }).toEqual({ extra: [], row: row.email });
        assertNoForbiddenKeysDeep(row, `users[${row.email as string}]`);
      }
    });

    it('/admin/user-activity?userId=X 只反映 X 的计数,且 keys ⊆ 活动响应白名单', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${otherUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      // userId 回显必须等于被查 id(不串其它用户)。
      expect(res.body.userId).toBe(otherUserId);

      // other 用户:ai_usage 共 3 条(diagnoses×2 + conversations×1),consume 1 条(diagnoses)。
      expect(res.body.aiCallsTotal).toBe(3);
      expect(res.body.creditConsumeTotal).toBe(1);
      const epSet = new Set((res.body.aiCallsByEndpoint as { endpoint: string }[]).map((r) => r.endpoint));
      // 绝不能出现 user(非 other)专属的 /api/applications/strategy 端点 → 证明无跨用户串数据。
      expect(epSet.has('/api/applications/strategy')).toBe(false);
      expect(epSet.has('/api/diagnoses')).toBe(true);

      const ALLOWED = new Set([
        'userId', 'from', 'to',
        'aiCallsByEndpoint', 'aiCallsTotal',
        'creditConsumeByEndpoint', 'creditConsumeTotal',
      ]);
      const extra = Object.keys(res.body).filter((k) => !ALLOWED.has(k));
      expect(extra).toEqual([]);
      assertNoForbiddenKeysDeep(res.body, 'user-activity');
    });

    it('/admin/user-activity 换查 user 自身 → 只含 user 的端点(/api/applications/strategy),不含 other 的 /api/diagnoses', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/user-activity?userId=${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(userId);
      const epSet = new Set((res.body.aiCallsByEndpoint as { endpoint: string }[]).map((r) => r.endpoint));
      expect(epSet.has('/api/applications/strategy')).toBe(true);
      expect(epSet.has('/api/conversations')).toBe(false);
    });

    it('/admin/error-stream 每条 keys ⊆ {id,type,detail,created_at};detail 仅白名单 key', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/error-stream')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const TOP_ALLOWED = new Set(['id', 'type', 'detail', 'created_at']);
      const DETAIL_ALLOWED = new Set([
        'endpoint', 'error', 'model', 'provider', 'active', 'maxConcurrent', 'maxQueue',
        'user_id', 'actor', 'target', 'op', 'patch', 'delta', 'note',
      ]);
      for (const ev of res.body as Record<string, unknown>[]) {
        const extraTop = Object.keys(ev).filter((k) => !TOP_ALLOWED.has(k));
        expect({ extraTop, type: ev.type }).toEqual({ extraTop: [], type: ev.type });
        if (ev.detail && typeof ev.detail === 'object') {
          const extraDetail = Object.keys(ev.detail as Record<string, unknown>).filter((k) => !DETAIL_ALLOWED.has(k));
          expect({ extraDetail, type: ev.type }).toEqual({ extraDetail: [], type: ev.type });
        }
        assertNoForbiddenKeysDeep(ev, `error-stream[${ev.type as string}]`);
      }
    });

    it('/admin/ops-events 同样 keys ⊆ {id,type,detail,created_at} 且无禁字段', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/ops-events')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const TOP_ALLOWED = new Set(['id', 'type', 'detail', 'created_at']);
      for (const ev of res.body as Record<string, unknown>[]) {
        const extraTop = Object.keys(ev).filter((k) => !TOP_ALLOWED.has(k));
        expect(extraTop).toEqual([]);
        assertNoForbiddenKeysDeep(ev, 'ops-events');
      }
    });
  });

  // ─── 3. 本人隔离回归:普通用户带他人资源 id 调本人业务端点 → 404 ─────────────
  describe('本人隔离回归(普通用户 ACL)', () => {
    let otherResumeId: string;
    let otherConvId: string;
    let otherAppId: string;

    beforeAll(async () => {
      // 用 otherUser 创建一份简历 / 对话 / 投递,拿到资源 id。
      const otherToken = (async () => {
        const codeRes = await request(app.getHttpServer())
          .post('/api/auth/request-code')
          .send({ email: 'iso-other@coach.dev', terms_agreed: true });
        const loginRes = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: 'iso-other@coach.dev', code: codeRes.body.dev_code });
        return loginRes.body.access_token as string;
      });
      const tok = await otherToken();

      const resume = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${tok}`)
        .send({ title: '他人简历', raw_text: '这是一份足够长的简历正文用于通过最小长度校验，包含工作经历与技能描述若干。' });
      otherResumeId = resume.body.id as string;

      const conv = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${tok}`)
        .send({ title: '他人对话' });
      otherConvId = conv.body.id as string;

      const appRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${tok}`)
        .send({ company: '某公司', role: '后端工程师', stage: 'applied' });
      otherAppId = appRes.body.id as string;
    }, 60000);

    it('普通用户读他人简历 GET /resumes/:id → 404', async () => {
      expect(otherResumeId).toBeTruthy();
      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${otherResumeId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('普通用户读他人对话 GET /conversations/:id → 404', async () => {
      expect(otherConvId).toBeTruthy();
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${otherConvId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('普通用户读他人投递 GET /applications/:id → 404', async () => {
      expect(otherAppId).toBeTruthy();
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${otherAppId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });

    it('普通用户改他人简历 PATCH /resumes/:id → 404(不泄露存在性)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/resumes/${otherResumeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '篡改' });
      expect(res.status).toBe(404);
    });

    it('普通用户删他人投递 DELETE /applications/:id → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/applications/${otherAppId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });
  });
});
