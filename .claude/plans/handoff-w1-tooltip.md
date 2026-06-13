# Handoff: 第1批·线2 — tooltip 组件封装 + 诊断分数提示

## 状态: DONE (commit e8b6abc on feature/tooltip, 未 push)
## 工作目录: E:\Agent program\HRBP-wt\tooltip(分支 feature/tooltip,基于 dev @b24521d)
## 禁止触碰: career/page.tsx(留第2批用本批组件)、layout.tsx(留给线1点数同步,避免抢)、ai/**、后端

## 现状(侦察已查)
- `@base-ui/react` ^1.5.0 已装,自带 tooltip 子包(Root/Trigger/Positioner/Popup/Arrow),但 src 里完全没用起来——不需要新增依赖。
- 注意:packages/web 是 Next.js 魔改版(见 packages/web/AGENTS.md 警告 API 可能与训练数据不同)。**实现前必须先读 node_modules/@base-ui/react/tooltip 下的 .d.ts 确认真实接口**,不要凭记忆写。
- 能力盘点/诊断分数渲染落点:diagnosis-detail.tsx 的 ProfessionDimensionCard(109-209,分数徽章)与 DimensionRow(71-103,分数列)。

## 规格
1. 新建 `packages/web/src/components/ui/tooltip.tsx`:仿现有 `components/ui/dropdown-menu.tsx` 的封装风格,导出便捷 `<Tooltip content={...}>{children}</Tooltip>`。鼠标悬停延迟约 400-600ms 出现(用户要"停留一会"),纯 hover 触发,带基础样式(小气泡+箭头),自动处理无障碍属性。
2. 应用到诊断分数(本批落点):diagnosis-detail.tsx 的分数徽章/分数列加 tooltip,内容说明"这个分怎么来的/满分依据/怎么提分"(文案从该维度已有的 why/说明字段取,没有就给通用解释)。
3. **本批不碰 career/page.tsx**(career 的分数 tooltip 留第2批,但组件这批建好合入,第2批直接用)。**不碰 layout.tsx**(余额 tooltip 以后再说,避免和线1抢)。

## step→verify
1. pnpm install + 读 .d.ts 确认 @base-ui tooltip 接口 → verify: 贴接口签名
2. 建 tooltip.tsx → verify: tsc 0 错;最小用例渲染
3. 应用到 diagnosis-detail.tsx 分数 → verify: 本地起服真浏览器悬停截图(提示出现)
4. 门禁 → verify: web eslint 0 错 + tsc 0 错 + build;贴输出
5. commit feature/tooltip(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
零 mock、零 any;若 @base-ui 接口与预期不符以 .d.ts 为准;完成写回本文件
