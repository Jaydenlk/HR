/**
 * AiService.testConnection 单元测试 —— 按 protocol 分流探活,不调真端点、不需真 key。
 *
 * 验收点:
 *  ① openai-compat 成功:走原生 fetch(非 Anthropic client)打 /chat/completions,HTTP 200 → ok=true;
 *     断言 URL 以 /chat/completions 结尾、headers 含 Bearer、body 含 thinking:disabled 与 max_tokens:16,
 *     且 Anthropic client.messages.create 未被调用(证明没误走 anthropic 分支)。
 *  ② openai-compat 失败:HTTP 401 → ok=false,error 存在且不含明文 key(sanitizeError 剔除)。
 *  ③ anthropic-compat 回归:protocol 非 openai-compat 时走 client.messages.create,ok=true,
 *     且 fetch 未被调用(证明没误走 openai 分支)。
 *
 * 并发护栏 ConcurrencyLimiter 用直通假实现:testConnection 两分支都不经 limiter,仅为构造 AiService。
 * key 夹具用假值('test-key-abcdef'),真 key 永不入测试。
 */
import { AiService } from './ai.service';
import type { ConcurrencyLimiter } from './concurrency-limiter';
import type { LoadedProvider } from './ai-provider.service';

// 直通 limiter:run(fn)=fn();testConnection 不经它,仅满足构造签名。
const passthroughLimiter = {
  run: <T>(fn: () => Promise<T>): Promise<T> => fn(),
} as unknown as ConcurrencyLimiter;

// 假 key:断言失败路径 error 不含它,验证 sanitizeError 剔除生效。
const FAKE_KEY = 'test-key-abcdef';

function openaiProvider(): LoadedProvider {
  return {
    id: 'test-openai',
    name: 'glm-test',
    protocol: 'openai-compat',
    baseURL: 'https://example.test/v1/',
    apiKey: FAKE_KEY,
    modelPro: 'glm-5.1',
    modelFlash: 'glm-5.1',
    timeoutMs: 30000,
    maxRetries: 0,
  };
}

function anthropicProvider(): LoadedProvider {
  return {
    id: 'test-anthropic',
    name: 'deepseek-test',
    protocol: 'anthropic-compat',
    baseURL: 'https://example.test/anthropic/',
    apiKey: FAKE_KEY,
    modelPro: 'deepseek-pro',
    modelFlash: 'deepseek-flash',
    timeoutMs: 30000,
    maxRetries: 0,
  };
}

describe('AiService.testConnection — 按 protocol 分流探活', () => {
  let service: AiService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new AiService(passthroughLimiter, undefined, undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('openai-compat 成功:走 fetch(非 client)打 /chat/completions,HTTP 200 → ok=true', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'pong' } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    // 监视 clientFor:若被调用即说明误走了 anthropic 分支。
    const messagesCreate = jest.fn().mockResolvedValue({});
    const clientForSpy = jest
      .spyOn(service as unknown as { clientFor: () => unknown }, 'clientFor')
      .mockReturnValue({ messages: { create: messagesCreate } });

    const result = await service.testConnection(openaiProvider());

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(typeof result.latencyMs).toBe('number');

    // 走的是 fetch,不是 Anthropic client。
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clientForSpy).not.toHaveBeenCalled();
    expect(messagesCreate).not.toHaveBeenCalled();

    // URL 拼接:去尾斜杠 + /chat/completions。
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/v1/chat/completions');

    // headers 含 Bearer。
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
    expect(headers['Content-Type']).toBe('application/json');

    // body 含 thinking:disabled 与 max_tokens:16 与 messages。
    const body = JSON.parse(init.body as string) as {
      model: string;
      max_tokens: number;
      thinking: { type: string };
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.max_tokens).toBe(16);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.model).toBe('glm-5.1');
    expect(body.messages).toEqual([{ role: 'user', content: 'ping' }]);
  });

  it('openai-compat 失败:HTTP 401 → ok=false,error 存在且不含明文 key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => `unauthorized for key ${FAKE_KEY}`,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await service.testConnection(openaiProvider());

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('401');
    // 明文 key 必须被 sanitizeError 剔除(即便端点把 key 回显在错误体里)。
    expect(result.error).not.toContain(FAKE_KEY);
  });

  it('openai-compat 失败:网络异常(fetch reject)→ ok=false,error 不含明文 key', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error(`connect ECONNREFUSED ${FAKE_KEY}`));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await service.testConnection(openaiProvider());

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain(FAKE_KEY);
  });

  it('anthropic-compat 回归:走 client.messages.create(非 fetch),ok=true', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const messagesCreate = jest.fn().mockResolvedValue({ content: [] });
    const clientForSpy = jest
      .spyOn(service as unknown as { clientFor: () => unknown }, 'clientFor')
      .mockReturnValue({ messages: { create: messagesCreate } });

    const result = await service.testConnection(anthropicProvider());

    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();

    // 走的是 Anthropic client,不是 fetch。
    expect(clientForSpy).toHaveBeenCalledTimes(1);
    expect(messagesCreate).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();

    // 发的是最小请求(flash 型号,max_tokens:1,messages ping)。
    const createArg = messagesCreate.mock.calls[0][0] as {
      model: string;
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(createArg.model).toBe('deepseek-flash');
    expect(createArg.max_tokens).toBe(1);
    expect(createArg.messages).toEqual([{ role: 'user', content: 'ping' }]);
  });

  it('anthropic-compat 失败:client 抛错 → ok=false,error 不含明文 key', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const messagesCreate = jest.fn().mockRejectedValue(new Error(`401 invalid key ${FAKE_KEY}`));
    jest
      .spyOn(service as unknown as { clientFor: () => unknown }, 'clientFor')
      .mockReturnValue({ messages: { create: messagesCreate } });

    const result = await service.testConnection(anthropicProvider());

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain(FAKE_KEY);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
