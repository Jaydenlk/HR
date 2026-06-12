import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlinkSync } from 'fs';
import * as supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { User } from '../src/users/entities/user.entity';

// 功能型 AI e2e(interview-prep/follow-up 等)单用户在一个套件内会连发数十次 AI 调用,
// credit 完全替代制下每次扣 1,注册仅送 50,会在套件后段被 CreditGuard 402 误伤。
// 与 quota 时代 jest-setup-env 设 DAILY_AI_QUOTA=100000 同理:测试用户统一充足额度。
// 这是测试夹具配置,不改变产品行为(signup_grant 仍为 50,见 credit.e2e-spec 断言)。
const TEST_CREDIT_TOPUP = 1_000_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const request: typeof supertest = (supertest as any).default ?? supertest;

// 为每个 Nest 测试 app 生成一个「真正独立」的 sqlite 数据库路径(独立临时文件)。
// 背景:better-sqlite3 驱动按 database 路径字符串复用底层连接,裸 ':memory:' 会让同一进程内
// 多个 app(各自 createTestingModule)共享同一条连接;任一 sub-app 的 app.close() 会把这条连接
// 关掉,后续主 app 的查询即报「database connection is not open」(在 JwtStrategy 每请求查库后暴露)。
// 曾尝试 file:<name>?mode=memory&cache=shared,但 shared-cache 内存库仍按名共享连接生命周期,
// close 一个会波及同名/同进程的其它连接,未能真正隔离。
// 改用唯一临时文件:不同文件 = 不同连接,close 一个绝不影响另一个。
// Windows 不会自动清理 %TEMP%,临时 db 文件会留存;故进程退出时主动删除本进程创建的临时 db。
const tempDbFiles: string[] = [];
process.on('exit', () => {
  for (const file of tempDbFiles) {
    try {
      unlinkSync(file);
    } catch {
      // 文件可能已被删除或仍被占用,忽略——尽力清理,不阻断退出。
    }
  }
});

let dbSeq = 0;
export function uniqueMemoryDb(): string {
  dbSeq += 1;
  const file = join(tmpdir(), `coach-e2e-${process.pid}-${dbSeq}.sqlite`);
  tempDbFiles.push(file);
  return file;
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

// 新认证契约:request-code → 取 dev_code → login。
// 测试里每个 email 视为新用户,带 dev bootstrap seed 的 COACH2026 邀请码 + name 完成注册。
// 依赖:无 SMTP 配置(e2e 默认)时 request-code 回吐 dev_code;邀请码表为空时 InvitesService
// 自动 seed COACH2026(max_uses=100000)。
export async function loginUser(app: INestApplication, email = 'test@coach.dev', name = 'Test'): Promise<string> {
  const codeRes = await request(app.getHttpServer())
    .post('/api/auth/request-code')
    .send({ email, terms_agreed: true });
  const devCode: string | undefined = codeRes.body.dev_code;
  if (!devCode) {
    throw new Error(
      `request-code 未返回 dev_code(SMTP 应未配置):${JSON.stringify(codeRes.body)}`,
    );
  }
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, code: devCode, name, invite_code: 'COACH2026' });
  // 充足额度,避免功能型 AI 套件后段被 402 误伤(夹具配置,不改产品行为)。
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  await userRepo.update({ email: email.trim().toLowerCase() }, { credit_balance: TEST_CREDIT_TOPUP });
  return res.body.access_token;
}
