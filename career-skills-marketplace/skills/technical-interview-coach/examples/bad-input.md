# 示例：job_title 为空

## 输入

```json
{
  "job_title": "",
  "company_name": "百度"
}
```

## 输出

```json
{
  "skill_name": "technical-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "输入验证失败：job_title 为空，无法制定技术面试备考计划。",
  "preparation_plan": [],
  "practice_questions": [],
  "common_patterns": [],
  "company_specific_focus": [],
  "evidence_used": [],
  "recommendations": ["请提供目标岗位名称（如「后端工程师」「算法工程师」）"],
  "risks": [],
  "next_actions": ["重新调用，提供 job_title"],
  "follow_up_questions": ["你面的是什么技术岗位？"],
  "cannot_determine": ["所有（因 job_title 为空）"],
  "error": {
    "type": "validation_error",
    "message": "job_title 不能为空"
  }
}
```
