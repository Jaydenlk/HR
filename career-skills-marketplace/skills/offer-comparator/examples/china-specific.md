# 示例：中国市场特有要素的比较（RSU vs 虚拟股）

## 场景

用户比较一家上市公司的 RSU 和一家创业公司的虚拟股，需要正确区分两者性质。

## 输入

```json
{
  "offers": [
    {
      "offer_id": "listed_co",
      "company": "某上市公司",
      "base_monthly": 25000,
      "months_per_year": 14,
      "annual_bonus_months": 1,
      "equity_type": "RSU",
      "equity_value_annual": 300000,
      "weekly_hours": 45,
      "city": "上海"
    },
    {
      "offer_id": "startup_co",
      "company": "某创业公司",
      "base_monthly": 30000,
      "months_per_year": 12,
      "annual_bonus_months": 0,
      "equity_type": "virtual_stock",
      "equity_value_annual": 500000,
      "weekly_hours": 55,
      "city": "上海"
    }
  ]
}
```

## 输出（节选）

```json
{
  "skill_name": "offer-comparator",
  "skill_version": "1.0.0",
  "summary": "上市公司固定部分年总包约 42万，RSU 30万/年（可交易，有价值）。创业公司固定部分年总包 36万，虚拟股 50万（非真实股票，仅分红权，价值高度不确定）。不建议将虚拟股纳入确定性总包计算。",
  "confidence": "medium",
  "risks": [
    "创业公司虚拟股并非真实股票，持有人仅有分红权，公司未上市前变现困难",
    "创业公司周工时 55小时，时薪低于上市公司"
  ],
  "recommendation": {
    "preferred_offer_id": "listed_co",
    "rationale": "上市公司RSU可在市场流通，确定性更高。创业公司虚拟股价值不确定，且周工时更长（55h vs 45h），时薪反而更低。",
    "confidence": "medium",
    "caveats": ["如果用户对创业公司赛道有强烈信心，虚拟股有潜在上行空间"]
  },
  "missing_info": [
    {
      "offer_id": "startup_co",
      "field": "equity_vesting_schedule",
      "impact": "虚拟股行权条件未知，可能有服务年限要求"
    }
  ]
}
```

## 说明

- RSU（真实股票）和虚拟股（分红权）必须区别处理
- 虚拟股不纳入确定性年总包计算
