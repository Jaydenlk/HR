import { INestApplication, ValidationPipe, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { request, loginUser } from './test-utils';

// ─── Deterministic mock ───────────────────────────────────────────────────────

const MOCK_MESSAGE_RESULT = {
  confidence: 'high',
  summary: '根据您的背景生成内推申请消息',
  message_draft: '你好，我是XXX，目前在寻找字节跳动的产品经理职位机会。我们是大学校友，不知道是否方便聊一下？如有不便，完全理解！',
  tone: 'semi_formal',
  key_points: ['说明身份', '提及共同背景', '给对方退路'],
  what_not_to_say: ['我们关系很好', '一定要帮我'],
  recommendations: ['工作日晚间发送', '附上简历链接'],
  risks: ['对方可能无内推名额'],
  follow_up_timing: {
    best_send_time: '工作日18:00-20:00',
    follow_up_after_days: 5,
    follow_up_note: '若无回复，可礼貌跟进一次',
  },
  cannot_determine: [],
};

const MOCK_REFERRAL_RESULT = {
  confidence: 'high',
  summary: '基于您的人脉分析内推路径',
  referral_paths: [
    {
      target_company: '字节跳动',
      contact_description: '大学同学，在字节跳动做后端工程师两年',
      path_type: 'direct',
      estimated_success_rate: '30-50%',
      priority: 1,
      relationship_strength: 'strong',
      suggested_action: '直接微信联系，说明意向',
    },
  ],
  cold_outreach_targets: [],
  network_gaps: [],
  recommendations: ['优先联系直接人脉'],
  risks: ['对方可能无内推名额'],
  cannot_determine: [],
};

const MOCK_REFERRAL_NO_CONTACTS = {
  confidence: 'low',
  summary: '当前无已知人脉，建议冷接触',
  referral_paths: [
    // 模拟 AI 可能编造一个联系人——服务端 guard 应强制清空
    {
      target_company: '字节跳动',
      contact_description: '（编造联系人）',
      path_type: 'direct',
      estimated_success_rate: '30-50%',
      priority: 1,
      suggested_action: '直接联系',
    },
  ],
  cold_outreach_targets: [
    {
      target_company: '字节跳动',
      target_profile_type: '公司内同校校友',
      platform: '脉脉',
      approach: '先建立互动再开口',
    },
  ],
  network_gaps: [
    {
      target_company: '字节跳动',
      gap_description: '无直接人脉',
      fill_strategy: ['通过脉脉找同校校友', '参加行业活动'],
    },
  ],
  recommendations: ['先建立人脉再开口'],
  risks: ['冷接触成功率较低（5-15%）'],
  cannot_determine: [],
};

const MOCK_REFERRAL_INFLATED_COLD = {
  confidence: 'medium',
  summary: '冷接触路径分析',
  referral_paths: [
    {
      target_company: '字节跳动',
      contact_description: '校友',
      path_type: 'cold_contact',
      estimated_success_rate: '80%', // 虚报 — 服务端 guard 应降级为 5-15%
      priority: 1,
      suggested_action: '脉脉联系',
    },
  ],
  cold_outreach_targets: [],
  network_gaps: [],
  recommendations: [],
  risks: [],
  cannot_determine: [],
};

const MOCK_REFERRAL_INFLATED_COLD_20 = {
  confidence: 'medium',
  summary: '冷接触路径分析（20%场景）',
  referral_paths: [
    {
      target_company: '腾讯',
      contact_description: '陌生校友',
      path_type: 'cold_contact',
      estimated_success_rate: '20%', // 16-30% 漏网区间 — fix 后应被 guard 降级为 5-15%
      priority: 1,
      suggested_action: '脉脉联系',
    },
  ],
  cold_outreach_targets: [],
  network_gaps: [],
  recommendations: [],
  risks: [],
  cannot_determine: [],
};

let mockToolName: string | null = null;

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockImplementation(({ toolName }: { toolName: string }) => {
    if (mockToolName === toolName) {
      return Promise.reject(
        new ServiceUnavailableException('AI 服务暂时不可用(测试注入)'),
      );
    }
    if (toolName === 'write_networking_message') {
      return Promise.resolve({ ...MOCK_MESSAGE_RESULT });
    }
    if (toolName === 'analyze_referral_strategy') {
      return Promise.resolve({ ...MOCK_REFERRAL_RESULT });
    }
    return Promise.resolve({});
  }),
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Networking (e2e, mocked AI)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-jwt-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'networking-test@coach.dev', 'Networking User');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockToolName = null;
    jest.clearAllMocks();
    mockAiService.completeStructured.mockImplementation(({ toolName }: { toolName: string }) => {
      if (mockToolName === toolName) {
        return Promise.reject(new ServiceUnavailableException('AI 服务暂时不可用(测试注入)'));
      }
      if (toolName === 'write_networking_message') return Promise.resolve({ ...MOCK_MESSAGE_RESULT });
      if (toolName === 'analyze_referral_strategy') return Promise.resolve({ ...MOCK_REFERRAL_RESULT });
      return Promise.resolve({});
    });
  });

  // ─── POST /api/networking/message ──────────────────────────────────────────

  describe('POST /api/networking/message', () => {
    it('valid request → 201 + message_draft', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          platform: 'wechat',
          relationship_type: 'alumni_or_ex_colleague',
          contact_description: '大学校友，字节内部两年',
          shared_background: '同一所大学',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('confidence', 'high');
      expect(res.body).toHaveProperty('message_draft');
      expect(typeof res.body.message_draft).toBe('string');
      expect(res.body.message_draft.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('tone');
      expect(res.body).toHaveProperty('follow_up_timing');
    });

    it('missing target_company → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_position: '产品经理' });

      expect(res.status).toBe(400);
    });

    it('missing target_position → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_company: '字节跳动' });

      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('no JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .send({ target_company: '字节跳动', target_position: '产品经理' });

      expect(res.status).toBe(401);
    });

    it('AI returns confidence=insufficient → service guard forces message_draft=null', async () => {
      // Override mock to return insufficient confidence
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({
          ...MOCK_MESSAGE_RESULT,
          confidence: 'insufficient',
          message_draft: '编造内容', // AI 返回了草稿，服务端 guard 必须清空
          follow_up_timing: { best_send_time: '工作日', follow_up_after_days: 3 },
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_company: '字节跳动', target_position: '产品经理' });

      expect(res.status).toBe(201);
      // Guard: confidence=insufficient 时 message_draft 必须为 null
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.message_draft).toBeNull();
      // Guard: message_draft 为 null 时 follow_up_timing 也应清空
      expect(res.body.follow_up_timing).toBeNull();
    });

    it('AI service failure → 503', async () => {
      mockToolName = 'write_networking_message';

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_company: '字节跳动', target_position: '产品经理' });

      expect(res.status).toBe(503);
    });
  });

  // ─── POST /api/networking/referral-strategy ────────────────────────────────

  describe('POST /api/networking/referral-strategy', () => {
    it('valid request with contacts → 201 + referral_paths', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动'],
          target_position: '后端工程师',
          known_contacts: ['张三，字节跳动后端工程师，大学同学'],
          candidate_background: '3年后端开发经验',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('confidence');
      expect(Array.isArray(res.body.referral_paths)).toBe(true);
      expect(res.body.referral_paths.length).toBeGreaterThan(0);
    });

    it('no contacts → referral_paths must be empty array (anti-fabrication guard)', async () => {
      // Override: AI 尝试编造联系人，服务端 guard 必须强制清空
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_NO_CONTACTS }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动'],
          target_position: '产品经理',
          // known_contacts 故意不传
        });

      expect(res.status).toBe(201);
      // 服务端防编造 guard：无人脉时强制 referral_paths=[]
      expect(res.body.referral_paths).toEqual([]);
      // 冷接触建议仍然保留
      expect(Array.isArray(res.body.cold_outreach_targets)).toBe(true);
    });

    it('cold_contact path with inflated rate 80% → guard clamps to 5-15%', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_INFLATED_COLD }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动'],
          target_position: '后端工程师',
          known_contacts: ['某校友'],
        });

      expect(res.status).toBe(201);
      const coldPaths = res.body.referral_paths.filter(
        (p: { path_type: string }) => p.path_type === 'cold_contact',
      );
      for (const p of coldPaths) {
        // 虚报 80% 应被降级为 5-15%
        expect(p.estimated_success_rate).toBe('5-15%');
      }
    });

    it('cold_contact path with rate 20% (漏网区间) → guard clamps to 5-15%', async () => {
      // 20% 处于 16-30% 的漏网区间：旧 >30 阈值不会触发 guard，新 >15 阈值必须触发
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_INFLATED_COLD_20 }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['腾讯'],
          target_position: '产品经理',
          known_contacts: ['陌生校友'],
        });

      expect(res.status).toBe(201);
      const coldPaths = res.body.referral_paths.filter(
        (p: { path_type: string }) => p.path_type === 'cold_contact',
      );
      expect(coldPaths.length).toBeGreaterThan(0);
      for (const p of coldPaths) {
        // 20% > 15 → 应被降级为 5-15%
        expect(p.estimated_success_rate).toBe('5-15%');
      }
    });

    it('missing target_companies → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_position: '后端工程师' });

      expect(res.status).toBe(400);
    });

    it('missing target_position → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_companies: ['字节跳动'] });

      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('no JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .send({ target_companies: ['字节跳动'], target_position: '工程师' });

      expect(res.status).toBe(401);
    });

    it('AI service failure → 503', async () => {
      mockToolName = 'analyze_referral_strategy';

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_companies: ['字节跳动'], target_position: '工程师', known_contacts: ['张三'] });

      expect(res.status).toBe(503);
    });
  });
});

// ─── AI Live tests (default skip, set RUN_AI_LIVE=1 to enable) ───────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Networking (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'networking-live@coach.dev', 'Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/networking/message — real AI produces valid structure', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/networking/message')
      .set('Authorization', `Bearer ${token}`)
      .send({
        target_company: '字节跳动',
        target_position: '产品经理',
        platform: 'maimai',
        relationship_type: 'alumni_or_ex_colleague',
        contact_description: '大学校友，在字节做产品两年',
        candidate_background: '互联网产品经理，3年经验',
        shared_background: '同一所大学',
      });

    expect(res.status).toBe(201);
    expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    if (res.body.confidence !== 'insufficient') {
      expect(typeof res.body.message_draft).toBe('string');
      // 防编造：不得含有「我们很熟」等虚假关系声明
      expect(res.body.message_draft).not.toMatch(/我们(关系|感情)(很|非常|特别)好/);
    }
  }, 60000);

  it('POST /api/networking/referral-strategy — no contacts → referral_paths empty', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/networking/referral-strategy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        target_companies: ['字节跳动'],
        target_position: '产品经理',
        // 不传 known_contacts — guard 应强制清空
      });

    expect(res.status).toBe(201);
    expect(res.body.referral_paths).toEqual([]);
  }, 60000);
});
