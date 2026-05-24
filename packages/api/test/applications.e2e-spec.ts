import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Applications (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'apps1@coach.dev', 'Apps User One');
    otherToken = await loginUser(app, 'apps2@coach.dev', 'Apps User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /api/applications ───────────────────────────────────────────────

  describe('POST /api/applications', () => {
    it('valid data → 201 + application object', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp', role: 'Engineer' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.company).toBe('Acme Corp');
      expect(res.body.role).toBe('Engineer');
      expect(res.body.stage).toBe('wishlist');
    });

    it('valid data with stage → 201 + correct stage', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Beta Inc', role: 'PM', stage: 'applied' });

      expect(res.status).toBe(201);
      expect(res.body.stage).toBe('applied');
    });

    it('missing company → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'Engineer' });

      expect(res.status).toBe(400);
    });

    it('missing role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp' });

      expect(res.status).toBe(400);
    });

    it('invalid stage → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme Corp', role: 'Engineer', stage: 'not_a_stage' });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .send({ company: 'Acme Corp', role: 'Engineer' });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/applications ────────────────────────────────────────────────

  describe('GET /api/applications', () => {
    it('returns 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/applications/stats ─────────────────────────────────────────

  describe('GET /api/applications/stats', () => {
    it('returns 200 + stats object with all stage keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('wishlist');
      expect(res.body).toHaveProperty('applied');
      expect(res.body).toHaveProperty('interview');
      expect(res.body).toHaveProperty('final');
      expect(res.body).toHaveProperty('offer');
      expect(res.body).toHaveProperty('rejected');
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/stats');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET/PATCH/DELETE /api/applications/:id ──────────────────────────────

  describe('GET/PATCH/DELETE /api/applications/:id', () => {
    let appId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Target Co', role: 'Developer', stage: 'wishlist' });
      appId = res.body.id;
    });

    it('GET :id → 200 with events array', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(appId);
      expect(res.body).toHaveProperty('events');
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('PATCH :id change stage → 200 + updated stage', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage: 'applied' });

      expect(res.status).toBe(200);
      expect(res.body.stage).toBe('applied');
    });

    it('PATCH :id change stage → creates ApplicationEvent', async () => {
      // First move to interview
      await request(app.getHttpServer())
        .patch(`/api/applications/${appId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ stage: 'interview' });

      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/events`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Should have at least 2 events: initial creation + stage change(s)
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // The latest event should reflect the interview transition
      const stageEvents = res.body.filter((e: { to_stage: string }) => e.to_stage === 'interview');
      expect(stageEvents.length).toBeGreaterThanOrEqual(1);
    });

    it('GET :id/events → returns transition history', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${appId}/events`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty('to_stage');
      expect(res.body[0]).toHaveProperty('application_id');
    });

    it('DELETE :id → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Delete Me', role: 'Temp Role' });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/applications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).toBe(200);

      // Confirm deleted
      const getRes = await request(app.getHttpServer())
        .get(`/api/applications/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });

    it('GET with non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Cross-user isolation ─────────────────────────────────────────────────

  describe('Cross-user access', () => {
    let ownerAppId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Private Corp', role: 'Secret Role' });
      ownerAppId = res.body.id;
    });

    it('other user cannot GET owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('other user cannot PATCH owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ stage: 'applied' });

      expect(res.status).toBe(404);
    });

    it('other user cannot DELETE owner application → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/applications/${ownerAppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('GET /applications only returns own applications', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.map((a: { id: string }) => a.id);
      expect(ids).not.toContain(ownerAppId);
    });
  });
});
