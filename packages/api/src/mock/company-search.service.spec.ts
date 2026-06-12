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

  it('超时后第二次调用重新发起 fetch，不走缓存', async () => {
    // 第一次：超时
    fetchMock.mockImplementationOnce(() =>
      new Promise((_, reject) => {
        const err = new Error('The user aborted a request.');
        err.name = 'AbortError';
        setTimeout(() => reject(err), 10);
      }),
    );
    // 第二次：成功
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          webPages: {
            value: [{ name: '重试公司', url: 'https://retry.com', summary: '重试成功' }],
          },
        },
      }),
    });

    const svc = makeService('test-key');
    const first = await svc.search('重试测试公司XYZ');
    expect(first).toEqual({ available: false, reason: 'timeout' });

    const second = await svc.search('重试测试公司XYZ');
    expect(second.available).toBe(true);

    // 超时不缓存，所以第二次真实发起了 fetch，总共 2 次
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

describe('CompanySearchService — HTTP 状态语义', () => {
  it('HTTP 401 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const svc = makeService('test-key');
    const result = await svc.search('401测试公司');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('HTTP 403 返回 {available:false, reason:"no_key"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const svc = makeService('test-key');
    const result = await svc.search('403测试公司');
    expect(result).toEqual({ available: false, reason: 'no_key' });
  });

  it('其他非 2xx（如 500）返回 {available:false, reason:"error"}', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    const svc = makeService('test-key');
    const result = await svc.search('500测试公司');
    expect(result).toEqual({ available: false, reason: 'error' });
  });

  it('HTTP 非 2xx 时不写缓存，第二次调用重新发起 fetch', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { webPages: { value: [{ name: '恢复公司', url: 'https://ok.com', summary: '恢复了' }] } },
      }),
    });

    const svc = makeService('test-key');
    await svc.search('缓存语义测试公司');
    const second = await svc.search('缓存语义测试公司');

    expect(second.available).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
