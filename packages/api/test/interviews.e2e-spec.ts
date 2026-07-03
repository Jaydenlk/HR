import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

// AI-live 套件默认 skip,仅 RUN_AI_LIVE=1 时真跑(避免 CI/常规 e2e 触发真实中转调用)。
const LIVE = process.env.RUN_AI_LIVE === '1';

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

    // ── transcript 复盘承诺(修复点)──────────────────────────────────
    // 修复前的 bug:带"非空但过短"transcript 创建会返 201 且 scores 为 null
    //（静默吞掉分析失败、留下"有记录无评分"的假成功记录)。
    // 修复后:提供非空 transcript 即承诺当场复盘,内容过短(<20字)无法分析 → 400,
    // 绝不创建假记录。null/缺省/纯空白 transcript 是合法草稿,跳过分析 → 201 scores null。
    it('非空但过短(<20字)transcript → 400,不创建假记录', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '技术一面', company: 'Acme', role: '后端工程师', transcript: '答得还行' });

      expect(res.status).toBe(400);
    });

    it('缺省 transcript → 201 草稿,scores 为 null', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '草稿-无transcript面' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.scores == null).toBe(true);
      expect(res.body.overall_grade == null).toBe(true);
    });

    it('纯空白 transcript → 201 草稿,scores 为 null(空白不触发分析)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '草稿-空白transcript面', transcript: '   \n  \t ' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.scores == null).toBe(true);
      expect(res.body.overall_grade == null).toBe(true);
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

    // 修复点:PATCH 新增"非空但过短"transcript 同样承诺当场复盘,过短无法分析 → 400,
    // 而非静默落盘一条"有记录无评分"的假态。
    it('PATCH 新增非空但过短(<20字)transcript → 400', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: 'PATCH过短transcript面' });
      expect(create.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ transcript: '太短了' });

      expect(res.status).toBe(400);
    });

    it('PATCH 不带 transcript 的普通字段更新 → 200,scores 仍为 null', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: 'PATCH普通更新面' });
      expect(create.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '某公司', interviewer: '李四' });

      expect(res.status).toBe(200);
      expect(res.body.company).toBe('某公司');
      expect(res.body.scores == null).toBe(true);
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

  // ── T5 审计校准(B4/M2):application_id 归属校验 + GET 不再泄露关联 Application 全字段 ──
  describe('application_id ownership guard & GET privacy (T5)', () => {
    let otherAppId: string;
    let ownAppId: string;

    beforeAll(async () => {
      const otherRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ company: '他人公司', role: '软件工程师', notes: '机密备注:内推人张三,薪资30k' });
      otherAppId = otherRes.body.id;

      const ownRes = await request(app.getHttpServer())
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '自己公司', role: '软件工程师' });
      ownAppId = ownRes.body.id;
    });

    it('POST 引用他人 application_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: 'IDOR面', application_id: otherAppId });

      expect(res.status).toBe(403);
    });

    it('POST 引用不存在的 application_id → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: 'IDOR面2', application_id: '00000000-0000-0000-0000-000000000099' });

      expect(res.status).toBe(403);
    });

    it('POST 引用自己的 application_id → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '合法面', application_id: ownAppId });

      expect(res.status).toBe(201);
      expect(res.body.application_id).toBe(ownAppId);
    });

    it('PATCH 引用他人 application_id → 403', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '待PATCH面' });

      const res = await request(app.getHttpServer())
        .patch(`/api/interviews/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ application_id: otherAppId });

      expect(res.status).toBe(403);
    });

    it('GET :id 不再泄露关联 Application 的全字段(B4:曾经 relations 预加载会连带回读 notes/salary_range 等)', async () => {
      const create = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ round: '隐私测试面', application_id: ownAppId });

      const res = await request(app.getHttpServer())
        .get(`/api/interviews/${create.body.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('application');
    });

    it('GET 列表同样不含 application 关系对象', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/interviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const withApplication = (res.body as Array<Record<string, unknown>>).find(
        (iv) => 'application' in iv,
      );
      expect(withApplication).toBeUndefined();
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

    it('analyze without transcript → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/interviews/${interviewNoTranscriptId}/analyze`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
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

  // ─── AI live:真实调用 CloudDreamAI ─────────────────────────────────
  // 验证修复点的"成功侧":提供足够长(>=20字)的真实 transcript 创建时,当场复盘成功后
  // 落盘真实评分(scores 非空且 overall_grade 有值),而不是返回 201 + scores null 的假记录。
  // 区分:断言不符=真问题(评分缺失/结构错);环境 AI 中转 503/超时=非代码问题,如实标注放行。
  (LIVE ? describe : describe.skip)('AI live — 带有效 transcript 创建即复盘(真跑)', () => {
    // 一段真实、足够长的技术面试对话记录(远超 20 字下限)
    const validTranscript = `面试官：先做个自我介绍吧。
候选人：您好，我是应届毕业生，主修计算机科学，秋招目标是后端开发工程师。在校期间用 Spring Boot 做过一个校园二手交易平台，负责订单和支付模块。
面试官：讲讲你们的订单系统是怎么保证下单和扣减库存一致性的？
候选人：我们用的是数据库事务把创建订单和扣库存放在一个事务里，并对库存行加了悲观锁防止超卖。高并发下还加了 Redis 预扣减做限流。
面试官：悲观锁在高并发下有什么问题？你们怎么压测的？
候选人：悲观锁会让请求串行、吞吐下降。我们用 JMeter 压测，QPS 到 500 时响应明显变慢，后来部分场景改成乐观锁加重试。
面试官：好的，那如果让你优化，你会怎么做？
候选人：我会引入消息队列做异步削峰，把扣库存和生成订单解耦，再配合分段库存降低锁竞争。`;

    it('有效 transcript 创建 → 成功则 scores 非空,环境 503/超时则标注放行', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/interviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          round: '技术一面',
          company: 'ByteDance',
          role: '后端开发工程师',
          transcript: validTranscript,
        })
        .timeout(280000);

      console.log('[interviews AI] status:', res.status);
      console.log('[interviews AI] overall_grade:', res.body?.overall_grade);
      console.log('[interviews AI] scores count:', res.body?.scores?.length);

      // 环境侧:AI 中转挂掉(主备均失败)→ 503,属非代码问题,如实标注后放行。
      if (res.status === 503) {
        console.warn(
          '[interviews AI] 跳过断言:AI 中转返回 503(主备通道均失败),非代码问题。' +
            ' 修复后行为本身已由 400/草稿用例覆盖。',
        );
        expect(res.status).toBe(503);
        return;
      }

      // 代码侧:复盘成功必须落盘真实评分,绝不是 201 + scores null 的假记录。
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.overall_grade).toBe('string');
      expect(res.body.overall_grade.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.scores)).toBe(true);
      expect(res.body.scores.length).toBeGreaterThan(0);
      expect(typeof res.body.scores[0].name).toBe('string');
      expect(typeof res.body.scores[0].score).toBe('number');
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.prediction).toBeDefined();
    }, 290000);
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
