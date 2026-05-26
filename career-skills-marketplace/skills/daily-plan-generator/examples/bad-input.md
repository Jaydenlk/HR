# 示例：缺少必须字段 → insufficient

## 场景

用户未提供 current_date（必须字段），请求生成每日计划。

## 输入

```json
{
  "user_profile": {
    "skills": ["Python"],
    "employment_status": "unemployed"
  }
}
```

## 输出

```json
{
  "skill_name": "daily-plan-generator",
  "skill_version": "1.0.0",
  "summary": "缺少当前日期，无法生成基于时间的每日计划。请提供今天的日期。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请提供今天的日期（YYYY-MM-DD格式），重新发起请求"
  ],
  "risks": [],
  "next_actions": [
    "提供当前日期后重新生成每日计划"
  ],
  "follow_up_questions": [
    "今天的日期是什么？（格式：YYYY-MM-DD）"
  ],
  "cannot_determine": [
    "当前求职时间窗口（缺少日期）",
    "今日是否有面试安排（缺少日期）",
    "时间紧迫程度（缺少日期）"
  ],
  "daily_tasks": [],
  "today_focus": "均衡推进",
  "timeline_context": {
    "market_phase": "未知（缺少日期）",
    "urgency_level": "normal",
    "days_until_key_event": null
  }
}
```

## 说明

- `daily_tasks` 为空：无日期则无法生成时间相关任务
- `confidence: insufficient`：必须字段缺失
