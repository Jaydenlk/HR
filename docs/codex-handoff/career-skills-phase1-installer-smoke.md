# Career Skills Marketplace — Phase 1 Installer Smoke Test

> Date: 2026-05-26
> Platform: Windows 11 Pro (PowerShell 5.1 + Git Bash)
> Branch: dev @ commit 1df34b6

---

## Test 1: PowerShell Codex Target

**Command:**
```powershell
$env:CODEX_HOME = "<repo>\.tmp-install-test\codex"
.\career-skills-marketplace\install.ps1 -Target codex
```

**Result:** PASS

**Output summary:**
```
Target: <repo>\.tmp-install-test\codex\skills
  OK _career-skills-shared/
  OK career-principal/SKILL.md
  OK profile-builder/SKILL.md
  OK jd-analyzer/SKILL.md
  OK resume-tailor/SKILL.md
  OK match-diagnosis/SKILL.md
  OK source-quality-auditor/SKILL.md
Installed to: <repo>\.tmp-install-test\codex\skills
```

**File verification:**

| File | Status |
|------|--------|
| `career-principal/SKILL.md` | OK |
| `profile-builder/SKILL.md` | OK |
| `jd-analyzer/SKILL.md` | OK |
| `resume-tailor/SKILL.md` | OK |
| `match-diagnosis/SKILL.md` | OK |
| `source-quality-auditor/SKILL.md` | OK |
| `_career-skills-shared/marketplace.yaml` | OK |

---

## Test 2: Duplicate Install Rejection

**Command:** Same as Test 1 (re-run on existing installation)

**Result:** PASS — correctly rejected

**Output:**
```
ERROR: <path>\career-principal already exists.
This installer never deletes or overwrites existing skill directories.
Back up and remove existing directories manually if you want a clean reinstall.
Exit code: 1
```

---

## Test 3: Bash Codex Target

**Command:**
```bash
CODEX_HOME="<repo>/.tmp-install-test/bash-codex" bash career-skills-marketplace/install.sh --target codex
```

**Result:** PASS

**Output summary:**
```
Target: <repo>/.tmp-install-test/bash-codex/skills
  ✓ _career-skills-shared/
  ✓ career-principal/SKILL.md
  ✓ profile-builder/SKILL.md
  ✓ jd-analyzer/SKILL.md
  ✓ resume-tailor/SKILL.md
  ✓ match-diagnosis/SKILL.md
  ✓ source-quality-auditor/SKILL.md
```

**File verification:** 7/7 OK (same checklist as Test 1)

**Note:** Bash available via Git Bash on Windows. Native bash smoke test completed.

---

## Test 4: Cleanup

**Command:**
```powershell
Remove-Item -Recurse -Force "<repo>\.tmp-install-test"
```

**Result:** PASS — directory removed, git status clean

---

## Summary

| Test | Target | Result |
|------|--------|--------|
| PowerShell install (-Target codex) | Codex via $CODEX_HOME | PASS |
| Duplicate install rejection | Same target | PASS (exit 1) |
| Bash install (--target codex) | Codex via $CODEX_HOME | PASS |
| Cleanup + git status | N/A | PASS (clean) |

**Installer safety:**
- No files deleted during install
- No processes killed
- No sudo/admin elevation
- Existing directories never overwritten (abort with error)
- Temp test directory fully cleaned

**Not tested in this run:**
- macOS/Linux native environment (Windows-only machine)
- Claude Code default target (same code path as Codex, only path differs)
