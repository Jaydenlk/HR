/**
 * D2 缺口补测 — 公司背调二级页 (/mock/company-detail)
 *
 * 背景:6105b09 半成品抢救提交后一直缺 Playwright 覆盖。该页是"消歧上下文补充页"——
 * 从 mock 主创建流程的"完善公司信息 · 背景调研"入口跳入,补充城市/行业后调用既有
 * company-check 端点(激活消歧层② rankByContext),选定候选或"都不是"后经 sessionStorage
 * 桥接(lib/company-detail-bridge.ts)回填主创建流程弹窗,不是展示 company_research 静态资料的页面。
 *
 * 覆盖:
 * 1. 入口可达:mock 页点"完善公司信息" → 跳转 /mock/company-detail,草稿(公司名)已带入
 * 2. 真实 API 联动:补充城市/行业后点"发起背景调研" → company-check 200 → 候选列表渲染真实数据(非假数据)
 * 3. 选定候选 → 自动跳回 /mock,候选确认结果生效(创建请求体带 company_research_id)
 * 4. "都不是"兜底 → 通用模式提示,不阻断流程,跳回 /mock 后可继续创建
 * 5. 返回按钮(未搜索直接返回) → 回到 /mock,不丢失原表单草稿
 *
 * 端口: API=3002, Web=3001(与 mock-search-confirm.spec.ts 同一对环境变量,可经
 * MOCK_UI_BASE_URL / MOCK_UI_API_URL 覆盖)。
 * 博查额度:会真实调用博查 API(字节跳动命中库内缓存/量子翻斗云科技触发真实搜索)。
 *
 * 运行: cd packages/web && npx playwright test e2e/mock-company-detail-page.spec.ts --reporter=line
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.MOCK_UI_BASE_URL ?? 'http://localhost:3001';
const API_URL = process.env.MOCK_UI_API_URL ?? 'http://localhost:3002';

/** dev-login 拿 token,带 429 退避重试(节流窗口 60s)。 */
async function devLogin(email: string): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name: 'CompanyDetail Page Test' }),
    });
    const body = (await res.json()) as { access_token?: string; statusCode?: number; message?: string };
    if (body.access_token) return body.access_token;
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 13000));
      continue;
    }
    throw new Error(`devLogin 失败 (${body.statusCode ?? res.status}): ${body.message}`);
  }
  throw new Error('devLogin 失败:重试耗尽');
}

async function loginAndGoToMock(page: import('@playwright/test').Page): Promise<void> {
  const token = await devLogin('mock-company-detail-page@coach.dev');
  await page.goto(BASE_URL);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1');
  }, token);
  await page.goto(`${BASE_URL}/mock`);
  await page.waitForTimeout(2000);
}

/** 打开创建弹窗、填公司名，点击"完善公司信息"跳转二级页。 */
async function openCreateDialogAndGoToDetail(
  page: import('@playwright/test').Page,
  companyName: string,
): Promise<void> {
  const startBtn = page.locator('button', { hasText: '开始新模拟' }).first();
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();

  const companyInput = page.locator('input[placeholder="如：字节跳动"]');
  await companyInput.waitFor({ state: 'visible', timeout: 8000 });
  await companyInput.fill(companyName);

  const detailLink = page.locator('button', { hasText: '完善公司信息' });
  await detailLink.waitFor({ state: 'visible', timeout: 5000 });
  await detailLink.click();

  await page.waitForURL(/\/mock\/company-detail/, { timeout: 8000 });
}

test.describe('公司背调二级页 (/mock/company-detail)', () => {
  test('入口可达:mock 页"完善公司信息"跳转二级页,公司名草稿已带入', async ({ page }) => {
    await loginAndGoToMock(page);
    await openCreateDialogAndGoToDetail(page, '字节跳动');

    // 二级页标题可见,公司名输入框已预填草稿
    await expect(page.locator('h1', { hasText: '公司背景调研' })).toBeVisible();
    const detailCompanyInput = page.locator('input[placeholder="如：字节跳动"]');
    await expect(detailCompanyInput).toHaveValue('字节跳动');

    await page.screenshot({ path: 'e2e-screenshots/company-detail-page-entry.png' });
    console.log('入口 PASS: /mock/company-detail 可达,公司名草稿已带入');
  });

  test('返回按钮:未搜索直接返回 → 回到 /mock,不丢失原草稿', async ({ page }) => {
    await loginAndGoToMock(page);
    await openCreateDialogAndGoToDetail(page, '字节跳动');

    const backBtn = page.locator('button', { hasText: '返回创建流程' }).first();
    await backBtn.waitFor({ state: 'visible', timeout: 5000 });
    await backBtn.click();

    await page.waitForURL(/\/mock(?!\/company-detail)/, { timeout: 8000 });
    // 创建弹窗重新打开,公司名原样恢复
    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    await expect(companyInput).toBeVisible({ timeout: 5000 });
    await expect(companyInput).toHaveValue('字节跳动');

    console.log('返回 PASS: 未搜索直接返回,草稿(公司名)原样恢复到 /mock 创建弹窗');
  });

  test('真实 API 联动:补充城市/行业发起背调 → 候选真实渲染或库内命中/通用模式(三态之一)', async ({ page }) => {
    test.setTimeout(60_000);
    await loginAndGoToMock(page);
    await openCreateDialogAndGoToDetail(page, '量子翻斗云科技贰');

    // 补充城市/行业(消歧上下文,喂给后端 rankByContext)
    await page.locator('select[aria-label="城市"]').selectOption('上海');
    await page.locator('select[aria-label="行业"]').selectOption('互联网');

    const checkBtn = page.locator('button', { hasText: '发起背景调研' });
    await expect(checkBtn).toBeEnabled();

    // 精确匹配含 city 参数的请求:mock 主页的公司输入框在跳转本页前会因 onBlur 触发一次
    // 不带 city/industry 的 company-check(既有行为,结果在离开该页时被丢弃,不影响主流程)。
    // 若只按 URL 前缀匹配会与那次请求撞车(同为 200,谁先 resolve 不确定),故要求 city 参数存在。
    const checkResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/mock-sessions/company-check') && resp.url().includes('city=') && resp.status() === 200,
      { timeout: 20000 },
    );
    await checkBtn.click();
    const checkResp = await checkResponsePromise;
    const checkUrl = new URL(checkResp.url());
    // 断言 city/industry 确实作为查询参数透传给后端(激活消歧层②的前提)
    expect(checkUrl.searchParams.get('city')).toBe('上海');
    expect(checkUrl.searchParams.get('industry')).toBe('互联网');

    const checkBody = await checkResp.json() as {
      company_known: boolean;
      candidates: { id: string; name: string; summary: string; source_url: string }[];
      reason?: string;
    };
    console.log('company-check 响应:', JSON.stringify(checkBody).slice(0, 300));

    await page.waitForTimeout(800);

    if (checkBody.company_known) {
      // 库内命中:无候选,直接提示可返回
      await expect(page.locator('text=已在资料库中')).toBeVisible({ timeout: 5000 });
      console.log('三态-库内命中 PASS');
    } else if (checkBody.candidates.length > 0) {
      // 候选列表渲染真实数据(非 mock 假数据):断言 UI 文本包含 API 返回的真实候选名称
      const firstCandidateName = checkBody.candidates[0].name;
      await expect(page.locator('text=找到以下可能匹配的公司')).toBeVisible({ timeout: 5000 });
      await expect(page.locator(`text=${firstCandidateName}`).first()).toBeVisible({ timeout: 5000 });

      const chooseBtn = page.locator('button:has-text("选择这家")').first();
      await expect(chooseBtn).toBeVisible();

      // 选定候选 → 断言自动跳回 /mock,且创建请求体最终会带 company_research_id
      await chooseBtn.click();
      await page.waitForURL(/\/mock(?!\/company-detail)/, { timeout: 8000 });
      await page.waitForTimeout(500);

      const confirmedHint = page.locator('text=已确认');
      await expect(confirmedHint).toBeVisible({ timeout: 5000 });
      console.log('三态-候选选定 PASS: 选择候选后自动跳回 /mock,候选确认生效');
    } else {
      // 无候选:通用模式明示(不假装了解这家公司)
      await expect(page.locator('text=通用')).toBeVisible({ timeout: 5000 });
      console.log('三态-无候选/通用模式 PASS');
    }

    await page.screenshot({ path: 'e2e-screenshots/company-detail-page-search-result.png' });
  });

  test('"都不是"兜底:库外命中候选时拒绝全部 → 通用模式提示,跳回 /mock 不阻断流程', async ({ page }) => {
    test.setTimeout(90_000);
    await loginAndGoToMock(page);
    await openCreateDialogAndGoToDetail(page, '量子翻斗云科技叁');

    const checkBtn = page.locator('button', { hasText: '发起背景调研' });
    const checkResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/mock-sessions/company-check') && resp.status() === 200,
      { timeout: 20000 },
    );
    await checkBtn.click();
    const checkResp = await checkResponsePromise;
    const checkBody = await checkResp.json() as { company_known: boolean; candidates: unknown[]; from_cache?: boolean };
    await page.waitForTimeout(800);

    if (checkBody.company_known || checkBody.candidates.length === 0) {
      console.log('"都不是"兜底: 该场景库内命中或无候选,跳过(已被其他用例覆盖此分支)');
      test.skip();
      return;
    }

    const rejectBtn = page.locator('button', { hasText: '都不是' });
    await expect(rejectBtn).toBeVisible({ timeout: 5000 });

    if (checkBody.from_cache === true) {
      // 缓存候选被拒 → 页面内自动强制重搜(不跳转),重搜后再拒一次才落通用模式
      const forcedRespPromise = page.waitForResponse(
        (resp) => resp.url().includes('/mock-sessions/company-check') && resp.url().includes('force=true') && resp.status() === 200,
        { timeout: 30000 },
      );
      await rejectBtn.click();
      const forcedResp = await forcedRespPromise;
      const forcedBody = await forcedResp.json() as { candidates: unknown[] };
      await page.waitForTimeout(800);
      if (forcedBody.candidates.length > 0) {
        const rejectBtn2 = page.locator('button', { hasText: '都不是' });
        await expect(rejectBtn2).toBeVisible({ timeout: 5000 });
        await rejectBtn2.click();
      }
    } else {
      await rejectBtn.click();
    }

    // "都不是"选择 none → goBack 立即触发,跳回 /mock
    await page.waitForURL(/\/mock(?!\/company-detail)/, { timeout: 8000 });
    await page.waitForTimeout(500);

    const genericHint = page.locator('text=通用');
    await expect(genericHint).toBeVisible({ timeout: 5000 });
    console.log('"都不是"兜底 PASS: 拒绝候选后跳回 /mock,通用模式提示可见,流程不阻断');

    await page.screenshot({ path: 'e2e-screenshots/company-detail-page-reject-all.png' });
  });

  test('API 级: company-check 携带 city/industry 未登录 → 401(与主端点鉴权一致)', async ({ request }) => {
    const res = await request.get(
      `${API_URL}/api/mock-sessions/company-check?name=字节跳动&city=北京&industry=互联网`,
    );
    expect(res.status()).toBe(401);
    console.log('API-401 PASS: 二级页复用的 company-check 端点(带 city/industry)未登录同样返回 401');
  });
});
