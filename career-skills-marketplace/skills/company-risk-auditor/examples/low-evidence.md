# Company Risk Auditor — Low Evidence

## 用户输入

```json
{
  "company": "某初创公司（成立1年以内）",
  "focus_areas": ["financial_health", "layoff_risk"]
}
```

## 调用 Skill

company-risk-auditor

## 输出摘要

```json
{
  "skill_name": "company-risk-auditor",
  "skill_version": "1.0.0",
  "summary": "该公司成立时间较短，公开信息极为有限，无法对财务健康和裁员风险进行可靠评估。建议通过内部渠道（脉脉、职言）获取一手信息。",
  "confidence": "low",
  "evidence_used": [],
  "risk_profile": {
    "overall_risk": "unknown",
    "known_issues": [],
    "positive_signals": []
  },
  "risks": [
    "公司公开信息不足，无法评估裁员风险",
    "财务数据不透明，需通过其他渠道自行核实"
  ],
  "cannot_determine": [
    "公司当前融资状况",
    "近期裁员或扩招信号",
    "财务健康度"
  ],
  "next_actions": [
    "在脉脉/职言搜索公司名，查看员工匿名评价",
    "LinkedIn 查看员工数量变化趋势",
    "面试时直接询问当前融资轮次和资金储备时间（runway）"
  ]
}
```

## evidence_used

- 无公开信息来源

## confidence

low — 公司成立时间过短，缺乏可查验的公开数据
