# company-risk-auditor

公司风险深度审计 skill — 聚合裁员历史、文化信号、已知问题，帮助用户评估求职目标公司的稳定性和风险。

## 核心能力

- 查询裁员历史和规模
- 分析文化信号（实名评价/职言）
- 识别财务和法律风险
- 无实时数据时明确降级并提供自查建议

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `company` | string | 是 | 公司名称 |
| `role` | string | 否 | 目标岗位 |
| `focus_areas` | array | 否 | 重点风险维度 |

## 输出结构

```
risk_profile
├── overall_risk          # 整体风险等级（无数据时为 unknown）
├── layoff_history        # 裁员历史
├── culture_signals[]     # 文化信号
├── known_issues[]        # 已知问题
├── financial_signals[]   # 财务信号
└── data_age_warning      # 历史数据时效警告
```

## 降级行为

| 情况 | 处理 |
|------|------|
| 有实时来源 | 正常输出 |
| 无实时来源 | confidence: low，data_age_warning 必填 |
| 无任何数据 | confidence: insufficient，overall_risk: unknown |

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 有实时数据的完整风险审计 |
| `examples/degradation.md` | 降级到知识图谱的输出 |
