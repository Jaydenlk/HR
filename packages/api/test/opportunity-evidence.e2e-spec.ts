import { Test } from '@nestjs/testing';
import { OpportunityEvaluatorService } from '../src/opportunity/opportunity-evaluator.service';
import { EvidenceService } from '../src/intelligence/evidence.service';
import { OpportunityService } from '../src/opportunity/opportunity.service';
import { OpportunityParserService } from '../src/opportunity/opportunity-parser.service';
import { OpportunityRiskService } from '../src/opportunity/opportunity-risk.service';
import { AiService } from '../src/ai/ai.service';
import type { UserIntelligence, Evidence } from '../src/intelligence/evidence.types';
import type { ParsedJd } from '../src/opportunity/opportunity-parser.service';
import type { RiskAssessment } from '../src/opportunity/opportunity-risk.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    source_type: 'resume',
    source_id: 'src-1',
    confidence: 'high',
    freshness: 'current',
    summary: 'Test evidence',
    structured: {},
    reason: 'Test reason',
    observed_at: new Date().toISOString(),
    weight: 1.0,
    ...overrides,
  };
}

function makeIntelligence(overrides: Partial<UserIntelligence> = {}): UserIntelligence {
  return {
    user_id: 'user-test',
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
    companies_of_interest: [],
    has_resume: false,
    has_applications: false,
    has_opportunities: false,
    ...overrides,
  };
}

function makeParsedJd(overrides: Partial<ParsedJd> = {}): ParsedJd {
  return {
    company: 'Acme Corp',
    role: '后端工程师',
    location: '北京',
    employment_type: 'fulltime',
    requirements: ['3年以上Go经验', 'MySQL熟练'],
    responsibilities: ['负责后端系统开发', '参与技术方案评审'],
    salary_range: { min: 20000, max: 35000, months: 14 },
    experience_level: '中级',
    team_info: null,
    parse_confidence: 'high',
    ...overrides,
  };
}

function makeRiskAssessment(overrides: Partial<RiskAssessment> = {}): RiskAssessment {
  return {
    credibility_score: 0.9,
    risk_flags: [],
    ...overrides,
  };
}

function makeEvaluationResult() {
  return {
    match_score: 75,
    value_score: 80,
    strengths: ['技术栈匹配', '薪资有竞争力'],
    gaps: ['K8s经验不足'],
    next_actions: [
      { action_type: 'apply', title: '立即投递', reason: '匹配度高' },
    ],
  };
}

function makeOpportunity(userId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'opp-1',
    user_id: userId,
    company: 'Acme Corp',
    role: '后端工程师',
    jd_text: '我们正在寻找一位后端工程师，需要3年以上Go经验，熟悉MySQL。',
    status: 'draft',
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('OpportunityEvaluator Evidence integration', () => {
  let evaluator: OpportunityEvaluatorService;
  let evidenceMock: jest.Mocked<EvidenceService>;

  const mockOppService = {
    findOne: jest.fn(),
    setStatus: jest.fn(),
    updateOpportunity: jest.fn(),
    saveEvaluation: jest.fn(),
    saveEvidence: jest.fn(),
    saveActions: jest.fn(),
  };
  const mockParser = { parse: jest.fn() };
  const mockRisk = { detectRisks: jest.fn() };
  const mockAi = { completeStructured: jest.fn() };
  const mockEvidence = {
    gather: jest.fn(),
    formatForAI: jest.fn(),
    gatherForCompany: jest.fn(),
    getCompaniesOfInterest: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OpportunityEvaluatorService,
        { provide: OpportunityService, useValue: mockOppService },
        { provide: OpportunityParserService, useValue: mockParser },
        { provide: OpportunityRiskService, useValue: mockRisk },
        { provide: AiService, useValue: mockAi },
        { provide: EvidenceService, useValue: mockEvidence },
      ],
    }).compile();

    evaluator = module.get(OpportunityEvaluatorService);
    evidenceMock = module.get(EvidenceService) as jest.Mocked<EvidenceService>;
    jest.clearAllMocks();
  });

  function setupFullMocks(userId = 'user-test') {
    mockOppService.findOne.mockResolvedValue(makeOpportunity(userId));
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());
    mockEvidence.gather.mockResolvedValue(makeIntelligence({ user_id: userId }));
  }

  // ── 1. EvidenceService.gather is called during evaluate ──────────────────

  it('calls evidence.gather with the correct userId during evaluate', async () => {
    const userId = 'user-abc';
    mockOppService.findOne.mockResolvedValue(makeOpportunity(userId));
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockParser.parse.mockResolvedValue(makeParsedJd());
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());
    mockEvidence.gather.mockResolvedValue(makeIntelligence({ user_id: userId }));

    await evaluator.evaluate('opp-1', userId);

    expect(evidenceMock.gather).toHaveBeenCalledTimes(1);
    expect(evidenceMock.gather).toHaveBeenCalledWith(userId);
  });

  // ── 2. No-resume user: evaluate succeeds, AI prompt contains 尚未上传简历 ──

  it('proceeds without resume and AI system prompt contains 尚未上传简历', async () => {
    const userId = 'user-no-resume';
    mockOppService.findOne.mockResolvedValue(makeOpportunity(userId));
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockParser.parse.mockResolvedValue(makeParsedJd());
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());
    mockEvidence.gather.mockResolvedValue(
      makeIntelligence({ user_id: userId, has_resume: false, skills: [] }),
    );

    await evaluator.evaluate('opp-1', userId);

    // Verify evaluate completed (setStatus called with 'evaluated')
    expect(mockOppService.setStatus).toHaveBeenCalledWith('opp-1', userId, 'evaluated');

    // Inspect the system prompt passed to AI
    const aiCall = mockAi.completeStructured.mock.calls[0][0] as { system: string };
    expect(aiCall.system).toContain('尚未上传简历');
  });

  // ── 3. User with skills and diagnoses: context passed to AI ──────────────

  it('passes user skills and diagnosis_patterns into AI evaluation context', async () => {
    const userId = 'user-with-skills';
    mockOppService.findOne.mockResolvedValue(makeOpportunity(userId));
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockParser.parse.mockResolvedValue(makeParsedJd());
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());

    const diagnoseEvidence = makeEvidence({
      source_type: 'diagnosis',
      source_id: 'diag-1',
      weight: 0.7,
    });
    mockEvidence.gather.mockResolvedValue(
      makeIntelligence({
        user_id: userId,
        has_resume: true,
        skills: ['Go', 'Java'],
        diagnoses: [diagnoseEvidence],
        diagnosis_patterns: { hit: ['MySQL'], miss: ['K8s'] },
      }),
    );

    await evaluator.evaluate('opp-1', userId);

    const aiCall = mockAi.completeStructured.mock.calls[0][0] as { system: string };
    expect(aiCall.system).toContain('Go');
    expect(aiCall.system).toContain('Java');
    expect(aiCall.system).toContain('MySQL');
    expect(aiCall.system).toContain('K8s');
  });

  // ── 4. Company-specific feed evidence included in context ────────────────

  it('includes company-specific feed evidence in the AI evaluation context', async () => {
    const userId = 'user-with-feed';
    const jd = makeParsedJd({ company: 'ByteDance' });

    mockOppService.findOne.mockResolvedValue(
      makeOpportunity(userId, { company: 'ByteDance', jd_text: 'ByteDance后端工程师JD' }),
    );
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockParser.parse.mockResolvedValue(jd);
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());

    const feedEvidence = makeEvidence({
      source_type: 'feed',
      source_id: 'feed-1',
      summary: '字节跳动技术面试包含算法题和系统设计',
      structured: { company: 'ByteDance' },
      weight: 0.6,
    });
    mockEvidence.gather.mockResolvedValue(
      makeIntelligence({
        user_id: userId,
        has_resume: false,
        feed_relevant: [feedEvidence],
      }),
    );

    await evaluator.evaluate('opp-1', userId);

    const aiCall = mockAi.completeStructured.mock.calls[0][0] as { system: string };
    expect(aiCall.system).toContain('字节跳动技术面试包含算法题和系统设计');
  });

  // ── 5. User isolation: different userIds get separate gather calls ────────

  it('calls evidence.gather with each userId independently across two evaluate calls', async () => {
    const userA = 'user-alpha';
    const userB = 'user-beta';

    mockOppService.findOne
      .mockResolvedValueOnce(makeOpportunity(userA, { id: 'opp-a' }))
      .mockResolvedValueOnce(makeOpportunity(userB, { id: 'opp-b' }));
    mockOppService.setStatus.mockResolvedValue(undefined);
    mockOppService.updateOpportunity.mockResolvedValue(undefined);
    mockOppService.saveEvaluation.mockResolvedValue(undefined);
    mockOppService.saveEvidence.mockResolvedValue(undefined);
    mockOppService.saveActions.mockResolvedValue(undefined);
    mockParser.parse.mockResolvedValue(makeParsedJd());
    mockRisk.detectRisks.mockResolvedValue(makeRiskAssessment());
    mockAi.completeStructured.mockResolvedValue(makeEvaluationResult());

    mockEvidence.gather
      .mockResolvedValueOnce(makeIntelligence({ user_id: userA }))
      .mockResolvedValueOnce(makeIntelligence({ user_id: userB }));

    await evaluator.evaluate('opp-a', userA);
    await evaluator.evaluate('opp-b', userB);

    expect(evidenceMock.gather).toHaveBeenCalledTimes(2);
    expect(evidenceMock.gather).toHaveBeenNthCalledWith(1, userA);
    expect(evidenceMock.gather).toHaveBeenNthCalledWith(2, userB);
  });

  it('same-company salary enters AI prompt, other-company salary does not', async () => {
    setupFullMocks();
    const intel = makeIntelligence({
      salary_context: [
        { source_type: 'salary', source_id: 's1', confidence: 'high', freshness: 'current', summary: 'ByteDance 后端 35K', structured: { company: 'ByteDance' }, reason: 'salary', observed_at: new Date().toISOString(), weight: 0.4 },
        { source_type: 'salary', source_id: 's2', confidence: 'high', freshness: 'current', summary: 'Tencent 后端 30K', structured: { company: 'Tencent' }, reason: 'salary', observed_at: new Date().toISOString(), weight: 0.4 },
      ],
    });
    mockEvidence.gather.mockResolvedValue(intel);
    mockParser.parse.mockResolvedValue(makeParsedJd({ company: 'ByteDance' }));

    await evaluator.evaluate('opp-salary', 'user-salary');

    const systemArg = mockAi.completeStructured.mock.calls[mockAi.completeStructured.mock.calls.length - 1][0].system;
    expect(systemArg).toContain('ByteDance 后端 35K');
    expect(systemArg).not.toContain('Tencent 后端 30K');
  });

  it('missing company salary saves low-confidence salary evidence', async () => {
    setupFullMocks();
    const intel = makeIntelligence({ salary_context: [] });
    mockEvidence.gather.mockResolvedValue(intel);

    await evaluator.evaluate('opp-no-salary', 'user-no-salary');

    const savedEvidence = mockOppService.saveEvidence.mock.calls[0][0];
    const salaryEvidence = savedEvidence.find((e: Record<string, unknown>) => e.kind === 'salary_data');
    expect(salaryEvidence).toBeDefined();
    expect(salaryEvidence.confidence).toBe('low');
    expect(salaryEvidence.title).toContain('薪资数据不足');
  });

  it('present company salary does NOT save salary_data evidence', async () => {
    setupFullMocks();
    const intel = makeIntelligence({
      salary_context: [
        { source_type: 'salary', source_id: 's1', confidence: 'high', freshness: 'current', summary: 'ByteDance 35K', structured: { company: 'ByteDance' }, reason: 'salary', observed_at: new Date().toISOString(), weight: 0.4 },
      ],
    });
    mockEvidence.gather.mockResolvedValue(intel);
    mockParser.parse.mockResolvedValue(makeParsedJd({ company: 'ByteDance' }));

    await evaluator.evaluate('opp-has-salary', 'user-has-salary');

    const savedEvidence = mockOppService.saveEvidence.mock.calls[0][0];
    const salaryEvidence = savedEvidence.find((e: Record<string, unknown>) => e.kind === 'salary_data');
    expect(salaryEvidence).toBeUndefined();
  });
});
