import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { FeedItem } from '../src/feed/entities/feed-item.entity';
import { request, loginUser } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Deterministic mock for AiService                                   */
/* ------------------------------------------------------------------ */
const mockAiService = {
  complete: jest.fn().mockResolvedValue(
    '{"category":"interview_exp","title":"test","summary":"test","company":"字节跳动","role":"后端","outcome":null,"tags":{"companies":["字节跳动"],"roles":["后端"],"topics":["算法"]},"quality_score":3,"department":null,"role_category":"backend","interview_round":"一面","question_types":["算法"],"difficulty":"medium","quarter":"2026Q2","confidence":"high"}',
  ),
  completeStructured: jest.fn().mockResolvedValue({}),
};

/* ------------------------------------------------------------------ */
/*  Helper: directly seed a FeedItem with a specific source_kind       */
/* ------------------------------------------------------------------ */
async function seedFeedItem(
  repo: Repository<FeedItem>,
  overrides: Partial<FeedItem>,
): Promise<FeedItem> {
  const item = repo.create({
    title: '测试面经',
    content: '字节跳动后端一面，算法题+系统设计，顺利通过',
    company: '字节跳动',
    role: '后端开发',
    source: 'xhs',
    source_kind: 'xhs',
    source_name: '小红书',
    source_url: 'https://www.xiaohongshu.com/post/test-001',
    category: 'interview_exp',
    quality_score: 5,
    role_category: 'backend',
    interview_round: '一面',
    question_types: ['算法', '系统设计'],
    difficulty: 'medium',
    quarter: '2026Q2',
    confidence: 'high',
    tags_json: JSON.stringify({
      companies: ['字节跳动'],
      roles: ['后端'],
      topics: ['算法'],
    }),
    ...overrides,
  });
  return repo.save(item);
}

/* ================================================================== */
/*  Test suite                                                         */
/* ================================================================== */
describe('Newspaper (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let feedRepo: Repository<FeedItem>;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    // Ensure no real external services are contacted
    delete process.env.XHS_MCP_BASE_URL;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    feedRepo = moduleRef.get<Repository<FeedItem>>(getRepositoryToken(FeedItem));

    token = await loginUser(app, 'newspaper1@coach.dev', 'Newspaper User One');

    // Seed a variety of feed items so sections have data
    await seedFeedItem(feedRepo, {
      source: 'xhs',
      source_kind: 'xhs',
      source_name: '小红书',
      source_url: 'https://www.xiaohongshu.com/post/xhs-001',
      company: '字节跳动',
      role_category: 'backend',
    });
    await seedFeedItem(feedRepo, {
      title: '腾讯前端面试分享',
      source: 'xhs',
      source_kind: 'xhs',
      source_name: '小红书',
      source_url: 'https://www.xiaohongshu.com/post/xhs-002',
      company: '腾讯',
      role_category: 'frontend',
    });
    await seedFeedItem(feedRepo, {
      title: '牛客字节后端笔试题',
      source: 'nowcoder',
      source_kind: 'nowcoder',
      source_name: '牛客网',
      source_url: 'https://www.nowcoder.com/discuss/nc-001',
      company: '字节跳动',
      role_category: 'backend',
    });
    await seedFeedItem(feedRepo, {
      title: '阿里算法岗面经',
      source: 'nowcoder',
      source_kind: 'nowcoder',
      source_name: '牛客网',
      source_url: 'https://www.nowcoder.com/discuss/nc-002',
      company: '阿里巴巴',
      role_category: 'algorithm',
    });
    await seedFeedItem(feedRepo, {
      title: '2026年AI大厂裁员趋势分析',
      source: 'wechat',
      source_kind: 'wechat',
      source_name: '技术求职指南',
      source_url: 'https://mp.weixin.qq.com/s/wechat-001',
      company: null,
      role_category: null,
      category: 'market_insight',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  /* ================================================================ */
  /*  GET /newspaper                                                   */
  /* ================================================================ */

  describe('GET /api/newspaper', () => {
    // #1
    it('returns 200 with NewspaperEdition structure', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(typeof res.body).toBe('object');
    });

    // #2
    it('has headline_observations array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.headline_observations)).toBe(true);
    });

    // #3
    it('has user_voice array containing only xhs items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.user_voice)).toBe(true);
      // Every item in user_voice must be from xhs
      for (const item of res.body.user_voice as Array<{ source_kind: string }>) {
        expect(item.source_kind).toBe('xhs');
      }
    });

    // #4
    it('has tech_radar array containing only nowcoder items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.tech_radar)).toBe(true);
      // Every item in tech_radar must be from nowcoder
      for (const item of res.body.tech_radar as Array<{ source_kind: string }>) {
        expect(item.source_kind).toBe('nowcoder');
      }
    });

    // #5
    it('has insight_cards with why_read field', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.insight_cards)).toBe(true);
      // The wechat item was seeded — expect at least one card
      expect(res.body.insight_cards.length).toBeGreaterThan(0);
      for (const card of res.body.insight_cards as Array<{ why_read: unknown }>) {
        expect(card.why_read).toBeDefined();
        expect(typeof card.why_read).toBe('string');
      }
    });

    // #6
    it('has coach_actions with "上传简历" for a new user with no resume', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.coach_actions)).toBe(true);
      expect(res.body.coach_actions.length).toBeGreaterThan(0);

      const actions = res.body.coach_actions as Array<{ action: string }>;
      const hasUploadResume = actions.some((a) => a.action === '上传简历');
      expect(hasUploadResume).toBe(true);
    });

    // #7
    it('has trending_tags array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.trending_tags)).toBe(true);
    });

    // #8
    it('has total_count field reflecting seeded items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.total_count).toBe('number');
      // We seeded 5 items with source_url set
      expect(res.body.total_count).toBeGreaterThan(0);
    });

    // #9
    it('has categories object counting items by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.categories).toBe('object');
      expect(res.body.categories).not.toBeNull();
    });

    // #10 - auth guard
    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer()).get('/api/newspaper');

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  user_voice / tech_radar content verification                    */
  /* ================================================================ */

  describe('user_voice and tech_radar section data', () => {
    // #11
    it('user_voice items have required FeedItem fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const item of res.body.user_voice as Array<Record<string, unknown>>) {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.source_url).toBeDefined();
        expect(item.source_url).not.toBe('');
      }
    });

    // #12
    it('headline_observations have observation text and evidence_items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      if (res.body.headline_observations.length > 0) {
        const obs = res.body.headline_observations[0] as {
          observation: string;
          evidence_items: unknown[];
        };
        expect(typeof obs.observation).toBe('string');
        expect(obs.observation.length).toBeGreaterThan(0);
        expect(Array.isArray(obs.evidence_items)).toBe(true);
      }
    });

    // #13
    it('insight_cards have required InsightCard fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const card of res.body.insight_cards as Array<Record<string, unknown>>) {
        expect(typeof card.title).toBe('string');
        expect(typeof card.source_name).toBe('string');
        expect(typeof card.why_read).toBe('string');
        expect(typeof card.career_implication).toBe('string');
        expect(Array.isArray(card.impact_tags)).toBe(true);
        expect(typeof card.summary).toBe('string');
      }
    });

    // #14
    it('coach_actions have action, reason, data_source fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      for (const act of res.body.coach_actions as Array<Record<string, unknown>>) {
        expect(typeof act.action).toBe('string');
        expect(act.action.length).toBeGreaterThan(0);
        expect(typeof act.reason).toBe('string');
        expect(typeof act.data_source).toBe('string');
      }
    });
  });

  /* ================================================================ */
  /*  GET /newspaper/radar                                             */
  /* ================================================================ */

  describe('GET /api/newspaper/radar', () => {
    // #15
    it('returns items, company_stats, and role_stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(Array.isArray(res.body.company_stats)).toBe(true);
      expect(Array.isArray(res.body.role_stats)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    // #16
    it('company_stats entries have company and numeric count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.company_stats.length).toBeGreaterThan(0);
      for (const stat of res.body.company_stats as Array<{ company: string; count: number }>) {
        expect(typeof stat.company).toBe('string');
        expect(typeof stat.count).toBe('number');
        expect(stat.count).toBeGreaterThan(0);
      }
    });

    // #17
    it('role_stats entries have role_category and numeric count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.role_stats.length).toBeGreaterThan(0);
      for (const stat of res.body.role_stats as Array<{ role_category: string; count: number }>) {
        expect(typeof stat.role_category).toBe('string');
        expect(typeof stat.count).toBe('number');
        expect(stat.count).toBeGreaterThan(0);
      }
    });

    // #18
    it('filters by company=字节跳动 — only returns 字节跳动 items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?company=字节跳动')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items as Array<{ company: string }>) {
        expect(item.company).toBe('字节跳动');
      }
    });

    // #19
    it('filters by source_kind=xhs — only returns xhs items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?source_kind=xhs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items as Array<{ source_kind: string }>) {
        expect(item.source_kind).toBe('xhs');
      }
    });

    // #20
    it('filters by source_kind=nowcoder — only returns nowcoder items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?source_kind=nowcoder')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items as Array<{ source_kind: string }>) {
        expect(item.source_kind).toBe('nowcoder');
      }
    });

    // #21
    it('returns no items for non-existent company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?company=不存在的公司XYZ')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.items).toHaveLength(0);
    });

    // #22
    it('supports keyword search across title, content, company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?keyword=字节')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      for (const item of res.body.items as Array<{
        title: string;
        content: string;
        company: string | null;
      }>) {
        const matchesKeyword =
          item.title.includes('字节') ||
          item.content.includes('字节') ||
          (item.company ?? '').includes('字节');
        expect(matchesKeyword).toBe(true);
      }
    });

    // #23
    it('respects pagination — limit=1 returns exactly 1 item', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?limit=1&page=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      // total should reflect full count, not just the page
      expect(res.body.total).toBeGreaterThan(1);
    });

    // #24 - auth guard
    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer()).get('/api/newspaper/radar');

      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  GET /newspaper/radar/companies                                   */
  /* ================================================================ */

  describe('GET /api/newspaper/radar/companies', () => {
    it('returns CompanyRadarResponse with companies array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.companies)).toBe(true);
      expect(typeof res.body.total_companies).toBe('number');
      expect(typeof res.body.generated_at).toBe('string');
    });

    it('source counts sum to total_count for each company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.xhs_count + c.nowcoder_count + c.wechat_count).toBe(c.total_count);
      }
    });

    it('usable + candidate + rejected = total for each company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.usable_count + c.candidate_count + c.rejected_count).toBe(c.total_count);
      }
    });

    it('excludes items with null company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.company).not.toBeNull();
        expect(c.company).not.toBe('');
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies');
      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  GET /newspaper/radar/roles                                       */
  /* ================================================================ */

  describe('GET /api/newspaper/radar/roles', () => {
    it('returns RoleRadarResponse with roles array, total_roles, generated_at', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roles)).toBe(true);
      expect(typeof res.body.total_roles).toBe('number');
      expect(typeof res.body.generated_at).toBe('string');
    });

    it('role_category is normalized — no null or empty values', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const role of res.body.roles) {
        expect(role.role_category).toBeDefined();
        expect(role.role_category).not.toBe('null');
        expect(role.role_category).not.toBe('');
      }
    });

    it('representative_posts have source_url', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const role of res.body.roles) {
        for (const post of role.representative_posts) {
          expect(typeof post.source_url).toBe('string');
          expect(post.source_url.length).toBeGreaterThan(0);
        }
      }
    });

    it('common_question_keywords is array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const role of res.body.roles) {
        expect(Array.isArray(role.common_question_keywords)).toBe(true);
      }
    });

    it('source counts sum to total_count for each role', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const role of res.body.roles) {
        expect(role.xhs_count + role.nowcoder_count + role.wechat_count).toBe(role.total_count);
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles');
      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  GET /newspaper/radar/trends                                      */
  /* ================================================================ */

  describe('GET /api/newspaper/radar/trends', () => {
    it('returns TrendRadarResponse structure with period, this_week, comparison, hot_posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.period).toBeDefined();
      expect(typeof res.body.period.current_start).toBe('string');
      expect(typeof res.body.period.current_end).toBe('string');
      expect(typeof res.body.period.previous_start).toBe('string');
      expect(typeof res.body.period.previous_end).toBe('string');
      expect(res.body.this_week).toBeDefined();
      expect(res.body.comparison).toBeDefined();
      expect(Array.isArray(res.body.hot_posts)).toBe(true);
    });

    it('this_week contains new_items, new_companies, new_role_categories, top_sources', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.this_week.new_items).toBe('number');
      expect(Array.isArray(res.body.this_week.new_companies)).toBe(true);
      expect(Array.isArray(res.body.this_week.new_role_categories)).toBe(true);
      expect(Array.isArray(res.body.this_week.top_sources)).toBe(true);
    });

    it('comparison has has_baseline, item_count_delta, item_count_previous, message', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.comparison.has_baseline).toBe('boolean');
      expect(typeof res.body.comparison.item_count_delta).toBe('number');
      expect(typeof res.body.comparison.item_count_previous).toBe('number');
      expect(typeof res.body.comparison.message).toBe('string');
    });

    it('hot_posts entries have title, source_kind, source_url, created_at', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const post of res.body.hot_posts) {
        expect(typeof post.title).toBe('string');
        expect(typeof post.source_kind).toBe('string');
        expect(typeof post.source_url).toBe('string');
        expect(post.source_url.length).toBeGreaterThan(0);
        expect(typeof post.created_at).toBe('string');
      }
    });

    it('top_sources entries have source_kind and numeric count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const src of res.body.this_week.top_sources) {
        expect(typeof src.source_kind).toBe('string');
        expect(typeof src.count).toBe('number');
        expect(src.count).toBeGreaterThan(0);
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends');
      expect(res.status).toBe(401);
    });
  });

  /* ================================================================ */
  /*  User personalization — coach_actions react to user state        */
  /* ================================================================ */

  describe('Coach actions personalization', () => {
    // #25
    it('"开始投递" action appears for user with no applications', async () => {
      // newspaper1@coach.dev has no applications at this point
      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const actions = res.body.coach_actions as Array<{ action: string }>;
      const hasStartApplying = actions.some((a) => a.action === '开始投递');
      expect(hasStartApplying).toBe(true);
    });
  });

  /* ================================================================ */
  /*  Edge: items without source_url are excluded from newspaper      */
  /* ================================================================ */

  describe('Edge cases', () => {
    // #26
    it('items without source_url do not appear in user_voice or tech_radar', async () => {
      // Seed an xhs item with no source_url
      await seedFeedItem(feedRepo, {
        title: '无URL的小红书面经',
        source: 'xhs',
        source_kind: 'xhs',
        source_name: '小红书',
        source_url: null as unknown as string,
        company: '百度',
        role_category: 'backend',
      });

      const res = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const userVoice = res.body.user_voice as Array<{ title: string; source_url: string | null }>;
      const noUrlInVoice = userVoice.find((i) => i.title === '无URL的小红书面经');
      expect(noUrlInVoice).toBeUndefined();
    });
  });
});
