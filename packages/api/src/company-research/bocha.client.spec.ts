/**
 * BochaClient 单元测试
 *
 * 迁移自 mock/company-search.service.spec.ts（该文件与 CompanySearchService 一并删除）：
 * 无 key / 成功 / 超时 / 网络错误 / HTTP 401·403·500 六类路径原样保留覆盖；
 * 原 24h 内存缓存场景（缓存命中不发起第二次 fetch 等）已随存储层上移到
 * company-research.service.spec.ts 的 7 天 DB 缓存场景，不在本文件重复。
 */
import { BochaClient } from './bocha.client';
import { ConfigService } from '@nestjs/config';

function makeClient(apiKey: string | undefined): BochaClient {
  const config = { get: jest.fn().mockReturnValue(apiKey) } as unknown as ConfigService;
  return new BochaClient(config);
}

const fetchMock = jest.fn();
global.fetch = fetchMock;

beforeEach(() => fetchMock.mockReset());

describe('BochaClient — 无 key', () => {
  it('无 BOCHA_API_KEY 时返回 {available:false, reason:"no_key"}，不发起 fetch', async () => {
    const client = makeClient(undefined);
    const result = await client.search('不存在的公司X');
    expect(result).toEqual({ available: false, reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hasKey() 无 key 时返回 false', () => {
    expect(makeClient(undefined).hasKey()).toBe(false);
  });
});

describe('BochaClient — 成功路径', () => {
  it('fetch 返回正常结果时，返回 {available:true, items:[...]}（全量，不截断）', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          webPages: {
            value: [
              { name: '测试科技有限公司', url: 'https://example.com/a', summary: '简介A' },
              { name: '测试科技(北京)有限公司', url: 'https://example.com/b', summary: '简介B' },
            ],
          },
        },
      }),
    });

    const client = makeClient('test-key');
    const result = await client.search('测试科技');

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('测试科技有限公司');
    }
  });

  it('fetch 返回空 webPages 时，返回 {available:true, items:[]}', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const client = makeClient('test-key');
    const result = await client.search('完全不知名公司');

    expect(result).toEqual({ available: true, items: [] });
  });

  it('count/include 选项透传进请求体', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const client = makeClient('test-key');
    await client.search('某公司', { include: 'tianyancha.com,qcc.com', count: 10 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.count).toBe(10);
    expect(body.include).toBe('tianyancha.com,qcc.com');
    expect(body.summary).toBe(true);
  });

  it('未传 include 时请求体不含 include 字段', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const client = makeClient('test-key');
    await client.search('某公司');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('include');
    expect(body.count).toBe(10);
  });
});

describe('BochaClient — 超时路径', () => {
  it('fetch abort 时返回 {available:false, reason:"timeout"}', async () => {
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          setTimeout(() => reject(err), 10);
        }),
    );

    const client = makeClient('test-key');
    const result = await client.search('超时测试公司ABC');

    expect(result).toEqual({ available: false, reason: 'timeout' });
  });
});

describe('BochaClient — 网络错误路径', () => {
  it('fetch 抛出普通 Error 时返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    const client = makeClient('test-key');
    const result = await client.search('网络错误测试公司');

    expect(result).toEqual({ available: false, reason: 'error' });
  });
});

describe('BochaClient — HTTP 状态语义', () => {
  it('HTTP 401 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const client = makeClient('test-key');
    const result = await client.search('401测试公司');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('HTTP 403 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const client = makeClient('test-key');
    const result = await client.search('403测试公司');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('其他非 2xx（如 500）返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const client = makeClient('test-key');
    const result = await client.search('500测试公司');
    expect(result).toEqual({ available: false, reason: 'error' });
  });
});
