# 示例：腾讯产品经理面试攻略手册

## 输入

```json
{
  "company_name": "腾讯",
  "job_title": "产品经理"
}
```

## 输出

```json
{
  "skill_name": "company-interview-playbook",
  "skill_version": "1.0.0",
  "confidence": "high",
  "summary": "腾讯产品经理面试攻略手册，基于2025-2026年多维度数据（看准/脉脉/牛客面经）综合整理。腾讯面试重技术理解和产品深度，比阿里更强调个人能力，面试风格相对直接。",
  "company_profile": {
    "company_name": "腾讯",
    "stage": "上市成熟期（港股/纳斯达克）",
    "culture_keywords": ["赛马机制", "用户为本", "技术驱动", "结果导向", "微创新"],
    "hiring_volume": "2026年社招收缩，校招稳定，中高级岗位竞争激烈",
    "reputation_summary": "薪资市场顶级，工作强度因BU差异大（微信系压力高，看准评分中等；部分BU相对平衡），晋升规范化但竞争激烈",
    "common_pain_points": [
      "跨BU协作难，各产品线独立运营",
      "微信等核心BU加班强度高（996非官方但存在）",
      "晋升周期较长，需要内部认可"
    ]
  },
  "interview_process": [
    {
      "stage": "笔试（校招）/ 简历筛选（社招）",
      "description": "校招有产品思维笔试；社招简历筛选严格，通过率约20-30%",
      "format": "online",
      "typical_duration": "校招90分钟笔试；社招2-5个工作日出简历结果",
      "key_assessment_angle": "基础产品能力、逻辑思维、对腾讯产品的了解",
      "pass_rate_estimate": "社招简历通过率约20-30%"
    },
    {
      "stage": "产品面1（专业面）",
      "description": "产品设计题+项目深挖，通常有腾讯自家产品相关场景题",
      "format": "online",
      "typical_duration": "60-90分钟",
      "key_assessment_angle": "产品设计能力、数据分析思维、对竞品的了解",
      "pass_rate_estimate": "约50-60%"
    },
    {
      "stage": "产品面2（主管面）",
      "description": "职业规划+深度产品讨论，主管会考察候选人的产品价值观",
      "format": "offline",
      "typical_duration": "60分钟",
      "key_assessment_angle": "产品视野、学习能力、是否和团队风格匹配",
      "pass_rate_estimate": "约60-70%（到达这轮说明已筛选较多）"
    },
    {
      "stage": "HR面",
      "description": "文化契合+薪资期望+背景确认",
      "format": "phone",
      "typical_duration": "30-45分钟",
      "key_assessment_angle": "职业清晰度、离职原因、团队协作意愿",
      "pass_rate_estimate": "约80-90%（到达此轮基本接近录用）"
    }
  ],
  "culture_fit_tips": [
    {
      "tip": "展示你对腾讯产品的真实使用洞察，而非泛化赞美",
      "example_answer_pattern": "「我用微信小游戏约3年，观察到XX功能的留存逻辑很有意思，具体体现在...我认为可以进一步优化的方向是...」",
      "anti_pattern": "「腾讯的产品很棒，用户体验设计行业第一」——空洞赞美无价值"
    },
    {
      "tip": "腾讯赛马文化：强调个人贡献和结果，而非团队光环",
      "example_answer_pattern": "「在这个项目中，我具体负责了XXX，我的决策是...最终结果是...」",
      "anti_pattern": "「我们团队合作完成了...」——始终用「我们」而不区分个人贡献"
    },
    {
      "tip": "展示数据驱动思维，每个产品判断都有数据依据",
      "example_answer_pattern": "「我做这个决策时，参考了DAU趋势、用户留存率和NPS数据，发现...」",
      "anti_pattern": "「我直觉觉得这个功能用户会喜欢」——纯直觉无数据支撑"
    }
  ],
  "common_pitfalls": [
    {
      "pitfall": "产品设计题给出过于「教科书式」的完美方案",
      "consequence": "面试官会追问落地难点，若无实际经验则露馅",
      "avoidance_strategy": "主动说明自己的方案的局限性和取舍，展示真实的工程思维"
    },
    {
      "pitfall": "回答「为什么选腾讯」时说「行业地位」等泛化原因",
      "consequence": "HR会觉得你对腾讯了解不深，特别是未明确说想加入哪个BU",
      "avoidance_strategy": "提前研究目标BU的具体产品线，说明「想加入XXX团队，因为我对XXX方向有深入的理解和想法」"
    },
    {
      "pitfall": "谈薪时第一轮就给出底线",
      "consequence": "HR掌握更多谈判筹码，实际offer可能低于市场水平",
      "avoidance_strategy": "询问岗位薪资范围后再给出期望，或给出「市场合理水平+20%」的目标区间"
    }
  ],
  "salary_negotiation_notes": {
    "salary_range_estimate": "社招产品经理P5-P6：35-60k/月 × 15-16薪（2025年市场数据，因BU和个人背景差异大）",
    "negotiation_timing": "HR面结束时，等待对方先问薪资期望，不要主动先开价",
    "leverage_points": [
      "竞争offer（另一家或现公司counter offer）",
      "特定业务方向的稀缺经验（如小程序生态/微信支付/国际化）",
      "量化成果（DAU增长、收入提升等具体数据）"
    ],
    "taboos": [
      "直接说「我在现公司月薪X万，所以期望XX」——锚定过低",
      "说「给多少都行」——显示无议价能力",
      "第一轮就说最低接受价"
    ]
  },
  "evidence_used": [
    { "source": "看准网腾讯评价", "time_range": "2025-2026", "count": 150 },
    { "source": "牛客面经", "time_range": "2025-2026", "count": 67 },
    { "source": "脉脉薪资数据", "time_range": "2025年", "count": 35, "audited_by": "source-quality-auditor", "auditor_grade": "B", "auditor_note": "脉脉数据有实名背书，满足四要素（年份/城市/岗位/来源），评为 B 级；salary_range_estimate 引用此数据源" }
  ],
  "recommendations": [
    "提前研究目标BU的核心产品（微信/QQ音乐/腾讯视频/游戏等），准备真实使用洞察",
    "准备2套产品设计框架：功能设计（用户-场景-痛点-方案）和增长设计（漏斗-瓶颈-策略）"
  ],
  "risks": [
    "薪资数据来自2025年，2026年市场可能有变化（特别是受科技股行情影响）",
    "腾讯内部BU差异大，本攻略为通用版，建议结合具体BU信息调整"
  ],
  "next_actions": [
    "确认目标BU后，进一步获取该BU的面试情报",
    "整理3个以数据为支撑的产品决策案例",
    "研究腾讯近6个月的战略动向（官网/财报/技术博客）"
  ],
  "follow_up_questions": [
    "你面的是哪个BU？不同BU风格差异较大",
    "你的岗位级别是P5还是P7？考察深度不同"
  ],
  "cannot_determine": [
    "特定BU的内部评分标准",
    "2026年上半年的具体招聘HC情况"
  ]
}
```
