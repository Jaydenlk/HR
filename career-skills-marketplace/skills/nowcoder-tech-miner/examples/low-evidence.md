# 示例：来源超过 6 个月的陈旧数据

## 场景

获取到牛客面经，但发布时间超过 180 天，时效性存疑。

## 输入

```json
{
  "company": "某已转型公司",
  "focus": "interview"
}
```

## 输出

```json
{
  "skill_name": "nowcoder-tech-miner",
  "skill_version": "1.0.0",
  "summary": "找到 2 篇面经，但均超过 6 个月，面试流程可能已有变化，置信度降为 low。",
  "confidence": "low",
  "evidence_used": [
    { "post_id": "nc://old_001", "grade": "C", "date": "2025-08-01" }
  ],
  "recommendations": [
    "以下面经超过 6 个月，面试题目和流程可能已更新",
    "建议在牛客网搜索最近 3 个月内的最新面经"
  ],
  "risks": ["数据时效性不足，不建议作为唯一备考依据"],
  "next_actions": ["在牛客网搜索该公司最新面经（过滤 3 个月内）"],
  "follow_up_questions": [],
  "cannot_determine": ["该公司当前面试流程（来源已过期）"],
  "mined_posts": [
    {
      "post_id": "nc://old_001",
      "title": "某公司后端面经（已过时）",
      "date": "2025-08-01",
      "content_type": "interview_experience",
      "interview_rounds": ["一面", "二面"],
      "result": "offer",
      "credibility_grade": "C"
    }
  ],
  "technical_questions": [],
  "credibility_ceiling": "B"
}
```
