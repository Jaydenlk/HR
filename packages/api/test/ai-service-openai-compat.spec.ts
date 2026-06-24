import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ConcurrencyLimiter } from '../src/ai/concurrency-limiter';
import { AiProviderService, LoadedProvider } from '../src/ai/ai-provider.service';

/**
 * openai-compat 协议运行时(GLM-5.1 coding 端点)单测:
 *   - complete:取 choices[0].message.content 作正文;reasoning_content 不混入;空 content 抛错降级。
 *   - completeStructured:OpenAI function-calling(tool_calls)解析;空/截断重试/降级。
 *   - chat 流式:OpenAI SSE,delta.content 外吐、delta.reasoning_content 跳过。
 *   - 跨协议 failover:GLM(openai,fetch)主挂 → DeepSeek(anthropic,SDK)备接管。
 *   - billing 失败不扣:全通道挂 → 抛 503(CreditInterceptor 只在成功 tap.next 扣点,503 即不扣)。
 *
 * mock 策略:
 *   - openai 通道走原生 fetch → mock global.fetch(按需返回 JSON / SSE ReadableStream / 抛错)。
 *   - anthropic 通道走 @anthropic-ai/sdk → 模块级 mock messages.create/stream。
 */

// ── anthropic SDK mock(给 deepseek 备用通道用) ──
const anthropicCreate = jest.fn();
const anthropicStream = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = { create: anthropicCreate, stream: anthropicStream };
  },
}));

// ── global.fetch mock(给 glm openai 通道用) ──
const fetchMock = jest.fn();
const realFetch = global.fetch;
beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});

beforeEach(() => {
  fetchMock.mockReset();
  anthropicCreate.mockReset();
  anthropicStream.mockReset();
});

// 构造一个 OpenAI JSON 响应(Response-like:ok + json())。
function jsonResponse(payload: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(typeof payload === 'string' ? payload : JSON.stringify(payload)),
  } as unknown as Response;
}

// 构造一个 OpenAI SSE 流响应(body 为 ReadableStream of Uint8Array,逐行 data:)。
function sseResponse(lines: string[]): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: stream } as unknown as Response;
}

function lpGlm(overrides: Partial<LoadedProvider> = {}): LoadedProvider {
  return {
    id: 'id-glm',
    name: 'glm',
    protocol: 'openai-compat',
    baseURL: 'https://open.bigmodel.cn/api/coding/paas/v4',
    apiKey: 'glm-key',
    modelPro: 'glm-5.1',
    modelFlash: 'glm-5.1',
    timeoutMs: 120000,
    maxRetries: 3,
    ...overrides,
  };
}

function lpDeepseek(overrides: Partial<LoadedProvider> = {}): LoadedProvider {
  return {
    id: 'id-deepseek',
    name: 'deepseek',
    protocol: 'anthropic-compat',
    baseURL: 'https://api.deepseek.com/anthropic',
    apiKey: 'deepseek-key',
    modelPro: 'deepseek-v4-pro',
    modelFlash: 'deepseek-v4-flash',
    timeoutMs: 120000,
    maxRetries: 3,
    ...overrides,
  };
}

function fakeProviders(pool: LoadedProvider[]): AiProviderService {
  return { loadPool: () => Promise.resolve(pool) } as unknown as AiProviderService;
}

async function buildService(pool: LoadedProvider[]): Promise<AiService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      AiService,
      ConcurrencyLimiter,
      {
        provide: ConfigService,
        useValue: {
          get: (k: string) =>
            k === 'ai.concurrency'
              ? { max: 2, queue: 8 }
              : k === 'ai'
                ? { concurrency: { max: 2, queue: 8 } }
                : undefined,
        },
      },
      { provide: AiProviderService, useValue: fakeProviders(pool) },
    ],
  }).compile();
  return moduleRef.get(AiService);
}

async function drain(gen: AsyncGenerator<string>): Promise<string> {
  let out = '';
  for await (const t of gen) out += t;
  return out;
}

// ── complete(非流式文本) ──
describe('openai-compat complete', () => {
  it('取 content 作正文,reasoning_content 不混入', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: { content: '诊断是体检式分析。', reasoning_content: '让我想想……' },
          },
        ],
      }),
    );
    const svc = await buildService([lpGlm()]);
    const out = await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(out).toBe('诊断是体检式分析。');
    expect(out).not.toContain('让我想想'); // reasoning 绝不混入正文

    // 请求形态:打到 coding 端点 /chat/completions,Bearer 鉴权,OpenAI body。
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://open.bigmodel.cn/api/coding/paas/v4/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer glm-key');
    const body = JSON.parse(init.body as string) as { model: string; max_tokens: number };
    expect(body.model).toBe('glm-5.1');
  });

  it('推理模型 max_tokens 抬到下限(防极小预算被 reasoning 吃光致正文空)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ choices: [{ message: { content: '是' } }] }),
    );
    const svc = await buildService([lpGlm()]);
    // 调用方传极小 maxTokens(对齐 interviews 判别器 maxTokens:8 场景)
    await svc.complete({ system: 's', prompt: 'p', maxTokens: 8 });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { max_tokens: number };
    expect(body.max_tokens).toBe(8192); // 抬到 OPENAI_REASONING_MIN_MAX_TOKENS
  });

  it('空 content → 抛错(单通道无降级则 503,绝不静默返回空)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: '' } }] }));
    const svc = await buildService([lpGlm()]);
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('HTTP 非 2xx → 抛错触发降级/503', async () => {
    fetchMock.mockResolvedValue(jsonResponse('rate limited', false, 429));
    const svc = await buildService([lpGlm()]);
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

// ── completeStructured(function-calling) ──
const STRUCTURED = {
  system: 's',
  prompt: 'p',
  toolName: 'extract',
  toolDescription: 'd',
  schema: { type: 'object' as const, required: ['name'], properties: { name: { type: 'string' } } },
  tier: 'pro' as const,
};

describe('openai-compat completeStructured', () => {
  it('从 tool_calls.arguments 解析结构化对象;关思考(thinking:disabled)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              tool_calls: [{ function: { name: 'extract', arguments: '{"name":"张三"}' } }],
            },
          },
        ],
      }),
    );
    const svc = await buildService([lpGlm()]);
    const out = await svc.completeStructured<{ name: string }>(STRUCTURED);
    expect(out).toEqual({ name: '张三' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      tools?: unknown[];
      tool_choice?: unknown;
      thinking?: unknown;
    };
    expect(body.tools).toHaveLength(1);
    expect(body.tool_choice).toEqual({ type: 'function', function: { name: 'extract' } });
    expect(body.thinking).toEqual({ type: 'disabled' }); // 结构化关思考
  });

  it('空 tool_call → 重试,拿到非空后返回', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { tool_calls: [{ function: { name: 'extract', arguments: '{}' } }] } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ choices: [{ message: { tool_calls: [{ function: { name: 'extract', arguments: '{"name":"李四"}' } }] } }] }),
      );
    const svc = await buildService([lpGlm()]);
    const out = await svc.completeStructured<{ name: string }>(STRUCTURED);
    expect(out).toEqual({ name: '李四' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('finish_reason=length(截断)→ 抛错(残缺 JSON 绝不当成功)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [
          { finish_reason: 'length', message: { tool_calls: [{ function: { name: 'extract', arguments: '{"name":"张' } }] } },
        ],
      }),
    );
    const svc = await buildService([lpGlm()]);
    await expect(svc.completeStructured(STRUCTURED)).rejects.toThrow(ServiceUnavailableException);
  });

  it('连续空 tool_call 耗尽(ATTEMPTS=4)→ 503', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { tool_calls: [{ function: { name: 'extract', arguments: '{}' } }] } }] }),
    );
    const svc = await buildService([lpGlm()]);
    await expect(svc.completeStructured(STRUCTURED)).rejects.toThrow(ServiceUnavailableException);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

// ── chat 流式(OpenAI SSE) ──
describe('openai-compat chat 流式', () => {
  const MESSAGES = [{ role: 'user' as const, content: '你好' }];

  it('逐 delta.content 产出;delta.reasoning_content 跳过(不外吐)', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"思考中"}}]}\n',
        'data: {"choices":[{"delta":{"content":"诊"}}]}\n',
        'data: {"choices":[{"delta":{"content":"断"}}]}\n',
        'data: [DONE]\n',
      ]),
    );
    const svc = await buildService([lpGlm()]);
    const chunks: string[] = [];
    for await (const t of svc.chat({ system: 's', messages: MESSAGES, tier: 'pro' })) chunks.push(t);
    expect(chunks).toEqual(['诊', '断']); // reasoning_content 不在输出里
  });

  it('SSE 跨网络包半行拼接:data 行被切成两段仍能解析', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"con', // 半行
        'tent":"完整"}}]}\n',
        'data: [DONE]\n',
      ]),
    );
    const svc = await buildService([lpGlm()]);
    expect(await drain(svc.chat({ system: 's', messages: MESSAGES }))).toBe('完整');
  });

  // ── MAJOR1:GLM 推理模型"干净结束但零正文(纯 reasoning_content)"必须切通道,绝不静默成功返回空 ──
  it('GLM 整段只产 reasoning_content + 干净 [DONE](零正文)→ 切下一通道(DeepSeek)拿到正文', async () => {
    // GLM-5.1 默认开思考、chat 不关思考:整段只有 reasoning_content,然后干净 [DONE]——
    // streamProviderOpenAi 一个 content 都不 yield(emitted 恒 false),流正常结束。
    fetchMock.mockResolvedValueOnce(
      sseResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"先想想这道题"}}]}\n',
        'data: {"choices":[{"delta":{"reasoning_content":"再想想"}}]}\n',
        'data: [DONE]\n',
      ]),
    );
    // 备通道 DeepSeek 正常出正文。
    anthropicStream.mockReturnValueOnce(
      (async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'DeepSeek 正文' } };
      })(),
    );
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    const out = await drain(svc.chat({ system: 's', messages: MESSAGES }));
    expect(out).toBe('DeepSeek 正文'); // 切到备通道拿到正文,而非空字符串
    expect(fetchMock).toHaveBeenCalledTimes(1); // GLM 试了一次(零正文)
    expect(anthropicStream).toHaveBeenCalledTimes(1); // 降级到 DeepSeek
  });

  it('所有通道都"干净结束但零正文"→ 抛 503(绝不返回空成功;503 不进 tap.next 不扣点)', async () => {
    // GLM 零正文 + DeepSeek 也零正文(纯 thinking_delta,被静默跳过、不置位 emitted)→ 两通道首 token 前皆"失败"。
    fetchMock.mockResolvedValue(
      sseResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"GLM 思考"}}]}\n',
        'data: [DONE]\n',
      ]),
    );
    anthropicStream.mockReturnValue(
      (async function* () {
        yield { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'DS 思考' } };
      })(),
    );
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    await expect(drain(svc.chat({ system: 's', messages: MESSAGES }))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

// ── 跨协议 failover:GLM(openai)主挂 → DeepSeek(anthropic)备接管 ──
describe('跨协议 failover(openai 主 → anthropic 备)', () => {
  it('complete:GLM fetch 抛错 → DeepSeek SDK 接管并返回', async () => {
    fetchMock.mockRejectedValueOnce(new Error('GLM connection reset'));
    anthropicCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'DeepSeek 接管' }] });
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    const out = await svc.complete({ system: 's', prompt: 'p', tier: 'pro' });
    expect(out).toBe('DeepSeek 接管');
    expect(fetchMock).toHaveBeenCalledTimes(1); // GLM 主试一次
    expect(anthropicCreate).toHaveBeenCalledTimes(1); // 降级到 DeepSeek
    // DeepSeek 走 anthropic pro 型号
    expect(anthropicCreate.mock.calls[0][0].model).toBe('deepseek-v4-pro');
  });

  it('completeStructured:GLM 空 tool_call 耗尽 → DeepSeek tool_use 救回', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { tool_calls: [{ function: { name: 'extract', arguments: '{}' } }] } }] }),
    );
    anthropicCreate.mockResolvedValueOnce({
      content: [{ type: 'tool_use', name: 'extract', input: { name: '王五' } }],
    });
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    const out = await svc.completeStructured<{ name: string }>(STRUCTURED);
    expect(out).toEqual({ name: '王五' });
    expect(fetchMock).toHaveBeenCalledTimes(4); // GLM 4 次空
    expect(anthropicCreate).toHaveBeenCalledTimes(1); // DeepSeek 救回
  });

  it('chat 流式:GLM 首 token 前 fetch 挂 → DeepSeek 流接管', async () => {
    fetchMock.mockRejectedValueOnce(new Error('GLM stream open failed'));
    anthropicStream.mockReturnValueOnce(
      (async function* () {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: '备用流' } };
      })(),
    );
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    const out = await drain(svc.chat({ system: 's', messages: [{ role: 'user', content: 'q' }] }));
    expect(out).toBe('备用流');
  });
});

// ── billing 失败不扣点(全通道挂 → 503,语义=不扣) ──
describe('billing 失败不扣(全 provider 挂 → 503)', () => {
  it('complete:GLM fetch 挂 + DeepSeek SDK 挂 → 抛 503(成功才扣,503 即不扣)', async () => {
    fetchMock.mockRejectedValue(new Error('GLM down'));
    anthropicCreate.mockRejectedValue(new Error('DeepSeek down'));
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    await expect(svc.complete({ system: 's', prompt: 'p' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(anthropicCreate).toHaveBeenCalledTimes(1);
  });

  it('chat:两通道首 token 前皆挂 → 503', async () => {
    fetchMock.mockRejectedValue(new Error('GLM down'));
    anthropicStream.mockReturnValue(
      (async function* () {
        throw new Error('DeepSeek down');
        // eslint-disable-next-line no-unreachable
        yield undefined;
      })(),
    );
    const svc = await buildService([lpGlm(), lpDeepseek()]);
    await expect(
      drain(svc.chat({ system: 's', messages: [{ role: 'user', content: 'q' }] })),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
