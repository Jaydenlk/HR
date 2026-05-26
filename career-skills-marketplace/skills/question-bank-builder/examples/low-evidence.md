# 示例：小公司，无面经，知识图谱补充

## 输入

```json
{
  "company_name": "慧谷信息技术",
  "job_title": "前端工程师"
}
```

## 输出（节选）

```json
{
  "skill_name": "question-bank-builder",
  "skill_version": "1.0.0",
  "confidence": "low",
  "summary": "未找到慧谷信息技术的前端工程师面经，以下题库基于前端工程师岗位知识图谱通用体系构建，所有题目来源标注「岗位知识图谱通用」，频率不超过 medium。建议通过其他渠道获取该公司具体信息。",
  "question_bank": [
    {
      "id": "fe-gen-001",
      "question": "解释 JavaScript 事件循环（Event Loop）机制",
      "category": "technical_domain",
      "subcategory": "JavaScript核心",
      "difficulty": "medium",
      "frequency": "medium",
      "source": "岗位知识图谱通用（前端工程师必知知识点）",
      "answer_hint": "宏任务/微任务队列，Promise/async是微任务，setTimeout是宏任务",
      "time_estimate": 3
    },
    {
      "id": "fe-gen-002",
      "question": "React Hooks 中 useEffect 和 useLayoutEffect 的区别",
      "category": "technical_domain",
      "subcategory": "React框架",
      "difficulty": "medium",
      "frequency": "medium",
      "source": "岗位知识图谱通用（React项目必备知识）",
      "answer_hint": "useEffect异步执行（渲染后），useLayoutEffect同步执行（渲染前），用于避免闪烁",
      "time_estimate": 2
    }
  ],
  "coverage": {
    "total_questions": 15,
    "by_category": {
      "technical_cs": 3,
      "technical_domain": 8,
      "behavioral": 3,
      "motivation": 1
    },
    "estimated_coverage_percentage": 40
  },
  "gaps": [
    {
      "area": "公司特定技术栈（未知）",
      "reason": "无面经数据，不了解该公司使用的具体前端框架和工具链",
      "workaround": "查看公司招聘JD中的技术栈要求，或通过官网/GitHub了解技术选型"
    },
    {
      "area": "公司业务场景题",
      "reason": "无面经，不了解该公司的具体业务方向",
      "workaround": "面试前研究公司产品，准备基于其业务场景的自定义回答"
    }
  ],
  "evidence_used": [],
  "recommendations": [
    "所有题目来自通用知识图谱，建议通过脉脉/LinkedIn联系公司前端工程师获取一手信息",
    "关注JD中提到的技术栈，针对性复习"
  ],
  "risks": [
    "题目频率标注为通用推断，与该公司实际出题可能存在差异",
    "覆盖率仅约40%，题库不完整，建议补充其他来源"
  ],
  "next_actions": [
    "在脉脉搜索「慧谷信息技术 前端」，尝试联系在职员工了解面试情况"
  ],
  "follow_up_questions": [
    "你知道这家公司主要用什么前端技术栈吗？可以调整题库侧重"
  ],
  "cannot_determine": [
    "公司实际出题方向和频率（无面经数据）",
    "公司技术栈（JD未明确时）",
    "面试轮次和每轮考察重点"
  ]
}
```

## 说明

- `confidence: low`，所有题目 `source` 标注「岗位知识图谱通用」
- `frequency` 不超过 `medium`，无法声称高频
- `gaps` 列出两个重要空白区域，引导用户主动获取信息
