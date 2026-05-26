# 示例：仅有当前日期 → 通用计划降级

## 场景

用户只说「今天是2026年3月15日，帮我规划一下求职任务」，没有提供画像和漏斗数据。

## 输入

```json
{
  "current_date": "2026-03-15"
}
```

## 输出

```json
{
  "skill_name": "daily-plan-generator",
  "skill_version": "1.0.0",
  "summary": "缺少个人画像和投递状态，仅能提供通用求职任务框架。建议补充个人信息以获取针对性计划。",
  "confidence": "low",
  "evidence_used": [
    { "source": "current_date", "content": "2026-03-15，金三银四求职旺季" }
  ],
  "recommendations": [
    "当前为金三银四旺季，是求职的黄金时期，建议今天至少投递3-5份",
    "使用 profile-builder 完善个人画像，获取个性化每日计划"
  ],
  "risks": [
    "无状态数据，任务计划为通用框架，针对性有限"
  ],
  "next_actions": [
    "完善个人画像后重新生成每日计划"
  ],
  "follow_up_questions": [
    "你目前有哪些待处理的面试或投递？",
    "今天有安排面试吗？"
  ],
  "cannot_determine": [
    "个性化面试准备方向（缺少技能和目标岗位信息）",
    "需要跟进的具体投递（缺少漏斗状态）",
    "今日是否有面试（缺少投递记录）"
  ],
  "daily_tasks": [
    {
      "task": "在BOSS直聘/拉勾浏览今日新发布岗位，投递3-5份匹配职位",
      "priority": "high",
      "time_estimate": "1小时",
      "category": "application"
    },
    {
      "task": "更新简历并检查格式（确保1-2页，无错字）",
      "priority": "medium",
      "time_estimate": "30分钟",
      "category": "resume"
    },
    {
      "task": "在脉脉浏览目标公司动态，识别潜在内推渠道",
      "priority": "low",
      "time_estimate": "20分钟",
      "category": "networking"
    }
  ],
  "today_focus": "扩大投递量",
  "timeline_context": {
    "market_phase": "金三银四求职旺季（3月中旬）",
    "urgency_level": "normal",
    "days_until_key_event": null
  }
}
```

## 说明

- 仅3条任务：数据不足时不虚构更多任务
- `confidence: low`：无画像无漏斗
- `cannot_determine` 清楚说明缺少什么
