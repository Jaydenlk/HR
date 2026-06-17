# Handoff: Coordinator → Implementer (前端:从最近更新生成按钮)

## 状态: READY_FOR_IMPL
## 任务: 在公告管理页加「✨ 从最近更新生成」按钮,调用 POST /admin/announcements/generate-from-changelog,成功后刷新列表并跳「草稿」tab 供审核。

## 工作目录(绝对路径)
`E:\Agent program\HRBP\.claude\worktrees\auto-changelog`
分支 `feat/auto-changelog`,node_modules 已 junction 链接,**不要 pnpm install / 不装依赖**。

## 只许改这些文件
1. `packages/web/src/app/(main)/admin/announcements/page.tsx`
2. `packages/web/src/lib/types.ts`(**仅 additive**——如需新增类型才加;本任务可能不需要改它,端点返回的就是现有 Announcement 形状,优先不改)

## 禁止触碰
- 后端 `packages/api/**`(另有 agent)
- 任何 `.env*`、其它 web 页面/组件、`layout.tsx`
- 现有的「AI 生成最近更新」按钮(粘贴模式)与 `runGenerate`/`regenerate` 逻辑——**保留不动**,这是用户明确要求「保留手动粘贴生成」

## 背景与已确认契约
后端新端点(另一 agent 同步实现,契约已锁定):
- `POST /api/admin/announcements/generate-from-changelog`,**无请求体**,JwtAuthGuard+AdminGuard
- 成功返回:一条 `Announcement`(status='draft' 的草稿,形状 = 现有 Announcement 接口)
- 失败:无可用更新日志时返 400(message「暂无可用的更新日志,无法生成公告」),AI 失败返 5xx

前端 `api` 客户端用法见文件顶部既有调用:`api.post<Announcement>(path, body)`(已用于现有 runGenerate)。

## 实现规格(照现有风格,最小改动)
现状(page.tsx):列表卡片头部已有两个按钮——`AI 生成最近更新`(primary,打开粘贴弹窗 setGenState)和 `新建公告`(neutral)。

要做的:在这两个按钮**之间或前面**,新增第三个按钮「✨ 从最近更新生成」。
- 它**不打开弹窗**,直接调用新端点(无需粘贴);
- 加一个独立的 loading state(如 `genFromChangelog` boolean),按钮在请求中禁用并显示「生成中…」(用现有 Loader2 spinner,与 runGenerate 一致);
- 成功:`setTab('draft')` + `await reload()`(与 runGenerate 收尾一致,新草稿落在草稿 tab);
- 失败:复用页面顶部的 `setError(...)`(现有 error 横幅),显示 err.message(后端 400 文案会透出);
- 用 Sparkles 图标(已 import)或现有图标,文案「从最近更新生成」。按钮样式用 `smallBtn('primary')` 或 `smallBtn('neutral')`(与既有视觉协调,自行择一,别引入新样式系统)。

新增异步函数(放在 runGenerate 附近),示意:
```
const [genFromChangelog, setGenFromChangelog] = useState(false);

async function runGenerateFromChangelog() {
  setGenFromChangelog(true);
  setError(null);
  try {
    await api.post<Announcement>('/admin/announcements/generate-from-changelog', {});
    setTab('draft');
    await reload();
  } catch (err) {
    setError(err instanceof Error ? err.message : '生成失败,请稍后重试');
  } finally {
    setGenFromChangelog(false);
  }
}
```
(请核对 `api.post` 的实际签名——若第二参可省略则省略 `{}`;先看文件里现有 api.post 调用确定。)

## 执行计划 (step→verify)
1. 加 state + runGenerateFromChangelog 函数 → verify: 函数调用 `/admin/announcements/generate-from-changelog`;`grep -n 'generate-from-changelog' page.tsx` 有输出
2. 加按钮,接到该函数,带 loading 禁用 → verify: 文件含「从最近更新生成」按钮文案 + onClick 绑定该函数 + disabled={genFromChangelog}
3. 保留旧「AI 生成最近更新」粘贴按钮与 runGenerate → verify: `grep -n 'setGenState\|runGenerate\b' page.tsx` 旧逻辑仍在
4. lint → verify: `node packages/web/node_modules/eslint/bin/eslint.js "packages/web/src/app/(main)/admin/announcements/page.tsx" --max-warnings=0` 退出码 0,0 错 0 警。贴原始输出尾部。
   (若上面单文件 lint 报配置问题,改跑全量:在 packages/web 下 `node node_modules/eslint/bin/eslint.js src --max-warnings=0`)
5. tsc → verify: `node packages/web/node_modules/typescript/bin/tsc -p packages/web/tsconfig.json --noEmit` 退出码 0。贴尾部。

## 产出物(完成后在本 handoff 追加)
- 改动文件清单(行号范围)
- 每步 verify 的 PASS/FAIL + 原始命令输出尾部
- 新按钮的位置与文案、新函数名

## 红线
- 不写 TODO/占位;每步做完立刻 verify
- 不顺手重构无关代码;不删/不改既有粘贴生成与重新生成逻辑
- types.ts 只许 additive(优先不改)
- 不新增依赖;严格类型无 any
- 遇瞬时 API 错误:已完成改动先 git commit 再退出
