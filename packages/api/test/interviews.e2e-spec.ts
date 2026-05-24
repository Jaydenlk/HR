import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Interviews (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'interviews-test@coach.dev', 'Interview User');
    otherToken = await loginUser(app, 'interviews-other@coach.dev', 'Interview Other');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/interviews', () => {
    it('creates interview with valid round → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          round: '技术一面',
          company: 'Acme Corp',
          role: 'Software Engineer',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('round', '技术一面');
      expect(res.body).toHaveProperty('user_id');
    });

    it('creates interview with only required round field → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: 'HR面' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.round).toBe('HR面');
    });

    it('creates interview with all optional fields → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          round: '终面',
          company: 'BigTech',
          role: 'Product Manager',
          interview_at: '2025-06-01',
          duration_min: 60,
          interviewer: 'Zhang San',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.company).toBe('BigTech');
      expect(res.body.role).toBe('Product Manager');
      expect(res.body.duration_min).toBe(60);
    });

    it('missing round → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Acme', role: 'Engineer' });

      expect(res.status).toBe(400);
    });

    it('empty round string → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '' });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .send({ round: '一面' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/interviews', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '列表测试面' });
    });

    it('returns array of interviews → 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('only returns current user interviews', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interviews')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interviews');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/interviews/:id', () => {
    let interviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '详情测试面', company: 'TestCo' });
      interviewId = res.body.id;
    });

    it('returns interview by id → 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', interviewId);
      expect(res.body.company).toBe('TestCo');
    });

    it('cross-user access → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('non-existent id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interviews/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/interviews/:id', () => {
    let interviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '更新测试面' });
      interviewId = res.body.id;
    });

    it('updates interview fields → 200', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Updated Corp', role: 'Senior Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.company).toBe('Updated Corp');
      expect(res.body.role).toBe('Senior Engineer');
    });

    it('updates round field → 200 with new value', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '终面更新' });

      expect(res.status).toBe(200);
      expect(res.body.round).toBe('终面更新');
    });

    it('cross-user update → 404', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ company: 'Hacked' });

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${interviewId}`)
        .send({ company: 'No Auth' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/interviews/:id/analyze', () => {
    let interviewNoTranscriptId: string;

    beforeAll(async () => {
      const noTranscript = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '无记录面' });
      interviewNoTranscriptId = noTranscript.body.id;
    });

    it('analyze without transcript → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/interviews/${interviewNoTranscriptId}/analyze`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('cross-user analyze on own resource → 404', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/interviews/${interviewNoTranscriptId}/analyze`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/interviews/${interviewNoTranscriptId}/analyze`);

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/interviews/:id', () => {
    let interviewId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '删除测试面' });
      interviewId = res.body.id;
    });

    it('deletes own interview → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('deleted interview no longer accessible → 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/interviews/${interviewId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('cross-user delete → 404', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '跨用户删除测试' });
      const id = create.body.id;

      const res = await request(app.getHttpServer())
        .delete(`/api/interviews/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/interviews/some-id');

      expect(res.status).toBe(401);
    });
  });
});
