# 示例：面经对算法难度描述矛盾

## 场景

目标公司面经中，部分说「算法题只有LeetCode简单」，另一部分说「难到手写DP+记忆化搜索」。

## 输入

```json
{
  "job_title": "后端工程师",
  "company_name": "某B轮公司",
  "interview_intelligence": {
    "common_questions": [
      { "question": "链表反转", "category": "technical", "frequency": "high" },
      { "question": "复杂DP（树形DP）", "category": "technical", "frequency": "medium" }
    ]
  }
}
```

## 输出

```json
{
  "skill_name": "technical-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "medium",
  "summary": "面经对算法难度的描述存在矛盾，备考计划覆盖简单到中等难度，部分困难题作为加分项列入。无法确定实际考察深度，建议以中等为主保底。",
  "preparation_plan": [
    {
      "priority": "critical",
      "area": "LeetCode简单+中等算法（链表/数组/字符串）",
      "estimated_hours": 20,
      "target_week": 1,
      "resources_hint": "面经确认链表反转为高频题，从此类基础题入手，确保不丢分"
    },
    {
      "priority": "high",
      "area": "中等动态规划（背包/子序列/树形DP）",
      "estimated_hours": 15,
      "target_week": 2,
      "resources_hint": "面经有矛盾，按中等覆盖，有余力再攻困难"
    }
  ],
  "practice_questions": [
    {
      "title": "反转链表（基础版 + 区间反转进阶）",
      "type": "algorithm",
      "difficulty": "easy",
      "target_company_relevance": "high",
      "key_concepts": ["指针操作", "递归", "迭代"]
    }
  ],
  "common_patterns": [
    {
      "pattern_name": "动态规划三部曲",
      "applicable_types": ["algorithm"],
      "description": "状态定义→转移方程→初始化；先写暴力递归，再加记忆化，最后改为迭代"
    }
  ],
  "company_specific_focus": [],
  "evidence_used": [],
  "recommendations": ["建议中等难度为主保底，有时间再攻困难题"],
  "risks": ["算法难度预期存在矛盾，实际难度因面试官和部门而异"],
  "next_actions": ["以链表、数组中等题为起点，2周内覆盖常见算法题型"],
  "follow_up_questions": ["你目前已经刷了多少LeetCode题？"],
  "cannot_determine": [
    "该公司算法实际考察难度（面经描述存在矛盾）",
    "是否有笔试或手撕代码"
  ]
}
```
