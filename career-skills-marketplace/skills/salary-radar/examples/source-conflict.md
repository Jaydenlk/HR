# 示例：无实时数据时降级到历史知识库

## 输入

```json
{
  "role": "量化研究员",
  "city": "上海"
}
```

## 输出

```json
{
  "skill_name": "salary-radar",
  "skill_version": "1.0.0",
  "summary": "当前无法获取实时薪资数据，已降级到历史知识库。数据时效性标注为 stale，仅供参考，不建议直接用于 offer 谈判。",
  "confidence": "low",
  "evidence_used": [],
  "recommendations": [
    "以下数据来自历史知识库，时效性存疑，请自行在脉脉/牛客验证",
    "建议在脉脉搜索「量化研究员 上海 薪资」获取近期爆料"
  ],
  "risks": [
    "当前数据来自历史知识库，非实时，市场可能已有显著变化",
    "量化行业薪资波动较大，历史数据参考价值有限"
  ],
  "next_actions": [
    "在脉脉薪资爆料搜索量化研究员真实薪资",
    "参考猎聘等平台近期 JD 薪资标注"
  ],
  "follow_up_questions": [
    "您目标是私募还是券商？",
    "是否可以分享已有 offer 的薪资结构？"
  ],
  "cannot_determine": [
    "2026年上海量化研究员当前市场薪资（无实时数据）"
  ],
  "salary_range": {
    "p25": 30000,
    "p50": 50000,
    "p75": 80000,
    "unit": "monthly_rmb",
    "year": "2024",
    "city": "上海",
    "role": "量化研究员",
    "grade": "C",
    "freshness": "stale"
  },
  "breakdown": {
    "base_monthly": 50000,
    "months_per_year": 12,
    "annual_bonus": "私募年终奖差异极大（0-300%+），以实际协议为准",
    "equity": "部分私募有跟投机制",
    "social_insurance": "社保按最低基数缴存较普遍"
  },
  "data_sources": [
    {
      "source_name": "历史知识库（截至 2024 年）",
      "grade": "C"
    }
  ],
  "comparison": [],
  "data_freshness": "stale"
}
```

## 说明

- 降级到历史数据时 confidence 为 low，grade 为 C
- salary_range 中 year 标注为历史年份，明确说明时效
- 必须在 summary 和 risks 中告知用户数据时效问题
