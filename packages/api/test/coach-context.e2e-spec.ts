import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CoachContextService } from '../src/conversations/coach-context.service';
import { EvidenceService } from '../src/intelligence/evidence.service';
import { AiService } from '../src/ai/ai.service';
import { Resume } from '../src/resumes/entities/resume.entity';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
import { CoverLetter } from '../src/cover-letters/entities/cover-letter.entity';
import { Interview } from '../src/interviews/entities/interview.entity';
import { MockSession } from '../src/mock/entities/mock-session.entity';
import { Application } from '../src/applications/entities/application.entity';
import { ApplicationEvent } from '../src/applications/entities/application-event.entity';
import { Opportunity } from '../src/opportunity/entities/opportunity.entity';
import { OpportunityEvaluation } from '../src/opportunity/entities/opportunity-evaluation.entity';
import { CareerAnalysisRecord } from '../src/career/entities/career-analysis.entity';
import type { UserIntelligence } from '../src/intelligence/evidence.types';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
};

describe('CoachContextService', () => {
  let service: CoachContextService;
  let evidenceMock: jest.Mocked<EvidenceService>;
  let aiMock: { completeStructured: jest.Mock };
  // 每类一个独立可配置的仓库 mock,按需在用例里改返回值。
  let repos: Record<string, RepoMock>;

  function makeRepo(): RepoMock {
    return {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
  }

  beforeEach(async () => {
    const mockEvidence = {
      gather: jest.fn(),
      formatForAI: jest.fn(),
      gatherForCompany: jest.fn(),
      getCompaniesOfInterest: jest.fn(),
    };
    aiMock = { completeStructured: jest.fn() };
    repos = {
      resume: makeRepo(),
      diagnosis: makeRepo(),
      coverLetter: makeRepo(),
      interview: makeRepo(),
      mockSession: makeRepo(),
      application: makeRepo(),
      applicationEvent: makeRepo(),
      opportunity: makeRepo(),
      opportunityEval: makeRepo(),
      career: makeRepo(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CoachContextService,
        { provide: EvidenceService, useValue: mockEvidence },
        { provide: AiService, useValue: aiMock },
        { provide: getRepositoryToken(Resume), useValue: repos.resume },
        { provide: getRepositoryToken(Diagnosis), useValue: repos.diagnosis },
        { provide: getRepositoryToken(CoverLetter), useValue: repos.coverLetter },
        { provide: getRepositoryToken(Interview), useValue: repos.interview },
        { provide: getRepositoryToken(MockSession), useValue: repos.mockSession },
        { provide: getRepositoryToken(Application), useValue: repos.application },
        {
          provide: getRepositoryToken(ApplicationEvent),
          useValue: repos.applicationEvent,
        },
        { provide: getRepositoryToken(Opportunity), useValue: repos.opportunity },
        {
          provide: getRepositoryToken(OpportunityEvaluation),
          useValue: repos.opportunityEval,
        },
        { provide: getRepositoryToken(CareerAnalysisRecord), useValue: repos.career },
      ],
    }).compile();

    service = module.get(CoachContextService);
    evidenceMock = module.get(EvidenceService);
  });

  function mockIntelligence(
    overrides?: Partial<UserIntelligence>,
  ): UserIntelligence {
    return {
      user_id: 'test-user',
      gathered_at: new Date().toISOString(),
      resume: null,
      skills: [],
      target_roles: [],
      applications: [],
      application_companies: [],
      opportunities: [],
      opportunity_companies: [],
      diagnoses: [],
      diagnosis_patterns: { hit: [], miss: [] },
      tasks: [],
      feed_relevant: [],
      salary_context: [],
      interviews: [],
      interview_patterns: {
        companies_interviewed: [],
        average_score: null,
        recent_questions: [],
        knowledge_gaps: [],
      },
      mock_sessions: [],
      mock_readiness: {
        sessions_count: 0,
        latest_grade: null,
        average_score: null,
        weak_areas: [],
      },
      cover_letters: [],
      cover_letter_targets: {
        companies: [],
        roles: [],
      },
      companies_of_interest: [],
      has_resume: false,
      has_applications: false,
      has_opportunities: false,
      ...overrides,
    };
  }

  it('calls evidence.gather with userId', async () => {
    const intel = mockIntelligence();
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('formatted context');

    await service.buildContext('user-123');
    expect(evidenceMock.gather).toHaveBeenCalledWith('user-123');
  });

  it('calls evidence.formatForAI with gathered intelligence', async () => {
    const intel = mockIntelligence({ has_resume: true });
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('formatted');

    await service.buildContext('user-123');
    expect(evidenceMock.formatForAI).toHaveBeenCalledWith(intel);
  });

  it('returns formatForAI result', async () => {
    evidenceMock.gather.mockResolvedValue(mockIntelligence());
    evidenceMock.formatForAI.mockReturnValue('## 用户求职档案\n...');

    const result = await service.buildContext('user-123');
    expect(result).toBe('## 用户求职档案\n...');
  });

  it('handles empty data user without throwing', async () => {
    evidenceMock.gather.mockResolvedValue(mockIntelligence());
    evidenceMock.formatForAI.mockReturnValue('');

    const result = await service.buildContext('empty-user');
    expect(result).toBe('');
    expect(evidenceMock.gather).toHaveBeenCalledWith('empty-user');
  });

  it('handles user with full data', async () => {
    const intel = mockIntelligence({
      has_resume: true,
      has_applications: true,
      has_opportunities: true,
      application_companies: ['字节跳动', '腾讯'],
      companies_of_interest: ['字节跳动', '腾讯', '阿里'],
    });
    evidenceMock.gather.mockResolvedValue(intel);
    evidenceMock.formatForAI.mockReturnValue('full context with data');

    const result = await service.buildContext('rich-user');
    expect(result).toBe('full context with data');
  });

  it('propagates gather errors', async () => {
    evidenceMock.gather.mockRejectedValue(new Error('DB down'));

    await expect(service.buildContext('user-x')).rejects.toThrow('DB down');
  });

  // ── 按需取数选择器:扩 5 类已落库模块全文 ────────────────────────────────
  describe('loadReferencedProducts — 已落库模块全文', () => {
    const UID = 'user-1';

    // 让 gatherSelectorCatalog 对某一类返回一条目录项(其余类空)。
    function seedCatalog(kind: string, row: Record<string, unknown>): void {
      repos[kind].find.mockResolvedValue([row]);
    }
    // 选择器返回指定 need。
    function selectorReturns(need: { kind: string; id: string }[]): void {
      aiMock.completeStructured.mockResolvedValue({ need });
    }

    it('全空目录时不调用选择器直接返回空串', async () => {
      const result = await service.loadReferencedProducts(UID, '看看我的历史');
      expect(result).toBe('');
      expect(aiMock.completeStructured).not.toHaveBeenCalled();
    });

    it('命中 interview 加载面试复盘全文', async () => {
      seedCatalog('interview', {
        id: 'iv-1',
        company: '字节跳动',
        role: '后端',
        round: '一面',
        overall_grade: 'B',
      });
      selectorReturns([{ kind: 'interview', id: 'iv-1' }]);
      repos.interview.findOne.mockResolvedValue({
        id: 'iv-1',
        company: '字节跳动',
        role: '后端',
        round: '一面',
        overall_grade: 'B',
        overall_note: '基础扎实',
        scores: [{ name: '算法', score: 7 }],
        questions: [
          {
            question: '讲讲 HashMap',
            tone: 'good',
            coach_assessment: '答得清楚',
            better_answer: '',
            knowledge_gaps: ['并发'],
          },
        ],
        prediction: { next_round_topics: [], summary: '二面考系统设计' },
        transcript: '面试官:你好',
      });

      const result = await service.loadReferencedProducts(UID, '我上次面试如何');
      expect(result).toContain('面试复盘全文 id=iv-1');
      expect(result).toContain('字节跳动');
      expect(result).toContain('讲讲 HashMap');
      expect(result).toContain('二面考系统设计');
      // owner 二次校验:findOne 必须带 user_id 条件。
      expect(repos.interview.findOne).toHaveBeenCalledWith({
        where: { id: 'iv-1', user_id: UID },
      });
    });

    it('命中 mock_session 加载模拟面试全文', async () => {
      seedCatalog('mockSession', { id: 'mk-1', company: '腾讯', role: '产品' });
      selectorReturns([{ kind: 'mock_session', id: 'mk-1' }]);
      repos.mockSession.findOne.mockResolvedValue({
        id: 'mk-1',
        company: '腾讯',
        role: '产品',
        status: 'completed',
        evaluation: {
          overall_score: 82,
          overall_grade: 'A',
          strengths: ['表达清晰'],
          weaknesses: ['案例偏少'],
          summary: '整体不错',
        },
        questions: [{ n: 1, type: '行为', topic: '团队', difficulty: '中', question: '讲个项目', hint: '' }],
        answers: [{ n: 1, answer: '我做过X', score: 8, feedback: '可量化', filler_count: 0 }],
      });

      const result = await service.loadReferencedProducts(UID, '我上次模拟面试表现怎么样');
      expect(result).toContain('模拟面试全文 id=mk-1');
      expect(result).toContain('82分 A');
      expect(result).toContain('讲个项目');
      expect(result).toContain('可量化');
    });

    it('命中 application 加载投递全文含阶段时间线', async () => {
      seedCatalog('application', {
        id: 'ap-1',
        company: '美团',
        role: '运营',
        stage: 'interview',
      });
      selectorReturns([{ kind: 'application', id: 'ap-1' }]);
      repos.application.findOne.mockResolvedValue({
        id: 'ap-1',
        company: '美团',
        role: '运营',
        stage: 'interview',
        location: '北京',
        deadline: null,
        salary_range: '15-20k',
        notes: '内推',
      });
      repos.applicationEvent.find.mockResolvedValue([
        {
          from_stage: 'applied',
          to_stage: 'interview',
          note: '约一面',
          created_at: new Date('2026-06-01'),
        },
      ]);

      const result = await service.loadReferencedProducts(UID, '我投美团进展');
      expect(result).toContain('投递全文 id=ap-1');
      expect(result).toContain('美团');
      expect(result).toContain('applied→interview');
      expect(result).toContain('约一面');
    });

    it('命中 opportunity 加载机会评估全文', async () => {
      seedCatalog('opportunity', {
        id: 'op-1',
        company: '小红书',
        role: '增长',
        status: 'evaluated',
      });
      selectorReturns([{ kind: 'opportunity', id: 'op-1' }]);
      repos.opportunity.findOne.mockResolvedValue({
        id: 'op-1',
        company: '小红书',
        role: '增长',
        status: 'evaluated',
        location: '上海',
      });
      repos.opportunityEval.findOne.mockResolvedValue({
        match_score: 0.8,
        value_score: 0.7,
        credibility_score: 0.9,
        overall_score: 0.78,
        recommendation: 'recommend',
        confidence: 'high',
        strengths: ['方向匹配'],
        gaps: ['缺增长经验'],
        risk_flags: [],
        next_actions: ['补案例'],
      });

      const result = await service.loadReferencedProducts(UID, '小红书那个机会怎么样');
      expect(result).toContain('机会评估全文 id=op-1');
      expect(result).toContain('匹配度：80%');
      expect(result).toContain('recommend');
      expect(result).toContain('补案例');
    });

    it('命中 career 加载职业地图全文', async () => {
      seedCatalog('career', { id: 'cr-1', created_at: new Date('2026-06-10') });
      selectorReturns([{ kind: 'career', id: 'cr-1' }]);
      repos.career.findOne.mockResolvedValue({
        id: 'cr-1',
        created_at: new Date('2026-06-10'),
        result_json: {
          paths: [
            {
              title: '产品经理',
              fit_pct: 85,
              description: '适合做C端产品',
              skills: ['用户研究', '数据分析'],
              alumni_count: null,
            },
          ],
          skill_audit: [
            {
              name: '数据分析',
              current: 6,
              needed: 8,
              ok: false,
              category: 'general',
              evidenceFound: '简历提及SQL',
              scoreSource: 'ai',
              aiScore: 6,
              gapScore: 6,
            },
          ],
        },
      });

      const result = await service.loadReferencedProducts(UID, '帮我回顾下我的职业地图');
      expect(result).toContain('职业地图全文 id=cr-1');
      expect(result).toContain('产品经理');
      expect(result).toContain('适合做C端产品');
      expect(result).toContain('数据分析');
      expect(result).toContain('简历提及SQL');
    });

    // FG-3:能力盘点须区分"自评分 vs 平台分",防 chat 把用户主观自评当平台权威结论复述。
    it('FG-3:自评技能标【用户自评】+非平台声明;平台技能标【平台评分】', async () => {
      seedCatalog('career', { id: 'cr-fg3', created_at: new Date('2026-06-12') });
      selectorReturns([{ kind: 'career', id: 'cr-fg3' }]);
      repos.career.findOne.mockResolvedValue({
        id: 'cr-fg3',
        created_at: new Date('2026-06-12'),
        result_json: {
          paths: [
            {
              title: '后端工程师',
              fit_pct: 80,
              description: '匹配后端方向',
              skills: ['Java'],
              alumni_count: null,
            },
          ],
          skill_audit: [
            // 用户自评:虚高 9 分,平台原评仅 4 分 → 必须标【用户自评】并声明非平台结论。
            {
              name: '架构设计',
              current: 9,
              needed: 7,
              ok: true,
              category: 'general',
              evidenceFound: '主导过系统拆分',
              scoreSource: 'self',
              aiScore: 4,
              gapScore: 4,
            },
            // 平台评分:正常 AI 来源 → 标【平台评分】。
            {
              name: 'MySQL',
              current: 6,
              needed: 6,
              ok: true,
              category: 'general',
              evidenceFound: '索引优化',
              scoreSource: 'ai',
              aiScore: 6,
              gapScore: 6,
            },
          ],
        },
      });

      const result = await service.loadReferencedProducts(UID, '回顾我的能力盘点');
      // 顶部语义说明:明确告诉 chat 区分两种分数来源。
      expect(result).toContain('用户自评');
      expect(result).toContain('不是平台评估结论');
      // 架构设计是自评 → 行内标【用户自评】+ 非平台结论 + 平台原评参考。
      expect(result).toContain('架构设计');
      expect(result).toMatch(/架构设计[^\n]*【用户自评】/);
      expect(result).toMatch(/架构设计[^\n]*非平台评估结论/);
      expect(result).toMatch(/架构设计[^\n]*平台原评 4 分/);
      // MySQL 是平台分 → 行内标【平台评分】,不得被标成自评。
      expect(result).toMatch(/MySQL[^\n]*【平台评分】/);
    });

    it('白名单过滤幻觉 id:目录之外的 id 不加载', async () => {
      seedCatalog('interview', {
        id: 'iv-real',
        company: 'A',
        role: 'B',
        round: '一面',
        overall_grade: 'B',
      });
      // 选择器返回一个目录里不存在的幻觉 id。
      selectorReturns([{ kind: 'interview', id: 'iv-hallucinated' }]);

      const result = await service.loadReferencedProducts(UID, '看面试');
      expect(result).toBe('');
      // 被白名单拦下,根本不会去 findOne 加载。
      expect(repos.interview.findOne).not.toHaveBeenCalled();
    });

    it('白名单过滤越权 kind:返回未知 kind 不加载', async () => {
      seedCatalog('interview', {
        id: 'iv-1',
        company: 'A',
        role: 'B',
        round: '一面',
        overall_grade: 'B',
      });
      selectorReturns([{ kind: 'salary', id: 'iv-1' }]);

      const result = await service.loadReferencedProducts(UID, '看薪资');
      expect(result).toBe('');
    });

    it('一次最多加载 3 份(MAX_LOAD 上限)', async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: `iv-${i}`,
        company: `C${i}`,
        role: 'R',
        round: '一面',
        overall_grade: 'B',
      }));
      repos.interview.find.mockResolvedValue(rows);
      selectorReturns(rows.map((r) => ({ kind: 'interview', id: r.id })));
      repos.interview.findOne.mockImplementation(({ where }) =>
        Promise.resolve({
          id: where.id,
          company: 'C',
          role: 'R',
          round: '一面',
          overall_grade: 'B',
          scores: [],
          questions: [],
        }),
      );

      await service.loadReferencedProducts(UID, '看所有面试');
      expect(repos.interview.findOne).toHaveBeenCalledTimes(3);
    });

    it('选择器抛错时静默降级返回空串', async () => {
      seedCatalog('career', { id: 'cr-1', created_at: new Date() });
      aiMock.completeStructured.mockRejectedValue(new Error('flash down'));

      const result = await service.loadReferencedProducts(UID, '看职业地图');
      expect(result).toBe('');
    });
  });

  // ── 长度截断 ─────────────────────────────────────────────────────────────
  describe('truncateText', () => {
    it('短文本原样返回', () => {
      expect(CoachContextService.truncateText('短文本')).toBe('短文本');
    });

    it('超 6000 字截断并追加提示', () => {
      const long = 'x'.repeat(7000);
      const out = CoachContextService.truncateText(long);
      expect(out.length).toBeLessThan(7000);
      expect(out).toContain('内容过长');
      expect(out.startsWith('x'.repeat(6000))).toBe(true);
    });
  });
});
