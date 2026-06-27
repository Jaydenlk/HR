/**
 * ConcurrencyLimiter.reset() 单元测试 —— 纯内存,不需 DB / ConfigService 真实加载。
 *
 * 验收点(对应 handoff Step 4):
 *  ① 占满 active + 灌满 queue 后 reset:返回 {clearedActive,clearedQueued},status 归零。
 *  ② 关键不变量:reset 拒绝所有排队等待者,其 acquire() 调用方【抛错】而非永久 hang
 *     —— 这是本特性唯一容易写错也最致命处(naive 地清空 waiters 而不 reject 会造新僵尸槽)。
 *  ③ reset 后可正常再次 acquire(新请求照常拿到槽并完成)。
 *  ④ 下溢护栏:reset 清零后,原在跑任务的 release() 不会把 active 压成负数。
 *
 * ConfigService 用最小假实现(仅 get('ai.concurrency') 返回 {max,queue}),与同目录
 * ai.service.test-connection.spec.ts 的假依赖手法一致;opsEvents 为可选,省略。
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConcurrencyLimiter } from './concurrency-limiter';

function makeLimiter(max: number, queue: number): ConcurrencyLimiter {
  const config = {
    get: () => ({ max, queue }),
  } as unknown as ConfigService;
  return new ConcurrencyLimiter(config);
}

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('ConcurrencyLimiter.reset', () => {
  it('占满 active + 灌满 queue 后 reset:返回清空计数,status 归零,排队请求全部 reject', async () => {
    const limiter = makeLimiter(2, 4);

    const gateA = deferred();
    const gateB = deferred();
    const activeA = limiter.run(() => gateA.promise);
    const activeB = limiter.run(() => gateB.promise);
    expect(limiter.status()).toEqual({ active: 2, queued: 0 });

    const queued = [0, 1, 2, 3].map(() => limiter.run(() => Promise.resolve('should-not-run')));
    expect(limiter.status()).toEqual({ active: 2, queued: 4 });

    const rejections = queued.map((p) => expect(p).rejects.toThrow(ServiceUnavailableException));

    const result = limiter.reset();
    expect(result).toEqual({ clearedActive: 2, clearedQueued: 4 });
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });

    await Promise.all(rejections);

    gateA.resolve();
    gateB.resolve();
    await Promise.all([activeA, activeB]);
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });
  });

  it(
    '关键不变量:reset 拒绝排队等待者 —— 其 acquire() 抛 ServiceUnavailableException,绝不永久 hang',
    async () => {
      const limiter = makeLimiter(1, 4);

      const gate = deferred();
      const active = limiter.run(() => gate.promise);
      const queuedPromise = limiter.run(() => Promise.resolve('never-runs'));
      expect(limiter.status()).toEqual({ active: 1, queued: 1 });

      const invariant = expect(queuedPromise).rejects.toThrow(ServiceUnavailableException);
      limiter.reset();

      // 若 reset 没 reject 而让排队请求 hang,本 await 会卡死 → 2s 后 jest 超时判 FAIL,
      // 即"reset 后排队请求必须抛错、不能 hang"的硬证明。
      await invariant;

      gate.resolve();
      await active;
    },
    2000,
  );

  it('reset 后可正常再次 acquire —— 新请求照常拿到槽并完成', async () => {
    const limiter = makeLimiter(2, 4);

    const gates = [deferred(), deferred()];
    const actives = gates.map((g) => limiter.run(() => g.promise));
    const queued = [0, 1].map(() => limiter.run(() => Promise.resolve('x')));
    const rejections = queued.map((p) => expect(p).rejects.toThrow(ServiceUnavailableException));

    limiter.reset();
    await Promise.all(rejections);
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });

    const fresh = await limiter.run(() => Promise.resolve('fresh-ok'));
    expect(fresh).toBe('fresh-ok');
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });

    gates.forEach((g) => g.resolve());
    await Promise.all(actives);
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });
  });

  it('下溢护栏:reset 清零后,原在跑任务的 release() 不会把 active 压成负数', async () => {
    const limiter = makeLimiter(2, 4);

    const gates = [deferred(), deferred()];
    const actives = gates.map((g) => limiter.run(() => g.promise));
    expect(limiter.status()).toEqual({ active: 2, queued: 0 });

    limiter.reset();
    expect(limiter.status()).toEqual({ active: 0, queued: 0 });

    gates[0].resolve();
    await actives[0];
    expect(limiter.status().active).toBe(0);

    gates[1].resolve();
    await actives[1];
    expect(limiter.status().active).toBe(0);
  });
});
