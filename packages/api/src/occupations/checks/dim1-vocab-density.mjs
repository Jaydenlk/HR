/**
 * Dim1 · 专业词汇密度校验脚本(改造自 p2lib worktree 分支 feat/p2-libB-phase1 下
 * 旧 phase1/checks/dim1-vocab-density.mjs;该 worktree 里另有一整条已被裁决作废、
 * 从未合并进 dev 的老流水线目录,本文件不引用/不依赖那条目录下的任何其它代码)
 *
 * 改造说明:原脚本基于老 A/B 层 + Sourced<T> 结构抽取文本,本版改为对新 8 层扁平骨架
 * (occupation.skeleton.{positioning,coordinates,boundary,operations,entry,variation,
 * threshold,trend})做通用递归抽取(见 ./text-extract.mjs),字段名与新骨架对齐。
 *
 * 阈值来源与判断口径:密度 ≥8 个/300 字、通用高频词占比 ≤15%,两个具体数字均来自老标准
 * docs/p2-libraryB-standard-v0.1.md §5.1(该文档在 p2lib worktree 里,不在本仓库 docs/ 下)。
 * T3-career-wiki.md 与总体设计原稿只确认了"词汇密度作为确定性检查项、用脚本跑"这个概念
 * (原稿三、5 条),未重新给出具体数字。本次予以保留(而非像 dim6 那样降级为纯粹存在性
 * 检查),理由:密度阈值是内容质量的通用量纲,与 A/B 层结构无关,新骨架换了字段名和层次
 * 但"要不要有足够专业词汇密度"这件事本身不因骨架改版而失效;且 T3-career-wiki.md §2.4
 * 反优绩主义修正 4 明确「每道闸在经济验证批自证价值……抓不到真错的闸,量产时砍掉」,
 * 说明阈值本就设计为可在后续经济验证批调校/淘汰的起始默认值,先用已知来源的数字起步
 * 优于本次凭空杜撰新数字。此决策已在 IMPL 报告中显式披露,供审计核实。
 *
 * 用法:
 *   node dim1-vocab-density.mjs <path-to-occupation.json>
 *   或读 stdin: cat entry.json | node dim1-vocab-density.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractSkeletonFullText, collectDefinedTerms } from './text-extract.mjs';

// ── 通用高频词列表(中文职业描述中的万能词,原样保留自老脚本) ─────────────
const GENERIC_WORDS = new Set([
  '的', '了', '和', '与', '及', '在', '对', '是', '有', '以',
  '为', '等', '可以', '能够', '需要', '要求', '具有', '拥有',
  '通过', '进行', '工作', '我们', '他们', '提升', '推动',
  '支持', '相关', '包括', '参与', '完成', '负责', '协助',
  '配合', '优化', '提高', '确保', '实现', '管理', '处理',
  '分析', '建立', '维护', '开展', '执行', '制定', '推进',
  '促进', '整合', '输出', '基于', '面向', '围绕', '针对',
]);

function countTermOccurrences(text, terms) {
  let total = 0;
  const detail = {};
  for (const term of terms) {
    let count = 0;
    let pos = 0;
    while (true) {
      const idx = text.indexOf(term, pos);
      if (idx === -1) break;
      count++;
      pos = idx + term.length;
    }
    if (count > 0) detail[term] = count;
    total += count;
  }
  return { total, detail };
}

function countAsciiProfessionalTokens(text) {
  const matches = text.match(/[A-Za-z][A-Za-z0-9]{1,}|[A-Za-z0-9]{1,}[A-Za-z][A-Za-z0-9]*/g) || [];
  const GENERIC_ASCII = new Set(['of', 'to', 'in', 'or', 'and', 'the', 'for', 'is', 'at', 'by', 'an']);
  const filtered = matches.filter((m) => m.length >= 2 && !GENERIC_ASCII.has(m.toLowerCase()));
  const tokenCounts = {};
  for (const t of filtered) {
    tokenCounts[t] = (tokenCounts[t] || 0) + 1;
  }
  return { total: filtered.length, tokenCounts };
}

function countProfessionalEntityDensity(text, terms) {
  if (!text || text.length === 0) return { density: 0, hitCount: 0, charCount: 0, hitTerms: [] };
  const charCount = text.replace(/\s/g, '').length;
  const { total: typeACount, detail: typeADetail } = countTermOccurrences(text, terms);
  const { total: typeBCount, tokenCounts } = countAsciiProfessionalTokens(text);
  const hitCount = typeACount + typeBCount;
  const hitTerms = [
    ...Object.entries(typeADetail).map(([t, n]) => `${t}(×${n})`),
    ...Object.entries(tokenCounts).slice(0, 10).map(([t, n]) => `[ASCII]${t}(×${n})`),
  ];
  const per300 = charCount > 0 ? hitCount / (charCount / 300) : 0;
  return {
    density: Math.round(per300 * 100) / 100,
    hitCount,
    typeA: typeACount,
    typeB: typeBCount,
    charCount,
    hitTerms: hitTerms.slice(0, 30),
  };
}

function calcGenericWordRatio(text) {
  if (!text || text.length === 0) return { ratio: 0, genericCount: 0, totalTokens: 0 };
  const tokens = text
    .split(/[\s,，。、；:：!！?？""''【】《》[\]()（）\-—_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
  let genericCount = 0;
  for (const token of tokens) {
    if (GENERIC_WORDS.has(token)) genericCount++;
  }
  const ratio = tokens.length > 0 ? genericCount / tokens.length : 0;
  return { ratio: Math.round(ratio * 10000) / 100, genericCount, totalTokens: tokens.length };
}

/**
 * 主校验函数:对一个词条运行 Dim1 校验。
 * @param {object} occupation - 词条 JSON 对象(顶层含 skeleton 字段)
 */
export function checkDim1(occupation) {
  const text = extractSkeletonFullText(occupation);
  const terms = collectDefinedTerms(occupation);

  const { density, typeA, typeB, charCount, hitTerms } = countProfessionalEntityDensity(text, terms);
  const { ratio: genericRatio, genericCount, totalTokens } = calcGenericWordRatio(text);

  const DENSITY_THRESHOLD = 8;
  const GENERIC_THRESHOLD = 15;

  const densityPass = density >= DENSITY_THRESHOLD;
  const genericPass = genericRatio <= GENERIC_THRESHOLD;
  const pass = densityPass && genericPass;

  const failures = [];
  if (!densityPass) {
    failures.push(
      `专业词汇密度 ${density.toFixed(2)}/300字 低于阈值 ${DENSITY_THRESHOLD}/300字` +
        `(类型A预定义命中: ${typeA} 次,类型B ASCII技术词: ${typeB} 次,文字共 ${charCount} 字)`,
    );
  }
  if (!genericPass) {
    failures.push(
      `通用高频词占比 ${genericRatio.toFixed(1)}% 超过阈值 ${GENERIC_THRESHOLD}%` +
        `(${genericCount}/${totalTokens} 词元)`,
    );
  }

  return {
    dim: 1,
    name: '专业词汇密度',
    pass,
    metrics: {
      entity_density_per_300: density,
      threshold_density: DENSITY_THRESHOLD,
      density_pass: densityPass,
      typeA_defined_term_occurrences: typeA,
      typeB_ascii_token_occurrences: typeB,
      total_defined_terms: terms.size,
      text_char_count: charCount,
      generic_word_ratio_pct: genericRatio,
      threshold_generic_pct: GENERIC_THRESHOLD,
      generic_pass: genericPass,
      generic_count: genericCount,
      total_tokens: totalTokens,
      sample_hit_terms: hitTerms.slice(0, 20),
    },
    failures,
  };
}

// ── CLI 入口 ──────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('dim1-vocab-density.mjs')) {
  let raw = '';
  if (process.argv[2]) {
    raw = readFileSync(resolve(process.argv[2]), 'utf-8');
  } else {
    // 用文件描述符 0 而非 '/dev/stdin' 字面路径读 stdin——后者在 Windows 上不存在,
    // fd 0 是跨平台(Windows/macOS/Linux)都支持的同步读法。
    raw = readFileSync(0, 'utf-8');
  }
  const occupation = JSON.parse(raw);
  const result = checkDim1(occupation);
  console.log(JSON.stringify(result, null, 2));
}
