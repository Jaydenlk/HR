# 示例：多来源审计 — 混合等级

## 场景描述

用户询问"北京互联网大厂后端工程师 2024 年的薪资水平"。
调用方提供了 3 条来源：一条企业官网 JD、一条牛客面经帖、一条小红书帖子。

---

## 输入

```json
{
  "sources": [
    {
      "source_id": "src-001",
      "source_type": "url",
      "source_url": "https://careers.bytedance.com/position/7287654321",
      "content": "字节跳动后端开发工程师（北京），薪资区间：30k-60k，JD 发布于 2024-03-10",
      "platform": "official_website",
      "date": "2024-03-10",
      "claim_type": "salary"
    },
    {
      "source_id": "src-002",
      "source_type": "url",
      "source_url": "https://www.nowcoder.com/discuss/12345678",
      "content": "字节跳动 2024 春招后端面经，三轮技术面 + 一轮 HR，算法题为 LeetCode 中等，最终 offer 35k*16",
      "platform": "nowcoder",
      "date": "2024-04-05",
      "claim_type": "interview_experience"
    },
    {
      "source_id": "src-003",
      "source_type": "url",
      "source_url": "https://www.xiaohongshu.com/explore/note987654",
      "content": "字节后端薪资超高！我朋友拿了 40k，大家也可以冲！",
      "platform": "xhs",
      "date": "2024-02-20",
      "claim_type": "salary"
    }
  ]
}
```

---

## 预期输出

```json
{
  "confidence": "medium",
  "audit_results": [
    {
      "source_id": "src-001",
      "grade": "A",
      "freshness": "fresh",
      "verification_status": "verified",
      "issues": [],
      "recommendation": "use"
    },
    {
      "source_id": "src-002",
      "grade": "B",
      "freshness": "fresh",
      "verification_status": "verified",
      "issues": ["牛客薪资数据为候选人自报，存在夸大可能，仅作参考"],
      "recommendation": "use_with_caution"
    },
    {
      "source_id": "src-003",
      "grade": "C",
      "freshness": "fresh",
      "verification_status": "unverifiable",
      "issues": [
        "小红书来源不计入薪资事实，仅作用户声音参考",
        "内容为间接转述（'我朋友'），非亲历",
        "小红书 URL 无法通过 API 验证内容真实性"
      ],
      "recommendation": "use_with_caution"
    }
  ],
  "overall_confidence_ceiling": "medium",
  "conflict_detected": false,
  "usable_source_count": 2,
  "summary": "共 3 条来源：1 条 A 级（官网 JD），1 条 B 级（牛客面经），1 条 C 级（小红书）。官网 JD 提供了官方薪资区间，可直接引用。小红书来源仅作用户声音，不计入薪资事实。整体置信度为 medium（B+ 来源数量满足要求，但薪资数据主要依赖招聘方报价）。"
}
```

---

## 关键验证点

1. 官网 JD → 正确识别为 A 级，recommendation 为 use
2. 牛客面经 → 识别为 B 级技术面经，issues 中注明薪资自报风险
3. 小红书 → 等级 C，issues 中明确标注"不计入薪资事实"
4. 无冲突检测（三条来源薪资区间大体一致）
5. usable_source_count = 2（src-001 + src-002 为 B+ 级）
6. 置信度上限 medium（满足 B+ ≥ 2 条件，但 overall 评估为 medium 因薪资来源均有局限）
