# Career Skills Marketplace v1 Full — Final Codex Review

> Date: 2026-05-27
> Branch: feature/career-skills-v1-full
> Reviewed commit: 56808b3 + post-review fixes

---

## Verdict: PASS_WITH_RISKS

可以 merge-to-dev。可以标 v1 Beta Release Candidate。必须附带 KNOWN_LIMITATIONS.md。

---

## PJR (fresh run)

| # | Check | Result |
|---|-------|--------|
| 1 | JSON parse | 289/289 PASS |
| 2 | YAML parse | 62/62 PASS |
| 3 | Required files | 0 missing |
| 4 | Base fields | 37/37 PASS |
| 5 | Confidence enum | 37/37 PASS |
| 6 | Manifest | 37 skills |
| 7 | Routing | 39 intents |
| 8 | Orphan skills | 0 |
| 9 | Dead deps | 0 |
| 10 | Guards | 37/37 PASS (hardened) |
| 11 | KG | 600 (50+250+300), 0 dupes |
| 12 | Fixtures | 20/20 structured, 0 prose |
| 13 | Installer | 37 SKILL.md (codex) |
| 14 | Docs | 0 forbidden terms |
| 15 | Forbidden | 0 |
| 16 | Git | clean |

## 5 PASS_WITH_RISKS Skills

| Skill | Risk | Acceptable for Beta? |
|-------|------|---------------------|
| application-strategist | Guard strictness boundary | YES — documented, guard is meaningful |
| career-principal | 39 intents vs 37 skills | YES — different dimensions, not a bug |
| company-interview-playbook | Salary needs live data for high confidence | YES — null guard in contract |
| interview-intelligence | live_research: false, data from upstream | YES — documented in KNOWN_LIMITATIONS |
| salary-radar | JD data vs 报告 granularity | YES — grade rules enforce B ceiling |

## P1 Found During Review (Fixed)

| Issue | Fix |
|-------|-----|
| README.zh-CN.md claims 50 companies, actual 600 | Updated to 600 with tier breakdown |
| marketplace.yaml knowledge_stats.companies: 50 | Updated to 600 with tier detail |

## P2 (Deferred)

- company-interview-playbook missing happy-path.md
- T3 geographic concentration (Chengdu-heavy in early entries)
- 小红书 T1 entry has null interview/salary fields

## KG Spot-Check

40 companies across T1/T2/T3: all real, correctly typed, fields present, no fabrication.

## Fixture Spot-Check

6 fixtures checked: all structured, meaningful assertions, could catch real regressions.

## Docs Honesty

README.md: No stable/production-ready claims. KNOWN_LIMITATIONS: honest and complete. CHANGELOG: accurate.

## Remaining Risks

1. Live adapters not implemented — market skills degrade to insufficient
2. Hallucination guards are fixture-time, not runtime
3. T2/T3 needs community verification
4. interview-intelligence high-confidence requires upstream live data

## Recommendation

| Action | Allowed? |
|--------|---------|
| Merge to dev | **YES** |
| Push | **YES** (after merge) |
| 开源 Beta RC | **YES** (with KNOWN_LIMITATIONS) |
| 标 stable/production | **NO** |
