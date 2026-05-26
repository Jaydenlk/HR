# 示例：未提供 profile → error

## 输入

```json
{
  "target_role": "产品经理"
}
```

## 输出

```json
{
  "skill_name": "career-path-planner",
  "skill_version": "1.0.0",
  "summary": "未提供 profile 字段，无法执行职业路径规划。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": [
    "请先提供简历或背景描述，通过 profile-builder 构建用户画像",
    "构建画像后重新调用 career-path-planner"
  ],
  "follow_up_questions": [
    "你能提供你的简历文本或工作背景描述吗？"
  ],
  "cannot_determine": [
    "所有路径维度（技能/经验/学历/行业）均无法评估，因为 profile 字段缺失"
  ],
  "error": {
    "code": "MISSING_PROFILE",
    "message": "career-path-planner 需要 profile 字段（来自 profile-builder 输出）。当前输入缺少 profile，无法进行路径规划。请先运行 profile-builder。"
  },
  "paths": [],
  "recommended_path": "",
  "immediate_actions": []
}
```

## 说明

- 缺少 profile 时返回 error 对象，不输出任何泛化路径
- confidence 标记为 insufficient
- 明确指引用户下一步操作
