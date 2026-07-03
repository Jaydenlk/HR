/**
 * Playwright e2e — T2 月刊校招情报摄入流水线(硬门实机走查)
 *
 * 前提:
 *   - API 在 http://localhost:3002 运行(DEV_LOGIN=1,真实 GLM key 可用)
 *   - Web 在 http://localhost:3001 运行
 *   - 本机 coach-postgres 已跑 migration:run(recruit_events 表已建)
 *
 * 覆盖四步走查(见 docs/refactor2/T2-recruit-intel.md 设计定稿 + 审计校准 M8/m23):
 *   ① 非 admin 打开 /digest —— 看不到导入按钮/来源状态区/三类源管理 UI
 *   ② admin 打开 /digest —— 三类源管理 UI 可见,真实上传 CSV → 真实 GLM 解析 → 提示成功
 *   ③ 打开 /newspaper —— 出现"校招情报"板块,已导入且未过期的事件可见;缺 event_date 的行
 *      落"日期待确认"分区而不是主列表(防编造红线,真实 GLM 调用验证,不是 mock)
 *   ④ 普通用户投稿一条面经后,自己的投稿条目上有删除按钮,点击后条目消失(DELETE /feed/:id 生效)
 *
 * 认证:与 credit-me-page.spec.ts 同规则,用 dev-login 拿 token 写 localStorage('token');
 * admin 账号需要真实置 role='admin'(本机 dev 库无真实用户数据,由本次走查前置的
 * `docker exec coach-postgres psql ... UPDATE users SET role='admin'` 完成,不在本 spec 内做)。
 *
 * 运行:cd packages/web && npx playwright test e2e/t2-recruit-intel.spec.ts
 */
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'http://localhost:3001';
const API_URL = 'http://localhost:3002';

const ADMIN_EMAIL = 't2-admin@coach.dev';
const USER_EMAIL = 't2-user@coach.dev';

async function devLogin(email: string, name: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const body = (await res.json()) as { access_token?: string; message?: string };
  if (!body.access_token) throw new Error(`dev-login 失败: ${body.message}`);
  return body.access_token;
}

async function loginAs(page: Page, token: string) {
  await page.goto(BASE_URL);
  await page.evaluate((t: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('coach_tour_done', '1');
  }, token);
}

test.describe('T2 校招情报 — /digest 权限门', () => {
  test('非 admin 打开 /digest：看不到导入按钮/来源状态区/来源管理 UI', async ({ page }) => {
    const token = await devLogin(USER_EMAIL, 'T2 User');
    await loginAs(page, token);
    await page.goto(`${BASE_URL}/digest`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: '导入来源' })).toHaveCount(0);
    await expect(page.locator('.source-strip')).toHaveCount(0);
    await expect(page.locator('.recruit-manager')).toHaveCount(0);

    // 页面本体仍可用(能看到写面经入口),不是整页拦截。
    await expect(page.getByRole('button', { name: '写面经' })).toBeVisible();
  });
});

test.describe('T2 校招情报 — admin 上传 → 真实 GLM 解析 → newspaper 呈现', () => {
  test('admin 看到来源管理 UI，上传规整 CSV 真实解析入库成功，newspaper 出现校招情报板块', async ({ page }) => {
    test.setTimeout(90_000); // 真实 GLM 调用,偶发慢
    const token = await devLogin(ADMIN_EMAIL, 'T2 Admin');
    await loginAs(page, token);
    await page.goto(`${BASE_URL}/digest`);
    await page.waitForLoadState('networkidle');

    // ① admin 可见来源管理 UI
    await expect(page.getByRole('button', { name: '导入来源' })).toBeVisible();
    const manager = page.locator('.recruit-manager');
    await expect(manager).toBeVisible();

    // ② 新建一个 sheet_file 来源
    const uniqueName = `Playwright规整表格源-${Date.now()}`;
    await manager.locator('.recruit-create-form select').selectOption('sheet_file');
    await manager.locator('.recruit-create-form input').first().fill(uniqueName);
    await manager.getByRole('button', { name: '新增来源' }).click();

    const sourceRow = manager.locator('.recruit-source-row', { hasText: uniqueName });
    await expect(sourceRow).toBeVisible({ timeout: 10_000 });

    // ③ 真实上传规整 CSV,走真实 GLM 解析(偶发失败重试一次)
    const fixturePath = path.resolve(
      __dirname,
      '../../api/test/fixtures/recruit-clean.csv',
    );

    async function attemptUpload() {
      await sourceRow.locator('input[type="file"]').setInputFiles(fixturePath);
      const resultOrError = sourceRow.locator('.recruit-source-result, .recruit-form-error');
      await expect(resultOrError).toBeVisible({ timeout: 60_000 });
      return sourceRow.locator('.recruit-source-result').isVisible();
    }

    let ok = await attemptUpload();
    if (!ok) {
      // 偶发 AI 失败重试一次
      ok = await attemptUpload();
    }
    expect(ok).toBe(true);
    await expect(sourceRow.locator('.recruit-source-result')).toContainText('入库/合并');

    // ④ /newspaper 出现「校招情报」板块,且刚导入的公司可见(真实 GLM 抽取,断言板块结构而非
    // 具体公司名——GLM 可能对日期/字段有细微出入,但公司主体和板块必须真实出现)。
    await page.goto(`${BASE_URL}/newspaper`);
    await page.waitForLoadState('networkidle');
    const board = page.locator('.ri-board');
    await expect(board).toBeVisible({ timeout: 15_000 });
    await expect(board.getByText('校招情报')).toBeVisible();
  });
});

test.describe('T2 校招情报 — 防编造:缺日期事件落"日期待确认"', () => {
  test('无日期信息的行经真实 GLM 解析后 event_date 为 null，落在日期待确认分区而非主列表', async ({ page }) => {
    test.setTimeout(90_000);
    const token = await devLogin(ADMIN_EMAIL, 'T2 Admin');
    await loginAs(page, token);
    await page.goto(`${BASE_URL}/digest`);
    await page.waitForLoadState('networkidle');

    const manager = page.locator('.recruit-manager');
    const uniqueName = `Playwright缺日期源-${Date.now()}`;
    await manager.locator('.recruit-create-form select').selectOption('sheet_file');
    await manager.locator('.recruit-create-form input').first().fill(uniqueName);
    await manager.getByRole('button', { name: '新增来源' }).click();
    const sourceRow = manager.locator('.recruit-source-row', { hasText: uniqueName });
    await expect(sourceRow).toBeVisible({ timeout: 10_000 });

    // 只给"类型",完全不提供任何日期线索——真实 GLM 应返回 event_date: null,不得脑补。
    // 公司名用真实知名企业(而非"某XX公司"这类占位感名称),避免 GLM 因判断"不是真实公司"
    // 整行丢弃,导致该用例在"公司都没抽出来"时被空断言悄悄放过而非真正验证日期待确认分区。
    const csvBuffer = Buffer.from('公司,类型\n小米集团,网申开启\n', 'utf-8');

    async function attemptUpload() {
      await sourceRow.locator('input[type="file"]').setInputFiles({
        name: 'no-date.csv',
        mimeType: 'text/csv',
        buffer: csvBuffer,
      });
      const resultOrError = sourceRow.locator('.recruit-source-result, .recruit-form-error');
      await expect(resultOrError).toBeVisible({ timeout: 60_000 });
      return sourceRow.locator('.recruit-source-result').isVisible();
    }

    let ok = await attemptUpload();
    if (!ok) ok = await attemptUpload();
    expect(ok).toBe(true);

    await page.goto(`${BASE_URL}/newspaper`);
    await page.waitForLoadState('networkidle');
    const board = page.locator('.ri-board');
    await expect(board).toBeVisible({ timeout: 15_000 });

    // 真实知名企业名,GLM 应能识别出 company,但日期列完全空白——必须落"日期待确认"区,
    // 不得出现在主 upcoming 列表(硬断言,不做"抽不出来就跳过"的软验证)。
    await expect(board.getByText('小米集团')).toBeVisible({ timeout: 5_000 });
    const unscheduledSection = board.locator('.ri-unscheduled');
    await expect(unscheduledSection.getByText('小米集团')).toBeVisible();
    const upcomingList = board.locator('.ri-board-list').first();
    await expect(upcomingList.getByText('小米集团')).toHaveCount(0);
  });
});

test.describe('T2 校招情报 — m23 投稿删除按钮', () => {
  test('普通用户投稿面经后自己的条目上有删除按钮，点击后条目消失', async ({ page }) => {
    const token = await devLogin(USER_EMAIL, 'T2 User');
    await loginAs(page, token);
    await page.goto(`${BASE_URL}/digest`);
    await page.waitForLoadState('networkidle');

    const uniqueTitle = `Playwright删除按钮测试面经-${Date.now()}`;
    await page.getByRole('button', { name: '写面经' }).click();
    await page.getByPlaceholder('例：字节跳动产品经理一面复盘').fill(uniqueTitle);
    await page
      .getByPlaceholder('记录题目、追问、面试官风格、你当时的回答和复盘建议。')
      .fill('这是 Playwright 自动化测试投稿的正文内容，用于验证删除按钮功能。');
    await page.getByRole('button', { name: '发布' }).click();

    const card = page.locator('.digest-card', { hasText: uniqueTitle });
    await expect(card).toBeVisible({ timeout: 10_000 });

    const deleteButton = card.getByRole('button', { name: '删除这条投稿' });
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    await expect(card).toHaveCount(0, { timeout: 10_000 });
  });
});
