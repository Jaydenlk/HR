# 示例：技能完全覆盖目标职位要求，无明显差距

## 输入

```json
{
  "profile": {
    "basic": { "name": "李工", "years_of_experience": 8, "current_role": { "value": "高级工程师" } },
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "MySQL", "proficiency": "used_in_project" },
        { "name": "Redis", "proficiency": "used_in_project" },
        { "name": "Kafka", "proficiency": "used_in_project" }
      ]
    },
    "experience": [{ "company": "大厂", "role": "高级工程师", "duration": "2018-至今" }]
  },
  "jd_analysis": {
    "required_skills": [
      { "name": "Go", "level": "proficient", "importance": "critical" },
      { "name": "MySQL", "level": "proficient", "importance": "important" }
    ],
    "job_title": "高级后端工程师"
  }
}
```

## 输出

```json
{
  "skill_name": "skill-gap-planner",
  "skill_version": "1.0.0",
  "summary": "对比画像与目标JD，未发现明显技能差距。Go 和 MySQL 均为 used_in_project 级别，满足 JD proficient 要求。建议关注非技能维度（简历表达、目标公司文化适配）。",
  "confidence": "high",
  "gap_analysis": [],
  "learning_plan": [],
  "quick_wins": [],
  "long_term_investments": [],
  "recommendations": [
    "技能层面无明显差距，建议将精力转向简历表达优化：量化现有成就（如将调度系统描述为「覆盖X城市、日处理Y单」）",
    "可运行 match-diagnosis 检查非技能维度（学历、公司背景、行业经验）是否有其他落差"
  ],
  "risks": [],
  "next_actions": ["运行 match-diagnosis 进行全维度匹配分析", "运行 resume-tailor 优化简历表达"],
  "follow_up_questions": [],
  "cannot_determine": [],
  "evidence_used": [
    { "field": "profile.skills.technical[Go=used_in_project]", "value": "Go 有项目佐证", "relevance": "JD 要求 proficient，已满足" },
    { "field": "profile.skills.technical[MySQL=used_in_project]", "value": "MySQL 有项目佐证", "relevance": "JD 要求 proficient，已满足" }
  ]
}
```
