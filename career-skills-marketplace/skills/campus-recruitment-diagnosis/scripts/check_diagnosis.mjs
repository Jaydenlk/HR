#!/usr/bin/env node
// =============================================================================
// check_diagnosis.mjs —— 校招诊断「契约 + 算分」确定性硬校验(阶段 2/交付前 verify)
// -----------------------------------------------------------------------------
// 装后位置: skills/campus-recruitment-diagnosis/scripts/check_diagnosis.mjs
//   与同目录 check_fabrication.mjs 配套:fabrication 管「改写防编造」,本脚本管
//   「诊断 diagnosis 的契约完整性 + total_score 算分自洽」——引擎(LLM)自由报分时
//   常把 total_score 报成与各维之和不符(如五维实加=68 却报 76),违反
//   ../_career-skills-shared/knowledge/campus-recruitment-rubrics 标尺
//   「total_score = 各维 score 之和」铁律。本脚本用确定性规则当场拦下。
//
// 校验规则(字段名严格对齐同 skill 的 output_schema.json):
//   规则 1(总分 = 各维之和)——若 total_score 非 null/undefined:
//     必须**严格整数相等** dimensions[].score 之和;否则 FAIL,打印「应为 X 实为 Y」。
//   规则 2(每维封顶)——每个 dimension.score 必须 ≤ 其 max。
//   规则 3(惯例核查非空)——conventionChecks 必须为非空数组。
//   规则 4(面试钩子完整)——interviewHooks 必须 length ≥ 2,且每条含
//     output_schema 要求的子字段 resumeHit / interviewQuestion / prepDirection(非空)。
//   规则 5(拒报一致性)——total_score 为 null/缺省时跳过求和校验(信息不足拒报),
//     但若输入含 confidence 则其必须为 'insufficient';不含 confidence 则跳过该校验。
//
// 输入(三选一):
//   1) 参数式:   node check_diagnosis.mjs <diagnosis.json>
//                 (文件内容可为整份 skill 输出,或仅 diagnosis 子对象)
//   2) stdin 式: echo '{"diagnosis":{...},"confidence":"high"}' | node check_diagnosis.mjs
//                 (兼容顶层即 diagnosis 对象,或 {diagnosis, confidence} 包装)
//   3) 自检:     node check_diagnosis.mjs --self-test
//
// 输出:每条违规打印到 stderr;末尾打印 JSON `{"violations":["规则编号:说明",...]}` 到 stdout。
// 退出码:0 = 全部通过;1 = 存在违规;2 = 输入/用法错。
// 纯 Node ESM,无外部依赖。
// =============================================================================

import { readFileSync } from 'node:fs';

// 求和:对 dimensions[].score 取整后相加(score 为整数语义,取整防浮点误差)。
function sumDimensionScores(dimensions) {
  return dimensions.reduce((acc, d) => acc + Math.round(Number(d?.score ?? 0)), 0);
}

// 核心校验:返回 { messages }(纯函数,便于自检复用)。
// 入参 diagnosis 为 output_schema.diagnosis 子对象;confidence 为顶层置信度(可选,undefined=未提供)。
export function checkDiagnosis(diagnosis, confidence) {
  const messages = [];
  const flag = (rule, msg) => messages.push(`[规则${rule}] ${msg}`);

  if (diagnosis == null || typeof diagnosis !== 'object') {
    flag(0, 'diagnosis 缺失或非对象');
    return { messages };
  }

  const dimensions = Array.isArray(diagnosis.dimensions) ? diagnosis.dimensions : null;
  if (!dimensions || dimensions.length === 0) {
    flag(0, 'dimensions 缺失或为空数组');
  }

  // 规则 5 的判定:total_score 视为「未报」的两种形态——字段缺省 或 显式 null。
  const total = diagnosis.total_score;
  const totalReported = total !== null && total !== undefined;

  // 规则 1:总分 = 各维之和(严格整数相等)。仅在 total 已报 + dimensions 可用时校验。
  if (totalReported && dimensions) {
    const sum = sumDimensionScores(dimensions);
    const reported = Math.round(Number(total));
    if (reported !== sum) {
      flag(1, `total_score 必须等于各维 score 之和:应为 ${sum} 实为 ${reported}`);
    }
  }

  // 规则 2:每维 score ≤ max。
  if (dimensions) {
    dimensions.forEach((d, i) => {
      const score = Number(d?.score);
      const max = Number(d?.max);
      if (!Number.isFinite(score) || !Number.isFinite(max)) {
        flag(2, `dimensions[${i}] 的 score/max 非数字(score=${d?.score}, max=${d?.max})`);
      } else if (score > max) {
        flag(2, `dimensions[${i}](${d?.name ?? d?.key ?? '?'}) 的 score=${score} 超过 max=${max}`);
      }
    });
  }

  // 规则 3:conventionChecks 必须为非空数组。
  const conv = diagnosis.conventionChecks;
  if (!Array.isArray(conv) || conv.length === 0) {
    flag(3, 'conventionChecks 必须为非空数组(本土惯例核查不得缺失)');
  }

  // 规则 4:interviewHooks length ≥ 2,每条子字段齐全且非空。
  const hooks = diagnosis.interviewHooks;
  if (!Array.isArray(hooks) || hooks.length < 2) {
    flag(4, `interviewHooks 必须 ≥2 条,当前 ${Array.isArray(hooks) ? hooks.length : 'non-array'}`);
  } else {
    const REQUIRED_HOOK_FIELDS = ['resumeHit', 'interviewQuestion', 'prepDirection'];
    hooks.forEach((h, i) => {
      for (const f of REQUIRED_HOOK_FIELDS) {
        const v = h?.[f];
        if (typeof v !== 'string' || v.trim() === '') {
          flag(4, `interviewHooks[${i}] 缺少非空子字段「${f}」`);
        }
      }
    });
  }

  // 规则 5:拒报一致性——total 未报时,若提供了 confidence 则必须为 insufficient。
  if (!totalReported && confidence !== undefined) {
    if (confidence !== 'insufficient') {
      flag(5, `total_score 拒报(null/缺省)时 confidence 必须为 insufficient,当前为「${confidence}」`);
    }
  }

  return { messages };
}

// 兼容多种包装:文件/stdin 可能给整份 skill 输出({diagnosis, confidence, ...}),
// 也可能直接给 diagnosis 子对象(此时 confidence 缺省=跳过规则 5 的 confidence 校验)。
function extract(data) {
  if (data && typeof data === 'object' && data.diagnosis && typeof data.diagnosis === 'object') {
    return { diagnosis: data.diagnosis, confidence: data.confidence };
  }
  // 顶层即 diagnosis 子对象:无独立 confidence 字段可读 → undefined。
  return { diagnosis: data, confidence: undefined };
}

// 读取输入:优先单文件参数,否则读 stdin 的 JSON。
function loadInput() {
  const args = process.argv.slice(2).filter((a) => a !== '--self-test');
  const [file] = args;
  if (file) {
    return JSON.parse(readFileSync(file, 'utf8'));
  }
  return JSON.parse(readFileSync(0, 'utf8'));
}

// ---- 自检:总分≠各维和→FAIL、总分=各维和→PASS、hooks<2→FAIL、conventionChecks空→FAIL ----
function selfTest() {
  // 一份合规底座:三维 25+25+18=68,hooks 2 条齐全,conventionChecks 非空,total=68。
  const okDiagnosis = () => ({
    total_score: 68,
    dimensions: [
      { key: 'a', name: '维度A', score: 25, max: 25, why: '理由A足够长', evidenceFound: [], gap: '' },
      { key: 'b', name: '维度B', score: 25, max: 25, why: '理由B足够长', evidenceFound: [], gap: '' },
      { key: 'c', name: '维度C', score: 18, max: 20, why: '理由C足够长', evidenceFound: [], gap: '' },
    ],
    conventionChecks: [{ key: '技术栈分档', status: 'pass', note: '三档清晰' }],
    interviewHooks: [
      { resumeHit: '命中点1', interviewQuestion: '追问1', prepDirection: '准备方向1' },
      { resumeHit: '命中点2', interviewQuestion: '追问2', prepDirection: '准备方向2' },
    ],
  });

  const cases = [
    {
      name: '总分≠各维和(报76,实加68)应 FAIL',
      diagnosis: { ...okDiagnosis(), total_score: 76 },
      confidence: 'medium',
      expectViolation: true,
    },
    {
      name: '总分=各维和(68)应 PASS',
      diagnosis: okDiagnosis(),
      confidence: 'high',
      expectViolation: false,
    },
    {
      name: 'interviewHooks 不足 2 条应 FAIL',
      diagnosis: {
        ...okDiagnosis(),
        interviewHooks: [{ resumeHit: '仅一条', interviewQuestion: '追问', prepDirection: '准备' }],
      },
      confidence: 'high',
      expectViolation: true,
    },
    {
      name: 'conventionChecks 空数组应 FAIL',
      diagnosis: { ...okDiagnosis(), conventionChecks: [] },
      confidence: 'high',
      expectViolation: true,
    },
    {
      name: 'interviewHooks 缺 prepDirection 子字段应 FAIL',
      diagnosis: {
        ...okDiagnosis(),
        interviewHooks: [
          { resumeHit: '命中1', interviewQuestion: '追问1', prepDirection: '方向1' },
          { resumeHit: '命中2', interviewQuestion: '追问2' },
        ],
      },
      confidence: 'high',
      expectViolation: true,
    },
    {
      name: '某维 score 超 max 应 FAIL',
      diagnosis: {
        ...okDiagnosis(),
        total_score: 70,
        dimensions: [
          { key: 'a', name: '维度A', score: 27, max: 25, why: '理由A足够长', evidenceFound: [], gap: '' },
          { key: 'b', name: '维度B', score: 25, max: 25, why: '理由B足够长', evidenceFound: [], gap: '' },
          { key: 'c', name: '维度C', score: 18, max: 20, why: '理由C足够长', evidenceFound: [], gap: '' },
        ],
      },
      confidence: 'high',
      expectViolation: true,
    },
    {
      name: 'total_score 拒报(null)+ confidence=insufficient 应 PASS(跳过求和)',
      diagnosis: { ...okDiagnosis(), total_score: null },
      confidence: 'insufficient',
      expectViolation: false,
    },
    {
      name: 'total_score 拒报(null)但 confidence=high 应 FAIL(拒报不一致)',
      diagnosis: { ...okDiagnosis(), total_score: null },
      confidence: 'high',
      expectViolation: true,
    },
  ];

  let allPass = true;
  for (const c of cases) {
    const { messages } = checkDiagnosis(c.diagnosis, c.confidence);
    const hasViolation = messages.length > 0;
    const ok = hasViolation === c.expectViolation;
    allPass = allPass && ok;
    const tag = ok ? 'PASS' : 'FAIL';
    console.error(`  [${tag}] ${c.name} — 期望违规=${c.expectViolation}, 实际违规数=${messages.length}`);
  }

  if (allPass) {
    console.error(`SELF-TEST PASS:${cases.length} 例全部符合预期(算分自洽 + 契约完整性)。`);
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

  let raw;
  try {
    raw = loadInput();
  } catch (e) {
    console.error(`输入解析失败:${e.message}`);
    console.error('用法: node check_diagnosis.mjs <diagnosis.json>');
    console.error('  或: echo \'{"diagnosis":{...},"confidence":"high"}\' | node check_diagnosis.mjs');
    console.error('  或: node check_diagnosis.mjs --self-test');
    process.exit(2);
  }

  const { diagnosis, confidence } = extract(raw);
  const { messages } = checkDiagnosis(diagnosis, confidence);

  if (messages.length === 0) {
    console.error('PASS:诊断契约完整且 total_score 与各维之和自洽');
    console.log(JSON.stringify({ violations: [] }));
    process.exit(0);
  }

  console.error(`FAIL:发现 ${messages.length} 处诊断契约/算分问题,必须改对再交付:`);
  for (const m of messages) console.error('  - ' + m);
  console.log(JSON.stringify({ violations: messages }));
  process.exit(1);
}

main();
