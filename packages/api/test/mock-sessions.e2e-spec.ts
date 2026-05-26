import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Mock Sessions (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  // Shared session ids created once to avoid multiple AI calls
  let sessionIdA: string;
  let sessionIdB: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'mock-test@coach.dev', 'Mock User');
    otherToken = await loginUser(app, 'mock-other@coach.dev', 'Mock Other');

    // Create two sessions upfront; AI question generation may timeout but sessions are always created
    const resA = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'ByteDance', role: 'Frontend Engineer', question_count: 2 })
      .timeout(60000);
    sessionIdA = resA.body.id;

    const resB = await request(app.getHttpServer())
      .post('/api/mock-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: 'Alibaba', role: 'Backend Engineer', question_count: 2 })
      .timeout(60000);
    sessionIdB = resB.body.id;
  }, 150000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/mock-sessions', () => {
    it('created sessions from beforeAll have id and expected fields', () => {
      expect(sessionIdA).toBeTruthy();
      expect(sessionIdB).toBeTruthy();
    });

    it('session body has correct structure (status, mode, user_id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/mock-sessions/${sessionIdA}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', sessionIdA);
      expect(res.body).toHaveProperty('status', 'in_progress');
      expect(res.body).toHaveProperty('user_id');
      expect(res.body.company).toBe('ByteDance');
      expect(res.body.role).toBe('Frontend Engineer');
    });

    it('creates session with minimal body → 201 with defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端开发工程师' })
        .timeout(60000);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.mode).toBe('text');
      expect(res.body.status).toBe('in_progress');
    }, 65000);

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/mock-sessions')
        .send({ company: 'Test', role: 'Engineer' });

      expect(res.status).toBe(401);
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
