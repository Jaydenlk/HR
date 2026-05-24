# Skill: superpowers:verification-before-completion

## Purpose
MUST run verification commands and confirm output BEFORE claiming work is complete, fixed, or passing. Evidence before assertions. Never say "tests pass" without showing the output.

## The Rule
**You must have terminal output proving your claim before you make it.**

## What This Prevents

### "Tests pass" without running them
- WRONG: "All tests should pass now" (after editing code)
- RIGHT: Run `npm test`, show output, THEN say "190 tests pass"

### "Build succeeds" without building
- WRONG: "The build should work after this fix"
- RIGHT: Run `npx next build` or `npx nest build`, show output, THEN report

### "Lint is clean" without linting
- WRONG: "I fixed the ESLint errors" (after editing)
- RIGHT: Run `npx eslint src/`, show "0 errors", THEN claim clean

### "Feature works" without testing
- WRONG: "The digest page should render correctly now"
- RIGHT: Open the page (Playwright or manual), screenshot or describe what you see, THEN report

## Checklist Before Claiming Completion
1. Run the relevant verification command
2. Read the output
3. If it fails, fix and re-run
4. Only after seeing success output, make the claim
5. Include the evidence (command + output summary) in your report

## Project Violations (Why This Skill Exists)
- Phase 8 was claimed complete while `/digest` page said "建设中"
- ESLint was "clean" but had 7 errors (only `tsc --noEmit` was run)
- API tests were "verified" when zero Jest tests existed
- Career Map "worked" but generated fake data without any resume input
- GitHub importer was "working" but returned 0 items
