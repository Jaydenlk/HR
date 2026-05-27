---
name: company-risk-auditor
description: >
  深度审计公司求职风险（裁员历史/文化信号/已知问题）。
  当用户收到 offer 需要做背调或询问公司稳定性时触发。
  无实时数据时降级到知识图谱并明确标注时效警告。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# company-risk-auditor — 公司风险深度审计

## 核心职责

从多个来源聚合公司的求职风险信息：裁员历史、文化信号、已知问题、财务健康状况。

**严格约束：**
1. 无实时来源时降级到知识图谱，confidence: low，必须标注 data_age_warning
2. 无任何数据时 confidence: insufficient，overall_risk: unknown
3. 禁止无来源地给出"此公司非常安全"等确定性结论

## 数据来源优先级

| 来源 | 等级 | 内容 |
|------|------|------|
| 工商局/法院公开记录 | A | 法律纠纷、工资拖欠诉讼 |
| 财经新闻（界面/36氪） | A/B | 裁员报道、融资情况 |
| 脉脉职言 | B | 文化信号、实名评价 |
| 知乎讨论 | B/C | 综合评价（需交叉验证） |
| 小红书帖子 | C | 仅作参考 |

## 降级行为

| 情况 | 处理 |
|------|------|
| 有实时来源 | 正常输出，标注来源 |
| 无实时来源 | 知识图谱，confidence: low，data_age_warning 必填 |
| 无任何数据 | confidence: insufficient，overall_risk: unknown |

## 风险等级定义

| 等级 | 含义 |
|------|------|
| `low` | 无明显风险信号，公司状况稳定 |
| `medium` | 有一定风险信号，建议深入了解 |
| `high` | 多个高风险信号，慎重考虑 |
| `critical` | 有重大裁员/欠薪/法律风险记录 |
| `unknown` | 无足够数据评估（默认值） |

## 中国特色风险信号

见 `references/china-company-risk-signals.md`

- 欠薪记录（劳动仲裁/法院执行名单）
- 大规模裁员（N+1 补偿不到位）
- 股权缩水或融资停止
- 管理层频繁变动
- 工商异常（法院被执行、经营异常名单）

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` | 已知公司的已知风险信号（known_risk_signals）、公司类型和历史记录 | 查询目标公司已知历史风险时（无实时数据降级场景） | 仅输出"无已知历史记录"，不补充推断，confidence: insufficient |
| `../_career-skills-shared/knowledge/company-taxonomy/company-types.yaml` | 公司类型与典型风险模式的关联（如初创公司资金链风险、国企稳定性） | 按公司类型推断通用风险模式时 | 不做类型推断，仅呈现实时数据中的直接信号 |
