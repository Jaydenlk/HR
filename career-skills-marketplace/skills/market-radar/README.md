# market-radar

市场信号聚合 skill — 从多个实时来源聚合市场趋势、热门岗位和行业动态。

## 核心能力

- 聚合招聘平台热门岗位信号
- 识别招聘活跃公司
- 输出结构化市场情绪评估
- 无实时数据时主动降级，拒绝推断

## 输入

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | 是 | 市场查询关键词（>= 2 字） |
| `city` | string | 否 | 城市过滤 |
| `timeframe` | string | 否 | 时间范围（默认 recent_quarter） |
| `industry` | string | 否 | 行业过滤 |

## 输出结构

```
trending_roles[]      # 热门岗位（无数据时为空）
hot_companies[]       # 招聘活跃公司（无数据时为空）
market_sentiment      # 市场情绪（无数据时为 unknown）
key_signals[]         # 关键信号（无数据时为空）
data_freshness        # 数据时效状态
```

## 置信度规则

| 等级 | 条件 |
|------|------|
| `high` | 3+ 个 A/B 级实时来源，30 天内 |
| `medium` | 1-2 个 B 级来源，90 天内 |
| `low` | 仅 C 级或超过 90 天 |
| `insufficient` | 无实时数据（必须降级） |

## 降级行为

无法获取实时数据时：
- 所有数组字段返回空
- `market_sentiment` 为 `unknown`
- `confidence` 为 `insufficient`
- 提示用户自行查阅 BOSS直聘/脉脉/猎聘

## 示例

| 文件 | 说明 |
|------|------|
| `examples/happy-path.md` | 成功获取实时数据的完整输出 |
| `examples/degradation.md` | 无实时数据时的降级输出 |

## 依赖

- `source-quality-auditor`：验证来源质量
