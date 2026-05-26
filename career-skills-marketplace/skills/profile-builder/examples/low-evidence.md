# 示例：信息极少 → 低置信度稀疏画像

## 场景

用户仅提供模糊描述，没有完整简历，关键字段大量缺失。

## 输入

```json
{
  "user_background": "我做过一些项目，有几年经验，想换个工作"
}
```

## 输出

```json
{
  "skill": "profile-builder",
  "confidence": "low",
  "evidence_count": 1,
  "missing_fields": [
    "basic.name",
    "basic.education",
    "basic.current_role",
    "skills.technical",
    "skills.languages",
    "experience",
    "constraints.location",
    "constraints.salary_expectation",
    "career_intent.target_roles",
    "career_intent.industry_preference"
  ],
  "profile": {
    "basic": {
      "name": null,
      "education": null,
      "years_of_experience": null,
      "current_role": null
    },
    "skills": {
      "technical": [],
      "soft": [],
      "languages": []
    },
    "experience": [],
    "strengths": [],
    "weaknesses": [],
    "constraints": {
      "location": null,
      "salary_expectation": null,
      "deal_breakers": []
    },
    "career_intent": {
      "target_roles": [],
      "industry_preference": [],
      "urgency": "active"
    }
  }
}
```

## 说明

- `urgency: "active"` 有原文依据：「想换个工作」
- `years_of_experience` 为 null：「几年经验」无法映射为具体数字，不做推断
- `skills.technical` 为空数组：「做过一些项目」无法推断具体技术栈，不添加任何技术
- 建议：提示用户补充具体工作经历和技能描述，才能构建有效画像

## 后续建议

系统应向用户询问：

1. 具体从事什么行业/职位？
2. 掌握哪些技术或专业技能？
3. 最近一段工作经历的公司和职责？
