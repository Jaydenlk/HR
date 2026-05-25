# Claude Code 中文交接 Prompt

把下面整段复制给 Claude Code：

```text
你正在 Codex 监督下继续 Coach 项目。

在做任何事情之前：
1. 加载 superpowers:using-superpowers。
2. 阅读 docs/codex-handoff/PROJECT_EXECUTION_STANDARD.md。
3. 阅读 docs/codex-handoff/WORKLIST.md。
4. 阅读第一个未完成任务对应的 spec/plan。

当前最高优先级：
- 执行 docs/superpowers/plans/2026-05-25-digest-source-ingestion.md。

硬性规则：
- 所有开发必须在项目内 worktree 执行：E:\Agent program\HRBP\.worktrees\。
- 不允许直接在 dev 上改业务代码。
- 不允许把 worktree 建到 C:\。
- 没有把证据写入 WORKLIST.md，就不允许声称完成。
- 不允许假 fallback 内容。
- 不允许把来源重新贴标签，例如 GitHub 冒充牛客。
- 不允许用 any / unknown cast 绕过 TypeScript。
- 不允许跳过移动端 E2E。
- 不允许把 tsc 叫做 lint；前端 lint 是 npx.cmd eslint src/。

必需执行流：
1. 使用 superpowers:using-git-worktrees。
2. 使用 superpowers:executing-plans 或 superpowers:subagent-driven-development。
3. 如果使用 subagent，每个 subagent 必须有明确文件所有权，并且必须更新 WORKLIST.md。
4. 前端改动必须使用 frontend-logic-design 和 ui-ux-pro-max。
5. 遇到任何失败必须使用 systematic-debugging。
6. 任何成功声明前必须使用 verification-before-completion。
7. 实现后运行 Simplify。
8. 严格运行 PJR：
   - packages/api: npx.cmd tsc --noEmit
   - packages/api: npx.cmd nest build
   - packages/api: npx.cmd jest --config ./test/jest-e2e.json --runInBand
   - packages/web: npx.cmd eslint src/
   - packages/web: npx.cmd next build
9. 使用 Playwright 跑桌面端和移动端完整用户流程 E2E。
10. 只能通过 git-merge-to-develop 合并回 dev。

Subagent 合同：
- 每个 subagent prompt 必须包含：
  - “你不是独自在代码库里工作”
  - 它可以编辑的精确文件/目录
  - 它禁止编辑的精确文件/目录
  - 必须运行的测试
  - 必须更新 WORKLIST.md
  - 最终输出必须包含：改动文件、测试命令与结果、commit hash、blocker

如果你不能加载必需 skill、不能验证来源、或者不能运行必需测试：
- 停止。
- 把 blocker 写入 docs/codex-handoff/WORKLIST.md。
- 明确告诉用户缺少什么。

Codex 只按证据判断，不按自信程度判断。
```

