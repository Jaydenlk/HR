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
 * 输入约定(content/ 目录本次不存在,属于正常情况,量产阶段才会有真实数据):
 *  - <sourceDir>/occupations/<slug>.json:单个职业的注册表元数据 + 结构主干 + 散文
 *    (T3-career-wiki.md §4「生产产物同时落 git:content/occupations/<slug>.json(主干+散文)」;
 *    本次按「2 个源文件类型 → 写 5 张表」的字面要求,把 occupation_slugs 的登记元数据、
 *    occupation_edges 的出边、occupation_aliases 的别名一并归入该文件——每个 slug 的生产
 *    产物是一份自包含的「关于这个职业的一切」,而不需要额外的全局注册表文件)。
 *  - <sourceDir>/evidence/<slug>.json:该 slug 的证据条目数组,可选(缺失按空证据处理,
 *    不视为失败——证据补齐是可增量进行的后续工作,不阻断骨架落库)。
 *
 * 校验通过才在一个事务里写入 5 张表;任何一个文件校验失败,整批(而不仅仅该文件)
 * 一条都不写——批内 edges 可能互相引用同批其它 slug,必须先收集全部候选 slug 再统一
 * 校验悬空引用,因此原子性天然是「整批」而不是「逐文件」。
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
import type { L0Board, Axis, OccupationSkeleton, OccupationEdgeType, OccupationEdgeRow } from './occupation.types';
import type { EvidenceSourceLevel, EvidenceVerdict } from './occupation-evidence.types';

const VALID_TIERS = new Set<EvidenceSourceLevel>(['A1', 'A2', 'A3']);
const VALID_VERDICTS = new Set<EvidenceVerdict>(['confirmed', 'demoted_to_b', 'rejected']);

/** content/occupations/<slug>.json 的文件形状。 */
export interface OccupationSeedFile {
  slug: string;
  name: string;
  l0: L0Board;
  l1_family: string;
  l2_scene: string;
  l3_flag: boolean;
  axis: Axis;
  skeleton: OccupationSkeleton;
  prose: string;
  cost_tokens?: number;
  aliases?: { alias: string; weight?: number }[];
  edges?: { to_slug: string; type: OccupationEdgeType; note?: string }[];
}

/** content/evidence/<slug>.json 单条条目形状。 */
export interface OccupationEvidenceSeedItem {
  field_path: string;
  claim: string;
  source_excerpt: string;
  source_url: string;
  tier: EvidenceSourceLevel;
  verdict: EvidenceVerdict;
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
    for (const field of ['field_path', 'claim', 'source_excerpt', 'source_url']) {
      if (!isNonEmptyString(rec?.[field])) {
        errors.push({ field: `${prefix}.${field}`, message: '缺失或不是非空字符串' });
        ok = false;
      }
    }
    if (!VALID_TIERS.has(rec?.tier as EvidenceSourceLevel)) {
      errors.push({ field: `${prefix}.tier`, message: `不在 A1/A2/A3 三选一内(得到 "${String(rec?.tier)}")` });
      ok = false;
    }
    if (!VALID_VERDICTS.has(rec?.verdict as EvidenceVerdict)) {
      errors.push({ field: `${prefix}.verdict`, message: `不在 confirmed/demoted_to_b/rejected 三选一内(得到 "${String(rec?.verdict)}")` });
      ok = false;
    }
    if (ok) valid.push(rec as unknown as OccupationEvidenceSeedItem);
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

  for (const file of files) {
    const filePath = path.join(occupationsDir, file);
    let parsed: OccupationSeedFile;
    try {
      parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OccupationSeedFile;
    } catch (e) {
      errors.push({ field: file, message: `JSON 解析失败: ${(e as Error).message}` });
      continue;
    }

    for (const field of ['slug', 'name', 'l0', 'l1_family', 'l2_scene', 'axis', 'prose'] as const) {
      if (!isNonEmptyString(parsed[field])) {
        errors.push({ field: `${file}.${field}`, message: '缺失或不是非空字符串' });
      }
    }
    if (typeof parsed.l3_flag !== 'boolean') {
      errors.push({ field: `${file}.l3_flag`, message: '缺失或不是布尔值' });
    }
    if (parsed.axis !== parsed.skeleton?.axis) {
      errors.push({
        field: `${file}.axis`,
        message: `顶层 axis("${String(parsed.axis)}")与 skeleton.axis("${String(parsed.skeleton?.axis)}")不一致`,
      });
    }

    const skeletonResult = validateSkeleton(parsed.skeleton);
    for (const err of skeletonResult.errors) {
      errors.push({ field: `${file}:${err.field}`, message: err.message });
    }

    // 证据文件可选:缺失按空证据处理,不视为失败。
    const evidencePath = path.join(evidenceDir, `${parsed.slug}.json`);
    if (fs.existsSync(evidencePath)) {
      let rawEvidence: unknown;
      try {
        rawEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf-8'));
      } catch (e) {
        errors.push({ field: evidencePath, message: `JSON 解析失败: ${(e as Error).message}` });
        rawEvidence = [];
      }
      const { valid, errors: evidenceErrors } = validateEvidenceItems(rawEvidence, evidencePath);
      errors.push(...evidenceErrors);
      evidenceByslug.set(parsed.slug, valid);
    } else {
      evidenceByslug.set(parsed.slug, []);
    }

    parsedFiles.push(parsed);
  }

  // 悬空引用校验:批内 slug 并入既有 DB 已注册 slug,edges 悬空引用不许出现在两者之外。
  const existingSlugRows = await dataSource.getRepository(OccupationSlug).find({ select: { slug: true } });
  const knownSlugs = new Set<string>([...existingSlugRows.map((s) => s.slug), ...parsedFiles.map((f) => f.slug)]);

  const allEdges: OccupationEdgeRow[] = [];
  for (const f of parsedFiles) {
    for (const e of f.edges ?? []) {
      allEdges.push({ from_slug: f.slug, to_slug: e.to_slug, type: e.type, note: e.note ?? '' });
    }
  }
  const edgesResult = validateEdgesReferentialIntegrity(allEdges, knownSlugs);
  errors.push(...edgesResult.errors);

  // Fail loud:整批只要有一条校验失败,一律不触碰数据库,不写任何部分脏数据。
  if (errors.length > 0) {
    return { importedSlugs: [], errors };
  }

  const importedSlugs: string[] = [];
  await dataSource.transaction(async (manager) => {
    const now = new Date();
    for (const f of parsedFiles) {
      const slugRepo = manager.getRepository(OccupationSlug);
      const existingSlugRow = await slugRepo.findOne({ where: { slug: f.slug } });
      await slugRepo.save(
        slugRepo.create({
          ...(existingSlugRow ?? {}),
          slug: f.slug,
          name: f.name,
          l0: f.l0,
          l1_family: f.l1_family,
          l2_scene: f.l2_scene,
          l3_flag: f.l3_flag,
          status: existingSlugRow?.status ?? 'in_production',
        }),
      );

      const entryRepo = manager.getRepository(OccupationEntry);
      await entryRepo.save(
        entryRepo.create({
          slug: f.slug,
          skeleton: f.skeleton,
          prose: f.prose,
          axis: f.axis,
          status: 'validated',
          cost_tokens: f.cost_tokens ?? 0,
          last_verified: now,
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

      const evidenceRepo = manager.getRepository(OccupationEvidence);
      await evidenceRepo.delete({ entry_slug: f.slug });
      for (const ev of evidenceByslug.get(f.slug) ?? []) {
        await evidenceRepo.save(
          evidenceRepo.create({
            entry_slug: f.slug,
            field_path: ev.field_path,
            claim: ev.claim,
            source_excerpt: ev.source_excerpt,
            source_url: ev.source_url,
            tier: ev.tier,
            verdict: ev.verdict,
            last_verified: now,
          }),
        );
      }

      importedSlugs.push(f.slug);
    }
  });

  return { importedSlugs, errors: [] };
}
