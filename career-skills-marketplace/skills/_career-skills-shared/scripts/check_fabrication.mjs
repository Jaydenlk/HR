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
//   规则 C(能力升格黑名单)——补规则 A/B 的盲区:
//     A/B 只抓「凭空原句」与「伪造数字」,抓不到**不带新数字的语义能力升格**——
//     如「做了→设计」「参与→推动」「负责→独立负责」「接口→REST 接口」「画图→组件化」。
//     做法:维护一份**启发式黑名单** UPGRADE_TERMS(归属/能力强词 + 技术/方法名词),
//     对每个改进型项,凡某 term 出现在 suggested(改写后)而**不在 original** → flag
//     「能力升格」,提示回退或降级为 gap_advice。
//     注:这是**启发式黑名单、非穷尽**——只兜常见高频升格词;语义级夸大仍需人工
//     「逐条引语回溯」(PLAYBOOK 自校验招 2)互补,二者职责不同、互不替代。
//     原句已含该 term(改写只是保留)→ 不误抓。
//
//   gap_advice(简历没有、需用户真实具备后再写)不做内容子串校验,
//   但仍校验结构红线:original 必须为空字符串、reason 必须含「穿帮风险」标注。
//
// 输入(三选一):
//   1) 参数式:   node check_fabrication.mjs <resume.txt> <candidates.json>
//   2) stdin 式: echo '{"resumeText":"...","suggestions":[...]}' | node check_fabrication.mjs
//   3) 自检:     node check_fabrication.mjs --self-test
//   兼容字段名: resumeText / resume_text / resume ; suggestions / rewrite_suggestions / candidates
//   候选项字段: original(原句) / suggested(改写后, 兼容 suggestion/rewrite/modified) / type(可选)
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

// 规则 C 黑名单(启发式、非穷尽):凡某 term 在 suggested 出现而 original 没有,即判「能力升格」。
//   归属/能力强词:把「参与/协助/做了/负责」悄悄拔高成「主导/独立/设计/架构」一类;
//   技术/方法名词:把泛泛描述拔高成具体高阶技术/方法名(简历没提=凭空贴金)。
//   与 campus 版保持完全一致;若调整请两处同步。
const UPGRADE_TERMS = [
  // 归属 / 能力强词
  '主导', '独立负责', '独立', '设计', '架构', '搭建', '构建', '推动', '牵头', '验证',
  // 技术 / 方法名词
  'RFM', 'RESTful', 'REST', '微调', '蒸馏', '多级缓存', '布隆过滤器', '分库分表',
  '读写分离', '组件化', '设计系统', 'AB实验', 'AB测试', '强相关', '相关性检验', 'DCF', 'LBO',
];

// 找出 suggested 相对 original 新增的升格 term(suggested 含、original 不含)。
function upgradeTerms(suggested, original) {
  const sug = String(suggested ?? '');
  const ori = String(original ?? '');
  return UPGRADE_TERMS.filter((t) => sug.includes(t) && !ori.includes(t));
}

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
// 注意 `modified`:resume-tailor 等 worker 用它命名改写后文本——漏掉它会让规则 B 的数字
// 核对读到空串、等于跳过(伪造数字蒙混过关),故必须纳入别名链。
function pickSuggested(s) {
  return s?.suggested ?? s?.suggestion ?? s?.rewrite ?? s?.modified ?? '';
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

    // gap_advice:不查内容,只查结构红线(original 必须为空 + reason 必须标穿帮风险)。
    if (type === 'gap_advice') {
      if (original !== '') {
        flag(i, `(gap_advice):original 必须为空字符串(简历没有的内容),当前为「${original}」`);
      }
      if (!/穿帮风险/.test(s?.reason ?? '')) {
        flag(i, `(gap_advice):reason 必须标注「面试穿帮风险:高——需你真实具备后再写入」`);
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

    // 规则 C:能力升格黑名单——suggested 含、original 没有的强动词/技术名词(启发式,非穷尽)。
    for (const t of upgradeTerms(pickSuggested(s), original)) {
      flag(i, `(${type ?? 'improve'}):能力升格——suggested 新增原句没有的「${t}」,改进型不得新增能力/方法名词,请回退或降级为 gap_advice`);
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
      name: 'modified 字段里的伪造数字应被抓(回归:pickSuggested 须认 modified)',
      resume,
      suggestions: [
        // 用 modified(而非 suggested)装改写后文本,含原文没有的 350/86 → 规则 B 应抓。
        { type: 'quantify', original: '回收约300份简历', modified: '发放350份简历,回收率86%' },
      ],
      expectViolation: true,
    },
    {
      name: 'gap_advice 缺穿帮风险标注应被抓(回归:reason 校验)',
      resume,
      suggestions: [
        { type: 'gap_advice', original: '', reason: '可补充团队规模', suggested: '若带过团队可写' },
      ],
      expectViolation: true,
    },
    {
      name: '可溯源改写应通过',
      resume,
      suggestions: [
        // original 是子串;suggested 数字 300/2 均在原文出现;未新增任何升格词(原句已含「主导」)→ 通过。
        { type: 'rewrite', original: '主导2场双选会', suggested: '主导2场校园双选会,覆盖回收的300份简历' },
        // gap_advice 结构合规(original 为空 + reason 标穿帮风险)→ 通过。
        { type: 'gap_advice', original: '', reason: '面试穿帮风险:高——需你真实具备后再写入', suggested: '若你真实带过团队,可补充团队规模' },
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
    {
      name: '规则C:做了→设计 能力升格应被抓',
      resume: '做了用户分层模块,参与活动方案。',
      suggestions: [
        // original 是子串、无新数字,但 suggested 凭空加「设计」=能力升格 → 规则 C 应抓。
        { type: 'rewrite', original: '做了用户分层模块', suggested: '设计了用户分层模块' },
      ],
      expectViolation: true,
    },
    {
      name: '规则C:参与→推动 能力升格应被抓',
      resume: '做了用户分层模块,参与活动方案。',
      suggestions: [
        { type: 'rewrite', original: '参与活动方案', suggested: '推动活动方案落地' },
      ],
      expectViolation: true,
    },
    {
      name: '规则C:RFM 技术名词注入应被抓',
      resume: '做了用户分层模块,参与活动方案。',
      suggestions: [
        // 原句只是「按频次分层」语义,suggested 凭空贴 RFM 方法名 → 规则 C 应抓。
        { type: 'add_keywords', original: '做了用户分层模块', suggested: '做了用户分层模块,采用RFM模型' },
      ],
      expectViolation: true,
    },
    {
      name: '规则C:原句已含该词(设计)不应误抓',
      resume: '独立设计了订单系统的发号器模块。',
      suggestions: [
        // original 本就含「独立」「设计」,suggested 保留 → 不算新增 → 不应误抓。
        { type: 'rewrite', original: '独立设计了订单系统的发号器模块', suggested: '独立设计了订单系统的发号器模块,日均处理订单' },
      ],
      expectViolation: false,
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
