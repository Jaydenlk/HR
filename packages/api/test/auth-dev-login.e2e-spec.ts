import { join } from 'path';
import { tmpdir } from 'os';
import { unlinkSync } from 'fs';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as supertest from 'supertest';
import { validate } from '../src/config/env.validation';
import { AuthModule } from '../src/auth/auth.module';
import { User } from '../src/users/entities/user.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const request: typeof supertest = (supertest as any).default ?? supertest;

// 不复用 test-utils(其顶层 import AppModule 会在本 env 设好前触发 ConfigModule 校验)。
// 这里自带「唯一临时文件」内存库:不同文件=不同连接,close 一个不影响其它 app。
const tempDbFiles: string[] = [];
let dbSeq = 0;
function localUniqueDb(): string {
  dbSeq += 1;
  const file = join(tmpdir(), `coach-devlogin-${process.pid}-${dbSeq}.sqlite`);
  tempDbFiles.push(file);
  return file;
}
afterAll(() => {
  for (const f of tempDbFiles) {
    try {
      unlinkSync(f);
    } catch {
      // 忽略清理失败。
    }
  }
});

// 每个 env 组合用独立 app(ConfigModule cache:false,运行时读 DEV_LOGIN);
// uniqueMemoryDb 给每个 app 一个独立临时 sqlite 文件 → 不同连接,close 一个不影响其它。
async function buildApp(env: Record<string, string | undefined>): Promise<INestApplication> {
  // 设置/清理 env:在 ConfigModule 编译前生效。
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  @Module({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, validate, cache: false }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: localUniqueDb(),
        entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
        synchronize: true,
      }),
      AuthModule,
    ],
  })
  class TestModule {}

  const moduleRef = await Test.createTestingModule({ imports: [TestModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

describe('Auth dev-login (e2e)', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.CLOUDDREAM_API_KEY = 'test-key';
    delete process.env.SMTP_HOST;
  });

  // ─── DEV_LOGIN 未设 → 404 ──────────────────────────────────────────────────
  describe('DEV_LOGIN 未设', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await buildApp({ DEV_LOGIN: undefined, NODE_ENV: 'development' });
    });
    afterAll(async () => {
      await app.close();
    });

    it('POST /api/auth/dev-login → 404(不暴露存在性)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'someone@coach.dev' });
      expect(res.status).toBe(404);
    });
  });

  // ─── DEV_LOGIN=1 + production → 仍 404 ─────────────────────────────────────
  describe('DEV_LOGIN=1 但 NODE_ENV=production', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await buildApp({ DEV_LOGIN: '1', NODE_ENV: 'production' });
    });
    afterAll(async () => {
      await app.close();
      delete process.env.NODE_ENV;
    });

    it('POST /api/auth/dev-login → 404(production 二重保护)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'someone@coach.dev' });
      expect(res.status).toBe(404);
    });
  });

  // ─── DEV_LOGIN=1 + 非 production → 可用 ────────────────────────────────────
  describe('DEV_LOGIN=1 非 production', () => {
    let app: INestApplication;
    let users: Repository<User>;

    beforeAll(async () => {
      app = await buildApp({
        DEV_LOGIN: '1',
        NODE_ENV: 'development',
        ADMIN_EMAILS: 'admin@coach.dev',
      });
      users = app.get<Repository<User>>(getRepositoryToken(User));
    });
    afterAll(async () => {
      await app.close();
      delete process.env.ADMIN_EMAILS;
      delete process.env.DEV_LOGIN;
    });

    it('新邮箱 dev-login → 201 拿 token + user(免验证码免邀请码)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'devuser@coach.dev' });
      expect(res.status).toBe(201);
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.user).toMatchObject({ email: 'devuser@coach.dev', role: 'user', status: 'active' });
    });

    it('拿到的 token 能调受保护端点 /api/auth/me → 200', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'devuser2@coach.dev' });
      const token = login.body.access_token as string;
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(me.status).toBe(200);
      expect(me.body.email).toBe('devuser2@coach.dev');
    });

    it('命中 ADMIN_EMAILS 的邮箱 dev-login → role=admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'admin@coach.dev' });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('admin');
    });

    it('banned 用户 dev-login → 401「账号已被停用」', async () => {
      // 先建一个用户,改库封禁,再 dev-login。
      const first = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'banned-dev@coach.dev' });
      expect(first.status).toBe(201);
      await users.update({ email: 'banned-dev@coach.dev' }, { status: 'banned' });

      const second = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'banned-dev@coach.dev' });
      expect(second.status).toBe(401);
      expect(second.body.message).toBe('账号已被停用');
    });

    it('无效邮箱 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('dev-login 同样落盘登录记录:IP 非空、归属「内网」、last_login_at/terms_agreed_at 非空', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/dev-login')
        .send({ email: 'devrecord@coach.dev' });
      expect(res.status).toBe(201);

      const row = await users.findOneBy({ email: 'devrecord@coach.dev' });
      expect(row).not.toBeNull();
      // supertest 本机回环(::1 / ::ffff:127.0.0.1)→ 内网归属契约。
      expect(typeof row!.last_login_ip).toBe('string');
      expect(row!.last_login_ip!.length).toBeGreaterThan(0);
      expect(row!.last_login_province).toBe('内网');
      expect(row!.last_login_city).toBeNull();
      expect(row!.last_login_at).toBeInstanceOf(Date);
      expect(row!.terms_agreed_at).toBeInstanceOf(Date);
    });
  });
});
