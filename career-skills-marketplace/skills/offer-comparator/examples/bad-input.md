# 示例：只有一个 offer（不满足最低 2 个要求）

## 输入

```json
{
  "offers": [
    {
      "offer_id": "only_one",
      "company": "某公司",
      "base_monthly": 20000
    }
  ]
}
```

## 输出

```json
{
  "skill_name": "offer-comparator",
  "skill_version": "1.0.0",
  "summary": "offer-comparator 需要至少 2 个 offer 进行比较，当前只提供了 1 个。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供至少 2 个 offer 信息后重试"],
  "risks": [],
  "next_actions": ["如需评估单个 offer 是否合理，请使用 salary-radar"],
  "follow_up_questions": ["您还有其他 offer 可以一起比较吗？"],
  "cannot_determine": ["Offer 比较（offer 数量不足）"],
  "comparison": [],
  "weighted_scores": [],
  "recommendation": {
    "preferred_offer_id": "",
    "rationale": "offer 数量不足，无法比较",
    "confidence": "insufficient"
  },
  "hourly_rate_comparison": [],
  "missing_info": [
    {
      "offer_id": "only_one",
      "field": "second_offer",
      "impact": "需要至少 2 个 offer 才能进行比较"
    }
  ]
}
```
