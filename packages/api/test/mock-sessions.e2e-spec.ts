import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
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

const QUESTIONS = [
  { n: 1, type: '技术', topic: 'JavaScript 闭包', difficulty: '中等', question: '请解释 JavaScript 中的闭包及其常见使用场景。', hint: '从作用域链和变量捕获角度思考。' },
  { n: 2, type: '行为', topic: '团队协作', difficulty: '简单', question: '讲一个你与团队意见不合并最终解决的经历。', hint: '用 STAR 方法组织你的回答。' },
];

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock response'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (failTool === toolName) {
      // 模拟真实 AiService 主备通道均失败时抛出的 503。
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入),请稍后重试。'),
      );
    }

    if (toolName === 'generate_questions') {
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
});
