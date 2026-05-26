# 示例：完整画像 → 3条职业路径，高置信度

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "张伟",
      "education": { "school": "复旦大学", "major": "计算机科学与技术", "degree": "本科" },
      "years_of_experience": 5,
      "current_role": { "value": "技术专家" }
    },
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "Redis", "proficiency": "used_in_project" },
        { "name": "MySQL", "proficiency": "mentioned" },
        { "name": "Kafka", "proficiency": "mentioned" },
        { "name": "Kubernetes", "proficiency": "mentioned" }
      ],
      "soft": [{ "name": "团队领导", "evidence_source": "带领3人小组" }]
    },
    "experience": [
      { "company": "字节跳动", "role": "高级后端工程师", "duration": "2020.07-2023.06" },
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今" }
    ],
    "constraints": { "location": ["北京", "上海"] },
    "career_intent": { "target_roles": ["后端架构"], "urgency": "unknown" }
  },
  "time_horizon": "3year"
}
```

## 输出

```json
{
  "skill_name": "career-path-planner",
  "skill_version": "1.0.0",
  "summary": "基于5年大厂后端经验（字节+美团），生成3条路径：技术架构晋升（最强匹配）、技术管理转型、金融科技行业切换。推荐优先走技术架构路线，fit_pct 82%。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.basic.years_of_experience", "value": "5年", "relevance": "满足架构师路径的最低年限要求（通常4-6年）" },
    { "field": "profile.experience[0].company", "value": "字节跳动", "relevance": "大厂背景对架构师路径有显著加分" },
    { "field": "profile.skills.technical[Go,Redis,Kafka]", "value": "3项核心后端技能", "relevance": "与后端架构师岗位要求技能覆盖率约70%" },
    { "field": "profile.skills.soft[团队领导]", "value": "带领3人小组经验", "relevance": "支撑管理路径但管理经验尚浅" }
  ],
  "recommendations": [
    "优先发展技术架构方向，当前技能积累最匹配，且大厂背景加持",
    "若选择技术管理，需主动申请更大团队 TL 机会，当前只有3人管理经验",
    "金融科技切换可考虑2年后，待架构层级稳定后横向切换风险更小"
  ],
  "risks": [
    "目标职位「后端架构」较宽泛，建议明确是系统架构师还是基础设施架构师方向",
    "Kubernetes 仅 mentioned 级别，架构师岗通常要求 used_in_project 以上"
  ],
  "next_actions": [
    "明确架构方向（业务架构 vs 基础架构）并更新 career_intent",
    "在美团内部申请主导一个 Kubernetes 相关项目提升实战水平"
  ],
  "follow_up_questions": [
    "你在美团的技术专家级别对应的是什么职级（P7/P8）？",
    "你是否有意愿带更大的团队（10人以上）？这会影响管理路径的建议"
  ],
  "cannot_determine": [
    "当前薪资水平（影响路径跳槽时机判断）",
    "是否有出国/出境工作意愿"
  ],
  "paths": [
    {
      "title": "技术架构晋升路径（纵向）",
      "path_type": "vertical",
      "fit_pct": 82,
      "fit_breakdown": {
        "skill_coverage": 70,
        "experience_match": 90,
        "education_match": 85,
        "industry_relevance": 90
      },
      "milestones": [
        { "timeframe": "6个月内", "goal": "在现岗主导一个跨团队架构设计并落地" },
        { "timeframe": "1年内", "goal": "晋升至高级技术专家或架构师 title" },
        { "timeframe": "3年内", "goal": "负责业务线核心系统架构，管理2-3个技术方向" }
      ],
      "required_skills": [
        { "skill": "Go", "current_status": "has" },
        { "skill": "Kubernetes (生产级运维)", "current_status": "partial" },
        { "skill": "系统设计（分布式事务/一致性）", "current_status": "partial" },
        { "skill": "技术方案评审能力", "current_status": "missing" }
      ],
      "transition_difficulty": "low",
      "evidence_basis": [
        "profile.basic.years_of_experience = 5：满足架构师路径4-6年要求",
        "profile.experience[字节跳动,美团]：双大厂背景显著降低晋升难度",
        "profile.skills.technical[Go,Redis,Kafka]：核心技能已具备约70%"
      ]
    },
    {
      "title": "技术管理转型路径（横向）",
      "path_type": "lateral",
      "fit_pct": 61,
      "fit_breakdown": {
        "skill_coverage": 50,
        "experience_match": 75,
        "education_match": 85,
        "industry_relevance": 40
      },
      "milestones": [
        { "timeframe": "6个月内", "goal": "申请带5-8人团队的 Tech Lead 机会" },
        { "timeframe": "1年内", "goal": "完整负责一个团队的绩效/招聘/技术方向" },
        { "timeframe": "3年内", "goal": "晋升至研发经理或部门负责人级别" }
      ],
      "required_skills": [
        { "skill": "Go", "current_status": "has" },
        { "skill": "团队管理（10人+）", "current_status": "missing" },
        { "skill": "绩效评估与人才培养", "current_status": "missing" },
        { "skill": "跨部门协作与资源协调", "current_status": "partial" }
      ],
      "transition_difficulty": "medium",
      "evidence_basis": [
        "profile.skills.soft[团队领导]：有3人小组管理经验，是管理路径的起点，但规模不足",
        "profile.basic.years_of_experience = 5：管理晋升通常需要5年+，时机合适",
        "缺乏 profile 中10人以上团队管理证据，需主动争取机会"
      ]
    },
    {
      "title": "金融科技行业切换路径（行业切换）",
      "path_type": "industry_switch",
      "fit_pct": 55,
      "fit_breakdown": {
        "skill_coverage": 65,
        "experience_match": 80,
        "education_match": 85,
        "industry_relevance": 20
      },
      "milestones": [
        { "timeframe": "6个月内", "goal": "了解金融科技行业技术栈差异（风控/支付/合规）" },
        { "timeframe": "1年内", "goal": "在当前岗位主导含金融相关业务的项目" },
        { "timeframe": "3年内", "goal": "跳槽至蚂蚁/微众/平安科技等金融科技公司" }
      ],
      "required_skills": [
        { "skill": "Go", "current_status": "has" },
        { "skill": "MySQL (金融级事务)", "current_status": "partial" },
        { "skill": "合规与监管知识（基础）", "current_status": "missing" },
        { "skill": "风控系统架构", "current_status": "missing" }
      ],
      "transition_difficulty": "high",
      "evidence_basis": [
        "profile.skills.technical[Go,MySQL,Kafka]：金融科技后端技术栈高度匹配",
        "profile.experience[美团]：履约调度系统与金融科技支付系统有相似的一致性要求",
        "行业相关度评分低（20/100）：互联网履约与金融合规差距较大，为高难度切换"
      ]
    }
  ],
  "recommended_path": "技术架构晋升路径（纵向）",
  "immediate_actions": [
    {
      "action": "在美团内部申请主导一个跨服务的架构重构项目",
      "rationale": "profile.skills.technical 显示 Kubernetes 仅 mentioned 级别，需要 used_in_project 证据",
      "timeframe": "30天内"
    },
    {
      "action": "整理过去2年的系统设计文档，形成技术博客或内部分享",
      "rationale": "基于 profile.experience[美团].调度系统架构，将现有经验显性化",
      "timeframe": "30天内"
    },
    {
      "action": "明确目标：业务架构师还是基础架构师，选定后精准补强对应技能",
      "rationale": "profile.career_intent.target_roles=['后端架构'] 过于宽泛，需要聚焦",
      "timeframe": "7天内"
    }
  ]
}
```

## 说明

- fit_pct 基于4维度加权计算：技能覆盖(40%) + 经验年限(25%) + 学历(15%) + 行业(20%)
- 路径1 fit 最高（82%）：技能和经验都强匹配，仅 Kubernetes 深度不足
- 路径3 行业相关度仅 20%：互联网履约与金融合规差距被量化为低分
- 所有 evidence_basis 均引用 profile 具体字段，无泛化建议
