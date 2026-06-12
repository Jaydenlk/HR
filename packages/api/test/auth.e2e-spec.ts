import { join } from 'path';
import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as supertest from 'supertest';
import { validate } from '../src/config/env.validation';
import { AuthModule } from '../src/auth/auth.module';
import { MailService } from '../src/mail/mail.service';
import { InviteCode } from '../src/invites/entities/invite-code.entity';
import { LoginCode } from '../src/auth/entities/login-code.entity';
import { User } from '../src/users/entities/user.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const request: typeof supertest = (supertest as any).default ?? supertest;

// 自建聚焦测试根模块:只装 auth 轨依赖(ConfigModule + 内存 sqlite + AuthModule)。
// 刻意不挂 AppModule —— 全量 AppModule 当前依赖协调者/集成轨尚未接线的 QuotaModule
// (@Global,须在 app.module 挂载,各 AI 控制器才能解析 @UseGuards(QuotaGuard)),与 auth 轨无关。
// 实体用 glob 注册全集:User 与 Resume 等存在 OneToMany 关系,缺一即报 metadata not found,
// 故注册 src 下全部 *.entity.ts(ts-jest 直接读源码 .ts)。
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate, cache: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
      synchronize: true,
    }),
    AuthModule,
  ],
})
class AuthTestModule {}

// 邮箱验证码 + 邀请码登录契约的 e2e。
// 不依赖 test-utils(由协调者统一改),测试内直接用 TypeORM repo 备数据。
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let invites: Repository<InviteCode>;
  let codes: Repository<LoginCode>;
  let users: Repository<User>;
  let mail: MailService;

  beforeAll(async () => {
    // ADMIN_EMAILS 须在 ConfigModule 初始化前设好(在模块编译前)。
    process.env.ADMIN_EMAILS = 'boss@coach.dev';

    const moduleRef = await Test.createTestingModule({
      imports: [AuthTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    invites = app.get<Repository<InviteCode>>(getRepositoryToken(InviteCode));
    codes = app.get<Repository<LoginCode>>(getRepositoryToken(LoginCode));
    users = app.get<Repository<User>>(getRepositoryToken(User));
    mail = app.get(MailService);
  });

  afterAll(async () => {
    await app.close();
    delete process.env.ADMIN_EMAILS;
  });

  // 申请验证码(已同意条款),返回 {registered, dev_code}。
  async function requestCode(email: string): Promise<{ registered: boolean; dev_code?: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/request-code')
      .send({ email, terms_agreed: true });
    expect(res.status).toBe(201);
    return res.body as { registered: boolean; dev_code?: string };
  }

  // 把该邮箱最近一条未消费码的 created_at 推到 61s 前,绕过同邮箱 60s 重发冷却,
  // 以便测试紧接着的再次申码流程(冷却本身另有专门用例覆盖)。
  async function agePreviousCode(email: string): Promise<void> {
    await codes.update(
      { email, consumed: false },
      { created_at: new Date(Date.now() - 61 * 1000) },
    );
  }

  // 完整注册流程:申码 → 取 dev_code → 带邀请码+姓名登录。返回登录响应。
  async function register(email: string, name: string, inviteCode: string) {
    const { dev_code } = await requestCode(email);
    expect(typeof dev_code).toBe('string');
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, code: dev_code, invite_code: inviteCode, name });
  }

  describe('POST /api/auth/request-code', () => {
    it('无效邮箱 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email: 'not-an-email', terms_agreed: true });
      expect(res.status).toBe(400);
    });

    it('条款门:terms_agreed!==true → 400 且绝不生成验证码、绝不调用发邮件', async () => {
      const email = 'no-terms@coach.dev';
      // spy 不替换实现(开发态 sendLoginCode 只打日志),只记调用次数。
      const sendSpy = jest.spyOn(mail, 'sendLoginCode');
      const callsBefore = sendSpy.mock.calls.length;

      // false → 服务层拦截,定语文案精确匹配。
      const refused = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email, terms_agreed: false });
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe('请先阅读并同意用户条款');

      // 缺失 → DTO 层 400,文案同样指向用户条款(ValidationPipe message 为数组)。
      const missing = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email });
      expect(missing.status).toBe(400);
      expect(JSON.stringify(missing.body.message)).toContain('用户条款');

      // 两次被拒后:发邮件分支零调用,且该邮箱不存在任何验证码记录(发码分支根本没执行)。
      expect(sendSpy.mock.calls.length).toBe(callsBefore);
      expect(await codes.count({ where: { email } })).toBe(0);

      // 对照:terms_agreed:true → 201 正常发码,sendLoginCode 恰好被调用一次(6 位码)。
      const ok = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email, terms_agreed: true });
      expect(ok.status).toBe(201);
      expect(sendSpy.mock.calls.length).toBe(callsBefore + 1);
      expect(sendSpy).toHaveBeenLastCalledWith(email, expect.stringMatching(/^\d{6}$/));
      sendSpy.mockRestore();
    });

    it('未注册邮箱 → registered:false + dev_code(无 SMTP 开发态)', async () => {
      const body = await requestCode('fresh@coach.dev');
      expect(body.registered).toBe(false);
      expect(typeof body.dev_code).toBe('string');
      expect((body.dev_code ?? '').length).toBe(6);
    });

    it('已注册邮箱 → registered:true', async () => {
      // 先用引导邀请码注册一个用户。
      const reg = await register('known@coach.dev', '已注册用户', 'COACH2026');
      expect(reg.status).toBe(201);
      const body = await requestCode('known@coach.dev');
      expect(body.registered).toBe(true);
    });

    it('重新申请使旧码作废:旧 dev_code 登录被拒,新码可用', async () => {
      const email = 'reissue@coach.dev';
      const first = await requestCode(email);
      // 越过同邮箱 60s 冷却:把上一条码的生成时间推到 61s 前。
      await agePreviousCode(email);
      const second = await requestCode(email);
      expect(first.dev_code).not.toBe(second.dev_code);

      // 旧码已被作废(consumed)→ 登录视为无效验证码。
      const oldTry = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: first.dev_code, invite_code: 'COACH2026', name: '重发用户' });
      expect(oldTry.status).toBe(401);

      // 新码可用。
      const newTry = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: second.dev_code, invite_code: 'COACH2026', name: '重发用户' });
      expect(newTry.status).toBe(201);
    });

    it('同邮箱 60s 内重复申码 → 429「请求过于频繁」', async () => {
      const email = 'cooldown@coach.dev';
      const first = await requestCode(email);
      expect(typeof first.dev_code).toBe('string');

      // 紧接着第二次申码:同邮箱 60s 冷却应拒绝。
      const second = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email, terms_agreed: true });
      expect(second.status).toBe(429);
      expect(second.body.message).toBe('请求过于频繁,请稍后再试');
    });
  });

  describe('POST /api/auth/login — 验证码校验', () => {
    it('申码 → dev_code → 登录成功 201 + JWT + user', async () => {
      const res = await register('login1@coach.dev', '登录用户一', 'COACH2026');
      expect(res.status).toBe(201);
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);
      expect(res.body.user).toMatchObject({ email: 'login1@coach.dev', name: '登录用户一' });
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.status).toBe('active');
    });

    it('缺验证码 → 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nocode@coach.dev', invite_code: 'COACH2026', name: '无码' });
      expect(res.status).toBe(400);
    });

    it('错误验证码 → 401', async () => {
      const email = 'wrongcode@coach.dev';
      await requestCode(email);
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: '000000', invite_code: 'COACH2026', name: '错码' });
      expect(res.status).toBe(401);
    });

    it('错码 5 次后即使正确码也被锁(401)', async () => {
      const email = 'locked@coach.dev';
      const { dev_code } = await requestCode(email);

      for (let i = 0; i < 5; i++) {
        const wrong = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, code: '111111', invite_code: 'COACH2026', name: '锁定用户' });
        expect(wrong.status).toBe(401);
      }

      // 第 6 次用正确码也应被锁。
      const correct = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'COACH2026', name: '锁定用户' });
      expect(correct.status).toBe(401);
      expect(correct.body.message).toContain('次数过多');
    });

    it('过期验证码 → 401', async () => {
      const email = 'expired@coach.dev';
      const { dev_code } = await requestCode(email);
      // 直接把该码的过期时间改到过去。
      await codes.update({ email, consumed: false }, { expires_at: new Date(Date.now() - 1000) });

      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'COACH2026', name: '过期用户' });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('过期');
    });

    it('未申码直接登录 → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'neverrequested@coach.dev', code: '123456', invite_code: 'COACH2026', name: '从未申码' });
      expect(res.status).toBe(401);
    });

    it('已消费验证码重放 → 401(同码不能二次登录)', async () => {
      const email = 'replay@coach.dev';
      const { dev_code } = await requestCode(email);
      expect(typeof dev_code).toBe('string');

      // 首次登录成功并消费该码。
      const first = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'COACH2026', name: '重放用户' });
      expect(first.status).toBe(201);

      // 重放同一已消费码:应被拒(无未消费码 → 视为无效验证码)。
      const replay = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code });
      expect(replay.status).toBe(401);
    });
  });

  describe('POST /api/auth/login — 新用户邀请码规则', () => {
    it('新用户无邀请码 → 403', async () => {
      const email = 'noinvite@coach.dev';
      const { dev_code } = await requestCode(email);
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, name: '无邀请码' });
      expect(res.status).toBe(403);
    });

    it('新用户有码但无姓名 → 403', async () => {
      const email = 'noname@coach.dev';
      const { dev_code } = await requestCode(email);
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'COACH2026' });
      expect(res.status).toBe(403);
    });

    it('邀请码超额 → 403', async () => {
      await invites.save(invites.create({ code: 'ONCE1', max_uses: 1, used_count: 0 }));

      const first = await register('once-a@coach.dev', '首用', 'ONCE1');
      expect(first.status).toBe(201);

      const second = await register('once-b@coach.dev', '次用', 'ONCE1');
      expect(second.status).toBe(403);

      // 校验 used_count 只 +1。
      const used = await invites.findOneBy({ code: 'ONCE1' });
      expect(used?.used_count).toBe(1);
    });

    it('停用的邀请码 → 403', async () => {
      await invites.save(invites.create({ code: 'DISABLED1', max_uses: 10, disabled: true }));
      const res = await register('disabled-user@coach.dev', '停用码用户', 'DISABLED1');
      expect(res.status).toBe(403);
    });

    // 消费顺序保证:邀请码错误时不应烧掉验证码——用户用同一验证码改对邀请码可立即成功,
    // 无需重新申码。(auth.service.ts checkCode 不烧码 + 邀请码成功后才 consumeCode)
    it('邀请码无效不消费验证码 → 同码改对邀请码可重试成功', async () => {
      const email = 'retry-invite@coach.dev';
      const { dev_code } = await requestCode(email);

      // 第一次:正确验证码 + 错误邀请码 → 403。
      const bad = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'WRONGCODE', name: '改码重试用户' });
      expect(bad.status).toBe(403);

      // 第二次:同一验证码 + 正确邀请码 → 201(验证码未被前次烧掉)。
      const ok = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code, invite_code: 'COACH2026', name: '改码重试用户' });
      expect(ok.status).toBe(201);
      expect(ok.body.user.email).toBe(email);
    });
  });

  describe('POST /api/auth/login — 老用户与封禁', () => {
    it('老用户仅需 email+code(无需邀请码/姓名)', async () => {
      // 先注册。
      const reg = await register('returning@coach.dev', '回访用户', 'COACH2026');
      expect(reg.status).toBe(201);
      const userId = reg.body.user.id;

      // 再次登录仅带 email+code。
      const { dev_code } = await requestCode('returning@coach.dev');
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'returning@coach.dev', code: dev_code });
      expect(res.status).toBe(201);
      expect(res.body.user.id).toBe(userId);
      expect(res.body.user.name).toBe('回访用户');
    });

    it('被封禁用户登录 → 401「账号已被停用」', async () => {
      const reg = await register('banned@coach.dev', '待封禁', 'COACH2026');
      expect(reg.status).toBe(201);
      await users.update({ email: 'banned@coach.dev' }, { status: 'banned' });

      const { dev_code } = await requestCode('banned@coach.dev');
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'banned@coach.dev', code: dev_code });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('账号已被停用');
    });

    // 封禁即时生效:已签发的 token 在用户被封后,下一次请求即被 jwt.strategy.validate 拦截。
    // 区别于上一个用例(测登录路径,不经 validate)——这里走「持已有 token 调受保护端点」路径。
    it('已签发 token → 封禁 → 携该 token 调受保护端点 → 401「账号已被停用」', async () => {
      // 登录拿 token(此时账号正常)。
      const reg = await register('ban-live@coach.dev', '在线封禁', 'COACH2026');
      expect(reg.status).toBe(201);
      const token = reg.body.access_token as string;
      expect(typeof token).toBe('string');

      // 封禁前 token 可用:GET /me 返回 200。
      const before = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(before.status).toBe(200);

      // 直接改库封禁该用户。
      await users.update({ email: 'ban-live@coach.dev' }, { status: 'banned' });

      // 同一 token 再次请求受保护端点:jwt.strategy.validate 查到 banned → 401。
      const after = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(after.status).toBe(401);
      expect(after.body.message).toBe('账号已被停用');
    });
  });

  describe('POST /api/auth/login — ADMIN_EMAILS 提升', () => {
    it('命中 ADMIN_EMAILS 的新用户注册即为 admin', async () => {
      const res = await register('boss@coach.dev', '管理员', 'COACH2026');
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('admin');
    });
  });

  describe('登录落盘 — last_login_* 与 terms_agreed_at(契约 2)', () => {
    it('完整登录后:last_login_ip/last_login_at/terms_agreed_at 非空,本机回环 IP 归属「内网」', async () => {
      const email = 'record-login@coach.dev';
      const res = await register(email, '落盘用户', 'COACH2026');
      expect(res.status).toBe(201);

      const row = await users.findOneBy({ email });
      expect(row).not.toBeNull();
      // supertest 走本机回环(::1 / ::ffff:127.0.0.1)→ IP 必非空。
      expect(typeof row!.last_login_ip).toBe('string');
      expect(row!.last_login_ip!.length).toBeGreaterThan(0);
      expect(row!.last_login_at).toBeInstanceOf(Date);
      expect(row!.terms_agreed_at).toBeInstanceOf(Date);
      // 内网判定契约:127.x/::1/10.x/172.16-31/192.168.x → province「内网」,city null。
      expect(row!.last_login_province).toBe('内网');
      expect(row!.last_login_city).toBeNull();
    });

    it('terms_agreed_at 仅首写不覆盖;last_login_at 随每次登录刷新', async () => {
      const email = 'record-twice@coach.dev';
      const first = await register(email, '复登用户', 'COACH2026');
      expect(first.status).toBe(201);
      const afterFirst = await users.findOneBy({ email });
      expect(afterFirst!.terms_agreed_at).toBeInstanceOf(Date);

      // 把首次同意时间锚定为固定旧值:二次登录若覆盖,该值会变回「现在」。
      // 锚定后读回一次,以同一条 ORM 水合路径取期望值,规避 sqlite datetime 精度/时区差异。
      const anchor = new Date('2026-01-02T03:04:05');
      await users.update({ email }, { terms_agreed_at: anchor });
      const anchored = await users.findOneBy({ email });
      expect(anchored!.terms_agreed_at!.getTime()).not.toBe(afterFirst!.terms_agreed_at!.getTime());

      // 老用户二次登录(首码已 consumed,无冷却障碍;只需 email+code)。
      const { dev_code } = await requestCode(email);
      const second = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, code: dev_code });
      expect(second.status).toBe(201);

      const afterSecond = await users.findOneBy({ email });
      // 不覆盖:仍是锚定旧值,而非二次登录时间。
      expect(afterSecond!.terms_agreed_at!.getTime()).toBe(anchored!.terms_agreed_at!.getTime());
      // last_login_at 刷新(同秒内允许相等)。
      expect(afterSecond!.last_login_at!.getTime()).toBeGreaterThanOrEqual(
        afterFirst!.last_login_at!.getTime(),
      );
      expect(typeof afterSecond!.last_login_ip).toBe('string');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeAll(async () => {
      const res = await register('me@coach.dev', 'Me 用户', 'COACH2026');
      token = res.body.access_token;
    });

    it('有效 JWT → 200 + user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: 'me@coach.dev', name: 'Me 用户' });
      expect(res.body).toHaveProperty('id');
    });

    it('无 JWT → 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('非法 JWT → 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer this.is.not.valid');
      expect(res.status).toBe(401);
    });
  });
});
