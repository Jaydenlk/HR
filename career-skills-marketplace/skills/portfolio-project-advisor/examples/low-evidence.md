# 示例：无技术技能 → 建议先确定方向

## 输入

```json
{
  "profile": {
    "basic": { "name": "新手", "years_of_experience": 0 },
    "skills": { "technical": [], "soft": [] },
    "experience": []
  }
}
```

## 输出

```json
{
  "skill_name": "portfolio-project-advisor",
  "skill_version": "1.0.0",
  "summary": "profile 中无技术技能和工作经历，无法推荐有针对性的 portfolio 项目。需要先确定技术方向后再规划。",
  "confidence": "low",
  "evidence_used": [
    { "field": "profile.skills.technical", "value": "空数组", "relevance": "无技术基础无法推荐技术项目" }
  ],
  "recommendations": [
    "先确定技术方向（前端/后端/数据/移动端），再来规划 portfolio 项目",
    "完成一个基础学习路径（参考 learning-roadmap-builder）后，再来做 portfolio"
  ],
  "risks": [],
  "next_actions": [
    "使用 career-path-planner 确定职业方向",
    "使用 skill-gap-planner + learning-roadmap-builder 制定学习计划"
  ],
  "follow_up_questions": [
    "你对哪类技术方向感兴趣（前端/后端/数据分析/移动开发）？"
  ],
  "cannot_determine": ["Portfolio 项目方向（需要先有技术方向和基础技能）"],
  "project_ideas": [],
  "anti_patterns": [
    {
      "pattern": "在没有技术基础的情况下直接开始一个「大项目」",
      "reason": "技术基础不足时，项目很容易卡住，导致半成品，白白消耗信心"
    }
  ]
}
```
