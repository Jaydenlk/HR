# 示例：缺少必须字段 → insufficient

## 场景

用户只说「帮我写一封跟进消息」，但未提供跟进类型、公司和职位。

## 输入

```json
{
  "contact_name": "张工"
}
```

## 输出

```json
{
  "skill_name": "follow-up-message-writer",
  "skill_version": "1.0.0",
  "summary": "缺少跟进类型、公司和职位信息，无法生成消息。请提供这三个必须字段。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请提供：跟进类型（感谢信/进度询问/拒信回复等）+ 公司名称 + 职位名称"
  ],
  "risks": [],
  "next_actions": [
    "补充必须信息后重新发起请求"
  ],
  "follow_up_questions": [
    "这是面试感谢信、进度询问，还是其他类型的跟进消息？",
    "公司名称是什么？",
    "目标职位是什么？"
  ],
  "cannot_determine": [
    "消息类型（缺少 followup_type）",
    "消息内容（缺少公司和职位信息）"
  ],
  "message_draft": "",
  "timing_advice": {
    "recommended_send_time": "未知（缺少必须信息）",
    "is_timing_appropriate": false,
    "timing_note": "补充信息后可评估时机"
  },
  "tone_guide": {
    "tone": "semi_formal",
    "key_tone_points": [],
    "avoid": []
  }
}
```

## 说明

- `message_draft` 为空，不虚构消息内容
- `confidence: insufficient`：三个必须字段均缺失
