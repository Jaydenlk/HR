/**
 * Dim3 · 套话黑名单一票否决校验脚本(改造自 p2lib career-explore/phase1/checks/dim3-boilerplate-blacklist.mjs)
 *
 * 改造说明:黑名单词表内容中性(与 A/B 层结构无关),原样保留自
 * docs/p2-libraryB-standard-v0.1.md §5.3/§6(该文档在 p2lib worktree 里,不在本仓库 docs/ 下)。
 * 唯一改动是扫描范围——原脚本手写 A 层/B 层各自的字段清单,新版改为对 8 层扁平骨架做通用
 * 递归展平(见 ./text-extract.mjs),不再区分 A/B 层(新骨架本就没有这个区分)。
 *
 * 用法:
 *   node dim3-boilerplate-blacklist.mjs <path-to-occupation.json>
 *   或: cat entry.json | node dim3-boilerplate-blacklist.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { flattenSkeletonTextFields } from './text-extract.mjs';

// ── 套话黑名单(完整 20 词,来源: docs/p2-libraryB-standard-v0.1.md §6) ──────
export const BLACKLIST = [
  '沟通能力强',
  '团队合作',
  '责任心',
  '抗压能力强',
  '学习能力强',
  '积极主动',
  '执行力强',
  '良好的职业素养',
  '具备优秀的',
  '善于',
  '乐于',
  '认真负责',
  '热爱工作',
  '吃苦耐劳',
  '自我驱动',
  '具有良好的',
  '优秀的沟通',
  '较强的',
  '全面发展',
  '持续学习',
];

/**
 * 主校验函数:对一个词条运行 Dim3 黑名单一票否决校验。
 * @param {object} occupation - 词条 JSON 对象(顶层含 skeleton 字段)
 */
export function checkDim3(occupation) {
  const fields = occupation?.skeleton ? flattenSkeletonTextFields(occupation.skeleton) : {};
  const hits = [];

  for (const [fieldPath, text] of Object.entries(fields)) {
    for (const term of BLACKLIST) {
      const idx = text.indexOf(term);
      if (idx !== -1) {
        const start = Math.max(0, idx - 15);
        const end = Math.min(text.length, idx + term.length + 15);
        const context = text.slice(start, end);
        hits.push({ term, field: fieldPath, context: `...${context}...` });
      }
    }
  }

  const pass = hits.length === 0;
  const failures = hits.map((h) => `[${h.field}] 命中黑名单词「${h.term}」: "${h.context}"`);

  return {
    dim: 3,
    name: '套话黑名单一票否决',
    pass,
    metrics: {
      total_hit_count: hits.length,
      unique_terms_hit: [...new Set(hits.map((h) => h.term))].length,
      blacklist_size: BLACKLIST.length,
      fields_scanned: Object.keys(fields).length,
    },
    failures,
    hits: hits.map((h) => ({ term: h.term, field: h.field, context: h.context })),
  };
}

// ── CLI 入口 ──────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('dim3-boilerplate-blacklist.mjs')) {
  let raw = '';
  if (process.argv[2]) {
    raw = readFileSync(resolve(process.argv[2]), 'utf-8');
  } else {
    raw = readFileSync('/dev/stdin', 'utf-8');
  }
  const occupation = JSON.parse(raw);
  const result = checkDim3(occupation);
  console.log(JSON.stringify(result, null, 2));
}
