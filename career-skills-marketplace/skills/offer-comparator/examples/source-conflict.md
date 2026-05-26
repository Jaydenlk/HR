# 示例：信息不完整时的处理方式

## 场景

用户提供了两个 offer，但均未提供工时信息，其中一个缺少年终奖信息。

## 输入

```json
{
  "offers": [
    {
      "offer_id": "offer_a",
      "company": "A 公司",
      "base_monthly": 30000,
      "months_per_year": 14
    },
    {
      "offer_id": "offer_b",
      "company": "B 公司",
      "base_monthly": 25000,
      "months_per_year": 13,
      "annual_bonus_months": 2
    }
  ]
}
```

## 输出（节选）

```json
{
  "skill_name": "offer-comparator",
  "skill_version": "1.0.0",
  "summary": "A 公司年总包（不含年终奖，因未提供）约 42万，B 公司约 37.5万。两个 offer 均缺少工时信息，无法计算时薪。",
  "confidence": "low",
  "recommendations": [
    "请补充 A 公司年终奖信息，这对比较结果有显著影响",
    "请补充两家公司实际工时，以便计算真实时薪"
  ],
  "comparison": [
    {
      "offer_id": "offer_a",
      "company": "A 公司",
      "dimensions": {
        "annual_total_compensation": 420000,
        "effective_monthly": 35000,
        "stability_score": null,
        "growth_potential": "信息不足，无法评估"
      }
    }
  ],
  "hourly_rate_comparison": [
    {
      "offer_id": "offer_a",
      "company": "A 公司",
      "weekly_hours": null,
      "hourly_rate_rmb": null
    },
    {
      "offer_id": "offer_b",
      "company": "B 公司",
      "weekly_hours": null,
      "hourly_rate_rmb": null
    }
  ],
  "missing_info": [
    {
      "offer_id": "offer_a",
      "field": "annual_bonus_months",
      "impact": "年终奖信息缺失导致无法计算完整年总包，A 公司年总包可能被低估"
    },
    {
      "offer_id": "offer_a",
      "field": "weekly_hours",
      "impact": "无法计算时薪，工作生活平衡维度无法量化"
    },
    {
      "offer_id": "offer_b",
      "field": "weekly_hours",
      "impact": "无法计算时薪"
    }
  ]
}
```

## 说明

- 缺失关键字段时，相关计算结果为 null，不强行推断
- missing_info 列出每个缺失项的具体影响
- confidence 降级为 low
