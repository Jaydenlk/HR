// landing/fonts.ts — server-only font loaders for the Night Atelier landing page.
//
// 约束(已核 node_modules/next/dist/docs/.../font.md):next/font/google 是构建期 loader,
// 必须在「非 'use client'」模块里调用,否则会被打进 client bundle 而报错。本文件不带
// 'use client',由 server component landing/page.tsx import,只把生成的 .variable 字符串
// 透传给 client 组件 —— 字符串可安全跨 server/client 边界。
//
// 字体策略(见 page.tsx 注释):
//   Latin(Newsreader 斜体正文点缀 + JetBrains Mono)→ next/font/google 自托管,小、可靠、墙内可达。
//   CJK(Noto Serif SC / Noto Sans SC)→ 不自托管(全量太大),改用 page.tsx 里的 <link rel=stylesheet display=swap>,
//   并在 lg-tokens 的 --serif/--sans 变量里保留 PingFang/YaHei/Songti/SimSun 系统回退,墙内 CDN 拿不到时优雅降级、不阻塞首屏。

import { Newsreader, JetBrains_Mono } from 'next/font/google';

// Newsreader —— 仅用于斜体点缀(源 .news-i 用 italic)。变量字体,带 italic style。
export const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic', 'normal'],
  display: 'swap',
  variable: '--font-news',
});

// JetBrains Mono —— 等宽,用于 .mono / kicker / 评分数字。
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-jb',
});
