# 示例：无实时数据时的降级行为

## 输入

```json
{
  "industry": "元宇宙",
  "region": "中国"
}
```

## 输出

```json
{
  "skill_name": "industry-trend-analyst",
  "skill_version": "1.0.0",
  "summary": "当前无法获取实时行业数据，无法提供可靠的元宇宙行业趋势分析。建议查阅权威行业报告获取最新信息。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请查阅艾瑞咨询、IDC 等机构发布的元宇宙行业报告",
    "中国信通院发布的数字经济报告也有参考价值"
  ],
  "risks": [
    "本 skill 当前无实时数据，任何行业判断均不可靠"
  ],
  "next_actions": [
    "查阅艾瑞咨询：https://www.iresearch.com.cn",
    "查阅 IDC 中国报告",
    "关注工信部政策文件了解官方导向"
  ],
  "follow_up_questions": [
    "您关注的是元宇宙哪个细分方向（内容/硬件/基础设施）？"
  ],
  "cannot_determine": [
    "当前元宇宙行业招聘热度",
    "2026年行业增长趋势",
    "政策导向最新变化"
  ],
  "trend_summary": "无实时数据，无法评估当前元宇宙行业趋势。请查阅最新行业报告。",
  "growth_signals": [],
  "risk_signals": [],
  "hiring_outlook": "unknown",
  "recommended_entry_roles": [],
  "market_radar_used": false
}
```

## 说明

- 无实时数据时所有信号数组必须为空
- hiring_outlook 必须为 unknown
- confidence 必须为 insufficient
- 不能用训练数据中的元宇宙知识推断当前趋势
