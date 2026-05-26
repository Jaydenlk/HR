# 示例：无效 URL — 不可达来源

## 场景描述

调用方提供了两条 URL 来源，但第一条 URL 已 404，第二条域名无法解析。

---

## 输入

```json
{
  "sources": [
    {
      "source_id": "src-dead-01",
      "source_type": "url",
      "source_url": "https://jobs.meituan.com/position/99999999",
      "content": "美团后端工程师北京 2024，薪资 28k-50k",
      "platform": "official_website",
      "date": "2024-01-15",
      "claim_type": "salary"
    },
    {
      "source_id": "src-dead-02",
      "source_type": "url",
      "source_url": "https://fake-hr-site-xyz123.com/salary-report",
      "content": "2024 年互联网大厂薪资报告，后端工程师平均 35k",
      "platform": null,
      "date": "2024-06-01",
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
      "source_id": "src-dead-01",
      "grade": "D",
      "freshness": "stale",
      "verification_status": "unreachable",
      "issues": [
        "URL 不可达（404 或已下线），无法验证内容",
        "等级因 URL 不可达降至 D"
      ],
      "recommendation": "discard"
    },
    {
      "source_id": "src-dead-02",
      "grade": "D",
      "freshness": "stale",
      "verification_status": "unreachable",
      "issues": [
        "URL 不可达（DNS 解析失败），域名不存在",
        "来源平台未知，无法评估可信度",
        "等级因 URL 不可达降至 D"
      ],
      "recommendation": "discard"
    }
  ],
  "overall_confidence_ceiling": "low",
  "conflict_detected": false,
  "usable_source_count": 0,
  "summary": "两条来源 URL 均无法访问。根据审计规则，URL 不可达的来源等级强制降至 D 并丢弃。当前无任何可用来源，无法支撑薪资相关声明。建议提供可访问的原始链接或替代来源。"
}
```

---

## 关键验证点

1. 所有 URL 不可达的来源 → grade 必须为 D，verification_status 必须为 "unreachable"
2. grade=D 的来源 → recommendation 必须为 "discard"
3. 绝对不能因为内容"描述合理"就给 "verified" 状态 — 这是防幻觉的核心约束
4. usable_source_count = 0
5. overall_confidence_ceiling = "low"
6. summary 明确说明无可用来源
