# 示例：口碑来源对公司文化描述存在矛盾

## 输入

```json
{
  "company_name": "快手",
  "job_title": "算法工程师"
}
```

## 场景说明

部分看准评价说「快手工作生活平衡好，不强制加班」，另一部分说「算法部门996普遍」，矛盾明显。

## 输出（节选）

```json
{
  "skill_name": "company-interview-playbook",
  "skill_version": "1.0.0",
  "confidence": "medium",
  "summary": "快手面试攻略，整体数据丰富，但工作强度方面口碑存在明显矛盾（算法部门与其他部门差异大）。以下信息均注明置信度，请关注 cannot_determine 中的矛盾项。",
  "company_profile": {
    "company_name": "快手",
    "stage": "上市成熟期（港股）",
    "culture_keywords": ["普惠科技", "算法驱动", "实用主义", "快手铁桶"],
    "hiring_volume": "2025-2026年算法岗保持招聘，但HC收紧",
    "reputation_summary": "薪资竞争力强，工作强度因部门差异大（口碑来源描述矛盾，算法部门强度可能高于平均）",
    "common_pain_points": [
      "部分部门加班文化存在（算法/增长方向争议较大）",
      "快速迭代压力大，需求变更频繁"
    ]
  },
  "culture_fit_tips": [
    {
      "tip": "快手更重视算法效果和实际业务价值，而非学术背景",
      "example_answer_pattern": "「我在推荐算法上的改进最终带来了XXX业务指标提升，具体是...」",
      "anti_pattern": "过度强调论文发表数量而缺乏工程落地经验的讲述"
    }
  ],
  "common_pitfalls": [
    {
      "pitfall": "面试时询问工作强度，得到含糊回答后接受offer",
      "consequence": "实际加班情况可能与面试时描述不符，特别是算法核心团队",
      "avoidance_strategy": "直接问「这个团队平均几点下班」，并通过脉脉联系在职员工核实"
    }
  ],
  "salary_negotiation_notes": {
    "salary_range_estimate": "算法工程师（3-5年）：30-55k/月 × 14-15薪（2025年数据）",
    "negotiation_timing": "HR面后，拿到书面offer时再进行最终谈判",
    "leverage_points": ["推荐算法/搜索/广告算法专项经验", "竞争offer"],
    "taboos": ["在技术面提薪资期望，显得本末倒置"]
  },
  "evidence_used": [
    { "source": "看准网快手评价", "time_range": "2025-2026", "count": 89 },
    { "source": "脉脉讨论", "time_range": "2025-2026", "count": 45 }
  ],
  "recommendations": ["面试前务必通过脉脉了解具体部门的工作强度，这是决策的重要变量"],
  "risks": [
    "工作强度数据存在矛盾，本攻略无法给出确定性描述",
    "快手算法部门和商业化部门文化差异大，本攻略为通用版"
  ],
  "next_actions": ["脉脉搜索「快手 算法工程师」，联系在职员工了解实际工作强度"],
  "follow_up_questions": ["你面的是哪个算法方向？推荐/搜索/广告/视频？各方向强度不同"],
  "cannot_determine": [
    "算法部门实际加班强度（来源矛盾，无法给出确定结论）",
    "2026年快手算法HC具体数量"
  ]
}
```

## 说明

- `confidence: medium` 因为关键信息（工作强度）存在矛盾
- `cannot_determine` 明确标注矛盾无法确定的项目
- 不因矛盾就回避输出，仍给出有价值的建议
