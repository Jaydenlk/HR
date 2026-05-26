# 示例：无投递记录 → 返回 insufficient

## 场景

用户请求查看投递状态，但没有提供任何投递记录。

## 输入

```json
{
  "applications": [],
  "current_date": "2026-03-15"
}
```

## 输出

```json
{
  "skill_name": "application-tracker",
  "skill_version": "1.0.0",
  "summary": "未找到任何投递记录，无法生成漏斗视图。请添加至少一条投递记录后重试。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "开始投递前，可以使用 application-strategist 制定目标公司清单",
    "每次投递后及时记录，便于追踪进展"
  ],
  "risks": [],
  "next_actions": [
    "使用 application-strategist 制定求职策略",
    "开始向目标公司投递，并记录每次投递信息"
  ],
  "follow_up_questions": [
    "您是否已经开始投递？是否有投递记录需要录入？"
  ],
  "cannot_determine": [
    "所有统计数据（无投递记录）"
  ],
  "pipeline_view": {
    "submitted_count": 0,
    "interview_count": 0,
    "offer_count": 0,
    "rejected_count": 0,
    "withdrawn_count": 0,
    "ghost_count": 0
  },
  "stats": {
    "total_applications": 0,
    "active_applications": 0,
    "interview_rate": null,
    "offer_rate": null,
    "avg_response_days": null
  },
  "stale_alerts": [],
  "ghost_detection": []
}
```

## 说明

- 空数组是有效输入但无数据，返回 `insufficient`
- 所有计数字段为0，比率字段为 null
