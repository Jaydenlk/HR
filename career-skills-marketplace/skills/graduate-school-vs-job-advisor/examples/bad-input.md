# 示例：985本科，GPA 3.8，有保研资格

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "林晓",
      "education": { "school": "某985本科", "major": "计算机科学", "degree": "本科" },
      "years_of_experience": 0
    },
    "skills": {
      "technical": [
        { "name": "Python", "proficiency": "used_in_project" },
        { "name": "机器学习", "proficiency": "used_in_project" }
      ]
    },
    "career_intent": { "target_roles": ["算法工程师"], "urgency": "unknown" }
  },
  "gpa": 3.8,
  "gpa_percentile": 8,
  "target_school_tier": "985",
  "economic_pressure": "none",
  "has_internship": true
}
```

## 输出（关键字段）

```json
{
  "skill_name": "graduate-school-vs-job-advisor",
  "skill_version": "1.0.0",
  "summary": "985本科 CS，GPA 3.8（前8%），有算法实习，目标算法工程师，无经济压力。算法岗通常要求硕士及以上，保研是强烈建议选项。直接工作校招不推荐，因为算法岗的学历壁垒明显。",
  "confidence": "high",
  "analysis": [
    {
      "path_name": "保研同校或顶尖985",
      "pros": [
        "gpa_percentile=8%：满足大多数985保研要求（通常 top 10-15%）",
        "profile.career_intent.target_roles=[算法工程师]：算法岗通常要求硕士，保研直接满足门槛",
        "经济压力 none：无经济顾虑，保研是最优选项"
      ],
      "cons": [
        "放弃3年工作时间",
        "保研名额有限，需要提前联系导师（推荐6月前联系）"
      ],
      "feasibility_note": "gpa=3.8（前8%）：具备冲击顶尖985保研的资格，强烈建议优先保研",
      "opportunity_cost": "3年工作时间，但算法岗硕士起步薪资通常高30-50%，回报期约1-2年"
    },
    {
      "path_name": "直接校招（算法工程师方向）",
      "pros": ["尽早进入工作市场"],
      "cons": [
        "算法工程师岗位：大厂（如阿里/百度/字节）的算法岗几乎全要硕士及以上",
        "本科算法岗 offer 非常稀少，竞争极其激烈"
      ],
      "feasibility_note": "对于算法工程师方向，本科直接工作的选择严重受限，不推荐",
      "opportunity_cost": "强行找算法岗可能只能进入学历要求低的小公司，影响职业发展起点"
    }
  ],
  "recommendation": "强烈建议保研。理由：① profile.career_intent.target_roles=[算法工程师] 有明确学历要求；② gpa=3.8（前8%）满足顶尖985保研资格；③ economic_pressure=none 无经济顾虑。立即开始联系目标导师（顶尖985 AI方向）。",
  "critical_factors": [
    {
      "factor": "算法岗的学历硬要求",
      "user_situation": "profile.career_intent.target_roles=[算法工程师]：大厂算法岗通常要求硕士，本科直接工作选择极受限",
      "impact": "supports_grad_school"
    },
    {
      "factor": "GPA 保研资格",
      "user_situation": "gpa=3.8, gpa_percentile=8%：满足大多数985保研条件",
      "impact": "supports_grad_school"
    },
    {
      "factor": "经济压力",
      "user_situation": "economic_pressure=none：无经济顾虑，读研决策更简单",
      "impact": "supports_grad_school"
    }
  ],
  "evidence_used": [
    { "field": "profile.career_intent.target_roles", "value": "算法工程师", "relevance": "算法岗学历壁垒是核心决策依据" },
    { "field": "gpa_percentile", "value": "8%", "relevance": "满足保研条件" }
  ],
  "next_actions": ["立即联系3-5位目标导师（顶尖985 AI/机器学习方向），发送自荐邮件"],
  "follow_up_questions": ["你有没有竞赛/论文经历？这会影响保研到顶尖985的竞争力"]
}
```
