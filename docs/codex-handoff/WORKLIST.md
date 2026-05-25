# Coach Worklist

This is the live task ledger for Codex, Claude Code, and all subagents.

Every worker must update this file before stopping. If context is lost, resume from the first unchecked item.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done with evidence
- `[!]` Blocked or failed

## Current Branches and Worktrees

| Purpose | Branch | Worktree | Status |
|---------|--------|----------|--------|
| Codex audit and standards | `codex/current-audit` | `E:\Agent program\HRBP\.worktrees\codex-current-audit` | `[~]` active docs/audit worktree |
| Digest source ingestion implementation | `feature/digest-source-ingestion` | `E:\Agent program\HRBP\.worktrees\digest-source-ingestion` | `[~]` active |

## Global Checklist

- [x] Install Superpowers for Codex.
- [x] Create Codex audit worktree inside project.
- [x] Audit current `dev` claims and quality gaps.
- [x] Write current audit report.
- [x] Write Digest source-backed design spec.
- [x] Write Digest source ingestion implementation plan.
- [x] Write project execution standard.
- [x] Write Claude Code operating prompt.
- [x] Write Chinese Claude Code operating prompt.
- [ ] Implement Digest source ingestion in dedicated worktree.
- [ ] Run Simplify review for Digest.
- [ ] Run PJR for Digest.
- [ ] Run desktop Playwright Digest E2E.
- [ ] Run mobile Playwright Digest E2E.
- [ ] Merge Digest hardening to `dev`.
- [ ] Re-run full product audit after merge.

## Active Task: Digest Source Ingestion

Plan:

```text
docs/superpowers/plans/2026-05-25-digest-source-ingestion.md
```

### Execution Steps

- [x] Create worktree `.worktrees\digest-source-ingestion` from `codex/current-audit` (`dev` + Codex docs).
- [x] Commit `digest-implementation-log.md` skeleton.
- [x] Remove remote Google Font dependency and verify frontend build.
- [x] Add strict feed source/domain model.
- [x] Add source registry and query DTOs.
- [x] Refactor importers into source candidate adapters.
- [x] Add ingestion orchestrator, CloudDreamAI classifier, and daily schedule.
- [ ] Refactor Digest frontend around real API data.
- [ ] Run backend quality gate and API acceptance.
- [ ] Run frontend desktop E2E.
- [ ] Run frontend mobile E2E.
- [ ] Run Simplify.
- [ ] Run PJR.
- [ ] Merge to `dev`.

## Blockers

| Date | Blocker | Owner | Resolution |
|------|---------|-------|------------|
| 2026-05-25 | Frontend `next build` fails because `next/font/google` fetches Google Fonts. | Digest implementation worker | Remove remote font dependency. |
| 2026-05-25 | XHS source code exists but source path has not been proven with a real configured endpoint. | Digest backend worker | Verify configured MCP response shape before claiming done. |
| 2026-05-25 | Today AI outage tests returned `500` in prior audit. | Backend hardening worker | Root-cause fix or record explicit product error contract. |

## Evidence Ledger

| Time | Worker | Task | Status | Evidence | Next |
|------|--------|------|--------|----------|------|
| 2026-05-25 | Codex | Current audit | `[x]` | `codex-current-audit-2026-05-24.md`, commit `4334a75` | Digest design |
| 2026-05-25 | Codex | Digest source design | `[x]` | `docs/superpowers/specs/2026-05-25-digest-source-ingestion-design.md`, commit `19adc88` | Digest plan |
| 2026-05-25 | Codex | Digest implementation plan | `[x]` | `docs/superpowers/plans/2026-05-25-digest-source-ingestion.md`, commit `1473c30` | Execution standard |
| 2026-05-25 | Codex | Collaboration standard | `[x]` | `PROJECT_EXECUTION_STANDARD.md`, `CLAUDE_CODE_OPERATING_PROMPT.md` | User chooses execution path |
| 2026-05-25 | Codex | Chinese Claude prompt | `[x]` | `CLAUDE_CODE_OPERATING_PROMPT.zh-CN.md` | Create implementation worktree |
| 2026-05-25 | Codex | Create Digest implementation worktree | `[x]` | `E:\Agent program\HRBP\.worktrees\digest-source-ingestion`, branch `feature/digest-source-ingestion` | Commit implementation log |
| 2026-05-25 | Codex | Remove remote Google Font dependency | `[x]` | `npx.cmd eslint src/` PASS; `npx.cmd next build` PASS; `rg next/font/google` no matches | Commit font fix |
| 2026-05-25 | Codex | Add feed source/domain model | `[x]` | `npx.cmd tsc --noEmit` PASS; `npx.cmd nest build` PASS | Commit backend model |
| 2026-05-25 | Codex | Add source registry and feed filters | `[x]` | `npx.cmd tsc --noEmit` PASS; `npx.cmd nest build` PASS; Feed E2E 20/20 PASS | Commit source registry |
| 2026-05-25 | Codex | Refactor feed importers into adapters | `[x]` | no fallback/importFrom matches; `tsc` PASS; `nest build` PASS; Feed E2E 20/20 PASS | Commit importer adapter refactor |
| 2026-05-25 | Codex | Add ingestion orchestrator, CloudDreamAI classifier, and daily schedule | `[x]` | `tsc` PASS; `nest build` PASS; classifier unit tests 3/3 PASS; Feed E2E 23/23 PASS | Commit ingestion pipeline |

## Claude Code Compliance Audit Items

Use this when supervising Claude:

- [ ] Did Claude load required skills before acting?
- [ ] Did Claude create/use a project-local worktree?
- [ ] Did Claude declare exact file ownership before subagents started?
- [ ] Did every subagent update `WORKLIST.md`?
- [ ] Did every "done" claim include commit hash and test evidence?
- [ ] Did Claude avoid fake fallback content?
- [ ] Did Claude run real frontend lint, not `tsc` mislabeled as lint?
- [ ] Did Claude run desktop and mobile Playwright interaction flows?
- [ ] Did Claude test normal and edge cases?
- [ ] Did Claude stop when documentation/source confidence was insufficient?

## Copyable Status Summary

For the user to paste into Claude Code:

```text
Codex says: Read docs/codex-handoff/PROJECT_EXECUTION_STANDARD.md and docs/codex-handoff/WORKLIST.md before doing anything. Continue from the first unchecked item. Do not claim completion without updating WORKLIST.md with evidence.
```

中文版本：

```text
Codex 说：先读 docs/codex-handoff/PROJECT_EXECUTION_STANDARD.md 和 docs/codex-handoff/WORKLIST.md，再做任何事。从第一个未勾选项继续。没有把证据写入 WORKLIST.md，不允许声称完成。
```
