---
name: skill-gap-planner
description: >
  技能差距分析与补强计划。对比用户当前技能（来自 profile）和目标要求（来自 jd-analyzer 或 match-diagnosis），
  生成具体的补强计划。区分快速见效（quick_wins）和长期投资（long_term_investments）。
  所有差距描述必须引用 profile 字段和 JD 字段。
allowed-tools: [Read, Grep]
---

# skill-gap-planner — 技能差距分析与补强计划

## 职责

对比用户当前技能水平和目标职位要求，生成结构化的技能补强计划。
每项差距分析必须同时引用来源（profile 字段）和目标（JD 要求），不做泛化推断。

## 输入要求

必须提供 `profile`，同时建议提供 `jd_analysis`（来自 jd-analyzer）或 `match_result`（来自 match-diagnosis）。
若仅提供 profile 而无 JD 数据，则基于 profile.career_intent.target_roles 使用通用角色要求进行对比。

## 差距分级（gap_severity）

| 等级 | 含义 | 处理方式 |
|---|---|---|
| `critical` | 核心职能技能，缺失则无法胜任 | 放入 learning_plan，优先级最高 |
| `important` | 重要加分项，有则竞争力显著提升 | 放入 learning_plan |
| `nice_to_have` | 锦上添花 | 放入 long_term_investments |

## 快速见效 vs 长期投资

### quick_wins（3个月内可见效）
- 条件：用户已有相关基础，差距主要是深度不足
- 例：已用过 Redis，需要加强分布式锁场景应用
- 输出：具体的练习场景或项目，而非"多学习"

### long_term_investments（3个月以上）
- 条件：需要从零积累，或需要实际项目经验佐证
- 例：从未带过团队，目标是管理岗
- 输出：路径设计，而非单点建议

## 学习计划（learning_plan）

每项计划必须包含：
- 技能名称
- 当前差距（引用 profile 原文）
- 目标水平（引用 JD 原文或通用要求）
- 学习资源（不做推荐，给出类别和评估标准）
- 时间估计（周为单位）
- 可验证的完成标准

## 禁止行为

- 不推荐特定课程（避免过时信息）
- 不给出"每天学2小时"等无法验证的时间计划
- 所有差距必须在 profile 和 JD 中都有对应字段
- 不把 profile 中未提及的技能列为"部分具备"

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
