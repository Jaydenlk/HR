# 示例：company_name 为空

## 输入

```json
{
  "company_name": "",
  "job_title": "产品经理"
}
```

## 输出

```json
{
  "skill_name": "company-interview-playbook",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "输入验证失败：company_name 为空，无法生成公司面试攻略。",
  "company_profile": {
    "company_name": "",
    "stage": "",
    "culture_keywords": [],
    "reputation_summary": ""
  },
  "interview_process": [],
  "culture_fit_tips": [],
  "common_pitfalls": [],
  "salary_negotiation_notes": {
    "salary_range_estimate": null,
    "negotiation_timing": ""
  },
  "evidence_used": [],
  "recommendations": ["请提供目标公司名称"],
  "risks": [],
  "next_actions": ["重新调用，提供 company_name"],
  "follow_up_questions": ["请问是哪家公司的面试？"],
  "cannot_determine": ["所有（因 company_name 为空）"],
  "error": {
    "type": "validation_error",
    "message": "company_name 不能为空"
  }
}
```
