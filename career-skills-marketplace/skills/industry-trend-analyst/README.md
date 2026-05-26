# industry-trend-analyst

行业趋势分析 skill — 分析行业/赛道发展趋势，输出增长/风险信号和推荐入行岗位。

## 核心能力

- 聚合行业增长信号（政策/资本/招聘）
- 识别行业风险信号
- 评估招聘前景
- 推荐适合入行的起步岗位
- 无实时数据时主动降级

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 是 | 行业或赛道名称（>= 2 字） |
| `region` | string | 否 | 地区 |
| `timeframe` | string | 否 | 分析时间维度（默认 mid_term） |

## 输出结构

```
trend_summary              # 趋势概要（无数据时说明降级）
growth_signals[]           # 增长信号（无数据时为空）
risk_signals[]             # 风险信号（无数据时为空）
hiring_outlook             # 招聘前景（无数据时为 unknown）
recommended_entry_roles[]  # 推荐入行岗位（无数据时为空）
```

## 降级行为

无实时数据时：
- 所有信号数组返回空
- `hiring_outlook` 为 `unknown`
- `confidence` 为 `insufficient`
- 引导用户查阅权威行业报告

## 依赖

- `market-radar`：获取实时招聘市场信号
- `source-quality-auditor`：验证行业报告来源质量

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 有实时数据的完整行业趋势分析 |
| `examples/degradation.md` | 无实时数据时的降级输出 |
