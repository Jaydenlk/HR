# 示例：有强购房需求的城市分析

## 核心逻辑

当 has_housing_requirement=true 时，「生活成本可持续性」维度的权重应实质性影响评分。
北京/深圳的购房成本会显著拖低 cost_sustainability 评分。

## 输出摘要

```json
{
  "cost_of_living_impact": [
    {
      "city": "北京",
      "typical_salary_range": "后端技术专家：30-50k/月",
      "housing_cost_note": "五环内均价7-12万/平，100平首付需150-300万",
      "purchasing_power_note": "月薪30k，实得约22k，月储蓄10-12k，10年内积累首付勉强可行但压力极大"
    },
    {
      "city": "杭州",
      "typical_salary_range": "Go后端5年：25-40k/月",
      "housing_cost_note": "余杭均价3-4万/平，100平首付需70-100万",
      "purchasing_power_note": "月薪30k，实得约22k，月储蓄约15k，5-7年内首付可行"
    },
    {
      "city": "成都",
      "typical_salary_range": "Go后端5年：15-25k/月",
      "housing_cost_note": "市区均价2-3万/平，100平首付需50-80万",
      "purchasing_power_note": "虽然生活成本低，但薪资水平也低，需要确认30k+薪资是否可达"
    }
  ]
}
```

## 关键规则

- housing_cost_note 中必须给出具体价格区间（不是"较贵"）
- purchasing_power_note 中必须有简单的储蓄计算
- 数据来源说明：基于2024年公开市场参考数据，应告知用户验证最新行情
