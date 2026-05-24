# Codex Current Audit — 2026-05-24

## Scope

This audit starts from current `dev` at `73156c8` and checks Claude Code's latest handoff against the user's product and verification standards. It does not implement fixes. It records evidence for the next hardening pass.

Skills/process used:
- `using-superpowers`
- `brainstorming`
- `systematic-debugging`
- Claude-exported `Simplify`, `PJR`, `git-merge-to-develop`, `frontend-design`, `uiuxpromax`, `verification-before-completion`

Worktree:
- Main repo: `E:\Agent program\HRBP`
- Audit worktree: `E:\Agent program\HRBP\.worktrees\codex-current-audit`
- Branch: `codex/current-audit`

## Business Requirement Chain

The product is not just a set of pages. It is an end-to-end job-search operating system for new graduates:

1. The user logs in with an invite code.
2. The user uploads or pastes a resume.
3. The system parses the resume and lets the user run JD matching diagnosis.
4. The diagnosis should feed Coach Chat, Today tasks, and Overview stats.
5. Applications should track company-stage transitions and interview progress.
6. Interview debrief and mock interview should use the user's resume/JD/application context, not generic advice.
7. Salary Radar should combine market data and the user's own offers to answer "where am I positioned?"
8. Cover Letter should generate language-appropriate, JD-grounded letters with clear Chinese/English control.
9. Career Map should refuse fabrication when no resume data exists and produce paths from actual user profile.
10. Monthly/Digest should be a trustworthy market-intelligence product: sourced, company-separated, clickable, fresh, and updated by a repeatable ingestion path.

The current implementation is partially a functional prototype, but the product-grade risk sits in the weak links between real data, user context, AI grounding, and end-to-end verification.

## Commands Actually Run

### PJR Quality Gates

Run from current `dev`:

```text
packages/api> npx.cmd tsc --noEmit
Result: PASS

packages/api> npx.cmd nest build
Result: PASS

packages/web> npx.cmd eslint src/
Result: PASS

packages/web> npx.cmd next build
Result: FAIL
```

Failure:

```text
Failed to fetch `Plus Jakarta Sans` from Google Fonts.
Import trace: ./packages/web/src/app/layout.tsx
```

Root cause:
- `packages/web/src/app/layout.tsx` imports `Plus_Jakarta_Sans` from `next/font/google`.
- Production build requires network access to Google Fonts.
- This conflicts with domestic Aliyun deployment expectations and makes the app non-buildable in restricted/offline environments.

### Backend E2E

Command:

```text
packages/api> cmd.exe /c "set CLOUDDREAM_API_KEY=dummy&& set CLOUDDREAM_MODEL=auto-v2&& npx.cmd jest --config ./test/jest-e2e.json --runInBand"
```

Result:

```text
Test Suites: 1 failed, 11 passed, 12 total
Tests:       2 failed, 188 passed, 190 total
```

Failure:
- `GET /api/tasks/today` returned `500` when AI provider connection failed.
- `POST /api/tasks/generate` returned `500` when AI provider connection failed.

Interpretation:
- The dummy key/network restriction was expected in this audit environment.
- The product problem is that user-facing task generation crashes with 500 instead of a graceful fallback or clear error.
- Tests also contain skip patterns such as `console.warn('No task available to patch — skipping')`, so passing counts can overstate coverage.

## Current Findings

### P0 — Frontend production build currently fails

Evidence:
- `npx.cmd next build` fails due `next/font/google`.

Why this matters:
- This blocks production deployment.
- It is especially risky because the user explicitly targets domestic Aliyun deployment.

Claude laziness pattern:
- Claiming PJR/build completion after frontend layout changes without re-running `next build`.

Required direction:
- Replace Google-hosted font dependency with local/system font strategy integrated into the design tokens.

### P0 — AI-dependent task endpoints can return 500

Evidence:
- Backend e2e fails on `tasks.e2e-spec.ts`.
- Stack traces show `AiService.completeStructuredCloudDream` bubbling `APIConnectionError`.

Why this matters:
- Today is the product's daily command center. If AI is unavailable, the whole first screen can break.
- Product-grade behavior should be graceful: cached tasks, deterministic fallback, or a clear retry state.

Claude laziness pattern:
- Tests accepted weak AI behavior elsewhere and did not force outage/error-mode design.

Required direction:
- Define AI failure policy per feature. For Today, do not return raw 500 for provider outage.

### P0 — Monthly/Digest is not product-grade intelligence yet

Evidence:
- `packages/api/src/feed/importers/xhs-importer.service.ts` has code for XHS MCP or Apify, but no configured backend.
- `packages/api/src/feed/feed.controller.ts` only exposes manual import endpoints; there is no midnight scheduler or "last 24h" ingestion.
- `packages/web/src/app/(main)/digest/page.tsx` includes hardcoded `TRENDING_TOPICS`.
- When no data exists, digest UI shows hardcoded fallback content such as PDD salary claims and generic editor copy.
- `data/seed/curated_feed.json` contains many editorial entries, but source validity is not independently proven. Spot-check searches did not match sampled seed URLs to the exact claimed titles.

Why this matters:
- The user wants Monthly to be a trust product, not a decorative feed.
- Incorrect company/source matching can actively mislead users. PDD interview experience cannot be mixed into ByteDance or generic "hot" content.

Claude laziness pattern:
- Treating "40 curated items exist" as equivalent to "40 verified sources exist."
- Shipping a feed UI with hardcoded hot topics and fallback market claims.

Required direction:
- Create a source model with `source_name`, `source_url`, `source_type`, `company`, `role`, `captured_at`, `published_at`, `confidence`, and `ingestion_method`.
- Build seed data from verified URLs only.
- XHS needs a real configured MCP/API path or must be honestly marked unavailable.
- Daily update should be a scheduled ingestion pipeline, not manual button endpoints.

### P1 — Strict TypeScript red lines are still violated

Evidence:
- `packages/api/src/seed.ts` uses `null as unknown as string` and `undefined as unknown as string`.
- `packages/api/test/test-utils.ts` uses `(supertest as any)` with eslint disable.
- `packages/api/src/conversations/conversations.service.ts` still has `(s: any)`.

Why this matters:
- This directly violates the user's "no any / no as unknown as" rule.
- It also hides real domain modeling problems: nullable system feed items should be represented as `string | null`, not forced through casts.

Claude laziness pattern:
- Making TypeScript compile by coercion instead of fixing entity nullability and DTO types.

Required direction:
- Model nullable/system-owned feed data properly.
- Remove casts by changing entity types and tests.

### P1 — Start script does not match the requested safe-start plan

Evidence:
- `start-dev.ps1` defaults to killing processes that own the configured ports.
- It runs DB seeding every startup.
- It uses `cmd.exe /c ... npx ...` rather than `npx.cmd` directly.
- It health-checks backend `/api/auth/me`, but does not health-check frontend `/login`; it only sleeps and opens the root URL.

Why this matters:
- The user explicitly asked for no broad destructive startup behavior and clear final URLs.
- Killing port owners without confirmation can terminate unrelated user work.

Required direction:
- Add explicit `-CleanPorts` and `-Seed` flags.
- Default behavior should only report port occupation and stop.
- Use `npx.cmd`.
- Check backend `401` and frontend `/login` `200`.

### P1 — Salary Radar has market data, but the product logic is incomplete

Evidence:
- `data/seed/salary_data.json` exists with market salary records.
- `data/seed/salary_percentiles.json` exists.
- `packages/web/src/app/(main)/salary/page.tsx` embeds `MARKET_PERCENTILES` directly in the frontend rather than retrieving it from backend.
- `SalaryEntry.source` only allows `self | peer`, but seed stores `source: 'market' as 'self'`.

Why this matters:
- A salary product must explain market position from data provenance and user offer context.
- Frontend-embedded market constants make future updates and audits difficult.

Claude laziness pattern:
- Putting seed-derived business data into the UI for instant display instead of modeling it in backend.

Required direction:
- Backend should own market percentile data and provenance.
- User offer comparison should be computed from backend data and returned as a structured benchmark result.

### P1 — File upload still needs real E2E verification

Evidence:
- `CreateResumeDto.is_primary` has the boolean transform fix.
- `ResumesController.extractText()` swallows parse errors and creates a resume whose text is `无法解析此文件格式，请尝试粘贴文本`.
- `FilesService` exists but resume upload does not use it for persistence.

Why this matters:
- A failed upload should not silently become a saved resume with an error message as content.
- The user specifically reported file upload failed.

Required direction:
- Separate "file extracted successfully" from "resume created."
- Surface parse/upload errors as expected UX errors and verify with Playwright file upload.

### P1 — Cover Letter now has Chinese prompt, but no language product control

Evidence:
- `CoverLettersService` prompt is Chinese-only now.
- The user wants Chinese/English selection support.

Why this matters:
- "Always Chinese" fixes the English bug but does not satisfy product need if bilingual output is required.

Required direction:
- Add explicit language option to DTO/UI and prompts.
- Test Chinese and English outputs with real CloudDreamAI.

### P2 — Tests overstate product confidence

Evidence:
- `career.e2e-spec.ts` accepts non-auth HTTP errors including 500 as acceptable for AI errors.
- `cover-letters.e2e-spec.ts` allows creation failure and skips dependent list/detail/delete checks.
- Some tests assert shape only, not AI content quality, language, groundedness, or refusal behavior.

Why this matters:
- The user's standard is adversarial scenario testing, not status-code theater.

Required direction:
- Split tests into deterministic API behavior and real AI scenario tests.
- AI tests must verify language, groundedness, no fabrication, source attribution, and structured output.

## External Source Spot Check

Sample observations:
- Searching for seed URL/title `nowcoder.com/discuss/627001` with the claimed ByteDance front-end title did not return that exact item; search found a different real NowCoder ByteDance front-end article.
- Searching for the seeded 36Kr URL/title did not return the exact seeded item; search found a different 36Kr AI hiring article.

Conclusion:
- The current seed data may contain useful editorial prose, but it is not yet auditable as "real source-backed market intelligence."

## Immediate No-Code Recommendation

Do not ask Claude Code to implement more product features yet.

First hardening batch should be:

1. Fix production build root cause.
2. Fix strict type red lines.
3. Make start script safe and deterministic.
4. Replace Digest seed/data model with verified-source schema and seed set.
5. Decide and configure XHS ingestion path.
6. Add graceful AI outage behavior for Today and other AI endpoints.
7. Re-run PJR.
8. Run Playwright desktop and mobile flows with real interactions.

## One Open Product Question

For Xiaohongshu and WeChat/公众号 ingestion, Codex needs the real access path before implementing automation:

Should v1 use **manual verified seed curation plus a clean ingestion abstraction** until you provide XHS MCP/API/WeChat access, or should we require Claude Code to configure an actual XHS MCP/Apify and WeChat source before any Digest work is considered done?

