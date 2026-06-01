#!/usr/bin/env node
// =============================================================================
// check_fabrication.mjs —— 通用「防编造」确定性兜底校验(交付前 verify 招式 1)
// -----------------------------------------------------------------------------
// 装后位置: ../_career-skills-shared/scripts/check_fabrication.mjs
//   供 resume-tailor / behavioral-story-builder / personal-brand-builder /
//   portfolio-project-advisor 等任何「基于用户原材料改写/扩写」的 worker 复用。
//   (campus-recruitment-diagnosis 自带的同名脚本保持原位裸 scripts/ 不动。)
//
// 用途:在「基于用户原材料的改写/扩写」交付给用户之前,用一套**确定性机械规则**
//       (不调 AI、可复现)拦截两类典型编造。两条规则提炼自后端
//       packages/api/src/ai/rewriter.service.ts 与 campus 诊断脚本:
//
//   规则 A(original 子串校验)——复刻 `!resumeText.includes(s.original)`:
//     凡「改进型」候选项(默认 type ∈ rewrite/quantify/restructure/add_keywords,
//     或任何非 gap_advice/非空 original 的项),其 original 必须是用户原文
//     (resumeText)的**逐字子串**(区分空白,与后端 includes 一致)。
//     否则说明这不是「优化已有句子」,而是凭空造句 → 违规。
//
//   规则 B(suggested 数字校验)——复刻 `hasUnsupportedNumber`:
//     把 suggested 中的占位符 `[具体数字]` 先剔除,再抓所有长度 ≥2 的数字串(\d{2,});
//     若其中任一数字在 resumeText 里找不到(逐字 includes) → 属伪造量化指标
//     (如把「回收约300份」改成「发放350份、回收率86%」)→ 违规,应改回占位符。
//     注:只校验 \d{2,}(两位及以上),与后端一致,避免误伤序号/单位里的个位数字。
//
//   gap_advice(简历没有、需用户真实具备后再写)不做内容子串校验,
//   但仍校验结构红线:original 必须为空字符串。
//
// 输入(三选一):
//   1) 参数式:   node check_fabrication.mjs <resume.txt> <candidates.json>
//   2) stdin 式: echo '{"resumeText":"...","suggestions":[...]}' | node check_fabrication.mjs
//   3) 自检:     node check_fabrication.mjs --self-test
//   兼容字段名: resumeText / resume_text / resume ; suggestions / rewrite_suggestions / candidates
//   候选项字段: original(原句) / suggested(改写后, 兼容 suggestion/rewrite) / type(可选)
//
// 输出:每条违规打印到 stderr;末尾打印 JSON `{"violations":[index,...]}` 到 stdout,
//       供调用方机械读取需降级/占位处理的候选项下标(违规 index 数组,去重升序)。
// 退出码:0 = 全部通过;1 = 存在违规;2 = 输入/用法错。
// 纯 Node ESM,无外部依赖。
// =============================================================================

import { readFileSync } from 'node:fs';

// 改进型 type 白名单:这些显式做 original 子串 + suggested 数字校验。
const IMPROVE_TYPES = new Set(['rewrite', 'quantify', 'restructure', 'add_keywords']);
const PLACEHOLDER = '[具体数字]';

// 抽取 suggested 中需核对的「具体数字」:剔除占位符后,取长度 ≥2 的数字串(复刻后端 \d{2,})。
function unsupportedNumbers(suggested, resumeText) {
  const stripped = String(suggested ?? '').split(PLACEHOLDER).join(' ');
  const nums = stripped.match(/\d{2,}/g) ?? [];
  return nums.filter((n) => !resumeText.includes(n));
}

// 兼容多种字段命名,统一拿到用户原文正文。
function pickResume(data) {
  return data.resumeText ?? data.resume_text ?? data.resume ?? '';
}

// 兼容多种字段命名 / 顶层即数组,统一拿到候选改写项数组。
function pickSuggestions(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.suggestions)) return data.suggestions;
  if (Array.isArray(data.rewrite_suggestions)) return data.rewrite_suggestions;
  if (Array.isArray(data.candidates)) return data.candidates;
  throw new Error('找不到候选改写项数组(应为 suggestions / rewrite_suggestions / candidates)');
}

// 兼容多种字段命名拿到改写后文本。
function pickSuggested(s) {
  return s?.suggested ?? s?.suggestion ?? s?.rewrite ?? '';
}

// 核心校验:返回 { indices, messages }。纯函数,便于自检复用。
export function checkFabrication(resumeText, suggestions) {
  const text = String(resumeText ?? '');
  const messages = [];
  const violationIndices = new Set();
  const flag = (i, msg) => {
    violationIndices.add(i);
    messages.push(`#${i} ${msg}`);
  };

  suggestions.forEach((s, i) => {
    const type = s?.type;
    const original = s?.original ?? '';

    // gap_advice:不查内容,只查结构红线(original 必须为空)。
    if (type === 'gap_advice') {
      if (original !== '') {
        flag(i, `(gap_advice):original 必须为空字符串(简历没有的内容),当前为「${original}」`);
      }
      return;
    }

    // 已知改进型,或未标 type 但提供了非空 original —— 都按改进型校验。
    const isImprove = IMPROVE_TYPES.has(type) || (type == null && original.length > 0);
    if (type != null && !IMPROVE_TYPES.has(type)) {
      flag(i, `:未知 type「${type}」,应为 rewrite/quantify/restructure/add_keywords/gap_advice`);
      return;
    }
    if (!isImprove) {
      // 未标 type 且 original 为空 —— 当成需用户确认的新增项,不做子串校验。
      return;
    }

    // 规则 A:original 必须是用户原文逐字子串(复刻后端 resumeText.includes)。
    if (original.length === 0) {
      flag(i, `(${type ?? 'improve'}):改进型 original 不能为空——只能优化原文里已有的句子`);
    } else if (!text.includes(original)) {
      flag(i, `(${type ?? 'improve'}):original 不是用户原文子串=凭空造句,应降级为 gap_advice。original=「${original}」`);
    }

    // 规则 B:suggested 中不得含原文里没有的 \d{2,} 数字串(复刻后端 hasUnsupportedNumber)。
    for (const n of unsupportedNumbers(pickSuggested(s), text)) {
      flag(i, `(${type ?? 'improve'}):suggested 含原文中不存在的数字「${n}」=伪造指标,应改回 ${PLACEHOLDER} 占位`);
    }
  });

  return {
    indices: [...violationIndices].sort((x, y) => x - y),
    messages,
  };
}

// 读取输入:优先两个文件参数,否则读 stdin 的 JSON。
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

// ---- 自检:一条伪造数字(应违规)+ 一条可溯源(应通过)----
function selfTest() {
  const resume = '负责校园招聘宣讲,回收约300份简历,主导2场双选会。';
  const cases = [
    {
      name: '伪造数字应被抓为违规',
      resume,
      suggestions: [
        // original 是原文子串(规则 A 通过),但 suggested 含原文没有的 350 / 86(规则 B 违规)。
        { type: 'quantify', original: '回收约300份简历', suggested: '发放350份简历,回收率86%' },
      ],
      expectViolation: true,
    },
    {
      name: '可溯源改写应通过',
      resume,
      suggestions: [
        // original 是子串;suggested 的数字 300/2 均在原文出现 → 通过。
        { type: 'rewrite', original: '主导2场双选会', suggested: '独立主导2场校园双选会,覆盖回收的300份简历' },
        // gap_advice 结构合规(original 为空)→ 通过。
        { type: 'gap_advice', original: '', suggested: '若你真实带过团队,可补充团队规模' },
      ],
      expectViolation: false,
    },
    {
      name: 'original 凭空造句应被抓为违规',
      resume,
      suggestions: [
        { type: 'rewrite', original: '管理百人团队', suggested: '管理百人团队达成KPI' },
      ],
      expectViolation: true,
    },
  ];

  let allPass = true;
  for (const c of cases) {
    const { indices } = checkFabrication(c.resume, c.suggestions);
    const hasViolation = indices.length > 0;
    const ok = hasViolation === c.expectViolation;
    allPass = allPass && ok;
    const tag = ok ? 'PASS' : 'FAIL';
    console.error(
      `  [${tag}] ${c.name} — 期望违规=${c.expectViolation}, 实际违规下标=[${indices.join(',')}]`,
    );
  }

  if (allPass) {
    console.error('SELF-TEST PASS:伪造数字/凭空造句被抓、可溯源放行。');
    process.exit(0);
  }
  console.error('SELF-TEST FAIL');
  process.exit(1);
}

function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }

  let data;
  try {
    data = loadInput();
  } catch (e) {
    console.error(`输入解析失败:${e.message}`);
    console.error('用法: node check_fabrication.mjs <resume.txt> <candidates.json>');
    console.error('  或: echo \'{"resumeText":"...","suggestions":[...]}\' | node check_fabrication.mjs');
    console.error('  或: node check_fabrication.mjs --self-test');
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

  const { indices, messages } = checkFabrication(resumeText, suggestions);

  if (indices.length === 0) {
    console.error(`PASS:${suggestions.length} 条候选改写全部通过确定性校验`);
    console.log(JSON.stringify({ violations: [] }));
    process.exit(0);
  }

  console.error(`FAIL:发现 ${messages.length} 处编造风险,涉及 ${indices.length} 条候选,需降级/占位后重交付:`);
  for (const m of messages) console.error('  - ' + m);
  console.log(JSON.stringify({ violations: indices }));
  process.exit(1);
}

main();
