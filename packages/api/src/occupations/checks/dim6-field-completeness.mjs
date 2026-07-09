/**
 * Dim6 · 字段完整度校验脚本(改造自 p2lib worktree 分支 feat/p2-libB-phase1 下
 * 旧 phase1/checks/dim6-field-completeness.mjs;该 worktree 里另有一整条已被裁决
 * 作废、从未合并进 dev 的老流水线目录,本文件不引用/不依赖那条目录下的任何其它代码)
 *
 * ⚠️ 降级说明(IMPL 报告已展开):老脚本里的具体数字下限
 * (A.deliverables.value.length≥5 / A.tools_systems.value.length≥5 / A.eval_metrics.value.length≥3 /
 * B.hidden_barriers 实质字段≥4 类等)来自老标准 docs/p2-libraryB-standard-v0.1.md §5.6
 * (该文档在 p2lib worktree 里,不在本仓库 docs/ 下)。T3-career-wiki.md 与总体设计原稿都
 * 没有重申任何这类具体数字,且新 8 层骨架的字段重新分层/改名,老数字与新字段已不是同一
 * 语境下的"合理下限"。本次按 IMPL_PROMPT 指示不凭空沿用旧数字,把字段完整度检查降级为
 * 「必填字段非空 + 类型正确」——数组要求非空(length≥1),字符串要求非空,不再断言任何
 * 具体条数下限。唯二例外:①坐标层 adjacent_occupations 与边界层 adjacent_diffs 的"≥3"
 * 下限有 T3-career-wiki.md/原稿明文依据("与 ≥3 个相邻职业的真实差异")予以保留;
 * ②domain_specifics"≤5"上限是 T3 §3 明文的封顶数字,同样保留。
 *
 * 用法:
 *   node dim6-field-completeness.mjs <path-to-occupation.json>
 *   或: cat entry.json | node dim6-field-completeness.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 与 occupation.types.ts 的 AXIS_VALUES 保持同步(该常量是唯一权威源;此处为保持
// checks/*.mjs 不依赖已编译 TS 产物、可独立以纯 JS 运行,做一次内容对齐的手工镜像)。
const AXIS_VALUES = new Set([
  'product_lifecycle',
  'project_delivery',
  'accreditation_cycle',
  'crop_cycle',
  'case_cycle',
  'patient_flow',
  'fiscal_cycle',
  'academic_cycle',
  'campaign_cycle',
  'ops_routine',
]);

const DOMAIN_SPECIFICS_MAX = 5;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function isNonEmptyStringArray(v, minItems = 1) {
  return Array.isArray(v) && v.length >= minItems && v.every((item) => isNonEmptyString(item));
}

export function checkDim6(occupation) {
  const failures = [];
  const details = {};

  // ── 顶层元数据必填字段 ────────────────────────────────────────
  for (const f of ['slug', 'name', 'l0', 'l1_family', 'l2_scene']) {
    if (!isNonEmptyString(occupation?.[f])) {
      failures.push(`顶层.${f}: 必填字段缺失或不是非空字符串`);
    }
  }
  if (typeof occupation?.l3_flag !== 'boolean') {
    failures.push('顶层.l3_flag: 必填字段缺失或不是布尔值');
  }
  if (!isNonEmptyString(occupation?.axis) || !AXIS_VALUES.has(occupation.axis)) {
    failures.push(`顶层.axis: 缺失或不在 10 个枚举值内(得到 "${occupation?.axis}")`);
  }

  const skeleton = occupation?.skeleton;
  if (!skeleton || typeof skeleton !== 'object') {
    failures.push('skeleton: 整个字段缺失');
    return {
      dim: 6,
      name: '字段完整度',
      pass: false,
      metrics: { ...details, failure_count: failures.length },
      failures,
    };
  }

  // ── 1. 定位层 ──
  const positioning = skeleton.positioning;
  if (!positioning) failures.push('skeleton.positioning: 整层缺失');
  else {
    for (const f of ['one_liner', 'problem_solved', 'social_rationale']) {
      if (!isNonEmptyString(positioning[f])) failures.push(`skeleton.positioning.${f}: 缺失或不是非空字符串`);
    }
  }

  // ── 2. 坐标层 ──
  const coordinates = skeleton.coordinates;
  if (!coordinates) failures.push('skeleton.coordinates: 整层缺失');
  else {
    if (!isNonEmptyString(coordinates.occupation_family)) failures.push('skeleton.coordinates.occupation_family: 缺失或不是非空字符串');
    if (!isNonEmptyStringArray(coordinates.industry_scenes)) failures.push('skeleton.coordinates.industry_scenes: 缺失或为空数组');
    const adjLen = Array.isArray(coordinates.adjacent_occupations) ? coordinates.adjacent_occupations.length : 0;
    details.adjacent_occupations_count = adjLen;
    if (!isNonEmptyStringArray(coordinates.adjacent_occupations, 3)) {
      failures.push(`skeleton.coordinates.adjacent_occupations: 数量 ${adjLen} 低于下限 3(T3 §3/原稿明文要求)`);
    }
    if (!isNonEmptyStringArray(coordinates.upstream)) failures.push('skeleton.coordinates.upstream: 缺失或为空数组');
    if (!isNonEmptyStringArray(coordinates.downstream)) failures.push('skeleton.coordinates.downstream: 缺失或为空数组');
  }

  // ── 3. 边界层 ──
  const boundary = skeleton.boundary;
  if (!boundary) failures.push('skeleton.boundary: 整层缺失');
  else {
    const diffs = boundary.adjacent_diffs;
    const diffLen = Array.isArray(diffs) ? diffs.length : 0;
    details.adjacent_diffs_count = diffLen;
    if (!Array.isArray(diffs) || diffLen < 3) {
      failures.push(`skeleton.boundary.adjacent_diffs: 数量 ${diffLen} 低于下限 3(百科最核心模块)`);
    } else {
      diffs.forEach((d, i) => {
        if (!isNonEmptyString(d?.occupation)) failures.push(`skeleton.boundary.adjacent_diffs[${i}].occupation: 缺失或不是非空字符串`);
        if (!isNonEmptyString(d?.diff)) failures.push(`skeleton.boundary.adjacent_diffs[${i}].diff: 缺失或不是非空字符串`);
      });
    }
  }

  // ── 4. 实操层 ──
  const operations = skeleton.operations;
  if (!operations) failures.push('skeleton.operations: 整层缺失');
  else {
    const wf = operations.workflow;
    if (!wf || typeof wf !== 'object') failures.push('skeleton.operations.workflow: 整字段缺失');
    else {
      for (const f of ['daily', 'project', 'cycle']) {
        if (!isNonEmptyString(wf[f])) failures.push(`skeleton.operations.workflow.${f}: 缺失或不是非空字符串`);
      }
    }
    if (!isNonEmptyStringArray(operations.deliverables)) failures.push('skeleton.operations.deliverables: 缺失或为空数组');
    if (!isNonEmptyStringArray(operations.tools_systems)) failures.push('skeleton.operations.tools_systems: 缺失或为空数组');
    if (!isNonEmptyStringArray(operations.eval_metrics)) failures.push('skeleton.operations.eval_metrics: 缺失或为空数组');
  }

  // ── 5. 入行层 ──
  const entry = skeleton.entry;
  if (!entry) failures.push('skeleton.entry: 整层缺失');
  else {
    if (!isNonEmptyStringArray(entry.eligible_majors)) failures.push('skeleton.entry.eligible_majors: 缺失或为空数组');
    if (!isNonEmptyString(entry.non_major_route)) failures.push('skeleton.entry.non_major_route: 缺失或不是非空字符串');
    if (!isNonEmptyStringArray(entry.campus_recruitment_signals)) failures.push('skeleton.entry.campus_recruitment_signals: 缺失或为空数组');
    if (!isNonEmptyStringArray(entry.resume_valid_experiences)) failures.push('skeleton.entry.resume_valid_experiences: 缺失或为空数组');
    if (!isNonEmptyStringArray(entry.resume_looks_relevant_but_useless)) failures.push('skeleton.entry.resume_looks_relevant_but_useless: 缺失或为空数组');
  }

  // ── 6. 差异层 ──
  const variation = skeleton.variation;
  if (!variation) failures.push('skeleton.variation: 整层缺失');
  else {
    const industryDiffs = variation.industry_diffs;
    if (!Array.isArray(industryDiffs) || industryDiffs.length < 1) {
      failures.push('skeleton.variation.industry_diffs: 缺失或为空数组');
    } else {
      industryDiffs.forEach((d, i) => {
        if (!isNonEmptyString(d?.scene)) failures.push(`skeleton.variation.industry_diffs[${i}].scene: 缺失或不是非空字符串`);
        if (!isNonEmptyString(d?.diff)) failures.push(`skeleton.variation.industry_diffs[${i}].diff: 缺失或不是非空字符串`);
      });
    }
    const orgDiffs = variation.org_nature_diffs;
    if (!Array.isArray(orgDiffs) || orgDiffs.length < 1) {
      failures.push('skeleton.variation.org_nature_diffs: 缺失或为空数组');
    } else {
      orgDiffs.forEach((d, i) => {
        if (!isNonEmptyString(d?.org_nature)) failures.push(`skeleton.variation.org_nature_diffs[${i}].org_nature: 缺失或不是非空字符串`);
        if (!isNonEmptyString(d?.diff)) failures.push(`skeleton.variation.org_nature_diffs[${i}].diff: 缺失或不是非空字符串`);
      });
    }
  }

  // ── 7. 门槛层 ──
  const threshold = skeleton.threshold;
  if (!threshold) failures.push('skeleton.threshold: 整层缺失');
  else {
    for (const f of ['hidden_cost', 'attrition_reality', 'income_structure', 'common_misconceptions', 'who_should_not']) {
      if (!isNonEmptyString(threshold[f])) failures.push(`skeleton.threshold.${f}: 缺失或不是非空字符串`);
    }
  }

  // ── 8. 发展层 ──
  const development = skeleton.development;
  if (!development) failures.push('skeleton.development: 整层缺失');
  else {
    if (!isNonEmptyStringArray(development.promotion_path)) failures.push('skeleton.development.promotion_path: 缺失或为空数组');
    if (!isNonEmptyString(development.ceiling)) failures.push('skeleton.development.ceiling: 缺失或不是非空字符串');
    if (!isNonEmptyStringArray(development.lateral_moves)) failures.push('skeleton.development.lateral_moves: 缺失或为空数组');
  }

  // ── 9. 趋势层 ──
  const trend = skeleton.trend;
  if (!trend) failures.push('skeleton.trend: 整层缺失');
  else {
    for (const f of ['ai_tasks_replaced', 'ai_tasks_augmented', 'ai_new_skills']) {
      if (!isNonEmptyStringArray(trend[f])) failures.push(`skeleton.trend.${f}: 缺失或为空数组`);
    }
  }

  // ── domain_specifics 封顶 5 条(T3 §3 明文,非老标准数字,予以保留) ──
  const domainSpecifics = skeleton.domain_specifics;
  if (!Array.isArray(domainSpecifics)) {
    failures.push('skeleton.domain_specifics: 缺失或不是数组');
  } else if (domainSpecifics.length > DOMAIN_SPECIFICS_MAX) {
    failures.push(`skeleton.domain_specifics: 条数 ${domainSpecifics.length} 超过封顶 ${DOMAIN_SPECIFICS_MAX} 条`);
  }
  details.domain_specifics_count = Array.isArray(domainSpecifics) ? domainSpecifics.length : 0;

  const pass = failures.length === 0;
  return {
    dim: 6,
    name: '字段完整度',
    pass,
    metrics: { ...details, failure_count: failures.length },
    failures,
  };
}

// ── CLI 入口 ──────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('dim6-field-completeness.mjs')) {
  let raw = '';
  if (process.argv[2]) {
    raw = readFileSync(resolve(process.argv[2]), 'utf-8');
  } else {
    // 用文件描述符 0 而非 '/dev/stdin' 字面路径读 stdin——后者在 Windows 上不存在。
    raw = readFileSync(0, 'utf-8');
  }
  const occupation = JSON.parse(raw);
  const result = checkDim6(occupation);
  console.log(JSON.stringify(result, null, 2));
}
