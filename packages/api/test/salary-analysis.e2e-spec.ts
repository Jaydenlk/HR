import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { request, loginUser } from './test-utils';

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

// 四要素缺 source：grade 应被强制降为 C
const NO_SOURCE_RESULT = {
  ...HAPPY_RESULT,
  salary_range: {
    ...HAPPY_RESULT.salary_range,
    grade: 'A', // AI 返回 A，但服务端 guard 应强制降为 C（因为 data_sources 为空）
  },
  data_sources: [], // 缺 source → grade 必须被 guard 强制为 C
};

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
    process.env.DB_PATH = ':memory:';
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

    it('AI returns grade=A but data_sources empty → server guard forces grade=C', async () => {
      const res = await request(appNoSource.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${tokenNoSource}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(201);
      // Server guard must downgrade grade to C when source is missing
      if (res.body.salary_range !== null) {
        expect(res.body.salary_range.grade).toBe('C');
      }
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

  describe('AI outage', () => {
    it('AI service fails → 503', async () => {
      failMode = true;
      const res = await request(app.getHttpServer())
        .post('/api/salary/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端工程师', city: '北京' });

      expect(res.status).toBe(503);
      failMode = false;
    });
  });
});

// ─── Live AI tests (skipped by default, opt-in via RUN_AI_LIVE=1) ─────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Salary Analysis (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

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
