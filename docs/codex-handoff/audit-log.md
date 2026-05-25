# Codex Audit Log

## 2026-05-24 Initial Takeover

Worktree:
`E:\Agent program\HRBP\.worktrees\product-hardening-audit`

Branch:
`codex/product-hardening-audit`

## Skill Status

- Installed and available on disk: `using-superpowers` and related Superpowers skills from `obra/superpowers`.
- Not available to Codex yet: `Simplify`, `PJR`, `frontend design`, `uiuxpromax`, custom `git-merge-to-dev`.
- Action required from Claude Code: export those Claude-only skill rules into `docs/codex-handoff/skills-export/`.

## Secret Handling

- User provided secret source path: `E:\Agent program\PrismV3\.env`.
- Codex inspected variable names only, not values.
- Secrets must be injected into runtime processes only.
- Secrets must not be committed, copied into this repo, printed in logs, or written into handoff docs.
- Relevant available variable names include `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL_ID`, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `JWT_SECRET`, and `INITIAL_INVITE_CODE`.

## Baseline Commands Run

- API TypeScript: `packages/api/node_modules/.bin/tsc.CMD --noEmit`
  - Result: exit 0.
- API build: `packages/api/node_modules/.bin/nest.CMD build`
  - Result: exit 0.
- Web TypeScript: `packages/web/node_modules/.bin/tsc.CMD --noEmit`
  - Result: exit 0.
- Web build: `packages/web/node_modules/.bin/next.CMD build`
  - Result: exit 0, with workspace-root warning due multiple lock/workspace files.
- Web ESLint: `packages/web/node_modules/.bin/eslint.CMD src --ext ts,tsx`
  - Result: exit 1, 7 errors and 3 warnings.
- API Jest: `packages/api/node_modules/.bin/jest.CMD --runInBand`
  - Result: exit 1, no tests found.
- Dependency install: `corepack.cmd pnpm install --frozen-lockfile`
  - Result: exit 1, ignored build scripts for `@nestjs/core` and `unrs-resolver`.

## Early Findings

- Phase plans only exist for Phase 1-4. Phase 5-9 were implemented/claimed without matching Superpowers plan docs.
- `packages/web/src/app/(main)/digest/page.tsx` still contains visible “建设中 / 敬请期待” copy despite Phase 8 being marked complete.
- Web lint failure contradicts prior “frontend lint passed” claims if lint means the actual package script.
- API test suite has zero tests, so backend normal/error/API boundary behavior has not been automated.
- Several frontend route files are very large, including `landing/page.tsx` at roughly 1600 lines and `salary/page.tsx` at roughly 850 lines. This is a maintainability/SRP risk.
- `AiService` uses `null as unknown as OpenAI` for optional DeepSeek fallback, violating the strict typing principle.

## Next Audit Steps

- Start API and Web from the project-local worktree using runtime-only env injection from `E:\Agent program\PrismV3\.env`.
- Verify API health: `/api/auth/me` should return 401 without JWT.
- Use Browser/Playwright-style interaction to test desktop and mobile user flows.
- Produce a structured audit report before implementing product fixes.

## Runtime Health Check

- API/Web were started from the project-local worktree with runtime-only env injection.
- `GET http://localhost:3002/api/auth/me` returned `401`, which is expected for missing JWT.
- `GET http://localhost:3001/login` returned `200`.
- No secret values were written to repo files or handoff docs.
- Startup had an additional failed attempt with `EADDRINUSE :3002`; later health checks show an API process was already serving. Startup orchestration needs cleanup before product handoff.

## Backend API Smoke Results

- Bad invite login: `POST /api/auth/login` returned `401`.
- Good invite login: `POST /api/auth/login` returned `201` and a token was present.
- Authenticated profile: `GET /api/auth/me` returned `200`.
- Unauthenticated resumes list: `GET /api/resumes` returned `401`.
- Authenticated resumes list: `GET /api/resumes` returned `200` with `[]`.
- Invalid application create `{}`: `POST /api/applications` returned `400`.
- Valid application create returned `201`, stage `wishlist`.
- Invalid application stage patch returned `400`.
- Invalid salary create `{}` returned `500`, not expected `400`.

Backend finding:
- `CreateSalaryEntryDto` has no class-validator decorators, so invalid payloads reach persistence instead of being rejected by `ValidationPipe`.

## Playwright UI Smoke Results

Tooling:
- The in-app browser could navigate and inspect pages, but its input channel failed with `Browser Use virtual clipboard is not installed`.
- Codex installed Playwright into its own scratch directory, outside the HRBP repo, and used it for direct browser interaction.

Desktop and mobile scenarios run:
- Wrong invite login: stayed on `/login` and displayed “邀请码无效，请确认后重试”.
- Correct invite login: navigated to `/today`.
- Overview navigation: `/overview` loaded.
- Digest navigation: `/digest` loaded but visibly says “面经内容管道正在搭建中，敬请期待” and “预计 Phase 8 上线 · 建设中”.

Screenshots:
- `docs/codex-handoff/screenshots/desktop-wrong-invite.png`
- `docs/codex-handoff/screenshots/desktop-after-login.png`
- `docs/codex-handoff/screenshots/desktop-overview.png`
- `docs/codex-handoff/screenshots/desktop-digest.png`
- `docs/codex-handoff/screenshots/mobile-wrong-invite.png`
- `docs/codex-handoff/screenshots/mobile-after-login.png`
- `docs/codex-handoff/screenshots/mobile-overview.png`
- `docs/codex-handoff/screenshots/mobile-digest.png`
# 2026-05-24 Codex Current Audit Addendum

Context:
- Created project-local worktree `E:\Agent program\HRBP\.worktrees\codex-current-audit`.
- Branch: `codex/current-audit`.
- Audited current `dev` at `73156c8`.

Commands:
- `packages/api> npx.cmd tsc --noEmit` → PASS.
- `packages/api> npx.cmd nest build` → PASS.
- `packages/web> npx.cmd eslint src/` → PASS.
- `packages/web> npx.cmd next build` → FAIL. Root cause: `next/font/google` fetches `Plus Jakarta Sans` from Google Fonts during build.
- `packages/api> cmd.exe /c "set CLOUDDREAM_API_KEY=dummy&& set CLOUDDREAM_MODEL=auto-v2&& npx.cmd jest --config ./test/jest-e2e.json --runInBand"` → FAIL. 188/190 passed; `tasks.e2e-spec.ts` has two AI-outage failures returning 500.

Audit conclusions:
- Current product cannot pass PJR because frontend production build fails.
- Backend tests exist, but AI-related tests still have weak assertions/skips.
- Digest/XHS is code-only until a real MCP/Apify path is configured and verified.
- Seed data exists but needs source verification; sample external searches did not confirm exact seed URL/title pairs.
- Strict TypeScript rules are still violated by `as unknown as` and `any`.
- Start script still does not match the safe-start plan.

New files:
- `docs/codex-handoff/codex-current-audit-2026-05-24.md`
- `docs/codex-handoff/codex-to-claude-supervision-2026-05-24.md`

# 2026-05-25 Digest Source Ingestion Design

User confirmed that real source configuration must be completed; manual seed-only Digest is not acceptable as final.

Codex wrote the design spec:
- `docs/superpowers/specs/2026-05-25-digest-source-ingestion-design.md`

Key design decisions:
- Xiaohongshu must use a configured `xiaohongshu-mcp` or Apify path before being marked done.
- NowCoder should use RSSHub/self-hosted RSSHub, and failed RSS must not silently become unrelated fallback data.
- WeChat/media sources must be a configured source registry; manual verified items are allowed only with real URL/source/capture metadata.
- Digest needs `feed_sources`, richer `feed_items`, and `digest_runs`.
- Frontend must not show fake hot topics or fake fallback cards when no verified source data exists.
