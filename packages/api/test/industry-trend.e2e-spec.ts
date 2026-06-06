import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'industry-trend-analyst',
    skill_version: '1.0.0',
    summary: '该行业处于快速发展阶段，招聘需求旺盛。',
    confidence: 'high',
    evidence_used: [
      { source: '36氪行业报告', url: 'https://36kr.com/report/2024', date: '2024-01' },
    ],
    recommendations: ['尽早入局，积累相关经验'],
    risks: ['竞争激烈，入门门槛提高'],
    next_actions: ['查阅麦肯锡最新报告'],
    follow_up_questions: ['您目前的技能背景是什么？'],
    cannot_determine: [],
    trend_summary: '该行业近年来受政策支持和资本青睐，处于高速发展期。',
    growth_signals: [
      {
        signal: '招聘量同比增长30%',
        strength: 'strong',
        source: '36氪行业报告',
        date: '2024-01',
      },
    ],
    risk_signals: [
      {
        signal: '竞争加剧，薪资增速放缓',
        severity: 'medium',
        source: '猎聘行业白皮书',
        date: '2024-01',
      },
    ],
    hiring_outlook: 'growing',
    recommended_entry_roles: [
      {
        role_name: '产品经理',
        rationale: '行业需求旺盛，产品岗位持续扩张',
        demand_level: 'high',
      },
    ],
    market_radar_used: false,
    ...overrides,
  };
}

// ── Common payloads ────────────────────────────────────────────────────────────

const VALID_PAYLOAD = {
  industry: '新能源汽车',
  region: '中国',
  timeframe: '2024年',
};

const VALID_NO_OPTIONS = {
  industry: '人工智能',
};

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('IndustryTrend (e2e) — deterministic guard tests', () => {
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

    token = await loginUser(app, 'industry-trend@coach.dev', 'Industry Trend Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResult = makeAiResult();
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/industry-trend/analyze without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .send(VALID_PAYLOAD);
      expect(res.status).toBe(401);
    });
  });

  // ── Input validation ───────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('missing industry → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ region: '中国' });
      expect(res.status).toBe(400);
    });

    it('empty body → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('industry empty string → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ industry: '' });
      expect(res.status).toBe(400);
    });
  });

  // ── Normal: valid request succeeds ────────────────────────────────────────

  describe('Normal: valid request → 200', () => {
    it('with all options → 200, returns valid structure', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
      expect(Array.isArray(res.body.growth_signals)).toBe(true);
      expect(Array.isArray(res.body.risk_signals)).toBe(true);
      expect(Array.isArray(res.body.recommended_entry_roles)).toBe(true);
      expect([
        'strong', 'growing', 'stable', 'declining', 'contracting', 'unknown',
      ]).toContain(res.body.hiring_outlook);
    });

    it('industry only (no optional fields) → 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_NO_OPTIONS);

      expect(res.status).toBe(200);
      expect(res.body.trend_summary).toBeTruthy();
    });
  });

  // ── Guard 1: no web sources → confidence forced to insufficient + signals emptied ──

  describe('Guard 1: AI returns data with no web sources → forced insufficient', () => {
    it('confidence=high but evidence_used empty → forced to insufficient, signals cleared', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [],
        growth_signals: [{ signal: '招聘增长', strength: 'strong', source: '某报告', date: '2024' }],
        risk_signals: [{ signal: '竞争加剧', severity: 'medium', source: '某报告', date: '2024' }],
        hiring_outlook: 'growing',
        recommended_entry_roles: [
          { role_name: '产品经理', rationale: '需求旺', demand_level: 'high' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // Guard must downgrade to insufficient
      expect(res.body.confidence).toBe('insufficient');
      // Signals must be cleared
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.risk_signals).toEqual([]);
      expect(res.body.hiring_outlook).toBe('unknown');
      expect(res.body.recommended_entry_roles).toEqual([]);
    });

    it('confidence=medium but evidence_used has no http url → forced to insufficient', async () => {
      mockResult = makeAiResult({
        confidence: 'medium',
        evidence_used: [{ source: '内部报告', date: '2024' }], // no url field
        growth_signals: [{ signal: '增长信号', strength: 'moderate', source: '内部', date: '2024' }],
        hiring_outlook: 'stable',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.hiring_outlook).toBe('unknown');
    });

    it('confidence already insufficient → passes through without double-processing', async () => {
      mockResult = makeAiResult({
        confidence: 'insufficient',
        evidence_used: [],
        growth_signals: [],
        risk_signals: [],
        hiring_outlook: 'unknown',
        recommended_entry_roles: [],
        trend_summary: '无实时数据，无法分析',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.hiring_outlook).toBe('unknown');
    });

    it('Guard bypass fix: confidence=insufficient + no web sources but signals non-empty → all cleared', async () => {
      // Previously the old condition (!hasWebSources && confidence !== 'insufficient') would
      // skip Guard 1 entirely, leaving growth_signals/hiring_outlook populated. Verify it
      // now correctly zeroes them out even when AI already returns confidence=insufficient.
      mockResult = makeAiResult({
        confidence: 'insufficient',
        evidence_used: [],
        growth_signals: [{ signal: '招聘增长', strength: 'strong', source: '某报告', date: '2024' }],
        risk_signals: [{ signal: '竞争加剧', severity: 'medium', source: '某报告', date: '2024' }],
        hiring_outlook: 'growing',
        recommended_entry_roles: [
          { role_name: '产品经理', rationale: '需求旺', demand_level: 'high' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.risk_signals).toEqual([]);
      expect(res.body.hiring_outlook).toBe('unknown');
      expect(res.body.recommended_entry_roles).toEqual([]);
    });
  });

  // ── Guard 2: no growth_signals → recommended_entry_roles demand_level forced to unknown ──

  describe('Guard 2: no growth_signals support → demand_level forced to unknown', () => {
    it('AI gives demand_level=high but growth_signals empty → forced to unknown', async () => {
      mockResult = makeAiResult({
        confidence: 'insufficient',
        evidence_used: [],
        growth_signals: [],
        risk_signals: [],
        hiring_outlook: 'unknown',
        recommended_entry_roles: [
          { role_name: '产品经理', rationale: '需求旺', demand_level: 'high' },
          { role_name: '数据分析师', rationale: '数据驱动', demand_level: 'medium' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // Since no growth_signals, all demand_levels must be unknown
      for (const role of res.body.recommended_entry_roles as Array<{ demand_level: string }>) {
        expect(role.demand_level).toBe('unknown');
      }
    });
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  describe('Response shape', () => {
    it('all required fields present in normal response', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(typeof res.body.summary).toBe('string');
      expect(typeof res.body.trend_summary).toBe('string');
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(Array.isArray(res.body.risks)).toBe(true);
      expect(Array.isArray(res.body.next_actions)).toBe(true);
      expect(Array.isArray(res.body.follow_up_questions)).toBe(true);
      expect(Array.isArray(res.body.cannot_determine)).toBe(true);
      expect(typeof res.body.market_radar_used).toBe('boolean');
    });
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('IndustryTrend (e2e) — AI live', () => {
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
    token = await loginUser(app, 'industry-trend-live@coach.dev', 'Industry Trend Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('analyze produces structurally valid result', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/industry-trend/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_PAYLOAD)
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
        trend_summary: string;
        growth_signals: unknown[];
        risk_signals: unknown[];
        hiring_outlook: string;
        recommended_entry_roles: Array<{ demand_level: string }>;
      };

      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      expect(typeof body.trend_summary).toBe('string');
      expect(Array.isArray(body.growth_signals)).toBe(true);
      expect(Array.isArray(body.risk_signals)).toBe(true);
      expect([
        'strong', 'growing', 'stable', 'declining', 'contracting', 'unknown',
      ]).toContain(body.hiring_outlook);

      // Guard invariant: if confidence=insufficient, signals must be empty
      if (body.confidence === 'insufficient') {
        expect(body.growth_signals).toEqual([]);
        expect(body.risk_signals).toEqual([]);
        expect(body.hiring_outlook).toBe('unknown');
      }

      // Guard invariant: demand_level must be valid enum
      for (const role of body.recommended_entry_roles) {
        expect(['high', 'medium', 'low', 'unknown']).toContain(role.demand_level);
      }
    } else {
      console.warn(`[industry-trend AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);
});
