# Skill: git-merge-to-develop

## Purpose
Industry-standard flow for merging feature branches to develop: rebase + command-line MR creation.

## Steps

### 1. Commit All Uncommitted Code
- Stage and commit any remaining changes
- Use meaningful commit messages

### 2. Confirm on Feature Branch
- Verify you are on the correct feature branch, not develop or main
- `git branch --show-current`

### 3. Rebase onto Develop
```bash
git pull --rebase origin develop
```

### 4. Conflict Resolution (if any)
Smart resolution by scenario type:

| Conflict Type | Resolution Strategy |
|---------------|---------------------|
| **Format conflicts** | Accept either side, re-run formatter |
| **Feature conflicts** | Keep both features, adjust integration points |
| **Bugfix conflicts** | Prefer the fix, verify it still applies |
| **Architecture conflicts** | Careful merge — may need manual integration |
| **Business logic conflicts** | STOP. Discuss with team. Do not auto-resolve. |

### 5. AI Code Review
- Review all changes that will be merged
- Check for quality issues, security concerns, logic errors

### 6. Push and Create MR
```bash
git push origin <branch-name>
# Create merge/pull request via CLI
```

## Notes
- Always rebase, never merge commit (keeps history linear)
- If rebase has many conflicts, consider whether the branch has diverged too far
- Squash only if the feature branch has noisy/WIP commits
