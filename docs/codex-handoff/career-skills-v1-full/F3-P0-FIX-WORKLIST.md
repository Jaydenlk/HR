# F3 P0 Fix Worklist

| ID | Category | Affected Files | Root Cause | Fix Plan | Validation | Status |
|----|----------|---------------|------------|----------|------------|--------|
| P0-1 | guard-format | career-principal/tests/hallucination-guard.json | Uses `field`+`assertion` keys instead of `path`+`operator`+`value` | Rewrite to standard format | validator 37/37 | PENDING |
| P0-2 | guard-format | source-quality-auditor/tests/hallucination-guard.json | Uses `critical_assertions` object instead of `assertions` array | Rewrite to standard format | validator 37/37 | PENDING |
| P0-3 | guard-format | match-diagnosis/tests/hallucination-guard.json | Uses prose `check` strings | Rewrite to standard format | validator 37/37 | PENDING |
| P0-4 | guard-format | resume-tailor/tests/hallucination-guard.json | Uses prose `check` strings | Rewrite to standard format | validator 37/37 | PENDING |
| P0-5 | guard-enum | company-risk-auditor/tests/hallucination-guard.json | Asserts `insufficient` not in risk_profile.overall_risk schema enum | Change to schema-valid value `unknown` | validator pass | PENDING |
| P0-6 | guard-enum | role-transition-advisor/tests/hallucination-guard.json | Asserts `unknown`/`insufficient` not in feasibility enum | Change to `not_feasible` | validator pass | PENDING |
| P0-7 | guard-semantic | offer-comparator/tests/hallucination-guard.json | `contains` on array-of-objects | Use correct path to string field | validator pass | PENDING |
| P0-8 | kg-duplicate | tier_3_extended.yaml | zhipuai-tech/baichuan-ai/moonshot-ai duplicate T1 entries | Remove from T3 | 0 duplicates | PENDING |
| P0-9 | kg-misclass | tier_2_companies.yaml | 6-7 AI companies (SenseTime etc) tagged new_energy | Change to ai_startup | types correct | PENDING |
| P0-10 | kg-id-error | tier_2_companies.yaml | dji-agibot→宇树, dji-overseas→石头, deepl-cn→科大讯飞 | Fix ids | unique ids | PENDING |
| P0-11 | manifest | marketplace.yaml vs contract.yaml | 6 skills have conflicting depends_on | Align manifest to contract | consistent | PENDING |
| P0-12 | routing | intent-router.yaml | find_interview_experience routes to source-quality-auditor | Change to interview-intelligence | correct route | PENDING |
| P0-13 | math | opportunity-intelligence/examples/happy-path.md | 31.2+29.75+20=80.95≠74 | Fix score or breakdown | math correct | PENDING |
| P0-14 | math | offer-comparator/examples/happy-path.md | 3 numerical contradictions | Recalculate consistently | math correct | PENDING |
| P0-15 | fixture-schema | evals/workflow/v1-complete/*.json | Incompatible assertion format with workflow/ | Unify to standard schema | single format | PENDING |
