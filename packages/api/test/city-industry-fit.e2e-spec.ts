import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { request, loginUser } from './test-utils';

// ─── Deterministic AiService mock ────────────────────────────────────────────
//
// completeStructured dispatched by toolName:
//   - city_industry_fit → normal happy-path output (fit_matrix with evidence_basis)
//   - city_industry_fit_no_evidence → fit_matrix with empty evidence_basis (guard filters out)
//   - city_industry_fit_city_constraint → fit_matrix with out-of-constraint city (guard filters out)
//
// failMode: set to true to simulate AI outage (503)

let failMode = false;

const HAPPY_RESULT = {
  summary: '基于您的 Java/Spring Boot 技能和 3 年后端经验，北京互联网和杭州电商的适配度最高。',
  confidence: 'medium',
  evidence_used: [
    { field: 'profile.skills', value: 'Java, Spring Boot', relevance: '与北京互联网/杭州电商技术栈高度匹配' },
    { field: 'profile.current_role', value: '后端工程师', relevance: '目标岗位与城市主导行业需求吻合' },
  ],
  recommendations: ['优先考虑北京互联网大厂，技能匹配度最高', '杭州阿里系薪资/生活成本比优于北京'],
  risks: ['北京住房成本高，需考虑生活成本可持续性'],
  next_actions: ['准备 Spring Cloud 微服务相关面试题', '关注杭州字节/阿里系招聘动态'],
  follow_up_questions: [],
  cannot_determine: [],
  fit_matrix: [
    {
      city: '北京',
      industry: '互联网',
      fit_score: 78,
      fit_breakdown: {
        skill_match: 85,
        career_ceiling: 90,
        cost_sustainability: 55,
        constraint_satisfaction: 70,
      },
      evidence_basis: ['profile.skills 包含 Java/Spring Boot，与北京互联网主流技术栈匹配'],
    },
    {
      city: '杭州',
      industry: '电商',
      fit_score: 74,
      fit_breakdown: {
        skill_match: 80,
        career_ceiling: 75,
        cost_sustainability: 75,
        constraint_satisfaction: 70,
      },
      evidence_basis: ['profile.skills 包含 Java，与杭州阿里系电商后端技术栈匹配'],
    },
  ],
  cost_of_living_impact: [
    {
      city: '北京',
      typical_salary_range: '25k-45k/月',
      housing_cost_note: '租金约 5k-10k/月，房价均价约 7-10 万/平',
      purchasing_power_note: '高薪但高成本，实际购买力偏低',
    },
    {
      city: '杭州',
      typical_salary_range: '20k-38k/月',
      housing_cost_note: '租金约 3k-7k/月，房价均价约 3-5 万/平',
      purchasing_power_note: '薪资略低但成本更优，实际购买力优于北京',
    },
  ],
  industry_hub_analysis: [
    {
      city: '北京',
      key_companies: ['字节跳动', '百度', '京东', '美团'],
      cluster_effect: '互联网集聚效应强，跳槽机会多，技术社区活跃',
      career_ceiling: 'P8/T9 以上路径清晰，大厂晋升体系完善',
    },
    {
      city: '杭州',
      key_companies: ['阿里巴巴', '网易', '海康威视'],
      cluster_effect: '阿里系生态辐射广，电商领域人才流动活跃',
      career_ceiling: '阿里 P8 以上有天花板，但新能源车等方向崛起',
    },
  ],
  recommendation: '综合评分最高组合为：北京 × 互联网（综合适配度 78 分）。基于您的 Java/Spring Boot 技能，北京互联网大厂的技能匹配度（85分）和职业天花板（90分）最优。',
};

// fit_matrix 含空 evidence_basis → guard 应剔除该条目
const NO_EVIDENCE_RESULT = {
  ...HAPPY_RESULT,
  fit_matrix: [
    {
      ...HAPPY_RESULT.fit_matrix[0],
      evidence_basis: [], // 空 evidence_basis → guard 剔除
    },
    HAPPY_RESULT.fit_matrix[1],
  ],
};

// fit_matrix 含超出 constraint 城市（上海）→ guard 应剔除
const OUT_OF_CONSTRAINT_RESULT = {
  ...HAPPY_RESULT,
  fit_matrix: [
    ...HAPPY_RESULT.fit_matrix,
    {
      city: '上海',
      industry: '金融科技',
      fit_score: 70,
      fit_breakdown: {
        skill_match: 75,
        career_ceiling: 80,
        cost_sustainability: 60,
        constraint_satisfaction: 30,
      },
      evidence_basis: ['profile.skills 包含 Java'],
    },
  ],
};

// fit_score 由 AI 返回的值 vs 服务端重算：AI 给 99，服务端应按公式重算
const INFLATED_SCORE_RESULT = {
  ...HAPPY_RESULT,
  fit_matrix: [
    {
      city: '北京',
      industry: '互联网',
      fit_score: 99, // AI 返回 99，服务端应重算为 85*0.4+90*0.3+55*0.2+70*0.1 = 80
      fit_breakdown: {
        skill_match: 85,
        career_ceiling: 90,
        cost_sustainability: 55,
        constraint_satisfaction: 70,
      },
      evidence_basis: ['profile.skills 包含 Java/Spring Boot'],
    },
  ],
};

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (failMode) {
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }
    if (toolName === 'city_industry_fit') {
      return Promise.resolve(HAPPY_RESULT);
    }
    return Promise.resolve({});
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('City × Industry Fit (e2e, mocked AI)', () => {
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

    token = await loginUser(app, 'city-fit@coach.dev', 'City Fit User');
  }, 30000);

  afterAll(async () => {
    await app.close();
    failMode = false;
  });

  // ─── Auth guard ─────────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/salary/city-industry-fit without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .send({ profile: { skills: ['Java'] } });
      expect(res.status).toBe(401);
    });
  });

  // ─── Input validation ────────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Anti-fabrication guard: insufficient when profile is empty ──────────────

  describe('Anti-fabrication: empty profile → insufficient', () => {
    it('profile with no skills or current_role → 201 with confidence=insufficient', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: {} });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.fit_matrix).toEqual([]);
      expect(res.body.follow_up_questions.length).toBeGreaterThan(0);
    });
  });

  // ─── Happy path ──────────────────────────────────────────────────────────────

  describe('Happy path', () => {
    it('valid profile with skills → 201 with fit_matrix', async () => {
      failMode = false;
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: {
            skills: ['Java', 'Spring Boot'],
            current_role: '后端工程师',
            years_of_experience: '3年',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('confidence');
      expect(res.body).toHaveProperty('fit_matrix');
      expect(res.body).toHaveProperty('cost_of_living_impact');
      expect(res.body).toHaveProperty('industry_hub_analysis');
      expect(res.body).toHaveProperty('recommendation');
      expect(res.body).toHaveProperty('summary');
    });

    it('fit_matrix items have required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: { skills: ['Java'], current_role: '后端工程师' },
        });

      expect(res.status).toBe(201);
      if (res.body.fit_matrix.length > 0) {
        const item = res.body.fit_matrix[0];
        expect(item).toHaveProperty('city');
        expect(item).toHaveProperty('industry');
        expect(item).toHaveProperty('fit_score');
        expect(item).toHaveProperty('fit_breakdown');
        expect(item).toHaveProperty('evidence_basis');
        expect(item.fit_breakdown).toHaveProperty('skill_match');
        expect(item.fit_breakdown).toHaveProperty('career_ceiling');
        expect(item.fit_breakdown).toHaveProperty('cost_sustainability');
        expect(item.fit_breakdown).toHaveProperty('constraint_satisfaction');
      }
    });

    it('industry_hub_analysis key_companies strips specific brand names (anti-fabrication)', async () => {
      // HAPPY_RESULT includes ['字节跳动', '百度', '京东', '美团'] — all short brand names ≤6 chars
      // The server guard (stripCompanyNames) should remove them.
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      const hubs: Array<{ city: string; key_companies: string[] }> = res.body.industry_hub_analysis ?? [];
      for (const hub of hubs) {
        // Known brand names in the mock output must be stripped
        expect(hub.key_companies).not.toContain('字节跳动');
        expect(hub.key_companies).not.toContain('百度');
        expect(hub.key_companies).not.toContain('阿里巴巴');
        expect(hub.key_companies).not.toContain('网易');
      }
    });
  });

  // ─── Anti-fabrication guard: empty evidence_basis filtered out ───────────────

  describe('Anti-fabrication: empty evidence_basis → item filtered from fit_matrix', () => {
    let appNoEvidence: INestApplication;
    let tokenNoEvidence: string;

    beforeAll(async () => {
      const mockNoEvidence = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(NO_EVIDENCE_RESULT),
      };

      const moduleRef2 = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockNoEvidence)
        .compile();

      appNoEvidence = moduleRef2.createNestApplication();
      appNoEvidence.setGlobalPrefix('api');
      appNoEvidence.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appNoEvidence.init();

      tokenNoEvidence = await loginUser(
        appNoEvidence,
        'city-fit-noev@coach.dev',
        'No Evidence User',
      );
    }, 30000);

    afterAll(async () => {
      await appNoEvidence.close();
    });

    it('AI returns fit_matrix item with empty evidence_basis → server guard removes it', async () => {
      const res = await request(appNoEvidence.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenNoEvidence}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      // The item with empty evidence_basis (北京) must be removed; only 杭州 remains
      const cities = (res.body.fit_matrix as Array<{ city: string; evidence_basis: string[] }>)
        .map((m) => m.city);
      expect(cities).not.toContain('北京');
      // All remaining items must have non-empty evidence_basis
      for (const item of res.body.fit_matrix as Array<{ evidence_basis: string[] }>) {
        expect(item.evidence_basis.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── Anti-fabrication guard: city constraint respected ───────────────────────

  describe('Anti-fabrication: city outside constraint filtered out', () => {
    let appConstrained: INestApplication;
    let tokenConstrained: string;

    beforeAll(async () => {
      const mockConstrained = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(OUT_OF_CONSTRAINT_RESULT),
      };

      const moduleRef3 = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockConstrained)
        .compile();

      appConstrained = moduleRef3.createNestApplication();
      appConstrained.setGlobalPrefix('api');
      appConstrained.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appConstrained.init();

      tokenConstrained = await loginUser(
        appConstrained,
        'city-fit-constrained@coach.dev',
        'Constrained User',
      );
    }, 30000);

    afterAll(async () => {
      await appConstrained.close();
    });

    it('AI returns city outside profile.constraints.location → server guard removes it', async () => {
      const res = await request(appConstrained.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenConstrained}`)
        .send({
          profile: {
            skills: ['Java'],
            current_role: '后端工程师',
            constraints: { location: '北京、杭州' }, // 不含上海
          },
        });

      expect(res.status).toBe(201);
      const cities = (res.body.fit_matrix as Array<{ city: string }>).map((m) => m.city);
      // 上海 超出约束，应被剔除
      expect(cities).not.toContain('上海');
    });
  });

  // ─── Anti-fabrication guard: fit_score recalculated server-side ──────────────

  describe('Anti-fabrication: fit_score recomputed by server formula', () => {
    let appInflated: INestApplication;
    let tokenInflated: string;

    beforeAll(async () => {
      const mockInflated = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(INFLATED_SCORE_RESULT),
      };

      const moduleRef4 = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockInflated)
        .compile();

      appInflated = moduleRef4.createNestApplication();
      appInflated.setGlobalPrefix('api');
      appInflated.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appInflated.init();

      tokenInflated = await loginUser(
        appInflated,
        'city-fit-inflated@coach.dev',
        'Inflated Score User',
      );
    }, 30000);

    afterAll(async () => {
      await appInflated.close();
    });

    it('AI returns fit_score=99 but server recomputes via formula → correct score', async () => {
      const res = await request(appInflated.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenInflated}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      if (res.body.fit_matrix.length > 0) {
        const item = res.body.fit_matrix[0] as {
          fit_score: number;
          fit_breakdown: { skill_match: number; career_ceiling: number; cost_sustainability: number; constraint_satisfaction: number };
        };
        // Server formula: 0.4*85 + 0.3*90 + 0.2*55 + 0.1*70 = 34+27+11+7 = 79
        const expected = Math.round(
          item.fit_breakdown.skill_match * 0.4 +
          item.fit_breakdown.career_ceiling * 0.3 +
          item.fit_breakdown.cost_sustainability * 0.2 +
          item.fit_breakdown.constraint_satisfaction * 0.1,
        );
        expect(item.fit_score).toBe(expected);
        // Must not be the inflated value of 99
        expect(item.fit_score).not.toBe(99);
      }
    });
  });

  // ─── AI outage → 503 ────────────────────────────────────────────────────────

  describe('AI outage', () => {
    it('AI service fails → 503', async () => {
      failMode = true;
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(503);
      failMode = false;
    });
  });
});

// ─── Live AI tests (skipped by default, opt-in via RUN_AI_LIVE=1) ─────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('City × Industry Fit (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const { createTestApp } = await import('./test-utils');
    app = await createTestApp();
    token = await loginUser(app, 'city-fit-live@coach.dev', 'City Fit Live User');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI returns valid structured output for Java后端工程师', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/salary/city-industry-fit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        profile: {
          skills: ['Java', 'Spring Boot', 'MySQL'],
          current_role: '后端工程师',
          years_of_experience: '3年',
          constraints: { location: '北京、上海、杭州' },
        },
      });

    expect(res.status).toBe(201);
    expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    expect(res.body).toHaveProperty('fit_matrix');
    expect(res.body).toHaveProperty('recommendation');
    // All fit_matrix items must have non-empty evidence_basis (anti-fabrication)
    for (const item of res.body.fit_matrix as Array<{ evidence_basis: string[] }>) {
      expect(item.evidence_basis.length).toBeGreaterThan(0);
    }
    // fit_score must match formula
    for (const item of res.body.fit_matrix as Array<{
      fit_score: number;
      fit_breakdown: { skill_match: number; career_ceiling: number; cost_sustainability: number; constraint_satisfaction: number };
    }>) {
      const expected = Math.round(
        item.fit_breakdown.skill_match * 0.4 +
        item.fit_breakdown.career_ceiling * 0.3 +
        item.fit_breakdown.cost_sustainability * 0.2 +
        item.fit_breakdown.constraint_satisfaction * 0.1,
      );
      expect(item.fit_score).toBe(expected);
    }
  }, 60000);
});
