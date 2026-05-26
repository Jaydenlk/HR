# 示例：有明确人脉 → 多路径内推分析

## 场景

用户（4年Java后端，目标字节跳动和美团）提供了人脉列表：前公司同事在字节，大学校友在美团，认识一个在腾讯的朋友的朋友（不在目标公司但可能有资源）。

## 输入

```json
{
  "target_companies": ["字节跳动", "美团"],
  "user_profile": {
    "years_of_experience": 4,
    "skills": ["Java", "Spring Boot", "高并发"],
    "education": "985大学，计算机，2020届",
    "previous_companies": ["某中型互联网公司"]
  },
  "network_contacts": [
    { "company": "字节跳动", "title": "高级工程师", "relationship": "ex_colleague", "last_contact_days": 30, "is_hiring_relevant": true },
    { "company": "美团", "title": "工程师", "relationship": "alumni", "last_contact_days": 180, "is_hiring_relevant": false },
    { "company": "腾讯", "title": "产品经理", "relationship": "friend_of_friend", "last_contact_days": 365 }
  ],
  "target_positions": ["后端工程师"]
}
```

## 输出

```json
{
  "skill_name": "referral-strategy",
  "skill_version": "1.0.0",
  "summary": "在2个目标公司中，字节跳动有强路径（前同事，相关团队，30天内有联系）；美团有弱路径（校友，半年未联系，团队不直接相关）。建议先激活字节路径，同时通过脉脉补强美团人脉。",
  "confidence": "high",
  "evidence_used": [
    { "source": "network_contacts", "content": "字节跳动前同事（高级工程师，30天内有联系，团队相关）" },
    { "source": "network_contacts", "content": "美团校友（工程师，180天未联系，团队不直接相关）" }
  ],
  "recommendations": [
    "字节跳动路径质量最高：前同事关系强，30天内有联系，团队匹配，本周优先联系",
    "美团校友路径需要先重新激活关系（先互动再开口），不建议直接开口内推",
    "腾讯联系人不在目标公司，优先级最低，除非他认识字节/美团的人"
  ],
  "risks": [
    "美团校友180天未联系，直接开口可能显得生疏，需要先预热关系",
    "腾讯联系人为朋友的朋友，关系较远，不确定对方是否愿意转介绍"
  ],
  "next_actions": [
    "本周联系字节跳动前同事，使用 networking-message-writer 生成微信消息",
    "先在美团校友的脉脉动态上互动（点赞/评论），等一周后再联系",
    "评估腾讯联系人是否认识字节/美团相关岗位的人，可询问共同朋友"
  ],
  "follow_up_questions": [
    "字节跳动前同事所在的具体团队是什么？（用于判断是否与目标岗位直接相关）",
    "美团校友有没有在相关业务线的其他校友可以介绍？"
  ],
  "cannot_determine": [],
  "referral_paths": [
    {
      "target_company": "字节跳动",
      "contact_description": "前同事，字节跳动高级工程师，所在团队与目标岗位相关",
      "path_type": "direct",
      "estimated_success_rate": "35-50%",
      "priority": 1,
      "relationship_strength": "strong",
      "suggested_action": "本周通过微信直接联系，说明意图，请求内推。使用 networking-message-writer 生成消息草稿。"
    },
    {
      "target_company": "美团",
      "contact_description": "大学校友，美团工程师，180天未联系",
      "path_type": "direct",
      "estimated_success_rate": "15-25%",
      "priority": 2,
      "relationship_strength": "weak",
      "suggested_action": "先在脉脉互动预热1-2周，再通过脉脉消息联系。不建议直接用微信开口（关系已冷淡）。"
    }
  ],
  "cold_outreach_targets": [
    {
      "target_company": "美团",
      "target_profile_type": "脉脉上的985校友，在美团后端技术团队",
      "platform": "脉脉",
      "approach": "通过脉脉「校友」筛选功能找到美团的校友，优先联系同届或相近届次"
    }
  ],
  "network_gaps": []
}
```

## 说明

- 路径按优先级排序，强关系优先
- 美团路径虽有联系人，但因180天未联系，策略需要先预热
- 腾讯联系人不在目标公司，不出现在 `referral_paths`
- 转化率基于关系类型给出范围估算，不给绝对数字
