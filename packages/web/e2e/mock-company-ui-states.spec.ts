/**
 * 独立验证 — mock 创建框三态 UI (针对 3003 端口的 mock-company dev server)
 *
 * 三态验证:
 * 1. 库内公司(字节跳动) → 失焦无提示行
 * 2. 库外生造公司(量子翻斗云科技) → 失焦后出现"不在资料库"提示行
 * 3. 不填公司 → 无提示行
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3003';
const API_URL = 'http://localhost:3002';

async function getDevToken(page: import('@playwright/test').Page): Promise<string> {
  const res = await page.request.post(`${API_URL}/api/auth/dev-login`, {
    data: { email: 'mock-ui-test@coach.dev', name: 'Mock UI Test' },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  return body.access_token ?? '';
}

async function setupAuthAndOpenDialog(page: import('@playwright/test').Page): Promise<void> {
  const token = await getDevToken(page);

  // Set token and skip onboarding tour before navigation
  await page.goto(BASE_URL);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1'); // skip OnboardingTour
  }, token);

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

test.describe('Mock 三态 UI 验证 (port 3003)', () => {
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

  test('态2: 库外公司(量子翻斗云科技)失焦 → 出现"不在资料库"提示行', async ({ page }) => {
    await setupAuthAndOpenDialog(page);

    const companyInput = page.locator('input[placeholder="如：字节跳动"]');
    await companyInput.fill('量子翻斗云科技');
    await companyInput.press('Tab'); // trigger onBlur → checkCompany

    // Wait for API response
    await page.waitForTimeout(2000);

    // Assert: hint visible
    const hint = page.locator('p:has-text("不在资料库")');
    await expect(hint).toBeVisible();
    const text = await hint.textContent();
    expect(text).toContain('通用面试');
    expect(text).toContain('JD');

    await page.screenshot({ path: 'e2e-screenshots/state2-unknown-company.png', fullPage: false });
    console.log('State 2 (unknown company 量子翻斗云科技): PASS - hint shown:', text);
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
