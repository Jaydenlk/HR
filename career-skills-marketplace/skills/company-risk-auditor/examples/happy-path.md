# 示例：有实时数据的公司风险审计

## 输入

```json
{
  "company": "某互联网公司（化名）",
  "role": "产品经理",
  "focus_areas": ["layoff_risk", "culture"]
}
```

## 输出

```json
{
  "skill_name": "company-risk-auditor",
  "skill_version": "1.0.0",
  "summary": "该公司在过去 12 个月内有一次规模约 15% 的裁员记录，来自可信媒体报道。文化信号以中性为主，有加班文化传言但无法律纠纷记录。整体风险评估为 medium。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "36氪报道 2026-02", "grade": "B" },
    { "source": "脉脉职言", "grade": "B" }
  ],
  "recommendations": [
    "建议在面试时主动询问团队规模变化情况",
    "重点了解产品线的商业模式是否稳定"
  ],
  "risks": [
    "2026年2月有规模裁员记录，约 15%，来自 36氪报道",
    "脉脉职言有「晋升困难」信号，出现频次较高"
  ],
  "next_actions": [
    "在脉脉搜索该公司最新职言，了解近期状况",
    "在天眼查确认是否有劳动争议记录"
  ],
  "follow_up_questions": [
    "您目标部门是哪个业务线？",
    "该 offer 是否有试用期保护条款？"
  ],
  "cannot_determine": [
    "具体业务线的稳定性（需要进一步内部信息）"
  ],
  "risk_profile": {
    "overall_risk": "medium",
    "layoff_history": {
      "has_significant_layoffs": true,
      "last_layoff_date": "2026-02",
      "estimated_scale": "约 15%（来自 36氪报道）",
      "sources": ["36氪: https://36kr.com/xxx 2026-02-15"]
    },
    "culture_signals": [
      {
        "signal": "工作氛围较为紧张，绩效考核严格",
        "type": "negative",
        "source": "脉脉职言 2026-04"
      },
      {
        "signal": "技术团队氛围评价相对较好",
        "type": "positive",
        "source": "脉脉职言 2026-03"
      }
    ],
    "known_issues": [
      {
        "issue": "2026年2月规模裁员约 15%",
        "severity": "high",
        "source": "36氪",
        "date": "2026-02-15"
      }
    ],
    "financial_signals": [
      {
        "signal": "上一轮融资在 2024 年，暂无新融资消息",
        "type": "negative"
      }
    ]
  }
}
```
