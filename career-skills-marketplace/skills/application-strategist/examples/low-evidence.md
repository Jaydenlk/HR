# 示例：画像部分缺失 → 策略降级

## 场景

用户只说明了自己是前端工程师、想找工作，未提供经验年限、技能详情和时间约束，画像严重不足。

## 输入

```json
{
  "user_profile": {
    "skills": ["前端开发"],
    "employment_status": "unemployed"
  }
}
```

## 输出

```json
{
  "skill_name": "application-strategist",
  "skill_version": "1.0.0",
  "summary": "用户画像信息严重不足，仅能提供通用求职框架建议。请补充经验年限、技术栈详情、目标城市和薪资期望，以获取针对性策略。",
  "confidence": "low",
  "evidence_used": [
    { "source": "user_profile", "content": "前端开发，离职状态" }
  ],
  "recommendations": [
    "离职状态下建议加快求职节奏，每周投递20-30份",
    "前端方向建议同时布局：一线大厂（React/Vue主导）和中型产品公司"
  ],
  "risks": [
    "信息不足导致策略无法个性化，建议先完善画像"
  ],
  "next_actions": [
    "使用 profile-builder 完善个人画像（经验年限、技术栈、目标城市、薪资期望）",
    "补充画像后重新生成求职策略"
  ],
  "follow_up_questions": [
    "你有几年前端开发经验？",
    "主要技术栈是什么？（React/Vue/Angular）",
    "目标城市是哪里？",
    "期望月薪范围是多少？",
    "有入职时间限制吗？"
  ],
  "cannot_determine": [
    "目标公司分层（缺少经验年限和技术栈）",
    "投递节奏（缺少时间约束）",
    "薪资竞争力判断（缺少薪资期望）"
  ],
  "target_company_tiers": [],
  "application_sequence": [],
  "daily_action_plan": [
    { "action": "完善个人简历和 profile-builder 画像", "time_estimate": "60分钟", "priority": "high" },
    { "action": "在 BOSS直聘/拉勾 浏览前端岗位，了解市场需求", "time_estimate": "30分钟", "priority": "medium" }
  ],
  "risk_assessment": {
    "main_risks": ["画像不足导致投递目标不精准，浪费时间"],
    "mitigation": ["先完成 profile-builder，再制定具体策略"]
  }
}
```

## 说明

- `target_company_tiers` 为空数组：数据不足时不虚构分层
- `confidence: low`：画像严重不完整
- `daily_action_plan` 只包含「补充画像」相关任务，不虚构具体投递计划
