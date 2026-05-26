# 示例：投递进度询问（无面试细节）→ 简短通用版

## 场景

用户投递某公司已18天，无回音，想发一封进度询问消息，没有提供其他细节。

## 输入

```json
{
  "followup_type": "status_inquiry",
  "company": "某互联网公司",
  "position": "产品经理",
  "days_since_event": 18
}
```

## 输出

```json
{
  "skill_name": "follow-up-message-writer",
  "skill_version": "1.0.0",
  "summary": "已生成进度询问消息（投递后18天，时机合适）。消息简短礼貌，给对方充分空间。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "followup_type", "content": "status_inquiry，投递后18天" }
  ],
  "recommendations": [
    "进度询问消息要简短（3-4句话），不要长篇大论",
    "这条消息发送后，若7天内仍无回复，建议视为无效投递，继续其他选择"
  ],
  "risks": [
    "多次催促适得其反，此消息建议只发一次"
  ],
  "next_actions": [
    "发送消息",
    "7天后若无回复，在 application-tracker 中标记为 ghost，继续其他投递"
  ],
  "follow_up_questions": [
    "是否有联系人姓名？（可让消息更个性化）"
  ],
  "cannot_determine": [
    "联系人姓名（未提供，使用「您好」代替）"
  ],
  "message_draft": "您好，\n\n我是18天前投递了贵公司产品经理职位的候选人，想礼貌询问一下当前的评估进展，如方便的话麻烦告知。如果还在评估中完全没问题，以您的时间为准。\n\n感谢！",
  "timing_advice": {
    "recommended_send_time": "工作日上午10:00-11:00（HR通常在此时段处理邮件）",
    "is_timing_appropriate": true,
    "timing_note": "投递后18天发进度询问，时机合适（通常10-14天无回音可以跟进一次）"
  },
  "tone_guide": {
    "tone": "semi_formal",
    "key_tone_points": [
      "礼貌简短，不给对方压力",
      "给对方退路（「以您的时间为准」）",
      "不重复说「我非常期待」等急切表达"
    ],
    "avoid": [
      "「请尽快告知」—— 催促感",
      "「我已经等了很久了」—— 抱怨感",
      "超过100字的长篇询问——占用HR太多时间"
    ]
  }
}
```

## 说明

- `confidence: medium`：无面试细节，生成通用版本
- 消息仅73字，符合进度询问「简短」原则
- 给对方明确退路：「以您的时间为准」
