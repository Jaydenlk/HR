import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

// 信号陈旧阈值与 service 中 STALE_MONTHS 保持一致（18 月）。用「当前月份」生成新鲜日期，
// 避免测试随真实日期推移而把本应保留的信号判为陈旧。
const RECENT_DATE = new Date().toISOString().slice(0, 7); // YYYY-MM

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'industry-trend-analyst',
    skill_version: '1.0.0',
    summary: '该行业处于快速发展阶段，招聘需求旺盛。',
    confidence: 'high',
    evidence_used: [
      { source: '36氪行业报告', url: 'https://36kr.com/report/2024', date: RECENT_DATE },
      { source: '猎聘行业白皮书', url: 'https://www.liepin.com/whitepaper', date: RECENT_DATE },
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
        date: RECENT_DATE,
      },
    ],
    risk_signals: [
      {
        signal: '竞争加剧，薪资增速放缓',
        severity: 'medium',
        source: '猎聘行业白皮书',
        date: RECENT_DATE,
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
      // 来源可溯源 + 日期新鲜 → 信号应保留，非误删
      expect(res.body.growth_signals.length).toBe(1);
      expect(res.body.risk_signals.length).toBe(1);
      // 有 growth 支撑 → demand_level 保留 high（不被强制 unknown）
      expect(res.body.recommended_entry_roles[0].demand_level).toBe('high');
      // #44: market_radar_used 服务端强制 false，不采信模型自报
      expect(res.body.market_radar_used).toBe(false);
      // #8: trend_summary 末尾应拼时效性免责
      expect(res.body.trend_summary).toContain('时效性提示');
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

  // ── #7: per-signal source 必须可溯源到带 http 的证据，否则剔除 ──────────────

  describe('#7 anti-fabrication: signal source must trace to an http evidence', () => {
    it('growth_signal source 不在任何带 http 证据中 → 该信号被剔除', async () => {
      mockResult = makeAiResult({
        // 仅一条带 http 的证据，source=36氪
        evidence_used: [
          { source: '36氪行业报告', url: 'https://36kr.com/r', date: RECENT_DATE },
        ],
        growth_signals: [
          // 可溯源：source 命中 36氪证据 → 保留
          { signal: '招聘增长20%', strength: 'strong', source: '36氪行业报告', date: RECENT_DATE },
          // 无法溯源：source=某神秘机构，不在证据中 → 剔除（防编造）
          { signal: '估值翻倍', strength: 'strong', source: '某神秘机构内部消息', date: RECENT_DATE },
        ],
        risk_signals: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.growth_signals.length).toBe(1);
      expect(res.body.growth_signals[0].signal).toBe('招聘增长20%');
    });

    it('signal source 通过 URL host 命中证据 → 保留', async () => {
      mockResult = makeAiResult({
        evidence_used: [
          { source: '行业门户', url: 'https://www.iresearch.com.cn/report', date: RECENT_DATE },
        ],
        growth_signals: [
          // source 文本里含证据 URL 的 host → 视为可溯源
          { signal: '市场规模扩大', strength: 'moderate', source: '据 www.iresearch.com.cn 报道', date: RECENT_DATE },
        ],
        risk_signals: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.growth_signals.length).toBe(1);
    });

    it('所有 risk_signals 都无法溯源 → 全部剔除', async () => {
      mockResult = makeAiResult({
        evidence_used: [
          { source: '36氪行业报告', url: 'https://36kr.com/r', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '招聘增长', strength: 'strong', source: '36氪行业报告', date: RECENT_DATE },
        ],
        risk_signals: [
          { signal: '裁员潮', severity: 'high', source: '坊间传闻', date: RECENT_DATE },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.risk_signals).toEqual([]);
    });
  });

  // ── #8: 陈旧信号剔除 + 时效性免责 ────────────────────────────────────────────

  describe('#8 timeliness: stale signal dropped + disclaimer appended', () => {
    it('signal date 多年前（陈旧）→ 即便可溯源也被剔除', async () => {
      mockResult = makeAiResult({
        evidence_used: [
          { source: '36氪行业报告', url: 'https://36kr.com/r', date: RECENT_DATE },
        ],
        growth_signals: [
          // 可溯源但日期过老（> 18 月）→ 剔除
          { signal: '陈年招聘增长', strength: 'strong', source: '36氪行业报告', date: '2018-01' },
          // 可溯源且新鲜 → 保留
          { signal: '近期招聘增长', strength: 'strong', source: '36氪行业报告', date: RECENT_DATE },
        ],
        risk_signals: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.growth_signals.length).toBe(1);
      expect(res.body.growth_signals[0].signal).toBe('近期招聘增长');
    });

    it('signal date 无法解析 → 保守剔除', async () => {
      mockResult = makeAiResult({
        evidence_used: [
          { source: '36氪行业报告', url: 'https://36kr.com/r', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '无日期信号', strength: 'strong', source: '36氪行业报告', date: '近期' },
        ],
        risk_signals: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.growth_signals).toEqual([]);
    });

    it('trend_summary 末尾统一拼时效性免责（有 web 来源路径）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.trend_summary).toContain('时效性提示');
      // 有保留信号 → 仍可见“以上信号…”措辞
      expect(res.body.trend_summary).toContain('以上信号');
    });
  });

  // ── #7/#8: 有 web 来源但所有信号被过滤 → confidence<=low + hiring_outlook=unknown ──

  describe('#7/#8 self-consistency: web sources exist but all signals filtered out', () => {
    it('confidence=high/growing 但所有信号被溯源+陈旧过滤清空 → confidence<=low、hiring_outlook=unknown、无“以上信号”措辞', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        hiring_outlook: 'growing',
        // 有带 http 的 web 证据 → 走 happy-path（非 Guard 1 降级）
        evidence_used: [
          { source: '36氪行业报告', url: 'https://36kr.com/r', date: RECENT_DATE },
        ],
        // growth：可溯源但陈旧 → 被剔除
        growth_signals: [
          { signal: '陈年招聘增长', strength: 'strong', source: '36氪行业报告', date: '2018-01' },
        ],
        // risk：无法溯源 → 被剔除
        risk_signals: [
          { signal: '坊间裁员传闻', severity: 'high', source: '某神秘机构', date: RECENT_DATE },
        ],
        recommended_entry_roles: [
          { role_name: '产品经理', rationale: '需求旺', demand_level: 'high' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // 信号确已全部清空
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.risk_signals).toEqual([]);
      // 自洽：confidence 至多 low（不得停留在 high/medium）
      expect(['low', 'insufficient']).toContain(res.body.confidence);
      // 自洽：hiring_outlook 置 unknown（与 Guard 1 一致）
      expect(res.body.hiring_outlook).toBe('unknown');
      // 无 growth 支撑 → demand_level 强制 unknown
      for (const role of res.body.recommended_entry_roles as Array<{ demand_level: string }>) {
        expect(role.demand_level).toBe('unknown');
      }
      // 时效性提示仍在，但空信号不得出现“以上信号”措辞
      expect(res.body.trend_summary).toContain('时效性提示');
      expect(res.body.trend_summary).not.toContain('以上信号');
    });

    it('#P3: 过短证据 source（“网”）不走反向匹配 → 含“网”的编造信号被剔除', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        hiring_outlook: 'growing',
        // 证据 source 仅一个汉字“网”（length<3），不可作反向匹配依据
        evidence_used: [
          { source: '网', url: 'https://example.com/r', date: RECENT_DATE },
        ],
        growth_signals: [
          // signal source 含“网”，若启用反向匹配会被误判可溯源 → 应被剔除
          { signal: '某门户网站称招聘暴涨', strength: 'strong', source: '某门户网站内部消息', date: RECENT_DATE },
        ],
        risk_signals: [],
        recommended_entry_roles: [],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // 反向匹配收紧 → 编造信号被剔除
      expect(res.body.growth_signals).toEqual([]);
      // 全空 → 自洽降级
      expect(['low', 'insufficient']).toContain(res.body.confidence);
      expect(res.body.hiring_outlook).toBe('unknown');
      expect(res.body.trend_summary).not.toContain('以上信号');
    });
  });

  // ── #34/#75: 模型漏字段不应 500（?? [] 兜底）────────────────────────────────

  describe('#34/#75 robustness: missing array fields must not crash (no 500)', () => {
    it('growth_signals 字段缺失（有 web 来源）→ 200 而非 500', async () => {
      const partial = makeAiResult();
      delete (partial as Record<string, unknown>).growth_signals;
      delete (partial as Record<string, unknown>).risk_signals;
      delete (partial as Record<string, unknown>).recommended_entry_roles;
      mockResult = partial;

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.risk_signals).toEqual([]);
      expect(res.body.recommended_entry_roles).toEqual([]);
    });

    it('evidence_used 字段缺失 → 降级 insufficient 而非 500', async () => {
      const partial = makeAiResult();
      delete (partial as Record<string, unknown>).evidence_used;
      mockResult = partial;

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.growth_signals).toEqual([]);
    });
  });

  // ── #44: market_radar_used 服务端强制裁决 ──────────────────────────────────

  describe('#44 market_radar_used is server-decided, not model-reported', () => {
    it('模型自报 market_radar_used=true → 服务端强制改为 false（有 web 来源）', async () => {
      mockResult = makeAiResult({ market_radar_used: true });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.market_radar_used).toBe(false);
    });

    it('模型自报 market_radar_used=true + 无 web 来源 → 仍强制 false', async () => {
      mockResult = makeAiResult({ market_radar_used: true, evidence_used: [] });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.market_radar_used).toBe(false);
    });
  });

  // ── #46: demand_level 缺失兜底为 unknown ───────────────────────────────────

  describe('#46 demand_level fallback to unknown when missing', () => {
    it('有 growth 支撑但 role 漏 demand_level → 兜底 unknown', async () => {
      mockResult = makeAiResult({
        recommended_entry_roles: [
          // 缺 demand_level 字段
          { role_name: '算法工程师', rationale: '需求大' },
          { role_name: '产品经理', rationale: '岗位多', demand_level: 'high' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      const roles = res.body.recommended_entry_roles as Array<{
        role_name: string;
        demand_level: string;
      }>;
      const algo = roles.find((r) => r.role_name === '算法工程师');
      const pm = roles.find((r) => r.role_name === '产品经理');
      expect(algo?.demand_level).toBe('unknown');
      expect(pm?.demand_level).toBe('high');
    });
  });

  // ── #P1: evidence URL 格式校验 + 白名单标记 ───────────────────────────────────

  describe('#P1 evidence URL validation: format-invalid URLs stripped, do not unlock signals', () => {
    it('evidence url 格式非法（无 host 点）→ 被剔除，信号无法解锁，降为 insufficient', async () => {
      // "http://nodot" — host 中无点，isValidEvidenceUrl 判非法
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [
          { source: '伪造报告', url: 'http://nodot', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '招聘增长', strength: 'strong', source: '伪造报告', date: RECENT_DATE },
        ],
        hiring_outlook: 'growing',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // 格式非法的 URL 被剔除 → 无有效 web 来源 → Guard 1 降级
      expect(res.body.confidence).toBe('insufficient');
      expect(res.body.growth_signals).toEqual([]);
      expect(res.body.hiring_outlook).toBe('unknown');
      // evidence_used 中不应出现格式非法的条目
      for (const e of res.body.evidence_used as Array<{ url?: string }>) {
        if (e.url) {
          expect(() => new URL(e.url as string)).not.toThrow();
        }
      }
    });

    it('evidence url 格式非法（非 http 协议）→ 被剔除，信号不解锁', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [
          { source: 'FTP资源', url: 'ftp://some.server.com/report', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '招聘增长', strength: 'strong', source: 'FTP资源', date: RECENT_DATE },
        ],
        hiring_outlook: 'growing',
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

    it('evidence url 格式合法但域名不在白名单 → verified=false，信号仍可解锁', async () => {
      // unknown-source.io 不在白名单，但 URL 格式合法 → 可解锁信号，verified=false
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [
          { source: '第三方报告', url: 'https://unknown-source.io/report', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '招聘增长', strength: 'strong', source: '第三方报告', date: RECENT_DATE },
        ],
        hiring_outlook: 'growing',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // URL 格式合法 → 信号解锁（不降为 insufficient）
      expect(res.body.growth_signals.length).toBe(1);
      // 非白名单域名 → verified=false
      const ev = res.body.evidence_used as Array<{ verified: boolean; url: string }>;
      const nonWhitelisted = ev.find((e) => e.url.includes('unknown-source.io'));
      expect(nonWhitelisted?.verified).toBe(false);
      // 诚实声明包含"未核验"字样
      expect(res.body.evidence_source_disclaimer).toContain('未核验');
    });

    it('evidence url 在白名单域名（36kr.com）→ verified=true', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      const ev = res.body.evidence_used as Array<{ verified: boolean; url: string }>;
      const trusted = ev.find((e) => e.url.includes('36kr.com'));
      expect(trusted?.verified).toBe(true);
    });

    it('evidence url 为空字符串 → 被剔除，不出现在返回的 evidence_used 中', async () => {
      mockResult = makeAiResult({
        evidence_used: [
          { source: '某报告', url: '', date: RECENT_DATE },
          { source: '36氪行业报告', url: 'https://36kr.com/report/2024', date: RECENT_DATE },
        ],
        growth_signals: [
          { signal: '招聘增长20%', strength: 'strong', source: '36氪行业报告', date: RECENT_DATE },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // 空 URL 被剔除，只剩 36kr 那条
      const ev = res.body.evidence_used as Array<{ url?: string }>;
      const emptyUrl = ev.find((e) => e.url === '');
      expect(emptyUrl).toBeUndefined();
      expect(ev.length).toBe(1);
    });

    it('evidence_source_disclaimer 在所有路径下均存在且非空', async () => {
      // 正常路径
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);
      expect(res.status).toBe(200);
      expect(typeof res.body.evidence_source_disclaimer).toBe('string');
      expect(res.body.evidence_source_disclaimer.length).toBeGreaterThan(0);
      expect(res.body.evidence_source_disclaimer).toContain('AI 提供');
      expect(res.body.evidence_source_disclaimer).toContain('未联网核验');
    });

    it('evidence_source_disclaimer 在 Guard 1 降级路径（无有效来源）下也存在', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [],
        growth_signals: [],
        hiring_outlook: 'growing',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('insufficient');
      expect(typeof res.body.evidence_source_disclaimer).toBe('string');
      expect(res.body.evidence_source_disclaimer.length).toBeGreaterThan(0);
    });

    it('混合：部分格式合法 + 部分格式非法 → 仅合法部分解锁信号', async () => {
      mockResult = makeAiResult({
        confidence: 'high',
        evidence_used: [
          // 格式非法：无点
          { source: '内部系统', url: 'http://intranet', date: RECENT_DATE },
          // 格式合法：36kr
          { source: '36氪行业报告', url: 'https://36kr.com/r/2024', date: RECENT_DATE },
        ],
        growth_signals: [
          // 来自非法 URL 来源 → 被剔除（非法 URL 本身不存在于 webEvidence）
          { signal: '内部数据增长', strength: 'strong', source: '内部系统', date: RECENT_DATE },
          // 来自合法 URL 来源 → 保留
          { signal: '招聘增长20%', strength: 'strong', source: '36氪行业报告', date: RECENT_DATE },
        ],
        hiring_outlook: 'growing',
      });

      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PAYLOAD);

      expect(res.status).toBe(200);
      // 合法来源存在 → 不降为 insufficient
      expect(res.body.confidence).not.toBe('insufficient');
      // 仅合法来源的信号保留
      expect(res.body.growth_signals.length).toBe(1);
      expect(res.body.growth_signals[0].signal).toBe('招聘增长20%');
      // evidence_used 中不含非法 URL 条目
      const ev = res.body.evidence_used as Array<{ url: string }>;
      const badEntry = ev.find((e) => e.url === 'http://intranet');
      expect(badEntry).toBeUndefined();
    });
  });

  // ── #85: DTO 长度收口 ──────────────────────────────────────────────────────

  describe('#85 DTO length constraints', () => {
    it('industry 超长（>100）→ 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ industry: '行'.repeat(101) });
      expect(res.status).toBe(400);
    });

    it('region 超长（>100）→ 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ industry: '人工智能', region: '区'.repeat(101) });
      expect(res.status).toBe(400);
    });

    it('timeframe 超长（>100）→ 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/industry-trend/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({ industry: '人工智能', timeframe: '时'.repeat(101) });
      expect(res.status).toBe(400);
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
      // #P1: 诚实声明字段必须存在
      expect(typeof res.body.evidence_source_disclaimer).toBe('string');
      expect(res.body.evidence_source_disclaimer).toContain('AI 提供');
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

      // #P1: evidence_source_disclaimer must always be present
      expect(typeof (res.body as Record<string, unknown>).evidence_source_disclaimer).toBe('string');

      // #P1: evidence_used entries must have valid http(s) URLs when url is present
      const evidence = (res.body as Record<string, unknown>).evidence_used as Array<{
        url?: string;
      }>;
      for (const e of evidence) {
        if (e.url) {
          try {
            const parsed = new URL(e.url);
            expect(['http:', 'https:']).toContain(parsed.protocol);
          } catch {
            fail(`Invalid URL in evidence_used: ${e.url}`);
          }
        }
      }
    } else {
      console.warn(`[industry-trend AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);
});
