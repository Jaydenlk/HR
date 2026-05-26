# 示例：低证据质量 — 纯口述来源

## 场景描述

用户说"我朋友告诉我，阿里云 2025 年给应届生的薪资是 25k"，没有提供任何 URL 或文档。

---

## 输入

```json
{
  "sources": [
    {
      "source_id": "src-verbal-01",
      "source_type": "verbal",
      "content": "阿里云 2025 年应届后端工程师薪资 25k，来自朋友口述",
      "platform": null,
      "date": null,
      "claim_type": "salary"
    }
  ]
}
```

---

## 预期输出

```json
{
  "confidence": "low",
  "audit_results": [
    {
      "source_id": "src-verbal-01",
      "grade": "C",
      "freshness": "unknown",
      "verification_status": "unverifiable",
      "issues": [
        "口述信息，无法独立验证",
        "无发布日期，时效性无法判断",
        "薪资数据为间接传递（朋友口述），存在失真风险"
      ],
      "recommendation": "use_with_caution"
    }
  ],
  "overall_confidence_ceiling": "low",
  "conflict_detected": false,
  "usable_source_count": 0,
  "summary": "仅有 1 条口述来源，无法独立验证，且缺少日期信息。B+ 级来源数量为 0，整体置信度上限为 low。建议补充可验证的官方或权威来源（如官网 JD、招聘平台）。"
}
```

---

## 关键验证点

1. source_type=verbal → verification_status 必须为 "unverifiable"，不能为 "verified"
2. 无日期 → freshness 必须为 "unknown"
3. usable_source_count = 0（无 B+ 来源）
4. overall_confidence_ceiling = "low"（B+ 来源 < 2）
5. issues 中必须包含"口述信息，无法独立验证"
6. 不因为内容"听起来合理"就提升等级 — 等级基于可验证性，不基于内容合理性
