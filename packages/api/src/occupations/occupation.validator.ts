/**
 * 职业维基 · Stage0 · 骨架校验器(手写零依赖,不引入 ajv/zod/joi)
 *
 * 依赖纪律:本仓库现有验证栈只有 class-validator(用于 DTO class,不适合校验从 JSON 文件
 * 读入的任意结构 jsonb)。手写校验器覆盖本次全部需求(缺层/被禁字段/枚举/计数上限/悬空引用),
 * 无需 ajv 的 schema 编译能力,遂不引入新依赖。
 *
 * 两个入口:
 *  - validateSkeleton(candidate):校验单条 skeleton 是否合规,返回结构化错误列表。
 *  - validateEdgesReferentialIntegrity(edges, knownSlugs):校验一批 edges 有无悬空引用。
 */
import { AXIS_VALUES, DOMAIN_SPECIFICS_MAX, SKELETON_LAYER_KEYS, type OccupationEdgeRow } from './occupation.types';

export interface ValidationError {
  /** 定位到具体字段的点号路径,如 "coordinates.adjacent_occupations" */
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

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

function requireNonEmptyString(obj: Record<string, unknown>, layerPath: string, field: string, errors: ValidationError[]): void {
  const v = obj[field];
  if (typeof v !== 'string' || v.trim().length === 0) {
    errors.push({ field: `${layerPath}.${field}`, message: '缺失或不是非空字符串' });
  }
}

function requireStringArray(
  obj: Record<string, unknown>,
  layerPath: string,
  field: string,
  minItems: number,
  errors: ValidationError[],
): void {
  const v = obj[field];
  if (!Array.isArray(v)) {
    errors.push({ field: `${layerPath}.${field}`, message: '缺失或不是数组' });
    return;
  }
  if (v.length < minItems) {
    errors.push({ field: `${layerPath}.${field}`, message: `数组长度 ${v.length} 低于下限 ${minItems}` });
  }
  v.forEach((item, i) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      errors.push({ field: `${layerPath}.${field}[${i}]`, message: '数组元素必须是非空字符串' });
    }
  });
}

function getLayer(candidate: Record<string, unknown>, key: string, errors: ValidationError[]): Record<string, unknown> | null {
  const v = candidate[key];
  if (!isPlainObject(v)) {
    errors.push({ field: key, message: '缺层:骨架 9 层固定结构中该层缺失或不是对象' });
    return null;
  }
  return v;
}

/**
 * 校验单条 skeleton 是否合规。
 * 抓取维度:①缺层 ②混入被禁字段 ③axis 不在枚举内 ④domain_specifics 超过 5 条
 * (⑤edges 悬空引用由 validateEdgesReferentialIntegrity 单独负责,不属于单条 skeleton 校验)。
 */
export function validateSkeleton(candidate: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isPlainObject(candidate)) {
    return { valid: false, errors: [{ field: '(root)', message: 'skeleton 必须是一个对象' }] };
  }

  // ② 被禁字段深度扫描(覆盖全树,不止顶层)
  scanForbiddenFields(candidate, '', errors);

  // ① 缺层检查 + 逐层字段
  const positioning = getLayer(candidate, 'positioning', errors);
  if (positioning) {
    requireNonEmptyString(positioning, 'positioning', 'one_liner', errors);
    requireNonEmptyString(positioning, 'positioning', 'problem_solved', errors);
    requireNonEmptyString(positioning, 'positioning', 'social_rationale', errors);
  }

  const coordinates = getLayer(candidate, 'coordinates', errors);
  if (coordinates) {
    requireNonEmptyString(coordinates, 'coordinates', 'occupation_family', errors);
    requireStringArray(coordinates, 'coordinates', 'industry_scenes', 1, errors);
    // 相邻职业 ≥3(原稿:没有相邻对比就不是百科,只是介绍)
    requireStringArray(coordinates, 'coordinates', 'adjacent_occupations', 3, errors);
    requireStringArray(coordinates, 'coordinates', 'upstream', 1, errors);
    requireStringArray(coordinates, 'coordinates', 'downstream', 1, errors);
  }

  const boundary = getLayer(candidate, 'boundary', errors);
  if (boundary) {
    const diffs = boundary.adjacent_diffs;
    if (!Array.isArray(diffs)) {
      errors.push({ field: 'boundary.adjacent_diffs', message: '缺失或不是数组' });
    } else {
      if (diffs.length < 3) {
        errors.push({ field: 'boundary.adjacent_diffs', message: `与相邻职业的差异条目 ${diffs.length} 低于下限 3(百科最核心模块,强制 ≥3 个相邻对比)` });
      }
      diffs.forEach((d, i) => {
        if (!isPlainObject(d) || typeof d.occupation !== 'string' || d.occupation.trim().length === 0) {
          errors.push({ field: `boundary.adjacent_diffs[${i}].occupation`, message: '缺失或不是非空字符串' });
        }
        if (!isPlainObject(d) || typeof d.diff !== 'string' || d.diff.trim().length === 0) {
          errors.push({ field: `boundary.adjacent_diffs[${i}].diff`, message: '缺失或不是非空字符串' });
        }
      });
    }
  }

  const operations = getLayer(candidate, 'operations', errors);
  if (operations) {
    const workflow = operations.workflow;
    if (!isPlainObject(workflow)) {
      errors.push({ field: 'operations.workflow', message: '缺失或不是对象' });
    } else {
      requireNonEmptyString(workflow, 'operations.workflow', 'daily', errors);
      requireNonEmptyString(workflow, 'operations.workflow', 'project', errors);
      requireNonEmptyString(workflow, 'operations.workflow', 'cycle', errors);
    }
    requireStringArray(operations, 'operations', 'deliverables', 1, errors);
    requireStringArray(operations, 'operations', 'tools_systems', 1, errors);
    requireStringArray(operations, 'operations', 'eval_metrics', 1, errors);
  }

  const entry = getLayer(candidate, 'entry', errors);
  if (entry) {
    requireStringArray(entry, 'entry', 'eligible_majors', 1, errors);
    requireNonEmptyString(entry, 'entry', 'non_major_route', errors);
    requireStringArray(entry, 'entry', 'campus_recruitment_signals', 1, errors);
    requireStringArray(entry, 'entry', 'resume_valid_experiences', 1, errors);
    requireStringArray(entry, 'entry', 'resume_looks_relevant_but_useless', 1, errors);
  }

  const variation = getLayer(candidate, 'variation', errors);
  if (variation) {
    const industryDiffs = variation.industry_diffs;
    if (!Array.isArray(industryDiffs) || industryDiffs.length < 1) {
      errors.push({ field: 'variation.industry_diffs', message: '缺失或为空数组(行业差异 ≥1 条)' });
    } else {
      industryDiffs.forEach((d, i) => {
        if (!isPlainObject(d) || typeof d.scene !== 'string' || d.scene.trim().length === 0) {
          errors.push({ field: `variation.industry_diffs[${i}].scene`, message: '缺失或不是非空字符串' });
        }
        if (!isPlainObject(d) || typeof d.diff !== 'string' || d.diff.trim().length === 0) {
          errors.push({ field: `variation.industry_diffs[${i}].diff`, message: '缺失或不是非空字符串' });
        }
      });
    }
    const orgDiffs = variation.org_nature_diffs;
    if (!Array.isArray(orgDiffs) || orgDiffs.length < 1) {
      errors.push({ field: 'variation.org_nature_diffs', message: '缺失或为空数组(组织性质差异 ≥1 条)' });
    } else {
      orgDiffs.forEach((d, i) => {
        if (!isPlainObject(d) || typeof d.org_nature !== 'string' || d.org_nature.trim().length === 0) {
          errors.push({ field: `variation.org_nature_diffs[${i}].org_nature`, message: '缺失或不是非空字符串' });
        }
        if (!isPlainObject(d) || typeof d.diff !== 'string' || d.diff.trim().length === 0) {
          errors.push({ field: `variation.org_nature_diffs[${i}].diff`, message: '缺失或不是非空字符串' });
        }
      });
    }
  }

  const threshold = getLayer(candidate, 'threshold', errors);
  if (threshold) {
    requireNonEmptyString(threshold, 'threshold', 'hidden_cost', errors);
    requireNonEmptyString(threshold, 'threshold', 'attrition_reality', errors);
    requireNonEmptyString(threshold, 'threshold', 'income_structure', errors);
    requireNonEmptyString(threshold, 'threshold', 'common_misconceptions', errors);
    requireNonEmptyString(threshold, 'threshold', 'who_should_not', errors);
  }

  const development = getLayer(candidate, 'development', errors);
  if (development) {
    requireStringArray(development, 'development', 'promotion_path', 1, errors);
    requireNonEmptyString(development, 'development', 'ceiling', errors);
    requireStringArray(development, 'development', 'lateral_moves', 1, errors);
  }

  const trend = getLayer(candidate, 'trend', errors);
  if (trend) {
    requireStringArray(trend, 'trend', 'ai_tasks_replaced', 1, errors);
    requireStringArray(trend, 'trend', 'ai_tasks_augmented', 1, errors);
    requireStringArray(trend, 'trend', 'ai_new_skills', 1, errors);
  }

  // ③ axis 枚举检查
  const axis = candidate.axis;
  if (typeof axis !== 'string' || !(AXIS_VALUES as readonly string[]).includes(axis)) {
    errors.push({ field: 'axis', message: `axis 取值 "${String(axis)}" 不在允许的 10 个枚举内` });
  }

  // ④ domain_specifics 封顶 5 条
  const domainSpecifics = candidate.domain_specifics;
  if (!Array.isArray(domainSpecifics)) {
    errors.push({ field: 'domain_specifics', message: '缺失或不是数组' });
  } else {
    if (domainSpecifics.length > DOMAIN_SPECIFICS_MAX) {
      errors.push({
        field: 'domain_specifics',
        message: `专有槽条数 ${domainSpecifics.length} 超过封顶 ${DOMAIN_SPECIFICS_MAX} 条,超出必须回落固定骨架`,
      });
    }
    domainSpecifics.forEach((item, i) => {
      if (!isPlainObject(item) || typeof item.key !== 'string' || item.key.trim().length === 0) {
        errors.push({ field: `domain_specifics[${i}].key`, message: '缺失或不是非空字符串' });
      }
      if (!isPlainObject(item) || typeof item.value !== 'string' || item.value.trim().length === 0) {
        errors.push({ field: `domain_specifics[${i}].value`, message: '缺失或不是非空字符串' });
      }
    });
  }

  // 顶层键集合里不应出现 9 层 + axis + domain_specifics 之外的多余键(与 JSON Schema
  // additionalProperties:false 语义对齐,防止「顺手扩展」骨架)。
  const allowedTopKeys = new Set<string>([...SKELETON_LAYER_KEYS, 'axis', 'domain_specifics']);
  for (const key of Object.keys(candidate)) {
    if (!allowedTopKeys.has(key)) {
      errors.push({ field: key, message: `骨架顶层出现未定义的多余字段 "${key}"(9 层固定骨架焊死,不许自行增删)` });
    }
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
