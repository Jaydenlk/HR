# 示例：时机不合适（感谢信7天后才发）→ 标注时机问题

## 场景

用户面试后7天才想起要发感谢信，系统需要标注时机问题并调整消息策略。

## 输入

```json
{
  "followup_type": "thank_you",
  "company": "美团",
  "position": "产品经理",
  "days_since_event": 7,
  "interview_details": {
    "interview_round": "一面"
  }
}
```

## 输出

```json
{
  "skill_name": "follow-up-message-writer",
  "skill_version": "1.0.0",
  "summary": "面试后7天再发感谢信时机偏晚（最佳窗口为24-48小时）。系统已调整消息策略：不以「感谢信」形式出现，而是改为「进度询问+顺带致谢」的复合消息，避免时机尴尬。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "days_since_event", "content": "面试后7天，超过最佳感谢信窗口（24-48小时）" }
  ],
  "recommendations": [
    "感谢信最佳窗口已过，建议改用「进度询问+简短致谢」的组合策略",
    "下次面试后，在24小时内发感谢信，效果远好于7天后"
  ],
  "risks": [
    "7天后发感谢信可能显得生硬或显得你不够积极主动",
    "如果对方已做出决策，感谢信不会改变结果"
  ],
  "next_actions": [
    "发送下方的复合消息（进度询问+致谢）",
    "若7天无回复，接受结果，继续其他投递"
  ],
  "follow_up_questions": [
    "是否有面试官的姓名？（可让消息更个性化）"
  ],
  "cannot_determine": [],
  "message_draft": "您好，\n\n我是一周前参加了美团产品经理一面的候选人，想询问一下后续流程的进展。同时也想借此机会表达一下，一面中的交流让我对美团产品团队的工作方式有了很好的了解，感谢面试官在百忙中抽出时间。\n\n期待后续消息，以您时间为准。谢谢！",
  "timing_advice": {
    "recommended_send_time": "今日工作时间内",
    "is_timing_appropriate": false,
    "timing_note": "感谢信最佳发送窗口为面试后24-48小时。当前已过7天，建议改用「进度询问+致谢」复合策略，而非单纯感谢信，以避免时机尴尬感。"
  },
  "tone_guide": {
    "tone": "semi_formal",
    "key_tone_points": [
      "以询问进度为主线，感谢为辅",
      "不要强调「感谢信」这个形式，显得自然一些",
      "保持简短，不超过100字"
    ],
    "avoid": [
      "「非常抱歉才想到写感谢信」—— 主动暴露迟到的尴尬",
      "「上周面试让我印象深刻…」+ 长篇大论—— 此时不适合长篇感谢"
    ]
  }
}
```

## 说明

- `is_timing_appropriate: false`：明确标注时机不佳
- 消息策略自动调整为「进度询问+致谢」复合形式
- `timing_note` 详细解释了时机问题和处理策略
