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

  // ─── GET /api/salary/stats — 小样本隐私收口(#59) ────────────────────────────
  // count<3 的聚合等同于暴露单条记录，avg_base/avg_total 必须置 null（仅保留 count）；
  // count>=3 才返回精确均值。
  describe('GET /api/salary/stats — small-sample privacy (#59)', () => {
    // 唯一后缀:确保本组聚合 count 只数本次插入(即便 DB 隔离失效也确定性,不受历史/并发数据干扰)
    const RUN = Date.now();
    const SMALL_CO = `Tiny Sample Co #59 ${RUN}`;
    const SMALL_ROLE = 'Solo Engineer';
    const BIG_CO = `Big Sample Co #59 ${RUN}`;
    const BIG_ROLE = 'Crowd Engineer';

    beforeAll(async () => {
      // 单条记录的公司/岗位 → 小样本(count=1)
      await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: SMALL_CO, role: SMALL_ROLE, base_salary: 123456, total_comp: 234567 });

      // 同一公司/岗位 3 条 → 大样本(count>=3)
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/salary')
          .set('Authorization', `Bearer ${token}`)
          .send({ company: BIG_CO, role: BIG_ROLE, base_salary: 100000 + i, total_comp: 150000 + i });
      }
    });

    it('count<3 group → avg_base/avg_total masked to null (no re-identification)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const small = (res.body as Array<{ company: string; role: string; avg_base: number | null; avg_total: number | null; count: number }>)
        .find((s) => s.company === SMALL_CO && s.role === SMALL_ROLE);
      expect(small).toBeDefined();
      expect(small!.count).toBe(1);
      // 精确均值必须被置空，否则等于反推出该唯一发布者的薪资
      expect(small!.avg_base).toBeNull();
      expect(small!.avg_total).toBeNull();
      // 绝不能等于发布者真实数字
      expect(small!.avg_base).not.toBe(123456);
      expect(small!.avg_total).not.toBe(234567);
    });

    it('count>=3 group → precise averages still returned', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const big = (res.body as Array<{ company: string; role: string; avg_base: number | null; avg_total: number | null; count: number }>)
        .find((s) => s.company === BIG_CO && s.role === BIG_ROLE);
      expect(big).toBeDefined();
      expect(big!.count).toBeGreaterThanOrEqual(3);
      expect(typeof big!.avg_base).toBe('number');
      expect(typeof big!.avg_total).toBe('number');
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

  // ─── POST /api/salary — 发帖数值/枚举校验(本次修复) ───────────────────────
  describe('POST /api/salary — input validation', () => {
    it('base_salary > total_comp → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Bad Co', role: 'Dev', base_salary: 900000, total_comp: 100000 });
      expect(res.status).toBe(400);
    });

    it('negative base_salary → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Bad Co', role: 'Dev', base_salary: -50000, total_comp: 60000 });
      expect(res.status).toBe(400);
    });

    it('invalid source enum → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: 'Bad Co', role: 'Dev', base_salary: 80000, total_comp: 100000, source: 'hacker' });
      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/salary — 社区可见 + 匿名(已脱敏,不暴露 user_id) ─────────────
  describe('GET /api/salary — community visibility + anonymity', () => {
    it('response entries never expose user_id (anonymized)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/salary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const entry of res.body) {
        expect(entry).not.toHaveProperty('user_id');
        expect(entry).not.toHaveProperty('user');
      }
    });

    it('community pool: user2 sees an offer posted by user1 (shared board, not private)', async () => {
      const probeCompany = 'CommunityProbe Inc';
      await request(app.getHttpServer())
        .post('/api/salary')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: probeCompany, role: 'CommDev', base_salary: 111000, total_comp: 222000 });

      const res = await request(app.getHttpServer())
        .get('/api/salary')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      const found = res.body.find(
        (e: { company: string; role: string }) => e.company === probeCompany && e.role === 'CommDev',
      );
      expect(found).toBeDefined();
      expect(found).not.toHaveProperty('user_id');
    });
  });
});
