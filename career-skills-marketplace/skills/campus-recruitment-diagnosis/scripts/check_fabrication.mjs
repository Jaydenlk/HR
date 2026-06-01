#!/usr/bin/env node
// =============================================================================
// check_fabrication.mjs —— 校招改写「防编造」确定性兜底校验(阶段 4 自校验招式 1)
// -----------------------------------------------------------------------------
// 用途:在改写建议交付给用户之前,用一套**确定性机械规则**(不调 AI、可复现)拦截
//       两类典型编造,规则**复刻后端 packages/api/src/ai/rewriter.service.ts**:
//
//   规则 A(original 子串校验)——复刻 `!resumeText.includes(s.original)`:
//     凡 type ≠ gap_advice 的「改进型」建议(rewrite/quantify/restructure/add_keywords),
//     其 original 必须是简历原文(resumeText)的**子串**(逐字、区分空白,与后端 includes 一致)。
//     否则说明这不是「优化简历已有句子」,而是凭空造句 → 违规,应降级为 gap_advice。
//
//   规则 B(suggested 数字校验)——复刻 `hasUnsupportedNumber`:
//     把 suggested 中的占位符 `[具体数字]` 先剔除,再抓所有长度 ≥2 的数字串(\d{2,});
//     若其中任一数字在 resumeText 里找不到(逐字 includes) → 属伪造量化指标(如把
//     「回收约300份」改成「发放350份、回收率86%」)→ 违规,应把该数字改回 `[具体数字]` 占位。
//     注:只校验 \d{2,}(两位及以上),与后端一致,避免误伤序号/单位里的个位数字。
//
//   gap_advice 不做内容校验(它本就是「简历没有、需候选人真实具备后再写」的建议),
//   但仍校验其结构红线:original 必须为空字符串、reason 必须含「穿帮风险」标注。
//
// 输入(二选一):
//   1) 参数式:   node check_fabrication.mjs <resume.txt> <suggestions.json>
//   2) stdin 式: echo '{"resumeText":"...","suggestions":[...]}' | node check_fabrication.mjs
//      (兼容字段名 resume_text / rewrite_suggestions)
//
// 输出:把每条违规打印到 stderr;并在末尾打印 JSON `{"violations":[index,...]}` 到 stdout,
//       供调用方机械读取需降级处理的建议下标(违规 index 数组,去重升序)。
// 退出码:0 = 全部通过;1 = 存在违规;2 = 输入解析失败。
// =============================================================================

import { readFileSync } from 'node:fs';

// 改进型 type 白名单(这些才做 original 子串 + suggested 数字校验)
const IMPROVE_TYPES = new Set(['rewrite', 'quantify', 'restructure', 'add_keywords']);
const PLACEHOLDER = '[具体数字]';

// 抽取 suggested 中需要核对的「具体数字」:剔除占位符后,取长度 ≥2 的数字串(复刻后端 \d{2,})。
function unsupportedNumbers(suggested, resumeText) {
  const stripped = String(suggested ?? '').split(PLACEHOLDER).join(' ');
  const nums = stripped.match(/\d{2,}/g) ?? [];
  // 逐字 includes:简历里找不到的数字串即为伪造
  return nums.filter((n) => !resumeText.includes(n));
}

// 读取输入:优先用两个文件参数,否则读 stdin 的 JSON
function loadInput() {
  const [a, b] = process.argv.slice(2);
  if (a && b) {
    return {
      resumeText: readFileSync(a, 'utf8'),
      suggestions: JSON.parse(readFileSync(b, 'utf8')),
    };
  }
  const raw = readFileSync(0, 'utf8');
  return JSON.parse(raw);
}

// 兼容多种字段命名,统一拿到简历正文
function pickResume(data) {
  return data.resumeText ?? data.resume_text ?? data.resume ?? '';
}

// 兼容多种字段命名 / 顶层即数组,统一拿到改写建议数组
function pickSuggestions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.suggestions)) return data.suggestions;
  if (Array.isArray(data.rewrite_suggestions)) return data.rewrite_suggestions;
  throw new Error('找不到改写建议数组(应为 suggestions 或 rewrite_suggestions)');
}

function main() {
  let data;
  try {
    data = loadInput();
  } catch (e) {
    console.error(`输入解析失败:${e.message}`);
    process.exit(2);
  }

  let resumeText;
  let suggestions;
  try {
    resumeText = String(pickResume(data));
    suggestions = pickSuggestions(data);
  } catch (e) {
    console.error(`输入解析失败:${e.message}`);
    process.exit(2);
  }

  // 收集违规说明与违规下标
  const messages = [];
  const violationIndices = new Set();
  const flag = (i, msg) => {
    violationIndices.add(i);
    messages.push(`#${i} ${msg}`);
  };

  suggestions.forEach((s, i) => {
    const type = s?.type;

    // gap_advice:只查结构红线
    if (type === 'gap_advice') {
      if ((s.original ?? '') !== '') {
        flag(i, `(gap_advice):original 必须为空字符串,当前为「${s.original}」`);
      }
      if (!/穿帮风险/.test(s.reason ?? '')) {
        flag(i, `(gap_advice):reason 必须标注「面试穿帮风险:高——需你真实具备后再写入」`);
      }
      return;
    }

    // 未知 type
    if (!IMPROVE_TYPES.has(type)) {
      flag(i, `:未知 type「${type}」,应为 rewrite/quantify/restructure/add_keywords/gap_advice`);
      return;
    }

    // 规则 A:original 必须是简历原文子串(复刻后端 resumeText.includes)
    const original = s.original ?? '';
    if (original.length === 0) {
      flag(i, `(${type}):改进型 original 不能为空——只能优化简历里已有的原句`);
    } else if (!resumeText.includes(original)) {
      flag(i, `(${type}):original 不是简历原文子串=凭空造句,应降级为 gap_advice。original=「${original}」`);
    }

    // 规则 B:suggested 中不得含简历里没有的 \d{2,} 数字串(复刻后端 hasUnsupportedNumber)
    for (const n of unsupportedNumbers(s.suggested, resumeText)) {
      flag(i, `(${type}):suggested 含简历中不存在的数字「${n}」=伪造指标,应改回 ${PLACEHOLDER} 占位`);
    }
  });

  const indices = [...violationIndices].sort((x, y) => x - y);

  if (indices.length === 0) {
    console.error(`PASS:${suggestions.length} 条改写建议全部通过确定性校验`);
    console.log(JSON.stringify({ violations: [] }));
    process.exit(0);
  }

  console.error(`FAIL:发现 ${messages.length} 处编造风险,涉及 ${indices.length} 条建议,需降级/占位后重交付:`);
  for (const m of messages) console.error('  - ' + m);
  console.log(JSON.stringify({ violations: indices }));
  process.exit(1);
}

main();
