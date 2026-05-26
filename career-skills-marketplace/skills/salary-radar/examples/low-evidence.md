# 示例：仅有 C 级来源的低置信度薪资分析

## 场景

仅有口碑/论坛传言作为来源，无 A/B 级可验证来源。

## 输入

```json
{
  "role": "游戏策划",
  "city": "成都"
}
```

## 输出（节选）

```json
{
  "skill_name": "salary-radar",
  "skill_version": "1.0.0",
  "summary": "成都游戏策划薪资数据仅来自 C 级来源（论坛口碑），置信度低，建议交叉验证。",
  "confidence": "low",
  "salary_range": {
    "p25": 8000,
    "p50": 12000,
    "p75": 18000,
    "unit": "monthly_rmb",
    "year": "2025",
    "city": "成都",
    "role": "游戏策划",
    "grade": "C",
    "freshness": "stale"
  },
  "data_sources": [
    { "source_name": "游戏论坛薪资讨论", "grade": "C" }
  ],
  "data_freshness": "stale"
}
```
