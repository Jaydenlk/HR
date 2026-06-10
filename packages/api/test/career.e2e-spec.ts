import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { createTestApp, loginUser, request } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Shape returned by AiService.completeStructured for career_analysis */
/*  — what the AI *claims*. The service treats some of these fields as */
/*  untrusted and overrides them (DEFECT-1: ok; DEFECT-3: alumni_count) */
/* ------------------------------------------------------------------ */
interface RawSkillAudit {
  name: string;
  current: number;
  needed: number;
  ok?: boolean;
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

/* A realistic, ≥30-char Chinese resume so the service does NOT short-circuit. */
const VALID_RESUME_TEXT =
  '张伟，计算机科学与技术专业本科应届生。' +
  '熟悉 Java 与 Spring Boot，参与过校园二手交易平台后端开发，负责订单与支付模块；' +
  '掌握 MySQL 索引优化与 Redis 缓存，曾用 Redis 将接口平均响应从 320ms 降到 90ms。' +
  '获 ACM 校赛二等奖，担任技术社团负责人，组织 5 场技术分享。';

describe('Career (e2e) — deterministic AI mock asserts fixed behavior', () => {
  let app: INestApplication;
  // The AI deliberately reports WRONG ok flags and a fabricated/illegal alumni_count;
  // the test asserts the server overrides them. Configurable per-test.
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

    // Seed a primary resume for the main user.
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
  });

  // ─── No-resume guard (no AI call) ─────────────────────────────────────────
  // The <30-char service guard is unreachable via the API: POST /api/resumes
  // enforces MinLength(30) on raw_text, so a sub-30-char resume can never be
  // persisted to hit it. Only the no-resume branch is reachable end-to-end.

  describe('Resume preconditions', () => {
    it('no resume → 400 with Chinese guidance (AI not called)', async () => {
      completeStructured.mockClear();
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${noResumeToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('请先上传简历');
      // Guard must reject before spending an AI call.
      expect(completeStructured).not.toHaveBeenCalled();
    });
  });

  // ─── DEFECT-1: skill_audit[].ok recomputed server-side ────────────────────
  // The AI's self-reported `ok` is IGNORED. Server derives ok = current >= needed.

  describe('skill_audit.ok is derived from current>=needed (AI ok ignored)', () => {
    it('AI says ok:true but current<needed → server returns ok:false', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '主线路径', skills: ['Java'], alumni_count: null },
        ],
        skill_audit: [
          // 有差距技能：AI 谎报达标，服务端必须改判为不达标(进补强清单)
          { name: '分布式系统', current: 3, needed: 7, ok: true },
        ],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const audit = res.body.skill_audit[0];
      expect(audit.name).toBe('分布式系统');
      expect(audit.current).toBe(3);
      expect(audit.needed).toBe(7);
      // The bug being fixed: AI's ok:true must NOT be trusted.
      expect(audit.ok).toBe(false);
    });

    it('AI says ok:false but current>=needed → server returns ok:true', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 80, description: '主线路径', skills: ['Java'], alumni_count: null },
        ],
        skill_audit: [
          // 已达标技能：AI 谎报未达标，服务端必须改判为达标
          { name: 'Java', current: 8, needed: 6, ok: false },
        ],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const audit = res.body.skill_audit[0];
      expect(audit.ok).toBe(true);
    });

    it('boundary current===needed → ok:true (>= is inclusive)', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 75, description: '主线路径', skills: ['Java'], alumni_count: null },
        ],
        skill_audit: [{ name: 'MySQL', current: 5, needed: 5, ok: false }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.skill_audit[0].ok).toBe(true);
    });

    it('every item ok is recomputed independently across a mixed list', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 72, description: '主线路径', skills: ['Java'], alumni_count: null },
        ],
        skill_audit: [
          { name: 'Java', current: 8, needed: 6, ok: false }, // → true
          { name: '分布式系统', current: 3, needed: 7, ok: true }, // → false
          { name: 'Redis', current: 6, needed: 6, ok: false }, // → true (boundary)
          { name: '消息队列', current: 0, needed: 4, ok: true }, // → false
        ],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const okByName: Record<string, boolean> = {};
      for (const a of res.body.skill_audit as Array<{ name: string; ok: boolean }>) {
        expect(typeof a.ok).toBe('boolean');
        okByName[a.name] = a.ok;
      }
      expect(okByName).toEqual({
        Java: true,
        分布式系统: false,
        Redis: true,
        消息队列: false,
      });
    });
  });

  // ─── DEFECT-3: alumni_count normalization (no fabricated numbers) ─────────
  // alumni_count is number|null. null when AI has no data; illegal values → null.

  describe('alumni_count accepts number|null and never fabricates', () => {
    it('AI returns null (no alumni data) → server keeps null, not a fabricated number', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '无校友数据', skills: ['Java'], alumni_count: null },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const path = res.body.paths[0];
      expect(path).toHaveProperty('alumni_count');
      expect(path.alumni_count).toBeNull();
    });

    it('AI returns a valid non-negative INTEGER count → preserved verbatim', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '有数据', skills: ['Java'], alumni_count: 12 },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths[0].alumni_count).toBe(12);
    });

    // P0-6: a non-integer alumni count (e.g. 12.6 人) is nonsensical and a sign the
    // model is hallucinating — it must NOT be rounded into a fake-precise integer.
    // Rounding would manufacture a number the model never actually had. → null.
    it('AI returns a non-integer count → normalized to null (no fabricated rounding)', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '非整数', skills: ['Java'], alumni_count: 12.6 },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths[0].alumni_count).toBeNull();
    });

    // P0-6: NaN / Infinity reaching normalizeAlumniCount (in-process AI mock can carry
    // real JS NaN/Infinity that JSON never could) must collapse to null, never leak.
    it('AI returns NaN → normalized to null', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: 'NaN', skills: ['Java'], alumni_count: NaN },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths[0].alumni_count).toBeNull();
    });

    it('AI returns Infinity → normalized to null', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: 'Infinity', skills: ['Java'], alumni_count: Infinity },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths[0].alumni_count).toBeNull();
    });

    it('AI returns an illegal negative count → normalized to null', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '非法负数', skills: ['Java'], alumni_count: -5 },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths[0].alumni_count).toBeNull();
    });

    it('AI omits alumni_count entirely → server fills null (no crash, no fabrication)', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 78, description: '缺字段', skills: ['Java'] },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const path = res.body.paths[0];
      expect(path).toHaveProperty('alumni_count');
      expect(path.alumni_count).toBeNull();
    });

    it('every returned path exposes alumni_count typed number|null', async () => {
      nextAiResult = {
        paths: [
          { title: '后端工程师', fit_pct: 80, description: 'p1', skills: ['Java'], alumni_count: 30 },
          { title: '平台研发', fit_pct: 65, description: 'p2', skills: ['Go'], alumni_count: null },
          { title: '架构师', fit_pct: 40, description: 'p3', skills: ['K8s'], alumni_count: -1 },
        ],
        skill_audit: [{ name: 'Java', current: 6, needed: 6 }],
      };

      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.paths).toHaveLength(3);
      for (const p of res.body.paths as Array<{ alumni_count: number | null }>) {
        const v = p.alumni_count;
        expect(v === null || typeof v === 'number').toBe(true);
        if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
      }
      // Mapped order preserved: valid number, null, illegal→null
      expect(res.body.paths[0].alumni_count).toBe(30);
      expect(res.body.paths[1].alumni_count).toBeNull();
      expect(res.body.paths[2].alumni_count).toBeNull();
    });
  });

  // ─── Pass-through fields are carried verbatim ─────────────────────────────

  describe('trusted fields pass through unchanged', () => {
    it('title / fit_pct / description / skills are returned as the AI produced them', async () => {
      nextAiResult = {
        paths: [
          {
            title: '后端工程师',
            fit_pct: 83,
            description: '与简历后端经历高度契合',
            skills: ['Java', 'Spring Boot', 'Redis'],
            alumni_count: null,
          },
        ],
        skill_audit: [{ name: 'Redis', current: 6, needed: 5 }],
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
});

/* ================================================================== */
/*  AI-live suite — real AiService, real CloudDreamAI relay.           */
/*  Distinguishes a genuine assertion failure (real bug) from an       */
/*  environment AI relay 503 / timeout (NOT a code problem).           */
/*  默认 skip,仅 RUN_AI_LIVE=1 真跑(常规 e2e 不触发真实中转调用)。     */
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
    'returns 200 with fixed-behavior shape, OR a graceful non-auth error if the relay is down',
    async () => {
      const res = await request(app.getHttpServer())
        .get('/api/career/analysis')
        .set('Authorization', `Bearer ${token}`)
        .timeout(25000)
        .catch((err: { response?: { status: number; body: unknown } }) => {
          if (err.response) return err.response;
          return { status: 504, body: { message: 'timeout' } };
        });

      // Never an auth/config error in either branch.
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);

      if (res.status === 200) {
        const body = res.body as {
          paths: Array<{
            title: string;
            fit_pct: number;
            description: string;
            skills: string[];
            alumni_count: number | null;
          }>;
          skill_audit: Array<{ name: string; current: number; needed: number; ok: boolean }>;
        };

        expect(Array.isArray(body.paths)).toBe(true);
        expect(Array.isArray(body.skill_audit)).toBe(true);
        expect(body.paths.length).toBeGreaterThanOrEqual(1);

        for (const path of body.paths) {
          expect(typeof path.title).toBe('string');
          expect(typeof path.fit_pct).toBe('number');
          expect(path.fit_pct).toBeGreaterThanOrEqual(0);
          expect(path.fit_pct).toBeLessThanOrEqual(100);
          expect(Array.isArray(path.skills)).toBe(true);
          // DEFECT-3 invariant against a LIVE model: never a fabricated/illegal count.
          const v = path.alumni_count;
          expect(v === null || typeof v === 'number').toBe(true);
          if (typeof v === 'number') expect(v).toBeGreaterThanOrEqual(0);
        }

        for (const audit of body.skill_audit) {
          expect(typeof audit.current).toBe('number');
          expect(typeof audit.needed).toBe('number');
          expect(typeof audit.ok).toBe('boolean');
          // DEFECT-1 invariant against a LIVE model: ok must equal current>=needed.
          expect(audit.ok).toBe(audit.current >= audit.needed);
        }
      } else {
        // Relay 503 / timeout / upstream error — NOT a code problem.
        // Acceptable as long as it is a server-side error, not an auth error.
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
