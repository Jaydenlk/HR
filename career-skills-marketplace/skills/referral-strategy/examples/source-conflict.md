# 示例：联系人信息相互矛盾（同一人在两家公司）→ 标注冲突

## 场景

用户提供的人脉列表中，同一个人（李明）同时被标注在「字节跳动」和「美团」，可能是数据录入错误。

## 输入

```json
{
  "target_companies": ["字节跳动", "美团"],
  "user_profile": {
    "years_of_experience": 3,
    "skills": ["Java", "MySQL"]
  },
  "network_contacts": [
    { "name": "李明", "company": "字节跳动", "title": "工程师", "relationship": "alumni" },
    { "name": "李明", "company": "美团", "title": "高级工程师", "relationship": "alumni" }
  ]
}
```

## 输出

```json
{
  "skill_name": "referral-strategy",
  "skill_version": "1.0.0",
  "summary": "发现「李明」同时被标注在字节跳动和美团，可能是同名不同人，或数据录入错误。已标注冲突，请确认后重新提交。当前基于「可能是两个不同李明」给出分析，但置信度降级。",
  "confidence": "low",
  "evidence_used": [
    { "source": "network_contacts", "content": "李明出现两次，分别在字节跳动和美团，职级不同" }
  ],
  "recommendations": [
    "确认「字节字节的李明」和「美团的李明」是否为同一个人",
    "如果是同一人，确认他目前在哪家公司（人最近的公司）"
  ],
  "risks": [
    "数据冲突导致分析结果可信度降低",
    "如果是同一个李明，内推只能走其当前公司"
  ],
  "next_actions": [
    "核实「李明」的实际情况后重新提交",
    "在等待核实期间，可以通过脉脉搜索「李明」确认其当前雇主"
  ],
  "follow_up_questions": [
    "字节的李明和美团的李明是同一个人吗？",
    "如果是同一个人，他最近在哪家公司工作？"
  ],
  "cannot_determine": [
    "李明的实际当前雇主（数据冲突）",
    "哪条内推路径有效（取决于李明当前公司）"
  ],
  "referral_paths": [
    {
      "target_company": "字节跳动（待确认）",
      "contact_description": "李明（校友），标注为字节跳动工程师——数据待核实",
      "path_type": "direct",
      "estimated_success_rate": "待核实",
      "priority": 1,
      "relationship_strength": "moderate",
      "suggested_action": "先核实李明当前公司，确认后再联系"
    },
    {
      "target_company": "美团（待确认）",
      "contact_description": "李明（校友），标注为美团高级工程师——数据待核实",
      "path_type": "direct",
      "estimated_success_rate": "待核实",
      "priority": 2,
      "relationship_strength": "moderate",
      "suggested_action": "先核实李明当前公司，确认后再联系"
    }
  ],
  "cold_outreach_targets": [],
  "network_gaps": []
}
```

## 说明

- 数据冲突被明确标注，不自行判断哪条正确
- `confidence: low`：数据可信度受影响
- 路径依然输出但标注「待核实」
