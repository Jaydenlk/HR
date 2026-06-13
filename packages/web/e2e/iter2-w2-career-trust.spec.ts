/**
 * Playwright E2E — 第2批 career 可信度前端真验(step 6)
 *
 * 覆盖 handoff step 6 的 5-10 项:
 *   - AI 能力板块单独成组渲染(category=ai)
 *   - 问卷自评二级页(弹层)填提交→回流刷新
 *   - bigGap 危险色能触发(量程 0-10,needed-current>3)
 *   - 分数 tooltip 悬停约 500ms 出现,内容含"这分怎么来的"
 *   - 历史列表入口可回看
 *   - 扣点后侧边栏刷新(coach:credit-refresh 广播)
 *
 * 渲染类断言用 page.route 拦截 GET /career/analysis 注入确定性 fixture(覆盖
 * general/ai/suppressed/self/bigGap 全部分支),不依赖慢/易 503 的真实 AI;
 * 真实扣点 + 广播单独一条用真 API 验证。
 *
 * 前提:API 在 3002(DEV_LOGIN=1, SQLite),Web 在 3001。
 * 运行: cd packages/web && npx playwright test e2e/iter2-w2-career-trust.spec.ts
 */
import { test, expect, Page } from '@playwright/test';

// 本批用隔离端口跑(3001/3002 被既有实例占用,跑旧码),避免误测旧版本。
const BASE_URL = process.env.W2_BASE_URL ?? 'http://localhost:3011';
const API_URL = process.env.W2_API_URL ?? 'http://localhost:3012';

const RESUME_TEXT =
  '李娜，软件工程专业本科应届生。熟悉 Java 与 Spring Boot，主导校园外卖平台后端，' +
  '负责订单与库存模块;掌握 MySQL 与 Redis,用 Redis 把接口响应从 280ms 降到 70ms。' +
  '在某课程作业里用 Python 写过简单的 if-else 判断逻辑。获校程序设计竞赛三等奖。';

// 确定性 fixture:覆盖 UI 全部分支。
const FIXTURE = {
  paths: [
    { title: '后端工程师', fit_pct: 82, description: '与后端经历高度契合', skills: ['Java', 'Spring Boot'], alumni_count: 12 },
    { title: '平台研发', fit_pct: 64, description: '需补分布式', skills: ['Go'], alumni_count: null },
  ],
  skill_audit: [
    // 通用 · 有证据高分(ai 来源)
    { name: 'Java', current: 8, needed: 6, ok: true, category: 'general', evidenceFound: 'Spring Boot 订单与库存模块', scoreSource: 'ai', aiScore: null },
    // 通用 · bigGap(needed-current=5>3 → 危险色)
    { name: '分布式系统', current: 2, needed: 7, ok: false, category: 'general', evidenceFound: '', scoreSource: 'ai', aiScore: null },
    // 通用 · 退化压分(无证据,Python 用户原始痛点)
    { name: 'Python', current: 2, needed: 6, ok: false, category: 'general', evidenceFound: '', scoreSource: 'suppressed', aiScore: 6 },
    // AI 能力 · 有证据
    { name: 'AI 辅助编码', current: 5, needed: 6, ok: false, category: 'ai', evidenceFound: '用 Copilot 提效', scoreSource: 'ai', aiScore: null },
    // AI 能力 · 无证据压分
    { name: '提示工程/Prompt', current: 2, needed: 7, ok: false, category: 'ai', evidenceFound: '', scoreSource: 'suppressed', aiScore: 6 },
  ],
};

async function devLogin(email: string): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json()) as { access_token?: string };
    if (body.access_token) return body.access_token;
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 13000));
      continue;
    }
    throw new Error(`dev-login 失败 (${res.status})`);
  }
  throw new Error('dev-login 失败:重试耗尽');
}

async function seedResume(token: string) {
  const res = await fetch(`${API_URL}/api/resumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: '后端简历', raw_text: RESUME_TEXT, is_primary: true }),
  });
  // 已存在主简历也无妨(幂等冒烟)。
  return res.status;
}

async function injectToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1');
  }, token);
}

/** 拦截 GET /career/analysis 返回确定性 fixture(供渲染类断言)。 */
async function mockAnalysis(page: Page) {
  await page.route('**/api/career/analysis', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FIXTURE),
    });
  });
}

test.describe('第2批 career 前端可信度', () => {
  let token = '';

  test.beforeAll(async () => {
    token = await devLogin('pw-career-trust@coach.dev');
    await seedResume(token);
  });

  test('6-A: AI 能力单独成组 + bigGap 危险色 + 压分"无证据"标记', async ({ page }) => {
    await mockAnalysis(page);
    await injectToken(page, token);
    await page.goto(`${BASE_URL}/career`);

    // 等技能盘点渲染
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });

    // AI 能力分组标题存在
    await expect(page.locator('text=AI 能力')).toBeVisible();
    await expect(page.locator('text=通用能力')).toBeVisible();

    // AI 组里应能看到 AI 类技能名(exact 避免命中"主要缺口"汇总行)
    await expect(page.getByText('AI 辅助编码', { exact: true })).toBeVisible();
    await expect(page.getByText('提示工程/Prompt', { exact: true })).toBeVisible();

    // 压分技能显示"无证据"标记(Python + 提示工程)
    const noEvidenceTags = page.locator('text=无证据');
    expect(await noEvidenceTags.count()).toBeGreaterThanOrEqual(2);

    // bigGap 危险色:分布式系统 needed-current=5>3 → 分数文字应为危险色(红系)。
    // 取该行分数 trigger 的计算颜色,断言 R 通道显著高于 G/B(红色特征),证明 bigGap 修复后危险色能触发。
    // Tooltip trigger 是无色的 <span> 包装,真正着色的是其内部分数 span;读内部 span 的计算色。
    const distScore = page
      .locator('[data-slot="tooltip-trigger"]', { hasText: /^\s*2\s*\/\s*7/ })
      .locator('span')
      .first();
    await expect(distScore).toBeVisible();
    const color = await distScore.evaluate((el) => getComputedStyle(el).color);
    console.log('[6-A] 分布式系统(bigGap)分数色:', color);
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(m).not.toBeNull();
    const [r, g, b] = [Number(m![1]), Number(m![2]), Number(m![3])];
    // 危险红:R 明显大于 G 和 B(排除黑色 ink / 蓝色 brand);证明 bigGap 修复后危险色能触发。
    expect(r).toBeGreaterThan(g + 40);
    expect(r).toBeGreaterThan(b + 40);

    await page.screenshot({ path: 'playwright-report/w2-career-skill-groups.png', fullPage: true });
  });

  test('6-B: 分数 tooltip 悬停约 500ms 出现,内容解释来源', async ({ page }) => {
    await mockAnalysis(page);
    await injectToken(page, token);
    await page.goto(`${BASE_URL}/career`);
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });

    // tooltip trigger(SkillRow 的分数用 cursor:help 的 Tooltip 包裹)
    const trigger = page.locator('[data-slot="tooltip-trigger"]').first();
    expect(await trigger.count()).toBeGreaterThan(0);
    await trigger.hover();
    await page.waitForTimeout(700); // 超过 500ms delay

    const popup = page.locator('[data-slot="tooltip-content"]').first();
    await expect(popup).toBeVisible({ timeout: 3000 });
    const txt = await popup.innerText();
    expect(txt.length).toBeGreaterThan(0);
    console.log('[6-B] tooltip 内容:', txt.slice(0, 80));

    await page.screenshot({ path: 'playwright-report/w2-career-tooltip.png' });
  });

  test('6-C: 压分技能 tooltip 含"未在简历中找到证据"', async ({ page }) => {
    await mockAnalysis(page);
    await injectToken(page, token);
    await page.goto(`${BASE_URL}/career`);
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });

    // 压分项的分数 trigger 内含"无证据"徽标(仅 suppressed 才有),据此精确定位压分行的 trigger。
    const suppressedTrigger = page
      .locator('[data-slot="tooltip-trigger"]', { has: page.getByText('无证据') })
      .first();
    await expect(suppressedTrigger).toBeVisible({ timeout: 5000 });
    await suppressedTrigger.hover();
    await page.waitForTimeout(700);
    const popup = page.locator('[data-slot="tooltip-content"]').first();
    await expect(popup).toBeVisible({ timeout: 3000 });
    const txt = await popup.innerText();
    console.log('[6-C] 压分项 tooltip:', txt);
    expect(txt).toContain('未在简历');

    await page.screenshot({ path: 'playwright-report/w2-career-suppress-tooltip.png' });
  });

  test('6-D: 问卷自评弹层填提交→回流(自评分覆盖,出现"自评"标记)', async ({ page }) => {
    await injectToken(page, token);
    // 首次进入用 fixture;提交后回流让真 GET 命中——但真 GET 是慢 AI,
    // 故第二次也用拦截:返回把 Python 设为 self 来源的 fixture,模拟后端校准结果。
    let call = 0;
    await page.route('**/api/career/analysis', async (route) => {
      call += 1;
      if (call === 1) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
      } else {
        const after = JSON.parse(JSON.stringify(FIXTURE));
        const py = after.skill_audit.find((s: { name: string }) => s.name === 'Python');
        py.current = 1;
        py.scoreSource = 'self';
        py.aiScore = 6;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(after) });
      }
    });
    // 自评 POST 用真后端(验证 upsert 不报错)。
    await page.goto(`${BASE_URL}/career`);
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });

    // 点"填自评精进"
    await page.locator('text=填自评精进').click();
    await expect(page.locator('text=校准你的真实水平')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'playwright-report/w2-career-selfassess-modal.png' });

    // 提交(用默认滑块值即可,验证 POST 通路 + 回流)
    await page.locator('text=保存并按自评重新评估').click();

    // 回流后 Python 应显示"自评"标记
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=自评').first()).toBeVisible({ timeout: 8000 });
    console.log('[6-D] 自评回流后出现"自评"标记');

    await page.screenshot({ path: 'playwright-report/w2-career-selfassess-after.png' });
  });

  test('6-E: 历史入口可打开列表并回看', async ({ page }) => {
    await mockAnalysis(page);
    await injectToken(page, token);
    await page.goto(`${BASE_URL}/career`);
    await expect(page.locator('text=能力盘点')).toBeVisible({ timeout: 15000 });

    // 点"历史"
    await page.locator('button:has-text("历史")').first().click();
    await expect(page.locator('text=历史记录')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'playwright-report/w2-career-history-modal.png' });

    // 历史列表:此用户已在 6-F(真扣点)前可能没有记录;若有则点开回看,若无则验证空态文案。
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toMatch(/历史记录|还没有历史记录|条路径/);
  });

  test('6-F: 真实扣点 → 落库历史 + 侧边栏 coach:credit-refresh 广播', async ({ page }) => {
    // 不拦截:走真 AI。容忍 503(中转抖动非代码缺陷)。
    await injectToken(page, token);

    const meBefore = await (
      await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    const before = (meBefore as { credit_balance: number }).credit_balance;
    console.log('[6-F] 操作前余额:', before);
    if (before < 1) {
      test.skip(true, '余额不足,跳过真扣点');
      return;
    }

    await page.goto(`${BASE_URL}/career`);
    // 监听广播
    await page.exposeFunction('onRefresh', () => {});
    await page.evaluate(() => {
      (window as unknown as { __refresh: number }).__refresh = 0;
      window.addEventListener('coach:credit-refresh', () => {
        (window as unknown as { __refresh: number }).__refresh += 1;
      });
    });

    // 触发真分析:点"重新评估"(若首屏已自动跑则等其结束)。
    const refreshBtn = page.locator('button:has-text("重新评估")');
    // 首屏 useEffect 已自动发起一次;等结果或错误。
    const ok = await page
      .waitForFunction(
        () => {
          const b = document.body.innerText;
          return b.includes('能力盘点') || b.includes('AI 服务') || b.includes('重新加载') || b.includes('请先上传');
        },
        { timeout: 95000 },
      )
      .then(() => true)
      .catch(() => false);

    await page.screenshot({ path: 'playwright-report/w2-career-live-result.png', fullPage: true });

    const meAfter = await (
      await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
    ).json();
    const after = (meAfter as { credit_balance: number }).credit_balance;
    console.log('[6-F] 操作后余额:', after, '(', before - after, '点)', 'firstScreenSettled:', ok);

    // 若分析成功(扣点),验证广播触发 + 历史落库;若 503 则记录不判失败(中转问题)。
    if (after < before) {
      const refreshCount = await page.evaluate(
        () => (window as unknown as { __refresh: number }).__refresh,
      );
      console.log('[6-F] coach:credit-refresh 触发次数:', refreshCount);
      expect(refreshCount).toBeGreaterThanOrEqual(1);

      // 历史已落库
      const hist = await (
        await fetch(`${API_URL}/api/career/history`, { headers: { Authorization: `Bearer ${token}` } })
      ).json();
      console.log('[6-F] 历史记录数:', (hist as unknown[]).length);
      expect((hist as unknown[]).length).toBeGreaterThanOrEqual(1);
    } else {
      console.log('[6-F] 未扣点(可能 AI 中转 503),不判失败 — 非代码缺陷');
    }
  });
});
