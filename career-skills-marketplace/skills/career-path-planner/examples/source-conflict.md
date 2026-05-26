# 示例：稀疏画像 → 通用框架路径，低置信度

## 输入

```json
{
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
    "constraints": { "location": null },
    "career_intent": { "target_roles": [], "urgency": "unknown" }
  }
}
```

## 输出

```json
{
  "skill_name": "career-path-planner",
  "skill_version": "1.0.0",
  "summary": "画像信息极度稀疏，无法基于画像匹配度生成有效路径。输出通用职业规划框架，置信度 low。建议先补充简历信息。",
  "confidence": "low",
  "evidence_used": [],
  "recommendations": [
    "当前画像缺少所有关键维度，无法进行有效路径匹配",
    "建议先通过 profile-builder 构建完整画像，然后重新运行本 skill"
  ],
  "risks": [
    "在无画像数据支撑的情况下，任何路径建议都仅为泛化框架，不具备个人针对性"
  ],
  "next_actions": [
    "提交简历或详细描述工作背景（学历、技能、工作经历）",
    "运行 profile-builder 构建完整画像"
  ],
  "follow_up_questions": [
    "你目前是什么工作年限？",
    "你的核心技能有哪些？",
    "你对哪个职业方向最感兴趣？"
  ],
  "cannot_determine": [
    "无法计算任何路径的适配度（fit_pct），因为画像为空",
    "无法评估技能覆盖率",
    "无法评估经验年限匹配",
    "无法评估行业相关度"
  ],
  "paths": [],
  "recommended_path": "",
  "immediate_actions": [
    {
      "action": "提交简历文本，运行 profile-builder 构建画像",
      "rationale": "当前画像为空，所有 profile 字段均为 null 或空数组，无法生成有效路径",
      "timeframe": "立即"
    }
  ]
}
```

## 说明

- 稀疏画像时 paths 为空数组，不生成虚假路径
- cannot_determine 明确列出无法评估的维度，而非返回通用路径糊弄用户
- 不输出"努力学习提升自己"等无意义建议
