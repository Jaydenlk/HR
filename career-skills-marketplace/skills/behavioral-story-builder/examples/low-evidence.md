# 示例：简历经历简略，skeleton 级别故事

## 输入

```json
{
  "user_profile": {
    "work_experience": [
      {
        "company": "某互联网公司",
        "title": "产品经理",
        "duration": "2年",
        "highlights": ["负责用户增长相关产品"]
      }
    ]
  }
}
```

## 输出

```json
{
  "skill_name": "behavioral-story-builder",
  "skill_version": "1.0.0",
  "confidence": "low",
  "summary": "工作经历描述过于简略，仅有「负责用户增长相关产品」一句，无法提炼完整STAR故事。以下为基于有限信息的 skeleton 级别故事框架，需要用户补充具体细节。",
  "story_bank": [
    {
      "title": "用户增长产品项目（待补充）",
      "competency": ["数据驱动", "主动创新"],
      "situation": "（待补充：什么业务背景，当时增长面临什么挑战？）",
      "task": "作为产品经理，负责用户增长相关产品规划和执行。",
      "action": "（待补充：具体做了哪些功能？推了什么增长策略？）",
      "result": "（待补充：DAU/用户留存/转化率等增长数据）",
      "polish_level": "skeleton",
      "applicable_questions": [
        "描述你做过的最有影响力的产品功能",
        "你如何用数据驱动产品决策"
      ],
      "time_estimate": 0
    }
  ],
  "coverage_map": {
    "by_dimension": {
      "问题解决": 0,
      "领导力": 0,
      "协作影响": 0,
      "主动创新": 0,
      "逆境应对": 0,
      "数据驱动": 0,
      "客户中心": 0,
      "自我学习": 0
    },
    "strong_dimensions": [],
    "weak_dimensions": [],
    "missing_dimensions": ["问题解决", "领导力", "协作影响", "主动创新", "逆境应对", "数据驱动", "客户中心", "自我学习"]
  },
  "gaps": [
    {
      "dimension": "数据驱动",
      "severity": "critical",
      "experience_hint": "用户增长产品通常有数据，你做过的增长策略有没有具体的DAU、转化率等数据支撑？"
    },
    {
      "dimension": "问题解决",
      "severity": "critical",
      "experience_hint": "增长过程中遇到过什么瓶颈？是数据、技术还是推广的问题？如何解决的？"
    }
  ],
  "evidence_used": [],
  "recommendations": [
    "当前经历描述过于简略，强烈建议补充至少3个具体项目的细节",
    "可以从以下维度补充：做了什么功能、遇到了什么挑战、结果如何量化"
  ],
  "risks": ["skeleton 级别故事无法直接用于面试，需要大量补充"],
  "next_actions": [
    "请提供更详细的工作经历（具体项目、挑战、数据）",
    "如果简历已有详细内容，请提供完整简历文本"
  ],
  "follow_up_questions": [
    "你做用户增长期间，有没有某个数据指标增长超过20%的项目？",
    "你推过哪些具体的增长功能？比如邀请裂变、签到体系等？"
  ],
  "cannot_determine": [
    "具体项目名称和业务背景",
    "实际参与的功能和工作内容",
    "量化的业务结果",
    "团队规模和个人职责边界"
  ]
}
```

## 说明

- `confidence: low`，`polish_level: skeleton`
- 所有空白字段标注「待补充」，不虚构内容
- `gaps.severity: critical` 优先提示最关键的信息缺口
