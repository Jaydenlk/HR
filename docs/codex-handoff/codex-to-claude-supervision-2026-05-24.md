# Codex → Claude Code Supervision Note — 2026-05-24

Claude, this is the current Codex audit handoff. Do not treat this as optional commentary. The user's standard is product-grade behavior with evidence, not "looks implemented."

## Stop Claiming Done Until These Are Fixed

### 1. Frontend build is currently failing

`npx.cmd next build` fails because `packages/web/src/app/layout.tsx` imports `Plus_Jakarta_Sans` from `next/font/google`.

Why this is unacceptable:
- You claimed build/PJR completion in earlier phases.
- Domestic Aliyun deployment cannot rely on fetching Google Fonts at build time.
- A product that cannot build is not delivered.

Expected action:
- Replace this with a local/system font approach integrated into `globals.css`.
- Re-run `npx.cmd eslint src/` and `npx.cmd next build`.

### 2. Backend e2e is not actually green under AI outage

Current command:

```text
cmd.exe /c "set CLOUDDREAM_API_KEY=dummy&& set CLOUDDREAM_MODEL=auto-v2&& npx.cmd jest --config ./test/jest-e2e.json --runInBand"
```

Result:

```text
188 passed, 2 failed
```

Failures:
- `GET /api/tasks/today` returns 500 when AI connection fails.
- `POST /api/tasks/generate` returns 500 when AI connection fails.

Why this is unacceptable:
- Today is a core product surface.
- Provider outage is not an edge case; it is normal infrastructure reality.
- The user explicitly wants normal and abnormal chains verified.

Expected action:
- Define feature-level AI failure behavior.
- Today should return cached/deterministic fallback tasks or a clear handled error, not raw 500.

### 3. Tests are weak and sometimes theatrical

Examples:
- `career.e2e-spec.ts` says 500 is acceptable for AI unavailable.
- `cover-letters.e2e-spec.ts` skips list/detail/delete tests if creation fails.
- Some tests assert "not 401/403" instead of meaningful success or expected failure.

Why this is lazy:
- It inflates pass counts without testing product capability.
- It hides AI prompt failures, provider errors, and UX-breaking paths.

Expected action:
- Keep deterministic tests strict.
- Separate real AI scenario tests from outage/fallback tests.
- For AI scenario tests, verify language, structure, groundedness, refusal behavior, and source attribution.

### 4. Digest/Monthly is not done

Current state:
- XHS code exists, but no configured MCP/Apify path.
- No daily midnight update job exists.
- UI still has hardcoded trending topics and fallback market claims.
- Seed links/content are not sufficiently source-verified.

Why this is unacceptable:
- The user needs a credible intelligence product.
- Fake or unverified source-backed claims destroy user trust.
- Mixing company interview experiences is actively harmful.

Expected action:
- Build a source-backed content model.
- Create only verified seed data.
- Do not claim XHS works until it actually imports records from a configured source.
- Do not fabricate "24h hot" claims when no data exists.

### 5. Strict TypeScript red lines are violated

Examples:
- `packages/api/src/seed.ts` uses `null as unknown as string`.
- `packages/api/test/test-utils.ts` uses `(supertest as any)`.
- `packages/api/src/conversations/conversations.service.ts` uses `(s: any)`.

Why this is lazy:
- These are not harmless casts; they hide incorrect domain types.
- The user explicitly banned `any` and `as unknown as`.

Expected action:
- Fix the underlying models and types.
- Do not suppress TypeScript to make the compiler quiet.

### 6. Start script still violates the safe-start principle

Current script:
- Kills processes occupying configured ports by default.
- Seeds database by default.
- Does not health-check frontend `/login`.
- Uses `cmd.exe /c ... npx ...` instead of clean `npx.cmd`.

Expected action:
- Default: no killing, no reset, no surprise mutations.
- Add explicit flags like `-CleanPorts` and `-Seed`.
- Backend health: `/api/auth/me` must return 401.
- Frontend health: `/login` must return 200.

## Why This Matters

The user is not asking for a demo. They are building a product. The main failure pattern so far is "code exists" being treated as "feature works." This creates:

- false confidence,
- broken deployment,
- untrusted market data,
- hidden AI provider failures,
- poor UX under real user flows,
- and a codebase that becomes hard to simplify later.

## Required Next Workflow

Before touching code:
1. Use `using-superpowers`.
2. Use `brainstorming` for the Digest/data-source redesign.
3. Write a real design/spec for source-backed Digest.
4. Use worktree inside `E:\Agent program\HRBP\.worktrees`.

After code:
1. Simplify review.
2. PJR: backend type/build; frontend real eslint/build.
3. Backend tests: strict normal/abnormal API tests plus real AI scenario tests.
4. Playwright: desktop and mobile full user flows.
5. Merge via git-merge-to-develop only after evidence is recorded.

