/**
 * 职业维基 · 回归/经济批/量产三阶段共用 · 内容校验 CLI
 *
 * 依据 docs/refactor2/t3-regression5-plan.md Leader 裁决第4条(R4 校验 CLI 正式沉淀)与
 * 该方案 §1 R4 节。只读消费 src/occupations 下既有的两个纯函数
 * (validateSkeleton / evaluateOccupationCoverageGate),不改动任何 src 代码,不重复
 * seed-importer.ts 的落库逻辑(本工具只做"能不能落库"的判定,不连接数据库)。
 *
 * 扫描规则:content/occupations/<slug>.json 与 content/evidence/<slug>.json 按同名 slug
 * 配对(与 seed-importer.ts 的目录约定一致:sourceDir/occupations、sourceDir/evidence)。
 *
 * 用法:
 *   npx ts-node scripts/validate-occupation-content.ts [--content-dir <path>]
 *   npx ts-node scripts/validate-occupation-content.ts --gen-ids <N>
 *
 * --content-dir 默认 ../../content(相对本文件所在的 packages/api/scripts/,即仓库根的
 * content/ 目录,预留给回归/经济批/量产阶段的真实内容落盘位置)。
 *
 * 退出码:全部 slug validated → 0;任一失败(解析错误/契约字段缺失/结构不合法/
 * coverage gate 未通过)→ 1。
 */
import * as fs from 'fs';
import * as path from 'path';
import { validateSkeleton } from '../src/occupations/occupation.validator';
import { evaluateOccupationCoverageGate, type CoverageGateEvidenceItem } from '../src/occupations/occupation-coverage-gate';
import type { Axis, OccupationSkeleton } from '../src/occupations/occupation.types';
import { generateUuidV7 } from './uuid-v7';

/**
 * content/occupations/<slug>.json 的契约字段(与 seed-importer.ts 的 OccupationSeedFile
 * 完全一致:只含 slug/axis/skeleton/prose 及可选的 cost_tokens/aliases/edges,
 * **不含** name/l0/l1_family/l2_scene/l3_flag 等注册表字段——那些字段只属于
 * registry-v1.csv/occupation_slugs,本工具对内容文件出现这些字段一律报错)。
 */
interface OccupationSeedFileShape {
  slug: string;
  axis: Axis;
  skeleton: OccupationSkeleton;
  prose: string;
  cost_tokens?: number;
  aliases?: { alias: string; weight?: number }[];
  edges?: { to_slug: string; type: string; note?: string }[];
}

/** 契约字段出现即报错的注册表字段名(见 seed-importer.ts:52-64 头注)。 */
const REGISTRY_ONLY_FIELDS = ['name', 'l0', 'l1_family', 'l2_scene', 'l3_flag', 'status'] as const;

/** OccupationSeedFile 允许出现的顶层字段(契约字段 + 可选字段)。 */
const ALLOWED_TOP_LEVEL_FIELDS = new Set(['slug', 'axis', 'skeleton', 'prose', 'cost_tokens', 'aliases', 'edges']);

export interface SlugReport {
  slug: string;
  valid: boolean;
  status: 'validated' | 'draft' | 'parse_error';
  errors: string[];
}

export interface ValidationSummary {
  total: number;
  validatedCount: number;
  failedSlugs: string[];
  reports: SlugReport[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * 校验单个 slug 对应的一对文件(occupation + evidence)。只读文件、不写任何东西、
 * 不连数据库——纯函数级判定,与 seed-importer.ts 内部先后调用 validateSkeleton +
 * evaluateOccupationCoverageGate 的顺序等价(t3-regression5-plan.md 行553)。
 */
function validateOneSlug(slug: string, occupationPath: string, evidencePath: string): SlugReport {
  const errors: string[] = [];

  // 1) occupation JSON 解析。
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(occupationPath, 'utf-8'));
  } catch (e) {
    return { slug, valid: false, status: 'parse_error', errors: [`occupation JSON 解析失败: ${(e as Error).message}`] };
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { slug, valid: false, status: 'parse_error', errors: ['occupation 文件顶层必须是一个 JSON 对象'] };
  }
  const parsed = raw as Record<string, unknown>;

  // 2) OccupationSeedFile 契约字段检查:必需字段齐全 + 类型正确;禁止出现注册表字段。
  for (const field of ['slug', 'axis', 'prose'] as const) {
    if (!isNonEmptyString(parsed[field])) {
      errors.push(`契约字段 "${field}" 缺失或不是非空字符串`);
    }
  }
  if (parsed.skeleton === undefined || parsed.skeleton === null || typeof parsed.skeleton !== 'object') {
    errors.push('契约字段 "skeleton" 缺失或不是对象');
  }
  if (isNonEmptyString(parsed.slug) && parsed.slug !== slug) {
    errors.push(`文件内 slug("${parsed.slug}")与文件名 slug("${slug}")不一致`);
  }
  for (const field of REGISTRY_ONLY_FIELDS) {
    if (field in parsed) {
      errors.push(`内容文件不得包含注册表字段 "${field}"(该字段只属于 registry-v1.csv/occupation_slugs,由 registry-importer 独立管理)`);
    }
  }
  for (const key of Object.keys(parsed)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      errors.push(`内容文件出现未定义的顶层字段 "${key}"(OccupationSeedFile 契约字段为 slug/axis/skeleton/prose,可选 cost_tokens/aliases/edges)`);
    }
  }

  // 契约字段本身已经缺失/畸形时,跳过后续 skeleton/gate 判定(避免噪音级联报错)。
  if (errors.length > 0) {
    return { slug, valid: false, status: 'draft', errors };
  }

  const seedFile = parsed as unknown as OccupationSeedFileShape;

  // 3) validateSkeleton(occupation.validator.ts) —— 结构约束(Ajv)+ 跨字段语义。
  const structResult = validateSkeleton(seedFile.skeleton);
  if (!structResult.valid) {
    for (const err of structResult.errors) {
      errors.push(`[structural] ${err.field}: ${err.message}`);
    }
  }

  // 4) evidence 文件:必须存在且非空数组(与 seed-importer.ts 的"evidence 必需"契约一致)。
  if (!fs.existsSync(evidencePath)) {
    errors.push(`证据文件缺失(evidence 是必需的,不再按空处理): ${evidencePath}`);
    return { slug, valid: false, status: 'draft', errors };
  }
  let rawEvidence: unknown;
  try {
    rawEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
  } catch (e) {
    errors.push(`证据文件 JSON 解析失败: ${(e as Error).message}`);
    return { slug, valid: false, status: 'draft', errors };
  }
  if (!Array.isArray(rawEvidence) || rawEvidence.length === 0) {
    errors.push('证据文件内容为空数组或不是数组,覆盖闸直接拒绝');
    return { slug, valid: false, status: 'draft', errors };
  }

  // 结构校验已失败时,不再跑 gate(与 seed-importer.ts 的"errors.length===0 才跑 gate"顺序一致)。
  if (!structResult.valid) {
    return { slug, valid: false, status: 'draft', errors };
  }

  // 5) evaluateOccupationCoverageGate(occupation-coverage-gate.ts)。
  const gateResult = evaluateOccupationCoverageGate({
    skeleton: seedFile.skeleton,
    prose: seedFile.prose,
    evidence: rawEvidence as CoverageGateEvidenceItem[],
  });
  for (const err of gateResult.errors) {
    errors.push(`[gate:${err.code}] ${err.field}: ${err.message}`);
  }

  return {
    slug,
    valid: errors.length === 0,
    status: errors.length === 0 ? 'validated' : 'draft',
    errors,
  };
}

/**
 * 扫描 contentDir/occupations/*.json,按同名 slug 配对 contentDir/evidence/<slug>.json,
 * 逐条跑 validateOneSlug,汇总成 ValidationSummary。
 */
export function validateContentDir(contentDir: string): ValidationSummary {
  const occupationsDir = path.join(contentDir, 'occupations');
  const evidenceDir = path.join(contentDir, 'evidence');

  const reports: SlugReport[] = [];

  if (!fs.existsSync(occupationsDir)) {
    return { total: 0, validatedCount: 0, failedSlugs: [], reports: [] };
  }

  const files = fs.readdirSync(occupationsDir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    const slug = file.replace(/\.json$/, '');
    const occupationPath = path.join(occupationsDir, file);
    const evidencePath = path.join(evidenceDir, `${slug}.json`);
    reports.push(validateOneSlug(slug, occupationPath, evidencePath));
  }

  const validatedCount = reports.filter((r) => r.valid).length;
  const failedSlugs = reports.filter((r) => !r.valid).map((r) => r.slug);

  return { total: reports.length, validatedCount, failedSlugs, reports };
}

function printReport(summary: ValidationSummary): void {
  for (const r of summary.reports) {
    console.log(JSON.stringify(r, null, 2));
  }
  console.log(
    JSON.stringify(
      {
        summary: true,
        total: summary.total,
        validatedCount: summary.validatedCount,
        failedSlugs: summary.failedSlugs,
      },
      null,
      2,
    ),
  );
}

function parseArgs(argv: string[]): { contentDir?: string; genIds?: number } {
  const result: { contentDir?: string; genIds?: number } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--content-dir') {
      result.contentDir = argv[i + 1];
      i++;
    } else if (argv[i] === '--gen-ids') {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`--gen-ids 需要一个正整数参数,得到 "${argv[i + 1]}"`);
      }
      result.genIds = n;
      i++;
    }
  }
  return result;
}

/** CLI 入口,导出供测试直接调用(不经 child_process,见 test/occupation-content-cli.spec.ts 头注说明理由)。 */
export function main(argv: string[]): number {
  const args = parseArgs(argv);

  if (args.genIds !== undefined) {
    for (let i = 0; i < args.genIds; i++) {
      console.log(generateUuidV7());
    }
    return 0;
  }

  const contentDir = args.contentDir ?? path.join(__dirname, '..', '..', 'content');
  const summary = validateContentDir(contentDir);
  printReport(summary);
  // 全部 validated(含"扫描到 0 条"这一空态)才算通过;任一失败即非零退出。
  return summary.failedSlugs.length === 0 ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
