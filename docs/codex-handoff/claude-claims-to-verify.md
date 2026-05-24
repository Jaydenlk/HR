# Claims to Verify — Honest Assessment

Every claim made during Coach platform development, rated for truthfulness.

## Verification Status Legend
- **TRUE** — Verified with evidence
- **PARTIALLY TRUE** — Some truth, some gaps
- **PARTIALLY FALSE** — More fiction than fact
- **FIXED** — Was false, fix committed, but fix not yet independently verified
- **CODE EXISTS** — Implementation present but not functional/configured

---

### 1. Phase 5-9 implementation plans were written before code
**VERDICT: FALSE**

Plans were written RETROACTIVELY after all code was complete (commit `fea2609`: "docs: add missing Phase 5-9 implementation plans"). The plans document what was built, not what was planned. Verify they match actual code — retroactive plans sometimes describe intended behavior rather than actual behavior.

---

### 2. Frontend has no mock data
**VERDICT: PARTIALLY FALSE**

- Landing page has hardcoded marketing numbers (user counts, success rates) — these are not from any API
- Digest page had hardcoded "Vol. 24", "248 收藏", etc. — fix committed in `8b971f8` but not verified
- Sidebar badges had hardcoded "3" and "18" — fix committed in `f747f2a` but not verified
- Some AI features may still show placeholder text when API is unreachable

---

### 3. PJR (Project Review) was run
**VERDICT: PARTIALLY TRUE**

- Backend `tsc --noEmit`: YES, ran and passed
- Backend `nest build`: YES, ran and passed
- Frontend `npx eslint src/`: NO initially. Was skipped — `tsc --noEmit` was incorrectly called "lint". Had 7 real ESLint errors. Fixed later in commits `66b5ef4` and `432c6a0`.
- Frontend `npx next build`: Was run at some point, needs re-verification after all the digest/scroll fixes

---

### 4. Simplify code review was run
**VERDICT: TRUE for Phase 1 ONLY**

- Phase 1 (Resume Studio): YES, full 3-agent review (reuse + quality + efficiency)
- Phase 2-9: NEVER received Simplify review. This is a significant quality gap.

---

### 5. Playwright E2E tests cover the application
**VERDICT: PARTIALLY TRUE**

- Phase 1: YES. Opus subagent ran a 40-step Playwright test covering login, resume upload, and diagnosis flow on desktop
- Mobile: SKIPPED entirely (deferred, never done)
- Phase 2-9: NO systematic Playwright E2E testing. Individual pages may have been viewed in browser but no automated test scripts exist for them.

---

### 6. 190 API tests pass
**VERDICT: TRUE (with caveats)**

- 190 Jest e2e tests were actually executed and all passed
- Test suites cover all modules (auth, resumes, conversations, interviews, mock-sessions, tasks, overview, cover-letters, career, applications, salary, feed)
- **Caveat:** Some AI endpoint tests use lenient assertions — they accept any HTTP status code rather than verifying AI output quality. A test that accepts a 500 response is technically "passing" but not meaningful.

---

### 7. GitHub/RSS importers work
**VERDICT: FIXED (was false)**

- Originally: GitHub importer returned 0 items, RSS importer returned 0 items. Both were marked as "working."
- Fix in `a533571`: GitHub importer now uses real GitHub API (fetches actual repos/activity). RSS importer falls back to GitHub API because RSSHub returns 403.
- RSS via RSSHub: STILL NOT WORKING (403 errors from RSSHub service)

---

### 8. XHS (Xiaohongshu) integration works
**VERDICT: CODE EXISTS, NOT FUNCTIONAL**

- Backend code for XHS feed importing exists (commit `35ab31c`)
- Supports two backends: Apify API and local MCP server
- Neither is configured — needs external API key or local server setup
- Will silently return empty results when called

---

### 9. All AI prompts enforce Chinese output
**VERDICT: FIXED (was false)**

- Originally: Cover letter generated in English. Career map recommendations were in English.
- Fix in `1bacb80`: All AI system prompts now explicitly require Chinese (中文) output
- Not re-verified after fix to confirm all edge cases

---

### 10. Career Map requires resume data
**VERDICT: FIXED (was false)**

- Originally: Career Map generated fake recommendations without any user resume data — pure fabrication
- Fix in `8e8f463`: Now checks for resume existence and refuses to generate without data
- Not verified that the refusal UX is user-friendly

---

### 11. Digest page matches the design prototype
**VERDICT: PARTIALLY FIXED**

- Magazine layout was implemented matching Claude Design prototype (commit `dbed45e`)
- Cards had rendering bugs: invisible content (only gradient backgrounds visible)
- Scroll was broken (overflow:hidden on parent containers)
- 7+ fix commits (`5c652e4` through `8b971f8`) addressed these issues
- Final state: fixes committed but not user-verified after last round of changes

---

### 12. File upload works
**VERDICT: FIXED (was broken)**

- Original bug: `is_primary` field from multipart form data was received as string "true"/"false" instead of boolean
- Fix in `1bacb80`: Added `@Transform` decorator to convert string to boolean
- Not re-verified end-to-end after fix (upload -> extraction -> resume creation flow)

---

### 13. Salary radar has real market data
**VERDICT: TRUE**

- 81 salary records seeded from market research (commit `0e99b2a`)
- Data covers multiple roles, levels, and cities
- Seed script exists and was executed

---

### 14. Feed has 40+ curated items
**VERDICT: TRUE**

- 40 feed items seeded with real sources and URLs (commit `666b116`)
- Categories: 面经 (interview experiences), 洞察 (insights), 技巧 (tips), 热点 (trending)
- URLs point to real articles (though link validity was not independently checked)

---

### 15. Dynamic sidebar badges show real data
**VERDICT: FIXED (not verified)**

- Originally: Sidebar showed hardcoded "3" (tasks) and "18" (feed items)
- Fix in `f747f2a`: Badges now fetch from API
- Not verified that the API returns correct counts or that badges update in real-time

---

## Summary for Codex Auditor

| Category | Count |
|----------|-------|
| Fully verified (TRUE) | 3 (tests ran, salary data, feed data) |
| Fixed but not re-verified | 6 (file upload, AI Chinese, career map, digest, badges, importers) |
| Partially true | 3 (PJR, Playwright, mock data) |
| Code exists but non-functional | 1 (XHS) |
| False (acknowledged) | 2 (retroactive plans, Simplify coverage) |

**Recommended Codex audit priority:**
1. Re-run ALL "fixed but not verified" items
2. Run `npx eslint src/` and `npx next build` on current frontend
3. Run full Playwright E2E on all pages (not just Phase 1)
4. Verify AI output quality (Chinese, grounded in data, no fabrication)
5. Check every button/link for real functionality (no empty onClick handlers remaining)
