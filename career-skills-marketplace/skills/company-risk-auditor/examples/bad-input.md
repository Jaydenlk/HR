# 示例：未知小公司（无任何数据）

## 场景

用户询问一家极不知名的小公司，无任何数据记录。

## 输入

```json
{
  "company": "某三线城市小型科技公司"
}
```

## 输出

```json
{
  "skill_name": "company-risk-auditor",
  "skill_version": "1.0.0",
  "summary": "该公司规模较小且知名度有限，无法找到任何有效数据。建议通过天眼查等工具自行核查。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "在天眼查/企查查搜索该公司全称，核实工商状态",
    "向招聘方索取营业执照和社保缴纳证明",
    "如可能，联系在该公司任职的人员了解实际情况"
  ],
  "risks": [
    "无数据来源，无法评估公司风险，实际风险未知"
  ],
  "next_actions": [
    "天眼查：https://www.tianyancha.com",
    "向 HR 询问公司规模、成立时间和最近一次发薪记录"
  ],
  "follow_up_questions": [
    "该公司全称是什么？",
    "公司成立多少年了？",
    "是否已在招聘平台发布 JD（有 JD 说明至少有招聘需求）？"
  ],
  "cannot_determine": [
    "公司稳定性",
    "裁员历史",
    "文化状况"
  ],
  "risk_profile": {
    "overall_risk": "unknown",
    "layoff_history": {
      "has_significant_layoffs": null,
      "last_layoff_date": null,
      "estimated_scale": "",
      "sources": []
    },
    "culture_signals": [],
    "known_issues": [],
    "financial_signals": [],
    "data_age_warning": "无任何数据可用，以上分析无法执行"
  }
}
```
