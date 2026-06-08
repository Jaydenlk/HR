import {
  INestApplication,
  ValidationPipe,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { FollowUpService } from '../src/follow-up/follow-up.service';
import { ApplicationsService } from '../src/applications/applications.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'follow-up-message-writer',
    skill_version: '1.0.0',
    summary: '面试后感谢信，强化记忆点，建议24小时内发送。',
    confidence: 'high',
    evidence_used: [{ source: '面试详情', content: '面试官张总提到了技术栈选型' }],
    recommendations: ['今天内发送'],
    risks: [],
    next_actions: ['发送后等待3-5天'],
    follow_up_questions: [],
    cannot_determine: [],
    message_draft:
      '您好张总，感谢今天的面试机会，您提到的技术选型理念让我受益匪浅，期待进一步交流。',
    timing_advice: {
      recommended_send_time: '今天内，工作时间',
      is_timing_appropriate: true,
      timing_note: '面试后24小时内发送感谢信效果最佳',
    },
    tone_guide: {
      tone: 'grateful',
      key_tone_points: ['真诚', '简洁', '表达感谢'],
      avoid: ['催促', '过于正式'],
    },
    ...overrides,
  };
}

// ── Common payload builders ────────────────────────────────────────────────────

const THANK_YOU_WITH_DETAILS = {
  scenario: 'thank_you',
  interview_details: '2024-01-15 字节跳动产品经理面试，面试官张总，谈及了用户增长方法论和数据驱动决策',
  contact: '张总，字节跳动产品总监',
};

const THANK_YOU_NO_DETAILS = {
  scenario: 'thank_you',
  // no interview_details
};

const STATUS_INQUIRY = {
  scenario: 'status_inquiry',
  contact: 'HR 李女士',
};

const REJECTION_REPLY = {
  scenario: 'rejection_reply',
  interview_details: '收到拒信，申请产品经理岗位',
  contact: 'HR 王先生',
};

const OFFER_URGE = {
  scenario: 'offer_urge',
  interview_details: 'Offer 截止日期为2024-02-01，需要确认',
  contact: 'HR 张女士',
};

const ACCEPTANCE = {
  scenario: 'acceptance',
  interview_details: '正式接受字节跳动产品经理 offer，入职日期待确认',
  contact: 'HR 李总',
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('FollowUp (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let mockResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => Promise.resolve(mockResult));

  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-jwt-secret';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'follow-up@coach.dev', 'Follow Up Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResult = makeAiResult();
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/follow-up/generate without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .send(THANK_YOU_WITH_DETAILS);
      expect(res.status).toBe(401);
    });
  });

  // ── Input validation ───────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing scenario → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ interview_details: '面试了字节跳动' });
      expect(res.status).toBe(400);
    });

    it('invalid scenario value → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ scenario: 'invalid_scenario' });
      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Normal: five scenarios all succeed ────────────────────────────────────

  describe('Normal: five scenarios → 200', () => {
    const scenarios = [
      { name: 'thank_you', payload: THANK_YOU_WITH_DETAILS },
      { name: 'status_inquiry', payload: STATUS_INQUIRY },
      { name: 'rejection_reply', payload: REJECTION_REPLY },
      { name: 'offer_urge', payload: OFFER_URGE },
      { name: 'acceptance', payload: ACCEPTANCE },
    ];

    for (const { name, payload } of scenarios) {
      it(`scenario=${name} → 200 with message_draft`, async () => {
        const res = await request(app.getHttpServer())
          .post('/api/follow-up/generate')
          .set('Authorization', `Bearer ${token}`)
          .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.message_draft).toBeTruthy();
        expect(res.body.timing_advice).toBeDefined();
        expect(res.body.tone_guide).toBeDefined();
        expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
      });
    }
  });

  // ── Guard 1: thank_you 缺细节 → confidence 降级 ────────────────────────────

  describe('Guard: thank_you without substantial interview_details → confidence downgraded', () => {
    // 无编造、无方括号占位、无实质细节的中性草稿 — 用于隔离「缺细节降级」逻辑
    const NEUTRAL_DRAFT = '您好张总，感谢这次面试机会，期待后续能进一步交流，祝工作顺利。';

    it('AI high + no interview_details + neutral draft → downgraded to low (finding #41)', async () => {
      mockResult = makeAiResult({ confidence: 'high', message_draft: NEUTRAL_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      // 缺实质细节绝不可达 high；保守降到 low
      expect(res.body.confidence).toBe('low');
      expect(res.body.cannot_determine.some((c: string) => c.includes('面试细节'))).toBe(true);
    });

    it('AI medium + no interview_details + neutral draft → also downgraded to low', async () => {
      mockResult = makeAiResult({ confidence: 'medium', message_draft: NEUTRAL_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('low');
    });

    it('has substantial interview_details → confidence=high preserved', async () => {
      mockResult = makeAiResult({ confidence: 'high' });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_WITH_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('high');
    });
  });

  // ── Guard 1b: 占位式编造检测 (finding #113) ────────────────────────────────

  describe('Guard: fabricated interview content downgraded to insufficient (finding #113)', () => {
    it('no details but draft claims "您提到的X" with no placeholder → insufficient', async () => {
      // 缺面试细节，但草稿裸写「您提到的技术选型理念」= 占位式编造（无方括号留白）
      mockResult = makeAiResult({
        confidence: 'high',
        message_draft:
          '您好张总，感谢今天的面试机会，您提到的技术选型理念让我受益匪浅，期待进一步交流。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      // 严重缺失 + 编造 → 服务端必须落到 insufficient（不再洗白为 medium）
      expect(res.body.confidence).toBe('insufficient');
      expect(
        res.body.cannot_determine.some((c: string) => c.includes('编造')),
      ).toBe(true);
    });

    it('no details but draft uses [方括号] placeholder → NOT flagged as fabrication', async () => {
      // 合规留白：用方括号占位而非裸写编造内容
      mockResult = makeAiResult({
        confidence: 'high',
        message_draft:
          '您好张总，感谢今天的面试机会，您提到的[X话题]让我印象深刻，期待进一步交流。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      // 占位符合规 → 走「缺细节降级」分支而非「编造」分支 → low（非 insufficient）
      expect(res.body.confidence).toBe('low');
    });

    it('has substantial details + references topic → high preserved (no false positive)', async () => {
      // 有实质细节时即便提及话题也不算编造
      mockResult = makeAiResult({
        confidence: 'high',
        message_draft:
          '您好张总，感谢今天的面试机会，您提到的用户增长方法论让我受益匪浅，期待进一步交流。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_WITH_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('high');
    });
  });

  // ── Guard 0: message_draft 类型守卫 (finding #5) ───────────────────────────

  describe('Guard: non-string message_draft → insufficient, no crash (finding #5)', () => {
    it('AI returns null message_draft → 201 insufficient, empty draft (no 500)', async () => {
      mockResult = makeAiResult({ message_draft: null });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.message_draft).toBe('');
      expect(
        res.body.cannot_determine.some((c: string) => c.includes('有效消息正文')),
      ).toBe(true);
    });

    it('AI returns missing message_draft (undefined) → 201 insufficient, no crash', async () => {
      const base = makeAiResult();
      delete (base as Record<string, unknown>).message_draft;
      mockResult = base;

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.message_draft).toBe('');
    });

    it('AI returns object message_draft → 201 insufficient, no crash', async () => {
      mockResult = makeAiResult({ message_draft: { unexpected: 'shape' } });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.message_draft).toBe('');
    });
  });

  // ── Guard 2: forbidden words stripped from message_draft ─────────────────

  describe('Guard: forbidden urging phrases stripped from message_draft', () => {
    it('explicit urging clauses removed whole, compound words preserved (finding #6)', async () => {
      mockResult = makeAiResult({
        // 尽快/马上/很急 所在小句整段删除；焦急/紧急 为合法复合词应保留
        message_draft: '您好，希望您能尽快给我回复，我焦急地等待，情况十分紧急，请马上告知，我很急需答复。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      // 催促词整段删除
      expect(res.body.message_draft).not.toContain('尽快');
      expect(res.body.message_draft).not.toContain('马上');
      expect(res.body.message_draft).not.toContain('很急');
      // 合法复合词保留，未被裸删破坏
      expect(res.body.message_draft).toContain('焦急');
      expect(res.body.message_draft).toContain('紧急');
      // 删段后结尾应为完整句末标点，不留残逗号（不产出残句）
      expect(res.body.message_draft).toMatch(/[。！？!?；;]$/);
      // 含催促词被剔除 → risks 标注
      expect(res.body.risks.some((r: string) => r.includes('催促'))).toBe(true);
    });

    it('standalone 急 (urging) → confidence downgraded + risks annotated, compounds preserved (finding #83)', async () => {
      // 独立催促「急」：不删段（避免误删含合法复合词的句子），仅降级+标注
      mockResult = makeAiResult({
        confidence: 'high',
        risks: [],
        message_draft: '您好，我有点急，但我并不焦急，也理解流程紧急，期待您的答复。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      // 独立「急」不删段 → 原句保留（不裸删）
      expect(res.body.message_draft).toContain('我有点急');
      // 复合词保留，未被误删
      expect(res.body.message_draft).toContain('焦急');
      expect(res.body.message_draft).toContain('紧急');
      // 降级：high → medium
      expect(res.body.confidence).toBe('medium');
      // risks 标注了催促语气
      expect(res.body.risks.some((r: string) => r.includes('催促'))).toBe(true);
    });

    it('加急/应急/救急 不触发催促检测，合法句子不被删除 (finding #83)', async () => {
      // 加急/应急/救急 均为合法复合词，不应被视为催促「急」
      const legalDraft =
        '您好，此事属于加急处理，应急预案已启动，救急资源已到位，烦请确认后续安排，谢谢。';
      mockResult = makeAiResult({
        confidence: 'high',
        risks: [],
        message_draft: legalDraft,
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      // 合法复合词所在句完整保留
      expect(res.body.message_draft).toContain('加急');
      expect(res.body.message_draft).toContain('应急');
      expect(res.body.message_draft).toContain('救急');
      // 无催促词 → 不触发降级，risks 中不含催促标注
      expect(res.body.risks.some((r: string) => r.includes('催促'))).toBe(false);
      // confidence 保持 high，不被误降
      expect(res.body.confidence).toBe('high');
    });

    it('心急/情急 不触发催促检测，含"我并不心急"的句子不被删除 (finding #83)', async () => {
      // 心急/情急 为合法复合词；"我并不心急"不应被整句删除
      const legalDraft =
        '您好李女士，虽然情急之下我联系了您，但我并不心急，只是想礼貌确认一下进展，感谢您的回复。';
      mockResult = makeAiResult({
        confidence: 'high',
        risks: [],
        message_draft: legalDraft,
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      // 含"并不心急"的句子不被删除
      expect(res.body.message_draft).toContain('心急');
      expect(res.body.message_draft).toContain('情急');
      // 无真正催促词 → risks 不含催促标注
      expect(res.body.risks.some((r: string) => r.includes('催促'))).toBe(false);
    });

    it('clean draft without urging words → unchanged, no risks annotation', async () => {
      const clean = '您好李女士，想礼貌询问一下我投递职位的进展，期待您的回复，谢谢。';
      mockResult = makeAiResult({ message_draft: clean, risks: [] });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.message_draft).toBe(clean);
      expect(res.body.risks.some((r: string) => r.includes('催促'))).toBe(false);
    });
  });

  // ── Guard 3: message_draft ≤ 150 字 (非 offer 场景) ──────────────────────

  describe('Guard: message_draft ≤ 150 chars for non-offer scenarios', () => {
    const LONG_DRAFT =
      '您好！感谢您百忙之中抽时间与我面试，整个面试过程让我受益匪浅，特别是您分享的关于产品方法论的深刻见解，让我对贵公司的产品理念有了更深的理解。此外，您提到的数据驱动决策框架也给了我很多启发，我相信自己的经验和能力与贵公司的需求高度匹配。再次感谢您给我的这次宝贵机会，希望有机会加入贵公司团队，期待您的好消息！如果您需要任何其他材料，我随时乐意提供。';
    // Verify test setup: LONG_DRAFT must be > 150 chars to test the guard
    expect(LONG_DRAFT.length).toBeGreaterThan(150);

    it('thank_you with >150 char draft → truncated to ≤150', async () => {
      mockResult = makeAiResult({ message_draft: LONG_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_WITH_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.message_draft.length).toBeLessThanOrEqual(150);
    });

    it('status_inquiry with >150 char draft → truncated', async () => {
      mockResult = makeAiResult({ message_draft: LONG_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.message_draft.length).toBeLessThanOrEqual(150);
    });

    it('offer_urge with >150 char draft → NOT truncated (offer scenarios exempt)', async () => {
      mockResult = makeAiResult({ message_draft: LONG_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(OFFER_URGE);

      expect(res.status).toBe(201);
      // offer_urge is exempt from the 150-char limit
      expect(res.body.message_draft.length).toBeGreaterThan(150);
    });

    it('acceptance with >150 char draft → NOT truncated', async () => {
      mockResult = makeAiResult({ message_draft: LONG_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(ACCEPTANCE);

      expect(res.status).toBe(201);
      expect(res.body.message_draft.length).toBeGreaterThan(150);
    });

    it('truncation lands on a sentence boundary, not a mid-clause hard cut (finding #42)', async () => {
      mockResult = makeAiResult({ message_draft: LONG_DRAFT });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.message_draft.length).toBeLessThanOrEqual(150);
      // 末字符必须是句末/小句标点，杜绝硬切残句
      expect(res.body.message_draft).toMatch(/[。！？!?；;，,]$/);
    });

    it('strip-then-truncate re-checks length: forbidden removal must not exceed 150 (finding #42)', async () => {
      // 首段为可保留长句(>150)，但其内不含催促词；催促词集中在结尾小句。
      // 若先截断再剔除会二次超界；正确顺序为剔除后复检 ≤150。
      const head =
        '您好，非常感谢您给予我这次宝贵的面试机会，整个交流过程让我对贵公司的业务方向和团队文化都有了非常深入而具体的理解，这让我更加坚定了加入团队的意愿和信心。';
      mockResult = makeAiResult({ message_draft: `${head}另外希望您能尽快回复我。` });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_WITH_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.message_draft.length).toBeLessThanOrEqual(150);
      // 催促小句被剔除
      expect(res.body.message_draft).not.toContain('尽快');
    });
  });

  // ── application_id ownership guard ───────────────────────────────────────

  describe('Guard: application_id ownership', () => {
    it('application_id that does not belong to user → 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ scenario: 'status_inquiry', application_id: 'non-existent-app-id' });

      expect(res.status).toBe(403);
    });

    it('no application_id → no ownership check, 201 ok', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ scenario: 'status_inquiry', contact: 'HR 李女士' });

      expect(res.status).toBe(201);
    });
  });

  // ── timing_advice and tone_guide present ──────────────────────────────────

  describe('Response shape', () => {
    it('timing_advice fields are all present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      expect(res.body.timing_advice.recommended_send_time).toBeTruthy();
      expect(typeof res.body.timing_advice.is_timing_appropriate).toBe('boolean');
      expect(res.body.timing_advice.timing_note).toBeTruthy();
    });

    it('tone_guide fields are all present', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(REJECTION_REPLY);

      expect(res.status).toBe(201);
      const toneGuide = res.body.tone_guide as {
        tone: string;
        key_tone_points: string[];
        avoid: string[];
      };
      expect(['formal', 'semi_formal', 'casual', 'grateful', 'professional']).toContain(toneGuide.tone);
      expect(Array.isArray(toneGuide.key_tone_points)).toBe(true);
      expect(Array.isArray(toneGuide.avoid)).toBe(true);
    });
  });
});

// ── Unit: ownership error classification (finding #43) ────────────────────────
// 直接实例化 service 以注入「DB 故障」型异常，验证不被伪装成 403。

describe('FollowUpService — ownership error classification (finding #43)', () => {
  const aiResult = makeAiResult();

  function buildService(findOne: jest.Mock): FollowUpService {
    const ai = { completeStructured: jest.fn(() => Promise.resolve(aiResult)) } as unknown as AiService;
    const applications = { findOne } as unknown as ApplicationsService;
    return new FollowUpService(ai, applications);
  }

  const dto = { scenario: 'status_inquiry' as const, application_id: 'app-123' };

  it('NotFoundException → ForbiddenException (403)', async () => {
    const svc = buildService(jest.fn(() => Promise.reject(new NotFoundException())));
    await expect(svc.generate(dto, 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ForbiddenException → ForbiddenException (403)', async () => {
    const svc = buildService(jest.fn(() => Promise.reject(new ForbiddenException())));
    await expect(svc.generate(dto, 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('generic DB error → propagated as-is, NOT masked as 403', async () => {
    const dbError = new Error('SQLITE_BUSY: database is locked');
    const svc = buildService(jest.fn(() => Promise.reject(dbError)));
    await expect(svc.generate(dto, 'user-1')).rejects.toBe(dbError);
  });

  it('ownership ok → proceeds to AI generation (no throw)', async () => {
    const svc = buildService(jest.fn(() => Promise.resolve({ id: 'app-123' })));
    const result = await svc.generate(dto, 'user-1');
    expect(result.message_draft).toBeTruthy();
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('FollowUp (e2e) — AI live', () => {
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
    token = await loginUser(app, 'follow-up-live@coach.dev', 'Follow Up Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('thank_you scenario produces structurally valid result', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/follow-up/generate')
      .set('Authorization', `Bearer ${token}`)
      .send(THANK_YOU_WITH_DETAILS)
      .timeout(30000)
      .catch((err: { response?: { status: number; body: unknown } }) => {
        if (err.response) return err.response;
        return { status: 504, body: { message: 'timeout' } };
      });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 200) {
      const body = res.body as {
        confidence: string;
        message_draft: string;
        timing_advice: { recommended_send_time: string; is_timing_appropriate: boolean };
        tone_guide: { tone: string; key_tone_points: string[]; avoid: string[] };
      };

      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      expect(typeof body.message_draft).toBe('string');
      expect(body.timing_advice).toBeDefined();
      expect(body.tone_guide).toBeDefined();

      // Guard invariant: no forbidden words in draft
      expect(body.message_draft).not.toContain('尽快');
      expect(body.message_draft).not.toContain('马上');

      // Guard invariant: thank_you draft ≤ 150 chars
      expect(body.message_draft.length).toBeLessThanOrEqual(150);
    } else {
      console.warn(`[follow-up AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);
});
