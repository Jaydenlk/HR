import { FeedIngestionService } from '../src/feed/feed-ingestion.service';
import { WechatImporterService } from '../src/feed/importers/wechat-importer.service';
import { RssImporterService } from '../src/feed/importers/rss-importer.service';
import type { FeedImporter } from '../src/feed/importers/feed-importer.interface';
import type { FeedSource } from '../src/feed/entities/feed-source.entity';
import type { DigestRun } from '../src/feed/entities/digest-run.entity';

describe('FeedIngestionService stability', () => {
  const originalTimeout = process.env.FEED_SOURCE_TIMEOUT_MS;

  afterEach(() => {
    if (originalTimeout === undefined) {
      delete process.env.FEED_SOURCE_TIMEOUT_MS;
    } else {
      process.env.FEED_SOURCE_TIMEOUT_MS = originalTimeout;
    }
  });

  function buildService(overrides: {
    xhs?: FeedImporter;
    nowcoder?: FeedImporter;
    wechat?: FeedImporter;
    registry?: Record<string, jest.Mock>;
  } = {}) {
    let runCounter = 0;
    const savedRuns: DigestRun[] = [];

    const runsRepo = {
      find: jest.fn(),
      create: jest.fn((input: Partial<DigestRun>) => input as DigestRun),
      save: jest.fn(async (run: DigestRun) => {
        if (!run.id) run.id = `run-${++runCounter}`;
        savedRuns.push({ ...run });
        return run;
      }),
    };

    const registry = {
      findOne: jest.fn(),
      findActive: jest.fn(async () => [
        { id: 'xhs-source', kind: 'xhs', name: '小红书', status: 'active', config_key: null } as FeedSource,
        { id: 'nowcoder-source', kind: 'nowcoder', name: '牛客', status: 'active', config_key: null } as FeedSource,
      ]),
      markRun: jest.fn(async () => undefined),
      recordSuccess: jest.fn(async () => undefined),
      recordFailure: jest.fn(async () => undefined),
      ...overrides.registry,
    };

    const feed = { existsExternal: jest.fn(async () => false), saveExternal: jest.fn() };
    const classifier = { classify: jest.fn() };
    const searchScheduler = { planDailyJobs: jest.fn(async () => []), executeJobs: jest.fn() };
    const recruitIntel = { weeklySheetLinkIngest: jest.fn(async () => undefined) };
    const digestGenerator = { generateWeeklyDigest: jest.fn(async () => ({ status: 'empty', message: 'stub' })) };

    const defaultImporter: FeedImporter = { kind: 'xhs', fetch: jest.fn(async () => []) };
    const xhs = overrides.xhs ?? defaultImporter;
    const nowcoder = overrides.nowcoder ?? { kind: 'nowcoder', fetch: jest.fn(async () => []) };
    const wechat = overrides.wechat ?? { kind: 'wechat', fetch: jest.fn(async () => []) };

    const service = new FeedIngestionService(
      runsRepo as never,
      registry as never,
      feed as never,
      classifier as never,
      nowcoder as never,
      wechat as never,
      xhs as never,
      searchScheduler as never,
      recruitIntel as never,
      digestGenerator as never,
    );

    return { service, savedRuns, registry, feed, classifier };
  }

  it('marks a timed-out source failed and continues importing the remaining sources', async () => {
    process.env.FEED_SOURCE_TIMEOUT_MS = '20';

    const hangingXhs: FeedImporter = { kind: 'xhs', fetch: jest.fn(() => new Promise(() => undefined)) };
    const healthyNowcoder: FeedImporter = { kind: 'nowcoder', fetch: jest.fn(async () => []) };

    const { service, savedRuns, registry } = buildService({ xhs: hangingXhs, nowcoder: healthyNowcoder });

    const result = await service.import({});

    expect(result.runs).toHaveLength(2);
    expect(result.runs[0].source_id).toBe('xhs-source');
    expect(result.runs[0].status).toBe('failed');
    expect(result.runs[0].error_message).toContain('timed out');
    expect(result.runs[1].source_id).toBe('nowcoder-source');
    expect(result.runs[1].status).toBe('success');
    expect(healthyNowcoder.fetch).toHaveBeenCalledTimes(1);
    expect(savedRuns.some((r) => r.source_id === 'xhs-source' && r.status === 'failed')).toBe(true);

    // Health tracking: failed source gets recordFailure, success gets recordSuccess
    expect(registry.recordFailure).toHaveBeenCalledWith('xhs-source', expect.stringContaining('timed out'));
    expect(registry.recordSuccess).toHaveBeenCalledWith('nowcoder-source');
  });

  it('source that throws gets recordFailure, other source unaffected', async () => {
    const throwingXhs: FeedImporter = {
      kind: 'xhs',
      fetch: jest.fn(async () => { throw new Error('bridge crashed'); }),
    };
    const healthyNowcoder: FeedImporter = { kind: 'nowcoder', fetch: jest.fn(async () => []) };

    const { service, registry } = buildService({ xhs: throwingXhs, nowcoder: healthyNowcoder });

    const result = await service.import({});

    expect(result.runs[0].status).toBe('failed');
    expect(result.runs[1].status).toBe('success');
    expect(registry.recordFailure).toHaveBeenCalledWith('xhs-source', 'bridge crashed');
    expect(registry.recordSuccess).toHaveBeenCalledWith('nowcoder-source');
  });

  it('both sources succeed → both get recordSuccess', async () => {
    const { service, registry } = buildService();

    await service.import({});

    expect(registry.recordSuccess).toHaveBeenCalledTimes(2);
    expect(registry.recordFailure).not.toHaveBeenCalled();
  });
});

describe('WechatImporterService — login failure transparency', () => {
  const originalEnv = process.env.WECHAT_SOURCE_FEEDS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WECHAT_SOURCE_FEEDS;
    } else {
      process.env.WECHAT_SOURCE_FEEDS = originalEnv;
    }
    jest.restoreAllMocks();
  });

  function makeFakeSource(): FeedSource {
    return { id: 'w1', kind: 'wechat', name: '公众号测试', status: 'active', config_key: null } as FeedSource;
  }

  it('throws when login returns HTTP error — not silently returns []', async () => {
    process.env.WECHAT_SOURCE_FEEDS = 'http://fake-wemp.local';

    // Simulate login endpoint returning 401
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    } as Response);

    const svc = new WechatImporterService();
    await expect(svc.fetch(makeFakeSource())).rejects.toThrow();
  });

  it('throws when login fetch throws network error — not silently returns []', async () => {
    process.env.WECHAT_SOURCE_FEEDS = 'http://fake-wemp.local';

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    const svc = new WechatImporterService();
    await expect(svc.fetch(makeFakeSource())).rejects.toThrow('ECONNREFUSED');
  });
});

describe('RssImporterService — configured but all URLs fail', () => {
  const originalEnv = process.env.RSS_FEED_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RSS_FEED_URL;
    } else {
      process.env.RSS_FEED_URL = originalEnv;
    }
  });

  it('throws when all RSS URLs fail — not silently returns []', async () => {
    process.env.RSS_FEED_URL = 'http://rss-that-does-not-exist.invalid/feed.xml';

    const svc = new RssImporterService();
    const fakeSource = { id: 'r1', kind: 'nowcoder', name: '牛客RSS', status: 'active', config_key: null } as FeedSource;

    await expect(svc.fetch(fakeSource)).rejects.toThrow();
  });
});
