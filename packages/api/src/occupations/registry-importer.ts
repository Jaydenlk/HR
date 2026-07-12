/**
 * 职业维基 · 门A · registry importer(TC-03,docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)
 *
 * registry-v1.csv(369 行)是 occupation_slugs 表的唯一权威输入——与 seed-importer.ts(消费
 * content/occupations/<slug>.json 生产内容)物理分离:本文件只认 registry CSV 六列元数据,
 * 不读 content JSON,不导 aliases/edges/entries/evidence(那些是内容导入器的职责,归 TC-05)。
 *
 * 353 行 l2_scene 在 CSV 里是空字符串(该职业尚无 L2 场景细分),必须落库为 DB null,
 * 不得写成空串或"未知/待补充"等哨兵文案冒充有值(T3-registry-v2-review.md 已指出:
 * 不能直接复用 seed-importer.ts 的 isNonEmptyString 校验链,那套会把 l2_scene 误杀)。
 *
 * 校验顺序:先解析整个 CSV → 逐行做六项规则校验(累计全部错误,不因第一条错误就短路,
 * 便于一次性看清整批问题)→ 只要有一条错误,整批零写入(不开事务) → 全部通过才开一个
 * 事务,按 slug upsert 写入(重复导入同一份 CSV 幂等,不产生重复行/不重复计数)。
 */
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';
import type { DataSource } from 'typeorm';
import { OccupationSlug } from './entities/occupation-slug.entity';
import type { L0Board, OccupationSlugStatus } from './occupation.types';

const EXPECTED_HEADER = ['slug', 'name', 'l0', 'l1_family', 'l2_scene', 'l3_flag', 'status'] as const;

const VALID_L0 = new Set<L0Board>(['通用职能', '工程技术', '创意服务', '产业专业', 'AI新兴', '公共制度']);
const VALID_L3_FLAG = new Set(['0', '1']);
const VALID_STATUS = new Set<OccupationSlugStatus>(['planned', 'in_production', 'published', 'parked']);

export interface RegistryImportError {
  /** 该问题所在的原始 CSV 文件行号(1-based,含表头行;表头本身的问题记 line 1)。 */
  line: number;
  /** 定位到具体列名;跨行问题(如重复 slug)记 'slug'。 */
  field: string;
  message: string;
}

export interface RegistryImportResult {
  importedCount: number;
  errors: RegistryImportError[];
}

interface RawRegistryRow {
  slug: string;
  name: string;
  l0: string;
  l1_family: string;
  l2_scene: string;
  l3_flag: string;
  status: string;
}

function validateHeader(csvContent: string): RegistryImportError[] {
  const firstLine = csvContent.split(/\r\n|\n|\r/, 1)[0] ?? '';
  const actualHeader = firstLine.split(',').map((h) => h.trim());
  const expected = [...EXPECTED_HEADER];
  const matches = actualHeader.length === expected.length && actualHeader.every((h, i) => h === expected[i]);
  if (!matches) {
    return [
      {
        line: 1,
        field: 'header',
        message: `header 不精确匹配,期望 "${expected.join(',')}",实际 "${actualHeader.join(',')}"`,
      },
    ];
  }
  return [];
}

/** 单行六项规则校验(不含批内 slug 唯一性——那是跨行规则,在外层统一处理)。 */
function validateRow(row: RawRegistryRow, line: number): RegistryImportError[] {
  const errors: RegistryImportError[] = [];

  if (typeof row.slug !== 'string' || row.slug.trim().length === 0) {
    errors.push({ line, field: 'slug', message: 'slug 缺失或为空' });
  } else if (row.slug !== row.slug.toLowerCase() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)) {
    errors.push({ line, field: 'slug', message: `slug "${row.slug}" 不是小写连字符格式` });
  }

  if (typeof row.name !== 'string' || row.name.trim().length === 0) {
    errors.push({ line, field: 'name', message: 'name 缺失或为空' });
  }

  if (!VALID_L0.has(row.l0 as L0Board)) {
    errors.push({ line, field: 'l0', message: `l0 "${row.l0}" 不在 6 值枚举内(不存在的板块)` });
  }

  if (typeof row.l1_family !== 'string' || row.l1_family.trim().length === 0) {
    errors.push({ line, field: 'l1_family', message: 'l1_family 缺失或为空' });
  }

  if (!VALID_L3_FLAG.has(row.l3_flag)) {
    errors.push({ line, field: 'l3_flag', message: `l3_flag "${row.l3_flag}" 不是 '0'/'1'` });
  }

  if (!VALID_STATUS.has(row.status as OccupationSlugStatus)) {
    errors.push({
      line,
      field: 'status',
      message: `status "${row.status}" 不在 planned/in_production/published/parked 四值枚举内`,
    });
  }

  return errors;
}

export async function importOccupationRegistry(dataSource: DataSource, csvPath: string): Promise<RegistryImportResult> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const headerErrors = validateHeader(csvContent);
  if (headerErrors.length > 0) {
    return { importedCount: 0, errors: headerErrors };
  }

  const parsed: { record: RawRegistryRow; info: { lines: number } }[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    info: true,
    trim: false,
  });

  const errors: RegistryImportError[] = [];
  const slugFirstLine = new Map<string, number>();
  const rowsToImport: { row: RawRegistryRow; line: number }[] = [];

  for (const { record, info } of parsed) {
    const line = info.lines;
    errors.push(...validateRow(record, line));

    const slug = record.slug;
    if (typeof slug === 'string' && slug.length > 0) {
      const firstLine = slugFirstLine.get(slug);
      if (firstLine !== undefined) {
        errors.push({ line, field: 'slug', message: `slug "${slug}" 与第 ${firstLine} 行重复` });
      } else {
        slugFirstLine.set(slug, line);
      }
    }

    rowsToImport.push({ row: record, line });
  }

  // 全量验证后才开事务:整批只要有一条错误,一律零写入。
  if (errors.length > 0) {
    return { importedCount: 0, errors };
  }

  let importedCount = 0;
  await dataSource.transaction(async (manager) => {
    const slugRepo = manager.getRepository(OccupationSlug);
    for (const { row } of rowsToImport) {
      const l2Scene = row.l2_scene.trim().length > 0 ? row.l2_scene.trim() : null;
      const existing = await slugRepo.findOne({ where: { slug: row.slug } });
      await slugRepo.save(
        slugRepo.create({
          ...(existing ?? {}),
          slug: row.slug,
          name: row.name,
          l0: row.l0 as L0Board,
          l1_family: row.l1_family,
          l2_scene: l2Scene,
          l3_flag: row.l3_flag === '1',
          status: row.status as OccupationSlugStatus,
        }),
      );
      importedCount += 1;
    }
  });

  return { importedCount, errors: [] };
}
