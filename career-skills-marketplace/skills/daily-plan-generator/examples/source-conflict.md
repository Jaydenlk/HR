# 示例：今日有面试但漏斗显示无 interviewing 记录（状态冲突）

## 场景

用户的 pipeline_state 显示没有 interviewing 状态的记录，但 today_interviews 列出了今日面试。这是状态未及时更新的冲突情况。

## 输入

```json
{
  "current_date": "2026-03-15",
  "pipeline_state": {
    "pipeline_view": {
      "submitted_count": 5,
      "interview_count": 0,
      "offer_count": 0,
      "rejected_count": 1,
      "ghost_count": 1
    },
    "stale_alerts": []
  },
  "today_interviews": [
    { "company": "美团", "position": "后端工程师", "time": "10:00", "round": "一面", "format": "online" }
  ]
}
```

## 输出

```json
{
  "skill_name": "daily-plan-generator",
  "skill_version": "1.0.0",
  "summary": "今日有美团一面（10:00在线），但投递漏斗中未记录该面试（interview_count=0）。建议面试后更新漏斗状态。今日任务以面试准备为核心。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "today_interviews", "content": "美团后端工程师一面，10:00在线" },
    { "source": "pipeline_state", "content": "漏斗显示interview_count=0，与today_interviews存在数据不一致" }
  ],
  "recommendations": [
    "面试结束后更新漏斗状态，将美团标记为 interviewing",
    "漏斗状态不一致说明投递记录有遗漏，建议今日检查并补全"
  ],
  "risks": [
    "投递记录与实际面试不同步，可能导致后续跟进遗漏"
  ],
  "next_actions": [
    "立即开始准备美团一面（距面试约1-2小时）",
    "面试后更新application-tracker记录"
  ],
  "follow_up_questions": [],
  "cannot_determine": [
    "漏斗中美团的完整投递历史（记录缺失）"
  ],
  "daily_tasks": [
    {
      "task": "准备美团一面：Spring Boot、数据库索引、常见算法题",
      "priority": "high",
      "time_estimate": "1.5小时",
      "category": "interview_prep",
      "context": "美团技术一面通常考察Java基础+LeetCode中等难度题目"
    },
    {
      "task": "美团一面（10:00在线，提前5分钟就绪）",
      "priority": "high",
      "time_estimate": "1小时",
      "category": "interview_prep"
    },
    {
      "task": "面试后发感谢信，并更新投递漏斗状态",
      "priority": "high",
      "time_estimate": "20分钟",
      "category": "admin"
    },
    {
      "task": "检查并补全投递记录（同步漏斗与实际状态）",
      "priority": "medium",
      "time_estimate": "30分钟",
      "category": "admin"
    }
  ],
  "today_focus": "面试准备",
  "timeline_context": {
    "market_phase": "金三银四求职旺季",
    "urgency_level": "high",
    "days_until_key_event": 0
  }
}
```

## 说明

- 冲突被明确标注：漏斗与实际面试不一致
- 任务仍以今日面试为核心，面试准备不因冲突被取消
- 在 `recommendations` 和 `risks` 中提醒用户更新记录
