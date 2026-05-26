# 示例：所有帖子均为推广内容

## 场景

成功访问小红书，但搜索结果全为推广笔记，无真实面经。

## 输入

```json
{
  "company": "某培训机构",
  "role": "产品经理",
  "max_posts": 5
}
```

## 输出

```json
{
  "skill_name": "xhs-interview-miner",
  "skill_version": "1.0.0",
  "summary": "搜索到 5 篇帖子，均疑似推广笔记，过滤后无可用面经。建议手动搜索并筛选非推广内容。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "搜索时尝试过滤带「课程」「报名」关键词的帖子",
    "牛客网的面经可靠性更高，建议同时查阅"
  ],
  "risks": ["小红书上该公司相关帖子推广比例极高"],
  "next_actions": ["手动在小红书筛选非推广面经"],
  "follow_up_questions": [],
  "cannot_determine": ["该公司真实面试流程（推广内容无法用于分析）"],
  "mined_posts": [],
  "quality_report": {
    "total_found": 5,
    "usable_count": 0,
    "promotional_count": 5,
    "average_grade": "N/A",
    "notes": ["所有搜索结果均为推广笔记，无可用面经"]
  },
  "credibility_ceiling": "C"
}
```
