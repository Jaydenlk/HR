# 示例：Go 后端工程师：北京 vs 杭州 vs 成都

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "张伟",
      "education": { "degree": "本科", "school": "复旦大学" },
      "years_of_experience": 5,
      "current_role": { "value": "技术专家" }
    },
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "Redis", "proficiency": "used_in_project" }
      ]
    },
    "experience": [
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今" }
    ],
    "constraints": { "location": ["北京", "上海", "杭州"], "salary_expectation": "30k+" }
  },
  "candidate_cities": ["北京", "杭州", "成都"],
  "candidate_industries": ["互联网", "电商", "金融科技"],
  "has_housing_requirement": true
}
```

## 输出

```json
{
  "skill_name": "city-industry-fit-advisor",
  "skill_version": "1.0.0",
  "summary": "Go 后端5年（美团，复旦本科），分析北京/杭州/成都 × 互联网/电商/金融科技。杭州互联网（阿里系）适配度最高（82分），理由：薪资可接受+阿里生态跳槽选项多+生活成本低于北京。有购房需求的情况下，北京分数受大幅拖累。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.skills.technical[Go=used_in_project]", "value": "Go熟练", "relevance": "阿里系（杭州）和字节（北京）都是Go主流，技术栈匹配" },
    { "field": "profile.experience[美团]", "value": "电商履约系统经验", "relevance": "与杭州电商/阿里电商业务高度相关" },
    { "field": "profile.constraints.salary_expectation", "value": "30k+", "relevance": "需要城市典型薪资能达到此水平" },
    { "field": "has_housing_requirement", "value": "true", "relevance": "北京房价显著拖低「生活成本可持续性」维度评分" }
  ],
  "recommendations": [
    "综合推荐杭州+互联网（电商）：技能匹配度高、阿里系生态丰富、生活成本合理、有购房可行性",
    "若想要更高薪资上限，北京+互联网仍是选项，但需要放弃短期购房需求",
    "成都不推荐（profile.constraints.location 不含成都，且薪资达到30k+较难）"
  ],
  "risks": [
    "北京+互联网：profile.constraints.salary_expectation=30k+ 可达，但有购房需求时购买力被严重稀释",
    "成都的平均后端薪资较难达到30k+门槛（除头部公司外）"
  ],
  "next_actions": [
    "在 BOSS直聘 搜索「杭州 Go 后端 5年」，验证实际薪资范围（30k+ 是否普遍）",
    "了解杭州余杭/西溪的租房价格，测算「薪资30k」条件下的实际储蓄能力"
  ],
  "follow_up_questions": [
    "你所说的购房需求是近3年内的计划，还是更长期的目标？这会影响城市权重",
    "你对杭州的阿里系文化（大小周、绩效文化）有了解并接受吗？"
  ],
  "cannot_determine": [
    "上海金融科技的适配度（profile.constraints.location 包含上海，但未列入 candidate_cities，请确认）"
  ],
  "fit_matrix": [
    {
      "city": "杭州",
      "industry": "互联网（电商）",
      "fit_score": 82,
      "fit_breakdown": {
        "skill_match": 85,
        "career_ceiling": 80,
        "cost_sustainability": 85,
        "constraint_satisfaction": 75
      },
      "evidence_basis": [
        "profile.skills.technical[Go=used_in_project]：阿里系以Go为主流后端语言",
        "profile.experience[美团].电商履约系统：与阿里电商业务场景高度相关",
        "has_housing_requirement=true：杭州余杭/西溪房价约3-4万/平，低于北京五环（约7-10万），购房压力相对可控",
        "profile.constraints.location 包含杭州"
      ]
    },
    {
      "city": "北京",
      "industry": "互联网",
      "fit_score": 71,
      "fit_breakdown": {
        "skill_match": 90,
        "career_ceiling": 95,
        "cost_sustainability": 45,
        "constraint_satisfaction": 55
      },
      "evidence_basis": [
        "profile.skills.technical[Go=used_in_project]：字节跳动等北京互联网公司大量使用Go",
        "profile.experience[字节跳动/美团]：大厂背景在北京互联网认可度最高",
        "has_housing_requirement=true+北京房价：五环内房价8-15万/平，30k月薪购房压力极大（cost_sustainability评分45）"
      ]
    },
    {
      "city": "成都",
      "industry": "互联网",
      "fit_score": 48,
      "fit_breakdown": {
        "skill_match": 60,
        "career_ceiling": 55,
        "cost_sustainability": 80,
        "constraint_satisfaction": 15
      },
      "evidence_basis": [
        "profile.constraints.location 不含成都（constraint_satisfaction=15）",
        "profile.constraints.salary_expectation=30k+：成都互联网普遍薪资15-25k，30k+岗位稀少",
        "生活成本低（cost_sustainability=80），但技能天花板受城市互联网生态规模限制"
      ]
    }
  ],
  "cost_of_living_impact": [
    {
      "city": "杭州",
      "typical_salary_range": "Go 后端5年，25-40k/月（阿里系 P7-P8 水平）",
      "housing_cost_note": "余杭/西溪租金约3000-5000元/月（两居室），购房均价3-4万/平",
      "purchasing_power_note": "薪资30k，扣除五险一金后实得约22-24k，月储蓄能力约15k，5年内首付可达100-200万，购买余杭100平改善型住宅具有可行性"
    },
    {
      "city": "北京",
      "typical_salary_range": "Go 后端5年，30-55k/月（字节/美团 P7-P8）",
      "housing_cost_note": "五环内租金约6000-10000元/月（两居室），购房均价7-12万/平",
      "purchasing_power_note": "薪资30k，实得约22k，月储蓄约10-12k，10年内五环内购房首付需累计200-400万，压力极大"
    },
    {
      "city": "成都",
      "typical_salary_range": "Go 后端5年，15-28k/月（除少数头部公司）",
      "housing_cost_note": "市区租金约2000-3500元/月（两居室），购房均价约2-3万/平",
      "purchasing_power_note": "薪资约20k，购房压力较小，但profile.constraints.salary_expectation=30k+，成都难以满足"
    }
  ],
  "industry_hub_analysis": [
    {
      "city": "杭州",
      "key_companies": ["阿里巴巴（及蚂蚁、钉钉、阿里云）", "网易", "海康威视", "大华技术"],
      "cluster_effect": "阿里系生态丰富：跳槽选项多（阿里内部+友商），互联网技术社群活跃，掘金杭州技术活动频繁",
      "career_ceiling": "阿里P8/P9（专家/高级专家）是大多数后端工程师的天花板，对应约50-80k/月"
    },
    {
      "city": "北京",
      "key_companies": ["字节跳动", "美团", "百度", "京东", "小米"],
      "cluster_effect": "互联网密度最高：跳槽选项最多，人脉网络最广，技术会议和分享活动丰富",
      "career_ceiling": "字节/百度架构师级别无上限，但到P8+竞争激烈"
    }
  ],
  "recommendation": "推荐杭州+互联网（电商）（fit_score=82，最高）。核心理由：① profile.experience[美团电商系统]与阿里电商业务直接匹配；② 有购房需求时杭州购买力显著优于北京；③ profile.constraints.location 包含杭州。成都不推荐（不满足薪资预期且不在约束城市内）。"
}
```
