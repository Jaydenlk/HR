# F3 P1 Fix Worklist

Note: P1-24 (networking fixture length_gte/lte) was already fixed in P0-15. 8 remaining.

| ID | Skill/Module | Issue | Root Cause | Fix Plan | Status |
|----|-------------|-------|------------|----------|--------|
| P1-16 | xhs-interview-miner, nowcoder-tech-miner | Missing input_schema.json | F1.2 fix only added source_audit to contract.yaml, not JSON schema file | Create input_schema.json for both skills | PENDING |
| P1-17 | salary-radar | BOSS直聘 grade A in references vs B in SKILL.md | Two source files disagree on grade | Align to B (per shared grading policy) in references/salary-data-sources.md | PENDING |
| P1-18 | wechat-insight-reader | hallucination-guard test uses `query` but contract defines `topic` | Test fixture input field mismatch | Change test input from `query` to `topic` | PENDING |
| P1-19 | interview-intelligence | SKILL.md allowed-tools [Read,Grep] but live_research_required: true | Tool list too restrictive for live research | Either add WebSearch/WebFetch or change live_research to false with degradation note | PENDING |
| P1-20 | technical-interview-coach | Same as P1-19: tools vs live_research contradiction | Same root cause | Same fix pattern | PENDING |
| P1-21 | behavioral-story-builder | happy-path evidence_used is empty `[]` despite rich source | Example documentation gap | Populate evidence_used with profile field references | PENDING |
| P1-22 | company-interview-playbook | happy-path salary claim without source-quality-auditor invocation | Example skips mandatory verification step | Add source-quality-auditor to evidence chain or null salary | PENDING |
| P1-23 | career-principal | SKILL.md Pack B missing interview-intelligence and interview-debrief | SKILL.md not synced with contract.yaml sub_skills | Add missing skills to SKILL.md Pack B list | PENDING |

## Additional: KG 597 → 600

| ID | Issue | Fix Plan | Status |
|----|-------|----------|--------|
| KG-GAP | T3 has 297 (was 300, 3 removed as dupes) | Add 3 legitimate T3 companies to restore 600 total | PENDING |
