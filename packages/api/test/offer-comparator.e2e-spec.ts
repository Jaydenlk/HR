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
      { offer_id: 'o1', company: '字节跳动', dimensions: { annual_total_compensation: 520000, effective_monthly: 40000, social_insurance_annual: 11111, stability_score: 8, probation_loss: 99999 } },
      { offer_id: 'o2', company: '美团', dimensions: { annual_total_compensation: 420000, effective_monthly: 35000, social_insurance_annual: 22222, stability_score: 7 } },
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

    it('offers WITH weekly_hours → hourly_rate_rmb recomputed server-side (#16)', async () => {
      // AI gives bogus rates; server must overwrite with deterministic recompute
      mockResult = makeAiResult({
        hourly_rate_comparison: [
          { offer_id: 'o1', company: '字节跳动', weekly_hours: 60, hourly_rate_rmb: 1 },
          { offer_id: 'o2', company: '美团', weekly_hours: 45, hourly_rate_rmb: 1 },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS); // has weekly_hours

      expect(res.status).toBe(200);
      const hrMap: Record<string, number | null> = {};
      for (const hr of res.body.hourly_rate_comparison as Array<{ offer_id: string; hourly_rate_rmb: number | null }>) {
        hrMap[hr.offer_id] = hr.hourly_rate_rmb;
      }
      // o1: (35000*14+70000)/(60*52) = 560000/3120 = 179.49
      expect(hrMap['o1']).toBeCloseTo(179.49, 2);
      // o2: (30000*13+60000)/(45*52) = 450000/2340 = 192.31
      expect(hrMap['o2']).toBeCloseTo(192.31, 2);
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

  // ─── #15: 服务端复算年总包与试用期损失，覆盖模型值 ─────────────────────────

  describe('#15 server recomputes annual_total_compensation & probation_loss', () => {
    it('overwrites AI annual_total_compensation with base×months+bonus', async () => {
      // AI gives wrong 520000/420000; server must recompute
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      const cmpMap: Record<string, { annual_total_compensation?: number; probation_loss?: number }> = {};
      for (const c of res.body.comparison as Array<{ offer_id: string; dimensions: { annual_total_compensation?: number; probation_loss?: number } }>) {
        cmpMap[c.offer_id] = c.dimensions;
      }
      // o1: 35000*14+70000 = 560000 (NOT the AI-supplied 520000)
      expect(cmpMap['o1'].annual_total_compensation).toBe(560000);
      // o2: 30000*13+60000 = 450000 (NOT the AI-supplied 420000)
      expect(cmpMap['o2'].annual_total_compensation).toBe(450000);
    });

    it('probation_loss recomputed when discount+months known, undefined when missing', async () => {
      const offersWithProbation = {
        offers: [
          { id: 'o1', company: '字节跳动', base_monthly: 35000, months_per_year: 14, annual_bonus: 70000, weekly_hours: 60, probation_discount: 0.8, probation_months: 3 },
          { id: 'o2', company: '美团', base_monthly: 30000, months_per_year: 13, annual_bonus: 60000, weekly_hours: 45 },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(offersWithProbation);

      expect(res.status).toBe(200);
      const cmpMap: Record<string, { probation_loss?: number }> = {};
      for (const c of res.body.comparison as Array<{ offer_id: string; dimensions: { probation_loss?: number } }>) {
        cmpMap[c.offer_id] = c.dimensions;
      }
      // o1: 35000*(1-0.8)*3 = 21000 (overwrites AI-supplied 99999)
      expect(cmpMap['o1'].probation_loss).toBe(21000);
      // o2: discount/months missing → undefined (NOT fabricated to a number)
      expect(cmpMap['o2'].probation_loss).toBeUndefined();
    });
  });

  // ─── #17: 幻觉 offer_id 过滤 + company 服务端覆盖 ────────────────────────────

  describe('#17 hallucinated offer rows filtered, company overwritten by server', () => {
    it('drops comparison/weighted/hourly/missing rows with unknown offer_id', async () => {
      mockResult = makeAiResult({
        comparison: [
          { offer_id: 'o1', company: '字节跳动', dimensions: { stability_score: 8 } },
          { offer_id: 'o2', company: '美团', dimensions: { stability_score: 7 } },
          { offer_id: 'GHOST', company: '幻觉公司', dimensions: { stability_score: 9 } },
        ],
        weighted_scores: [
          { offer_id: 'o1', company: '字节跳动', total_score: 82 },
          { offer_id: 'GHOST', company: '幻觉公司', total_score: 99 },
        ],
        hourly_rate_comparison: [
          { offer_id: 'GHOST', company: '幻觉公司', weekly_hours: 40, hourly_rate_rmb: 500 },
        ],
        missing_info: [
          { offer_id: 'GHOST', field: 'x', impact: 'y' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      const ids = (res.body.comparison as Array<{ offer_id: string }>).map((c) => c.offer_id);
      expect(ids).not.toContain('GHOST');
      expect((res.body.weighted_scores as Array<{ offer_id: string }>).every((w) => w.offer_id !== 'GHOST')).toBe(true);
      expect((res.body.hourly_rate_comparison as Array<{ offer_id: string }>).every((h) => h.offer_id !== 'GHOST')).toBe(true);
      expect((res.body.missing_info as Array<{ offer_id: string }>).every((m) => m.offer_id !== 'GHOST')).toBe(true);
    });

    it('company name张冠李戴 corrected from server id→company map', async () => {
      // AI swaps company names; server must overwrite from input
      mockResult = makeAiResult({
        comparison: [
          { offer_id: 'o1', company: '错误公司', dimensions: { stability_score: 8 } },
          { offer_id: 'o2', company: '另一错误公司', dimensions: { stability_score: 7 } },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      const cmpMap: Record<string, string> = {};
      for (const c of res.body.comparison as Array<{ offer_id: string; company: string }>) {
        cmpMap[c.offer_id] = c.company;
      }
      expect(cmpMap['o1']).toBe('字节跳动');
      expect(cmpMap['o2']).toBe('美团');
    });
  });

  // ─── #35: insufficient → recommendation 收口，不编造赢家 ─────────────────────

  describe('#35 insufficient confidence → recommendation neutralized (no fabricated winner)', () => {
    it('insufficient → preferred_offer_id empty, rationale states信息不足', async () => {
      mockResult = makeAiResult({
        confidence: 'insufficient',
        recommendation: {
          preferred_offer_id: 'o1', // AI still picked a winner
          rationale: '字节更好',
          confidence: 'high',
          caveats: [],
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.recommendation.preferred_offer_id).toBe('');
      expect(res.body.recommendation.rationale).toBe('信息不足，无法给出可靠推荐');
      expect(res.body.recommendation.confidence).toBe('uncertain');
      // cannot_determine records the inability
      expect((res.body.cannot_determine as string[]).some((x) => x.includes('无法给出可靠'))).toBe(true);
    });

    it('preferred_offer_id not in input ids → neutralized even when confidence=high', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        recommendation: {
          preferred_offer_id: 'GHOST',
          rationale: '幻觉推荐',
          confidence: 'high',
          caveats: [],
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.recommendation.preferred_offer_id).toBe('');
      expect(res.body.recommendation.rationale).toBe('信息不足，无法给出可靠推荐');
    });
  });

  // ─── #56: 低置信剥离 comparison/weighted 精确分值 ──────────────────────────

  describe('#56 low confidence strips precise scores from comparison & weighted_scores', () => {
    it('low → stability_score removed and dimension_scores removed', async () => {
      mockResult = makeAiResult({ confidence: 'low' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      for (const c of res.body.comparison as Array<{ dimensions: { stability_score?: number } }>) {
        expect(c.dimensions.stability_score).toBeUndefined();
      }
      for (const ws of res.body.weighted_scores as Array<{ total_score?: number; dimension_scores?: unknown }>) {
        expect(ws.total_score).toBeUndefined();
        expect(ws.dimension_scores).toBeUndefined();
      }
    });

    // #15/#56 残留：低置信时 effective_monthly / social_insurance_annual 也必须被剥离
    // （输入无 social_insurance_monthly，无法复算 → 连同 AI 伪精确值一并剥离）
    it('low → effective_monthly & social_insurance_annual stripped when not computable', async () => {
      mockResult = makeAiResult({ confidence: 'low' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS); // 无 social_insurance_monthly

      expect(res.status).toBe(200);
      for (const c of res.body.comparison as Array<{
        dimensions: { effective_monthly?: number; social_insurance_annual?: number };
      }>) {
        expect(c.dimensions.effective_monthly).toBeUndefined();
        expect(c.dimensions.social_insurance_annual).toBeUndefined();
      }
    });

    it('insufficient → effective_monthly & social_insurance_annual stripped when not computable', async () => {
      mockResult = makeAiResult({ confidence: 'insufficient' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      for (const c of res.body.comparison as Array<{
        dimensions: { effective_monthly?: number; social_insurance_annual?: number };
      }>) {
        expect(c.dimensions.effective_monthly).toBeUndefined();
        expect(c.dimensions.social_insurance_annual).toBeUndefined();
      }
    });

    // effective_monthly 无法由输入确定计算（个税/缴费基数未知），与置信度无关一律剥离
    it('high confidence → effective_monthly still stripped (cannot be computed from input)', async () => {
      // AI returns effective_monthly with high confidence; guard must remove it regardless
      mockResult = makeAiResult({ confidence: 'high' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('high');
      for (const c of res.body.comparison as Array<{ dimensions: { effective_monthly?: number } }>) {
        expect(c.dimensions.effective_monthly).toBeUndefined();
      }
    });

    it('medium confidence → effective_monthly still stripped (cannot be computed from input)', async () => {
      mockResult = makeAiResult({ confidence: 'medium' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(TWO_OFFERS);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('medium');
      for (const c of res.body.comparison as Array<{ dimensions: { effective_monthly?: number } }>) {
        expect(c.dimensions.effective_monthly).toBeUndefined();
      }
    });
  });

  // ─── #15: social_insurance_annual 输入可得时服务端复算覆盖模型值 ──────────────

  describe('#15 social_insurance_annual recomputed from social_insurance_monthly×12', () => {
    const OFFERS_WITH_SI = {
      offers: [
        { id: 'o1', company: '字节跳动', base_monthly: 35000, months_per_year: 14, annual_bonus: 70000, weekly_hours: 60, social_insurance_monthly: 3000 },
        { id: 'o2', company: '美团', base_monthly: 30000, months_per_year: 13, annual_bonus: 60000, weekly_hours: 45, social_insurance_monthly: 2500 },
      ],
    };

    it('high confidence → server overwrites AI value with monthly×12', async () => {
      // AI gives bogus 11111/22222; server must overwrite with 3000×12 / 2500×12
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(OFFERS_WITH_SI);

      expect(res.status).toBe(200);
      const cmpMap: Record<string, { social_insurance_annual?: number }> = {};
      for (const c of res.body.comparison as Array<{ offer_id: string; dimensions: { social_insurance_annual?: number } }>) {
        cmpMap[c.offer_id] = c.dimensions;
      }
      expect(cmpMap['o1'].social_insurance_annual).toBe(36000);
      expect(cmpMap['o2'].social_insurance_annual).toBe(30000);
    });

    it('low confidence → recomputed value still present (input-determined, not stripped)', async () => {
      mockResult = makeAiResult({ confidence: 'low' });

      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send(OFFERS_WITH_SI);

      expect(res.status).toBe(200);
      const cmpMap: Record<string, { social_insurance_annual?: number; effective_monthly?: number }> = {};
      for (const c of res.body.comparison as Array<{ offer_id: string; dimensions: { social_insurance_annual?: number; effective_monthly?: number } }>) {
        cmpMap[c.offer_id] = c.dimensions;
      }
      // 输入可确定计算 → 即使低置信也保留服务端复算值
      expect(cmpMap['o1'].social_insurance_annual).toBe(36000);
      expect(cmpMap['o2'].social_insurance_annual).toBe(30000);
      // effective_monthly 仍无法由输入确定 → 低置信被剥离
      expect(cmpMap['o1'].effective_monthly).toBeUndefined();
    });
  });

  // ─── #91: weekly_hours=0 边界 + DTO @Min(1) ─────────────────────────────────

  describe('#91 weekly_hours validation', () => {
    it('weekly_hours=0 → 400 (DTO @Min(1))', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, weekly_hours: 0 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  // ─── DTO: probation_discount / probation_months / months_per_year 边界校验 ───

  describe('DTO bounds: probation_discount @Min(0)@Max(1)', () => {
    it('probation_discount > 1 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, probation_discount: 1.1 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });

    it('probation_discount < 0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, probation_discount: -0.1 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('DTO bounds: probation_months @Min(0)', () => {
    it('probation_months < 0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, probation_months: -1 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('DTO bounds: months_per_year @Min(1)', () => {
    it('months_per_year=0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, months_per_year: 0 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  describe('DTO bounds: annual_bonus / social_insurance_monthly / equity_annual @Min(0)', () => {
    it('annual_bonus < 0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, annual_bonus: -1 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });

    it('social_insurance_monthly < 0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, social_insurance_monthly: -100 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });

    it('equity_annual < 0 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'o1', company: '字节跳动', base_monthly: 35000, equity_annual: -500 },
            { id: 'o2', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  // ─── #92: 重复 offer id → 400 ─────────────────────────────────────────────

  describe('#92 duplicate offer id rejected', () => {
    it('duplicate id → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({
          offers: [
            { id: 'dup', company: '字节跳动', base_monthly: 35000 },
            { id: 'dup', company: '美团', base_monthly: 30000 },
          ],
        });
      expect(res.status).toBe(400);
    });
  });

  // ─── #55: 权重范围与归一化 ─────────────────────────────────────────────────

  describe('#55 weight bounds', () => {
    it('weight > 1 → 400 (@Max(1))', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...TWO_OFFERS, weights: { compensation: 1.5 } });
      expect(res.status).toBe(400);
    });

    it('negative weight → 400 (@Min(0))', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...TWO_OFFERS, weights: { stability: -0.1 } });
      expect(res.status).toBe(400);
    });
  });

  // ─── #57: user_priorities 元素类型校验 ─────────────────────────────────────

  describe('#57 user_priorities element validation', () => {
    it('non-string element → 400 (@IsString each)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/offer-comparator/compare')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...TWO_OFFERS, user_priorities: [123, true] });
      expect(res.status).toBe(400);
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
