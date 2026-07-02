# T1 · 导航四模块重组 + 删页

## 目标
侧边栏整栏按「面试前 / 面试中 / 面试后 / 其他」四模块重组;删除学习路线、行业趋势、跟进消息三个独立页(跟进能力后续并入 T5 投递详情页);Offer 比对保留。

## 现状坐标(侦察已核实,2026-07-02)
- 导航定义:`packages/web/src/app/(main)/layout.tsx` — `buildMainNav()`(L59-72,主导航4项)、`buildToolNav()`(L74-108,工具区 6 常驻+7 折叠,`showMore` 状态 L744-795)、运营分组(L802-894,admin 可见)、最近对话(L896-965)、问 Coach CTA(L548-577)。
- 删除对象页面:`(main)/learning-roadmap/`、`(main)/industry-trend/`、`(main)/follow-up/`。
- 删除对象后端:`packages/api/src/learning-roadmap/`、`packages/api/src/industry-trend/`(均无 entities,无数据迁移负担)。**follow-up 后端模块保留**(T5 复用),只删前端独立页。
- 已知连带:`industry-trend` 内含 `industry-bocha.service.ts`(随模块一起删,T6 会建统一博查服务);`follow-up/page.tsx` L249-251 有过时 TODO(随页面一起消失)。

## 设计定稿(用户已确认的四模块映射)

```
面试前   简历馆 /resumes · 校招诊断 /diagnoses/campus · 求职信 /cover-letter
         机会中心 /opportunities · 投递追踪 /applications
面试中   面试备战 /interview-prep · 模拟面试 /mock · 面试录音上传(直达 debrief 上传流程)
面试后   面试复盘 /debrief · Offer比对 /offer-comparator · 薪资雷达 /salary
其他     今天 /today · 月刊·面经 /newspaper · 求职总览 /overview · 职业地图 /career
```
- 问 Coach 保持顶部 CTA;运营分组、最近对话原样保留。
- 「面试录音上传」导航项指向 debrief 的上传入口(允许用 query 参数触发上传弹层,如 `/debrief?upload=1`;具体机制 implementer 按 debrief 页现状定,验收标准=从导航一键到达上传流程)。
- 徽标行为迁移:面试复盘 badge(面试数)、投递追踪 badge(投递数)、今天 dot 保留在新结构对应项上。
- 四模块均常驻展开(现有 13 项砍到 15 项分四组,信息量可控),`showMore` 折叠机制删除;若视觉过长,允许每组标题可折叠但**默认全展开**。
- 职业维基条目此时**不加**(T3 上线时再加进「其他」,不留空壳入口)。
- 移动端 gate 现状不动。

## 改动清单
1. `packages/web/src/app/(main)/layout.tsx`:重写导航构建(四模块结构替换 buildMainNav/buildToolNav)。
2. 删除目录:`packages/web/src/app/(main)/learning-roadmap/`、`(main)/industry-trend/`、`(main)/follow-up/`。
3. 删除后端模块:`packages/api/src/learning-roadmap/`、`packages/api/src/industry-trend/`;从 `app.module.ts` 移除注册;全仓 grep 清理对这两模块的引用(credit 配置、计费枚举、admin 面板、类型定义)。
4. 全仓 grep 三个被删路由(`/learning-roadmap`、`/industry-trend`、`/follow-up`)的跳转引用(today 页、overview 页、chat handoff-card、公告等),逐个删除或改指向。**审计校准(audit m9)已点名的硬编码位**:`chat.service.ts:59` 系统 prompt「站内能力地图」里的两个被删路由、`me/page.tsx:32-33`、`nav-hints.ts:21/25`——验收 grep 范围必须覆盖**后端 AI prompt 文件**,不能只搜前端跳转代码(否则 AI 会继续给用户推荐已删除的页面)。

## 派工方案

**编排:一条 dynamic workflow** — stage1: A 实现(串行)→ stage2: B(Playwright)与 C(审计)+残留 grep 检查**并行扇出** → stage3: 汇总判定。

**Agent A(implementer,Sonnet,worktree)** — 一次交齐,prompt:
```
任务:按 docs/refactor2/T1-nav-cleanup.md「设计定稿+改动清单」执行导航重组与删页。
输入:该文档全文;packages/web/src/app/(main)/layout.tsx;被删三页目录;packages/api/src/{learning-roadmap,industry-trend}。
禁止触碰:其余页面的业务逻辑、后端 follow-up 模块、移动端 gate、任何 AI 服务代码。
交付:worktree 分支 feat/t1-nav;逐条改动对应文档条目编号。
验证(全部附原始输出):
1. npx eslint src/ 0 错误(packages/web);
2. 前后端 build 通过;
3. cd packages/api && npx jest 全量回归(删模块不许打破现有测试);
4. 全仓 grep 三个被删路由 0 引用残留、两个被删后端模块 0 import 残留。
```

**Agent B(test-agent,Sonnet)** — Playwright 验收,prompt 要点:登录后走查四模块全部 15 个导航项逐一点击可达、页面正常渲染;三个被删路由直接访问返回 404;badge/dot 行为正常;问 Coach、运营分组、最近对话正常。产出:通过清单+失败截图。

**Agent C(reviewer,Sonnet,只读)** — 审计:对照文档逐条查改动溯源;重点找茬:残留引用、误删、layout.tsx 里被顺手改掉的无关逻辑。

## step→verify
1. 导航重组完成 → verify: Playwright 四模块 15 项全部可达
2. 三页三模块删除 → verify: 路由 404 + grep 0 残留 + jest 全量绿
3. 引用清理 → verify: 全站点击流无死链(Playwright 控制台无 404 请求)
4. 质量门 → verify: eslint 0 错 + build 双端过 + reviewer 无 blocking

## 红线
- follow-up 后端模块(`packages/api/src/follow-up/`)不许删——T5 要用。
- 删页造成的"跟进消息暂不可用"窗口期是用户已接受的决策,不许为此保留独立页。
