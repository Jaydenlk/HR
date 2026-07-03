import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { CompanyRegistryService } from '../src/feed/company-registry.service';
import { CompanyResearch } from '../src/company-research/entities/company-research.entity';
import { normalizeCompanyName } from '../src/company-research/normalize';
import { request, loginUser } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Deterministic mock for AiService                                   */
/*                                                                     */
/*  completeStructured is dispatched by toolName:                      */
/*    - generate_questions  → fixed 2-question list                    */
/*    - evaluate_answer      → fixed per-answer score                  */
/*    - generate_evaluation  → fixed overall evaluation (with a unique */
/*                             marker so we can prove idempotency does  */
/*                             NOT re-run the LLM on a 2nd /complete)   */
/*                                                                     */
/*  Failure injection: tests flip `failTool` to make the matching      */
/*  toolName throw ServiceUnavailableException — exactly what the real  */
/*  AiService throws when primary+fallback both fail. The controller    */
/*  must surface this as HTTP 503.                                      */
/* ------------------------------------------------------------------ */

// Set per-test to force a specific toolName to fail (emulates AI outage).
let failTool: string | null = null;
// Counts how many times the evaluation LLM call actually ran (idempotency proof).
let evaluationCallCount = 0;
// Captures last call args for prompt-content assertions.
let lastGenerateCall: { system: string; prompt: string } | null = null;

const QUESTIONS = [
  { n: 1, type: '技术', topic: 'JavaScript 闭包', difficulty: '中等', question: '请解释 JavaScript 中的闭包及其常见使用场景。', hint: '从作用域链和变量捕获角度思考。' },
  { n: 2, type: '行为', topic: '团队协作', difficulty: '简单', question: '讲一个你与团队意见不合并最终解决的经历。', hint: '用 STAR 方法组织你的回答。' },
];

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock response'),
  completeStructured: jest.fn().mockImplementation((args: { toolName: string; system: string; prompt: string }) => {
    const { toolName } = args;
    if (failTool === toolName) {
      // 模拟真实 AiService 主备通道均失败时抛出的 503。
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }

    if (toolName === 'generate_questions') {
      lastGenerateCall = { system: args.system, prompt: args.prompt };
      return Promise.resolve({ questions: QUESTIONS });
    }

    if (toolName === 'evaluate_answer') {
      return Promise.resolve({ score: 72, feedback: '回答结构清晰，可补充更多量化结果。' });
    }

    if (toolName === 'generate_evaluation') {
      evaluationCallCount += 1;
      return Promise.resolve({
        overall_score: 70,
        overall_grade: 'B',
        strengths: ['技术概念掌握扎实', '表达逻辑清晰', '能结合实际场景'],
        weaknesses: ['深度可进一步加强', '缺少量化的项目成果'],
        // 每次真实调用 LLM 都会刷新这个标记;若幂等短路生效,第二次 /complete
        // 不会改变这个值,从而证明没有重跑 LLM。
        summary: `综合评估生成于第 ${evaluationCallCount} 次 LLM 调用。`,
      });
    }

    return Promise.resolve({});
  }),
};

describe('Mock Sessions (e2e, mocked AI)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  // Shared session ids created once with the deterministic mock.
  let sessionIdA: string;
  let sessionIdB: string;

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

    token = await loginUser(app, 'mock-test@coach.dev', 'Mock User');
    otherToken = await loginUser(app, 'mock-other@coach.dev', 'Mock Other');

    failTool = null;
    const resA = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'ByteDance', role: 'Frontend Engineer', question_count: 2 });
    sessionIdA = resA.body.id;

    const resB = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Alibaba', role: 'Backend Engineer', question_count: 2 });
    sessionIdB = resB.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    failTool = null;
  });

  describe('POST /api/mock-sessions', () => {
    it('created sessions from beforeAll have id and questions', () => {
      expect(sessionIdA).toBeTruthy();
      expect(sessionIdB).toBeTruthy();
    });

    it('session body has correct structure (status, mode, user_id, questions)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', sessionIdA);
      expect(res.body).toHaveProperty('status', 'in_progress');
      expect(res.body).toHaveProperty('user_id');
      expect(res.body.company).toBe('ByteDance');
      expect(res.body.role).toBe('Frontend Engineer');
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBe(2);
    });

    it('creates session with minimal body → 201 with defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端开发工程师' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.mode).toBe('text');
      expect(res.body.status).toBe('in_progress');
    });

    it('missing role → 400 (role required for meaningful questions)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '字节跳动' });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .send({ company: 'Test', role: 'Engineer' });

      expect(res.status).toBe(401);
    });

    // 修复点 ③:出题失败不得留下僵尸会话。
    it('question generation failure → 503 AND no zombie session persisted', async () => {
      const beforeRes = await request(app.getHttpServer())
        .get('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`);
      const countBefore = beforeRes.body.length;

      failTool = 'generate_questions';
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'ZombieCo', role: '全栈工程师', question_count: 2 });

      expect(res.status).toBe(503);
      expect(res.body.id).toBeUndefined();

      // 列表数量未增长 → 没有写入无题的 in_progress 会话。
      failTool = null;
      const afterRes = await request(app.getHttpServer())
        .get('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`);
      expect(afterRes.body.length).toBe(countBefore);
      const zombie = (afterRes.body as Array<{ company: string }>).find(
        (s) => s.company === 'ZombieCo',
      );
      expect(zombie).toBeUndefined();
    });
  });

  describe('GET /api/mock-sessions', () => {
    it('returns array of mock sessions → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('only returns sessions belonging to current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/mock-sessions/:id', () => {
    it('returns mock session by id → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdB}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', sessionIdB);
      expect(res.body.company).toBe('Alibaba');
    });

    it('cross-user access → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/mock-sessions/:id/answer', () => {
    it('submits answer → 201 with AI score and feedback', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: '闭包是函数与其词法作用域的组合，常用于数据私有化和回调中保留状态。' });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.answers)).toBe(true);
      expect(res.body.answers.length).toBe(1);
      expect(res.body.answers[0].n).toBe(1);
      expect(res.body.answers[0].score).toBe(72);
      expect(res.body.answers[0].feedback).toContain('结构清晰');
    });

    // 修复点 ②:评分 AI 失败应 503,而不是静默落库 score:0。
    it('AI evaluation failure → 503 AND answer NOT persisted (no silent score:0)', async () => {
      const beforeRes = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);
      const answersBefore = beforeRes.body.answers.length;

      failTool = 'evaluate_answer';
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: '这是第二题的回答：我会先倾听对方观点，再用数据对齐目标。' });

      expect(res.status).toBe(503);

      failTool = null;
      const afterRes = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);
      // 失败的作答未落库:answers 数量不变,且没有 score:0 的占位行。
      expect(afterRes.body.answers.length).toBe(answersBefore);
      expect(
        (afterRes.body.answers as Array<{ score: number }>).some((a) => a.score === 0),
      ).toBe(false);
    });

    it('empty answer → 400 (validation)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: '' });

      expect(res.status).toBe(400);
    });

    it('cross-user answer → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/answer`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ answer: '尝试越权作答。' });

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/answer`)
        .send({ answer: '无 token 作答。' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/mock-sessions/:id/complete', () => {
    // P0-2 不变量:completed 永不与 null evaluation 共存。
    // AI 失败时不得留半完成态(status=completed, evaluation=null)。
    it('P0-2 invariant: AI failure → 503, session remains in_progress with null evaluation (no half-complete state)', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'HalfCo', role: '测试工程师', question_count: 2 });
      const halfId = created.body.id;
      expect(halfId).toBeTruthy();

      failTool = 'generate_evaluation';
      const failRes = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${halfId}/complete`)
        .set('Authorization', `Bearer ${token}`);

      // complete() 调用本身应以 503 失败。
      expect(failRes.status).toBe(503);

      // 关键断言:503 后 GET 会话,状态机不得停留在半完成态。
      failTool = null;
      const snap = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${halfId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(snap.status).toBe(200);
      // completed 永不与 null evaluation 共存:AI 失败时 status 应保持 in_progress。
      expect(snap.body.status).toBe('in_progress');
      expect(snap.body.evaluation).toBeNull();
    });

    // 修复点 ②:综合评估 AI 失败应 503,而不是返回 200 + 空 evaluation。
    it('AI evaluation failure → 503 AND session not left with empty evaluation', async () => {
      // 用一个独立会话,避免污染 sessionIdA 的幂等测试。
      const created = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'FailCo', role: '数据工程师', question_count: 2 });
      const failId = created.body.id;

      failTool = 'generate_evaluation';
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${failId}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(503);

      // 503 后允许重试恢复:再次 complete(AI 恢复)应成功生成评估。
      failTool = null;
      const retry = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${failId}/complete`)
        .set('Authorization', `Bearer ${token}`);
      expect(retry.status).toBe(201);
      expect(retry.body.status).toBe('completed');
      expect(retry.body.evaluation).toBeTruthy();
      expect(retry.body.evaluation.overall_grade).toBe('B');
    });

    it('completes session → 201 with evaluation and completed status', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('completed');
      expect(res.body.evaluation).toBeTruthy();
      expect(res.body.evaluation.overall_score).toBe(70);
      expect(res.body.evaluation.overall_grade).toBe('B');
      expect(Array.isArray(res.body.evaluation.strengths)).toBe(true);
      expect(res.body.total_filler_count).toBeDefined();
    });

    // 修复点 ①:第二次 /complete 应幂等——返回相同的已有 evaluation,
    // 200/201 成功而非 409,且不重跑 LLM 覆盖原结果。
    it('second /complete is idempotent → same evaluation, no LLM re-run', async () => {
      const first = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);
      const firstSummary = first.body.evaluation.summary;
      const firstGrade = first.body.evaluation.overall_grade;

      // 即使此刻 AI 出题/评估通道"故障",幂等短路也不应触碰 LLM,故请求仍成功。
      failTool = 'generate_evaluation';
      const second = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/complete`)
        .set('Authorization', `Bearer ${token}`);
      failTool = null;

      // 成功(非 409),且评估与首次完全一致。
      expect(second.status).toBe(201);
      expect(second.body.status).toBe('completed');
      expect(second.body.evaluation).toBeTruthy();
      expect(second.body.evaluation.summary).toBe(firstSummary);
      expect(second.body.evaluation.overall_grade).toBe(firstGrade);

      // GET 再次确认持久化结果未被覆盖。
      const third = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);
      expect(third.body.evaluation.summary).toBe(firstSummary);
    });

    it('cross-user complete → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/complete`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/mock-sessions/${sessionIdA}/complete`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/mock-sessions/:id', () => {
    it('deletes own session → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/mock-sessions/${sessionIdB}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('deleted session no longer accessible → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdB}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('cross-user delete → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/mock-sessions/some-id');

      expect(res.status).toBe(401);
    });
  });

  // ── 公司库双路径 + 防编造 prompt 断言 ──────────────────────────────────────
  describe('Company registry lookup & anti-hallucination prompts', () => {
    beforeEach(() => {
      lastGenerateCall = null;
      failTool = null;
    });

    it('known company (字节跳动 alias 抖音) → prompt contains library context + 库内背景注入', async () => {
      await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '抖音', role: '产品经理', question_count: 2 });

      expect(lastGenerateCall).not.toBeNull();
      // 库内背景标注
      expect(lastGenerateCall!.prompt).toContain('以下公司背景来自本站公司库');
      // 防编造约束（命中路径）
      expect(lastGenerateCall!.system).toContain('不得编造该公司的具体面试流程');
      // 不含通用路径指令
      expect(lastGenerateCall!.prompt).not.toContain('通用面试+JD驱动');
    });

    it('unknown company (量子翻斗云科技) → prompt uses generic mode, anti-hallucination forbids company impersonation', async () => {
      await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '量子翻斗云科技', role: '后端开发工程师', question_count: 2 });

      expect(lastGenerateCall).not.toBeNull();
      // 通用出题策略指令
      expect(lastGenerateCall!.prompt).toContain('通用校招面试 + JD/岗位驱动出题');
      // 不含库内背景注入
      expect(lastGenerateCall!.prompt).not.toContain('以下公司背景来自本站公司库');
      // 防编造约束（未命中路径）：不得伪装了解该公司
      expect(lastGenerateCall!.system).toContain('不得伪装了解该公司');
    });

    it('evaluate_answer system prompt contains anti-hallucination rule', async () => {
      // 需要有已创建的会话，借用 sessionIdA（已答过 1 题，仍有第 2 题待答）
      // 先创建一个新会话来提交答案以检查评分 system prompt
      const newSession = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '量子翻斗云科技', role: '测试工程师', question_count: 2 });
      const newId = newSession.body.id;

      // 捕获 evaluate_answer 的 system 参数
      let evalSystem = '';
      const originalImpl = mockAiService.completeStructured.getMockImplementation();
      mockAiService.completeStructured.mockImplementation((args: { toolName: string; system: string; prompt: string }) => {
        if (args.toolName === 'evaluate_answer') evalSystem = args.system;
        return originalImpl!(args);
      });

      await request(app.getHttpServer())
        .post(`/api/mock-sessions/${newId}/answer`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answer: '我会使用分层测试策略，覆盖单元/集成/e2e三层。' });

      // 恢复原始 mock
      mockAiService.completeStructured.mockImplementation(originalImpl!);

      expect(evalSystem).toContain('不得引用候选人回答中未提及的任何信息');
      expect(evalSystem).toContain('不得编造该公司的内部评价标准');
    });

    it('generate_evaluation system prompt contains anti-hallucination rule', async () => {
      // 创建并完成一个会话来检查总评 system prompt
      const newSession = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '量子翻斗云科技', role: '运营专员', question_count: 2 });
      const newId = newSession.body.id;

      let evalSystem = '';
      const originalImpl = mockAiService.completeStructured.getMockImplementation();
      mockAiService.completeStructured.mockImplementation((args: { toolName: string; system: string; prompt: string }) => {
        if (args.toolName === 'generate_evaluation') evalSystem = args.system;
        return originalImpl!(args);
      });

      await request(app.getHttpServer())
        .post(`/api/mock-sessions/${newId}/complete`)
        .set('Authorization', `Bearer ${token}`);

      mockAiService.completeStructured.mockImplementation(originalImpl!);

      expect(evalSystem).toContain('不得编造目标公司的内部录用标准');
      expect(evalSystem).toContain('不得伪装了解该公司的具体面试流程');
    });
  });

  // ── GET /api/mock-sessions/company-check ────────────────────────────────
  describe('GET /api/mock-sessions/company-check', () => {
    it('known company → { company_known: true, candidates: [] }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/company-check?name=字节跳动')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(true);
      // T6 破坏性变更:search_candidate(单候选) → candidates[](多候选数组)
      expect(res.body.candidates).toEqual([]);
      expect(res.body).not.toHaveProperty('search_candidate');
    });

    it('known company alias → { company_known: true }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/company-check?name=抖音')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(true);
    });

    // T6 两路查询并发发起真实博查调用(通用 + include=tianyancha.com,qcc.com 强召回),
    // 比改造前单路查询耗时更长,沿用本文件其余真实外呼用例的 30s 超时惯例。
    it('unknown company → { company_known: false, candidates: 数组(全量,不截断) }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/company-check?name=量子翻斗云科技')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(false);
      expect(Array.isArray(res.body.candidates)).toBe(true);
    }, 30000);

    it('empty name → { company_known: false, candidates: [] }', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/company-check?name=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(false);
      expect(res.body.candidates).toEqual([]);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/mock-sessions/company-check?name=字节跳动');

      expect(res.status).toBe(401);
    });

    it('name exceeds 100 chars → 400 (input validation)', async () => {
      const longName = 'A'.repeat(101);
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/company-check?name=${longName}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('name exactly 100 chars → 200 (within limit)', async () => {
      const normalName = 'B'.repeat(100);
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/company-check?name=${normalName}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('company_known', false);
    }, 30000);
  });

  // ── company-check 缓存与 force 强制刷新(审计修复1:缓存候选被拒可触发新搜索) ──
  describe('GET /api/mock-sessions/company-check — 缓存与 force 强制刷新', () => {
    const SEED_NAME = '翻斗云缓存种子公司甲乙丙';

    beforeAll(async () => {
      // 直接种一行新鲜缓存(生造名,真实搜索不可能召回同名候选),使缓存/强刷路径可确定性验证。
      const repo = app.get<Repository<CompanyResearch>>(getRepositoryToken(CompanyResearch));
      await repo.save(
        repo.create({
          canonical_name: normalizeCompanyName(SEED_NAME),
          display_name: SEED_NAME,
          summary: 'SEEDED-CACHE-ROW',
          source_url: 'https://seed.example.com/x',
          source_domain: 'seed.example.com',
          retrieved_at: new Date(),
          raw: null,
        }),
      );
    });

    it('缓存命中 → from_cache=true 且候选即缓存行', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/company-check?name=${encodeURIComponent(SEED_NAME)}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(false);
      expect(res.body.from_cache).toBe(true);
      expect(res.body.candidates).toHaveLength(1);
      expect(res.body.candidates[0].summary).toBe('SEEDED-CACHE-ROW');
    });

    // force=true 走两路真实博查(网络),沿用真实外呼用例 30s 超时惯例。
    it('force=true → 绕过缓存走真实新搜索:from_cache 不置位,不回吐缓存种子行', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/company-check?name=${encodeURIComponent(SEED_NAME)}&force=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_known).toBe(false);
      // 强制刷新结果不是缓存:哪怕缓存行仍新鲜也不返回它
      expect(res.body.from_cache).toBeUndefined();
      expect(Array.isArray(res.body.candidates)).toBe(true);
      const summaries = (res.body.candidates as { summary: string }[]).map((c) => c.summary);
      expect(summaries).not.toContain('SEEDED-CACHE-ROW');
    }, 30000);

    it('force 参数非法值 → 400(布尔校验)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/company-check?name=${encodeURIComponent(SEED_NAME)}&force=banana`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });
});
