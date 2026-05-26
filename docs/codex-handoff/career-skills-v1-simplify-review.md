# Career Skills Marketplace v1 — Simplify Review

> Date: 2026-05-26
> Reviewer: Automated content audit (8 skill deep read + 2 spot checks)
> Branch: feature/career-skills-marketplace-v1-complete

## Findings and Fixes

### FIXED: career-principal contract.yaml sub_skills incomplete

**Problem:** contract.yaml only listed 5 original MVP skills, not the 31 new ones from Packs A-D. A consumer reading only the contract would not know about opportunity-intelligence, market-radar, etc.

**Fix:** Expanded sub_skills list to all 37 skills, organized by layer.

**Why now:** The contract is the machine-readable truth of what this skill can call. An incomplete list would break any automated orchestration.

### FIXED: interview-intelligence hallucination-guard test defect

**Problem:** Test asserted on `common_questions[0].source_hint` but when the skill correctly degrades (empty array), this assertion would either null-reference or vacuously pass.

**Fix:** Changed assertion to verify `common_questions` array length is 0 when no data exists, plus `must_not_contain` list for fabrication phrases.

**Why now:** A test that passes when it shouldn't is worse than no test.

### FIXED: salary-radar 猎聘 grade conflict

**Problem:** SKILL.md classified 猎聘 as A-grade, but the shared grading-policy.yaml has it as B-grade. Two conflicting grades for the same source.

**Fix:** Aligned SKILL.md to match shared policy (B-grade). Also fixed happy-path example that claimed "60天内" when source date was 72 days ago.

**Why now:** Grade conflicts produce non-deterministic source evaluation.

### FIXED: offer-comparator hourly rate formula mismatch

**Problem:** SKILL.md formula used `月薪 × 12` but the happy-path example used total annual comp (including bonus). The shown value 192.3 was correct for total comp, wrong for the stated formula.

**Fix:** Updated formula to use total annual comp (base × months + bonus, excluding uncertain equity). This matches what users actually need for comparison.

**Why now:** The canonical example had a demonstrably wrong calculation per the stated formula. Users copying this logic would get wrong results.

### FIXED: offer-comparator single-offer confidence inconsistency

**Problem:** low-evidence.md used `confidence: low` for single offer, but bad-input.md and contract.yaml say single offer should be `insufficient`.

**Fix:** Changed low-evidence.md to `confidence: insufficient`.

**Why now:** Same scenario must produce same confidence level.

### FIXED: match-diagnosis contract.yaml missing dimension weights

**Problem:** The scoring model (skills 30%, experience 25%, education 15%, role 15%, constraints 15%) was in SKILL.md but not in the machine-readable contract.yaml.

**Fix:** Added `scoring_model` section with dimension weights and calibration thresholds.

**Why now:** Downstream integrators need the weights in the contract, not just in prose.

## Confirmed Not Problems

- **resume-tailor zero-fabrication policy**: Thoroughly implemented with meaningful hallucination guard. Edge case in "allowed operations" inference boundary is acceptable (policy requires source evidence).
- **jd-analyzer risk signals**: 12 Chinese-specific signals properly catalogued with severity levels and evidence fragments.
- **market-radar degradation**: Correctly returns empty results with `confidence: insufficient` when no live data.
- **xhs-interview-miner C-grade ceiling**: Properly enforced in contract and examples.
- **career-principal 39 intents**: All 39 verified present in intent-router.yaml with trigger examples.

## Deferred (acceptable)

- CLI tool (Phase 3)
- npm package (Phase 3)
- Live adapter implementation (Phase 3+)
- Web UI (not planned)
- JSONL/SQLite evidence store (Phase 2)
- Promotional content detection demo in xhs-interview-miner examples
- "Too broad query" test case for market-radar
