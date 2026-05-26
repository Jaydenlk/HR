# 示例：双非本科 CS，GPA 3.6，考研 vs 直接工作校招

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "刘洋",
      "education": { "school": "某双非本科", "major": "计算机科学", "degree": "本科" },
      "years_of_experience": 0,
      "current_role": null
    },
    "skills": {
      "technical": [
        { "name": "Java", "proficiency": "used_in_project" },
        { "name": "Spring Boot", "proficiency": "mentioned" }
      ]
    },
    "experience": [],
    "career_intent": { "target_roles": ["后端开发工程师"], "urgency": "unknown" }
  },
  "gpa": 3.6,
  "gpa_percentile": 15,
  "target_school_tier": "985",
  "economic_pressure": "moderate",
  "has_internship": false
}
```

## 输出

```json
{
  "skill_name": "graduate-school-vs-job-advisor",
  "skill_version": "1.0.0",
  "summary": "双非CS本科，GPA 3.6（前15%），目标后端开发，经济压力中等，无实习。考研985有可行性但竞争激烈；直接校招在双非背景下大厂概率低；建议考研同时积极找实习，根据结果灵活调整。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.basic.education.school", "value": "双非本科", "relevance": "大厂校招在双非背景下通过率显著低于985/211" },
    { "field": "gpa_percentile", "value": "15%", "relevance": "前15%属于较好水平，有考研985实力" },
    { "field": "economic_pressure", "value": "moderate", "relevance": "中等经济压力下，读研3年机会成本是重要考量" },
    { "field": "has_internship", "value": "false", "relevance": "无实习经验，直接校招大厂竞争力不足" },
    { "field": "profile.career_intent.target_roles", "value": "后端开发工程师", "relevance": "后端开发学历影响相对小（vs 算法岗），985不是硬要求" }
  ],
  "recommendations": [
    "主策略：考研985（利用 GPA 前15% 优势，改变学历背景），同时在备考期间争取1段实习",
    "Plan B：若2025年校招有意外的好 offer（如中型互联网公司），可直接工作，考虑在职读专硕"
  ],
  "risks": [
    "考研985竞争激烈（2024年报考人数438万），即使 GPA 前15% 也无法保证上岸",
    "如果考研失败，会错过当年秋招窗口，需要次年参加社招（条件更苛刻）",
    "读研3年机会成本约 30-50万（以后端工程师平均薪资计算），中等经济压力下需认真权衡"
  ],
  "next_actions": [
    "立即联系目标985院校（如中南大学/电子科大/哈工大深圳）的招生办，了解专业课考试难度和历年录取分数线",
    "同时在暑假期间找1个Java后端实习，增强简历和校招竞争力（作为 Plan B）"
  ],
  "follow_up_questions": [
    "你对哪几所985有偏好？是否愿意去偏远城市的985（如西工大在陕西）？",
    "你的家庭是否能负担3年读研的学费（约3-8万）加上生活费？",
    "你有没有考虑过211院校？竞争相对小，性价比高"
  ],
  "cannot_determine": [
    "目标985院校的具体竞争情况（需要查询各院校实际录取分数线）"
  ],
  "analysis": [
    {
      "path_name": "考研985",
      "pros": [
        "改变学历标签：双非→985，简历通过率显著提升（大厂简历筛选对双非有隐性门槛）",
        "GPA 3.6（前15%）有足够竞争力冲击中档985院校",
        "后端开发方向，读研可以做有分量的项目/科研，增强竞争力"
      ],
      "cons": [
        "3年时间成本（22岁毕业→25岁才进入市场）",
        "经济成本：3年读研 + 放弃的3年工作薪资（后端初级约12-15k/月 × 36个月 ≈ 43-54万机会成本）",
        "考研成功率：985热门专业竞争激烈，即使 GPA 优秀也无保障"
      ],
      "feasibility_note": "gpa_percentile=15%：有考研985的实力，建议目标中档985（而非顶尖985如清华北大）",
      "opportunity_cost": "3年时间 + 约45-50万机会成本（按当地中型互联网公司初级后端薪资）"
    },
    {
      "path_name": "直接工作校招",
      "pros": [
        "应届生可参加秋招，有机会获得大厂 offer（虽然双非背景通过率低）",
        "尽早积累工作经验，不耽误职业发展时间",
        "避免考研失败的时间风险"
      ],
      "cons": [
        "双非本科背景：大厂简历筛选通过率低（估计约20-30%，vs 985的60-70%）",
        "无实习经历（has_internship=false）：校招竞争力不足",
        "可能只能进入中小公司，起点相对低"
      ],
      "feasibility_note": "has_internship=false + 双非背景：直接校招大厂难度较高，但中小互联网公司可行",
      "opportunity_cost": "放弃学历提升机会，后期晋升可能受到隐性影响"
    }
  ],
  "recommendation": "综合分析：建议以考研985为主策略（GPA前15%有实力，学历改变价值显著），同时在备考期间积极找实习（万一考研失败，有实习可以参加次年校招）。关键判断点：家庭是否能承受3年经济压力（中等压力评级需要进一步确认）。",
  "critical_factors": [
    {
      "factor": "双非本科学历对大厂校招的影响",
      "user_situation": "profile.basic.education.school=双非本科：大厂简历筛选有隐性门槛",
      "impact": "supports_grad_school"
    },
    {
      "factor": "GPA 和年级排名",
      "user_situation": "gpa=3.6, gpa_percentile=15%：有考研985的竞争力",
      "impact": "supports_grad_school"
    },
    {
      "factor": "目标职位学历硬要求",
      "user_situation": "profile.career_intent.target_roles=[后端开发]：后端开发学历非硬要求（vs 算法岗），985不是必须",
      "impact": "supports_work"
    },
    {
      "factor": "经济压力",
      "user_situation": "economic_pressure=moderate：中等压力，3年机会成本约45万是重要考量",
      "impact": "neutral"
    },
    {
      "factor": "无实习经历",
      "user_situation": "has_internship=false：降低直接校招竞争力",
      "impact": "supports_grad_school"
    }
  ]
}
```
