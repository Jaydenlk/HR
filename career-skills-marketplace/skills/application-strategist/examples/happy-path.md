# 示例：完整画像 + 金三银四 → 高置信度求职策略

## 场景

用户（4年Java后端工程师，在职，上海，2026年3月希望找新工作），在金三银四求职旺季请求制定完整策略。

## 输入

```json
{
  "user_profile": {
    "years_of_experience": 4,
    "skills": ["Java", "Spring Boot", "MySQL", "Redis", "Kafka", "微服务"],
    "education": "本科，软件工程，211院校",
    "target_industries": ["互联网", "金融科技"],
    "target_locations": ["上海"],
    "target_salary_min": 30000,
    "target_salary_max": 50000,
    "employment_status": "employed"
  },
  "application_timeline": {
    "current_date": "2026-03-01",
    "target_start_date": "2026-05-01",
    "urgency": "normal"
  }
}
```

## 输出

```json
{
  "skill_name": "application-strategist",
  "skill_version": "1.0.0",
  "summary": "当前处于金三银四求职旺季（2026年3月），建议3月重点布局内推和大厂，4月扩展中型公司，5月1日前完成入职。在职跳槽应保持低调，避免被当前雇主发现。",
  "confidence": "high",
  "evidence_used": [
    { "source": "user_profile", "content": "4年Java后端，211本科，在职，30k-50k目标薪资" },
    { "source": "application_timeline", "content": "2026-03-01开始，5月1日前入职，urgency=normal" }
  ],
  "recommendations": [
    "金三银四是社招黄金期，3月建议每周投递15-20份",
    "在职跳槽优先走内推渠道，降低被发现风险",
    "技术栈匹配度高（Java微服务），可直接冲刺头部互联网"
  ],
  "risks": [
    "在职跳槽需注意保密：不用公司邮箱投递，不在工作时间接听面试电话",
    "3月底4月大厂HC可能缩减，需把握前半段窗口"
  ],
  "next_actions": [
    "本周梳理脉脉/校友人脉，找目标公司内推人",
    "更新BOSS直聘简历（设为仅HR可见）",
    "准备系统设计和Java并发面试题（2-3天）"
  ],
  "follow_up_questions": [
    "你有目标公司的内推人脉吗？",
    "是否接受股票/期权形式的薪资结构？"
  ],
  "cannot_determine": [],
  "target_company_tiers": [
    {
      "tier": "stretch",
      "description": "一线互联网大厂，薪资50k+，竞争激烈",
      "rationale": "4年经验+211本科有机会，但竞争者多，胜率约30%",
      "example_types": ["上市互联网公司核心业务线", "头部金融科技平台"],
      "priority": 2
    },
    {
      "tier": "target",
      "description": "中大型互联网/金融科技，薪资30k-50k，匹配度高",
      "rationale": "技术栈高度匹配，经验年限符合要求，胜率约60%",
      "example_types": ["B轮以上互联网公司", "城商行/股份制银行科技部门", "头部证券/基金IT部门"],
      "priority": 1
    },
    {
      "tier": "safety",
      "description": "稳定型公司，薪资25k-35k，确保底线",
      "rationale": "要求低于当前经验水平，确保有保底选择",
      "example_types": ["传统行业数字化部门", "外包转自研公司", "中型SaaS企业"],
      "priority": 3
    }
  ],
  "application_sequence": [
    {
      "week": "第1-2周（3月1-15日）",
      "focus": "激活内推渠道，投递核心目标公司",
      "target_count": 20,
      "channels": ["脉脉内推", "微信校友群", "BOSS直聘（仅HR可见）"]
    },
    {
      "week": "第3-4周（3月16-31日）",
      "focus": "扩大投递范围，首批面试准备",
      "target_count": 25,
      "channels": ["BOSS直聘", "猎聘", "领英"]
    },
    {
      "week": "第5-6周（4月1-15日）",
      "focus": "推进面试流程，收集offer",
      "target_count": 15,
      "channels": ["猎聘", "直接投递公司官网"]
    }
  ],
  "daily_action_plan": [
    { "action": "刷新招聘平台，查看新增职位", "time_estimate": "20分钟", "priority": "high" },
    { "action": "处理招聘方回复，确认面试时间", "time_estimate": "15分钟", "priority": "high" },
    { "action": "准备当天面试题目（系统设计/代码题）", "time_estimate": "60分钟", "priority": "high" },
    { "action": "脉脉/LinkedIn查看目标公司动态", "time_estimate": "15分钟", "priority": "medium" }
  ],
  "risk_assessment": {
    "main_risks": [
      "在职身份泄露风险：同事或当前公司 HR 发现",
      "时间冲突：工作时间接面试影响当前工作质量",
      "4月金三银四末段，HC开始收缩"
    ],
    "mitigation": [
      "使用个人手机和邮箱，不用公司设备投递",
      "面试尽量安排在午休或下班后",
      "3月底前争取进入目标公司终面流程"
    ]
  }
}
```

## 说明

- 时间窗口「金三银四」贯穿整个策略，节奏与日历强绑定
- 在职跳槽的保密建议作为专项风险处理
- 公司分层描述的是「类型特征」而非具体公司名称，避免虚构
