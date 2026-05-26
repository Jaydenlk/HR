# 示例：user_profile 无工作经历

## 输入

```json
{
  "user_profile": {
    "name": "张三",
    "education": "某大学计算机系"
  }
}
```

## 输出

```json
{
  "skill_name": "behavioral-story-builder",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "user_profile 中未包含工作经历（work_experience），无法提炼 STAR 故事。",
  "story_bank": [],
  "coverage_map": {
    "strong_dimensions": [],
    "weak_dimensions": [],
    "missing_dimensions": ["问题解决", "领导力", "协作影响", "主动创新", "逆境应对", "数据驱动", "客户中心", "自我学习"]
  },
  "gaps": [],
  "evidence_used": [],
  "recommendations": [
    "请在 user_profile 中提供 work_experience 字段，包含公司名、职位、时间和项目亮点",
    "如果是应届生，可以提供实习经历或校内项目经历"
  ],
  "risks": [],
  "next_actions": ["补充工作经历后重新调用"],
  "follow_up_questions": ["你有工作或实习经历吗？提供后我可以帮你提炼面试故事"],
  "cannot_determine": ["所有（因无工作经历）"],
  "error": {
    "type": "missing_profile",
    "message": "user_profile 缺少 work_experience 字段"
  }
}
```
