// 独立验证脚本：断言三段 prompt 防编造约束
'use strict';

function buildCompanyContext(lookup, companyName) {
  if (!lookup.company_known || !lookup.matched) {
    return '公司：' + (companyName || '（未提供）');
  }
  const c = lookup.matched;
  const lines = ['公司：' + c.name + '（以下公司背景来自本站公司库）'];
  if (c.sector) lines.push('行业：' + c.sector);
  if (c.company_type) lines.push('公司类型：' + c.company_type);
  if (c.role_focus && c.role_focus.length) lines.push('重点岗位方向：' + c.role_focus.join('、'));
  return lines.join('\n');
}

function buildGenerateQuestionsPrompts(lookup, companyName, role, count) {
  const antiHallucination = lookup.company_known
    ? '## 防编造规则（硬性，违反即为错误输出）\n1. 公司特定信息仅限以下“公司背景”字段所提供的内容，不得补充任何未在此列出的公司内部信息。\n2. 不得编造该公司的具体面试流程、内部评价标准、历年真题来源。\n3. 可基于公司类型与岗位方向合理推断通用题型，不得伪装成该公司独有机密信息。'
    : '## 防编造规则（硬性，违反即为错误输出）\n1. 该公司不在本站资料库，严禁编造该公司的任何具体面试风格、内部流程或评价标准。\n2. 出题完全依据 JD 内容与岗位名称驱动，以通用校招面试逻辑为准。\n3. 不得伪装了解该公司，不得用“据了解该公司通常……”等句式暗示了解该公司内情。';

  const system = '你是一位经验丰富的技术面试官，专注于帮助候选人做模拟面试练习。\n\n' + antiHallucination;

  const companyContext = buildCompanyContext(lookup, companyName);
  const hasUnknown = !lookup.company_known;
  const userPrompt = [
    '请为以下职位生成 ' + count + ' 道面试题：',
    '',
    companyContext,
    role ? '岗位：' + role : '',
    hasUnknown ? '出题策略：以通用校招面试 + JD/岗位驱动出题，不依赖对该公司的具体了解。' : '',
  ].filter(Boolean).join('\n');

  return { system, prompt: userPrompt };
}

const evaluateAnswerSystem = '你是一位专业的面试教练，负责评估候选人对面试问题的回答质量。\n\n## 防编造规则（硬性，违反即为错误输出）\n1. 评分和反馈仅依据候选人的回答内容，不得引用候选人回答中未提及的任何信息。\n2. 不得编造该公司的内部评价标准或招聘偏好。';

const generateEvaluationSystem = '你是一位资深面试教练，负责对完整的模拟面试进行综合评估。\n\n## 防编造规则（硬性，违反即为错误输出）\n1. 综合评价仅依据本次会话的问答记录，不得编造候选人未展示的能力或行为。\n2. 不得编造目标公司的内部录用标准、薪资期望或岗位内幕信息。\n3. 不得伪装了解该公司的具体面试流程或官方评价维度。';

// ===== Assertions =====
let passed = 0, failed = 0;
function assert(desc, cond) {
  if (cond) { console.log('PASS:', desc); passed++; }
  else { console.log('FAIL:', desc); failed++; }
}

// Test 1: Known company (字节跳动)
const knownLookup = {
  company_known: true,
  matched: {
    name: '字节跳动',
    sector: '互联网',
    company_type: 'big_tech',
    role_focus: ['backend', 'frontend']
  }
};
const known = buildGenerateQuestionsPrompts(knownLookup, '字节跳动', '产品经理', 5);
assert('库内公司 prompt.prompt 含"以下公司背景来自本站公司库"',
  known.prompt.includes('以下公司背景来自本站公司库'));
assert('库内公司 system 含"不得编造该公司的具体面试流程"',
  known.system.includes('不得编造该公司的具体面试流程'));
assert('库内公司 prompt.prompt 不含"通用校招面试 + JD"',
  !known.prompt.includes('通用校招面试 + JD'));

// Test 2: Unknown company (虚构)
const unknownLookup = { company_known: false, matched: null };
const unknown = buildGenerateQuestionsPrompts(unknownLookup, '量子翻斗云科技', '后端开发工程师', 5);
assert('库外公司 prompt.prompt 含"通用校招面试 + JD/岗位驱动出题"',
  unknown.prompt.includes('通用校招面试 + JD/岗位驱动出题'));
assert('库外公司 system 含"不得伪装了解该公司"',
  unknown.system.includes('不得伪装了解该公司'));
assert('库外公司 prompt.prompt 不含"以下公司背景来自本站公司库"',
  !unknown.prompt.includes('以下公司背景来自本站公司库'));

// Test 3: evaluateAnswer anti-hallucination
assert('evaluateAnswer system 含"不得引用候选人回答中未提及的任何信息"',
  evaluateAnswerSystem.includes('不得引用候选人回答中未提及的任何信息'));
assert('evaluateAnswer system 含"不得编造该公司的内部评价标准"',
  evaluateAnswerSystem.includes('不得编造该公司的内部评价标准'));

// Test 4: generateEvaluation anti-hallucination
assert('generateEvaluation system 含"不得编造目标公司的内部录用标准"',
  generateEvaluationSystem.includes('不得编造目标公司的内部录用标准'));
assert('generateEvaluation system 含"不得伪装了解该公司的具体面试流程"',
  generateEvaluationSystem.includes('不得伪装了解该公司的具体面试流程'));

console.log('\n总计:', passed, 'PASS,', failed, 'FAIL');
process.exit(failed > 0 ? 1 : 0);
