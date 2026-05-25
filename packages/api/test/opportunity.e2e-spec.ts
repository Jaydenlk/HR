import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { request, loginUser } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Deterministic mock for AiService                                   */
/* ------------------------------------------------------------------ */
const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock response'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (toolName === 'parse_jd') {
      return Promise.resolve({
        company: '字节跳动',
        role: '后端开发',
        location: '北京',
        employment_type: 'fulltime',
        requirements: ['Go', 'MySQL'],
        responsibilities: ['后端开发'],
        salary_range: { min: 25000, max: 50000, months: 15 },
        experience_level: 'mid',
        team_info: '电商中台',
        parse_confidence: 'high',
      });
    }
    if (toolName === 'detect_risks') {
      return Promise.resolve({
        credibility_score: 0.9,
        risk_flags: [],
      });
    }
    if (toolName === 'evaluate_opportunity') {
      return Promise.resolve({
        match_score: 75,
        value_score: 80,
        strengths: ['技术栈匹配度高', 'Go 经验丰富', '团队稳定'],
        gaps: ['年限略不足', '缺少大规模系统经验'],
        next_actions: [
          { action_type: 'optimize_resume', title: '优化简历', reason: '突出Go经验', priority: 'high' },
          { action_type: 'research_company', title: '研究公司', reason: '了解电商中台业务', priority: 'medium' },
        ],
      });
    }
    return Promise.resolve({});
  }),
};

/* ------------------------------------------------------------------ */
/*  Helper: poll GET /:id until status is terminal                     */
/* ------------------------------------------------------------------ */
async function waitForEvaluation(
  app: INestApplication,
  token: string,
  oppId: string,
  maxWait = 10000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await request(app.getHttpServer())
      .get(`/api/opportunities/${oppId}`)
      .set('Authorization', `Bearer ${token}`);
    if (res.body.status === 'evaluated' || res.body.status === 'failed') {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Evaluation timed out after ${maxWait}ms`);
}

/* ================================================================== */
/*  Test suite                                                         */
/* ================================================================== */
describe('Opportunity (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

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

    token = await loginUser(app, 'opp1@coach.dev', 'Opp User One');
    otherToken = await loginUser(app, 'opp2@coach.dev', 'Opp User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  const validJdText =
    '我们正在招聘高级前端工程师，负责公司核心产品的前端架构设计与开发。要求3年以上React经验，熟悉TypeScript，有大型项目经验优先。薪资范围25-40K，14薪。工作地点北京朝阳区。';

  /* ================================================================ */
  /*  1. CRUD + Auth                                                   */
  /* ================================================================ */

  describe('POST /api/opportunities', () => {
    // #1
    it('creates an opportunity with valid JD text (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.jd_text).toBe(validJdText);
      expect(res.body.status).toBe('draft');
      expect(res.body.user_id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
    });

    // #2
    it('rejects missing jd_text (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    // #3
    it('rejects jd_text < 20 chars (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: '太短了' });

      expect(res.status).toBe(400);
    });

    // #4
    it('rejects invalid source_url (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText, source_url: 'not-a-valid-url' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/opportunities', () => {
    // #5
    it('returns empty list for fresh user (200)', async () => {
      const freshToken = await loginUser(app, 'empty@coach.dev', 'Empty User');
      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    // #6
    it('returns user opportunities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].jd_text).toBeDefined();
    });

    // #7
    it('filters by status=draft', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities?status=draft')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const opp of res.body) {
        expect(opp.status).toBe('draft');
      }
    });
  });

  describe('GET /api/opportunities/:id', () => {
    let oppId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText, company: 'DetailCo' });
      oppId = res.body.id;
    });

    // #8
    it('returns detail with evaluations/evidences/actions arrays', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(oppId);
      expect(res.body.company).toBe('DetailCo');
      expect(Array.isArray(res.body.evaluations)).toBe(true);
      expect(Array.isArray(res.body.evidences)).toBe(true);
      expect(Array.isArray(res.body.actions)).toBe(true);
    });

    // #9
    it('returns 404 for other user opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/opportunities/:id', () => {
    let deleteId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      deleteId = res.body.id;
    });

    // #10
    it('deletes own opportunity (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${deleteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const getRes = await request(app.getHttpServer())
        .get(`/api/opportunities/${deleteId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    // #11
    it('returns 404 when other user tries to delete', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });

  // #12
  describe('Auth guard — all endpoints reject without token (401)', () => {
    it('POST /opportunities', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .send({ jd_text: validJdText });
      expect(res.status).toBe(401);
    });

    it('GET /opportunities', async () => {
      const res = await request(app.getHttpServer()).get('/api/opportunities');
      expect(res.status).toBe(401);
    });

    it('GET /opportunities/:id', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/opportunities/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(401);
    });

    it('DELETE /opportunities/:id', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/api/opportunities/00000000-0000-0000-0000-000000000000',
      );
      expect(res.status).toBe(401);
    });

    it('POST /opportunities/:id/evaluate', async () => {
      const res = await request(app.getHttpServer()).post(
        '/api/opportunities/00000000-0000-0000-0000-000000000000/evaluate',
      );
      expect(res.status).toBe(401);
    });

    it('POST /opportunities/:id/track', async () => {
      const res = await request(app.getHttpServer()).post(
        '/api/opportunities/00000000-0000-0000-0000-000000000000/track',
      );
      expect(res.status).toBe(401);
    });

    it('POST /opportunities/:id/tasks', async () => {
      const res = await request(app.getHttpServer()).post(
        '/api/opportunities/00000000-0000-0000-0000-000000000000/tasks',
      );
      expect(res.status).toBe(401);
    });

    it('GET /opportunities/:id/chat-context', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/opportunities/00000000-0000-0000-0000-000000000000/chat-context',
      );
      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  2. Evaluation status verification                                */
  /* ================================================================ */

  describe('Evaluation lifecycle', () => {
    let evalOppId: string;
    let evaluatedBody: Record<string, unknown>;

    beforeAll(async () => {
      mockAiService.completeStructured.mockClear();

      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      evalOppId = res.body.id;
      evaluatedBody = await waitForEvaluation(app, token, evalOppId);
    });

    // #13
    it('status becomes "evaluated" (not "failed")', () => {
      expect(evaluatedBody.status).toBe('evaluated');
    });

    // #14
    it('has evaluations array with scores', () => {
      const evaluations = evaluatedBody.evaluations as Record<string, unknown>[];
      expect(Array.isArray(evaluations)).toBe(true);
      expect(evaluations.length).toBeGreaterThanOrEqual(1);
      const latest = evaluations[0];
      expect(latest.match_score).toBeDefined();
      expect(latest.value_score).toBeDefined();
      expect(latest.overall_score).toBeDefined();
    });

    // #15
    it('has evidences array', () => {
      const evidences = evaluatedBody.evidences as Record<string, unknown>[];
      expect(Array.isArray(evidences)).toBe(true);
      expect(evidences.length).toBeGreaterThanOrEqual(1);
    });

    // #16
    it('has actions array', () => {
      const actions = evaluatedBody.actions as Record<string, unknown>[];
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThanOrEqual(1);
    });

    // #17
    it('evaluation scores are in 0-100 range', () => {
      const evaluations = evaluatedBody.evaluations as Record<string, number>[];
      const latest = evaluations[0];
      expect(latest.match_score).toBeGreaterThanOrEqual(0);
      expect(latest.match_score).toBeLessThanOrEqual(100);
      expect(latest.value_score).toBeGreaterThanOrEqual(0);
      expect(latest.value_score).toBeLessThanOrEqual(100);
      expect(latest.overall_score).toBeGreaterThanOrEqual(0);
      expect(latest.overall_score).toBeLessThanOrEqual(100);
    });

    // #18
    it('evaluation has recommendation field', () => {
      const evaluations = evaluatedBody.evaluations as Record<string, unknown>[];
      const latest = evaluations[0];
      expect(latest.recommendation).toBeDefined();
      expect(
        ['strongly_recommend', 'recommend', 'neutral', 'cautious', 'not_recommend'],
      ).toContain(latest.recommendation);
    });

    // #19
    it('POST /:id/evaluate re-triggers evaluation, returns "evaluating"', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/opportunities/${evalOppId}/evaluate`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('evaluating');

      // Wait for re-evaluation to complete
      const after = await waitForEvaluation(app, token, evalOppId);
      expect(after.status).toBe('evaluated');
    });
  });

  /* ================================================================ */
  /*  3. Integration endpoints                                         */
  /* ================================================================ */

  describe('Integration — track, tasks, chat-context', () => {
    let integOppId: string;

    beforeAll(async () => {
      // Create + wait for evaluation to complete
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      integOppId = res.body.id;
      await waitForEvaluation(app, token, integOppId);
    });

    // #20
    it('POST /:id/track creates Application, sets status "tracked"', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/opportunities/${integOppId}/track`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined(); // application id
      expect(res.body.stage).toBe('wishlist');
    });

    // #21
    it('POST /:id/track on already tracked returns 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/opportunities/${integOppId}/track`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    // #22
    it('POST /:id/track on non-evaluated opportunity fails (400)', async () => {
      // Create an opportunity and wait for evaluation to finish
      const freshRes = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      await waitForEvaluation(app, token, freshRes.body.id);

      // Set status back to 'draft' via PATCH so it is NOT 'evaluated'
      await request(app.getHttpServer())
        .patch(`/api/opportunities/${freshRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'draft' });

      const trackRes = await request(app.getHttpServer())
        .post(`/api/opportunities/${freshRes.body.id}/track`)
        .set('Authorization', `Bearer ${token}`);

      expect(trackRes.status).toBe(400);
    });

    // #23
    it('GET /:id after track has application_id set', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${integOppId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.application_id).toBeDefined();
      expect(res.body.status).toBe('tracked');
    });

    // #24
    it('POST /:id/tasks creates DailyTask records', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/opportunities/${integOppId}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      // Mock returns 2 actions, so we expect up to 2 tasks
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].title).toBeDefined();
      expect(res.body[0].status).toBe('todo');
    });

    // #25
    it('GET /:id/chat-context returns system_message string', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${integOppId}/chat-context`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.system_message).toBe('string');
      expect(res.body.system_message.length).toBeGreaterThan(0);
    });

    // #26
    it('GET /:id/chat-context for non-evaluated opportunity handles gracefully', async () => {
      // Create a new opp that we do NOT wait for evaluation
      const freshRes = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      // Wait briefly so it finishes or is still in-flight; either way the endpoint should not crash
      const ctxRes = await request(app.getHttpServer())
        .get(`/api/opportunities/${freshRes.body.id}/chat-context`)
        .set('Authorization', `Bearer ${token}`);

      expect(ctxRes.status).toBe(200);
      expect(typeof ctxRes.body.system_message).toBe('string');
    });
  });

  /* ================================================================ */
  /*  4. Cross-user isolation                                          */
  /* ================================================================ */

  describe('Cross-user isolation', () => {
    let userAOppId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      userAOppId = res.body.id;
      await waitForEvaluation(app, token, userAOppId);
    });

    // #27
    it('User B cannot see User A opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${userAOppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    // #28
    it('User B cannot track User A opportunity', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/opportunities/${userAOppId}/track`)
        .set('Authorization', `Bearer ${otherToken}`);

      // Integration service looks up by (id, user_id) — should 404
      expect(res.status).toBe(404);
    });

    // #29
    it('User B cannot delete User A opportunity', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${userAOppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
