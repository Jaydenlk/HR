# 示例：转产品方向的 Portfolio 项目建议

## 输入

```json
{
  "profile": {
    "basic": { "name": "陈静", "years_of_experience": 4, "current_role": { "value": "前端工程师" } },
    "skills": {
      "technical": [{ "name": "React", "proficiency": "used_in_project" }],
      "soft": [{ "name": "需求沟通", "evidence_source": "与PM对接" }]
    },
    "experience": [{ "company": "某公司", "role": "前端工程师", "duration": "2022-至今" }],
    "career_intent": { "target_roles": ["产品经理"] }
  },
  "target_role": "产品经理",
  "available_weeks": 8
}
```

## 输出（关键字段）

```json
{
  "skill_name": "portfolio-project-advisor",
  "skill_version": "1.0.0",
  "summary": "前端转产品的 portfolio 不是代码项目，而是产品文档作品集。推荐2类输出物：完整 PRD + 竞品分析报告。",
  "confidence": "medium",
  "project_ideas": [
    {
      "title": "为现有功能输出完整 PRD 文档",
      "description": "选择当前公司或常用 App 的一个功能，独立输出完整的产品需求文档（用户故事×5、流程图、原型线框图、验收标准、埋点方案）",
      "skills_demonstrated": ["产品文档写作", "用户故事拆解", "流程图设计", "需求分析"],
      "size": "small",
      "estimated_weeks": 3,
      "interview_talking_points": [
        "你如何确定这个功能的用户价值（用了什么用户研究方法）",
        "PRD 中遇到什么技术限制，如何与工程团队沟通解决",
        "这个功能上线后你期望看到什么北极星指标"
      ],
      "evidence_basis": "profile.skills.soft[需求沟通]：有与PM对接经验，熟悉需求文档的输入和输出",
      "github_visibility": false
    },
    {
      "title": "竞品分析报告：某垂直领域 Top3 产品对比",
      "description": "选择一个你熟悉的产品领域（如：外卖/教育/健身 App），输出包含用户旅程分析、功能对比矩阵、差异化机会点的完整竞品分析报告",
      "skills_demonstrated": ["竞品分析", "用户旅程分析", "商业洞察", "数据引用能力"],
      "size": "small",
      "estimated_weeks": 2,
      "interview_talking_points": [
        "你的分析框架是什么（SWOT/用户旅程/功能矩阵）",
        "你发现了什么市场机会点，为什么这是机会",
        "如果你是这个产品的 PM，你会优先做什么改进"
      ],
      "evidence_basis": "profile.career_intent.target_roles=[产品经理]：转产品的 portfolio 核心是展示产品思维，而非技术",
      "github_visibility": false
    }
  ],
  "anti_patterns": [
    {
      "pattern": "用 React 做一个自己用的工具 App 作为 PM portfolio",
      "reason": "这展示的是开发能力，不是产品能力。PM 面试官想看的是产品思维，而非编码能力"
    },
    {
      "pattern": "做一个「概念产品」的 UI 设计稿",
      "reason": "无用户数据支撑的概念产品设计缺乏说服力，面试时无法回答「这个设计的用户数据依据是什么」"
    }
  ],
  "evidence_used": [
    { "field": "profile.career_intent.target_roles", "value": "产品经理", "relevance": "portfolio 方向：产品文档而非代码" },
    { "field": "profile.skills.technical[React=used_in_project]", "value": "有技术背景", "relevance": "PRD 中可以加入技术可行性分析，是差异化优势" }
  ]
}
```
