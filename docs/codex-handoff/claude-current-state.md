# Claude Code — Current Project State

Last updated: 2026-05-24

## Git State

**Current branch:** `dev`

**All branches:**
- `main` — production baseline
- `dev` — current integration branch (all phases merged here)
- `feature/phase1-resume-studio` — Resume Studio (merged to dev)
- `feature/phase2-coach-chat` — Coach Chat (merged to dev)
- `feature/phase4-interview-debrief` — Interview Debrief (merged to dev)
- `feature/phase5-mock-interview` — Mock Interview (merged to dev)
- `feature/phase8-extras` — Salary/Cover Letter/Career Map/Digest (merged to dev)
- `feature/phase9-landing` — Landing Page (merged to dev)
- `fix/audit-hardening` — ESLint + validation + type safety fixes (merged to dev)
- `fix/complete-missing-features` — Feed pipeline + cross-module integration (merged to dev)
- `fix/complete-tests-and-plans` — 190 API tests + retroactive plans (merged to dev)
- `codex/product-hardening-audit` — Codex audit branch (active, ahead of dev)

## Completed Phases

### Phase 1: Resume Studio (简历馆 + AI 诊断)
Key commits: `e14cd16` through `d68b793`
- Backend: auth (invite code + JWT), files (upload + extraction), resumes (CRUD + versions), diagnosis (AI pipeline)
- Frontend: login, resume library, resume detail, diagnosis flow, diagnosis result
- AI: dual provider (CloudDreamAI + DeepSeek), structured JSON schema outputs
- **Verification level:** Highest. Had Simplify review, manual Playwright E2E (Opus subagent 40-step test), Jest e2e tests.

### Phase 2: Coach Chat (AI 对话)
Key commits: `e5b6f47` through `37d9478`
- Conversations module with AI chat service
- Chat list + detail pages
- Diagnosis-to-chat integration
- **Verification level:** Medium. Jest e2e tests exist. No Simplify review.

### Phase 3: Application Tracker (投递追踪)
Key commits: `2ad8edc` through `d2e992e`
- Applications module with stage transitions and stats
- Kanban board UI
- **Verification level:** Medium. Jest e2e tests exist. No Simplify review.

### Phase 4: Interview Debrief (面试复盘)
Key commits: `c5a379d` through `b17899a`
- Interviews module with AI debrief analysis
- List + detail + AI analysis UI
- **Verification level:** Medium. Jest e2e tests exist. No Simplify review.

### Phase 5: Mock Interview (模拟面试)
Key commits: `275e1ce` through `a53b7e0`
- Mock interview module — question generation + answer evaluation
- Session management + question/answer UI
- **Verification level:** Low. Jest e2e tests exist. Plan was written retroactively. No Simplify review.

### Phase 6: Daily Tasks (每日任务)
Key commit: `5e221fb`
- Today dashboard with task management
- **Verification level:** Low. Plan retroactive. No Simplify or E2E review.

### Phase 7: Overview (总览)
Key commits: `e0e001e` through `5e221fb`
- Aggregated dashboard stats
- Overview stats pages
- **Verification level:** Low. Plan retroactive. No Simplify or E2E review.

### Phase 8: Extras (薪资雷达 + 求职信 + 职业地图 + 月刊)
Key commits: `4072bd6` through `dbed45e`
- Cover letter generation, salary radar with 81 market data records, career map, digest page
- Feed content pipeline (GitHub import + RSS + AI digest)
- 40 curated feed items seeded
- **Verification level:** Low initially, improved after fixes. Multiple rendering bugs found and fixed. Digest page went through 7+ fix commits.

### Phase 9: Landing Page (营销首页)
Key commits: `0ded363` through `3590b43`
- Marketing homepage
- **Verification level:** Low. No E2E testing, no Simplify review.

## Bug Fix Commits (post-implementation)
- `1bacb80` — File upload fix (is_primary DTO Transform) + Chinese-only AI prompts
- `a533571` — GitHub + RSS importers actually returning data
- `8e8f463` — Career map requires resume (no more fake recommendations)
- `5c652e4` through `8b971f8` — Digest page rendering: 7 commits to fix invisible cards, broken scroll, dead buttons, hardcoded data
- `66b5ef4` — ESLint clean + salary validation + AI grounding + type safety
- `76e58f5` — 6 E2E bugs (chat context, PATCH response, sidebar nav, UX copy)

## Test Status

### Backend (Jest e2e): 190 tests — ACTUALLY RAN AND PASSED
Test suites covering:
- Auth (login, invite codes)
- Resumes (CRUD, versions, upload)
- Conversations (CRUD, AI chat)
- Interviews (CRUD, AI debrief)
- Mock Sessions (CRUD, question generation)
- Tasks (CRUD, daily tasks)
- Overview (stats aggregation)
- Cover Letters (generation)
- Career (recommendations)
- Applications (CRUD, stage transitions)
- Salary (market data, benchmarks)
- Feed (content pipeline)

**Caveat:** Some AI endpoint tests use lenient assertions (accept any HTTP status) rather than verifying AI output quality.

### Frontend (Playwright E2E): PARTIAL
- Phase 1: Opus subagent ran 40-step test covering login, upload, diagnosis flow
- Mobile testing: skipped entirely
- Phase 2-9: No systematic Playwright E2E testing

### Lint/Build:
- Backend `tsc --noEmit`: passed
- Backend `nest build`: passed
- Frontend `eslint src/`: had 7 errors initially, fixed in commits `66b5ef4` and `432c6a0`
- Frontend `next build`: was run, needs re-verification after latest fixes

## Known Issues

1. **Scroll bugs** — Multiple scroll-related fixes committed but user verification pending
2. **Dead buttons** — Removed in `8b971f8` but completeness not verified
3. **XHS (Xiaohongshu)** — Code exists but NOT CONFIGURED. Needs external API key (Apify) or local MCP server.
4. **RSS fallback** — RSS importer falls back to GitHub API due to RSSHub 403 errors
5. **Landing page hardcoded numbers** — Marketing stats on landing page are hardcoded (not from API)
6. **Digest "Vol. 24" / "248 收藏"** — Were hardcoded, fix committed but not verified
7. **Dynamic sidebar badges** — Fix committed (`f747f2a`) but not verified with real data
8. **File upload** — DTO Transform fix committed (`1bacb80`) but not re-verified end-to-end
9. **Mobile responsive** — No mobile testing done at all
10. **No production deployment** — Everything tested locally only (SQLite dev database)

## Working Directory State
- Untracked: `.claude/`, `.playwright-mcp/`, `Claude design/`, various screenshots, seed data files
- Modified: 0 tracked files with uncommitted changes
- Clean working tree (aside from untracked files)
