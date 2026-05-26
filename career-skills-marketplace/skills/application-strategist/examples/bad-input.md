# 示例：无效输入（无画像）→ 返回 insufficient

## 场景

用户完全没有提供 user_profile，请求制定求职策略。

## 输入

```json
{}
```

## 输出

```json
{
  "skill_name": "application-strategist",
  "skill_version": "1.0.0",
  "summary": "未提供用户画像，无法制定求职策略。求职策略必须基于候选人的技能、经验和求职目标。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请先使用 profile-builder 构建个人画像，再请求求职策略"
  ],
  "risks": [],
  "next_actions": [
    "使用 profile-builder 输入简历或自我描述，生成结构化画像",
    "画像完成后重新发起求职策略请求"
  ],
  "follow_up_questions": [
    "您从事什么行业？有几年工作经验？",
    "您的求职目标是什么（城市、薪资、行业）？"
  ],
  "cannot_determine": [
    "所有策略维度均无法评估（无用户数据）"
  ],
  "target_company_tiers": [],
  "application_sequence": [],
  "daily_action_plan": [],
  "risk_assessment": {
    "main_risks": [],
    "mitigation": []
  }
}
```

## 说明

- `confidence: insufficient`，输入缺少必须字段 `user_profile`
- 所有策略字段返回空，不虚构任何具体建议
