import { Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../config/ai.config';
import { OpsEventsService } from '../ops/ops-events.service';

/** 队列可见化:当前进行中与排队中的请求数。供 GET /ai/queue-status 与排位推送使用。 */
export interface QueueStatus {
  active: number;
  queued: number;
}

/** 排位变化回调:pos=0 表示已开始执行,pos=N 表示在队列中前面还有 N 个请求。 */
export type PositionListener = (position: number) => void;

interface Waiter {
  acquire: () => void;
  reject?: (err: Error) => void;
  onPosition?: PositionListener;
}

/**
 * 并发护栏:限制同时进行的重 AI 调用数。超出上限的请求排队等待;队列也满时直接抛
 * 503,避免在 2C2G 单进程上无限堆积 in-flight 调用把事件循环拖垮(裸 TCP reset 根因)。
 *
 * 上限经 ConfigService 读取 ai.concurrency 命名空间:
 *   AI_MAX_CONCURRENCY  同时进行数,默认 2(2C2G 保守值)
 *   AI_MAX_QUEUE        等待队列长度,默认 8
 */
@Injectable()
export class ConcurrencyLimiter {
  private readonly logger = new Logger(ConcurrencyLimiter.name);
  private readonly maxConcurrent: number;
  private readonly maxQueue: number;

  private active = 0;
  private readonly waiters: Waiter[] = [];

  constructor(
    config: ConfigService,
    @Optional() private readonly opsEvents?: OpsEventsService,
  ) {
    const concurrency = config.get<AiConfig['concurrency']>('ai.concurrency')!;
    this.maxConcurrent = concurrency.max;
    this.maxQueue = concurrency.queue;
  }

  /** 当前队列快照:进行中 / 排队中。 */
  status(): QueueStatus {
    return { active: this.active, queued: this.waiters.length };
  }

  /**
   * 管理员手动重置护栏:把 active 计数清零,并拒绝所有排队中的等待者(令其调用方收到
   * 503 报错、可立即重试),用于流式僵尸槽卡死时不重启容器即可恢复服务。
   * 仅操作内存状态(active / waiters),不碰任何持久化数据;正在运行的真实任务不受影响、
   * 其结果照常落库,它们日后 release() 时 active 已被下溢护栏 floor 在 0、不会损坏计数。
   * 代价:若清零时仍有真实在跑的任务,会短暂突破并发上限(用户已知并接受,"有问题手动处理")。
   */
  reset(): { clearedActive: number; clearedQueued: number } {
    const clearedActive = this.active;
    const clearedQueued = this.waiters.length;
    this.active = 0;
    const drained = this.waiters.splice(0, this.waiters.length);
    for (const w of drained) {
      w.reject?.(new ServiceUnavailableException('AI 服务已被管理员重置,请重新发起请求。'));
    }
    this.logger.warn(`ConcurrencyLimiter.reset: cleared active=${clearedActive} queued=${clearedQueued}`);
    return { clearedActive, clearedQueued };
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  /**
   * 与 run 相同,但额外向 onPosition 推送本请求的排位变化(供 B2 的 SSE 推送):
   * 入队即回调一次初始排位;前序释放使排位前移时再次回调;开始执行时回调 0。
   */
  async runObservable<T>(task: () => Promise<T>, onPosition: PositionListener): Promise<T> {
    await this.acquire(onPosition);
    onPosition(0);
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  /**
   * 流式专用:为整段流消费持槽,直到生成器耗尽 / 抛错 / 被提前关闭(return)才释放。
   * 区别于 run(任务 Promise settle 即释放):流式必须在所有 chunk 产出完毕后才释放槽位,
   * 否则后半段流会脱离并发护栏。factory 在拿到槽位后才调用(产生底层 SDK 流)。
   */
  async *runStreaming<T>(factory: () => AsyncGenerator<T>): AsyncGenerator<T> {
    await this.acquire();
    try {
      yield* factory();
    } finally {
      this.release();
    }
  }

  private acquire(onPosition?: PositionListener): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    if (this.waiters.length >= this.maxQueue) {
      // 记录队列满事件;catch 吞掉写入失败,不阻断主流程;opsEvents 不存在(单元测试无 DB)则跳过
      void this.opsEvents
        ?.record('QUEUE_FULL', { active: this.active, maxConcurrent: this.maxConcurrent, maxQueue: this.maxQueue })
        .catch((e: unknown) =>
          this.logger.warn(
            `OpsEvents QUEUE_FULL 写入失败:${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      throw new ServiceUnavailableException(
        `AI 服务繁忙(并发 ${this.maxConcurrent} + 队列 ${this.maxQueue} 已满),请稍后重试。`,
      );
    }
    this.logger.warn(`AI 调用排队:active=${this.active} queued=${this.waiters.length + 1}`);
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        acquire: () => {
          this.active++;
          resolve();
        },
        reject,
        onPosition,
      };
      this.waiters.push(waiter);
      // 入队即推送初始排位(队列中前面还有几个);开始执行的 0 由 runObservable 在 acquire 返回后推送。
      onPosition?.(this.waiters.length);
    });
  }

  private release(): void {
    // 下溢护栏:防御性保证 active 不降至负数(重复调用/异常场景)
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) next.acquire();
    // 一个队首被放行后,其余等待者整体前移一位:广播新排位(从 1 起,队首已在执行交由 runObservable 推 0)。
    this.notifyPositions();
  }

  /** 广播队列中每个等待者的当前排位(1 = 队首,下一个被放行)。 */
  private notifyPositions(): void {
    this.waiters.forEach((w, idx) => w.onPosition?.(idx + 1));
  }
}
