# 示例：数据陈旧时的低置信度输出

## 场景

获取到市场数据，但所有来源时间均超过 90 天。

## 输入

```json
{
  "query": "前端工程师",
  "city": "深圳",
  "timeframe": "recent_quarter"
}
```

## 输出

```json
{
  "skill_name": "market-radar",
  "skill_version": "1.0.0",
  "summary": "找到 2 个前端工程师市场数据来源，但均超过 90 天，时效性存疑。以下数据仅供参考，建议自行查阅最新信息。",
  "confidence": "low",
  "evidence_used": [
    { "source": "某招聘平台报告", "grade": "C", "date": "2025-12-01" }
  ],
  "recommendations": [
    "本次数据时效性较低，建议在 BOSS直聘实时搜索确认"
  ],
  "risks": [
    "所有数据来源超过 90 天，市场情况可能已有显著变化"
  ],
  "next_actions": [
    "在 BOSS直聘搜索「前端工程师 深圳」查看最新 JD 数量"
  ],
  "follow_up_questions": [],
  "cannot_determine": [
    "2026 年 Q2 深圳前端工程师实时需求（来源已过期）"
  ],
  "trending_roles": [
    {
      "role_name": "React 前端工程师",
      "demand_signal": "stable",
      "source": "某招聘平台报告 2025-12"
    }
  ],
  "hot_companies": [],
  "market_sentiment": "neutral",
  "key_signals": [],
  "data_freshness": "stale"
}
```

## 说明

- 数据超过 90 天时 confidence 降为 low，data_freshness 为 stale
- market_sentiment 仍可填写但须注明时效局限
