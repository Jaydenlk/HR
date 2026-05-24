import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Overview (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'overview-test@coach.dev', 'Overview User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('GET /api/overview without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/overview');
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/overview ────────────────────────────────────────────────────

  describe('GET /api/overview', () => {
    let body: Record<string, unknown>;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .get('/api/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      body = res.body as Record<string, unknown>;
    });

    it('returns 200 with a valid dashboard structure', () => {
      expect(body).toBeDefined();
    });

    it('has top-level keys: funnel, interviews, resumes, activity', () => {
      expect(body).toHaveProperty('funnel');
      expect(body).toHaveProperty('interviews');
      expect(body).toHaveProperty('resumes');
      expect(body).toHaveProperty('activity');
    });

    // ── funnel ──────────────────────────────────────────────────────────────

    it('funnel contains all required stage keys', () => {
      const funnel = body.funnel as Record<string, unknown>;
      const requiredStages = ['wishlist', 'applied', 'interview', 'final', 'offer', 'rejected'];
      for (const stage of requiredStages) {
        expect(funnel).toHaveProperty(stage);
        expect(typeof funnel[stage]).toBe('number');
      }
    });

    it('funnel values are non-negative integers', () => {
      const funnel = body.funnel as Record<string, number>;
      for (const val of Object.values(funnel)) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });

    // ── interviews ──────────────────────────────────────────────────────────

    it('interviews has total, avgGrade, recentGrades', () => {
      const interviews = body.interviews as Record<string, unknown>;
      expect(interviews).toHaveProperty('total');
      expect(interviews).toHaveProperty('avgGrade');
      expect(interviews).toHaveProperty('recentGrades');
    });

    it('interviews.total is a non-negative number', () => {
      const interviews = body.interviews as { total: number };
      expect(typeof interviews.total).toBe('number');
      expect(interviews.total).toBeGreaterThanOrEqual(0);
    });

    it('interviews.avgGrade is null or a string', () => {
      const interviews = body.interviews as { avgGrade: unknown };
      expect(interviews.avgGrade === null || typeof interviews.avgGrade === 'string').toBe(true);
    });

    it('interviews.recentGrades is an array', () => {
      const interviews = body.interviews as { recentGrades: unknown[] };
      expect(Array.isArray(interviews.recentGrades)).toBe(true);
    });

    // ── resumes ─────────────────────────────────────────────────────────────

    it('resumes has total, primaryTitle, latestDiagnosisScore', () => {
      const resumes = body.resumes as Record<string, unknown>;
      expect(resumes).toHaveProperty('total');
      expect(resumes).toHaveProperty('primaryTitle');
      expect(resumes).toHaveProperty('latestDiagnosisScore');
    });

    it('resumes.total is a non-negative number', () => {
      const resumes = body.resumes as { total: number };
      expect(typeof resumes.total).toBe('number');
      expect(resumes.total).toBeGreaterThanOrEqual(0);
    });

    it('resumes.primaryTitle is null or a string', () => {
      const resumes = body.resumes as { primaryTitle: unknown };
      expect(resumes.primaryTitle === null || typeof resumes.primaryTitle === 'string').toBe(true);
    });

    it('resumes.latestDiagnosisScore is null or a number', () => {
      const resumes = body.resumes as { latestDiagnosisScore: unknown };
      expect(
        resumes.latestDiagnosisScore === null ||
        typeof resumes.latestDiagnosisScore === 'number',
      ).toBe(true);
    });

    // ── activity ────────────────────────────────────────────────────────────

    it('activity has totalDiagnoses and totalConversations', () => {
      const activity = body.activity as Record<string, unknown>;
      expect(activity).toHaveProperty('totalDiagnoses');
      expect(activity).toHaveProperty('totalConversations');
    });

    it('activity counts are non-negative numbers', () => {
      const activity = body.activity as { totalDiagnoses: number; totalConversations: number };
      expect(typeof activity.totalDiagnoses).toBe('number');
      expect(activity.totalDiagnoses).toBeGreaterThanOrEqual(0);
      expect(typeof activity.totalConversations).toBe('number');
      expect(activity.totalConversations).toBeGreaterThanOrEqual(0);
    });
  });
});
