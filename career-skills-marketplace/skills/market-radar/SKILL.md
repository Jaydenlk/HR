---
name: market-radar
description: >
  聚合多来源市场信号（趋势/热门岗位/行业动态）。当用户询问市场热门方向、
  就业形势、行业动态时触发。必须依赖实时数据，无数据时降级为 insufficient。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# market-radar — 市场信号聚合

## 核心职责

聚合来自招聘平台、行业媒体、社区讨论的多来源市场信号，输出结构化的市场趋势分析。

**严格约束：无实时来源时 confidence 必须为 insufficient，禁止推断市场结论。**

## 实时数据要求

| 级别 | 要求 |
|------|------|
| 高置信度 | 3+ 个 A/B 级来源，30 天内 |
| 中置信度 | 1-2 个 B 级来源，90 天内 |
| 低置信度 | 仅 C 级或超过 90 天 |
| insufficient | 无实时数据，输出降级结果 |

## 降级行为

当无法获取实时数据时：
1. `confidence` 设为 `insufficient`
2. `trending_roles`、`hot_companies`、`key_signals` 返回空数组
3. `market_sentiment` 设为 `unknown`
4. `summary` 明确说明降级原因
5. `next_actions` 引导用户自行查阅 BOSS直聘/脉脉/猎聘

**禁止：** 使用训练数据推断当前市场趋势并以 high/medium confidence 输出。

## 数据来源优先级

| 来源 | 可靠性 |
|------|--------|
| 招聘平台 JD 聚合（BOSS/猎聘/拉勾） | A 级（有 URL + 日期） |
| 行业报告（求职机构/猎头） | B 级（需注明发布日期） |
| 脉脉/知乎职场讨论 | C 级（混杂主观意见） |
| 训练集知识（无实时支撑） | D 级，禁止使用 |

## 输出字段说明

### trending_roles[]
热门岗位，每项含：
- `role_name`：职位名称
- `demand_signal`：需求趋势（surging/growing/stable/declining）
- `source`：来源平台或 URL

### hot_companies[]
招聘活跃公司，每项含：
- `company_name`：公司名称
- `hiring_signal`：招聘活跃信号描述（如"本季度发布 50+ JD"）

### market_sentiment
整体市场情绪：`positive` / `neutral` / `negative` / `unknown`（无数据时必须为 unknown）

### key_signals[]
关键市场信号，每项含：
- `signal`：信号描述
- `source`：来源
- `date`：发布日期（ISO 8601）

## 中国市场特殊考量

- 春招（2-4月）/ 秋招（8-11月）周期对市场信号影响显著
- 政策导向（新能源/AI/半导体等）对热门赛道有直接影响
- 一线城市与新一线城市岗位分布差异大，需明确城市维度
