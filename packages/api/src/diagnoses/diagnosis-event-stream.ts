/**
 * 生产者/消费者解耦的事件流。
 *
 * 诊断流水线的铁律:**DB 落库不得绑定 SSE 订阅生命周期**——客户端断开也要把分析/改写跑完并落库,
 * 结果永不丢。若像聊天那样让控制器 `for await` 直接驱动生成器,客户端一断开、控制器停止拉取,
 * 生成器就会在 `yield` 处永久挂起,流水线随之卡死(分析虽已落库,但改写永远跑不完)。
 *
 * 故此处把"流水线推进"与"客户端消费"彻底解耦:
 *   - 流水线作为独立后台任务运行,通过 {@link push} 投递事件、{@link close} 结束;push 永不阻塞,
 *     即使没有消费者也立即返回(事件进缓冲),所以客户端断开不会反压拖住流水线。
 *   - 控制器通过异步迭代器消费已缓冲事件;断开后停止迭代即可,不影响后台流水线继续跑完落库。
 *
 * 仅一个消费者(本端点的单次 SSE 连接),无需多播。
 */
export class DiagnosisEventStream<T> {
  private readonly buffer: T[] = [];
  private resolveNext: ((result: IteratorResult<T>) => void) | null = null;
  private closed = false;

  /** 投递一个事件。永不阻塞:有等待中的消费者则直接喂给它,否则进缓冲。close 后丢弃。 */
  push(event: T): void {
    if (this.closed) return;
    if (this.resolveNext) {
      const resolve = this.resolveNext;
      this.resolveNext = null;
      resolve({ value: event, done: false });
      return;
    }
    this.buffer.push(event);
  }

  /** 结束事件流。缓冲中尚未消费的事件仍可被取走,取尽后迭代器结束。 */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.resolveNext) {
      const resolve = this.resolveNext;
      this.resolveNext = null;
      resolve({ value: undefined as never, done: true });
    }
  }

  /**
   * 消费端异步迭代器。先放空缓冲,缓冲空且未 close 时挂起等待下一次 push;close 且缓冲空则结束。
   * 控制器停止迭代(客户端断开)不会影响生产端——生产端的 push 始终走"进缓冲"分支,继续跑完。
   */
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.buffer.length > 0) {
          return Promise.resolve({ value: this.buffer.shift() as T, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined as never, done: true });
        }
        return new Promise<IteratorResult<T>>((resolve) => {
          this.resolveNext = resolve;
        });
      },
    };
  }
}
