# 示例：phase 字段无效

## 场景

用户传入了不存在的 phase 值。

## 输入

```json
{
  "phase": "review",
  "job_title": "数据工程师"
}
```

## 输出

```json
{
  "skill_name": "mock-interviewer",
  "skill_version": "1.0.0",
  "phase": "review",
  "confidence": "insufficient",
  "summary": "输入验证失败：phase 字段值 \"review\" 无效，有效值为 generate_questions、evaluate_answer、final_report。",
  "evidence_used": [],
  "recommendations": [
    "Phase 1（出题）：传入 phase: \"generate_questions\"",
    "Phase 2（评分）：传入 phase: \"evaluate_answer\" 并附带 questions 和 answers",
    "Phase 3（报告）：传入 phase: \"final_report\" 并附带 answer_evaluations"
  ],
  "risks": [],
  "next_actions": ["重新调用，使用有效的 phase 值"],
  "follow_up_questions": ["你想进行哪个阶段的模拟面试？出题还是评分？"],
  "cannot_determine": [],
  "questions": [],
  "answer_evaluations": [],
  "overall_score": 0,
  "overall_grade": "C",
  "dimension_scores": [],
  "error": {
    "type": "validation_error",
    "message": "phase 字段值无效，有效值：generate_questions / evaluate_answer / final_report"
  }
}
```

## 说明

- `confidence: insufficient` + `error.type: validation_error`
- 给出了完整的有效值说明，引导用户正确使用
