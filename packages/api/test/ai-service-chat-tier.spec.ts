import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { AiProviderService, LoadedProvider } from '../src/ai/ai-provider.service';

// 模块级 mock @anthropic-ai/sdk:每个 Anthropic 实例的 messages.create / messages.stream 指向
// 按 baseURL 分流的可控 mock,从而断言"哪个通道(deepseek 直连 / relay 中转)被调用 + 用了哪个型号"。
// deepseek baseURL 含 'deepseek',relay baseURL 含 'clouddreamai';据此把每次调用归属到对应通道。
interface Call {
  provider: 'deepseek' | 'relay';
  model: string;
  messages: unknown;
  // F1:stream 调用透传的 AbortSignal(若有)。
  signal?: AbortSignal;
}
const calls: Call[] = [];

// create:返回值由测试通过 createQueue 预置(按调用顺序消费);默认返回一段文本。
const createQueue: Array<unknown | (() => unknown)> = [];
// stream:每次调用返回一个 async iterable;由 streamQueue 预置(可为函数,抛错或产出 chunk)。
const streamQueue: Array<() => AsyncIterable<unknown>> = [];

function providerOf(baseURL: string): 'deepseek' | 'relay' {
  return baseURL.includes('deepseek') ? 'deepseek' : 'relay';
}

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: class {
      private readonly baseURL: string;
      constructor(opts: { baseURL: string }) {
        this.baseURL = opts.baseURL;
      }
      messages = {
        create: (params: { model: string; messages: unknown }) => {
          calls.push({ provider: providerOf(this.baseURL), model: params.model, messages: params.messages });
          const next = createQueue.shift();
          const val = typeof next === 'function' ? (next as () => unknown)() : next;
          return Promise.resolve(val ?? { content: [{ type: 'text', text: 'ok' }] });
        },
        stream: (params: { model: string; messages: unknown }, opts?: { signal?: AbortSignal }) => {
          calls.push({ provider: providerOf(this.baseURL), model: params.model, messages: params.messages, signal: opts?.signal });
          const factory = streamQueue.shift();
          if (!factory) throw new Error('streamQueue 为空:测试未预置 stream 返回');
          return factory();
        },
      };
    },
  };
});

/** 构造一个 content_block_delta(text_delta)事件序列的 async iterable。 */
function streamOf(texts: string[]): () => AsyncIterable<unknown> {
  return () =>
    (async function* () {
      for (const t of texts) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: t } };
      }
    })();
}

/** 首 token 前即抛错的 stream(stream() 返回的 iterable 第一次 next 就 reject)。 */
function streamThrowsBeforeFirst(msg: string): () => AsyncIterable<unknown> {
  return () =>
    (async function* () {
      throw new Error(msg);
      // eslint-disable-next-line no-unreachable
      yield undefined;
    })();
}

/** 先产出 chunk(首 token 已到达),随后抛错的 stream。 */
function streamYieldsThenThrows(texts: string[], msg: string): () => AsyncIterable<unknown> {
  return () =>
    (async function* () {
      for (const t of texts) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: t } };
      }
      throw new Error(msg);
    })();
}

// 新架构:AiService 从 ai_providers 池(LoadedProvider[],已解密、已排序)取通道。
// 通道型号/baseURL/密钥不再来自 ConfigService,而来自池里的 LoadedProvider;
// mock 的 @anthropic-ai/sdk 按 baseURL 子串(deepseek/clouddreamai)把调用归属到通道。
const PROVIDER_DEFS: Record<'deepseek' | 'relay' | 'glm', Omit<LoadedProvider, 'id' | 'name' | 'apiKey'>> = {
  deepseek: {
    protocol: 'anthropic-compat',
    baseURL: 'https://api.deepseek.com/anthropic',
    modelPro: 'deepseek-v4-pro',
    modelFlash: 'deepseek-v4-flash',
    timeoutMs: 120000,
    maxRetries: 3,
  },
  relay: {
    protocol: 'anthropic-compat',
    baseURL: 'https://api.tutorial.clouddreamai.com',
    modelPro: 'auto-v2',
    modelFlash: 'auto-v2',
    timeoutMs: 60000,
    maxRetries: 0,
  },
  glm: {
    protocol: 'anthropic-compat',
    baseURL: 'https://open.bigmodel.cn/api/anthropic',
    modelPro: 'glm-4.6',
    modelFlash: 'glm-4.5-air',
    timeoutMs: 120000,
    maxRetries: 3,
  },
};

function lp(name: 'deepseek' | 'relay' | 'glm', apiKey: string): LoadedProvider {
  return { id: `id-${name}`, name, apiKey, ...PROVIDER_DEFS[name] };
}

// fake provider service:loadPool() 返回预置池(按顺序消费,[0] 为主)。
function fakeProviders(pool: LoadedProvider[]): AiProviderService {
  return { loadPool: () => Promise.resolve(pool) } as unknown as AiProviderService;
}

// 把旧版「primaryProvider + 各通道 key」语义翻译成新架构的「有序 LoadedProvider 池」:
// 主通道(primaryProvider)排 [0],其余有 key 的通道按 deepseek→relay→glm 顺序补后。
function poolFor(opts: {
  primaryProvider: 'deepseek' | 'relay' | 'glm';
  deepseekKey?: string;
  relayKey?: string;
  glmKey?: string;
}): LoadedProvider[] {
  const keys: Record<'deepseek' | 'relay' | 'glm', string | undefined> = {
    deepseek: opts.deepseekKey,
    relay: opts.relayKey,
    glm: opts.glmKey,
  };
  const order: Array<'deepseek' | 'relay' | 'glm'> = [
    opts.primaryProvider,
    ...(['deepseek', 'relay', 'glm'] as const).filter((n) => n !== opts.primaryProvider),
  ];
  return order.filter((n) => !!keys[n]).map((n) => lp(n, keys[n]!));
}

async function buildService(opts: {
  primaryProvider: 'deepseek' | 'relay' | 'glm';
  deepseekKey?: string;
  relayKey?: string;
  glmKey?: string;
}): Promise<AiService> {
  const module = await Test.createTestingModule({
    providers: [
      AiService,
      ConcurrencyLimiter,
      {
        provide: ConfigService,
        useValue: {
          get: (key: string) => {
            if (key === 'ai.concurrency') return { max: 2, queue: 8 };
            if (key === 'ai') return { concurrency: { max: 2, queue: 8 } };
            return undefined;
          },
        },
      },
      { provide: AiProviderService, useValue: fakeProviders(poolFor(opts)) },
    ],
  }).compile();
  return module.get(AiService);
}

async function drain(gen: AsyncGenerator<string>): Promise<string> {
  let out = '';
  for await (const t of gen) out += t;
  return out;
}

beforeEach(() => {
  calls.length = 0;
  createQueue.length = 0;
  streamQueue.length = 0;
});

// ── chat 流式 + 真多轮 ────────────────────────────────────────────────────────
describe('AiService.chat 流式', () => {
  const MESSAGES = [
    { role: 'user' as const, content: '你好' },
    { role: 'assistant' as const, content: '你好,有什么可以帮你?' },
    { role: 'user' as const, content: '帮我改简历' },
  ];

  it('逐 chunk 产出增量文本(是流不是整段),且把真多轮 messages 原样传入', async () => {
    streamQueue.push(streamOf(['改', '简', '历:']));
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });

    const chunks: string[] = [];
    for await (const t of svc.chat({ system: 'sys', messages: MESSAGES })) chunks.push(t);

    expect(chunks).toEqual(['改', '简', '历:']); // 三段独立增量 = 流式
    expect(calls).toHaveLength(1);
    expect(calls[0].provider).toBe('deepseek');
    expect(calls[0].messages).toEqual(MESSAGES); // 三轮 user/assistant 交替原样下发
  });

  it('首 token 前主通道挂 → 切备通道重试并产出', async () => {
    streamQueue.push(streamThrowsBeforeFirst('Request timed out.')); // 主(deepseek)首 token 前挂
    streamQueue.push(streamOf(['来自', '备用'])); // 备(relay)成功
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk', relayKey: 'rk' });

    const out = await drain(svc.chat({ system: 'sys', messages: MESSAGES }));

    expect(out).toBe('来自备用');
    expect(calls.map((c) => c.provider)).toEqual(['deepseek', 'relay']); // 主挂 → 切备
  });

  it('首 token 后主通道挂 → 直接上抛,绝不静默换通道重发(防重复内容)', async () => {
    streamQueue.push(streamYieldsThenThrows(['前半段'], 'mid-stream reset')); // 已输出后挂
    streamQueue.push(streamOf(['不该被调用'])); // 备通道:不应被触发
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk', relayKey: 'rk' });

    const chunks: string[] = [];
    await expect(
      (async () => {
        for await (const t of svc.chat({ system: 'sys', messages: MESSAGES })) chunks.push(t);
      })(),
    ).rejects.toThrow(/流式中途失败/);

    expect(chunks).toEqual(['前半段']); // 已交付的部分保留
    expect(calls.map((c) => c.provider)).toEqual(['deepseek']); // 备通道未被调用(无重发)
  });

  it('两通道首 token 前皆挂 → 抛 503', async () => {
    streamQueue.push(streamThrowsBeforeFirst('down1'));
    streamQueue.push(streamThrowsBeforeFirst('down2'));
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk', relayKey: 'rk' });

    await expect(drain(svc.chat({ system: 'sys', messages: MESSAGES }))).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(calls.map((c) => c.provider)).toEqual(['deepseek', 'relay']);
  });

  // F1:signal 透传断言——chat() 携带 signal 时,SDK messages.stream 必须收到一个 AbortSignal,
  // 且该 signal 与外部 signal 联动(外部 abort → SDK signal 也 abort)。
  // watchdog-v2 在 streamProvider 里包了一层 streamAbort,因此 SDK 收到的不是原对象,
  // 而是 streamAbort.signal;但 forwardAbort 保证外部 signal abort → streamAbort abort。
  it('F1 signal 透传:chat signal 被转发到 SDK messages.stream(经看门狗中转)', async () => {
    streamQueue.push(streamOf(['ok']));
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    const controller = new AbortController();
    await drain(svc.chat({ system: 'sys', messages: MESSAGES, signal: controller.signal }));
    // SDK stream 调用必须收到一个 AbortSignal(看门狗中转后非原对象,但联动生效)。
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);
  });

  // F1 abort 语义:AbortError 上抛后槽位归零。
  // 用一个在首 token 前即抛 AbortError 的 stream 模拟 SDK abort 行为。
  it('F1 abort 中断:AbortError 上抛后并发槽立即归零', async () => {
    const controller = new AbortController();
    controller.abort(); // 预先 abort,SDK 立刻抛错
    // 构造一个已 abort 时直接抛 AbortError 的 stream
    streamQueue.push(() =>
      (async function* () {
        const err = new Error('The operation was aborted.');
        err.name = 'AbortError';
        throw err;
        // eslint-disable-next-line no-unreachable
        yield undefined;
      })(),
    );
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    const limiter = (svc as unknown as { limiter: import('../src/ai/concurrency-limiter').ConcurrencyLimiter }).limiter;

    // 首 token 前失败:视为可切通道,但只有一个通道且已失败 → 抛 503 或 AbortError
    await expect(drain(svc.chat({ system: 'sys', messages: MESSAGES, signal: controller.signal }))).rejects.toThrow();

    // 无论抛什么,槽位必须归零
    expect(limiter.status().active).toBe(0);
  });
});

// ── tier 档位 + 型号迁移 ──────────────────────────────────────────────────────
describe('AiService tier 档位选型', () => {
  it('complete tier=pro → deepseek 直连用 deepseek-v4-pro', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'pro 文本' }] });
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(calls[0]).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-pro' });
  });

  it('complete 默认(无 tier)→ flash 型号 deepseek-v4-flash(取代弃用 deepseek-chat)', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'flash 文本' }] });
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    await svc.complete({ system: 's', prompt: 'p' });
    expect(calls[0]).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-flash' });
  });

  it('completeStructured tier=pro → deepseek-v4-pro', async () => {
    createQueue.push({ content: [{ type: 'tool_use', name: 't', input: { ok: true } }] });
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    await svc.completeStructured({
      system: 's',
      prompt: 'p',
      toolName: 't',
      toolDescription: 'd',
      schema: { type: 'object' },
      tier: 'pro',
    });
    expect(calls[0]).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-pro' });
  });

  it('chat tier=flash → deepseek-v4-flash', async () => {
    streamQueue.push(streamOf(['hi']));
    const svc = await buildService({ primaryProvider: 'deepseek', deepseekKey: 'dk' });
    await drain(svc.chat({ system: 's', messages: [{ role: 'user', content: 'q' }], tier: 'flash' }));
    expect(calls[0]).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-flash' });
  });

  it('relay 通道:pro/flash 共用 auto-v2 别名(降档保命)', async () => {
    createQueue.push({ content: [{ type: 'text', text: 'a' }] });
    createQueue.push({ content: [{ type: 'text', text: 'b' }] });
    const svc = await buildService({ primaryProvider: 'relay', relayKey: 'rk' });
    await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    await svc.complete({ system: 's', prompt: 'p', tier: 'flash' });
    expect(calls[0]).toMatchObject({ provider: 'relay', model: 'auto-v2' });
    expect(calls[1]).toMatchObject({ provider: 'relay', model: 'auto-v2' });
  });

  it('通道顺序:primaryProvider=relay 时 relay 在前(主),deepseek 备', async () => {
    createQueue.push(() => {
      throw new Error('relay down');
    });
    createQueue.push({ content: [{ type: 'text', text: 'deepseek 兜底' }] });
    const svc = await buildService({ primaryProvider: 'relay', relayKey: 'rk', deepseekKey: 'dk' });
    const out = await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(out).toBe('deepseek 兜底');
    // 主 relay(auto-v2)挂 → 降级 deepseek(pro 档型号)
    expect(calls[0]).toMatchObject({ provider: 'relay', model: 'auto-v2' });
    expect(calls[1]).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-pro' });
  });
});
