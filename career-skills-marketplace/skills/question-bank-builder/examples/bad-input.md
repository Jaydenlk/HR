# 示例：缺少公司名

## 输入

```json
{
  "company_name": "",
  "job_title": "数据分析师"
}
```

## 输出

```json
{
  "skill_name": "question-bank-builder",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "输入验证失败：company_name 为空。构建定向题库需要明确的公司名称。",
  "question_bank": [],
  "coverage": { "total_questions": 0, "by_category": {}, "estimated_coverage_percentage": 0 },
  "gaps": [],
  "evidence_used": [],
  "recommendations": [
    "提供目标公司名称以获取定向题库",
    "若公司保密，可提供行业+规模+技术栈，我将构建通用题库"
  ],
  "risks": [],
  "next_actions": ["重新调用，提供 company_name"],
  "follow_up_questions": ["是哪家公司的数据分析师岗位？"],
  "cannot_determine": ["所有（因 company_name 为空）"],
  "error": {
    "type": "validation_error",
    "message": "company_name 不能为空"
  }
}
```
