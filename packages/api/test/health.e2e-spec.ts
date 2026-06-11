import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { request } from './test-utils';
import { HealthModule } from '../src/health/health.module';

// 自包含 e2e:HealthModule 尚未挂入 AppModule(由集成轨接线),故此处单独建一个最小测试模块,
// 仅挂内存 sqlite + HealthModule,验证 /api/health 的契约与真实 DB ping 行为,不拉起整个 AppModule。
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          autoLoadEntities: true,
          synchronize: true,
        }),
        HealthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // 与生产一致:全局前缀 api → 实际路径 /api/health。
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health 无鉴权可达,返回 200 + status:ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('ok');
  });

  it('响应含 version / uptime / timestamp 字段且类型正确', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(typeof res.body.version).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.timestamp).toBe('string');
    // ISO 时间戳可被 Date 解析。
    expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
  });

  it('APP_VERSION 注入后,version 字段透出该值', async () => {
    const prev = process.env.APP_VERSION;
    process.env.APP_VERSION = 'test-1.2.3';
    try {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.body.version).toBe('test-1.2.3');
    } finally {
      if (prev === undefined) delete process.env.APP_VERSION;
      else process.env.APP_VERSION = prev;
    }
  });

  it('DB 连接断开后,status/db 降级为 error 但仍回 200', async () => {
    const ds = app.get(DataSource);
    await ds.destroy();
    try {
      const res = await request(app.getHttpServer()).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('error');
      expect(res.body.db).toBe('error');
    } finally {
      // 重新初始化,避免影响 afterAll 的 app.close()。
      await ds.initialize();
    }
  });
});
