/**
 * IndustryBochaService 单元测试
 * 三路径：成功 / 超时 / 无 key
 * 真实联网调用在 step 2 verify 中单独执行，本文件只 mock fetch。
 */
import { IndustryBochaService } from './industry-bocha.service';
import { ConfigService } from '@nestjs/config';

// 工厂：带 key 的 ConfigService
function makeService(apiKey: string | undefined): IndustryBochaService {
  const config = { get: jest.fn().mockReturnValue(apiKey) } as unknown as ConfigService;
  return new IndustryBochaService(config);
}

// 全局 fetch mock
const fetchMock = jest.fn();
global.fetch = fetchMock;

beforeEach(() => fetchMock.mockReset());

// ── 无 key ────────────────────────────────────────────────────────────────────

describe('IndustryBochaService — 无 key', () => {
  it('无 BOCHA_API_KEY 时返回 {available:false, reason:"no_key"}，不发起 fetch', async () => {
    const svc = makeService(undefined);
    const result = await svc.search('大模型 长三角 校招趋势');
    expect(result).toEqual({ available: false, reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── 成功路径 ──────────────────────────────────────────────────────────────────

describe('IndustryBochaService — 成功路径', () => {
  it('fetch 返回正常结果时，返回 {available:true, items: [...]}，title/url 均非空', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          webPages: {
            value: [
              {
                name: '大模型行业2024校招分析',
                url: 'https://36kr.com/p/123456',
                summary: '大模型校招岗位持续增长，算法工程师需求旺盛',
              },
              {
                name: '长三角AI企业招聘动态',
                url: 'https://jiemian.com/article/2024ai',
                snippet: '上海、杭州 AI 岗位占全国 30%',
              },
            ],
          },
        },
      }),
    });

    const svc = makeService('test-key');
    const result = await svc.search('大模型 长三角 校招趋势');

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.items.length).toBe(2);
      expect(result.items[0].title).toBe('大模型行业2024校招分析');
      expect(result.items[0].url).toBe('https://36kr.com/p/123456');
      expect(typeof result.items[0].snippet).toBe('string');
      expect(result.items[1].url).toBe('https://jiemian.com/article/2024ai');
    }
  });

  it('fetch 返回空 webPages 时，返回 {available:true, items:[]}', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const svc = makeService('test-key');
    const result = await svc.search('极冷僻行业XYZ');

    expect(result).toEqual({ available: true, items: [] });
  });

  it('fetch 返回缺 url 的条目时，该条目被过滤掉', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          webPages: {
            value: [
              { name: '有效条目', url: 'https://valid.com', summary: '摘要' },
              { name: '无URL条目', url: '', summary: '摘要' },
              { name: '', url: 'https://notitle.com', summary: '摘要' },
            ],
          },
        },
      }),
    });

    const svc = makeService('test-key');
    const result = await svc.search('测试过滤');

    expect(result.available).toBe(true);
    if (result.available) {
      // 只有 title 和 url 均非空的条目保留
      expect(result.items.length).toBe(1);
      expect(result.items[0].url).toBe('https://valid.com');
    }
  });
});

// ── 超时路径 ──────────────────────────────────────────────────────────────────

describe('IndustryBochaService — 超时路径', () => {
  it('fetch abort 时返回 {available:false, reason:"timeout"}', async () => {
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          setTimeout(() => reject(err), 10);
        }),
    );

    const svc = makeService('test-key');
    const result = await svc.search('超时测试行业ABC');

    expect(result).toEqual({ available: false, reason: 'timeout' });
  });
});

// ── HTTP 错误路径 ─────────────────────────────────────────────────────────────

describe('IndustryBochaService — HTTP 错误路径', () => {
  it('HTTP 401 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const svc = makeService('test-key');
    const result = await svc.search('401测试');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('HTTP 403 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const svc = makeService('test-key');
    const result = await svc.search('403测试');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('HTTP 500 返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const svc = makeService('test-key');
    const result = await svc.search('500测试');
    expect(result).toEqual({ available: false, reason: 'error' });
  });

  it('fetch 抛出普通 Error 时返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));
    const svc = makeService('test-key');
    const result = await svc.search('网络错误测试');
    expect(result).toEqual({ available: false, reason: 'error' });
  });
});

// ── query 传递验证 ─────────────────────────────────────────────────────────────

describe('IndustryBochaService — 请求参数', () => {
  it('正确传递 query 和 count 到博查 API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const svc = makeService('test-key');
    await svc.search('新能源汽车 上海 校招趋势 2024年', 8);

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[0]).toBe('https://api.bochaai.com/v1/web-search');
    const body = JSON.parse(callArgs[1].body);
    expect(body.query).toBe('新能源汽车 上海 校招趋势 2024年');
    expect(body.count).toBe(8);
    expect(body.summary).toBe(true);
    expect(callArgs[1].headers.Authorization).toBe('Bearer test-key');
  });
});
