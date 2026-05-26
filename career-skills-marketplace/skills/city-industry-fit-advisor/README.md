# city-industry-fit-advisor

城市与行业适配度分析 skill — 分析用户在哪个城市和行业的组合最适合，覆盖北上深杭成都等主要城市。

## 核心原则

**数据驱动**：适配度评分基于用户技能、城市行业特性、生活成本三个维度，拒绝"北上广机会多"等泛化建议。

## 覆盖城市

北京 / 上海 / 深圳 / 杭州 / 成都 / 武汉 / 西安 + 更多

## 输出结构

```
fit_matrix[]
├── city + industry
├── fit_score         # 综合适配度（0-100）
├── fit_breakdown     # 各维度分解
└── evidence_basis[]  # 引用 profile 字段

cost_of_living_impact[]
├── typical_salary_range
├── housing_cost_note
└── purchasing_power_note

industry_hub_analysis[]
├── key_companies[]
├── cluster_effect
└── career_ceiling

recommendation        # 最高适配度组合推荐
```

## 适配度计算维度

| 维度 | 权重 |
|---|---|
| 技能匹配度 | 40% |
| 职业天花板 | 30% |
| 生活成本可持续性 | 20% |
| 个人约束满足度 | 10% |

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | Go 后端工程师：北京 vs 杭州 vs 成都 |
| `examples/housing-constraint.md` | 有购房需求的用户分析 |
| `examples/family-constraint.md` | 家庭约束（父母在成都）的城市分析 |
| `examples/single-city.md` | 只有一个城市意向 → 提示 |
