# 示例：金融行业IT背景 → 行业洞察型品牌

## 输入

```json
{
  "profile": {
    "basic": { "name": "李明", "years_of_experience": 8, "current_role": { "value": "金融科技架构师" } },
    "skills": {
      "technical": [
        { "name": "Java", "proficiency": "used_in_project" },
        { "name": "分布式事务", "proficiency": "used_in_project" }
      ]
    },
    "experience": [
      { "company": "某银行科技子公司", "role": "架构师", "duration": "2019-至今",
        "achievements": [
          { "text": "主导核心银行系统分布式改造", "evidence_source": "工作描述" },
          { "text": "参与金融监管科技（RegTech）项目", "evidence_source": "工作描述" }
        ]
      }
    ]
  },
  "brand_focus": "industry_insight"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "personal-brand-builder",
  "skill_version": "1.0.0",
  "summary": "金融科技架构师8年，有银行核心系统和RegTech经验，推荐「金融科技与合规科技」行业洞察型品牌。知乎专栏和InfoQ是最适合平台。",
  "confidence": "high",
  "brand_strategy": {
    "type": "industry_insight",
    "positioning": "金融科技架构师 | 银行核心系统分布式改造实践者 | RegTech洞察",
    "evidence_basis": [
      "profile.experience[银行科技].achievements[核心银行分布式改造]：金融IT特有经验",
      "profile.experience[银行科技].achievements[RegTech项目]：监管科技是小众高价值内容方向",
      "profile.basic.years_of_experience=8：足够的行业积累支撑洞察型内容"
    ]
  },
  "platform_actions": [
    {
      "platform": "知乎",
      "action": "开设「金融科技架构实录」专栏，聚焦银行核心系统改造的技术与业务挑战",
      "priority": "high",
      "rationale": "金融IT话题在知乎有小圈子受众，内容稀缺度高"
    },
    {
      "platform": "InfoQ",
      "action": "向InfoQ中文站投稿「RegTech落地实践」系列文章",
      "priority": "high",
      "rationale": "InfoQ是技术专业人士受众，行业洞察型内容匹配度高"
    }
  ],
  "content_ideas": [
    {
      "title": "银行核心系统分布式改造的那些坑：从 Oracle 到分布式数据库",
      "angle": "金融级系统的改造有哪些互联网改造文章不会提的特殊约束（监管要求、数据强一致性）",
      "source_experience": "profile.experience[银行科技].achievements[主导核心银行系统分布式改造]",
      "format": "case_study"
    },
    {
      "title": "RegTech 在国内的落地现状：从参与者视角看监管科技的机遇和挑战",
      "angle": "一线从业者的真实观察，而非分析报告的泛化描述",
      "source_experience": "profile.experience[银行科技].achievements[参与RegTech项目]",
      "format": "opinion"
    }
  ],
  "evidence_used": [
    { "field": "profile.experience[银行科技].achievements[RegTech]", "value": "监管科技项目参与经历", "relevance": "稀缺行业经验是行业洞察型品牌的核心资产" }
  ]
}
```
