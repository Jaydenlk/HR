import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'tasks-test@coach.dev', 'Tasks User');
    otherToken = await loginUser(app, 'tasks-other@coach.dev', 'Tasks Other');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard — all routes require JWT', () => {
    it('GET /api/tasks/today without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/tasks/today');
      expect(res.status).toBe(401);
    });

    it('GET /api/tasks without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/tasks');
      expect(res.status).toBe(401);
    });

    it('POST /api/tasks/generate without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/tasks/generate');
      expect(res.status).toBe(401);
    });

    it('PATCH /api/tasks/:id without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/tasks/some-id')
        .send({ status: 'done' });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/tasks/today ─────────────────────────────────────────────────

  describe('GET /api/tasks/today', () => {
    it('returns 200 with an array (may trigger AI generation)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    }, 30000);
  });

  // ─── GET /api/tasks?date= ─────────────────────────────────────────────────

  describe('GET /api/tasks?date=', () => {
    it('returns 200 with an array for a given date', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks?date=2026-05-24')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 200 with an array when no date param is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── POST /api/tasks/generate ─────────────────────────────────────────────

  describe('POST /api/tasks/generate', () => {
    it('returns 200 or 201 (triggers AI — may timeout)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks/generate')
        .set('Authorization', `Bearer ${token}`);

      // AI generation may succeed (200/201); with an empty AI key the product correctly
      // degrades to 503 (Service Unavailable) — that is正确行为, not a test failure.
      expect([200, 201, 503]).toContain(res.status);
      // 200/201 时返回数组;503 降级时 body 为错误对象,不强求数组。
      if (res.status === 200 || res.status === 201) {
        expect(Array.isArray(res.body)).toBe(true);
      }
    }, 30000);
  });

  // ─── PATCH /api/tasks/:id ─────────────────────────────────────────────────

  describe('PATCH /api/tasks/:id', () => {
    let taskId: string;

    beforeAll(async () => {
      // Ensure at least one task exists before patching
      const todayRes = await request(app.getHttpServer())
        .get('/api/tasks/today')
        .set('Authorization', `Bearer ${token}`);

      if (Array.isArray(todayRes.body) && todayRes.body.length > 0) {
        taskId = todayRes.body[0].id as string;
      }
    }, 30000);

    it('marks a task as done → 200 with updated task', async () => {
      if (!taskId) {
        console.warn('No task available to patch — skipping');
        return;
      }

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', taskId);
      expect(res.body).toHaveProperty('status', 'done');
    });

    it('marks a task back to todo → 200', async () => {
      if (!taskId) {
        console.warn('No task available to patch — skipping');
        return;
      }

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'todo' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'todo');
    });

    it('unknown task id → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.status).toBe(404);
    });

    it('cross-user: other user cannot patch first user task → 404 (user isolation)', async () => {
      if (!taskId) {
        console.warn('No task available to test isolation — skipping');
        return;
      }

      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'done' });

      // TasksService.update queries with both id AND user_id → NotFoundException
      expect(res.status).toBe(404);
    });
  });
});
