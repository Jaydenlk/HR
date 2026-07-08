/**
 * occupation-seed-importer 单测:合规 fixture 成功导入且可查回;违规 fixture 被拒绝且不留
 * 部分写入(整批事务原子性)。用 better-sqlite3 :memory: + synchronize:true 起一个独立
 * DataSource(不依赖真实 Postgres,与仓库既有 e2e 用的驱动一致)。
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

  it('合规 fixture 成功导入,5 张表均可查回', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'valid'));

    expect(result.errors).toEqual([]);
    expect(result.importedSlugs.sort()).toEqual(['geotechnical-engineer-fixture', 'structural-engineer-building']);

    const slugRows = await ds.getRepository(OccupationSlug).find();
    expect(slugRows).toHaveLength(2);
    const structuralSlugRow = slugRows.find((r) => r.slug === 'structural-engineer-building');
    expect(structuralSlugRow?.name).toBe('房建结构工程师');
    expect(structuralSlugRow?.status).toBe('in_production');

    const entryRows = await ds.getRepository(OccupationEntry).find();
    expect(entryRows).toHaveLength(2);
    const structuralEntry = entryRows.find((r) => r.slug === 'structural-engineer-building');
    expect(structuralEntry?.status).toBe('validated');
    expect(structuralEntry?.axis).toBe('project_delivery');
    // skeleton 经 simple-json 序列化往返后仍是结构化对象,可直接取字段(证明 jsonb/simple-json 双端透明)。
    expect(structuralEntry?.skeleton.positioning.one_liner).toContain('结构安全');
    expect(structuralEntry?.skeleton.coordinates.adjacent_occupations.length).toBeGreaterThanOrEqual(3);

    const edgeRows = await ds.getRepository(OccupationEdge).find();
    expect(edgeRows).toHaveLength(1);
    expect(edgeRows[0]).toMatchObject({
      from_slug: 'structural-engineer-building',
      to_slug: 'geotechnical-engineer-fixture',
      type: 'adjacent',
    });

    const aliasRows = await ds.getRepository(OccupationAlias).find({ where: { slug: 'structural-engineer-building' } });
    expect(aliasRows).toHaveLength(2);
    expect(aliasRows.map((a) => a.alias).sort()).toEqual(['房建结构设计师', '结构工程师(房建)']);

    const evidenceRows = await ds.getRepository(OccupationEvidence).find({ where: { entry_slug: 'structural-engineer-building' } });
    expect(evidenceRows).toHaveLength(2);
    expect(evidenceRows.map((e) => e.verdict).sort()).toEqual(['confirmed', 'demoted_to_b']);

    // 第二个 slug 没有对应的 evidence 文件,应按空处理,不报错、不阻断。
    const evidenceForSecond = await ds.getRepository(OccupationEvidence).find({ where: { entry_slug: 'geotechnical-engineer-fixture' } });
    expect(evidenceForSecond).toHaveLength(0);
  });

  it('违规 fixture(缺层)被拒绝,errors 非空且 5 张表均不留部分写入', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'invalid-missing-layer'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field.includes('trend'))).toBe(true);

    expect(await ds.getRepository(OccupationSlug).count()).toBe(0);
    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
    expect(await ds.getRepository(OccupationEdge).count()).toBe(0);
    expect(await ds.getRepository(OccupationEvidence).count()).toBe(0);
    expect(await ds.getRepository(OccupationAlias).count()).toBe(0);
  });

  it('违规 fixture(edges 悬空引用)被拒绝,不留部分写入', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'invalid-dangling-edge'));

    expect(result.importedSlugs).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('悬空引用'))).toBe(true);

    expect(await ds.getRepository(OccupationSlug).count()).toBe(0);
    expect(await ds.getRepository(OccupationEntry).count()).toBe(0);
  });

  it('重复导入同一份合规内容是幂等的(边/别名不重复累积)', async () => {
    ds = await createTestDataSource();
    await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'valid'));
    const second = await importOccupationSeedContent(ds, path.join(FIXTURES_ROOT, 'valid'));

    expect(second.errors).toEqual([]);
    expect(await ds.getRepository(OccupationSlug).count()).toBe(2);
    expect(await ds.getRepository(OccupationEdge).count()).toBe(1);
    expect(await ds.getRepository(OccupationAlias).count({ where: { slug: 'structural-engineer-building' } })).toBe(2);
  });
});
