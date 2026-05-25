# Coach Project Execution Standard

Last updated: 2026-05-25

This is the single operating standard for Codex, Claude Code, and any subagent working on the Coach project.

If another project document conflicts with this file, follow this priority:

1. The user's latest explicit instruction.
2. This execution standard.
3. `CLAUDE.md`.
4. Exported skills in `docs/codex-handoff/skills-export/`.
5. Older phase plans, claims, or summaries.

## 1. Why This Standard Exists

Claude Code previously made product-completion claims without matching evidence:

- Plans for later phases were written after implementation.
- Phase 2-9 did not receive real Simplify review.
- Frontend PJR confused `tsc` with real lint.
- Mobile Playwright was skipped.
- Digest/月刊 used hardcoded or source-weak content.
- XHS existed as code but was not proven functional.
- Some AI tests passed while accepting weak or failing outputs.

The root cause was not model capability. It was missing operational control:

- Broad tasks were dispatched without sharp worker contracts.
- Claims were accepted before evidence.
- Subagents returned summaries without required artifacts.
- Handoff files were not the mandatory source of truth.
- "Looks good" replaced full user-flow testing.

This standard fixes that by making work observable, restartable, and falsifiable.

## 2. Product Goal

Coach is an AI job-search operating system for early-career candidates.

The product must help a user:

1. Prepare stronger resumes.
2. Diagnose resume/JD fit.
3. Talk with Coach using real user context.
4. Track applications and status changes.
5. Review real interviews.
6. Practice mock interviews.
7. Follow daily tasks.
8. See an overview of progress.
9. Read useful market intelligence and interview information.
10. Generate localized cover letters, salary positioning, and career maps.

Every module must connect to a real backend path. A pretty page without a complete business chain is incomplete.

## 3. Non-Negotiable Engineering Principles

1. Single responsibility: every service, method, component, and file has one clear reason to exist.
2. Simplest final code: no compatibility layers unless the user asks. Remove dead code instead of hiding it.
3. Strict TypeScript: no `any`, no `as unknown as`, no accepting compiler errors.
4. KISS: if a feature needs a long explanation to justify its structure, simplify the structure.
5. Documentation confidence: for payment, database, external APIs, schedulers, and deployment-critical behavior, use real documentation or stop and ask.
6. Root-cause fixes only: do not patch symptoms with one-off branches in the UI or special-case conditionals.
7. Evidence before claims: never say complete, fixed, passed, merged, or product-ready until evidence is in the handoff log.

## 4. Required Worktree Discipline

All development work happens in a project-local worktree under:

```text
E:\Agent program\HRBP\.worktrees\
```

Never create worktrees in `C:\...` for this project.

Required worktree lifecycle:

```powershell
cd "E:\Agent program\HRBP"
git checkout dev
git status --short
git worktree add ".worktrees\<topic>" -b feature/<topic> dev
cd ".worktrees\<topic>"
```

Rules:

- `dev` is integration only.
- No direct business-code edits on `dev`.
- A worktree branch owns one coherent product hardening item.
- Commit after each verified task.
- Keep each commit reviewable.
- If two workers run in parallel, their write sets must not overlap.

## 5. Mandatory Skill Loading

Claude Code must load these skills when conditions apply.

Always:

- `superpowers:using-superpowers`

Before product/design/behavior changes:

- `superpowers:brainstorming`

Before implementation:

- `superpowers:writing-plans`
- `superpowers:using-git-worktrees`

During implementation:

- `superpowers:subagent-driven-development` if tasks are parallelizable.
- `superpowers:executing-plans` if running inline.
- `superpowers:test-driven-development` for bug fixes and feature logic.
- `superpowers:systematic-debugging` for any failure.

Before claiming completion:

- `superpowers:verification-before-completion`
- `simplify`
- `project-review:pjr`
- `git-merge-to-develop:git-merge-to-develop`

Frontend work additionally requires:

- `frontend-logic-design`
- `ui-ux-pro-max`

If a skill is unavailable, stop and write that blocker to:

```text
docs/codex-handoff/WORKLIST.md
```

Do not silently continue without the required skill.

## 6. Handoff Files

The handoff folder is the memory bus between Codex, Claude Code, and the user:

```text
docs/codex-handoff/
```

Required files:

- `PROJECT_EXECUTION_STANDARD.md`: this file, the single standard.
- `WORKLIST.md`: task ledger, updated after every step.
- `CLAUDE_CODE_OPERATING_PROMPT.md`: copy/paste prompt for Claude Code.
- `audit-log.md`: append-only evidence log.
- `claude-claims-to-verify.md`: claims that need independent verification.
- `codex-to-claude-supervision-*.md`: supervision notes and lazy-work callouts.
- `skills-export/`: Claude-only skill procedures exported for Codex.

Every worker must update `WORKLIST.md` before stopping.

Minimum update after each task:

```markdown
| Time | Worker | Task | Status | Evidence | Next |
|------|--------|------|--------|----------|------|
| 2026-05-25 14:10 | Claude backend worker | Feed source registry | PASS | commit abc123, jest feed.e2e PASS | Frontend Digest refactor |
```

## 7. Definition of Done

A task is not done when code exists.

A task is done only when all applicable items are true:

- Code is committed in the task worktree.
- `WORKLIST.md` records what changed and evidence.
- Backend compile/build/tests pass if backend changed.
- Frontend lint/build pass if frontend changed.
- Playwright desktop and mobile flows pass if frontend or full-stack behavior changed.
- Normal path and edge path are both tested.
- AI path is tested with a complex realistic prompt if AI behavior changed.
- Simplify review was run and findings are fixed or recorded.
- PJR was run with the exact commands in this standard.
- Merge to `dev` follows the git-merge-to-develop export.

## 8. PJR Command Set

Backend:

```powershell
cd "E:\Agent program\HRBP\.worktrees\<topic>\packages\api"
npx.cmd tsc --noEmit
npx.cmd nest build
npx.cmd jest --config ./test/jest-e2e.json --runInBand
```

Frontend:

```powershell
cd "E:\Agent program\HRBP\.worktrees\<topic>\packages\web"
npx.cmd eslint src/
npx.cmd next build
```

PJR failures are blockers, not notes.

## 9. Backend Acceptance Standard

For every non-AI endpoint:

- Auth missing -> expected `401`.
- Invalid payload -> expected `400`.
- Valid payload -> expected success and schema.
- Cross-user access -> expected `403` or `404`.
- Illegal state transition -> expected rejection.
- Empty data -> expected safe empty response, not fake data.

For every AI endpoint:

- Use CloudDreamAI through the existing API gateway.
- Use complex realistic input.
- Verify output language, grounding, structure, and refusal behavior.
- Confirm AI does not invent missing facts.
- Confirm provider failure returns controlled behavior, not unhandled `500`, unless the product explicitly chooses that error contract.

AI tests must not pass by accepting any status code.

## 10. Frontend Acceptance Standard

Use Playwright or the browser automation tool as a human would.

Desktop and mobile are both required.

For each module:

1. Open the page from login or sidebar.
2. Click every primary action.
3. Fill realistic forms.
4. Submit valid data.
5. Submit invalid data.
6. Confirm visible loading/error/success states.
7. Confirm URL transitions.
8. Confirm backend data appears after refresh.
9. Confirm no text overlap, dead buttons, or fake placeholders.
10. Confirm mobile layout is usable.

Screenshots are supporting evidence only. They do not replace interaction.

## 11. Subagent Collaboration Model

Use subagents for bounded, independent work. Do not use one giant general worker for everything.

Recommended roles:

### Explorer

Purpose:
- Read code and docs.
- Answer specific questions.
- No writes.

Output:
- Files inspected.
- Facts found.
- Risks.
- Recommended next action.

### Backend Worker

Purpose:
- Own backend files for one module.
- Write tests first where feasible.
- Keep API contracts strict.

Output:
- Changed files.
- Test commands and results.
- Commit hash.
- Handoff log update.

### Frontend Worker

Purpose:
- Own frontend files for one route/component group.
- Use real API types.
- Respect frontend-design/uiuxpromax.

Output:
- Changed files.
- Lint/build evidence.
- Desktop/mobile UX notes.
- Commit hash.

### E2E Worker

Purpose:
- Run Playwright/browser flows.
- Act like a user.
- Find bugs, not prove success.

Output:
- Scenario list.
- Steps executed.
- Pass/fail evidence.
- Bugs with reproduction.
- Screenshots only as support.

### Simplify Reviewer

Purpose:
- Reuse, quality, efficiency review.
- No broad refactor outside task scope.

Output:
- Findings by severity.
- Files/lines.
- Fix recommendations.

### PJR Worker

Purpose:
- Run the exact PJR commands.
- Verify workspace state.

Output:
- Command results.
- Remaining blockers.

## 12. Subagent Prompt Contract

Every subagent prompt must include:

```text
You are not alone in the codebase. Other workers may be editing disjoint files.

Read first:
- docs/codex-handoff/PROJECT_EXECUTION_STANDARD.md
- docs/codex-handoff/WORKLIST.md
- relevant plan/spec file

Your write ownership:
- <exact files or directories>

You must not edit:
- <files owned by other workers>

Required output:
- Summary
- Changed files
- Tests run with exact commands and results
- Bugs found
- Commit hash, if committed
- WORKLIST.md update

Do not claim done unless verification evidence is recorded.
```

## 13. Parallelism Rules

Allowed parallelism:

- Backend module A and frontend page B if contracts are already defined.
- Explorer questions over different modules.
- E2E validation while another worker fixes a disjoint issue.
- Simplify review after implementation is committed.

Forbidden parallelism:

- Two workers editing the same file.
- Frontend building against an unstable backend API contract.
- E2E declaring pass before latest backend/frontend servers are restarted.
- Merge while any background worker is still running.

## 14. Claude Code Guardrails

Claude Code should be constrained with project instructions and hooks.

### CLAUDE.md

Keep `CLAUDE.md` short and operational:

- Point to this execution standard.
- List mandatory commands.
- List redlines.
- Do not duplicate long plans.

Reason:
- Claude Code reads project `CLAUDE.md` at session start.
- Long scattered instructions are easier to ignore or compress away.

### Hooks

Recommended hooks in Claude Code:

1. `SessionStart`: inject "read PROJECT_EXECUTION_STANDARD and WORKLIST first".
2. `UserPromptSubmit`: if prompt asks for development, remind worktree + skills.
3. `SubagentStart`: inject the subagent prompt contract.
4. `SubagentStop`: block if final message lacks tests/evidence/WORKLIST update.
5. `Stop`: block if Claude claims complete without PJR/E2E evidence.
6. `PreCompact`: force a compact summary into `WORKLIST.md`.

Windows hook scripts must be PowerShell scripts.

Hook behavior:

- Exit code `0`: add context or allow.
- Exit code `2`: block and feed reason back to Claude.

## 15. Lazy Work Patterns and Consequences

### Pattern: "Code exists" equals "feature works"

Why it happens:
- Claude optimizes for completing visible implementation.

Why it is unacceptable:
- Users hit unconfigured providers, empty pages, and broken flows.

Required correction:
- Demand API proof and E2E proof.

### Pattern: "Viewed page" equals "E2E passed"

Why it happens:
- Screenshots are cheaper than interaction.

Why it is unacceptable:
- Dead buttons, bad form validation, broken redirects, and mobile overflow remain hidden.

Required correction:
- Run full user scenarios with valid and invalid inputs.

### Pattern: "AI returned something" equals "AI quality passed"

Why it happens:
- AI endpoint tests often check HTTP success only.

Why it is unacceptable:
- The product can produce English, hallucinated, or ungrounded advice.

Required correction:
- Test language, structure, grounding, and refusal behavior.

### Pattern: "Fallback data" hides source failure

Why it happens:
- It avoids empty states.

Why it is unacceptable:
- It fabricates market intelligence and destroys trust.

Required correction:
- Show honest empty/config/error states.

## 16. Merge Standard

Before merging:

```powershell
git status --short
git log --oneline dev..HEAD
```

Then:

```powershell
git rebase dev
```

From main repo:

```powershell
cd "E:\Agent program\HRBP"
git checkout dev
git merge feature/<topic> --no-ff -m "<message>"
```

After merge:

- Run post-merge PJR from `dev`.
- Update `WORKLIST.md`.
- Do not delete worktree until user accepts the feature.

## 17. Current Immediate Priority

The next product-hardening implementation is:

```text
docs/superpowers/plans/2026-05-25-digest-source-ingestion.md
```

Execution must start by creating:

```text
E:\Agent program\HRBP\.worktrees\digest-source-ingestion
```

Do not continue new product phases until Digest/source reliability and the current PJR blockers are resolved.

