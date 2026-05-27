# F3 Full Audit Summary

> Date: 2026-05-27
> Branch: feature/career-skills-v1-full
> Auditors: 8 independent reviewer subagents

## 37 Skill Verdicts

| Verdict | Count | Skills |
|---------|-------|--------|
| PASS | 28 | application-tracker, behavioral-story-builder*, career-path-planner*, case-interview-coach, city-industry-fit-advisor, company-risk-auditor, daily-plan-generator, follow-up-message-writer, graduate-school-vs-job-advisor, industry-trend-analyst, interview-debrief, jd-analyzer, learning-roadmap-builder, market-radar, match-diagnosis, mock-interviewer, networking-message-writer, nowcoder-tech-miner, personal-brand-builder, portfolio-project-advisor, profile-builder, question-bank-builder, referral-strategy, resume-tailor, role-transition-advisor, skill-gap-planner, source-quality-auditor*, xhs-interview-miner |
| PASS_WITH_RISKS | 5 | application-strategist, career-principal, company-interview-playbook, interview-intelligence, salary-radar |
| FAIL | 2 | offer-comparator (math errors), opportunity-intelligence (math error) |

*有需修复的非阻塞问题

## P0 Issues (Must Fix)

| # | Source | Issue |
|---|--------|-------|
| 1 | F3-B | hallucination-guard 验证器假阳性：5 skill 用非标准格式被跳过 |
| 2 | F3-B | career-principal guard 引用不存在的 `aggregated_result` 字段 |
| 3 | F3-B | source-quality-auditor guard 用 `critical_assertions` 非标准结构 |
| 4 | F3-B | match-diagnosis/resume-tailor guard 用 prose `check` 字符串 |
| 5 | F3-B | company-risk-auditor guard enum 值 `insufficient` 不在 schema 中 |
| 6 | F3-B | role-transition-advisor guard enum 值 `unknown`/`insufficient` 不在 schema 中 |
| 7 | F3-B | offer-comparator guard `contains` 对 array-of-objects 语义错误 |
| 8 | F3-A | KG 3 个跨 tier 重复公司 (zhipuai-tech/baichuan-ai/moonshot-ai in T3 vs zhipu/baichuan/moonshot in T1) |
| 9 | F3-A | KG 6-7 个 AI 公司误分类为 new_energy |
| 10 | F3-A | KG 3 个 id 命名错误 (dji-agibot→宇树, dji-overseas→石头, deepl-cn→科大讯飞) |
| 11 | F3-C | marketplace.yaml depends_on 与 contract.yaml 6 处不一致 |
| 12 | F3-C | find_interview_experience 路由到 source-quality-auditor 而非 interview-intelligence |
| 13 | F3-F | opportunity-intelligence happy-path 数学错误 (80.95≠74) |
| 14 | F3-F | offer-comparator happy-path 三处数值矛盾 |
| 15 | F3-H | v1-complete fixtures 与 workflow fixtures assertion schema 不兼容 |

## P1 Issues (Should Fix)

| # | Source | Issue |
|---|--------|-------|
| 16 | F3-C | xhs/nowcoder 缺 input_schema.json |
| 17 | F3-G | salary-radar BOSS直聘 grade 三方不一致 |
| 18 | F3-G | wechat-insight-reader test 用 `query` 不是 `topic` |
| 19 | F3-E | interview-intelligence tools vs live_research 矛盾 |
| 20 | F3-G | technical-interview-coach tools vs live_research 矛盾 |
| 21 | F3-D | behavioral-story-builder evidence_used 为空 |
| 22 | F3-D | company-interview-playbook salary 声明未走 source-quality-auditor |
| 23 | F3-D | career-principal SKILL.md Pack B 缺 interview-intelligence/interview-debrief |
| 24 | F3-H | networking-cold-outreach fixture length_gte vs lte 矛盾 |

## P2 Issues (Deferred)

- Various minor confidence table ambiguities
- career-path-planner fit_pct 1分偏差 (82 vs 81)
- 部分 skill 城市数据未标注数据年份
- 部分 knowledge 路径 SKILL.md vs contract.yaml 前缀不一致

## 结论

**不能直接进入 F4/F5。** 15 个 P0 + 9 个 P1 必须先修。
