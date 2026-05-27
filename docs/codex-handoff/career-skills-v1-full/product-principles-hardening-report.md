# Product Principles Hardening Report

> Date: 2026-05-27
> Branch: feature/career-skills-v1-full

## What Changed

### Two core principles embedded across the marketplace:

**1. Ask-before-judging**: 信息不足时先问诊，不强行判断
**2. Source-Reason-Opinion**: 关键建议拆分出处、思考、观点

### Deliverables

| Item | Count | Description |
|------|-------|-------------|
| Policy file | 1 | `shared/policies/product-principles.md` |
| Principal updated | 4 files | SKILL.md + contract + low-evidence example + hallucination-guard |
| High-risk skills updated | 10 skills × 2 files = 20 files | SKILL.md + contract.yaml with principle sections |
| Ask-before-judging tests | 12 | 11 skill tests + 1 workflow fixture |
| Insufficient workflow fixtures | 3 | insufficient-profile, insufficient-jd, insufficient-offer |
| Usage example | 1 | Example 11: 信息不足时的回答 |

### Why this isn't a patch

These principles are not bolted-on documentation. They:
- Map to existing schema fields (evidence_used, cannot_determine, follow_up_questions, next_actions, confidence)
- Have 12 dedicated test fixtures that enforce the behavior
- Are referenced in 10 high-risk skill contracts as machine-readable flags
- Include 3 workflow eval fixtures that test multi-skill insufficient-info scenarios
- Update the career-principal's example to show the 985+字节 scenario end-to-end

## Fixes During Hardening

| Issue | Fix |
|-------|-----|
| career-principal contract.yaml YAML parse error | Fixed list/mapping mix in product_principles |
| career-principal hallucination-guard references `aggregated_result` (not in schema) | Changed to `summary` |

## Verification Results

| Check | Result |
|-------|--------|
| JSON parse | 304/304 PASS |
| YAML parse | 62/62 PASS |
| Base fields | 37/37 PASS |
| Manifest | 37 skills |
| Routing | 39 intents, 0 unrouted |
| KG | 600 (50+250+300), 0 duplicates |
| Guards | 37/37 PASS |
| Skill tests | 204 (0 prose) |
| Workflow evals | 24 (0 prose) |
| Policy exists | PASS |
| 10 skills have principles | 10/10 |
| 12 ask-before-judging tests | 12/12 |
| 3 insufficient fixtures | 3/3 |
| Forbidden | 0 |
| Git status | clean (after commit) |
| **OVERALL** | **PASS** |

## Remaining Risks

Same as pre-hardening PASS_WITH_RISKS:
- Live adapters deferred
- Hallucination guards are fixture-time, not runtime
- T2/T3 KG needs community verification
- 5 skills remain PASS_WITH_RISKS (documented)

Product principles hardening does NOT change these risks — it adds a behavioral layer on top.

## Conclusion

**PASS_WITH_RISKS** maintained. Product principles are now embedded in policy, 10 skill contracts, 12 tests, 3 workflow fixtures, and the principal's example/docs. Recommend proceeding to merge-to-dev.
