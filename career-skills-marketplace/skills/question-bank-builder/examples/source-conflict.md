# 示例：面经来源对同一题目描述有矛盾

## 输入

```json
{
  "company_name": "美团",
  "job_title": "后端工程师"
}
```

## 场景说明

部分面经说「必考手写红黑树」，另一部分面经说「只考BST/AVL，从不要求手写红黑树」，来源存在明显矛盾。

## 输出（节选）

```json
{
  "skill_name": "question-bank-builder",
  "skill_version": "1.0.0",
  "confidence": "medium",
  "summary": "美团后端工程师题库存在部分题目的来源矛盾（算法深度要求），已将矛盾题目标注 frequency: medium，具体要求建议面试前确认。",
  "question_bank": [
    {
      "id": "mt-be-001",
      "question": "手写：实现二叉搜索树的插入、删除和中序遍历",
      "category": "technical_domain",
      "subcategory": "数据结构",
      "difficulty": "medium",
      "frequency": "high",
      "source": "牛客面经2025-2026，多数来源确认",
      "answer_hint": "递归实现，删除节点注意三种情况（无子节点/单子节点/双子节点）",
      "time_estimate": 8
    },
    {
      "id": "mt-be-002",
      "question": "手写：红黑树的插入操作及旋转平衡",
      "category": "technical_domain",
      "subcategory": "数据结构",
      "difficulty": "hard",
      "frequency": "medium",
      "source": "面经来源存在矛盾：部分说必考，部分说不考；frequency 降为 medium 谨慎处理",
      "answer_hint": "了解5条性质和旋转规则即可，实际手写要求不确定",
      "time_estimate": 15
    }
  ],
  "coverage": {
    "total_questions": 25,
    "by_category": { "technical_cs": 5, "technical_domain": 10, "system_design": 5, "behavioral": 4, "motivation": 1 },
    "estimated_coverage_percentage": 65
  },
  "gaps": [
    {
      "area": "红黑树手写要求（来源矛盾）",
      "reason": "部分面经说必考，部分说不考，可能因部门不同",
      "workaround": "了解原理和旋转逻辑即可，若面试官追问再深入"
    }
  ],
  "evidence_used": [
    { "source": "牛客面经", "time_range": "2025-06至2026-05", "count": 38 }
  ],
  "recommendations": ["矛盾题目（红黑树手写）了解原理即可，不必花大量时间死磕手写"],
  "risks": ["部分题目来源矛盾，实际考察深度可能因部门而异"],
  "next_actions": ["重点攻高频确认题，矛盾题目了解原理即可"],
  "follow_up_questions": ["你面的是哪个部门？可以帮你进一步过滤更精确的题目"],
  "cannot_determine": ["红黑树手写是否为必考项（来源矛盾）"]
}
```

## 说明

- 矛盾题目 `frequency` 降为 `medium`，不声称高频
- `source` 字段直接说明「面经来源存在矛盾」
- `gaps` 中给出矛盾项的临时应对建议
