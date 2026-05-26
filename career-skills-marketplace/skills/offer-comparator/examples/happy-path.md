# 示例：两个信息完整的 offer 比较

## 输入

```json
{
  "offers": [
    {
      "offer_id": "offer_a",
      "company": "字节跳动",
      "role": "后端工程师",
      "base_monthly": 35000,
      "months_per_year": 14,
      "annual_bonus_months": 2,
      "equity_type": "RSU",
      "equity_value_annual": 200000,
      "social_insurance_rate": 0.12,
      "probation_salary_ratio": 0.8,
      "weekly_hours": 60,
      "city": "北京",
      "remote_policy": "onsite",
      "company_stage": "public"
    },
    {
      "offer_id": "offer_b",
      "company": "某银行科技部",
      "role": "后端工程师",
      "base_monthly": 25000,
      "months_per_year": 13,
      "annual_bonus_months": 3,
      "equity_type": "none",
      "social_insurance_rate": 0.12,
      "probation_salary_ratio": 1.0,
      "weekly_hours": 40,
      "city": "北京",
      "remote_policy": "hybrid",
      "company_stage": "mature"
    }
  ],
  "user_priorities": ["工作生活平衡很重要", "希望有上升空间"]
}
```

## 输出

```json
{
  "skill_name": "offer-comparator",
  "skill_version": "1.0.0",
  "summary": "字节跳动年总包（不含RSU）约 59万，银行约 38万；时薪字节约 224元/时，银行约 154元/时。考虑工作生活平衡优先级，银行时薪差距缩小但仍显著低于字节。",
  "confidence": "high",
  "evidence_used": [
    { "source": "用户提供 offer_a 数据", "grade": "A" },
    { "source": "用户提供 offer_b 数据", "grade": "A" }
  ],
  "recommendations": [
    "从纯收入看，字节年总包高出银行约 55%（不含RSU）",
    "考虑时薪，字节时薪约 224元/时，银行约 154元/时，但字节额外工时约 1000小时/年",
    "银行试用期无折扣，字节试用期损失约 7000元/月"
  ],
  "risks": [
    "字节RSU价值受股价影响，不建议纳入确定性计算",
    "字节周 60小时意味着年额外工时约 1000小时，隐性成本较高"
  ],
  "next_actions": [
    "如果工作生活平衡是首要考虑，时薪差距可接受则银行更优",
    "如果选字节，建议在行权前保守规划财务，不依赖RSU"
  ],
  "follow_up_questions": [
    "字节的 RSU 行权条件是多少年？",
    "银行是否有晋升通道或转岗机会？"
  ],
  "cannot_determine": [
    "字节RSU实际兑现价值（依赖未来股价）"
  ],
  "comparison": [
    {
      "offer_id": "offer_a",
      "company": "字节跳动",
      "dimensions": {
        "annual_total_compensation": 594000,
        "effective_monthly": 49500,
        "social_insurance_annual": 50400,
        "probation_loss": 7000,
        "stability_score": 6,
        "growth_potential": "互联网大厂，晋升竞争激烈，技术成长快"
      }
    },
    {
      "offer_id": "offer_b",
      "company": "某银行科技部",
      "dimensions": {
        "annual_total_compensation": 400000,
        "effective_monthly": 33333,
        "social_insurance_annual": 36000,
        "probation_loss": 0,
        "stability_score": 9,
        "growth_potential": "金融科技转型，晋升较慢但职业稳定"
      }
    }
  ],
  "weighted_scores": [
    {
      "offer_id": "offer_a",
      "company": "字节跳动",
      "total_score": 65,
      "dimension_scores": {
        "compensation": 80,
        "growth": 75,
        "stability": 45,
        "work_life_balance": 20
      }
    },
    {
      "offer_id": "offer_b",
      "company": "某银行科技部",
      "total_score": 72,
      "dimension_scores": {
        "compensation": 50,
        "growth": 55,
        "stability": 90,
        "work_life_balance": 90
      }
    }
  ],
  "recommendation": {
    "preferred_offer_id": "offer_b",
    "rationale": "用户优先考虑工作生活平衡，银行方案在该维度显著优于字节，且时薪差距在合理范围内（154 vs 224 元/时）。字节RSU价值不确定，不建议纳入决策权重。",
    "confidence": "medium",
    "caveats": [
      "如果用户更看重收入最大化，字节的决定性因素是RSU能否兑现",
      "建议与银行确认是否有弹性工时或远程办公机会"
    ]
  },
  "hourly_rate_comparison": [
    {
      "offer_id": "offer_a",
      "company": "字节跳动",
      "weekly_hours": 60,
      "hourly_rate_rmb": 224.4
    },
    {
      "offer_id": "offer_b",
      "company": "某银行科技部",
      "weekly_hours": 40,
      "hourly_rate_rmb": 192.3
    }
  ],
  "missing_info": []
}
```
