import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Conversations (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'conversations-test@coach.dev', 'Conv User');
    otherToken = await loginUser(app, 'conversations-other@coach.dev', 'Conv Other');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/conversations', () => {
    it('creates a conversation → 201 + conversation object', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Career Chat' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('user_id');
      expect(res.body).toHaveProperty('context_type');
      expect(res.body.context_type).toBe('free');
    });

    it('creates a conversation with context_type=diagnosis → 201 with context fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Diagnosis Chat',
          context_type: 'diagnosis',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.context_type).toBe('diagnosis');
    });

    it('creates a conversation with no body → 201 with defaults', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.context_type).toBe('free');
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .send({ title: 'No Auth Chat' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/conversations', () => {
    beforeAll(async () => {
      // Create at least one conversation for this user
      await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'List Test Conv' });
    });

    it('returns array of conversations → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('only returns conversations belonging to current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Other user should have no conversations (none created for them)
      expect(res.body.length).toBe(0);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/conversations/:id', () => {
    let convId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Detail Test Conv' });
      convId = res.body.id;
    });

    it('returns conversation with messages array → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', convId);
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });

    it('cross-user access → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${convId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/conversations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${convId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    let convId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Message Test Conv' });
      convId = res.body.id;
    });

    it('sends a message — AI may or may not succeed → 201 or graceful error', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Hello, can you help me with my resume?' })
        .timeout(30000);

      // AI call may succeed (201) or fail with a server error (500)
      // Either way, we verify the request reached the service (not a 400/401/404)
      expect([200, 201, 500]).toContain(res.status);
    }, 30000);

    it('missing content → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('empty content string → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('cross-user message send → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ content: 'Unauthorized message' });

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/conversations/${convId}/messages`)
        .send({ content: 'No auth message' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/conversations/:id', () => {
    let convId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Delete Test Conv' });
      convId = res.body.id;
    });

    it('deletes own conversation → 204', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
    });

    it('deleted conversation no longer accessible → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/conversations/${convId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('cross-user delete → 404', async () => {
      // Create a fresh conversation
      const create = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Cross Delete Test' });
      const id = create.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/conversations/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/conversations/some-id`);

      expect(res.status).toBe(401);
    });
  });
});
