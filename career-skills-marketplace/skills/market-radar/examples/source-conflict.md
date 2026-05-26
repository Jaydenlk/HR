# 示例：无实时数据时的降级行为

## 场景

用户询问市场情况，但无法获取实时搜索结果（网络不可用或搜索工具不可用）。

## 输入

```json
{
  "query": "量化交易工程师",
  "city": "上海"
}
```

## 输出

```json
{
  "skill_name": "market-radar",
  "skill_version": "1.0.0",
  "summary": "当前无法获取实时市场数据，无法提供可靠的市场分析。建议您直接查阅招聘平台获取最新信息。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请前往 BOSS直聘搜索「量化交易工程师」查看最新 JD 数量和薪资",
    "在脉脉职言搜索相关讨论，了解求职者实际体验",
    "猎聘、领英等平台也有较多量化方向岗位"
  ],
  "risks": [
    "本 skill 当前无实时数据支撑，任何市场判断均不可靠"
  ],
  "next_actions": [
    "自行查阅 BOSS直聘：https://www.zhipin.com",
    "自行查阅猎聘：https://www.liepin.com",
    "获取实时数据后可重新运行本 skill"
  ],
  "follow_up_questions": [
    "您倾向于哪类量化机构（私募/券商/期货）？",
    "是否有特定城市偏好？"
  ],
  "cannot_determine": [
    "当前量化工程师市场需求趋势",
    "上海量化机构招聘热度",
    "薪资区间（需实时来源）"
  ],
  "trending_roles": [],
  "hot_companies": [],
  "market_sentiment": "unknown",
  "key_signals": [],
  "data_freshness": "unavailable"
}
```

## 说明

- 无实时数据时 confidence 强制为 insufficient
- 所有数组字段返回空，market_sentiment 为 unknown
- next_actions 引导用户自行查阅真实来源
- 不使用训练数据推断量化市场趋势
