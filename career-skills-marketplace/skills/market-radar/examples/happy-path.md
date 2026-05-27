# 示例：有实时数据的市场信号聚合

## 场景

用户询问 AI 方向的北京市场情况，实时获取到招聘平台数据。

## 输入

```json
{
  "query": "AI 算法工程师",
  "city": "北京",
  "timeframe": "recent_month"
}
```

## 输出

```json
{
  "skill_name": "market-radar",
  "skill_version": "1.0.0",
  "summary": "北京 AI 算法工程师市场需求旺盛，大模型/推理方向尤为突出，主要招聘集中在互联网大厂和 AI 创业公司。数据来自 3 个 B 级以上来源，时间在 30 天内。",
  "confidence": "high",
  "evidence_used": [
    { "source": "BOSS直聘搜索结果", "date": "2026-05-20", "grade": "B" },
    { "source": "猎聘行业报告", "date": "2026-05-15", "grade": "B" },
    { "source": "拉勾网 JD 聚合", "date": "2026-05-18", "grade": "B" }
  ],
  "recommendations": [
    "重点关注大模型推理优化方向，近期需求增长超过 40%",
    "RLHF / 强化学习背景在头部公司中溢价明显",
    "建议在 BOSS直聘保持简历活跃状态，该平台 AI 岗位更新频率最高"
  ],
  "risks": [
    "AI 岗位竞争激烈，头部公司学历门槛普遍要求名校硕士或博士",
    "部分创业公司股票价值不确定，需谨慎评估薪酬结构"
  ],
  "next_actions": [
    "针对大模型推理优化更新简历中的项目经验",
    "关注字节/百度/阿里云等大厂近期 AI 招聘动向"
  ],
  "follow_up_questions": [
    "您目前的经验方向是训练还是推理？",
    "是否考虑 AI 创业公司，还是偏向大厂稳定性？"
  ],
  "cannot_determine": [],
  "trending_roles": [
    {
      "role_name": "大模型推理工程师",
      "demand_signal": "surging",
      "source": "猎聘行业报告 2026-05"
    },
    {
      "role_name": "RLHF 训练工程师",
      "demand_signal": "growing",
      "source": "BOSS直聘搜索"
    },
    {
      "role_name": "MLOps 工程师",
      "demand_signal": "growing",
      "source": "拉勾网 JD 聚合"
    }
  ],
  "hot_companies": [
    {
      "company_name": "字节跳动",
      "hiring_signal": "本月发布 AI 相关 JD 超过 200 条"
    },
    {
      "company_name": "百度飞桨",
      "hiring_signal": "文心大模型扩招，重点招募推理优化方向"
    }
  ],
  "market_sentiment": "positive",
  "key_signals": [
    {
      "signal": "大模型推理优化岗位月均发布量环比增长 43%",
      "source": "猎聘行业报告",
      "date": "2026-05-15"
    },
    {
      "signal": "头部 AI 公司薪资中位数上涨至 50k+",
      "source": "BOSS直聘薪资数据",
      "date": "2026-05-20"
    }
  ],
  "data_freshness": "fresh"
}
```

## 说明

- 3 个实时来源，均在 30 天内，置信度为 high
- trending_roles 和 key_signals 均附带来源和日期，可溯源
