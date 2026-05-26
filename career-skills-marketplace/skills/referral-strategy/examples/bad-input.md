# 示例：缺少目标公司 → insufficient

## 场景

用户只提供了人脉数据，但没有告知目标公司。

## 输入

```json
{
  "user_profile": {
    "years_of_experience": 3,
    "skills": ["Java"]
  },
  "network_contacts": [
    { "company": "字节跳动", "relationship": "alumni" }
  ]
}
```

## 输出

```json
{
  "skill_name": "referral-strategy",
  "skill_version": "1.0.0",
  "summary": "缺少目标公司列表，无法分析内推路径。请提供你希望内推的目标公司（至少一个）。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请提供目标公司名称，重新发起分析"
  ],
  "risks": [],
  "next_actions": [
    "使用 application-strategist 制定目标公司分层，然后将目标公司传入 referral-strategy"
  ],
  "follow_up_questions": [
    "你希望在哪些公司找内推人？"
  ],
  "cannot_determine": [
    "内推路径（缺少目标公司）"
  ],
  "referral_paths": [],
  "cold_outreach_targets": [],
  "network_gaps": []
}
```

## 说明

- 即使有人脉数据，缺少目标公司时也无法输出路径分析
- `confidence: insufficient`：必须字段缺失
