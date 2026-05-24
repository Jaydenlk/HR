# Phase 9: Landing Page Implementation Plan

> **Retroactive documentation.** This plan was written after implementation to document what was actually built.

**Goal:** 构建 Coach 产品 Landing Page — Apple 风格、极简、单品牌色（#0a84ff），核心转化目标是引导用户点击"免费开始"进入 `/login`。完全静态、无 API 调用。

**Architecture:** 单个 Next.js Server Component（无 `'use client'`），全部使用 inline style，无外部组件库依赖，SVG 图标全部内联（不依赖 lucide-react）。路由为 `/landing`，独立于 `(main)` layout，有自己的顶部导航栏。

**Tech Stack:** Next.js 15 App Router (Server Component) | inline CSS-in-JS style | 无 API 调用 | 无状态管理

---

## File Structure

```
packages/web/src/app/landing/
└── page.tsx      ← 完整 Landing Page（单文件，约 1600 行）
```

---

## Task 1: 页面结构设计

页面从上到下共 6 个 section：

| # | Section | 描述 |
|---|---------|------|
| 1 | NAV | 毛玻璃顶栏 |
| 2 | HERO | 两栏布局 — 文案 + 深色对话卡片 |
| 3 | STATS STRIP | 四格关键数字横条 |
| 4 | PILLARS | 五格 Bento 特性展示 |
| 5 | FEATURES GRID | 六格 3×2 功能瓷砖 |
| 6 | SOCIAL PROOF | 两条校友引用卡片 |
| 7 | FOOTER CTA | 最终转化区 |

---

## Task 2: NAV — 毛玻璃顶栏

- [x] **Step 1: 顶栏布局**

三栏 flex (`justify-content: space-between`)：

- 左：Logo（30×30 黑色圆角正方形 "C" + "Coach" 文字）
- 中：导航文字链接（能力/面经库/校友故事/定价/下载，`cursor: default` 仅作展示用）
- 右：登录链接 + "开始使用"按钮（黑色背景小圆角）

- [x] **Step 2: 毛玻璃效果**

```css
position: sticky; top: 0; z-index: 5;
background: rgba(251,251,253,0.85);
backdrop-filter: blur(20px) saturate(180%);
border-bottom: 1px solid rgba(0,0,0,0.04);
```

---

## Task 3: HERO — 文案 + 对话卡片

- [x] **Step 1: 两栏布局**

```css
display: grid;
grid-template-columns: 1.2fr 1fr;
gap: 48px; align-items: center;
padding: 72px 56px 56px;
```

- [x] **Step 2: 左侧文案**

- 状态标签（绿点 + "已陪 12,408 位同学走完秋招"）
- H1：`clamp(52px, 7vw, 80px)` 字体，800 weight，"陪你跑完\n整个**秋招**。"（"秋招。"为品牌蓝色）
- 副标题：18px，"不是简历模板，不是题库 —— 是一个真的 AI 教练。"
- CTA 按钮组：主按钮（黑底白字"免费开始" + 右箭头 SVG）+ 次按钮（白底"看 30 秒" + 播放按钮 SVG）
- Meta 行：锁图标 + "对话端到端加密" · 星图标 + "免费 5 次诊断 / 周"

- [x] **Step 3: 右侧深色对话卡片**

```css
background: #1d1d1f; border-radius: 28px;
aspect-ratio: 1 / 1.05; overflow: hidden;
```

内部：
- 环境辐射渐变（80% 右上角蓝色 + 左下角蓝色）
- 顶部时间戳（"Coach · 进行中 · 5月23日 14:22"，半透明白色）
- 3 条对话气泡（用户：蓝底白字右对齐 `border-radius: 16px 16px 4px 16px`，Coach：半透明白底左对齐 `border-radius: 16px 16px 16px 4px`）
- Coach 头像：28px SVG 卡通脸（内联 SVG，含帽子/眼睛/微笑）
- 底部签名文字："— 像真的有人在陪你"

---

## Task 4: STATS STRIP — 四格关键数字

- [x] **Step 1: 四格网格**

```css
display: grid; grid-template-columns: repeat(4, 1fr);
border-top: 1px solid #e5e5e7; padding: 0 56px 32px;
```

每格：34px 数字 + accent 标签（如"↑ 8%"绿色）+ 12px 说明文字。格间用 `border-right: 1px solid #e5e5e7` 分隔（最后一格无右边框）。

四格内容：12,408（↑ 8% 校招用户 · 本周）/ +24分（简历平均提分）/ 8.4min（平均复盘时长）/ 3,802（24h 新增岗位）

---

## Task 5: PILLARS — Bento 特性展示

- [x] **Step 1: 五格 Bento 布局**

```css
display: grid;
grid-template-columns: 1.3fr 1fr 1fr;
grid-template-rows: auto auto;
grid-template-areas: "a b c" "a d e";
gap: 14px;
```

- [x] **Step 2: A 格（今天，hero 深色大格）**

- `grid-area: a`，`min-height: 494px`，深色背景 + 蓝色辐射渐变
- 标签"日 · TODAY" + 大标题"今天\n该做哪 5 件事？"
- 任务预览列表（5 行，前两行已完成绿色背景，后三行未完成半透明白底）
- 每行：圆形 checkbox（已完成绿色 + 对勾 SVG）+ 任务文字 + mono 时长

- [x] **Step 3: B/C/D/E 四个小格（白色，min-height: 240px）**

- B（期 · MONTHLY）：面经内容预览（时间戳 + 公司 + 标题两条记录）
- C（场 · INTERVIEW）：面试复盘预览（B+ 评级方块 + 公司/时间 + 3 条进度条）
- D（配 · 简历）：标题"投准每个岗位" + 描述文字（无预览内容）
- E（面 · OVERVIEW）：标题"看清整个秋招" + P73 同校排名环形图预览（64×64px SVG）

---

## Task 6: FEATURES GRID — 六格功能瓷砖

- [x] **Step 1: 3×2 白色卡片网格**

```css
display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
```

六个功能：简历馆/模拟面试/薪资雷达/求职信/投递追踪/职业地图。每格：34px 图标框（surface-2 背景 + surface-3 边框）+ 标题 + 描述文字 + 底部路由路径（mono 10.5px ink-4）。

图标全部使用内联 SVG（路径描述）。

---

## Task 7: SOCIAL PROOF — 校友引用

- [x] **Step 1: 两列引用卡片**

```css
display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
border-top: 1px solid #e5e5e7; padding: 48px 0;
```

每张卡片：大引号式引用文字（18px，weight 500）+ 底部用户信息行（40px 圆形头像 + 姓名 + 学校/公司信息）。

内容：张同学（北京交大·字节前端 offer）+ 陈小雨（复旦·美团数据 offer）。

---

## Task 8: FOOTER CTA — 最终转化

- [x] **Step 1: 居中转化区**

大标题（clamp 40-64px）："把今天的 5 步，先走完。"（"先走完。"品牌蓝色）。副标题："剩下的 38 天，慢慢来。"

两个 CTA 按钮（居中 flex）：主按钮"免费开始 · 微信扫码"（黑底白字）+ 次按钮"看 30 秒介绍"（白底黑字）。

底部三行 meta：已陪 12,408 位同学 / 对话加密声明 / Coach v4 版本号。

- [x] **Step 2: Commit**

```bash
git commit -m "feat: landing page — Apple-style marketing page, static, no API calls"
```

---

## Self-Review Checklist

- [x] **完全静态：** `page.tsx` 是 Server Component，无 `'use client'`，无 useState/useEffect，Next.js 静态导出完全兼容
- [x] **无外部依赖：** 全部使用 inline style，SVG 图标内联，无 lucide-react，无 shadcn/ui
- [x] **品牌一致性：** 单色系（#0a84ff 品牌蓝），字体使用 Plus Jakarta Sans/PingFang SC 字体栈，与 globals.css 设计 token 一致
- [x] **转化路径：** 全部 CTA（Nav "开始使用"、Hero "免费开始"、Footer "免费开始"）均 Link 到 `/login`
- [x] **响应式：** H1 使用 `clamp()` 流体字体，但整体布局未做 mobile breakpoint 适配（landing page 主要面向桌面用户）
