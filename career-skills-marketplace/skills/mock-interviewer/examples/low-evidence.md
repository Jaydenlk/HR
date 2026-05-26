# 示例：仅有岗位名，无 profile 和 JD

## 场景

用户只告知岗位名称，没有提供简历或 JD 信息。

## 输入

```json
{
  "phase": "generate_questions",
  "job_title": "运营专员"
}
```

## 输出

```json
{
  "skill_name": "mock-interviewer",
  "skill_version": "1.0.0",
  "phase": "generate_questions",
  "confidence": "low",
  "summary": "未获取用户简历和目标 JD，以下为运营专员岗位通用面试题，无法定制难度和方向。建议提供简历和 JD 以获得更有针对性的模拟。",
  "questions": [
    {
      "id": "q1",
      "question": "描述你做过的一次用户增长活动，从策划到执行，结果如何？",
      "type": "behavioral",
      "difficulty": "medium",
      "time_limit": 4,
      "evaluation_focus": "活动策划能力、数据意识、执行完整度"
    },
    {
      "id": "q2",
      "question": "如果一款 App 的 DAU 连续两周下降15%，你会如何分析原因并制定应对方案？",
      "type": "case",
      "difficulty": "medium",
      "time_limit": 6,
      "evaluation_focus": "数据分析思维、问题拆解能力"
    },
    {
      "id": "q3",
      "question": "为什么选择运营岗位？你对运营的理解是什么？",
      "type": "motivation",
      "difficulty": "easy",
      "time_limit": 2,
      "evaluation_focus": "职业认知清晰度"
    }
  ],
  "evidence_used": [],
  "recommendations": [
    "提供简历（user_profile）可以让模拟题更贴近你的实际经历",
    "提供目标 JD 可以让题目难度和方向更精准"
  ],
  "risks": ["通用题目可能与目标公司的实际考察方向存在偏差"],
  "next_actions": ["开始回答 q1，尽量使用具体案例和数据"],
  "follow_up_questions": ["你有目标公司和 JD 吗？提供后我可以给你出定向题"],
  "cannot_determine": [
    "候选人的实际经验层级（题目难度无法个性化）",
    "目标公司的具体考察重点",
    "岗位的技术要求深度（是否需要 SQL/数据分析）"
  ],
  "answer_evaluations": [],
  "overall_score": 0,
  "overall_grade": "C",
  "dimension_scores": []
}
```

## 说明

- `confidence: low` 因为缺少 user_profile 和 jd_analysis
- `cannot_determine` 明确说明题目无法个性化的原因
- 仍输出有效题目，不因缺少数据就拒绝服务
