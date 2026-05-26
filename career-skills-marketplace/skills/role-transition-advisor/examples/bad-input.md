# 示例：无技术背景转高级架构师，not_feasible

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "赵磊",
      "education": { "school": "某普通本科", "major": "英语", "degree": "本科" },
      "years_of_experience": 2,
      "current_role": { "value": "商务助理" }
    },
    "skills": {
      "technical": [],
      "soft": [{ "name": "沟通能力", "evidence_source": "工作描述" }]
    },
    "experience": [
      { "company": "某贸易公司", "role": "商务助理", "duration": "2024.01-至今" }
    ],
    "career_intent": { "target_roles": ["高级架构师"], "urgency": "active" }
  },
  "target_role": "高级架构师"
}
```

## 输出

```json
{
  "skill_name": "role-transition-advisor",
  "skill_version": "1.0.0",
  "summary": "英语专业商务助理（2年）转高级架构师，当前条件下不可行。高级架构师通常需要8-10年以上技术实战经验，而 profile 中无任何技术基础。如有转型意愿，应从零基础编程学习开始，而非直接瞄准高级职位。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.skills.technical", "value": "空数组", "relevance": "高级架构师要求10年以上的技术积累，无任何技术基础是根本障碍" },
    { "field": "profile.basic.years_of_experience", "value": "2年", "relevance": "即使从今天开始学习，达到高级架构师水平通常需要10-15年" },
    { "field": "profile.basic.education.major", "value": "英语", "relevance": "非工科背景需要额外时间补充计算机基础知识" }
  ],
  "recommendations": [
    "将目标调整为「初级开发工程师」（前端/后端/测试），这是从非技术背景切入技术领域的合理起点",
    "若坚持技术方向，预期需要1-2年学习+实习，才能获得入门岗位",
    "考虑是否有商务+技术的复合型方向：如技术销售、解决方案架构师（需要一定技术基础）"
  ],
  "risks": [
    "目标角色（高级架构师）与当前背景（商务助理，0技术经验）之间的差距无法在合理时间内弥补",
    "urgency=active 表明急于转型，但此类根本性转型需要3-5年的耐心"
  ],
  "next_actions": [
    "重新评估职业目标：是否真的想成为技术人员，还是只是认为技术薪资高？",
    "如果确定走技术路线，先报名参加3-6个月的编程训练营（前端/Python），以入门水平为目标"
  ],
  "follow_up_questions": [
    "你为什么想成为架构师？是对技术本身感兴趣，还是因为薪资/职位名称？",
    "你有没有自学过任何编程语言？哪怕写过几行代码？"
  ],
  "cannot_determine": [],
  "feasibility": "not_feasible",
  "feasibility_rationale": "profile.skills.technical 为空数组（无任何技术基础）+ profile.basic.years_of_experience=2年（无技术工作经历）+ profile.basic.education.major=英语（非工科背景）。高级架构师通常需要8-10年以上工程实践，三个关键维度均不满足，当前条件下不可行。",
  "skill_gap": [
    {
      "skill_name": "编程基础（任意语言）",
      "current_level": "profile.skills.technical 为空，无任何编程经验",
      "required_level": "精通至少2门语言，有复杂系统设计经验",
      "gap_severity": "critical",
      "remedy": "从零开始学习编程，预期3-6个月入门",
      "estimated_months": 6
    },
    {
      "skill_name": "系统设计能力",
      "current_level": "无",
      "required_level": "能设计高可用、高并发的分布式系统",
      "gap_severity": "critical",
      "remedy": "需要在真实工程项目中积累多年经验",
      "estimated_months": 120
    },
    {
      "skill_name": "工程实践经验",
      "current_level": "profile.experience 全部为商务岗位，无技术经验",
      "required_level": "10年以上工程师经验，主导过多个大型系统",
      "gap_severity": "critical",
      "remedy": "无捷径，只能从初级工程师开始积累",
      "estimated_months": 120
    }
  ],
  "typical_transition_path": [
    {
      "path_name": "从零学技术路径（长期）",
      "description": "报名训练营/自学编程 → 初级工程师 → 中级工程师 → 高级工程师 → 架构师",
      "duration": "10-15年",
      "success_rate_note": "路径本身可行，但需要极高的学习动力和时间投入，与「急于转型」的期望不符"
    }
  ],
  "success_factors": [
    { "factor": "计算机基础（数据结构/算法）", "user_status": "missing", "evidence": "profile.basic.education.major=英语，无计算机相关学习记录" },
    { "factor": "工程实践积累", "user_status": "missing", "evidence": "profile.experience 全部为非技术岗位" },
    { "factor": "技术领导力", "user_status": "missing", "evidence": "profile 中无任何技术团队经历" }
  ],
  "first_step": "在制定任何技术转型计划前，先花2周时间明确动机：是真的对技术感兴趣，还是只是追求薪资/职位名称。如果是后者，有很多不需要10年积累的高薪方向值得探索。"
}
```

## 说明

- not_feasible 有明确的 feasibility_rationale，全部引用 profile 字段
- 没有给出"只要努力就能实现"的鼓励性幻觉
- first_step 聚焦于澄清动机，而非直接给出学习路径
