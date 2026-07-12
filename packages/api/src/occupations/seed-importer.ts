/**
 * 职业维基 · Stage0 · seed 导入器
 *
 * 独立文件而非挂进 src/seed.ts 的理由(侦察阶段已核实,单一职责更干净):
 * seed.ts 是「灌市场薪资/面经等既有种子数据」的单体脚本,数据域和生命周期与职业维基
 * 内容生产管线完全不同(职业维基走独立的 S1-S10 workflow,不跟应用启动期 seed 同步);
 * 合并进去会让 seed.ts 承担不相关的第二职责,也会把「源目录可参数化」这个测试刚需
 * 硬拗进一个假定固定路径的脚本里。故新开文件,导出一个可被测试直接调用的函数
 * (不是又一个 `xxx().catch(...)` 式的 CLI 脚本),源目录经参数显式传入。
 *
 * TC-05(docs/refactor2/t3-gate-a-taskcards-2026-07-10.md)定稿重写,替换 TC-01~04 遗留的
 * 旧契约。核心变化:
 *  - registry 先行(TC-03):occupation_slugs 的登记元数据(name/l0/l1_family/l2_scene/
 *    l3_flag/status)只属于 registry-v1.csv,本文件消费的 content/occupations/<slug>.json
 *    收缩为 {slug,axis,skeleton,prose,cost_tokens?,aliases?,edges?}——**不再包含**那些注册
 *    表字段,本文件也**绝不调用 slugRepo** 建/改 occupation_slugs 行。每个内容文件的 slug
 *    必须已存在于 occupation_slugs,否则整批失败(未注册 slug 不再被"顺手建一行"接纳)。
 *  - evidence 文件从"可选,缺失按空处理"改为**必需**:文件不存在、文件内容为空数组,
 *    都是失败,不再放行"骨架落库、证据后补"的旧容忍契约。
 *  - evidence 形状改为 TC-02 定稿字段(claim_id/field_value_hash/span_start/span_end/
 *    claim_text/reasoning_chain/verdict 新四态枚举),claim_id 在导入过程中原样保留
 *    (不重新生成),体现"claim ID 全程沿用"的设计意图。
 *  - validated 不再是硬编码常量,而是由 occupation-coverage-gate.ts 的
 *    evaluateOccupationCoverageGate 对 {skeleton,prose,evidence} 计算得出;
 *    entry.status = gateResult.status('validated'|'draft'),last_verified 门A 阶段一律
 *    写 null(不用 new Date();门B 才引入真实 verified_at 语义)。
 *  - edges 悬空引用检查的 knownSlugs 只来自 DB 已注册 slug,不把同批内容文件的 slug
 *    自动并入——与 registry 先行的设计一致:内容文件不能靠"互相引用"绕过注册表权威性。
 *
 * 校验通过才在一个事务里写入 4 张表(entries/edges/aliases/evidence,不碰
 * occupation_slugs);任何一个文件校验失败,整批(而不仅仅该文件)一条都不写——批内
 * edges 可能互相引用同批其它 slug,必须先收集全部候选 slug 再统一校验悬空引用,因此
 * 原子性天然是「整批」而不是「逐文件」。
 */
import * as fs from 'fs';
import * as path from 'path';
import type { DataSource } from 'typeorm';
import { OccupationSlug } from './entities/occupation-slug.entity';
import { OccupationEntry } from './entities/occupation-entry.entity';
import { OccupationEdge } from './entities/occupation-edge.entity';
import { OccupationAlias } from './entities/occupation-alias.entity';
import { OccupationEvidence } from './entities/occupation-evidence.entity';
import { validateSkeleton, validateEdgesReferentialIntegrity, type ValidationError } from './occupation.validator';
import { evaluateOccupationCoverageGate, type CoverageGateEvidenceItem } from './occupation-coverage-gate';
import type { Axis, OccupationSkeleton, OccupationEdgeType, OccupationEdgeRow } from './occupation.types';
import type { EvidenceSourceLevel, EvidenceVerdict, ReasoningChain } from './occupation-evidence.types';

const VALID_TIERS = new Set<EvidenceSourceLevel>(['A1', 'A2', 'A3']);
const VALID_VERDICTS = new Set<EvidenceVerdict>(['pending', 'directly_supported', 'inference_supported', 'rejected']);

/**
 * content/occupations/<slug>.json 的文件形状(TC-05 收缩定稿)。
 * 不含 name/l0/l1_family/l2_scene/l3_flag——那些字段只属于 registry-v1.csv/occupation_slugs,
 * 由 registry-importer.ts(TC-03)独立管理,本文件绝不写、也绝不读这些字段。
 */
export interface OccupationSeedFile {
  slug: string;
  axis: Axis;
  skeleton: OccupationSkeleton;
  prose: string;
  cost_tokens?: number;
  aliases?: { alias: string; weight?: number }[];
  edges?: { to_slug: string; type: OccupationEdgeType; note?: string }[];
}

/** content/evidence/<slug>.json 单条条目形状(TC-02 定稿字段,claim_id 全程沿用不重新生成)。 */
export interface OccupationEvidenceSeedItem {
  claim_id: string;
  field_path: string;
  field_value_hash: string;
  claim_text: string;
  span_start: number;
  span_end: number;
  source_excerpt: string;
  source_url: string;
  tier: EvidenceSourceLevel;
  verdict: EvidenceVerdict;
  reasoning_chain: ReasoningChain | null;
}

export interface SeedImportResult {
  importedSlugs: string[];
  errors: ValidationError[];
  /** 无内容可导入(目录不存在/为空)时的说明,非错误。 */
  message?: string;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

/** 逐条校验 evidence 条目自身形状(TC-02 字段完整性),不做 coverage gate 语义判定(那是 evaluateOccupationCoverageGate 的职责)。 */
function validateEvidenceItems(items: unknown, filePrefix: string): { valid: OccupationEvidenceSeedItem[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!Array.isArray(items)) {
    return { valid: [], errors: [{ field: filePrefix, message: '证据文件必须是数组' }] };
  }
  const valid: OccupationEvidenceSeedItem[] = [];
  items.forEach((item: unknown, i: number) => {
    const rec = item as Record<string, unknown>;
    const prefix = `${filePrefix}[${i}]`;
    let ok = true;
    for (const field of ['claim_id', 'field_path', 'field_value_hash', 'claim_text', 'source_excerpt', 'source_url']) {
      if (!isNonEmptyString(rec?.[field])) {
        errors.push({ field: `${prefix}.${field}`, message: '缺失或不是非空字符串' });
        ok = false;
      }
    }
    if (!Number.isInteger(rec?.span_start) || !Number.isInteger(rec?.span_end)) {
      errors.push({ field: `${prefix}.span`, message: 'span_start/span_end 缺失或不是整数' });
      ok = false;
    }
    if (!VALID_TIERS.has(rec?.tier as EvidenceSourceLevel)) {
      errors.push({ field: `${prefix}.tier`, message: `不在 A1/A2/A3 三选一内(得到 "${String(rec?.tier)}")` });
      ok = false;
    }
    if (!VALID_VERDICTS.has(rec?.verdict as EvidenceVerdict)) {
      errors.push({
        field: `${prefix}.verdict`,
        message: `不在 pending/directly_supported/inference_supported/rejected 四选一内(得到 "${String(rec?.verdict)}")`,
      });
      ok = false;
    }
    if (rec?.reasoning_chain !== null && rec?.reasoning_chain !== undefined && typeof rec.reasoning_chain !== 'object') {
      errors.push({ field: `${prefix}.reasoning_chain`, message: '必须是 null 或推理链对象' });
      ok = false;
    }
    if (ok) {
      valid.push({
        claim_id: rec.claim_id as string,
        field_path: rec.field_path as string,
        field_value_hash: rec.field_value_hash as string,
        claim_text: rec.claim_text as string,
        span_start: rec.span_start as number,
        span_end: rec.span_end as number,
        source_excerpt: rec.source_excerpt as string,
        source_url: rec.source_url as string,
        tier: rec.tier as EvidenceSourceLevel,
        verdict: rec.verdict as EvidenceVerdict,
        reasoning_chain: (rec.reasoning_chain as ReasoningChain | null | undefined) ?? null,
      });
    }
  });
  return { valid, errors };
}

export async function importOccupationSeedContent(dataSource: DataSource, sourceDir: string): Promise<SeedImportResult> {
  const occupationsDir = path.join(sourceDir, 'occupations');
  const evidenceDir = path.join(sourceDir, 'evidence');

  if (!fs.existsSync(occupationsDir)) {
    return { importedSlugs: [], errors: [], message: `无内容可导入(源目录不存在: ${occupationsDir})` };
  }
  const files = fs.readdirSync(occupationsDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    return { importedSlugs: [], errors: [], message: '无内容可导入(occupations 目录为空)' };
  }

  const errors: ValidationError[] = [];
  const parsedFiles: OccupationSeedFile[] = [];
  const evidenceByslug = new Map<string, OccupationEvidenceSeedItem[]>();

  // registry 先行:内容 importer 只消费已注册 slug,绝不调用 slugRepo 建/改行。
  const existingSlugRows = await dataSource.getRepository(OccupationSlug).find({ select: { slug: true } });
  const registeredSlugs = new Set<string>(existingSlugRows.map((s) => s.slug));

  for (const file of files) {
    const filePath = path.join(occupationsDir, file);
    let parsed: OccupationSeedFile;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OccupationSeedFile;
    } catch (e) {
      errors.push({ field: file, message: `JSON 解析失败: ${(e as Error).message}` });
      continue;
    }

    for (const field of ['slug', 'axis', 'prose'] as const) {
      if (!isNonEmptyString(parsed[field])) {
        errors.push({ field: `${file}.${field}`, message: '缺失或不是非空字符串' });
      }
    }
    if (parsed.axis !== parsed.skeleton?.axis) {
      errors.push({
        field: `${file}.axis`,
        message: `顶层 axis("${String(parsed.axis)}")与 skeleton.axis("${String(parsed.skeleton?.axis)}")不一致`,
      });
    }

    // 未注册 slug 直接拒绝——内容 importer 禁止自动建 slug(那是 registry-importer 的职责)。
    if (isNonEmptyString(parsed.slug) && !registeredSlugs.has(parsed.slug)) {
      errors.push({ field: `${file}.slug`, message: `slug "${parsed.slug}" 未注册(未出现在 occupation_slugs),内容 importer 不会自动建 slug` });
    }

    const skeletonResult = validateSkeleton(parsed.skeleton);
    for (const err of skeletonResult.errors) {
      errors.push({ field: `${file}:${err.field}`, message: err.message });
    }

    // evidence 文件是必需的:缺失文件或内容为空数组都失败(废止旧版"缺失按空证据处理"契约)。
    const evidencePath = path.join(evidenceDir, `${parsed.slug}.json`);
    if (!fs.existsSync(evidencePath)) {
      errors.push({ field: evidencePath, message: `证据文件缺失(evidence 是必需的,不再按空处理): ${evidencePath}` });
    } else {
      let rawEvidence: unknown;
      try {
        rawEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
      } catch (e) {
        errors.push({ field: evidencePath, message: `JSON 解析失败: ${(e as Error).message}` });
        rawEvidence = [];
      }
      if (Array.isArray(rawEvidence) && rawEvidence.length === 0) {
        errors.push({ field: evidencePath, message: '证据文件内容为空数组,覆盖闸直接拒绝' });
      } else {
        const { valid, errors: evidenceErrors } = validateEvidenceItems(rawEvidence, evidencePath);
        errors.push(...evidenceErrors);
        evidenceByslug.set(parsed.slug, valid);
      }
    }

    parsedFiles.push(parsed);
  }

  // 悬空引用校验:knownSlugs 只来自 DB 已注册 slug,不把同批内容文件的 slug 自动并入
  // (与旧版行为的关键区别——旧版把 parsedFiles 的 slug 也加进 knownSlugs,TC-05 废止)。
  const allEdges: OccupationEdgeRow[] = [];
  for (const f of parsedFiles) {
    for (const e of f.edges ?? []) {
      allEdges.push({ from_slug: f.slug, to_slug: e.to_slug, type: e.type, note: e.note ?? '' });
    }
  }
  const edgesResult = validateEdgesReferentialIntegrity(allEdges, registeredSlugs);
  errors.push(...edgesResult.errors);

  // coverage gate:只有 Schema/跨字段/edges 全部无错时才逐 slug 计算 gate(避免 gate 报告
  // 淹没更基础的结构错误)。gate 不过 = 加入 errors,整批仍然零写入。
  const gateStatusBySlug = new Map<string, 'validated' | 'draft'>();
  if (errors.length === 0) {
    for (const f of parsedFiles) {
      const evidenceItems = evidenceByslug.get(f.slug) ?? [];
      const gateEvidence: CoverageGateEvidenceItem[] = evidenceItems.map((ev) => ({
        claim_id: ev.claim_id,
        field_path: ev.field_path,
        field_value_hash: ev.field_value_hash,
        claim_text: ev.claim_text,
        span_start: ev.span_start,
        span_end: ev.span_end,
        source_excerpt: ev.source_excerpt,
        source_url: ev.source_url,
        tier: ev.tier,
        verdict: ev.verdict,
        reasoning_chain: ev.reasoning_chain,
      }));
      const gateResult = evaluateOccupationCoverageGate({
        skeleton: f.skeleton,
        prose: f.prose,
        evidence: gateEvidence,
      });
      for (const err of gateResult.errors) {
        errors.push({ field: `${f.slug}:${err.code}:${err.field}`, message: err.message });
      }
      gateStatusBySlug.set(f.slug, gateResult.status);
    }
  }

  // Fail loud:整批只要有一条校验失败(结构/未注册 slug/证据必需/悬空引用/coverage gate),
  // 一律不触碰数据库,不写任何部分脏数据。
  if (errors.length > 0) {
    return { importedSlugs: [], errors };
  }

  const importedSlugs: string[] = [];
  await dataSource.transaction(async (manager) => {
    for (const f of parsedFiles) {
      // 不调用 slugRepo:occupation_slugs 只能由 registry-importer 建/改。

      const entryRepo = manager.getRepository(OccupationEntry);
      await entryRepo.save(
        entryRepo.create({
          slug: f.slug,
          skeleton: f.skeleton,
          prose: f.prose,
          axis: f.axis,
          status: gateStatusBySlug.get(f.slug) ?? 'draft',
          cost_tokens: f.cost_tokens ?? 0,
          // 门A 阶段一律 null:last_verified 的真实语义(所有已发布非null claim 的
          // MIN(verified_at))归门B,严禁用 new Date() 冒充。
          last_verified: null,
        }),
      );

      // 出边/别名按幂等语义处理:先清空该 slug 名下旧记录,再按本次内容重建,
      // 保证重复导入同一份内容不会累积重复行。
      const edgeRepo = manager.getRepository(OccupationEdge);
      await edgeRepo.delete({ from_slug: f.slug });
      for (const e of f.edges ?? []) {
        await edgeRepo.save(edgeRepo.create({ from_slug: f.slug, to_slug: e.to_slug, type: e.type, note: e.note ?? '' }));
      }

      const aliasRepo = manager.getRepository(OccupationAlias);
      await aliasRepo.delete({ slug: f.slug });
      for (const a of f.aliases ?? []) {
        await aliasRepo.save(aliasRepo.create({ alias: a.alias, slug: f.slug, weight: a.weight ?? 1 }));
      }

      // evidence 幂等重建:claim_id 由源文件带入并原样保留(不重新生成),
      // 与「claim ID 全程沿用」的设计意图一致——重复导入同一份内容不改变 claim_id。
      const evidenceRepo = manager.getRepository(OccupationEvidence);
      await evidenceRepo.delete({ entry_slug: f.slug });
      for (const ev of evidenceByslug.get(f.slug) ?? []) {
        await evidenceRepo.save(
          evidenceRepo.create({
            claim_id: ev.claim_id,
            entry_slug: f.slug,
            field_path: ev.field_path,
            field_value_hash: ev.field_value_hash,
            claim_text: ev.claim_text,
            span_start: ev.span_start,
            span_end: ev.span_end,
            source_excerpt: ev.source_excerpt,
            source_url: ev.source_url,
            tier: ev.tier,
            verdict: ev.verdict,
            reasoning_chain: ev.reasoning_chain,
            last_verified: null,
          }),
        );
      }

      importedSlugs.push(f.slug);
    }
  });

  return { importedSlugs, errors: [] };
}
