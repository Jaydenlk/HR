// landing/page.tsx — Night Atelier landing, server entry.
//
// 为什么 page 是 server component 而非 'use client':next/font/google 是构建期 loader,
// 文档(node_modules/next/dist/docs/.../font.md)所有示例都在 server 文件调用,放进 'use client'
// 文件会被打进 client bundle 而报错。因此字体在本 server page 初始化,交互全部下沉到
// _client.tsx('use client',承载 Atmos/Nav/Hero/hooks/主题 state)。落地页的「客户端交互」
// 由 LandingClient 提供,本文件只做:字体注入 + CJK <link> + 防闪烁主题脚本 + 页面级 CSS 注入。
//
// 主题防闪烁:下方内联 <script> 在 React 水合前同步执行,从 localStorage['coach_theme'] 取(没有
// 则用 matchMedia 跟随系统),设到 document.documentElement.dataset.theme。CSS 的 :root /
// [data-theme="light"] 据此在首帧即生效 —— 不会先深色再变浅色。LandingClient 挂载后把该值
// 镜像进 state,日/月按钮切换时同步 state + html data-theme + localStorage。
//
// 字体:Latin(Newsreader 斜体、JetBrains Mono)用 next/font/google 自托管(小、墙内可达),
// 其 variable 挂在 .lg-root;CJK(Noto Serif/Sans SC)用下方 <link display=swap>,墙内 CDN
// 拿不到时由 _styles.ts 里 --serif/--sans 的系统回退链(PingFang/YaHei/Songti/SimSun)接住,不阻塞首屏。

import type { Metadata } from 'next';
import { newsreader, jetbrainsMono } from './fonts';
import { LANDING_CSS } from './_styles';
import { MOBILE_CSS } from './_mobile_styles';
import LandingClient from './_client';
import LandingMobile from './_mobile';

export const metadata: Metadata = {
  title: 'Coach · 给 2026 秋招生的 AI 求职教练',
  description:
    '说一句你卡在哪,它把下一步配好。诊断、改简历、模拟面试 —— 句句有据,不替你编一个数字。注册送 50 点,试运行不收费。',
};

// 防闪烁:首帧前从 localStorage / 系统偏好定主题,设 html data-theme。
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('coach_theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

// 响应式桥接:纯 CSS 媒体查询 show/hide,断点与全站 mobile-gate(MOBILE_MAX_WIDTH=768)对齐。
// <768 显示移动版、隐藏桌面;≥768 反之。display:none 那一侧不绘制、不跑动画 —— 无 hydration
// mismatch、无切换闪动。两套 DOM 并列存在,但任一视口只有一套可见。
const RESPONSIVE_CSS = `@media (max-width:767px){.lg-root{display:none}}@media (min-width:768px){.lg-mroot{display:none}}`;

export default function LandingPage() {
  return (
    <>
      {/* 防闪烁主题脚本:同步内联,水合前设 html data-theme */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />

      {/* CJK 字体经 _styles.ts 的 @import 加载(display=swap,墙内拿不到则降级到系统中文字体);
          这里仅 preconnect 提速,不放 stylesheet <link>(避免 next/no-page-custom-font 且不污染全局)。 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* 页面级 CSS(含 CJK @import):桌面 tokens + hero + story + tail,仅挂在本路由 */}
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      {/* 移动版 CSS:每条规则带 .lg-mroot 作用域,与桌面 .lg-root 互不污染 */}
      <style dangerouslySetInnerHTML={{ __html: MOBILE_CSS }} />
      {/* 响应式桥接:按视口宽度二选一显示 */}
      <style dangerouslySetInnerHTML={{ __html: RESPONSIVE_CSS }} />

      <div className={`lg-root ${newsreader.variable} ${jetbrainsMono.variable}`}>
        <LandingClient />
      </div>
      <div className={`lg-mroot ${jetbrainsMono.variable}`}>
        <LandingMobile />
      </div>
    </>
  );
}
