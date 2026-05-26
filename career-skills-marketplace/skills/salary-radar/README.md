# salary-radar

薪资数据聚合 skill — 从多来源聚合岗位/公司/城市维度薪资行情，输出分位数区间。

## 核心能力

- 聚合多来源薪资数据（BOSS直聘/猎聘/脉脉/牛客）
- 计算 P25/P50/P75 分位数
- 分解中国市场特有薪资组成（月薪/年终奖/股权/社保）
- 无实时数据时明确降级，标注时效状态

## 关键规则

**四要素完整性规则：** 薪资数据缺少 year、city、role、source 任一 → grade 强制为 C

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `role` | string | 是 | 岗位名称 |
| `company` | string | 否 | 公司名称 |
| `city` | string | 否 | 城市 |
| `years_of_experience` | integer | 否 | 工作年限 |
| `industry` | string | 否 | 行业 |

## 输出结构

```
salary_range      # P25/P50/P75 分位数（无数据时为 null）
breakdown         # 薪资组成分解
data_sources[]    # 来源列表（含等级）
comparison[]      # 横向对比
data_freshness    # fresh / stale / unavailable
```

## 降级行为

| 情况 | 处理 |
|------|------|
| 有实时来源 | 正常输出 |
| 无实时来源，有历史数据 | freshness: stale, confidence: low |
| 完全无数据 | salary_range: null, confidence: insufficient |

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 有实时数据的完整薪资分析 |
| `examples/degradation.md` | 降级到历史数据的输出 |
