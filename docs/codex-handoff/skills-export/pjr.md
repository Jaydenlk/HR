# Skill: project-review:pjr (Project Review)

## Purpose
Project completion review checklist. Ensures lint, build, code logic, documentation consistency, and workspace state are all clean before merge.

## Checklist

### 1. Lint + Build (BOTH frontend AND backend, whichever was changed)

**Backend:**
```bash
cd packages/api
npx tsc --noEmit        # TypeScript type checking
npx nest build          # NestJS compilation
```

**Frontend:**
```bash
cd packages/web
npx eslint src/         # REAL lint — NOT just tsc --noEmit
npx next build          # Next.js production build
```

CRITICAL: `tsc --noEmit` is NOT lint. ESLint catches different issues (unused vars, style, react-hooks rules). Both must pass.

### 2. Error Resolution
- All errors must be fixed
- Warnings are acceptable but no NEW warnings should be introduced
- If fixing a warning would require major refactoring, document it as tech debt

### 3. Code Logic Check
- Review changed files for logical correctness
- Verify imports are used
- Check for dead code introduced by the changes

### 4. Documentation Consistency
- If behavior changed, do docs/comments still match?
- Are type definitions accurate?

### 5. Workspace Cleanliness
- No uncommitted changes
- No stash residue (`git stash list` should be empty or intentional)
- No temp files or debug logs left behind

### 6. Merge
- Use `git-merge-to-develop` skill for the actual merge process
- Never merge directly without the rebase + review flow

## Project Status
- Backend `tsc --noEmit` and `nest build`: were run, passed
- Frontend `npx eslint src/`: was initially NOT run (had 7 errors). Fixed in commit `66b5ef4` and `432c6a0`
- Frontend `npx next build`: was run, status needs re-verification
