# 示例：技术专家转研发经理，可行性 high

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
        { "name": "Redis", "proficiency": "used_in_project" }
      ],
      "soft": [
        { "name": "团队领导", "evidence_source": "带领3人小组完成春节大促" },
        { "name": "系统架构", "evidence_source": "主导调度系统架构设计" }
      ]
    },
    "experience": [
      { "company": "字节跳动", "role": "高级后端工程师", "duration": "2020.07-2023.06" },
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今" }
    ],
    "career_intent": { "target_roles": ["研发经理"], "urgency": "passive" }
  },
  "target_role": "研发经理",
  "target_company_type": "internet"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "role-transition-advisor",
  "skill_version": "1.0.0",
  "summary": "5年大厂后端经验（字节+美团）转研发经理，可行性 high。已有团队管理雏形（3人），核心差距是大团队管理经验和绩效体系搭建能力。",
  "confidence": "high",
  "feasibility": "high",
  "feasibility_rationale": "profile.skills.soft[团队领导]+双大厂5年经验满足研发经理基础要求。3人管理经验虽小，但在美团内部争取扩大团队规模的机会可在1年内达标。",
  "skill_gap": [
    {
      "skill_name": "大团队管理（10人+）",
      "current_level": "profile.skills.soft[团队领导]：仅3人小组",
      "required_level": "独立管理5-15人团队，处理绩效/招聘/技术方向",
      "gap_severity": "critical",
      "remedy": "在美团内部申请 TL 机会，或参与跨组项目承担协调职责",
      "estimated_months": 6
    },
    {
      "skill_name": "绩效管理与人才培养",
      "current_level": "profile 中无绩效管理相关记录",
      "required_level": "能主导绩效评估、写 OKR、做 1-on-1",
      "gap_severity": "important",
      "remedy": "向现任经理学习绩效体系，主动参与绩效评审",
      "estimated_months": 6
    }
  ],
  "typical_transition_path": [
    {
      "path_name": "内部晋升路径",
      "description": "在美团内部申请 Tech Lead，带5-10人团队，积累完整管理周期后晋升研发经理",
      "duration": "12-18个月",
      "success_rate_note": "大厂内部晋升成功率高（约70%），但需要等待晋升窗口"
    },
    {
      "path_name": "外部横跳路径",
      "description": "以技术专家+小团队管理背景投递中小公司研发经理岗",
      "duration": "3-6个月",
      "success_rate_note": "接受度高，但平台可能降级"
    }
  ],
  "success_factors": [
    { "factor": "技术深度（不能只会管）", "user_status": "has", "evidence": "profile.skills.technical[Go,Redis]+美团调度系统架构经验" },
    { "factor": "大团队管理经验", "user_status": "missing", "evidence": "profile 中最大团队规模仅3人" },
    { "factor": "大厂背书", "user_status": "has", "evidence": "profile.experience[字节跳动,美团]：双大厂背景" }
  ],
  "first_step": "本月内与美团现任经理坦诚沟通管理转型意愿，申请参与招聘流程或担任某个跨团队项目的协调负责人，获得管理实践机会。"
}
```
