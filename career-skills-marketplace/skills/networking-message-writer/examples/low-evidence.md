# 示例：缺少用户画像 → 生成通用框架版本

## 场景

用户只说想在脉脉上联系字节跳动的工程师内推，没有提供个人画像。

## 输入

```json
{
  "target_company": "字节跳动",
  "target_position": "产品经理",
  "platform": "maimai"
}
```

## 输出

```json
{
  "skill_name": "networking-message-writer",
  "skill_version": "1.0.0",
  "summary": "缺少用户画像，生成了通用框架消息。建议补充个人亮点（经验年限、核心技能）以让消息更有说服力。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "input", "content": "字节跳动产品经理，脉脉平台，无用户画像" }
  ],
  "recommendations": [
    "消息中的「[你的经验年限]」「[你的核心技能]」等占位符需要你填写真实信息",
    "补充个人画像（profile-builder）后可生成更个性化的版本"
  ],
  "risks": [
    "通用消息缺乏个性化，通过率低于定制版本"
  ],
  "next_actions": [
    "使用 profile-builder 生成画像后重新请求",
    "在发送前将消息中的占位符替换为真实信息"
  ],
  "follow_up_questions": [
    "你有几年产品经理经验？",
    "你的核心业务方向是什么（C端/B端/平台）？",
    "和对方有什么关系（校友/陌生人）？"
  ],
  "cannot_determine": [
    "消息中的个人亮点（缺少用户画像）",
    "与联系人的关系类型（未提供）"
  ],
  "message_draft": "你好！我在脉脉上看到你在字节跳动，冒昧联系。\n\n我是一名产品经理，有[你的经验年限]年经验，主要做[你的核心业务方向]。目前在寻找新的机会，很想了解字节跳动产品经理岗位的情况。\n\n请问你方便帮我了解一下相关职位，或者有机会帮忙内推吗？简历随时可以发给你，如不方便完全理解，感谢！",
  "tone": "semi_formal",
  "key_points": [
    "说明身份和意图",
    "简短展示个人价值",
    "给对方明确退路"
  ],
  "what_not_to_say": [
    "「不管什么职位都行」—— 显得没有方向",
    "「我一直很崇拜字节跳动」—— 过于夸张"
  ],
  "follow_up_timing": {
    "best_send_time": "工作日18:00-21:00",
    "follow_up_after_days": 5,
    "follow_up_note": "若无回复，5天后跟进一次，只跟进一次"
  }
}
```

## 说明

- `message_draft` 含占位符 `[你的经验年限]` 等，明确提示用户填写
- `confidence: medium`：缺少画像，无法个性化
- 消息框架合理但通用性高
