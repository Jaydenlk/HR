/**
 * 微信内置浏览器引导横幅 — 扫码上传页 (/upload/[token])
 *
 * 背景:微信内置浏览器的文件选择器只给「拍照/相册」,选不了已有录音文件(见 lib/wechat 注释)。
 *   修复:UA 含 MicroMessenger 时,在上传页显示「点右上角 ··· → 在浏览器打开」引导横幅。
 *
 * 本测试只验证引导横幅的「显隐」,与令牌有效性无关 —— 横幅是纯客户端 UA 判定渲染的,
 *   令牌无效时页面会进入「链接已失效」终态(横幅在那个分支里本就不显示),所以这里用一个
 *   语法合法但内容随意的令牌段,并断言:微信 UA → 横幅可见;普通手机 UA → 横幅不可见。
 *
 * 端口:默认 3099(可经 WECHAT_GUIDE_BASE_URL 覆盖),需外部先 `next start` 起好该端口的 web。
 *   不依赖后端 API(本页不预校验令牌,且我们断言的是横幅 DOM,不是上传结果)。
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.WECHAT_GUIDE_BASE_URL ?? 'http://localhost:3099';

// 任意语法合法的令牌段:页面据此渲染表单态(含可能显示的引导横幅)。
const FAKE_TOKEN = 'e2e-fake-token-1234567890abcdef';
const UPLOAD_PATH = `/upload/${FAKE_TOKEN}`;

// 微信内置浏览器 UA(关键标识 MicroMessenger);其余字段照搬安卓微信典型形态。
const WECHAT_UA =
  'Mozilla/5.0 (Linux; Android 13; PixelX) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ' +
  'MMWEBID/1234 MicroMessenger/8.0.49.2600(0x28003153) WeChat/arm64 Weixin NetType/WIFI';

// 普通手机浏览器 UA(安卓 Chrome),不含 MicroMessenger。
const NORMAL_MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 13; PixelX) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/116.0.0.0 Mobile Safari/537.36';

test.describe('扫码上传页 · 微信引导横幅显隐', () => {
  test('微信内置浏览器(UA 含 MicroMessenger) → 引导横幅可见', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: WECHAT_UA });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${UPLOAD_PATH}`);
    await page.waitForLoadState('networkidle');

    const guide = page.getByTestId('wechat-guide');
    await expect(guide).toBeVisible();
    // 关键引导文案在场,确保不是空横幅
    await expect(guide).toContainText('在浏览器打开');
    await expect(page.getByText('微信里选不了录音文件')).toBeVisible();

    console.log('WeChat UA: PASS — 引导横幅可见且含「在浏览器打开」');
    await context.close();
  });

  test('普通手机浏览器(UA 无 MicroMessenger) → 引导横幅不可见', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: NORMAL_MOBILE_UA });
    const page = await context.newPage();
    await page.goto(`${BASE_URL}${UPLOAD_PATH}`);
    await page.waitForLoadState('networkidle');

    // 表单态正常渲染(文件选择按钮在),但引导横幅不在 DOM。
    await expect(page.getByText('点击选择录音文件')).toBeVisible();
    await expect(page.getByTestId('wechat-guide')).toHaveCount(0);

    console.log('Normal mobile UA: PASS — 引导横幅不存在');
    await context.close();
  });
});
