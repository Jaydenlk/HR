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
  - WebSearch
  - WebFetch
---

# opportunity-intelligence — 求职机会综合评估

## 职责

整合 JD 分析结果、用户画像匹配诊断和来源质量评审，计算求职机会综合价值分数，输出结构化评估报告。**所有评分必须基于传入的分析数据，禁止在数据缺失时编造分数。**

**实时姿态**：市场定位与风险维度涉及时效信息（公司当季动态、薪资行情、近期风险信号）时，先当场 WebSearch/WebFetch 核实、附 URL、标「实时·未核实·日期」；确无可用结果才回落到知识库/降级估算并说明依据。

## 工作机制

### 评分维度

| 维度 | 权重 | 数据来源 |
|---|---|---|
| 候选人匹配度 | 40% | match-diagnosis 输出 |
| 市场定位（薪资/品牌/成长） | 35% | jd-analyzer 输出 |
| 风险系数（取反） | 25% | jd-analyzer.risk_signals + source-quality-auditor |

综合分 = 匹配分×0.4 + 市场分×0.35 + (100−风险分)×0.25，结果取整至 0-100。

**风险分计算规则：**
- 每个 red severity 信号：+30 分
- 每个 yellow severity 信号：+15 分
- 每个 notice severity 信号：+5 分
- 上限 100，超过时截断
- 无风险信号时：风险分 = 0

**市场分计算规则：**
- 公司 tier_1 且 hiring_relevance: high → 基础分 80
- 公司 tier_1 且 hiring_relevance: medium → 基础分 60
- 公司不在知识图谱 → 可当场 WebSearch/WebFetch 核实公司当季动态（招聘节奏、近期融资/裁员、品牌口碑），命中则据此给分并附 URL、标「实时·未核实·日期」；无果才回落基础分 50（标注 confidence 降级）
- 有薪资数据且高于市场中位数 → +10
- 无薪资数据 → 可当场联网核实该岗位/城市的薪资行情，命中则据此估算并附 URL、标「实时·未核实·日期」；无果才不加分、标注 cannot_determine

**匹配分来源：** 直接使用 match-diagnosis 的 overall_match_pct。无 user_profile 时设为 null，公式中该维度权重分摊到市场分。

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
| `../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` | 查询目标公司的已知风险信号、公司类型（tier）和发展阶段，辅助风险维度评分 | 计算风险系数（25%权重）时，判断公司是否属于已知高风险类别 | 知识库未命中时，可当场 WebSearch/WebFetch 核实公司近期风险信号（裁员、欠薪、诉讼、负面口碑），命中则计入并附 URL、标「实时·未核实·日期」；无果才回落为仅依赖 jd-analyzer 的 risk_signals，不补充公司历史信息 |
| `../_career-skills-shared/knowledge/company-taxonomy/company-types.yaml` | 公司类型分类，辅助判断市场定位维度（35%权重）中的品牌价值评估 | 评估公司品牌/成长维度时 | 品牌维度标注为 uncertain，仅依赖 JD 文本推断 |

## 产品原则适用

本 skill 遵循 `../_career-skills-shared/policies/product-principles.md` 中的两项核心原则。

### 信息不足时 (Ask-before-judging)
- 当缺少 `user_profile`（无法计算匹配维度 40% 权重）时，视为信息不足
- 信息不足时不能输出综合评分（`opportunity_score`），因为最大权重维度缺失，任何总分都失去实际意义
- 低置信度时只做 JD 层面的风险评估（仅基于市场分 35% + 风险分 25%），明确标注 `match_score: cannot_determine`
- 追问：「您的简历或画像信息有助于计算匹配度，请提供以获得完整评估」

### 出处-思考-观点 (Source-Reason-Opinion)
- Source: 市场分来自知识图谱公司数据（标注 tier 来源），风险分来自 `jd-analyzer.risk_signals`（每条附 evidence），匹配分来自 `match-diagnosis` 输出
- Reasoning: `summary` 字段体现三维评分的合成逻辑，说明哪个维度拉高/拉低了综合分
- Opinion: `recommendation` 字段（strong_apply/apply_with_caution/skip/need_more_info）标注置信度，`risk_flags` 区分已验证风险与推断风险
