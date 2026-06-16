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
const DTO_FIELDS = [
  'id',
  'title',
  'body',
  'kind',
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
