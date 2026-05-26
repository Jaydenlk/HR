# 示例：多条投递记录 → 完整漏斗视图

## 场景

用户有12条投递记录（状态各异），请求生成当前求职漏斗状态，当前日期2026-03-15。

## 输入

```json
{
  "applications": [
    { "company": "字节跳动", "position": "后端工程师", "applied_date": "2026-02-20", "status": "interviewing", "last_updated": "2026-03-10" },
    { "company": "美团", "position": "Java开发", "applied_date": "2026-02-22", "status": "interview_scheduled", "interview_date": "2026-03-16", "last_updated": "2026-03-12" },
    { "company": "滴滴", "position": "后端工程师", "applied_date": "2026-02-15", "status": "rejected", "last_updated": "2026-03-01" },
    { "company": "拼多多", "position": "服务端开发", "applied_date": "2026-02-10", "status": "submitted", "last_updated": "2026-02-10" },
    { "company": "京东", "position": "后端研发", "applied_date": "2026-02-18", "status": "in_review", "last_updated": "2026-02-25" },
    { "company": "网易", "position": "Java工程师", "applied_date": "2026-03-01", "status": "submitted", "last_updated": "2026-03-01" },
    { "company": "快手", "position": "后端开发", "applied_date": "2026-02-28", "status": "submitted", "last_updated": "2026-02-28" },
    { "company": "阿里云", "position": "研发工程师", "applied_date": "2026-03-05", "status": "in_review", "last_updated": "2026-03-08" },
    { "company": "腾讯", "position": "后端工程师", "applied_date": "2026-02-05", "status": "submitted", "last_updated": "2026-02-05" },
    { "company": "百度", "position": "Java开发", "applied_date": "2026-02-12", "status": "rejected", "last_updated": "2026-02-20" },
    { "company": "B站", "position": "服务端工程师", "applied_date": "2026-03-08", "status": "submitted", "last_updated": "2026-03-08" },
    { "company": "小米", "position": "后端研发", "applied_date": "2026-03-10", "status": "submitted", "last_updated": "2026-03-10" }
  ],
  "current_date": "2026-03-15"
}
```

## 输出

```json
{
  "skill_name": "application-tracker",
  "skill_version": "1.0.0",
  "summary": "当前共12条投递，面试层2条（转化率17%），2条已拒，拼多多和腾讯投递超过14天无回音，疑似幽灵。京东in_review已20天，建议跟进。",
  "confidence": "high",
  "evidence_used": [
    { "source": "applications", "content": "12条投递记录，状态完整，日期齐全" }
  ],
  "recommendations": [
    "当前面试转化率17%处于正常范围（互联网行业约10-20%）",
    "拼多多（33天无回音）和腾讯（38天无回音）建议直接放弃，节省精力",
    "字节跳动面试进行中，优先准备相关面试题"
  ],
  "risks": [
    "投递量集中在2月，3月新增较少（仅4条），建议补充新投递",
    "当前无offer在手，应加快面试进度或扩大投递范围"
  ],
  "next_actions": [
    "明天准备美团面试（3月16日），今天复习Java并发和MySQL优化",
    "本周新增5-10份投递，填补漏斗顶部",
    "对拼多多和腾讯发最后一次跟进，无回应则标记放弃"
  ],
  "follow_up_questions": [],
  "cannot_determine": [],
  "pipeline_view": {
    "submitted_count": 6,
    "interview_count": 2,
    "offer_count": 0,
    "rejected_count": 2,
    "withdrawn_count": 0,
    "ghost_count": 2
  },
  "stats": {
    "total_applications": 12,
    "active_applications": 8,
    "interview_rate": 0.17,
    "offer_rate": null,
    "avg_response_days": 8
  },
  "stale_alerts": [
    {
      "company": "京东",
      "position": "后端研发",
      "days_since_update": 20,
      "current_status": "in_review",
      "recommended_action": "发送一封简短跟进邮件，询问简历评估进展",
      "priority": "medium"
    }
  ],
  "ghost_detection": [
    {
      "company": "拼多多",
      "position": "服务端开发",
      "days_silent": 33,
      "ghost_probability": "high",
      "suggestion": "超过30天无回音，建议标记为幽灵，停止等待，转而增加新投递"
    },
    {
      "company": "腾讯",
      "position": "后端工程师",
      "days_silent": 38,
      "ghost_probability": "high",
      "suggestion": "超过30天无回音，建议标记为幽灵，可尝试通过内推渠道重新投递"
    }
  ]
}
```

## 说明

- `interview_rate: 0.17` = 2(面试)/12(总投递) ≈ 17%
- `offer_rate: null`：目前无offer，分母为0，不可计算
- 幽灵检测基于实际日期差计算（腾讯 2026-02-05 距 2026-03-15 = 38天）
- 所有幽灵检测仅基于用户实际数据，不推测
