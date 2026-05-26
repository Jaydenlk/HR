# 示例：技术转产品横向路径

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
        { "name": "TypeScript", "proficiency": "used_in_project" },
        { "name": "Node.js", "proficiency": "mentioned" }
      ],
      "soft": [
        { "name": "需求沟通", "evidence_source": "经常和产品经理对接需求" },
        { "name": "用户体验意识", "evidence_source": "主导过2次用户调研" }
      ]
    },
    "experience": [
      { "company": "某中型互联网公司", "role": "前端开发工程师", "duration": "2022.03-至今" }
    ],
    "constraints": { "location": ["杭州", "上海"] },
    "career_intent": { "target_roles": ["产品经理"], "urgency": "active" }
  },
  "target_role": "产品经理"
}
```

## 输出

```json
{
  "skill_name": "career-path-planner",
  "skill_version": "1.0.0",
  "summary": "用户有4年前端经验，主动表达转产品意愿（urgency: active）。生成2条路径：技术型产品路径（fit 64%）、前端深耕路径（fit 71%）。推荐优先尝试技术型产品，其技术背景是差异化优势。",
  "confidence": "medium",
  "evidence_used": [
    { "field": "profile.career_intent.target_roles", "value": "产品经理", "relevance": "明确转型意愿，路径优先围绕此目标生成" },
    { "field": "profile.skills.soft[需求沟通,用户体验意识]", "value": "2项软技能", "relevance": "与产品经理核心能力要求部分匹配" },
    { "field": "profile.experience[0].role", "value": "前端开发工程师4年", "relevance": "技术深度是产品路径的差异化优势" }
  ],
  "recommendations": [
    "技术背景是你转产品的核心差异化优势，主攻技术型产品（B端工具/开发者产品）而非纯消费者产品",
    "前端深耕路径适配度更高（71% vs 64%），若转产品遇阻可作为保底"
  ],
  "risks": [
    "profile 中无产品相关实际项目经验（如：主导过产品立项/PRD输出），转型存在简历空窗风险",
    "parrot.career_intent.urgency = active 说明急于转型，但跨职能路径通常需要6-12个月过渡期"
  ],
  "next_actions": [
    "在当前公司找 PM 搭档，主动参与需求评审和用户调研，积累 PRD 协作经历",
    "在业余时间输出 1-2 份完整 PRD，作为转产品的作品集"
  ],
  "follow_up_questions": [
    "你主导过的2次用户调研是什么形式的？产出了什么结论？",
    "你对哪类产品感兴趣：B端工具/C端消费/开发者工具？"
  ],
  "cannot_determine": [
    "当前薪资水平（转产品初期通常有薪资折损）"
  ],
  "paths": [
    {
      "title": "技术型产品经理路径",
      "path_type": "lateral",
      "fit_pct": 64,
      "fit_breakdown": {
        "skill_coverage": 55,
        "experience_match": 70,
        "education_match": 75,
        "industry_relevance": 60
      },
      "milestones": [
        { "timeframe": "3个月内", "goal": "完成1份真实业务 PRD，展示技术可行性判断能力" },
        { "timeframe": "6个月内", "goal": "在当前公司内部以技术资源身份参与产品立项" },
        { "timeframe": "1年内", "goal": "以「技术转产品」标签投递技术类产品岗位" }
      ],
      "required_skills": [
        { "skill": "产品需求文档（PRD）写作", "current_status": "missing" },
        { "skill": "数据分析（SQL基础）", "current_status": "missing" },
        { "skill": "用户研究方法论", "current_status": "partial" },
        { "skill": "技术可行性判断", "current_status": "has" }
      ],
      "transition_difficulty": "medium",
      "evidence_basis": [
        "profile.skills.soft[需求沟通]：与 PM 对接经验是转产品的基础",
        "profile.skills.soft[用户体验意识]：主导用户调研是产品能力的雏形",
        "profile.skills.technical[React,TypeScript]：前端技术背景是技术型产品差异化竞争力",
        "profile.career_intent.urgency = active：主动转型意愿明确"
      ]
    },
    {
      "title": "前端深耕路径（保底）",
      "path_type": "vertical",
      "fit_pct": 71,
      "fit_breakdown": {
        "skill_coverage": 80,
        "experience_match": 65,
        "education_match": 75,
        "industry_relevance": 65
      },
      "milestones": [
        { "timeframe": "6个月内", "goal": "主导一个前端性能优化项目并量化成果" },
        { "timeframe": "1年内", "goal": "晋升高级前端工程师，开始跨团队技术评审" },
        { "timeframe": "3年内", "goal": "成为前端架构师或大前端技术负责人" }
      ],
      "required_skills": [
        { "skill": "React", "current_status": "has" },
        { "skill": "性能优化（Core Web Vitals）", "current_status": "partial" },
        { "skill": "工程化（Webpack/Vite/Monorepo）", "current_status": "missing" },
        { "skill": "跨端开发（RN/Flutter）", "current_status": "missing" }
      ],
      "transition_difficulty": "low",
      "evidence_basis": [
        "profile.skills.technical[React,TypeScript]：核心前端技能具备",
        "profile.basic.years_of_experience = 4：晋升高级前端时机合适"
      ]
    }
  ],
  "recommended_path": "技术型产品经理路径",
  "immediate_actions": [
    {
      "action": "选择当前产品的一个功能点，独立输出完整 PRD（含竞品分析、用户故事、验收标准）",
      "rationale": "profile.career_intent.target_roles=[产品经理] 但 profile 中无 PRD 相关经验，需要补充作品集",
      "timeframe": "30天内"
    },
    {
      "action": "与当前公司 PM 沟通，申请以「技术支持」身份参加下次产品立项会",
      "rationale": "基于 profile.skills.soft[需求沟通] 的现有基础，在内部积累实际产品经历",
      "timeframe": "7天内"
    }
  ]
}
```

## 说明

- 技术转产品路径 fit_pct 64%（低于同赛道深耕71%）：横向转型技能匹配度天然低于纵向
- 证据全部来自 profile，没有"建议你多读书"等空话
- urgency=active 被识别为风险因素（急于转型 vs 转型需要积累期）
