/**
 * occupation-seed-importer 单测(TC-05,docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)。
 *
 * TC-05 定稿契约(替换 TC-01~04 遗留的旧契约):
 *  - 内容 importer 只消费**已注册**的 slug——每个内容文件的 slug 必须已存在于
 *    occupation_slugs(测试用直接造 slug 行模拟 registry importer 已跑过),否则整批失败,
 *    importer 绝不调用 slugRepo 建/改 occupation_slugs 行。
 *  - evidence 文件是**必需**的:缺失文件或文件内容为空数组,都是失败(不再是"缺失按空
 *    证据处理"的旧容忍契约)。
 *  - validated 只能由 occupation-coverage-gate 的 evaluateOccupationCoverageGate 计算,
 *    importer 不允许硬编码 status 或调用方传入 validated。
 *  - last_verified 一律写 null(门B 才引入真实 verified_at),不得用 new Date()。
 *  - claim_id 在导入过程中原样保留(不重新生成),验证"往返不变"。
 *
 * 用 better-sqlite3 :memory: + synchronize:true 起一个独立 DataSource(不依赖真实 Postgres,
 * 与仓库既有 e2e 用的驱动一致)。
 */
import * as path from 'path';
import { DataSource } from 'typeorm';
import { OccupationSlug } from '../src/occupations/entities/occupation-slug.entity';
import { OccupationEntry } from '../src/occupations/entities/occupation-entry.entity';
import { OccupationEdge } from '../src/occupations/entities/occupation-edge.entity';
import { OccupationEvidence } from '../src/occupations/entities/occupation-evidence.entity';
import { OccupationAlias } from '../src/occupations/entities/occupation-alias.entity';
import { importOccupationSeedContent } from '../src/occupations/seed-importer';

const FIXTURES_ROOT = path.join(__dirname, 'fixtures', 'occupations');

async function createTestDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [OccupationSlug, OccupationEntry, OccupationEdge, OccupationEvidence, OccupationAlias],
    synchronize: true,
    logging: false,
  });
  await ds.initialize();
  return ds;
}

/**
 * 预注册一个 slug 行,模拟 registry importer(TC-03)已经跑过——内容 importer 本卡的
 * 核心红线之一就是「不建/改 occupation_slugs」,所以测试必须自己先把 slug 行准备好,
 * 并在断言里核对内容导入后这行的注册表元数据 (name/l0/l1_family/l2_scene/l3_flag/status)
 * 分毫未被内容文件覆盖。
 */
async function preRegisterSlug(
  ds: DataSource,
  slug: string,
  overrides: Partial<{ name: string; l0: string; l1_family: string; l2_scene: string | null; l3_flag: boolean; status: string }> = {},
): Promise<void> {
  const repo = ds.getRepository(OccupationSlug);
  await repo.save(
    repo.create({
      slug,
      name: overrides.name ?? `${slug}-注册表名称`,
      l0: (overrides.l0 ?? '工程技术') as OccupationSlug['l0'],
      l1_family: overrides.l1_family ?? '测试族',
      l2_scene: overrides.l2_scene ?? null,
      l3_flag: overrides.l3_flag ?? false,
      status: (overrides.status ?? 'in_production') as OccupationSlug['status'],
    }),
  );
}

describe('importOccupationSeedContent', () => {
  let ds: DataSource;

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('源目录不存在时优雅返回"无内容可导入",不抛错、不写库', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'does-not-exist'));
    expect(result.errors).toEqual([]);
    expect(result.importedSlugs).toEqual([]);
    expect(result.message).toMatch(/无内容可导入/);
  });

  it('occupations 目录存在但为空时优雅返回"无内容可导入"', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'empty'));
    expect(result.errors).toEqual([]);
    expect(result.importedSlugs).toEqual([]);
    expect(result.message).toMatch(/无内容可导入/);
  });

  it('合规 fixture(gate 全过)成功导入,5 张表均可查回,status/last_verified 由 gate 计算', async () => {
    ds = await createTestDataSource();
    // 预注册两个 slug:content-importer-fixture-a 是内容文件本体,
    // content-importer-fixture-b 是 edge 指向的第二 slug(不带内容文件,验证 edges
    // 检查的 knownSlugs 只来自 DB registry,不需要该 slug 也有内容文件)。
    await preRegisterSlug(ds, 'content-importer-fixture-a', { name: '内容导入测试职业甲(注册表名)' });
    await preRegisterSlug(ds, 'content-importer-fixture-b', { name: '内容导入测试职业乙(注册表名)' });

    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-valid'));

    expect(result.errors).toEqual([]);
    expect(result.importedSlugs).toEqual(['content-importer-fixture-a']);

    // 注册表元数据不被内容文件覆盖(内容文件里根本没有 name/l0/l1_family/l2_scene/l3_flag
    // 这些字段——OccupationSeedFile 已收缩,想覆盖也覆盖不了;这里断言导入后仍是预注册值)。
    const slugRow = await ds.getRepository(OccupationSlug).findOne({ where: { slug: 'content-importer-fixture-a' } });
    expect(slugRow?.name).toBe('内容导入测试职业甲(注册表名)');
    expect(slugRow?.l1_family).toBe('测试族');
    expect(slugRow?.status).toBe('in_production');

    const entryRow = await ds.getRepository(OccupationEntry).findOne({ where: { slug: 'content-importer-fixture-a' } });
    expect(entryRow).not.toBeNull();
    expect(entryRow?.axis).toBe('project_delivery');
    // status 只能由 coverage gate 计算得出,13 条 directly_supported claim 全覆盖 → validated。
    expect(entryRow?.status).toBe('validated');
    // last_verified 门A 阶段一律 null,不得用 new Date()(门B 才引入真实 verified_at)。
    expect(entryRow?.last_verified).toBeNull();

    const edgeRows = await ds.getRepository(OccupationEdge).find({ where: { from_slug: 'content-importer-fixture-a' } });
    expect(edgeRows).toHaveLength(1);
    expect(edgeRows[0]).toMatchObject({
      from_slug: 'content-importer-fixture-a',
      to_slug: 'content-importer-fixture-b',
      type: 'adjacent',
    });

    const aliasRows = await ds.getRepository(OccupationAlias).find({ where: { slug: 'content-importer-fixture-a' } });
    expect(aliasRows).toHaveLength(2);
    expect(aliasRows.map((a) => a.alias).sort()).toEqual(['内容导入测试别名乙', '内容导入测试别名甲']);

    const evidenceRows = await ds.getRepository(OccupationEvidence).find({ where: { entry_slug: 'content-importer-fixture-a' } });
    expect(evidenceRows).toHaveLength(13);
    expect(evidenceRows.every((e) => e.verdict === 'directly_supported')).toBe(true);
    // evidence 的 last_verified 同样门A 一律 null。
    expect(evidenceRows.every((e) => e.last_verified === null)).toBe(true);

    // claim_id 往返不变:导入前后 claim_id 集合完全一致(不重新生成/不改写)。
    const expectedClaimIds = [
      '018f0a10-0000-7000-8000-000000000001',
      '018f0a10-0000-7000-8000-000000000002',
      '018f0a10-0000-7000-8000-000000000003',
      '018f0a10-0000-7000-8000-000000000004',
      '018f0a10-0000-7000-8000-000000000005',
      '018f0a10-0000-7000-8000-000000000006',
      '018f0a10-0000-7000-8000-000000000007',
      '018f0a10-0000-7000-8000-000000000008',
      '018f0a10-0000-7000-8000-000000000009',
      '018f0a10-0000-7000-8000-00000000000a',
      '018f0a10-0000-7000-8000-00000000000b',
      '018f0a10-0000-7000-8000-00000000000c',
      '018f0a10-0000-7000-8000-00000000000d',
    ];
    expect(evidenceRows.map((e) => e.claim_id).sort()).toEqual([...expectedClaimIds].sort());
  });

  it('未注册 slug 整批失败,5 张表零新增(内容 importer 禁止自动建 slug)', async () => {
    ds = await createTestDataSource();
    // 刻意不预注册 content-importer-fixture-unregistered——这是本卡的核心红线:
    // 内容 importer 只消费已注册 slug,绝不能像旧版那样"发现新 slug 就顺手建一行"。
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-unregistered'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('未注册') || e.message.includes('occupation_slugs'))).toBe(true);

    expect(await ds.getRepository(OccupationSlug).count()).toBe(0);
    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
    expect(await ds.getRepository(OccupationEdge).count()).toBe(0);
    expect(await ds.getRepository(OccupationEvidence).count()).toBe(0);
    expect(await ds.getRepository(OccupationAlias).count()).toBe(0);
  });

  it('evidence 文件缺失整批失败(废止旧契约"缺失按空证据处理,不视为失败")', async () => {
    ds = await createTestDataSource();
    await preRegisterSlug(ds, 'content-importer-fixture-missing-evidence');

    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-missing-evidence'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('证据') || e.message.includes('evidence'))).toBe(true);

    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
    expect(await ds.getRepository(OccupationEvidence).count()).toBe(0);
    // slug 行本身是测试预注册的,不受导入失败影响,但也不应被内容 importer 二次改动。
    expect(await ds.getRepository(OccupationSlug).count()).toBe(1);
  });

  it('evidence 文件为空数组整批失败', async () => {
    ds = await createTestDataSource();
    await preRegisterSlug(ds, 'content-importer-fixture-empty-evidence');

    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-empty-evidence'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('证据') || e.message.includes('evidence'))).toBe(true);

    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
    expect(await ds.getRepository(OccupationEvidence).count()).toBe(0);
  });

  it('coverage gate 不全通过时整批失败(缺层 fixture 仍先于 gate 在结构校验层被拒)', async () => {
    ds = await createTestDataSource();
    await preRegisterSlug(ds, 'broken-missing-layer');
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'invalid-missing-layer'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field.includes('trend'))).toBe(true);

    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
    expect(await ds.getRepository(OccupationEdge).count()).toBe(0);
    expect(await ds.getRepository(OccupationEvidence).count()).toBe(0);
    expect(await ds.getRepository(OccupationAlias).count()).toBe(0);
  });

  it('违规 fixture(edges 悬空引用)被拒绝,不留部分写入(knownSlugs 只来自 DB,内容文件 slug 不自动加入)', async () => {
    ds = await createTestDataSource();
    // 预注册 broken-dangling-edge 本体,但刻意不注册 edges 指向的 ghost-slug-not-registered——
    // 验证 knownSlugs 严格只来自 DB,不会把同批内容文件的 slug 自动并入放行悬空引用。
    await preRegisterSlug(ds, 'broken-dangling-edge');
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'invalid-dangling-edge'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('悬空引用'))).toBe(true);

    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
  });

  it('重复导入同一份合规内容是幂等的(边/别名不重复累积,claim_id 不重新生成)', async () => {
    ds = await createTestDataSource();
    await preRegisterSlug(ds, 'content-importer-fixture-a');
    await preRegisterSlug(ds, 'content-importer-fixture-b');

    const first = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-valid'));
    const firstClaimIds = (await ds.getRepository(OccupationEvidence).find({ where: { entry_slug: 'content-importer-fixture-a' } }))
      .map((e) => e.claim_id)
      .sort();

    const second = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'importer-valid'));

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(await ds.getRepository(OccupationSlug).count()).toBe(2);
    expect(await ds.getRepository(OccupationEdge).count()).toBe(1);
    expect(await ds.getRepository(OccupationAlias).count({ where: { slug: 'content-importer-fixture-a' } })).toBe(2);

    const secondClaimIds = (await ds.getRepository(OccupationEvidence).find({ where: { entry_slug: 'content-importer-fixture-a' } }))
      .map((e) => e.claim_id)
      .sort();
    // claim_id 往返不变:重复导入同一份内容,claim_id 集合不因重新生成而改变。
    expect(secondClaimIds).toEqual(firstClaimIds);
    expect(await ds.getRepository(OccupationEvidence).count({ where: { entry_slug: 'content-importer-fixture-a' } })).toBe(13);
  });
});
