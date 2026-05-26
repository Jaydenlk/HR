# 示例：家庭约束（父母在成都）的城市分析

## 输入

```json
{
  "profile": {
    "basic": { "name": "王平", "years_of_experience": 3, "current_role": { "value": "前端工程师" } },
    "skills": { "technical": [{ "name": "React", "proficiency": "used_in_project" }] },
    "constraints": { "location": ["北京", "成都"] }
  },
  "candidate_cities": ["北京", "成都"],
  "has_family_constraint": "父母在成都，希望就近照顾"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "city-industry-fit-advisor",
  "skill_version": "1.0.0",
  "summary": "用户有家庭约束（父母在成都），React前端3年，分析北京vs成都。两地都在约束城市内。成都综合适配度在家庭约束加权后与北京差距缩小。",
  "confidence": "medium",
  "fit_matrix": [
    {
      "city": "北京",
      "industry": "互联网",
      "fit_score": 68,
      "fit_breakdown": {
        "skill_match": 85,
        "career_ceiling": 90,
        "cost_sustainability": 55,
        "constraint_satisfaction": 50
      },
      "evidence_basis": [
        "profile.skills.technical[React=used_in_project]：北京前端岗位丰富",
        "has_family_constraint=父母在成都：北京距离成都远，constraint_satisfaction评分降低"
      ]
    },
    {
      "city": "成都",
      "industry": "互联网",
      "fit_score": 64,
      "fit_breakdown": {
        "skill_match": 70,
        "career_ceiling": 60,
        "cost_sustainability": 85,
        "constraint_satisfaction": 95
      },
      "evidence_basis": [
        "has_family_constraint=父母在成都：constraint_satisfaction评分最高（95）",
        "profile.constraints.location 包含成都",
        "成都前端岗位数量和薪资低于北京，但生活成本显著低"
      ]
    }
  ],
  "recommendation": "综合适配度北京略高（68 vs 64），但家庭约束是重要非量化因素。如果「就近照顾父母」是硬需求，成都是更合适选择（constraint_satisfaction=95）；如果可接受1-2次/年探亲，北京职业发展空间更大。建议用户明确家庭约束的优先级后决策。",
  "evidence_used": [
    { "field": "has_family_constraint", "value": "父母在成都", "relevance": "影响 constraint_satisfaction 维度评分" }
  ]
}
```
