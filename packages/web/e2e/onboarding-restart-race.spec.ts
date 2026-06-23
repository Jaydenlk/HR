/**
 * Playwright e2e — 引导「关场途中重看」竞态根治验收(feat/onboarding-v31)
 *
 * 复现的 BUG(修复前):
 *   onboarding-tour.tsx runWithExit 的 230ms 延时 teardown 未存 ref。
 *   关场动画(ob-overlay-out)播放途中触发「重看引导」(coach:restart-tour):
 *     引导先重开(ob-overlay-in)→ 约 230ms 后旧 teardown 触发 setActive(false)
 *     把刚重开的引导杀掉(闪一下消失),且 finishMain 的 teardown 还会把 coach_tour_done 置 1。
 *
 * 修复:把该 setTimeout 存进 exitTimerRef;在 onRestart(重开入口)、runWithExit(新一轮关场起点,
 *   覆盖 finishMain/finishFeature)、组件卸载兜底 三处先 clearTimeout。
 *
 * 验证(确定性):
 *   ① 竞态场景:开引导 → Esc(进 closing/ob-overlay-out,teardown 在飞)→ 230ms 窗口内派
 *      coach:restart-tour → 断言引导重开后【持续存活】(等 ≥300ms 后 dialog 仍在 / bodyAttr=1 /
 *      obNodes=1)。连跑 4 轮全部存活 = 竞态根治。修复前此断言必 FAIL(旧 teardown 杀掉重开)。
 *   ② 正常开/关场仍干净:Esc 正常关场后 dialog 卸载、body 属性清除、无残留节点。
 *
 * 不碰后端/DB:layout 的所有 API 调用经 page.route 拦截返回 mock(纯前端组件逻辑验证)。
 *
 * 运行: cd packages/web && node_modules/.bin/playwright test e2e/onboarding-restart-race.spec.ts --reporter=line
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

// 关场延时 = 230ms。以下两点分别取在该窗口内 / 窗口外。
const WITHIN_RACE_WINDOW = 80; // Esc 后等这么久再派 restart:已进 closing 态,但孤儿 teardown(230ms)远未到点
const PAST_CLOSE_DELAY = 360; // 派 restart 后等这么久:已越过 230ms,孤儿若没被取消则此刻引导已被杀

// layout 守卫与外围组件需要的 API:全部 mock,不触碰真实后端。
async function mockAppApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace(/^\/api/, '');
    let body: unknown = {};
    if (p === '/auth/me') {
      body = { id: 'u-race-test', name: '竞态测试', email: 'race@coach.dev', role: 'user' };
    } else if (p === '/me') {
      body = { id: 'u-race-test', credit_balance: 100 };
    } else if (p === '/conversations' || p === '/interviews' || p === '/applications') {
      body = [];
    } else if (p.startsWith('/announcements')) {
      body = [];
    } else {
      body = {};
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

// 引导存活探针:读取当前 DOM 状态(dialog 是否在 / body 标记 / data-onboarding 节点数 / 关场 class)。
async function probe(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[data-onboarding][role="dialog"]');
    return {
      dialogPresent: dialog != null,
      bodyAttr: document.body.getAttribute('data-onboarding-active'),
      obNodes: document.querySelectorAll('[data-onboarding]').length,
      closing: dialog?.classList.contains('ob-overlay-out') ?? false,
      overlayIn: dialog?.classList.contains('ob-overlay-in') ?? false,
    };
  });
}

// 进站并让引导激活:清 coach_tour_done(首挂载 300ms 后 setActive(true)),等引导出现。
async function enterWithFreshTour(page: Page) {
  // 强制非 reduced-motion:否则 runWithExit 跳过 230ms 直接 teardown,竞态无窗口、不成立。
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mockAppApis(page);
  await page.addInitScript(() => {
    localStorage.setItem('token', 'race-test-token');
    localStorage.removeItem('coach_tour_done');
  });
  await page.goto(`${BASE_URL}/today`);
  // 首挂载 300ms 后 setActive(true);等引导 dialog 出现
  await expect(page.locator('[data-onboarding][role="dialog"]')).toBeVisible({ timeout: 10000 });
  // 等 body 标记落定(inMainTour effect)
  await expect
    .poll(async () => (await probe(page)).bodyAttr, { timeout: 5000 })
    .toBe('1');
}

test.describe('引导关场途中重看 — 竞态根治', () => {
  test('① 竞态场景:关场途中派 restart → 引导持续存活(连跑 4 轮)', async ({ page }) => {
    await enterWithFreshTour(page);

    const survival: boolean[] = [];
    for (let round = 1; round <= 4; round++) {
      // 1) 触发关场:Esc(welcome 步 → finishMain(false) → runWithExit → closing=true + 挂 230ms teardown)
      await page.keyboard.press('Escape');

      // 2) 确认已进入关场态(ob-overlay-out 出现),且仍在 230ms 窗口内
      await expect
        .poll(async () => (await probe(page)).closing, { timeout: 1000 })
        .toBe(true);

      // 3) 230ms 窗口内派「重看引导」
      await page.waitForTimeout(WITHIN_RACE_WINDOW);
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('coach:restart-tour')));

      // 4) 重开应立即生效(ob-overlay-in)
      await expect
        .poll(async () => {
          const s = await probe(page);
          return s.dialogPresent && s.overlayIn && !s.closing;
        }, { timeout: 1000 })
        .toBe(true);

      // 5) 越过 230ms 后再观察:孤儿若没被取消,此刻引导已被 setActive(false) 杀掉
      await page.waitForTimeout(PAST_CLOSE_DELAY);
      const after = await probe(page);
      const alive =
        after.dialogPresent &&
        after.bodyAttr === '1' &&
        after.obNodes === 1 &&
        !after.closing;
      survival.push(alive);
      console.log(
        `[round ${round}] dialogPresent=${after.dialogPresent} bodyAttr=${after.bodyAttr} ` +
          `obNodes=${after.obNodes} closing=${after.closing} → alive=${alive}`,
      );

      // 每轮断言存活(便于定位是哪一轮挂)
      expect(after.dialogPresent, `round ${round}: dialog 应存活`).toBe(true);
      expect(after.bodyAttr, `round ${round}: body 标记应为 1`).toBe('1');
      expect(after.obNodes, `round ${round}: data-onboarding 节点应为 1`).toBe(1);
      expect(after.closing, `round ${round}: 不应仍在关场态`).toBe(false);
    }

    // 同时验证「重看」未误把 coach_tour_done 置 1(孤儿 teardown 命中会置 1)
    const doneFlag = await page.evaluate(() => localStorage.getItem('coach_tour_done'));
    console.log(`survival=${JSON.stringify(survival)} coach_tour_done=${doneFlag}`);
    expect(survival.every(Boolean), '4 轮全部存活').toBe(true);
    expect(doneFlag, 'coach_tour_done 不应被孤儿 teardown 误置 1').not.toBe('1');

    await page.screenshot({ path: 'playwright-report/onboarding-race-survived.png' });
  });

  test('② 正常关场仍干净:Esc 关场后 dialog 卸载 + body 标记清除 + 无残留', async ({ page }) => {
    await enterWithFreshTour(page);

    // 正常关场:Esc 后不打断,等关场动画跑完(>230ms)真正卸载
    await page.keyboard.press('Escape');
    await expect
      .poll(async () => (await probe(page)).closing, { timeout: 1000 })
      .toBe(true);

    // 越过 230ms,引导应干净卸载
    await page.waitForTimeout(PAST_CLOSE_DELAY);
    const after = await probe(page);
    console.log(
      `[正常关场] dialogPresent=${after.dialogPresent} bodyAttr=${after.bodyAttr} obNodes=${after.obNodes}`,
    );
    expect(after.dialogPresent, '正常关场后 dialog 应卸载').toBe(false);
    expect(after.bodyAttr, '正常关场后 body 标记应清除').toBe(null);
    expect(after.obNodes, '正常关场后无 data-onboarding 残留节点').toBe(0);

    // coach_tour_done 应被正常关场置 1(这是正常收尾的预期副作用)
    const doneFlag = await page.evaluate(() => localStorage.getItem('coach_tour_done'));
    expect(doneFlag, '正常 Esc 关场应正常写 coach_tour_done').toBe('1');

    await page.screenshot({ path: 'playwright-report/onboarding-normal-close-clean.png' });
  });

  test('③ 合规:演示屏 AITag 在位且分隔符为·(含新补的辅助功能屏)', async ({ page }) => {
    await enterWithFreshTour(page);

    const DOT_TEXT = 'AI 生成·仅供演示·非真实参考案例';
    const SLASH_TEXT = 'AI 生成 / 仅供演示 / 非真实参考案例';

    // welcome 屏 → 点「带我看」进入主导览(开始章节连播,rail 出现)
    await page.locator('button:has-text("带我看")').click();
    // 章节轨出现后跳到「开始用」章(CHAPTERS[5]),首步=辅助功能屏(AuxOverview,本次新补 AITag)
    const auxChapterBtn = page.locator('button:has-text("开始用")');
    await expect(auxChapterBtn).toBeVisible({ timeout: 5000 });
    await auxChapterBtn.click();

    // 辅助功能屏渲染(标题为叙事文案,只读不改)
    await expect(page.locator('text=还有这些,一直在')).toBeVisible({ timeout: 5000 });

    // 该屏 AITag 可见且为·分隔(定稿格式);旧斜杠格式不应出现
    const auxAITag = page.locator(`text=${DOT_TEXT}`).first();
    await expect(auxAITag).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${SLASH_TEXT}`)).toHaveCount(0);

    await page.screenshot({ path: 'playwright-report/onboarding-aux-aitag.png' });

    // 静态级补充断言:本屏可见的所有 AITag(.mono 容器)文本一律是·格式,无斜杠残留
    const tagTexts = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('[data-onboarding] span.mono').forEach((el) => {
        const t = (el.textContent ?? '').trim();
        if (t.includes('仅供演示')) out.push(t);
      });
      return out;
    });
    console.log(`[AITag 抽样] aux 屏可见标注=${JSON.stringify(tagTexts)}`);
    expect(tagTexts.length, 'aux 屏应至少有 1 个 AITag').toBeGreaterThanOrEqual(1);
    for (const t of tagTexts) {
      expect(t, 'AITag 文本应为·分隔定稿格式').toBe(DOT_TEXT);
      expect(t.includes(' / '), 'AITag 不应含斜杠分隔').toBe(false);
    }
  });
});
