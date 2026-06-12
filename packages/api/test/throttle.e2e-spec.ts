import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validate } from '../src/config/env.validation';
import { AuthModule } from '../src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { request } from './test-utils';

// 限流(ThrottlerModule + @Throttle)的 e2e。
// 全局 jest-setup-env 默认 DISABLE_THROTTLE=1 跳过限流,故本套件自建一个强制开启限流的
// 测试根模块(只装 ConfigModule + 内存 sqlite + AuthModule + 与生产同配的 ThrottlerModule/Guard,
// 但不读 DISABLE_THROTTLE → 限流真实生效),验证 auth 端点的收紧档位能观察到 429。
//
// 收紧档位(与 auth.controller @Throttle 一致):
//   POST /api/auth/request-code → 3/min
//   POST /api/auth/login        → 10/min

describe('Throttle (限流) e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate, cache: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [join(__dirname, '..', 'src', '**', '*.entity.ts')],
          synchronize: true,
        }),
        // 与生产同档:60s 窗口 120 次;auth 端点 @Throttle 收紧。此处不挂 skipIf → 限流真实生效。
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
        AuthModule,
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/request-code:第 4 次(>3/min)→ 429', async () => {
    // 用不同邮箱避开同邮箱 60s 冷却(AuthService 的补充防线,按邮箱计);
    // 这里要验的是 throttler 按 IP 的 3/min 档位,不同邮箱仍累计同一 IP 计数。
    // 前 3 次应放行(201)。
    for (let i = 1; i <= 3; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/request-code')
        .send({ email: `throttle-rc-${i}@coach.dev`, terms_agreed: true });
      expect(res.status).toBe(201);
    }
    // 第 4 次触发限流。
    const fourth = await request(app.getHttpServer())
      .post('/api/auth/request-code')
      .send({ email: 'throttle-rc-4@coach.dev', terms_agreed: true });
    expect(fourth.status).toBe(429);
  });

  it('POST /api/auth/login:第 11 次(>10/min)→ 429', async () => {
    // 用不同邮箱避开 request-code 的 3/min 限制;登录端点单独计数 10/min。
    // 这些登录因无有效验证码会是 4xx(非 429),正好用来累计计数;第 11 次必 429。
    for (let i = 1; i <= 10; i++) {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: `throttle-login-${i}@coach.dev`, code: '000000' });
      // 非限流的业务错误(验证码无效 → 401),不应是 429。
      expect(res.status).not.toBe(429);
    }
    const eleventh = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'throttle-login-11@coach.dev', code: '000000' });
    expect(eleventh.status).toBe(429);
  });
});
