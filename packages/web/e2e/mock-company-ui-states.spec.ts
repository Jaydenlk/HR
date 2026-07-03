/**
 * 独立验证 — mock 创建框三态 UI
 *
 * 三态验证:
 * 1. 库内公司(字节跳动) → 失焦无提示行
 * 2. 库外生造公司(量子翻斗云科技) → 失焦后出现候选点选列表或"不在资料库"提示行
 * 3. 不填公司 → 无提示行
 *
 * T6 博查统一搜索重设计后更新(破坏性 API 变更):search_candidate(单候选) → candidates[](多候选数组)，
 * 确认框由"是/不是"两按钮改为候选列表 +"选择这家"/"都不是"。
 *
 * 端口修复:原写死 BASE_URL=3003(需单独起第二个 web 实例),改为与其余套件一致的
 *   可配置 BASE_URL(默认 3001,可经 MOCK_UI_BASE_URL 覆盖)。token 改用全局 fetch
 *   的 dev-login(与 credit-full-flow / mock-search-confirm 一致),避免 page.request
 *   与 page context 共享 session 导致 localStorage 时序问题。
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.MOCK_UI_BASE_URL ?? 'http://localhost:3001';
const API_URL = process.env.MOCK_UI_API_URL ?? 'http://localhost:3002';

/** dev-login 拿 token,带 429 退避重试(全量套件并跑时撞节流;window 60s)。 */
async function getDevToken(): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mock-ui-test@coach.dev', name: 'Mock UI Test' }),
    });
    const body = (await res.json()) as { access_token?: string };
    if (body.access_token) return body.access_token;
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 13000));
      continue;
    }
    return '';
  }
  return '';
}

// token 在 beforeAll 一次性登录后复用,避免每个 test 重新 dev-login 撞 5/min 节流。
let sharedToken = '';

async function setupAuthAndOpenDialog(page: import('@playwright/test').Page): Promise<void> {
  // Set token and skip onboarding tour before navigation
  await page.goto(BASE_URL);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1'); // skip OnboardingTour
  }, sharedToken);

  // Navigate to mock page
  await page.goto(`${BASE_URL}/mock`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Wait for and click "开始新模拟"
  const btn = page.getByText('开始新模拟').first();
  await btn.waitFor({ state: 'visible', timeout: 10000 });
  await btn.click();

  // Wait for dialog input
  const companyInput = page.locator('input[placeholder="如：字节跳动"]');
  await companyInput.waitFor({ state: 'visible', timeout: 8000 });
}

test.describe('Mock 三态 UI 验证', () => {
  // beforeAll 给足退避时间(节流窗口 60s,最多 6 次×13s 退避),登录一次复用。
  test.beforeAll(async () => {
    test.setTimeout(120_000);
    sharedToken = await getDevToken();
    if (!sharedToken) throw new Error('mock-ui beforeAll: dev-login 拿不到 token(节流耗尽)');
  });

  test('态1: 库内公司(字节跳动)失焦 → 无"不在资料库"提示行', async ({ page }) => {
    await setupAuthAndOpenDialog(page);

    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    await companyInput.fill('字节跳动');
    await companyInput.press('Tab'); // trigger onBlur → checkCompany

    // Wait for API response (company-check)
    await page.waitForTimeout(2000);

    // Assert: no hint visible
    const hint = page.locator('p:has-text("不在资料库")');
    await expect(hint).not.toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/state1-known-company.png', fullPage: false });
    console.log('State 1 (known company 字节跳动): PASS - no hint shown');
  });

  test('态2: 库外公司(量子翻斗云科技)失焦 → 候选点选列表或通用提示(按 Bocha 是否有候选)', async ({ page }) => {
    await setupAuthAndOpenDialog(page);

    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    await companyInput.fill('量子翻斗云科技');

    // 捕获 company-check 响应:库外公司若 Bocha 有候选 → 候选列表;无候选 → 通用提示。
    // (真实 Bocha 对该生造名常返回模糊候选,故不能写死"不在资料库")
    const checkRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/mock-sessions/company-check') && resp.status() === 200,
      { timeout: 15000 },
    );
    await companyInput.press('Tab'); // trigger onBlur → checkCompany
    const checkResp = await checkRespPromise;
    const checkBody = (await checkResp.json()) as {
      company_known: boolean;
      candidates: { id: string; name: string }[];
    };

    // 库外:company_known 必为 false
    expect(checkBody.company_known).toBe(false);
    await page.waitForTimeout(800);

    if (checkBody.candidates.length > 0) {
      // 有候选 → 候选列表「找到以下可能匹配的公司」+「选择这家」/「都不是」
      const listBox = page.locator('text=找到以下可能匹配的公司');
      await expect(listBox).toBeVisible({ timeout: 5000 });
      await expect(page.locator('button:has-text("选择这家")').first()).toBeVisible();
      await expect(page.locator('button:has-text("都不是")')).toBeVisible();
      await page.screenshot({ path: 'e2e-screenshots/state2-confirm-box.png', fullPage: false });
      console.log('State 2 (库外+有候选): PASS - 候选列表出现');
    } else {
      // 无候选 → 直接通用模式「不在资料库 … 通用面试 + JD」
      const hint = page.locator('p:has-text("不在资料库")');
      await expect(hint).toBeVisible();
      const text = await hint.textContent();
      expect(text).toContain('通用面试');
      expect(text).toContain('JD');
      await page.screenshot({ path: 'e2e-screenshots/state2-unknown-company.png', fullPage: false });
      console.log('State 2 (库外+无候选): PASS - 通用提示:', text);
    }
  });

  test('态3: 不填公司 → 无提示行', async ({ page }) => {
    await setupAuthAndOpenDialog(page);

    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    // Leave empty, just tab away
    await companyInput.click();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Assert: no hint
    const hint = page.locator('p:has-text("不在资料库")');
    await expect(hint).not.toBeVisible();

    await page.screenshot({ path: 'e2e-screenshots/state3-no-company.png', fullPage: false });
    console.log('State 3 (no company): PASS - no hint shown');
  });

  test('GET /mock-sessions/company-check 未登录 → 401', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/mock-sessions/company-check?name=字节跳动`);
    expect(res.status()).toBe(401);
    console.log('company-check unauthenticated: 401 PASS');
  });
});
