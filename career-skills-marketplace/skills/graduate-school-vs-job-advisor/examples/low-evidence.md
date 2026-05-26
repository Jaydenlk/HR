# 示例：经济压力高，读研成本是主要顾虑

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "王强",
      "education": { "school": "某211本科", "major": "软件工程", "degree": "本科" },
      "years_of_experience": 0
    },
    "skills": {
      "technical": [
        { "name": "Java", "proficiency": "used_in_project" }
      ]
    },
    "career_intent": { "target_roles": ["后端开发工程师"] }
  },
  "gpa": 3.3,
  "gpa_percentile": 35,
  "economic_pressure": "high",
  "has_internship": true
}
```

## 输出（关键字段）

```json
{
  "skill_name": "graduate-school-vs-job-advisor",
  "skill_version": "1.0.0",
  "summary": "211本科软件工程，GPA 3.3（前35%），有实习，经济压力高，目标后端开发。后端开发学历非硬要求，经济压力高使读研成本不可忽视。推荐直接工作，3-5年后可考虑在职读专硕。",
  "confidence": "high",
  "analysis": [
    {
      "path_name": "直接校招（后端开发）",
      "pros": [
        "has_internship=true：有实习经验，校招竞争力有基础",
        "211背景：中型互联网公司校招通过率较高",
        "立即开始积累工作经验和收入，缓解家庭经济压力"
      ],
      "cons": [
        "放弃学历提升机会，可能影响长期晋升天花板"
      ],
      "feasibility_note": "211背景 + 实习经验：校招中型互联网公司后端岗可行性高",
      "opportunity_cost": "放弃学历提升，但后端开发靠能力和经验，3-5年后可弥补"
    },
    {
      "path_name": "考研",
      "pros": ["学历提升，长期职业发展天花板更高"],
      "cons": [
        "economic_pressure=high：3年读研 + 放弃工资（约 12k/月 × 36 = 43万）是家庭重大负担",
        "gpa_percentile=35%：考研985难度较高，211可能是更合理目标",
        "后端开发职位不要求硕士，学历提升的边际回报低于算法岗"
      ],
      "feasibility_note": "经济压力高的情况下，读研的机会成本是家庭重大决策，需要与家人充分沟通",
      "opportunity_cost": "3年时间 + 约43万经济成本（在高经济压力背景下影响重大）"
    }
  ],
  "recommendation": "综合建议：直接工作为主，理由：①后端开发非学历硬要求；②economic_pressure=high，读研成本对家庭影响重大；③has_internship=true，校招竞争力有基础。建议工作3-5年后，在公司支持下考在职专硕（部分公司报销学费）。",
  "critical_factors": [
    {
      "factor": "经济压力",
      "user_situation": "economic_pressure=high：读研3年机会成本约43万，对高经济压力家庭是重大负担",
      "impact": "supports_work"
    },
    {
      "factor": "目标职位学历要求",
      "user_situation": "profile.career_intent.target_roles=[后端开发]：非学历硬要求职位",
      "impact": "supports_work"
    },
    {
      "factor": "实习经验",
      "user_situation": "has_internship=true：直接校招竞争力有基础",
      "impact": "supports_work"
    }
  ],
  "evidence_used": [
    { "field": "economic_pressure", "value": "high", "relevance": "高经济压力是直接工作的最重要支撑因素" },
    { "field": "profile.career_intent.target_roles", "value": "后端开发工程师", "relevance": "非学历硬要求岗位" }
  ]
}
```
