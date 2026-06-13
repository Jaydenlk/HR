# Handoff: 第1批·线1 — 点数同步 bug 修复

## 状态: READY_FOR_IMPL
## 工作目录: E:\Agent program\HRBP-wt\credit-sync(分支 feature/credit-sync,基于 dev @b24521d)
## 禁止触碰: career/page.tsx(留第2批收口)、ai/**、credit 后端、其他 worktree

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

## step→verify
1. pnpm install → verify: web build 基线绿
2. 补 dispatchEvent 全清单 → verify: 列出"页面→操作→补点行号"清单
3. me/page.tsx 监听 → verify: 单测或本地——dispatch 事件后 /me 重新拉取
4. 门禁 → verify: web `npx eslint src/` 0 错 + `npx tsc --noEmit` 0 错 + build;贴输出
5. commit feature/credit-sync(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
零 mock、零 any;改动可追溯;完成写回本文件(隔离则工作目录副本+说明)
