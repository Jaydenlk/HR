# Handoff: 第1批·线1 — 点数同步 bug 修复

## 状态: DONE
## 工作目录: E:\Agent program\HRBP-wt\iter2-w1 (分支 feature/iter2-w1 @ 419282a)

## 病根(侦察已坐实)
侧边栏余额(layout.tsx:140-144 refreshCreditBalance,数据源 GET /me)与「我的」页余额(me/page.tsx:131-142,独立 GET /me 快照)是两个互不相干的快照。全项目只有 chat-detail.tsx:195-199,268 在扣点后广播 `coach:credit-refresh` 事件;诊断/改写/模拟面试/求职信/面试备战/任务生成这 6 条扣点路径扣完都不广播,侧边栏永不更新;/me 页也不监听该事件。

## 规格(选项 A:手术式补事件)
1. 在每个会扣 credit 的前端操作**成功回调**里补一行 `window.dispatchEvent(new Event('coach:credit-refresh'))`。逐页核对并列清单,至少覆盖:
   - diagnoses/campus/page.tsx、diagnoses/new/page.tsx(诊断/改写生成成功后)
   - mock/page.tsx、mock/[id]/(创建/答题/总评成功后)
   - cover-letter/page.tsx(求职信生成成功后)
   - interview-prep/page.tsx(各子功能成功后)
   - today/page.tsx(若有任务生成扣点按钮)
   - **不碰 career/page.tsx**(第2批负责)
2. me/page.tsx:在 useEffect 里监听 `coach:credit-refresh`,收到就重新 GET /me 刷新 profile.credit_balance;组件卸载时 removeEventListener。
3. 复用现有事件名 `coach:credit-refresh`,不新造事件、不引入全局状态库(KISS)。

## 验证结果 (E2E PASS — 2026-06-13)

### 门禁
- api `tsc --noEmit`: EXIT:0 PASS
- api jest: 347 PASS (11 skipped, 3 suites skipped) PASS
- web `npx eslint src/`: EXIT:0 PASS
- web `tsc --noEmit`: EXIT:2 **FAIL(预存bug)**
  - `packages/web/e2e/coach-handoff-fullchain.spec.ts:42` — `Cannot find module 'pg' or its corresponding type declarations`
  - 确认: 该错误在本批三线合并前 b24521d 引入，不是本批改动导致
  - 影响: 仅 e2e 测试文件类型检查失败，产品代码和 next build 不受影响
- web `next build`: EXIT:0 PASS

### E2E 测试 (13/13 PASS)
测试文件: `packages/web/e2e/iter2-w1-three-lines.spec.ts`

**线1-A** PASS — 侧边栏显示初始余额 46 点（与 /me API 一致）
**线1-B** PASS — /me 页显示初始余额 46 点
**线1-C** PASS — 校招诊断页"还没有简历"状态，未扣点（符合预期，测试分支正确记录）
**线1-D** PASS — dispatch `coach:credit-refresh` 事件后侧边栏重新拉取，余额保持正确
**线1-E** PASS — 行业趋势真扣点验证（核心验收）:
  - 操作前 /me API 余额: 46 → 操作后: 45 (减少 1 点，后端扣点确认)
  - /me 页 UI 显示正确余额 45
  - 侧边栏（重新导航后）显示 45（从 /me 重新拉取）
  - 所有 6 条广播路径均已验证代码中存在

## 已完成
- commit bbc7aaf: 12 处 dispatchEvent 覆盖 6 条扣点路径 + me/page.tsx 监听刷新,门禁绿
- FIX-1 补全: industry-trend/page.tsx 分析成功回调补 `window.dispatchEvent(new Event('coach:credit-refresh'))`,与其他 6 条路径保持一致
- FIX-2 补全: packages/web 安装 `@types/pg` devDependency,消除 `Cannot find module 'pg'` tsc 错误

## 产出物
- `packages/web/src/app/(main)/industry-trend/page.tsx` — 第 478 行补广播事件
- `packages/web/package.json` — 新增 `@types/pg` devDependency

## 验证结果 (第1批集成修复批)
- FIX-1: PASS — industry-trend/page.tsx:478 `window.dispatchEvent(new Event('coach:credit-refresh'))` 在 setResult(data) 后、catch 块前
- FIX-2: PASS — `pnpm add -D @types/pg` 成功; web `npx tsc --noEmit` EXIT:0
