# 示例：只有一个城市意向 → 说明比较价值有限

## 输入

```json
{
  "profile": {
    "basic": { "name": "李华", "years_of_experience": 2 },
    "skills": { "technical": [{ "name": "Java", "proficiency": "used_in_project" }] },
    "constraints": { "location": ["上海"] }
  },
  "candidate_cities": ["上海"]
}
```

## 输出

```json
{
  "skill_name": "city-industry-fit-advisor",
  "skill_version": "1.0.0",
  "summary": "用户城市约束为单一城市（上海），无法进行城市比较分析。输出上海内的行业适配度分析。",
  "confidence": "medium",
  "fit_matrix": [
    {
      "city": "上海",
      "industry": "金融科技",
      "fit_score": 72,
      "fit_breakdown": {
        "skill_match": 75,
        "career_ceiling": 80,
        "cost_sustainability": 60,
        "constraint_satisfaction": 100
      },
      "evidence_basis": ["profile.constraints.location=[上海]：完全满足地点约束"]
    },
    {
      "city": "上海",
      "industry": "互联网",
      "fit_score": 68,
      "fit_breakdown": {
        "skill_match": 70,
        "career_ceiling": 75,
        "cost_sustainability": 55,
        "constraint_satisfaction": 100
      },
      "evidence_basis": ["profile.skills.technical[Java=used_in_project]：Java在上海互联网有市场"]
    }
  ],
  "recommendations": [
    "城市已确定为上海，本次分析聚焦上海内不同行业的适配度",
    "金融科技是上海最强势的行业之一，Java背景高度匹配，适配度略高于纯互联网"
  ],
  "follow_up_questions": [
    "你是否有机会考虑其他城市？如果有，可以提供候选城市列表进行完整比较分析"
  ],
  "recommendation": "上海内推荐优先考虑金融科技方向（fit_score=72，高于互联网68）。Java在上海金融科技有成熟市场，职业天花板也更高（金融科技高级岗薪资通常高于同等互联网岗）。",
  "industry_hub_analysis": [
    {
      "city": "上海",
      "key_companies": ["蚂蚁金服（上海研发中心）", "陆金所", "平安科技", "中国联通互联网基地", "美团（上海）"],
      "cluster_effect": "上海金融科技生态成熟，合规/风控/支付方向有大量机会",
      "career_ceiling": "金融科技高级工程师/架构师：20-50k，头部公司CTO级别无上限"
    }
  ],
  "evidence_used": [
    { "field": "profile.constraints.location", "value": "[上海]", "relevance": "单一城市约束，比较范围转为行业比较" }
  ]
}
```
