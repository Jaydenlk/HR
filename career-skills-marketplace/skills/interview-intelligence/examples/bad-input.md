# 示例：缺少公司名，输入验证错误

## 场景

用户只提供了岗位名称，未提供公司名称。

## 输入

```json
{
  "company_name": "",
  "job_title": "Java开发工程师"
}
```

## 输出

```json
{
  "skill_name": "interview-intelligence",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "输入验证失败：company_name 为空。面试情报聚合需要明确的公司名称才能检索相关面经数据。",
  "evidence_used": [],
  "recommendations": [
    "请提供目标公司的完整名称（如"阿里巴巴"、"腾讯"、"某创业公司名称"）",
    "如果公司保密，可以提供行业和公司规模，我将基于类似公司提供通用情报"
  ],
  "risks": [],
  "next_actions": [
    "重新调用，提供 company_name 字段"
  ],
  "follow_up_questions": [
    "请问是哪家公司的面试？提供公司名称我才能给你定向情报"
  ],
  "cannot_determine": [
    "所有字段（因 company_name 为空，无法检索任何面经）"
  ],
  "interview_flow": [],
  "common_questions": [],
  "preparation_priorities": [],
  "red_flags_to_watch": [],
  "error": {
    "type": "validation_error",
    "message": "company_name 不能为空，面试情报聚合需要明确的公司名称"
  }
}
```

## 说明

- 返回 `confidence: insufficient` 和 `error.type: validation_error`
- 所有情报数组返回空数组，不输出任何推断内容
- `recommendations` 引导用户补充信息或提供替代信息
