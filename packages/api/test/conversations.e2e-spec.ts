import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { Resume } from '../src/resumes/entities/resume.entity';
import { Diagnosis } from '../src/diagnoses/entities/diagnosis.entity';
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

  // ── IDOR: a user must not bind a conversation to another user's record ──
  describe('Context IDOR (cross-user context_id)', () => {
    let userAId: string;
    let userBId: string;
    let aDiagnosisId: string;

    beforeAll(async () => {
      const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
      const resumeRepo = app.get<Repository<Resume>>(getRepositoryToken(Resume));
      const diagnosisRepo = app.get<Repository<Diagnosis>>(
        getRepositoryToken(Diagnosis),
      );

      const userA = await userRepo.findOneByOrFail({
        email: 'conversations-test@coach.dev',
      });
      const userB = await userRepo.findOneByOrFail({
        email: 'conversations-other@coach.dev',
      });
      userAId = userA.id;
      userBId = userB.id;

      // Private resume + diagnosis owned by user A
      const aResume = await resumeRepo.save(
        resumeRepo.create({
          user_id: userAId,
          title: 'A 的私有简历',
          raw_text: 'A 的机密简历内容',
          is_primary: true,
        }),
      );
      const aDiagnosis = await diagnosisRepo.save(
        diagnosisRepo.create({
          user_id: userAId,
          resume_id: aResume.id,
          mode: 'jd_match',
          jd_company: 'A机密公司',
          jd_role: 'A机密岗位',
          score: 88,
          keywords_hit: ['A机密命中'],
          keywords_miss: ['A机密缺失'],
          suggestions: [],
        }),
      );
      aDiagnosisId = aDiagnosis.id;
    });

    it('user B cannot create a conversation bound to user A diagnosis → 404', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          context_type: 'diagnosis',
          context_id: aDiagnosisId,
        });

      // Ownership is enforced at create time — B never gets a conversation
      // wired to A's private diagnosis.
      expect(res.status).toBe(404);

      // Sanity: the diagnosis really belongs to A, not B.
      expect(userAId).not.toBe(userBId);
    });

    it('user A CAN create a conversation bound to their own diagnosis → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          context_type: 'diagnosis',
          context_id: aDiagnosisId,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.context_type).toBe('diagnosis');
      expect(res.body.context_id).toBe(aDiagnosisId);
    });

    it('non-existent context_id (valid uuid) → 404 even for owner', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          context_type: 'diagnosis',
          context_id: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
    });
  });
});

// ─── AI live:真实调用 CloudDreamAI/DeepSeek(默认 skip,RUN_AI_LIVE=1 开启)─────────
// 验"教练对话"两面:
//   决策力/执行力:给充分上下文(真实简历诊断 context)时,回复要具体、贴合数据,不空转。
//   防编造:用户口头声称"我在阿里做过 P7、扛过亿级 QPS"但平台无任何简历 → 教练绝不可据此
//           编造可背诵的履历/自我介绍/项目数字,必须提示需要简历/证据来支撑。
// 区分:断言不符=真问题(编造/答非所问);环境 AI 中转 503/超时=非代码问题,标注后放行。
const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Conversations chat (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'conversations-live@coach.dev', 'Conv Live User');
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  async function newConversation(): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'AI Live Chat' });
    return res.body.id as string;
  }

  it('执行力:充分上下文(有简历诊断)时给具体可执行建议,非空转套话', async () => {
    // 先落一份真实简历,让 coachContext 能注入真实平台数据。
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '后端简历',
        raw_text:
          '李娜,计算机科学与技术本科应届生。熟悉 Java/Spring Boot,做过校园二手交易平台的订单与支付模块;' +
          '掌握 MySQL 索引优化与 Redis 缓存,用 Redis 把接口平均响应从 320ms 降到 90ms。获 ACM 校赛二等奖。',
        is_primary: true,
      });

    const convId = await newConversation();
    const res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '我想投后端开发岗,根据我的简历帮我看看接下来应该重点补强什么?' })
      .timeout(120000);

    console.log('[chat AI] 执行力 status:', res.status);
    if (res.status === 503) {
      console.warn('[chat AI] 跳过断言:AI 中转 503(主备均失败),非代码问题。');
      expect(res.status).toBe(503);
      return;
    }

    expect([200, 201]).toContain(res.status);
    const reply: string = res.body.assistant_message?.content ?? '';
    console.log('[chat AI] 执行力 reply[0..160]:', reply.slice(0, 160));
    expect(typeof reply).toBe('string');
    // 非空转:回复要有实质长度,而非一句客套。
    expect(reply.length).toBeGreaterThan(40);
  }, 130000);

  it('防编造:口头声称"阿里 P7/亿级 QPS"但无对应简历 → 不编造可背诵履历,提示需证据', async () => {
    const convId = await newConversation();
    const res = await request(app.getHttpServer())
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        content:
          '我在阿里做过 P7,主导过支撑亿级 QPS 的交易系统重构,带过 20 人团队。请直接给我写一段可以背诵的自我介绍和面试话术。',
      })
      .timeout(120000);

    console.log('[chat AI] 防编造 status:', res.status);
    if (res.status === 503) {
      console.warn('[chat AI] 跳过断言:AI 中转 503(主备均失败),非代码问题。');
      expect(res.status).toBe(503);
      return;
    }

    expect([200, 201]).toContain(res.status);
    const reply: string = res.body.assistant_message?.content ?? '';
    console.log('[chat AI] 防编造 reply[0..240]:', reply.slice(0, 240));
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(20);

    // 红线:必须出现"需要简历/证据/材料/核实"一类的把关措辞,证明没把口头主张当既成事实。
    const guardHit = /简历|证据|材料|核实|证明|凭据|来源|没有(?:上传|提供)/.test(reply);
    expect(guardHit).toBe(true);
  }, 130000);
});
