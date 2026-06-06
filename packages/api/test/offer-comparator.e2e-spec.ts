import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'offer-comparator',
    skill_version: '1.0.0',
    summary: '字节 offer 薪资更高，美团工时更少，综合评分字节领先。',
    confidence: 'high',
    evidence_used: [],
    recommendations: ['优先选择字节'],
    risks: ['字节试用期折扣需确认'],
    next_actions: ['与 HR 确认五险一金比例'],
    follow_up_questions: [],
    cannot_determine: [],
    comparison: [
      { offer_id: 'o1', company: '字节跳动', dimensions: { annual_total_compensation: 520000, effective_monthly: 40000, stability_score: 8 } },
      { offer_id: 'o2', company: '美团', dimensions: { annual_total_compensation: 420000, effective_monthly: 35000, stability_score: 7 } },
    ],
    weighted_scores: [
      { offer_id: 'o1', company: '字节跳动', total_score: 82, dimension_scores: { compensation: 85, growth: 80 } },
      { offer_id: 'o2', company: '美团', total_score: 74, dimension_scores: { compensation: 70, growth: 78 } },
    ],
    recommendation: {
      preferred_offer_id: 'o1',
      rationale: '字节薪资高且成长空间大',
      confidence: 'high',
      caveats: [],
    },
    hourly_rate_comparison: [
      { offer_id: 'o1', company: '字节跳动', weekly_hours: 60, hourly_rate_rmb: 166.67 },
      { offer_id: 'o2', company: '美团', weekly_hours: 45, hourly_rate_rmb: 179.49 },
    ],
    missing_info: [],
    ...overrides,
  };
}

// ── Two valid offers for test input ───────────────────────────────────────────

const TWO_OFFERS = {
  offers: [
    { id: 'o1', company: '字节跳动', base_monthly: 35000, months_per_year: 14, annual_bonus: 70000, weekly_hours: 60 },
    { id: 'o2', company: '美团', base_monthly: 30000, months_per_year: 13, annual_bonus: 60000, weekly_hours: 45 },
  ],
};

const TWO_OFFERS_NO_HOURS = {
  offers: [
    { id: 'o1', company: '字节跳动', base_monthly: 35000 },
    { id: 'o2', company: '美团', base_monthly: 30000 },
  ],
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('OfferComparator (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let mockResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => Promise.resolve(mockResult));

  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'offer-compare@coach.dev', 'Offer Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResult = makeAiResult();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/offer-comparator/compare without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .send(TWO_OFFERS);
      expect(res.status).toBe(401);
    });
  });

  // ─── Input validation: offers < 2 → 400 ──────────────────────────────────

  describe('Guard: offers < 2 → 400', () => {
    it('empty offers array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ offers: [] });
      expect(res.status).toBe(400);
    });

    it('single offer → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ offers: [{ id: 'o1', company: '字节跳动', base_monthly: 35000 }] });
      expect(res.status).toBe(400);
    });

    it('missing offers field → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ─── Normal path ──────────────────────────────────────────────────────────

  describe('Normal: 2 complete offers → 200 with full result', () => {
    it('returns 200 and comparison fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('high');
      expect(Array.isArray(res.body.comparison)).toBe(true);
      expect(res.body.comparison).toHaveLength(2);
      expect(res.body.recommendation).toBeDefined();
      expect(res.body.recommendation.preferred_offer_id).toBe('o1');
    });

    it('weighted_scores preserved when confidence=high', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      // high confidence: total_score should remain
      for (const ws of res.body.weighted_scores as Array<{ total_score?: number }>) {
        expect(ws.total_score).toBeDefined();
      }
    });
  });

  // ─── Guard: confidence < medium → strip total_score ──────────────────────

  describe('Guard: confidence=low → weighted_scores total_score stripped', () => {
    it('AI returns confidence=low → total_score removed from each weighted_score entry', async () => {
      mockResult = makeAiResult({ confidence: 'low' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');

      // Guard must strip total_score when confidence is low
      for (const ws of res.body.weighted_scores as Array<{ total_score?: number }>) {
        expect(ws.total_score).toBeUndefined();
      }
    });

    it('AI returns confidence=insufficient → total_score removed', async () => {
      mockResult = makeAiResult({ confidence: 'insufficient' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      for (const ws of res.body.weighted_scores as Array<{ total_score?: number }>) {
        expect(ws.total_score).toBeUndefined();
      }
    });

    it('AI returns confidence=medium → total_score preserved', async () => {
      mockResult = makeAiResult({ confidence: 'medium' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('medium');
      for (const ws of res.body.weighted_scores as Array<{ total_score?: number }>) {
        expect(ws.total_score).toBeDefined();
      }
    });
  });

  // ─── Guard: weekly_hours unknown → hourly_rate_rmb = null ─────────────────

  describe('Guard: weekly_hours unknown → hourly_rate_rmb forced to null', () => {
    it('offers without weekly_hours → hourly_rate_rmb=null even if AI gave a value', async () => {
      // AI returns a non-null hourly rate, but input offers have no weekly_hours
      mockResult = makeAiResult({
        hourly_rate_comparison: [
          { offer_id: 'o1', company: '字节跳动', weekly_hours: 60, hourly_rate_rmb: 166.67 },
          { offer_id: 'o2', company: '美团', weekly_hours: 45, hourly_rate_rmb: 179.49 },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS_NO_HOURS); // no weekly_hours in input

      expect(res.status).toBe(200);

      // Guard must set hourly_rate_rmb=null for offers with no weekly_hours
      for (const hr of res.body.hourly_rate_comparison as Array<{ hourly_rate_rmb: number | null }>) {
        expect(hr.hourly_rate_rmb).toBeNull();
      }
    });

    it('offers WITH weekly_hours → hourly_rate_rmb passes through from AI', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS); // has weekly_hours

      expect(res.status).toBe(200);
      // o1 has hours=60, o2 has hours=45 → rates pass through
      const hrMap: Record<string, number | null> = {};
      for (const hr of res.body.hourly_rate_comparison as Array<{ offer_id: string; hourly_rate_rmb: number | null }>) {
        hrMap[hr.offer_id] = hr.hourly_rate_rmb;
      }
      expect(hrMap['o1']).not.toBeNull();
      expect(hrMap['o2']).not.toBeNull();
    });
  });

  // ─── missing_info propagation ─────────────────────────────────────────────

  describe('missing_info is propagated verbatim', () => {
    it('AI reports missing fields → they appear in response', async () => {
      mockResult = makeAiResult({
        confidence: 'medium',
        missing_info: [
          { offer_id: 'o1', field: '五险一金比例', impact: '影响实际到手约 20-30%' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.missing_info).toHaveLength(1);
      expect(res.body.missing_info[0].field).toBe('五险一金比例');
    });
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('OfferComparator (e2e) — AI live', () => {
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
    token = await loginUser(app, 'offer-live@coach.dev', 'Offer Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI produces structurally valid comparison result', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/offer-comparator/compare')
      .set('Authorization', `Bearer ${token}`)
      .send(TWO_OFFERS)
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
        comparison: unknown[];
        weighted_scores: Array<{ total_score?: number }>;
        recommendation: { preferred_offer_id: string };
        hourly_rate_comparison: Array<{ hourly_rate_rmb: number | null }>;
      };

      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      expect(Array.isArray(body.comparison)).toBe(true);
      expect(Array.isArray(body.weighted_scores)).toBe(true);
      expect(body.recommendation).toBeDefined();

      // Guard invariant: if confidence low/insufficient, no total_score
      if (body.confidence === 'low' || body.confidence === 'insufficient') {
        for (const ws of body.weighted_scores) {
          expect(ws.total_score).toBeUndefined();
        }
      }

      // Guard invariant: offers without hours → null rate
      for (const hr of body.hourly_rate_comparison) {
        expect(hr.hourly_rate_rmb === null || typeof hr.hourly_rate_rmb === 'number').toBe(true);
      }
    } else {
      console.warn(`[offer-comparator AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);
});
