# 示例：目标过于发散 → 聚焦建议

## 场景

用户画像显示同时想投5个不同行业（互联网、金融、教育、制造、医疗），策略需要引导聚焦。

## 输入

```json
{
  "user_profile": {
    "years_of_experience": 3,
    "skills": ["Python", "数据分析", "SQL"],
    "education": "本科，统计学",
    "target_industries": ["互联网", "金融科技", "教育", "制造业", "医疗健康"],
    "target_locations": ["北京", "上海", "成都"],
    "target_salary_min": 20000,
    "employment_status": "unemployed"
  },
  "application_timeline": {
    "current_date": "2026-03-15",
    "urgency": "urgent"
  }
}
```

## 输出

```json
{
  "skill_name": "application-strategist",
  "skill_version": "1.0.0",
  "summary": "目标行业过于分散（5个行业×3个城市），在 urgent 紧迫度下无法有效覆盖。建议聚焦2个行业×1个城市，基于数据分析背景优先选择互联网或金融科技。当前策略已按聚焦方向提供，分散方向的建议在 risks 中标注。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "user_profile", "content": "3年Python/数据分析，统计学本科，离职，目标5行业3城市" },
    { "source": "application_timeline", "content": "2026-03-15，urgent（1个月内入职）" }
  ],
  "recommendations": [
    "数据分析岗位在互联网和金融科技需求量最大，与技能匹配度最高",
    "3城市同时投递会分散面试精力，建议先锁定1个城市",
    "urgent 紧迫度下，建议聚焦互联网+金融科技，集中投递30-40份"
  ],
  "risks": [
    "目标分散导致简历无法针对性优化，降低通过率",
    "5个行业需要准备5套不同的面试话术，urgent模式下时间不够",
    "3个城市意味着需要多次跨城面试，成本高昂"
  ],
  "next_actions": [
    "确定首选城市（建议北京或上海，互联网/金融科技岗位更集中）",
    "聚焦互联网+金融科技，调整简历突出业务数据分析能力",
    "本周先投20份目标岗位，验证简历通过率"
  ],
  "follow_up_questions": [
    "5个目标行业中你有明确偏好的吗？还是都愿意接受？",
    "3个城市中目前哪个城市生活更方便？",
    "1个月内必须到岗的原因是什么（经济压力/签证/其他）？"
  ],
  "cannot_determine": [
    "最终聚焦方向（需用户确认行业偏好）"
  ],
  "target_company_tiers": [
    {
      "tier": "target",
      "description": "互联网/金融科技数据分析岗，薪资20k-35k",
      "rationale": "Python+SQL+统计学背景高度匹配，胜率60-70%",
      "example_types": ["互联网平台数据产品部门", "消费金融/理财平台数据团队", "电商运营数据分析"],
      "priority": 1
    },
    {
      "tier": "safety",
      "description": "传统行业数字化转型，数据分析支持岗",
      "rationale": "竞争较少，作为底线保障",
      "example_types": ["制造业ERP数据分析", "医疗HIS系统数据支持"],
      "priority": 2
    }
  ],
  "application_sequence": [
    {
      "week": "第1周（3月15-22日）",
      "focus": "聚焦互联网/金融科技，批量投递",
      "target_count": 25,
      "channels": ["BOSS直聘", "内推（LinkedIn校友）"]
    },
    {
      "week": "第2周（3月23-31日）",
      "focus": "跟进回复，面试准备，扩展至保底方向",
      "target_count": 20,
      "channels": ["BOSS直聘", "猎聘"]
    }
  ],
  "daily_action_plan": [
    { "action": "投递5-8份精选岗位（非海投）", "time_estimate": "45分钟", "priority": "high" },
    { "action": "准备数据分析案例题（SQL+业务分析）", "time_estimate": "60分钟", "priority": "high" },
    { "action": "跟进昨日投递回复", "time_estimate": "20分钟", "priority": "high" }
  ],
  "risk_assessment": {
    "main_risks": [
      "目标过散导致效率低下",
      "urgent 模式下无法等待数周面试周期"
    ],
    "mitigation": [
      "立即聚焦到2个行业，其余放弃",
      "同步与猎头合作，加速流程"
    ]
  }
}
```

## 说明

- 策略给出「聚焦建议」而非在5个方向都给具体计划
- 分散问题在 `risks` 和 `recommendations` 中明确说明
- 公司分层仍用类型描述，不虚构具体公司名称
