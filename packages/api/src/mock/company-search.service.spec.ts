/**
 * CompanySearchService 单元测试
 * 三路径：成功 / 超时 / 无 key
 * 真实联网调用在 step 2 verify 中单独执行，本文件只 mock fetch。
 */
import { CompanySearchService } from './company-search.service';
import { ConfigService } from '@nestjs/config';

// 工厂：带 key 的 ConfigService
function makeService(apiKey: string | undefined): CompanySearchService {
  const config = { get: jest.fn().mockReturnValue(apiKey) } as unknown as ConfigService;
  return new CompanySearchService(config);
}

// 全局 fetch mock
const fetchMock = jest.fn();
global.fetch = fetchMock;

beforeEach(() => fetchMock.mockReset());

describe('CompanySearchService — 无 key', () => {
  it('无 BOCHA_API_KEY 时返回 {available:false, reason:"no_key"}', async () => {
    const svc = makeService(undefined);
    const result = await svc.search('不存在的公司X');
    expect(result).toEqual({ available: false, reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('CompanySearchService — 成功路径', () => {
  it('fetch 返回正常结果时，返回 {available:true, candidate:{name,summary,source_url}}', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          webPages: {
            value: [
              {
                name: '测试科技有限公司',
                url: 'https://example.com/test-company',
                summary: '专注于人工智能领域的创新企业',
              },
            ],
          },
        },
      }),
    });

    const svc = makeService('test-key');
    const result = await svc.search('测试科技');

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.candidate).not.toBeNull();
      expect(result.candidate?.name).toBe('测试科技有限公司');
      expect(result.candidate?.source_url).toBe('https://example.com/test-company');
      expect(typeof result.candidate?.summary).toBe('string');
    }
  });

  it('fetch 返回空 webPages 时，返回 {available:true, candidate:null}', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { webPages: { value: [] } } }),
    });

    const svc = makeService('test-key');
    const result = await svc.search('完全不知名公司');

    expect(result).toEqual({ available: true, candidate: null });
  });

  it('缓存命中时不发起第二次 fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { webPages: { value: [{ name: 'A公司', url: 'https://a.com', summary: '简介' }] } },
      }),
    });

    const svc = makeService('test-key');
    await svc.search('缓存测试公司');
    await svc.search('缓存测试公司');

    // 第二次从缓存返回，fetch 只调用一次
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('CompanySearchService — 超时路径', () => {
  it('fetch abort 时返回 {available:false, reason:"timeout"}', async () => {
    fetchMock.mockImplementationOnce(() =>
      new Promise((_, reject) => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        // 模拟即时 abort
        setTimeout(() => reject(err), 10);
      }),
    );

    const svc = makeService('test-key');
    const result = await svc.search('超时测试公司ABC');

    expect(result).toEqual({ available: false, reason: 'timeout' });
  });
});

describe('CompanySearchService — 网络错误路径', () => {
  it('fetch 抛出普通 Error 时返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));

    const svc = makeService('test-key');
    const result = await svc.search('网络错误测试公司');

    expect(result).toEqual({ available: false, reason: 'error' });
  });
});
