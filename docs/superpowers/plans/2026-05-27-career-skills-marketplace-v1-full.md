# Career Skills Marketplace v1 Full Productization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all remaining Alpha RC risks and elevate 37 skills + knowledge graph to v1 Beta quality — hallucination-guard full validation, KG 600 companies, eval runner, dead dependency fixes, full quality audit.

**Architecture:** Fix-and-validate approach. No new skills. No new features. Each phase targets a specific risk from the PASS_WITH_RISKS audit. Validation scripts (Node.js) live in `career-skills-marketplace/scripts/` for repeatable quality gates.

**Tech Stack:** YAML/JSON (existing), Node.js scripts (new validation tooling), Bash/PowerShell (installer).

**Baseline:** dev @ `20a12fa`, 37 skills, T1=50 T2=105, manifest=37, routing=39 intents.

**Worktree:** `E:\Agent program\HRBP\.worktrees\career-skills-v1-full` on branch `feature/career-skills-v1-full`

---

## Phase F0: Baseline Audit

**Subagent: Main agent only**

- [ ] **Step 1: Create worktree**

```bash
cd "E:\Agent program\HRBP"
git worktree add ".worktrees/career-skills-v1-full" -b feature/career-skills-v1-full
```

- [ ] **Step 2: Verify baseline**

```bash
cd ".worktrees/career-skills-v1-full/career-skills-marketplace"
ls -d skills/*/ | wc -l          # 37
grep -c "^  - name:" marketplace.yaml  # 37
python -c "import json,glob; print(len([f for f in glob.glob('**/*.json',recursive=True) if json.load(open(f,encoding='utf-8')) is not None or True]))"  # 289
```

- [ ] **Step 3: Write baseline report**

Create `docs/codex-handoff/career-skills-v1-full/F0-baseline-audit.md` with commit, counts, known limitations from Alpha RC.

- [ ] **Step 4: Commit**

```
docs: F0 baseline audit for v1 full productization
```

---

## Phase F1: Fix Remaining Alpha RC Risks (4 items)

### Task F1.1: Hallucination-guard full field-name validation

**Subagent: A — read-only audit + targeted fixes**

**Problem:** Only 2 of 37 hallucination-guard tests were verified to have correct field names matching output_schema. The other 35 may reference non-existent fields.

**Files:**
- Read: all 37 `skills/*/tests/hallucination-guard.json`
- Read: all 37 `skills/*/output_schema.json`
- Create: `career-skills-marketplace/scripts/validate-hallucination-guards.mjs`
- Modify: any hallucination-guard.json with wrong field paths

- [ ] **Step 1: Write validation script**

```javascript
// scripts/validate-hallucination-guards.mjs
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const skillsDir = join(process.cwd(), 'skills');
const skills = readdirSync(skillsDir, { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name);

let failures = 0;
for (const skill of skills) {
  const schemaPath = join(skillsDir, skill, 'output_schema.json');
  const guardPath = join(skillsDir, skill, 'tests', 'hallucination-guard.json');
  
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const guard = JSON.parse(readFileSync(guardPath, 'utf-8'));
  const schemaProps = new Set(Object.keys(schema.properties || {}));
  
  for (const assertion of (guard.assertions || [])) {
    const rootField = (assertion.path || '').split(/[.\[]/)[0];
    if (rootField && !schemaProps.has(rootField)) {
      console.log(`FAIL: ${skill} — assertion path "${assertion.path}" references "${rootField}" not in output_schema`);
      failures++;
    }
  }
}
console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} failures`}`);
process.exit(failures > 0 ? 1 : 0);
```

- [ ] **Step 2: Run validation**

```bash
cd career-skills-marketplace
node scripts/validate-hallucination-guards.mjs
```

Expected: List of any mismatched field names.

- [ ] **Step 3: Fix every failure found**

For each FAIL: read the skill's output_schema.json, find the correct field name, update hallucination-guard.json.

- [ ] **Step 4: Re-run validation**

```bash
node scripts/validate-hallucination-guards.mjs
```

Expected: `ALL PASS`

- [ ] **Step 5: Commit**

```
fix(F1.1): hallucination-guard full field-name validation — N fixes + validation script
```

---

### Task F1.2: Fix interview-intelligence dead dependency

**Subagent: B**

**Problem:** `interview-intelligence` declares `depends_on: [source-quality-auditor]` but has no input parameter to receive audit results. The dependency is nominal.

**Files:**
- Modify: `skills/interview-intelligence/contract.yaml`
- Modify: `skills/interview-intelligence/input_schema.json`
- Modify: `skills/interview-intelligence/SKILL.md`

- [ ] **Step 1: Read current contract + input_schema**

- [ ] **Step 2: Add `source_audit` optional input**

In `input_schema.json`, add:
```json
"source_audit": {
  "type": "object",
  "description": "来源审计结果（来自 source-quality-auditor），用于调整面经数据的置信度"
}
```

In `contract.yaml` `optional_context`, add:
```yaml
- name: source_audit
  type: object
  description: "来自 source-quality-auditor 的来源审计结果，用于动态调整面经置信度"
```

In `SKILL.md`, add a section explaining: when source_audit is provided, use it to override the hardcoded credibility ceiling. When absent, fall back to hardcoded B-grade ceiling.

- [ ] **Step 3: Similarly fix xhs-interview-miner and nowcoder-tech-miner**

Same pattern: add `source_audit` as optional input to make the declared dependency functional.

- [ ] **Step 4: Verify**

```bash
for skill in interview-intelligence xhs-interview-miner nowcoder-tech-miner; do
  grep -q "source_audit" "skills/$skill/input_schema.json" && echo "$skill: OK" || echo "$skill: MISSING"
  grep -q "source_audit" "skills/$skill/contract.yaml" && echo "$skill contract: OK" || echo "$skill contract: MISSING"
done
```

- [ ] **Step 5: Commit**

```
fix(F1.2): connect source-quality-auditor dependency via source_audit input in 3 skills
```

---

### Task F1.3: KG Tier 2 audit + Tier 3 creation

**Subagent: C + D parallel (C audits T2, D creates T3)**

#### Subagent C: Audit existing 105 Tier 2 companies

**Files:**
- Read + modify: `knowledge/company-taxonomy/tier_2_companies.yaml`
- Create: `scripts/validate-knowledge-graph.mjs`

- [ ] **Step 1: Write KG validation script**

```javascript
// scripts/validate-knowledge-graph.mjs
// Checks: id uniqueness, alias conflicts, tier legality,
// company_type legality, confidence/freshness present,
// field completeness per tier
```

- [ ] **Step 2: Run on tier_2_companies.yaml, fix data issues**
- [ ] **Step 3: Commit**: `fix(F1.3a): audit and fix Tier 2 company data`

#### Subagent D: Create Tier 3 (300 companies)

**Files:**
- Create: `knowledge/company-taxonomy/tier_3_extended.yaml`
- Modify: `knowledge/company-taxonomy/aliases.yaml`

- [ ] **Step 1: Create tier_3_extended.yaml with 300 lightweight entries**

Each entry:
```yaml
- id: <kebab-case>
  canonical_name: <name>
  aliases: [<1-2>]
  company_type: <type>
  tier: tier_3
  cities: [<main city>]
  hiring_relevance: <high|medium|low>
  confidence: low
  freshness: "2026-Q2-estimate"
  needs_verification: true
  source_policy: "基于公开信息汇编，低置信度，待社区验证"
```

Coverage: regional tech companies, niche SaaS, biotech, manufacturing, 新一线城市 employers.

- [ ] **Step 2: Add aliases for all 300 to aliases.yaml**
- [ ] **Step 3: Run validate-knowledge-graph.mjs on all tiers**

```bash
node scripts/validate-knowledge-graph.mjs
```

Expected: `T1: 50, T2: ~250, T3: 300, Total: 600, Errors: 0`

- [ ] **Step 4: Commit**: `feat(F1.3b): Tier 3 extended — 300 lightweight company entries`

---

### Task F1.4: Expand Tier 2 to 250

**Subagent: E**

**Files:**
- Modify: `knowledge/company-taxonomy/tier_2_companies.yaml`
- Modify: `knowledge/company-taxonomy/aliases.yaml`

- [ ] **Step 1: Add ~145 companies to reach 250 Tier 2**

Sectors to expand: 医疗/生物 (20+), 教育/企服 (15+), 新能源/汽车 (15+), 游戏/内容 (15+), 金融/保险 (15+), 出海/跨境 (10+), 咨询/广告 (10+), 地方强势企业 (15+), 外资补充 (15+), 央企/国企补充 (15+).

- [ ] **Step 2: Run validation**
- [ ] **Step 3: Commit**: `feat(F1.4): expand Tier 2 to 250 companies`

---

## Phase F2: Validation Scripts

**Subagent: F**

**Files:**
- Create: `scripts/validate-all.mjs` (orchestrator)
- Create: `scripts/validate-schemas.mjs`
- Create: `scripts/validate-fixtures.mjs`
- Create: `scripts/validate-routing.mjs`

- [ ] **Step 1: validate-schemas.mjs**

Checks JSON/YAML parse, base required fields, confidence enum, manifest coverage.

- [ ] **Step 2: validate-fixtures.mjs**

Loads all test fixtures (185 skill-level + 20 workflow), checks:
- No prose assertions in structured files
- All assertion paths reference valid output_schema fields
- expected_skills_invoked references valid skill names

- [ ] **Step 3: validate-routing.mjs**

Checks:
- Every skill in marketplace.yaml has at least one intent route
- No orphan intents (routing to non-existent skills)
- career-principal sub_skills matches marketplace.yaml skills list

- [ ] **Step 4: validate-all.mjs**

Runs all validators in sequence, reports summary.

```bash
node scripts/validate-all.mjs
```

Expected:
```
Schemas:    PASS (289 JSON, 61 YAML, 37/37 base fields)
Fixtures:   PASS (185 skill + 20 workflow, 0 prose assertions)
Routing:    PASS (39 intents, 0 orphans, 37/37 skills routed)
Knowledge:  PASS (T1=50, T2=250, T3=300, total=600, 0 errors)
Guards:     PASS (37/37 field names correct)
OVERALL:    PASS
```

- [ ] **Step 5: Commit**: `feat(F2): validation script suite — schemas, fixtures, routing, KG, guards`

---

## Phase F3: Full 37-Skill Quality Audit

**Subagent: G + H + I (split 37 skills across 3 reviewers)**

**Files:**
- Create: `docs/codex-handoff/career-skills-v1-full/F3-full-skill-quality-audit.md`

Split:
- G: skills 1-13 (A-D alphabetically)
- H: skills 14-25 (E-N)
- I: skills 26-37 (O-X)

Each reviewer reads SKILL.md + contract.yaml + happy-path.md + hallucination-guard.json for their set.

Per skill, evaluate:
1. Single responsibility
2. Judgment framework present
3. China market adapted
4. Evidence-driven
5. Low evidence degradation
6. cannot_determine coverage
7. Examples realistic
8. Tests meaningful

Output per skill: PASS / PASS_WITH_RISKS / FAIL with findings.

Any FAIL → must fix before merge.

- [ ] **Step 1: Dispatch 3 reviewer subagents**
- [ ] **Step 2: Merge findings into F3 report**
- [ ] **Step 3: Fix any FAILs found**
- [ ] **Step 4: Commit fixes + report**

```
audit(F3): full 37-skill quality audit + fixes
```

---

## Phase F4: Documentation Polish

**Subagent: J**

**Files:**
- Modify: `README.zh-CN.md` — update to 37 skills, 600 companies, v1 Beta
- Modify: `README.md` — brief English update
- Modify: `KNOWN_LIMITATIONS.md` — update remaining risks
- Modify: `docs/installation.md` — verify accuracy
- Modify: `docs/usage-examples.md` — add 2 new examples using Pack B/C skills

- [ ] **Step 1: Update all docs**
- [ ] **Step 2: Verify no broken links, no stale numbers**
- [ ] **Step 3: Commit**: `docs(F4): documentation polish for v1 Beta`

---

## Phase F5: Final PJR + Merge Gate

**Subagent: Main agent**

- [ ] **Step 1: Run validate-all.mjs**

```bash
node scripts/validate-all.mjs
```

Expected: OVERALL PASS

- [ ] **Step 2: Installer smoke test**

```powershell
$env:CODEX_HOME = "<repo>\.tmp-final\codex"
.\install.ps1 -Target codex
# Verify 37 SKILL.md
# Cleanup
```

- [ ] **Step 3: Forbidden pattern scan**

```bash
grep -r "TODO\|TBD\|FIXME\|placeholder\|your-org\|rm -rf\|Remove-Item" --include="*.md" --include="*.yaml" --include="*.json" --include="*.sh" --include="*.ps1" -l
```

Expected: 0

- [ ] **Step 4: Git status clean**

- [ ] **Step 5: Write final report**

Create `docs/codex-handoff/career-skills-v1-full/FINAL-V1-FULL-REPORT.md`

- [ ] **Step 6: Commit report, do NOT merge**

Wait for user/Codex approval.

---

## Parallelization Map

```
F0 (baseline) ────────────────────────→ dispatch

F1.1 (hallucination guards) ──────────┐
F1.2 (dead dependencies) ────────────┤
F1.3a (T2 audit) ────────────────────┤
F1.3b (T3 creation) ─────────────────┤──→ F2 (validation scripts) → F3 (37-skill audit) → F4 (docs) → F5 (PJR)
F1.4 (T2 expansion) ─────────────────┘

F1.1-F1.4 are fully parallelizable
F2 depends on F1 (needs KG + fixed guards)
F3 depends on F2 (uses validation scripts)
F4 depends on F3 (needs audit results)
F5 depends on ALL
```

**Recommended subagent assignment (10 max):**
- Main: F0 + F5
- A: F1.1 (hallucination guards)
- B: F1.2 (dead dependencies)
- C: F1.3a (T2 audit)
- D: F1.3b (T3 creation, 300 companies)
- E: F1.4 (T2 expansion to 250)
- F: F2 (validation scripts)
- G+H+I: F3 (37-skill audit, split 3 ways)
- J: F4 (docs)

---

## Merge Conditions

1. validate-all.mjs: OVERALL PASS
2. Installer smoke: 37 SKILL.md
3. Forbidden patterns: 0
4. F3 audit: 0 FAILs
5. Git status: clean
6. User/Codex approval

## Deferred (NOT in this plan)

- CLI / npm package
- Live adapters (XHS/牛客/公众号)
- Web UI / Local API
- Multi-environment (Gemini CLI / Cursor)
- Automated eval runner with LLM judge
