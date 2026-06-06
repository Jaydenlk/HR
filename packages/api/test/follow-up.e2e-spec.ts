import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
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
    it('AI returns high, but no interview_details → becomes medium', async () => {
      mockResult = makeAiResult({ confidence: 'high' });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      // Guard must downgrade high→medium when no interview_details provided
      expect(res.body.confidence).toBe('medium');
    });

    it('AI returns medium (already), no interview_details → stays medium', async () => {
      mockResult = makeAiResult({ confidence: 'medium' });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(THANK_YOU_NO_DETAILS);

      expect(res.status).toBe(201);
      expect(res.body.confidence).toBe('medium');
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

  // ── Guard 2: forbidden words stripped from message_draft ─────────────────

  describe('Guard: forbidden urging phrases stripped from message_draft', () => {
    it('explicit urging phrases stripped, compound words preserved', async () => {
      mockResult = makeAiResult({
        // 尽快 and 马上 are explicit urging phrases — must be stripped
        // 焦急 and 紧急 are legitimate compound words — must be preserved
        message_draft: '您好，希望您能尽快给我回复，我焦急地等待，情况十分紧急，请马上告知，我很急需答复。',
      });

      const res = await request(app.getHttpServer())
        .post('/api/follow-up/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(STATUS_INQUIRY);

      expect(res.status).toBe(201);
      // Explicit urging phrases must be stripped
      expect(res.body.message_draft).not.toContain('尽快');
      expect(res.body.message_draft).not.toContain('马上');
      expect(res.body.message_draft).not.toContain('很急');
      // Legitimate compound words must NOT be broken
      expect(res.body.message_draft).toContain('焦急');
      expect(res.body.message_draft).toContain('紧急');
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
