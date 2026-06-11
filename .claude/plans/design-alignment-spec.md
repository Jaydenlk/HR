# 设计稿对齐实施清单（design-alignment-spec）

> 来源：设计系统提取 + 7 组页面比对（landing-login / overview / today / chat / interview / monthly-digest / tools）。
> 设计稿目录：`E:/Agent program/HRBP/Claude design/`。实现目录：`E:/Agent program/HRBP/packages/web/src/`。
> 已核对的事实基线（写本清单前实测）：
> - 全项目无 `next/font`、无 `@font-face`、无 Google Fonts link；`globals.css:45` 用 Inter，`landing/page.tsx:18` 单独写 Plus Jakarta Sans —— 两种字体实际都没加载，真实回退到 PingFang SC / system-ui。
> - `components/ui/sonner.tsx` 已配好 `<Toaster>`（含 success/info/warn/error/loading 图标），但全项目仅此 1 处出现，从未在任何 layout 挂载（root `layout.tsx` 与 `(main)/layout.tsx` 均无）。
> - 硬编码语义色 `#10b981/#f59e0b/#6366f1/#f97316/#0ea5e9` 共 56 处，分布 10 文件（salary 20、industry-trend 7、offer-comparator 7、funnel-chart 5、overview 3、interview-prep 4、follow-up 4、learning-roadmap 2、cover-letter/_referral 3、newspaper 1）。
> - `@keyframes spin` 内联重复定义于 13 个文件。
> - 侧边栏 nav 圆点 `(main)/layout.tsx:380-381` 为 7×7px（设计 8×8）。
> - **红线约束**：禁止 mock 数据；AI/聚合数据缺失时走空态或诚实降级，不得为对齐设计稿编造（排名 P73 / ¥38.4k / 美团 / 17 天 / 72% 等假值一律禁止写死）。

---

## 1. 全局层（token / 公共组件，改一处全站生效）—— 按影响面排序

| # | 项 | 优先级 | 文件:line | 现状 → 改法 | 验收 |
|---|----|--------|-----------|-------------|------|
| G1 | **字体根本未加载 + 两处声明打架** | 高 | `app/layout.tsx`（root，无 font）；`globals.css:45`（Inter）；`landing/page.tsx:18`（Plus Jakarta 内联） | 用 `next/font/google` 加载 `Plus Jakarta Sans`（拉丁基调）+ 中文回退栈，在 root `layout.tsx` 注入到 `<html>`/`<body>` 的 className，并把 `globals.css:45 --font-sans` 引用该变量；删除 `landing/page.tsx:18` 的局部字体声明。注意 `packages/web/AGENTS.md` 提示该 Next 版本有 breaking changes，写前读 `node_modules/next/dist/docs/` 字体相关文档 | DevTools computed `font-family` 首位是 Plus Jakarta Sans；landing 与内页同字体；无第二处字体声明 |
| G2 | **语义色板漂移：第二套 emerald/amber/indigo 硬编码** | 高 | 56 处/10 文件：`salary/page.tsx`(20)、`industry-trend/page.tsx`(7)、`offer-comparator/page.tsx`(7)、`components/overview/funnel-chart.tsx`(5)、`overview/page.tsx`(3)、`interview-prep/page.tsx`(4)、`follow-up/page.tsx`(4)、`learning-roadmap/page.tsx`(2)、`cover-letter/_referral/index.tsx`(3)、`newspaper/page.tsx`(1) | 全部替换：`#10b981`→`var(--color-success)`、`#f59e0b`/`#f97316`→`var(--color-warn)`、`#6366f1`/`#0ea5e9`→`var(--color-brand)`，对应 rgba 用 soft 变量。回到「一品牌色 + 三语义色」纪律。funnel-chart 的五色另见 OV-中-1（漏斗专门改单色逻辑，不只是换 token） | grep `#10b981|#f59e0b|#6366f1|#f97316|#0ea5e9` 返回 0；视觉无第二套绿/橙/紫 |
| G3 | **`<Toaster>` 从未挂载（反馈基建缺失）** | 高 | `components/ui/sonner.tsx`（已配好未用）；挂载点 `(main)/layout.tsx` | 在 `(main)/layout.tsx`（及视需要 root layout）挂载 `<Toaster/>`。这是 §2 toast 规范的前置依赖。**冲突提示**：`(main)/layout.tsx` 是 admin 面板分支/登录分支也会动的文件，合并注意（见 §5） | toast.success 可在任意内页弹出；不报 next-themes/SSR 错 |
| G4 | **shadcn 公共组件全员闲置（按钮/卡片/Badge/Input/Tabs）** | 中 | `components/ui/{button,card,badge,input,tabs}.tsx`（仅 dialog 用过 Button）；业务页全 inline 重写 | 见 G5–G9 分项把组件对齐 token 后，再分批迁移业务页 inline 控件。本条为「组件库收口」总纲，落地拆到 G5–G9 + 各页 | 业务页 inline `<button>`/`<input>`/手拼 chip 逐步减少 |
| G5 | **Button 缺 brand 变体 + size 高度/圆角不对齐** | 中 | `components/ui/button.tsx:11-27` | 现 `default=bg-primary`(✓ ink)、无 brand 变体；size 用 h-6/7/8/9（24/28/32/36），与设计 sm 6×12 / 默认 8×16 / lg 12×22、圆角 8/10/12px 不符；destructive 用 `destructive/10` 浅底而非实心语义色。新增 `brand`(`bg-brand text-white`)、`primary`(ink 实心已有 default 可复用)，size 高度/圆角对齐 core.jsx 三档 | 三档高度/圆角对齐设计；存在 brand 变体并渲染为蓝底白字 |
| G6 | **Badge/Chip 缺 success/warn/brand 语义变体** | 中 | `components/ui/badge.tsx` ↔ core.jsx `.chip` | 现仅 default/secondary/destructive/outline/ghost/link。新增 success/warn/brand 变体，采用 core.jsx 软底 + 深色文字（success #1f7a31 / warn #a86200 / danger #bf2418 + `--*-soft` 底），可选 `.dot`。业务页手拼 chip 改用之 | 三语义变体渲染软底+深色文字；页内不再手拼同款 chip |
| G7 | **spin 关键帧 13 处重复 + 时长不一** | 中 | 13 文件内联 `<style>@keyframes spin`（industry-trend/career/today/applications/cover-letter/follow-up/diagnoses-new/diagnoses-campus/chat 等，时长 0.8s/1s 混用） | 在 `globals.css` 定义一次 `@keyframes spin` + `.spin` 工具类（或统一用 Tailwind `animate-spin`），各页删除内联 keyframes | grep `@keyframes spin` 仅 globals.css 命中；loading 旋转统一 |
| G8 | **圆角缺 pill 档 + 两套圆角来源并存** | 低 | `globals.css:40-42`（缺 pill）、`83-89`（@theme inline 另起一套 shadcn 圆角） | 补 `--radius-pill:999px`；让 shadcn 基准 `--radius` 与设计 14/20/28 档对齐（或 card 等直接用 `--radius-lg`），统一单一圆角来源 | 存在 pill token；卡片圆角 = 20px 而非 ≈19.6 |
| G9 | **Card 半透明 ring 而非实线 hairline + padding 不符** | 低 | `components/ui/card.tsx:15` ↔ core.jsx:137-141 | 现 `ring-1 ring-foreground/10` + rounded-xl + py-4 无横向内建 padding。改 `border border-line` 实线 + padding 20–22px + 圆角 20px，去半透明 ring | Card 描边为 1px 实线 `--line`；横向 padding ≥20px |
| G10 | **Tabs active 视觉与业务分段控件两套** | 低 | `components/ui/tabs.tsx:61-64` ↔ 业务页 brand 实心分段 | 统一分段控件：要么全用 shadcn Tabs 并把 active 改设计样式，要么抽 `SegmentedControl`（brand 蓝底白字 active）。二选一，避免两套 | 分段控件 active 视觉全站一致 |
| G11 | **Input 高度/内距/底色与表单不符** | 低 | `components/ui/input.tsx:12` ↔ salary inputStyle(`salary:174-186` padding 9×12 / r 8 / 13.5px / `--surface`) | 让 Input 规格对齐设计（padding/圆角/字号/`--surface` 底），各页表单逐步改用 | Input 渲染与设计表单规格一致 |
| G12 | **侧边栏 nav 圆点 7px → 8px** | 低 | `(main)/layout.tsx:380-381` | `width/height` 7px 改 8px | 圆点 8×8px |

> **保留实现（token 层做得好，勿动）**：`globals.css :root/@theme` 对 core.jsx 的 surface/ink/line/brand/semantic/radius 数值复刻准确（#fbfbfd/#1d1d1f/#e5e5e7/#0a84ff/#34c759/#ff9500/#ff3b30/14-20-28 全一致）；侧边栏与导航用同名 CSS 变量 inline 还原到位。

---

## 2. 全站 UX 反馈基建（先行项，逐页改动依赖它）

> 这些是「基建缺口」，必须先落地再做逐页反馈对齐，否则各页各写一套 inline 反馈继续漂移。

- **F1 Toast 系统（高，前置）**：依赖 G3 挂载 `<Toaster>`。建立全站规范：**写操作成功一律 `toast.success`、失败一律 `toast.error`**，替代各页 inline `<div>` 错误条 / `alert()` / 静默吞错。当前全项目 grep 不到任何 `toast()` 调用。验收：随便一个表单提交成功/失败都弹 toast。
- **F2 按钮 pending 规范（中）**：统一「pending 时禁用 + Loader2 旋转 + 文案切换（如『提交中…』）+ 光标 not-allowed + 降透明度」。多数 tools 页已具备（保留），需补的页见逐页清单。验收：所有触发异步写的按钮在 in-flight 期间禁用且有可见 pending。
- **F3 骨架屏规范（低-中）**：统一骨架结构 + `pulse/shimmer` 动画（当前多页骨架是静态灰块，无动画，grep 无 `@keyframes` shimmer）。建议在 `globals.css` 提供 `.skeleton`（含 shimmer keyframe）工具类，骨架形态须贴近最终布局（避免加载完成时布局跳变）。验收：loading 态有流动感且与终态布局一致。
- **F4 空态规范（中）**：空态须含「图标 + 标题 + 引导文案 + 可点 CTA / 恢复操作」，禁止只有一句纯文字。overview/today/chat/digest 的空态已达标（保留为范本）；newspaper 筛选空态、interview 等需补恢复按钮。验收：每个空态可一键回到有内容状态。
- **F5 错误态可恢复（中）**：错误条须含「中文友好兜底文案 + 重试按钮」，禁止直抛 `err.message`（可能英文/技术性）。overview/newspaper 等缺重试。验收：接口失败后点重试可重新拉取，无需刷新整页。
- **F6 软路由代替硬跳（中）**：成功后用 `next/navigation` 的 `router.push/replace` 软跳转，替代 `window.location.href` 整页 reload（闪白）。涉及 login、debrief 提交等。验收：跳转无整页白屏。

---

## 3. 逐页清单

> 每条格式：`[档] 说明 — file:line — 改法`。token/公共组件类问题已上提到 §1/§2，本节只列页面特有差异。各条可独立验收。

### 3.1 landing（落地页）/ login（登录页）

设计稿：`Claude design/s-landing.jsx`（仅 landing；login 无设计稿，按设计系统 token 自建，只盘点反馈）。

- **[中] 删了 EN 语言项** — `landing/page.tsx:91-128`（设计 s-landing.jsx:175-179 nav-r 三项 EN/登录/开始使用）— 补回 EN 项（占位或真 i18n，至少视觉对齐三项布局）。
- **[中] 所有 CTA/导航按钮无 hover、无 transition** — `landing/page.tsx:111-128,212-276,1544-1593`（设计 core.jsx:111-126 `.btn transition:.12s`，primary hover→#000，次级 hover→surface-2）— 给主/次按钮加 hover 背景变化 + `transition:.12s`（用 globals 类或 onMouseEnter/Leave）。
- **[中] 功能卡片图标未复用 IK，glyph/描边/尺寸不统一** — `landing/page.tsx:1205-1305`（设计 s-landing.jsx:316-348 用 IK money/brief/globe 等，viewBox24/sw1.7/18px；现手写 16px viewBox16 sw1.2，money 画成时钟、brief/globe 形态不符）— 改用与 IK 同源线性图标（viewBox24/sw≈1.4-1.7/~18px），至少 money/brief/globe 形态对回。
- **[低] hero/脚部 CTA 的 arrow/play/lock/bolt 图标不一致** — `landing/page.tsx:229-322`（设计 IK.arrow 长箭头、IK.play 实心三角；现手写、play 改成圆圈内三角）— 改回 IK 同款 glyph 与描边。
- **[低] 功能卡片图标底座内图标偏小** — `landing/page.tsx:1319-1333`（设计 34px 底座放 18px 图标；现 16px）— 图标放大到 18px。
- **[中] login 成功硬跳转闪白** — `login/page.tsx:146-147`（`window.location.href='/today'`）— 改 `router.replace('/today')` 软跳（见 F6）。
- **[保留] login 验证码校验 / 重发倒计时 / pending/禁用 / 新用户渐进披露 / dev_code 提示** — `login/page.tsx:316-444,496-533` — 反馈完整，优于平均，勿退化。

### 3.2 overview（求职总览）

设计稿：`Claude design/s-overview.jsx`。注：hero quickstats / 薪资雷达 / 趋势 / 能力盘点四大区块在设计稿基于 mock，**是否补回取决于后端能否提供真实数据，无数据严禁编造**。

- **[高] 缺深色 hero quickstats 大卡** — `overview/page.tsx:158-201`（设计 s-overview.jsx:167-188：ink 底 hero + 蓝径向高光 + 问候 + 3 个 quickstat 排名/转化率 ↑↓delta）— 新增 ov-hero；**数据缺失时各 quickstat 走『暂无』占位，不编造 P73**。
- **[中] 缺 topbar『导出周报』动作入口** — `(main)/layout.tsx`（无 topbar）（设计 s-overview.jsx:155-162）— 补一个真实可用的导出按钮或显式去掉，不要留半截；若实现需配 pending + 成功 toast。
- **[中] 漏斗五色花哨，应单色 + offer 蓝高亮 + bar 内百分比** — `components/overview/funnel-chart.tsx:7-12,67-76`（设计 s-overview.jsx:44-46：默认 ink、仅 offer 用 brand）— 改为深色 bar + offer 蓝高亮单色逻辑，加 bar 内 pct 文字（与 G2 同文件，合并改）。
- **[中] 漏斗缺转化率三联 + delta + 洞察条** — `funnel-chart.tsx:14`（设计含 rate%/delta/funnel-rates 三联/Coach 洞察）— 由真实 funnel 计算转化率三联；无 AI 数据时退化为纯转化率展示，不编造洞察。
- **[中] error 条无重试** — `overview/page.tsx:204-218`（仅展示 err.message）— 补『重试』按钮重新 `api.get('/overview')`（见 F5）。
- **[中/决策] 薪资雷达 / 趋势折线 / 市场温度 / 能力盘点四区块缺失** — `overview/page.tsx:359-529`（设计 s-overview.jsx:233-348）— **依赖后端真实排名/薪资分布/12周时序/JD技能聚合数据**；无数据则保留现「面试表现/简历状态/使用记录」诚实减法版，仅建议薪资卡留一个跳 `/salary` 入口呼应设计意图。优先级低，非纯前端问题。
- **[低] 骨架无 shimmer** — `overview/page.tsx:103-115,221-244` — 见 F3。
- **[保留] 空态（全零判定 + 双 CTA 真实跳转）/ SectionCard action 真实链接 / FunnelChart bar 过渡动画** — `overview/page.tsx:247-337,39-99` — 优于设计稿，勿退化。

### 3.3 today（今日）

权威设计稿：`Claude design/v5-today.jsx`（轻盈白底两栏，明确 override 旧深色 `s-today.jsx`）。**右栏三卡 + streak 依赖后端聚合接口，tasks API 现仅 today/getByDate/generate/update，无 streak/面试包/洞察/本周日程，缺数据走空态不写死。**

- **[高] 整体应为两栏，现仍是旧深色 hero 单栏** — `today/page.tsx:365-374,376-454`（设计 v5:5-34,166 grid 1.5fr/1fr，注释 `no dark hero, data IS the visual focus`）— 删深色 hero，body 改 grid 两栏（左任务列表 / 右下一场面试+Coach洞察+本周接下来）。
- **[高] 问候区缺头像/个性化问候/倒计时副标题** — `today/page.tsx:402-447`（设计 v5:8-17,134-151 头像+『早上好，X·今天还有 N 件事』brand 强调 + 倒计时 + 右上进度环『今日完成』，无卡片底）— 按 v5 重写问候区，去深色卡。
- **[高] 任务卡缺『开始 →』动作按钮 + 完成态文字** — `today/page.tsx:112-207`（设计 v5:42,52-54,184-186 末列 brand 主按钮，完成态『已完成 ✓』）— 任务卡末列补『开始 →』跳对应模块（用 `linked_type/linked_id`），完成态显示『已完成』。
- **[高] 勾选失败静默吞错** — `today/page.tsx:338-355`（空 catch 仅回滚状态，用户看不到失败）— 失败回滚时弹 `toast.error('保存失败，请重试')`（见 F1），不静默。
- **[中] 缺连续打卡 streak 条** — `today/page.tsx`（无）（设计 v5:19-29,154-163）— 需后端 streak 接口；无则空态，不写死『17 天』。
- **[中] 缺右栏「下一场面试」卡** — 无（设计 v5:64-85,198-221）— 聚合 interviews 接口，无数据空态。
- **[中] 缺右栏「Coach 今日洞察」卡** — 无（设计 v5:87-94,224-240）— 需 AI 洞察接口，缺则隐藏/空态，不编造。
- **[中] 缺右栏「本周接下来」卡** — 无（设计 v5:96-107,243-268）— 聚合 applications/interviews 日程，无则空态。
- **[中] 列表标题文案/字号** — `today/page.tsx:456-515`（设计『今日 N 步』18px + 剩余时长 meta；现『今日任务』17px）— 对齐文案与 18px；重新生成按钮位置可保留。
- **[低] 完成色硬编码 #12b76a / 进度环 #0a84ff** — `today/page.tsx:130-149` — 改 `var(--color-success)`/`var(--color-brand)`。
- **[低] 缺生成成功 toast** — `today/page.tsx:325-336` — 成功后 `toast.success('已生成今日任务')`。
- **[低] 骨架无动效** — `today/page.tsx:549-565` — 见 F3。
- **[低] 任务卡无 hover 反馈** — `today/page.tsx:116-127`（内联 style 无伪类）（设计 v5:43 hover border 加深）— 用 className/onMouseEnter 加 hover 边框加深。
- **[保留] 任务类型彩色 badge（信息量高于单一灰 chip）/ 全完成庆祝条 / 重新生成 pending / 乐观更新 / 错误横幅 / 空态引导** — 勿退化。

### 3.4 chat（对话）

设计稿：`Claude design/s-chat.jsx`（仅对话详情视图）。最大差距是结构性（富卡片前后端均未落地）。

- **[高] 富卡片系统缺失（诊断卡/重写卡 + 卡内操作按钮）** — `components/chat/message-bubble.tsx:17-108`（只渲染纯文本）；`types.ts:222` 与 `message.entity.ts:30` 有 `rich_card` 字段但后端 `chat.service.ts` 只返回纯文本 — **架构补齐**：后端 chat.service 产出结构化 rich_card，MessageBubble 加 rich_card 分支渲染诊断卡（评分 tile/5维 chips/findings/before-after 红绿/4 操作按钮）与重写卡。卡内操作按钮须配 pending/成功 toast。
- **[高] 缺建议 chips 行（sugg）** — `chat-detail.tsx`（无）（设计 s-chat.jsx:257-263 brand 主 chip + 普通 chip）— 在最后一条 AI 消息后渲染后端返回的 suggestions chip 行，点击填入输入框/触发动作。
- **[中] 头像为字母而非插画 SVG** — `message-bubble.tsx:30-47`、`chat-detail.tsx:16-32`（设计 core.jsx Avatar coach/user 插画 36px；现灰底字母 32px）— 引入设计稿 coach/user 插画 SVG 头像，尺寸 36px。
- **[中] 顶栏缺副标题 + 收藏/下载/更多** — `chat-detail.tsx:250-300`（设计 s-chat.jsx:115-123）— 标题下补副标题（工具+相对时间），右侧补收藏/导出/更多图标按钮。返回链接保留（多页路由合理适配）。
- **[中] 输入框缺附件/命令/语音工具 chip + 引导占位** — `chat-input.tsx:48-114`（设计 s-chat.jsx:269-282）— 补工具 chip 行 + 『继续 ——』占位（附件/语音暂不支持可先做命令 chip）。
- **[低] 底部快捷键提示 + 端到端加密尾注** — `chat-input.tsx:115-163`（设计 s-chat.jsx:283-288）— 补『/命令』『⌘K 搜索』『对话端到端加密·不用于训练』。
- **[低] 缺日期分隔条** — `chat-detail.tsx:343-372`（设计 s-chat.jsx:128）— 按 created_at 跨天插入居中 day-sep（等宽 + 两侧细线）。
- **[低] AI 气泡缺 `<b>`/`<mark>` 富文本** — `message-bubble.tsx:58-74` — 按轻标记渲染加粗/高亮（配套后端输出标记）。
- **[低] 戳记缺耗时 + tool_used 恒空** — `message-bubble.tsx:76-104`（后端从不回填 tool_used）— 后端回填 tool_used + 可选耗时，前端 stamp 展示。
- **[保留] 列表/详情骨架 / 打字三点指示器 / 发送乐观更新+失败回滚 / 新建 pending / 发送 pending/禁用 / 错误条（可关闭）/ 空态 / 自动滚底 / 列表卡 hover** — 反馈扎实，勿退化。**缺口**：发送/新建成功无 toast（补 F1）；发送失败无重试按钮（可改进）。

### 3.5 interview（面试复盘 = debrief 列表 + 详情）

设计稿：`Claude design/s-interview.jsx` → `debrief/page.tsx` + `debrief/[id]/debrief-detail.tsx` + `components/interview/*`。（mock/ 与 interview-prep/ 是独立功能，不在此。）信息架构大面积缺失。

- **[高] 列表页缺顶部 4 统计卡** — `debrief/page.tsx:131-187`（设计 s-interview.jsx:247-276：总面试数/综合等级/待改进/24h复盘率，首张 ink 高亮）— 补 4 卡，数据走后端聚合，缺则空态。
- **[高] 列表页缺 capture 引导 banner** — `debrief/page.tsx:166-187`（设计 s-interview.jsx:279-289：ink 底 + Coach 头像 + 双行文案 + 上传录音/手动记录双按钮）— 补 banner。
- **[高] 详情页应双列，现单列** — `debrief-detail.tsx:131-132`（maxWidth:860 单列）（设计 s-interview.jsx:84 grid 1.6fr/1fr）— 改双列：左主体（头部+能力分布+逐题），右侧栏（预测+盲点+趋势三卡）。
- **[高] 详情头部缺录音波形播放器** — `debrief-detail.tsx` 头部（设计 s-interview.jsx:398-407：播放按钮+波形+时间+转写字数；Interview 有 audio_url 未用）— 补播放器；无录音显示『无录音』降级，不整块缺失。
- **[中] 列表缺筛选行（tab+搜索）** — `debrief/page.tsx`（无）（设计 s-interview.jsx:292-304）— 补 fltr，至少『全部/需复盘/有录音』。
- **[中] 列表缺横向洞察 pat-card** — 无（设计 s-interview.jsx:328-347 公司×题型分布）— 后端聚合；数据不足走『需更多面试样本』空态，不编造。
- **[中] 列表卡缺『刚复盘/洞察数/盲点数』语义 chip** — `interview-card.tsx:101-150`（现仅有转写/已分析）— 补高亮+洞察数+盲点数 chip。
- **[中] 详情缺知识盲点汇总卡** — `debrief-detail.tsx`（无）（设计 s-interview.jsx:524-547）— 从 questions 的 gap 聚合；无盲点空态。
- **[中] 详情缺历史趋势对比卡** — 无（设计 s-interview.jsx:549-566 对比近 3 场）— 取近 3 场 overall_grade；样本不足降级提示。
- **[中] 预测卡缺底部 CTA** — `prediction-card.tsx:128`（设计 s-interview.jsx:518-521『用这些题模拟』brand + 『导出准备清单』）— 补两 CTA，模拟联动 mock 模块。
- **[中] 逐题卡缺底部『加入题库/模拟1次』** — `question-card.tsx:284-315`（设计 s-interview.jsx:496-499）— 右侧补两按钮联动题库/mock。
- **[中] 详情顶栏缺操作区（重新评估常驻 + 问 Coach）** — `debrief-detail.tsx:133-149`（现仅返回链接；重评仅无分析时出现）— 重评提为常驻 + 问 Coach 入口 + 成功 toast；下载/收藏视优先级补。
- **[中] 新建提交失败 alert + 成功硬跳无 toast** — `debrief/page.tsx:97-129` — 失败改内联/toast，成功 `router.push` + toast（见 F1/F6）。
- **[中] 列表卡无 hover 反馈** — `interview-card.tsx:44`（设了 transition 无 :hover）（设计 s-interview.jsx:54）— 加 hover 边框 line→line-2。
- **[低] 预测高亮阈值 80→85** — `prediction-card.tsx:88`（设计 s-interview.jsx:515 ≥85）。
- **[低] 三 chip 配色 surface-3→surface-2** — `question-card.tsx:102`（设计 s-interview.jsx:144 默认 chip surface-2/ink-3）。
- **[低] topbar 副标题层级缺** — `debrief-detail.tsx:257-270`（meta-row 面试官已有，保留）（设计 s-interview.jsx:375）— 补 topbar 副标题即可。
- **[低] 列表骨架单列无脉冲 / 错误直抛 err.message 无重试** — `debrief/page.tsx:189-220` — 骨架改两列 + pulse（F3）；错误中文兜底 + 重试（F5）。
- **[保留] 未分析空态+手动分析按钮 / grade null 显『?』诚实降级 / 列表 EmptyState / 详情错误/加载骨架** — 设计稿没有但产品必需，勿退化。

### 3.6 monthly-digest（月刊面经 = newspaper + digest + radar）

设计稿：`Claude design/s-monthly.jsx`。最大单点差异是卡片封面区丢失。

- **[高] newspaper 列表卡丢失渐变封面区** — `newspaper/page.tsx:366-425`（FeedItemCard）（设计 s-monthly.jsx:51-104,203-216：aspect 1.5/1 封面，6 色渐变 b1-b6 轮换 + tag 浮层 + 点赞浮层 + co-mark + blob，设计明确『color comes from a single cover image hue』）— 给卡片加渐变封面区（按 index 轮换），叠加 tag/点赞/co-mark 浮层。
- **[中] 卡片缺点赞/评论数** — `newspaper/page.tsx:383-422`（现仅 quality_score）— 后端有字段则补点赞浮层 + 页脚评论数；无字段则向用户标明是质量分而非热度。
- **[中] 『题库』tab 名实不符** — `newspaper/page.tsx:151,127-129`（label『题库』实际过滤 `editorial`）— label/过滤对齐真实题库数据；无则改名与过滤内容一致。
- **[中] 首屏 loading 无骨架** — `newspaper/page.tsx:194-198`（仅 spinner）— 改 hero/卡片骨架屏减少布局跳变（F3）。
- **[中] 筛选无结果空态过简 + 无恢复操作** — `newspaper/page.tsx:280-283`（仅一句文字）— 补图标 + 『回到全部』恢复按钮（F4）。
- **[中] error banner 无重试 + 与 EmptyState 叠加** — `newspaper/page.tsx:100-107,186-191`— 加重试，出错时不叠加 EmptyState（F5）。
- **[中] digest 发布成功无 toast** — `digest/page.tsx:263-269` — 补成功 toast（F1）。
- **[中] digest 切来源/类型筛选整页闪 spinner** — `digest/page.tsx:354-374`（onClick setLoading 替换整片）— 改仅网格区域轻量 loading / 旧列表加蒙层。
- **[低] 头部缺『筛选』按钮** — `newspaper/page.tsx:173-182`（页面已有 tab+sort，可不补；要对齐则补跳 radar 入口）。
- **[低] hero 第三卡『Coach 建议』vs 设计『你的复盘』** — `newspaper/page.tsx:344-361`（现 Coach 建议有真实 data_source 更诚实，保留）；可选：有最近 interview 时改成跳 /debrief 个性化卡。
- **[低] 卡片圆角 10px → 16-18px** — `newspaper/page.tsx:855`（设计 .post 18px / hero 24px）— 与 G8 token 负责人协调后调大。
- **[低] 卡片 hover 设计是『仅边框变浅』，现『边框变蓝+阴影』** — `newspaper/page.tsx:859-862`（现更醒目，保留；严格对齐则弱化）。
- **[保留] digest 写面经表单（必填禁用/pending/字数/form-error）/ 导入 RunNotice / Coach 建议『暂无数据支撑』诚实空态 / 『仅校招』客户端过滤** — 优于设计稿，勿退化。

### 3.7 tools（简历改写 / 求职信 / 薪资 / 投递追踪 + 实现独有工具）

设计稿：`Claude design/s-tools.jsx`（ResumeStudio/CoverLetter/SalaryLab/Tracker）。offer-comparator/learning-roadmap/follow-up/industry-trend 为实现独有（无设计稿，仅盘点反馈，均完备）。

- **[中] 简历改写 before/after 缺红绿两列对照** — `diagnoses/[id]/diagnosis-detail.tsx:284-295`（设计 s-tools.jsx:363-366/90-96 ba-mini：before=danger-soft 红、after=success-soft 绿两列）— 改为红底/绿底两列对照块。
- **[中] 薪资页缺大数字 headline + 分布直方图** — `salary/page.tsx:2506-2519`（MarketBenchmark）（设计 s-tools.jsx:651-669：超大中位数 + ↑MoM + 直方图标出 peak 与『你』+ P25/50/75/90）— 页顶补 headline 卡，保留下方基准卡作细节。
- **[中] 投递 stat 磁贴缺 delta + 副文案** — `components/tracker/tracker-stats.tsx:33-89`（设计 s-tools.jsx:772-797：↑N / 本周+5家 / 本周DDL / 已签·字节）— 补 delta 与 extra 副文案行。
- **[中] 求职信缺『导出 PDF』** — `cover-letter/page.tsx:194-237`（设计 s-tools.jsx:540-544 三操作）— 补导出 PDF；不做则确认产品已砍该入口（做减法）。
- **[中] tools 家族主 CTA 配色不一致** — `salary/page.tsx:2449`、`applications/page.tsx:1082`、`resumes/page.tsx:118`（多用蓝）vs `learning-roadmap/page.tsx:464`、`diagnoses/campus/page.tsx:812`（用 ink）（设计 core.jsx:119-122 主 CTA=深 ink、brand 蓝留内容区强调）— 统一为深 ink 主按钮（或反向统一），消除不一致。与 G5 Button 变体配套。
- **[低] 投递看板卡缺阶段/渠道标签（海外/笔试/二面/已接）** — `components/tracker/application-card.tsx:116-135`（现仅『内推』）— 按数据补 tag 渲染。
- **[低] 求职信缺『强调亮点』chip 多选** — `cover-letter/page.tsx` 表单（设计 s-tools.jsx:576-584）— 保留则补 chip 多选；否则确认主动精简。
- **[保留] 各工具页 loading/pending/error/empty/insufficient/超时反馈（salary/offer-comparator/follow-up/industry-trend/learning-roadmap/resumes/cover-letter/applications/campus）/ 看板卡阶段切换乐观更新 / 复制『已复制』成功态** — 反馈是产品强项且诚实降级到位，勿退化。

---

## 4. 「保留实现」清单（比设计稿好，明确不改）

> 这些是实现优于静态设计稿的部分，对齐时**禁止为还原设计稿而退化**。

- **token 层**：globals.css 对 core.jsx surface/ink/line/brand/semantic/radius 数值复刻准确；侧边栏/导航同名变量还原到位。
- **全站反馈体验**（设计稿是静态稿，无这些）：各页 loading 骨架、按钮 pending（Loader2+禁用+文案切换）、错误条、空态（图标+标题+CTA）、数据不足诚实降级、超时提示。
- **诚实降级（红线一致）**：overview 全零空态双 CTA；overview/newspaper Coach 建议『暂无数据支撑』；interview 未分析空态 + 手动分析按钮、grade null 显『?』；newspaper 『仅校招』客户端过滤；overview 只渲染有真实数据的区块。
- **交互优于设计稿**：today 任务类型彩色 badge + 全完成庆祝条；chat 列表页（设计稿无）反馈完善；投递看板卡内阶段 select + 乐观更新；newspaper 卡 hover 边框+阴影；FunnelChart bar 过渡动画；SectionCard action 真实链接；复制『已复制』成功态。
- **login**（无设计稿，原创）：验证码校验、60s 重发倒计时、pending/禁用、新用户渐进披露、dev_code 自动填充提示。
- **digest**：写面经表单完整反馈、导入 RunNotice 诚实展示来源状态。

---

## 5. 实施分批建议（按文件互斥划分，便于多 agent 并行）

> 原则：同一文件不跨批；全局先行；admin/login 分支冲突项单列。批次内文件互斥，可并行派多 agent。

### 批次 0 — 全局基建（先行，阻塞后续，建议 1 agent 串行）
- G1 字体加载（root `layout.tsx` + `globals.css` + 删 landing 字体）
- G3 + F1 挂载 `<Toaster>`（`(main)/layout.tsx`）+ 建立 toast 规范
- G7 spin keyframes 收口到 `globals.css`
- G8/G9/G11 圆角/Card/Input token 对齐（`globals.css` + `components/ui/{card,input}.tsx`）
- **⚠ 冲突提示**：`(main)/layout.tsx`（G3 挂 Toaster、G12 nav 圆点、OV『导出周报』）与 `app/layout.tsx`（G1 字体）是 **admin 面板分支 / 登录分支也在动的文件**。批次 0 与 admin 分支合并时这两个 layout 必冲突，需人工合并；建议批次 0 优先合并或与 admin 分支协调先后。

### 批次 1 — 公共组件变体（依赖批次 0 的 token，组件文件互斥，可并行 3 agent）
- A：`components/ui/button.tsx`（G5 brand 变体 + size 对齐）
- B：`components/ui/badge.tsx`（G6 语义变体）
- C：`components/ui/tabs.tsx`（G10 active 统一 / SegmentedControl）

### 批次 2 — 语义色收口（G2，10 文件互斥，可并行多 agent；funnel-chart 合并漏斗逻辑）
- 每文件一个独立单元：salary / industry-trend / offer-comparator / overview / interview-prep / follow-up / learning-roadmap / cover-letter(_referral) / newspaper / **funnel-chart（同时做 OV 漏斗单色+百分比）**。
- 注意 §3.7 主 CTA 配色统一（salary/applications/resumes/learning-roadmap/campus）与 G5 配套，可并入对应文件单元。

### 批次 3 — 逐页结构/视觉（页文件互斥，可并行多 agent；纯前端不依赖后端）
- today（两栏重构 + 问候 + 任务卡『开始』+ 勾选失败 toast + hover）—`today/page.tsx`
- interview 列表（4 统计卡 + capture banner + 筛选 + 卡 chip/hover）—`debrief/page.tsx`+`interview-card.tsx`
- interview 详情（双列 + 录音播放器 + 盲点/趋势卡 + 预测CTA + 逐题操作 + 顶栏）—`debrief-detail.tsx`+`prediction-card.tsx`+`question-card.tsx`
- newspaper 封面区 + 空态/错误/loading —`newspaper/page.tsx`
- digest 切筛选 loading + 成功 toast —`digest/page.tsx`
- landing（EN + hover + IK 图标）—`landing/page.tsx`
- login 软跳 —`login/page.tsx`（**与 admin/login 分支冲突，单列协调**）
- tools 视觉（改写红绿对照 / 薪资 headline / 投递 stat 磁贴+卡标签 / 求职信导出）—`diagnosis-detail.tsx` / `salary/page.tsx` / `tracker-stats.tsx`+`application-card.tsx` / `cover-letter/page.tsx`

### 批次 4 — 架构补齐（前后端联动，需后端配合，单独排期，优先级随数据可得性）
- chat 富卡片系统（后端 `chat.service.ts` 产 rich_card + 前端 `message-bubble.tsx` 渲染 + 建议 chips）+ tool_used 回填
- overview hero quickstats / 趋势 / 薪资雷达 / 能力盘点（**依赖后端真实数据，无则不做，严禁编造**）
- today 右栏三卡 + streak（依赖后端聚合接口，无则空态）
- interview 横向洞察 / 趋势对比（依赖后端聚合，样本不足降级）

### 批次 5 — 锦上添花（低优先，可最后批量）
- G12 nav 圆点 8px、F3 各页骨架 shimmer、chat 日期分隔/富文本/快捷键提示、landing 图标细节、interview 预测阈值 85、chip 配色微调、newspaper 圆角。

---

### 统计
- **高**：18 条（G1/G2/G3；overview hero；today×4：两栏/问候/任务卡按钮/勾选失败；chat×2：富卡片/建议chips；interview×4：4统计卡/capture/详情双列/录音播放器；newspaper 封面区）
- **中**：38 条
- **低**：23 条
- **预估批次数**：6 批（批次 0–5）。批次 0 串行先行；批次 1/2/3 各可多 agent 并行（文件互斥）；批次 4 需后端联动单独排期；批次 5 收尾。
