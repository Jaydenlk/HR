# 示例：技术转产品经历 → 职业经验型品牌

## 输入

```json
{
  "profile": {
    "basic": { "name": "陈静", "years_of_experience": 4, "current_role": { "value": "前端工程师" } },
    "skills": {
      "technical": [{ "name": "React", "proficiency": "used_in_project" }],
      "soft": [{ "name": "需求沟通", "evidence_source": "与PM对接" }]
    },
    "experience": [{ "company": "某互联网公司", "role": "前端开发工程师", "duration": "2022.03-至今",
      "achievements": [{ "text": "主导2次用户调研", "evidence_source": "工作描述" }] }],
    "career_intent": { "target_roles": ["产品经理"], "urgency": "active" }
  },
  "brand_focus": "career_experience"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "personal-brand-builder",
  "skill_version": "1.0.0",
  "summary": "前端工程师主动转型产品经理（urgency: active），推荐「技术转产品」的职业经验型品牌定位。知乎和小红书是最适合的平台。",
  "confidence": "medium",
  "brand_strategy": {
    "type": "career_experience",
    "positioning": "有4年前端开发背景的转型产品经理候选人 | 技术型PM视角",
    "evidence_basis": [
      "profile.career_intent.target_roles=[产品经理]+urgency=active：转型意愿明确且紧迫",
      "profile.skills.technical[React=used_in_project]：技术背景是差异化定位",
      "profile.skills.soft[需求沟通]+主导用户调研：产品相关经历是内容素材"
    ]
  },
  "platform_actions": [
    {
      "platform": "知乎",
      "action": "发布「前端工程师的PM转型日记」系列文章，真实记录转型过程中遇到的挑战和收获",
      "priority": "high",
      "rationale": "转型经历有内容连续性，知乎职场类内容有稳定受众"
    },
    {
      "platform": "小红书",
      "action": "发布「工程师转产品」经验贴，用轻松风格分享简历改造、PM面试准备等实用内容",
      "priority": "medium",
      "rationale": "小红书职场内容受众年轻化，与转型话题受众高度匹配"
    }
  ],
  "content_ideas": [
    {
      "title": "工程师视角的产品设计：我如何用代码思维做需求分析",
      "angle": "将前端开发的「条件判断/状态机思维」应用到产品需求分解，提供独特视角",
      "source_experience": "profile.experience[前端工程师].skills.technical[React]+profile.skills.soft[需求沟通]",
      "format": "article"
    },
    {
      "title": "一个前端工程师的2次用户调研复盘",
      "angle": "以技术人的视角做用户调研：有哪些坑，有哪些意外发现",
      "source_experience": "profile.experience[0].achievements[主导2次用户调研]",
      "format": "case_study"
    }
  ],
  "evidence_used": [
    { "field": "profile.career_intent.urgency", "value": "active", "relevance": "转型内容的时效性和真实性" },
    { "field": "profile.experience[0].achievements[用户调研]", "value": "主导2次用户调研", "relevance": "是职业经验型内容的核心素材" }
  ]
}
```
