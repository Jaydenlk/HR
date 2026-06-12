/**
 * ai-live-probe-direct.mjs — Step 5 AI 真跑找茬（直接调用 API）
 *
 * 不启动完整 NestJS，直接构造 prompt 调用 DeepSeek/Claude API，
 * 验证生造公司"量子翻斗云科技"的出题和总评无编造。
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../packages/api/.env');

// Parse .env manually
const envLines = readFileSync(envPath, 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx < 0) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const API_KEY = env.AI_PRIMARY_API_KEY;
const BASE_URL = env.AI_PRIMARY_BASE_URL; // e.g. https://api.deepseek.com/anthropic
const MODEL = 'deepseek-chat';

if (!API_KEY) {
  console.error('AI_PRIMARY_API_KEY not found in .env');
  process.exit(1);
}

// Determine endpoint format
// DeepSeek Anthropic compat endpoint uses /v1/messages OR openai compat /v1/chat/completions
// Try OpenAI-compat: base_url/v1/chat/completions
const isAnthropicCompat = BASE_URL.includes('anthropic');
const chatEndpoint = isAnthropicCompat
  ? BASE_URL.replace('/anthropic', '') + '/v1/chat/completions'
  : BASE_URL + '/v1/chat/completions';

console.log(`API endpoint: ${chatEndpoint}`);
console.log(`Model: ${MODEL}\n`);

async function callAI(system, userPrompt, label) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1200,
  };

  const res = await fetch(chatEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  console.log(`\n=== ${label} (AI 原始输出) ===`);
  console.log(content);
  return content;
}

const FAKE_COMPANY = '量子翻斗云科技';
const FAKE_ROLE = '后端开发工程师';

// Build prompts matching mock.service.ts logic for unknown company
const genSystem = `你是一位经验丰富的技术面试官，专注于帮助候选人做模拟面试练习。
根据提供的职位描述、公司信息和岗位名称，生成高质量的面试问题。
问题类型应包括：技术/行为/项目/反问
难度应从简单到困难合理分布。
每道题都应该配有提示，帮助候选人思考答题方向。

## 防编造规则（硬性，违反即为错误输出）
1. 该公司不在本站资料库，严禁编造该公司的任何具体面试风格、内部流程或评价标准。
2. 出题完全依据 JD 内容与岗位名称驱动，以通用校招面试逻辑为准。
3. 不得伪装了解该公司，不得用"据了解该公司通常……"等句式暗示了解该公司内情。`;

const genPrompt = `请为以下职位生成 2 道面试题：

公司：${FAKE_COMPANY}（未在资料库中）
岗位：${FAKE_ROLE}
出题策略：以通用校招面试 + JD/岗位驱动出题，不依赖对该公司的具体了解。

请输出 2 道题，每道题包含：序号、类型（技术/行为/项目/反问）、主题、难度（简单/中等/困难）、问题、提示。`;

let hasFabrication = false;

try {
  const questionOutput = await callAI(genSystem, genPrompt, '出题结果');

  // 编造检测
  const FORBIDDEN = [
    { pat: /量子翻斗云科技.*(?:通常|一般|习惯|擅长|偏好|风格|流程|真题|内部|特点)/g, label: '编造公司特定面试风格' },
    { pat: /据了解.*量子翻斗/g, label: '用"据了解"伪装公司内情' },
    { pat: /该公司.*(?:通常考|惯用|独有|自己的)/g, label: '伪装了解该公司' },
    { pat: /量子翻斗.*面试(?:流程|真题|评分)/g, label: '编造面试流程/真题' },
  ];

  for (const { pat, label } of FORBIDDEN) {
    const matches = questionOutput.match(pat);
    if (matches) {
      console.error(`\nFAIL 出题编造检测 [${label}]: ${matches.join(', ')}`);
      hasFabrication = true;
    }
  }
  if (!hasFabrication) {
    console.log('\n>>> 出题编造检测 PASS');
  }

} catch (e) {
  console.error('AI 调用失败:', e.message);
  process.exit(1);
}

// 总评测试
const evalSystem = `你是一位资深面试教练，负责对完整的模拟面试进行综合评估。
根据所有问题的作答情况，给出客观、全面的综合评价。

## 防编造规则（硬性，违反即为错误输出）
1. 综合评价仅依据本次会话的问答记录，不得编造候选人未展示的能力或行为。
2. 不得编造目标公司的内部录用标准、薪资期望或岗位内幕信息。
3. 不得伪装了解该公司的具体面试流程或官方评价维度。`;

const evalPrompt = `请对以下完整模拟面试进行综合评估：

【面试背景】
公司：${FAKE_COMPANY}
岗位：${FAKE_ROLE}

【面试问答记录】
【问题 1】（技术 · 中等）请描述你实现微服务拆分的思路和实践。
【回答】我会先设计高层架构，拆分微服务边界，再逐模块实现，保持接口契约稳定。
【得分】75 分  【反馈】思路清晰

【问题 2】（行为 · 简单）讲一个你与团队意见不合并最终解决的经历。
【回答】我会通过明确目标对齐、提供数据支持来化解分歧，同时尊重团队决策流程。
【得分】70 分  【反馈】表达清晰

请给出综合评分（0-100）、等级（A+/A/B+/B等）、3条优势、3条改进方向、200字以内总结评语。`;

try {
  const evalOutput = await callAI(evalSystem, evalPrompt, '综合评估结果');

  const EVAL_FORBIDDEN = [
    { pat: /量子翻斗云科技.*(?:录用|标准|内部|流程|偏好|薪资)/g, label: '编造公司录用标准' },
    { pat: /该公司.*(?:录用|偏好|内幕|内部|面试流程)/g, label: '编造公司内情' },
    { pat: /据了解该公司/g, label: '伪装了解公司' },
  ];

  for (const { pat, label } of EVAL_FORBIDDEN) {
    const matches = evalOutput.match(pat);
    if (matches) {
      console.error(`\nFAIL 总评编造检测 [${label}]: ${matches.join(', ')}`);
      hasFabrication = true;
    }
  }
  if (!hasFabrication) {
    console.log('\n>>> 总评编造检测 PASS');
  }

} catch (e) {
  console.error('AI 调用失败:', e.message);
  process.exit(1);
}

console.log('\n======= 找茬结论 =======');
if (hasFabrication) {
  console.error('FAIL: 发现编造内容，需修改 prompt 后重跑');
  process.exit(1);
} else {
  console.log('PASS: 全程无编造生造公司风格/流程/内部信息');
}
