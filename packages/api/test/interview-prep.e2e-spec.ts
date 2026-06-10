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

    // ── 回归 #9（P2）：旧正则 (19|20)\d{2} 会把任意含 19xx/20xx 子串的薪资数字误判为「有来源」。
    // 「月薪12000元」含 2000、「年包120000」含 2000、「约 2050 元」含 2050——均为要拦的编造薪资。
    // 修复后：年份/数字不再是来源信号，无显式来源标记 → 强制 null。
    it.each([
      ['月薪12000元，年包约 18 万'], // 含「2000」子串，旧正则误判有来源
      ['年包 120000，具体面议'], // 含「2000」子串
      ['预计月薪约 2050 元起'], // 含「2050」子串
      ['大约 40-60 万'], // 纯数字无来源
    ])(
      'guard ① regression #9: salary estimate without explicit source (%s) → forced null',
      async (salary_range_estimate) => {
        mockResult = makePlaybookResult({
          salary_negotiation_notes: { salary_range_estimate, negotiation_timing: 'offer 阶段' },
        });
        const res = await request(app.getHttpServer())
          .post('/api/interview-prep/playbook')
          .set('Authorization', auth())
          .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

        expect(res.status).toBe(200);
        expect(res.body.salary_negotiation_notes.salary_range_estimate).toBeNull();
      },
    );

    // ── 回归 #9（P2）：仅显式来源结构才算「有来源」并保留（年份本身≠来源）。
    it.each([
      ['来源：BOSS直聘 2024，约 30-45 万'], // 结构①：显式「来源：」标号 + 内容
      ['据脉脉平台调研，约 40-60 万'], // 结构③：具名平台「脉脉」+ 口径词「调研」
      ['出处：拉勾 2025 薪酬榜单，约 25 万'], // 结构①：「出处：」标号
      ['参考：第三方薪酬报告 2024，约 35 万'], // 结构①：「参考：」标号 + 内容
    ])(
      'guard ① regression #9: salary estimate with an explicit source marker (%s) → preserved',
      async (salary_range_estimate) => {
        mockResult = makePlaybookResult({
          salary_negotiation_notes: { salary_range_estimate, negotiation_timing: 'offer 阶段' },
        });
        const res = await request(app.getHttpServer())
          .post('/api/interview-prep/playbook')
          .set('Authorization', auth())
          .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

        expect(res.status).toBe(200);
        expect(res.body.salary_negotiation_notes.salary_range_estimate).toBe(salary_range_estimate);
      },
    );

    // ── 回归 #33（P2）：旧 hasSource 把裸通用词（数据/平台/报告/招聘网站）当作有来源，
    // 套话即可绕过。收紧后必须有「显式来源结构」（来源：xxx / 具名平台+年份或口径 / 样本说明），
    // 仅含裸通用词、无具名平台/年份/样本锚点 → 强制 null。
    it.each([
      ['参考第三方薪酬报告，约 35 万'], // 「报告」裸词、无具名平台/年份/样本 → null
      ['据招聘网站数据，约 25-40 万'], // 「招聘网站」「数据」裸词 → null
      ['根据市场数据，约 40-60 万'], // 「数据」裸词 → null
      ['多个平台综合，约 30 万'], // 「平台」裸词（非具名平台）→ null
      ['行业调研显示约 28 万'], // 「调研」但无具名平台 → null
    ])(
      'guard ① regression #33: bare generic source words without structure (%s) → forced null',
      async (salary_range_estimate) => {
        mockResult = makePlaybookResult({
          salary_negotiation_notes: { salary_range_estimate, negotiation_timing: 'offer 阶段' },
        });
        const res = await request(app.getHttpServer())
          .post('/api/interview-prep/playbook')
          .set('Authorization', auth())
          .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

        expect(res.status).toBe(200);
        expect(res.body.salary_negotiation_notes.salary_range_estimate).toBeNull();
      },
    );

    // ── 回归 #33（P2）：具名平台 + 年份 / 样本说明 等显式结构 → 保留。
    it.each([
      ['脉脉 2024 薪酬数据，约 40-60 万'], // 结构②：具名平台「脉脉」+ 年份 2024
      ['BOSS直聘2025招聘数据，约 30-45 万'], // 结构②：具名平台 + 年份 2025
      ['样本 320 份调研，约 35 万'], // 结构④：「样本」+ 数字 320
      ['截至 2025 年统计，约 50 万'], // 结构④：「截至」+ 数字
    ])(
      'guard ① regression #33: explicit source structure (named platform+year / sample) (%s) → preserved',
      async (salary_range_estimate) => {
        mockResult = makePlaybookResult({
          salary_negotiation_notes: { salary_range_estimate, negotiation_timing: 'offer 阶段' },
        });
        const res = await request(app.getHttpServer())
          .post('/api/interview-prep/playbook')
          .set('Authorization', auth())
          .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

        expect(res.status).toBe(200);
        expect(res.body.salary_negotiation_notes.salary_range_estimate).toBe(salary_range_estimate);
      },
    );

    // ── 回归（P1 :693）：salary_range_estimate 已从 schema required 移除。
    // 产品无薪资来源时模型返回 null（或漏字段）→ guardPlaybook 兜底为 null，
    // 必须 200，绝不因「required 字段为 null/缺失」触发重试链最终 503。
    it('P1 :693: model returns salary_range_estimate=null → 200, stays null (no 503)', async () => {
      mockResult = makePlaybookResult({
        salary_negotiation_notes: {
          salary_range_estimate: null,
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

    it('P1 :693: model omits salary_range_estimate entirely → 200, guard fills null (no 503)', async () => {
      mockResult = makePlaybookResult({
        // 模型完全漏掉 salary_range_estimate（已非 required）—— guardPlaybook 兜底为 null
        salary_negotiation_notes: { negotiation_timing: 'offer 阶段' },
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

      expect(res.status).toBe(200);
      expect(res.body.salary_negotiation_notes.salary_range_estimate).toBeNull();
    });

    // ── 回归 #34（P2）：negotiation_timing 在 TS SalaryNegotiationNotes 为可选，
    // 旧 PLAYBOOK_SCHEMA 误把它列入 salary_negotiation_notes.required，模型合理省略它会
    // 触发 AiService 的 missing-field 重试链最终可能 503。已从 schema required 移除。
    // 契约层面：模型省略 negotiation_timing 时端点仍 200、guardPlaybook 不崩。
    it('P2 #34: model omits negotiation_timing (now optional in schema) → 200, no crash', async () => {
      mockResult = makePlaybookResult({
        // 仅给 salary_range_estimate（带来源），negotiation_timing 完全缺失
        salary_negotiation_notes: { salary_range_estimate: '来源：脉脉 2025，约 40 万' },
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '某公司', interview_intelligence: { rounds: 2 } });

      expect(res.status).toBe(200);
      // 带来源的估算保留；缺失的可选字段不应被强行填充
      expect(res.body.salary_negotiation_notes.salary_range_estimate).toBe('来源：脉脉 2025，约 40 万');
      expect(res.body.salary_negotiation_notes.negotiation_timing).toBeUndefined();
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

    // ── 回归 #10/#78（P1/P2）：模型漏 result 字段时旧代码对 undefined 调 extractNumbers 会 500。
    it('guard ② regression #10/#78: model omits result field → 200 (no crash)', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            task: '牵头重构',
            action: '我重新设计了对账流程',
            // result 字段缺失（模型漏字段）—— 不得 500
            polish_level: 'needs_polish',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构了系统，显著降低了故障率'] });

      expect(res.status).toBe(200);
      expect(res.body.story_bank.length).toBe(1);
    });

    // ── 回归 #47（P2）：situation/task 里杜撰的量化数字也必须被剔除（旧实现只校验 result/action）。
    it('guard ② regression #47: fabricated number in situation → situation scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            // situation 杜撰「日均 200 万订单」，输入无任何数字 → 必须被收口
            situation: '当时系统日均处理 200 万订单，故障频发',
            task: '牵头重构',
            action: '我重新设计了对账流程',
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
      expect(story.situation).toContain('待核实');
      expect(story.situation).not.toContain('200');
      expect(story.polish_level).toBe('needs_polish');
    });

    it('guard ② regression #47: fabricated number in task → task scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            // task 杜撰「3 个月内」，输入无任何数字 → 必须被收口
            task: '要求在 3 个月内完成重构',
            action: '我重新设计了对账流程',
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
      expect(story.task).toContain('待核实');
      expect(story.task).not.toContain('3');
      expect(story.polish_level).toBe('needs_polish');
    });

    it('guard ② regression #47: number in situation present in input → situation preserved', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '当时系统日均处理 200 万订单，故障频发',
            task: '牵头重构',
            action: '我重新设计了对账流程',
            result: '显著降低了故障率',
            polish_level: 'needs_polish',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['系统日均 200 万订单，我牵头重构，降低了故障率'] }); // 200 in input

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.situation).toContain('200');
      expect(story.situation).not.toContain('待核实');
    });

    // ── 回归 #60/#64/#311（P2）：跨字段串号——旧实现把所有经历的裸数字拍平进一个全局 Set，
    // 「5 人」可被改写成「5 倍」蒙混过关（数字 5 在全局集合里）。收紧后量化表达式需带单位且
    // 在「某一条」经历里原样出现，单位不同（5倍≠5人）即判编造。
    it('guard ② regression #60/#64/#311: number reused with a different unit (5人→5倍) → scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            task: '牵头重构',
            action: '我带领团队完成重构',
            // result 杜撰「效率提升 5 倍」：输入只有「5 人」，5 倍属串号编造，必须收口
            result: '效率提升 5 倍',
            polish_level: 'ready',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我带领 5 人团队完成了系统重构'] }); // 「5 人」而非「5 倍」

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('待补充');
      expect(story.result).not.toContain('5 倍');
      expect(story.polish_level).toBe('needs_polish');
    });

    // ── 回归 #60/#64/#311（P2）：同单位且在同一条经历出现 → 保留（未误伤合法量化）。
    it('guard ② regression #60/#64/#311: same number+unit present in input (5人) → preserved', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['领导力'],
            situation: '系统不稳定',
            task: '牵头重构',
            action: '我带领 5 人小组完成重构',
            result: '显著降低了故障率',
            polish_level: 'needs_polish',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我带领 5 人团队完成了系统重构'] });

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.action).toContain('5');
      expect(story.action).not.toContain('待核实');
    });

    // ── 回归 #60/#64/#311（P2）：中文数字「三十万」编造（输入无此量）→ 必须被收口。
    it('guard ② regression #60/#64/#311: fabricated Chinese numeral (三十万) → scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导营收增长',
            competency: ['数据驱动'],
            situation: '业务停滞',
            task: '负责增长',
            action: '我重新设计了转化漏斗',
            // result 杜撰「营收增长三十万」，输入无任何金额 → 必须收口
            result: '推动营收增长三十万',
            polish_level: 'ready',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我负责增长业务，重新设计了转化漏斗，显著提升了营收'] }); // 无量化

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('待补充');
      expect(story.result).not.toContain('三十万');
      expect(story.polish_level).toBe('needs_polish');
    });

    // ── 回归 #60/#64/#311（P2）：中文百分比「百分之三十」编造 → 必须被收口。
    it('guard ② regression #60/#64/#311: fabricated Chinese percentage (百分之三十) → scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导重构',
            competency: ['问题解决'],
            situation: '故障频发',
            task: '牵头重构',
            action: '我重新设计了对账流程',
            result: '故障率下降百分之三十',
            polish_level: 'ready',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构系统，显著降低了故障率'] }); // 无量化

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('待补充');
      expect(story.result).not.toContain('百分之三十');
      expect(story.polish_level).toBe('needs_polish');
    });

    // ── 回归 #60/#64/#311（P2）：中文数字在输入中出现 → 保留（中文量化也走同一来源上下文）。
    it('guard ② regression #60/#64/#311: Chinese numeral present in input (三十万) → preserved', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导营收增长',
            competency: ['数据驱动'],
            situation: '业务停滞',
            task: '负责增长',
            action: '我重新设计了转化漏斗',
            result: '推动营收增长三十万',
            polish_level: 'needs_polish',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我负责增长业务，重新设计转化漏斗，推动营收增长三十万'] }); // 含「三十万」

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      expect(story.result).toContain('三十万');
      expect(story.result).not.toContain('待补充');
    });

    // ── 回归 #60/#64/#311（P2）：误伤防护——裸中文词（第三方/一下）不带单位，不是量化，
    // 即便输入未出现也绝不能被当成编造数字收口（中文分支必须带单位才算量化）。
    it('guard ② regression #60/#64/#311: non-quantity Chinese words (第三方/一下) → NOT scrubbed', async () => {
      mockResult = makeStarResult({
        story_bank: [
          {
            title: '主导对接',
            competency: ['协作影响'],
            situation: '需要打通第三方系统',
            task: '牵头对接',
            action: '我和第三方团队一起梳理了一下接口规范',
            result: '显著提升了对接效率',
            polish_level: 'needs_polish',
          },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头对接系统，梳理接口规范，提升了对接效率'] }); // 不含「第三方/一下」

      expect(res.status).toBe(200);
      const story = res.body.story_bank[0];
      // 「第三方」「一下」非量化表达式 → 不应被误删
      expect(story.situation).toContain('第三方');
      expect(story.action).toContain('一下');
      expect(story.action).not.toContain('待核实');
      expect(story.polish_level).toBe('needs_polish');
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

    // ── 回归 #49（P2）：产品经理/数据分析等「看似挨技术」岗位旧黑名单放行，修复后应 400。
    it.each([['产品经理'], ['高级数据分析师'], ['商业分析师'], ['项目经理']])(
      'guard ③ regression #49: non-tech-ish role (%s) → 400',
      async (job_title) => {
        const res = await request(app.getHttpServer())
          .post('/api/interview-prep/tech-coach')
          .set('Authorization', auth())
          .send({ job_title });
        expect(res.status).toBe(400);
      },
    );

    // ── 回归 #49（P2）：技术白名单优先——含「数据」黑名单词的真技术岗应放行（200）。
    it('guard ③ regression #49: tech role overlapping a blacklist word (数据平台研发工程师) → 200', async () => {
      mockResult = makeTechResult();
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '数据平台研发工程师', interview_intelligence: { focus: '存储' } });

      expect(res.status).toBe(200);
      expect(res.body.preparation_plan.length).toBeGreaterThan(0);
    });

    // ── 回归 #86（P3）：时间<2 周且无 critical 项 → plan 为空但必须给出说明，不静默返回空计划。
    it('guard ③ regression #86: available_weeks<2 with no critical item → empty plan + cannot_determine note', async () => {
      mockResult = makeTechResult({
        preparation_plan: [
          { priority: 'high', area: '系统设计', estimated_hours: 15 },
          { priority: 'medium', area: 'JVM 原理', estimated_hours: 8 },
        ],
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '后端工程师', interview_intelligence: { focus: 'x' }, available_weeks: 1 });

      expect(res.status).toBe(200);
      expect(res.body.preparation_plan).toEqual([]);
      expect(
        (res.body.cannot_determine as string[]).some((c) => c.includes('2 周')),
      ).toBe(true);
    });
  });

  // ─── confidence 白名单收口（P1 :202）──────────────────────────────────────
  // AI 返回的 confidence 不可直接采信：非合法枚举（如 'super_high' / '极高' / 空串）
  // 必须被收口为 'low'，四个端点一致。
  describe('confidence whitelist (P1 :202)', () => {
    it('playbook: illegal confidence (with intel, no high→medium path) → low', async () => {
      mockResult = makePlaybookResult({ confidence: 'super_high' });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '字节跳动', interview_intelligence: { rounds: 3 } });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
    });

    it('star-stories: illegal confidence → low', async () => {
      mockResult = makeStarResult({ confidence: '极高' });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/star-stories')
        .set('Authorization', auth())
        .send({ experiences: ['我牵头重构支付系统，故障率下降 30%，团队 5 人'] });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
    });

    it('tech-coach: illegal confidence → low', async () => {
      mockResult = makeTechResult({ confidence: 99 });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/tech-coach')
        .set('Authorization', auth())
        .send({ job_title: '后端工程师', interview_intelligence: { focus: '推荐系统' } });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
    });

    it('case-coach: illegal confidence → low', async () => {
      mockResult = makeCaseResult({ confidence: '' });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/case-coach')
        .set('Authorization', auth())
        .send({ interview_type: 'market_estimation' });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
    });

    it('valid confidence (with intel) → preserved', async () => {
      mockResult = makePlaybookResult({ confidence: 'medium' });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/playbook')
        .set('Authorization', auth())
        .send({ company_name: '字节跳动', interview_intelligence: { rounds: 3 } });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('medium');
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

    // ── 回归 #32（P2）：单句出现多处保证语时必须全部清除。
    // 旧正则缺 /g，String.replace 只替换首个匹配，残留的「必过」「包过」会漏网。
    it('guard ④ regression #32: multiple guarantee phrases in one sentence → all scrubbed', async () => {
      mockResult = makeCaseResult({
        framework_library: [
          {
            name: '万能框架',
            applicable_to: ['case_consulting'],
            // 单句三处保证语：保证拿 offer / 必过 / 包过——必须一次清干净
            structure: '用此框架保证拿到 offer，必过，包过咨询 Case 面',
          },
        ],
        // recommendations 同句多处保证语也要全清
        recommendations: ['只要照做就一定通过，百分百稳过'],
        summary: '本方案保证拿到 offer 且必过。',
      });
      const res = await request(app.getHttpServer())
        .post('/api/interview-prep/case-coach')
        .set('Authorization', auth())
        .send({ interview_type: 'case_consulting' });

      expect(res.status).toBe(200);
      const structure = res.body.framework_library[0].structure as string;
      // 三处保证语必须全部被替换，一个都不许残留
      expect(structure).not.toMatch(/保证拿到 offer|必过|包过/);
      const rec = (res.body.recommendations as string[])[0];
      expect(rec).not.toMatch(/一定通过|百分百|稳过/);
      expect(res.body.summary as string).not.toMatch(/保证拿到 offer|必过/);
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
      // guard invariant（#33）：estimate 要么为 null，要么带「显式来源结构」之一：
      //   显式来源标号（来源/出处/参考/据 + ：/:）/ 具名平台 + 年份或口径 / 样本·截至 + 数字。
      // 裸通用词（数据/平台/报告/招聘网站）不再算来源——与 service 端 hasExplicitSource 对齐。
      const est = body.salary_negotiation_notes.salary_range_estimate;
      const named = ['脉脉', 'boss直聘', '拉勾', '猎聘', '看准', '职友集', '智联招聘', '前程无忧', '51job', 'offershow', 'levels.fyi'];
      const hasStructuredSource = (s: string): boolean => {
        const lower = s.toLowerCase();
        if (/(来源|数据来源|出处|参考|据)\s*[：:]\s*\S/.test(s)) return true;
        const hasPlatform = named.some((p) => lower.includes(p));
        if (hasPlatform && (/\b(19|20)\d{2}\b|(19|20)\d{2}\s*年/.test(s) || /调研|问卷|统计|样本|抽样|榜单/.test(s))) return true;
        if (/(样本|截至)\D{0,6}\d/.test(s)) return true;
        return false;
      };
      expect(est === null || hasStructuredSource(est)).toBe(true);
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
