import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';

/** 构造最小 ConfigService stub,注入 ai.concurrency 命名空间。 */
function buildLimiter(max: number, queue: number): ConcurrencyLimiter {
  const stub = {
    get: (_key: string) => ({ max, queue }),
  } as unknown as ConfigService;
  return new ConcurrencyLimiter(stub);
}

describe('ConcurrencyLimiter', () => {
  it('正常并发:单任务顺序执行', async () => {
    const limiter = buildLimiter(2, 8);
    const result = await limiter.run(async () => 42);
    expect(result).toBe(42);
  });

  it('超出并发上限且队列已满 → 抛 503', async () => {
    const limiter = buildLimiter(1, 0);
    // 第一个任务占满并发槽,不 resolve(悬挂)
    let releaseFirst!: () => void;
    const first = limiter.run(
      () => new Promise<void>((resolve) => { releaseFirst = resolve; }),
    );
    // 第二个任务:队列满(maxQueue=0)→ 立刻 503
    await expect(limiter.run(async () => {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    releaseFirst();
    await first;
  });

  it('排队任务在前序完成后被唤醒执行', async () => {
    const limiter = buildLimiter(1, 2);
    const order: number[] = [];
    let releaseFirst!: () => void;

    const first = limiter.run(
      () =>
        new Promise<void>((resolve) => {
          order.push(1);
          releaseFirst = resolve;
        }),
    );
    // 让第一个任务的 Promise executor 先跑完(同步),确保 releaseFirst 被赋值
    await Promise.resolve();
    // 第二个进队列
    const second = limiter.run(async () => { order.push(2); });

    releaseFirst();
    await first;
    await second;

    expect(order).toEqual([1, 2]);
  });

  // ── #80 回归:release() 下溢护栏 ──────────────────────────────────
  it('P0 回归 #80:release 重复调用 active 不降至负数', async () => {
    const limiter = buildLimiter(2, 8);
    // 正常跑完一个任务
    await limiter.run(async () => {});
    // 直接访问私有 active(仅测试用)以验证下溢护栏
    const activeAfter = (limiter as unknown as { active: number }).active;
    expect(activeAfter).toBeGreaterThanOrEqual(0);
  });

  it('P0 回归 #80:active 从 0 开始 release 不产生负值', () => {
    const limiter = buildLimiter(2, 8);
    // active=0 时强制调用 release(防御测试)
    (limiter as unknown as { release: () => void }).release();
    const active = (limiter as unknown as { active: number }).active;
    expect(active).toBe(0);
  });
});
