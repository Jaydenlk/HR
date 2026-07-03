/**
 * Edges · 引用完整性校验脚本(新增,p2lib 老脚手架没有对应文件)
 *
 * 来源:T3-career-wiki.md §4「occupation_edges…脚本保证零悬空引用」——edges 不设数据库级
 * 外键(理由见 migration 头注),referential 完整性只靠这层脚本 + occupation.validator.ts
 * 的 validateEdgesReferentialIntegrity 在落库前统一校验。本脚本是确定性检查套件(dim1/dim3/
 * dim6 之外)第 4 个成员,供 smoke.mjs 统一编排,也可独立 CLI 调用审计一批 edges 草案。
 *
 * 输入 JSON 形如:{ "slugs": ["a", "b", ...], "edges": [{ "from_slug", "to_slug", "type" }, ...] }
 *
 * 用法:
 *   node edges-referential-integrity.mjs <path-to-registry-snapshot.json>
 *   或: cat snapshot.json | node edges-referential-integrity.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const VALID_EDGE_TYPES = new Set(['adjacent', 'upstream', 'downstream']);

/**
 * @param {{ slugs: string[]; edges: { from_slug: string; to_slug: string; type: string }[] }} payload
 */
export function checkEdgesReferentialIntegrity(payload) {
  const slugs = Array.isArray(payload?.slugs) ? payload.slugs : [];
  const edges = Array.isArray(payload?.edges) ? payload.edges : [];
  const slugSet = new Set(slugs);

  const failures = [];
  let danglingCount = 0;
  let badTypeCount = 0;

  edges.forEach((edge, i) => {
    if (!slugSet.has(edge?.from_slug)) {
      failures.push(`edges[${i}].from_slug: 悬空引用 "${edge?.from_slug}" 不在 slug 集合内`);
      danglingCount++;
    }
    if (!slugSet.has(edge?.to_slug)) {
      failures.push(`edges[${i}].to_slug: 悬空引用 "${edge?.to_slug}" 不在 slug 集合内`);
      danglingCount++;
    }
    if (!VALID_EDGE_TYPES.has(edge?.type)) {
      failures.push(`edges[${i}].type: "${edge?.type}" 不在 adjacent/upstream/downstream 三选一内`);
      badTypeCount++;
    }
  });

  const pass = failures.length === 0;
  return {
    dim: 'edges',
    name: 'edges 引用完整性',
    pass,
    metrics: {
      total_edges: edges.length,
      total_slugs: slugSet.size,
      dangling_reference_count: danglingCount,
      bad_type_count: badTypeCount,
    },
    failures,
  };
}

// ── CLI 入口 ──────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('edges-referential-integrity.mjs')) {
  let raw = '';
  if (process.argv[2]) {
    raw = readFileSync(resolve(process.argv[2]), 'utf-8');
  } else {
    raw = readFileSync('/dev/stdin', 'utf-8');
  }
  const payload = JSON.parse(raw);
  const result = checkEdgesReferentialIntegrity(payload);
  console.log(JSON.stringify(result, null, 2));
}
