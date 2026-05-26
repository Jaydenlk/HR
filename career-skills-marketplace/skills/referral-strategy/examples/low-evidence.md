# 示例：无人脉数据 → 仅输出冷接触建议和空缺

## 场景

用户有目标公司（字节跳动、美团），但没有任何已知人脉信息。

## 输入

```json
{
  "target_companies": ["字节跳动", "美团"],
  "user_profile": {
    "years_of_experience": 2,
    "skills": ["Python", "数据分析"],
    "education": "本科，统计学，985院校，2022届"
  }
}
```

## 输出

```json
{
  "skill_name": "referral-strategy",
  "skill_version": "1.0.0",
  "summary": "未提供人脉数据，无法分析直接内推路径。基于985院校背景，有机会通过校友网络找到字节和美团的内推人。已给出针对两个公司的冷接触策略。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "user_profile", "content": "985院校，统计学，2022届，2年经验" }
  ],
  "recommendations": [
    "985院校校友资源是最有价值的突破口，优先在脉脉上搜索在字节/美团工作的校友",
    "数据分析背景在字节和美团都有需求，可以用专业匹配度吸引校友关注"
  ],
  "risks": [
    "无直接人脉意味着只能走冷接触，转化率约5-15%，需要增加接触数量"
  ],
  "next_actions": [
    "在脉脉上使用「同校」筛选，找字节跳动和美团的校友（优先同届）",
    "在LinkedIn上搜索目标公司+自己学校的员工",
    "联系学院就业办或校友会，询问是否有在目标公司的校友推荐"
  ],
  "follow_up_questions": [
    "你有没有前同事或实习时的同事在这两家公司？",
    "你的同学中是否有在互联网大厂工作的？"
  ],
  "cannot_determine": [
    "直接内推路径（无人脉数据）",
    "间接内推路径（无人脉数据）"
  ],
  "referral_paths": [],
  "cold_outreach_targets": [
    {
      "target_company": "字节跳动",
      "target_profile_type": "同校校友（985院校，计算机/数据相关专业）",
      "platform": "脉脉",
      "approach": "在脉脉「同校」标签下搜索在字节的校友，优先联系2020-2023届（年龄相近，关系更亲近）"
    },
    {
      "target_company": "美团",
      "target_profile_type": "同校校友（985院校，数据/运营/算法方向）",
      "platform": "脉脉",
      "approach": "同上，美团数据分析团队活跃，重点找数据相关方向的校友"
    }
  ],
  "network_gaps": [
    {
      "target_company": "字节跳动",
      "gap_description": "无直接或间接人脉，需要从零建立联系",
      "fill_strategy": [
        "脉脉校友搜索（优先同届）",
        "字节开源技术社区参与（GitHub/官方技术博客评论）",
        "技术大会现场建立联系（字节通常赞助GDG/DEF CON等）"
      ]
    },
    {
      "target_company": "美团",
      "gap_description": "无直接或间接人脉，需要从零建立联系",
      "fill_strategy": [
        "脉脉校友搜索",
        "美团技术团队公众号/技术博客留言互动",
        "数据分析相关技术社区（CSDN/掘金）与美团工程师互动"
      ]
    }
  ]
}
```

## 说明

- `referral_paths` 为空：无人脉数据，不虚构路径
- `network_gaps` 为两个目标公司各提供了具体填补策略
- 基于985校友背景给出具有针对性的冷接触建议
