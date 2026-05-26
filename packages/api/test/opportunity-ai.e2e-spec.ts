import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { request, loginUser } from './test-utils';

/* ------------------------------------------------------------------ */
/*  Helper: poll GET /:id until evaluation completes                   */
/* ------------------------------------------------------------------ */
async function waitForEvaluation(
  app: INestApplication,
  token: string,
  oppId: string,
  maxWait = 150000,
): Promise<Record<string, unknown>> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const res = await request(app.getHttpServer())
      .get(`/api/opportunities/${oppId}`)
      .set('Authorization', `Bearer ${token}`);
    const status = res.body.status;
    if (status === 'evaluated' || status === 'failed') {
      return res.body;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Evaluation timed out after ${maxWait}ms`);
}

/* ------------------------------------------------------------------ */
/*  Helper: create opportunity, wait for eval, return evaluation       */
/* ------------------------------------------------------------------ */
async function createAndEvaluate(
  app: INestApplication,
  token: string,
  jdText: string,
): Promise<{ body: Record<string, unknown>; evaluation: Record<string, unknown> }> {
  const createRes = await request(app.getHttpServer())
    .post('/api/opportunities')
    .set('Authorization', `Bearer ${token}`)
    .send({ jd_text: jdText });

  expect(createRes.status).toBe(201);
  const oppId = createRes.body.id;

  const body = await waitForEvaluation(app, token, oppId);
  expect(body.status).toBe('evaluated');

  const evaluations = body.evaluations as Record<string, unknown>[];
  expect(Array.isArray(evaluations)).toBe(true);
  expect(evaluations.length).toBeGreaterThanOrEqual(1);

  return { body, evaluation: evaluations[0] };
}

/* ------------------------------------------------------------------ */
/*  Common assertions applied to every scenario                        */
/* ------------------------------------------------------------------ */
function assertCommonEvaluationShape(evaluation: Record<string, unknown>): void {
  expect(evaluation).toBeDefined();
  expect(typeof evaluation.match_score).toBe('number');
  expect(typeof evaluation.value_score).toBe('number');
  expect(typeof evaluation.credibility_score).toBe('number');

  expect(evaluation.match_score as number).toBeGreaterThanOrEqual(0);
  expect(evaluation.match_score as number).toBeLessThanOrEqual(100);
  expect(evaluation.value_score as number).toBeGreaterThanOrEqual(0);
  expect(evaluation.value_score as number).toBeLessThanOrEqual(100);
  expect(evaluation.credibility_score as number).toBeGreaterThanOrEqual(0);
  expect(evaluation.credibility_score as number).toBeLessThanOrEqual(100);

  expect(['strongly_recommend', 'recommend', 'neutral', 'cautious', 'not_recommend'])
    .toContain(evaluation.recommendation);

  expect(['high', 'medium', 'low', 'insufficient']).toContain(evaluation.confidence);

  expect(evaluation.risk_flags).toBeDefined();
  expect(Array.isArray(evaluation.risk_flags)).toBe(true);

  expect(Array.isArray(evaluation.next_actions)).toBe(true);
}

/* ================================================================== */
/*  Test suite — Real AI Evaluation Scenarios                          */
/* ================================================================== */
describe('Opportunity AI Evaluation (real AI, 6 scenarios)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = ':memory:';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    token = await loginUser(app, 'ai-test@coach.dev', 'AI Test User');
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  /* ================================================================ */
  /*  Scenario 1: 正常大厂校招 AI/技术岗                                */
  /* ================================================================ */
  it('Scenario 1: 正常大厂校招 — should recommend with high credibility', async () => {
    const jdText = `【字节跳动】后端开发工程师（抖音电商-交易中台）

工作地点：北京海淀区
薪资范围：25K-50K（15薪）
工作性质：全职

岗位职责：
1. 负责抖音电商交易系统核心模块的设计与开发
2. 参与高并发、高可用的分布式系统架构设计
3. 负责系统性能优化，确保交易链路的稳定性和可靠性
4. 与产品、前端团队紧密协作，推动业务需求落地

任职要求：
1. 本科及以上学历，计算机相关专业
2. 3年以上后端开发经验，精通 Go 或 Java
3. 熟悉 MySQL、Redis、消息队列等基础组件
4. 了解分布式系统原理，有大规模系统开发经验优先
5. 良好的沟通能力和团队协作精神

团队介绍：
抖音电商交易中台团队，负责整个电商交易链路的核心系统建设，日均处理千万级订单。`;

    const { evaluation } = await createAndEvaluate(app, token, jdText);

    // Log FIRST, assert after — visibility even on failure
    console.log('[Scenario 1] recommendation:', evaluation.recommendation);
    console.log('[Scenario 1] match_score:', evaluation.match_score);
    console.log('[Scenario 1] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 1] risk_flags:', JSON.stringify(evaluation.risk_flags));
    console.log('[Scenario 1] next_actions:', JSON.stringify(evaluation.next_actions));

    assertCommonEvaluationShape(evaluation);

    expect(evaluation.match_score as number).toBeGreaterThan(0);
    expect(evaluation.credibility_score as number).toBeGreaterThan(60);
    expect(['recommend', 'strongly_recommend', 'neutral']).toContain(evaluation.recommendation);

    const nextActions = evaluation.next_actions as string[];
    expect(nextActions.length).toBeGreaterThan(0);
  }, 180000);

  /* ================================================================ */
  /*  Scenario 2: 疑似 OD/外包                                        */
  /* ================================================================ */
  it('Scenario 2: 疑似OD/外包 — should flag OD risk, low credibility', async () => {
    const jdText = `【XX人力资源有限公司】Java开发工程师（驻场开发）

工作性质：项目制合同
工作地点：上海浦东（外派至甲方金融机构驻场）

岗位说明：
本岗位为驻场开发岗位，由XX人力资源有限公司招聘，外派至某大型金融机构从事系统开发工作。项目周期约12个月，期间由甲方进行日常管理。签订劳务合同，五险一金按最低基数缴纳。

要求：
1. 3年以上Java开发经验
2. 熟悉Spring Boot、MyBatis
3. 能接受驻场工作模式
4. 配合甲方工作安排

薪资：15K-20K
注：薪资由XX人力资源公司发放，非甲方直接雇佣`;

    const { evaluation } = await createAndEvaluate(app, token, jdText);
    const riskFlags = evaluation.risk_flags as string[];

    console.log('[Scenario 2] recommendation:', evaluation.recommendation);
    console.log('[Scenario 2] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 2] risk_flags:', JSON.stringify(riskFlags));

    assertCommonEvaluationShape(evaluation);

    const hasOdFlag = riskFlags.some(
      (flag) => flag.includes('suspected_od') || flag.includes('outsourc'),
    );
    expect(hasOdFlag).toBe(true);
    expect(evaluation.credibility_score as number).toBeLessThan(60);
    expect(['cautious', 'not_recommend']).toContain(evaluation.recommendation);
  }, 180000);

  /* ================================================================ */
  /*  Scenario 3: 疑似培训引流                                         */
  /* ================================================================ */
  it('Scenario 3: 疑似培训引流 — should flag training lure, not recommend', async () => {
    const jdText = `【XX科技培训学院】AI工程师学员/转行无门槛

你还在为找不到高薪工作发愁吗？0基础也能转行AI工程师！

我们提供：
- 3个月系统培训，从入门到精通
- 培训结束后直接安排就业，签订就业保障协议
- 培训费可分期支付，每月仅需2000元
- 就业后月薪15K-30K保底
- 合作企业包括BAT、华为等大厂

无需编程基础，无需相关经验，只要你有学习热情！
名额有限，先到先得，添加微信 xxx 咨询详情。

工作地点：全国各大城市均可安排`;

    const { evaluation } = await createAndEvaluate(app, token, jdText);
    const riskFlags = evaluation.risk_flags as string[];

    console.log('[Scenario 3] recommendation:', evaluation.recommendation);
    console.log('[Scenario 3] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 3] risk_flags:', JSON.stringify(riskFlags));

    assertCommonEvaluationShape(evaluation);

    // AI must either flag specific risks OR show cautious judgment via low credibility
    const hasRelevantFlag = riskFlags.some(
      (flag) =>
        flag.includes('suspected_training_lure') ||
        flag.includes('salary_unrealistic') ||
        flag.includes('untrusted_source'),
    );
    const hasCautiousJudgment =
      ['not_recommend', 'cautious'].includes(evaluation.recommendation) &&
      (evaluation.credibility_score as number) < 70;

    expect(hasRelevantFlag || hasCautiousJudgment).toBe(true);

    expect(['not_recommend', 'cautious']).toContain(evaluation.recommendation);
  }, 180000);

  /* ================================================================ */
  /*  Scenario 4: JD 过短                                              */
  /* ================================================================ */
  it('Scenario 4: JD过短 — should have low confidence and credibility', async () => {
    const jdText = '招后端开发，会写代码就行，有兴趣来聊聊，待遇好说';

    const { evaluation } = await createAndEvaluate(app, token, jdText);
    const riskFlags = evaluation.risk_flags as string[];

    console.log('[Scenario 4] recommendation:', evaluation.recommendation);
    console.log('[Scenario 4] confidence:', evaluation.confidence);
    console.log('[Scenario 4] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 4] risk_flags:', JSON.stringify(riskFlags));

    assertCommonEvaluationShape(evaluation);

    expect(['low', 'insufficient', 'medium']).toContain(evaluation.confidence);
    expect(evaluation.credibility_score as number).toBeLessThan(50);

    const hasShortOrUnclear = riskFlags.some(
      (flag) => flag.includes('jd_too_short') || flag.includes('responsibilities_unclear'),
    );
    expect(hasShortOrUnclear).toBe(true);
  }, 180000);

  /* ================================================================ */
  /*  Scenario 5: 公司名称与内容冲突                                    */
  /* ================================================================ */
  it('Scenario 5: 公司名称与内容冲突 — should flag entity mismatch', async () => {
    const jdText = `【字节跳动】社区团购运营经理

岗位职责：
1. 负责多多买菜社区团购业务在华东区域的运营管理
2. 对接拼多多总部产品和运营团队，落地社区团购策略
3. 管理区域团长资源，提升GMV和订单量
4. 分析拼多多买菜业务数据，优化运营流程

任职要求：
1. 3年以上社区团购或电商运营经验
2. 熟悉拼多多平台规则和运营玩法
3. 有社区团购团长管理经验优先
4. 了解多多买菜业务模式

薪资：20K-35K
工作地点：上海
团队：拼多多买菜-华东运营组`;

    const { evaluation } = await createAndEvaluate(app, token, jdText);
    const riskFlags = evaluation.risk_flags as string[];

    console.log('[Scenario 5] recommendation:', evaluation.recommendation);
    console.log('[Scenario 5] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 5] risk_flags:', JSON.stringify(riskFlags));

    assertCommonEvaluationShape(evaluation);

    // AI must either flag mismatch OR show cautious judgment via low credibility
    const hasMismatch = riskFlags.some(
      (flag) => flag.includes('entity_mismatch') || flag.includes('mismatch') || flag.includes('conflict'),
    );
    const hasCautiousJudgment =
      ['not_recommend', 'cautious'].includes(evaluation.recommendation) &&
      (evaluation.credibility_score as number) < 70;

    expect(hasMismatch || hasCautiousJudgment).toBe(true);
    expect(evaluation.credibility_score as number).toBeLessThan(80);
  }, 180000);

  /* ================================================================ */
  /*  Scenario 6: 薪资虚高但职责模糊                                    */
  /* ================================================================ */
  it('Scenario 6: 薪资虚高+职责模糊 — should flag salary/responsibilities risk', async () => {
    const jdText = `【某科技公司】初级开发工程师

月薪：80K-120K（你没看错！）

要求不高：
- 能写代码就行
- 学历不限，经验不限
- 有无项目经验均可

工作内容：
- 具体工作内容面议
- 入职后会有安排
- 根据项目需要灵活调配

福利待遇：
- 弹性工作
- 免费三餐
- 年终奖丰厚

有意向请直接投递简历，工作内容和细节面试时详谈。
工作地点：深圳南山区`;

    const { evaluation } = await createAndEvaluate(app, token, jdText);
    const riskFlags = evaluation.risk_flags as string[];

    console.log('[Scenario 6] recommendation:', evaluation.recommendation);
    console.log('[Scenario 6] credibility_score:', evaluation.credibility_score);
    console.log('[Scenario 6] risk_flags:', JSON.stringify(riskFlags));

    assertCommonEvaluationShape(evaluation);

    // AI must either flag salary/responsibilities OR show cautious judgment
    const hasSalaryOrUnclearFlag = riskFlags.some(
      (flag) =>
        flag.includes('salary_unrealistic') ||
        flag.includes('responsibilities_unclear') ||
        flag.includes('salary') ||
        flag.includes('unclear'),
    );
    const hasCautiousJudgment =
      ['not_recommend', 'cautious'].includes(evaluation.recommendation) &&
      (evaluation.credibility_score as number) < 70;

    expect(hasSalaryOrUnclearFlag || hasCautiousJudgment).toBe(true);
    expect(['cautious', 'not_recommend', 'neutral']).toContain(evaluation.recommendation);
  }, 180000);
});
