import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import {
  buildCareerAnalysisSystem,
  CAREER_EVIDENCE_IRON_LAW,
} from '../src/ai/prompts/career-analysis';
import { createTestApp, loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Raw shape the AI *claims* (untrusted). Server treats some fields   */
/*  as untrusted and overrides them:                                   */
/*   - DEFECT-1: ok recomputed from current>=needed                    */
/*   - DEFECT-3: alumni_count normalized (never fabricated)            */
/*   - 防编造: current with empty evidenceFound is suppressed          */
/*   - 自评: self-assessed skills override AI current                  */
/* ------------------------------------------------------------------ */
interface RawSkillAudit {
  name: string;
  current: number;
  needed: number;
  ok?: boolean;
  evidenceFound?: string;
  category?: string;
}
interface RawPath {
  title: string;
  fit_pct: number;
  description: string;
  skills: string[];
  alumni_count?: number | null;
}
interface RawCareerAnalysis {
  paths: RawPath[];
  skill_audit: RawSkillAudit[];
}

interface ResSkill {
  name: string;
  current: number;
  needed: number;
  ok: boolean;
  category: 'general' | 'ai';
  evidenceFound: string;
  scoreSource: 'ai' | 'self' | 'suppressed';
  aiScore: number | null;
}

/* A realistic, ≥30-char Chinese resume so the service does NOT short-circuit. */
const VALID_RESUME_TEXT =
  '张伟，计算机科学与技术专业本科应届生。' +
  '熟悉 Java 与 Spring Boot，参与过校园二手交易平台后端开发，负责订单与支付模块；' +
  '掌握 MySQL 索引优化与 Redis 缓存，曾用 Redis 将接口平均响应从 320ms 降到 90ms。' +
  '获 ACM 校赛二等奖，担任技术社团负责人，组织 5 场技术分享。';

/* ================================================================== */
/*  Prompt-level asserts (no app needed) — Step 2 / Step 4            */
/* ================================================================== */
describe('Career prompt — 防编造铁律 + AI 能力专项', () => {
  const system = buildCareerAnalysisSystem();

  it('system prompt 含"直接证据铁律"关键句', () => {
    expect(system).toContain('直接证据铁律');
    expect(CAREER_EVIDENCE_IRON_LAW).toContain('直接证据铁律');
  });

  it('system prompt 要求无证据给低分 / 完全没提给 0 分', () => {
    expect(system).toContain('简历完全没提该技能');
    expect(system).toMatch(/低档|低分/);
  });

  it('system prompt 要求逐技能输出 evidenceFound', () => {
    expect(system).toContain('evidenceFound');
  });

  it('system prompt 严禁凭技能名泛化打分', () => {
    expect(system).toMatch(/泛化打分|凭技能名/);
  });

  it('system prompt 要求专门产出 AI 能力维度且同套防编造', () => {
    expect(system).toContain('AI 能力专项');
    expect(system).toMatch(/category='ai'|category=ai/);
    expect(system).toContain('现在都用 AI'); // 反例:不许因此泛给分
  });
});

/* ================================================================== */
/*  Deterministic AI-mock e2e — fixed server behavior                 */
/* ================================================================== */
describe('Career (e2e) — deterministic AI mock asserts fixed behavior', () => {
  let app: INestApplication;
  let nextAiResult: RawCareerAnalysis;
  const completeStructured = jest.fn(() => Promise.resolve(nextAiResult));

  let token: string;
  let noResumeToken: string;

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

    token = await loginUser(app, 'career-mock@coach.dev', 'Career Mock User');
    noResumeToken = await loginUser(app, 'career-noresume@coach.dev', 'No Resume User');

    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '后端简历', raw_text: VALID_RESUME_TEXT, is_primary: true });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────
  describe('Auth guard', () => {
    it('GET /api/career/analysis without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/career/analysis');
      expect(res.status).toBe(401);
    });
    it('GET /api/career/history without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/career/history');
      expect(res.status).toBe(401);
    });
    it('POST /api/career/self-assessment without JWT → 401', async () => {
      const res = await request(app.getHttpServer()).post('/api/career/self-assessment').send([]);
      expect(res.status).toBe(401);
    });
  });

  // ─── No-resume guard ──────────────────────────────────────────────────────
  describe('Resume preconditions', () => {
    it('no resume → 400 with Chinese guidance (AI not called)', async () => {
      completeStructured.mockClear();
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${noResumeToken}`);
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('请先上传简历');
      expect(completeStructured).not.toHaveBeenCalled();
    });
  });

  // ─── DEFECT-1: ok recomputed server-side ──────────────────────────────────
  describe('skill_audit.ok is derived from current>=needed (AI ok ignored)', () => {
    it('AI says ok:true but current<needed → server returns ok:false', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 78, description: '主线路径', skills: ['Java'], alumni_count: null }],
        // 有证据,不触发压分;仅验 ok 重算。
        skill_audit: [
          { name: '分布式系统', current: 3, needed: 7, ok: true, evidenceFound: '订单模块涉及分库', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const audit = res.body.skill_audit[0] as ResSkill;
      expect(audit.name).toBe('分布式系统');
      expect(audit.current).toBe(3);
      expect(audit.needed).toBe(7);
      expect(audit.ok).toBe(false);
    });

    it('AI says ok:false but current>=needed → server returns ok:true', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 80, description: '主线路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, ok: false, evidenceFound: 'Spring Boot 后端开发', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).ok).toBe(true);
    });

    it('boundary current===needed → ok:true (>= is inclusive)', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '主线路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'MySQL', current: 5, needed: 5, ok: false, evidenceFound: 'MySQL 索引优化', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).ok).toBe(true);
    });
  });

  // ─── 防编造(核心):退化检测压分 — Step 2 ──────────────────────────────────
  describe('防编造退化检测:高分无证据 → 压到低档并留痕', () => {
    it('current=6 但 evidenceFound 空 → 压到 2,scoreSource=suppressed,aiScore 保留 6', async () => {
      // 用户原始痛点的确定性复现:Python 被泛化打 6 分但简历无证据。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: '路径', skills: ['Python'], alumni_count: null }],
        skill_audit: [{ name: 'Python', current: 6, needed: 7, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const py = res.body.skill_audit[0] as ResSkill;
      expect(py.name).toBe('Python');
      expect(py.scoreSource).toBe('suppressed');
      expect(py.current).toBe(2); // 压到低档
      expect(py.aiScore).toBe(6); // AI 原始虚高分留痕
      expect(py.evidenceFound).toBe('');
      expect(py.ok).toBe(false); // 2 < 7
    });

    it('current=3 evidenceFound 空 → 不触发压分(本就低档),scoreSource=ai', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 70, description: '路径', skills: ['Go'], alumni_count: null }],
        skill_audit: [{ name: 'Go', current: 3, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const go = res.body.skill_audit[0] as ResSkill;
      expect(go.scoreSource).toBe('ai');
      expect(go.current).toBe(3);
      expect(go.aiScore).toBeNull();
    });

    it('current=8 有证据 → 不压分,scoreSource=ai,证据原文透传', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 82, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, evidenceFound: 'Spring Boot 订单与支付模块', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = res.body.skill_audit[0] as ResSkill;
      expect(java.scoreSource).toBe('ai');
      expect(java.current).toBe(8);
      expect(java.evidenceFound).toBe('Spring Boot 订单与支付模块');
      expect(java.ok).toBe(true);
    });
  });

  // ─── AI 能力板块 — Step 4 ─────────────────────────────────────────────────
  describe('AI 能力(category=ai)同样套防编造', () => {
    it('AI 类技能存在且无证据高分被压到低档', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Java', current: 7, needed: 6, evidenceFound: 'Spring Boot 后端', category: 'general' },
          // AI 能力但简历没提 → AI 想给 6 分却无证据,必须被压。
          { name: '提示工程/Prompt', current: 6, needed: 7, evidenceFound: '', category: 'ai' },
          // AI 能力有证据 → 保留。
          { name: 'AI 辅助编码', current: 5, needed: 6, evidenceFound: '用 Copilot 提效开发', category: 'ai' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const skills = res.body.skill_audit as ResSkill[];
      const aiSkills = skills.filter((s) => s.category === 'ai');
      expect(aiSkills.length).toBe(2);

      const prompt = skills.find((s) => s.name === '提示工程/Prompt')!;
      expect(prompt.category).toBe('ai');
      expect(prompt.scoreSource).toBe('suppressed');
      expect(prompt.current).toBe(2);
      expect(prompt.aiScore).toBe(6);

      const copilot = skills.find((s) => s.name === 'AI 辅助编码')!;
      expect(copilot.category).toBe('ai');
      expect(copilot.scoreSource).toBe('ai');
      expect(copilot.current).toBe(5);
    });

    it('AI 未给 category → 默认 general(不污染 AI 组)', async () => {
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: '路径', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Redis', current: 6, needed: 5, evidenceFound: 'Redis 缓存优化' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect((res.body.skill_audit[0] as ResSkill).category).toBe('general');
    });
  });

  // ─── DEFECT-3: alumni_count normalization ─────────────────────────────────
  describe('alumni_count accepts number|null and never fabricates', () => {
    const cases: Array<[string, number | null | undefined, number | null]> = [
      ['null', null, null],
      ['valid integer', 12, 12],
      ['non-integer 12.6', 12.6, null],
      ['NaN', NaN, null],
      ['Infinity', Infinity, null],
      ['negative -5', -5, null],
      ['omitted', undefined, null],
    ];
    it.each(cases)('AI returns %s → server returns %s', async (_label, input, expected) => {
      const path: RawPath = { title: '后端工程师', fit_pct: 78, description: 'd', skills: ['Java'], alumni_count: input ?? undefined };
      if (input === undefined) delete (path as Partial<RawPath>).alumni_count;
      nextAiResult = {
        paths: [path],
        skill_audit: [{ name: 'Java', current: 6, needed: 6, evidenceFound: 'Spring Boot 后端', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.paths[0]).toHaveProperty('alumni_count');
      expect(res.body.paths[0].alumni_count).toBe(expected);
    });
  });

  // ─── Pass-through fields ──────────────────────────────────────────────────
  describe('trusted fields pass through unchanged', () => {
    it('title / fit_pct / description / skills returned verbatim', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 83, description: '与简历后端经历高度契合', skills: ['Java', 'Spring Boot', 'Redis'], alumni_count: null },
        ],
        skill_audit: [{ name: 'Redis', current: 6, needed: 5, evidenceFound: 'Redis 缓存', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const path = res.body.paths[0];
      expect(path.title).toBe('后端工程师');
      expect(path.fit_pct).toBe(83);
      expect(path.description).toBe('与简历后端经历高度契合');
      expect(path.skills).toEqual(['Java', 'Spring Boot', 'Redis']);
    });
  });

  // ─── 落库 + 历史 — Step 3 ─────────────────────────────────────────────────
  describe('落库 + 历史接口', () => {
    it('analyze 后历史列表有记录(摘要含 top_path/path_count/skill_count)', async () => {
      nextAiResult = {
        paths: [{ title: '数据工程师', fit_pct: 80, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Java', current: 6, needed: 6, evidenceFound: 'Spring Boot', category: 'general' }],
      };
      await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      const res = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const latest = res.body[0];
      expect(latest).toHaveProperty('id');
      expect(latest).toHaveProperty('created_at');
      expect(latest).toHaveProperty('top_path');
      expect(typeof latest.path_count).toBe('number');
      expect(typeof latest.skill_count).toBe('number');
      // 列表不应泄露完整 result_json。
      expect(latest).not.toHaveProperty('result_json');
      expect(latest).not.toHaveProperty('skill_audit');
    });

    it('历史详情 owner-only → 本人可取完整 analysis', async () => {
      const list = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      const id = list.body[0].id as string;
      const res = await request(app.getHttpServer())
        .get(`/api/career/history/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.paths)).toBe(true);
      expect(Array.isArray(res.body.skill_audit)).toBe(true);
    });

    it('他人历史详情 → 404(不泄露存在性)', async () => {
      const otherToken = await loginUser(app, 'career-other@coach.dev', 'Other User');
      const list = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${token}`);
      const id = list.body[0].id as string;
      const res = await request(app.getHttpServer())
        .get(`/api/career/history/${id}`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(404);
    });

    it('不存在的 id → 404', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/history/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('他人历史列表 → 空(隔离)', async () => {
      const otherToken = await loginUser(app, 'career-other2@coach.dev', 'Other User 2');
      const res = await request(app.getHttpServer())
        .get('/api/career/history')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ─── 问卷自评 + 校准 — Step 5 ─────────────────────────────────────────────
  describe('问卷自评 upsert + analyze 校准', () => {
    it('POST 自评校验:越界 self_score → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 99 }]);
      expect(res.status).toBe(400);
    });

    it('POST 自评 upsert → written 计数', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([
          { skill_name: 'Python', self_score: 2 },
          { skill_name: 'Java', self_score: 9 },
        ]);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(2);
    });

    it('upsert 幂等:重复提交同技能仍只更新不重复', async () => {
      await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 1 }]);
      // analyze 验证仅用最新值,见下条。
      const res = await request(app.getHttpServer())
        .post('/api/career/self-assessment')
        .set('Authorization', `Bearer ${token}`)
        .send([{ skill_name: 'Python', self_score: 3 }]);
      expect(res.status).toBe(201);
      expect(res.body.written).toBe(1);
    });

    it('analyze 时有自评的技能用自评覆盖 AI 分(scoreSource=self,aiScore 留 AI 原始分)', async () => {
      // AI 想给 Python 8 分(且有证据本不会被压),但用户自评 3 分 → 必须用 3。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['Python', 'Java'], alumni_count: null }],
        skill_audit: [
          { name: 'Python', current: 8, needed: 7, evidenceFound: '数据脚本项目', category: 'general' },
          { name: 'Go', current: 5, needed: 6, evidenceFound: '微服务实践', category: 'general' },
        ],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const skills = res.body.skill_audit as ResSkill[];
      const py = skills.find((s) => s.name === 'Python')!;
      expect(py.scoreSource).toBe('self');
      expect(py.current).toBe(3); // 用户最新自评
      expect(py.aiScore).toBe(8); // AI 原始分留参考
      expect(py.ok).toBe(false); // 3 < 7
      // 无自评的技能保持 AI 来源。
      const go = skills.find((s) => s.name === 'Go')!;
      expect(go.scoreSource).toBe('ai');
      expect(go.current).toBe(5);
    });

    it('自评覆盖优先级高于退化压分:AI 高分无证据但有自评 → 用自评分', async () => {
      // Java 自评为 9(前面已提交);AI 给 7 但 evidenceFound 空(本会被压到 2)→ 自评优先,用 9。
      nextAiResult = {
        paths: [{ title: '后端工程师', fit_pct: 75, description: 'd', skills: ['Java'], alumni_count: null }],
        skill_audit: [{ name: 'Java', current: 7, needed: 6, evidenceFound: '', category: 'general' }],
      };
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      const java = (res.body.skill_audit as ResSkill[]).find((s) => s.name === 'Java')!;
      expect(java.scoreSource).toBe('self');
      expect(java.current).toBe(9);
      expect(java.aiScore).toBe(7); // 保留 AI 原始分(未经压分)
    });
  });
});

/* ================================================================== */
/*  AI-live suite — real AiService, real relay. 默认 skip。            */
/*  RUN_AI_LIVE=1 真跑(防编造真验收见 career-anti-fabrication-live)。   */
/* ================================================================== */
const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('Career (e2e) — AI-live (graceful on relay 503/timeout)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    app = await createTestApp();
    token = await loginUser(app, 'career-live@coach.dev', 'Career Live User');
    await request(app.getHttpServer())
      .post('/api/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '后端简历', raw_text: VALID_RESUME_TEXT, is_primary: true });
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it(
    'returns 200 with fixed-behavior shape, OR a graceful non-auth error if relay is down',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`)
        .timeout(25000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);

      if (res.status === 200) {
        const body = res.body as { paths: RawPath[]; skill_audit: ResSkill[] };
        expect(Array.isArray(body.paths)).toBe(true);
        expect(Array.isArray(body.skill_audit)).toBe(true);
        expect(body.paths.length).toBeGreaterThanOrEqual(1);

        for (const path of body.paths) {
          expect(typeof path.title).toBe('string');
          expect(typeof path.fit_pct).toBe('number');
          expect(path.fit_pct).toBeGreaterThanOrEqual(0);
          expect(path.fit_pct).toBeLessThanOrEqual(100);
          const v = path.alumni_count;
          expect(v === null || typeof v === 'number').toBe(true);
          if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
        }

        for (const audit of body.skill_audit) {
          expect(typeof audit.current).toBe('number');
          expect(typeof audit.needed).toBe('number');
          expect(typeof audit.ok).toBe('boolean');
          expect(audit.ok).toBe(audit.current >= audit.needed);
          expect(['general', 'ai']).toContain(audit.category);
          expect(['ai', 'self', 'suppressed']).toContain(audit.scoreSource);
          expect(typeof audit.evidenceFound).toBe('string');
          // 防编造不变式:无证据(空 evidenceFound)且来源为 ai 的分必 < 阈值(否则应被压)。
          if (audit.scoreSource === 'ai' && audit.evidenceFound.trim().length === 0) {
            expect(audit.current).toBeLessThan(4);
          }
        }
      } else {
        expect(res.status).toBeGreaterThanOrEqual(400);
        // eslint-disable-next-line no-console
        console.warn(
          `[career AI-live] non-200 status ${res.status} — likely AI relay 503/timeout, not a code defect`,
        );
      }
    },
    60000,
  );
});
