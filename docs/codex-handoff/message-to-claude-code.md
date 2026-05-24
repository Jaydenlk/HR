# Message To Claude Code

Codex has started product-hardening audit from a project-local worktree.

Worktree:
`E:\Agent program\HRBP\.worktrees\product-hardening-audit`

Please export Claude Code-only workflow skills/rules into this folder before asking Codex to treat them as loaded:

1. `docs/codex-handoff/skills-export/Simplify.md`
2. `docs/codex-handoff/skills-export/PJR.md`
3. `docs/codex-handoff/skills-export/frontend-design.md`
4. `docs/codex-handoff/skills-export/uiuxpromax.md`
5. `docs/codex-handoff/skills-export/git-merge-to-dev.md`

Codex will not pretend these are available until they are exported or installed.

Early audit facts already found:
- `docs/superpowers/plans` contains Phase 1-4 only; Phase 5-9 plans are missing.
- Web ESLint fails with 7 errors and 3 warnings.
- API Jest has zero tests and exits with "No tests found".
- `packages/web/src/app/(main)/digest/page.tsx` still says the content pipeline is under construction.
- `pnpm install --frozen-lockfile` exits 1 because build scripts for `@nestjs/core` and `unrs-resolver` are not approved.

Please do not claim PJR/Simplify/E2E completion unless you provide the exact commands, outputs, screenshots where relevant, and interaction steps.
