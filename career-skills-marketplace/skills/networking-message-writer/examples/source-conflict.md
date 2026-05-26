# 示例：用户要求声称「很熟」但实际是陌生人 → 拒绝虚假声明

## 场景

用户想在脉脉上联系一位完全陌生的工程师，但要求消息中写「我们之前见过面」（实际没有）。

## 输入

```json
{
  "target_company": "美团",
  "target_position": "算法工程师",
  "platform": "maimai",
  "contact_info": {
    "name": "王工",
    "relationship": "stranger"
  },
  "additional_context": "请在消息里说我们之前在某技术大会上见过面"
}
```

## 输出

```json
{
  "skill_name": "networking-message-writer",
  "skill_version": "1.0.0",
  "summary": "用户要求包含虚假「见过面」声明，系统已拒绝并生成基于真实陌生人关系的消息。虚假关系声明会破坏信任，可能被对方识破，反而降低通过率。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "contact_info", "content": "陌生人关系（stranger），脉脉平台" },
    { "source": "additional_context", "content": "用户要求虚构「技术大会见过面」—— 已拒绝" }
  ],
  "recommendations": [
    "陌生人联系不需要虚构关系，直接说明如何找到对方（脉脉推荐/共同好友）即可",
    "诚实的陌生人联系成功率不低，关键在于消息价值密度高"
  ],
  "risks": [
    "虚假关系声明如果被识破，不仅内推失败还损害个人形象",
    "对方可能会问「我们在哪个大会上见过」，无法回答"
  ],
  "next_actions": [
    "发送下方基于真实陌生人关系的消息",
    "若希望增加转化率，可先在对方的动态下理性点评，增加曝光度"
  ],
  "follow_up_questions": [
    "你和对方真的有什么共同点吗？（同校/同行/共同关注者）"
  ],
  "cannot_determine": [],
  "message_draft": "王工你好，我在脉脉上看到你在美团算法团队，想冒昧咨询一下。\n\n我目前是一名算法工程师，在[推荐系统/NLP/CV等]方向有一些积累，正在寻找新机会，对美团算法岗位很感兴趣。\n\n请问是否方便帮我了解一下团队的技术方向，或者有机会帮忙内推？简历随时可以发，如不方便完全理解，感谢你花时间看这条消息！",
  "tone": "semi_formal",
  "key_points": [
    "说明如何找到对方（脉脉），不虚构关系",
    "简短展示自己是同行，建立专业可信度",
    "给对方充分退路"
  ],
  "what_not_to_say": [
    "「我们之前在某大会见过面」—— 若是虚假声明，被识破后信任归零",
    "「我非常仰慕您」—— 过度奉承，显得不自然",
    "「相信您一定会帮忙」—— 给对方施压"
  ],
  "follow_up_timing": {
    "best_send_time": "工作日18:00-21:00",
    "follow_up_after_days": 7,
    "follow_up_note": "陌生人关系跟进等待期可适当延长至7天，且只跟进一次"
  }
}
```

## 说明

- 系统明确拒绝虚假声明，并在 summary 中解释原因
- 生成的消息使用真实陌生人策略，效果反而更好
- `risks` 明确说明虚假声明的后果
