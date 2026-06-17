import { Repository } from 'typeorm';
import { NewspaperService, RadarQuery } from '../src/feed/newspaper.service';
import { EvidenceService } from '../src/intelligence/evidence.service';
import { CompanyRegistryService } from '../src/feed/company-registry.service';
import { FeedItem } from '../src/feed/entities/feed-item.entity';

// Radar 分页 limit 服务端钳制(OOM 护栏)的单元级验证。
//
// getRadar 把入参 limit 钳到 [1, 100](未传/NaN → 20)后传给 QueryBuilder.take()。
// 这里用一个可链式调用的 QueryBuilder stub 捕获 .take() 的实参,直接断言钳后值——
// 既不必为「上限 100」播种 100+ 行,又能精确证明钳制值(返回 ≤100 是上限,而 take(100) 才是因)。
describe('Radar limit clamp (OOM 护栏,service 级)', () => {
  let service: NewspaperService;
  let takeCalls: number[];

  // 链式 QueryBuilder stub:记录 take 实参,所有链式方法返回自身,终结方法返回空集。
  function makeQb() {
    const qb: Record<string, unknown> = {};
    const chain = () => qb;
    for (const m of [
      'where', 'andWhere', 'orderBy', 'addOrderBy', 'skip',
      'select', 'addSelect', 'groupBy', 'limit',
    ]) {
      qb[m] = jest.fn(chain);
    }
    qb.take = jest.fn((n: number) => {
      takeCalls.push(n);
      return qb;
    });
    qb.getManyAndCount = jest.fn(() => Promise.resolve([[], 0]));
    qb.getRawMany = jest.fn(() => Promise.resolve([]));
    return qb;
  }

  beforeEach(() => {
    takeCalls = [];
    const feedRepo = {
      createQueryBuilder: jest.fn(() => makeQb()),
    } as unknown as Repository<FeedItem>;
    const evidence = {} as unknown as EvidenceService;
    const companyRegistry = {} as unknown as CompanyRegistryService;
    service = new NewspaperService(feedRepo, evidence, companyRegistry);
  });

  async function takeArgFor(query: RadarQuery): Promise<number> {
    await service.getRadar(query);
    // getRadar 只在「取 items」那条 QB 上调用 .take();stats 两条 QB 用 .limit()。
    expect(takeCalls).toHaveLength(1);
    return takeCalls[0];
  }

  it('limit=200 → 钳到 100(返回上限 ≤100)', async () => {
    expect(await takeArgFor({ limit: 200 })).toBe(100);
  });

  it('limit=101 → 钳到 100(恰好越界 1)', async () => {
    expect(await takeArgFor({ limit: 101 })).toBe(100);
  });

  it('limit=0 → 钳到 1(≥1)', async () => {
    expect(await takeArgFor({ limit: 0 })).toBe(1);
  });

  it('limit=-1 → 钳到 1(≥1)', async () => {
    expect(await takeArgFor({ limit: -1 })).toBe(1);
  });

  it('limit 省略 → 缺省 20', async () => {
    expect(await takeArgFor({})).toBe(20);
  });

  it('limit=NaN → 缺省 20', async () => {
    expect(await takeArgFor({ limit: Number.NaN })).toBe(20);
  });

  it('limit=50(正常范围内)→ 原样透传', async () => {
    expect(await takeArgFor({ limit: 50 })).toBe(50);
  });

  it('limit=100(恰好等于上限)→ 100', async () => {
    expect(await takeArgFor({ limit: 100 })).toBe(100);
  });

  it('limit=1(恰好等于下限)→ 1', async () => {
    expect(await takeArgFor({ limit: 1 })).toBe(1);
  });

  it('limit=37.9(小数)→ 向下取整 37', async () => {
    expect(await takeArgFor({ limit: 37.9 })).toBe(37);
  });
});
