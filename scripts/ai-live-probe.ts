/**
 * ai-live-probe.ts — Step 5 AI 真跑找茬
 *
 * 用生造公司名"量子翻斗云科技"走完整 2 题模拟面试流程,
 * 捕获并打印 generateQuestions 的 system+prompt 以及 AI 响应全文,
 * 人工检查有无编造该公司风格/流程语句。
 *
 * 运行方式:
 *   cd packages/api && npx ts-node -r tsconfig-paths/register ../../scripts/ai-live-probe.ts
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './src/app.module';
import { MockService } from './src/mock/mock.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const mockService = app.get(MockService);

  const FAKE_COMPANY = '量子翻斗云科技';
  const FAKE_ROLE = '后端开发工程师';

  console.log('\n======= AI 真跑找茬 =======');
  console.log(`公司: ${FAKE_COMPANY}`);
  console.log(`岗位: ${FAKE_ROLE}`);
  console.log('题目数: 2\n');

  // --- 拦截 generateQuestions 打印 prompt ---
  // 直接调用内部方法查库 + 生成 prompt
  const lookup = await mockService.lookupCompany(FAKE_COMPANY);
  console.log(`>>> 公司库查询结果: company_known=${lookup.company_known}`);
  console.log(`    (期望 false — 生造公司不应在库中)\n`);

  if (lookup.company_known) {
    console.error('FAIL: 生造公司被误识别为库内公司!');
    process.exit(1);
  }

  // 调用 AI 生成题目
  console.log('>>> 调用 generateQuestions ...');
  const questions = await mockService.generateQuestions(
    '',
    FAKE_COMPANY,
    FAKE_ROLE,
    2,
    lookup,
  );

  console.log('\n=== 生成的面试题 (全文) ===');
  for (const q of questions) {
    console.log(`\n[题目 ${q.n}] 类型:${q.type} 主题:${q.topic} 难度:${q.difficulty}`);
    console.log(`问题: ${q.question}`);
    console.log(`提示: ${q.hint}`);
  }

  // 检查：题目文本中是否含编造公司内情
  const FORBIDDEN_PATTERNS = [
    /量子翻斗云科技.*(?:通常|一般|习惯|擅长|偏好|风格|流程|真题|内部|岗位特点)/,
    /据了解.*量子翻斗/,
    /量子翻斗.*面试(?:流程|真题|评分)/,
  ];

  let hasFabrication = false;
  for (const q of questions) {
    const text = `${q.question} ${q.hint} ${q.topic}`;
    for (const pat of FORBIDDEN_PATTERNS) {
      if (pat.test(text)) {
        console.error(`\nFAIL 编造检测: 题目包含对生造公司的具体描述`);
        console.error(`  匹配模式: ${pat}`);
        console.error(`  题目文本: ${text}`);
        hasFabrication = true;
      }
    }
  }

  if (!hasFabrication) {
    console.log('\n>>> 编造检测 PASS: 题目中无编造该公司风格/流程的语句');
  }

  // 模拟作答 + 获取总评
  console.log('\n>>> 模拟作答题目 1 ...');
  const dummySession = {
    id: 'probe-session',
    user_id: 'probe-user',
    company: FAKE_COMPANY,
    role: FAKE_ROLE,
    jd_text: '',
    mode: 'text',
    status: 'in_progress',
    questions,
    answers: [],
    evaluation: null as unknown as import('./src/mock/entities/mock-session.entity').Evaluation,
    total_filler_count: 0,
    created_at: new Date(),
    application_id: '',
    user: null as unknown as import('./src/users/entities/user.entity').User,
  };

  const eval1 = await mockService.evaluateAnswer(
    questions[0].question,
    '我会先设计高层架构，拆分微服务边界，再逐模块实现，保持接口契约稳定。',
  );
  console.log(`\n=== 题目1 评分结果 ===`);
  console.log(`得分: ${eval1.score}`);
  console.log(`反馈: ${eval1.feedback}`);

  // 检查评分反馈是否有编造
  const evalForbidden = [
    /量子翻斗云科技.*(?:通常|评分|标准|期望|要求)/,
    /据了解该公司/,
  ];
  for (const pat of evalForbidden) {
    if (pat.test(eval1.feedback)) {
      console.error(`FAIL 评分编造: ${eval1.feedback}`);
      hasFabrication = true;
    }
  }

  dummySession.answers = [
    { n: 1, answer: '...', score: eval1.score, feedback: eval1.feedback, filler_count: 0 },
  ];

  const eval2 = await mockService.evaluateAnswer(
    questions[1].question,
    '我会通过明确目标对齐、提供数据支持来化解分歧，同时尊重团队决策流程。',
  );
  console.log(`\n=== 题目2 评分结果 ===`);
  console.log(`得分: ${eval2.score}`);
  console.log(`反馈: ${eval2.feedback}`);

  for (const pat of evalForbidden) {
    if (pat.test(eval2.feedback)) {
      console.error(`FAIL 评分编造: ${eval2.feedback}`);
      hasFabrication = true;
    }
  }

  dummySession.answers.push(
    { n: 2, answer: '...', score: eval2.score, feedback: eval2.feedback, filler_count: 0 },
  );

  console.log('\n>>> 生成综合评估 ...');
  const evaluation = await mockService.generateEvaluation(dummySession as unknown as import('./src/mock/entities/mock-session.entity').MockSession);
  console.log('\n=== 综合评估全文 ===');
  console.log(`综合得分: ${evaluation.overall_score} (${evaluation.overall_grade})`);
  console.log(`优势: ${evaluation.strengths.join(' / ')}`);
  console.log(`改进: ${evaluation.weaknesses.join(' / ')}`);
  console.log(`评语: ${evaluation.summary}`);

  // 检查综合评估
  const evalSummaryForbidden = [
    /量子翻斗云科技.*(?:录用|标准|内部|流程|偏好|期望薪资)/,
    /该公司.*(?:录用|偏好|内幕|内部|面试流程)/,
    /据了解该公司/,
  ];
  for (const pat of evalSummaryForbidden) {
    const text = `${evaluation.summary} ${evaluation.strengths.join(' ')} ${evaluation.weaknesses.join(' ')}`;
    if (pat.test(text)) {
      console.error(`\nFAIL 总评编造检测: ${pat}`);
      hasFabrication = true;
    }
  }

  if (!hasFabrication) {
    console.log('\n>>> 综合评估编造检测 PASS');
  }

  console.log('\n======= 找茬结论 =======');
  if (hasFabrication) {
    console.error('FAIL: 发现编造内容,需要修改 prompt 后重跑');
    process.exit(1);
  } else {
    console.log('PASS: 全程无编造生造公司的风格/流程/内部信息');
  }

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
