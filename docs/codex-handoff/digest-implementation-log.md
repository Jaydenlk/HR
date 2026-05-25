# Digest Source Ingestion Implementation Log

## Scope

Replace hardcoded Digest content with verified source-backed ingestion, classification, and UI.

## Rules

- No fake fallback content.
- No source relabeling.
- No company mixing.
- All AI calls use CloudDreamAI through existing `AiService`.
- Every implementation step records verification evidence here.
- Frontend acceptance requires desktop and mobile Playwright/browser user flows.
- Backend acceptance requires normal and abnormal API cases.

## Progress

- [x] Worktree created: `E:\Agent program\HRBP\.worktrees\digest-source-ingestion`.
- [x] Remote Google Font dependency removed from frontend root layout.
- [x] Backend feed source and digest run model implemented.
- [x] Source registry and feed filters implemented.
- [x] RSS/XHS importers refactored into candidate adapters.
- [ ] Ingestion implemented.
- [ ] Frontend Digest refactored.
- [ ] PJR passed.
- [ ] Desktop Playwright E2E passed.
- [ ] Mobile Playwright E2E passed.

## Evidence

| Time | Step | Evidence | Result |
|------|------|----------|--------|
| 2026-05-25 | Create implementation worktree | `git worktree add ".worktrees\digest-source-ingestion" -b feature/digest-source-ingestion codex/current-audit` | Worktree created |
| 2026-05-25 | Baseline web build after dependency setup | `npx.cmd next build` | PASS, but emitted worktree nested-root warning |
| 2026-05-25 | Remove remote font dependency | Removed `next/font/google` and `Plus_Jakarta_Sans`; `rg "next/font/google|Plus_Jakarta_Sans" packages/web/src` returned no matches | PASS |
| 2026-05-25 | Frontend lint | `packages/web> npx.cmd eslint src/` | PASS |
| 2026-05-25 | Frontend build | `packages/web> npx.cmd next build` | PASS, with non-blocking nested worktree root warning |
| 2026-05-25 | Backend feed source model | Added `FeedSource`, `DigestRun`, strict feed type unions, and new source metadata fields on `FeedItem` | PASS |
| 2026-05-25 | Backend compile | `packages/api> npx.cmd tsc --noEmit` | PASS |
| 2026-05-25 | Backend build | `packages/api> npx.cmd nest build` | PASS |
| 2026-05-25 | Source registry | Added `data/sources/digest_sources.json`, `SourceRegistryService`, `/api/feed/sources`, and feed filters | PASS |
| 2026-05-25 | Plan adjustment | Deferred `POST /feed/import` and `/feed/runs` to Task 5 so they can be backed by real ingestion/run records instead of a fake no-op endpoint | ACCEPTED |
| 2026-05-25 | Feed E2E | `packages/api> npx.cmd jest --config ./test/jest-e2e.json --runInBand --testPathPatterns=feed.e2e-spec.ts` | PASS, 20 tests |
| 2026-05-25 | Jest environment root cause | Fixed `uuid` mapper from pnpm-internal path to package-local `node_modules/uuid/dist-node/index.js` | PASS |
| 2026-05-25 | SQLite entity root cause | Added explicit `varchar` column types for nullable FeedItem string fields | PASS |
| 2026-05-25 | Importer adapter refactor | Replaced RSS/XHS direct DB writers with `FeedImporter.fetch()` candidate adapters; removed dead GitHub importer | PASS |
| 2026-05-25 | No fake fallback scan | `rg "FALLBACK|static fallback|GitHub fallback|importFromRSS|importFromXhs|importFromGitHub" packages/api/src/feed` | PASS, no matches |
| 2026-05-25 | Adapter compile/build/E2E | `npx.cmd tsc --noEmit`; `npx.cmd nest build`; Feed E2E 20/20 | PASS |
