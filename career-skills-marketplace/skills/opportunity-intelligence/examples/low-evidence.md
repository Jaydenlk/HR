# 示例：缺少用户画像 → 匹配维度降级

## 场景

用户只传入了 JD 文本，没有提供 user_profile 和 match_diagnosis，系统需要在缺少匹配数据的情况下给出评估。

## 输入

```json
{
  "jd_text": "职位：产品经理\n公司：某初创公司\n地点：上海\n职责：负责 B2B SaaS 产品的需求分析和功能规划\n要求：2年以上产品经验，有 B2B 产品背景优先\n薪资：面议"
}
```

## 输出

```json
{
  "skill_name": "opportunity-intelligence",
  "skill_version": "1.0.0",
  "summary": "数据不足，仅基于 JD 内容进行市场和风险维度评估，无法计算候选人匹配分。综合评分仅反映机会本身质量，不代表个人适配度。",
  "confidence": "low",
  "evidence_used": [
    { "source": "jd_text", "content": "初创公司 B2B SaaS 产品经理，薪资面议" }
  ],
  "recommendations": [
    "补充个人简历（user_profile）以获取完整匹配分析",
    "薪资面议通常意味着薪资空间较大，建议提前了解行业基准"
  ],
  "risks": [
    "薪资「面议」缺乏透明度，存在谈判不确定性",
    "初创公司风险较高，建议核实公司融资轮次"
  ],
  "next_actions": [
    "提供个人简历以获取完整评估",
    "通过天眼查核实公司注册信息和融资状态"
  ],
  "follow_up_questions": [
    "你有几年产品经理经验？",
    "是否有 B2B 或 SaaS 产品相关背景？",
    "你对初创公司风险的接受度如何？"
  ],
  "cannot_determine": [
    "候选人匹配分（缺少 user_profile）",
    "薪资竞争力（面议，无参考数据）",
    "来源可信度（未提供 source_quality）"
  ],
  "opportunity_score": null,
  "match_assessment": {
    "score": null,
    "strengths": [],
    "gaps": []
  },
  "market_positioning": {
    "salary_competitiveness": "unknown",
    "company_tier": "startup",
    "growth_potential": "unknown"
  },
  "risk_flags": [
    {
      "flag": "薪资面议",
      "severity": "notice",
      "evidence": "JD 薪资字段为「面议」，无法评估市场竞争力"
    }
  ],
  "recommendation": "need_more_info"
}
```

## 说明

- `opportunity_score` 为 null：因 user_profile 缺失，无法计算匹配维度分，综合分无意义
- `match_assessment.score` 为 null：明确标注而非猜测
- `cannot_determine` 明确列出所有无法评估的维度
- `confidence: low`：仅有原始 JD 文本，缺少结构化数据
