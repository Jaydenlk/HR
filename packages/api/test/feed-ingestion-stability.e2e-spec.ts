import { FeedIngestionService } from '../src/feed/feed-ingestion.service';
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

  it('marks a timed-out source failed and continues importing the remaining sources', async () => {
    process.env.FEED_SOURCE_TIMEOUT_MS = '20';

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

    const xhsSource = { id: 'xhs-source', kind: 'xhs', name: '小红书', status: 'active', config_key: null } as FeedSource;
    const nowcoderSource = { id: 'nowcoder-source', kind: 'nowcoder', name: '牛客', status: 'active', config_key: null } as FeedSource;

    const registry = {
      findOne: jest.fn(),
      findActive: jest.fn(async () => [xhsSource, nowcoderSource]),
      markRun: jest.fn(async () => undefined),
    };
    const feed = {
      existsExternal: jest.fn(),
      saveExternal: jest.fn(),
    };
    const classifier = {
      classify: jest.fn(),
    };
    const hangingXhs: FeedImporter = {
      kind: 'xhs',
      fetch: jest.fn(() => new Promise(() => undefined)),
    };
    const healthyNowcoder: FeedImporter = {
      kind: 'nowcoder',
      fetch: jest.fn(async () => []),
    };
    const wechat: FeedImporter = {
      kind: 'wechat',
      fetch: jest.fn(async () => []),
    };

    const service = new FeedIngestionService(
      runsRepo as never,
      registry as never,
      feed as never,
      classifier as never,
      healthyNowcoder as never,
      wechat as never,
      hangingXhs as never,
    );

    const result = await service.import({});

    expect(result.runs).toHaveLength(2);
    expect(result.runs[0].source_id).toBe('xhs-source');
    expect(result.runs[0].status).toBe('failed');
    expect(result.runs[0].error_message).toContain('timed out');
    expect(result.runs[1].source_id).toBe('nowcoder-source');
    expect(result.runs[1].status).toBe('success');
    expect(healthyNowcoder.fetch).toHaveBeenCalledTimes(1);
    expect(savedRuns.some((run) => run.source_id === 'xhs-source' && run.status === 'failed')).toBe(true);
  });
});
