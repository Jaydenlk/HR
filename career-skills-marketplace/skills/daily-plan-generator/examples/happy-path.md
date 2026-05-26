# 示例：今日有面试 + 完整漏斗状态 → 精准每日计划

## 场景

用户（Java后端，求职中），今天下午14:00有字节跳动二面，漏斗中还有3条 submitted 需要跟进，当前处于金三银四旺季。

## 输入

```json
{
  "current_date": "2026-03-15",
  "user_profile": {
    "skills": ["Java", "Spring Boot", "MySQL", "Redis"],
    "target_industries": ["互联网"],
    "employment_status": "unemployed"
  },
  "pipeline_state": {
    "pipeline_view": {
      "submitted_count": 4,
      "interview_count": 1,
      "offer_count": 0,
      "rejected_count": 2,
      "ghost_count": 1
    },
    "stale_alerts": [
      { "company": "京东", "position": "后端研发", "days_since_update": 18, "recommended_action": "发送跟进邮件", "priority": "medium" }
    ]
  },
  "today_interviews": [
    { "company": "字节跳动", "position": "后端工程师", "time": "14:00", "round": "二面（技术面）", "format": "online" }
  ]
}
```

## 输出

```json
{
  "skill_name": "daily-plan-generator",
  "skill_version": "1.0.0",
  "summary": "今日核心事项：字节跳动二面（14:00在线）。上午集中准备技术面内容，面试结束后发感谢信并处理京东跟进。",
  "confidence": "high",
  "evidence_used": [
    { "source": "today_interviews", "content": "字节跳动后端工程师二面，14:00在线" },
    { "source": "pipeline_state", "content": "4条submitted，1条interviewing，京东过期18天需跟进" }
  ],
  "recommendations": [
    "二面重点准备：系统设计（分布式、高并发）+ Java基础（JVM、线程池）",
    "在线面试提前10分钟测试设备和网络",
    "面试结束30分钟内发感谢信效果最好"
  ],
  "risks": [
    "当前漏斗顶部投递量偏少（4条submitted），建议今晚补充新投递",
    "1条幽灵岗占用注意力，建议正式标记放弃"
  ],
  "next_actions": [
    "9:00-12:30 复习Java并发和系统设计，重点准备字节风格题目",
    "14:00 参加字节跳动二面",
    "16:00 面试结束后立即发感谢信",
    "17:00 向京东发跟进邮件"
  ],
  "follow_up_questions": [],
  "cannot_determine": [],
  "daily_tasks": [
    {
      "task": "复习Java并发（线程池、AQS、volatile）和分布式系统设计",
      "priority": "high",
      "time_estimate": "3小时",
      "category": "interview_prep",
      "context": "字节跳动二面技术面，重点考察Java基础和系统设计"
    },
    {
      "task": "字节跳动后端工程师二面（14:00在线，提前10分钟就绪）",
      "priority": "high",
      "time_estimate": "1.5小时",
      "category": "interview_prep",
      "context": "在线技术面，准备好代码编辑器和系统设计画图工具"
    },
    {
      "task": "面试结束后发字节跳动二面感谢信",
      "priority": "high",
      "time_estimate": "20分钟",
      "category": "follow_up",
      "context": "面试结束30分钟内发送，表达感谢并简短总结今日亮点"
    },
    {
      "task": "向京东发一封简短跟进邮件（已等待18天）",
      "priority": "medium",
      "time_estimate": "15分钟",
      "category": "follow_up",
      "context": "使用 follow-up-message-writer 生成跟进内容"
    },
    {
      "task": "新增5份精选投递（重点目标：上海互联网/金融科技）",
      "priority": "medium",
      "time_estimate": "45分钟",
      "category": "application",
      "context": "漏斗顶部偏薄，建议晚上投递5-8份"
    },
    {
      "task": "在脉脉上联系2-3位目标公司内推人",
      "priority": "low",
      "time_estimate": "30分钟",
      "category": "networking"
    }
  ],
  "today_focus": "面试准备",
  "timeline_context": {
    "market_phase": "金三银四求职旺季（3月高峰期）",
    "urgency_level": "high",
    "days_until_key_event": 0
  }
}
```

## 说明

- 面试任务自动为 high 优先级，排在最前
- 感谢信任务紧接面试任务，时序合理
- 总任务6条，符合「聚焦」原则
- `today_focus: 面试准备` 与今日面试完全对应
