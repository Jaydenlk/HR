# 示例：空差距列表 → error

## 输入

```json
{
  "skill_gaps": []
}
```

## 输出

```json
{
  "skill_name": "learning-roadmap-builder",
  "skill_version": "1.0.0",
  "summary": "skill_gaps 为空数组，无法生成学习路线图。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": ["请先运行 skill-gap-planner 获取技能差距分析结果"],
  "follow_up_questions": [],
  "cannot_determine": [],
  "error": {
    "code": "EMPTY_SKILL_GAPS",
    "message": "skill_gaps 为空数组，无技能差距可生成路线图。请先运行 skill-gap-planner，或手动指定至少一项技能差距。"
  },
  "roadmap": [],
  "resource_list": []
}
```
