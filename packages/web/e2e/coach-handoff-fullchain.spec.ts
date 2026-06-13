/**
 * Playwright e2e — Coach handoff 行动卡片全链路验收(重建丢失的回归资产)
 *
 * 业务链路(对话当调度台 → 模块当执行场):
 *   Coach 回复尾部输出 handoff 提议 → 后端落 coach_handoffs 记录 + assistant message.rich_card
 *   → 聊天页渲染「行动卡片」(Coach 为你准备了 · 模拟面试)
 *   → 点「一键开始」跳 /mock?handoff=<id>
 *   → 模块页弹「确认框」→ 确认(accept)预填表单 + PATCH accepted
 *   → 「暂不」路径(dismiss)卡片置灰、不重复弹
 *   → 越权(他人 handoff)404
 *
 * 覆盖剧本(step→verify):
 *   1. 夹具造 rich_card 消息 + coach_handoffs 记录 → verify: 聊天页出现「一键开始」按钮
 *   2. 点「一键开始」 → verify: URL 含 /mock?handoff=<id>,确认框「Coach 为你准备了」出现
 *   3. 确认框点「是,开始」 → verify: 模拟面试创建框打开且公司/岗位已预填,handoff 状态=accepted
 *   4. 卡片「暂不」路径 → verify: 卡片置灰显示「已跳过」,handoff 状态=dismissed
 *   5. 已 dismissed 的 handoff 再访问 /mock?handoff= → verify: 不弹确认框
 *   6. 越权:他人 handoff GET → verify: 404(API 层);前端确认框不出现
 *
 * 依赖:
 *   - API 在 http://localhost:3002 运行(DEV_LOGIN=1)
 *   - Web 在 http://localhost:3001 运行
 *   - Postgres(coach/coach@localhost:5432)— 夹具直插 conversations/messages/coach_handoffs
 *
 * 夹具策略:无公共建卡接口(卡片由 Coach AI 解析产生),故用 pg 直插三表造数据,
 *   再由真实浏览器走完渲染→点击→跳转→确认链路(只造数据,不 mock 交互)。
 *   pg 模块从 api 包 node_modules 加载(web 包未装 pg)。
 *
 * 运行: cd packages/web && npx playwright test e2e/coach-handoff-fullchain.spec.ts --reporter=line
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import { createRequire } from 'module';

const BASE_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3002';

// pg 仅装在 api 包;从 api 包 node_modules 解析。
const apiRequire = createRequire(
  path.resolve(__dirname, '../../api/package.json'),
);
const { Client } = apiRequire('pg') as typeof import('pg');

const DB_CFG = {
  host: '127.0.0.1',
  port: 5432,
  user: 'coach',
  password: 'coach',
  database: 'coach',
};

// ── auth helpers(与 credit-full-flow.spec.ts 同款 dev-login 模式)──────────────

async function devLogin(email: string): Promise<string> {
  // 带 429 退避重试:dev-login 5/min/IP 节流,全量套件并跑时会撞 429。
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: 'Handoff Test' }),
    });
    const body = (await res.json()) as {
      access_token?: string;
      statusCode?: number;
      message?: string;
    };
    if (body.access_token) return body.access_token;
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 13000));
      continue;
    }
    throw new Error(`devLogin 失败 (${body.statusCode ?? res.status}): ${body.message}`);
  }
  throw new Error('devLogin 失败:重试耗尽');
}

async function getUserId(token: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new Error('获取用户ID失败');
  return body.id;
}

async function setToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1'); // 跳过导览,避免遮挡
  }, token);
}

// ── 夹具:直插 conversation + assistant message(含 rich_card)+ coach_handoffs ──

interface HandoffFixture {
  conversationId: string;
  messageId: string;
  handoffId: string;
}

/**
 * 为 userId 造一条带行动卡片的对话。
 * payload 同 Coach 解析出的 handoff payload(company/role/jd_text)。
 * status 默认 proposed(可传 dismissed 用于「不重复弹」剧本)。
 */
async function seedHandoff(
  userId: string,
  payload: Record<string, unknown>,
  status: 'proposed' | 'dismissed' = 'proposed',
  target = 'mock',
): Promise<HandoffFixture> {
  const client = new Client(DB_CFG);
  await client.connect();
  try {
    const conv = await client.query<{ id: string }>(
      `INSERT INTO conversations (user_id, title, context_type)
       VALUES ($1, $2, 'free') RETURNING id`,
      [userId, 'Handoff 全链路测试会话'],
    );
    const conversationId = conv.rows[0].id;

    // 先插 handoff 拿 id(message.rich_card 需引用 handoff_id)
    const handoff = await client.query<{ id: string }>(
      `INSERT INTO coach_handoffs (user_id, conversation_id, target, payload, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, conversationId, target, JSON.stringify(payload), status],
    );
    const handoffId = handoff.rows[0].id;

    // rich_card 为 simple-json(text 列存 JSON 字符串),结构同 conversations.service.ts 落库形态
    const richCard = JSON.stringify({
      handoff_id: handoffId,
      target,
      payload,
      status,
    });
    const msg = await client.query<{ id: string }>(
      `INSERT INTO messages (conversation_id, role, content, rich_card)
       VALUES ($1, 'assistant', $2, $3) RETURNING id`,
      [
        conversationId,
        '我已经为你把这场模拟面试配置好了，点下方卡片即可开始。',
        richCard,
      ],
    );
    const messageId = msg.rows[0].id;

    // 回填 message_id(与生产路径一致:卡片落库时关联 assistant 消息)
    await client.query(`UPDATE coach_handoffs SET message_id = $1 WHERE id = $2`, [
      messageId,
      handoffId,
    ]);

    return { conversationId, messageId, handoffId };
  } finally {
    await client.end();
  }
}

/** 读取 handoff 当前状态(验证状态流转副作用) */
async function getHandoffStatus(handoffId: string): Promise<string | null> {
  const client = new Client(DB_CFG);
  await client.connect();
  try {
    const r = await client.query<{ status: string }>(
      `SELECT status FROM coach_handoffs WHERE id = $1`,
      [handoffId],
    );
    return r.rows[0]?.status ?? null;
  } finally {
    await client.end();
  }
}

// ── 测试套件 ──────────────────────────────────────────────────────────────────

test.describe('Coach handoff 行动卡片全链路', () => {
  let token: string;
  let userId: string;

  test.beforeAll(async () => {
    token = await devLogin('handoff-fullchain@coach.dev');
    userId = await getUserId(token);
  });

  test('1. 聊天页渲染行动卡片:rich_card 消息 → "Coach 为你准备了 · 模拟面试" + "一键开始"', async ({
    page,
  }) => {
    const fx = await seedHandoff(userId, { company: '字节跳动', role: '产品经理' });

    await setToken(page, token);
    await page.goto(`${BASE_URL}/chat/${fx.conversationId}`);

    // 卡片标题(来自 handoff-card.tsx:「Coach 为你准备了 · 模拟面试」)
    const cardTitle = page.locator('text=Coach 为你准备了').first();
    await expect(cardTitle).toBeVisible({ timeout: 15000 });

    // payload 摘要:company · role
    await expect(page.locator('body')).toContainText('字节跳动');
    await expect(page.locator('body')).toContainText('产品经理');

    // 「一键开始」按钮
    const startBtn = page.locator('button:has-text("一键开始")');
    await expect(startBtn).toBeVisible();

    await page.screenshot({
      path: 'playwright-report/handoff-1-card-rendered.png',
    });
    console.log('1 PASS: 行动卡片渲染,含模块名+payload摘要+一键开始按钮');
  });

  test('2. 点"一键开始" → 跳 /mock?handoff=<id> 并弹确认框"Coach 为你准备了"', async ({
    page,
  }) => {
    const fx = await seedHandoff(userId, { company: '腾讯', role: '前端工程师' });

    await setToken(page, token);
    await page.goto(`${BASE_URL}/chat/${fx.conversationId}`);

    const startBtn = page.locator('button:has-text("一键开始")');
    await expect(startBtn).toBeVisible({ timeout: 15000 });
    await startBtn.click();

    // URL 应跳到 /mock?handoff=<id>
    await page.waitForURL(
      (url) =>
        url.pathname === '/mock' && url.searchParams.get('handoff') === fx.handoffId,
      { timeout: 10000 },
    );

    // 确认框出现(handoff-reception.tsx HandoffConfirmDialog):「Coach 为你准备了」+「是,开始」/「暂不」
    await expect(page.locator('text=Coach 为你准备了')).toBeVisible({
      timeout: 8000,
    });
    await expect(page.locator('button:has-text("是,开始")')).toBeVisible();
    await expect(page.locator('button:has-text("暂不")')).toBeVisible();
    // 摘要含 payload
    await expect(page.locator('body')).toContainText('腾讯');

    await page.screenshot({
      path: 'playwright-report/handoff-2-confirm-dialog.png',
    });
    console.log('2 PASS: 一键开始跳转 /mock?handoff= 且确认框出现');
  });

  test('3. 确认框点"是,开始" → 创建框打开 + 公司/岗位预填 + handoff=accepted', async ({
    page,
  }) => {
    const fx = await seedHandoff(userId, {
      company: '阿里巴巴',
      role: '数据分析师',
      jd_text: '负责电商数据看板搭建',
    });

    await setToken(page, token);
    await page.goto(`${BASE_URL}/mock?handoff=${fx.handoffId}`);

    // 确认框出现
    const acceptBtn = page.locator('button:has-text("是,开始")');
    await expect(acceptBtn).toBeVisible({ timeout: 12000 });
    await acceptBtn.click();

    // 创建框打开,公司输入框预填「阿里巴巴」
    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    await expect(companyInput).toBeVisible({ timeout: 8000 });
    await expect(companyInput).toHaveValue('阿里巴巴');

    // 岗位预填「数据分析师」
    const roleInput = page.locator('input[placeholder="如：产品经理"]');
    await expect(roleInput).toHaveValue('数据分析师');

    // JD 预填
    const jdInput = page.locator('textarea');
    await expect(jdInput).toHaveValue('负责电商数据看板搭建');

    await page.screenshot({
      path: 'playwright-report/handoff-3-prefilled.png',
    });

    // 副作用:handoff 状态 → accepted
    await expect
      .poll(() => getHandoffStatus(fx.handoffId), { timeout: 5000 })
      .toBe('accepted');
    console.log('3 PASS: 确认后预填正确 + handoff=accepted');
  });

  test('4. 卡片"暂不"路径 → 卡片置灰"已跳过" + handoff=dismissed', async ({
    page,
  }) => {
    const fx = await seedHandoff(userId, { company: '美团', role: '运营' });

    await setToken(page, token);
    await page.goto(`${BASE_URL}/chat/${fx.conversationId}`);

    // 卡片内的「暂不」(handoff-card.tsx,非确认框的暂不)
    const dismissBtn = page
      .locator('button:has-text("暂不")')
      .first();
    await expect(dismissBtn).toBeVisible({ timeout: 15000 });
    await dismissBtn.click();

    // 卡片置灰显示「已跳过」
    await expect(page.locator('text=已跳过')).toBeVisible({ timeout: 5000 });
    // 「一键开始」消失(dismissed 态不再展示操作按钮)
    await expect(page.locator('button:has-text("一键开始")')).toHaveCount(0);

    await page.screenshot({
      path: 'playwright-report/handoff-4-dismissed-card.png',
    });

    // 副作用:handoff=dismissed
    await expect
      .poll(() => getHandoffStatus(fx.handoffId), { timeout: 5000 })
      .toBe('dismissed');
    console.log('4 PASS: 暂不 → 卡片置灰"已跳过" + handoff=dismissed');
  });

  test('5. 已 dismissed 的 handoff 再访问 /mock?handoff= → 不重复弹确认框', async ({
    page,
  }) => {
    // 直接造 dismissed 态 handoff
    const fx = await seedHandoff(
      userId,
      { company: '京东', role: '采购' },
      'dismissed',
    );

    await setToken(page, token);
    await page.goto(`${BASE_URL}/mock?handoff=${fx.handoffId}`);
    // 给接待 hook 充分时间拉取并判定状态
    await page.waitForTimeout(3000);

    // 确认框不应出现(dismissed 态直接 setHandoffState('dismissed'),不弹)
    await expect(page.locator('button:has-text("是,开始")')).toHaveCount(0);
    // 也不应自动打开创建框
    await expect(page.locator('input[placeholder="如：字节跳动"]')).toHaveCount(0);

    await page.screenshot({
      path: 'playwright-report/handoff-5-no-redialog.png',
    });
    console.log('5 PASS: 已处理(dismissed)的 handoff 不重复弹确认框');
  });

  test('6. 越权:访问他人 handoff → API 404 + 前端不弹确认框', async ({
    page,
  }) => {
    // 用 owner 造 handoff,用 attacker 访问
    const fx = await seedHandoff(userId, { company: '网易', role: '游戏策划' });
    const attackerToken = await devLogin('handoff-attacker@coach.dev');

    // API 层:attacker GET owner 的 handoff → 404(不泄露存在性)
    const res = await fetch(`${API_URL}/api/coach-handoffs/${fx.handoffId}`, {
      headers: { Authorization: `Bearer ${attackerToken}` },
    });
    expect(res.status).toBe(404);

    // 前端:attacker 带 ?handoff= 访问 → 接待 hook 收到 404 → error 态,不弹确认框
    await setToken(page, attackerToken);
    await page.goto(`${BASE_URL}/mock?handoff=${fx.handoffId}`);
    await page.waitForTimeout(3000);

    await expect(page.locator('button:has-text("是,开始")')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('网易');

    await page.screenshot({
      path: 'playwright-report/handoff-6-cross-user-404.png',
    });

    // 越权后 owner 的 handoff 状态未被改动(仍 proposed)
    expect(await getHandoffStatus(fx.handoffId)).toBe('proposed');
    console.log('6 PASS: 越权访问 API 404 + 前端不弹框 + 状态未被篡改');
  });
});
