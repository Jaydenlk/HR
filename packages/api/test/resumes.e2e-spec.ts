import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Resumes (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = './test-resumes-e2e.db';
    app = await createTestApp();
    token = await loginUser(app, 'resumes-owner@coach.dev', 'Resume Owner');
    otherToken = await loginUser(app, 'resumes-other@coach.dev', 'Other User');
  });

  afterAll(async () => {
    await app.close();
    // Clean up test DB file
    try {
      const fs = await import('fs/promises');
      await fs.unlink('./test-resumes-e2e.db');
    } catch {
      // ignore if file doesn't exist
    }
  });

  // ─── Authentication guard tests ───────────────────────────────────────────

  describe('All routes without JWT → 401', () => {
    it('POST /api/resumes without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .send({ title: 'Unauthorized', raw_text: 'some text' });
      expect(res.status).toBe(401);
    });

    it('GET /api/resumes without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/resumes');
      expect(res.status).toBe(401);
    });

    it('GET /api/resumes/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/resumes/some-id');
      expect(res.status).toBe(401);
    });

    it('PATCH /api/resumes/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/resumes/some-id')
        .send({ title: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/resumes/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).delete('/api/resumes/some-id');
      expect(res.status).toBe(401);
    });

    it('POST /api/resumes/:id/versions without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes/some-id/versions')
        .send({ raw_text: 'v2', change_note: 'update' });
      expect(res.status).toBe(401);
    });

    it('GET /api/resumes/:id/versions without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/resumes/some-id/versions');
      expect(res.status).toBe(401);
    });
  });

  // ─── CRUD tests ───────────────────────────────────────────────────────────

  describe('POST /api/resumes', () => {
    it('with title and raw_text → 201 + resume object', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My First Resume', raw_text: 'Experienced software engineer...' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'My First Resume',
        raw_text: 'Experienced software engineer...',
        is_primary: false,
      });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('user_id');
    });

    it('with is_primary=true → sets primary, unsets previous primary', async () => {
      // Create initial primary resume
      const first = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Primary Resume A', raw_text: 'text a', is_primary: true });
      expect(first.status).toBe(201);
      expect(first.body.is_primary).toBe(true);

      // Create second primary resume — should demote the first
      const second = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Primary Resume B', raw_text: 'text b', is_primary: true });
      expect(second.status).toBe(201);
      expect(second.body.is_primary).toBe(true);

      // Verify first resume is no longer primary
      const firstCheck = await request(app.getHttpServer())
        .get(`/api/resumes/${first.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(firstCheck.status).toBe(200);
      expect(firstCheck.body.is_primary).toBe(false);
    });

    it('missing title → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'no title here' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/resumes', () => {
    it('returns 200 + array of own resumes', async () => {
      const uniqueToken = await loginUser(app, 'list-test@coach.dev', 'List Test User');

      // Create two resumes
      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`)
        .send({ title: 'List Resume 1', raw_text: 'content 1' });

      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`)
        .send({ title: 'List Resume 2', raw_text: 'content 2' });

      const res = await request(app.getHttpServer())
        .get('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('List Resume 1');
      expect(titles).toContain('List Resume 2');
    });

    it('does not return other users\' resumes', async () => {
      const userAToken = await loginUser(app, 'isolation-a@coach.dev', 'Isolation A');
      const userBToken = await loginUser(app, 'isolation-b@coach.dev', 'Isolation B');

      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'User A Private Resume', raw_text: 'private' });

      const res = await request(app.getHttpServer())
        .get('/api/resumes')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).not.toContain('User A Private Resume');
    });
  });

  describe('GET /api/resumes/:id', () => {
    let resumeId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Detail Resume', raw_text: 'resume detail content' });
      resumeId = res.body.id;
    });

    it('returns 200 + detail with versions and diagnoses relations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(resumeId);
      expect(res.body.title).toBe('Detail Resume');
      expect(Array.isArray(res.body.versions)).toBe(true);
      expect(Array.isArray(res.body.diagnoses)).toBe(true);
    });

    it('returns 404 when accessed by a different user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent resume id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/resumes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/resumes/:id', () => {
    let resumeId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Patch Target', raw_text: 'original text' });
      resumeId = res.body.id;
    });

    it('updates title → 200 + updated resume', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.id).toBe(resumeId);
    });

    it('returns 404 when patching another user\'s resume', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/resumes/:id', () => {
    it('deletes resume → 200', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'To Be Deleted', raw_text: 'delete me' });
      expect(createRes.status).toBe(201);
      const id = createRes.body.id;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/resumes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).toBe(200);

      // Confirm it's gone
      const getRes = await request(app.getHttpServer())
        .get(`/api/resumes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when deleting another user\'s resume', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Other Cannot Delete', raw_text: 'protected' });
      const id = createRes.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/resumes/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/resumes/:id/versions', () => {
    it('creates a new version → 201 + version object', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Versioned Resume A', raw_text: 'version 1 content' });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'version 2 content', change_note: 'Added new experience' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.resume_id).toBe(resumeId);
      expect(res.body.version_num).toBe(1);
      expect(res.body.raw_text).toBe('version 2 content');
      expect(res.body.change_note).toBe('Added new experience');
    });

    it('creates sequential version numbers', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Versioned Resume B', raw_text: 'original content' });
      const resumeId = createRes.body.id;

      const res1 = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'v2 content', change_note: 'First edit' });
      expect(res1.status).toBe(201);
      expect(res1.body.version_num).toBe(1);

      const res2 = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'v3 content', change_note: 'Second edit' });
      expect(res2.status).toBe(201);
      expect(res2.body.version_num).toBe(2);
    });

    it('returns 404 when creating version for another user\'s resume', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Versioned Resume C', raw_text: 'protected content' });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ raw_text: 'hacked version', change_note: 'hack' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/resumes/:id/versions', () => {
    it('returns 200 + version history array (newest first)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'History Resume', raw_text: 'original' });
      const resumeId = createRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'history v2', change_note: 'First edit' });

      await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: 'history v3', change_note: 'Second edit' });

      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Ordered by version_num DESC (newest first)
      expect(res.body[0].version_num).toBeGreaterThan(res.body[1].version_num);
    });

    it('returns 404 when fetching versions of another user\'s resume', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'History Resume 2', raw_text: 'protected' });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
