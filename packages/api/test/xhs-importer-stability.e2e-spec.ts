import { XhsImporterService } from '../src/feed/importers/xhs-importer.service';
import type { FeedSource } from '../src/feed/entities/feed-source.entity';

describe('XhsImporterService stability', () => {
  const originalBaseUrl = process.env.XHS_MCP_BASE_URL;
  const originalRetries = process.env.XHS_IMPORT_RETRIES;
  const originalTimeout = process.env.XHS_IMPORT_TIMEOUT_MS;
  const originalFetch = global.fetch;

  afterEach(() => {
    if (originalBaseUrl === undefined) delete process.env.XHS_MCP_BASE_URL;
    else process.env.XHS_MCP_BASE_URL = originalBaseUrl;
    if (originalRetries === undefined) delete process.env.XHS_IMPORT_RETRIES;
    else process.env.XHS_IMPORT_RETRIES = originalRetries;
    if (originalTimeout === undefined) delete process.env.XHS_IMPORT_TIMEOUT_MS;
    else process.env.XHS_IMPORT_TIMEOUT_MS = originalTimeout;
    global.fetch = originalFetch;
  });

  it('retries transient bridge failures before returning candidates', async () => {
    process.env.XHS_MCP_BASE_URL = 'http://localhost:18060';
    process.env.XHS_IMPORT_RETRIES = '1';
    process.env.XHS_IMPORT_TIMEOUT_MS = '1000';

    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('browser crashed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          feeds: [
            {
              title: '字节产品一面复盘',
              desc: '小红书真实面经内容',
              note_url: 'https://www.xiaohongshu.com/explore/test-note',
              user: { nickname: '候选人A' },
              liked_count: 12,
            },
          ],
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    const source = { name: '小红书校招面经', config_key: null } as FeedSource;
    const result = await new XhsImporterService().fetch(source, '字节 面经');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
    expect(result[0].source_url).toBe('https://www.xiaohongshu.com/explore/test-note');
  });
});
