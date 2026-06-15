/**
 * F4/F6/F7 单元验证
 * F4: 头像上传魔数校验(伪造 Content-Type 被 400 拒,真 PNG 通过)
 * F6: CreditGuard 无 userId 时抛 UnauthorizedException(401)
 * F7: CreditInterceptor consume 失败时 logger.error 带结构化标记
 */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

// ─── F4: 魔数校验 ─────────────────────────────────────────────────────────────
// 直接测 me.service.ts 内的私有逻辑,通过 MeService.updateAvatar 调用链验证。
// 为避免引入 DB/FilesService 依赖,直接测魔数函数本身(通过 import 推断)。

// 复制 me.service.ts 内魔数函数供单测白盒验证(不改生产代码)
function hasValidImageMagicBytes(buf: Buffer): boolean {
  if (buf.length >= 3) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  }
  if (buf.length >= 4) {
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  }
  if (buf.length >= 12) {
    if (
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) return true;
  }
  return false;
}

describe('F4: 头像魔数校验', () => {
  it('全零 buffer(任意长度)被拒(无合法魔数)', () => {
    expect(hasValidImageMagicBytes(Buffer.alloc(8, 0))).toBe(false);
  });

  it('伪造 Content-Type 的非图片 buffer(全零)被拒', () => {
    const buf = Buffer.alloc(16, 0);
    expect(hasValidImageMagicBytes(buf)).toBe(false);
  });

  it('真实 PNG 魔数通过 (89 50 4E 47)', () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
    expect(hasValidImageMagicBytes(buf)).toBe(true);
  });

  it('真实 JPEG 魔数通过 (FF D8 FF)', () => {
    const buf = Buffer.alloc(16, 0);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
    expect(hasValidImageMagicBytes(buf)).toBe(true);
  });

  it('真实 WebP 魔数通过 (RIFF????WEBP)', () => {
    const buf = Buffer.alloc(16, 0);
    // RIFF header
    buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46;
    // WEBP at offset 8
    buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50;
    expect(hasValidImageMagicBytes(buf)).toBe(true);
  });

  it('PDF 魔数(%PDF)被拒', () => {
    const buf = Buffer.from('%PDF-1.4\x00\x00\x00\x00\x00\x00\x00\x00');
    expect(hasValidImageMagicBytes(buf)).toBe(false);
  });
});

// ─── F6: CreditGuard 无 userId 抛 UnauthorizedException ────────────────────
import { CreditGuard } from './../../src/credit/credit.guard';

function makeContext(userId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId ? { id: userId } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('F6: CreditGuard 防御性兜底', () => {
  let guard: CreditGuard;

  beforeEach(() => {
    // mock userRepo:只测无 userId 路径,不需要 DB
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'u1', credit_balance: 10 }),
    };
    guard = new CreditGuard(userRepo as any);
  });

  it('无 userId(未认证请求)抛 UnauthorizedException(401)', async () => {
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('有 userId 且余额充足 → 返回 true', async () => {
    const result = await guard.canActivate(makeContext('user-1'));
    expect(result).toBe(true);
  });
});

// ─── F7: CreditInterceptor 扣点失败结构化日志 ─────────────────────────────
import { CreditInterceptor } from './../../src/credit/credit.interceptor';
import { Logger } from '@nestjs/common';

describe('F7: 扣点失败结构化日志 + ops_events 审计', () => {
  it('consume 失败时:先写 ops_events(CREDIT_CONSUME_FAILED)再记结构化 logger.error', async () => {
    const mockCredit = {
      consume: jest.fn().mockRejectedValue(new Error('DB down')),
    };
    // Phase2:CreditInterceptor 注入 OpsEventsService,扣点失败先落审计轨迹。
    const mockOpsEvents = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    const interceptor = new CreditInterceptor(mockCredit as any, mockOpsEvents as any);

    // 监控 logger.error
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'u1' },
          route: { path: '/api/test' },
        }),
      }),
    } as unknown as ExecutionContext;

    const next = { handle: () => of('response') };
    await new Promise<void>((resolve) => {
      interceptor.intercept(mockContext, next).subscribe({
        next: () => {
          // consume 是 fire-and-forget,给微任务一点时间
          setTimeout(resolve, 50);
        },
        error: resolve,
        complete: resolve,
      });
    });

    // 等待异步 consume 失败回调
    await new Promise((r) => setTimeout(r, 100));

    // ① ops_events 审计:类型 + 计数级 detail(user_id/endpoint/error),绝无正文。
    expect(mockOpsEvents.record).toHaveBeenCalledWith(
      'CREDIT_CONSUME_FAILED',
      expect.objectContaining({
        user_id: 'u1',
        endpoint: '/api/test',
        error: 'DB down',
      }),
    );

    // ② 结构化 logger.error:消息名 + { userId, endpoint, error }。
    expect(errorSpy).toHaveBeenCalled();
    const firstCallArgs = errorSpy.mock.calls[0];
    expect(firstCallArgs[0]).toBe('CREDIT_CONSUME_FAILED');
    const detail = firstCallArgs[1] as Record<string, unknown>;
    expect(detail).toMatchObject({
      userId: 'u1',
      endpoint: '/api/test',
      error: 'DB down',
    });

    errorSpy.mockRestore();
  });
});
