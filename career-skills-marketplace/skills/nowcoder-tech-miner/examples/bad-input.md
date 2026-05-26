# 示例：无效输入（company 为空）

## 输入

```json
{
  "company": ""
}
```

## 输出

```json
{
  "skill_name": "nowcoder-tech-miner",
  "skill_version": "1.0.0",
  "summary": "company 字段不能为空，请提供目标公司名称。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供目标公司名称后重试"],
  "risks": [],
  "next_actions": [],
  "follow_up_questions": ["您想查询哪家公司的面经？"],
  "cannot_determine": ["面经数据（输入无效）"],
  "mined_posts": [],
  "technical_questions": [],
  "credibility_ceiling": "B"
}
```
