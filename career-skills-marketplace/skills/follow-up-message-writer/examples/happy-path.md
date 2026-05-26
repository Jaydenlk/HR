# 示例：面试感谢信（含具体面试细节）

## 场景

用户昨天完成了字节跳动二面（技术面），面试官是张工，讨论了分布式系统设计和JVM调优，用户想在24小时内发送感谢信。

## 输入

```json
{
  "followup_type": "thank_you",
  "company": "字节跳动",
  "position": "后端工程师",
  "contact_name": "张工",
  "days_since_event": 1,
  "interview_details": {
    "interviewer_name": "张工",
    "interview_round": "二面（技术面）",
    "key_topics": ["分布式系统设计（服务拆分+CAP定理）", "JVM调优（GC算法+内存模型）", "高并发场景下的线程安全"],
    "interview_date": "2026-03-14"
  }
}
```

## 输出

```json
{
  "skill_name": "follow-up-message-writer",
  "skill_version": "1.0.0",
  "summary": "已生成字节跳动二面感谢信，时机合适（面试后1天），提及了分布式系统和JVM的具体讨论，个性化程度高。",
  "confidence": "high",
  "evidence_used": [
    { "source": "interview_details", "content": "二面技术面，张工，讨论了分布式/JVM/并发三个主题" },
    { "source": "days_since_event", "content": "面试后1天，时机最佳" }
  ],
  "recommendations": [
    "今天内发送效果最好，不要再等",
    "如果有具体想补充的观点（如昨天没说清楚的设计方案），可以在感谢信末尾简短补充"
  ],
  "risks": [
    "过于长篇大论会适得其反，感谢信建议控制在200字以内"
  ],
  "next_actions": [
    "直接发送或微调后发送",
    "若7天内无回复，可在 application-tracker 中更新状态为「等待通知」"
  ],
  "follow_up_questions": [],
  "cannot_determine": [],
  "message_draft": "张工你好，\n\n非常感谢您昨天抽出时间与我进行二面。我们关于分布式系统服务拆分中CAP权衡、JVM GC调优策略的讨论让我受益匪浅，尤其是您提到的在高并发场景下用读写分离来减少锁竞争的思路，给了我很大的启发。\n\n这次交流让我对字节跳动技术团队的技术深度有了更直接的感受，更坚定了我希望加入这个团队的意愿。\n\n如有后续流程，期待您的消息。感谢！\n\n[你的姓名]",
  "timing_advice": {
    "recommended_send_time": "今日内（面试后24小时内是最佳窗口）",
    "is_timing_appropriate": true,
    "timing_note": "面试后1天发送，时机完全合适。超过72小时效果会明显下降。"
  },
  "tone_guide": {
    "tone": "grateful",
    "key_tone_points": [
      "真诚感谢，不夸张",
      "提及具体讨论内容，体现你在认真听",
      "简短表达对职位的兴趣，但不要急切"
    ],
    "avoid": [
      "「非常荣幸能面试贵公司」—— 过时表达",
      "「希望能尽快得到结果」—— 催促感",
      "「我一定能胜任这个职位」—— 过于自信，感谢信不是推销信"
    ]
  }
}
```

## 说明

- 消息提及了「CAP权衡」「GC调优」两个具体话题，高度个性化
- 结尾给对方空间（「如有后续流程，期待您的消息」），不催
- 控制在200字以内
