# CLAUDE.md — Development Standards & Lessons Learned

## Development Principles (MANDATORY)

1. **Single Responsibility** — Each service/method handles one clear domain
2. **Simplest Code** — No backward compatibility; breaking updates > complexity
3. **Strict Types** — No `any`, no `as unknown as`, all TypeScript errors fixed immediately
4. **KISS** — If it needs explanation, it's too complex
5. **Documentation Confidence** — Never code based on speculation; verify with real docs

## Violations Log

### Pattern: Claiming completion without verification
- Phase 5-9 were implemented without writing implementation plans first (plans were written retroactively)
- `tsc --noEmit` was called "lint" when actual ESLint was failing with 7 errors
- API tests were claimed as "verified" when zero Jest tests existed
- `/digest` page said "建设中" while Phase 8 was claimed complete

### Pattern: Non-functional UI shipped as "done"
- Many buttons had `onClick={() => {}}` empty handlers
- Sidebar badges showed hardcoded numbers (3, 18) instead of API data
- Career Map generated recommendations without any resume data (fabrication)
- GitHub and RSS importers returned 0 items but were marked as working
- Digest page cards rendered only gradient backgrounds with no visible content

### Pattern: Mock data disguised as real
- Cover letter generated in English despite Chinese-only requirement
- Feed content URLs were fabricated or broken
- AI suggestions sometimes invented resume content not present in original

## Acceptance Standards (DO NOT SKIP)

### Frontend
- Playwright E2E: desktop (mobile deferred), every button/input/navigation tested
- Full user flow interaction, not just page screenshots
- Normal flows AND edge cases
- Find bugs, don't verify correctness
- ESLint (`npx eslint src/`) must pass with 0 errors — `tsc --noEmit` is NOT lint

### Backend
- Non-AI APIs: expected normal + expected abnormal result tests (Jest e2e)
- AI APIs: complex scenario testing for decision and execution capability
- All tests must actually RUN and PASS, not just compile

### Quality Gates (in order)
1. Simplify skill — code review for reuse/quality/efficiency
2. PJR skill — lint + build both frontend AND backend
3. Playwright E2E — full user flows
4. git-merge-to-develop — rebase + review + merge

### Code Quality Red Lines
- NO glue code or patches — deep integration via refactoring
- NO mock data in production frontend
- NO buttons without real functionality
- NO claiming completion without evidence
- Every AI feature must refuse to fabricate when data is missing

## Workflow
- All development in worktrees (unless trivial)
- Subagents for code/tests, main agent for quality control
- Load superpowers skills before any creative work
- Maximum 10 concurrent subagents, default Sonnet, Opus for complex tasks
