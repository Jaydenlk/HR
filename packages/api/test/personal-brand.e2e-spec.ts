import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

// ── Mock AI result builders ────────────────────────────────────────────────────

function makeBrandResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'personal-brand-builder',
    skill_version: '1.0.0',
    summary: '推荐建立技术深度型个人品牌，重点输出 React 相关技术内容。',
    confidence: 'high',
    evidence_used: [
      { field: 'skills.technical', value: 'react', relevance: '主力技术栈，有项目实践' },
    ],
    recommendations: ['在掘金建立专栏'],
    risks: [],
    next_actions: ['完善 GitHub profile'],
    follow_up_questions: [],
    cannot_determine: [],
    brand_strategy: {
      type: 'technical_depth',
      positioning: '专注 React 生态的前端工程师',
      evidence_basis: ['skills'],
    },
    platform_actions: [
      { platform: '掘金', action: '建立技术专栏', priority: 'high', rationale: 'skills.technical 包含 react' },
    ],
    content_ideas: [
      {
        title: 'React 性能优化实践',
        angle: '从真实项目经验出发',
        source_experience: 'react',
        format: 'article',
      },
    ],
    profile_optimization: [
      { platform: 'GitHub', current_issue: '缺少 pinned 仓库', suggested_change: '置顶 React 项目' },
    ],
    ...overrides,
  };
}

function makePortfolioResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    skill_name: 'portfolio-project-advisor',
    skill_version: '1.0.0',
    summary: '基于 React+Node.js 技能推荐以下 Portfolio 项目。',
    confidence: 'high',
    evidence_used: [
      { field: 'skills.technical', value: 'react', relevance: '主力技术栈' },
    ],
    recommendations: ['优先做中型项目'],
    risks: [],
    next_actions: ['开始搭建项目脚手架'],
    follow_up_questions: [],
    cannot_determine: [],
    project_ideas: [
      {
        title: '前端性能监控平台',
        description: '构建一个实时前端性能监控工具',
        skills_demonstrated: ['React', 'Node.js'],
        size: 'medium',
        estimated_weeks: 6,
        interview_talking_points: ['技术选型理由', '遇到的挑战'],
        evidence_basis: 'react',
        github_visibility: true,
      },
    ],
    anti_patterns: [
      { pattern: '教程克隆 TodoApp', reason: '无差异化，面试官见过太多' },
    ],
    ...overrides,
  };
}

// ── Minimal profile fixtures ───────────────────────────────────────────────────

const PROFILE_SUFFICIENT = {
  name: '张三',
  skills: {
    technical: [
      { name: 'React', level: 'used_in_project' },
      { name: 'Node.js', level: 'used_in_project' },
    ],
  },
  experience: [
    { company: '某科技公司', title: '前端工程师', description: 'React 项目开发' },
  ],
  education: [{ school: '某大学', degree: 'bachelor' }],
};

const PROFILE_EMPTY = {};

const PROFILE_NO_SKILLS_NO_EXP = {
  name: '李四',
  // no skills, no experience, no education
};

const PROFILE_ALL_MENTIONED = {
  name: '王五',
  skills: {
    technical: [
      { name: 'React', level: 'mentioned' },
      { name: 'Go', level: 'mentioned' },
    ],
  },
  experience: [{ company: '某公司', title: '产品助理', description: '需求文档整理' }],
  education: [{ school: '某大学', degree: 'bachelor' }],
};

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('PersonalBrand (e2e) — deterministic guard tests', () => {
  let app: INestApplication;
  let mockBrandResult: Record<string, unknown>;
  let mockPortfolioResult: Record<string, unknown>;
  const completeStructured = jest.fn(() => {
    // Return different mock based on toolName — inspected via call args if needed
    if (completeStructured.mock.calls.length > 0) {
      const lastCall = completeStructured.mock.calls[completeStructured.mock.calls.length - 1][0];
      if (lastCall?.toolName === 'portfolio_advice') return Promise.resolve(mockPortfolioResult);
    }
    return Promise.resolve(mockBrandResult);
  });
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

    token = await loginUser(app, 'personal-brand@coach.dev', 'Personal Brand Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockBrandResult = makeBrandResult();
    mockPortfolioResult = makePortfolioResult();
    completeStructured.mockImplementation((args: { toolName: string }) => {
      if (args?.toolName === 'portfolio_advice') return Promise.resolve(mockPortfolioResult);
      return Promise.resolve(mockBrandResult);
    });
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────

  describe('Auth guard', () => {
    it('POST /api/personal-brand/brand-strategy without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .send({ profile: PROFILE_SUFFICIENT });
      expect(res.status).toBe(401);
    });

    it('POST /api/personal-brand/portfolio-advice without JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .send({ profile: PROFILE_SUFFICIENT });
      expect(res.status).toBe(401);
    });
  });

  // ── Input validation ───────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('brand-strategy: missing profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('portfolio-advice: missing profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Guard: profile insufficient → 400 ─────────────────────────────────────

  describe('Guard: profile_insufficient → 400 (no AI call)', () => {
    it('brand-strategy: empty profile → 400 with missing_fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_EMPTY });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('信息');
    });

    it('brand-strategy: profile with no experience/skills/education → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_NO_SKILLS_NO_EXP });
      expect(res.status).toBe(400);
    });

    it('portfolio-advice: empty profile → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_EMPTY });
      expect(res.status).toBe(400);
    });
  });

  // ── Normal: sufficient profile → 200 ──────────────────────────────────────

  describe('Normal: sufficient profile → 200 with expected fields', () => {
    it('brand-strategy → 200 with brand_strategy + platform_actions + content_ideas', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      expect(res.body.brand_strategy).toBeDefined();
      expect(res.body.platform_actions).toBeDefined();
      expect(res.body.content_ideas).toBeDefined();
      expect(['high', 'medium', 'low', 'insufficient']).toContain(res.body.confidence);
    });

    it('portfolio-advice → 200 with project_ideas + anti_patterns', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.project_ideas)).toBe(true);
      expect(Array.isArray(res.body.anti_patterns)).toBe(true);
    });
  });

  // ── Guard: fabricated evidence_used stripped ───────────────────────────────

  describe('Guard: unlocatable evidence_used stripped', () => {
    it('brand-strategy: evidence_used.value not in profile → stripped', async () => {
      mockBrandResult = makeBrandResult({
        evidence_used: [
          // "fabricated-skill" does NOT appear in PROFILE_SUFFICIENT JSON
          { field: 'skills.technical', value: 'fabricated-skill-xyz', relevance: '虚构技能' },
          // "react" DOES appear in PROFILE_SUFFICIENT JSON
          { field: 'skills.technical', value: 'react', relevance: '真实技能' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      const items: Array<{ value: string }> = res.body.evidence_used;
      // fabricated one should be stripped
      expect(items.every((e) => e.value !== 'fabricated-skill-xyz')).toBe(true);
      // real one should remain
      expect(items.some((e) => e.value === 'react')).toBe(true);
    });

    it('portfolio-advice: evidence_used.value not in profile → stripped', async () => {
      mockPortfolioResult = makePortfolioResult({
        evidence_used: [
          { field: 'skills', value: 'phantom-framework-999', relevance: '虚构' },
          { field: 'skills', value: 'react', relevance: '真实' },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      const items: Array<{ value: string }> = res.body.evidence_used;
      expect(items.every((e) => e.value !== 'phantom-framework-999')).toBe(true);
    });
  });

  // ── Guard: brand_strategy.evidence_basis must map to profile keys ──────────

  describe('Guard: brand_strategy.evidence_basis unlocatable items stripped', () => {
    it('evidence_basis containing non-existent profile key → stripped', async () => {
      mockBrandResult = makeBrandResult({
        brand_strategy: {
          type: 'technical_depth',
          positioning: '前端工程师',
          evidence_basis: [
            'skills',           // profile has "skills" key → kept
            'nonexistent_key_zzz', // not in profile → stripped
          ],
        },
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      const basis: string[] = res.body.brand_strategy.evidence_basis;
      expect(basis.includes('nonexistent_key_zzz')).toBe(false);
    });
  });

  // ── Guard: content_ideas with unlocatable source_experience stripped ────────

  describe('Guard: content_ideas with unlocatable source_experience stripped', () => {
    it('content_idea.source_experience not in profile → stripped', async () => {
      mockBrandResult = makeBrandResult({
        content_ideas: [
          {
            title: '虚构经历文章',
            angle: '基于虚构项目',
            source_experience: 'totally-made-up-project-xyz',
            format: 'article',
          },
          {
            title: 'React 实践文章',
            angle: '真实项目经验',
            source_experience: 'react',
            format: 'article',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/brand-strategy')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      const ideas: Array<{ source_experience: string }> = res.body.content_ideas;
      expect(ideas.every((i) => i.source_experience !== 'totally-made-up-project-xyz')).toBe(true);
    });
  });

  // ── Guard: project_ideas with unlocatable evidence_basis stripped ──────────

  describe('Guard: portfolio project_ideas with unlocatable evidence_basis stripped', () => {
    it('project_idea.evidence_basis not in profile → stripped', async () => {
      mockPortfolioResult = makePortfolioResult({
        project_ideas: [
          {
            title: '虚构区块链项目',
            description: '完全无关的项目',
            skills_demonstrated: ['Solidity'],
            size: 'large',
            estimated_weeks: 20,
            interview_talking_points: ['技术选型'],
            evidence_basis: 'blockchain-solidity-xyz',  // not in PROFILE_SUFFICIENT
            github_visibility: false,
          },
          {
            title: '前端性能监控',
            description: '基于真实 React 经验',
            skills_demonstrated: ['React'],
            size: 'medium',
            estimated_weeks: 6,
            interview_talking_points: ['技术选型', '挑战'],
            evidence_basis: 'react',  // in PROFILE_SUFFICIENT
            github_visibility: true,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_SUFFICIENT });

      expect(res.status).toBe(200);
      const ideas: Array<{ title: string }> = res.body.project_ideas;
      expect(ideas.every((p) => p.title !== '虚构区块链项目')).toBe(true);
      expect(ideas.some((p) => p.title === '前端性能监控')).toBe(true);
    });
  });

  // ── Guard: all-mentioned skills → low confidence ───────────────────────────

  describe('Guard: all-mentioned skills → confidence forced to low', () => {
    it('portfolio-advice with all-mentioned skills → confidence=low + note in summary', async () => {
      // AI returns high confidence — guard should downgrade
      mockPortfolioResult = makePortfolioResult({
        confidence: 'high',
        summary: '推荐以下项目。',
        project_ideas: [
          {
            title: '简单 CLI 工具',
            description: '练习用',
            skills_demonstrated: ['React'],
            size: 'small',
            estimated_weeks: 2,
            interview_talking_points: ['代码质量'],
            evidence_basis: 'react',  // "react" appears in PROFILE_ALL_MENTIONED JSON
            github_visibility: true,
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .post('/api/personal-brand/portfolio-advice')
        .set('Authorization', `Bearer ${token}`)
        .send({ profile: PROFILE_ALL_MENTIONED });

      expect(res.status).toBe(200);
      expect(res.body.confidence).toBe('low');
      expect(res.body.summary).toContain('无项目实践基础');
    });
  });
});

// ── AI Live (gate: RUN_AI_LIVE=1) ─────────────────────────────────────────────

const LIVE = process.env.RUN_AI_LIVE === '1';

// eslint-disable-next-line jest/valid-describe-callback
(LIVE ? describe : describe.skip)('PersonalBrand (AI live)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    token = await loginUser(app, 'personal-brand-live@coach.dev', 'Live Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('brand-strategy: real AI produces valid structure', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/personal-brand/brand-strategy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        profile: {
          name: '张三',
          skills: {
            technical: [
              { name: 'React', level: 'used_in_project' },
              { name: 'TypeScript', level: 'used_in_project' },
            ],
          },
          experience: [
            { company: '某互联网公司', title: '前端工程师', description: '主导 React SPA 重构，性能提升 40%' },
          ],
          education: [{ school: '某大学', degree: 'bachelor', major: '计算机科学' }],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.brand_strategy?.type).toBeDefined();
    expect(Array.isArray(res.body.platform_actions)).toBe(true);
    expect(Array.isArray(res.body.content_ideas)).toBe(true);
  }, 60000);

  it('portfolio-advice: real AI produces valid structure with anchored evidence_basis', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/personal-brand/portfolio-advice')
      .set('Authorization', `Bearer ${token}`)
      .send({
        profile: {
          name: '李四',
          skills: {
            technical: [
              { name: 'Node.js', level: 'used_in_project' },
              { name: 'PostgreSQL', level: 'used_in_project' },
            ],
          },
          experience: [
            { company: '某公司', title: '后端工程师', description: 'Node.js API 开发，PostgreSQL 数据库设计' },
          ],
          education: [{ school: '某大学', degree: 'bachelor' }],
        },
        skill_gaps: ['系统设计', '分布式架构'],
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.project_ideas)).toBe(true);
    expect(Array.isArray(res.body.anti_patterns)).toBe(true);
    // After guard: every project_idea.evidence_basis must appear in profile JSON
    const profileStr = JSON.stringify(res.request?.body?.profile ?? '').toLowerCase();
    for (const idea of res.body.project_ideas ?? []) {
      const basis = String(idea.evidence_basis ?? '').toLowerCase();
      if (basis.length > 3) {
        expect(profileStr).toContain(basis);
      }
    }
  }, 60000);
});
