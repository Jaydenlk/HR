import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/ai/ai.service';
import { User } from '../src/users/entities/user.entity';
import { Announcement } from '../src/announcements/entities/announcement.entity';
import { request } from './test-utils';

// ─── 公告 e2e(AnnouncementsController + AdminAnnouncementsController）──────────
//
// 覆盖三条契约:
//  ① 发布端点(POST /api/admin/announcements）AdminGuard 门控:无 token→401、普通用户→403、admin→成功。
//  ② 公开端点(GET /api/announcements）只返 active=true，且出站为 DTO 白名单（无内部/未声明字段泄漏）。
//  ③ 出站 DTO 字段集恰为白名单 7 字段。
//
// 复用 admin.e2e-spec 同款脚手架:AppModule + mock AiService(AppModule 校验 AI 配置存在）+
// ADMIN_EMAILS 引导 admin。sqlite 由 jest-setup-env 强制 :memory:（不污染 dev 库）。

const mockAiService = {
  complete: jest.fn().mockResolvedValue('mock'),
  completeStructured: jest.fn().mockResolvedValue({}),
};

// DTO 白名单:AnnouncementResponseDto 暴露的全部字段（出站契约）。
// 含 display_type(banner/modal)——前端按此分流横幅/弹窗。
const DTO_FIELDS = [
  'id',
  'title',
  'body',
  'kind',
  'display_type',
  'active',
  'created_at',
  'published_at',
] as const;

async function registerUser(app: INestApplication, email: string, name: string): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode = codeRes.body.dev_code as string | undefined;
  if (!devCode) throw new Error(`无 dev_code:${JSON.stringify(codeRes.body)}`);
  const loginRes = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, invite_code: 'COACH2026', name });
  return loginRes.body.access_token as string;
}

describe('Announcements (e2e)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let annRepo: Repository<Announcement>;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    process.env.CLOUDDREAM_MODEL = 'auto-v2';
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'admin@coach.dev';
    delete process.env.SMTP_HOST;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    userRepo = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    annRepo = moduleRef.get<Repository<Announcement>>(getRepositoryToken(Announcement));

    adminToken = await registerUser(app, 'admin@coach.dev', '超管');
    const admin = await userRepo.findOneBy({ email: 'admin@coach.dev' });
    expect(admin!.role).toBe('admin');

    userToken = await registerUser(app, 'normal@coach.dev', '普通');
    const normal = await userRepo.findOneBy({ email: 'normal@coach.dev' });
    expect(normal!.role).toBe('user');
  }, 60000);

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // ─── ① 发布端点 AdminGuard 门控 ─────────────────────────────────────────────
  describe('POST /api/admin/announcements 发布端点门控', () => {
    it('无 token → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .send({ title: '匿名发布', body: '不该成功' });
      expect(res.status).toBe(401);
    });

    it('普通用户 → 403「无管理员权限」', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: '越权发布', body: '不该成功' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无管理员权限');
    });

    it('admin → 201 成功发布,落库可查', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '上线公告', body: '面试复盘功能已上线', kind: 'feature' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('上线公告');
      expect(res.body.kind).toBe('feature');
      expect(res.body.active).toBe(true);
      expect(typeof res.body.id).toBe('string');
      // active 发布时 published_at 非空。
      expect(res.body.published_at).not.toBeNull();

      // 落库核实。
      const inDb = await annRepo.findOneBy({ id: res.body.id });
      expect(inDb).not.toBeNull();
      expect(inDb!.title).toBe('上线公告');
    });

    it('admin 发布缺 title → 400(DTO 校验）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: '没有标题' });
      expect(res.status).toBe(400);
    });

    it('GET /api/admin/announcements 也受门控:无 token→401、普通用户→403、admin→200', async () => {
      const anon = await request(app.getHttpServer()).get('/api/admin/announcements');
      expect(anon.status).toBe(401);

      const normal = await request(app.getHttpServer())
        .get('/api/admin/announcements')
        .set('Authorization', `Bearer ${userToken}`);
      expect(normal.status).toBe(403);

      const admin = await request(app.getHttpServer())
        .get('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(admin.status).toBe(200);
      expect(Array.isArray(admin.body)).toBe(true);
    });
  });

  // ─── ② 公开端点只返 active + ③ 出站 DTO 白名单 ─────────────────────────────
  describe('GET /api/announcements 只返 active + DTO 白名单', () => {
    let activeId: string;
    let inactiveId: string;

    beforeAll(async () => {
      // 经 admin 端点造一条 active、一条下架（active=false）。
      const a = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '在架公告', body: '公开端应可见', kind: 'fix', active: true });
      expect(a.status).toBe(201);
      activeId = a.body.id;

      const b = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '下架公告', body: '公开端不该出现', kind: 'maintenance', active: false });
      expect(b.status).toBe(201);
      inactiveId = b.body.id;
      // 已下架:active=false。
      expect(b.body.active).toBe(false);
    }, 30000);

    it('未登录也可读(公开端无守卫）→ 200', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('只返 active=true:含在架,绝不含下架', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements');
      expect(res.status).toBe(200);
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).toContain(activeId);
      expect(ids).not.toContain(inactiveId);
      // 每条都必须 active=true。
      for (const item of res.body as { active: boolean }[]) {
        expect(item.active).toBe(true);
      }
    });

    it('出站 DTO 白名单:每条字段集恰为 7 个声明字段,无内部/多余字段泄漏', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const item of res.body as Record<string, unknown>[]) {
        const keys = Object.keys(item).sort();
        expect(keys).toEqual([...DTO_FIELDS].sort());
        // 显式杜绝任何未声明字段（防 entity 透传新增列）。
        for (const k of keys) {
          expect(DTO_FIELDS).toContain(k as (typeof DTO_FIELDS)[number]);
        }
      }
    });

    it('登录用户读到的字段集与未登录一致(DTO 不因身份变化）', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/announcements')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      for (const item of res.body as Record<string, unknown>[]) {
        expect(Object.keys(item).sort()).toEqual([...DTO_FIELDS].sort());
      }
    });

    it('下架后即从公开端消失:admin PATCH active=false → 公开端不再返回', async () => {
      const patch = await request(app.getHttpServer())
        .patch(`/api/admin/announcements/${activeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false });
      expect(patch.status).toBe(200);
      expect(patch.body.active).toBe(false);

      const res = await request(app.getHttpServer()).get('/api/announcements');
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).not.toContain(activeId);
    });
  });

  // ─── 3 天可见窗口:published_at ≤3 天显示，>3 天不显示 ──────────────────────────
  // 公开端 findActive 用计算式 published_at ≥ now - 3 天过滤；造数据后直接改 published_at 列验证。
  describe('GET /api/announcements 3 天可见窗口', () => {
    let freshId: string; // 刚发布（窗口内）
    let staleId: string; // 发布已 4 天（窗口外）
    let edgeInId: string; // 距今 2 天 23 小时（窗口内边界）
    let edgeOutId: string; // 距今 3 天 1 分钟（窗口外边界）

    beforeAll(async () => {
      const mk = async (title: string): Promise<string> => {
        const r = await request(app.getHttpServer())
          .post('/api/admin/announcements')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title, body: '窗口测试', kind: 'feature', active: true });
        expect(r.status).toBe(201);
        return r.body.id as string;
      };
      freshId = await mk('窗口内-刚发布');
      staleId = await mk('窗口外-4天前');
      edgeInId = await mk('窗口内边界-2天23小时');
      edgeOutId = await mk('窗口外边界-3天零1分');

      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      // 直接改 published_at 列模拟历史发布点（create 写的是 now）。
      await annRepo.update({ id: staleId }, { published_at: new Date(now - 4 * DAY) });
      await annRepo.update(
        { id: edgeInId },
        { published_at: new Date(now - (3 * DAY - 60 * 60 * 1000)) }, // 2天23小时前
      );
      await annRepo.update(
        { id: edgeOutId },
        { published_at: new Date(now - (3 * DAY + 60 * 1000)) }, // 3天零1分前
      );
    }, 30000);

    it('发布 <3 天 → 公开端返回', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=50');
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).toContain(freshId);
      expect(ids).toContain(edgeInId);
    });

    it('发布 >3 天 → 公开端不返回', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=50');
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).not.toContain(staleId);
      expect(ids).not.toContain(edgeOutId);
    });

    it('窗口内每条 published_at 距今均 ≤3 天', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=50');
      const now = Date.now();
      const WINDOW = 3 * 24 * 60 * 60 * 1000;
      for (const item of res.body as { published_at: string | null }[]) {
        expect(item.published_at).not.toBeNull();
        const age = now - new Date(item.published_at as string).getTime();
        expect(age).toBeLessThanOrEqual(WINDOW + 5_000); // 5s 容差(执行耗时)
      }
    });

    it('窗口外公告管理后台仍可见(findAll 不受窗口限制)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`);
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).toContain(staleId);
      expect(ids).toContain(edgeOutId);
    });
  });

  // ─── 类型路由:banner 只进横条通道、modal 只进弹窗通道，不串 ───────────────────
  describe('GET /api/announcements 类型路由 (placement 过滤)', () => {
    let bannerId: string;
    let modalId: string;

    beforeAll(async () => {
      const b = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '横幅公告', body: '走横条', display_type: 'banner', active: true });
      expect(b.status).toBe(201);
      expect(b.body.display_type).toBe('banner');
      bannerId = b.body.id;

      const m = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '弹窗公告', body: '走弹窗', display_type: 'modal', active: true });
      expect(m.status).toBe(201);
      expect(m.body.display_type).toBe('modal');
      modalId = m.body.id;
    }, 30000);

    it('placement=banner → 只返 banner，绝不含 modal', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/announcements?placement=banner&limit=50',
      );
      expect(res.status).toBe(200);
      const items = res.body as { id: string; display_type: string }[];
      expect(items.map((r) => r.id)).toContain(bannerId);
      expect(items.map((r) => r.id)).not.toContain(modalId);
      // 通道纯净:返回项全部 display_type=banner。
      for (const it of items) expect(it.display_type).toBe('banner');
    });

    it('placement=modal → 只返 modal，绝不含 banner', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/announcements?placement=modal&limit=50',
      );
      expect(res.status).toBe(200);
      const items = res.body as { id: string; display_type: string }[];
      expect(items.map((r) => r.id)).toContain(modalId);
      expect(items.map((r) => r.id)).not.toContain(bannerId);
      for (const it of items) expect(it.display_type).toBe('modal');
    });

    it('不传 placement → 两类都返(前端自行分流)', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=50');
      const ids = (res.body as { id: string }[]).map((r) => r.id);
      expect(ids).toContain(bannerId);
      expect(ids).toContain(modalId);
    });

    it('placement 非法值 → 400(DTO @IsIn 拦截)', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?placement=popup');
      expect(res.status).toBe(400);
    });
  });

  // ─── admin 发布带 display_type 正确落库 + 默认值 ──────────────────────────────
  describe('POST /api/admin/announcements display_type 落库', () => {
    it('显式 display_type=modal → 落库为 modal', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '落库modal', body: 'x', display_type: 'modal' });
      expect(res.status).toBe(201);
      expect(res.body.display_type).toBe('modal');
      const inDb = await annRepo.findOneBy({ id: res.body.id });
      expect(inDb!.display_type).toBe('modal');
    });

    it('不传 display_type → 默认 banner 落库', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '默认banner', body: 'x' });
      expect(res.status).toBe(201);
      expect(res.body.display_type).toBe('banner');
      const inDb = await annRepo.findOneBy({ id: res.body.id });
      expect(inDb!.display_type).toBe('banner');
    });

    it('display_type 非法值 → 400(DTO @IsIn 拦截)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '非法类型', body: 'x', display_type: 'toast' });
      expect(res.status).toBe(400);
    });

    it('PATCH 改 display_type banner→modal 正确落库', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: '待改类型', body: 'x', display_type: 'banner' });
      expect(created.body.display_type).toBe('banner');
      const patch = await request(app.getHttpServer())
        .patch(`/api/admin/announcements/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ display_type: 'modal' });
      expect(patch.status).toBe(200);
      expect(patch.body.display_type).toBe('modal');
      const inDb = await annRepo.findOneBy({ id: created.body.id });
      expect(inDb!.display_type).toBe('modal');
    });
  });

  // ─── 分页 clamp（service 兜底，公开端入参越界不报错）──────────────────────────
  describe('GET /api/announcements 分页', () => {
    it('limit=0 → 400（DTO @Min 拦截）', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=0');
      expect(res.status).toBe(400);
    });

    it('limit=100 → 400（DTO @Max 拦截）', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=100');
      expect(res.status).toBe(400);
    });

    it('limit=1 → 至多 1 条', async () => {
      const res = await request(app.getHttpServer()).get('/api/announcements?limit=1');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(1);
    });
  });
});
