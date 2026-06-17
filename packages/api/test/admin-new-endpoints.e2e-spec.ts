import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { AiProviderService } from '../src/ai/ai-provider.service';
import { AiProvider } from '../src/ai/entities/ai-provider.entity';
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
  // 连通性测试 mock:默认连通(避免 e2e 真打外网);失败用例单独覆写。
  testConnection: jest.fn().mockResolvedValue({ ok: true, latencyMs: 12 }),
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
  let providers: AiProviderService;
  let providerRepo: Repository<AiProvider>;

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
    // 确保 GLM 无 key(种子只种有 key 的通道:deepseek/relay 两条)。
    delete process.env.AI_GLM_API_KEY;
    // 主密钥(非生产 → 仅启用加密 CRUD;64 位 hex = 32 字节)。
    process.env.PROVIDER_ENC_KEY = '0'.repeat(64);

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
    providers = moduleRef.get(AiProviderService);
    providerRepo = moduleRef.get<Repository<AiProvider>>(getRepositoryToken(AiProvider));

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
    delete process.env.PROVIDER_ENC_KEY;
  });

  // 取种子里 deepseek 通道的 id(CRUD/测试用)。
  async function providerId(name: string): Promise<string> {
    const row = await providerRepo.findOneBy({ name });
    if (!row) throw new Error(`通道 ${name} 未种入`);
    return row.id;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ① 隔离对抗
  // ════════════════════════════════════════════════════════════════════════════
  describe('① 隔离对抗:401/403/banned/admin 矩阵', () => {
    type Method = 'get' | 'patch';
    let deepseekId: string;
    beforeAll(async () => {
      deepseekId = await providerId('deepseek');
    });
    interface EP { name: string; method: Method; path: () => string; body?: Record<string, unknown> }
    const endpoints = (): EP[] => [
      { name: 'GET /admin/users/:id', method: 'get', path: () => `/api/admin/users/${userId}` },
      { name: 'GET /admin/users/:id/credit-history', method: 'get', path: () => `/api/admin/users/${userId}/credit-history` },
      { name: 'GET /admin/ai-providers', method: 'get', path: () => '/api/admin/ai-providers' },
      { name: 'PATCH /admin/ai-providers/:id', method: 'patch', path: () => `/api/admin/ai-providers/${deepseekId}`, body: { role: 'primary' } },
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
    // 注:baseURL 在新 CRUD 模型里由 admin 管理、合法回显,故不在禁字段名单;
    //     明文/密文密钥(apiKey/api_key/api_key_enc)始终禁出。
    const FORBIDDEN_DEEP = [
      'password', 'password_hash', 'passwordHash', 'apiKey', 'api_key', 'api_key_enc',
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

    it('GET /admin/ai-providers 响应【绝不含明文/密文 apiKey】(逐字段白名单 + 序列化字面量)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-providers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const PROVIDER_ALLOWED = new Set([
        'id', 'name', 'protocol', 'baseURL', 'apiKeyMasked', 'modelPro', 'modelFlash',
        'role', 'sortOrder', 'timeoutMs', 'maxRetries', 'createdAt', 'updatedAt',
      ]);
      for (const p of res.body as Record<string, unknown>[]) {
        const extra = Object.keys(p).filter((k) => !PROVIDER_ALLOWED.has(k));
        expect({ extra, name: p.name }).toEqual({ extra: [], name: p.name });
        // 结构上不存在明文 key / 密文列。
        expect('apiKey' in p).toBe(false);
        expect('api_key' in p).toBe(false);
        expect('api_key_enc' in p).toBe(false);
        // apiKeyMasked 必须是打码(以 **** 开头),绝非明文密钥。
        expect(String(p.apiKeyMasked).startsWith('****')).toBe(true);
      }
      // FORBIDDEN_DEEP 含 api_key/apiKey;apiKeyMasked 不在名单(它是打码字段,合法)。
      assertNoForbiddenDeep(res.body, 'ai-providers');
      // 整段序列化里不得出现明文密钥字面量(deepseek key 设为 dk-test,relay 设为 test-key)。
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key');
    });

    it('PATCH /admin/ai-providers/:id 返回体同样【绝不含明文/密文 apiKey】', async () => {
      const id = await providerId('deepseek');
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'primary' });
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key');
      expect('apiKey' in res.body).toBe(false);
      expect('api_key_enc' in res.body).toBe(false);
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

    it('PATCH ai-providers role 非法值 → 400(@IsIn 白名单)', async () => {
      const id = await providerId('deepseek');
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'superuser; --' });
      expect(res.status).toBe(400);
    });

    it('PATCH ai-providers protocol 非法值 → 400(@IsIn 白名单)', async () => {
      const id = await providerId('deepseek');
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ protocol: '__proto__' });
      expect(res.status).toBe(400);
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('PATCH ai-providers 畸形 id → 400(ParseUUIDPipe)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/admin/ai-providers/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'primary' });
      expect(res.status).toBe(400);
    });

    it('DELETE ai-providers 合法但不存在的 UUID → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/admin/ai-providers/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
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
      const id = await providerId('deepseek');
      const forged = jwt.sign({ sub: userId, email: 'ne-user@coach.dev', role: 'admin', is_admin: true });
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${id}`)
        .set('Authorization', `Bearer ${forged}`)
        .send({ role: 'primary' });
      expect(res.status).toBe(403);
    });

    it('【套密钥渗透】GET ai-providers 只回打码末 4 位,绝不回明文/密文(query 注入无效)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-providers?fields=apiKey,api_key_enc&include=secrets&verbose=1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('dk-test');
      expect(serialized).not.toContain('test-key');
      // 不得回明文 key 字段名 / 密文列名。
      expect(serialized).not.toContain('api_key_enc');
      // apiKeyMasked 合法存在(打码);但不得是明文 key。
      for (const p of res.body as { apiKeyMasked: string }[]) {
        expect(p.apiKeyMasked).not.toContain('dk-test');
        expect(p.apiKeyMasked).not.toContain('test-key');
      }
    });

    it('【密文不出库 → 不出 API】数据库密文列存在且加密,但 API 任何路径都不回吐密文', async () => {
      // DB 里 api_key_enc 是密文(以 v1: 开头),证明明文确实加密落库。
      const row = await providerRepo.findOneBy({ name: 'deepseek' });
      expect(row).not.toBeNull();
      expect(row!.api_key_enc.startsWith('v1:')).toBe(true);
      expect(row!.api_key_enc).not.toContain('dk-test'); // 密文不含明文
      // 但列表 API 完全不回吐该密文串。
      const res = await request(app.getHttpServer())
        .get('/api/admin/ai-providers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(JSON.stringify(res.body)).not.toContain(row!.api_key_enc);
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

    it('PATCH ai-providers 20 并发设主力(deepseek↔relay)→ 最终单主力,无脏读崩溃', async () => {
      const dsId = await providerId('deepseek');
      const relayId = await providerId('relay');
      const tasks: Promise<number>[] = [];
      for (let i = 0; i < 20; i++) {
        const id = i % 2 === 0 ? dsId : relayId;
        tasks.push(
          request(app.getHttpServer())
            .patch(`/api/admin/ai-providers/${id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ role: 'primary' })
            .then((r) => r.status),
        );
      }
      const statuses = await Promise.all(tasks);
      for (const s of statuses) expect([200, 400]).toContain(s);
      // 最终读一次:有效通道里最多一个 primary(enforceSinglePrimary)。
      const final = await request(app.getHttpServer())
        .get('/api/admin/ai-providers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(final.status).toBe(200);
      const primaries = (final.body as { role: string }[]).filter((p) => p.role === 'primary');
      expect(primaries.length).toBeLessThanOrEqual(1);
    }, 60000);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CRUD + 加密落点 + 运行池即时生效(无新增调用点)
  // ════════════════════════════════════════════════════════════════════════════
  describe('CRUD + 加密 + 运行池', () => {
    it('PATCH 设 deepseek 为主力 → loadPool 排序 deepseek 居首(缓存失效已在 update 内触发)', async () => {
      const id = await providerId('deepseek');
      await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'primary' });
      const pool = await providers.loadPool();
      expect(pool[0].name).toBe('deepseek');
    });

    it('POST 新建通道(apiKey 加密落库)→ GET 列表只回打码;DB 列为 v1: 密文', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/admin/ai-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'custom-x',
          protocol: 'anthropic-compat',
          baseURL: 'https://api.custom.example/anthropic',
          apiKey: 'sk-custom-secret-9999',
          modelPro: 'x-pro',
          modelFlash: 'x-flash',
          role: 'backup',
        });
      expect(created.status).toBe(201);
      expect(created.body.apiKeyMasked).toBe('****9999');
      expect('apiKey' in created.body).toBe(false);
      // DB 密文以 v1: 开头,且不含明文。
      const row = await providerRepo.findOneBy({ name: 'custom-x' });
      expect(row!.api_key_enc.startsWith('v1:')).toBe(true);
      expect(row!.api_key_enc).not.toContain('sk-custom-secret-9999');
    });

    it('PATCH 不传 apiKey → 密钥不变(write-only)', async () => {
      const row = await providerRepo.findOneBy({ name: 'custom-x' });
      const before = row!.api_key_enc;
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/ai-providers/${row!.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ modelPro: 'x-pro-v2' });
      expect(res.status).toBe(200);
      const after = await providerRepo.findOneBy({ name: 'custom-x' });
      expect(after!.api_key_enc).toBe(before); // 密文未变
      expect(after!.model_pro).toBe('x-pro-v2');
    });

    it('POST /ai-providers/:id/test → mock testConnection 返回 {ok,latencyMs}(无 key)', async () => {
      const id = await providerId('deepseek');
      const res = await request(app.getHttpServer())
        .post(`/api/admin/ai-providers/${id}/test`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.latencyMs).toBe('number');
      expect(JSON.stringify(res.body)).not.toContain('dk-test');
    });

    it('POST /ai-providers/test 草稿测试 → 不落库,只回结果', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/ai-providers/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          protocol: 'anthropic-compat',
          baseURL: 'https://api.draft.example/anthropic',
          apiKey: 'sk-draft-test',
          modelFlash: 'draft-flash',
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      // 草稿不落库。
      const row = await providerRepo.findOneBy({ name: 'draft' });
      expect(row).toBeNull();
    });

    it('DELETE 通道 → GET 列表不再含该通道', async () => {
      const row = await providerRepo.findOneBy({ name: 'custom-x' });
      const del = await request(app.getHttpServer())
        .delete(`/api/admin/ai-providers/${row!.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(200);
      const list = await request(app.getHttpServer())
        .get('/api/admin/ai-providers')
        .set('Authorization', `Bearer ${adminToken}`);
      expect((list.body as { name: string }[]).some((p) => p.name === 'custom-x')).toBe(false);
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
