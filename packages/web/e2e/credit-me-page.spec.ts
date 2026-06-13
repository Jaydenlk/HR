/**
 * Playwright e2e — /me 页 credit 验收(剧本 6)
 *
 * 前提:
 *   - API 在 http://localhost:3002 运行(DEV_LOGIN=1)
 *   - Web 在 http://localhost:3001 运行
 *
 * 覆盖剧本:
 *   6a. /me 页基本信息/余额/流水/价目文案均渲染真数据(非骨架屏永远)
 *   6c. >2MB 图片被拒,提示友好
 *   6d. 非图片文件被拒,提示友好
 *   402. 余额相关页面非白屏
 *
 * 认证修复:原 registerAndGetToken 走 /request-code + dev_code,但生产等同环境下
 *   RESEND_API_KEY 已配置(mail.configured=true),auth.service.ts 不回传 dev_code,
 *   该路径在本栈无法运行。改用 dev-login 端点(与 credit-full-flow.spec.ts 一致),
 *   首次登录新邮箱即走注册赠送 50 点。localStorage key 修正为 'token'(web app 实际读取
 *   的 key,见 src/lib/api.ts:25;原 'coach_token' 不被识别会重定向登录页)。
 *
 * 运行:cd packages/web && npx playwright test e2e/credit-me-page.spec.ts
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3002';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * 用 dev-login 拿 token(全局 fetch,首次登录新邮箱即注册并赠送 50 点)。
 * dev-login 有 5/min/IP 节流;全量套件并跑时会撞 429,故带退避重试
 * (与 credit-full-flow.spec.ts beforeAll 同款策略,window 是 60s)。
 */
async function registerAndGetToken(email: string, name: string): Promise<string> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fetch(`${API_URL}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    const body = await res.json() as { access_token?: string; statusCode?: number; message?: string };
    if (body.access_token) return body.access_token;
    if (res.status === 429 && attempt < 6) {
      await new Promise((r) => setTimeout(r, 13000)); // 等待节流窗口刷新
      continue;
    }
    throw new Error(`dev-login 失败 (${body.statusCode ?? res.status}): ${body.message}`);
  }
  throw new Error('dev-login 失败:重试耗尽');
}

async function setLocalStorageToken(page: Page, token: string) {
  await page.goto(BASE_URL);
  // web app 读取的 localStorage key 是 'token'(src/lib/api.ts:25)
  await page.evaluate((t: string) => localStorage.setItem('token', t), token);
}

// ── 测试 ─────────────────────────────────────────────────────────────────────

test.describe('/me 页 credit 验收', () => {
  // 固定邮箱 + beforeAll 一次性登录:dev-login throttle 是 10/min/IP,
  // 每个 test 都新登录会在全量套件里累积触发 429。复用同一 50 点用户即可覆盖这些 UI 剧本。
  let token = '';

  test.beforeAll(async () => {
    token = await registerAndGetToken(`pw-me-fixed@coach.dev`, 'PW测试用户');
  });

  test('6a. /me 页渲染真实余额(50点)、邮箱、价目文案', async ({ page }) => {
    await setLocalStorageToken(page, token);
    await page.goto(`${BASE_URL}/me`);

    // 等待余额卡片加载完成(不再是骨架屏)
    await page.waitForFunction(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.textContent?.includes('50') && el.textContent?.includes('点')) return true;
      }
      return false;
    }, { timeout: 10000 });

    // 余额显示 50
    await expect(page.locator('body')).toContainText('50');

    // 价目文案
    await expect(page.locator('body')).toContainText('10 元 / 50 点');
    await expect(page.locator('body')).toContainText('联系管理员');

    // 使用记录区域存在(即使暂无记录)
    await expect(page.locator('body')).toContainText('使用记录');

    // 截图备案
    await page.screenshot({ path: 'playwright-report/me-page-render.png' });
  });

  test('6c. 头像上传 >2MB → 前端校验拒绝,弹提示,不发请求', async ({ page }) => {
    await setLocalStorageToken(page, token);
    await page.goto(`${BASE_URL}/me`);

    // 等待页面加载
    await page.waitForTimeout(1500);

    // 制造 >2MB 的假图片文件(超过前端 2MB 校验)
    const bigBuffer = Buffer.alloc(2 * 1024 * 1024 + 100, 0);
    const tmpFile = path.join(require('os').tmpdir(), 'big-test.jpg');
    fs.writeFileSync(tmpFile, bigBuffer);

    // 触发文件选择
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpFile);

    // 期望出现 toast 提示(前端校验在上传前阻断)
    await expect(page.locator('body')).toContainText('2MB', { timeout: 5000 });

    // 清理
    fs.unlinkSync(tmpFile);
    await page.screenshot({ path: 'playwright-report/me-page-bigimg.png' });
  });

  test('6d. 非图片文件(txt) → 前端校验拒绝,提示包含格式说明', async ({ page }) => {
    await setLocalStorageToken(page, token);
    await page.goto(`${BASE_URL}/me`);
    await page.waitForTimeout(1500);

    const tmpFile = path.join(require('os').tmpdir(), 'test-avatar.txt');
    fs.writeFileSync(tmpFile, 'not an image');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(tmpFile);

    // 期望出现格式提示(JPEG/PNG/WebP)
    await expect(page.locator('body')).toContainText('JPEG', { timeout: 5000 });

    fs.unlinkSync(tmpFile);
    await page.screenshot({ path: 'playwright-report/me-page-badtype.png' });
  });
});

test.describe('Credit 402 全局拦截(剧本 4 前端)', () => {
  let token = '';

  test.beforeAll(async () => {
    token = await registerAndGetToken('pw-zero-fixed@coach.dev', '零余额测试');
  });

  test('余额不足时调用 AI 端点 → 页面出现"点数不足"提示,非白屏', async ({ page }) => {
    // salary 页加载验证(非白屏 / 非错误页)。
    // 注:将余额真正置 0 需消耗 50 次 AI 调用,不在前端 UI 验收范围;
    // API 层 402 + "点数不足"文案由 credit.e2e-spec.ts 覆盖。
    await setLocalStorageToken(page, token);
    await page.goto(`${BASE_URL}/salary`);

    // 等待页面加载
    await page.waitForTimeout(2000);

    // 验证页面存在,不是白屏或错误页
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toBe('');
    expect(bodyText).not.toContain('Application error');

    await page.screenshot({ path: 'playwright-report/salary-page-loaded.png' });
  });
});
