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

// recommendation 引用一个会被 Guard 2 过滤掉的城市（上海超出 constraint），
// fit_matrix 只剩北京/杭州。Guard 7 应丢弃这段 AI 文本并按最高分重写。
const STALE_RECOMMENDATION_RESULT = {
  ...OUT_OF_CONSTRAINT_RESULT,
  recommendation:
    '综合评分最高组合为：上海 × 金融科技（综合适配度 70 分）。建议优先考虑上海。',
};

// fit_matrix 全被过滤为空（evidence_basis 全空）+ AI 仍给出引用某城市的 recommendation。
// Guard 7 应在矩阵为空时返回中性提示，而非透传引用了被过滤城市的 AI 文本。
const EMPTY_MATRIX_RECOMMENDATION_RESULT = {
  ...HAPPY_RESULT,
  fit_matrix: [
    { ...HAPPY_RESULT.fit_matrix[0], evidence_basis: [] },
    { ...HAPPY_RESULT.fit_matrix[1], evidence_basis: [] },
  ],
  recommendation:
    '综合评分最高组合为：北京 × 互联网（综合适配度 78 分）。建议优先考虑北京。',
};

// #93: key_companies 含"具体品牌名"与"类别/规模描述"混合，
// 收紧后的 stripCompanyNames 应只保留类别描述，剔除所有专有品牌名（含旧逻辑漏判的长品牌名）。
const MIXED_COMPANIES_RESULT = {
  ...HAPPY_RESULT,
  industry_hub_analysis: [
    {
      city: '北京',
      key_companies: [
        // 应保留（类别/规模描述）
        '中型互联网公司（B轮及以上）',
        '头部电商平台',
        '国企',
        '上市新能源车企',
        '500 强企业', // 数字+规模词共现 → 类别
        '一线城市本地龙头', // 一线/本地 → 类别
        // 应剔除（专有品牌名，含旧"裸数字即类别"漏判的带数字品牌名）
        '字节跳动', // 短中文品牌（旧逻辑能删）
        'Microsoft', // 长英文品牌（旧逻辑漏判：>6 且纯字母 → 误留）
        '拼多多科技', // 5 字无后缀品牌（旧逻辑漏判）
        '海康威视', // 4 字品牌
        '360', // 带数字品牌（旧"裸数字即类别"漏判 → 误留）
        '58同城', // 带数字品牌（旧逻辑漏判）
        '4399', // 带数字品牌（旧逻辑漏判）
      ],
      cluster_effect: '互联网集聚效应强',
      career_ceiling: '大厂晋升体系完善',
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

// #44: confidence=insufficient 却附带完整 fit_matrix（自相矛盾）。
// 服务端必须强制 fit_matrix=[]，并级联清空 cost/hub，recommendation 退化为中性提示。
const INSUFFICIENT_WITH_MATRIX_RESULT = {
  ...HAPPY_RESULT,
  confidence: 'insufficient',
  // fit_matrix / cost_of_living_impact / industry_hub_analysis 仍是 HAPPY_RESULT 的完整内容
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

    it('cost_of_living_impact.typical_salary_range redacts sourceless salary numbers (#19)', async () => {
      // HAPPY_RESULT 的 typical_salary_range 含 "25k-45k/月"/"20k-38k/月" 等无来源薪资数字。
      // 本模块无 data_sources 溯源通道，guard 必须抑制载荷：含数字的薪资文本被替换为引导提示，
      // 绝不照样输出编造的薪资数字。
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      const items: Array<{ city: string; typical_salary_range: string }> =
        res.body.cost_of_living_impact ?? [];
      expect(items.length).toBeGreaterThan(0);
      for (const c of items) {
        // 原始编造数字必须被抹除
        expect(c.typical_salary_range).not.toContain('25k');
        expect(c.typical_salary_range).not.toContain('45k');
        expect(c.typical_salary_range).not.toContain('20k');
        expect(c.typical_salary_range).not.toContain('38k');
        // 不再残留任何数字
        expect(/\d/.test(c.typical_salary_range)).toBe(false);
        // 替换为统一引导提示
        expect(c.typical_salary_range).toContain('薪资对标');
      }
    });

    it('cost_of_living_impact housing/purchasing notes strip sourceless precise amounts (#19)', async () => {
      // HAPPY_RESULT 的 housing_cost_note 含 "租金约 5k-10k/月，房价均价约 7-10 万/平" 等
      // 无来源精确金额——与 typical_salary_range 平行的第二条编造数字通道。
      // guard 必须收口：含数字的成本文本剥离精确金额并替换为定性引导，纯定性文本追加免责声明。
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      const items: Array<{
        city: string;
        housing_cost_note: string;
        purchasing_power_note: string;
      }> = res.body.cost_of_living_impact ?? [];
      expect(items.length).toBeGreaterThan(0);

      for (const c of items) {
        // housing_cost_note：原始含精确金额（5k/10k/7-10 万 等）→ 必须被剥离，不再残留任何数字
        expect(c.housing_cost_note).not.toContain('5k');
        expect(c.housing_cost_note).not.toContain('10k');
        expect(c.housing_cost_note).not.toContain('万');
        expect(/\d/.test(c.housing_cost_note)).toBe(false);
        // 仍带统一免责声明，避免被前端当作确定结论
        expect(c.housing_cost_note).toContain('非实时来源');
        expect(c.housing_cost_note).toContain('仅供参考');

        // purchasing_power_note：原始为纯定性文本（无数字）→ 保留内容 + 追加免责声明
        expect(c.purchasing_power_note).toContain('非实时来源');
        expect(c.purchasing_power_note).toContain('仅供参考');
        expect(/\d/.test(c.purchasing_power_note)).toBe(false);
      }

      // 定位北京条目：原 purchasing_power_note 的定性内容应被保留
      const beijing = items.find((c) => c.city.includes('北京'));
      expect(beijing).toBeDefined();
      expect(beijing!.purchasing_power_note).toContain('实际购买力偏低');
    });

    it('industry_hub_analysis cluster_effect/career_ceiling marked as rough estimate (#19)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      const hubs: Array<{ cluster_effect: string; career_ceiling: string }> =
        res.body.industry_hub_analysis ?? [];
      expect(hubs.length).toBeGreaterThan(0);
      for (const h of hubs) {
        expect(h.cluster_effect.startsWith('（粗略估算）')).toBe(true);
        expect(h.career_ceiling.startsWith('（粗略估算）')).toBe(true);
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

  // ─── Anti-fabrication guard: stricter company-name stripping (#93) ───────────

  describe('Anti-fabrication: stripCompanyNames keeps categories, strips brands (#93)', () => {
    let appMixed: INestApplication;
    let tokenMixed: string;

    beforeAll(async () => {
      const mockMixed = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(MIXED_COMPANIES_RESULT),
      };

      const moduleRefMixed = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockMixed)
        .compile();

      appMixed = moduleRefMixed.createNestApplication();
      appMixed.setGlobalPrefix('api');
      appMixed.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appMixed.init();

      tokenMixed = await loginUser(appMixed, 'city-fit-mixed@coach.dev', 'Mixed Companies User');
    }, 30000);

    afterAll(async () => {
      await appMixed.close();
    });

    it('keeps category/scale descriptors, strips specific brand names (incl. old false-negatives)', async () => {
      const res = await request(appMixed.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenMixed}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      const hubs: Array<{ key_companies: string[] }> = res.body.industry_hub_analysis ?? [];
      expect(hubs.length).toBeGreaterThan(0);
      const companies = hubs.flatMap((h) => h.key_companies);

      // 类别/规模描述应保留
      expect(companies).toContain('中型互联网公司（B轮及以上）');
      expect(companies).toContain('头部电商平台');
      expect(companies).toContain('国企'); // 旧逻辑误伤：2 字纯中文 → 错误剔除
      expect(companies).toContain('上市新能源车企');
      expect(companies).toContain('500 强企业'); // 数字+规模词共现 → 类别保留
      expect(companies).toContain('一线城市本地龙头');

      // 专有品牌名应剔除（含旧逻辑漏判的长品牌名）
      expect(companies).not.toContain('字节跳动');
      expect(companies).not.toContain('Microsoft'); // 旧逻辑漏判
      expect(companies).not.toContain('拼多多科技'); // 旧逻辑漏判
      expect(companies).not.toContain('海康威视');
      // 带数字品牌名应剔除（旧"裸数字即类别"逻辑漏判）
      expect(companies).not.toContain('360');
      expect(companies).not.toContain('58同城');
      expect(companies).not.toContain('4399');
    });
  });

  // ─── Anti-fabrication guard: recommendation reconciled with filtered matrix ──

  describe('Anti-fabrication: recommendation referencing a filtered-out city is rewritten', () => {
    let appStaleRec: INestApplication;
    let tokenStaleRec: string;

    beforeAll(async () => {
      const mockStaleRec = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(STALE_RECOMMENDATION_RESULT),
      };

      const moduleRefStaleRec = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockStaleRec)
        .compile();

      appStaleRec = moduleRefStaleRec.createNestApplication();
      appStaleRec.setGlobalPrefix('api');
      appStaleRec.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appStaleRec.init();

      tokenStaleRec = await loginUser(appStaleRec, 'city-fit-stalerec@coach.dev', 'Stale Rec User');
    }, 30000);

    afterAll(async () => {
      await appStaleRec.close();
    });

    it('AI recommends 上海 (filtered out by constraint) → server rewrites to a kept city', async () => {
      const res = await request(appStaleRec.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenStaleRec}`)
        .send({
          profile: {
            skills: ['Java'],
            current_role: '后端工程师',
            constraints: { location: '北京、杭州' }, // 不含上海
          },
        });

      expect(res.status).toBe(201);
      const cities = (res.body.fit_matrix as Array<{ city: string }>).map((m) => m.city);
      expect(cities).not.toContain('上海'); // 仍被矩阵 guard 剔除
      // recommendation 不得引用被过滤掉的上海，必须引用过滤后矩阵中的城市
      expect(res.body.recommendation).not.toContain('上海');
      const recRefsFitCity = cities.some((c: string) => (res.body.recommendation as string).includes(c));
      expect(recRefsFitCity).toBe(true);
    });
  });

  describe('Anti-fabrication: recommendation with empty filtered matrix → neutral hint', () => {
    let appEmptyRec: INestApplication;
    let tokenEmptyRec: string;

    beforeAll(async () => {
      const mockEmptyRec = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest
          .fn()
          .mockResolvedValue(EMPTY_MATRIX_RECOMMENDATION_RESULT),
      };

      const moduleRefEmptyRec = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockEmptyRec)
        .compile();

      appEmptyRec = moduleRefEmptyRec.createNestApplication();
      appEmptyRec.setGlobalPrefix('api');
      appEmptyRec.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appEmptyRec.init();

      tokenEmptyRec = await loginUser(appEmptyRec, 'city-fit-emptyrec@coach.dev', 'Empty Rec User');
    }, 30000);

    afterAll(async () => {
      await appEmptyRec.close();
    });

    it('all matrix items filtered out → recommendation is neutral hint, not stale AI text', async () => {
      const res = await request(appEmptyRec.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenEmptyRec}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      expect(res.body.fit_matrix).toEqual([]);
      // 不得透传引用了被过滤城市（北京）的 AI 推荐文本
      expect(res.body.recommendation).not.toContain('综合适配度 78 分');
      // 必须是服务端中性提示
      expect(res.body.recommendation).toContain('没有符合条件');
    });
  });

  // ─── #44: insufficient 必须清空 fit_matrix（消除自相矛盾）───────────────────────

  describe('Anti-contradiction: insufficient confidence forces empty fit_matrix (#44)', () => {
    let appInsufficient: INestApplication;
    let tokenInsufficient: string;

    beforeAll(async () => {
      const mockInsufficient = {
        complete: jest.fn().mockResolvedValue('mock'),
        completeStructured: jest.fn().mockResolvedValue(INSUFFICIENT_WITH_MATRIX_RESULT),
      };

      const moduleRefInsuf = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(AiService)
        .useValue(mockInsufficient)
        .compile();

      appInsufficient = moduleRefInsuf.createNestApplication();
      appInsufficient.setGlobalPrefix('api');
      appInsufficient.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await appInsufficient.init();

      tokenInsufficient = await loginUser(
        appInsufficient,
        'city-fit-insuf@coach.dev',
        'Insufficient User',
      );
    }, 30000);

    afterAll(async () => {
      await appInsufficient.close();
    });

    it('AI returns confidence=insufficient with full matrix → server clears matrix + cascades', async () => {
      const res = await request(appInsufficient.getHttpServer())
        .post('/api/salary/city-industry-fit')
        .set('Authorization', `Bearer ${tokenInsufficient}`)
        .send({ profile: { skills: ['Java'], current_role: '后端工程师' } });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      // 数据不足时不得附带任何适配矩阵（消除"声称不足却照样输出矩阵"的自相矛盾）
      expect(res.body.fit_matrix).toEqual([]);
      // fitCities 为空 → cost/hub 级联清空
      expect(res.body.cost_of_living_impact).toEqual([]);
      expect(res.body.industry_hub_analysis).toEqual([]);
      // recommendation 退化为中性提示，不得引用任何被清空的城市评分
      expect(res.body.recommendation).not.toContain('综合适配度 78 分');
      expect(res.body.recommendation).toContain('没有符合条件');
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
