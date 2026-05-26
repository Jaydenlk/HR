# opportunity-intelligence — 求职机会综合评估

## 概述

整合 JD 分析、候选人画像匹配和来源质量三个维度，对求职机会进行综合评分（0-100）并给出明确投递建议。

## 适用场景

- 收到 JD 后想快速判断是否值得投递
- 同时比较多个机会的优先级
- 收到 offer 时进行综合评估
- 秋招/春招批量筛选目标职位

## 输入数据

| 字段 | 必须 | 说明 |
|---|---|---|
| `jd_analysis` | 二选一 | jd-analyzer 的结构化输出 |
| `jd_text` | 二选一 | JD 原文（系统内部解析） |
| `user_profile` | 可选 | profile-builder 输出（缺失则匹配维度标注 cannot_determine） |
| `match_diagnosis` | 可选 | match-diagnosis 输出（已有时直接使用） |
| `source_quality` | 可选 | source-quality-auditor 输出（缺失则来源置 unknown） |

## 评分逻辑

```
综合分 = 匹配分×40% + 市场分×35% + (100−风险分)×25%
```

| 综合分 | 推荐结论 |
|---|---|
| 80-100 | `strong_apply` — 强烈建议投递 |
| 60-79 | `apply_with_caution` — 建议投递但需关注风险 |
| 40-59 | `skip` — 不建议投递 |
| < 40 | `skip` — 明确不建议 |
| 数据不足 | `need_more_info` — 需补充信息 |

## 置信度

| 等级 | 条件 |
|---|---|
| `high` | 三维数据齐全（jd_analysis + user_profile + source_quality） |
| `medium` | 缺少其中一项 |
| `low` | 仅有 JD 文本 |
| `insufficient` | 无有效 JD 数据 |

## 重要限制

- **禁止在缺少 user_profile 时虚构匹配分**：缺失则 match_assessment.score 为 null
- **来源 red 信号必须进入 risk_flags**：source_quality 的红色风险不得被忽略
- 评分结果不作为绝对决策，用户应结合个人情况判断

## 输出示例

见 `examples/happy-path.md`。

## 依赖

- `jd-analyzer` — JD 结构化解析
- `match-diagnosis` — 候选人-JD 匹配诊断
- `source-quality-auditor` — 招聘来源质量评审
