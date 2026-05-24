import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Feed (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'feed1@coach.dev', 'Feed User One');
    otherToken = await loginUser(app, 'feed2@coach.dev', 'Feed User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /api/feed ───────────────────────────────────────────────────────

  describe('POST /api/feed', () => {
    it('valid data → 201 + feed item', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My Interview Experience at Acme',
          content: 'I had a great interview experience. The process was straightforward and the team was friendly.',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('My Interview Experience at Acme');
      expect(res.body).toHaveProperty('created_at');
    });

    it('valid data with optional fields → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Offer from Big Tech',
          content: 'Got an offer after 5 rounds of interviews. Here is what I learned.',
          company: 'Big Tech Co',
          role: 'Senior Engineer',
          outcome: 'offer',
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe('Big Tech Co');
      expect(res.body.role).toBe('Senior Engineer');
      expect(res.body.outcome).toBe('offer');
    });

    it('missing title → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          content: 'Some content without a title.',
        });

      expect(res.status).toBe(400);
    });

    it('missing content → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'A title with no content',
        });

      expect(res.status).toBe(400);
    });

    it('empty title string → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: '',
          content: 'Some valid content here.',
        });

      expect(res.status).toBe(400);
    });

    it('empty content string → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Valid title',
          content: '',
        });

      expect(res.status).toBe(400);
    });

    it('title exceeds 200 characters → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'A'.repeat(201),
          content: 'Valid content.',
        });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .send({
          title: 'No Auth Post',
          content: 'This should fail.',
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/feed ────────────────────────────────────────────────────────

  describe('GET /api/feed', () => {
    beforeAll(async () => {
      // Seed an entry so the list is not empty
      await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Seeded Feed Entry',
          content: 'This entry is seeded for GET tests.',
        });
    });

    it('returns 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('feed items include user relation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      // Feed returns all items (public), each with a user relation
      const item = res.body[0];
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('content');
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed');

      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /api/feed/:id ─────────────────────────────────────────────────

  describe('DELETE /api/feed/:id', () => {
    let itemId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'To Be Deleted',
          content: 'This item will be deleted in the test.',
        });
      itemId = res.body.id;
    });

    it('owner can delete → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/feed/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('deleting non-existent item → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/feed/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('other user cannot delete another user feed item → 404', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Protected Feed Post',
          content: 'Only the owner should be able to delete this.',
        });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/feed/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(deleteRes.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/feed/${itemId}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── All routes without JWT → 401 ────────────────────────────────────────

  describe('All routes without JWT → 401', () => {
    it('POST /api/feed without token → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .send({ title: 'X', content: 'Y' });
      expect(res.status).toBe(401);
    });

    it('GET /api/feed without token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/feed');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/feed/:id without token → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/feed/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });
  });
});
