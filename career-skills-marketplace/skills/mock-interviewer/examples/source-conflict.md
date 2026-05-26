# 示例：用户回答自相矛盾

## 场景

用户在回答中声称带过30人团队，但简历显示从未有管理经历。

## 输入

```json
{
  "phase": "evaluate_answer",
  "job_title": "工程团队负责人",
  "user_profile": {
    "work_experience": [
      { "title": "高级前端工程师", "is_management": false }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "question": "描述你带领团队完成挑战性目标的经历",
      "type": "behavioral"
    }
  ],
  "answers": [
    {
      "question_id": "q1",
      "answer_text": "我带领30人的前端团队，在3个月内完成了整个产品线的技术架构升级，团队效率提升了40%。"
    }
  ]
}
```

## 输出

```json
{
  "skill_name": "mock-interviewer",
  "skill_version": "1.0.0",
  "phase": "evaluate_answer",
  "confidence": "medium",
  "summary": "q1 回答存在与简历的矛盾：回答中声称带领30人团队，但简历显示无管理经历。已标注矛盾，评分基于回答内容本身，同时指出一致性风险。",
  "answer_evaluations": [
    {
      "question_id": "q1",
      "user_answer": "我带领30人的前端团队，在3个月内完成了整个产品线的技术架构升级，团队效率提升了40%。",
      "score": 4,
      "strengths": [
        "有量化的结果数据（「团队效率提升了40%」）",
        "时间节点明确（「3个月」）"
      ],
      "weaknesses": [
        "回答声称管理30人团队，但与提供的简历（无管理经历）不符，面试官核实时将产生严重可信度问题",
        "缺少具体行动细节：如何分工、如何解决技术难点、如何推动30人协作",
        "「团队效率提升40%」缺乏说明：效率如何衡量？对比基准是什么？"
      ],
      "suggestion": "如果确实有此经历，需要补充到简历中，并能解释为何简历未体现。如果是夸大，建议改为真实经历，即使规模更小，真实性比数字更重要。",
      "model_answer_hint": "管理经历描述需要：1）个人角色定位清晰（是TL还是项目负责人）2）分工和协调的具体机制 3）可验证的结果指标"
    }
  ],
  "evidence_used": [],
  "recommendations": [
    "回答与简历不一致会在背景调查阶段暴露，建议使用与简历一致的经历"
  ],
  "risks": [
    "声称的团队规模与简历不符，面试官追问时将产生可信度危机"
  ],
  "next_actions": ["确认此经历是否真实，若真实则更新简历；若有夸大请选择其他真实经历"],
  "follow_up_questions": ["这30人团队的经历为何没有体现在你的简历中？是临时负责还是正式职务？"],
  "cannot_determine": ["回答与简历的矛盾是笔误还是主动夸大"],
  "questions": [],
  "overall_score": 0,
  "overall_grade": "C",
  "dimension_scores": []
}
```

## 说明

- 诚实标注矛盾（简历 vs 回答），不回避
- 评分4/10 反映回答质量问题，未因有量化数据就虚高评分
- `risks` 中明确指出背景调查风险
