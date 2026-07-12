/**
 * occupation-registry-importer 单测(TC-03,docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)。
 *
 * registry-v1.csv 是 occupation_slugs 的唯一权威输入:369 行真实数据,353 行 l2_scene 为空
 * 必须导入为 DB null(不是空串/哨兵文案)。用 better-sqlite3 :memory: + synchronize:true
 * 起独立 DataSource,与仓库既有 occupation-seed-importer.spec.ts 同一套约定,不依赖真实 Postgres。
 *
 * 违规场景（registry-invalid.csv 固定 5 条问题行覆盖 4 类缺陷:重复 slug/非法 L0/非法
 * l3_flag/非法 status）必须整批零写入,且错误定位到行号+字段。
 */
import * as path from 'path';
import { DataSource } from 'typeorm';
import { OccupationSlug } from '../src/occupations/entities/occupation-slug.entity';
import { importOccupationRegistry } from '../src/occupations/registry-importer';

const REAL_CSV_PATH = path.join(__dirname, '..', '..', '..', 'data', 'occupations', 'registry-v1.csv');
const INVALID_CSV_PATH = path.join(__dirname, 'fixtures', 'occupations', 'registry-invalid.csv');

async function createTestDataSource(): Promise<DataSource> {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [OccupationSlug],
    synchronize: true,
    logging: false,
  });
  await ds.initialize();
  return ds;
}

describe('importOccupationRegistry', () => {
  let ds: DataSource;

  afterEach(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('真实 registry-v1.csv 导入 369 行,零错误', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, REAL_CSV_PATH);

    expect(result.errors).toEqual([]);
    expect(result.importedCount).toBe(369);

    const rows = await ds.getRepository(OccupationSlug).find();
    expect(rows).toHaveLength(369);
  });

  it('353 个空 l2_scene 导入为 DB null(不是空串/哨兵文案)', async () => {
    ds = await createTestDataSource();
    await importOccupationRegistry(ds, REAL_CSV_PATH);

    const rows = await ds.getRepository(OccupationSlug).find();
    const nullL2Rows = rows.filter((r) => r.l2_scene === null);
    expect(nullL2Rows).toHaveLength(353);

    // 不允许空串/哨兵文案冒充 null
    const emptyStringRows = rows.filter((r) => r.l2_scene === '');
    expect(emptyStringRows).toHaveLength(0);
    const sentinelRows = rows.filter(
      (r) => typeof r.l2_scene === 'string' && /^(暂无数据|待补充|未知|TBD|不详|视情况而定)$/.test(r.l2_scene.trim()),
    );
    expect(sentinelRows).toHaveLength(0);
  });

  it('非空 l2_scene 原样落库(不受 null 化影响)', async () => {
    ds = await createTestDataSource();
    await importOccupationRegistry(ds, REAL_CSV_PATH);

    const rows = await ds.getRepository(OccupationSlug).find();
    const nonNullRows = rows.filter((r) => r.l2_scene !== null);
    expect(nonNullRows).toHaveLength(369 - 353);
    for (const r of nonNullRows) {
      expect(typeof r.l2_scene).toBe('string');
      expect((r.l2_scene as string).trim().length).toBeGreaterThan(0);
    }
  });

  it('重复导入同一份真实 CSV 幂等,仍是 369 行(按 slug upsert,不累积重复)', async () => {
    ds = await createTestDataSource();
    const first = await importOccupationRegistry(ds, REAL_CSV_PATH);
    const second = await importOccupationRegistry(ds, REAL_CSV_PATH);

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(first.importedCount).toBe(369);
    expect(second.importedCount).toBe(369);

    const rows = await ds.getRepository(OccupationSlug).find();
    expect(rows).toHaveLength(369);
  });

  it('批内重复 slug 整批失败零写入,错误定位到行号', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, INVALID_CSV_PATH);

    expect(result.importedCount).toBe(0);
    const rows = await ds.getRepository(OccupationSlug).find();
    expect(rows).toHaveLength(0);

    // registry-invalid.csv 第 2、3 数据行(文件行号 3、4)是重复 slug
    const dupError = result.errors.find((e) => e.field === 'slug' && /重复/.test(e.message));
    expect(dupError).toBeDefined();
    expect(dupError?.line).toBeGreaterThanOrEqual(2);
  });

  it('非法 L0 整批失败零写入,错误定位到行号+字段', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, INVALID_CSV_PATH);

    expect(result.importedCount).toBe(0);
    const l0Error = result.errors.find((e) => e.field === 'l0');
    expect(l0Error).toBeDefined();
    expect(l0Error?.line).toBe(4); // bad-l0-occupation 是文件第 4 行(含表头)
    expect(l0Error?.message).toMatch(/不存在的板块/);
  });

  it('非法 l3_flag(非 0/1)整批失败零写入,错误定位到行号+字段', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, INVALID_CSV_PATH);

    expect(result.importedCount).toBe(0);
    const l3Error = result.errors.find((e) => e.field === 'l3_flag');
    expect(l3Error).toBeDefined();
    expect(l3Error?.line).toBe(5); // bad-l3-flag-occupation 是文件第 5 行
    expect(l3Error?.message).toMatch(/yes/);
  });

  it('非法 status 整批失败零写入,错误定位到行号+字段', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, INVALID_CSV_PATH);

    expect(result.importedCount).toBe(0);
    const statusError = result.errors.find((e) => e.field === 'status');
    expect(statusError).toBeDefined();
    expect(statusError?.line).toBe(6); // bad-status-occupation 是文件第 6 行
    expect(statusError?.message).toMatch(/draft/);
  });

  it('整批失败时四类错误同时全部报出(不是发现第一个就短路)', async () => {
    ds = await createTestDataSource();
    const result = await importOccupationRegistry(ds, INVALID_CSV_PATH);

    expect(result.importedCount).toBe(0);
    const fields = new Set(result.errors.map((e) => e.field));
    expect(fields.has('slug')).toBe(true);
    expect(fields.has('l0')).toBe(true);
    expect(fields.has('l3_flag')).toBe(true);
    expect(fields.has('status')).toBe(true);
  });

  it('header 与约定不精确匹配时整批拒绝(防列错位静默写脏数据)', async () => {
    ds = await createTestDataSource();
    const badHeaderPath = path.join(__dirname, 'fixtures', 'occupations', 'registry-bad-header.csv');
    const fs = await import('fs');
    fs.writeFileSync(
      badHeaderPath,
      'slug,name,l0,l1_family,l2_scene,l3_flag\ncarbon-management-specialist,碳管理,通用职能,ESG,,0\n',
      'utf-8',
    );
    try {
      const result = await importOccupationRegistry(ds, badHeaderPath);
      expect(result.importedCount).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => /header|表头/.test(e.message))).toBe(true);
    } finally {
      fs.unlinkSync(badHeaderPath);
    }
  });
});
