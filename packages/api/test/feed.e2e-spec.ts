import { INestApplication } from '@nestjs/common';
import { createTestApp, loginUser, request } from './test-utils';

describe('Feed (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let otherToken: string;
  let adminToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    delete process.env.XHS_MCP_BASE_URL;
    // 波0 隔离:POST /feed/import、/feed/digest 现挂 AdminGuard(本就该管理员),
    // 故采集相关用例须用管理员 token。ADMIN_EMAILS 命中即注册为 admin;
    // 在 createTestApp 前置入 process.env(被 __SEAL_OPS_ENV__ 密封逻辑保留显式设置的键)。
    process.env.ADMIN_EMAILS = 'feed-admin@coach.dev';
    app = await createTestApp();
    token = await loginUser(app, 'feed1@coach.dev', 'Feed User One');
    otherToken = await loginUser(app, 'feed2@coach.dev', 'Feed User Two');
    adminToken = await loginUser(app, 'feed-admin@coach.dev', 'Feed Admin');
  });

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  describe('POST /api/feed', () => {
    it('creates a feed item with valid required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My Interview Experience at Acme',
          content: 'I had a great interview experience. The process was straightforward and the team was friendly.',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('My Interview Experience at Acme');
      expect(res.body.source_kind).toBe('ugc');
      expect(res.body.source_name).toBe('用户投稿');
      expect(res.body.created_at).toBeDefined();
    });

    it('creates a feed item with optional fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Offer from Big Tech',
          content: 'Got an offer after 5 rounds of interviews. Here is what I learned.',
          company: 'Big Tech Co',
          role: 'Senior Engineer',
          outcome: 'offer',
        });

      expect(res.status).toBe(201);
      expect(res.body.company).toBe('Big Tech Co');
      expect(res.body.role).toBe('Senior Engineer');
      expect(res.body.outcome).toBe('offer');
      expect(res.body.source_kind).toBe('ugc');
    });

    it('rejects missing title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Some content without a title.' });

      expect(res.status).toBe(400);
    });

    it('rejects missing content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'A title with no content' });

      expect(res.status).toBe(400);
    });

    it('rejects empty title', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '', content: 'Some valid content here.' });

      expect(res.status).toBe(400);
    });

    it('rejects empty content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Valid title', content: '' });

      expect(res.status).toBe(400);
    });

    it('rejects title over 200 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'A'.repeat(201),
          content: 'Valid content.',
        });

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .send({ title: 'No Auth Post', content: 'This should fail.' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/feed', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Seeded Feed Entry',
          content: 'This entry is seeded for GET tests.',
          company: 'SeedCo',
        });
    });

    it('returns feed items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].title).toBeDefined();
      expect(res.body[0].content).toBeDefined();
    });

    it('filters by source_kind', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?source_kind=ugc')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((item: { source_kind: string }) => item.source_kind === 'ugc')).toBe(true);
    });

    it('filters by company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?company=SeedCo')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((item: { company: string }) => item.company === 'SeedCo')).toBe(true);
    });

    it('rejects unsupported category filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?category=trending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated list', async () => {
      const res = await request(app.getHttpServer()).get('/api/feed');

      expect(res.status).toBe(401);
    });
  });

  // ── 隐私红线:feed 是跨用户共享数据集,GET /feed 绝不得回吐投稿人身份(PII) ──
  // 造一个带「可识别真名 + 邮箱」的投稿人 A,让 B(已登录)与匿名各自取 feed,
  // 断言响应里:① 没有 user / user_id 关系;② 任何字段值都不含 A 的 email/真名;
  // ③ 顶层键命中白名单(防未来新增列把 PII 顺带带出)。
  describe('GET /api/feed — 投稿人身份隔离(隐私红线)', () => {
    // A 的身份用足够独特、绝不会自然出现在 title/content 里的值,避免误报/漏报。
    const A_EMAIL = 'pii-author-zhang.wei.unique@coach.dev';
    const A_NAME = '张伟独特真名PiiMarker';
    let aToken: string;
    let createdId: string;

    // GET /api/feed 响应允许出现的顶层键(FeedItemResponseDto 字段全集)。
    // 任何不在此白名单内的键 = 潜在身份/内部字段泄露,直接判失败。
    const ALLOWED_KEYS = new Set([
      'id',
      'title',
      'content',
      'summary',
      'company',
      'role',
      'outcome',
      'source_kind',
      'source_name',
      'category',
      'source_url',
      'author',
      'quality_score',
      'published_at',
      'fetched_at',
      'created_at',
      'date_confidence',
    ]);

    beforeAll(async () => {
      aToken = await loginUser(app, A_EMAIL, A_NAME);
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${aToken}`)
        .send({
          title: 'A 的面试经历(隔离用例)',
          content: 'A 投稿正文,不含个人身份信息,仅用于验证 feed 不回吐作者身份。',
          company: 'IsolationCo',
        });
      expect(res.status).toBe(201);
      createdId = res.body.id;
      // 创建响应已走 FeedItemResponseDto 收口(与 findAll 一致):不回吐 user_id /
      // user 关系,响应里也绝不应凭空出现作者邮箱或真名,且顶层键命中 DTO 白名单。
      const createdJson = JSON.stringify(res.body);
      expect(res.body).not.toHaveProperty('user');
      expect(res.body).not.toHaveProperty('user_id');
      expect(createdJson).not.toContain(A_EMAIL);
      expect(createdJson).not.toContain(A_NAME);
      expect(createdJson).not.toContain('pii-author-zhang.wei.unique');
      for (const key of Object.keys(res.body as Record<string, unknown>)) {
        expect(ALLOWED_KEYS.has(key)).toBe(true);
      }
    });

    it('包含 A 的投稿(确保后续断言不是空集 → 防漏测)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const mine = res.body.find((i: { id: string }) => i.id === createdId);
      expect(mine).toBeDefined();
    });

    it('B(他人)GET /feed → 响应不含 A 的 email / 真名,且无 user 关系键', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);

      const json = JSON.stringify(res.body);
      // 红线①:整段响应不得出现 A 的邮箱或可识别真名。
      expect(json).not.toContain(A_EMAIL);
      expect(json).not.toContain(A_NAME);
      // 红线②:邮箱域名片段(防只截断 local-part)也不应整体出现。
      expect(json).not.toContain('pii-author-zhang.wei.unique');

      // 红线③:每条记录都不得带 user/user_id 关系,且顶层键命中白名单。
      for (const item of res.body as Record<string, unknown>[]) {
        expect(item).not.toHaveProperty('user');
        expect(item).not.toHaveProperty('user_id');
        for (const key of Object.keys(item)) {
          expect(ALLOWED_KEYS.has(key)).toBe(true);
        }
      }
    });

    it('B 用 company 过滤命中 A 的投稿 → 仍不回吐 A 的身份', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?company=IsolationCo')
        .set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const json = JSON.stringify(res.body);
      expect(json).not.toContain(A_EMAIL);
      expect(json).not.toContain(A_NAME);
      for (const item of res.body as Record<string, unknown>[]) {
        expect(item).not.toHaveProperty('user');
        expect(item).not.toHaveProperty('user_id');
        // UGC 投稿的 author 必须为空(匿名);绝不能等于投稿人真名。
        expect(item.author == null || item.author !== A_NAME).toBe(true);
      }
    });

    it('UGC 投稿的 author 字段为 null(渲染为匿名,不暴露作者)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed?company=IsolationCo')
        .set('Authorization', `Bearer ${otherToken}`);
      const mine = (res.body as { id: string; author: string | null }[]).find(
        (i) => i.id === createdId,
      );
      expect(mine).toBeDefined();
      expect(mine!.author).toBeNull();
    });
  });

  describe('GET /api/feed/sources', () => {
    it('returns configured source registry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((source: { kind: string }) => source.kind === 'xhs')).toBe(true);
      expect(res.body.some((source: { kind: string }) => source.kind === 'nowcoder')).toBe(true);
    });

    it('marks missing configured sources as needs_config', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const xhs = res.body.find((source: { kind: string }) => source.kind === 'xhs');
      expect(xhs.status).toBe('needs_config');
    });

    it('rejects unauthenticated source registry access', async () => {
      const res = await request(app.getHttpServer()).get('/api/feed/sources');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/feed/import and GET /api/feed/runs', () => {
    it('records a failed run when an explicit source needs configuration', async () => {
      const sourcesRes = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${adminToken}`);
      const xhs = sourcesRes.body.find((source: { kind: string }) => source.kind === 'xhs');

      const importRes = await request(app.getHttpServer())
        .post('/api/feed/import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ source_id: xhs.id, keyword: '字节 面经' });

      expect(importRes.status).toBe(201);
      expect(importRes.body.runs).toHaveLength(1);
      expect(importRes.body.runs[0].status).toBe('failed');
      expect(importRes.body.runs[0].error_message).toContain('requires');
    });

    it('lists ingestion runs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/feed/runs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('rejects unauthenticated import', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed/import')
        .send({});

      expect(res.status).toBe(401);
    });

    // 波0 隔离新契约:普通(非管理员)用户调采集端点 → 403。
    it('rejects non-admin import with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ keyword: '随便' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/feed/:id', () => {
    let itemId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'To Be Deleted',
          content: 'This item will be deleted in the test.',
        });
      itemId = res.body.id;
    });

    it('lets owner delete a feed item', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/feed/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('returns 404 for missing item', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/feed/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('does not let another user delete the item', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/feed')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Protected Feed Post',
          content: 'Only the owner should be able to delete this.',
        });

      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/feed/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(deleteRes.status).toBe(404);
    });

    it('rejects unauthenticated delete', async () => {
      const res = await request(app.getHttpServer()).delete(`/api/feed/${itemId}`);

      expect(res.status).toBe(401);
    });
  });
});
