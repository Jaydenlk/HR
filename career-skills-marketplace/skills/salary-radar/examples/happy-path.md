# 示例：有实时数据的薪资分析

## 输入

```json
{
  "role": "后端工程师",
  "city": "北京",
  "years_of_experience": 3,
  "industry": "互联网"
}
```

## 输出

```json
{
  "skill_name": "salary-radar",
  "skill_version": "1.0.0",
  "summary": "北京互联网后端工程师（3年经验）薪资中位数约 30k/月，来自 2 个 B 级来源，数据时间在 90 天内。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "BOSS直聘 JD 薪资范围 2026Q1", "grade": "B" },
    { "source": "猎聘薪资报告 2026", "grade": "B" }
  ],
  "recommendations": [
    "3 年经验后端工程师在北京大厂中位数约 28-35k，您可参考此区间评估 offer",
    "股权部分需单独评估行权条件，不建议将不确定股权计入当前总包"
  ],
  "risks": [
    "薪资数据存在 1-2 个月时差，实际市场可能有波动",
    "大厂与中小公司薪资差距较大，本数据为综合均值"
  ],
  "next_actions": [
    "在 BOSS直聘确认近 30 天同岗位薪资实际标注情况",
    "通过脉脉薪资爆料交叉验证目标公司具体薪资"
  ],
  "follow_up_questions": [
    "您的目标公司是大厂还是中小公司？",
    "offer 中是否包含股权？"
  ],
  "cannot_determine": [],
  "salary_range": {
    "p25": 24000,
    "p50": 30000,
    "p75": 38000,
    "unit": "monthly_rmb",
    "year": "2026",
    "city": "北京",
    "role": "后端工程师（3年经验）",
    "grade": "B",
    "freshness": "fresh"
  },
  "breakdown": {
    "base_monthly": 30000,
    "months_per_year": 13,
    "annual_bonus": "1-3个月月薪（视公司和绩效）",
    "equity": "RSU 或期权（互联网大厂常见，创业公司行权条件差异大）",
    "social_insurance": "公积金缴存比例 8-12%（不同公司差异）"
  },
  "data_sources": [
    {
      "source_name": "BOSS直聘薪资报告 2026Q1",
      "url": "https://www.zhipin.com/report",
      "date": "2026-03-15",
      "grade": "A"
    },
    {
      "source_name": "猎聘薪资白皮书 2026",
      "date": "2026-04-01",
      "grade": "B"
    }
  ],
  "comparison": [
    {
      "dimension": "同岗位全国中位数",
      "value": "约 22k/月",
      "grade": "B"
    },
    {
      "dimension": "同岗位上海中位数",
      "value": "约 28k/月",
      "grade": "B"
    }
  ],
  "data_freshness": "fresh"
}
```
