import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { ValidationPipe } from '@nestjs/common';
import { request, loginUser } from './test-utils';

// ─── Deterministic AiService mock ────────────────────────────────────────────
//
// completeStructured dispatched by toolName:
//   - application_strategy → happy-path result
//   - application_strategy_company_names → result with specific company names in example_types
//   - application_strategy_insufficient → confidence: insufficient
//
// failMode: simulates AI outage

let failMode = false;
let mockMode: 'happy' | 'company_names' | 'insufficient' | 'evasion' | 'bad_counts' = 'happy';

const HAPPY_RESULT = {
  summary: '基于你的画像制定了分阶段投递策略，重点投递互联网中厂和外资咨询。',
  confidence: 'high',
  evidence_used: [
    { source: 'user_profile', content: '3年后端开发经验' },
    { source: 'user_profile', content: '目标行业：互联网' },
  ],
  recommendations: ['优先通过内推渠道投递', '先练保底，再攻核心目标'],
  risks: ['秋招竞争激烈，建议提前准备笔试'],
  next_actions: ['完善简历', '联系校友寻求内推'],
  follow_up_questions: [],
  cannot_determine: [],
  target_company_tiers: [
    {
      tier: 'stretch',
      description: '头部大厂，竞争激烈',
      rationale: '匹配度约60%，有挑战',
      example_types: ['大型互联网平台公司（DAU千万级）', '顶级外资科技公司'],
      priority: 3,
    },
    {
      tier: 'target',
      description: '中型互联网公司',
      rationale: '匹配度约75%，最佳投递目标',
      example_types: ['中型互联网公司（B轮及以上）', '国内上市科技公司'],
      priority: 1,
    },
    {
      tier: 'safety',
      description: '传统行业数字化团队',
      rationale: '匹配度约85%，稳健保底',
      example_types: ['金融行业科技子公司', '传统制造业数字化部门'],
      priority: 2,
    },
  ],
  application_sequence: [
    {
      week: '第1-2周',
      focus: '简历优化+内推渠道激活',
      target_count: 5,
      channels: ['内推', 'BOSS直聘'],
    },
    {
      week: '第3-4周',
      focus: '核心目标批量投递',
      target_count: 20,
      channels: ['BOSS直聘', '猎聘', '内推'],
    },
  ],
  daily_action_plan: [
    { action: '刷题1-2道', time_estimate: '1小时', priority: 'high' },
    { action: '投递3-5家目标公司', time_estimate: '30分钟', priority: 'high' },
    { action: '更新求职进度表', time_estimate: '15分钟', priority: 'medium' },
  ],
  risk_assessment: {
    main_risks: ['秋招时间窗口紧张', '笔试准备不足'],
    mitigation: ['提前1个月开始刷题', '先投保底公司练手'],
  },
};

// AI 返回具体公司名（应被 guard 剔除/泛化）
const COMPANY_NAMES_RESULT = {
  ...HAPPY_RESULT,
  target_company_tiers: [
    {
      tier: 'target',
      description: '互联网大厂',
      rationale: '高匹配',
      // 包含：纯品牌短词、带括号的品牌+注册后缀、含注册后缀的品牌、以及合法描述词
      example_types: [
        '腾讯',                          // 纯品牌短词 ≤6字 → 剔除
        '阿里巴巴',                       // 纯品牌 ≤6字 → 剔除
        '字节跳动',                       // 纯品牌 ≤6字 → 剔除
        '阿里巴巴（集团）',               // 括号前是品牌名 → 剔除
        '腾讯科技有限公司',               // 含注册后缀无描述词 → 剔除
        '中型互联网公司（B轮及以上）',    // 含描述词 → 保留
        '大型互联网平台公司（DAU千万级）', // 含描述词 → 保留
      ],
      priority: 1,
    },
  ],
};

// AI 用"品牌名+描述词"句式试图绕过黑名单（修复 #38：反转 guard 后仍应被剔除）
const EVASION_RESULT = {
  ...HAPPY_RESULT,
  confidence: 'high',
  target_company_tiers: [
    {
      tier: 'target',
      description: '互联网大厂',
      rationale: '高匹配',
      example_types: [
        '头部互联网平台如腾讯',        // 描述词包裹具体品牌 → 仍剔除
        '知名科技公司字节跳动',        // 描述词包裹具体品牌 → 仍剔除
        '大型外资咨询公司麦肯锡',      // 描述词包裹具体品牌 → 仍剔除
        '中型互联网公司（B轮及以上）', // 纯类别描述 → 保留
      ],
      priority: 1,
    },
  ],
};

// AI 返回非法/超上限的 target_count（应 clamp 到 1-15 或省略该周）
const BAD_COUNTS_RESULT = {
  ...HAPPY_RESULT,
  application_sequence: [
    { week: '第1周', focus: '超上限', target_count: 50, channels: ['内推'] },       // 50 → clamp 15
    { week: '第2周', focus: '缺失', target_count: undefined, channels: ['BOSS直聘'] }, // 缺失 → 省略该周
    { week: '第3周', focus: '负数', target_count: -3, channels: ['猎聘'] },          // 非法 → 省略该周
    { week: '第4周', focus: '正常', target_count: 5, channels: ['内推'] },          // 合法 → 保留 5
  ],
};

// confidence: insufficient 结果
const INSUFFICIENT_RESULT = {
  summary: '用户画像信息不足，无法生成个性化投递策略。',
  confidence: 'insufficient',
  evidence_used: [],
  recommendations: [],
  risks: [],
  next_actions: ['请提供更多个人背景信息'],
  follow_up_questions: ['请描述你的教育背景和工作经验', '你的目标行业和岗位是什么？'],
  cannot_determine: ['缺乏足够的用户画像信息'],
  target_company_tiers: [],
  application_sequence: [],
  daily_action_plan: [],
  risk_assessment: { main_risks: [], mitigation: [] },
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (failMode) {
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }
    if (toolName === 'application_strategy') {
      if (mockMode === 'company_names') return Promise.resolve(COMPANY_NAMES_RESULT);
      if (mockMode === 'insufficient') return Promise.resolve(INSUFFICIENT_RESULT);
      if (mockMode === 'evasion') return Promise.resolve(EVASION_RESULT);
      if (mockMode === 'bad_counts') return Promise.resolve(BAD_COUNTS_RESULT);
      return Promise.resolve(HAPPY_RESULT);
    }
    return Promise.resolve({});
  }),
};

// ─── Test setup ───────────────────────────────────────────────────────────────

describe('Application Strategy (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.JWT_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'strategy1@coach.dev', 'Strategy User');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    failMode = false;
    mockMode = 'happy';
  });

  // ─── POST /api/applications/strategy ─────────────────────────────────────

  describe('POST /api/applications/strategy', () => {
    it('valid user_profile → 201 + strategy result with all required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          user_profile: '3年后端开发经验，熟悉Java/Python，目标行业互联网，应届生',
          application_timeline: '秋招，截止11月底',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('target_company_tiers');
      expect(res.body).toHaveProperty('application_sequence');
      expect(res.body).toHaveProperty('daily_action_plan');
      expect(res.body).toHaveProperty('risk_assessment');
      expect(Array.isArray(res.body.target_company_tiers)).toBe(true);
    });

    it('missing user_profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ application_timeline: '秋招' });

      expect(res.status).toBe(400);
    });

    it('empty user_profile string → 400 (service guard)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '   ' });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .send({ user_profile: '3年后端开发经验' });

      expect(res.status).toBe(401);
    });

    it('AI returns insufficient confidence → result has empty tiers/sequence/plan', async () => {
      mockMode = 'insufficient';

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '随便' });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.target_company_tiers).toHaveLength(0);
      expect(res.body.application_sequence).toHaveLength(0);
      expect(res.body.daily_action_plan).toHaveLength(0);
    });

    it('AI outage → 503', async () => {
      failMode = true;

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '3年后端开发经验' });

      expect(res.status).toBe(503);
    });
  });

  // ─── Anti-fabrication guard: company names stripped (#38 regression) ────────

  describe('Anti-fabrication guard', () => {
    it('AI returns specific company names in example_types → guard strips them', async () => {
      mockMode = 'company_names';

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '3年后端开发经验' });

      expect(res.status).toBe(201);

      const tiers: Array<{ example_types: string[] }> = res.body.target_company_tiers;
      const allExamples = tiers.flatMap((t) => t.example_types);

      // Pure brand short-words → stripped
      expect(allExamples).not.toContain('腾讯');
      expect(allExamples).not.toContain('阿里巴巴');
      expect(allExamples).not.toContain('字节跳动');

      // Parenthesised brand+suffix → stripped (fix #38: brackets alone no longer exempt)
      expect(allExamples).not.toContain('阿里巴巴（集团）');

      // Brand with registration suffix, no type qualifier → stripped (fix #38)
      expect(allExamples).not.toContain('腾讯科技有限公司');

      // Descriptive entries with type qualifiers → preserved
      expect(allExamples).toContain('中型互联网公司（B轮及以上）');
      expect(allExamples).toContain('大型互联网平台公司（DAU千万级）');
    });

    it('confidence insufficient → target_company_tiers always empty (no fabricated companies)', async () => {
      mockMode = 'insufficient';

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '资料不完整' });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.target_company_tiers).toHaveLength(0);
    });

    it('#38 "描述词+品牌名"绕过句式 → 仍被剔除，且 confidence 降级', async () => {
      mockMode = 'evasion';

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '3年后端开发经验' });

      expect(res.status).toBe(201);

      const tiers: Array<{ example_types: string[] }> = res.body.target_company_tiers;
      const allExamples = tiers.flatMap((t) => t.example_types);

      // 品牌锚词无论是否包裹描述词，一律剔除
      expect(allExamples).not.toContain('头部互联网平台如腾讯');
      expect(allExamples).not.toContain('知名科技公司字节跳动');
      expect(allExamples).not.toContain('大型外资咨询公司麦肯锡');
      // 没有任何残留含品牌锚词的条目
      for (const e of allExamples) {
        expect(/腾讯|字节跳动|麦肯锡/.test(e)).toBe(false);
      }
      // 纯类别描述保留
      expect(allExamples).toContain('中型互联网公司（B轮及以上）');
      // 检出具体公司 → confidence 从 high 降级
      expect(res.body.confidence).not.toBe('high');
    });
  });

  // ─── target_count clamp / drop guard ──────────────────────────────────────

  describe('target_count guard', () => {
    it('target_count=50 → clamp 到 15；缺失/负数 → 省略该周并记入 cannot_determine', async () => {
      mockMode = 'bad_counts';

      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: '3年后端开发经验' });

      expect(res.status).toBe(201);

      const seq: Array<{ week: string; target_count: number }> = res.body.application_sequence;
      // 缺失(第2周)与负数(第3周)被省略，仅保留第1周(clamp)与第4周(合法)
      expect(seq).toHaveLength(2);
      const byWeek = Object.fromEntries(seq.map((w) => [w.week, w.target_count]));
      expect(byWeek['第1周']).toBe(15); // 50 clamp 到上限 15
      expect(byWeek['第4周']).toBe(5);  // 合法值原样保留
      expect(byWeek['第2周']).toBeUndefined();
      expect(byWeek['第3周']).toBeUndefined();

      // 所有保留项的 target_count 都在 1-15 区间
      for (const w of seq) {
        expect(w.target_count).toBeGreaterThanOrEqual(1);
        expect(w.target_count).toBeLessThanOrEqual(15);
      }

      // 被省略的周记入 cannot_determine（不杜撰默认值）
      const cd: string[] = res.body.cannot_determine;
      expect(cd.some((c) => c.includes('第2周'))).toBe(true);
      expect(cd.some((c) => c.includes('第3周'))).toBe(true);
    });
  });

  // ─── DTO validation (#39 #40 regression) ──────────────────────────────────

  describe('DTO validation', () => {
    it('#40 user_profile >8000 chars → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: 'A'.repeat(8001) });

      expect(res.status).toBe(400);
    });

    it('#40 user_profile exactly 8000 chars → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_profile: 'A'.repeat(8000) });

      // AiService is mocked so will return happy result
      expect(res.status).toBe(201);
    });

    it('#39 current_applications with non-string element → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          user_profile: '3年后端开发经验',
          current_applications: ['合法公司', 123, true],
        });

      expect(res.status).toBe(400);
    });

    it('#39 current_applications with >100 items → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          user_profile: '3年后端开发经验',
          current_applications: Array.from({ length: 101 }, (_, i) => `公司${i}`),
        });

      expect(res.status).toBe(400);
    });

    it('#39 current_applications with 100 string items → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          user_profile: '3年后端开发经验',
          current_applications: Array.from({ length: 100 }, (_, i) => `公司${i}`),
        });

      expect(res.status).toBe(201);
    });

    it('current_applications 单项 >200 字 → 400 (per-item MaxLength)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications/strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          user_profile: '3年后端开发经验',
          current_applications: ['合法公司', 'A'.repeat(201)],
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── Existing applications CRUD still works ───────────────────────────────

  describe('Existing applications CRUD unaffected', () => {
    it('POST /api/applications → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '测试公司', role: '后端工程师' });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe('测试公司');
    });

    it('GET /api/applications/stats → 200 with all stage keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('wishlist');
      expect(res.body).toHaveProperty('applied');
    });
  });
});

// ─── AI live test (gated by RUN_AI_LIVE=1) ───────────────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Application Strategy (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    // 用 .env 中的真实 CLOUDDREAM_API_KEY / JWT_SECRET 真跑 AI
    // (此前误用 dummy 'live-key-required' 覆盖真实 key,导致主通道恒 401,并非真正的 live 测试)

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'strategy-live@coach.dev', 'Live Strategy User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI call → valid strategy with tiers and no specific company names', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/applications/strategy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        user_profile:
          '应届生，计算机科学本科，有2段后端实习，熟悉Java和Spring，目标是秋招互联网后端岗位，期望城市北京/上海',
        application_timeline: '秋招，9月到11月',
      });

    expect(res.status).toBe(201);
    expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    expect(Array.isArray(res.body.target_company_tiers)).toBe(true);

    // Guard verification: no specific company names in example_types
    const allExamples = (res.body.target_company_tiers as Array<{ example_types: string[] }>)
      .flatMap((t) => t.example_types);
    const KNOWN_COMPANIES = ['腾讯', '阿里巴巴', '字节跳动', '美团', '百度', '京东', '华为', '小米'];
    for (const company of KNOWN_COMPANIES) {
      expect(allExamples).not.toContain(company);
    }
  }, 120000);
});
