import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Opportunity (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    app = await createTestApp();
    token = await loginUser(app, 'opp1@coach.dev', 'Opp User One');
    otherToken = await loginUser(app, 'opp2@coach.dev', 'Opp User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  const validJdText =
    '我们正在招聘高级前端工程师，负责公司核心产品的前端架构设计与开发。要求3年以上React经验，熟悉TypeScript，有大型项目经验优先。薪资范围25-40K，14薪。工作地点北京朝阳区。';

  describe('POST /api/opportunities', () => {
    it('creates an opportunity with valid JD text (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.jd_text).toBe(validJdText);
      expect(res.body.status).toBe('draft');
      expect(res.body.user_id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
    });

    it('creates an opportunity with optional fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jd_text: validJdText,
          company: '字节跳动',
          role: '高级前端工程师',
          location: '北京',
          employment_type: 'fulltime',
          source_platform: 'boss直聘',
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe('字节跳动');
      expect(res.body.role).toBe('高级前端工程师');
      expect(res.body.location).toBe('北京');
      expect(res.body.employment_type).toBe('fulltime');
    });

    it('rejects missing jd_text (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects jd_text too short (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: '太短了' });

      expect(res.status).toBe(400);
    });

    it('rejects invalid source_url (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({
          jd_text: validJdText,
          source_url: 'not-a-valid-url',
        });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated create (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .send({ jd_text: validJdText });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/opportunities', () => {
    it('returns empty list for new user (200)', async () => {
      const freshToken = await loginUser(app, 'empty@coach.dev', 'Empty User');
      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${freshToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('returns user opportunities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].jd_text).toBeDefined();
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities?status=draft')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      for (const opp of res.body) {
        expect(opp.status).toBe('draft');
      }
    });

    it('rejects unauthenticated list (401)', async () => {
      const res = await request(app.getHttpServer()).get('/api/opportunities');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/opportunities/:id', () => {
    let oppId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText, company: 'DetailCo' });
      oppId = res.body.id;
    });

    it('returns detail with evaluations/evidences/actions arrays', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(oppId);
      expect(res.body.company).toBe('DetailCo');
      expect(Array.isArray(res.body.evaluations)).toBe(true);
      expect(Array.isArray(res.body.evidences)).toBe(true);
      expect(Array.isArray(res.body.actions)).toBe(true);
    });

    it('returns 404 for other user opportunity', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/opportunities/${oppId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/opportunities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/opportunities/:id', () => {
    let deleteId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      deleteId = res.body.id;
    });

    it('deletes own opportunity (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${deleteId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      // Verify it is gone
      const getRes = await request(app.getHttpServer())
        .get(`/api/opportunities/${deleteId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 for other user opportunity', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });

      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('rejects unauthenticated delete (401)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/opportunities/${deleteId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/opportunities/:id', () => {
    let patchId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/opportunities')
        .set('Authorization', `Bearer ${token}`)
        .send({ jd_text: validJdText });
      patchId = res.body.id;
    });

    it('updates status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/opportunities/${patchId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'tracked' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('tracked');
    });
  });
});
