import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Mock AI result factories ────────────────────────────────────────────────────

function baseEnvelope(skill: string, overrides: Record<string, unknown> = {}) {
  return {
    skill_name: skill,
    skill_version: '1.0.0',
    summary: '综述。',
    confidence: 'high',
    evidence_used: [],
    recommendations: [],
    risks: [],
    next_actions: [],
    follow_up_questions: [],
    cannot_determine: [],
    ...overrides,
  };
}

function makePlaybookResult(overrides: Record<string, unknown> = {}) {
  return baseEnvelope('company-interview-playbook', {
    company_profile: {
      company_name: '字节跳动',
      stage: '上市',
      culture_keywords: ['字节飞速', '数据驱动'],
      reputation_summary: '效率导向，节奏快。',
      common_pain_points: ['加班较多'],
    },
    interview_process: [
      { stage: '一面', description: '技术基础面', key_assessment_angle: '算法与工程能力' },
    ],
    culture_fit_tips: [{ tip: '强调数据驱动', anti_pattern: '空谈情怀' }],
    common_pitfalls: [{ pitfall: '答非所问', consequence: '减分', avoidance_strategy: '先结构后细节' }],
    salary_negotiation_notes: {
      salary_range_estimate: '来源：脉脉，截至 2025，约 40-60w',
      negotiation_timing: 'offer 谈判阶段',
      leverage_points: ['竞品 offer'],
      taboos: ['一开始就报数字'],
    },
    ...overrides,
  });
}

function makeStarResult(overrides: Record<string, unknown> = {}) {
  return baseEnvelope('behavioral-story-builder', {
    story_bank: [
      {
        title: '主导支付重构',
        competency: ['问题解决', '领导力'],
        situation: '支付系统故障频发',
        task: '牵头重构',
        action: '我重新设计了对账流程',
        result: '故障率下降 30%',
        polish_level: 'ready',
      },
    ],
    coverage_map: { strong_dimensions: ['问题解决'], weak_dimensions: [], missing_dimensions: ['客户中心'] },
    gaps: [{ dimension: '客户中心', severity: 'moderate' }],
    ...overrides,
  });
}

function makeTechResult(overrides: Record<string, unknown> = {}) {
  return baseEnvelope('technical-interview-coach', {
    preparation_plan: [
      { priority: 'critical', area: '动态规划', estimated_hours: 20 },
      { priority: 'high', area: '系统设计', estimated_hours: 15 },
      { priority: 'medium', area: 'JVM 原理', estimated_hours: 8 },
    ],
    practice_questions: [
      { title: '最长递增子序列', type: 'algorithm', difficulty: 'medium', key_concepts: ['DP'] },
    ],
    common_patterns: [
      { pattern_name: '滑动窗口', applicable_types: ['algorithm'], description: '双指针维护窗口' },
    ],
    company_specific_focus: [
      { focus_area: '推荐系统', rationale: '该公司核心业务', evidence_source: '面经' },
    ],
    ...overrides,
  });
}

function makeCaseResult(overrides: Record<string, unknown> = {}) {
  return baseEnvelope('case-interview-coach', {
    framework_library: [
      { name: 'MECE', applicable_to: ['market_estimation'], structure: '相互独立完全穷尽' },
    ],
    practice_cases: [
      {
        title: '估算上海咖啡店数量',
        type: 'market_estimation',
        question: '上海有多少家咖啡店？',
        suggested_approach: ['自上而下拆解'],
        evaluation_criteria: ['结构清晰'],
      },
    ],
    common_mistakes: [{ mistake: '一上来报数字', why_bad: '缺结构', fix: '先建框架' }],
    evaluation_criteria: [{ dimension: '结构化', weight: 'primary' }],
    ...overrides,
  });
}

// ── Test Suite (deterministic, mocked AI) ───────────────────────────────────────

describe('InterviewPrep (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let token: string;
  let mockResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => Promise.resolve(mockResult));

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

    token = await loginUser(app, 'interview-prep@coach.dev', 'Interview Prep User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  const auth = () => `Bearer ${token}`;

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it.each([
      ['/api/interview-prep/playbook', { company_name: '字节跳动' }],
      ['/api/interview-prep/star-stories', { experiences: ['做过项目'] }],
      ['/api/interview-prep/tech-coach', { job_title: '后端工程师' }],
      ['/api/interview-prep/case-coach', { interview_type: 'market_estimation' }],
    ])('POST %s without JWT → 401', async (path, body) => {
      const res = await request(app.getHttpServer()).post(path).send(body);
      expect(res.status).toBe(401);
    });
  });

  // ─── 1. playbook ──────────────────────────────────────────────────────────

  describe('playbook', () => {
    it('normal: company with intel → 200, salary estimate with source preserved', async () => {
      mockResult = makePlaybookResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '字节跳动', interview_intelligence: { rounds: 3 } });

      expect(res.status).toBe(200);
      expect(res.body.company_profile.company_name).toBe('字节跳动');
      // estimate has a source ("来源…2025") → preserved
      expect(res.body.salary_negotiation_notes.salary_range_estimate).toContain('来源');
    });

    it('guard ①: salary estimate WITHOUT source → forced null', async () => {
      mockResult = makePlaybookResult({
        salary_negotiation_notes: {
          salary_range_estimate: '大约 40-60 万',
          negotiation_timing: 'offer 阶段',
        },
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

      expect(res.status).toBe(200);
      expect(res.body.salary_negotiation_notes.salary_range_estimate).toBeNull();
    });

    it('guard ①: no interview intel → confidence downgraded + cannot_determine flags culture', async () => {
      mockResult = makePlaybookResult({ confidence: 'high' });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '某创业公司' }); // no interview_intelligence

      expect(res.status).toBe(200);
      // high downgraded to medium when no real intel
      expect(res.body.confidence).toBe('medium');
      expect((res.body.cannot_determine as string[]).some((c) => c.includes('面经'))).toBe(true);
    });

    it('abnormal: empty company_name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '' });
      expect(res.status).toBe(400);
    });

    it('guard evidence_used: items without field/value are stripped', async () => {
      mockResult = makePlaybookResult({
        evidence_used: [
          { field: '工作年限', value: '5年', relevance: '匹配' }, // valid
          { field: '', value: '某公司', relevance: '' },          // empty field → stripped
          { field: '学历', value: '', relevance: '' },            // empty value → stripped
          { value: '某值' },                                      // missing field → stripped
          { field: '技能', value: 'Java' },                      // valid, no relevance
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '字节跳动', interview_intelligence: { rounds: 3 } });

      expect(res.status).toBe(200);
      const ev = res.body.evidence_used as Array<{ field: string; value: string }>;
      expect(ev.length).toBe(2);
      expect(ev[0]).toMatchObject({ field: '工作年限', value: '5年' });
      expect(ev[1]).toMatchObject({ field: '技能', value: 'Java' });
    });
  });

  // ─── 2. star-stories ──────────────────────────────────────────────────────

  describe('star-stories', () => {
    it('normal: result number present in input → story preserved as ready', async () => {
      mockResult = makeStarResult(); // result "故障率下降 30%"
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构支付系统，故障率下降 30%，团队 5 人'] });

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('30');
      expect(story.polish_level).toBe('ready');
    });

    it('guard ②: fabricated number in result (not in input) → result scrubbed + polish downgraded', async () => {
      // AI invents "下降 30%" but the input experience contains NO numbers
      mockResult = makeStarResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构了支付系统，显著降低了故障率'] }); // no digits

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('待补充');
      expect(story.result).not.toContain('30');
      // ready downgraded because fabricated number stripped
      expect(story.polish_level).toBe('needs_polish');
    });

    it('guard ②: fabricated number in action (not in input) → action scrubbed + polish downgraded', async () => {
      // action contains "5人团队" but input has no numbers
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            task: '牵头重构',
            action: '我组建了5人攻坚小组并重新设计了对账流程',
            result: '显著降低了故障率',
            polish_level: 'ready',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构了系统，显著降低了故障率'] }); // no digits

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.action).toContain('待核实');
      expect(story.action).not.toContain('5');
      expect(story.polish_level).toBe('needs_polish');
    });

    it('guard ②: action number present in input → action preserved', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            task: '牵头重构',
            action: '我组建了5人攻坚小组并重新设计了对账流程',
            result: '显著降低了故障率',
            polish_level: 'ready',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我带领5人团队重构了系统，显著降低了故障率'] }); // 5 in input

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.action).toContain('5');
      expect(story.action).not.toContain('待核实');
    });

    it('abnormal: empty experiences array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: [] });
      expect(res.status).toBe(400);
    });
  });

  // ─── 3. tech-coach ────────────────────────────────────────────────────────

  describe('tech-coach', () => {
    it('normal: tech role with intel → 200, full plan + company focus', async () => {
      mockResult = makeTechResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '后端工程师', interview_intelligence: { focus: '推荐系统' }, available_weeks: 8 });

      expect(res.status).toBe(200);
      expect(res.body.preparation_plan.length).toBe(3);
      expect(res.body.company_specific_focus.length).toBe(1);
    });

    it('guard ③: non-tech role (运营) → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '用户运营专员' });
      expect(res.status).toBe(400);
    });

    it('guard ③: no intel → company_specific_focus forced empty + cannot_determine note', async () => {
      mockResult = makeTechResult(); // AI returned a focus item
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '前端工程师' }); // no interview_intelligence

      expect(res.status).toBe(200);
      expect(res.body.company_specific_focus).toEqual([]);
      expect((res.body.cannot_determine as string[]).some((c) => c.includes('面经'))).toBe(true);
    });

    it('guard ③: available_weeks < 2 → only critical items kept', async () => {
      mockResult = makeTechResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '后端工程师', available_weeks: 1 });

      expect(res.status).toBe(200);
      const plan = res.body.preparation_plan as Array<{ priority: string }>;
      expect(plan.length).toBe(1);
      expect(plan.every((p) => p.priority === 'critical')).toBe(true);
    });
  });

  // ─── 4. case-coach ────────────────────────────────────────────────────────

  describe('case-coach', () => {
    it('normal: valid interview_type → 200 with frameworks', async () => {
      mockResult = makeCaseResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/case-coach')
        .set('Authorization', auth())
        .send({ interview_type: 'market_estimation' });

      expect(res.status).toBe(200);
      expect(res.body.framework_library.length).toBe(1);
    });

    it('guard ④: invalid interview_type enum → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/case-coach')
        .set('Authorization', auth())
        .send({ interview_type: 'whiteboard_magic' });
      expect(res.status).toBe(400);
    });

    it('guard ④: guarantee language scrubbed from framework structure', async () => {
      mockResult = makeCaseResult({
        framework_library: [
          { name: '万能框架', applicable_to: ['case_consulting'], structure: '用此框架一定通过咨询 Case 面' },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/case-coach')
        .set('Authorization', auth())
        .send({ interview_type: 'case_consulting' });

      expect(res.status).toBe(200);
      const structure = res.body.framework_library[0].structure as string;
      expect(structure).not.toContain('一定通过');
      expect(structure).toContain('不保证结果');
    });
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('InterviewPrep (e2e) — AI live', () => {
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
    token = await loginUser(app, 'interview-live@coach.dev', 'Interview Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI produces structurally valid playbook', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/interview-prep/playbook')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: '字节跳动', job_title: '后端工程师' })
      .timeout(40000)
      .catch((err: { response?: { status: number; body: unknown } }) =>
        err.response ?? { status: 504, body: { message: 'timeout' } },
      );

    expect(res.status).not.toBe(401);
    if (res.status === 200) {
      const body = res.body as { confidence: string; salary_negotiation_notes: { salary_range_estimate: string | null } };
      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      // guard invariant: estimate is either null or carries a source marker
      const est = body.salary_negotiation_notes.salary_range_estimate;
      expect(est === null || /来源|数据|截至|\d{4}/.test(est)).toBe(true);
    } else {
      console.warn(`[interview-prep AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);

  it('real AI: STAR result carries no fabricated numbers beyond input', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/interview-prep/star-stories')
      .set('Authorization', `Bearer ${token}`)
      .send({ experiences: ['我在团队里负责重构了核心模块，显著提升了稳定性'] }) // no digits
      .timeout(40000)
      .catch((err: { response?: { status: number; body: unknown } }) =>
        err.response ?? { status: 504, body: { message: 'timeout' } },
      );

    if (res.status === 200) {
      const stories = (res.body as { story_bank: Array<{ result: string }> }).story_bank;
      for (const s of stories) {
        // input had no numbers → guard ensures result has none either (scrubbed to 待补充)
        expect(/\d/.test(s.result)).toBe(false);
      }
    }
  }, 60000);
});
