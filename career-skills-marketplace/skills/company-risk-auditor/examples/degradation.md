# 示例：无实时数据时降级到知识图谱

## 输入

```json
{
  "company": "某二线城市制造业企业"
}
```

## 输出

```json
{
  "skill_name": "company-risk-auditor",
  "skill_version": "1.0.0",
  "summary": "当前无法获取该公司实时信息，以下分析来自历史知识库，可能不反映公司近期状况。建议自行查询天眼查、脉脉等平台获取最新信息。",
  "confidence": "low",
  "evidence_used": [],
  "recommendations": [
    "请在天眼查确认公司工商状态和是否在法院被执行名单",
    "在脉脉职言搜索该公司名称了解员工真实评价",
    "建议在接受 offer 前进行背景调查"
  ],
  "risks": [
    "本次分析仅基于历史知识库，不代表公司当前状况"
  ],
  "next_actions": [
    "天眼查: https://www.tianyancha.com",
    "脉脉职言: https://maimai.cn",
    "中国执行信息公开网: http://zxgk.court.gov.cn"
  ],
  "follow_up_questions": [
    "公司规模大概多少人？",
    "是上市公司还是私营企业？"
  ],
  "cannot_determine": [
    "当前裁员风险",
    "近期财务状况",
    "文化评价"
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
    "data_age_warning": "以下信息来自历史知识库，可能不反映公司近期状况，建议自行查询最新资讯"
  }
}
```

## 说明

- 无实时数据时 overall_risk 必须为 unknown，不得推断
- data_age_warning 必须填写，明确标注数据局限
- next_actions 引导用户使用可靠的自查工具
