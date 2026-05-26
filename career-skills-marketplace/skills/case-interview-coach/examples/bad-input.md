# 示例：interview_type 无效

## 输入

```json
{
  "interview_type": "behavioral"
}
```

## 输出

```json
{
  "skill_name": "case-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "interview_type 值 \"behavioral\" 无效。behavioral（行为题）准备请使用 behavioral-story-builder skill。",
  "framework_library": [],
  "practice_cases": [],
  "common_mistakes": [],
  "evaluation_criteria": [],
  "evidence_used": [],
  "recommendations": [
    "有效的 interview_type 值：product_design / market_estimation / case_consulting / group_discussion / business_analysis",
    "行为题准备：请使用 behavioral-story-builder skill",
    "技术题准备：请使用 technical-interview-coach skill"
  ],
  "risks": [],
  "next_actions": ["重新调用，使用有效的 interview_type"],
  "follow_up_questions": ["你需要准备的是哪种类型的面试？"],
  "cannot_determine": [],
  "error": {
    "type": "validation_error",
    "message": "interview_type 无效。有效值：product_design / market_estimation / case_consulting / group_discussion / business_analysis"
  }
}
```
