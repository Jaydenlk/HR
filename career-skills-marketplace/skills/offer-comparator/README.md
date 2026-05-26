# offer-comparator

Offer 多维度比较 skill — 基于用户提供的数据，对多个 offer 进行量化比较和推荐。

## 核心能力

- 计算年总包（含年终奖、RSU）
- 计算实际时薪（考虑真实工时）
- 分析试用期薪资损失
- 处理中国市场特有要素（五险一金/年终奖/RSU/虚拟股）
- 多维度加权评分

## 中国市场特殊要素

本 skill 针对中国市场深度优化，特别处理：
- 五险一金缴存比例（影响到手收入约 20-30%）
- 年终奖（月数、发放时间、离职影响）
- RSU vs 虚拟股（权益差异）
- 试用期折扣

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `offers` | array | 是 | 至少 2 个 offer 对象 |
| `weights` | object | 否 | 自定义维度权重 |
| `user_priorities` | array | 否 | 用户优先级说明 |

## 输出结构

```
comparison[]           # 各 offer 多维度详细数据
weighted_scores[]      # 加权综合评分
recommendation         # 推荐意见（含置信度）
hourly_rate_comparison # 时薪对比
missing_info[]         # 缺失信息列表
```

## 注意事项

- 本 skill `live_research_required: false`，使用用户提供数据
- 关键字段缺失时结论会降级，不强行推断
- RSU 和期权由于行权不确定，不纳入确定性年总包计算

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 两个信息完整的 offer 比较 |
| `examples/degradation.md` | 信息不完整时的处理方式 |
