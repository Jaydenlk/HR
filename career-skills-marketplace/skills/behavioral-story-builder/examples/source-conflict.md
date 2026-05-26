# 示例：经历中时间线存在矛盾

## 场景

用户声称在A公司任职「2023-2025」，同时声称在B公司任职「2024-2025」，时间重叠但描述为两份全职工作。

## 输入

```json
{
  "user_profile": {
    "work_experience": [
      {
        "company": "A科技",
        "title": "产品经理",
        "start_date": "2023-03",
        "end_date": "2025-01",
        "highlights": ["主导APP改版，MAU增长30%"]
      },
      {
        "company": "B互联网",
        "title": "高级产品经理",
        "start_date": "2024-06",
        "end_date": "2025-06",
        "highlights": ["负责小程序产品线"]
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
  "confidence": "medium",
  "summary": "工作经历中存在时间重叠矛盾：A科技任职至2025-01，B互联网任职自2024-06，两段经历重叠7个月（2024-06至2025-01）。已标注矛盾，故事库基于各段经历构建，但时间矛盾可能在背景调查中暴露。",
  "story_bank": [
    {
      "title": "APP改版推动MAU增长30%",
      "competency": ["数据驱动", "主动创新"],
      "situation": "在A科技担任产品经理期间，负责APP核心用户体验改版项目。",
      "task": "主导APP整体改版，目标提升用户活跃度。",
      "action": "（待补充：具体改版了哪些模块，用户研究方法，迭代过程）",
      "result": "MAU增长30%（来源：用户提供的经历描述）",
      "polish_level": "needs_polish",
      "applicable_questions": [
        "你主导过的最有影响力的产品迭代",
        "你如何用数据衡量产品效果"
      ],
      "time_estimate": 4
    }
  ],
  "coverage_map": {
    "by_dimension": {
      "数据驱动": 1,
      "主动创新": 1,
      "问题解决": 0,
      "领导力": 0,
      "协作影响": 0,
      "逆境应对": 0,
      "客户中心": 0,
      "自我学习": 0
    },
    "strong_dimensions": [],
    "weak_dimensions": ["数据驱动", "主动创新"],
    "missing_dimensions": ["问题解决", "领导力", "协作影响", "逆境应对", "客户中心", "自我学习"]
  },
  "gaps": [
    {
      "dimension": "问题解决",
      "severity": "critical",
      "experience_hint": "APP改版过程中一定遇到过技术或需求挑战，那些具体的问题解决经历是好素材"
    }
  ],
  "evidence_used": [],
  "recommendations": [
    "工作经历时间重叠需要在简历中澄清，建议确认是否为兼职/外包/重叠离职衔接",
    "如果是双职/兼职情况，面试时需要提前准备清晰的解释"
  ],
  "risks": [
    "A科技（2023-03至2025-01）与B互联网（2024-06至2025-06）任职时间重叠7个月，背景调查将发现此矛盾",
    "如无合理解释，可能被视为简历造假"
  ],
  "next_actions": [
    "确认两段经历的时间是否正确，如有误请更新",
    "如确为双职，建议咨询如何在简历中真实呈现此情况"
  ],
  "follow_up_questions": [
    "这两段经历在时间上有7个月重叠，是兼职、外包还是时间填写有误？",
    "澄清后我可以帮你更完整地整理故事库"
  ],
  "cannot_determine": [
    "B互联网经历期间的具体项目（因时间矛盾，无法确认是否同时在职）"
  ]
}
```

## 说明

- 不回避矛盾，在 `risks` 中明确指出背景调查风险
- 仍输出已有经历的故事，不因矛盾拒绝服务
- `follow_up_questions` 引导用户澄清，而非强行猜测
