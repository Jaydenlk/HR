#!/usr/bin/env node
/**
 * migrate-company-taxonomy.js
 *
 * 将 company-taxonomy/*.yaml (tier1/tier2/tier3) 合并进
 * data/sources/company_seed.json，规则：
 *  - 按 canonical_name + aliases 与现有 80 家去重；现有记录字段不动
 *  - 新增公司 priority 一律 'C'
 *  - company_type 做映射（yaml 值 → seed enum）
 */

'use strict';

const path = require('path');
const fs = require('fs');

// js-yaml 在 pnpm workspace 中未直接暴露为顶层 node_modules，
// 动态解析 pnpm 内容寻址路径以避免硬编码版本号。
function requireJsYaml() {
  // 优先尝试标准路径（安装为直接依赖时可用）
  try { return require('js-yaml'); } catch (_) { /* fall through */ }
  // 回退：在 pnpm 内容存储中动态查找（取最高版本）
  const pnpmDir = path.resolve(__dirname, '../node_modules/.pnpm');
  const entries = require('fs').readdirSync(pnpmDir).filter((e) => e.startsWith('js-yaml@'));
  if (entries.length === 0) throw new Error('js-yaml 未找到，请运行 pnpm install');
  const latest = entries.sort().reverse()[0];
  return require(path.resolve(pnpmDir, latest, 'node_modules/js-yaml'));
}
const yaml = requireJsYaml();

// ── 路径 ──────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const TAXONOMY_DIR = path.join(
  ROOT,
  'career-skills-marketplace/skills/_career-skills-shared/knowledge/company-taxonomy',
);
const SEED_PATH = path.join(ROOT, 'data/sources/company_seed.json');

const YAML_FILES = [
  'companies.seed.yaml',
  'tier_2_companies.yaml',
  'tier_3_extended.yaml',
];

// ── 类型映射：yaml company_type → seed CompanyType enum ──────────────────────
const TYPE_MAP = {
  internet_big_tech:       'big_tech',
  stable_mid_tech:         'stable_mid',
  ecommerce_local:         'stable_mid',
  foreign_enterprise:      'foreign_brand',
  overseas:                'foreign_brand',
  overseas_cross_border:   'foreign_brand',
  ai_startup:              'startup_ai',
  new_energy:              'new_energy_hardtech',
  finance:                 'finance_tech_state',
  state_owned:             'finance_tech_state',
  gaming_content:          'stable_mid',
  consulting_fmcg:         'foreign_brand',
  consulting_advertising:  'foreign_brand',
  healthcare_biotech:      'stable_mid',
  // ai_robot_global 在 YAML 中未出现，但已有 seed 条目使用该类型，此处补全防止回退到 stable_mid
  ai_robot_global:         'ai_robot_global',
};

const FALLBACK_TYPE = 'stable_mid';

// ── sector 映射：yaml company_type → sector 中文标签 ─────────────────────────
// 注：YAML 源数据无 sector 字段，此字典按 company_type 语义给新增公司赋最合理的 sector。
// 映射不到的类型（YAML 未出现的）留 null 并在注释中说明。
const SECTOR_MAP = {
  internet_big_tech:       '互联网',
  stable_mid_tech:         '互联网',
  ecommerce_local:         '互联网',
  foreign_enterprise:      '外企科技',
  overseas:                '外企科技',
  overseas_cross_border:   '外企科技',
  ai_startup:              'AI创业',
  new_energy:              '新能源汽车',
  finance:                 '金融',
  state_owned:             '国企',
  gaming_content:          '游戏',
  consulting_fmcg:         '管理咨询',
  consulting_advertising:  '管理咨询',
  healthcare_biotech:      '硬科技',
  // ai_robot_global 在 YAML 中未出现，保持 null（YAML 无 sector 字段，无法推断）
};

function mapCompanyType(yamlType) {
  return TYPE_MAP[yamlType] ?? FALLBACK_TYPE;
}

// ── 从 YAML 文件解析公司列表 ─────────────────────────────────────────────────
function parseYamlCompanies(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(content);
  if (!doc || !Array.isArray(doc.companies)) return [];
  return doc.companies;
}

// ── 构建 seed 格式的公司对象 ─────────────────────────────────────────────────
function toSeedEntry(yc) {
  return {
    name: yc.canonical_name ?? yc.id ?? '',
    aliases: Array.isArray(yc.aliases) ? yc.aliases : [],
    bu_aliases: [],
    company_type: mapCompanyType(yc.company_type),
    priority: 'C',                       // 硬约束：新增一律 C
    source_preference: 'both',
    role_focus: Array.isArray(yc.main_roles)
      ? yc.main_roles.map((r) => String(r))
      : [],
    // YAML 无 sector 字段，按 company_type 语义推断；映射不到则留 null
    sector: SECTOR_MAP[yc.company_type] ?? null,
    reason_type: 'product_judgment',
    reason: null,
  };
}

// ── 主逻辑 ───────────────────────────────────────────────────────────────────
function main() {
  // 读取现有 seed
  const existing = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  if (!Array.isArray(existing)) {
    console.error('company_seed.json 格式错误，应为数组');
    process.exit(1);
  }

  // 构建现有公司名+别名 → 正规化 set，用于去重
  const knownNames = new Set();
  for (const c of existing) {
    knownNames.add(c.name.trim().toLowerCase());
    for (const a of (c.aliases ?? [])) {
      knownNames.add(a.trim().toLowerCase());
    }
    for (const a of (c.bu_aliases ?? [])) {
      knownNames.add(a.trim().toLowerCase());
    }
  }

  // 统计
  let totalYaml = 0;
  let added = 0;
  let skipped = 0;
  const tierCounts = { tier_1: 0, tier_2: 0, tier_3: 0 };
  const newEntries = [];

  for (const file of YAML_FILES) {
    const filePath = path.join(TAXONOMY_DIR, file);
    const companies = parseYamlCompanies(filePath);
    const tier = file.includes('tier_2') ? 'tier_2'
               : file.includes('tier_3') ? 'tier_3'
               : 'tier_1';

    for (const yc of companies) {
      totalYaml++;
      const canonicalName = (yc.canonical_name ?? '').trim();
      if (!canonicalName) { skipped++; continue; }

      // 去重检查：canonical_name 和 aliases 都不在已知集合中才添加
      const normalizedName = canonicalName.toLowerCase();
      const aliasesNorm = Array.isArray(yc.aliases)
        ? yc.aliases.map((a) => a.trim().toLowerCase())
        : [];

      const alreadyExists =
        knownNames.has(normalizedName) ||
        aliasesNorm.some((a) => knownNames.has(a));

      if (alreadyExists) {
        skipped++;
        continue;
      }

      // 添加到已知集合，防止 yaml 内部自身重复
      knownNames.add(normalizedName);
      for (const a of aliasesNorm) knownNames.add(a);

      const entry = toSeedEntry(yc);
      newEntries.push(entry);
      tierCounts[tier]++;
      added++;
    }
  }

  const merged = [...existing, ...newEntries];

  // 写回
  fs.writeFileSync(SEED_PATH, JSON.stringify(merged, null, 2), 'utf-8');

  console.log('=== 转换统计 ===');
  console.log(`YAML 中扫描公司总数: ${totalYaml}`);
  console.log(`现有 seed 数量(合并前): ${existing.length}`);
  console.log(`去重跳过: ${skipped}`);
  console.log(`新增: ${added}`);
  console.log(`  tier_1 新增: ${tierCounts.tier_1}`);
  console.log(`  tier_2 新增: ${tierCounts.tier_2}`);
  console.log(`  tier_3 新增: ${tierCounts.tier_3}`);
  console.log(`合并后总数: ${merged.length}`);
  console.log(`输出路径: ${SEED_PATH}`);
  console.log('');

  // 校验：新增公司 priority 全为 C
  const nonC = newEntries.filter((e) => e.priority !== 'C');
  if (nonC.length > 0) {
    console.error(`错误：${nonC.length} 条新增公司 priority 不为 C！`);
    process.exit(1);
  }
  console.log('校验通过：所有新增公司 priority = C');
}

main();
