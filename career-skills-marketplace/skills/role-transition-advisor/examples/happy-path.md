# 示例：前端工程师转产品经理，可行性 medium

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "陈静",
      "education": { "school": "同济大学", "major": "软件工程", "degree": "本科" },
      "years_of_experience": 4,
      "current_role": { "value": "前端开发工程师" }
    },
    "skills": {
      "technical": [
        { "name": "React", "proficiency": "used_in_project" },
        { "name": "TypeScript", "proficiency": "used_in_project" }
      ],
      "soft": [
        { "name": "需求沟通", "evidence_source": "经常与PM对接" },
        { "name": "用户体验意识", "evidence_source": "主导2次用户调研" }
      ]
    },
    "experience": [
      { "company": "某互联网公司", "role": "前端开发工程师", "duration": "2022.03-至今" }
    ],
    "career_intent": { "target_roles": ["产品经理"], "urgency": "active" }
  },
  "target_role": "产品经理",
  "target_company_type": "internet"
}
```

## 输出

```json
{
  "skill_name": "role-transition-advisor",
  "skill_version": "1.0.0",
  "summary": "前端4年（同济软件本科）转产品可行性 medium。核心优势是技术可行性判断能力，主要差距是数据分析和 PRD 输出经验。建议以「技术型产品」标签切入，避免与纯产品背景竞争。",
  "confidence": "medium",
  "evidence_used": [
    { "field": "profile.basic.years_of_experience", "value": "4年", "relevance": "超过技术转产品的通常要求（2-3年以上），时机合适" },
    { "field": "profile.skills.soft[需求沟通,用户体验意识]", "value": "2项软技能", "relevance": "产品核心能力有部分积累" },
    { "field": "profile.skills.technical[React,TypeScript]", "value": "2项前端技能", "relevance": "技术背景是差异化竞争力" },
    { "field": "profile.career_intent.urgency", "value": "active", "relevance": "主动转型意愿影响策略" }
  ],
  "recommendations": [
    "以「技术型产品经理」定位投递，避开纯产品背景的直接竞争",
    "优先目标：B端工具类产品、开发者产品、SaaS产品——技术背景在这些场景是加分项",
    "在转型前积累至少1份完整 PRD 作品"
  ],
  "risks": [
    "无 SQL 数据查询能力：大厂 PM 面试通常要求能自己查数据，当前 profile 中无相关记录",
    "urgency=active 与转型通常需要6-12个月的现实存在矛盾",
    "profile 中无独立主导过的产品功能记录，面试时难以回答「你做过最有成就感的产品」"
  ],
  "next_actions": [
    "立即学习 SQL 基础（GROUP BY, JOIN, 子查询），3个月内达到能自己查业务数据的水平",
    "选一个当前公司的功能，独立输出 PRD（含用户故事、原型图、验收标准）",
    "在掘金/知乎发布1篇「前端视角看产品设计」的文章，建立技术型产品的个人标签"
  ],
  "follow_up_questions": [
    "你在2次用户调研中担任什么角色？主导还是配合？产出了什么？",
    "你有没有尝试过独立设计一个功能的交互流程？"
  ],
  "cannot_determine": [
    "当前薪资水平（影响转型薪资折损的接受程度评估）"
  ],
  "feasibility": "medium",
  "feasibility_rationale": "技术背景（4年前端+用户调研经验）满足技术型PM的基础要求，但缺乏数据分析和PRD实战经验，在互联网大厂PM竞争中不占优势。中小公司或B端产品岗位成功率较高。",
  "skill_gap": [
    {
      "skill_name": "数据分析（SQL）",
      "current_level": "profile 中未提及任何数据分析技能",
      "required_level": "能用 SQL 自主查询业务数据，制作简单数据看板",
      "gap_severity": "critical",
      "remedy": "报名「数据分析入门」课程，完成3个真实数据分析项目",
      "estimated_months": 3
    },
    {
      "skill_name": "产品文档写作（PRD）",
      "current_level": "profile.skills.soft[需求沟通]：与PM对接过需求，但无独立PRD记录",
      "required_level": "能独立输出包含用户故事、流程图、验收标准的完整PRD",
      "gap_severity": "critical",
      "remedy": "参考成熟PRD模板，为当前公司1个功能输出完整PRD",
      "estimated_months": 2
    },
    {
      "skill_name": "用户研究（定性）",
      "current_level": "profile.skills.soft[用户体验意识]：主导过2次用户调研",
      "required_level": "能独立设计用研方案、执行访谈并提炼用户洞察",
      "gap_severity": "important",
      "remedy": "深入学习用研方法论（焦点小组、深度访谈），输出1份完整用研报告",
      "estimated_months": 3
    }
  ],
  "typical_transition_path": [
    {
      "path_name": "内部迁移路径",
      "description": "在现公司以「技术支持」身份参与产品立项，逐步承担产品职责，内部转岗到 PM 岗位",
      "duration": "6-12个月",
      "success_rate_note": "成功率最高（约60-70%），因为已熟悉业务，公司也有意愿培养复合型人才"
    },
    {
      "path_name": "外部跳槽路径（小公司）",
      "description": "以技术背景投递中小互联网公司或 B 端 SaaS 公司的 PM 岗位，通常接受技术转产品",
      "duration": "3-6个月求职+6个月适应期",
      "success_rate_note": "适合急于转型者，但首家公司的平台背书有限"
    },
    {
      "path_name": "副业先行路径",
      "description": "工作之余参与开源项目或副业产品的产品设计，积累真实产品经验后再跳槽",
      "duration": "12-18个月",
      "success_rate_note": "风险最低，但耗时最长"
    }
  ],
  "success_factors": [
    {
      "factor": "技术可行性判断能力",
      "user_status": "has",
      "evidence": "profile.skills.technical[React,TypeScript]：能判断前端实现复杂度，这是纯产品背景同学无法具备的"
    },
    {
      "factor": "数据驱动决策能力（SQL）",
      "user_status": "missing",
      "evidence": "profile 中无任何数据分析相关记录"
    },
    {
      "factor": "用户同理心与调研能力",
      "user_status": "partial",
      "evidence": "profile.skills.soft[用户体验意识]：主导过2次调研，但缺乏方法论支撑"
    },
    {
      "factor": "业务理解深度",
      "user_status": "partial",
      "evidence": "profile.experience[0].company = 某互联网公司：有业务背景，但具体业务范围未知"
    }
  ],
  "first_step": "本月内为当前公司一个真实功能独立输出完整PRD文档（含用户故事×3、流程图、验收标准），这是面试时最有力的作品集证据。"
}
```
