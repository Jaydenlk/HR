# 示例：缺少四要素导致数据降级为 C 级

## 场景

获取到薪资数据，但来源没有注明城市，触发四要素规则降级。

## 输入

```json
{
  "role": "数据分析师"
}
```

## 输出（节选）

```json
{
  "skill_name": "salary-radar",
  "skill_version": "1.0.0",
  "summary": "获取到数据分析师薪资数据，但缺少城市维度，根据四要素规则降级为 C 级。数据仅供参考，建议指定城市获取更精确结果。",
  "confidence": "low",
  "recommendations": [
    "请指定城市（如北京/上海）以获取更精确的薪资区间",
    "全国均值差异较大，跨城市比较意义有限"
  ],
  "risks": [
    "缺少城市维度，数据为全国均值，实际薪资差异可能超过 50%"
  ],
  "salary_range": {
    "p25": 12000,
    "p50": 18000,
    "p75": 28000,
    "unit": "monthly_rmb",
    "year": "2026",
    "city": null,
    "role": "数据分析师",
    "grade": "C",
    "freshness": "fresh"
  },
  "data_sources": [
    { "source_name": "某平台全国均值", "grade": "C" }
  ],
  "comparison": [],
  "data_freshness": "fresh"
}
```

## 说明

- 缺少城市信息 → grade 强制为 C
- 已有 year + role + source 但 city 缺失，仍为 C 级
