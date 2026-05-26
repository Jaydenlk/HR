# 示例：无效输入（industry 过短）

## 输入

```json
{
  "industry": "a"
}
```

## 输出

```json
{
  "skill_name": "industry-trend-analyst",
  "skill_version": "1.0.0",
  "summary": "industry 字段至少需要 2 个字符，请提供具体的行业名称。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供具体行业名称，如「新能源汽车」「大模型」「医疗健康」"],
  "risks": [],
  "next_actions": [],
  "follow_up_questions": ["您想了解哪个行业或赛道的趋势？"],
  "cannot_determine": ["行业趋势分析（输入无效）"],
  "trend_summary": "输入无效，无法执行分析",
  "growth_signals": [],
  "risk_signals": [],
  "hiring_outlook": "unknown",
  "recommended_entry_roles": [],
  "market_radar_used": false
}
```
