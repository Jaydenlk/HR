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

// #52: 区间上界超限 '10-20%'——旧逻辑取首数字(10≤15)漏判，新逻辑取上界(20>15)命中
const MOCK_REFERRAL_RANGE_COLD = {
  confidence: 'medium',
  summary: '冷接触路径分析（10-20%区间场景）',
  referral_paths: [
    {
      target_company: '阿里巴巴',
      contact_description: '陌生校友',
      path_type: 'cold_contact',
      estimated_success_rate: '10-20%', // 上界 20>15 — fix 后应被 guard 降级为 5-15%
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

// P0: 有人脉时 AI 编造一条不在 known_contacts 里的联系人——guard 必须降为 cold_contact 并清空
const MOCK_REFERRAL_FABRICATED_CONTACT = {
  confidence: 'high',
  summary: '基于人脉分析（含一条编造联系人）',
  referral_paths: [
    {
      // 可溯源：与 known_contacts 中的「张三，字节跳动后端工程师，大学同学」高度重叠
      target_company: '字节跳动',
      contact_description: '大学同学，在字节跳动做后端工程师',
      path_type: 'direct',
      estimated_success_rate: '30-50%',
      priority: 1,
      relationship_strength: 'strong',
      suggested_action: '直接联系张三',
    },
    {
      // 不可溯源：用户从未提供过的腾讯产品总监——必须被降为 cold_contact 并清空 description
      target_company: '腾讯',
      contact_description: '腾讯产品总监，内部可直接推荐',
      path_type: 'direct',
      estimated_success_rate: '40-50%',
      priority: 2,
      relationship_strength: 'strong',
      suggested_action: '请其内推',
    },
  ],
  cold_outreach_targets: [],
  network_gaps: [],
  recommendations: [],
  risks: [],
  cannot_determine: [],
};

// confidence 白名单：AI 返回非法 confidence——guard 必须降为 low（message 端点）
const MOCK_MESSAGE_INVALID_CONFIDENCE = {
  ...MOCK_MESSAGE_RESULT,
  confidence: 'super_high', // 非法枚举
};

// confidence 白名单：AI 返回非法 confidence——guard 必须降为 low（referral 端点，有人脉）
const MOCK_REFERRAL_INVALID_CONFIDENCE = {
  ...MOCK_REFERRAL_RESULT,
  confidence: 'maybe', // 非法枚举
};

// 空草稿自相矛盾：message_draft 纯空白 + confidence=high——guard 必须收口为 insufficient+null
const MOCK_MESSAGE_BLANK_DRAFT = {
  ...MOCK_MESSAGE_RESULT,
  confidence: 'high',
  message_draft: '   ', // 纯空白
};

// #13/#33: AI 漏掉 referral_paths 及其余容器字段——guard 必须归一化为 []，绝不 500
const MOCK_REFERRAL_MISSING_ARRAYS = {
  confidence: 'low',
  summary: '部分字段缺失场景',
  // referral_paths / cold_outreach_targets / network_gaps / recommendations / risks /
  // cannot_determine 全部缺失——模拟 AI 漏字段
};

// #14: 无人脉时 AI 在 cold_outreach_targets 编造具体联系人/「内部有人」——guard 必须剥离
const MOCK_REFERRAL_NO_CONTACTS_FABRICATED = {
  confidence: 'low',
  summary: '无人脉但编造冷接触联系人',
  referral_paths: [],
  cold_outreach_targets: [
    {
      target_company: '字节跳动',
      target_profile_type: '我认识的张某', // 编造具体联系人 — 应被剥离
      platform: '脉脉',
      approach: '内部有人，可直接打招呼', // 「内部有人」暗示内线 — 应被剥离
    },
    {
      target_company: '字节跳动',
      target_profile_type: '公司内同校校友', // 通用画像 — 应保留
      platform: '脉脉',
      approach: '先建立互动再开口',
    },
  ],
  network_gaps: [],
  recommendations: ['先建立人脉再开口'],
  risks: [],
  cannot_determine: [],
};

// #54: 用户未提供任何共同背景，但草稿声称「校友/同学」——guard 必须剥离草稿并降级
const MOCK_MESSAGE_FABRICATED_SHARED = {
  ...MOCK_MESSAGE_RESULT,
  confidence: 'medium',
  message_draft: '你好，我们是大学校友，一起在同一所大学读书，想请教内推事宜。如有不便完全理解。',
};

// #13/#33: message 分支 AI 漏掉数组字段——guard 必须归一化为 []，绝不 500
const MOCK_MESSAGE_MISSING_ARRAYS = {
  confidence: 'medium',
  summary: '部分字段缺失',
  message_draft: '你好，想咨询贵公司的产品经理职位机会。如有不便完全理解。',
  tone: 'semi_formal',
  follow_up_timing: { best_send_time: '工作日18:00', follow_up_after_days: 3 },
  // key_points / what_not_to_say / recommendations / risks / cannot_determine 全缺失
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

    // #54 防编造回归：用户未提供任何共同背景，但草稿声称「校友/同学」→ 剥离 + 降级
    it('no shared background but draft claims 校友 → guard strips draft & marks insufficient', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_FABRICATED_SHARED }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        // 故意不传 shared_background / contact_description
        .send({ target_company: '字节跳动', target_position: '产品经理' });

      expect(res.status).toBe(201);
      expect(res.body.message_draft).toBeNull();
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.follow_up_timing).toBeNull();
      expect(res.body.cannot_determine.some((s: string) => s.includes('共同背景'))).toBe(true);
    });

    // #54 反向：用户确实提供了共同背景 → 即便草稿提共同点也放行
    it('shared background provided → draft claiming 校友 is allowed', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_FABRICATED_SHARED }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          shared_background: '同一所大学，计算机系',
        });

      expect(res.status).toBe(201);
      expect(typeof res.body.message_draft).toBe('string');
      expect(res.body.message_draft.length).toBeGreaterThan(0);
      expect(res.body.confidence).toBe('medium');
    });

    // #13/#33 崩溃回归：AI 漏掉数组字段 → 归一化为 []，不 500
    it('AI omits array fields → guard normalizes to [], no 500', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_MISSING_ARRAYS }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_company: '字节跳动', target_position: '产品经理' });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.key_points)).toBe(true);
      expect(Array.isArray(res.body.what_not_to_say)).toBe(true);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(Array.isArray(res.body.risks)).toBe(true);
      expect(Array.isArray(res.body.cannot_determine)).toBe(true);
    });

    // confidence 白名单回归：AI 返回非法 confidence → guard 降为 low
    it('AI returns invalid confidence → guard coerces to low', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_INVALID_CONFIDENCE }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          shared_background: '同一所大学',
        });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('low');
      expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    });

    // 空草稿自相矛盾回归：纯空白 draft + confidence=high → 收口为 insufficient + null
    it('blank message_draft + confidence=high → guard forces insufficient + null', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_BLANK_DRAFT }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          shared_background: '同一所大学',
        });

      expect(res.status).toBe(201);
      expect(res.body.message_draft).toBeNull();
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.follow_up_timing).toBeNull();
      expect(res.body.cannot_determine.some((s: string) => s.includes('空'))).toBe(true);
    });

    // P1 收窄回归：仅填 contact_description（无 shared_background / 关系枚举非亲近）
    // 草稿声称校友 → 不再放行，必须剥离 + 降级（contact_description 不是共同背景可信来源）
    it('only contact_description (no shared_background, stranger relation) → draft claiming 校友 is stripped', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_FABRICATED_SHARED }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          relationship_type: 'stranger',
          contact_description: '字节跳动产品经理，工作三年', // 填了但不构成共同背景
        });

      expect(res.status).toBe(201);
      expect(res.body.message_draft).toBeNull();
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.cannot_determine.some((s: string) => s.includes('共同背景'))).toBe(true);
    });

    // P1 反向：relationship_type=alumni_or_ex_colleague 是可信共同背景来源 → 放行草稿
    it('relationship_type=alumni_or_ex_colleague → draft claiming 校友 is allowed', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_MESSAGE_FABRICATED_SHARED }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/message')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_company: '字节跳动',
          target_position: '产品经理',
          relationship_type: 'alumni_or_ex_colleague',
        });

      expect(res.status).toBe(201);
      expect(typeof res.body.message_draft).toBe('string');
      expect(res.body.message_draft.length).toBeGreaterThan(0);
      expect(res.body.confidence).toBe('medium');
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

    // #52 回归：'10-20%' 上界超限——旧逻辑取首数字(10)漏判，新逻辑取上界(20>15)命中
    it('cold_contact path with range 10-20% (上界超限) → guard clamps to 5-15%', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_RANGE_COLD }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['阿里巴巴'],
          target_position: '产品经理',
          known_contacts: ['陌生校友'],
        });

      expect(res.status).toBe(201);
      const coldPaths = res.body.referral_paths.filter(
        (p: { path_type: string }) => p.path_type === 'cold_contact',
      );
      expect(coldPaths.length).toBeGreaterThan(0);
      for (const p of coldPaths) {
        expect(p.estimated_success_rate).toBe('5-15%');
      }
    });

    // #14 防编造回归：无人脉时 AI 在冷接触建议中编造具体联系人/「内部有人」→ 剥离
    it('no contacts but AI fabricates cold contact (内部有人/认识的张某) → guard strips them', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_NO_CONTACTS_FABRICATED }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_companies: ['字节跳动'], target_position: '产品经理' });

      expect(res.status).toBe(201);
      expect(res.body.referral_paths).toEqual([]);
      // 编造的具体联系人条目被剥离，仅保留通用画像
      expect(res.body.cold_outreach_targets.length).toBe(1);
      expect(res.body.cold_outreach_targets[0].target_profile_type).toBe('公司内同校校友');
      // 不得残留「内部有人」「认识的张某」
      const serialized = JSON.stringify(res.body.cold_outreach_targets);
      expect(serialized).not.toContain('内部有人');
      expect(serialized).not.toContain('张某');
    });

    // #13/#33 崩溃回归：有人脉但 AI 漏掉 referral_paths 等容器 → 归一化为 []，不 500
    it('AI omits referral_paths & array fields → guard normalizes to [], no 500', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_MISSING_ARRAYS }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动'],
          target_position: '后端工程师',
          known_contacts: ['张三，字节后端，大学同学'],
        });

      expect(res.status).toBe(201);
      expect(res.body.referral_paths).toEqual([]);
      expect(Array.isArray(res.body.cold_outreach_targets)).toBe(true);
      expect(Array.isArray(res.body.network_gaps)).toBe(true);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(Array.isArray(res.body.risks)).toBe(true);
      expect(Array.isArray(res.body.cannot_determine)).toBe(true);
    });

    // P0 防编造回归：有人脉时 AI 编造一条不在 known_contacts 的联系人 → 降为 cold_contact + 清空 description
    it('AI fabricates a contact not in known_contacts → guard demotes to cold_contact & clears description', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_FABRICATED_CONTACT }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动', '腾讯'],
          target_position: '后端工程师',
          known_contacts: ['张三，字节跳动后端工程师，大学同学'],
        });

      expect(res.status).toBe(201);
      // 可溯源的字节路径保留为 direct，且 contact_description 不被清空
      const bytedance = res.body.referral_paths.find(
        (p: { target_company: string }) => p.target_company === '字节跳动',
      );
      expect(bytedance).toBeDefined();
      expect(bytedance.path_type).toBe('direct');
      expect(bytedance.contact_description.length).toBeGreaterThan(0);

      // 编造的腾讯路径被降为 cold_contact，contact_description 清空，relationship_strength 移除
      const tencent = res.body.referral_paths.find(
        (p: { target_company: string }) => p.target_company === '腾讯',
      );
      expect(tencent).toBeDefined();
      expect(tencent.path_type).toBe('cold_contact');
      expect(tencent.contact_description).toBe('');
      expect(tencent.relationship_strength).toBeUndefined();

      // 整体响应不得残留编造联系人文本
      const serialized = JSON.stringify(res.body.referral_paths);
      expect(serialized).not.toContain('腾讯产品总监');
      // 标注 cannot_determine
      expect(res.body.cannot_determine.some((s: string) => s.includes('无法') || s.includes('匹配'))).toBe(true);
    });

    // confidence 白名单回归：有人脉时 AI 返回非法 confidence → guard 降为 low
    it('AI returns invalid confidence (referral) → guard coerces to low', async () => {
      mockAiService.completeStructured.mockImplementation(() =>
        Promise.resolve({ ...MOCK_REFERRAL_INVALID_CONFIDENCE }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({
          target_companies: ['字节跳动'],
          target_position: '后端工程师',
          known_contacts: ['张三，字节跳动后端工程师，大学同学'],
        });

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('low');
      expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    });

    // #53 回归：target_companies 为空数组 → 400（旧逻辑会 join 出空串放行）
    it('empty target_companies array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/networking/referral-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_companies: [], target_position: '后端工程师' });

      expect(res.status).toBe(400);
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
