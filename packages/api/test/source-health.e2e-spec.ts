import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SourceRegistryService } from '../src/feed/source-registry.service';
import { RssImporterService } from '../src/feed/importers/rss-importer.service';
import { FeedSource } from '../src/feed/entities/feed-source.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

function createSourceData(overrides: Partial<FeedSource> = {}): Partial<FeedSource> {
  return {
    kind: 'nowcoder',
    name: 'Test Source',
    homepage_url: null,
    config_key: null,
    status: 'active',
    description: null,
    fail_count: 0,
    success_count: 0,
    last_success_at: null,
    last_failure_at: null,
    last_error: null,
    health: 'unknown',
    ...overrides,
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Source Health Tracking (standalone)', () => {
  let moduleRef: TestingModule;
  let registry: SourceRegistryService;
  let sourceRepo: Repository<FeedSource>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          synchronize: true,
          entities: [FeedSource],
        }),
        TypeOrmModule.forFeature([FeedSource]),
      ],
      providers: [SourceRegistryService],
    })
      .overrideProvider(SourceRegistryService)
      .useFactory({
        factory: (repo: Repository<FeedSource>) => {
          // Build SourceRegistryService but skip onModuleInit (no seed file in tests)
          const svc = new SourceRegistryService(repo);
          // Override ensureDefaults to no-op so init doesn't try to read seed file
          svc.ensureDefaults = async () => {};
          return svc;
        },
        inject: [getRepositoryToken(FeedSource)],
      })
      .compile();

    registry = moduleRef.get(SourceRegistryService);
    sourceRepo = moduleRef.get<Repository<FeedSource>>(getRepositoryToken(FeedSource));
  }, 30000);

  afterAll(async () => {
    await moduleRef.close();
  });

  // ── 1. recordSuccess clears fail_count, sets last_success_at, health=healthy
  it('recordSuccess: fail_count clears, last_success_at updates, health=healthy', async () => {
    const source = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Success Test', fail_count: 2, health: 'degraded' }),
      ),
    );

    await registry.recordSuccess(source.id);

    const updated = await sourceRepo.findOne({ where: { id: source.id } });
    expect(updated).not.toBeNull();
    expect(updated!.fail_count).toBe(0);
    expect(updated!.success_count).toBe(1);
    expect(updated!.health).toBe('healthy');
    expect(updated!.last_success_at).not.toBeNull();
    expect(updated!.last_run_at).not.toBeNull();
  });

  // ── 2. recordFailure: fail_count increments, last_error set, health=degraded
  it('recordFailure: fail_count increments, last_error set, health=degraded', async () => {
    const source = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Failure Test', fail_count: 0, health: 'healthy' }),
      ),
    );

    await registry.recordFailure(source.id, 'connection error');

    const updated = await sourceRepo.findOne({ where: { id: source.id } });
    expect(updated).not.toBeNull();
    expect(updated!.fail_count).toBe(1);
    expect(updated!.last_error).toBe('connection error');
    expect(updated!.health).toBe('degraded');
    expect(updated!.last_failure_at).not.toBeNull();
  });

  // ── 3. 3 failures → health=down
  it('3 failures set health to down', async () => {
    const source = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Down Test' }),
      ),
    );

    await registry.recordFailure(source.id, 'error 1');
    await registry.recordFailure(source.id, 'error 2');
    await registry.recordFailure(source.id, 'error 3');

    const updated = await sourceRepo.findOne({ where: { id: source.id } });
    expect(updated).not.toBeNull();
    expect(updated!.health).toBe('down');
    expect(updated!.fail_count).toBe(3);
  });

  // ── 4. Single source failure does not affect others
  it('single source failure does not affect other sources', async () => {
    const sourceA = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Source A' }),
      ),
    );
    const sourceB = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Source B' }),
      ),
    );

    await registry.recordFailure(sourceA.id, 'A failed');

    const updatedB = await sourceRepo.findOne({ where: { id: sourceB.id } });
    expect(updatedB).not.toBeNull();
    expect(updatedB!.health).toBe('unknown');
    expect(updatedB!.fail_count).toBe(0);
    expect(updatedB!.last_error).toBeNull();
  });

  // ── 5. recordSuccess on non-existent source does not throw
  it('recordSuccess on non-existent source does not throw', async () => {
    await expect(
      registry.recordSuccess('00000000-0000-0000-0000-000000000000'),
    ).resolves.toBeUndefined();
  });

  // ── 6. recordFailure on non-existent source does not throw
  it('recordFailure on non-existent source does not throw', async () => {
    await expect(
      registry.recordFailure('00000000-0000-0000-0000-000000000000', 'error'),
    ).resolves.toBeUndefined();
  });

  // ── 7. Recovery: success after failures resets to healthy
  it('success after multiple failures resets health to healthy', async () => {
    const source = await sourceRepo.save(
      sourceRepo.create(
        createSourceData({ name: 'Recovery Test' }),
      ),
    );

    await registry.recordFailure(source.id, 'error 1');
    await registry.recordFailure(source.id, 'error 2');
    await registry.recordFailure(source.id, 'error 3');

    let updated = await sourceRepo.findOne({ where: { id: source.id } });
    expect(updated!.health).toBe('down');

    await registry.recordSuccess(source.id);

    updated = await sourceRepo.findOne({ where: { id: source.id } });
    expect(updated!.health).toBe('healthy');
    expect(updated!.fail_count).toBe(0);
    expect(updated!.success_count).toBe(1);
  });
});

// ── Nowcoder multi-URL fallback tests ─────────────────────────────────────────

describe('RssImporterService multi-URL fallback', () => {
  let moduleRef: TestingModule;
  let rssService: RssImporterService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [RssImporterService],
    }).compile();

    rssService = moduleRef.get(RssImporterService);
  }, 30000);

  afterAll(async () => {
    await moduleRef.close();
  });

  afterEach(() => {
    delete process.env.TEST_RSS_URL;
    jest.restoreAllMocks();
  });

  // ── 5. First URL fails, second succeeds
  it('falls back to second URL when first fails', async () => {
    process.env.TEST_RSS_URL = 'http://fail.example.com/rss,http://success.example.com/rss';

    const mockItems = [
      { title: 'Test Article', link: 'http://example.com/1', content: 'content' },
    ];

    // Access the private parser to mock parseURL
    const parser = (rssService as unknown as { parser: { parseURL: jest.Mock } }).parser;
    const originalParseURL = parser.parseURL.bind(parser);
    let callCount = 0;
    jest.spyOn(parser, 'parseURL').mockImplementation(async (url: string) => {
      callCount++;
      if (url === 'http://fail.example.com/rss') {
        throw new Error('Connection refused');
      }
      // second URL succeeds
      return { items: mockItems };
    });

    const source = {
      id: 'test-id',
      kind: 'nowcoder',
      name: 'Nowcoder Test',
      config_key: 'TEST_RSS_URL',
      status: 'active',
      homepage_url: null,
      description: null,
      last_run_at: null,
      fail_count: 0,
      success_count: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      health: 'unknown',
      created_at: new Date(),
      updated_at: new Date(),
    } as FeedSource;

    const result = await rssService.fetch(source);

    expect(callCount).toBe(2);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Test Article');
  });

  // ── 6. All URLs fail: throws error
  it('throws when all URLs fail', async () => {
    process.env.TEST_RSS_URL = 'http://fail1.example.com/rss,http://fail2.example.com/rss';

    const parser = (rssService as unknown as { parser: { parseURL: jest.Mock } }).parser;
    jest.spyOn(parser, 'parseURL').mockImplementation(async () => {
      throw new Error('Connection refused');
    });

    const source = {
      id: 'test-id',
      kind: 'nowcoder',
      name: 'Nowcoder Test',
      config_key: 'TEST_RSS_URL',
      status: 'active',
      homepage_url: null,
      description: null,
      last_run_at: null,
      fail_count: 0,
      success_count: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      health: 'unknown',
      created_at: new Date(),
      updated_at: new Date(),
    } as FeedSource;

    await expect(rssService.fetch(source)).rejects.toThrow('Connection refused');
  });

  // ── 7. Single URL still works
  it('single URL works without fallback', async () => {
    process.env.TEST_RSS_URL = 'http://single.example.com/rss';

    const parser = (rssService as unknown as { parser: { parseURL: jest.Mock } }).parser;
    jest.spyOn(parser, 'parseURL').mockImplementation(async () => {
      return {
        items: [
          { title: 'Single', link: 'http://example.com/1', content: 'body' },
        ],
      };
    });

    const source = {
      id: 'test-id',
      kind: 'nowcoder',
      name: 'Single URL Test',
      config_key: 'TEST_RSS_URL',
      status: 'active',
      homepage_url: null,
      description: null,
      last_run_at: null,
      fail_count: 0,
      success_count: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      health: 'unknown',
      created_at: new Date(),
      updated_at: new Date(),
    } as FeedSource;

    const result = await rssService.fetch(source);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Single');
  });

  // ── 8. No URL configured returns empty
  it('returns empty array when no URL is configured', async () => {
    delete process.env.TEST_RSS_URL;
    delete process.env.RSS_FEED_URL;

    const source = {
      id: 'test-id',
      kind: 'nowcoder',
      name: 'No URL Test',
      config_key: 'TEST_RSS_URL',
      status: 'active',
      homepage_url: null,
      description: null,
      last_run_at: null,
      fail_count: 0,
      success_count: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      health: 'unknown',
      created_at: new Date(),
      updated_at: new Date(),
    } as FeedSource;

    const result = await rssService.fetch(source);
    expect(result).toEqual([]);
  });

  // ── 9. URL splitting handles spaces and empty entries
  it('handles commas with spaces and empty entries in URL list', async () => {
    process.env.TEST_RSS_URL = ' http://a.com/rss , , http://b.com/rss , ';

    const parser = (rssService as unknown as { parser: { parseURL: jest.Mock } }).parser;
    const calledUrls: string[] = [];
    jest.spyOn(parser, 'parseURL').mockImplementation(async (url: string) => {
      calledUrls.push(url);
      return { items: [{ title: 'OK', link: 'http://a.com/1', content: '' }] };
    });

    const source = {
      id: 'test-id',
      kind: 'nowcoder',
      name: 'Spacing Test',
      config_key: 'TEST_RSS_URL',
      status: 'active',
      homepage_url: null,
      description: null,
      last_run_at: null,
      fail_count: 0,
      success_count: 0,
      last_success_at: null,
      last_failure_at: null,
      last_error: null,
      health: 'unknown',
      created_at: new Date(),
      updated_at: new Date(),
    } as FeedSource;

    const result = await rssService.fetch(source);

    // Should have called the first valid URL and returned immediately
    expect(calledUrls).toEqual(['http://a.com/rss']);
    expect(result.length).toBe(1);
  });
});
