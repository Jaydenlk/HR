import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Salary (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'salary1@coach.dev', 'Salary User One');
    otherToken = await loginUser(app, 'salary2@coach.dev', 'Salary User Two');
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /api/salary ─────────────────────────────────────────────────────

  describe('POST /api/salary', () => {
    it('valid data → 201 + salary entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Tech Corp',
          role: 'Software Engineer',
          base_salary: 150000,
          total_comp: 200000,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.company).toBe('Tech Corp');
      expect(res.body.role).toBe('Software Engineer');
      expect(res.body.base_salary).toBe(150000);
      expect(res.body.total_comp).toBe(200000);
    });

    it('valid data with optional fields → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Startup XYZ',
          role: 'Product Manager',
          base_salary: 120000,
          total_comp: 180000,
          bonus: 20000,
          stock_value: 40000,
          location: 'San Francisco',
          level: 'Senior',
          source: 'self',
        });

      expect(res.status).toBe(201);
      expect(res.body.bonus).toBe(20000);
      expect(res.body.location).toBe('San Francisco');
    });

    it('empty body {} → 400 (DTO validation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('missing company → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          role: 'Engineer',
          base_salary: 100000,
          total_comp: 130000,
        });

      expect(res.status).toBe(400);
    });

    it('missing role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Acme',
          base_salary: 100000,
          total_comp: 130000,
        });

      expect(res.status).toBe(400);
    });

    it('missing base_salary → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Acme',
          role: 'Engineer',
          total_comp: 130000,
        });

      expect(res.status).toBe(400);
    });

    it('missing total_comp → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Acme',
          role: 'Engineer',
          base_salary: 100000,
        });

      expect(res.status).toBe(400);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .send({
          company: 'Acme',
          role: 'Engineer',
          base_salary: 100000,
          total_comp: 130000,
        });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/salary ─────────────────────────────────────────────────────

  describe('GET /api/salary', () => {
    beforeAll(async () => {
      // Seed a couple of entries
      await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Seed Co', role: 'Dev', base_salary: 90000, total_comp: 110000 });
    });

    it('returns 200 + array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary');

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/salary/stats ────────────────────────────────────────────────

  describe('GET /api/salary/stats', () => {
    it('returns 200 + aggregated data array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('company');
        expect(res.body[0]).toHaveProperty('role');
        expect(res.body[0]).toHaveProperty('avg_base');
        expect(res.body[0]).toHaveProperty('avg_total');
        expect(res.body[0]).toHaveProperty('count');
      }
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary/stats');

      expect(res.status).toBe(401);
    });
  });

  // ─── DELETE /api/salary/:id ───────────────────────────────────────────────

  describe('DELETE /api/salary/:id', () => {
    let entryId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Delete Me Inc', role: 'Temp', base_salary: 50000, total_comp: 60000 });
      entryId = res.body.id;
    });

    it('owner can delete → 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/salary/${entryId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('deleting non-existent entry → 404', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/salary/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('other user cannot delete → 404', async () => {
      // Create a new entry as user 1
      const createRes = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Protected Co', role: 'Dev', base_salary: 80000, total_comp: 100000 });

      // Try to delete as user 2
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/salary/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(deleteRes.status).toBe(404);
    });

    it('without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/salary/${entryId}`);

      expect(res.status).toBe(401);
    });
  });

  // ─── All routes without JWT → 401 ────────────────────────────────────────

  describe('All routes without JWT → 401', () => {
    it('POST /api/salary without token → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .send({ company: 'X', role: 'Y', base_salary: 1, total_comp: 1 });
      expect(res.status).toBe(401);
    });

    it('GET /api/salary without token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/salary');
      expect(res.status).toBe(401);
    });

    it('GET /api/salary/stats without token → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/salary/stats');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/salary/:id without token → 401', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/salary/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(401);
    });
  });
});
