/**
 * 职业维基 · Stage0 · 骨架校验器
 *
 * TC-01(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)重写:结构约束(缺层/类型/枚举/
 * 计数上限/nullable)全部下沉给 Ajv 编译 occupation.schema.ts 里的唯一 Schema 执行
 * (`ajv.compile(OCCUPATION_SKELETON_SCHEMA)`),本文件不再手写任何逐字段结构规则
 * (老版本的 getLayer/requireNonEmptyString/requireStringArray 已删除)。
 *
 * 本文件只保留 Ajv 表达不了的跨字段/跨文件语义:
 *  - 被禁证据字段深扫(骨架正文混入 source_ref/tier/verdict 等证据侧概念)
 *  - 哨兵文案深扫(禁止用"暂无数据/待补充/未知/TBD/不详/视情况而定"冒充有值,trim 后
 *    整值等于禁词才拒,不做子串误杀)
 *  - boundary.adjacent_diffs 与 coordinates.adjacent_occupations 双向一致(集合相等)
 *  - development.promotion_path 各分支每级 typical_years.min<=max
 *  - occupation_edges 引用完整性(不设数据库级外键,脚本保证零悬空引用)
 *
 * 年限多源规则(≥2 独立来源)不在本卡,归 TC-02(claim-evidence 覆盖闸)。
 */
import Ajv, { type ErrorObject } from 'ajv';
import { OCCUPATION_SKELETON_SCHEMA } from './occupation.schema';
import type { OccupationEdgeRow } from './occupation.types';

export interface ValidationError {
  /** 定位到具体字段的点号路径,如 "coordinates.adjacent_occupations" */
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const ajv = new Ajv({ allErrors: true, strict: true });
const validateStructure = ajv.compile(OCCUPATION_SKELETON_SCHEMA);

/**
 * 骨架正文禁止出现的字段名——T3-career-wiki.md §3「彻底移出正文」红线的运行时防线
 * (静态残留扫描只能查代码里的字面量,查不到从 JSON 文件读入的任意内容,故校验器必须
 * 独立做一次深度扫描)。覆盖:溯源引用、分级/校验结论、蕴含日志、自查表、维度分数。
 */
const FORBIDDEN_SKELETON_KEYS = new Set([
  'source_ref',
  'source_refs',
  'tier',
  'verdict',
  'entailment_log',
  'entailment',
  'stage5',
  'dim1_score',
]);

/** inferred 前缀规则:任意以 "inferred" 开头的键名一律禁止(不区分大小写)。 */
function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (FORBIDDEN_SKELETON_KEYS.has(lower)) return true;
  return lower.startsWith('inferred');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** 深度扫描任意结构,收集所有被禁字段命中(路径 + 命中的键名)。 */
function scanForbiddenFields(value: unknown, path: string, hits: ValidationError[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => scanForbiddenFields(item, `${path}[${i}]`, hits));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, val] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (isForbiddenKey(key)) {
      hits.push({ field: childPath, message: `骨架正文混入被禁的证据侧字段 "${key}"(应下沉到 occupation_evidence 表)` });
    }
    scanForbiddenFields(val, childPath, hits);
  }
}

/**
 * 哨兵文案黑名单——禁止用"看似有值"的套话冒充证据支撑的真实内容。trim 后整值必须
 * 与禁词完全相等才拒绝(不做子串匹配,防止把"待补充材料清单"这类真实业务文本误杀)。
 */
const SENTINEL_VALUES = new Set(['暂无数据', '待补充', '未知', 'TBD', '不详', '视情况而定']);

/** 深度扫描任意结构,收集所有字符串叶子命中哨兵文案的路径。 */
function scanSentinelValues(value: unknown, path: string, hits: ValidationError[]): void {
  if (typeof value === 'string') {
    if (SENTINEL_VALUES.has(value.trim())) {
      hits.push({ field: path, message: `字段值 "${value.trim()}" 是哨兵文案,禁止用套话冒充有证据支撑的内容(应改为 null 表达"证据不足")` });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => scanSentinelValues(item, `${path}[${i}]`, hits));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, val] of Object.entries(value)) {
      scanSentinelValues(val, path ? `${path}.${key}` : key, hits);
    }
  }
}

/**
 * Ajv 错误对象转为本模块的点号路径 ValidationError,并把 Ajv 的英文 keyword 消息翻译为
 * 中文(保持与本校验器其余部分一致的错误文案风格,供调用方/测试按中文关键词断言)。
 */
function ajvErrorsToValidationErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  if (!errors) return [];
  return errors.map((err) => {
    // instancePath 形如 "/coordinates/adjacent_occupations",转点号路径且去掉开头的 "/"。
    const dotPath = err.instancePath.length > 0 ? err.instancePath.slice(1).replace(/\//g, '.') : '';

    switch (err.keyword) {
      case 'required': {
        // 缺层/缺字段:field 定位到缺失的那个属性名本身(与旧校验器 getLayer 的定位习惯一致)。
        const missingProperty = (err.params as { missingProperty: string }).missingProperty;
        const field = dotPath ? `${dotPath}.${missingProperty}` : missingProperty;
        return { field, message: `缺层:骨架固定结构中该层缺失或不是对象` };
      }
      case 'additionalProperties': {
        const additionalProperty = (err.params as { additionalProperty: string }).additionalProperty;
        const field = dotPath ? `${dotPath}.${additionalProperty}` : additionalProperty;
        return { field, message: `骨架顶层出现未定义的多余字段 "${additionalProperty}"(9 层固定骨架焊死,不许自行增删)` };
      }
      case 'enum': {
        const allowedValues = (err.params as { allowedValues: unknown[] }).allowedValues;
        const field = dotPath || '(root)';
        return { field, message: `取值不在允许的 ${allowedValues.length} 个枚举内` };
      }
      case 'maxItems': {
        const limit = (err.params as { limit: number }).limit;
        const field = dotPath || '(root)';
        return { field, message: `条数超过封顶 ${limit} 条,超出必须回落固定骨架` };
      }
      case 'minItems': {
        const limit = (err.params as { limit: number }).limit;
        const field = dotPath || '(root)';
        return { field, message: `数量低于下限 ${limit}` };
      }
      default: {
        const field = dotPath || '(root)';
        return { field, message: err.message ?? 'Ajv 校验失败' };
      }
    }
  });
}

interface YearRangeLike {
  min: number;
  max: number;
}

function isYearRangeLike(v: unknown): v is YearRangeLike {
  return isPlainObject(v) && typeof v.min === 'number' && typeof v.max === 'number';
}

/** 深扫 development.promotion_path 三分支,检查每一级 typical_years.min<=max。 */
function checkDevelopmentYearRanges(candidate: Record<string, unknown>, errors: ValidationError[]): void {
  const development = candidate.development;
  if (!isPlainObject(development)) return;
  const promotionPath = development.promotion_path;
  if (!isPlainObject(promotionPath)) return;

  for (const branchKey of ['professional_ic', 'management', 'independent'] as const) {
    const branch = promotionPath[branchKey];
    if (!Array.isArray(branch)) continue;
    branch.forEach((step, i) => {
      if (!isPlainObject(step)) return;
      const typicalYears = step.typical_years;
      if (!isYearRangeLike(typicalYears)) return;
      if (typicalYears.min > typicalYears.max) {
        errors.push({
          field: `development.promotion_path.${branchKey}[${i}].typical_years`,
          message: `min(${typicalYears.min}) 大于 max(${typicalYears.max}),年限区间非法`,
        });
      }
    });
  }
}

/**
 * boundary.adjacent_diffs 与 coordinates.adjacent_occupations 双向一致:两个集合的
 * 职业名称必须相等(骨架内描述性字段自身的一致性,不涉及 occupation_edges 表)。
 */
function checkBoundaryCoordinatesConsistency(candidate: Record<string, unknown>, errors: ValidationError[]): void {
  const coordinates = candidate.coordinates;
  const boundary = candidate.boundary;
  if (!isPlainObject(coordinates) || !isPlainObject(boundary)) return;

  const adjacentOccupations = coordinates.adjacent_occupations;
  const adjacentDiffs = boundary.adjacent_diffs;
  if (!Array.isArray(adjacentOccupations) || !Array.isArray(adjacentDiffs)) return;

  const coordinatesSet = new Set(adjacentOccupations.filter((v): v is string => typeof v === 'string'));
  const boundarySet = new Set(
    adjacentDiffs
      .map((d) => (isPlainObject(d) ? d.occupation : undefined))
      .filter((v): v is string => typeof v === 'string'),
  );

  const missingInBoundary = [...coordinatesSet].filter((name) => !boundarySet.has(name));
  const missingInCoordinates = [...boundarySet].filter((name) => !coordinatesSet.has(name));

  if (missingInBoundary.length > 0 || missingInCoordinates.length > 0) {
    errors.push({
      field: 'boundary.adjacent_diffs',
      message:
        `boundary.adjacent_diffs 与 coordinates.adjacent_occupations 相邻职业集合不一致` +
        `(boundary 缺: [${missingInBoundary.join(', ')}]；coordinates 缺: [${missingInCoordinates.join(', ')}])`,
    });
  }
}

/**
 * 校验单条 skeleton 是否合规。
 * 结构约束(缺层/类型/枚举/计数上限/nullable)由 Ajv 单一执行;本函数只补做 Ajv 表达
 * 不了的跨字段语义:被禁字段深扫、哨兵文案深扫、boundary↔coordinates 一致、development
 * min<=max。
 */
export function validateSkeleton(candidate: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  const structurallyValid = validateStructure(candidate);
  errors.push(...ajvErrorsToValidationErrors(validateStructure.errors));

  if (!isPlainObject(candidate)) {
    return { valid: false, errors: errors.length > 0 ? errors : [{ field: '(root)', message: 'skeleton 必须是一个对象' }] };
  }

  scanForbiddenFields(candidate, '', errors);
  scanSentinelValues(candidate, '', errors);

  // 跨字段语义只在结构本身合法时才有意义做深扫(避免对不成形的数据做无意义的深扫报重复噪音)。
  if (structurallyValid) {
    checkDevelopmentYearRanges(candidate, errors);
    checkBoundaryCoordinatesConsistency(candidate, errors);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 校验一批 edges 是否存在悬空引用,并核对 type 枚举。
 * T3-career-wiki.md §4:「脚本保证零悬空引用」——edges 不设数据库级外键(理由见 migration
 * 头注),referential 完整性只靠这层校验 + occupation-seed-importer 落库前调用。
 */
export function validateEdgesReferentialIntegrity(
  edges: readonly OccupationEdgeRow[],
  knownSlugs: ReadonlySet<string> | readonly string[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const slugSet = knownSlugs instanceof Set ? knownSlugs : new Set(knownSlugs);
  const validTypes = new Set(['adjacent', 'upstream', 'downstream']);

  edges.forEach((edge, i) => {
    if (!slugSet.has(edge.from_slug)) {
      errors.push({ field: `edges[${i}].from_slug`, message: `悬空引用:slug "${edge.from_slug}" 不存在于 occupation_slugs` });
    }
    if (!slugSet.has(edge.to_slug)) {
      errors.push({ field: `edges[${i}].to_slug`, message: `悬空引用:slug "${edge.to_slug}" 不存在于 occupation_slugs` });
    }
    if (!validTypes.has(edge.type)) {
      errors.push({ field: `edges[${i}].type`, message: `type "${String(edge.type)}" 不在 adjacent/upstream/downstream 三选一内` });
    }
  });

  return { valid: errors.length === 0, errors };
}
