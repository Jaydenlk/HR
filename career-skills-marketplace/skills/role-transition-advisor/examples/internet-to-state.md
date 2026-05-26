# 示例：互联网技术专家转国企技术岗，可行性 medium

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "王芳",
      "education": { "school": "西安交通大学", "major": "计算机科学", "degree": "硕士" },
      "years_of_experience": 6,
      "current_role": { "value": "后端技术专家" }
    },
    "skills": {
      "technical": [
        { "name": "Java", "proficiency": "used_in_project" },
        { "name": "Spring Boot", "proficiency": "used_in_project" },
        { "name": "Oracle", "proficiency": "mentioned" }
      ],
      "soft": [{ "name": "项目管理", "evidence_source": "主导过5人项目组" }]
    },
    "experience": [
      { "company": "某互联网公司", "role": "后端技术专家", "duration": "2019.07-至今" }
    ],
    "constraints": { "location": ["西安"], "salary_expectation": "20k左右" },
    "career_intent": { "target_roles": ["国企技术岗"], "urgency": "passive" }
  },
  "target_role": "国企技术岗",
  "target_company_type": "state_owned"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "role-transition-advisor",
  "skill_version": "1.0.0",
  "summary": "互联网技术专家6年（西交硕士）转国企技术岗，可行性 medium。Java+Spring Boot 技术栈与国企银行/能源系统高度匹配，但薪资预期（20k）与西安国企实际薪资水平（8-14k）有较大落差，是主要风险。",
  "confidence": "medium",
  "feasibility": "medium",
  "feasibility_rationale": "profile.skills.technical[Java,Spring Boot,Oracle] 与国企技术栈高度匹配（国企普遍使用 Java+Oracle）；profile.basic.education.degree=硕士 是国企招聘加分项；但 profile.constraints.salary_expectation=20k 与西安国企通常薪资范围 8-14k 有显著落差。",
  "skill_gap": [
    {
      "skill_name": "国企业务理解（政务/金融/能源）",
      "current_level": "profile.experience[互联网]：纯互联网背景，无国企行业经验",
      "required_level": "了解目标行业的合规要求、业务流程和数字化现状",
      "gap_severity": "important",
      "remedy": "自学目标行业报告，面试时强调技术通用性",
      "estimated_months": 2
    },
    {
      "skill_name": "政府/国企工作节奏适应",
      "current_level": "profile 中无相关经历",
      "required_level": "适应流程较长的审批文化，习惯非绩效导向的工作节奏",
      "gap_severity": "nice_to_have",
      "remedy": "可通过内部调研或认识国企朋友提前了解",
      "estimated_months": 0
    }
  ],
  "typical_transition_path": [
    {
      "path_name": "技术型国企路径（银行科技/能源信息化）",
      "description": "目标国家电网、中移动、四大行科技子公司等技术氛围较强的单位，而非行政型国企",
      "duration": "3-6个月",
      "success_rate_note": "技术型国企接受互联网背景概率高（60%+），因为他们需要有互联网开发能力的人推动数字化"
    },
    {
      "path_name": "地方国企技术负责人路径",
      "description": "以技术专家身份切入西安本地中型国企，担任技术负责人，跳过普通员工阶段",
      "duration": "6-12个月",
      "success_rate_note": "西安本地国企对本地硕士学历有明显偏好"
    }
  ],
  "success_factors": [
    { "factor": "硕士学历", "user_status": "has", "evidence": "profile.basic.education.degree=硕士：国企招聘中学历是重要门槛" },
    { "factor": "Java技术栈匹配", "user_status": "has", "evidence": "profile.skills.technical[Java,Spring Boot,Oracle]：与国企主流技术栈高度吻合" },
    { "factor": "薪资预期与市场匹配", "user_status": "missing", "evidence": "profile.constraints.salary_expectation=20k，西安国企通常 8-14k，落差约30-60%" }
  ],
  "first_step": "在进一步求职前，先调研西安目标国企（如西安银行科技、陕西省国资委下属单位）的实际薪资范围，确认薪资落差在可接受范围内再推进。薪资预期不调整则建议继续互联网路线。",
  "evidence_used": [
    { "field": "profile.constraints.salary_expectation", "value": "20k左右", "relevance": "是转型成功的主要风险，国企薪资通常低于此水平" },
    { "field": "profile.skills.technical[Java,Spring Boot,Oracle]", "value": "Java体系3项", "relevance": "国企主流技术栈高度匹配" },
    { "field": "profile.basic.education.degree", "value": "硕士", "relevance": "国企招聘中硕士学历是重要加分项" }
  ],
  "recommendations": [
    "调整薪资预期或选择银行科技子公司等薪资相对较高的技术型国企",
    "Oracle 技能列为 mentioned，建议提升至 used_in_project 水平以匹配国企技术要求"
  ],
  "risks": [
    "薪资落差是主要风险：profile.constraints.salary_expectation=20k vs 西安国企8-14k",
    "互联网的效率文化与国企的流程文化存在显著差异，需要心理预期调整"
  ],
  "next_actions": [
    "调研西安10家目标国企的实际薪资范围（招聘网站+内部人士）",
    "将 Oracle 技能从 mentioned 提升到 used_in_project 水平"
  ],
  "follow_up_questions": [
    "你能接受薪资降至14-16k吗？还是20k是底线？",
    "你选择国企的主要原因是什么：稳定性、户口落地、家庭原因？"
  ],
  "cannot_determine": [
    "西安户籍/落户需求（影响目标公司范围）"
  ]
}
```
