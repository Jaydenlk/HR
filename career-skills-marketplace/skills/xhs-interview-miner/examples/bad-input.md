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
  "skill_name": "xhs-interview-miner",
  "skill_version": "1.0.0",
  "summary": "company 字段不能为空，请提供目标公司名称。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": ["请提供目标公司名称后重试"],
  "risks": [],
  "next_actions": [],
  "follow_up_questions": ["您想查询哪家公司的面试经验？"],
  "cannot_determine": ["面经数据（输入无效）"],
  "mined_posts": [],
  "quality_report": {
    "total_found": 0,
    "usable_count": 0,
    "promotional_count": 0,
    "average_grade": "N/A",
    "notes": ["输入验证失败：company 不能为空"]
  },
  "credibility_ceiling": "C"
}
```
