/**
 * 职业维基 · Stage0 · Gate A claim-evidence 覆盖闸
 *
 * 权威规格:docs/refactor2/t3-codex56-review-2026-07-10.md §R3
 *          docs/refactor2/t3-gate-a-taskcards-2026-07-10.md TC-02
 *
 * 建立不可绕过的 claim-evidence 覆盖闸:只有 evidence 完整覆盖骨架全部非 null 可见事实
 * 叶子、无 pending、无被拒内容残留、高危字段全部 directly_supported 且源等级合格、
 * inference_supported 占比 ≤0.30、hash 与当前骨架一致的证据集合,才能判 validated。
 * gate 不过 = 整批失败零写入(由调用方 seed-importer 保证,本模块只负责判定)。
 *
 * 本卡不改 occupation.types.ts / occupation.schema.ts / occupation.validator.ts /
 * seed-importer.ts / registry-importer.ts(files_forbidden),Schema 结构校验假定已由
 * validateSkeleton 在调用方独立跑过;本模块只做 claim-evidence 覆盖闸判定,不重复
 * Ajv 结构校验。
 */
import { createHash } from 'crypto';
import type { OccupationSkeleton } from './occupation.types';
import type { EvidenceVerdict } from './occupation-evidence.types';

// ─────────────────────────────────────────────
// 输入/输出类型
// ─────────────────────────────────────────────

/** 覆盖闸判定用的证据行最小形状(与 OccupationEvidenceRow 字段同名,entry_slug 由调用方另行核对)。 */
export interface CoverageGateEvidenceItem {
  claim_id: string;
  field_path: string;
  field_value_hash: string;
  claim_text: string;
  span_start: number;
  span_end: number;
  source_excerpt: string;
  source_url: string;
  tier: 'A1' | 'A2' | 'A3';
  verdict: EvidenceVerdict;
  reasoning_chain: {
    premise_claim_ids: string[];
    bridge_rule: string;
    conclusion: string;
    scope_limit: string;
    counterevidence_note: string | null;
  } | null;
}

export interface CoverageGateInput {
  skeleton: OccupationSkeleton;
  /** 散文渲染正文,用于核对 rejected 断言是否仍残留在正文里 */
  prose: string;
  evidence: CoverageGateEvidenceItem[] | null | undefined;
  /** facets 投影文本(门B 才有真实结构化 facets,门A 阶段传可选字符串数组做残留扫描) */
  facets?: readonly string[] | null;
}

export type CoverageGateStatus = 'validated' | 'draft';

export interface CoverageGateError {
  code: CoverageGateErrorCode;
  field: string;
  message: string;
}

export interface CoverageGateResult {
  validated: boolean;
  status: CoverageGateStatus;
  errors: CoverageGateError[];
}

/** 17 个错误码,定稿见 TC-02 files_allowed 描述,不许新增/改名。 */
export type CoverageGateErrorCode =
  | 'EVIDENCE_MISSING'
  | 'EVIDENCE_EMPTY'
  | 'CLAIM_ID_INVALID'
  | 'CLAIM_NOT_ATOMIC'
  | 'SPAN_INVALID'
  | 'CLAIM_COVERAGE_INCOMPLETE'
  | 'PENDING_CLAIM'
  | 'UNSUPPORTED_VISIBLE_CLAIM'
  | 'HIGH_RISK_NOT_DIRECT'
  | 'SOURCE_TIER_INSUFFICIENT'
  | 'NUMERIC_SCOPE_MISMATCH'
  | 'INFERENCE_CHAIN_INVALID'
  | 'REJECTED_CONTENT_PRESENT'
  | 'FIELD_HASH_MISMATCH'
  | 'INFERENCE_RATIO_EXCEEDED'
  | 'SOURCE_NOT_INDEPENDENT'
  | 'YEAR_RANGE_SOURCE_INSUFFICIENT';

// ─────────────────────────────────────────────
// 确定性规则:UUIDv7 / normalize / hash
// ─────────────────────────────────────────────

/** UUIDv7 正则(TC-02 step5 钉死,大小写不敏感)。 */
const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidClaimId(claimId: string): boolean {
  return typeof claimId === 'string' && UUID_V7_RE.test(claimId);
}

/** 原子断言判定:命中「且/同时/以及/并且」即视为复合断言,非原子。 */
const COMPOUND_MARKERS_RE = /且|同时|以及|并且/;

export function isAtomicClaimText(claimText: string): boolean {
  return typeof claimText === 'string' && !COMPOUND_MARKERS_RE.test(claimText);
}

/** 字符串规范化:NFC + trim + 连续空白压一格(TC-02 step5「normalizeLeafValue」)。 */
function normalizeString(s: string): string {
  return s.normalize('NFC').trim().replace(/\s+/g, ' ');
}

interface YearRangeLike {
  min: number;
  max: number;
  unit: string;
}

function isYearRangeLike(v: unknown): v is YearRangeLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as Record<string, unknown>).min === 'number' &&
    typeof (v as Record<string, unknown>).max === 'number' &&
    typeof (v as Record<string, unknown>).unit === 'string'
  );
}

/**
 * 规范化任意叶子值为确定性字符串,供 hash 计算:
 *  - 字符串:NFC + trim + 连续空白压一格。
 *  - YearRange({min,max,unit}):按 min,max,unit 固定序序列化(不受属性声明顺序影响)。
 *  - 数组:按「单元素 hash」拼接(防止元素重排导致 hash 意外相同——重排应被视为不同值,
 *    每个元素各自 normalize 后再各自 hash,再把 hash 列表按原顺序拼接,元素顺序变化会
 *    改变拼接结果,呼应"数组重排"是 field_path 不可靠、需要 claim_id 的原始动机)。
 *  - 其它(数字/布尔/null):按 JSON.stringify 兜底。
 */
export function normalizeLeafValue(value: unknown): string {
  if (typeof value === 'string') {
    return normalizeString(value);
  }
  if (isYearRangeLike(value)) {
    return `min=${value.min};max=${value.max};unit=${value.unit}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sha256Hex(normalizeLeafValue(item))).join('|');
  }
  if (typeof value === 'object' && value !== null) {
    // 复合对象叶子(如 boundary.adjacent_diffs 单条 {occupation,diff}):按固定键序序列化。
    const rec = value as Record<string, unknown>;
    const keys = Object.keys(rec).sort();
    return keys.map((k) => `${k}=${normalizeLeafValue(rec[k])}`).join(';');
  }
  return JSON.stringify(value);
}

function sha256Hex(normalized: string): string {
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/** field_value_hash = sha256(normalizeLeafValue(值))。 */
export function computeFieldValueHash(value: unknown): string {
  return sha256Hex(normalizeLeafValue(value));
}

// ─────────────────────────────────────────────
// 骨架叶子枚举(可见事实叶子)
// ─────────────────────────────────────────────

/** 一个「可见事实叶子」:骨架内某个具体路径上的非 null 值,需要 claim 覆盖。 */
interface SkeletonLeaf {
  fieldPath: string;
  /** 该叶子的规范化字符串值(用于 hash/span 校验) */
  normalizedValue: string;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === 'string');
}

/**
 * 深度遍历骨架,收集全部「非 null 可见事实叶子」。粒度规则:
 *  - 纯字符串数组(如 coordinates.adjacent_occupations / entry.eligible_majors /
 *    operations.eval_metrics / development.lateral_moves 等):同时注册「整数组」一个
 *    叶子(供整体一条 claim 覆盖的证据风格)与「每个元素」各一个叶子(供逐条 claim
 *    覆盖的证据风格)——覆盖完整性判定(第 6 步)只要整数组叶子或全部元素叶子二者之一
 *    被覆盖即视为该字段已覆盖,不强制两种风格都要满足。
 *  - 复合对象数组(如 boundary.adjacent_diffs / variation.industry_diffs /
 *    org_nature_diffs):按元素级展开,每个对象内的字符串字段各自成叶子(与
 *    CLAIM_COVERAGE_INCOMPLETE 反例"单字段两 claim 只验其一"的判定粒度一致),不额外
 *    注册整数组级别的叶子(对象数组没有单一字符串值可供整体一条 claim 直接覆盖)。
 *  - YearRange 对象(development 各分支 typical_years):整体作为一个叶子。
 *
 * 横切字段 axis/domain_specifics 是分类/调参槽而非源自文档的事实断言,不纳入覆盖闸
 * 叶子枚举范围(与 positioning/coordinates/boundary/operations/entry/variation/
 * threshold/development/trend 九层描述性字段区分对待)——本卡显式假设,详见交付报告。
 */
function collectVisibleLeaves(skeleton: OccupationSkeleton): SkeletonLeaf[] {
  const leaves: SkeletonLeaf[] = [];

  function walk(value: unknown, path: string): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      leaves.push({ fieldPath: path, normalizedValue: normalizeString(value) });
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      // 数值型叶子(如 YearRange 的 min/max)不是独立的「可见事实叶子」,由外层 YearRange
      // 对象整体作为一个叶子处理(见下方 isYearRangeLike 分支),此处不重复收集。
      return;
    }
    if (isYearRangeLike(value)) {
      leaves.push({ fieldPath: path, normalizedValue: normalizeLeafValue(value) });
      return;
    }
    if (Array.isArray(value)) {
      if (isStringArray(value) && value.length > 0) {
        // 整数组叶子(整体一条 claim 覆盖的证据风格)。
        leaves.push({ fieldPath: path, normalizedValue: normalizeLeafValue(value) });
      }
      // 逐元素叶子(逐条 claim 覆盖的证据风格;复合对象数组也走这条路径继续深入)。
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (isPlainObject(value)) {
      for (const [key, val] of Object.entries(value)) {
        walk(val, path ? `${path}.${key}` : key);
      }
    }
  }

  const layerKeys: (keyof OccupationSkeleton)[] = [
    'positioning',
    'coordinates',
    'boundary',
    'operations',
    'entry',
    'variation',
    'threshold',
    'development',
    'trend',
  ];
  for (const key of layerKeys) {
    walk(skeleton[key], key);
  }
  return leaves;
}

/** 提取「数组家族」的基路径:若 fieldPath 形如 "a.b[3]" 且 "a.b" 本身是已知的整数组叶子路径,返回 "a.b";否则返回 null。 */
function arrayFamilyBasePath(fieldPath: string, knownArrayBasePaths: ReadonlySet<string>): string | null {
  const m = fieldPath.match(/^(.+)\[\d+\]$/);
  if (!m) return null;
  return knownArrayBasePaths.has(m[1]) ? m[1] : null;
}

// ─────────────────────────────────────────────
// 高危字段判定
// ─────────────────────────────────────────────

/** 含数字/比例/金额/日期/频次/排名等的字符串值判定(高危规则之一:"含数字 claim 必须 directly")。 */
const NUMERIC_CONTENT_RE = /\d/;

function valueContainsNumeric(fieldPath: string, leaves: SkeletonLeaf[]): boolean {
  const leaf = leaves.find((l) => l.fieldPath === fieldPath);
  if (!leaf) return false;
  return NUMERIC_CONTENT_RE.test(leaf.normalizedValue);
}

/**
 * 高危字段路径判定(t3-codex56-review-2026-07-10.md §R3 高危字段清单):
 *  - entry.eligible_majors(对口专业门槛)
 *  - entry.campus_recruitment_signals 中学历/院校/证书门槛信号
 *  - operations.eval_metrics(考核指标)
 *  - variation.industry_diffs[].diff / variation.org_nature_diffs[].diff
 *  - threshold.hidden_cost / threshold.attrition_reality / threshold.income_structure
 *  - development.promotion_path.*[].typical_years(年限,按 YearRange 整体叶子路径匹配)
 *  - development.ceiling.*(具体职位天花板)
 *  - domain_specifics 中数字/专名/制度类(本卡不纳入 domain_specifics 覆盖范围,见上方假设)
 * 加上通用规则:任意叶子值本身含数字/比例/金额/日期/频次/排名(NUMERIC_CONTENT_RE)。
 */
function isHighRiskFieldPath(fieldPath: string): boolean {
  if (fieldPath.startsWith('entry.eligible_majors')) return true;
  if (fieldPath.startsWith('entry.campus_recruitment_signals')) return true;
  if (fieldPath.startsWith('operations.eval_metrics')) return true;
  if (/^variation\.(industry_diffs|org_nature_diffs)\[\d+\]\.diff$/.test(fieldPath)) return true;
  if (fieldPath === 'threshold.hidden_cost') return true;
  if (fieldPath === 'threshold.attrition_reality') return true;
  if (fieldPath === 'threshold.income_structure') return true;
  if (/^development\.promotion_path\.(professional_ic|management|independent)\[\d+\]\.typical_years$/.test(fieldPath)) return true;
  if (/^development\.ceiling\.(professional_ic|management|independent)$/.test(fieldPath)) return true;
  return false;
}

/** 该叶子是否属于「年限」叶子(typical_years,需要 ≥2 独立来源方可非 null)。 */
function isYearRangeFieldPath(fieldPath: string): boolean {
  return /\.typical_years$/.test(fieldPath) && /^development\.promotion_path\./.test(fieldPath);
}

/** 需要 A2 源等级门槛的字段(校招门槛/考核/收入/年限)。 */
function requiresA2OrHigher(fieldPath: string): boolean {
  if (fieldPath.startsWith('entry.eligible_majors')) return true;
  if (fieldPath.startsWith('entry.campus_recruitment_signals')) return true;
  if (fieldPath.startsWith('operations.eval_metrics')) return true;
  if (fieldPath === 'threshold.income_structure') return true;
  if (isYearRangeFieldPath(fieldPath)) return true;
  return false;
}

// ─────────────────────────────────────────────
// 来源独立性
// ─────────────────────────────────────────────

/** hostname 规范化:小写 + 去掉开头的 "www." */
function normalizeHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return url.trim().toLowerCase();
  }
}

/** 两个来源是否「独立」:hostname 小写去 www 后不同。 */
function areSourcesIndependent(urlA: string, urlB: string): boolean {
  return normalizeHost(urlA) !== normalizeHost(urlB);
}

// ─────────────────────────────────────────────
// 主判定入口
// ─────────────────────────────────────────────

export function evaluateOccupationCoverageGate(input: CoverageGateInput): CoverageGateResult {
  const errors: CoverageGateError[] = [];
  const { skeleton, prose, evidence, facets } = input;

  // 1) evidence 缺失/空数组直接失败,不做后续任何判定(no point 继续深挖)。
  if (evidence === null || evidence === undefined) {
    errors.push({ code: 'EVIDENCE_MISSING', field: 'evidence', message: '证据集合缺失(null/undefined),覆盖闸直接拒绝' });
    return { validated: false, status: 'draft', errors };
  }
  if (evidence.length === 0) {
    errors.push({ code: 'EVIDENCE_EMPTY', field: 'evidence', message: '证据集合为空数组,覆盖闸直接拒绝' });
    return { validated: false, status: 'draft', errors };
  }

  // narrowed 非空引用:供下方内层函数闭包使用(inner function 声明不继承外层窄化)。
  const evidenceList = evidence;

  const leaves = collectVisibleLeaves(skeleton);
  const leafByPath = new Map(leaves.map((l) => [l.fieldPath, l]));
  const claimById = new Map(evidenceList.map((e) => [e.claim_id, e]));

  // 2) 逐条证据的自身合法性:claim_id / claim_text 原子性 / span。
  for (const item of evidenceList) {
    if (!isValidClaimId(item.claim_id)) {
      errors.push({ code: 'CLAIM_ID_INVALID', field: `evidence[${item.claim_id}].claim_id`, message: `claim_id "${item.claim_id}" 不是合法 UUIDv7` });
    }
    if (!isAtomicClaimText(item.claim_text)) {
      errors.push({ code: 'CLAIM_NOT_ATOMIC', field: `evidence[${item.claim_id}].claim_text`, message: `claim_text 命中复合断言连接词(且/同时/以及/并且),非原子断言` });
    }
    if (
      !Number.isInteger(item.span_start) ||
      !Number.isInteger(item.span_end) ||
      item.span_start < 0 ||
      item.span_end <= item.span_start
    ) {
      errors.push({ code: 'SPAN_INVALID', field: `evidence[${item.claim_id}].span`, message: `span [${item.span_start}, ${item.span_end}) 不是合法的半开区间` });
    } else {
      const leaf = leafByPath.get(item.field_path);
      if (leaf && item.span_end > leaf.normalizedValue.length) {
        errors.push({ code: 'SPAN_INVALID', field: `evidence[${item.claim_id}].span`, message: `span 终点 ${item.span_end} 超出叶子规范化串长度 ${leaf.normalizedValue.length}` });
      }
    }
  }

  // 3) 无 pending。
  for (const item of evidenceList) {
    if (item.verdict === 'pending') {
      errors.push({ code: 'PENDING_CLAIM', field: `evidence[${item.claim_id}]`, message: 'verdict=pending 的断言不允许存在,覆盖闸拒绝' });
    }
  }

  // 4) rejected 断言:hash/path 不得匹配当前 skeleton,claim_text 不得出现在 prose/facets。
  const normalizedProse = normalizeString(prose ?? '');
  const normalizedFacets = (facets ?? []).map((f) => normalizeString(f));
  for (const item of evidenceList) {
    if (item.verdict !== 'rejected') continue;
    const leaf = leafByPath.get(item.field_path);
    const hashMatchesSkeleton = leaf !== undefined && computeFieldValueHash(leaf.normalizedValue) === item.field_value_hash;
    if (hashMatchesSkeleton) {
      errors.push({
        code: 'REJECTED_CONTENT_PRESENT',
        field: `evidence[${item.claim_id}]`,
        message: `已拒绝的断言其 field_path "${item.field_path}" 的 hash 仍与当前 skeleton 匹配,被拒内容仍留在正文`,
      });
    }
    const claimTextNormalized = normalizeString(item.claim_text);
    const foundInProse = normalizedProse.includes(claimTextNormalized);
    const foundInFacets = normalizedFacets.some((f) => f.includes(claimTextNormalized));
    if (foundInProse || foundInFacets) {
      errors.push({
        code: 'REJECTED_CONTENT_PRESENT',
        field: `evidence[${item.claim_id}]`,
        message: `已拒绝的断言 claim_text 仍出现在 ${foundInProse ? 'prose' : 'facets'} 正文中`,
      });
    }
  }

  // 5) 非 rejected/pending 证据的 field_value_hash 必须与当前 skeleton 一致(防改写复用旧 hash)。
  for (const item of evidenceList) {
    if (item.verdict === 'rejected' || item.verdict === 'pending') continue;
    const leaf = leafByPath.get(item.field_path);
    if (!leaf) continue; // 找不到对应叶子的覆盖不完整问题在第 6 步统一报告
    const expectedHash = computeFieldValueHash(leaf.normalizedValue);
    if (item.field_value_hash !== expectedHash) {
      errors.push({
        code: 'FIELD_HASH_MISMATCH',
        field: `evidence[${item.claim_id}].field_value_hash`,
        message: `field_value_hash 与当前 skeleton 该路径规范化值的 hash 不一致(字段疑似已被改写但沿用旧证据)`,
      });
    }
  }

  // 6) 覆盖完整性:每个非 null 可见事实叶子必须被至少一条 accepted(directly/inference)
  //    claim 的 span 并集覆盖到全部非空白字符。纯字符串数组同时存在「整数组叶子」与
  //    「逐元素叶子」两种粒度(见 collectVisibleLeaves 注释),覆盖满足其一即可,不强制
  //    两种风格都要覆盖(证据可以整体引用数组,也可以逐条引用每个元素)。
  const acceptedVerdicts = new Set<EvidenceVerdict>(['directly_supported', 'inference_supported']);
  // 整数组叶子的判定:该 fieldPath 存在对应的 "fieldPath[0]" 兄弟叶子(即 collectVisibleLeaves
  // 对同一个纯字符串数组同时注册了整体叶子与逐元素叶子)。
  const leafPathSet = new Set(leaves.map((l) => l.fieldPath));
  const arrayBasePaths = new Set<string>();
  for (const leaf of leaves) {
    if (leafPathSet.has(`${leaf.fieldPath}[0]`)) arrayBasePaths.add(leaf.fieldPath);
  }

  function isLeafCovered(leaf: SkeletonLeaf): boolean {
    const coveringClaims = evidenceList.filter((e) => e.field_path === leaf.fieldPath && acceptedVerdicts.has(e.verdict));
    if (coveringClaims.length === 0) return false;
    return isSpanUnionCoveringNonWhitespace(leaf.normalizedValue, coveringClaims.map((c) => [c.span_start, c.span_end]));
  }

  for (const leaf of leaves) {
    const isWholeArrayLeaf = arrayBasePaths.has(leaf.fieldPath);
    const isElementOfArrayFamily = arrayFamilyBasePath(leaf.fieldPath, arrayBasePaths) !== null;

    if (isWholeArrayLeaf) {
      // 整数组叶子:自身被覆盖,或者其全部逐元素叶子都被覆盖,视为满足。
      const elementLeaves = leaves.filter((l) => arrayFamilyBasePath(l.fieldPath, arrayBasePaths) === leaf.fieldPath);
      const coveredAsWhole = isLeafCovered(leaf);
      const coveredAsElements = elementLeaves.length > 0 && elementLeaves.every((el) => isLeafCovered(el));
      if (!coveredAsWhole && !coveredAsElements) {
        errors.push({ code: 'CLAIM_COVERAGE_INCOMPLETE', field: leaf.fieldPath, message: `该数组字段既没有整体覆盖也没有逐元素全覆盖` });
      }
      continue;
    }
    if (isElementOfArrayFamily) {
      // 逐元素叶子:若其所属整数组叶子已被整体覆盖,则该元素视为已满足,不重复报告
      // (避免"整体一条 claim 覆盖"风格被误判为逐元素缺失)。
      const basePath = arrayFamilyBasePath(leaf.fieldPath, arrayBasePaths)!;
      const baseLeaf = leaves.find((l) => l.fieldPath === basePath);
      if (baseLeaf && isLeafCovered(baseLeaf)) continue;
      if (!isLeafCovered(leaf)) {
        errors.push({ code: 'CLAIM_COVERAGE_INCOMPLETE', field: leaf.fieldPath, message: `该叶子没有任何 directly_supported/inference_supported 断言覆盖(整数组也未整体覆盖)` });
      }
      continue;
    }

    // 普通叶子(非数组家族成员):常规逐一判定。
    if (!isLeafCovered(leaf)) {
      const coveringClaims = evidenceList.filter((e) => e.field_path === leaf.fieldPath && acceptedVerdicts.has(e.verdict));
      if (coveringClaims.length === 0) {
        errors.push({ code: 'CLAIM_COVERAGE_INCOMPLETE', field: leaf.fieldPath, message: `该叶子没有任何 directly_supported/inference_supported 断言覆盖` });
      } else {
        errors.push({ code: 'CLAIM_COVERAGE_INCOMPLETE', field: leaf.fieldPath, message: `已接受断言的 span 并集未覆盖该叶子规范化串的全部非空白字符` });
      }
    }
  }

  // 7) 正文之外多余的 claim(其 field_path 不对应任何当前骨架可见叶子)——
  //    UNSUPPORTED_VISIBLE_CLAIM:accepted 断言指向的字段值在当前骨架里根本不存在
  //    (指向已不存在的叶子路径,可能是骨架改写后遗留的孤立证据)。
  for (const item of evidenceList) {
    if (item.verdict === 'rejected' || item.verdict === 'pending') continue;
    if (!leafByPath.has(item.field_path)) {
      errors.push({
        code: 'UNSUPPORTED_VISIBLE_CLAIM',
        field: `evidence[${item.claim_id}].field_path`,
        message: `field_path "${item.field_path}" 在当前骨架中不存在对应可见叶子,该断言无正文可支撑`,
      });
    }
  }

  // 8) 高危字段:必须 directly_supported,不得降级为 inference;源等级须达标;
  //    含数字/年份/金额/比例的断言:excerpt 须同口径出现该数值(防 2024 vs 2023 误配)。
  for (const leaf of leaves) {
    const highRisk = isHighRiskFieldPath(leaf.fieldPath) || NUMERIC_CONTENT_RE.test(leaf.normalizedValue);
    if (!highRisk) continue;
    const coveringClaims = evidenceList.filter((e) => e.field_path === leaf.fieldPath && e.verdict !== 'rejected' && e.verdict !== 'pending');
    for (const claim of coveringClaims) {
      if (claim.verdict !== 'directly_supported') {
        errors.push({ code: 'HIGH_RISK_NOT_DIRECT', field: `evidence[${claim.claim_id}]`, message: `高危字段 "${leaf.fieldPath}" 的断言必须 directly_supported,不得降级为 inference_supported` });
      }
    }
  }

  // 9) 数字同口径核对:claim_text 中出现的数字必须在 source_excerpt 中同样出现
  //    (同单位异范围如 2024 vs 2023 判为不一致)。
  for (const item of evidenceList) {
    if (item.verdict === 'rejected' || item.verdict === 'pending') continue;
    const claimNumbers = extractNumbers(item.claim_text);
    if (claimNumbers.length === 0) continue;
    const excerptNumbers = new Set(extractNumbers(item.source_excerpt));
    const mismatched = claimNumbers.filter((n) => !excerptNumbers.has(n));
    if (mismatched.length > 0) {
      errors.push({
        code: 'NUMERIC_SCOPE_MISMATCH',
        field: `evidence[${item.claim_id}]`,
        message: `claim_text 中的数值 [${mismatched.join(', ')}] 未在 source_excerpt 中同口径出现`,
      });
    }
  }

  // 10) 源等级:高危/A2 门槛字段的证据 tier 不得为 A3 单独撑起;
  //     校招门槛/考核/收入/年限须 A2 且要求两个不同 publisher host。
  for (const leaf of leaves) {
    const fieldPath = leaf.fieldPath;
    const highRisk = isHighRiskFieldPath(fieldPath) || NUMERIC_CONTENT_RE.test(leaf.normalizedValue);
    const needsA2 = requiresA2OrHigher(fieldPath);
    const coveringClaims = evidenceList.filter((e) => e.field_path === fieldPath && e.verdict !== 'rejected' && e.verdict !== 'pending');
    if (coveringClaims.length === 0) continue;

    if (highRisk && coveringClaims.every((c) => c.tier === 'A3')) {
      errors.push({ code: 'SOURCE_TIER_INSUFFICIENT', field: fieldPath, message: `高危字段不得仅由 A3 级来源验证` });
    }
    if (needsA2) {
      const meetsA2 = coveringClaims.some((c) => c.tier === 'A1' || c.tier === 'A2');
      if (!meetsA2) {
        errors.push({ code: 'SOURCE_TIER_INSUFFICIENT', field: fieldPath, message: `校招门槛/考核/收入/年限类字段须 A2 及以上来源` });
      } else {
        const a2PlusClaims = coveringClaims.filter((c) => c.tier === 'A1' || c.tier === 'A2');
        const distinctHosts = new Set(a2PlusClaims.map((c) => normalizeHost(c.source_url)));
        if (distinctHosts.size < 2) {
          errors.push({
            code: 'SOURCE_NOT_INDEPENDENT',
            field: fieldPath,
            message: `校招门槛/考核/收入/年限类字段须至少两个不同发布主体(hostname)的独立来源,当前仅 ${distinctHosts.size} 个`,
          });
        }
      }
    }
  }

  // 11) 年限字段(typical_years 非 null)须 ≥2 不同 URL 且 ≥2 不同 host。
  for (const leaf of leaves) {
    if (!isYearRangeFieldPath(leaf.fieldPath)) continue;
    const coveringClaims = evidenceList.filter((e) => e.field_path === leaf.fieldPath && e.verdict !== 'rejected' && e.verdict !== 'pending');
    const distinctUrls = new Set(coveringClaims.map((c) => c.source_url));
    const distinctHosts = new Set(coveringClaims.map((c) => normalizeHost(c.source_url)));
    if (distinctUrls.size < 2 || distinctHosts.size < 2) {
      errors.push({
        code: 'YEAR_RANGE_SOURCE_INSUFFICIENT',
        field: leaf.fieldPath,
        message: `年限字段非 null 须 ≥2 个不同 URL 且 ≥2 个不同发布主体,当前 ${distinctUrls.size} URL / ${distinctHosts.size} host`,
      });
    }
  }

  // 12) inference_supported 推理链校验:chain 非空、premises 全部 directly_supported、
  //     conclusion 与 claim_text 规范化相等、bridge_rule/scope_limit 非空、禁自引用。
  for (const item of evidenceList) {
    if (item.verdict !== 'inference_supported') continue;
    const chain = item.reasoning_chain;
    if (!chain) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain`, message: 'inference_supported 断言缺少 reasoning_chain' });
      continue;
    }
    if (chain.premise_claim_ids.includes(item.claim_id)) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain.premise_claim_ids`, message: '推理链禁止自引用(premise 包含自身 claim_id)' });
    }
    if (chain.premise_claim_ids.length === 0) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain.premise_claim_ids`, message: 'premise_claim_ids 不得为空' });
    } else {
      for (const premiseId of chain.premise_claim_ids) {
        const premise = claimById.get(premiseId);
        if (!premise || premise.verdict !== 'directly_supported') {
          errors.push({
            code: 'INFERENCE_CHAIN_INVALID',
            field: `evidence[${item.claim_id}].reasoning_chain.premise_claim_ids`,
            message: `前提 claim_id "${premiseId}" 不存在或不是 directly_supported`,
          });
        }
      }
    }
    if (!isNonEmptyText(chain.bridge_rule)) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain.bridge_rule`, message: 'bridge_rule 不得为空' });
    }
    if (!isNonEmptyText(chain.scope_limit)) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain.scope_limit`, message: 'scope_limit 不得为空' });
    }
    if (normalizeString(chain.conclusion) !== normalizeString(item.claim_text)) {
      errors.push({ code: 'INFERENCE_CHAIN_INVALID', field: `evidence[${item.claim_id}].reasoning_chain.conclusion`, message: 'conclusion 规范化后必须与 claim_text 相等' });
    }
    // 高危字段禁止走 inference(即便 chain 本身合法),已在第 8 步以 HIGH_RISK_NOT_DIRECT 报告。
  }

  // 13) inference_supported 占比 ≤0.30(按有效证据条目数计,不含 rejected/pending)。
  const effectiveEvidence = evidenceList.filter((e) => e.verdict === 'directly_supported' || e.verdict === 'inference_supported');
  const inferenceCount = effectiveEvidence.filter((e) => e.verdict === 'inference_supported').length;
  if (effectiveEvidence.length > 0 && inferenceCount / effectiveEvidence.length > 0.3) {
    errors.push({
      code: 'INFERENCE_RATIO_EXCEEDED',
      field: 'evidence',
      message: `inference_supported 占比 ${(inferenceCount / effectiveEvidence.length).toFixed(2)} 超过 0.30 上限`,
    });
  }

  const validated = errors.length === 0;
  return { validated, status: validated ? 'validated' : 'draft', errors };
}

// ─────────────────────────────────────────────
// 小工具
// ─────────────────────────────────────────────

function isNonEmptyText(v: string | null | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** 从字符串中抽取全部连续数字串(不含小数点/千分位归一化,按最简规则先做同口径核对)。 */
function extractNumbers(text: string): string[] {
  const matches = text.match(/\d+(?:\.\d+)?/g);
  return matches ?? [];
}

/**
 * span 并集是否覆盖 normalizedValue 中的全部非空白字符位置。
 * spans 为半开区间 [start, end) 列表(可能重叠/乱序),合并后与「非空白字符位置集合」比对。
 */
function isSpanUnionCoveringNonWhitespace(normalizedValue: string, spans: [number, number][]): boolean {
  const covered = new Array<boolean>(normalizedValue.length).fill(false);
  for (const [start, end] of spans) {
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(normalizedValue.length, end);
    for (let i = clampedStart; i < clampedEnd; i++) {
      covered[i] = true;
    }
  }
  for (let i = 0; i < normalizedValue.length; i++) {
    if (/\s/.test(normalizedValue[i])) continue;
    if (!covered[i]) return false;
  }
  return true;
}
