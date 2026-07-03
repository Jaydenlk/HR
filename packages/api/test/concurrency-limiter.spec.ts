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

  // ── 队列可见化:status() + 排位回调(B2 SSE 推送用)──────────────────────
  describe('队列可见化', () => {
    it('并发压 3 个请求(max=1)→ status() 的 active/queued 数字正确', async () => {
      const limiter = buildLimiter(1, 8);
      const releases: Array<() => void> = [];
      const hang = () =>
        limiter.run(() => new Promise<void>((resolve) => releases.push(resolve)));

      // 起 3 个:第 1 个占满并发槽,第 2、3 个进队列
      const p1 = hang();
      const p2 = hang();
      const p3 = hang();
      // 让各 run 的 acquire 同步入队
      await Promise.resolve();
      await Promise.resolve();

      expect(limiter.status()).toEqual({ active: 1, queued: 2 });

      // 放行第 1 个 → 队首(第 2 个)被唤醒,active 仍 1,queued 降到 1
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
      expect(limiter.status()).toEqual({ active: 1, queued: 1 });

      // 依次放干净
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
      releases.shift()!();
      await Promise.all([p1, p2, p3]);
      expect(limiter.status()).toEqual({ active: 0, queued: 0 });
    });

    it('runObservable:排位回调按序触发(入队初始位 → 前移 → 0 开始执行)', async () => {
      const limiter = buildLimiter(1, 8);
      const releases: Array<() => void> = [];
      const hang = (onPos: (p: number) => void) =>
        limiter.runObservable(
          () => new Promise<void>((resolve) => releases.push(resolve)),
          onPos,
        );

      const posA: number[] = [];
      const posB: number[] = [];
      const posC: number[] = [];

      const pA = hang((p) => posA.push(p)); // 立即占槽 → 仅 0
      await Promise.resolve();
      const pB = hang((p) => posB.push(p)); // 入队:初始排位 1
      await Promise.resolve();
      const pC = hang((p) => posC.push(p)); // 入队:初始排位 2
      await Promise.resolve();

      // A 已执行(0);B 排第 1;C 排第 2
      expect(posA).toEqual([0]);
      expect(posB[0]).toBe(1);
      expect(posC[0]).toBe(2);

      // 放行 A → B 进入执行(收到 0),C 前移到第 1
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
      expect(posB).toContain(0); // B 开始执行
      expect(posC).toContain(1); // C 前移到队首

      // 放行 B → C 执行(收到 0)
      releases.shift()!();
      await Promise.resolve();
      await Promise.resolve();
      expect(posC).toContain(0);

      releases.shift()!();
      await Promise.all([pA, pB, pC]);
      // 每个请求的最后一个排位都应是 0(已开始执行)
      expect(posA[posA.length - 1]).toBe(0);
      expect(posB[posB.length - 1]).toBe(0);
      expect(posC[posC.length - 1]).toBe(0);
    });

    it('runStreaming:消费方 for-await break 提前退出 → 槽位必须被释放', async () => {
      const limiter = buildLimiter(1, 8);

      async function* infinite(): AsyncGenerator<number> {
        let i = 0;
        while (true) yield i++;
      }

      // 消费方中途 break,停在第一个 chunk
      for await (const n of limiter.runStreaming(() => infinite())) {
        expect(n).toBe(0);
        break; // 提前退出
      }

      // break 触发生成器 return() → finally 释放槽位
      expect(limiter.status()).toEqual({ active: 0, queued: 0 });

      // 后续请求能正常获得槽位(不阻塞)
      const result = await limiter.run(async () => 'ok');
      expect(result).toBe('ok');
    });

    it('runStreaming:直接调用迭代器 return() 放弃 → 槽位必须被释放', async () => {
      const limiter = buildLimiter(1, 8);

      async function* infinite(): AsyncGenerator<number> {
        let i = 0;
        while (true) yield i++;
      }

      const iter = limiter.runStreaming(() => infinite());
      // 取第一个 chunk
      const first = await iter.next();
      expect(first.value).toBe(0);
      expect(first.done).toBe(false);

      // 直接调用 return() 放弃迭代器
      await iter.return(undefined);

      // return() 触发 finally → 槽位归零
      expect(limiter.status()).toEqual({ active: 0, queued: 0 });

      // 后续请求能正常获得槽位
      const result = await limiter.run(async () => 'ok-after-return');
      expect(result).toBe('ok-after-return');
    });

    it('runStreaming:持槽至流耗尽才释放(后半段不脱离护栏)', async () => {
      const limiter = buildLimiter(1, 8);
      let resumeStream!: () => void;
      const gate = new Promise<void>((resolve) => {
        resumeStream = resolve;
      });
      async function* slow(): AsyncGenerator<number> {
        yield 1;
        await gate; // 卡在中途,模拟流未结束
        yield 2;
      }

      const collected: number[] = [];
      const consume = (async () => {
        for await (const n of limiter.runStreaming(() => slow())) collected.push(n);
      })();

      // 消费到第一个 chunk 后,流仍未结束 → 槽位仍被占用
      await Promise.resolve();
      await Promise.resolve();
      expect(limiter.status().active).toBe(1);

      // 放行流的后半段 → 耗尽后释放
      resumeStream();
      await consume;
      expect(collected).toEqual([1, 2]);
      expect(limiter.status()).toEqual({ active: 0, queued: 0 });
    });
  });

  // ── D1 嵌套自锁修复:skipLimiter ────────────────────────────────────────────
  // 诊断管线外层 runObservable 已持一个槽,内层 AI 调用(analyzer/rewriter/parser)对同一单例再 acquire
  // 会形成自锁。skipLimiter=true 令内层【整体跳过 acquire/release】,既不自锁也不占额外槽/不留僵尸 waiter。
  describe('D1 嵌套自锁:skipLimiter', () => {
    it('skipLimiter=true 的任务不 acquire(执行期间 active 不增),收尾队列干净', async () => {
      const limiter = buildLimiter(1, 8);
      let activeDuring = -1;
      const result = await limiter.run(
        async () => {
          activeDuring = (limiter as unknown as { active: number }).active;
          return 'ok';
        },
        { skipLimiter: true },
      );
      expect(result).toBe('ok');
      expect(activeDuring).toBe(0); // 未占槽
      expect(limiter.status()).toEqual({ active: 0, queued: 0 });
    });

    it('外层持满唯一槽时,内层 skipLimiter 调用不自锁(D1 核心场景)', async () => {
      const limiter = buildLimiter(1, 8); // 仅 1 槽:外层 runObservable 即占满
      // 外层持槽期间,内层再对同一 limiter 调用。skipLimiter 直接执行 → 不排队、不自锁。
      const result = await limiter.runObservable(async () => {
        const inner = await limiter.run(async () => 'inner-done', { skipLimiter: true });
        // 内层未占槽:此刻 active 仍是外层的 1(而非 2 或死锁)。
        expect((limiter as unknown as { active: number }).active).toBe(1);
        return inner;
      }, () => {});
      expect(result).toBe('inner-done');
      expect(limiter.status()).toEqual({ active: 0, queued: 0 }); // 收尾释放干净
    });

    it('反证:外层持满唯一槽 + 内层【不】skipLimiter → 自锁(内层 acquire 永不返回)', async () => {
      const limiter = buildLimiter(1, 8);
      let innerRan = false;
      const nested = limiter.runObservable(async () => {
        // 无 skipLimiter:内层 acquire 因唯一槽被外层占用而入队等待 → 外层永不释放 → 自锁。
        await limiter.run(async () => {
          innerRan = true;
        });
        return 'should-not-reach';
      }, () => {});

      // 自锁证明:nested 永不 settle。用超时竞速证其挂住(而非 resolve/reject)。
      const timeout = new Promise<string>((resolve) => setTimeout(() => resolve('TIMEOUT'), 150));
      const winner = await Promise.race([
        nested.then(() => 'RESOLVED').catch(() => 'REJECTED'),
        timeout,
      ]);
      expect(winner).toBe('TIMEOUT');
      expect(innerRan).toBe(false); // 内层任务从未执行(卡在 acquire)
      // 内层排队者已入队(1 个 waiter),外层占 1 槽——僵尸态。
      expect(limiter.status()).toEqual({ active: 1, queued: 1 });

      // 清理:reset 拒绝排队者,令 nested 最终 reject(吞掉),避免悬挂 promise 干扰后续用例。
      limiter.reset();
      await nested.catch(() => undefined);
    });
  });
});
