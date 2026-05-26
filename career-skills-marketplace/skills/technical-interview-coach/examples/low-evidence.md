# 示例：仅有岗位名，无公司和时间信息

## 输入

```json
{
  "job_title": "数据工程师"
}
```

## 输出

```json
{
  "skill_name": "technical-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "low",
  "summary": "未提供目标公司和备考时间，以下为数据工程师岗位的通用技术面备考计划，无法个性化对齐公司考察重点。",
  "preparation_plan": [
    {
      "priority": "critical",
      "area": "SQL 进阶（窗口函数/复杂关联/性能调优）",
      "estimated_hours": 20,
      "target_week": null,
      "resources_hint": "Mode Analytics SQL教程，LeetCode数据库题"
    },
    {
      "priority": "critical",
      "area": "大数据框架（Spark/Hive/Flink基础原理）",
      "estimated_hours": 25,
      "target_week": null,
      "resources_hint": "官方文档+实际项目练习，重点理解RDD/DataFrame/流处理概念"
    }
  ],
  "practice_questions": [
    {
      "title": "SQL：找出每个部门薪资排名前3的员工",
      "type": "cs_fundamentals",
      "difficulty": "medium",
      "target_company_relevance": "medium",
      "key_concepts": ["窗口函数", "RANK()", "分组"]
    }
  ],
  "common_patterns": [
    {
      "pattern_name": "SQL调优三步",
      "applicable_types": ["cs_fundamentals"],
      "description": "EXPLAIN分析→索引优化→查询重写；先说分析思路再给解决方案"
    }
  ],
  "company_specific_focus": [],
  "evidence_used": [],
  "recommendations": ["提供目标公司可以让备考计划更有针对性"],
  "risks": ["无公司信息，备考计划为通用版，可能与实际考察有偏差"],
  "next_actions": ["提供目标公司以获取更精准的计划"],
  "follow_up_questions": ["你面的是哪家公司的数据工程师？有没有面试时间？"],
  "cannot_determine": ["目标公司的技术栈偏好", "面试难度预期", "具体考察重点"]
}
```
