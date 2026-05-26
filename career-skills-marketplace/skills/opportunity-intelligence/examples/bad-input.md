# 示例：无效输入 → 返回错误

## 场景

用户传入的不是 JD 数据，而是一段无关文本（新闻报道）。

## 输入

```json
{
  "jd_text": "今日科技股整体下跌，纳斯达克指数收跌2.3%，科技巨头普遍承压，分析师认为短期内市场仍将波动。"
}
```

## 输出

```json
{
  "skill_name": "opportunity-intelligence",
  "skill_version": "1.0.0",
  "summary": "输入内容不包含职位描述信息，无法进行机会评估。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请提供职位描述（JD）文本，包含职位名称、职责和任职要求"
  ],
  "risks": [],
  "next_actions": [
    "粘贴招聘平台上的完整 JD 文本，重新发起评估"
  ],
  "follow_up_questions": [
    "您想评估哪个职位？请提供该职位的招聘描述。"
  ],
  "cannot_determine": [
    "无法从输入中识别任何职位信息"
  ],
  "opportunity_score": null,
  "match_assessment": {
    "score": null,
    "strengths": [],
    "gaps": []
  },
  "market_positioning": {
    "salary_competitiveness": "unknown",
    "company_tier": "unknown",
    "growth_potential": "unknown"
  },
  "risk_flags": [],
  "recommendation": "need_more_info"
}
```

## 说明

- 输入为金融新闻，不含 JD 特征（无职位/职责/要求字段）
- `confidence: insufficient`，所有评分字段为 null
- 不尝试从非 JD 文本中提取任何信息
