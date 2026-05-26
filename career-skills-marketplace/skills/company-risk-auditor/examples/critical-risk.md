# 示例：有欠薪记录的高风险公司

## 场景

用户询问某有欠薪和法律纠纷记录的公司。

## 输入

```json
{
  "company": "某有风险记录的公司（化名）",
  "focus_areas": ["layoff_risk", "financial_health", "legal_issues"]
}
```

## 输出（节选）

```json
{
  "skill_name": "company-risk-auditor",
  "skill_version": "1.0.0",
  "summary": "该公司有明确的欠薪记录（劳动仲裁）和法院被执行记录，整体风险评级为 critical，不建议加入。",
  "confidence": "high",
  "risks": [
    "劳动仲裁记录：2025年 Q3 有 12 名员工申请劳动仲裁，理由为拖欠工资",
    "法院被执行记录：2025年 11 月在中国执行信息公开网有记录",
    "天眼查显示经营异常状态"
  ],
  "risk_profile": {
    "overall_risk": "critical",
    "layoff_history": {
      "has_significant_layoffs": true,
      "last_layoff_date": "2025-10",
      "estimated_scale": "约 30%（估算）",
      "sources": ["脉脉职言 2025-10", "界面新闻 2025-11"]
    },
    "culture_signals": [
      {
        "signal": "欠薪问题，多名员工反映工资未按时发放",
        "type": "negative",
        "source": "脉脉职言 2025-Q3"
      }
    ],
    "known_issues": [
      {
        "issue": "欠薪劳动仲裁，12 名员工申请",
        "severity": "critical",
        "source": "劳动仲裁公示",
        "date": "2025-09"
      },
      {
        "issue": "法院被执行记录",
        "severity": "critical",
        "source": "中国执行信息公开网",
        "date": "2025-11"
      }
    ]
  }
}
```
