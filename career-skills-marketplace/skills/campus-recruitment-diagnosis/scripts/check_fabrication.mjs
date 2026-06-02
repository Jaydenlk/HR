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
//   规则 C(能力升格黑名单)——补规则 A/B 的盲区:
//     A/B 只抓「凭空原句」与「伪造数字」,抓不到**不带新数字的语义能力升格**——
//     如「做了→设计」「参与→推动」「负责→独立负责」「接口→REST 接口」「画图→组件化」
//     「按频次分层→RFM」「发现→验证强相关」。做法:维护一份**启发式黑名单**
//     UPGRADE_TERMS(归属/能力强词 + 技术/方法名词),对每个改进型项,凡某 term
//     出现在 suggested 而**不在 original** → flag「能力升格」,提示回退或降级 gap_advice。
//     注:这是**启发式黑名单、非穷尽**——只兜常见高频升格词;语义级夸大仍需人工
//     「逐条引语回溯」(招2)互补,二者职责不同、互不替代。原句已含该 term → 不误抓。
//
//   gap_advice 不做内容校验(它本就是「简历没有、需候选人真实具备后再写」的建议),
//   但仍校验其结构红线:original 必须为空字符串、reason 必须含「穿帮风险」标注。
//
// 输入(三选一):
//   1) 参数式:   node check_fabrication.mjs <resume.txt> <suggestions.json>
//   2) stdin 式: echo '{"resumeText":"...","suggestions":[...]}' | node check_fabrication.mjs
//      (兼容字段名 resume_text / rewrite_suggestions)
//   3) 自检:     node check_fabrication.mjs --self-test
//
// 输出:把每条违规打印到 stderr;并在末尾打印 JSON `{"violations":[index,...]}` 到 stdout,
//       供调用方机械读取需降级处理的建议下标(违规 index 数组,去重升序)。
// 退出码:0 = 全部通过;1 = 存在违规;2 = 输入解析失败。
// =============================================================================

import { readFileSync } from 'node:fs';

// 改进型 type 白名单(这些才做 original 子串 + suggested 数字校验)
const IMPROVE_TYPES = new Set(['rewrite', 'quantify', 'restructure', 'add_keywords']);
const PLACEHOLDER = '[具体数字]';

// 规则 C 黑名单(启发式、非穷尽):凡某 term 在 suggested 出现而 original 没有,即判「能力升格」。
//   归属/能力强词:把「参与/协助/做了/负责」悄悄拔高成「主导/独立/设计/架构」一类;
//   技术/方法名词:把泛泛描述拔高成具体高阶技术/方法名(简历没提=凭空贴金)。
//   与 _career-skills-shared 版保持完全一致;若调整请两处同步。
const UPGRADE_TERMS = [
  // 归属 / 能力强词
  '主导', '独立负责', '独立', '设计', '架构', '搭建', '构建', '推动', '牵头', '验证',
  // 技术 / 方法名词
  'RFM', 'RESTful', 'REST', '微调', '蒸馏', '多级缓存', '布隆过滤器', '分库分表',
  '读写分离', '组件化', '设计系统', 'AB实验', 'AB测试', '强相关', '相关性检验', 'DCF', 'LBO',
];

// 抽取 suggested 中需要核对的「具体数字」:剔除占位符后,取长度 ≥2 的数字串(复刻后端 \d{2,})。
function unsupportedNumbers(suggested, resumeText) {
  const stripped = String(suggested ?? '').split(PLACEHOLDER).join(' ');
  const nums = stripped.match(/\d{2,}/g) ?? [];
  // 逐字 includes:简历里找不到的数字串即为伪造
  return nums.filter((n) => !resumeText.includes(n));
}

// 找出 suggested 相对 original 新增的升格 term(suggested 含、original 不含)。
function upgradeTerms(suggested, original) {
  const sug = String(suggested ?? '');
  const ori = String(original ?? '');
  return UPGRADE_TERMS.filter((t) => sug.includes(t) && !ori.includes(t));
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

    // gap_advice:只查结构红线
    if (type === 'gap_advice') {
      if (original !== '') {
        flag(i, `(gap_advice):original 必须为空字符串,当前为「${original}」`);
      }
      if (!/穿帮风险/.test(s?.reason ?? '')) {
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
    if (original.length === 0) {
      flag(i, `(${type}):改进型 original 不能为空——只能优化简历里已有的原句`);
    } else if (!text.includes(original)) {
      flag(i, `(${type}):original 不是简历原文子串=凭空造句,应降级为 gap_advice。original=「${original}」`);
    }

    // 规则 B:suggested 中不得含简历里没有的 \d{2,} 数字串(复刻后端 hasUnsupportedNumber)
    for (const n of unsupportedNumbers(s?.suggested, text)) {
      flag(i, `(${type}):suggested 含简历中不存在的数字「${n}」=伪造指标,应改回 ${PLACEHOLDER} 占位`);
    }

    // 规则 C:能力升格黑名单——suggested 含、original 没有的强动词/技术名词(启发式,非穷尽)。
    for (const t of upgradeTerms(s?.suggested, original)) {
      flag(i, `(${type}):能力升格——suggested 新增原句没有的「${t}」,改进型不得新增能力/方法名词,请回退或降级为 gap_advice`);
    }
  });

  return {
    indices: [...violationIndices].sort((x, y) => x - y),
    messages,
  };
}

// ---- 自检:规则 A/B/C 各一例 + 可溯源放行 ----
function selfTest() {
  const cases = [
    {
      name: '规则B:伪造数字应被抓',
      resume: '负责校园招聘宣讲,回收约300份简历。',
      suggestions: [
        { type: 'quantify', original: '回收约300份简历', suggested: '发放350份简历,回收率86%' },
      ],
      expectViolation: true,
    },
    {
      name: '规则A:original 凭空造句应被抓',
      resume: '负责校园招聘宣讲,回收约300份简历。',
      suggestions: [
        { type: 'rewrite', original: '管理百人团队', suggested: '管理百人团队达成目标' },
      ],
      expectViolation: true,
    },
    {
      name: '规则C:做了→设计 能力升格应被抓',
      resume: '做了用户分层模块,参与活动方案。',
      suggestions: [
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
        { type: 'add_keywords', original: '做了用户分层模块', suggested: '做了用户分层模块,采用RFM模型' },
      ],
      expectViolation: true,
    },
    {
      name: '规则C:原句已含该词(设计)不应误抓',
      resume: '独立设计了订单系统的发号器模块。',
      suggestions: [
        { type: 'rewrite', original: '独立设计了订单系统的发号器模块', suggested: '独立设计了订单系统的发号器模块,日均处理订单' },
      ],
      expectViolation: false,
    },
    {
      name: '可溯源改写应通过(无新增升格词/数字)',
      resume: '负责校园招聘宣讲,回收约300份简历,主导2场双选会。',
      suggestions: [
        { type: 'rewrite', original: '主导2场双选会', suggested: '主导2场校园双选会,覆盖回收的300份简历' },
        { type: 'gap_advice', original: '', reason: '面试穿帮风险:高——需你真实具备后再写入', suggested: '若你真实带过团队,可补充团队规模' },
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
    console.error('SELF-TEST PASS:规则 A/B/C 各被抓、可溯源放行。');
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
    console.error('用法: node check_fabrication.mjs <resume.txt> <suggestions.json>');
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
