/**
 * T2 月刊校招情报摄入流水线 e2e:三类源管理端点(admin-only,不挂 CreditGuard)+ 上传即时解析 +
 * newspaper「校招情报」板块呈现 + 防编造(缺 event_date 不进主列表,落"日期待确认")。
 *
 * AiService.complete 被 mock 为确定性输出(与 career.e2e-spec.ts 同规则:deterministic AI mock,
 * 不打真实 GLM,保证测试可重复且不消耗真实配额)。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { loginUser, request } from './test-utils';

const FIXTURES_DIR = join(__dirname, 'fixtures');

const mockAiService = {
  complete: jest.fn<Promise<string>, [{ system: string; prompt: string; maxTokens?: number }]>(),
  completeStructured: jest.fn(),
};

describe('T2 Recruit Intel (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.ADMIN_EMAILS = 'recruit-admin@coach.dev';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    adminToken = await loginUser(app, 'recruit-admin@coach.dev', 'Recruit Admin');
    userToken = await loginUser(app, 'recruit-user@coach.dev', 'Recruit User');
  }, 30000);

  afterEach(() => {
    mockAiService.complete.mockReset();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  async function createSource(
    token: string,
    body: { kind: string; name: string; homepage_url?: string },
  ) {
    return request(app.getHttpServer())
      .post('/api/feed/sources')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  describe('POST /api/feed/sources — 源创建权限与范围', () => {
    it('non-admin 创建来源 → 403', async () => {
      const res = await createSource(userToken, { kind: 'sheet_file', name: '普通用户尝试' });
      expect(res.status).toBe(403);
    });

    it('unauthenticated → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/feed/sources')
        .send({ kind: 'sheet_file', name: '未登录' });
      expect(res.status).toBe(401);
    });

    it('admin 创建 sheet_file 来源 → 201', async () => {
      const res = await createSource(adminToken, { kind: 'sheet_file', name: '规整表格源' });
      expect(res.status).toBe(201);
      expect(res.body.kind).toBe('sheet_file');
      expect(res.body.status).toBe('active');
    });

    it('admin 创建 sheet_link 来源(带 homepage_url)→ 201', async () => {
      const res = await createSource(adminToken, {
        kind: 'sheet_link',
        name: '腾讯文档源',
        homepage_url: 'https://docs.qq.com/sheet/fake-id',
      });
      expect(res.status).toBe(201);
      expect(res.body.homepage_url).toBe('https://docs.qq.com/sheet/fake-id');
    });

    it('kind 不在允许范围(如既有 wechat)→ 400,不与既有 wechat 通道混用', async () => {
      const res = await createSource(adminToken, { kind: 'wechat', name: '不该被这个端点创建' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/feed/sources/:id/upload — sheet_file CSV 即时解析', () => {
    it('规整 CSV 上传 → 全部解析入库,newspaper 按 event_date 升序展示', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'sheet_file', name: 'CSV 规整测试源' });
      const sourceId = sourceRes.body.id;

      mockAiService.complete.mockResolvedValueOnce(
        JSON.stringify([
          { row_number: 1, company: '字节跳动', role_hint: '后端开发', event_type: '网申开启', event_date: '2026-08-01', city: '北京', apply_url: 'https://jobs.bytedance.com/campus/1', confidence: 'high' },
          { row_number: 2, company: '腾讯', role_hint: '产品经理', event_type: '宣讲会', event_date: '2026-08-15', city: '深圳', apply_url: null, confidence: 'high' },
          { row_number: 3, company: '阿里巴巴', role_hint: '算法工程师', event_type: '笔试', event_date: '2026-09-01', city: '杭州', apply_url: null, confidence: 'high' },
        ]),
      );

      const uploadRes = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', readFileSync(join(FIXTURES_DIR, 'recruit-clean.csv')), 'recruit-clean.csv');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.total_rows).toBe(3);
      expect(uploadRes.body.saved).toBe(3);
      expect(uploadRes.body.skipped).toBe(0);
      expect(uploadRes.body.run.status).toBe('success');

      const newspaperRes = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(newspaperRes.status).toBe(200);

      const companies = newspaperRes.body.recruit_intel.upcoming.map((e: { company: string }) => e.company);
      expect(companies).toEqual(['字节跳动', '腾讯', '阿里巴巴']);

      // role_hint 字段(T3 钩子)必须真实透传,不是空壳字段。
      const bytedance = newspaperRes.body.recruit_intel.upcoming.find((e: { company: string }) => e.company === '字节跳动');
      expect(bytedance.role_hint).toBe('后端开发');
      expect(bytedance.apply_url).toBe('https://jobs.bytedance.com/campus/1');
      expect(bytedance.event_date.slice(0, 10)).toBe('2026-08-01');
    });

    it('防编造:缺 event_date 的行落"日期待确认"分区,不进 upcoming 主列表,且不由代码/AI 补全日期', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'sheet_file', name: 'CSV 缺日期测试源' });
      const sourceId = sourceRes.body.id;

      mockAiService.complete.mockResolvedValueOnce(
        JSON.stringify([
          { row_number: 1, company: '快手', role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
        ]),
      );

      const uploadRes = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('公司,类型\n快手,不确定\n'), 'no-date.csv');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.saved).toBe(1);

      const newspaperRes = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${adminToken}`);

      const inUpcoming = newspaperRes.body.recruit_intel.upcoming.some((e: { company: string }) => e.company === '快手');
      const inUnscheduled = newspaperRes.body.recruit_intel.unscheduled.some((e: { company: string }) => e.company === '快手');
      expect(inUpcoming).toBe(false);
      expect(inUnscheduled).toBe(true);
      const kuaishouEntry = newspaperRes.body.recruit_intel.unscheduled.find((e: { company: string }) => e.company === '快手');
      expect(kuaishouEntry.event_date).toBeNull();
    });

    it('company 缺失的行整条丢弃,不落库为"公司未知"的假记录(run 记为 partial,不是硬错误)', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'sheet_file', name: 'CSV 缺公司测试源' });
      const sourceId = sourceRes.body.id;

      mockAiService.complete.mockResolvedValueOnce(
        JSON.stringify([
          { row_number: 1, company: null, role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
        ]),
      );

      const uploadRes = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('公司,类型\n某个无法识别公司的活动,神秘活动\n'), 'blank-company.csv');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.total_rows).toBe(1);
      expect(uploadRes.body.saved).toBe(0);
      expect(uploadRes.body.skipped).toBe(1);
      expect(uploadRes.body.run.status).toBe('partial');
    });

    it('non-admin 上传 → 403', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'sheet_file', name: 'CSV 权限测试源' });
      const sourceId = sourceRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', readFileSync(join(FIXTURES_DIR, 'recruit-clean.csv')), 'recruit-clean.csv');

      expect(res.status).toBe(403);
    });

    it('sheet_link 来源不接受文件上传 → 400', async () => {
      const sourceRes = await createSource(adminToken, {
        kind: 'sheet_link',
        name: '链接源不可上传',
        homepage_url: 'https://docs.qq.com/sheet/another-fake-id',
      });
      const sourceId = sourceRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('公司,类型\n某公司,其他\n'), 'x.csv');

      expect(res.status).toBe(400);
    });

    it('未选择文件 → 400', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'sheet_file', name: '空上传测试源' });
      const res = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceRes.body.id}/upload`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/feed/sources/:id/upload — wechat_dump JSON 即时解析', () => {
    it('通用 json 摄入(账号+文章数组)解析入库', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'wechat_dump', name: '公众号整理稿测试源' });
      const sourceId = sourceRes.body.id;

      mockAiService.complete.mockResolvedValueOnce(
        JSON.stringify([
          { row_number: 1, company: '字节跳动', role_hint: '研发/产品/设计', event_type: '网申截止', event_date: '2026-09-30', city: null, apply_url: null, confidence: 'high' },
          { row_number: 2, company: null, role_hint: null, event_type: '其他', event_date: null, city: null, apply_url: null, confidence: 'low' },
        ]),
      );

      const uploadRes = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceId}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', readFileSync(join(FIXTURES_DIR, 'recruit-wechat-dump.json')), 'recruit-wechat-dump.json');

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.total_rows).toBe(2);
      expect(uploadRes.body.saved).toBe(1); // 第二篇(company null)被丢弃

      const newspaperRes = await request(app.getHttpServer())
        .get('/api/newspaper')
        .set('Authorization', `Bearer ${adminToken}`);
      const bytedance = newspaperRes.body.recruit_intel.upcoming.find(
        (e: { company: string }) => e.company === '字节跳动' && e.event_type === '网申截止',
      );
      expect(bytedance).toBeDefined();
    });

    it('结构不合法(非 JSON)→ 400', async () => {
      const sourceRes = await createSource(adminToken, { kind: 'wechat_dump', name: '非法json测试源' });
      const res = await request(app.getHttpServer())
        .post(`/api/feed/sources/${sourceRes.body.id}/upload`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('this is not json'), 'bad.json');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/feed/sources、/api/feed/runs — T4 遗留 AdminGuard 缺口补丁', () => {
    it('non-admin 访问 sources/runs → 403', async () => {
      const sourcesRes = await request(app.getHttpServer())
        .get('/api/feed/sources')
        .set('Authorization', `Bearer ${userToken}`);
      const runsRes = await request(app.getHttpServer())
        .get('/api/feed/runs')
        .set('Authorization', `Bearer ${userToken}`);
      expect(sourcesRes.status).toBe(403);
      expect(runsRes.status).toBe(403);
    });
  });
});
