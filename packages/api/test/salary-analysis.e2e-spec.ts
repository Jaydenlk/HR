import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { request, loginUser, uniqueMemoryDb } from './test-utils';

// ─── Deterministic AiService mock ────────────────────────────────────────────
//
// completeStructured dispatched by toolName:
//   - salary_analysis → normal happy-path output (all four elements present)
//   - salary_analysis_missing_source → missing data_sources (grade forced to C)
//
// failMode: set to true to simulate AI outage (503)

let failMode = false;

const HAPPY_RESULT = {
  summary:
    '北京后端工程师薪资区间（历史知识库数据，非实时，仅供参考）：P25 约 22k，P50 约 27k，P75 约 31k/月。',
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
  breakdown: {
    base_monthly: 27000,
    months_per_year: 13,
    annual_bonus: '2-4个月月薪',
    equity: '视公司而定，建议核实',
    social_insurance: '约基本工资的 30%',
  },
  data_sources: [
    { source_name: 'BOSS直聘', grade: 'B', date: '2025-01' },
    { source_name: '猎聘薪资报告', grade: 'B', date: '2025-03' },
  ],
  comparison: [
    { dimension: '北京后端工程师市场中位数', value: '约27k/月', grade: 'B' },
  ],
  recommendations: ['可参考猎聘、脉脉等平台验证具体公司薪资'],
  risks: ['历史数据可能与当前市场存在偏差，建议结合实时招聘数据验证'],
  next_actions: ['在 BOSS直聘搜索目标岗位验证薪资范围'],
  follow_up_questions: [],
  cannot_determine: [],
  data_freshness: 'stale',
};

// 完全无来源：AI 仍吐出精确分位数 → 服务端必须置空 range 并标 insufficient（防编造红线）
const NO_SOURCE_RESULT = {
  ...HAPPY_RESULT,
  salary_range: {
    ...HAPPY_RESULT.salary_range,
    grade: 'A', // AI 谎称 A 级；但 data_sources 为空，服务端绝不能采信任何数字
  },
  data_sources: [], // 完全无来源 → salary_range 必须被 guard 置为 null
};

// #42: 带真实可溯源 URL 的来源(B 级)。用于让 #42 的单位用例聚焦"单位"维度,
// 不被 #43 的"无 URL 降级"副作用干扰(否则区间会先被来源逻辑影响)。
const SOURCED = [
  { source_name: 'BOSS直聘', grade: 'B', url: 'https://www.zhipin.com/report', date: '2025-01' },
];

// #42: unit 缺失 + p50 量级明显是年薪(>=10万) → 服务端推断 annual_rmb,绝不静默标月薪。
const ANNUAL_NO_UNIT_RESULT = {
  ...HAPPY_RESULT,
  salary_range: {
    p25: 280000,
    p50: 350000,
    p75: 450000,
    // unit 故意缺失
    year: '2025',
    city: '北京',
    role: '后端工程师',
    grade: 'B',
    freshness: 'stale',
  },
  data_sources: SOURCED,
};

// #42: unit 缺失 + p50 量级模糊(<10万,既可能是月薪也可能是低年薪) → 不臆测单位,置空区间。
const AMBIGUOUS_NO_UNIT_RESULT = {
  ...HAPPY_RESULT,
  salary_range: {
    p25: 22000,
    p50: 27000,
    p75: 31000,
    // unit 故意缺失,27000 既像月薪也像(很低的)年薪 → 不可静默假定 monthly
    year: '2025',
    city: '北京',
    role: '后端工程师',
    grade: 'B',
    freshness: 'stale',
  },
  data_sources: SOURCED,
};

// #42: unit 为非法字符串 + 量级模糊 → 同样不臆测,置空区间。
const ILLEGAL_UNIT_RESULT = {
  ...HAPPY_RESULT,
  salary_range: {
    p25: 22000,
    p50: 27000,
    p75: 31000,
    unit: 'rmb_per_hour', // 非法枚举
    year: '2025',
    city: '北京',
    role: '后端工程师',
    grade: 'B',
    freshness: 'stale',
  },
  data_sources: SOURCED,
};

// #43: 来源自报 A/B 级却无 URL → 服务端去信任化降级为 C;且不得据此把区间标为 fresh/高置信。
const FAKE_HIGH_GRADE_RESULT = {
  ...HAPPY_RESULT,
  confidence: 'high', // AI 自报高置信
  salary_range: {
    ...HAPPY_RESULT.salary_range,
    freshness: 'fresh', // AI 自报 fresh
    grade: 'A',
  },
  data_sources: [
    { source_name: '某权威报告', grade: 'A' }, // A 级但无 url → 降 C
    { source_name: '某招聘平台', grade: 'B', url: 'not-a-url' }, // B 级但 url 非法 → 降 C
  ],
};

// #43: 来源带真实域名 URL → A/B 级保留;区间可标 fresh/正常置信。
const REAL_URL_SOURCE_RESULT = {
  ...HAPPY_RESULT,
  confidence: 'medium',
  salary_range: {
    ...HAPPY_RESULT.salary_range,
    freshness: 'fresh',
    grade: 'A',
  },
  data_sources: [
    { source_name: 'BOSS直聘年报', grade: 'A', url: 'https://www.zhipin.com/report/2025' },
  ],
};

function makeMock(result: unknown) {
  return {
    complete: jest.fn().mockResolvedValue('mock'),
    completeStructured: jest.fn().mockResolvedValue(result),
  };
}

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (failMode) {
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }
    if (toolName === 'salary_analysis') {
      return Promise.resolve(HAPPY_RESULT);
    }
    return Promise.resolve({});
  }),
};

const mockAiServiceNoSource = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(() => {
    return Promise.resolve(NO_SOURCE_RESULT);
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Salary Analysis (e2e, mocked AI)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    // 每个 app 用独立 DB 文件:避免兄弟 describe 的 app.close() 关掉共享内存连接,
    // 进而让本 app 后续(经 JwtStrategy 每请求查库的)认证请求报「connection is not open」。
    process.env.DB_PATH = uniqueMemoryDb();
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'salary-analysis@coach.dev', 'Salary Analysis User');
  }, 30000);

  afterAll(async () => {
    await app.close();
    failMode = false;
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/salary/analyze without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .send({ role: '后端工程师', city: '北京' });
      expect(res.status).toBe(401);
    });
  });

  // ─── Input validation ────────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ city: '北京' });
      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Anti-fabrication guard: missing city → insufficient ─────────────────────

  describe('Anti-fabrication: missing city → insufficient (no range)', () => {
    it('role provided but no city → 201 with confidence=insufficient and salary_range=null', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师' });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.salary_range).toBeNull();
      // Must provide follow-up question about city
      expect(res.body.follow_up_questions).toEqual(
        expect.arrayContaining([expect.stringContaining('城市')]),
      );
    });
  });

  // ─── Happy path ──────────────────────────────────────────────────────────────

  describe('Happy path', () => {
    it('valid role+city → 201 with analysis result', async () => {
      failMode = false;
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('salary_range');
      expect(res.body).toHaveProperty('data_sources');
      expect(res.body).toHaveProperty('comparison');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('data_freshness');
    });

    it('valid role+city → salary_range has required fields', async () => {
      failMode = false;
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      if (res.body.salary_range !== null) {
        expect(res.body.salary_range).toHaveProperty('p25');
        expect(res.body.salary_range).toHaveProperty('p50');
        expect(res.body.salary_range).toHaveProperty('p75');
        expect(res.body.salary_range).toHaveProperty('grade');
        expect(['A', 'B', 'C', 'D']).toContain(res.body.salary_range.grade);
      }
    });
  });

  // ─── Anti-fabrication guard: four-factor rule ────────────────────────────────

  describe('Anti-fabrication: four-factor grade guard', () => {
    let appNoSource: INestApplication;
    let tokenNoSource: string;

    beforeAll(async () => {
      // 独立 DB 文件:本 app 的 afterAll close 不会波及外层主 app 的连接。
      process.env.DB_PATH = uniqueMemoryDb();
      const moduleRef2 = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockAiServiceNoSource)
        .compile();

      appNoSource = moduleRef2.createNestApplication();
      appNoSource.setGlobalPrefix('api');
      appNoSource.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appNoSource.init();

      tokenNoSource = await loginUser(
        appNoSource,
        'salary-analysis-nosource@coach.dev',
        'No Source User',
      );
    }, 30000);

    afterAll(async () => {
      await appNoSource.close();
    });

    it('AI 吐出精确分位数但 data_sources 为空 → 服务端置空 salary_range + confidence=insufficient（P0 防编造回归）', async () => {
      const res = await request(appNoSource.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${tokenNoSource}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      // 完全无来源时,绝不返回任何编造的 p25/p50/p75
      expect(res.body.salary_range).toBeNull();
      expect(res.body.confidence).toBe('insufficient');
    });

    it('AI returns no sources → confidence must not exceed low', async () => {
      const res = await request(appNoSource.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${tokenNoSource}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      // No real source (A/B grade) means confidence ≤ low
      expect(['low', 'insufficient']).toContain(res.body.confidence);
    });
  });

  // ─── AI outage → 503 ────────────────────────────────────────────────────────
  // 用本块专属 app(注入永远 reject 的 AiService)而非复用主 app:
  // 同进程内先后 init 多个 AppModule 会让 TypeORM 默认连接被后建 app 接管/关闭,
  // 主 app 的连接在跑到此处时已失效,经 JwtStrategy 每请求查库会报 connection is not open。
  // 各块自带 app 即各自持有当前活连接,互不影响。
  describe('AI outage', () => {
    let appOutage: INestApplication;
    let tokenOutage: string;

    beforeAll(async () => {
      process.env.DB_PATH = uniqueMemoryDb();
      const mockOutage = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest
          .fn()
          .mockRejectedValue(
            new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
          ),
      };

      const moduleRefOutage = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockOutage)
        .compile();

      appOutage = moduleRefOutage.createNestApplication();
      appOutage.setGlobalPrefix('api');
      appOutage.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appOutage.init();

      tokenOutage = await loginUser(appOutage, 'salary-outage@coach.dev', 'Outage User');
    }, 30000);

    it('AI service fails → 503', async () => {
      const res = await request(appOutage.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${tokenOutage}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(503);
    });
  });
});

// ─── #42: salary_range.unit 缺失/非法的单位收口（防 12x 误标）────────────────────

async function bootApp(result: unknown, email: string): Promise<{
  app: INestApplication;
  token: string;
}> {
  // 每次 boot 独立 DB 文件:这些用例各自 app.close(),互不影响,也不影响其它 describe。
  process.env.DB_PATH = uniqueMemoryDb();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiService)
    .useValue(makeMock(result))
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const token = await loginUser(app, email, email);
  return { app, token };
}

describe('Anti-misclassification: salary_range.unit guard (#42)', () => {
  it('unit 缺失 + p50 量级明显年薪 → 推断 annual_rmb，不静默标 monthly', async () => {
    const { app, token } = await bootApp(ANNUAL_NO_UNIT_RESULT, 'salary-annual@coach.dev');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      expect(res.body.salary_range).not.toBeNull();
      // 35 万量级被推断为年薪，而非误标月薪
      expect(res.body.salary_range.unit).toBe('annual_rmb');
      // 绝不静默标成 monthly_rmb（那会被前端当成 35 万/月 = 420 万/年）
      expect(res.body.salary_range.unit).not.toBe('monthly_rmb');
    } finally {
      await app.close();
    }
  }, 30000);

  it('unit 缺失 + p50 量级模糊（2.7万）→ 不臆测单位，置空区间', async () => {
    const { app, token } = await bootApp(AMBIGUOUS_NO_UNIT_RESULT, 'salary-ambig@coach.dev');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      // 单位不可判定时不臆测 monthly，置空区间
      expect(res.body.salary_range).toBeNull();
      // 不得维持 high/medium 高置信
      expect(['low', 'insufficient']).toContain(res.body.confidence);
    } finally {
      await app.close();
    }
  }, 30000);

  it('unit 为非法枚举 + 量级模糊 → 等同缺失，置空区间', async () => {
    const { app, token } = await bootApp(ILLEGAL_UNIT_RESULT, 'salary-illegalunit@coach.dev');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      expect(res.body.salary_range).toBeNull();
    } finally {
      await app.close();
    }
  }, 30000);
});

// ─── #43: data_sources 来源等级去信任化（A/B 无真实 URL → 降 C）──────────────────

describe('Anti-fabrication: data_source grade requires real URL (#43)', () => {
  it('A/B 级来源无 URL/伪 URL → 降级为 C，且区间不得标 fresh/高置信', async () => {
    const { app, token } = await bootApp(FAKE_HIGH_GRADE_RESULT, 'salary-fakegrade@coach.dev');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      const sources: Array<{ grade: string }> = res.body.data_sources ?? [];
      expect(sources.length).toBeGreaterThan(0);
      // 自报 A/B 但无真实 URL 的来源全部降为 C
      for (const s of sources) {
        expect(s.grade).toBe('C');
      }
      // 无真实来源 → 区间不得标 fresh、置信不得高于 low
      if (res.body.salary_range !== null) {
        expect(res.body.salary_range.freshness).not.toBe('fresh');
      }
      expect(['low', 'insufficient']).toContain(res.body.confidence);
    } finally {
      await app.close();
    }
  }, 30000);

  it('A 级来源带真实域名 URL → 保留 A，区间可标 fresh', async () => {
    const { app, token } = await bootApp(REAL_URL_SOURCE_RESULT, 'salary-realurl@coach.dev');
    try {
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      const sources: Array<{ grade: string; url?: string }> = res.body.data_sources ?? [];
      expect(sources.some((s) => s.grade === 'A')).toBe(true);
      // 有真实来源 → 允许 fresh
      if (res.body.salary_range !== null) {
        expect(['fresh', 'stale', 'unknown']).toContain(res.body.salary_range.freshness);
      }
    } finally {
      await app.close();
    }
  }, 30000);
});

// ─── Live AI tests (skipped by default, opt-in via RUN_AI_LIVE=1) ─────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Salary Analysis (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = uniqueMemoryDb();

    const { createTestApp } = await import('./test-utils');
    app = await createTestApp();
    token = await loginUser(app, 'salary-live@coach.dev', 'Salary Live User');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI returns valid structured output for 后端工程师 in 北京', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/salary/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: '后端工程师', city: '北京' });

    expect(res.status).toBe(201);
    expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    expect(res.body).toHaveProperty('summary');
    // salary_range either null or has grade in A/B/C/D
    if (res.body.salary_range !== null) {
      expect(['A', 'B', 'C', 'D']).toContain(res.body.salary_range.grade);
    }
    // data_freshness must be valid enum
    expect(['fresh', 'stale', 'unavailable']).toContain(res.body.data_freshness);
  }, 60000);
});
