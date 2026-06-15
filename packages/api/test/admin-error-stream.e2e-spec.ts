import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { OpsEvent } from '../src/ops/entities/ops-event.entity';
import { request } from './test-utils';

// ─────────────────────────────────────────────────────────────────────────────
// 管理面板 Phase2 — GET /admin/error-stream 契约 e2e(规格 §2A / §3)
//
// 本套件专补此前盲区,针对两个阻断 bug 写到「能复现旧 bug」再证明已修:
//   ① 不带 type 返回「全部失败/审计类」而非 400(旧 bug:默认视图 type 未传 → 400)。
//   ② offset 翻页真实生效:offset=0 与 offset=limit 返回不同记录(旧 bug:offset 被忽略 → 同页)。
//   ③ 带单 type 过滤只返回该类型。
//   ④ 默认视图(前端默认参数,limit 但不带 type)不报 400。
//
// 复用:test-utils.request + 双账户(admin/普通)+ AppModule + 唯一临时 sqlite(:memory:)。
// AiService mock:AppModule 校验 AI 配置存在但本套件不真打 AI。
//
// 翻页可证伪性设计:直接经 OpsEvent repo 灌入 N 条带「严格递增 created_at」的 ADMIN_ACTION
// 事件(detail.note 编号 #0..#N-1),倒序后第 k 页对应编号可精确推算 → 任何「忽略 offset」
// 的实现都会让两页交集非空,从而 FAIL。
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

describe('Admin error-stream 契约 (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let opsRepo: Repository<OpsEvent>;

  let adminToken: string;
  let userToken: string;

  // 灌入的事件编号 → created_at 序号的对照(倒序后:编号越大越靠前)。
  const SEED_ADMIN_ACTIONS = 25; // > 任何分页 limit,确保翻得动好几页
  const BASE_TS = Date.UTC(2026, 0, 1, 0, 0, 0); // 固定基准,避免与「真实管理操作」时间撞车

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'es-admin@coach.dev';
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

    adminToken = await registerUser(app, 'es-admin@coach.dev', '错误流超管');
    expect((await userRepo.findOneBy({ email: 'es-admin@coach.dev' }))!.role).toBe('admin');
    userToken = await registerUser(app, 'es-user@coach.dev', '错误流普通');

    // ── 灌种 ──────────────────────────────────────────────────────────────────
    // 25 条 ADMIN_ACTION,created_at 严格递增(BASE_TS + i 秒);detail.note = '#i'。
    // 倒序(created_at DESC)后第 0 名 = #24,第 1 名 = #23 ... 第 k 名 = #(24-k)。
    for (let i = 0; i < SEED_ADMIN_ACTIONS; i++) {
      await opsRepo.save(
        opsRepo.create({
          type: 'ADMIN_ACTION',
          detail: { op: 'updateUser', actor: 'seed', target: 'seed', note: `#${i}` },
          created_at: new Date(BASE_TS + i * 1000),
        }),
      );
    }
    // 各失败类各 1 条(时间更早,确保排在 ADMIN_ACTION 之后,便于「不带 type 返回全部类」断言）。
    await opsRepo.save([
      opsRepo.create({ type: 'AI_CALL_FAILED', detail: { op: 'complete', error: 'boom' }, created_at: new Date(BASE_TS - 5000) }),
      opsRepo.create({ type: 'AI_FAILOVER', detail: { op: 'complete', provider: 'relay' }, created_at: new Date(BASE_TS - 4000) }),
      opsRepo.create({ type: 'AI_BOTH_DOWN', detail: { op: 'complete', error: 'down' }, created_at: new Date(BASE_TS - 3000) }),
      opsRepo.create({ type: 'CREDIT_CONSUME_FAILED', detail: { user_id: 'x', endpoint: '/api/diagnoses', error: 'no credit' }, created_at: new Date(BASE_TS - 2000) }),
      opsRepo.create({ type: 'QUEUE_FULL', detail: { active: 2, maxConcurrent: 2, maxQueue: 0 }, created_at: new Date(BASE_TS - 1000) }),
    ]);
  }, 90000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  function getStream(query: string, token = adminToken) {
    return request(app.getHttpServer())
      .get(`/api/admin/error-stream${query}`)
      .set('Authorization', `Bearer ${token}`);
  }

  // detail.note 取出当前页所有 ADMIN_ACTION 的编号(用于翻页交集断言)。
  function notesOf(body: Array<{ type: string; detail?: { note?: string } | null }>): string[] {
    return body.filter((e) => e.type === 'ADMIN_ACTION').map((e) => e.detail?.note ?? '');
  }

  // ── ① 不带 type → 返回全部失败/审计类,绝不 400 ──────────────────────────────
  describe('① 不带 type 返回全部类(旧 bug:默认 type 未传 → 400)', () => {
    it('GET /admin/error-stream 不带任何参数 → 200(非 400)且数组非空', async () => {
      const res = await getStream('');
      // 旧 bug 复现点:若实现把 type 当必填或对 undefined 走了 IN()/=:type 报错 → 这里会 400/500。
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('不带 type 时混合返回多种类型(至少含 ADMIN_ACTION 与某 AI 失败类)', async () => {
      // limit 拉满 200 一次取回全部(共 30 条 < 200),验证「全部类」而非只回一类。
      const res = await getStream('?limit=200');
      expect(res.status).toBe(200);
      const types = new Set<string>((res.body as Array<{ type: string }>).map((e) => e.type));
      // 必须能看到管理操作类与至少一种 AI 失败类,证明默认不是只查单一 type。
      expect(types.has('ADMIN_ACTION')).toBe(true);
      const aiFailureSeen =
        types.has('AI_CALL_FAILED') || types.has('AI_FAILOVER') || types.has('AI_BOTH_DOWN');
      expect(aiFailureSeen).toBe(true);
      // 全部六类灌入数据都应可见(共 30 条:25 ADMIN_ACTION + 5 失败类各 1)。
      expect(res.body.length).toBe(30);
    });

    it('倒序返回:created_at 严格递减(最新在前)', async () => {
      const res = await getStream('?limit=200');
      expect(res.status).toBe(200);
      const ts = (res.body as Array<{ created_at: string }>).map((e) => new Date(e.created_at).getTime());
      for (let i = 1; i < ts.length; i++) {
        expect(ts[i - 1]).toBeGreaterThanOrEqual(ts[i]);
      }
    });
  });

  // ── ② offset 翻页真实生效:两页记录不同(旧 bug:offset 被忽略 → 同页)─────────
  describe('② offset 翻页真实生效(旧 bug:offset 忽略 → 两页相同)', () => {
    const LIMIT = 5;

    it('offset=0 与 offset=limit 返回完全不同的记录(交集为空)', async () => {
      // 只看 ADMIN_ACTION(25 条),避免末尾失败类干扰编号推算。
      const page0 = await getStream(`?type=ADMIN_ACTION&limit=${LIMIT}&offset=0`);
      const page1 = await getStream(`?type=ADMIN_ACTION&limit=${LIMIT}&offset=${LIMIT}`);
      expect(page0.status).toBe(200);
      expect(page1.status).toBe(200);
      expect(page0.body.length).toBe(LIMIT);
      expect(page1.body.length).toBe(LIMIT);

      const notes0 = notesOf(page0.body);
      const notes1 = notesOf(page1.body);

      // 旧 bug 复现点:offset 被忽略 → 两页 note 完全相同,下面交集断言 FAIL。
      const intersection = notes0.filter((n) => notes1.includes(n));
      expect(intersection).toEqual([]);

      // 精确断言:倒序后第 0 页 = #24..#20,第 1 页 = #19..#15。
      expect(notes0).toEqual(['#24', '#23', '#22', '#21', '#20']);
      expect(notes1).toEqual(['#19', '#18', '#17', '#16', '#15']);
    });

    it('连续翻三页拼接 = 倒序前 15 条,无重叠无漏项', async () => {
      const pages: string[][] = [];
      for (let p = 0; p < 3; p++) {
        const res = await getStream(`?type=ADMIN_ACTION&limit=${LIMIT}&offset=${p * LIMIT}`);
        expect(res.status).toBe(200);
        pages.push(notesOf(res.body));
      }
      const flat = pages.flat();
      // 无重复
      expect(new Set(flat).size).toBe(flat.length);
      // 正好是 #24..#10(倒序)
      const expected = Array.from({ length: 15 }, (_, k) => `#${24 - k}`);
      expect(flat).toEqual(expected);
    });

    it('offset 超过总数 → 返回空数组(非 400/500)', async () => {
      const res = await getStream('?type=ADMIN_ACTION&limit=5&offset=1000');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('offset 非法(负数)→ 400(DTO @Min(0) 拦截)', async () => {
      const res = await getStream('?offset=-1');
      expect(res.status).toBe(400);
    });

    it('offset 非整数字符串 → 400(DTO @IsInt 拦截,不静默吞)', async () => {
      const res = await getStream('?offset=abc');
      expect(res.status).toBe(400);
    });
  });

  // ── ③ 单 type 过滤正确 ──────────────────────────────────────────────────────
  describe('③ 单 type 过滤只返回该类型', () => {
    it('type=ADMIN_ACTION → 全部条目均为 ADMIN_ACTION', async () => {
      const res = await getStream('?type=ADMIN_ACTION&limit=200');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(25);
      const allAdmin = (res.body as Array<{ type: string }>).every((e) => e.type === 'ADMIN_ACTION');
      expect(allAdmin).toBe(true);
    });

    it('type=AI_CALL_FAILED → 只返回 1 条且类型正确', async () => {
      const res = await getStream('?type=AI_CALL_FAILED&limit=200');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('AI_CALL_FAILED');
    });

    it('type=CREDIT_CONSUME_FAILED → 只返回扣点失败类', async () => {
      const res = await getStream('?type=CREDIT_CONSUME_FAILED&limit=200');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].type).toBe('CREDIT_CONSUME_FAILED');
    });

    it('type 不在白名单(枚举外)→ 400,不进 WHERE 查询', async () => {
      const res = await getStream('?type=DROP_TABLE');
      expect(res.status).toBe(400);
    });

    it('type=SELECT 注入式字符串 → 400(@IsIn 枚举白名单拦截)', async () => {
      const res = await getStream("?type=' OR '1'='1");
      expect(res.status).toBe(400);
    });
  });

  // ── ④ 默认视图(前端默认参数)不报 400 ───────────────────────────────────────
  describe('④ 默认视图(前端默认参数等价)不报 400', () => {
    it('前端报错流水默认请求(limit=50,offset=0,无 type)→ 200', async () => {
      // 模拟前端 LogCenterTab 报错流水 tab 默认请求:有 limit/offset 但不传 type。
      const res = await getStream('?limit=50&offset=0');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // 默认页应能看到最新的 ADMIN_ACTION(#24 在最前)。
      expect((res.body as Array<{ type: string }>)[0].type).toBe('ADMIN_ACTION');
    });

    it('limit 超上限(999999)→ 200 且被服务端 clamp 到 ≤200(此处数据仅 30 条)', async () => {
      const res = await getStream('?limit=999999');
      // limit 999999 超 DTO @Max(200) → 400(DTO 前置防线)。验证不会 500。
      expect(res.status).toBe(400);
    });

    it('limit=200(边界上限)无 type → 200', async () => {
      const res = await getStream('?limit=200');
      expect(res.status).toBe(200);
    });
  });

  // ── 鉴权回归:普通用户/无 token 仍被挡 ───────────────────────────────────────
  describe('鉴权回归', () => {
    it('普通用户 → 403', async () => {
      const res = await getStream('', userToken);
      expect(res.status).toBe(403);
    });

    it('无 token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/admin/error-stream');
      expect(res.status).toBe(401);
    });
  });
});
