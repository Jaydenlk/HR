import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../config/ai.config';

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
  private readonly waiters: Array<() => void> = [];

  constructor(config: ConfigService) {
    const concurrency = config.get<AiConfig['concurrency']>('ai.concurrency')!;
    this.maxConcurrent = concurrency.max;
    this.maxQueue = concurrency.queue;
  }

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
