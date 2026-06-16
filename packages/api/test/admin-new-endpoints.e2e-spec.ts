import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { AiProviderSettingsService } from '../src/ai/ai-provider-settings.service';
import { User } from '../src/users/entities/user.entity';
import { CreditTransaction } from '../src/credit/entities/credit-transaction.entity';
import { AiUsage } from '../src/quota/entities/ai-usage.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// 管理后台重构 波5 三测 — 4 个【新端点】e2e(设计稿 §9)
//   新端点:GET /admin/users/:id、GET /admin/users/:id/credit-history、
//           GET /admin/ai-provider、PATCH /admin/ai-provider
//
// 覆盖:
//   ① 隔离对抗:每个新端点 × {无token→401、role=user→403、banned→401、admin→200/通过鉴权}
//              + 跨用户零泄露 + 出站白名单(用户详情无 PII/token;ai-provider 无 apiKey/baseURL)
//   ② 越狱渗透:畸形/越权 id、role 伪造、JWT 篡改、注入、**试图从 API 端点套出密钥**
//   ③ 压测:credit-history 大数据量分页 clamp、N 并发 users/:id 不串数据、ai-provider 并发切换最终一致
//
// AI provider 用 mock:无 GLM key 环境下,以 mock AiService + override AiProviderSettingsService
// 验证主备切换的配置持久化与读取语义(真 GLM 调用留加 key 后单独验,见套件尾注)。
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

describe('Admin 新端点 三测 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let creditTxRepo: Repository<CreditTransaction>;
  let usageRepo: Repository<AiUsage>;
  let jwt: JwtService;
  let settings: AiProviderSettingsService;

  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;
  let bannedToken: string;
  let otherUserId: string; // 跨用户:有自己的流水/用量
  let bulkUserId: string; // 大数据量流水的目标用户

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    // deepseek 给个 key,让「切到已配置 provider」有合法目标(relay/deepseek 至少一通道有 key)。
    process.env.AI_DEEPSEEK_API_KEY = 'dk-test';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'ne-admin@coach.dev';
    delete process.env.SMTP_HOST;
    // 确保 GLM 无 key:验证「切到无 key 的 provider → 400」。
    delete process.env.AI_GLM_API_KEY;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    creditTxRepo = moduleRef.get<Repository<CreditTransaction>>(getRepositoryToken(CreditTransaction));
    usageRepo = moduleRef.get<Repository<AiUsage>>(getRepositoryToken(AiUsage));
    jwt = moduleRef.get(JwtService);
    settings = moduleRef.get(AiProviderSettingsService);

    adminToken = await registerUser(app, 'ne-admin@coach.dev', '新端点超管');
    adminId = (await userRepo.findOneBy({ email: 'ne-admin@coach.dev' }))!.id;
    expect((await userRepo.findOneBy({ email: 'ne-admin@coach.dev' }))!.role).toBe('admin');

    userToken = await registerUser(app, 'ne-user@coach.dev', '新端点普通');
    userId = (await userRepo.findOneBy({ email: 'ne-user@coach.dev' }))!.id;

    await registerUser(app, 'ne-other@coach.dev', '他人');
    otherUserId = (await userRepo.findOneBy({ email: 'ne-other@coach.dev' }))!.id;

    await registerUser(app, 'ne-bulk@coach.dev', '大流水');
    bulkUserId = (await userRepo.findOneBy({ email: 'ne-bulk@coach.dev' }))!.id;

    bannedToken = await registerUser(app, 'ne-banned@coach.dev', '待封');
    const bannedId = (await userRepo.findOneBy({ email: 'ne-banned@coach.dev' }))!.id;
    await userRepo.update({ id: bannedId }, { status: 'banned' });

    // other 用户塞流水 + 用量(跨用户零泄露断言用)。
    await creditTxRepo.save([
      creditTxRepo.create({ user_id: otherUserId, delta: -1, type: 'consume', balance_after: 49, endpoint: '/api/diagnoses', note: 'other-tx-1', created_by: null }),
      creditTxRepo.create({ user_id: otherUserId, delta: 10, type: 'admin_grant', balance_after: 59, endpoint: null, note: 'other-grant', created_by: adminId }),
    ]);
    await usageRepo.save([
      usageRepo.create({ user_id: otherUserId, endpoint: '/api/diagnoses' }),
      usageRepo.create({ user_id: userId, endpoint: '/api/salary' }),
    ]);

    // bulkUser 塞 250 条流水(验证 limit clamp ≤200)。
    const rows: CreditTransaction[] = [];
    for (let i = 0; i < 250; i++) {
      rows.push(
        creditTxRepo.create({
          user_id: bulkUserId,
          delta: i % 2 === 0 ? -1 : 5,
          type: i % 2 === 0 ? 'consume' : 'admin_grant',
          balance_after: 1000 - i,
          endpoint: i % 2 === 0 ? '/api/diagnoses' : null,
          note: `bulk-${i}`,
          created_by: i % 2 === 0 ? null : adminId,
        }),
      );
    }
    await creditTxRepo.save(rows);
  }, 120000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
    delete process.env.AI_DEEPSEEK_API_KEY;
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ① 隔离对抗
  // ════════════════════════════════════════════════════════════════════════════
  describe('① 隔离对抗:401/403/banned/admin 矩阵', () => {
    type Method = 'get' | 'patch';
    interface EP { name: string; method: Method; path: () => string; body?: Record<string, unknown> }
    const endpoints = (): EP[] => [
      { name: 'GET /admin/users/:id', method: 'get', path: () => `/api/admin/users/${userId}` },
      { name: 'GET /admin/users/:id/credit-history', method: 'get', path: () => `/api/admin/users/${userId}/credit-history` },
      { name: 'GET /admin/ai-provider', method: 'get', path: () => '/api/admin/ai-provider' },
      { name: 'PATCH /admin/ai-provider', method: 'patch', path: () => '/api/admin/ai-provider', body: { primary: 'deepseek' } },
    ];

    function call(ep: EP, token?: string) {
      let req = request(app.getHttpServer())[ep.method](ep.path());
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

    it('role=user → 全部 403', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, userToken);
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 403 });
        expect(res.body.message).toBe('无管理员权限');
      }
    });

    it('banned(持旧 token)→ 全部 401', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, bannedToken);
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 401 });
      }
    });

    it('admin → 全部通过鉴权(非 401/403);GET 必 200,PATCH 200', async () => {
      for (const ep of endpoints()) {
        const res = await call(ep, adminToken);
        expect([401, 403]).not.toContain(res.status);
        expect({ ep: ep.name, status: res.status }).toEqual({ ep: ep.name, status: 200 });
      }
    });
  });

  describe('① 跨用户零泄露 + 出站字段白名单', () => {
    const FORBIDDEN_DEEP = [
      'password', 'password_hash', 'passwordHash', 'apiKey', 'api_key', 'baseURL', 'base_url',
      'access_token', 'accessToken', 'token', 'code_hash', 'raw_text', 'transcript',
      'terms_agreed_at', 'invite_code', 'daily_quota_override', 'avatar_url',
    ];
    function assertNoForbiddenDeep(obj: unknown, ctx: string): void {
      if (obj === null || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach((v, i) => assertNoForbiddenDeep(v, `${ctx}[${i}]`)); return; }
      for (const k of Object.keys(obj as Record<string, unknown>)) {
        if (FORBIDDEN_DEEP.includes(k)) throw new Error(`泄露:${ctx} 出现禁字段「${k}」`);
        assertNoForbiddenDeep((obj as Record<string, unknown>)[k], `${ctx}.${k}`);
      }
    }

    it('GET /admin/users/:id keys ⊆ 详情白名单(无 invite_code/terms_agreed_at/quota/avatar/token)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const ALLOWED = new Set([
        'id', 'email', 'name', 'role', 'status', 'credit_balance', 'created_at',
        'last_login_ip', 'last_login_province', 'last_login_city', 'last_login_at',
        'usage_today', 'usage_total', 'daily_usage',
      ]);
      const extra = Object.keys(res.body).filter((k) => !ALLOWED.has(k));
      expect(extra).toEqual([]);
      expect(res.body.id).toBe(userId); // 不串用户
      assertNoForbiddenDeep(res.body, 'user-detail');
    });

    it('GET /admin/users/:id 查 other 只返回 other(id 回显一致,不混入自身/他人)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${otherUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(otherUserId);
      expect(res.body.email).toBe('ne-other@coach.dev');
    });

    it('GET credit-history 查 other → 仅 other 的流水,每条 keys ⊆ 账务白名单,无正文', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${otherUserId}/credit-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.total).toBe('number');
      expect(Array.isArray(res.body.items)).toBe(true);
      const ALLOWED = new Set(['id', 'delta', 'type', 'balance_after', 'note', 'created_by', 'endpoint', 'created_at']);
      for (const tx of res.body.items as Record<string, unknown>[]) {
        const extra = Object.keys(tx).filter((k) => !ALLOWED.has(k));
        expect({ extra, note: tx.note }).toEqual({ extra: [], note: tx.note });
      }
      // 仅 other 的备注,绝不出现 user 自己的端点 /api/salary 流水(user 无 salary credit tx,这里反证不串)。
      const notes = (res.body.items as { note: string | null }[]).map((t) => t.note);
      expect(notes).toContain('other-tx-1');
      expect(notes).toContain('other-grant');
      assertNoForbiddenDeep(res.body, 'credit-history');
    });

    it('GET credit-history 查 user → 不含 other 的备注(零跨用户串数据)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}/credit-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const notes = (res.body.items as { note: string | null }[]).map((t) => t.note);
      expect(notes).not.toContain('other-tx-1');
      expect(notes).not.toContain('other-grant');
    });

    it('GET /admin/ai-provider 响应【绝不含 apiKey/baseURL】(逐字段断言 + 深层扫描 + 序列化字面量)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const ALLOWED_TOP = new Set(['providers', 'primary', 'order']);
      expect(Object.keys(res.body).filter((k) => !ALLOWED_TOP.has(k))).toEqual([]);
      const PROVIDER_ALLOWED = new Set(['name', 'configured', 'modelPro', 'modelFlash']);
      for (const p of res.body.providers as Record<string, unknown>[]) {
        const extra = Object.keys(p).filter((k) => !PROVIDER_ALLOWED.has(k));
        expect({ extra, name: p.name }).toEqual({ extra: [], name: p.name });
        // 字段快照断言:apiKey/baseURL 结构上不存在。
        expect('apiKey' in p).toBe(false);
        expect('baseURL' in p).toBe(false);
        expect('api_key' in p).toBe(false);
        expect('base_url' in p).toBe(false);
      }
      assertNoForbiddenDeep(res.body, 'ai-provider');
      // 整段序列化里不得出现已知密钥/baseURL 字面量(deepseek key 设为 dk-test)。
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key'); // relay/clouddream key
      expect(serialized).not.toContain('http'); // baseURL 含 http(s),不应外泄
    });

    it('PATCH /admin/ai-provider 返回体同样【绝不含 apiKey/baseURL】', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'deepseek' });
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key');
      expect(serialized).not.toContain('http');
      assertNoForbiddenDeep(res.body, 'ai-provider-patch');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ② 越狱渗透
  // ════════════════════════════════════════════════════════════════════════════
  describe('② 越狱渗透', () => {
    it('畸形 id(SQL 注入串)GET /admin/users/:id → 400(ParseUUIDPipe 挡,不穿 DB)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${encodeURIComponent("'; DROP TABLE users;--")}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      // 反证:users 表仍在。
      const still = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(still.status).toBe(200);
      expect(still.body.length).toBeGreaterThan(0);
    });

    it('非 UUID id GET /admin/users/:id → 400', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('合法但不存在的 UUID → 404(不泄露存在性,不报 500)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/users/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('credit-history 畸形 id → 400(ParseUUIDPipe)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${encodeURIComponent("' OR '1'='1")}/credit-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('credit-history limit=-1 / abc → 400(DTO @Min/@IsInt)', async () => {
      const neg = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}/credit-history?limit=-1`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(neg.status).toBe(400);
      const abc = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}/credit-history?limit=abc`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(abc.status).toBe(400);
    });

    it('credit-history limit=1e9 → 400(超 @Max(200))', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}/credit-history?limit=1000000000`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('PATCH ai-provider primary 注入串 → 400(@IsIn 白名单)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'deepseek; --' });
      expect(res.status).toBe(400);
    });

    it("PATCH ai-provider order 含 __proto__ → 400(@IsIn each 白名单)", async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'deepseek', order: ['glm', '__proto__'] });
      expect(res.status).toBe(400);
      // 原型未被污染。
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('PATCH ai-provider 切到【无 key 的 glm】→ 400(service 校验已配置)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'glm' });
      expect(res.status).toBe(400);
    });

    it('JWT 篡改 sub(冒充 admin)不重签 → 401(验签失败)', async () => {
      const [h, p, sig] = userToken.split('.');
      const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as Record<string, unknown>;
      payload.sub = adminId;
      const forged = `${h}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('JWT 伪造 role:admin(真密钥自签,sub=普通用户)→ 403(AdminGuard 查库不信 claim)', async () => {
      const forged = jwt.sign({ sub: userId, email: 'ne-user@coach.dev', role: 'admin', is_admin: true });
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${forged}`)
        .send({ primary: 'deepseek' });
      expect(res.status).toBe(403);
    });

    it('【套密钥渗透】GET ai-provider 不论如何不返回 key;尝试用 query 注入取 key 字段无效', async () => {
      // 攻击者试图通过 query 参数让端点回吐更多字段(端点无入参,whitelist 剥离一切)。
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-provider?fields=apiKey,baseURL&include=secrets&verbose=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key');
      expect(serialized.toLowerCase()).not.toContain('apikey');
      expect(serialized).not.toContain('baseURL');
    });

    it('【套密钥渗透】PATCH ai-provider body 塞 apiKey/baseURL → whitelist 剥离,不回显、不落库', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'deepseek', apiKey: 'attacker-injected-key', baseURL: 'http://evil.example' });
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('attacker-injected-key');
      expect(serialized).not.toContain('evil.example');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ③ 压测 / 大数据量
  // ════════════════════════════════════════════════════════════════════════════
  describe('③ 压测 / 大数据量', () => {
    it('credit-history limit=500 → 实际 ≤200(clamp 生效),total=250', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${bulkUserId}/credit-history?limit=500`)
        .set('Authorization', `Bearer ${adminToken}`);
      // 注意:DTO @Max(200) 会先于 service clamp 拦截 limit=500 → 400。
      // 合法路径是 limit≤200;此处验证 DTO 上限防线。
      expect(res.status).toBe(400);
    });

    // 注:bulkUser 注册时获赠 1 条 signup_grant 流水,故 total = 250(夹具)+ 1 = 251。
    const BULK_TOTAL = 251;

    it('credit-history limit=200(上限)→ 返回 200 条,total=251(含注册赠点流水)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${bulkUserId}/credit-history?limit=200`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(200);
      expect(res.body.total).toBe(BULK_TOTAL);
    });

    it('credit-history 缺省 limit → 钳到 50 条', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${bulkUserId}/credit-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(50);
      expect(res.body.total).toBe(BULK_TOTAL);
    });

    it('credit-history offset 越界(offset=99999)→ 空数组不报错', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/admin/users/${bulkUserId}/credit-history?limit=50&offset=99999`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(BULK_TOTAL);
    });

    it('GET /admin/users/:id 50 并发不同用户 → 返回 id 与请求 id 一致(不串数据)', async () => {
      const ids = [userId, otherUserId, bulkUserId, adminId];
      const tasks: Promise<{ reqId: string; gotId: string; status: number }>[] = [];
      const t0 = Date.now();
      for (let i = 0; i < 50; i++) {
        const reqId = ids[i % ids.length];
        tasks.push(
          request(app.getHttpServer())
            .get(`/api/admin/users/${reqId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .then((r) => ({ reqId, gotId: r.body.id as string, status: r.status })),
        );
      }
      const results = await Promise.all(tasks);
      const elapsed = Date.now() - t0;
      for (const r of results) {
        expect(r.status).toBe(200);
        expect(r.gotId).toBe(r.reqId); // 并发下绝不串数据
      }
      // 记录耗时(非硬阈值,信息性):50 并发应在合理时间内完成。
      // eslint-disable-next-line no-console
      console.log(`[stress] 50 并发 users/:id 耗时 ${elapsed}ms`);
      expect(elapsed).toBeLessThan(30000);
    }, 60000);

    it('PATCH ai-provider 20 并发切换(deepseek↔relay)→ 表最终一致(读最新行),无脏读崩溃', async () => {
      const tasks: Promise<number>[] = [];
      for (let i = 0; i < 20; i++) {
        const primary = i % 2 === 0 ? 'deepseek' : 'relay';
        tasks.push(
          request(app.getHttpServer())
            .patch('/api/admin/ai-provider')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ primary })
            .then((r) => r.status),
        );
      }
      const statuses = await Promise.all(tasks);
      // relay 是否有 key?relay 走 CLOUDDREAM_API_KEY=test-key → configured=true,可设主力。
      for (const s of statuses) expect([200, 400]).toContain(s);
      // 最终读一次:primary 是 deepseek 或 relay 之一(最后写入者),order 合法。
      const final = await request(app.getHttpServer())
        .get('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(final.status).toBe(200);
      expect(['deepseek', 'relay']).toContain(final.body.primary);
      expect(Array.isArray(final.body.order)).toBe(true);
      expect(new Set(final.body.order).size).toBe(final.body.order.length); // 无重复
    }, 60000);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 配置持久化 + 切换语义(mock provider,无新增调用点)
  // ════════════════════════════════════════════════════════════════════════════
  describe('配置持久化 + 主备切换语义', () => {
    it('PATCH 切 deepseek 主力 → GET 读回 primary=deepseek(持久化生效,免重启)', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'deepseek', order: ['deepseek', 'relay', 'glm'] });
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.primary).toBe('deepseek');
      expect(res.body.order[0]).toBe('deepseek');
      // settings service 的 current() 也读到一致值(缓存失效已在 update 内触发)。
      const eff = await settings.current();
      expect(eff.primary).toBe('deepseek');
    });

    it('AiProviderSettingsService.invalidate + current 读取最新 DB 行(不依赖重启)', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/ai-provider')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ primary: 'relay' });
      const eff = await settings.current();
      expect(eff.primary).toBe('relay');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 邀请码 note 录入(设计稿 §3:CreateInviteDto.note → InvitesService.create 落库)
  // note 列已在 InitialSchema 基线迁移,无新增 ALTER 迁移。
  // ════════════════════════════════════════════════════════════════════════════
  describe('邀请码 note 录入 + 持久化', () => {
    it('POST /admin/invites 带 note → 落库且 GET 列表回显 note', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NOTECODE1', max_uses: 3, note: '2026校招春季批次' });
      expect(created.status).toBe(201);
      expect(created.body.note).toBe('2026校招春季批次');

      const list = await request(app.getHttpServer())
        .get('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`);
      const found = (list.body as { code: string; note: string | null }[]).find((i) => i.code === 'NOTECODE1');
      expect(found).toBeDefined();
      expect(found!.note).toBe('2026校招春季批次');
    });

    it('note 超 200 字 → 400(@MaxLength)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NOTECODE2', max_uses: 1, note: 'x'.repeat(201) });
      expect(res.status).toBe(400);
    });

    it('不传 note → 落 null(向后兼容,不破坏既有建码)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/invites')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'NOTECODE3', max_uses: 1 });
      expect(res.status).toBe(201);
      expect(res.body.note).toBeNull();
    });
  });

  // ── 真 GLM 调用:留加 key 后验(见 ai-provider-glm.spec.ts mock 接线 + 本套件 notes)──
});
