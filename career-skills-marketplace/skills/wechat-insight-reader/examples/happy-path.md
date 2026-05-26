# 示例：成功提取公众号洞察

## 输入

```json
{
  "topic": "产品经理职业规划",
  "industry": "互联网"
}
```

## 输出

```json
{
  "skill_name": "wechat-insight-reader",
  "skill_version": "1.0.0",
  "summary": "从 3 个知名产品类公众号提取到 5 篇职业规划相关文章，核心观点聚焦于 T 型人才、数据驱动思维和业务理解能力。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "人人都是产品经理", "grade": "B", "date": "2026-04-20" },
    { "source": "产品壹佰", "grade": "B", "date": "2026-04-15" }
  ],
  "recommendations": [
    "多篇文章强调「业务理解 > 工具掌握」，建议优先培养行业 sense",
    "T 型能力模型（横向宽 + 纵向深）是当前主流认知，建议参考规划"
  ],
  "risks": [
    "公众号观点代表特定立场，建议多元阅读不同视角"
  ],
  "next_actions": [
    "关注「人人都是产品经理」公众号获取持续内容",
    "对照 T 型能力模型评估自己的薄弱项"
  ],
  "follow_up_questions": [
    "您目前工作年限和专注方向是什么？"
  ],
  "cannot_determine": [],
  "insights": [
    {
      "title": "产品经理的 T 型能力模型：如何在专业化和全面性之间取得平衡",
      "source_account": "人人都是产品经理",
      "date": "2026-04-20",
      "key_points": [
        "横向能力：了解设计、运营、开发的基础语言",
        "纵向能力：在 1-2 个领域形成深度认知（如增长/B端）",
        "业务 sense 是产品经理最难被替代的核心能力"
      ],
      "methodology": "T 型能力模型",
      "credibility_grade": "B",
      "url": "https://www.woshipm.com/pmd/6046789.html"
    }
  ]
}
```
