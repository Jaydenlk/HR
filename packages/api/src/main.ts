import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Server } from 'http';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

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

  // body 上限:默认 100KB 会让完整 CV(粘贴长简历/新建版本)静默 413。
  // 提到 2mb 足以容纳纯文本简历正文,文件上传走 multipart 不受此限制。
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { limit: '2mb', extended: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: true });
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
