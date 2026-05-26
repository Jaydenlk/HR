# Career Skills Marketplace v1 Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 29 skills (Packs A-D) to the existing 6 MVP skills, update career-principal routing, shared schemas, knowledge taxonomy, and marketplace manifest to form Career Skills Marketplace v1 complete.

**Architecture:** Each new skill follows the Phase 1 pattern: SKILL.md (Anthropic format) + contract.yaml + input/output JSON schemas + 4 examples + 5 test fixtures. All output schemas inline the 10 base required fields (no $ref inheritance). career-principal's intent-router.yaml expands from 12 to 25+ intents. Pack C skills (market intelligence) mark `live_research_required: true` and define explicit degradation behavior.

**Tech Stack:** YAML (contracts, knowledge), JSON (schemas, test fixtures), Markdown (SKILL.md, examples, docs). No runtime dependencies. No build step.

**Existing structure:** `career-skills-marketplace/` already has 6 skills, shared/, knowledge/, evals/, docs/, install scripts. This plan only adds new files — no modification of existing MVP skill content except career-principal routing updates and marketplace.yaml.

**Worktree:** `E:\Agent program\HRBP\.worktrees\career-skills-v1-complete` on branch `feature/career-skills-marketplace-v1-complete`

---

## Scope: 29 New Skills Across 4 Packs

| Pack | Layer | New Skills | Count |
|------|-------|-----------|-------|
| A | Career Execution | opportunity-intelligence, application-strategist, application-tracker, daily-plan-generator, networking-message-writer, referral-strategy, follow-up-message-writer | 7 |
| B | Interview | interview-intelligence, mock-interviewer, interview-debrief, question-bank-builder, company-interview-playbook, behavioral-story-builder, technical-interview-coach, case-interview-coach | 8 |
| C | Market Intelligence | market-radar, xhs-interview-miner, nowcoder-tech-miner, wechat-insight-reader, salary-radar, offer-comparator, company-risk-auditor, industry-trend-analyst | 8 |
| D | Career Strategy | career-path-planner, role-transition-advisor, skill-gap-planner, learning-roadmap-builder, personal-brand-builder, portfolio-project-advisor, graduate-school-vs-job-advisor, city-industry-fit-advisor | 8 |

**Per-skill file checklist (14 files each):**

```
skills/<name>/
  SKILL.md
  contract.yaml
  input_schema.json
  output_schema.json
  README.md
  examples/happy-path.md
  examples/low-evidence.md
  examples/bad-input.md
  examples/source-conflict.md
  tests/happy-path.json
  tests/low-evidence.json
  tests/bad-input.json
  tests/source-conflict.json
  tests/hallucination-guard.json
```

**Total new files:** 29 skills × 14 files = 406 skill files + ~15 shared/knowledge/docs/manifest updates = ~421 new files

---

## File Conventions (apply to ALL 29 skills)

### contract.yaml template

Every contract.yaml MUST include all of these top-level keys:

```yaml
name: <skill-name>
version: "1.0.0"
purpose: "<一句话中文说明>"
role: worker
layer: <execution|interview|market_intelligence|career_strategy>

when_to_use:
  - "<触发条件1>"
when_not_to_use:
  - "<排除条件1>"

inputs_required:
  - name: <field>
    type: <string|object|array>
    required: <true|false>
    description: "<说明>"
optional_context:
  - name: <field>
    type: <type>
    description: "<说明>"

evidence_required:
  - "<证据要求1>"
tools_allowed: [Read, Grep]
depends_on: [<list of skill names>]
output_schema: "./output_schema.json"

confidence_policy:
  high: { condition: "<条件>" }
  medium: { condition: "<条件>" }
  low: { condition: "<条件>" }
  insufficient: { condition: "<条件>", required_output: "列出缺失信息" }

failure_modes:
  - name: <mode>
    behavior: "<行为>"

test_cases: "./tests/"
china_market_specificity: "<none|low|medium|high|very_high>"
live_research_required: <true|false>
degradation_behavior: "<无实时数据时的行为描述>"
```

### output_schema.json template

Every output_schema.json MUST have these in BOTH `required` and `properties`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "<SkillName> Output",
  "type": "object",
  "required": [
    "skill_name", "skill_version", "summary", "confidence",
    "evidence_used", "recommendations", "risks", "next_actions",
    "follow_up_questions", "cannot_determine"
  ],
  "properties": {
    "skill_name": { "const": "<skill-name>" },
    "skill_version": { "type": "string", "default": "1.0.0" },
    "summary": { "type": "string" },
    "confidence": { "type": "string", "enum": ["high", "medium", "low", "insufficient"] },
    "evidence_used": { "type": "array", "items": { "type": "object" } },
    "recommendations": { "type": "array", "items": { "type": "string" } },
    "risks": { "type": "array", "items": { "type": "string" } },
    "next_actions": { "type": "array", "items": { "type": "string" } },
    "follow_up_questions": { "type": "array", "items": { "type": "string" } },
    "cannot_determine": { "type": "array", "items": { "type": "string" } }
  }
}
```

Then add skill-specific fields to both `required` (if mandatory) and `properties`.

### test fixture template

```json
{
  "name": "<test name>",
  "description": "<what this tests>",
  "input": { },
  "expected_properties": { },
  "assertions": [ ],
  "must_not_contain": [ ]
}
```

---

## Task 0: Worktree Preparation

**Subagent: Main agent only**

- [ ] **Step 1: Create worktree**

```bash
cd "E:\Agent program\HRBP"
git worktree add ".worktrees/career-skills-v1-complete" -b feature/career-skills-marketplace-v1-complete
```

- [ ] **Step 2: Verify base files accessible**

```bash
cd ".worktrees/career-skills-v1-complete"
ls career-skills-marketplace/skills/
# Should show 6 existing skills
```

---

## Task 1: Pack A — Opportunity + Execution Skills (7 skills)

**Subagent: A — creates 7 skill directories under `career-skills-marketplace/skills/`**

**Files:** 7 × 14 = 98 new files

### Skill specifications for Pack A

Each skill below must be created with the full 14-file structure.

#### 1.1 opportunity-intelligence

```yaml
# contract.yaml key fields
purpose: "评估一个具体求职机会的综合价值（匹配度 + 市场定位 + 风险）"
layer: execution
depends_on: [jd-analyzer, match-diagnosis, source-quality-auditor]
china_market_specificity: high
live_research_required: false  # base version; enhanced needs market-radar
degradation_behavior: "无用户画像时只做 JD 层面评估，标注 confidence: low"
inputs_required:
  - name: jd_text
    type: string
    required: true
optional_context:
  - name: user_profile
  - name: market_context
# output extends base with:
#   opportunity_score (0-100), match_assessment, market_positioning,
#   risk_flags[], recommendation (strong_apply|apply_with_caution|skip|need_more_info)
```

SKILL.md body: how to evaluate an opportunity end-to-end. Call jd-analyzer for structure, match-diagnosis for fit (if profile available), source-quality-auditor for credibility. Output composite score with breakdown. Chinese market: company tier from knowledge graph, hiring season relevance, HC/OD risk detection.

Examples: (1) happy-path: full JD + profile → 72% score with breakdown; (2) low-evidence: JD only, no profile → limited assessment; (3) bad-input: not a JD; (4) source-conflict: JD salary vs knowledge graph mismatch.

#### 1.2 application-strategist

```yaml
purpose: "制定个人求职策略——投什么类型公司、什么节奏、什么顺序"
layer: execution
depends_on: [profile-builder, source-quality-auditor]
china_market_specificity: high  # 秋招/春招/金三银四
live_research_required: false
degradation_behavior: "无画像时给通用策略框架，标注 confidence: low"
inputs_required:
  - name: user_profile (or target_roles)
# output extends base with:
#   target_company_tiers[], application_sequence[], daily_action_plan[], risk_assessment
```

SKILL.md: strategy design based on profile + timeline. Reference knowledge/market-vocabulary for 秋招/春招 timing. Company tier targeting based on knowledge/company-taxonomy. Sequence by safety/reach/stretch logic.

#### 1.3 application-tracker

```yaml
purpose: "追踪投递状态，提供漏斗视图和跟进提醒"
layer: execution
depends_on: []
china_market_specificity: medium
live_research_required: false
degradation_behavior: "N/A — 纯用户数据驱动"
inputs_required:
  - name: application_entries (array)
# output extends base with:
#   pipeline_view (by_stage), stats, stale_alerts[], ghost_detection[]
```

SKILL.md: kanban-style tracking. Stage enum: wishlist/applied/interview/offer/rejected. Ghost detection: >14 days no response. Stale alert: >7 days no update. Chinese market: response timelines differ by company type.

#### 1.4 daily-plan-generator

```yaml
purpose: "根据当前求职状态生成每日任务清单"
layer: execution
depends_on: [profile-builder, application-tracker]
china_market_specificity: high  # timeline-aware
live_research_required: false
degradation_behavior: "无画像时基于知识图谱时间线给通用建议"
inputs_required:
  - name: current_date (string)
optional_context:
  - name: user_profile
  - name: application_status
  - name: upcoming_interviews
# output extends base with:
#   daily_tasks[], today_focus, timeline_context
```

#### 1.5 networking-message-writer

```yaml
purpose: "生成内推请求/LinkedIn消息/脉脉消息，个性化且不油腻"
layer: execution
depends_on: [profile-builder]
china_market_specificity: high  # 微信/脉脉 vs LinkedIn
live_research_required: false
inputs_required:
  - name: target_person (object: name, role, company, relationship)
  - name: purpose (enum: referral|info_interview|reconnect|thank_you)
# output extends base with:
#   message_draft, tone, key_points[], what_not_to_say[], follow_up_timing
```

#### 1.6 referral-strategy

```yaml
purpose: "分析用户人脉，找到最佳内推路径"
layer: execution
depends_on: [profile-builder]
china_market_specificity: high
live_research_required: false
inputs_required:
  - name: user_network (array)
  - name: target_companies (array)
# output extends base with:
#   referral_paths[], cold_outreach_targets[], network_gaps[]
```

#### 1.7 follow-up-message-writer

```yaml
purpose: "生成面试后感谢信/投递跟进/拒信回复"
layer: execution
depends_on: []
china_market_specificity: medium
live_research_required: false
inputs_required:
  - name: context (enum: post_interview|post_application|post_rejection|post_offer)
  - name: details (object)
# output extends base with:
#   message_draft, timing_advice, tone_guide
```

- [ ] **Step 1:** Create all 7 skill directories with 14 files each following the conventions above
- [ ] **Step 2:** Verify 98 files created, all JSON/YAML parseable
- [ ] **Step 3:** Commit: `feat(pack-a): 7 opportunity + execution skills`

---

## Task 2: Pack B — Interview Skills (8 skills)

**Subagent: B — creates 8 skill directories**

**Files:** 8 × 14 = 112 new files

### Skill specifications for Pack B

#### 2.1 interview-intelligence

```yaml
purpose: "为特定公司+岗位聚合面试情报（流程、题型、考察重点）"
layer: interview
depends_on: [source-quality-auditor]
china_market_specificity: very_high  # 笔试/群面/业务面/HR面 flow
live_research_required: true  # enhanced with miners
degradation_behavior: "无实时数据时降级到知识图谱通用信息，标注 confidence: low"
inputs_required:
  - name: company (string)
  - name: role (string)
optional_context:
  - name: round (string)
# output extends base with:
#   interview_flow[], common_questions[], preparation_priorities[], red_flags_to_watch[]
```

SKILL.md: aggregate interview intel from knowledge graph + optional live sources. Chinese interview specifics: 笔试 (online test), 群面 (group discussion), 业务面 (business round), HR面. Reference knowledge/company-taxonomy for company-specific patterns.

#### 2.2 mock-interviewer

```yaml
purpose: "模拟面试：根据 JD 生成问题，对回答实时评分，综合评估"
layer: interview
depends_on: [profile-builder, jd-analyzer, interview-intelligence]
china_market_specificity: high
live_research_required: false
degradation_behavior: "无面试情报时用通用题库"
inputs_required:
  - name: jd_text_or_company_role
  - name: interview_type (enum: behavioral|technical|case|mixed)
# output extends base with:
#   phase (questions|per_answer|evaluation), questions[], answer_evaluations[],
#   overall_score, overall_grade, dimension_scores[]
```

Three-phase skill: generate questions → evaluate each answer → final assessment.

#### 2.3 interview-debrief

```yaml
purpose: "面试后复盘：分析对话记录，逐题点评+评分+预测"
layer: interview
depends_on: [profile-builder]
china_market_specificity: medium
live_research_required: false
inputs_required:
  - name: interview_notes (string, min 50 chars)
optional_context:
  - name: company, role, round
# output extends base with:
#   overall_grade (A+ to D), dimension_scores[6], question_analysis[],
#   prediction (next_round_likelihood, expected_focus), stories_to_save[]
```

#### 2.4 question-bank-builder

```yaml
purpose: "为特定公司+岗位构建结构化面试题库"
layer: interview
depends_on: [interview-intelligence, source-quality-auditor]
china_market_specificity: high
live_research_required: true
degradation_behavior: "无实时面经时只用知识图谱通用题型，标注 confidence: low"
inputs_required:
  - name: company (string)
  - name: role (string)
# output extends base with:
#   question_bank[], coverage (behavioral_pct, technical_pct, case_pct), gaps[]
```

#### 2.5 company-interview-playbook

```yaml
purpose: "为特定公司生成面试攻略手册"
layer: interview
depends_on: [interview-intelligence]
china_market_specificity: very_high
live_research_required: true
degradation_behavior: "无实时数据时降级到知识图谱 + 通用框架"
inputs_required:
  - name: company (string)
optional_context:
  - name: role
# output extends base with:
#   company_profile, interview_process[], culture_fit_tips[], common_pitfalls[],
#   salary_negotiation_notes
```

#### 2.6 behavioral-story-builder

```yaml
purpose: "从用户经历中提取 STAR 故事，按能力维度分类"
layer: interview
depends_on: [profile-builder, interview-debrief]
china_market_specificity: medium
live_research_required: false
inputs_required:
  - name: user_profile
optional_context:
  - name: interview_transcripts
# output extends base with:
#   story_bank[], coverage_map, gaps[]
```

#### 2.7 technical-interview-coach

```yaml
purpose: "技术面试准备：算法/系统设计/手撕代码的针对性辅导"
layer: interview
depends_on: [interview-intelligence]
china_market_specificity: high
live_research_required: true
degradation_behavior: "无实时题目时用通用技术面试框架"
inputs_required:
  - name: role (string)
optional_context:
  - name: company, weak_areas
# output extends base with:
#   preparation_plan[], practice_questions[], common_patterns[], company_specific_focus[]
```

#### 2.8 case-interview-coach

```yaml
purpose: "Case 面试/产品设计题/商业分析题的准备和模拟"
layer: interview
depends_on: []
china_market_specificity: high
live_research_required: false
inputs_required:
  - name: role (string)
  - name: case_type (enum: product_design|business_analysis|estimation|strategy)
# output extends base with:
#   framework_library[], practice_cases[], common_mistakes[], evaluation_criteria[]
```

- [ ] **Step 1:** Create all 8 skill directories with 14 files each
- [ ] **Step 2:** Verify 112 files, all JSON/YAML parseable
- [ ] **Step 3:** Commit: `feat(pack-b): 8 interview skills`

---

## Task 3: Pack C — Market Intelligence Skills (8 skills)

**Subagent: C — creates 8 skill directories**

**Files:** 8 × 14 = 112 new files

**CRITICAL:** All Pack C skills have `live_research_required: true`. They MUST define `degradation_behavior` and MUST require `source-quality-auditor` as dependency. They MUST NOT give high confidence conclusions without live data sources.

### Skill specifications for Pack C

#### 3.1 market-radar

```yaml
purpose: "聚合多来源市场信号——招聘趋势、热门岗位、行业动态"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "无实时数据时输出 confidence: insufficient，建议用户自行查阅招聘平台"
inputs_required:
  - name: scope (object or "all")
# output extends base with:
#   trending_roles[], hot_companies[], market_sentiment, key_signals[]
```

#### 3.2 xhs-interview-miner

```yaml
purpose: "从小红书提取面经内容，结构化后供其他 skill 使用"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "adapter 未配置时返回空结果 + 提示手动搜索"
china_market_specificity: very_high
# output extends base with:
#   mined_posts[], quality_report
# NOTE: credibility_grade ceiling is C (mixed promotion content)
```

#### 3.3 nowcoder-tech-miner

```yaml
purpose: "从牛客网提取技术面经和笔试题"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "adapter 未配置时返回空结果 + 提示手动搜索"
# output extends base with:
#   mined_posts[], technical_questions[]
# NOTE: credibility_grade ceiling is B for tech interviews
```

#### 3.4 wechat-insight-reader

```yaml
purpose: "从公众号文章提取行业洞察和职业发展方法论"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "adapter 未配置时返回空结果 + 提示自行查阅"
# output extends base with:
#   insights[]
```

#### 3.5 salary-radar

```yaml
purpose: "聚合薪资数据，提供岗位/公司/城市维度薪资参考"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "无实时数据时降级到知识图谱历史参考，标注 freshness: stale 和 confidence: low"
china_market_specificity: very_high
# output extends base with:
#   salary_range (p25/p50/p75), breakdown (base/bonus/stock), data_sources[], comparison[]
# RULE: salary without year+city+role+source → grade demoted to C
```

#### 3.6 offer-comparator

```yaml
purpose: "多维度比较多个 offer"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: false  # base on user-provided offer details
degradation_behavior: "缺少字段时列出缺失项，不编造"
china_market_specificity: very_high  # 五险一金/年终奖/RSU
# output extends base with:
#   comparison[], weighted_scores[], recommendation, hourly_rate_comparison[], missing_info[]
```

#### 3.7 company-risk-auditor

```yaml
purpose: "深度审计一家公司的求职风险"
layer: market_intelligence
depends_on: [source-quality-auditor]
live_research_required: true
degradation_behavior: "无实时数据时只用知识图谱，标注 confidence: low"
# output extends base with:
#   risk_profile (overall_risk, layoff_history, culture_signals, known_issues[])
```

#### 3.8 industry-trend-analyst

```yaml
purpose: "分析特定行业/赛道的发展趋势"
layer: market_intelligence
depends_on: [market-radar, source-quality-auditor]
live_research_required: true
degradation_behavior: "无实时数据时输出 confidence: insufficient"
# output extends base with:
#   trend_summary, growth_signals[], risk_signals[], hiring_outlook, recommended_entry_roles[]
```

- [ ] **Step 1:** Create all 8 skill directories with 14 files each
- [ ] **Step 2:** Verify every Pack C skill has `live_research_required: true` and `degradation_behavior` in contract
- [ ] **Step 3:** Verify 112 files, all JSON/YAML parseable
- [ ] **Step 4:** Commit: `feat(pack-c): 8 market intelligence skills (live_research_required)`

---

## Task 4: Pack D — Career Strategy Skills (8 skills)

**Subagent: D — creates 8 skill directories**

**Files:** 8 × 14 = 112 new files

### Skill specifications for Pack D

#### 4.1 career-path-planner

```yaml
purpose: "基于用户画像规划 1-3 条可行职业发展路径"
layer: career_strategy
depends_on: [profile-builder]
china_market_specificity: high
live_research_required: false
degradation_behavior: "无画像时给通用框架，标注 confidence: low"
# output extends base with:
#   paths[] (title, fit_pct, milestones[], required_skills[], transition_difficulty),
#   recommended_path, immediate_actions[]
```

#### 4.2 role-transition-advisor

```yaml
purpose: "分析从当前角色转向目标角色的可行性和路径"
layer: career_strategy
depends_on: [profile-builder]
china_market_specificity: high  # 文转产品/技术转管理/大厂转体制
live_research_required: false
# output extends base with:
#   feasibility, skill_gap[], typical_transition_path[], success_factors[], first_step
```

#### 4.3 skill-gap-planner

```yaml
purpose: "对比当前技能和目标要求，生成补强计划"
layer: career_strategy
depends_on: [profile-builder, jd-analyzer, match-diagnosis]
live_research_required: false
# output extends base with:
#   gap_analysis[], learning_plan[], quick_wins[], long_term_investments[]
```

#### 4.4 learning-roadmap-builder

```yaml
purpose: "为特定技能差距生成结构化学习路线图"
layer: career_strategy
depends_on: [skill-gap-planner]
china_market_specificity: medium  # 推荐中文学习资源
live_research_required: false
# output extends base with:
#   roadmap[], resource_list[]
```

#### 4.5 personal-brand-builder

```yaml
purpose: "帮助用户建立技术/职业品牌"
layer: career_strategy
depends_on: [profile-builder]
china_market_specificity: medium  # 掘金/思否/CSDN vs GitHub/Medium
live_research_required: false
# output extends base with:
#   brand_strategy, platform_actions[], content_ideas[], profile_optimization[]
```

#### 4.6 portfolio-project-advisor

```yaml
purpose: "推荐适合用户背景和目标的 portfolio 项目"
layer: career_strategy
depends_on: [profile-builder, skill-gap-planner]
live_research_required: false
# output extends base with:
#   project_ideas[], anti_patterns[]
```

#### 4.7 graduate-school-vs-job-advisor

```yaml
purpose: "帮用户分析'读研还是工作'的决策"
layer: career_strategy
depends_on: [profile-builder]
china_market_specificity: very_high  # 考研/保研/出国
live_research_required: false
# output extends base with:
#   analysis[], recommendation, critical_factors[]
```

#### 4.8 city-industry-fit-advisor

```yaml
purpose: "分析'去哪个城市+做什么行业'的组合适配度"
layer: career_strategy
depends_on: [profile-builder]
china_market_specificity: very_high  # 北上深杭成都产业差异
live_research_required: false
# output extends base with:
#   fit_matrix[], cost_of_living_impact[], industry_hub_analysis[], recommendation
```

- [ ] **Step 1:** Create all 8 skill directories with 14 files each
- [ ] **Step 2:** Verify 112 files, all JSON/YAML parseable
- [ ] **Step 3:** Commit: `feat(pack-d): 8 career strategy skills`

---

## Task 5: Career Principal Routing Update

**Subagent: E — modifies existing career-principal files only**

**Files:**
- Modify: `career-skills-marketplace/skills/career-principal/references/intent-router.yaml`
- Modify: `career-skills-marketplace/skills/career-principal/references/orchestration-rules.md`
- Modify: `career-skills-marketplace/skills/career-principal/SKILL.md`
- Modify: `career-skills-marketplace/skills/career-principal/README.md`

- [ ] **Step 1: Expand intent-router.yaml from 12 to 25+ intents**

Add new intent routes for all 29 new skills. New intents include:

```yaml
# Pack A intents
- evaluate_opportunity  # → opportunity-intelligence
- plan_application_strategy  # → application-strategist
- track_applications  # → application-tracker
- plan_today  # → daily-plan-generator
- write_networking_message  # → networking-message-writer
- find_referral_path  # → referral-strategy
- write_follow_up  # → follow-up-message-writer

# Pack B intents
- prepare_interview  # → interview-intelligence (expand existing)
- mock_interview  # → mock-interviewer
- debrief_interview  # → interview-debrief (expand existing)
- build_question_bank  # → question-bank-builder
- get_company_playbook  # → company-interview-playbook
- build_stories  # → behavioral-story-builder
- prepare_technical  # → technical-interview-coach
- prepare_case  # → case-interview-coach

# Pack C intents
- check_market  # → market-radar
- find_xhs_interview  # → xhs-interview-miner
- find_nowcoder_interview  # → nowcoder-tech-miner
- check_salary  # → salary-radar (expand existing)
- compare_offers  # → offer-comparator (expand existing)
- audit_company_risk  # → company-risk-auditor
- analyze_industry  # → industry-trend-analyst

# Pack D intents
- plan_career  # → career-path-planner
- evaluate_transition  # → role-transition-advisor
- identify_skill_gaps  # → skill-gap-planner
- build_learning_roadmap  # → learning-roadmap-builder
- build_personal_brand  # → personal-brand-builder
- suggest_portfolio  # → portfolio-project-advisor
- grad_school_vs_job  # → graduate-school-vs-job-advisor
- find_city_industry_fit  # → city-industry-fit-advisor
```

Each intent follows the existing format: name, label, trigger_examples (Chinese), required_inputs, missing_input_questions, primary_skill, secondary_skills, confidence_gate, fallback.

- [ ] **Step 2: Update orchestration-rules.md**

Add rules for:
- When to chain Pack A skills (opportunity → strategy → tracker)
- When to chain Pack B skills (intelligence → mock → debrief)
- When Pack C skills require source-quality-auditor pre-check
- When Pack D skills need profile-builder first
- Live research degradation: if market-radar/salary-radar unavailable, how principal handles it

- [ ] **Step 3: Update SKILL.md**

Add the 29 new skills to the available skill list in the SKILL.md body. Update the "可调用 sub-skills" section.

- [ ] **Step 4: Update README.md**

Add 29 new skills to the skill table with layer labels.

- [ ] **Step 5: Verify routing completeness**

```bash
grep -c "primary_skill:" skills/career-principal/references/intent-router.yaml
# Expected: >= 25
```

- [ ] **Step 6: Commit:** `feat: career-principal routing expanded to 25+ intents for v1 complete`

---

## Task 6: Shared Schemas + Rubrics Update

**Subagent: F — only modifies `career-skills-marketplace/shared/`**

**Files:**
- Create: `shared/rubrics/interview-rubric.yaml`
- Create: `shared/rubrics/offer-comparison-rubric.yaml`
- Create: `shared/rubrics/career-strategy-rubric.yaml`
- Create: `shared/rubrics/market-research-rubric.yaml`

- [ ] **Step 1: Create interview-rubric.yaml**

Dimensions: technical depth, communication clarity, structured thinking, problem solving, culture fit, question quality. Each with 1-5 scoring criteria. Chinese-specific: group discussion (群面) evaluation, hand-coding (手撕代码) evaluation.

- [ ] **Step 2: Create offer-comparison-rubric.yaml**

5 dimensions with weights: career growth 30%, salary 25%, company platform 20%, life quality 15%, culture 10%. Chinese specifics: 五险一金, 年终奖, RSU/期权, 综合时薪.

- [ ] **Step 3: Create career-strategy-rubric.yaml**

Evaluation criteria for career path recommendations: feasibility, market demand alignment, skill transferability, timeline realism, risk assessment.

- [ ] **Step 4: Create market-research-rubric.yaml**

Rules for evaluating market intelligence: source diversity requirement (>=2 B+ sources), recency rules, China market applicability filter, contradiction handling.

- [ ] **Step 5: Verify YAML parses**
- [ ] **Step 6: Commit:** `feat: shared rubrics for interview, offer, career strategy, market research`

---

## Task 7: Knowledge Taxonomy Update

**Subagent: G — only modifies `career-skills-marketplace/knowledge/`**

**Files:**
- Create: `knowledge/interview-question-taxonomy.yaml`
- Create: `knowledge/offer-comparison-factors.yaml`
- Create: `knowledge/city-industry-fit.yaml`
- Create: `knowledge/career-path-patterns.yaml`
- Create: `knowledge/market-source-types.yaml`

- [ ] **Step 1: Create interview-question-taxonomy.yaml**

Categories: behavioral, technical (algorithms, system design, coding), case study (product design, business analysis, estimation), culture fit. Each with sub-categories and example question patterns. Chinese specifics: 群面 discussion topics, 手撕代码 patterns.

- [ ] **Step 2: Create offer-comparison-factors.yaml**

Structured factors for offer comparison: base salary, bonus months, stock/RSU details, benefits (五险一金 base, 补充医疗, 餐补, 房补, 交通补), work hours estimate, commute.

- [ ] **Step 3: Create city-industry-fit.yaml**

Major cities (北京/上海/深圳/杭州/成都/广州/南京/武汉) with: dominant industries, typical salary level, cost of living index, quality of life factors, tech hub strength. Each with `confidence: medium` and `source_policy`.

- [ ] **Step 4: Create career-path-patterns.yaml**

Common transition paths: backend→architect, backend→product, operations→product, liberal_arts→product, tech→management, 大厂→创业, 大厂→外企. Each with: difficulty, typical_duration, required_skills, common_blockers.

- [ ] **Step 5: Create market-source-types.yaml**

Catalog of market data source types with default credibility grades and freshness rules. Extends the existing source-quality-policy but focused on market intelligence use cases.

- [ ] **Step 6: Verify YAML parses, all entries have confidence/source_policy**
- [ ] **Step 7: Commit:** `feat: knowledge taxonomy — interview, offer, city-industry, career paths, market sources`

---

## Task 8: Marketplace Manifest + Docs Update

**Subagent: H — modifies manifest and docs**

**Files:**
- Modify: `career-skills-marketplace/marketplace.yaml`
- Modify: `career-skills-marketplace/README.zh-CN.md`
- Modify: `career-skills-marketplace/README.md`
- Create: `career-skills-marketplace/evals/workflow/v1-complete/` (10 new workflow fixtures)

- [ ] **Step 1: Update marketplace.yaml**

Add all 29 new skills with: name, path, role, layer, description, depends_on, live_research_required.

- [ ] **Step 2: Update README.zh-CN.md**

Expand skill table from 6 to 35. Organize by layer. Update knowledge stats.

- [ ] **Step 3: Update README.md**

Brief update to match.

- [ ] **Step 4: Create 10 new v1-complete workflow eval fixtures**

```
evals/workflow/v1-complete/
  opportunity-to-strategy.json       # opportunity-intelligence → application-strategist chain
  interview-prep-full.json           # intelligence → mock → debrief chain
  offer-comparison-multi.json        # salary-radar + offer-comparator
  career-transition-analysis.json    # role-transition + skill-gap + learning-roadmap
  market-intelligence-no-live.json   # market-radar with no adapters → degradation
  company-deep-dive.json             # company-risk + interview-playbook
  daily-plan-with-interviews.json    # daily-plan-generator with upcoming interviews
  salary-no-source-low-confidence.json  # salary-radar with no data → insufficient
  grad-school-decision.json          # graduate-school-vs-job full analysis
  networking-cold-outreach.json      # referral-strategy + networking-message chain
```

- [ ] **Step 5: Commit:** `feat: marketplace manifest + docs updated for 35 skills`

---

## Task 9: Validation + Consistency Audit

**Subagent: I+J — runs AFTER Tasks 1-8**

- [ ] **Step 1: Count total skills**

```bash
ls -d career-skills-marketplace/skills/*/ | wc -l
# Expected: 35
```

- [ ] **Step 2: Required files check**

```bash
for skill in $(ls career-skills-marketplace/skills/); do
  for f in SKILL.md contract.yaml input_schema.json output_schema.json README.md; do
    test -f "career-skills-marketplace/skills/$skill/$f" || echo "MISSING: $skill/$f"
  done
  for e in happy-path.md low-evidence.md bad-input.md source-conflict.md; do
    test -f "career-skills-marketplace/skills/$skill/examples/$e" || echo "MISSING: $skill/examples/$e"
  done
  for t in happy-path.json low-evidence.json bad-input.json source-conflict.json hallucination-guard.json; do
    test -f "career-skills-marketplace/skills/$skill/tests/$t" || echo "MISSING: $skill/tests/$t"
  done
done
```

Expected: zero MISSING lines

- [ ] **Step 3: JSON/YAML parse**

```bash
python -c "
import json, yaml, glob
errors = []
for f in glob.glob('career-skills-marketplace/**/*.json', recursive=True):
    try: json.load(open(f, encoding='utf-8'))
    except Exception as e: errors.append(f'{f}: {e}')
for f in glob.glob('career-skills-marketplace/**/*.yaml', recursive=True):
    try: yaml.safe_load(open(f, encoding='utf-8'))
    except Exception as e: errors.append(f'{f}: {e}')
print(f'Errors: {len(errors)}' if errors else 'ALL PASS')
for e in errors: print(e)
"
```

- [ ] **Step 4: Base required fields check for ALL 35 skills**

```bash
python -c "
import json, glob
base = ['skill_name','skill_version','summary','confidence','evidence_used','recommendations','risks','next_actions','follow_up_questions','cannot_determine']
for f in sorted(glob.glob('career-skills-marketplace/skills/*/output_schema.json')):
    d = json.load(open(f, encoding='utf-8'))
    req = set(d.get('required', []))
    props = set(d.get('properties', {}).keys())
    conf = d.get('properties',{}).get('confidence',{}).get('enum',[])
    mr = [x for x in base if x not in req]
    mp = [x for x in base if x not in props]
    skill = f.split('/')[2] if '/' in f else f.split('\\\\')[2]
    if mr or mp or 'insufficient' not in conf:
        print(f'FAIL: {skill}')
        if mr: print(f'  missing required: {mr}')
        if mp: print(f'  missing props: {mp}')
        if 'insufficient' not in conf: print(f'  confidence: {conf}')
    else:
        print(f'PASS: {skill}')
"
```

- [ ] **Step 5: marketplace.yaml includes all 35 skills**

```bash
grep -c "^  - name:" career-skills-marketplace/marketplace.yaml
# Expected: 35
```

- [ ] **Step 6: career-principal routing references all skills**

```bash
grep -c "primary_skill:" career-skills-marketplace/skills/career-principal/references/intent-router.yaml
# Expected: >= 25
```

- [ ] **Step 7: rg forbidden patterns**

```bash
grep -r "TODO\|TBD\|FIXME\|placeholder\|your-org\|rm -rf\|Remove-Item" career-skills-marketplace/ --include="*.md" --include="*.yaml" --include="*.json" --include="*.sh" --include="*.ps1" -l || echo "PASS"
```

- [ ] **Step 8: Pack C live_research_required check**

```bash
for skill in market-radar xhs-interview-miner nowcoder-tech-miner wechat-insight-reader salary-radar company-risk-auditor industry-trend-analyst; do
  grep "live_research_required: true" "career-skills-marketplace/skills/$skill/contract.yaml" || echo "FAIL: $skill missing live_research_required"
done
```

- [ ] **Step 9: Installer smoke test**

```powershell
$env:CODEX_HOME = "<repo>\.tmp-v1-test\codex"
.\career-skills-marketplace\install.ps1 -Target codex
# Verify 35 SKILL.md files + _career-skills-shared
# Then cleanup
```

- [ ] **Step 10: Fix any issues found, commit**
- [ ] **Step 11: Final commit if needed:** `fix: v1 validation audit fixes`

---

## Task 10: Simplify + PJR + merge-to-dev

**Subagent: Main agent — sequential quality gates**

- [ ] **Step 1: Simplify Review** — scope creep check, file responsibility, example quality
- [ ] **Step 2: PJR** — JSON/YAML parse, whitespace, shell syntax
- [ ] **Step 3: merge-to-dev** — rebase, merge, push

---

## Parallelization Map

```
Task 0 (worktree) ──────────────────────────→ dispatch subagents

Task 1 (Pack A: 7 skills) ─────────────────┐
Task 2 (Pack B: 8 skills) ─────────────────┤
Task 3 (Pack C: 8 skills) ─────────────────┤──→ Task 5 (routing) ─┐
Task 4 (Pack D: 8 skills) ─────────────────┤                       │
Task 6 (shared rubrics) ───────────────────┤                       ├─→ Task 9 (validation) → Task 10 (merge)
Task 7 (knowledge taxonomy) ───────────────┘   Task 8 (manifest) ──┘

Tasks 1-4 + 6-7 are fully parallelizable (6 subagents)
Task 5 depends on Tasks 1-4 (needs skill names for routing)
Task 8 depends on Tasks 1-4 (needs skill names for manifest)
Task 9 depends on ALL (final audit)
Task 10 depends on Task 9 (quality gates)
```

**Recommended subagent assignment (8 subagents):**
- Subagent A: Task 1 (Pack A)
- Subagent B: Task 2 (Pack B)
- Subagent C: Task 3 (Pack C)
- Subagent D: Task 4 (Pack D)
- Subagent E: Task 5 (routing) — runs after A-D complete
- Subagent F: Task 6 (shared rubrics)
- Subagent G: Task 7 (knowledge taxonomy)
- Subagent H: Task 8 (manifest + docs) — runs after A-D complete
- Main agent: Task 9 (validation) + Task 10 (merge)
