# Career Skills Marketplace Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code / Codex installable Career Skills Marketplace with 6 MVP skills, shared evidence schema, China career knowledge seed, and installer scripts — no CLI, no API, no Web UI.

**Architecture:** Anthropic Agent Skills format. Career Principal SKILL.md is the entry point that routes user intents to 5 sub-skills. All skills share evidence schema, source policy, and knowledge graph stored as YAML/JSON files. Users install by running a shell script that copies files to `~/.claude/skills/`.

**Tech Stack:** YAML (contracts, knowledge), JSON (schemas, test fixtures), Markdown (SKILL.md, examples, docs). No runtime dependencies. No build step.

**Spec references:**
- `docs/codex-handoff/career-skills-marketplace-design-audit.md` — MVP design (chapters 5-8)
- `docs/codex-handoff/career-skills-marketplace-full-roadmap.md` — intent routing (chapter 2)
- `docs/codex-handoff/career-skills-marketplace-implementation-constraints.md` — file formats, schemas
- `docs/codex-handoff/career-skills-phase1-decisions.md` — confirmed decisions

**Repo root:** A new directory `career-skills-marketplace/` will be created inside the current project as a standalone repo structure, ready to be extracted to its own Git repo.

---

## Task 0: Worktree Preparation

**Subagent boundary: Main agent only — run before dispatching implementation subagents**

**Files:** No project files created in this task. This task creates an isolated worktree and branch for Phase 1 implementation.

- [ ] **Step 1: Verify current branch and clean working tree**

```bash
git status --short
git branch --show-current
```

Expected: working tree has no unrelated uncommitted changes that would be mixed into Phase 1. If unrelated changes exist, stop and ask the user whether to stash, commit separately, or choose a different base branch.

- [ ] **Step 2: Create a Phase 1 worktree from dev**

```bash
git fetch origin
git switch dev
git pull --ff-only
git worktree add ../HRBP-career-skills-phase1 -b feature/career-skills-marketplace-phase1
cd ../HRBP-career-skills-phase1
```

Expected: new worktree exists on branch `feature/career-skills-marketplace-phase1` and the shell is now inside it.

- [ ] **Step 3: Confirm the plan and handoff docs are visible in the worktree**

```bash
test -f docs/superpowers/plans/2026-05-26-career-skills-marketplace-phase1.md
test -f docs/codex-handoff/career-skills-phase1-decisions.md
test -f docs/codex-handoff/career-skills-marketplace-implementation-constraints.md
```

Expected: all three commands exit 0.

- [ ] **Step 4: Commit nothing in Task 0**

Task 0 is environment setup only. Do not commit worktree creation metadata.

---

## File Structure

```
career-skills-marketplace/
├── marketplace.yaml
├── README.md
├── README.zh-CN.md
├── LICENSE
├── LICENSE-KNOWLEDGE
├── install.sh
├── install.ps1
├── CONTRIBUTING.md
├── SECURITY.md
│
├── skills/
│   ├── career-principal/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── input_schema.json
│   │   ├── output_schema.json
│   │   ├── README.md
│   │   ├── references/
│   │   │   ├── intent-router.yaml
│   │   │   ├── orchestration-rules.md
│   │   │   └──追问策略.md
│   │   ├── examples/
│   │   │   ├── happy-path.md
│   │   │   ├── low-evidence.md
│   │   │   ├── bad-input.md
│   │   │   └── source-conflict.md
│   │   └── tests/
│   │       ├── happy-path.json
│   │       ├── low-evidence.json
│   │       ├── bad-input.json
│   │       ├── source-conflict.json
│   │       └── hallucination-guard.json
│   │
│   ├── profile-builder/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── input_schema.json
│   │   ├── output_schema.json
│   │   ├── README.md
│   │   ├── examples/ (4 files)
│   │   └── tests/ (5 files)
│   │
│   ├── jd-analyzer/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── input_schema.json
│   │   ├── output_schema.json
│   │   ├── README.md
│   │   ├── references/
│   │   │   └── jd-risk-signals.md
│   │   ├── examples/ (4 files)
│   │   └── tests/ (5 files)
│   │
│   ├── resume-tailor/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── input_schema.json
│   │   ├── output_schema.json
│   │   ├── README.md
│   │   ├── references/
│   │   │   └── zero-fabrication-policy.md
│   │   ├── examples/ (4 files)
│   │   └── tests/ (5 files)
│   │
│   ├── match-diagnosis/
│   │   ├── SKILL.md
│   │   ├── contract.yaml
│   │   ├── input_schema.json
│   │   ├── output_schema.json
│   │   ├── README.md
│   │   ├── examples/ (4 files)
│   │   └── tests/ (5 files)
│   │
│   └── source-quality-auditor/
│       ├── SKILL.md
│       ├── contract.yaml
│       ├── input_schema.json
│       ├── output_schema.json
│       ├── README.md
│       ├── references/
│       │   ├── source-grading-policy.md
│       │   └── freshness-rules.md
│       ├── examples/ (4 files)
│       └── tests/ (5 files)
│
├── shared/
│   ├── evidence-schema/
│   │   └── evidence.schema.json
│   ├── output-schema/
│   │   └── skill-output-base.schema.json
│   ├── source-policy/
│   │   ├── grading-policy.yaml
│   │   └── freshness-rules.yaml
│   ├── confidence-policy/
│   │   └── confidence-levels.yaml
│   └── rubrics/
│       ├── resume-rubric.yaml
│       ├── jd-rubric.yaml
│       └── match-rubric.yaml
│
├── knowledge/
│   ├── company-taxonomy/
│   │   ├── companies.seed.yaml
│   │   ├── company-types.yaml
│   │   └── aliases.yaml
│   ├── role-taxonomy/
│   │   ├── roles.yaml
│   │   └── role-categories.yaml
│   ├── market-vocabulary/
│   │   └── china-job-search-terms.yaml
│   └── rubrics/
│       ├── resume-scoring.md
│       ├── jd-parsing.md
│       ├── offer-comparison.md
│       └── source-quality-policy.md
│
├── evals/
│   ├── README.md
│   └── workflow/
│       ├── jd-match-resume-chain.json
│       ├── profile-to-career-path.json
│       ├── jd-too-short.json
│       ├── fabrication-refused.json
│       ├── source-conflict-propagation.json
│       ├── low-quality-source-filtered.json
│       ├── no-adapters-degradation.json
│       ├── china-market-case.json
│       ├── cross-language-jd-resume.json
│       └── unethical-request-refused.json
│
└── docs/
    ├── installation.md
    ├── usage-examples.md
    ├── privacy-policy.md
    └── contribution-guide.md
```

**Total files: ~95**

---

## Task 1: Root Structure + Manifest + Licenses

**Subagent boundary: A — independent, no dependencies**

**Files:**
- Create: `career-skills-marketplace/marketplace.yaml`
- Create: `career-skills-marketplace/LICENSE`
- Create: `career-skills-marketplace/LICENSE-KNOWLEDGE`
- Create: `career-skills-marketplace/CONTRIBUTING.md`
- Create: `career-skills-marketplace/SECURITY.md`

- [ ] **Step 1: Create root directory**

```bash
mkdir -p career-skills-marketplace
```

- [ ] **Step 2: Create marketplace.yaml**

```yaml
# career-skills-marketplace/marketplace.yaml
name: career-skills-marketplace
version: "1.0.0"
description: "求职主理人 + 可调用 skill 的半自动求职操作系统"
author: "Career Skills Community"
license: "MIT (code) / CC BY 4.0 (knowledge)"
language: "zh-CN"
min_environment: "Claude Code / Codex / any SKILL.md compatible agent"

skills:
  - name: career-principal
    path: skills/career-principal
    role: orchestrator
    description: "求职主理人：意图识别 + skill 编排 + 结果汇总"

  - name: profile-builder
    path: skills/profile-builder
    role: worker
    description: "用户画像构建：从简历/对话中提取结构化能力画像"

  - name: jd-analyzer
    path: skills/jd-analyzer
    role: worker
    description: "JD 分析：解析职位描述为结构化字段 + 风险信号"

  - name: resume-tailor
    path: skills/resume-tailor
    role: worker
    description: "简历改写：基于 JD 重组简历表达，不编造经历"

  - name: match-diagnosis
    path: skills/match-diagnosis
    role: worker
    description: "匹配诊断：对比画像和 JD，输出多维匹配度"

  - name: source-quality-auditor
    path: skills/source-quality-auditor
    role: worker
    description: "来源质量审计：评估信息来源的可信度和时效性"

shared:
  evidence_schema: shared/evidence-schema/evidence.schema.json
  output_schema: shared/output-schema/skill-output-base.schema.json
  source_policy: shared/source-policy/
  confidence_policy: shared/confidence-policy/
  rubrics: shared/rubrics/

knowledge:
  company_taxonomy: knowledge/company-taxonomy/
  role_taxonomy: knowledge/role-taxonomy/
  market_vocabulary: knowledge/market-vocabulary/
  rubrics: knowledge/rubrics/

knowledge_stats:
  companies: 50
  company_stage: "A (seed)"
  role_categories: 12
  market_terms: 18
```

- [ ] **Step 3: Create MIT LICENSE for code**

```
career-skills-marketplace/LICENSE
```

Standard MIT License text with `Copyright (c) 2026 Career Skills Community`.

- [ ] **Step 4: Create CC BY 4.0 LICENSE-KNOWLEDGE**

```
career-skills-marketplace/LICENSE-KNOWLEDGE
```

Text:
```
Knowledge Data License — Creative Commons Attribution 4.0 International (CC BY 4.0)

Files covered: everything under knowledge/ and shared/rubrics/

You are free to:
- Share — copy and redistribute the material
- Adapt — remix, transform, and build upon the material

Under the following terms:
- Attribution — give appropriate credit and indicate if changes were made

Full license: https://creativecommons.org/licenses/by/4.0/legalcode
```

- [ ] **Step 5: Create CONTRIBUTING.md**

Content must include:
- How to submit PR (skill / company data / rubric / eval)
- The contribution checklist (from implementation-constraints.md Section 10)
- Data contribution red lines (no real resumes, no copyrighted full text, no unsourced salary data)
- Review process

- [ ] **Step 6: Create SECURITY.md**

Content:
- API keys never in git
- .evidence/ in .gitignore
- User data never uploaded
- How to report vulnerabilities

- [ ] **Step 7: Verify manifest parses**

Run: `python -c "import yaml; yaml.safe_load(open('career-skills-marketplace/marketplace.yaml'))"`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add career-skills-marketplace/marketplace.yaml career-skills-marketplace/LICENSE career-skills-marketplace/LICENSE-KNOWLEDGE career-skills-marketplace/CONTRIBUTING.md career-skills-marketplace/SECURITY.md
git commit -m "feat: marketplace root structure + manifest + licenses"
```

---

## Task 2: Shared Schemas + Policies + Rubrics

**Subagent boundary: B — independent, no dependencies on other tasks**

**Files:**
- Create: `career-skills-marketplace/shared/evidence-schema/evidence.schema.json`
- Create: `career-skills-marketplace/shared/output-schema/skill-output-base.schema.json`
- Create: `career-skills-marketplace/shared/source-policy/grading-policy.yaml`
- Create: `career-skills-marketplace/shared/source-policy/freshness-rules.yaml`
- Create: `career-skills-marketplace/shared/confidence-policy/confidence-levels.yaml`
- Create: `career-skills-marketplace/shared/rubrics/resume-rubric.yaml`
- Create: `career-skills-marketplace/shared/rubrics/jd-rubric.yaml`
- Create: `career-skills-marketplace/shared/rubrics/match-rubric.yaml`

- [ ] **Step 1: Create evidence.schema.json**

Full JSON Schema defining the `SkillEvidence` structure from the design audit (Section 5.3):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SkillEvidence",
  "description": "Career Skills Marketplace 共享证据结构",
  "type": "object",
  "required": ["evidence_id", "source_type", "source_name", "content_excerpt", "observed_at", "freshness", "confidence", "relevance", "reason"],
  "properties": {
    "evidence_id": { "type": "string", "pattern": "^ev_" },
    "source_type": {
      "type": "string",
      "enum": ["user_resume", "user_input", "jd_text", "jd_url", "knowledge_graph", "web_search", "xhs", "nowcoder", "wechat", "ai_inference", "peer_review"]
    },
    "source_name": { "type": "string" },
    "source_url": { "type": ["string", "null"] },
    "content_excerpt": { "type": "string", "maxLength": 500 },
    "observed_at": { "type": "string", "format": "date-time" },
    "published_at": { "type": ["string", "null"], "format": "date-time" },
    "freshness": { "type": "string", "enum": ["current", "recent", "stale"] },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
    "relevance": { "type": "string" },
    "market": { "type": "string", "enum": ["china", "global"], "default": "china" },
    "reason": { "type": "string" },
    "limitations": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 2: Create skill-output-base.schema.json**

All skill outputs must include these base fields (from implementation-constraints Section 7):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SkillOutputBase",
  "description": "所有 skill 输出的通用基础字段",
  "type": "object",
  "required": ["skill_name", "skill_version", "summary", "confidence", "evidence_used", "recommendations", "risks", "cannot_determine"],
  "properties": {
    "skill_name": { "type": "string" },
    "skill_version": { "type": "string" },
    "summary": { "type": "string", "description": "一句话结论" },
    "confidence": { "type": "string", "enum": ["high", "medium", "low", "insufficient"] },
    "evidence_used": {
      "type": "array",
      "items": { "$ref": "file:../evidence-schema/evidence.schema.json" }
    },
    "recommendations": { "type": "array", "items": { "type": "string" } },
    "risks": { "type": "array", "items": { "type": "string" } },
    "next_actions": { "type": "array", "items": { "type": "string" } },
    "follow_up_questions": { "type": "array", "items": { "type": "string" } },
    "cannot_determine": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 3: Create grading-policy.yaml**

Source grading policy (from design audit Section 8.2):

```yaml
# shared/source-policy/grading-policy.yaml
grades:
  A:
    definition: "官方/权威/高质量原帖"
    examples:
      - "企业官网招聘页"
      - "人社部文件"
      - "用户原始简历"
      - "校就业中心"
    confidence_ceiling: high

  B:
    definition: "有用但需交叉验证"
    examples:
      - "牛客面经（有具体技术细节）"
      - "Boss直聘/猎聘 JD"
      - "超级简历/WonderCV 方法论"
    confidence_ceiling: high

  C:
    definition: "低质线索"
    examples:
      - "脉脉匿名区"
      - "小红书面经（混杂推广）"
      - "知乎（时效差异大）"
      - "公众号（质量参差）"
    confidence_ceiling: medium

  D:
    definition: "不采用"
    examples:
      - "未认证群聊"
      - "短视频评论'内推'"
      - "培训贷引流"
      - "'保offer'收费服务"
    confidence_ceiling: null
    action: discard

rules:
  - "少于 2 个 B+ 来源不给 high confidence 结论"
  - "D 级来源一律丢弃，不展示"
  - "多源冲突不自行裁决，标注 conflict"
  - "薪资/offer 数据必须有年份+城市+岗位+来源"
  - "小红书只能当用户之声，不能单独当薪资事实"
  - "牛客偏技术面经，不代表全部岗位"
  - "旧帖不能当当前趋势"
```

- [ ] **Step 4: Create freshness-rules.yaml**

```yaml
# shared/source-policy/freshness-rules.yaml
freshness_thresholds:
  current: "< 7 days since observed_at"
  recent: "7-30 days"
  stale: "> 30 days"

content_type_expiry:
  面试笔试题: { max_age_months: 6, reason: "题库每季度更新" }
  面试流程: { max_age_months: 12, reason: "组织架构变化" }
  薪资数据: { max_age_months: 12, reason: "每届校招调整", required_labels: ["year", "city", "role"] }
  岗位分类: { max_age_years: 3, reason: "新兴岗位出现" }
  校招时间线: { max_age_months: 12, reason: "每年微调" }
  公司分类: { max_age_years: 5, reason: "格局相对稳定" }
  JD黑话: { max_age_years: 3, reason: "表述变化缓慢" }
  招聘风险信号: { max_age_years: 5, reason: "骗术套路相对固定" }

rules:
  - "无日期标注的薪资数据 grade 降为 C"
  - "过期内容标注 stale，不作为当前趋势使用"
  - "旧内容可保留供历史参考，但必须标注年份"
```

- [ ] **Step 5: Create confidence-levels.yaml**

```yaml
# shared/confidence-policy/confidence-levels.yaml
levels:
  high:
    definition: "结论有充分证据支撑，可直接用于决策"
    conditions:
      - "所有关键字段有明确来源"
      - "来源等级 >= B"
      - "数据时效 < 30天"

  medium:
    definition: "结论有部分证据，需用户补充或交叉验证"
    conditions:
      - "部分字段缺失或为推断"
      - "来源等级含 C 级"
      - "数据时效 30-180天"

  low:
    definition: "结论仅为初步判断，不建议直接用于决策"
    conditions:
      - "多数字段为推断"
      - "来源等级多为 C/D"
      - "数据时效 > 180天"

  insufficient:
    definition: "证据不足以做出任何判断"
    conditions:
      - "关键输入缺失"
      - "来源不可用"
      - "无法提取有效信息"
    required_output: "列出需要补充什么 + 建议下一步"

calibration:
  - "整体 confidence 取所有维度中最低的（木桶原则）"
  - "insufficient 必须附带需要补充什么的具体清单"
  - "禁止所有用户都得 medium（必须有区分度）"
```

- [ ] **Step 6: Create resume-rubric.yaml**

Resume scoring rubric with dimensions and weights. Content from design audit Section 7.4 and Subagent F research.

- [ ] **Step 7: Create jd-rubric.yaml**

JD parsing rubric: explicit requirements extraction rules, implicit requirement inference rules, risk signal recognition rules. Content from design audit Section 7.3.

- [ ] **Step 8: Create match-rubric.yaml**

Match scoring rubric with 5 dimensions (skills 30%, experience 25%, education 15%, role 15%, constraints 15%) and calibration rules. Content from design audit Section 7.5.

- [ ] **Step 9: Validate all YAML/JSON files parse correctly**

```bash
cd career-skills-marketplace
python -c "
import json, yaml, glob
for f in glob.glob('shared/**/*.json', recursive=True):
    json.load(open(f))
    print(f'OK: {f}')
for f in glob.glob('shared/**/*.yaml', recursive=True):
    yaml.safe_load(open(f))
    print(f'OK: {f}')
"
```

Expected: All files parse without errors.

- [ ] **Step 10: Commit**

```bash
git add career-skills-marketplace/shared/
git commit -m "feat: shared evidence schema, source policy, confidence policy, rubrics"
```

---

## Task 3: Career Principal Skill

**Subagent boundary: C — depends on Task 2 (shared schemas) for reference, but can be written in parallel**

**Files:**
- Create: `career-skills-marketplace/skills/career-principal/SKILL.md`
- Create: `career-skills-marketplace/skills/career-principal/contract.yaml`
- Create: `career-skills-marketplace/skills/career-principal/input_schema.json`
- Create: `career-skills-marketplace/skills/career-principal/output_schema.json`
- Create: `career-skills-marketplace/skills/career-principal/README.md`
- Create: `career-skills-marketplace/skills/career-principal/references/intent-router.yaml`
- Create: `career-skills-marketplace/skills/career-principal/references/orchestration-rules.md`
- Create: `career-skills-marketplace/skills/career-principal/references/追问策略.md`
- Create: 4 example files + 5 test fixture files

- [ ] **Step 1: Create SKILL.md**

This is the most critical file — the entry point for the entire marketplace. Must include:

```yaml
---
name: career-principal
description: >
  求职主理人。当用户提到求职、简历、JD、面试、offer、职业规划、
  公司评估等话题时触发。理解用户意图后调度对应的 skill 组合，
  追问缺失信息，汇总多 skill 输出为结构化结论。
allowed-tools:
  - Read
  - Grep
  - Glob
---
```

Markdown body must include:
- 角色定义（求职主理人，不是通用聊天机器人）
- 意图识别规则（reference intent-router.yaml）
- 编排流程（调度哪些 sub-skill、按什么顺序）
- 追问策略（缺什么信息、怎么问）
- 失败处理（某个 skill 不可用/失败时）
- 证据要求（每个结论必须有 evidence）
- 禁止事项（不编造市场事实、不假装联网）
- 输出格式（统一 base schema + 汇总规则）
- 置信度策略（取所有 sub-skill 最低值）
- 知识图谱使用（如何 Read knowledge/ 目录获取公司/岗位/信号信息）

Content source: design audit Section 5.1 + implementation-constraints Section 2.

- [ ] **Step 2: Create contract.yaml**

```yaml
name: career-principal
version: "1.0.0"
purpose: "理解用户求职意图，编排调用对应 skill，汇总结构化结论"
role: orchestrator

when_to_use:
  - "用户提到求职、简历、JD、面试、offer、公司、薪资、职业规划"
  - "用户直接请求求职帮助"
  - "用户粘贴了 JD 或简历文本"

when_not_to_use:
  - "与求职完全无关的话题（如编程、写文章、翻译）"
  - "用户明确指定了要调用的具体 skill"

inputs_required:
  user_message:
    type: string
    description: "用户的自然语言消息"

optional_context:
  resume_text: { type: string, description: "用户简历文本" }
  jd_text: { type: string, description: "JD 原文" }
  user_profile: { type: object, description: "已构建的用户画像" }

sub_skills:
  - profile-builder
  - jd-analyzer
  - resume-tailor
  - match-diagnosis
  - source-quality-auditor

evidence_required:
  - "每个结论必须可追溯到 evidence"
  - "涉及市场事实必须经过 source-quality-auditor"
  - "知识图谱引用必须标注来源路径"

tools_allowed:
  - Read
  - Grep
  - Glob

output_schema: "./output_schema.json"

confidence_policy:
  rule: "取所有 sub-skill confidence 中最低值"
  insufficient_behavior: "列出缺失信息 + 建议补充方向"

failure_modes:
  - sub_skill_unavailable: "降级到可用 skill + 知识图谱查询"
  - insufficient_input: "追问缺失信息（最多3轮）"
  - out_of_scope: "明确拒绝 + 建议其他方向"
  - all_skills_fail: "诚实告知无法完成分析"
```

- [ ] **Step 3: Create input_schema.json**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CareerPrincipalInput",
  "type": "object",
  "required": ["user_message"],
  "properties": {
    "user_message": { "type": "string", "minLength": 1 },
    "resume_text": { "type": "string" },
    "jd_text": { "type": "string" },
    "user_profile": { "type": "object" }
  }
}
```

- [ ] **Step 4: Create output_schema.json**

Extends skill-output-base with orchestration-specific fields:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CareerPrincipalOutput",
  "allOf": [{ "$ref": "file:../../shared/output-schema/skill-output-base.schema.json" }],
  "properties": {
    "intent_detected": { "type": "string" },
    "skills_invoked": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "skill_name": { "type": "string" },
          "status": { "type": "string", "enum": ["success", "partial", "failed", "skipped"] },
          "result_summary": { "type": "string" }
        }
      }
    },
    "aggregated_result": { "type": "object" },
    "missing_information": { "type": "array", "items": { "type": "string" } }
  }
}
```

- [ ] **Step 5: Create references/intent-router.yaml**

Full intent routing table — the 12 intents from the roadmap (chapter 2) with trigger_examples, required_inputs, missing_input_questions, primary_skill, secondary_skills, evidence_needed, confidence_gate, fallback.

Content source: implementation-constraints Section 2 (the complete intent router schema).

- [ ] **Step 6: Create references/orchestration-rules.md**

Rules for how to call sub-skills: dependency order (profile-builder before match-diagnosis), when to call source-quality-auditor (any market fact), how to aggregate outputs.

- [ ] **Step 7: Create references/追问策略.md**

Questioning strategy: what to ask when info is missing, max 3 rounds, escalation to "insufficient" after 3 rounds.

- [ ] **Step 8: Create README.md**

Human-readable documentation: what this skill does, how it routes intents, what sub-skills it calls, limitations.

- [ ] **Step 9: Create 4 example files**

Each example is a complete input → skills invoked → output flow:
- `examples/happy-path.md`: 用户提供 JD + 简历 → 完整闭环分析
- `examples/low-evidence.md`: 用户只说了公司名 → 追问 → 部分分析 (confidence: low)
- `examples/bad-input.md`: 用户问"帮我炒股" → 拒绝 (out_of_scope)
- `examples/source-conflict.md`: JD 来源与知识图谱冲突 → 标注冲突不裁决

- [ ] **Step 10: Create 5 test fixture files**

Each test fixture is JSON with `input`, `expected_properties`, `assertions`:

```json
// tests/happy-path.json
{
  "name": "完整 JD + 简历分析",
  "input": {
    "user_message": "帮我看这个 JD 值不值得投，这是我的简历",
    "jd_text": "[200字以上的字节后端JD]",
    "resume_text": "[200字以上的后端简历]"
  },
  "expected_properties": {
    "intent_detected": "analyze_jd",
    "skills_invoked_contains": ["jd-analyzer", "profile-builder", "match-diagnosis"],
    "confidence_not": "insufficient",
    "summary_min_length": 50,
    "evidence_used_min_count": 2,
    "cannot_determine_includes_if_missing_salary": true
  },
  "assertions": [
    "output.summary is not empty",
    "output.confidence is one of [high, medium, low]",
    "output.evidence_used has at least 2 items",
    "output.skills_invoked includes jd-analyzer"
  ]
}
```

Similar fixtures for: low-evidence, bad-input, source-conflict, hallucination-guard.

- [ ] **Step 11: Commit**

```bash
git add career-skills-marketplace/skills/career-principal/
git commit -m "feat: career-principal skill with intent router and orchestration rules"
```

---

## Task 4: profile-builder + jd-analyzer Skills

**Subagent boundary: D — can run in parallel with Tasks 3, 5, 6**

**Files:** 2 complete skill directories (same structure each)

- [ ] **Step 1: Create profile-builder SKILL.md**

Frontmatter:
```yaml
---
name: profile-builder
description: >
  用户画像构建。当需要了解用户背景、解析简历、构建能力画像时触发。
  从简历文本或用户对话中提取结构化画像，每个字段标注 evidence 来源。
allowed-tools:
  - Read
  - Grep
---
```

Body: 画像提取规则、维度（basic/skills/experience/strengths/weaknesses/constraints/career_intent）、evidence 标注要求、不编造不贴标签规则、来源冲突处理。

Content source: design audit Section 7.2.

- [ ] **Step 2: Create profile-builder contract.yaml**

when_to_use, when_not_to_use, inputs_required (resume_text or user_background), output_schema, confidence_policy, failure_modes.

- [ ] **Step 3: Create profile-builder input_schema.json**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ProfileBuilderInput",
  "type": "object",
  "anyOf": [
    { "required": ["resume_text"] },
    { "required": ["user_background"] }
  ],
  "properties": {
    "resume_text": { "type": "string", "minLength": 30 },
    "user_background": { "type": "string", "minLength": 20 },
    "existing_profile": { "type": "object" }
  }
}
```

- [ ] **Step 4: Create profile-builder output_schema.json**

Extends skill-output-base. Adds `profile` object with: basic, skills (technical/soft/languages each with evidence_source), experience[], strengths[], weaknesses[], constraints, career_intent. Each field nullable with evidence tracking.

- [ ] **Step 5: Create profile-builder README.md, 4 examples, 5 test fixtures**

Examples: complete resume → full profile; minimal resume → sparse profile + low confidence; non-resume input → error; sources conflict → conflict markers.

Test fixtures: happy-path (full resume), low-evidence (minimal data), bad-input (not a resume), source-conflict (contradictory experience), hallucination-guard (only Java skills, must not infer Python).

- [ ] **Step 6: Commit profile-builder**

```bash
git add career-skills-marketplace/skills/profile-builder/
git commit -m "feat: profile-builder skill with evidence-tracked user profiles"
```

- [ ] **Step 7: Create jd-analyzer SKILL.md**

Frontmatter:
```yaml
---
name: jd-analyzer
description: >
  JD 结构化分析。当用户粘贴职位描述、问"这个 JD 怎么样"、
  "值不值得投"、"岗位要求是什么"时触发。
  解析显性/隐性要求，识别风险信号和中国求职黑话。
allowed-tools:
  - Read
  - Grep
---
```

Body: JD 解析规则、字段提取（basic/requirements/risk_signals/responsibilities/benefits/company_context）、隐性要求推断规则、风险信号识别（reference jd-risk-signals.md）、知识图谱查询规则、中国市场术语理解。

Content source: design audit Section 7.3.

- [ ] **Step 8: Create jd-analyzer contract.yaml**

inputs_required: jd_text (string, min_length 20). optional_context: user_profile, market_context. confidence_policy: high (>=200字) / medium (100-200字) / low (<100字) / insufficient (not JD).

- [ ] **Step 9: Create jd-analyzer input/output schemas**

Input: jd_text required, user_profile optional.
Output: extends base with `parsed_jd` (basic fields, requirements explicit/implicit, risk_signals[], responsibilities[], benefits[], company_context).

- [ ] **Step 10: Create jd-analyzer references/jd-risk-signals.md**

The complete JD blacklist/risk signal mapping table from Subagent F research (12+ signals like "抗压能力强" → 长期加班).

- [ ] **Step 11: Create jd-analyzer README.md, 4 examples, 5 test fixtures**

Examples: complete JD → full parse; ultra-short JD → low confidence; not-a-JD → error; JD internal contradiction → warning.

Test fixtures: happy-path (standard JD), low-evidence (short JD), bad-input (news article), source-conflict (title vs requirements mismatch), hallucination-guard (no salary in JD → salary_range must be null).

- [ ] **Step 12: Commit jd-analyzer**

```bash
git add career-skills-marketplace/skills/jd-analyzer/
git commit -m "feat: jd-analyzer skill with risk signals and China market context"
```

---

## Task 5: resume-tailor + match-diagnosis Skills

**Subagent boundary: E — can run in parallel with Tasks 3, 4, 6**

**Files:** 2 complete skill directories

- [ ] **Step 1: Create resume-tailor SKILL.md**

Frontmatter:
```yaml
---
name: resume-tailor
description: >
  简历改写。基于用户画像和目标 JD，重组简历表达以提高匹配度。
  核心原则：只重组表达，不编造经历。每处修改标注原文、改写内容、修改理由和 fabrication_check。
allowed-tools:
  - Read
  - Grep
---
```

Body: zero-fabrication policy, modification output format (original/modified/reason/source/fabrication_check), evidence chain preservation, Chinese resume conventions, when to refuse (user asks to fabricate).

Content source: design audit Section 7.4.

- [ ] **Step 2: Create resume-tailor contract.yaml, schemas, references/zero-fabrication-policy.md**

Input: requires profile or resume_text + jd_text. Output: extends base with `modifications[]` (section, original, modified, reason, fabrication_check) and `improvement_summary`.

zero-fabrication-policy.md: the 4 rules (every sentence traceable, no adding "提升50%", can reorder/emphasize, cannot add unmentioned experience).

- [ ] **Step 3: Create resume-tailor examples + test fixtures**

Examples: targeted rewrite; background mismatch → honest assessment; no JD → generic optimization; user asks to fabricate → refused.

Test fixtures: happy-path, low-evidence (sparse profile), bad-input (asks to fabricate), source-conflict (profile data conflicts), hallucination-guard (only mentioned Java → must not add Python skills).

- [ ] **Step 4: Commit resume-tailor**

```bash
git add career-skills-marketplace/skills/resume-tailor/
git commit -m "feat: resume-tailor skill with zero-fabrication policy"
```

- [ ] **Step 5: Create match-diagnosis SKILL.md**

Frontmatter:
```yaml
---
name: match-diagnosis
description: >
  匹配诊断。对比用户画像和 JD 要求，输出多维匹配度评分、差距分析和补强建议。
  分数必须有区分度，禁止所有用户都得 60-80%。
allowed-tools:
  - Read
  - Grep
---
```

Body: 5 dimensions (skills 30%, experience 25%, education 15%, role 15%, constraints 15%), scoring calibration (>85% perfect, <25% no match), gap classification (quick fix / needs time / hard mismatch / uncertain), confidence rules.

Content source: design audit Section 7.5.

- [ ] **Step 6: Create match-diagnosis contract.yaml, schemas**

Input: requires both user_profile and jd_analysis. Output: extends base with `match_result` (overall_match_pct, dimension_scores[], strengths[], weaknesses[], gap_classification[], improvement_suggestions[]).

- [ ] **Step 7: Create match-diagnosis examples + test fixtures**

Examples: high match (85%+); low match (<25%); partial data → medium confidence; one-sided data only.

Test fixtures: happy-path (both inputs complete), low-evidence (profile missing skills), bad-input (missing one input entirely), source-conflict (profile contradicts itself), hallucination-guard (no Python skill → must not score Python match positively).

- [ ] **Step 8: Commit match-diagnosis**

```bash
git add career-skills-marketplace/skills/match-diagnosis/
git commit -m "feat: match-diagnosis skill with calibrated scoring"
```

---

## Task 6: source-quality-auditor Skill

**Subagent boundary: F — can run in parallel with Tasks 3, 4, 5**

**Files:** Complete skill directory with references/source-grading-policy.md and references/freshness-rules.md

- [ ] **Step 1: Create SKILL.md**

Frontmatter:
```yaml
---
name: source-quality-auditor
description: >
  来源质量审计。评估信息来源的可信度、时效性和中国市场适配度。
  对每条证据给出 grade (A/B/C/D)、freshness 和 verification_status。
  被所有涉及外部事实判断的 skill 引用。
allowed-tools:
  - Read
  - Grep
---
```

Body: source grading rules (reference grading-policy.yaml), freshness evaluation (reference freshness-rules.yaml), China platform identification, multi-source conflict detection, verification status, garbage source identification.

Content source: design audit Section 7.6 + implementation-constraints Section 6.

- [ ] **Step 2: Create contract.yaml**

when_to_use: any skill needs to verify external facts, market claims, salary data, company information. when_not_to_use: user's own resume data (grade A by default).

Input: sources to audit (array of { source_type, source_url, content, platform, date }). Output: extends base with `audit_results[]` (grade, freshness, verification_status, issues[], recommendation).

- [ ] **Step 3: Create schemas + references**

references/source-grading-policy.md: detailed platform-by-platform grading rules (牛客 B, 小红书 C, 脉脉 C, 企业官网 A, etc.).

references/freshness-rules.md: content-type-specific expiry rules.

- [ ] **Step 4: Create examples + test fixtures**

Examples: multi-source audit → mixed grades; expired source → stale warning; D-grade source → discarded; sources conflict → flagged.

Test fixtures: happy-path (valid B+ sources), low-evidence (only verbal source), bad-input (invalid URLs), source-conflict (two sources disagree), hallucination-guard (unreachable URL must not be claimed "verified").

- [ ] **Step 5: Commit**

```bash
git add career-skills-marketplace/skills/source-quality-auditor/
git commit -m "feat: source-quality-auditor skill with China platform grading"
```

---

## Task 7: Knowledge Graph Seed (50 Companies)

**Subagent boundary: G — independent, can run in parallel with all skill tasks**

**Files:**
- Create: `career-skills-marketplace/knowledge/company-taxonomy/companies.seed.yaml`
- Create: `career-skills-marketplace/knowledge/company-taxonomy/company-types.yaml`
- Create: `career-skills-marketplace/knowledge/company-taxonomy/aliases.yaml`
- Create: `career-skills-marketplace/knowledge/role-taxonomy/roles.yaml`
- Create: `career-skills-marketplace/knowledge/role-taxonomy/role-categories.yaml`
- Create: `career-skills-marketplace/knowledge/market-vocabulary/china-job-search-terms.yaml`
- Create: `career-skills-marketplace/knowledge/rubrics/resume-scoring.md`
- Create: `career-skills-marketplace/knowledge/rubrics/jd-parsing.md`
- Create: `career-skills-marketplace/knowledge/rubrics/offer-comparison.md`
- Create: `career-skills-marketplace/knowledge/rubrics/source-quality-policy.md`

- [ ] **Step 1: Create company-types.yaml**

```yaml
# knowledge/company-taxonomy/company-types.yaml
types:
  - id: internet_big_tech
    name: "互联网大厂"
    description: "中国头部互联网公司，员工万人以上，薪资竞争力强"
    characteristics: ["高薪高压", "品牌背书强", "分工细", "996常见"]
    salary_range: "30-70W应届"
    stability: "裁员风险存在（35岁危机）"

  - id: stable_mid_tech
    name: "稳定中厂"
    description: "有竞争力的中型互联网/科技公司"
    characteristics: ["薪资竞争力强", "部分赛道式增长", "大小周或995"]
    salary_range: "25-50W应届"
    stability: "中等"

  - id: foreign_enterprise
    name: "外企"
    description: "跨国公司中国岗位"
    characteristics: ["WLB真实", "培训完善", "晋升路径透明", "年假15+天"]
    salary_range: "20-50W应届（含股票）"
    stability: "全球裁员波及但赔偿高"

  - id: state_owned
    name: "国企/央企"
    description: "国有企业和央企"
    characteristics: ["高稳定低天花板", "户口指标", "朝九晚五"]
    salary_range: "15-30W应届（福利占比高）"
    stability: "近乎铁饭碗"

  - id: startup
    name: "初创公司"
    description: "A轮及以下，50人以下"
    characteristics: ["期权暴富可能", "一人多岗", "加班严重", "无培训体系"]
    salary_range: "差异极大"
    stability: "高风险"

  - id: ai_startup
    name: "AI初创"
    description: "大模型/AI相关初创公司"
    characteristics: ["技术前沿", "融资活跃", "不确定性高"]

  - id: new_energy
    name: "新能源/硬科技"
    description: "新能源汽车、半导体、智能制造"

  - id: finance
    name: "金融/券商/银行"
    description: "金融机构"

  - id: consulting_fmcg
    name: "咨询/快消/四大"
    description: "专业服务和消费品公司"

  - id: overseas
    name: "出海公司"
    description: "中国出海企业"

  - id: gaming_content
    name: "游戏/内容/文娱"
    description: "游戏、视频、内容平台"

  - id: ecommerce_local
    name: "电商/本地生活"
    description: "电商和本地生活服务"
```

- [ ] **Step 2: Create companies.seed.yaml — 50 companies**

50 companies distributed by type following the roadmap allocation (8 big tech + 10 mid + 6 AI/hardware + 6 foreign + 4 finance + 4 state + 4 consulting + 3 overseas + 2 gaming + 2 ecommerce + 1 new energy). Each company with: id, name, aliases, type, business_lines, common_roles, interview_style (summary), source_confidence, freshness, last_verified.

Company list:
- Big tech (8): alibaba, tencent, bytedance, meituan, pinduoduo, jd, baidu, kuaishou
- Mid (10): xiaohongshu, dewu, bilibili, dji, nio, mihoyo, netease, ctrip, shopee-cn, honor
- AI/Hardware (6): moonshot, zhipu, baichuan, ningde, byd, huawei
- Foreign (6): microsoft-cn, google-cn, amazon-cn, apple-cn, sap-cn, oracle-cn
- Finance (4): cicc, citic, cmb, pingan
- State (4): china-mobile, state-grid, china-tobacco, china-railway
- Consulting/FMCG (4): mckinsey-cn, pwc-cn, pg-cn, deloitte-cn
- Overseas (3): shein, tiktok-global, temu
- Gaming (2): lilith, papergames
- Ecommerce (2): meituan-local, sf-express

- [ ] **Step 3: Create aliases.yaml**

Alias mapping for fuzzy matching:
```yaml
aliases:
  tencent: ["腾讯", "Tencent", "鹅厂", "WXG", "IEG", "PCG", "CSIG"]
  bytedance: ["字节跳动", "ByteDance", "字节", "今日头条", "抖音"]
  # ... all 50 companies
```

- [ ] **Step 4: Create role-categories.yaml + roles.yaml**

12 role categories with sub-roles:
```yaml
categories:
  - id: tech
    name: "技术研发"
    sub_roles: [backend, frontend, mobile, algorithm, test, devops, security, fullstack, architect, llm-engineer]
  - id: product
    name: "产品"
    sub_roles: [pm-c, pm-b, pm-strategy, pm-commercialization, pm-data]
  # ... 10 more categories
```

roles.yaml: detailed node for each sub-role with typical_requirements, hidden_preferences, interview_focus, resume_keywords, common_red_flags. At least the 15 most common roles in full detail.

- [ ] **Step 5: Create china-job-search-terms.yaml**

18 terms from the roadmap Section 3 (泡池子, 开奖, HC, base, 背调, OD, 外包, 实习转正, 提前批, 秋招, 春招, 笔试, 群面, 业务面, HR面, 三方协议, 白菜价, SP/SSP). Each with meaning, risk, when_it_matters, example.

- [ ] **Step 6: Create 4 knowledge rubrics**

resume-scoring.md, jd-parsing.md, offer-comparison.md, source-quality-policy.md — detailed evaluation rules in Markdown. Content from design audit and Subagent F research.

- [ ] **Step 7: Validate all YAML files**

```bash
cd career-skills-marketplace
python -c "
import yaml, glob
for f in glob.glob('knowledge/**/*.yaml', recursive=True):
    data = yaml.safe_load(open(f, encoding='utf-8'))
    print(f'OK ({type(data).__name__}): {f}')
"
```

- [ ] **Step 8: Verify company count is 50**

```bash
python -c "
import yaml
data = yaml.safe_load(open('career-skills-marketplace/knowledge/company-taxonomy/companies.seed.yaml', encoding='utf-8'))
companies = data.get('companies', [])
print(f'Company count: {len(companies)}')
assert len(companies) == 50, f'Expected 50, got {len(companies)}'
print('PASS')
"
```

- [ ] **Step 9: Commit**

```bash
git add career-skills-marketplace/knowledge/
git commit -m "feat: China career knowledge graph seed — 50 companies, 12 role categories, 18 market terms"
```

---

## Task 8: Installer Scripts

**Subagent boundary: A (same as Task 1) — depends on Tasks 1-7 being complete for file validation**

**Files:**
- Create: `career-skills-marketplace/install.sh`
- Create: `career-skills-marketplace/install.ps1`

- [ ] **Step 1: Create install.sh**

```bash
#!/bin/bash
set -e

MARKETPLACE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="${HOME}/.claude/skills/career-skills-marketplace"

echo "Career Skills Marketplace Installer"
echo "===================================="
echo ""

if [ -d "$TARGET_DIR" ]; then
  echo "ERROR: $TARGET_DIR already exists."
  echo "This Phase 1 installer never deletes or overwrites an existing skills directory."
  echo "Move the existing directory yourself if you want a clean reinstall."
  exit 1
fi

mkdir -p "$TARGET_DIR"

cp -R "$MARKETPLACE_DIR/skills" "$TARGET_DIR/"
cp -R "$MARKETPLACE_DIR/shared" "$TARGET_DIR/"
cp -R "$MARKETPLACE_DIR/knowledge" "$TARGET_DIR/"
cp "$MARKETPLACE_DIR/marketplace.yaml" "$TARGET_DIR/"

SKILLS=("career-principal" "profile-builder" "jd-analyzer" "resume-tailor" "match-diagnosis" "source-quality-auditor")
ALL_OK=true
for skill in "${SKILLS[@]}"; do
  if [ -f "$TARGET_DIR/skills/$skill/SKILL.md" ]; then
    echo "  ✓ $skill/SKILL.md"
  else
    echo "  ✗ $skill/SKILL.md MISSING"
    ALL_OK=false
  fi
done

echo ""
if [ "$ALL_OK" = true ]; then
  echo "Installed to: $TARGET_DIR"
  echo ""
  echo "Next: Open Claude Code and say \"帮我分析一个 JD\""
else
  echo "ERROR: Some skills are missing. Installation may be incomplete."
  exit 1
fi
```

- [ ] **Step 2: Create install.ps1**

```powershell
$ErrorActionPreference = "Stop"

$MarketplaceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Join-Path $env:USERPROFILE ".claude\skills\career-skills-marketplace"

Write-Host "Career Skills Marketplace Installer"
Write-Host "===================================="
Write-Host ""

if (Test-Path -LiteralPath $TargetDir) {
    Write-Host "ERROR: $TargetDir already exists."
    Write-Host "This Phase 1 installer never deletes or overwrites an existing skills directory."
    Write-Host "Move the existing directory yourself if you want a clean reinstall."
    exit 1
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $MarketplaceDir "skills") -Destination $TargetDir -Recurse
Copy-Item -LiteralPath (Join-Path $MarketplaceDir "shared") -Destination $TargetDir -Recurse
Copy-Item -LiteralPath (Join-Path $MarketplaceDir "knowledge") -Destination $TargetDir -Recurse
Copy-Item -LiteralPath (Join-Path $MarketplaceDir "marketplace.yaml") -Destination $TargetDir

$Skills = @("career-principal", "profile-builder", "jd-analyzer", "resume-tailor", "match-diagnosis", "source-quality-auditor")
$AllOk = $true
foreach ($Skill in $Skills) {
    $SkillFile = Join-Path $TargetDir "skills\$Skill\SKILL.md"
    if (Test-Path -LiteralPath $SkillFile) {
        Write-Host "  ✓ $Skill/SKILL.md"
    } else {
        Write-Host "  ✗ $Skill/SKILL.md MISSING"
        $AllOk = $false
    }
}

Write-Host ""
if ($AllOk) {
    Write-Host "Installed to: $TargetDir"
    Write-Host ""
    Write-Host "Next: Open Claude Code and say \"帮我分析一个 JD\""
} else {
    Write-Host "ERROR: Some skills are missing. Installation may be incomplete."
    exit 1
}
```

- [ ] **Step 3: Verify installers do not contain dangerous commands**

```bash
if grep -E "rm -rf|sudo |kill |pkill |chmod 777|del /|rmdir" career-skills-marketplace/install.sh; then
  echo "FAIL: install.sh contains a dangerous command"
  exit 1
fi
if grep -E "Remove-Item|Stop-Process|del |rmdir|Format-Volume" career-skills-marketplace/install.ps1; then
  echo "FAIL: install.ps1 contains a dangerous command"
  exit 1
fi
echo "PASS: installers do not delete user data or kill processes"
```

- [ ] **Step 4: Commit**

```bash
git add career-skills-marketplace/install.sh career-skills-marketplace/install.ps1
git commit -m "feat: installer scripts for Claude Code / Codex"
```

---

## Task 9: Documentation

**Subagent boundary: H — depends on all other tasks for consistency**

**Files:**
- Create: `career-skills-marketplace/README.md`
- Create: `career-skills-marketplace/README.zh-CN.md`
- Create: `career-skills-marketplace/docs/installation.md`
- Create: `career-skills-marketplace/docs/usage-examples.md`
- Create: `career-skills-marketplace/docs/privacy-policy.md`
- Create: `career-skills-marketplace/docs/contribution-guide.md`
- Create: `career-skills-marketplace/evals/README.md`
- Create: 10 workflow eval fixtures in `career-skills-marketplace/evals/workflow/`

- [ ] **Step 1: Create README.md (English)**

Brief English README: what this is, quick install, link to README.zh-CN.md for full docs.

- [ ] **Step 2: Create README.zh-CN.md**

Full Chinese README with: what it is, who it's for, what it can do (6 skills), quick start (clone + install), usage examples, knowledge graph overview, limitations, contributing, license.

- [ ] **Step 3: Create docs/installation.md**

Detailed installation guide: prerequisites (Claude Code or Codex), install steps, verification, troubleshooting.

- [ ] **Step 4: Create docs/usage-examples.md**

6 complete usage examples (from implementation-constraints Section 13): 应届生投字节后端, 双非文科转产品, 运营岗面经准备, 英文JD改中文简历, Offer北京vs上海, 证据不足拒绝高置信判断.

- [ ] **Step 5: Create docs/privacy-policy.md**

What data stays local, what never gets uploaded, how to delete data, API key handling.

- [ ] **Step 6: Create docs/contribution-guide.md**

How to contribute: skills, company data, rubrics, eval cases. Red lines. Review process.

- [ ] **Step 7: Create evals/README.md**

How to use eval fixtures, fixture format, assertion types, how to add new fixtures.

- [ ] **Step 8: Create 10 workflow eval fixtures**

```
evals/workflow/
  jd-match-resume-chain.json        # JD → profile → match → resume 完整闭环
  profile-to-career-path.json       # 画像 → 职业方向建议
  jd-too-short.json                 # JD < 30字 → 链路降级
  fabrication-refused.json          # 要求编造经历 → 全链路拒绝
  source-conflict-propagation.json  # 来源冲突 → 冲突传播和标注
  low-quality-source-filtered.json  # D级来源 → 被过滤
  no-adapters-degradation.json      # 无 adapter → 全链路降级
  china-market-case.json            # 秋招/五险一金 → 知识图谱正确引用
  cross-language-jd-resume.json     # 英文JD + 中文简历
  unethical-request-refused.json    # 违法/不道德请求 → 拒绝 + 引导
```

Each fixture: input (user message + context), expected skills invoked, expected output properties, assertions.

- [ ] **Step 9: Commit**

```bash
git add career-skills-marketplace/README.md career-skills-marketplace/README.zh-CN.md career-skills-marketplace/docs/ career-skills-marketplace/evals/
git commit -m "docs: README, installation guide, usage examples, privacy policy, eval fixtures"
```

---

## Task 10: Validation + Consistency Audit

**Subagent boundary: H (continuation) — must run AFTER all other tasks**

**Files:** No new files. Validation only.

- [ ] **Step 1: Verify all required files exist**

```bash
cd career-skills-marketplace

# Root files
for f in marketplace.yaml LICENSE LICENSE-KNOWLEDGE CONTRIBUTING.md SECURITY.md install.sh install.ps1 README.md README.zh-CN.md; do
  test -f "$f" && echo "✓ $f" || echo "✗ MISSING: $f"
done

# 6 skills × required files
for skill in career-principal profile-builder jd-analyzer resume-tailor match-diagnosis source-quality-auditor; do
  for f in SKILL.md contract.yaml input_schema.json output_schema.json README.md; do
    test -f "skills/$skill/$f" && echo "✓ skills/$skill/$f" || echo "✗ MISSING: skills/$skill/$f"
  done
  for e in happy-path.md low-evidence.md bad-input.md source-conflict.md; do
    test -f "skills/$skill/examples/$e" && echo "✓ skills/$skill/examples/$e" || echo "✗ MISSING"
  done
  for t in happy-path.json low-evidence.json bad-input.json source-conflict.json hallucination-guard.json; do
    test -f "skills/$skill/tests/$t" && echo "✓ skills/$skill/tests/$t" || echo "✗ MISSING"
  done
done
```

Expected: All files exist, zero MISSING.

- [ ] **Step 2: Verify all YAML/JSON files parse**

```bash
python -c "
import json, yaml, glob, os
os.chdir('career-skills-marketplace')
errors = []
for f in glob.glob('**/*.json', recursive=True):
    try: json.load(open(f, encoding='utf-8'))
    except Exception as e: errors.append(f'{f}: {e}')
for f in glob.glob('**/*.yaml', recursive=True):
    try: yaml.safe_load(open(f, encoding='utf-8'))
    except Exception as e: errors.append(f'{f}: {e}')
if errors:
    for e in errors: print(f'ERROR: {e}')
else:
    print(f'All files parse OK')
"
```

Expected: "All files parse OK"

- [ ] **Step 3: Verify no TODO/TBD/placeholder in any file**

```bash
grep -r "TODO\|TBD\|FIXME\|placeholder\|后续补充\|implement later" career-skills-marketplace/ --include="*.md" --include="*.yaml" --include="*.json" || echo "PASS: no placeholders found"
```

Expected: "PASS: no placeholders found"

- [ ] **Step 4: Verify career-principal references all 5 sub-skills**

```bash
grep -c "profile-builder\|jd-analyzer\|resume-tailor\|match-diagnosis\|source-quality-auditor" career-skills-marketplace/skills/career-principal/contract.yaml
```

Expected: >= 5

- [ ] **Step 5: Verify source-quality-auditor is referenced by other skills**

Check that skills involving market/external facts reference source-quality-auditor in their contract.yaml or SKILL.md.

- [ ] **Step 6: Verify install scripts are safe**

```bash
if grep -E "rm -rf|sudo |kill |pkill |chmod 777|del /|rmdir" career-skills-marketplace/install.sh; then
  echo "FAIL: install.sh contains a dangerous command"
  exit 1
fi
if grep -E "Remove-Item|Stop-Process|del |rmdir|Format-Volume" career-skills-marketplace/install.ps1; then
  echo "FAIL: install.ps1 contains a dangerous command"
  exit 1
fi
echo "PASS: install scripts are safe"
```

- [ ] **Step 7: Verify company count is 50**

Re-run the company count check from Task 7 Step 8.

- [ ] **Step 8: Final commit (if any fixes were needed)**

```bash
git add -A career-skills-marketplace/
git commit -m "fix: validation audit fixes" || echo "Nothing to fix"
```

---

## Task 11: Simplify Review

**Subagent boundary: Reviewer only — run after Task 10 passes**

**Files:** No planned new files. Modify only files that fail the review.

- [ ] **Step 1: Review scope creep against Phase 1 decisions**

Check `career-skills-marketplace/` for forbidden Phase 1 runtime scope:

```bash
rg -n "career doctor|career ask|career run|Local API|POST /|npm package|npx skills|SQLite|JSONL evidence store|XHS adapter|Nowcoder adapter|Web UI" career-skills-marketplace/
```

Expected: no matches except docs that explicitly say those items are deferred.

- [ ] **Step 2: Review file responsibility and duplication**

Manually inspect these directories:

```bash
find career-skills-marketplace/skills -maxdepth 2 -type f | sort
find career-skills-marketplace/shared -maxdepth 3 -type f | sort
find career-skills-marketplace/knowledge -maxdepth 3 -type f | sort
```

Expected: each skill owns only its own instructions/examples/tests; shared schemas and policies are referenced rather than duplicated inside every skill.

- [ ] **Step 3: Review installer simplicity and safety**

Confirm both installers only create directories, copy files, and verify files. They must not delete existing target directories, modify PATH, install dependencies, start services, or kill processes.

- [ ] **Step 4: Review examples for real-looking but non-private data**

Open all `examples/*.md` files and verify examples are realistic, explicitly synthetic, and contain no real private resume, phone number, email, salary slip, or chat log.

- [ ] **Step 5: Commit simplify fixes if needed**

```bash
git add career-skills-marketplace/
git commit -m "refactor: simplify Phase 1 marketplace artifacts" || echo "No simplify fixes needed"
```

---

## Task 12: PJR Quality Gate

**Subagent boundary: Reviewer only — run after Simplify Review**

**Files:** No planned new files. Fix only parse, formatting, or policy violations found by the gate.

- [ ] **Step 1: Run git whitespace check**

```bash
git diff --check
```

Expected: no trailing whitespace or conflict markers.

- [ ] **Step 2: Parse JSON and YAML artifacts**

```bash
python -c "
import json, pathlib, sys
errors=[]
for path in pathlib.Path('career-skills-marketplace').rglob('*.json'):
    try:
        json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{path}: {exc}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('JSON parse OK')
"
python -c "
import pathlib, sys, yaml
errors=[]
for path in pathlib.Path('career-skills-marketplace').rglob('*.yaml'):
    try:
        yaml.safe_load(path.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{path}: {exc}')
if errors:
    print('\n'.join(errors))
    sys.exit(1)
print('YAML parse OK')
"
```

Expected: `JSON parse OK` and `YAML parse OK`.

- [ ] **Step 3: Validate shell syntax**

```bash
bash -n career-skills-marketplace/install.sh
pwsh -NoProfile -Command "`$null = [scriptblock]::Create((Get-Content -Raw -Encoding UTF8 'career-skills-marketplace/install.ps1')); 'PowerShell parse OK'"
```

Expected: both commands exit 0. If `pwsh` is unavailable, run the PowerShell parse check in Windows PowerShell and record the command output in the handoff.

- [ ] **Step 4: Re-run Task 10 validation commands**

Run every command from Task 10 again after Simplify fixes.

- [ ] **Step 5: Commit PJR fixes if needed**

```bash
git add career-skills-marketplace/
git commit -m "fix: PJR quality gate corrections" || echo "No PJR fixes needed"
```

---

## Task 13: merge-to-dev Handoff

**Subagent boundary: Main agent only — run after Task 12 passes and reviewer approves**

**Files:** Git integration only.

- [ ] **Step 1: Confirm feature branch status**

```bash
git status --short
git branch --show-current
git log --oneline -5
```

Expected: clean working tree on `feature/career-skills-marketplace-phase1` with Phase 1 commits visible.

- [ ] **Step 2: Review final diff summary**

```bash
git diff --stat dev...HEAD
git diff --name-only dev...HEAD
```

Expected: changes are limited to `career-skills-marketplace/` plus any explicit handoff notes requested by the user.

- [ ] **Step 3: Merge to dev after approval**

```bash
git switch dev
git pull --ff-only
git merge --no-ff feature/career-skills-marketplace-phase1 -m "merge: career skills marketplace Phase 1 skeleton"
```

Expected: merge completes without conflicts.

- [ ] **Step 4: Report merge result**

```bash
git log --oneline -3
git status --short
```

Expected: newest commit is the merge commit and working tree is clean.

---

## Parallelization Map

```
Task 0 (worktree) ──────────────────────────→ dispatch subagents

Task 1 (root/manifest) ─────────────────────┐
Task 2 (shared schemas) ────────────────────┐│
Task 3 (career-principal) ──────────────────┤│
Task 4 (profile-builder + jd-analyzer) ─────┤├─→ Task 8 (installer) ─┐
Task 5 (resume-tailor + match-diagnosis) ───┤│                        ├─→ Task 10 (validation) → Task 11 (Simplify) → Task 12 (PJR) → Task 13 (merge-to-dev)
Task 6 (source-quality-auditor) ────────────┤│   Task 9 (docs) ───────┘
Task 7 (knowledge seed) ───────────────────┘│
                                             │
Tasks 1-7 are fully parallelizable ──────────┘
Task 8 depends on 1-7 (needs files to validate)
Task 9 depends on 1-7 (needs content for docs)
Task 10 depends on ALL implementation/docs tasks
Tasks 11-13 are sequential quality/integration gates
```

**Recommended subagent assignment:**
- Main agent: Task 0 + Task 13
- Subagent A: Task 1 + Task 8
- Subagent B: Task 2
- Subagent C: Task 3
- Subagent D: Task 4
- Subagent E: Task 5
- Subagent F: Task 6
- Subagent G: Task 7
- Subagent H: Task 9 + Task 10 + Task 11 + Task 12

**8 implementation/review subagents, 14 total tasks, 7 parallelizable implementation tasks + sequential gates (8→9/10→11→12→13)**


