// 前置装载 .env:必须在任何其它 import 之前执行,确保实体装饰器求值期(模块加载时)
// 能读到 DB_TYPE 等环境变量。dotenv 默认不覆盖已有进程变量,生产 compose env_file 注入语义安全。
// data-source.ts 同理已前置装载;两者共用同一份 .env,不冲突。
import * as path from 'path';
loadDotenvIfPresent(path.resolve(__dirname, '..', '.env'));

function loadDotenvIfPresent(envPath: string): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require('dotenv') as { config: (opts: { path: string }) => unknown };
    dotenv.config({ path: envPath });
  } catch {
    // dotenv 未安装 → 依赖进程环境变量,正常跳过。
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'http';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  // production 启动硬校验:SMTP_HOST 缺失则验证码发不出去,登录链路直接瘫痪。
  // 宁可启动即失败(便于运维发现),也不要上线后用户收不到验证码。
  if (isProd && !process.env.SMTP_HOST) {
    throw new Error('production 环境必须配置 SMTP_HOST,否则登录验证码无法发送。');
  }

  // 进程级安全网:未捕获的 promise rejection / 异常会让 Node 直接退出,
  // 进而裸 reset 所有在连接(客户端连 503 都收不到)。这里捕获并记录,
  // 让单个失败的 AI 管线降级为该请求的错误,而不是拖垮整个进程。
  process.on('unhandledRejection', (reason) => {
    logger.error(`未处理的 Promise rejection: ${reason instanceof Error ? reason.stack : String(reason)}`);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`未捕获异常: ${err.stack ?? err.message}`);
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');

  // 安全响应头:CSP 等默认策略对纯 JSON API 友好,无需关闭。
  app.use(helmet());

  // body 上限:默认 100KB 会让完整 CV(粘贴长简历/新建版本)静默 413。
  // 提到 2mb 足以容纳纯文本简历正文,文件上传走 multipart 不受此限制。
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS 白名单:CORS_ORIGINS 逗号分隔。
  //   - 已配置 → 仅允许名单内来源。
  //   - 未配置 + 非 production → 回退 origin:true(放开,仅开发态)并 warn。
  //   - 未配置 + production → 显式抛错拒绝启动,防生产环境 CORS 裸奔。
  const corsRaw = process.env.CORS_ORIGINS?.trim();
  const corsOrigins = corsRaw
    ? corsRaw.split(',').map((o) => o.trim()).filter((o) => o.length > 0)
    : [];
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
  } else if (!isProd) {
    logger.warn('CORS_ORIGINS 未配置,开发态回退为允许所有来源(origin:true)。');
    app.enableCors({ origin: true, credentials: true });
  } else {
    throw new Error('production 环境必须配置 CORS_ORIGINS(逗号分隔的来源白名单)。');
  }

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3002);

  // HTTP 服务器超时:真实 AI 单请求可达 ~190s,requestTimeout 必须 > 正常耗时,
  // 别误杀慢但有效的请求;重点是别让 socket 永久挂着。可经 HTTP_REQUEST_TIMEOUT_MS 调整。
  const server = app.getHttpServer() as Server;
  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS ?? 300000);
  server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS ?? 65000);
  server.keepAliveTimeout = Number(process.env.HTTP_KEEPALIVE_TIMEOUT_MS ?? 61000);
}
bootstrap();
