# 示例：缺少日期 → 无法幽灵检测

## 场景

用户提供了3条投递记录，但没有日期信息，系统无法做幽灵检测。

## 输入

```json
{
  "applications": [
    { "company": "某互联网公司", "position": "产品经理", "status": "submitted" },
    { "company": "某电商平台", "position": "运营", "status": "in_review" },
    { "company": "某金融科技", "position": "产品经理", "status": "interviewing" }
  ],
  "current_date": "2026-03-15"
}
```

## 输出

```json
{
  "skill_name": "application-tracker",
  "skill_version": "1.0.0",
  "summary": "共3条投递，1条进入面试阶段（33%转化率），但缺少投递日期，无法进行幽灵检测和过期提醒。建议补充各投递的日期信息。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "applications", "content": "3条投递记录，有状态无日期" }
  ],
  "recommendations": [
    "补充每条投递的投递日期，以启用幽灵检测功能",
    "面试阶段的「某金融科技」是当前优先跟进对象"
  ],
  "risks": [
    "缺少日期信息导致无法判断哪些投递已过期"
  ],
  "next_actions": [
    "为已有投递补充日期信息",
    "跟进「某金融科技」面试进展"
  ],
  "follow_up_questions": [
    "各投递的投递日期是什么时候？"
  ],
  "cannot_determine": [
    "幽灵检测（缺少投递日期和最后更新日期）",
    "平均回复天数（缺少日期信息）"
  ],
  "pipeline_view": {
    "submitted_count": 1,
    "interview_count": 1,
    "offer_count": 0,
    "rejected_count": 0,
    "withdrawn_count": 0,
    "ghost_count": 0
  },
  "stats": {
    "total_applications": 3,
    "active_applications": 3,
    "interview_rate": 0.33,
    "offer_rate": null,
    "avg_response_days": null
  },
  "stale_alerts": [],
  "ghost_detection": []
}
```

## 说明

- `ghost_detection` 为空：缺少日期无法计算天数差
- `avg_response_days: null`：无日期数据
- `confidence: medium`：有状态信息但缺少时间维度
