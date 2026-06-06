import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';
import type { RoleTransitionResult } from '../src/role-transition/role-transition.service';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<RoleTransitionResult> = {}): RoleTransitionResult {
  return {
    feasibility: 'medium',
    feasibility_rationale: '有 3 项关键差距需要弥补',
    confidence: 'medium',
    summary: '从运营转产品经理有一定可行性，需要补足数据分析和产品设计能力。',
    skill_gap: [
      {
        skill_name: '数据分析',
        current_level: '基础 SQL',
        required_level: '熟练使用 SQL + Python 做用户行为分析',
        gap_severity: 'critical',
        remedy: '通过数据分析课程补足，参与真实数据分析项目',
        estimated_months: 3,
      },
      {
        skill_name: '产品设计',
        current_level: '无经验',
        required_level: '能独立完成原型设计和需求文档',
        gap_severity: 'critical',
        remedy: '学习 Figma，完成 2-3 个产品案例',
        estimated_months: 4,
      },
      {
        skill_name: '技术沟通',
        current_level: '一般',
        required_level: '能与工程师高效沟通需求',
        gap_severity: 'important',
        remedy: '了解基本技术概念，参与技术评审会议',
        estimated_months: 2,
      },
    ],
    typical_transition_path: [
      {
        path_name: '业务型 PM 切入',
        description: '利用运营背景切入业务型 PM 岗位，从垂直领域 PM 积累经验',
        duration: '1-1.5 年',
        success_rate_note: '运营背景转产品的主流路径',
      },
    ],
    success_factors: [
      {
        factor: '用户同理心',
        user_status: 'has',
        evidence: '3年用户增长运营经验',
      },
      {
        factor: 'SQL 数据分析',
        user_status: 'partial',
        evidence: '熟悉 SQL 基础',
      },
    ],
    first_step: '在现有运营岗中主动承接数据分析相关任务，同时报名一个产品经理训练营',
    evidence_used: [
      { field: 'work_experience', value: '3年用户增长运营', relevance: '与产品经理用户理解能力高度相关' },
      { field: 'skills', value: 'SQL 基础', relevance: '产品经理需要更深入的数据分析能力' },
    ],
    recommendations: ['先从业务 PM 起步，不要直接投递大厂技术型 PM'],
    risks: ['大厂 PM 岗位竞争激烈，通常要求技术背景'],
    next_actions: ['参加产品经理训练营', '完成 2 个产品案例', '申请内部 PM 转岗机会'],
    follow_up_questions: [],
    cannot_determine: [],
    ...overrides,
  };
}

// ─── Spec ─────────────────────────────────────────────────────────────────

describe('RoleTransition (e2e) — deterministic guards', () => {
  let app: INestApplication;
  let nextAiResult: RoleTransitionResult;
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

    token = await loginUser(app, 'role-transition@coach.dev', 'Role Transition User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/role-transition/analyze without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .send({ profile: '运营3年', target_role: '产品经理' });
      expect(res.status).toBe(401);
    });
  });

  // ── Input validation ─────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing target_role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: '我有3年互联网运营经验，熟悉用户增长和数据分析' });
      expect(res.status).toBe(400);
    });

    it('missing profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_role: '产品经理' });
      expect(res.status).toBe(400);
    });

    it('profile too short (< 20 chars) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: '运营', target_role: '产品经理' });
      expect(res.status).toBe(400);
    });

    it('invalid target_company_type → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
          target_company_type: 'invalid_type',
        });
      expect(res.status).toBe(400);
    });

    it('timeline_months out of range (> 60) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
          timeline_months: 99,
        });
      expect(res.status).toBe(400);
    });
  });

  // ── Happy path ───────────────────────────────────────────────────────────

  describe('Happy path — normal mock result passes through', () => {
    it('valid input with valid AI output → 200 with expected shape', async () => {
      nextAiResult = makeResult();

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询，本科汉语言文学',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      const body = res.body as RoleTransitionResult;
      expect(['high', 'medium', 'low', 'not_feasible']).toContain(body.feasibility);
      expect(Array.isArray(body.skill_gap)).toBe(true);
      expect(Array.isArray(body.typical_transition_path)).toBe(true);
      expect(Array.isArray(body.success_factors)).toBe(true);
      expect(typeof body.first_step).toBe('string');
      expect(typeof body.summary).toBe('string');
    });
  });

  // ── GUARD 2: feasibility override by critical gap count ──────────────────

  describe('GUARD 2: feasibility derived from critical gap count', () => {
    it('≤2 critical gaps → feasibility forced to high', async () => {
      nextAiResult = makeResult({
        feasibility: 'not_feasible', // AI claims not_feasible but must be overridden
        skill_gap: [
          {
            skill_name: '数据分析',
            current_level: '基础',
            required_level: '熟练',
            gap_severity: 'critical',
            remedy: '补课',
            estimated_months: 3,
          },
          {
            skill_name: '技术沟通',
            current_level: '一般',
            required_level: '流畅',
            gap_severity: 'important',
            remedy: '实践',
            estimated_months: 2,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      // 1 critical gap → high (GUARD 2 overrides AI's not_feasible)
      expect(res.body.feasibility).toBe('high');
    });

    it('3-4 critical gaps → feasibility forced to medium', async () => {
      nextAiResult = makeResult({
        feasibility: 'high', // AI overclaims
        skill_gap: [
          { skill_name: 'A', current_level: 'x', required_level: 'y', gap_severity: 'critical', remedy: 'r', estimated_months: 2 },
          { skill_name: 'B', current_level: 'x', required_level: 'y', gap_severity: 'critical', remedy: 'r', estimated_months: 3 },
          { skill_name: 'C', current_level: 'x', required_level: 'y', gap_severity: 'critical', remedy: 'r', estimated_months: 4 },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      expect(res.body.feasibility).toBe('medium');
    });

    it('≥5 critical gaps → feasibility forced to low', async () => {
      nextAiResult = makeResult({
        feasibility: 'high', // AI overclaims
        skill_gap: Array.from({ length: 5 }, (_, i) => ({
          skill_name: `技能${i + 1}`,
          current_level: '无',
          required_level: '精通',
          gap_severity: 'critical' as const,
          remedy: '长期学习',
          estimated_months: 6,
        })),
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      expect(res.body.feasibility).toBe('low');
    });

    it('AI says not_feasible → preserved even with 0 critical gaps', async () => {
      nextAiResult = makeResult({
        feasibility: 'not_feasible',
        skill_gap: [
          { skill_name: '技术基础', current_level: '无', required_level: '精通架构', gap_severity: 'important', remedy: '无法短期弥补', estimated_months: 36 },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '高级系统架构师',
        });

      expect(res.status).toBe(200);
      // not_feasible is preserved by GUARD 2
      expect(res.body.feasibility).toBe('not_feasible');
    });
  });

  // ── GUARD 3: evidence pruning ─────────────────────────────────────────────

  describe('GUARD 3: evidence_used items without profile anchor are pruned', () => {
    it('evidence value not found in profile is removed', async () => {
      nextAiResult = makeResult({
        evidence_used: [
          // This one has a valid anchor (the profile text contains this)
          { field: 'work_experience', value: 'SQL 基础查询', relevance: '与数据分析需求相关' },
          // This one is fabricated — not in profile
          { field: 'skills', value: '深度学习框架', relevance: '无中生有的证据' },
          // Missing field — should be pruned
          { field: '', value: '某个技能', relevance: '无字段名' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      const evidence = res.body.evidence_used as Array<{ field: string; value: string }>;
      // The fabricated "深度学习框架" should be pruned
      const fabricated = evidence.find((e) => e.value === '深度学习框架');
      expect(fabricated).toBeUndefined();
      // Empty field should be pruned
      const emptyField = evidence.find((e) => e.field === '');
      expect(emptyField).toBeUndefined();
    });

    it('evidence value with shared 10-char prefix but fabricated suffix is pruned (prefix bypass closed)', async () => {
      // Profile contains "SQL 基础查询" — AI fabricates "SQL 基础查询（包含高级窗口函数）" which shares the same
      // 10-char prefix. Old code: lowerProfile.includes(val.slice(0,10)) would PASS this through.
      // New code: only lowerProfile.includes(val) — full string match required — must PRUNE it.
      nextAiResult = makeResult({
        evidence_used: [
          { field: 'skills', value: 'SQL 基础查询（包含高级窗口函数）', relevance: '虚构后半段' },
          { field: 'work_experience', value: 'SQL 基础查询', relevance: '真实锚点' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      const evidence = res.body.evidence_used as Array<{ field: string; value: string }>;
      // fabricated suffix value must be pruned — full string "SQL 基础查询（包含高级窗口函数）" not in profile
      const prefixBypass = evidence.find((e) => e.value.includes('高级窗口函数'));
      expect(prefixBypass).toBeUndefined();
      // genuine full-match value must be kept
      const genuine = evidence.find((e) => e.value === 'SQL 基础查询');
      expect(genuine).toBeDefined();
    });
  });

  // ── GUARD 4: gap_severity normalization ──────────────────────────────────

  describe('GUARD 4: illegal gap_severity values are normalized to important', () => {
    it('non-enum gap_severity is replaced with important', async () => {
      nextAiResult = makeResult({
        skill_gap: [
          {
            skill_name: '非法严重度测试',
            current_level: '无',
            required_level: '有',
            gap_severity: 'high' as unknown as 'critical', // illegal value
            remedy: '测试用',
            estimated_months: 1,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      const gap = res.body.skill_gap[0] as { gap_severity: string };
      // Illegal 'high' → normalized to 'important'
      expect(gap.gap_severity).toBe('important');
    });

    it('valid gap_severity values pass through unchanged', async () => {
      nextAiResult = makeResult({
        skill_gap: [
          { skill_name: 'A', current_level: 'x', required_level: 'y', gap_severity: 'critical', remedy: 'r', estimated_months: 2 },
          { skill_name: 'B', current_level: 'x', required_level: 'y', gap_severity: 'important', remedy: 'r', estimated_months: 1 },
          { skill_name: 'C', current_level: 'x', required_level: 'y', gap_severity: 'nice_to_have', remedy: 'r', estimated_months: 0 },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      const gaps = res.body.skill_gap as Array<{ skill_name: string; gap_severity: string }>;
      const byName = Object.fromEntries(gaps.map((g) => [g.skill_name, g.gap_severity]));
      expect(byName['A']).toBe('critical');
      expect(byName['B']).toBe('important');
      expect(byName['C']).toBe('nice_to_have');
    });
  });

  // ── Insufficient confidence ───────────────────────────────────────────────

  describe('Insufficient confidence response', () => {
    it('AI returns insufficient confidence → response carries confidence:insufficient', async () => {
      nextAiResult = makeResult({
        confidence: 'insufficient',
        feasibility: 'medium',
        cannot_determine: ['缺少工作经历详情', '未知技能水平'],
        follow_up_questions: ['你目前担任什么职位？', '有没有产品相关的项目经历？'],
      });

      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，熟悉用户增长和数据分析，掌握 SQL 基础查询',
          target_role: '产品经理',
        });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(Array.isArray(res.body.cannot_determine)).toBe(true);
      expect(res.body.cannot_determine.length).toBeGreaterThan(0);
    });
  });
});

// ─── AI-live suite ───────────────────────────────────────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('RoleTransition (e2e) — AI live', () => {
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

    token = await loginUser(app, 'role-transition-live@coach.dev', 'RT Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'returns 200 with valid structure, or graceful non-auth error if relay is down',
    async () => {
      const res = await request(app.getHttpServer())
        .post('/api/role-transition/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profile: '3年互联网运营经验，负责用户增长和数据分析，熟悉 SQL 基础查询，本科汉语言文学专业毕业',
          target_role: '产品经理',
          target_company_type: 'internet',
          timeline_months: 12,
        })
        .timeout(30000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);

      if (res.status === 200) {
        const body = res.body as RoleTransitionResult;
        expect(['high', 'medium', 'low', 'not_feasible']).toContain(body.feasibility);
        expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
        expect(Array.isArray(body.skill_gap)).toBe(true);
        for (const g of body.skill_gap) {
          expect(['critical', 'important', 'nice_to_have']).toContain(g.gap_severity);
        }
        expect(Array.isArray(body.evidence_used)).toBe(true);
        expect(Array.isArray(body.typical_transition_path)).toBe(true);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[role-transition AI-live] non-200 status ${res.status} — likely relay 503/timeout`);
      }
    },
    60000,
  );
});
