# XHS Ingestion Stability Log

Date: 2026-05-25
Worker: Codex
Branch: codex/xhs-ingestion-stability
Worktree: E:\Agent program\HRBP\.worktrees\xhs-ingestion-stability

## Scope

Fix the two stability issues reported after the XHS bridge was introduced:

1. `.tools/xhs-bridge.mjs` must survive RedNote/Playwright crashes with timeout and retry behavior.
2. `FeedIngestionService` must not leave a source run stuck in `running` or block the whole ingestion when one source hangs or fails.

No product features were added.

## Root Cause

- The bridge script lived under `.tools/`, which was fully ignored by git. A worker could claim the bridge was written, but the script was not reproducible from the repository.
- The bridge called `tools.initialize()` and `tools.searchNotes()` without a timeout wrapper. A Playwright/browser hang could leave the HTTP request waiting indefinitely or crash the bridge process.
- `FeedIngestionService.import()` processed sources sequentially. `importSource()` caught rejected promises, but it did not protect against a source importer that never resolves. A hanging XHS importer could prevent Nowcoder/WeChat from running and leave the Digest run visible as `running`.
- `XhsImporterService` had a fetch timeout, but no retry. A single transient bridge failure immediately failed the source.

## Fix

- Updated `.gitignore` to track only `.tools/xhs-bridge.mjs` while keeping `.tools/rednote-mcp/` and other local tool artifacts ignored.
- Added `.tools/xhs-bridge.mjs` as a versioned bridge script.
- Bridge behavior now includes:
  - initialization timeout,
  - search timeout,
  - configurable retry count,
  - health endpoint with `last_error`,
  - no `process.exit(1)` on initialization failure,
  - graceful `503` response when unavailable.
- `XhsImporterService` now retries transient bridge failures before failing the source.
- `FeedIngestionService` now wraps each source import and each AI classification with a configurable timeout. A timed-out source is recorded as `failed`, and the next source continues.
- Added regression tests for both failure modes.

## Tests

Commands run from `E:\Agent program\HRBP\.worktrees\xhs-ingestion-stability`:

```powershell
cd packages\api
npx.cmd jest --config ./test/jest-e2e.json test/feed.e2e-spec.ts test/feed-ingestion-stability.e2e-spec.ts test/xhs-importer-stability.e2e-spec.ts --runInBand
npx.cmd tsc --noEmit
npx.cmd nest build
cd ..\..
node --check .tools\xhs-bridge.mjs
```

Results:

- Feed + stability tests: 3 suites passed, 25 tests passed.
- TypeScript: passed.
- Nest build: passed.
- Bridge syntax check: passed.

## Remaining Notes

- This fixes failure isolation and bridge process behavior. It does not guarantee RedNote scraping itself is reliable; RedNote/Playwright can still fail externally, but failures now degrade to explicit `failed` runs instead of hanging ingestion.
- Full browser E2E for Digest import should be run after Claude finishes the product usability hardening branch, because current user-facing product still has login/Today issues being handled separately.
