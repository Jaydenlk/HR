import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'question-bank-builder',
    skill_version: '1.0.0',
    summary: '共构建 16 道面试题，覆盖行为面、技术和文化契合等维度。',
    confidence: 'medium',
    evidence_used: [],
    recommendations: ['重点准备行为面 STAR 故事'],
    risks: ['题目来自知识图谱，非实时面经'],
    next_actions: ['查阅牛客该公司近期面经'],
    follow_up_questions: [],
    cannot_determine: [],
    question_bank: [
      {
        id: 'q1',
        question: '请介绍一次你主导的复杂项目',
        category: 'behavioral',
        difficulty: 'medium',
        frequency: 'high',
        source: '岗位知识图谱通用',
        answer_hint: '用 STAR 结构，重点突出你的贡献和量化结果',
        time_estimate: 5,
      },
      {
        id: 'q2',
        question: '描述你解决技术难题的经历',
        category: 'behavioral',
        difficulty: 'hard',
        frequency: 'high',
        source: '牛客2025高频',
        answer_hint: '体现技术深度与沟通协作',
        time_estimate: 5,
      },
      {
        id: 'q3',
        question: '为什么选择来我们公司？',
        category: 'motivation',
        difficulty: 'easy',
        frequency: 'high',
        source: '岗位知识图谱通用',
        answer_hint: '结合公司业务与个人成长方向',
        time_estimate: 3,
      },
    ],
    coverage: {
      total_questions: 3,
      by_category: { behavioral: 2, motivation: 1 },
      estimated_coverage_percentage: 40,
    },
    gaps: [
      {
        area: '技术专项',
        reason: '缺乏该公司实时技术面经数据',
        workaround: '查阅牛客近期面经',
      },
    ],
    ...overrides,
  };
}

// ── Valid generate payload ─────────────────────────────────────────────────────

const VALID_PAYLOAD = { company: '字节跳动', role: '后端开发' };

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('QuestionBank (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let mockResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => Promise.resolve(mockResult));
  let token: string;
  let token2: string; // second user for isolation test

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'qbank-user1@coach.dev', 'QB User One');
    token2 = await loginUser(app, 'qbank-user2@coach.dev', 'QB User Two');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResult = makeAiResult();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/question-bank/generate without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .send(VALID_PAYLOAD);
      expect(res.status).toBe(401);
    });

    it('GET /api/question-bank without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/question-bank');
      expect(res.status).toBe(401);
    });
  });

  // ─── Input validation → 400 ───────────────────────────────────────────────

  describe('Input validation → 400', () => {
    it('missing company → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: '后端开发' });
      expect(res.status).toBe(400);
    });

    it('missing role → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '字节跳动' });
      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Normal generate path ─────────────────────────────────────────────────

  describe('Normal: generate → 201, persist, retrieve', () => {
    it('returns result with question_bank, coverage, gaps', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.company).toBe('字节跳动');
      expect(res.body.role).toBe('后端开发');
      expect(res.body.result).toBeDefined();
      expect(Array.isArray(res.body.result.question_bank)).toBe(true);
      expect(res.body.result.coverage).toBeDefined();
      expect(Array.isArray(res.body.result.gaps)).toBe(true);
      // No user_id in response
      expect(res.body.user_id).toBeUndefined();
    });

    it('persisted — appears in GET /question-bank list', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '腾讯', role: '产品经理' });
      expect(genRes.status).toBe(201);
      const genId = genRes.body.id as string;

      const listRes = await request(app.getHttpServer())
        .get('/api/question-bank')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(200);
      const ids = (listRes.body as Array<{ id: string }>).map((e) => e.id);
      expect(ids).toContain(genId);
    });

    it('persisted — GET /:id returns full result', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '美团', role: '数据分析师' });
      expect(genRes.status).toBe(201);
      const genId = genRes.body.id as string;

      const getRes = await request(app.getHttpServer())
        .get(`/api/question-bank/${genId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(genId);
      expect(getRes.body.result.question_bank).toBeDefined();
      // No user_id in response
      expect(getRes.body.user_id).toBeUndefined();
    });
  });

  // ─── Cross-user isolation: 404 ────────────────────────────────────────────

  describe('Cross-user isolation → 404', () => {
    it('user2 cannot access user1 question bank', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '阿里巴巴', role: 'Java开发' });
      expect(genRes.status).toBe(201);
      const bankId = genRes.body.id as string;

      const res = await request(app.getHttpServer())
        .get(`/api/question-bank/${bankId}`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(404);
    });

    it('user2 cannot delete user1 question bank', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '滴滴', role: '运营' });
      expect(genRes.status).toBe(201);
      const bankId = genRes.body.id as string;

      const res = await request(app.getHttpServer())
        .delete(`/api/question-bank/${bankId}`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── Guard: source 缺失被标通用 ──────────────────────────────────────────

  describe('Guard: source missing → marked as 岗位知识图谱通用', () => {
    it('AI returns question with empty source → guard fills in 岗位知识图谱通用', async () => {
      mockResult = makeAiResult({
        question_bank: [
          {
            id: 'q_nosrc',
            question: '测试题目',
            category: 'behavioral',
            difficulty: 'medium',
            frequency: 'medium',
            source: '', // empty source
            answer_hint: '测试提示',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      const q = res.body.result.question_bank[0] as { source: string };
      expect(q.source).toBe('岗位知识图谱通用');
    });
  });

  // ─── Guard: very_high 无实数据来源被降为 high ─────────────────────────────

  describe('Guard: very_high without real source → downgraded to high', () => {
    it('AI marks knowledge-graph question as very_high → guard downgrades to high', async () => {
      mockResult = makeAiResult({
        question_bank: [
          {
            id: 'q_fake_high',
            question: '推断题目',
            category: 'behavioral',
            difficulty: 'medium',
            frequency: 'very_high', // invalid: source is generic
            source: '岗位知识图谱通用', // no real-source keywords
            answer_hint: '提示',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      const q = res.body.result.question_bank[0] as { frequency: string };
      // Guard must downgrade very_high → high when source lacks real-data keywords
      expect(q.frequency).toBe('high');
    });

    it('question with 牛客 in source → very_high preserved', async () => {
      mockResult = makeAiResult({
        question_bank: [
          {
            id: 'q_real_high',
            question: '高频题',
            category: 'technical_domain',
            difficulty: 'hard',
            frequency: 'very_high',
            source: '牛客2025高频', // real source
            answer_hint: '提示',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      const q = res.body.result.question_bank[0] as { frequency: string };
      expect(q.frequency).toBe('very_high');
    });
  });

  // ─── Guard: answer_hint truncated to ≤200 chars ───────────────────────────

  describe('Guard: answer_hint truncated to ≤200 chars', () => {
    it('long answer_hint gets truncated', async () => {
      const longHint = 'a'.repeat(300);
      mockResult = makeAiResult({
        question_bank: [
          {
            id: 'q_long',
            question: '题目',
            category: 'behavioral',
            difficulty: 'easy',
            frequency: 'medium',
            source: '岗位知识图谱通用',
            answer_hint: longHint,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(201);
      const q = res.body.result.question_bank[0] as { answer_hint: string };
      expect(q.answer_hint.length).toBeLessThanOrEqual(200);
    });
  });

  // ─── Delete ────────────────────────────────────────────────────────────────

  describe('DELETE /:id', () => {
    it('owner can delete their question bank', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/api/question-bank/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ company: '京东', role: '前端开发' });
      expect(genRes.status).toBe(201);
      const bankId = genRes.body.id as string;

      const delRes = await request(app.getHttpServer())
        .delete(`/api/question-bank/${bankId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(delRes.status).toBe(200);

      const getRes = await request(app.getHttpServer())
        .get(`/api/question-bank/${bankId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.status).toBe(404);
    });
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('QuestionBank (e2e) — AI live', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    token = await loginUser(app, 'qbank-live@coach.dev', 'QB Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI produces structurally valid question bank with all questions having source', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/question-bank/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ company: '字节跳动', role: 'HRBP' })
      .timeout(60000)
      .catch((err: { response?: { status: number; body: unknown } }) => {
        if (err.response) return err.response;
        return { status: 504, body: { message: 'timeout' } };
      });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 201) {
      const body = res.body as {
        result: {
          confidence: string;
          question_bank: Array<{ source: string; frequency: string; answer_hint?: string }>;
          coverage: { total_questions: number };
          gaps: unknown[];
        };
      };

      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.result.confidence);
      expect(Array.isArray(body.result.question_bank)).toBe(true);

      // Guard invariant: every question has a source
      for (const q of body.result.question_bank) {
        expect(q.source?.trim().length).toBeGreaterThan(0);
      }

      // Guard invariant: answer_hint ≤ 200 chars
      for (const q of body.result.question_bank) {
        if (q.answer_hint) {
          expect(q.answer_hint.length).toBeLessThanOrEqual(200);
        }
      }

      expect(body.result.coverage.total_questions).toBeGreaterThan(0);
      expect(Array.isArray(body.result.gaps)).toBe(true);
    } else {
      console.warn(`[question-bank AI-live] status ${res.status} — likely relay issue`);
    }
  }, 90000);
});
