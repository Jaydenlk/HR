# 示例：无实际项目经验 → 无法建立内容型品牌

## 输入

```json
{
  "profile": {
    "basic": { "name": "新手", "years_of_experience": 0 },
    "skills": {
      "technical": [
        { "name": "Python", "proficiency": "mentioned" },
        { "name": "Java", "proficiency": "mentioned" }
      ]
    },
    "experience": []
  }
}
```

## 输出

```json
{
  "skill_name": "personal-brand-builder",
  "skill_version": "1.0.0",
  "summary": "profile 中无工作经历且所有技能均为 mentioned 级别，无法建立有内容基础的个人品牌。建议先积累项目经验后再来。",
  "confidence": "low",
  "evidence_used": [
    { "field": "profile.experience", "value": "空数组", "relevance": "无法从空白经历中提炼内容主题" },
    { "field": "profile.skills.technical[全部=mentioned]", "value": "Python,Java均为mentioned", "relevance": "仅提及级别不足以支撑技术深度内容" }
  ],
  "recommendations": [
    "先完成1-2个有具体成果的个人项目（GitHub 上的真实代码），再来建立品牌",
    "个人项目选题原则：解决自己真实遇到的问题，而非复现教程"
  ],
  "risks": [
    "在无项目经验的情况下输出技术内容，容易被读者质疑或提问无法回答，反而损害个人品牌"
  ],
  "next_actions": [
    "完成一个真实的个人项目（选择能展示 Python 或 Java 技能的小工具/自动化脚本）",
    "项目完成后重新运行 personal-brand-builder"
  ],
  "follow_up_questions": [
    "你在学习 Python/Java 期间有没有做过任何项目（哪怕是课程作业）？",
    "你有没有遇到过用技术可以解决的日常问题？"
  ],
  "cannot_determine": ["内容品牌方向（需要先有项目经验）"],
  "brand_strategy": {
    "type": "technical_depth",
    "positioning": "暂无法定位（缺少项目经验基础）",
    "evidence_basis": []
  },
  "platform_actions": [],
  "content_ideas": [],
  "profile_optimization": []
}
```
