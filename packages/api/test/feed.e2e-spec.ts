import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Feed (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    delete process.env.XHS_MCP_BASE_URL;
    app = await createTestApp();
    token = await loginUser(app, 'feed1@coach.dev', 'Feed User One');
    otherToken = await loginUser(app, 'feed2@coach.dev', 'Feed User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/feed', () => {
    it('creates a feed item with valid required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My Interview Experience at Acme',
          content: 'I had a great interview experience. The process was straightforward and the team was friendly.',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('My Interview Experience at Acme');
      expect(res.body.source_kind).toBe('ugc');
      expect(res.body.source_name).toBe('用户投稿');
      expect(res.body.created_at).toBeDefined();
    });

    it('creates a feed item with optional fields', async () => {
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
      expect(res.body.source_kind).toBe('ugc');
    });

    it('rejects missing title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Some content without a title.' });

      expect(res.status).toBe(400);
    });

    it('rejects missing content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A title with no content' });

      expect(res.status).toBe(400);
    });

    it('rejects empty title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '', content: 'Some valid content here.' });

      expect(res.status).toBe(400);
    });

    it('rejects empty content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Valid title', content: '' });

      expect(res.status).toBe(400);
    });

    it('rejects title over 200 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'A'.repeat(201),
          content: 'Valid content.',
        });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .send({ title: 'No Auth Post', content: 'This should fail.' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/feed', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Seeded Feed Entry',
          content: 'This entry is seeded for GET tests.',
          company: 'SeedCo',
        });
    });

    it('returns feed items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].title).toBeDefined();
      expect(res.body[0].content).toBeDefined();
    });

    it('filters by source_kind', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?source_kind=ugc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((item: { source_kind: string }) => item.source_kind === 'ugc')).toBe(true);
    });

    it('filters by company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?company=SeedCo')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((item: { company: string }) => item.company === 'SeedCo')).toBe(true);
    });

    it('rejects unsupported category filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?category=trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated list', async () => {
      const res = await request(app.getHttpServer()).get('/api/feed');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/feed/sources', () => {
    it('returns configured source registry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((source: { kind: string }) => source.kind === 'xhs')).toBe(true);
      expect(res.body.some((source: { kind: string }) => source.kind === 'nowcoder')).toBe(true);
    });

    it('marks missing configured sources as needs_config', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const xhs = res.body.find((source: { kind: string }) => source.kind === 'xhs');
      expect(xhs.status).toBe('needs_config');
    });

    it('rejects unauthenticated source registry access', async () => {
      const res = await request(app.getHttpServer()).get('/api/feed/sources');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/feed/import and GET /api/feed/runs', () => {
    it('records a failed run when an explicit source needs configuration', async () => {
      const sourcesRes = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${token}`);
      const xhs = sourcesRes.body.find((source: { kind: string }) => source.kind === 'xhs');

      const importRes = await request(app.getHttpServer())
        .post('/api/feed/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ source_id: xhs.id, keyword: '字节 面经' });

      expect(importRes.status).toBe(201);
      expect(importRes.body.runs).toHaveLength(1);
      expect(importRes.body.runs[0].status).toBe('failed');
      expect(importRes.body.runs[0].error_message).toContain('requires');
    });

    it('lists ingestion runs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/runs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('rejects unauthenticated import', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed/import')
        .send({});

      expect(res.status).toBe(401);
    });
  });

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

    it('lets owner delete a feed item', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/feed/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for missing item', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/feed/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('does not let another user delete the item', async () => {
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

    it('rejects unauthenticated delete', async () => {
      const res = await request(app.getHttpServer()).delete(`/api/feed/${itemId}`);

      expect(res.status).toBe(401);
    });
  });
});
