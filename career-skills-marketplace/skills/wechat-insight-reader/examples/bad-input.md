# 示例：无效输入（topic 过短）

## 输入

```json
{
  "topic": "a"
}
```

## 输出

```json
{
  "skill_name": "wechat-insight-reader",
  "skill_version": "1.0.0",
  "summary": "topic 字段至少需要 2 个字符，请提供更具体的查询主题。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供至少 2 个字符的主题，如「职业规划」「产品方法论」"],
  "risks": [],
  "next_actions": [],
  "follow_up_questions": ["您希望了解哪方面的行业洞察？"],
  "cannot_determine": ["洞察内容（输入无效）"],
  "insights": []
}
```
