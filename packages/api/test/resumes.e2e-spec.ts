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
    it('with title and raw_text → 201 + resume object (no user_id leaked)', async () => {
      const rawText =
        '资深后端工程师，5 年 Java 与 Spring Boot 经验，主导过日活百万级电商系统的微服务拆分与性能优化。';
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'My First Resume', raw_text: rawText });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'My First Resume',
        raw_text: rawText,
        is_primary: false,
      });
      expect(res.body).toHaveProperty('id');
      // 详情响应已退役 user_id 字段(响应 DTO 不外泄归属人 ID)。
      expect(res.body).not.toHaveProperty('user_id');
    });

    it('raw_text shorter than 30 chars → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Too Short', raw_text: '太短了' });
      expect(res.status).toBe(400);
    });

    it('empty raw_text → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Empty Body', raw_text: '' });
      expect(res.status).toBe(400);
    });

    it('with is_primary=true → sets primary, unsets previous primary', async () => {
      // Create initial primary resume
      const first = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Primary Resume A',
          raw_text: '前端工程师，三年 React 与 TypeScript 实战，独立交付过中后台管理系统与组件库。',
          is_primary: true,
        });
      expect(first.status).toBe(201);
      expect(first.body.is_primary).toBe(true);

      // Create second primary resume — should demote the first
      const second = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Primary Resume B',
          raw_text: '产品经理，主导过 B 端 SaaS 从 0 到 1，覆盖需求调研、原型设计与上线后数据复盘。',
          is_primary: true,
        });
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
        .send({ raw_text: '运营专员，负责用户增长与活动策划，主导过单场拉新十万的裂变活动。' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/resumes', () => {
    it('returns 200 + array of own resumes (items omit raw_text and user_id)', async () => {
      const uniqueToken = await loginUser(app, 'list-test@coach.dev', 'List Test User');

      // Create two resumes
      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`)
        .send({
          title: 'List Resume 1',
          raw_text: '测试工程师，熟悉自动化测试与接口测试，搭建过 CI 流水线并显著降低回归成本。',
        });

      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`)
        .send({
          title: 'List Resume 2',
          raw_text: '数据分析师，精通 SQL 与 Python，搭建过指标体系并支撑多条业务线的增长决策。',
        });

      const res = await request(app.getHttpServer())
        .get('/api/resumes')
        .set('Authorization', `Bearer ${uniqueToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const titles = res.body.map((r: { title: string }) => r.title);
      expect(titles).toContain('List Resume 1');
      expect(titles).toContain('List Resume 2');
      // 列表项是精简投影:不暴露 raw_text 全文,也不暴露归属人 user_id。
      for (const item of res.body) {
        expect(item).not.toHaveProperty('raw_text');
        expect(item).not.toHaveProperty('user_id');
      }
    });

    it('does not return other users\' resumes', async () => {
      const userAToken = await loginUser(app, 'isolation-a@coach.dev', 'Isolation A');
      const userBToken = await loginUser(app, 'isolation-b@coach.dev', 'Isolation B');

      await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'User A Private Resume',
          raw_text: '私密简历正文:运维工程师,负责 Kubernetes 集群运维与监控告警体系建设。',
        });

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
        .send({
          title: 'Detail Resume',
          raw_text: '算法工程师,深耕推荐系统与排序模型,主导过精排模型迭代并带来核心指标提升。',
        });
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
        .send({
          title: 'Patch Target',
          raw_text: '财务分析师,负责预算编制与经营分析,搭建过滚动预测模型支撑管理层决策。',
        });
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
        .send({
          title: 'To Be Deleted',
          raw_text: '待删除简历:市场专员,负责品牌投放与渠道合作,统筹过多场线下市场活动。',
        });
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
        .send({
          title: 'Other Cannot Delete',
          raw_text: '受保护简历:销售经理,负责区域大客户开发,连续两年超额完成销售目标。',
        });
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
        .send({
          title: 'Versioned Resume A',
          raw_text: '初版正文:UI 设计师,负责移动端视觉设计与设计规范沉淀,产出过多套完整设计语言。',
        });
      const resumeId = createRes.body.id;

      const v2Text = '第二版正文:UI 设计师,补充了 B 端数据可视化大屏项目经验与可访问性设计实践。';
      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: v2Text, change_note: 'Added new experience' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      // 版本响应是精简投影:仅 id/version_num/raw_text/change_note/created_at,不外泄 resume_id。
      expect(res.body).not.toHaveProperty('resume_id');
      expect(res.body.version_num).toBe(1);
      expect(res.body.raw_text).toBe(v2Text);
      expect(res.body.change_note).toBe('Added new experience');
    });

    it('missing raw_text → 400 (validated before DB, not 500)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Versioned Resume Missing Body',
          raw_text: '基线正文:采购专员,负责供应商管理与成本谈判,主导过年度框架协议续签。',
        });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ change_note: 'forgot the body' });

      expect(res.status).toBe(400);
    });

    it('raw_text shorter than 30 chars → 400', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Versioned Resume Short Body',
          raw_text: '基线正文:法务专员,负责合同审查与合规风险把控,处理过多起商业纠纷。',
        });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ raw_text: '太短', change_note: 'too short' });

      expect(res.status).toBe(400);
    });

    it('creates sequential version numbers', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Versioned Resume B',
          raw_text: '初版正文:增长运营,负责用户生命周期管理与召回策略,主导过付费转化漏斗优化。',
        });
      const resumeId = createRes.body.id;

      const res1 = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          raw_text: '第二版正文:增长运营,补充了 A/B 实验体系搭建与渠道 ROI 归因模型经验。',
          change_note: 'First edit',
        });
      expect(res1.status).toBe(201);
      expect(res1.body.version_num).toBe(1);

      const res2 = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          raw_text: '第三版正文:增长运营,新增私域社群运营与裂变活动复盘的量化成果数据。',
          change_note: 'Second edit',
        });
      expect(res2.status).toBe(201);
      expect(res2.body.version_num).toBe(2);
    });

    it('returns 404 when creating version for another user\'s resume', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Versioned Resume C',
          raw_text: '受保护正文:HRBP,负责组织发展与人才盘点,搭建过分层人才梯队与继任计划。',
        });
      const resumeId = createRes.body.id;

      // 版本正文需满足 >=30 字校验,确保请求越过校验、抵达归属校验,从而真正断言 404(而非 400)。
      const res = await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          raw_text: '入侵尝试正文:试图为他人简历追加版本,内容足够长以通过 DTO 长度校验。',
          change_note: 'hack',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/resumes/:id/versions', () => {
    it('returns 200 + version history array (newest first)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/resumes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'History Resume',
          raw_text: '初版正文:品牌公关,负责品牌传播与危机公关,操盘过多次全国性品牌战役。',
        });
      const resumeId = createRes.body.id;

      await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          raw_text: '第二版正文:品牌公关,补充了媒体关系维护与 KOL 投放矩阵搭建的成果。',
          change_note: 'First edit',
        });

      await request(app.getHttpServer())
        .post(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          raw_text: '第三版正文:品牌公关,新增舆情监测体系与年度品牌资产评估的量化数据。',
          change_note: 'Second edit',
        });

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
        .send({
          title: 'History Resume 2',
          raw_text: '受保护正文:供应链经理,负责需求预测与库存优化,推动过 S&OP 流程落地。',
        });
      const resumeId = createRes.body.id;

      const res = await request(app.getHttpServer())
        .get(`/api/resumes/${resumeId}/versions`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
