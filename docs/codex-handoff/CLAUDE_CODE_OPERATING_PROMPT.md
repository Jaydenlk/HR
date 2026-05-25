# Claude Code Operating Prompt

Paste this into Claude Code when asking it to continue Coach work.

```text
You are continuing the Coach project under Codex supervision.

Before doing anything:
1. Load superpowers:using-superpowers.
2. Read docs/codex-handoff/PROJECT_EXECUTION_STANDARD.md.
3. Read docs/codex-handoff/WORKLIST.md.
4. Read the relevant spec/plan for the first unchecked item.

Current priority:
- Implement docs/superpowers/plans/2026-05-25-digest-source-ingestion.md.

Hard rules:
- Work in a project-local worktree under E:\Agent program\HRBP\.worktrees\.
- Do not edit dev directly.
- Do not create worktrees in C:\.
- Do not claim done unless evidence is recorded in WORKLIST.md.
- Do not use fake fallback content.
- Do not relabel sources.
- Do not use any/unknown casts to bypass TypeScript.
- Do not skip frontend mobile E2E.
- Do not call tsc "lint"; frontend lint is npx.cmd eslint src/.

Required execution flow:
1. Use superpowers:using-git-worktrees.
2. Use superpowers:executing-plans or superpowers:subagent-driven-development.
3. If using subagents, each subagent must have exact file ownership and must update WORKLIST.md.
4. Use frontend-logic-design and ui-ux-pro-max for frontend changes.
5. Use systematic-debugging for any failure.
6. Use verification-before-completion before any success claim.
7. Run Simplify after implementation.
8. Run PJR exactly:
   - packages/api: npx.cmd tsc --noEmit
   - packages/api: npx.cmd nest build
   - packages/api: npx.cmd jest --config ./test/jest-e2e.json --runInBand
   - packages/web: npx.cmd eslint src/
   - packages/web: npx.cmd next build
9. Run desktop and mobile Playwright user-flow E2E.
10. Merge to dev only through git-merge-to-develop.

Subagent contract:
- Every subagent prompt must include:
  - "You are not alone in the codebase."
  - exact files/directories it may edit
  - exact files/directories it must not edit
  - required tests
  - required WORKLIST.md update
  - required final output: changed files, tests run, commit hash, blockers

If you cannot load a required skill, cannot verify a source, or cannot run a required test:
- Stop.
- Write the blocker to docs/codex-handoff/WORKLIST.md.
- Tell the user exactly what is missing.

Codex will judge claims by evidence, not by confidence.
```

## Recommended Subagent Fan-Out for Digest

Use this only after the implementation worktree exists.

### Agent 1: Backend Feed Model

Ownership:

```text
packages/api/src/feed/types/
packages/api/src/feed/entities/
packages/api/src/feed/dto/
packages/api/src/feed/feed.module.ts
```

Do not edit:

```text
packages/web/
packages/api/src/feed/importers/
```

Required evidence:

```powershell
cd packages/api
npx.cmd tsc --noEmit
```

### Agent 2: Backend Ingestion

Ownership:

```text
packages/api/src/feed/importers/
packages/api/src/feed/feed-ingestion.service.ts
packages/api/src/feed/feed-classifier.service.ts
packages/api/src/feed/source-registry.service.ts
packages/api/src/feed/digest-generator.service.ts
packages/api/src/feed/feed.controller.ts
packages/api/src/feed/feed.service.ts
packages/api/test/feed.e2e-spec.ts
```

Do not edit:

```text
packages/web/
packages/api/src/feed/entities/
```

Required evidence:

```powershell
cd packages/api
npx.cmd tsc --noEmit
npx.cmd jest --config ./test/jest-e2e.json --runInBand --testPathPattern=feed.e2e-spec.ts
```

### Agent 3: Frontend Digest

Ownership:

```text
packages/web/src/app/layout.tsx
packages/web/src/app/globals.css
packages/web/src/lib/types.ts
packages/web/src/app/(main)/digest/
```

Do not edit:

```text
packages/api/
```

Required evidence:

```powershell
cd packages/web
npx.cmd eslint src/
npx.cmd next build
```

### Agent 4: E2E Acceptance

Ownership:

```text
docs/codex-handoff/digest-implementation-log.md
docs/codex-handoff/screenshots/
```

Do not edit:

```text
packages/api/
packages/web/
```

Required evidence:

- Desktop login -> Digest -> import -> filter -> source link -> UGC post.
- Mobile login -> Digest -> import -> filter -> source link -> UGC post.
- Edge cases: empty source, failed import, empty form, invalid input.

### Agent 5: Simplify/PJR Reviewer

Ownership:

```text
docs/codex-handoff/digest-implementation-log.md
docs/codex-handoff/WORKLIST.md
```

Do not edit implementation files unless explicitly asked after findings are accepted.

Required evidence:

- Simplify findings.
- Backend PJR commands.
- Frontend PJR commands.
- Git status.

## Claude Laziness Report Template

Use this when Claude claims completion without evidence.

```markdown
## Claude Compliance Finding

Claim:
- <what Claude claimed>

Evidence checked:
- <files, commands, screenshots, logs>

Verdict:
- TRUE / PARTIAL / FALSE

Why this looks like shortcutting:
- <specific pattern>

Why it is unacceptable:
- <product/user consequence>

Required correction:
- <exact next action>
```

