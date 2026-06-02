import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * 并发护栏:限制同时进行的重 AI 调用数。超出上限的请求排队等待;队列也满时直接抛
 * 503,避免在 2C2G 单进程上无限堆积 in-flight 调用把事件循环拖垮(裸 TCP reset 根因)。
 *
 * 上限可经环境变量配置:
 *   AI_MAX_CONCURRENCY  同时进行数,默认 2(2C2G 保守值)
 *   AI_MAX_QUEUE        等待队列长度,默认 8
 */
@Injectable()
export class ConcurrencyLimiter {
  private readonly logger = new Logger(ConcurrencyLimiter.name);
  private readonly maxConcurrent = Math.max(1, Number(process.env.AI_MAX_CONCURRENCY ?? 2));
  private readonly maxQueue = Math.max(0, Number(process.env.AI_MAX_QUEUE ?? 8));

  private active = 0;
  private readonly waiters: Array<() => void> = [];

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    if (this.waiters.length >= this.maxQueue) {
      throw new ServiceUnavailableException(
        `AI 服务繁忙(并发 ${this.maxConcurrent} + 队列 ${this.maxQueue} 已满),请稍后重试。`,
      );
    }
    this.logger.warn(`AI 调用排队:active=${this.active} queued=${this.waiters.length + 1}`);
    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) next();
  }
}
