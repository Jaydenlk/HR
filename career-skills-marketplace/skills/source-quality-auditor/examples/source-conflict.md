# 示例：来源冲突 — 牛客与小红书数据矛盾

## 场景描述

两条来源对同一岗位的薪资给出明显不同的数据：
牛客帖子称某大厂给 35k，小红书帖子称该大厂给 20k。

---

## 输入

```json
{
  "sources": [
    {
      "source_id": "src-nc-01",
      "source_type": "url",
      "source_url": "https://www.nowcoder.com/discuss/87654321",
      "content": "拼多多 2024 春招后端工程师 offer，35k*16，北京",
      "platform": "nowcoder",
      "date": "2024-04-20",
      "claim_type": "salary"
    },
    {
      "source_id": "src-xhs-01",
      "source_type": "url",
      "source_url": "https://www.xiaohongshu.com/explore/note111222",
      "content": "拼多多后端真实薪资曝光！其实就 20k 左右，大家别被牛客骗了",
      "platform": "xhs",
      "date": "2024-05-10",
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
      "source_id": "src-nc-01",
      "grade": "C",
      "freshness": "fresh",
      "verification_status": "verified",
      "issues": [
        "牛客薪资数据为候选人自报，存在夸大可能",
        "与 src-xhs-01 存在数据冲突（35k vs 20k）"
      ],
      "recommendation": "use_with_caution",
      "conflict": true,
      "conflict_detail": "src-nc-01 称薪资 35k，src-xhs-01 称薪资 20k，两条来源给出不同数值，审计员不裁决哪条正确"
    },
    {
      "source_id": "src-xhs-01",
      "grade": "C",
      "freshness": "fresh",
      "verification_status": "verified",
      "issues": [
        "小红书来源不计入薪资事实，仅作用户声音参考",
        "内容含主观断言（'别被骗了'），情绪化表述影响客观性",
        "与 src-nc-01 存在数据冲突（20k vs 35k）"
      ],
      "recommendation": "use_with_caution",
      "conflict": true,
      "conflict_detail": "src-xhs-01 称薪资 20k，src-nc-01 称薪资 35k，两条来源给出不同数值，审计员不裁决哪条正确"
    }
  ],
  "overall_confidence_ceiling": "medium",
  "conflict_detected": true,
  "usable_source_count": 0,
  "summary": "检测到来源冲突：牛客来源称薪资 35k（候选人自报），小红书来源称薪资 20k（用户声音）。两条来源均为 C 级，且均不能作为薪资事实的可靠依据。审计员列出所有版本，不裁决哪条正确。建议寻找 A/B 级来源（如官网 JD 或 Boss直聘）进行核实。"
}
```

---

## 关键验证点

1. 两条冲突来源都出现在 audit_results 中，各自标注 `conflict: true`
2. conflict_detail 说明冲突内容，不裁决哪条正确
3. overall 的 conflict_detected = true
4. 审计员**不**取平均值（不输出"约 27.5k"之类的综合数据）
5. 小红书来源仍然为 C 级，issues 中明确"不计入薪资事实"
6. usable_source_count = 0（两条均为 C 级）
7. summary 明确提示需要寻找更高质量来源
