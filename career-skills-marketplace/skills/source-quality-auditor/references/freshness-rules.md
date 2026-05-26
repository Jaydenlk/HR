# 时效性规则

> 被 SKILL.md 和 shared/source-policy/freshness-rules.yaml 引用。
> 定义不同内容类型的有效期，以及过期处理方式。

---

## 核心原则

1. **旧帖不代表当前趋势**：即使内容表述准确，超过有效期的内容不能支撑"当前/最新"类声明
2. **无日期内容不可判断**：缺少发布日期时，freshness 必须标记为 "unknown"，绝不能猜测
3. **有效期因内容类型而异**：薪资数据比面经更容易过时

---

## 内容类型有效期表

| 内容类型 (claim_type) | 有效期 | 说明 |
|--------------------|--------|------|
| salary（薪资数据）| 12个月 | 市场薪资每年变化，超过1年的数据参考价值大幅下降 |
| job_demand（招聘需求）| 3个月 | 招聘市场变化快，季节性强（秋招/春招/寒冬） |
| company_info（公司信息）| 24个月 | 公司基本面变化较慢，但重大事件（上市/裁员/被收购）可能使旧信息失效 |
| interview_experience（面经）| 18个月 | 技术面题目相对稳定，但大公司会定期更换题库 |
| market_trend（市场趋势）| 6个月 | 技术和就业市场趋势快速变化 |
| other | 12个月 | 默认有效期 |

---

## 计算方式

计算方法：`当前日期 - 内容发布日期 > 有效期` → 标记为 `stale`

```
freshness = "stale" if (current_date - publish_date) > expiry_days[claim_type]
freshness = "fresh" if (current_date - publish_date) <= expiry_days[claim_type]
freshness = "unknown" if publish_date is missing or unparseable
```

---

## 过期内容的处理

过期内容不自动降级，但：

1. 在 `issues` 中记录："内容发布于 {日期}，已超过 {内容类型} 的 {N} 个月有效期"
2. 在 recommendation 中注明 `use_with_caution`（而非 `use`）
3. 如该来源是某个声明的唯一依据，且该声明涉及"当前/最新"，置信度上限降至 low

**例外：** 历史数据场景下（如"2022年的平均薪资是多少"），过期内容仍可标记为 `fresh`，因为问题本身指向历史时点。

---

## 无日期内容处理

| 场景 | 处理 |
|------|------|
| source_type=url，页面无发布日期 | freshness: "unknown"，issues 记录"无发布日期" |
| source_type=verbal，用户未说明时间 | freshness: "unknown"，issues 记录"口述信息无时间背景" |
| source_type=screenshot，截图无时间戳 | freshness: "unknown" |
| 只有"发布年份"无具体月份 | 按年中（7月1日）计算，可接受的近似值 |

---

## 用于 shared/source-policy/freshness-rules.yaml 的机器可读摘要

```yaml
expiry_days:
  salary: 365
  job_demand: 90
  company_info: 730
  interview_experience: 548
  market_trend: 180
  other: 365

missing_date_handling:
  freshness: unknown
  max_grade: C
  add_issue: "无发布日期，时效性无法判断"

stale_handling:
  recommendation: use_with_caution
  confidence_impact: "如为唯一来源且声明含'当前/最新'，置信度上限降至 low"
  grade_unchanged: true
```
