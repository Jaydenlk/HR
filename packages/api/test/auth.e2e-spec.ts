import { INestApplication } from '@nestjs/common';
import { createTestApp, request } from './test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = './test-auth-e2e.db';
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    try {
      const fs = await import('fs/promises');
      await fs.unlink('./test-auth-e2e.db');
    } catch {
      // ignore if file doesn't exist
    }
  });

  describe('POST /api/auth/login', () => {
    it('valid invite code → 201 + JWT + user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'auth1@coach.dev', name: 'Auth User One', invite_code: 'COACH2026' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({
        email: 'auth1@coach.dev',
        name: 'Auth User One',
      });
      expect(res.body.user).toHaveProperty('id');
    });

    it('invalid invite code → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'auth2@coach.dev', name: 'Auth User Two', invite_code: 'WRONGCODE' });

      expect(res.status).toBe(401);
    });

    it('missing email → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ name: 'Auth User Three', invite_code: 'COACH2026' });

      expect(res.status).toBe(400);
    });

    it('missing name → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'auth4@coach.dev', invite_code: 'COACH2026' });

      expect(res.status).toBe(400);
    });

    it('missing invite_code → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'auth5@coach.dev', name: 'Auth User Five' });

      expect(res.status).toBe(400);
    });

    it('invalid email format → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', name: 'Auth User Six', invite_code: 'COACH2026' });

      expect(res.status).toBe(400);
    });

    it('same email twice → returns same user (idempotent)', async () => {
      const payload = { email: 'idempotent@coach.dev', name: 'Idempotent User', invite_code: 'COACH2026' };

      const res1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(payload);

      const res2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(payload);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.user.id).toBe(res2.body.user.id);
      expect(res1.body.user.email).toBe(res2.body.user.email);
    });

    it('same email different case twice → same user.id (case-insensitive)', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'CaseTest@Coach.Dev', name: 'Case User', invite_code: 'COACH2026' });

      const res2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'casetest@coach.dev', name: 'Case User', invite_code: 'COACH2026' });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      // email normalized to lowercase regardless of input casing
      expect(res1.body.user.email).toBe('casetest@coach.dev');
      expect(res2.body.user.email).toBe('casetest@coach.dev');
      // both casings resolve to the SAME user record
      expect(res1.body.user.id).toBe(res2.body.user.id);
    });

    it('second login with new name → response + /auth/me return updated name', async () => {
      const email = 'rename@coach.dev';

      const first = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, name: 'Original Name', invite_code: 'COACH2026' });

      expect(first.status).toBe(201);
      expect(first.body.user.name).toBe('Original Name');

      const second = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, name: 'Updated Name', invite_code: 'COACH2026' });

      expect(second.status).toBe(201);
      // same user, but login response reflects the new name
      expect(second.body.user.id).toBe(first.body.user.id);
      expect(second.body.user.name).toBe('Updated Name');

      // /auth/me with the fresh token also returns the new name
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${second.body.access_token}`);

      expect(me.status).toBe(200);
      expect(me.body.id).toBe(first.body.user.id);
      expect(me.body.name).toBe('Updated Name');
    });

    it('invite_code with leading/trailing whitespace → 201 (trimmed before validation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'whitespace@coach.dev', name: 'Whitespace User', invite_code: '  COACH2026  ' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.user).toMatchObject({
        email: 'whitespace@coach.dev',
        name: 'Whitespace User',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'me@coach.dev', name: 'Me User', invite_code: 'COACH2026' });
      token = res.body.access_token;
    });

    it('valid JWT → 200 + user data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        email: 'me@coach.dev',
        name: 'Me User',
      });
      expect(res.body).toHaveProperty('id');
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('with invalid JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this.is.not.valid');

      expect(res.status).toBe(401);
    });
  });
});
