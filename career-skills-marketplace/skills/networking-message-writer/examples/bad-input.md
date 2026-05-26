# 示例：缺少必须字段 → insufficient

## 场景

用户请求生成人脉消息，但未提供目标公司和职位。

## 输入

```json
{
  "platform": "maimai"
}
```

## 输出

```json
{
  "skill_name": "networking-message-writer",
  "skill_version": "1.0.0",
  "summary": "缺少目标公司和职位信息，无法生成消息。请提供你想联系的公司名称和目标职位。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请提供：目标公司名称 + 目标职位名称"
  ],
  "risks": [],
  "next_actions": [
    "提供目标公司和职位后重新发起请求"
  ],
  "follow_up_questions": [
    "你想联系哪家公司？",
    "你目标的职位是什么？"
  ],
  "cannot_determine": [
    "消息正文（缺少目标公司和职位）"
  ],
  "message_draft": "",
  "tone": "semi_formal",
  "key_points": [],
  "what_not_to_say": [],
  "follow_up_timing": {
    "best_send_time": "未知",
    "follow_up_after_days": 5,
    "follow_up_note": "补充信息后重新生成"
  }
}
```

## 说明

- `message_draft` 为空字符串，不虚构消息内容
- `confidence: insufficient`：必须字段缺失
