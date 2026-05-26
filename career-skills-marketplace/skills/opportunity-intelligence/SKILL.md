---
name: opportunity-intelligence
description: >
  求职机会综合评估。当用户问"这个机会值得投吗"、"这家公司好不好"、
  "我和这个岗位匹配度怎样"、"要不要接受这个 offer"、
  "帮我分析一下这个职位"时触发。
  综合匹配度、市场定位、风险信号三个维度，给出 0-100 评分和明确建议。
allowed-tools:
  - Read
  - Grep
---

# opportunity-intelligence — 求职机会综合评估

## 职责

整合 JD 分析结果、用户画像匹配诊断和来源质量评审，计算求职机会综合价值分数，输出结构化评估报告。**所有评分必须基于传入的分析数据，禁止在数据缺失时编造分数。**

## 工作机制

### 评分维度

| 维度 | 权重 | 数据来源 |
|---|---|---|
| 候选人匹配度 | 40% | match-diagnosis 输出 |
| 市场定位（薪资/品牌/成长） | 35% | jd-analyzer 输出 |
| 风险系数（取反） | 25% | jd-analyzer.risk_signals + source-quality-auditor |

综合分 = 匹配分×0.4 + 市场分×0.35 + (100−风险分)×0.25，结果取整至 0-100。

### 推荐结论逻辑

| 综合分 | 推荐结论 |
|---|---|
| 80-100 | `strong_apply` — 强烈建议投递 |
| 60-79 | `apply_with_caution` — 建议投递但需关注风险 |
| 40-59 | `skip` — 不建议投递 |
| < 40 | `skip` — 明确不建议 |
| 数据不足 | `need_more_info` — 需补充信息 |

## 证据要求

- 必须提供 `jd_analysis`（来自 jd-analyzer）或原始 `jd_text`
- `user_profile`（来自 profile-builder）缺失时，匹配维度降级为 `cannot_determine`
- `source_quality`（来自 source-quality-auditor）缺失时，来源可信度置为 `unknown`

## 失效模式

- **数据缺失**：jd_analysis 和 jd_text 均未提供 → 返回 insufficient，不输出评分
- **匹配维度空**：user_profile 缺失 → opportunity_score 仅基于市场+风险，明确标注
- **虚假机会**：source_quality 显示 red 信号 → risk_flags 必须包含来源风险

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | jd_analysis + user_profile + source_quality 三维齐全 |
| `medium` | 缺少 user_profile 或 source_quality 之一 |
| `low` | 仅有 jd_text，缺少 profile 和来源质量 |
| `insufficient` | 无有效 JD 数据 |

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` | 查询目标公司的已知风险信号、公司类型（tier）和发展阶段，辅助风险维度评分 | 计算风险系数（25%权重）时，判断公司是否属于已知高风险类别 | 风险维度仅依赖 jd-analyzer 输出的 risk_signals，不补充公司历史信息 |
| `../_career-skills-shared/knowledge/company-taxonomy/company-types.yaml` | 公司类型分类，辅助判断市场定位维度（35%权重）中的品牌价值评估 | 评估公司品牌/成长维度时 | 品牌维度标注为 uncertain，仅依赖 JD 文本推断 |
