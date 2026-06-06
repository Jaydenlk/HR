import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';
import type { EducationPathResult } from '../src/education-path/education-path.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<EducationPathResult> = {}): EducationPathResult {
  return {
    summary: '综合 GPA 和目标职位来看，应届读研有一定价值，但须权衡校招机会成本。',
    confidence: 'medium',
    evidence_used: [
      { field: 'education', value: '本科计算机专业', relevance: '与研究生选择高度相关' },
      { field: 'gpa', value: 'GPA 3.6', relevance: '接近保研门槛但略低，考研更现实' },
    ],
    recommendations: ['优先考虑考研 985 院校', '同步准备秋招以备选'],
    risks: ['考研失败后错过校招窗口', '经济压力较大'],
    next_actions: ['确认目标院校考研复试分数线', '同步投递秋招实习'],
    follow_up_questions: [],
    cannot_determine: [],
    analysis: [
      {
        path_name: '考研 985',
        pros: ['提升学历背景，有利于进入头部企业', '研究生期间可积累科研经历'],
        cons: ['备考需要 1 年时间，错过当届校招'],
        feasibility_note: 'GPA 3.6，需要认真备考，上岸概率中等',
        opportunity_cost: '机会成本约 25 万元（月薪 1.5 万 × 24 个月 + 学费 3 万）',
      },
      {
        path_name: '直接工作校招',
        pros: ['立即获得工作经验', '应届生身份可投递大厂 SP/SSP'],
        cons: ['短期内学历可能限制晋升通道'],
        feasibility_note: '计算机专业应届生校招市场需求旺盛',
        opportunity_cost: '无直接机会成本，但放弃了读研的学历提升',
      },
    ],
    recommendation: '建议先参加秋招，同步准备考研备考；若拿到满意 offer 则直接工作，否则全力备考。',
    critical_factors: [
      {
        factor: 'GPA 水平',
        user_situation: 'GPA 3.6，接近保研门槛，考研竞争力中等',
        impact: 'neutral',
      },
      {
        factor: '目标职位学历要求',
        user_situation: '计算机开发岗对学历要求相对灵活',
        impact: 'supports_work',
      },
    ],
    ...overrides,
  };
}

// ─── Spec ─────────────────────────────────────────────────────────────────

describe('EducationPath (e2e) — deterministic guards', () => {
  let app: INestApplication;
  let nextAiResult: EducationPathResult;
  const completeStructured = jest.fn(() => Promise.resolve(nextAiResult));

  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'education-path@coach.dev', 'Education Path User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Auth guard ─────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/education-path/analyze without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .send({ profile: '本科计算机，GPA 3.6，大四学生' });
      expect(res.status).toBe(401);
    });
  });

  // ── Input validation ───────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('profile too short (< 20 chars) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: '本科计算机' });
      expect(res.status).toBe(400);
    });

    it('invalid target_school_tier → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机，GPA 3.6，有两段互联网实习经历，大四应届生',
          target_school_tier: 'top10',
        });
      expect(res.status).toBe(400);
    });

    it('gpa out of range (> 4) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机，GPA 5.0，有两段互联网实习经历，大四应届生',
          gpa: 5.0,
        });
      expect(res.status).toBe(400);
    });
  });

  // ── GUARD 1: education field required ─────────────────────────────────

  describe('GUARD 1: profile missing education keywords → 400', () => {
    it('profile with no education keywords → 400 with helpful message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '我有三年互联网运营经验，擅长用户增长和数据分析，熟悉 SQL 查询语言',
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('教育');
    });
  });

  // ── GUARD 2: experienced worker framework switch ───────────────────────

  describe('GUARD 2: experienced worker (years_of_experience ≥ 3)', () => {
    it('profile with 5年经验 → 200 (in-service framework applied in prompt, no crash)', async () => {
      nextAiResult = makeResult({
        analysis: [
          {
            path_name: '在职读专业硕士（非全）',
            pros: ['不影响收入，持续积累工作经验'],
            cons: ['时间压力大，需要每周末上课'],
            feasibility_note: '5年经验适合在职读专业硕士路径',
            opportunity_cost: '学费约 10-15 万',
          },
          {
            path_name: '脱产考研',
            pros: ['全身心投入，上岸概率更高'],
            cons: ['放弃当前薪资 5 年 × 12 月 × 2 万 = 120 万机会成本'],
            feasibility_note: '经济压力较大，需慎重评估',
            opportunity_cost: '机会成本约 120 万元（当前月薪 2 万 × 24 个月 + 学费 5 万）',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机，工作5年经验，目前在互联网公司担任高级工程师，月薪2万，希望了解读研可行性',
        });

      expect(res.status).toBe(200);
      const body = res.body as EducationPathResult;
      expect(Array.isArray(body.analysis)).toBe(true);
      expect(body.analysis.length).toBeGreaterThan(0);
    });
  });

  // ── Happy path ─────────────────────────────────────────────────────────

  describe('Happy path — normal mock result passes through', () => {
    it('valid input → 200 with expected shape', async () => {
      nextAiResult = makeResult();

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.6，有两段互联网实习经历，大四应届生，目标做后端开发',
          gpa: 3.6,
          target_school_tier: '985',
          economic_pressure: false,
          has_internship: true,
        });

      expect(res.status).toBe(200);
      const body = res.body as EducationPathResult;
      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      expect(Array.isArray(body.analysis)).toBe(true);
      expect(typeof body.recommendation).toBe('string');
      expect(Array.isArray(body.critical_factors)).toBe(true);
      expect(Array.isArray(body.evidence_used)).toBe(true);
    });
  });

  // ── GUARD 3: evidence pruning ──────────────────────────────────────────

  describe('GUARD 3: evidence_used items without profile anchor are pruned', () => {
    it('fabricated evidence not found in profile is removed', async () => {
      nextAiResult = makeResult({
        evidence_used: [
          { field: 'education', value: 'GPA 3.6', relevance: '在 profile 中' },
          { field: 'skills', value: '量化研究能力极强', relevance: '无中生有' },
          { field: '', value: '某些技能', relevance: '空字段' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.6，有两段互联网实习经历，大四应届生，目标做后端开发',
        });

      expect(res.status).toBe(200);
      const evidence = res.body.evidence_used as Array<{ field: string; value: string }>;
      // Fabricated evidence should be pruned
      const fabricated = evidence.find((e) => e.value === '量化研究能力极强');
      expect(fabricated).toBeUndefined();
      // Empty field should be pruned
      const emptyField = evidence.find((e) => e.field === '');
      expect(emptyField).toBeUndefined();
    });
  });

  // ── GUARD 4: critical_factors impact normalization ─────────────────────

  describe('GUARD 4: illegal impact values are normalized to neutral', () => {
    it('non-enum impact value is replaced with neutral', async () => {
      nextAiResult = makeResult({
        critical_factors: [
          {
            factor: '学历要求',
            user_situation: '目标岗位对硕士有偏好',
            impact: 'strongly_favors_grad' as unknown as 'supports_grad_school',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.6，有两段互联网实习经历，大四应届生，目标做后端开发',
        });

      expect(res.status).toBe(200);
      const factors = res.body.critical_factors as Array<{ impact: string }>;
      expect(factors[0].impact).toBe('neutral');
    });
  });

  // ── GUARD 5: 保研 path stripped when GPA too low ──────────────────────

  describe('GUARD 5: 保研 path removed when GPA < 3.5 and no percentile data', () => {
    it('AI returns 保研 path but GPA is 3.2 with no percentile → 保研 path stripped', async () => {
      nextAiResult = makeResult({
        analysis: [
          {
            path_name: '保研至 985',
            pros: ['无需考研，直接联系导师'],
            cons: ['GPA 要求高'],
            feasibility_note: '需要 GPA ≥ 3.7',
            opportunity_cost: '无机会成本',
          },
          {
            path_name: '直接工作校招',
            pros: ['立即获得收入'],
            cons: ['短期学历限制'],
            feasibility_note: '计算机应届生市场好',
            opportunity_cost: '无',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.2，有一段实习，大四应届生，目标做后端开发',
          gpa: 3.2,
        });

      expect(res.status).toBe(200);
      const paths = res.body.analysis as Array<{ path_name: string }>;
      // 保研 path should be stripped (GPA 3.2 < 3.5, no percentile)
      const baoyuan = paths.find((p) => p.path_name.includes('保研'));
      expect(baoyuan).toBeUndefined();
      // Non-baoyuan path is kept
      const workPath = paths.find((p) => p.path_name.includes('直接工作'));
      expect(workPath).toBeDefined();
    });

    it('GPA 3.8 → 保研 path is kept', async () => {
      nextAiResult = makeResult({
        analysis: [
          {
            path_name: '保研至 985',
            pros: ['GPA 3.8 满足保研条件'],
            cons: ['竞争激烈'],
            feasibility_note: '有保研资格',
            opportunity_cost: '学费 3 万/年',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.8，有三段实习，大四应届生，综合排名前10%',
          gpa: 3.8,
        });

      expect(res.status).toBe(200);
      const paths = res.body.analysis as Array<{ path_name: string }>;
      const baoyuan = paths.find((p) => p.path_name.includes('保研'));
      expect(baoyuan).toBeDefined();
    });
  });

  // ── GUARD 6: opportunity cost injection ───────────────────────────────

  describe('GUARD 6: grad school paths missing opportunity_cost get placeholder', () => {
    it('考研 path without opportunity_cost → placeholder is injected', async () => {
      nextAiResult = makeResult({
        analysis: [
          {
            path_name: '考研 985',
            pros: ['提升学历'],
            cons: ['备考时间长'],
            feasibility_note: '考研是主流选项',
            // opportunity_cost deliberately omitted
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，GPA 3.6，有两段互联网实习，大四应届生，目标做后端开发',
        });

      expect(res.status).toBe(200);
      const paths = res.body.analysis as Array<{ path_name: string; opportunity_cost?: string }>;
      const kaoYan = paths.find((p) => p.path_name.includes('考研'));
      expect(kaoYan).toBeDefined();
      // GUARD 6: placeholder must be injected
      expect(kaoYan?.opportunity_cost).toBeTruthy();
      expect(kaoYan?.opportunity_cost).toContain('机会成本');
    });
  });

  // ── Insufficient confidence ────────────────────────────────────────────

  describe('Insufficient confidence response', () => {
    it('AI returns insufficient confidence → response carries confidence:insufficient', async () => {
      nextAiResult = makeResult({
        confidence: 'insufficient',
        cannot_determine: ['缺少 GPA 信息', '未知目标职位学历要求'],
        follow_up_questions: ['你的 GPA 是多少？', '目标职位是否有硕士要求？'],
      });

      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业，有两段互联网实习经历，大四应届生，想了解是否要读研',
        });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(Array.isArray(res.body.cannot_determine)).toBe(true);
      expect(res.body.cannot_determine.length).toBeGreaterThan(0);
    });
  });
});

// ─── AI-live suite ─────────────────────────────────────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('EducationPath (e2e) — AI live', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'education-path-live@coach.dev', 'EP Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'returns 200 with valid structure, or graceful non-auth error if relay is down',
    async () => {
      const res = await request(app.getHttpServer())
        .post('/api/education-path/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '本科计算机专业（985 院校），GPA 3.65，有两段字节跳动后端开发实习，大四应届生，目标岗位为大厂后端研发工程师',
          gpa: 3.65,
          target_school_tier: '985',
          economic_pressure: false,
          has_internship: true,
        })
        .timeout(30000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);

      if (res.status === 200) {
        const body = res.body as EducationPathResult;
        expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
        expect(Array.isArray(body.analysis)).toBe(true);
        expect(typeof body.recommendation).toBe('string');
        expect(Array.isArray(body.critical_factors)).toBe(true);
        for (const f of body.critical_factors) {
          expect(['supports_grad_school', 'supports_work', 'neutral']).toContain(f.impact);
        }
        expect(Array.isArray(body.evidence_used)).toBe(true);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[education-path AI-live] non-200 status ${res.status} — likely relay 503/timeout`);
      }
    },
    60000,
  );
});
