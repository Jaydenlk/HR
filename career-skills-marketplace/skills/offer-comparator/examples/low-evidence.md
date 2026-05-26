# Offer Comparator — Low Evidence

## 用户输入

```json
{
  "offers": [
    {
      "offer_id": "offer_a",
      "company": "某创业公司",
      "role": "产品经理",
      "base_monthly": 25000
    }
  ],
  "user_priorities": ["薪资最大化"]
}
```

## 调用 Skill

offer-comparator

## 输出摘要

```json
{
  "skill_name": "offer-comparator",
  "skill_version": "1.0.0",
  "summary": "当前仅提供1个 offer，无法进行比较分析。同时关键字段（months_per_year、equity_type、weekly_hours）缺失，无法计算准确总包。以下为基于已知信息的部分估算，置信度低。",
  "confidence": "low",
  "offers_analyzed": 1,
  "ranking": [],
  "comparison_table": [
    {
      "offer_id": "offer_a",
      "estimated_annual_base": 300000,
      "total_comp_estimate": "不可计算（缺少 months_per_year 和 equity 信息）",
      "missing_fields": ["months_per_year", "equity_type", "equity_value_annual", "weekly_hours", "city"]
    }
  ],
  "cannot_determine": [
    "offer 间的相对优劣（仅有1个 offer）",
    "准确的年度总包（关键字段缺失）",
    "工作强度对比"
  ],
  "next_actions": [
    "补充 months_per_year（14薪 or 12薪）",
    "提供股权信息（RSU 年度价值 or 期权数量）",
    "如有其他 offer，一并输入以进行比较"
  ]
}
```

## evidence_used

- offer_a.base_monthly = 25000（唯一已知字段）

## confidence

low — 仅有单个 offer 且关键字段缺失，比较分析无法执行
