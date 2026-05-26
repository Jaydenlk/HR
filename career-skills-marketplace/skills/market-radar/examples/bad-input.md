# 示例：无效输入（查询过短）

## 场景

用户输入的查询关键词过短（少于最小长度要求）。

## 输入

```json
{
  "query": "a"
}
```

## 输出

```json
{
  "skill_name": "market-radar",
  "skill_version": "1.0.0",
  "summary": "输入查询关键词过短（少于 2 个字符），无法执行市场分析。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供至少 2 个字符的查询关键词，如「AI工程师」「产品经理」"],
  "risks": [],
  "next_actions": ["重新输入有效的查询关键词"],
  "follow_up_questions": ["您想了解哪个方向的市场情况？"],
  "cannot_determine": ["市场分析（输入无效）"],
  "trending_roles": [],
  "hot_companies": [],
  "market_sentiment": "unknown",
  "key_signals": [],
  "data_freshness": "unavailable"
}
```
