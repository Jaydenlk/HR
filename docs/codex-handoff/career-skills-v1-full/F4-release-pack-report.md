# F4 Release Pack Report

> Task: Documentation polish and release pack for Career Skills Marketplace v1 Beta
> Agent: Implementer
> Date: 2026-05-27
> Status: READY_FOR_REVIEW

---

## Files changed

### 1. career-skills-marketplace/README.md — rewritten

Previous state: Mentioned 50-company knowledge graph, missing install instructions, no KNOWN_LIMITATIONS link.

Changes made:
- Updated KG size from 50 to 600 (50 T1 + 250 T2 + 300 T3)
- Added explicit "NOT a CLI/npm/Web/API" statement
- Added install commands for all 4 combinations (macOS/Linux + Windows × Claude/Codex)
- Added links to README.zh-CN.md, KNOWN_LIMITATIONS.md, docs/installation.md, docs/usage-examples.md
- Removed vague "Quick start" section that pointed only to Chinese docs

### 2. career-skills-marketplace/KNOWN_LIMITATIONS.md — rewritten

Previous state: Written for v1 Alpha RC, covered T2 as 105 companies (incomplete), no T3 section, no mention of P2 issues.

Changes made:
- Updated version marker to v1.0.0-beta.1
- Corrected KG tiers: T1=50, T2=250, T3=300
- Added explicit sections for: live adapters deferred, CLI/npm deferred, Web UI not planned
- Added section on temporal limits with `freshness` field guidance
- Added P2 issues section (career-path-planner rounding, city data undated, path prefix inconsistency)
- Added hallucination-guard scope clarification (fixture-based, not runtime)
- Added professional judgment disclaimer

### 3. career-skills-marketplace/CHANGELOG.md — created new

Previous state: File did not exist.

Created v1.0.0-beta.1 entry covering: 37 skills, knowledge graph, F3 quality work (15 P0 + 9 P1 fixes), hallucination guard, workflow eval, installer.

### 4. career-skills-marketplace/docs/installation.md — updated

Previous state: Correct overall, but listed Phase 1/Phase 6 terminology, showed only 6 skills in example directory listing, had no note clarifying "not npm".

Changes made:
- Removed "Phase 1 / Phase 6" framing (replaced with "支持" / "手动安装")
- Added explicit note: not CLI, not npm, not npx
- Expanded example directory listing to show all 37 skills (abbreviated with "... 共 37 个 skill 目录")

No structural changes — install commands, paths, and troubleshooting content were already correct.

### 5. career-skills-marketplace/docs/usage-examples.md — rewritten

Previous state: 6 examples, some not matching the 37-skill catalog (e.g., no salary-radar, no market-radar, no career-path-planner examples).

Rewritten with 10 examples covering:
1. JD analysis (jd-analyzer)
2. Resume rewrite (profile-builder + jd-analyzer + resume-tailor) — includes fabrication_check
3. Match diagnosis (profile-builder + jd-analyzer + match-diagnosis) — shows dimension breakdown
4. Offer comparison (offer-comparator) — includes hourly_rate calculation
5. Salary range (salary-radar) — shows p25/p50/p75 with freshness/source_grade
6. Interview prep (interview-intelligence) — shows flow + common questions
7. Market radar (market-radar) — shows confidence: insufficient when no live data
8. Source audit (source-quality-auditor) — shows grade + freshness + verification note
9. Career path (career-path-planner + role-transition-advisor) — shows feasibility + skill gap
10. career-principal orchestration — shows full 4-skill chain with aggregated evidence_chain

### 6. docs/codex-handoff/career-skills-v1-full/F4-release-pack-report.md — created

This file.

---

## What was NOT changed

- No skill implementations modified
- No contract.yaml or output schemas touched
- No test files modified
- No installer scripts modified
- No knowledge graph data modified
- No CONTRIBUTING.md, SECURITY.md, or other governance docs modified
- README.zh-CN.md not modified (it was already accurate for Chinese readers)

---

## No new features

This task was documentation-only. Every changed line traces to one of:
- Correcting factually wrong numbers (KG size: 50 → 600)
- Adding missing information (CHANGELOG, limitations sections)
- Removing outdated framing (Phase 1/Phase 6, Alpha RC)
- Expanding examples to match the actual 37-skill catalog

---

## Verification

All 6 files written. No YAML/JSON was created or modified (no parse risk). No TODO/TBD/placeholder text in any output. No "stable", "production-ready", or superlative claims.

Commit command to run:
```
git add career-skills-marketplace/README.md career-skills-marketplace/KNOWN_LIMITATIONS.md career-skills-marketplace/CHANGELOG.md career-skills-marketplace/docs/installation.md career-skills-marketplace/docs/usage-examples.md docs/codex-handoff/career-skills-v1-full/F4-release-pack-report.md
git commit -m "docs(F4): release pack — README, limitations, changelog, installation, 10 usage examples"
```
