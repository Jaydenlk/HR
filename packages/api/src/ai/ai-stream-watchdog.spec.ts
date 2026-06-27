/**
 * AI 流式看门狗(watchdog-v2)单元测试。
 *
 * 验收点:
 *  ① streamProviderOpenAi idle timeout:mock 一个 ReadableStream,首 chunk 正常返回,
 *     然后 reader.read() 永久 hang → idle 计时器(缩短到 100ms)触发 → generator 抛错退出。
 *  ② streamProviderOpenAi reasoning 不误杀:mock 一个 ReadableStream,持续产出
 *     reasoning_content(无 content),间隔 < idle 阈值 → idle 正确重置,不超时。
 *  ③ raceAbortSignal:pipeline abort 后 limiter 槽正确释放(active 归 0)。
 *
 * 依赖:AiService 需要 ConcurrencyLimiter(直通假实现)。streamProviderOpenAi 是 private,
 * 需要经 chat() 路径触发(chat → resolveOrder → limiter.runStreaming → streamProviderOpenAi);
 * 为此 mock resolveOrder 返回一个 openai-compat provider。
 */
import { AiService } from './ai.service';
import { ConcurrencyLimiter } from './concurrency-limiter';
import { ConfigService } from '@nestjs/config';

// ── 工具函数 ────────────────────────────────────────────────────────────

function makeLimiter(max = 2, queue = 4): ConcurrencyLimiter {
  const config = { get: () => ({ max, queue }) } as unknown as ConfigService;
  return new ConcurrencyLimiter(config);
}

/** 构造一个可控的 ReadableStream:调用方通过 push(chunk)/close() 驱动数据流。 */
function controllableStream(): {
  stream: ReadableStream<Uint8Array>;
  push: (text: string) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) { controller = c; },
  });
  return {
    stream,
    push: (text: string) => {
      try { controller.enqueue(encoder.encode(text)); } catch { /* stream may be cancelled */ }
    },
    close: () => {
      try { controller.close(); } catch { /* already closed */ }
    },
  };
}

/** 构造 OpenAI SSE data 行(单 chunk)。 */
function sseChunk(content?: string, reasoning?: string): string {
  const delta: Record<string, string> = {};
  if (content !== undefined) delta.content = content;
  if (reasoning !== undefined) delta.reasoning_content = reasoning;
  const chunk = { choices: [{ delta }] };
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

// ── 测试 ────────────────────────────────────────────────────────────────

describe('AI 流式看门狗(watchdog-v2)', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // ① idle timeout:reader.read() 永久 hang → 看门狗触发 → generator 抛错
  it('streamProviderOpenAi: reader.read() hang 时 idle timeout 触发,generator 抛错而非永挂', async () => {
    // 缩短 idle 到 100ms(测试速度)
    process.env.AI_STREAM_IDLE_MS = '100';
    process.env.AI_STREAM_MAX_MS = '5000';

    const { stream, push } = controllableStream();

    // mock fetch:返回正常 Response + 可控 body
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    }) as unknown as typeof fetch;

    const limiter = makeLimiter();
    const service = new AiService(limiter, undefined, undefined);

    // mock resolveOrder 返回 openai-compat provider
    jest.spyOn(service as never, 'resolveOrder' as never).mockResolvedValue([
      {
        name: 'test-openai',
        client: {} as never,
        protocol: 'openai-compat',
        baseURL: 'https://example.test/v1',
        apiKey: 'fake-key',
        timeoutMs: 30000,
        modelFor: () => 'test-model',
      },
    ] as never);

    // 先推一个正常 chunk(让 stream 启动),然后不再推任何数据(模拟 hang)
    setTimeout(() => push(sseChunk('hello')), 10);

    const chunks: string[] = [];
    let caughtErr: Error | undefined;
    try {
      for await (const text of service.chat({
        system: 'test',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        chunks.push(text);
        // 首 chunk 后不再推数据 → reader.read() hang → idle 触发
      }
    } catch (err) {
      caughtErr = err as Error;
    }

    // 应收到首 chunk 的内容
    expect(chunks).toContain('hello');
    // 应抛错(不是干净结束)
    expect(caughtErr).toBeDefined();
    // limiter 应已释放(active=0)
    expect(limiter.status().active).toBe(0);
  }, 10000);

  // ② reasoning_content 不误杀:持续产出 reasoning(不 yield)但 idle 重置
  it('streamProviderOpenAi: reasoning_content 帧正确重置 idle,不误杀长思考', async () => {
    // idle 设 200ms;每 80ms 推一帧 reasoning → 远超 idle 但不该超时
    process.env.AI_STREAM_IDLE_MS = '200';
    process.env.AI_STREAM_MAX_MS = '5000';

    const { stream, push, close } = controllableStream();

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    }) as unknown as typeof fetch;

    const limiter = makeLimiter();
    const service = new AiService(limiter, undefined, undefined);

    jest.spyOn(service as never, 'resolveOrder' as never).mockResolvedValue([
      {
        name: 'test-openai',
        client: {} as never,
        protocol: 'openai-compat',
        baseURL: 'https://example.test/v1',
        apiKey: 'fake-key',
        timeoutMs: 30000,
        modelFor: () => 'test-model',
      },
    ] as never);

    // 模拟推理模型思考:每 80ms 推一帧 reasoning_content,共 5 帧(400ms 总时长 > 200ms idle)
    // 然后推正文 content + [DONE]
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame <= 5) {
        push(sseChunk(undefined, `thinking step ${frame}`));
      } else if (frame === 6) {
        push(sseChunk('final answer'));
      } else {
        push('data: [DONE]\n\n');
        close();
        clearInterval(interval);
      }
    }, 80);

    const chunks: string[] = [];
    let caughtErr: Error | undefined;
    try {
      for await (const text of service.chat({
        system: 'test',
        messages: [{ role: 'user', content: 'test' }],
      })) {
        chunks.push(text);
      }
    } catch (err) {
      caughtErr = err as Error;
    }

    clearInterval(interval);

    // 应收到正文(不被误杀)
    expect(chunks).toContain('final answer');
    // 不应抛错(干净结束)
    expect(caughtErr).toBeUndefined();
    expect(limiter.status().active).toBe(0);
  }, 10000);

  // ③ pipeline abort → limiter 释放
  it('raceAbortSignal: pipeline abort 触发后 limiter.runObservable task 立即 reject,槽位释放', async () => {
    const limiter = makeLimiter(1, 2);

    const abort = new AbortController();
    let taskStarted = false;

    // 模拟 runObservable + raceAbortSignal:task 内部永不 resolve
    const resultPromise = limiter.runObservable(
      () => {
        taskStarted = true;
        // raceAbortSignal 语义:race task promise against abort signal
        return new Promise<string>((resolve, reject) => {
          const onAbort = (): void => reject(new Error('aborted'));
          if (abort.signal.aborted) { onAbort(); return; }
          abort.signal.addEventListener('abort', onAbort, { once: true });
          // 底层 task 永不 resolve(模拟 hang)
        });
      },
      () => {},
    );

    // 任务已开始,槽位已占
    await new Promise((r) => setTimeout(r, 10));
    expect(taskStarted).toBe(true);
    expect(limiter.status().active).toBe(1);

    // 触发 abort
    abort.abort();

    // 等待 resultPromise reject
    await expect(resultPromise).rejects.toThrow('aborted');

    // 关键:槽位已释放
    expect(limiter.status().active).toBe(0);
  });
});
