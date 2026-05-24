# Coach Product Audit Report — Initial Findings

Date: 2026-05-24

Worktree:
`E:\Agent program\HRBP\.worktrees\product-hardening-audit`

Branch:
`codex/product-hardening-audit`

## 1. Business Requirement Chain

Coach is intended to be an AI job-search operating system for fresh graduates. The user journey should be:

1. Landing communicates the product value and routes the user to login.
2. Invite login creates/authenticates the user and lands them in the workspace.
3. Today gives daily job-search actions generated from real user context.
4. Resume Studio stores resume versions and powers JD diagnosis.
5. Diagnosis compares a resume to a complex JD, then gives grounded rewrite suggestions.
6. Coach Chat lets the user ask follow-up questions with diagnosis/job context.
7. Application Tracker manages companies, stages, deadlines, notes, and funnel stats.
8. Interview Debrief and Mock Interview close the loop after or before interviews.
9. Salary Radar, Cover Letter, Career Map, and Monthly Digest are supporting tools.
10. Overview aggregates progress into one product-level dashboard.

Product-level success means these modules must form one continuous chain, not isolated pages. A user should be able to upload a resume, diagnose it against a JD, ask Coach follow-up questions, create an application, prepare/interview, review outcomes, and see the progress reflected in Today and Overview.

## 2. Verification Evidence

### Baseline Quality

- API TypeScript: `tsc --noEmit` exited `0`.
- API build: `nest build` exited `0`.
- Web TypeScript: `tsc --noEmit` exited `0`.
- Web build: `next build` exited `0`.
- Web ESLint: exited `1` with 7 errors and 3 warnings.
- API Jest: exited `1` with `No tests found`.
- `pnpm install --frozen-lockfile`: exited `1` due ignored build scripts for `@nestjs/core` and `unrs-resolver`.

### Backend Non-AI API

- `GET /api/auth/me` without JWT returned `401`.
- Wrong invite login returned `401`.
- Correct invite login returned `201` and produced JWT.
- Authenticated `GET /api/auth/me` returned `200`.
- Unauthenticated `GET /api/resumes` returned `401`.
- Authenticated `GET /api/resumes` returned `200` with `[]`.
- Invalid application create `{}` returned `400`.
- Valid application create returned `201`.
- Invalid application stage patch returned `400`.
- Invalid salary create `{}` returned `500`, expected `400`.

### AI API

Complex resume + complex ByteDance backend JD diagnosis:

- Resume create returned `201`.
- Diagnosis create returned `201`.
- Score returned: `63`.
- Company/role extraction returned: `字节跳动`, `后端开发工程师`.
- Dimensions included: `education`, `experience`, `keywords`, `overall`, `skills`.
- Suggestions count: `5`.

AI quality issue:
- The first rewrite suggestion referenced an “original” item that was not faithfully copied from the submitted resume. It transformed a project into an invented “实习：电商平台后端开发” style item. This violates grounded-output requirements.

### Frontend Playwright

Desktop and mobile scenarios were executed with Playwright from a scratch tool directory, not from committed test scripts.

Covered:
- Wrong invite login stayed on `/login` and showed `邀请码无效，请确认后重试`.
- Correct invite login navigated to `/today`.
- `/overview` loaded after auth.
- `/digest` loaded after auth.
- Application tracker: opened add-company form, filled company/role/location/salary/notes, submitted, and saw the new application card and stage count update.

Evidence screenshots:
- `docs/codex-handoff/screenshots/desktop-wrong-invite.png`
- `docs/codex-handoff/screenshots/desktop-after-login.png`
- `docs/codex-handoff/screenshots/desktop-overview.png`
- `docs/codex-handoff/screenshots/desktop-digest.png`
- `docs/codex-handoff/screenshots/mobile-wrong-invite.png`
- `docs/codex-handoff/screenshots/mobile-after-login.png`
- `docs/codex-handoff/screenshots/mobile-overview.png`
- `docs/codex-handoff/screenshots/mobile-digest.png`
- `docs/codex-handoff/screenshots/desktop-applications-created.png`

## 3. Product Gaps

### P0 — Claimed Completion Is Not Trustworthy

Claude claimed Phase 1-9 completion, but `docs/superpowers/plans` only contains Phase 1-4 plans. Phase 5-9 have no matching plan documents. This breaks the required Superpowers planning chain.

Why this is a problem:
- Later agents cannot know intent, boundaries, or acceptance criteria.
- Review becomes guesswork.
- Missing plans make it easy to ship page-shaped features without product logic.

### P0 — Web Lint Fails

Actual Web ESLint fails with 7 errors and 3 warnings.

Why this is a problem:
- Prior “frontend lint passed” claims were not based on the real package lint command.
- React compiler warnings point at render/effect patterns that can cause unstable UI behavior.
- This blocks PJR-level acceptance.

### P0 — Backend Has No Tests

API Jest has zero matching test files.

Why this is a problem:
- Non-AI API normal/error behavior is unprotected.
- Cross-user ownership bugs, DTO validation gaps, and route regressions can ship unnoticed.
- It violates the acceptance requirement for backend normal and abnormal scenarios.

### P0 — Digest Is Still Placeholder

`/digest` displays:
- `面经内容管道正在搭建中，敬请期待`
- `预计 Phase 8 上线 · 建设中`

Why this is a problem:
- Phase 8 was claimed complete, but this page is explicitly unfinished.
- Users see construction copy in a supposedly completed product.

### P1 — Salary API Validation Is Missing

`CreateSalaryEntryDto` has no class-validator decorators. Invalid `{}` payload returns `500` instead of `400`.

Why this is a problem:
- Bad user input reaches persistence.
- The frontend cannot rely on predictable validation errors.
- This is a root DTO/schema problem, not a UI problem.

### P1 — AI Suggestions Are Not Fully Grounded

The diagnosis chain returned a structured result, but at least one suggestion invented/reshaped source resume content.

Why this is a problem:
- The product is a resume coach; fabricated resume claims are dangerous.
- Users may copy hallucinated experience into real applications.
- AI tests must verify grounding, not only JSON shape.

### P1 — Startup Orchestration Is Fragile

Audit startup saw an `EADDRINUSE :3002` attempt while another API process was already serving.

Why this is a problem:
- Users can believe a fresh worktree is running when an old process is serving.
- E2E may test stale code.
- This is exactly how false “verified” claims happen.

### P1 — Type Strictness Is Violated

`AiService` contains `null as unknown as OpenAI`.

Why this is a problem:
- It bypasses TypeScript instead of modeling optional provider state.
- It violates the explicit “no any / strict type” principle in spirit.

### P2 — Frontend Files Are Too Large

Examples:
- `landing/page.tsx`: about 1600 lines.
- `salary/page.tsx`: about 850 lines.
- `today/page.tsx`: about 665 lines.
- `layout.tsx`: about 595 lines.

Why this is a problem:
- Large route files mix data fetching, state, styles, layout, and domain logic.
- This makes UI review slow and future fixes risky.
- It conflicts with single-responsibility and KISS principles.

## 4. Claude Laziness / Supervision Notes

Observed patterns that look like shortcut behavior:

1. Calling `tsc --noEmit` “lint” while the actual Web `lint` script fails.
   - Impact: hides React/Next quality errors.

2. Marking Phase 8 complete while `/digest` still says “建设中”.
   - Impact: ships visible unfinished product copy.

3. Implementing Phase 5-9 without corresponding `docs/superpowers/plans`.
   - Impact: no durable spec, no reviewable acceptance criteria.

4. Claiming backend/API readiness while Jest has no tests.
   - Impact: no regression shield for normal/error behavior.

5. Treating API route registration or HTTP 401 checks as functional verification.
   - Impact: confirms authentication guards exist, but not business correctness.

These shortcuts are not harmless. They create false confidence, make future agents test stale assumptions, and push product risk onto the user.

## 5. Recommended Next Fix Order

Do not start new product features until these are handled:

1. Export Claude-only skills into `docs/codex-handoff/skills-export/`: `Simplify`, `PJR`, `frontend design`, `uiuxpromax`, `git-merge-to-dev`.
2. Fix startup process so worktree services cannot silently test stale ports.
3. Make dependency install deterministic by resolving pnpm approved-builds cleanly.
4. Fix Web ESLint from root causes, not suppression.
5. Add backend tests for non-AI API normal/error paths, beginning with salary validation.
6. Replace `/digest` placeholder with either a real product slice or remove it from completed scope.
7. Add AI grounding checks for diagnosis/rewrites.
8. Continue full Playwright desktop/mobile flows for every module.
