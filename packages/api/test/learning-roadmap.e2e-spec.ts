// Set required env vars before any NestJS module is imported/compiled
process.env.DB_TYPE = 'sqlite';
process.env.DB_PATH = ':memory:';
process.env.CLOUDDREAM_API_KEY = 'test-key';
process.env.CLOUDDREAM_MODEL = 'auto-v2';
process.env.JWT_SECRET = 'test-jwt-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Shared mock AI result ──────────────────────────────────────────────────────

function makeAiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'learning-roadmap-builder',
    skill_version: '1.0.0',
    summary: '共规划 2 项技能的学习路线，预计 8 周完成，基于每周 10 小时学习时间。',
    confidence: 'high',
    evidence_used: [
      { field: 'skill_gaps', value: 'TypeScript', relevance: '用户明确列出的技能差距' },
    ],
    recommendations: ['先攻 TypeScript 基础，再学 React Hooks'],
    risks: ['时间可能因基础薄弱而延长'],
    next_actions: ['本周完成 TypeScript 基础类型阶段'],
    follow_up_questions: [],
    cannot_determine: [],
    total_estimated_weeks: 8,
    roadmap: [
      {
        skill_name: 'TypeScript',
        priority: 1,
        total_weeks: 4,
        phases: [
          {
            phase_name: '基础阶段',
            goal: '掌握 TypeScript 核心类型系统',
            estimated_weeks: 2,
            activities: ['阅读官方中文文档', '完成类型体操练习'],
            completion_criteria: '在 GitHub 上提交 30 道类型体操题解，仓库公开可查',
            output_artifact: 'GitHub 仓库：typescript-type-challenges 解答',
          },
          {
            phase_name: '实践阶段',
            goal: '在真实项目中应用 TypeScript',
            estimated_weeks: 2,
            activities: ['将已有 JS 项目迁移至 TS', '编写类型安全的 API 调用层'],
            completion_criteria: '完成一个 TypeScript 项目迁移，tsconfig strict 模式零报错',
            output_artifact: '迁移后的项目代码仓库',
          },
        ],
      },
    ],
    resource_list: [
      {
        skill_name: 'TypeScript',
        resource_type: 'official_docs',
        description: 'TypeScript 官方中文文档，覆盖类型系统、配置和最佳实践',
        quality_criteria: '官方维护，与版本同步，中文翻译完整度高',
        language: 'zh',
        for_level: 'beginner',
      },
    ],
    ...overrides,
  };
}

// ── Test inputs ────────────────────────────────────────────────────────────────

const VALID_BODY = {
  skill_gaps: ['TypeScript 基础', 'React Hooks'],
  weekly_hours: 10,
};

const OVER_10_GAPS = {
  skill_gaps: [
    '技能1', '技能2', '技能3', '技能4', '技能5',
    '技能6', '技能7', '技能8', '技能9', '技能10',
    '技能11', '技能12',
  ],
  weekly_hours: 10,
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('LearningRoadmap (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let mockResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => Promise.resolve(mockResult));

  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue({ complete: jest.fn(), completeStructured })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'learning-roadmap@coach.dev', 'Learning Roadmap Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockResult = makeAiResult();
  });

  // ─── Auth guard ───────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/learning-roadmap/build without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .send(VALID_BODY);
      expect(res.status).toBe(401);
    });
  });

  // ─── Guard: empty skill_gaps → 400 ───────────────────────────────────────

  describe('Guard: empty skill_gaps → 400', () => {
    it('empty array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_gaps: [] });
      expect(res.status).toBe(400);
    });

    it('missing skill_gaps field → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send({ weekly_hours: 10 });
      expect(res.status).toBe(400);
    });

    it('skill_gaps not an array → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send({ skill_gaps: 'TypeScript', weekly_hours: 10 });
      expect(res.status).toBe(400);
    });
  });

  // ─── Normal path ──────────────────────────────────────────────────────────

  describe('Normal: valid skill_gaps → 200 with roadmap', () => {
    it('returns 200 with roadmap and resource_list', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('high');
      expect(Array.isArray(res.body.roadmap)).toBe(true);
      expect(res.body.roadmap.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.resource_list)).toBe(true);
      expect(res.body.total_estimated_weeks).toBe(8);
    });

    it('AI-skipped gaps go to backlog with note when skill_gaps <= 10', async () => {
      // Mock returns roadmap only for 'TypeScript', not for 'React Hooks' from VALID_BODY.
      // The service detects 'React Hooks' as AI-skipped and adds it to backlog.
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      // React Hooks not covered by mock AI → service adds it to backlog with note
      expect(Array.isArray(res.body.backlog)).toBe(true);
      const backlog: string[] = res.body.backlog;
      expect(backlog.some((item) => item.includes('React Hooks'))).toBe(true);
      expect(backlog.some((item) => item.includes('AI 未覆盖'))).toBe(true);
    });
  });

  // ─── Guard: >10 skill_gaps → only critical processed, rest in backlog ─────

  describe('Guard: >10 skill_gaps → first 10 processed, backlog populated', () => {
    it('12 skill_gaps → backlog contains items 11-12 (overflow) plus AI-skipped active gaps', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(OVER_10_GAPS);

      expect(res.status).toBe(200);
      // Service slices first 10 as active, remaining (11-12) go to backlog as overflow.
      // Mock AI only covers 'TypeScript', so all 技能1-10 are AI-skipped → also in backlog with note.
      expect(Array.isArray(res.body.backlog)).toBe(true);
      const backlog: string[] = res.body.backlog;
      // Overflow items are present without note
      expect(backlog).toContain('技能11');
      expect(backlog).toContain('技能12');
      // AI-skipped active gaps are present with note
      expect(backlog.some((item) => item.includes('技能1') && item.includes('AI 未覆盖'))).toBe(true);
    });

    it('12 skill_gaps → AI was called with only 10 gaps (verified via mock call args)', async () => {
      await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(OVER_10_GAPS);

      const callArgs = completeStructured.mock.calls[completeStructured.mock.calls.length - 1][0];
      // The prompt should only include skills 1-10, not 11-12
      expect(callArgs.prompt).not.toContain('技能11');
      expect(callArgs.prompt).not.toContain('技能12');
    });
  });

  // ─── Guard: completion_criteria sanitation ────────────────────────────────

  describe('Guard: completion_criteria self-assessment phrases flagged', () => {
    it('AI returns vague self-assessment criteria → guard annotates it', async () => {
      mockResult = makeAiResult({
        roadmap: [
          {
            skill_name: 'TypeScript',
            priority: 1,
            total_weeks: 2,
            phases: [
              {
                phase_name: '基础阶段',
                goal: '掌握基础',
                estimated_weeks: 2,
                completion_criteria: '我觉得我掌握了TypeScript的基础知识',
                output_artifact: undefined,
              },
            ],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const phase = res.body.roadmap[0].phases[0] as { completion_criteria: string };
      // Guard must annotate or replace the vague criteria
      expect(phase.completion_criteria).toContain('可验证输出物');
    });

    it('AI returns empty completion_criteria → guard fills placeholder', async () => {
      mockResult = makeAiResult({
        roadmap: [
          {
            skill_name: 'TypeScript',
            priority: 1,
            total_weeks: 2,
            phases: [
              {
                phase_name: '基础阶段',
                goal: '掌握基础',
                estimated_weeks: 2,
                completion_criteria: '',
                output_artifact: undefined,
              },
            ],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const phase = res.body.roadmap[0].phases[0] as { completion_criteria: string };
      expect(phase.completion_criteria).toContain('【需补充】');
    });

    it('Chinese short criteria ≥5 chars (e.g. 完成练习题) → preserved as-is', async () => {
      // 完成练习题 = 5 Chinese characters — previously < 10 byte-length check would accept
      // this, but the old threshold of 10 was ambiguous. New threshold is < 5 chars.
      mockResult = makeAiResult({
        roadmap: [
          {
            skill_name: 'TypeScript',
            priority: 1,
            total_weeks: 2,
            phases: [
              {
                phase_name: '基础阶段',
                goal: '掌握基础',
                estimated_weeks: 2,
                completion_criteria: '完成练习题',
                output_artifact: undefined,
              },
            ],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const phase = res.body.roadmap[0].phases[0] as { completion_criteria: string };
      // 5-char Chinese string must pass the guard (length === 5, not < 5)
      expect(phase.completion_criteria).toBe('完成练习题');
    });
  });

  // ─── #11/#79: roadmap item missing phases → no 500, item skipped ───────────

  describe('#11/#79 Guard: roadmap shape defects do not crash', () => {
    it('roadmap item with NO phases field → 200, malformed item skipped', async () => {
      mockResult = makeAiResult({
        roadmap: [
          { skill_name: 'TypeScript', priority: 1, total_weeks: 2 }, // phases missing
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      // Pre-fix this threw 500 on item.phases.map(...)
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roadmap)).toBe(true);
      // Item had no valid phases → skipped → empty roadmap → cannot_determine note
      expect(res.body.roadmap).toHaveLength(0);
      expect(
        (res.body.cannot_determine as string[]).some((c) => c.includes('roadmap')),
      ).toBe(true);
    });

    it('roadmap item with phases=null → 200, item skipped (no crash)', async () => {
      mockResult = makeAiResult({
        roadmap: [{ skill_name: 'TypeScript', priority: 1, phases: null }],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.roadmap).toHaveLength(0);
    });

    it('roadmap item missing skill_name → skipped, valid item kept', async () => {
      mockResult = makeAiResult({
        roadmap: [
          { priority: 1, phases: [{ phase_name: 'x', goal: 'y', estimated_weeks: 1, completion_criteria: '提交可运行的代码仓库' }] }, // no skill_name
          {
            skill_name: 'React Hooks',
            phases: [
              {
                phase_name: '基础阶段',
                goal: '掌握 Hooks',
                estimated_weeks: 2,
                completion_criteria: '完成一个使用 Hooks 的开源 demo 并公开仓库',
              },
            ],
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.roadmap).toHaveLength(1);
      expect(res.body.roadmap[0].skill_name).toBe('React Hooks');
    });
  });

  // ─── #12/#77: resource anti-fabrication (strip URLs, flag specific names) ──

  describe('#12/#77 Guard: resource_list anti-fabrication', () => {
    it('http(s) URL in description/quality_criteria is stripped', async () => {
      mockResult = makeAiResult({
        resource_list: [
          {
            skill_name: 'TypeScript',
            resource_type: 'official_docs',
            description: '官方文档见 https://www.typescriptlang.org/zh/docs 很全面',
            quality_criteria: '参考 http://example.com/rank 排名靠前',
            language: 'zh',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const r = res.body.resource_list[0] as { description: string; quality_criteria: string };
      expect(r.description).not.toMatch(/https?:\/\//);
      expect(r.quality_criteria).not.toMatch(/https?:\/\//);
      expect(r.description).toContain('已移除链接');
    });

    it('specific course/book name gets a disclaimer annotation', async () => {
      mockResult = makeAiResult({
        resource_list: [
          {
            skill_name: 'TypeScript',
            resource_type: 'video',
            description: '推荐《深入理解 TypeScript》这门课程',
            quality_criteria: '内容系统',
            language: 'zh',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const r = res.body.resource_list[0] as { description: string };
      expect(r.description).toContain('不代表实际存在');
    });

    it('resource missing skill_name/description → skipped', async () => {
      mockResult = makeAiResult({
        resource_list: [
          { resource_type: 'book', description: '某书', quality_criteria: 'ok' }, // no skill_name
          { skill_name: 'TS', resource_type: 'book', quality_criteria: 'ok' }, // no description
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.resource_list).toHaveLength(0);
    });
  });

  // ─── #35: stripFabrication 覆盖裸链和短链 ───────────────────────────────────

  describe('#35 Guard: stripFabrication covers bare links and short links', () => {
    it('www. 裸链 in description → stripped', async () => {
      mockResult = makeAiResult({
        resource_list: [
          {
            skill_name: 'TypeScript',
            resource_type: 'official_docs',
            description: '可参考 www.typescriptlang.org 官网文档获取更多信息',
            quality_criteria: '内容系统',
            language: 'zh',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const r = res.body.resource_list[0] as { description: string };
      expect(r.description).not.toMatch(/www\./);
      expect(r.description).toContain('已移除链接');
    });

    it('短链（bit.ly）in description → stripped', async () => {
      mockResult = makeAiResult({
        resource_list: [
          {
            skill_name: 'TypeScript',
            resource_type: 'video',
            description: '详细资料请见 bit.ly/ts-intro-2024 短链地址',
            quality_criteria: '内容简明',
            language: 'zh',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const r = res.body.resource_list[0] as { description: string };
      expect(r.description).not.toContain('bit.ly');
      expect(r.description).toContain('已移除链接');
    });

    it('https:// URL still stripped (regression)', async () => {
      mockResult = makeAiResult({
        resource_list: [
          {
            skill_name: 'TypeScript',
            resource_type: 'official_docs',
            description: '访问 https://www.typescriptlang.org/zh/docs 查阅',
            quality_criteria: '无',
            language: 'zh',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const r = res.body.resource_list[0] as { description: string };
      expect(r.description).not.toMatch(/https?:\/\//);
      expect(r.description).toContain('已移除链接');
    });
  });

  // ─── #50: field fallback / confidence validation ──────────────────────────

  describe('#50 Guard: field fallback and confidence validation', () => {
    it('invalid confidence value → downgraded to low', async () => {
      mockResult = makeAiResult({ confidence: 'super-high' });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
    });

    it('missing array fields → defaulted to empty arrays (no 500)', async () => {
      mockResult = makeAiResult({
        recommendations: undefined,
        risks: undefined,
        next_actions: undefined,
        follow_up_questions: undefined,
        cannot_determine: undefined,
        evidence_used: undefined,
      });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(Array.isArray(res.body.risks)).toBe(true);
      expect(Array.isArray(res.body.evidence_used)).toBe(true);
    });

    it('total_estimated_weeks <= 0 or non-number → omitted', async () => {
      mockResult = makeAiResult({ total_estimated_weeks: 0 });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      expect(res.body.total_estimated_weeks).toBeUndefined();
    });
  });

  // ─── #89: empty roadmap/resource_list → cannot_determine ──────────────────

  describe('#89 Guard: empty lists produce cannot_determine notes', () => {
    it('empty roadmap AND empty resource_list → both flagged', async () => {
      mockResult = makeAiResult({ roadmap: [], resource_list: [] });

      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_BODY);

      expect(res.status).toBe(200);
      const cd = res.body.cannot_determine as string[];
      expect(cd.some((c) => c.includes('roadmap'))).toBe(true);
      expect(cd.some((c) => c.includes('resource_list'))).toBe(true);
    });
  });

  // ─── #88: preferred_language enum validation ──────────────────────────────

  describe('#88 Guard: preferred_language restricted to zh|en', () => {
    it('invalid preferred_language → 400 (not silent English fallback)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...VALID_BODY, preferred_language: 'fr' });

      expect(res.status).toBe(400);
    });

    it('preferred_language=zh → 200', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/learning-roadmap/build')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...VALID_BODY, preferred_language: 'zh' });

      expect(res.status).toBe(200);
    });
  });
});

// ── AI-live suite (default skip unless RUN_AI_LIVE=1) ─────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

(LIVE ? describe : describe.skip)('LearningRoadmap (e2e) — AI live', () => {
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
    token = await loginUser(app, 'learning-roadmap-live@coach.dev', 'Learning Roadmap Live User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('real AI produces structurally valid roadmap', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/learning-roadmap/build')
      .set('Authorization', `Bearer ${token}`)
      .send({ skill_gaps: ['TypeScript 基础', 'Docker 容器化'], weekly_hours: 10 })
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
        roadmap: Array<{
          skill_name: string;
          phases: Array<{ completion_criteria: string }>;
        }>;
        resource_list: unknown[];
      };

      expect(['high', 'medium', 'low', 'insufficient']).toContain(body.confidence);
      expect(Array.isArray(body.roadmap)).toBe(true);
      expect(Array.isArray(body.resource_list)).toBe(true);

      // Guard invariant: no phase has vague self-assessment criteria
      for (const item of body.roadmap) {
        for (const phase of item.phases) {
          expect(phase.completion_criteria).toBeTruthy();
          expect(phase.completion_criteria).not.toMatch(/^我觉得|^感觉掌握/);
        }
      }
    } else {
      console.warn(`[learning-roadmap AI-live] status ${res.status} — likely relay issue`);
    }
  }, 60000);
});
