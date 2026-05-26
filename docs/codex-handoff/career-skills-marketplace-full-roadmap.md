# Career Skills Marketplace — Full Capability Roadmap

> 日期：2026-05-26
> 前置文档：career-skills-marketplace-design-audit.md (Phase 0)
> 状态：能力蓝图，不含业务代码

---

## 1. 完整 Skill Marketplace 分层

### Layer 1: Core Reasoning Skills (MVP)

MVP 六件套，构成最短求职判断闭环。详细设计见 Phase 0 文档。

| Skill | Purpose | Priority |
|-------|---------|----------|
| career-principal | 意图识别 + skill 编排 + 结果汇总 | P0 |
| profile-builder | 从简历/对话提取结构化画像 | P0 |
| jd-analyzer | JD 解析 + 风险信号 + 黑话识别 | P0 |
| resume-tailor | 基于 JD 改写简历，不编造 | P0 |
| match-diagnosis | 多维匹配度 + 差距分析 | P0 |
| source-quality-auditor | 来源可信度 + 时效性审计 | P0 |

---

### Layer 2: Career Execution Skills

负责真实求职行动——从发现机会到跟进反馈。

#### opportunity-intelligence

```yaml
purpose: 评估一个具体求职机会的综合价值（匹配度 + 市场定位 + 风险）
input:
  - jd_text 或 jd_url（必填）
  - user_profile（可选，有则个性化）
  - market_context（可选，来自 market-radar）
output:
  - opportunity_score: 0-100
  - match_assessment: { score, strengths, gaps }
  - market_positioning: { company_tier, role_demand, competition_level }
  - risk_flags: [{ signal, severity, source }]
  - recommendation: "strong_apply" | "apply_with_caution" | "skip" | "need_more_info"
  - evidence_chain: SkillEvidence[]
depends_on: [jd-analyzer, match-diagnosis, source-quality-auditor]
evidence_required: JD 文本 + 用户画像（至少一项）
live_research_required: no（基础版）/ yes（增强版需 market-radar）
china_market_specificity: high — 公司分类、招聘季节性、HC 冻结等中国特有信号
priority: P1
why_not_in_mvp: 依赖 match-diagnosis 输出 + knowledge graph 公司数据成熟度
```

#### application-strategist

```yaml
purpose: 制定个人求职策略——投什么类型的公司、什么节奏、什么顺序
input:
  - user_profile（必填）
  - target_roles: string[]（必填）
  - timeline: { start_date, deadline }（可选）
  - constraints: { location, salary_min, deal_breakers }
output:
  - strategy_summary: string
  - target_company_tiers: [{ tier, companies, reason }]
  - application_sequence: [{ phase, targets, timing, reason }]
  - daily_action_plan: [{ day_range, actions }]
  - risk_assessment: { over_aiming, under_aiming, timing_risk }
  - confidence: "high" | "medium" | "low"
depends_on: [profile-builder, knowledge-graph]
evidence_required: 用户画像 + 目标方向
live_research_required: no（基于知识图谱）
china_market_specificity: high — 秋招/春招节奏、金三银四、提前批策略
priority: P2
why_not_in_mvp: 需要知识图谱公司数据 + 时间线数据成熟
```

#### application-tracker

```yaml
purpose: 追踪投递状态，提供投递漏斗视图和跟进提醒
input:
  - application_entries: [{ company, role, stage, date, notes }]
  - user_actions: "add" | "update_stage" | "add_note"
output:
  - pipeline_view: { by_stage: { wishlist, applied, interview, offer, rejected } }
  - stats: { total, response_rate, interview_rate }
  - stale_alerts: [{ company, days_since_last_update, suggested_action }]
  - ghost_detection: [{ company, no_response_days }]
depends_on: []
evidence_required: 用户投递记录
live_research_required: no
china_market_specificity: medium — 中国公司回复周期不同（大厂慢、初创快）
priority: P2
why_not_in_mvp: 纯数据管理功能，不是 AI 判断核心
```

#### daily-plan-generator

```yaml
purpose: 根据用户当前求职状态生成每日任务清单
input:
  - user_profile（必填）
  - application_status: pipeline_view（可选）
  - upcoming_interviews: [{ company, date, round }]（可选）
  - current_date: string
output:
  - daily_tasks: [{ task, type, priority, duration_min, reason }]
  - today_focus: string（一句话重点）
  - timeline_context: string（当前处于秋招/春招哪个阶段）
depends_on: [profile-builder, application-tracker, knowledge-graph]
evidence_required: 用户状态 + 日历
live_research_required: no
china_market_specificity: high — 根据秋招/春招时间线动态调整
priority: P2
why_not_in_mvp: 依赖 application-tracker 数据积累
```

#### networking-message-writer

```yaml
purpose: 生成内推请求/LinkedIn消息/脉脉消息/邮件，个性化且不油腻
input:
  - target_person: { name, role, company, relationship }
  - purpose: "referral" | "info_interview" | "reconnect" | "thank_you"
  - user_profile（可选）
  - target_jd（可选）
output:
  - message_draft: string
  - tone: string
  - key_points: string[]
  - what_not_to_say: string[]
  - follow_up_timing: string
depends_on: [profile-builder]
evidence_required: 目标人信息 + 目的
live_research_required: no
china_market_specificity: high — 微信/脉脉语气 vs LinkedIn 正式度，内推文化差异
priority: P3
why_not_in_mvp: 非判断类 skill，优先级低于分析类
```

#### referral-strategy

```yaml
purpose: 分析用户人脉网络，找到最佳内推路径
input:
  - user_network: [{ person, company, relationship_strength }]
  - target_companies: string[]
output:
  - referral_paths: [{ company, via_person, path_strength, approach_suggestion }]
  - cold_outreach_targets: [{ company, suggested_channel, template }]
  - network_gaps: [{ company, no_connection, alternative_approach }]
depends_on: [knowledge-graph]
evidence_required: 用户人脉信息（用户自行提供）
live_research_required: no
china_market_specificity: high — 中国内推文化极强，"有人推"vs"海投"差异巨大
priority: P3
why_not_in_mvp: 依赖用户主动输入人脉数据
```

#### follow-up-message-writer

```yaml
purpose: 生成面试后感谢信 / 投递后跟进 / 拒信后回复
input:
  - context: "post_interview" | "post_application" | "post_rejection" | "post_offer"
  - details: { company, role, interviewer_name, key_discussion_points }
output:
  - message_draft: string
  - timing_advice: string
  - tone_guide: string
depends_on: []
evidence_required: 面试/投递上下文
live_research_required: no
china_market_specificity: medium — 中国面试后跟进文化不如欧美强，但大厂 HR 沟通有特定套路
priority: P3
why_not_in_mvp: 非核心判断 skill
```

---

### Layer 3: Interview Skills

负责面试全生命周期——从准备到复盘。

#### interview-intelligence

```yaml
purpose: 为特定公司+岗位+轮次聚合面试情报（流程、题型、考察重点、面试官风格）
input:
  - company: string（必填）
  - role: string（必填）
  - round: string（可选，如"一面"/"二面"/"HR面"）
output:
  - interview_flow: [{ round, format, duration, focus }]
  - common_questions: [{ question, category, frequency, source }]
  - preparation_priorities: [{ topic, weight, reason }]
  - interviewer_style: string | null
  - red_flags_to_watch: string[]
  - evidence_sources: SkillEvidence[]
depends_on: [knowledge-graph, source-quality-auditor]
evidence_required: 公司+岗位
live_research_required: yes（增强版需 xhs-interview-miner / nowcoder-tech-miner）
china_market_specificity: very high — 中国面试流程（笔试/群面/业务面/HR面）与欧美完全不同
priority: P1
why_not_in_mvp: 需要面经数据源（知识图谱 seed + optional live adapters）
```

#### mock-interviewer

```yaml
purpose: 模拟面试——根据 JD 生成问题，对回答实时评分，最终综合评估
input:
  - jd_text 或 company+role（必填）
  - interview_type: "behavioral" | "technical" | "case" | "mixed"
  - question_count: number（默认 5）
  - user_profile（可选）
output:
  phase_1_questions: [{ question, hints, category }]
  phase_2_per_answer: { score, feedback, filler_words, improvement }
  phase_3_evaluation: {
    overall_score, overall_grade,
    dimension_scores: [{ dimension, score }],
    strengths, weaknesses, next_steps
  }
depends_on: [profile-builder, jd-analyzer, interview-intelligence]
evidence_required: JD + 用户回答
live_research_required: no（基础版）/ yes（题目来自面经库）
china_market_specificity: high — 中国面试常见题型（群面讨论、手撕代码、产品设计题）
priority: P1
why_not_in_mvp: 三阶段交互复杂度高，需要 skill 间通信机制成熟
```

#### interview-debrief

```yaml
purpose: 面试后复盘——分析面试对话记录，输出逐题点评 + 评分 + 预测
input:
  - transcript: string（≥20字，面试对话记录）
  - company: string（可选）
  - role: string（可选）
  - round: string（可选）
output:
  - overall_grade: "A+" | "A" | "B+" | "B" | "C" | "D"
  - dimension_scores: [{ dimension, score_1_to_10, evidence }]（6 维）
  - question_analysis: [{ question, answer_quality, missed_points, improvement }]
  - prediction: { next_round_likelihood, expected_focus }
  - story_bank_candidates: [{ situation, task, action, result }]（可存入 behavioral-story-builder）
depends_on: [profile-builder]
evidence_required: 面试对话记录
live_research_required: no
china_market_specificity: medium — 评分维度适配中国面试文化
priority: P1
why_not_in_mvp: HRBP 已有实现可蒸馏，但需要 Layer 3 基础设施
```

#### question-bank-builder

```yaml
purpose: 为特定公司+岗位构建结构化面试题库
input:
  - company: string
  - role: string
  - sources: SkillEvidence[]（面经来源）
output:
  - question_bank: [{
      question, category, difficulty, frequency,
      sample_answer_framework, source, freshness
    }]
  - coverage: { behavioral_pct, technical_pct, case_pct }
  - gaps: string[]（缺少哪类题目的面经）
depends_on: [interview-intelligence, source-quality-auditor]
evidence_required: 面经数据
live_research_required: yes
china_market_specificity: high — 中国公司面试题型分布与欧美不同
priority: P2
why_not_in_mvp: 依赖面经数据积累
```

#### company-interview-playbook

```yaml
purpose: 为特定公司生成面试攻略手册（流程 + 文化 + 考察重点 + 历史面经 + 注意事项）
input:
  - company: string（必填）
  - role: string（可选）
output:
  - company_profile: { type, culture, values, interview_reputation }
  - interview_process: [{ round, format, typical_questions }]
  - culture_fit_tips: string[]
  - common_pitfalls: string[]
  - salary_negotiation_notes: string
  - sources: SkillEvidence[]
depends_on: [knowledge-graph, interview-intelligence]
evidence_required: 公司知识图谱 + 面经数据
live_research_required: yes（增强）
china_market_specificity: very high — 大厂/外企/国企面试文化天差地别
priority: P2
why_not_in_mvp: 需要丰富的公司知识图谱
```

#### behavioral-story-builder

```yaml
purpose: 从用户经历中提取 STAR 故事，按能力维度分类，供面试使用
input:
  - user_profile（必填）
  - interview_transcripts: string[]（可选，从复盘中提取）
output:
  - story_bank: [{
      title, situation, task, action, result, reflection,
      applicable_competencies: string[],
      strength: "strong" | "moderate" | "weak"
    }]
  - coverage_map: { leadership, teamwork, problem_solving, conflict, failure, ... }
  - gaps: string[]（缺少哪些能力维度的故事）
depends_on: [profile-builder, interview-debrief]
evidence_required: 用户经历（简历/对话/复盘记录）
live_research_required: no
china_market_specificity: medium — STAR 是通用方法，但中国面试对"反思"维度更看重
priority: P2
why_not_in_mvp: 需要画像和复盘数据积累
```

#### technical-interview-coach

```yaml
purpose: 技术面试准备——数据结构/算法/系统设计/手撕代码的针对性辅导
input:
  - role: string（必填）
  - company: string（可选）
  - weak_areas: string[]（可选）
output:
  - preparation_plan: [{ topic, priority, resources, time_estimate }]
  - practice_questions: [{ question, difficulty, category, hints }]
  - common_patterns: string[]
  - company_specific_focus: string[]（如"字节偏重算法"/"腾讯偏重项目经验"）
depends_on: [knowledge-graph, interview-intelligence]
evidence_required: 目标岗位 + 用户技术背景
live_research_required: yes（题目来自牛客）
china_market_specificity: high — 中国大厂技术面试风格（手撕代码频率、系统设计深度）
priority: P2
why_not_in_mvp: 需要技术题库数据
```

#### case-interview-coach

```yaml
purpose: Case 面试/产品设计题/商业分析题的准备和模拟
input:
  - role: string（如"产品经理"/"咨询顾问"/"运营"）
  - company: string（可选）
  - case_type: "product_design" | "business_analysis" | "estimation" | "strategy"
output:
  - framework_library: [{ framework_name, when_to_use, structure }]
  - practice_cases: [{ case_description, expected_structure, sample_answer }]
  - common_mistakes: string[]
  - evaluation_criteria: string[]
depends_on: [knowledge-graph]
evidence_required: 目标岗位类型
live_research_required: no（基础版）
china_market_specificity: high — 中国产品面试的"设计一个XX"题型 vs 咨询 case
priority: P3
why_not_in_mvp: 非核心判断 skill，属于专项辅导
```

---

### Layer 4: Market Intelligence Skills

负责外部市场情报收集和分析。

#### market-radar

```yaml
purpose: 聚合多来源市场信号——招聘趋势、热门岗位、行业动态
input:
  - scope: "all" | { industry, role_category, company_tier }
  - time_range: "this_week" | "this_month" | "this_quarter"
output:
  - trending_roles: [{ role, demand_change, source }]
  - hot_companies: [{ company, hiring_signal, source }]
  - market_sentiment: "expanding" | "stable" | "contracting"
  - key_signals: [{ signal, impact, source, freshness }]
  - confidence: "high" | "medium" | "low"
depends_on: [source-quality-auditor]
evidence_required: 外部数据源
live_research_required: yes
china_market_specificity: very high — 中国招聘市场与全球周期不同步
priority: P2
why_not_in_mvp: 完全依赖联网 adapter
```

#### xhs-interview-miner

```yaml
purpose: 从小红书提取面经内容，结构化后供其他 skill 使用
input:
  - query: { company, role, keywords }
output:
  - mined_posts: [{
      content_summary, company, role, round,
      questions_extracted: string[],
      sentiment, publish_date_estimate,
      source_url, credibility_grade: "C"
    }]
  - quality_report: { total_found, usable, rejected, reason_distribution }
depends_on: [source-quality-auditor]
evidence_required: XHS adapter 配置
live_research_required: yes
china_market_specificity: very high — XHS 是中国求职者最活跃的面经分享平台
priority: P3
why_not_in_mvp: 需要 Playwright + cookie 的 XHS bridge 基础设施
```

#### nowcoder-tech-miner

```yaml
purpose: 从牛客网提取技术面经和笔试题
input:
  - query: { company, role, keywords }
output:
  - mined_posts: [{
      content_summary, company, role, round,
      technical_questions: [{ question, topic, difficulty }],
      publish_date, source_url, credibility_grade: "B"
    }]
depends_on: [source-quality-auditor]
evidence_required: RSS/API 配置
live_research_required: yes
china_market_specificity: very high — 牛客是中国技术岗面经的权威平台
priority: P3
why_not_in_mvp: 需要 RSS adapter
```

#### wechat-insight-reader

```yaml
purpose: 从公众号文章提取行业洞察和职业发展方法论
input:
  - topics: string[]
output:
  - insights: [{
      title, summary, key_takeaways, author_credibility,
      source_url, publish_date, credibility_grade: "B" | "C"
    }]
depends_on: [source-quality-auditor]
evidence_required: WeChat RSS adapter
live_research_required: yes
china_market_specificity: very high — 公众号是中国职场认知补给的主要渠道
priority: P4
why_not_in_mvp: 需要 Docker + 微信扫码授权
```

#### salary-radar

```yaml
purpose: 聚合薪资数据，提供岗位/公司/城市维度的薪资参考
input:
  - query: { company?, role, city?, experience_years? }
output:
  - salary_range: { p25, p50, p75, p90 }
  - breakdown: { base, bonus_months, stock_annual, total_comp }
  - data_sources: [{ source, sample_size, freshness, credibility }]
  - comparison: [{ vs_company, difference_pct }]
  - confidence: "high" | "medium" | "low"
  - warnings: string[]（如"数据来自2025年，可能已调整"）
depends_on: [source-quality-auditor, knowledge-graph]
evidence_required: 薪资数据源（牛客开奖、offershow、levels.fyi）
live_research_required: yes
china_market_specificity: very high — 中国薪资结构（base×月数+年终+股票）与欧美不同
priority: P2
why_not_in_mvp: 需要薪资数据积累
```

#### offer-comparator

```yaml
purpose: 多维度比较多个 offer，输出结构化对比和建议
input:
  - offers: [{
      company, role, city, base_salary, bonus_months,
      stock_value?, total_comp, benefits, work_hours_estimate
    }]
  - user_priorities: { career_growth?, salary?, wlb?, location? }
output:
  - comparison_table: matrix
  - weighted_scores: [{ company, score, breakdown }]
  - recommendation: { best_overall, best_for_growth, best_for_wlb }
  - hourly_rate_comparison: [{ company, effective_hourly }]
  - risk_assessment: [{ company, risks }]
  - missing_info: [{ company, what_to_ask }]
depends_on: [knowledge-graph, source-quality-auditor]
evidence_required: offer 详情（用户提供）
live_research_required: no（基础版）/ yes（市场验证）
china_market_specificity: very high — 五险一金比例/年终奖绩效挂钩/RSU归属规则
priority: P2
why_not_in_mvp: 需要完整的 offer 比较 rubric + 薪资知识
```

#### company-risk-auditor

```yaml
purpose: 深度审计一家公司的求职风险（裁员历史、文化问题、财务状况）
input:
  - company: string（必填）
output:
  - risk_profile: {
      overall_risk: "low" | "medium" | "high" | "unknown",
      layoff_history, culture_signals, financial_health,
      glassdoor_sentiment, maimai_sentiment,
      known_issues: [{ issue, source, severity }]
    }
  - evidence_chain: SkillEvidence[]
  - confidence: "high" | "medium" | "low"
depends_on: [knowledge-graph, source-quality-auditor]
evidence_required: 公司名 + 多来源数据
live_research_required: yes
china_market_specificity: high — 脉脉匿名评价 + 天眼查工商信息 + 裁员新闻
priority: P3
why_not_in_mvp: 完全依赖联网
```

#### industry-trend-analyst

```yaml
purpose: 分析特定行业/赛道的发展趋势，判断是否值得进入
input:
  - industry: string
  - time_horizon: "short_term" | "medium_term" | "long_term"
output:
  - trend_summary: string
  - growth_signals: [{ signal, source }]
  - risk_signals: [{ signal, source }]
  - hiring_outlook: "expanding" | "stable" | "contracting"
  - recommended_entry_roles: string[]
  - confidence: "high" | "medium" | "low"
depends_on: [market-radar, source-quality-auditor]
evidence_required: 多来源行业数据
live_research_required: yes
china_market_specificity: high — 中国行业政策影响（如教培、游戏版号、AI 政策）
priority: P4
why_not_in_mvp: 需要成熟的 market-radar
```

---

### Layer 5: Career Strategy Skills

负责长期职业规划和发展。

#### career-path-planner

```yaml
purpose: 基于用户画像规划 1-3 条可行职业发展路径
input:
  - user_profile（必填）
  - time_horizon: "1_year" | "3_year" | "5_year"
  - constraints: { industry_preference, location, salary_target }
output:
  - paths: [{
      title, description, fit_percentage,
      milestones: [{ year, role, company_tier, expected_salary_range }],
      required_skills: [{ skill, current_level, target_level }],
      transition_difficulty: "easy" | "moderate" | "hard",
      evidence: SkillEvidence[]
    }]
  - recommended_path: string + reason
  - immediate_actions: string[]
depends_on: [profile-builder, knowledge-graph]
evidence_required: 用户画像 + 知识图谱路径数据
live_research_required: no（基础版）
china_market_specificity: high — 中国职业发展路径（大厂→创业/中厂→管理/外企→WLB）
priority: P2
why_not_in_mvp: 需要知识图谱 role-transition 边成熟
```

#### role-transition-advisor

```yaml
purpose: 分析从当前角色转向目标角色的可行性和路径
input:
  - current_role: string
  - target_role: string
  - user_profile（可选）
output:
  - feasibility: "highly_feasible" | "feasible" | "challenging" | "very_difficult"
  - skill_gap: [{ skill, importance, current_level, gap }]
  - typical_transition_path: [{ step, duration, description }]
  - success_stories: string[]（知识图谱中的路径案例）
  - risks: string[]
  - recommended_first_step: string
depends_on: [profile-builder, knowledge-graph]
evidence_required: 当前+目标角色 + 知识图谱路径数据
live_research_required: no
china_market_specificity: high — "文转产品"/"技术转管理"/"大厂转体制"等中国特有路径
priority: P2
why_not_in_mvp: 需要 role-transition 知识图谱边
```

#### skill-gap-planner

```yaml
purpose: 对比用户当前技能和目标要求，生成补强计划
input:
  - user_profile（必填）
  - target: jd_text 或 target_role
output:
  - gap_analysis: [{ skill, importance, current, target, gap_size }]
  - learning_plan: [{ skill, method, resource, time_estimate, priority }]
  - quick_wins: string[]（短期可补的差距）
  - long_term_investments: string[]（需要时间积累的能力）
depends_on: [profile-builder, jd-analyzer, match-diagnosis]
evidence_required: 用户画像 + 目标 JD/角色
live_research_required: no
china_market_specificity: medium — 学习资源推荐适配中文环境
priority: P2
why_not_in_mvp: 依赖 match-diagnosis 输出
```

#### learning-roadmap-builder

```yaml
purpose: 为特定技能差距生成结构化学习路线图
input:
  - skills_to_learn: [{ skill, target_level, deadline? }]
  - learning_style: "project_based" | "course_based" | "book_based" | "mixed"
output:
  - roadmap: [{
      week_range, focus_skill, learning_resources,
      practice_project, milestone_check
    }]
  - resource_list: [{ name, type, url?, cost, language, quality_rating }]
depends_on: [skill-gap-planner]
evidence_required: 技能差距清单
live_research_required: no（基础版）/ yes（推荐最新课程）
china_market_specificity: medium — 推荐中文学习资源（极客时间、掘金、B站课程）
priority: P3
why_not_in_mvp: 非核心判断 skill
```

#### personal-brand-builder

```yaml
purpose: 帮助用户建立技术/职业品牌——GitHub profile、技术博客、社区影响力
input:
  - user_profile（必填）
  - target_audience: "hiring_managers" | "peers" | "community"
  - platforms: string[]
output:
  - brand_strategy: { positioning, key_messages, tone }
  - platform_actions: [{ platform, what_to_do, frequency }]
  - content_ideas: [{ topic, format, target_audience }]
  - profile_optimization: [{ platform, current_issues, suggestions }]
depends_on: [profile-builder]
evidence_required: 用户画像
live_research_required: no
china_market_specificity: medium — 中国技术社区（掘金/思否/CSDN）vs 全球（GitHub/Medium）
priority: P4
why_not_in_mvp: 非求职核心
```

#### portfolio-project-advisor

```yaml
purpose: 推荐适合用户背景和目标的 portfolio 项目
input:
  - user_profile（必填）
  - target_role: string
output:
  - project_ideas: [{
      title, description, tech_stack, difficulty,
      why_it_helps: string, estimated_time
    }]
  - anti_patterns: string[]（不要做的项目类型）
depends_on: [profile-builder, skill-gap-planner]
evidence_required: 用户画像 + 目标角色
live_research_required: no
china_market_specificity: low — 项目建议较通用
priority: P4
why_not_in_mvp: 非核心判断 skill
```

#### graduate-school-vs-job-advisor

```yaml
purpose: 帮用户分析"读研还是工作"的决策
input:
  - user_profile（必填）
  - options: [{ type: "job" | "masters" | "phd", details }]
output:
  - analysis: [{
      option, pros, cons, opportunity_cost,
      expected_outcome_3yr, expected_outcome_5yr
    }]
  - recommendation: string + reason
  - critical_factors: string[]
  - confidence: "high" | "medium" | "low"
depends_on: [profile-builder, knowledge-graph]
evidence_required: 用户背景 + 选项详情
live_research_required: no
china_market_specificity: very high — 中国考研/保研/出国/Gap Year 文化完全独特
priority: P3
why_not_in_mvp: 特定人群 skill
```

#### city-industry-fit-advisor

```yaml
purpose: 分析"去哪个城市+做什么行业"的组合适配度
input:
  - user_profile（必填）
  - city_options: string[]
  - industry_options: string[]
output:
  - fit_matrix: [{ city, industry, fit_score, pros, cons }]
  - cost_of_living_impact: [{ city, estimated_monthly, salary_purchasing_power }]
  - industry_hub_analysis: [{ city, industry_strength, key_companies }]
  - recommendation: string
depends_on: [knowledge-graph]
evidence_required: 知识图谱城市+行业数据
live_research_required: no（基础版）
china_market_specificity: very high — 北京/上海/深圳/杭州/成都的产业生态完全不同
priority: P3
why_not_in_mvp: 需要城市×行业知识图谱数据
```

---

## 2. 完整主理人编排逻辑

Career Principal 的 12 种意图路由：

### Intent 1: "帮我看这个 JD 值不值得投"

```yaml
required_user_inputs: jd_text（必填）
called_skills:
  1. jd-analyzer → 解析 JD 结构化字段 + 风险信号
  2. source-quality-auditor → 评估 JD 来源可信度
  3. knowledge-graph → 查询公司类型/岗位市场信息
  4. [if user_profile exists] match-diagnosis → 个性化匹配度
evidence_needed: JD 原文；可选：用户画像
fallback_behavior:
  - 无画像：只做 JD 分析 + 通用评估，标注"缺少个人匹配度分析"
  - JD 过短：降级输出，标注 confidence: low
final_output_shape:
  jd_analysis: { fields, risk_signals, implicit_requirements }
  source_assessment: { credibility, freshness }
  market_context: { company_tier, role_demand }
  match_score: number | null
  recommendation: string
  confidence: "high" | "medium" | "low"
```

### Intent 2: "帮我改简历"

```yaml
required_user_inputs: resume_text + jd_text（至少一个，最好都有）
called_skills:
  1. profile-builder → 构建/更新画像
  2. [if jd_text] jd-analyzer → 解析目标 JD
  3. [if jd_text] match-diagnosis → 诊断匹配度
  4. resume-tailor → 生成改写建议
  5. source-quality-auditor → 审计改写证据链
evidence_needed: 简历原文 + 目标 JD
fallback_behavior:
  - 无 JD：通用优化（措辞改善），标注"无目标 JD，改写不够针对性"
  - 简历太短：标注"画像信息有限，改写范围受限"
final_output_shape:
  profile_summary: string
  match_score: number | null
  modifications: [{ section, original, modified, reason, fabrication_check }]
  overall_improvement: string
  missing_info: string[]
```

### Intent 3: "我不知道适合什么岗位"

```yaml
required_user_inputs: resume_text 或 对话中的背景描述
called_skills:
  1. profile-builder → 深度画像构建
  2. knowledge-graph → 查询 role-transition 路径 + skill-role 映射
  3. career-path-planner → 生成 1-3 条路径建议
  4. [future] role-transition-advisor → 评估各路径可行性
evidence_needed: 用户背景（简历或对话）
fallback_behavior:
  - 背景信息不足：追问"你过去做过什么？学了什么？对什么感兴趣？"
  - career-path-planner 不可用（MVP 阶段）：降级到知识图谱直接查询
final_output_shape:
  user_profile_summary: string
  recommended_paths: [{ role, fit_pct, reason, next_step }]
  skill_strengths: string[]
  exploration_suggestions: string[]
  confidence: "high" | "medium" | "low"
```

### Intent 4: "我明天要面试"

```yaml
required_user_inputs: company + role（必填）；round（可选）
called_skills:
  1. knowledge-graph → 公司面试流程/文化/常见题型
  2. [if available] interview-intelligence → 聚合面经情报
  3. profile-builder → 回顾用户画像
  4. [if available] behavioral-story-builder → 推荐 STAR 故事
evidence_needed: 公司+岗位信息
fallback_behavior:
  - interview-intelligence 不可用（MVP）：降级到知识图谱通用信息
  - 公司不在知识图谱中：输出通用面试准备框架，标注"该公司信息不足"
final_output_shape:
  company_context: { type, culture, interview_style }
  preparation_checklist: [{ topic, priority, resources }]
  likely_questions: [{ question, category }]
  story_suggestions: [{ story, applicable_to }]
  timing_tips: string
  last_minute_advice: string[]
```

### Intent 5: "我面完了，帮我复盘"

```yaml
required_user_inputs: interview_transcript 或 interview_notes
called_skills:
  1. interview-debrief → 逐题点评 + 评分
  2. profile-builder → 更新画像（补充面试中展现的能力）
  3. [if available] behavioral-story-builder → 存储好的 STAR 故事
evidence_needed: 面试记录/笔记
fallback_behavior:
  - 记录太短：追问"能回忆一下被问了什么问题、你怎么回答的吗？"
  - interview-debrief 不可用（MVP）：降级到通用分析
final_output_shape:
  overall_grade: string
  question_analysis: [{ question, answer_quality, improvement }]
  strengths_demonstrated: string[]
  areas_to_improve: string[]
  prediction: { next_round_likelihood, preparation_focus }
  stories_to_save: [{ story, quality }]
```

### Intent 6: "我拿了 offer，值不值得接"

```yaml
required_user_inputs: offer_details（薪资/公司/岗位/福利）
called_skills:
  1. jd-analyzer → 解析 offer 对应 JD
  2. knowledge-graph → 公司类型/薪资结构/行业对标
  3. source-quality-auditor → 评估 offer 信息完整性
  4. [if available] offer-comparator → 多 offer 对比
  5. [if available] salary-radar → 市场薪资验证
evidence_needed: offer 详情
fallback_behavior:
  - 信息不全：列出缺失项 + "建议向 HR 确认以下信息"
  - salary-radar 不可用：降级到知识图谱历史数据，标注"非实时数据"
  - 单 offer 无对比：给出绝对评估，标注"建议获取 competing offer 增加谈判筹码"
final_output_shape:
  offer_analysis: { company_tier, role_fit, compensation_assessment }
  risk_flags: string[]
  missing_info: string[]
  negotiation_suggestions: string[]
  recommendation: "accept" | "negotiate" | "need_more_info" | "caution"
  confidence: "high" | "medium" | "low"
```

### Intent 7: "这家公司是不是坑"

```yaml
required_user_inputs: company_name
called_skills:
  1. knowledge-graph → 公司类型/risk_tags/已知信号
  2. source-quality-auditor → 评估可用信息来源
  3. [if available] company-risk-auditor → 深度风险审计
evidence_needed: 公司名
fallback_behavior:
  - 公司不在知识图谱中：标注"该公司信息不足，无法做出可靠判断"
  - company-risk-auditor 不可用：降级到知识图谱 + 通用风险信号检查
final_output_shape:
  company_profile: { type, industry, known_signals }
  risk_assessment: { level, flags, sources }
  positive_signals: string[]
  information_gaps: string[]
  suggested_verification: string[]（"建议在脉脉搜索"/"查天眼查工商信息"）
  confidence: "high" | "medium" | "low"
```

### Intent 8: "我最近秋招应该做什么"

```yaml
required_user_inputs: 隐含当前日期；可选 user_profile
called_skills:
  1. knowledge-graph → 查询 timelines/ 中的秋招时间线
  2. [if user_profile] profile-builder → 了解当前状态
  3. [if available] daily-plan-generator → 生成具体任务
  4. [if available] application-strategist → 制定投递策略
evidence_needed: 当前日期 + 知识图谱时间线
fallback_behavior:
  - 无画像：给出通用秋招时间线建议
  - daily-plan-generator 不可用：降级到知识图谱时间线 + 通用建议
final_output_shape:
  current_phase: { name, date_range, key_activities }
  timeline_overview: [{ phase, dates, what_to_do }]
  immediate_actions: string[]（本周该做什么）
  weekly_plan: [{ week, focus, tasks }]
  warnings: string[]（如"提前批已过，抓紧正式批"）
```

### Intent 9: "我想从文科转产品"

```yaml
required_user_inputs: current_background + target_role
called_skills:
  1. profile-builder → 分析当前背景
  2. knowledge-graph → 查询 role-transition 路径
  3. [if available] role-transition-advisor → 可行性评估
  4. [if available] skill-gap-planner → 技能差距分析
evidence_needed: 用户背景
fallback_behavior:
  - role-transition-advisor 不可用：降级到知识图谱通用路径信息
  - 目标角色不在图谱中：标注"该转型路径信息不足"
final_output_shape:
  feasibility: string
  skill_gap: [{ skill, importance, current, needed }]
  transition_path: [{ step, duration, description }]
  success_factors: string[]
  risks: string[]
  first_step: string
  confidence: "high" | "medium" | "low"
```

### Intent 10: "帮我找某公司某岗位面经"

```yaml
required_user_inputs: company + role
called_skills:
  1. knowledge-graph → 已有面经数据
  2. [if available] interview-intelligence → 聚合面经情报
  3. [if adapter] xhs-interview-miner → 小红书面经
  4. [if adapter] nowcoder-tech-miner → 牛客面经
  5. source-quality-auditor → 审计每条面经来源
evidence_needed: 公司+岗位
fallback_behavior:
  - 无 adapter：只用知识图谱已有数据，标注"建议手动搜索牛客/小红书补充"
  - 公司不在图谱中：标注"该公司面经数据不足"
final_output_shape:
  interview_info: { process, rounds, typical_duration }
  question_bank: [{ question, category, source, freshness }]
  tips: string[]
  sources_used: SkillEvidence[]
  gaps: string[]
```

### Intent 11: "帮我写求职信/内推消息"

```yaml
required_user_inputs: purpose + target（公司/人/岗位）
called_skills:
  1. profile-builder → 了解用户背景
  2. [if jd_text] jd-analyzer → 了解目标岗位
  3. networking-message-writer 或 follow-up-message-writer（根据 purpose）
evidence_needed: 用户背景 + 目标信息
fallback_behavior:
  - networking-message-writer 不可用（MVP）：降级到通用模板 + AI 个性化
  - 无画像：追问基本背景后生成
final_output_shape:
  message_draft: string
  tone_explanation: string
  key_points_covered: string[]
  customization_suggestions: string[]
```

### Intent 12: "我想规划未来一年职业路线"

```yaml
required_user_inputs: user_profile（必填）；goals（可选）
called_skills:
  1. profile-builder → 深度画像
  2. career-path-planner → 1-3 条路径
  3. [if available] skill-gap-planner → 技能差距
  4. [if available] learning-roadmap-builder → 学习路线
  5. knowledge-graph → 行业/角色趋势
evidence_needed: 用户画像 + 目标方向
fallback_behavior:
  - career-path-planner 不可用：降级到知识图谱路径查询 + AI 分析
  - 目标不明确：先做 Intent 3（"不知道适合什么"），再做规划
final_output_shape:
  current_assessment: string
  recommended_paths: [{ path, milestones, timeline }]
  quarterly_plan: [{ quarter, focus, key_actions }]
  skill_development: [{ skill, method, deadline }]
  risk_factors: string[]
  review_checkpoints: string[]
```

---

## 3. 中国求职知识图谱长期设计

### Company Graph

#### 分类体系

| 类别 | 代表企业 | 知识图谱覆盖目标 |
|------|---------|----------------|
| 互联网大厂 | 阿里/腾讯/字节/美团/拼多多/京东/百度/快手 | MVP: 8家, Roadmap: 15+ |
| 稳定中厂 | 小红书/得物/B站/大疆/蔚来/米哈游/网易/携程 | MVP: 10家, Roadmap: 30+ |
| 外企 | 微软/谷歌/亚马逊/苹果/SAP/Oracle/IBM | MVP: 8家, Roadmap: 20+ |
| 国企/央企/金融 | 运营商/银行/电网/烟草/中金/中信 | MVP: 8家, Roadmap: 20+ |
| 新能源/硬科技 | 宁德时代/比亚迪/华为/中芯/海康 | MVP: 6家, Roadmap: 15+ |
| AI 初创 | Moonshot/智谱/百川/MiniMax/零一万物 | MVP: 5家, Roadmap: 10+ |
| 出海公司 | SHEIN/TikTok/Shopee/Temu | MVP: 4家, Roadmap: 10+ |
| 咨询/快消/四大 | MBB/PwC/Deloitte/P&G/Unilever | MVP: 6家, Roadmap: 15+ |
| 高风险公司池 | 已知问题企业（频繁裁员/拖薪/骗局） | MVP: 5条规则, Roadmap: 动态更新 |

**MVP 总计：~50 家公司节点**
**Roadmap 目标：135+ 家公司节点**

#### 公司节点 Schema

```json
{
  "company_id": "tencent",
  "company_name": "腾讯",
  "aliases": ["Tencent", "鹅厂", "WXG", "IEG", "PCG", "CSIG", "CDG"],
  "company_type": "internet_big_tech",
  "business_lines": ["社交", "游戏", "云服务", "金融科技", "内容"],
  "common_roles": ["后端开发", "前端开发", "产品经理", "运营", "游戏策划"],
  "hiring_season": {
    "campus": { "early_batch": "7月", "main_batch": "8-10月" },
    "social": { "peak": ["3-4月", "9-10月"], "year_round": true }
  },
  "interview_style": {
    "rounds": ["笔试", "一面(技术)", "二面(技术)", "三面(总监)", "HR面"],
    "difficulty": "high",
    "known_focus": ["算法", "项目深挖", "系统设计"],
    "culture_fit": "偏务实，重项目经验"
  },
  "salary_band_source_policy": {
    "trusted_sources": ["牛客开奖", "offershow"],
    "freshness_requirement": "当年数据",
    "known_structure": "16薪起，绩效浮动0-6个月"
  },
  "risk_tags": [],
  "source_confidence": "high",
  "freshness": "2026-Q2",
  "last_verified": "2026-05-26"
}
```

### Role Graph

#### 分类体系

| 大类 | 子类（部分） | MVP 节点数 | Roadmap 目标 |
|------|-----------|----------|------------|
| 技术 | 后端/前端/客户端/算法/测试/运维/安全/全栈/架构/大模型 | 10 | 15 |
| 产品 | C端/B端/策略/商业化/数据PM | 5 | 8 |
| 运营 | 用户/内容/活动/电商/社区/直播/增长 | 5 | 10 |
| 市场 | 品牌/PR/商务/销售/客户成功 | 3 | 8 |
| HR/职能 | HR/HRBP/财务/法务/行政 | 3 | 8 |
| 数据 | 分析师/工程师/标注/AI训练 | 3 | 6 |
| 设计 | UI/UX/交互/视觉 | 2 | 5 |
| 金融 | 投行/研究/量化/风控 | 0 | 6 |
| 咨询 | 战略/IT/管理 | 0 | 4 |
| 管培 | 综合管培 | 0 | 2 |
| 销售/商业化 | ToB销售/渠道/BD | 0 | 4 |

#### 角色节点 Schema

```json
{
  "role_id": "product-manager-c",
  "role_name": "产品经理(C端)",
  "role_category": "product",
  "typical_requirements": {
    "education": "本科+",
    "experience_years": "0-10",
    "hard_skills": ["需求分析", "PRD撰写", "数据分析", "用户研究", "竞品分析"],
    "soft_skills": ["沟通协调", "逻辑思维", "用户同理心"]
  },
  "hidden_preferences": [
    "大厂偏好985/211",
    "C端偏好有ToC产品使用洞察",
    "面试重案例分析能力"
  ],
  "portfolio_expectations": "产品方案/竞品分析报告/数据分析案例",
  "interview_focus": {
    "behavioral": 30,
    "case_study": 40,
    "technical": 10,
    "culture_fit": 20
  },
  "resume_keywords": ["DAU", "留存率", "转化率", "A/B测试", "PRD", "用户增长"],
  "common_red_flags": [
    "只写'负责产品工作'无具体产出",
    "无数据指标支撑",
    "项目经历只有一行描述"
  ],
  "salary_range_reference": {
    "junior_0_3yr": "15-30K/月",
    "mid_3_5yr": "25-50K/月",
    "senior_5_10yr": "40-80K/月",
    "note": "大厂偏上限，中厂取中位数，以上为2025年参考，仅供框架使用"
  }
}
```

### Market Vocabulary Graph（中国求职黑话）

| 术语 | meaning | risk | when_it_matters | example |
|------|---------|------|-----------------|---------|
| 泡池子 | 面试通过但不发 offer，等 HC 释放 | medium — 可能等很久或不了了之 | 面试后迟迟没结果时 | "HR 说在走流程" 可能就是泡池子 |
| 开奖 | 收到 offer 并公开薪资 | none — 信息术语 | 秋招/春招 offer 发放季 | "字节开奖了，SP 总包 40W" |
| HC | Head Count，招聘名额 | medium — HC 冻结意味着不招了 | 投递前确认 HC 是否开放 | "这个组没 HC 了" = 不用投了 |
| base | 基本月薪（不含奖金/股票） | none — 薪资术语 | 谈薪时 | "base 20K，年终3个月" |
| 背调 | 背景调查（学历/工作经历/犯罪记录） | low — 正规流程 | offer 后入职前 | 造假学历/经历会被查出 |
| OD | Outsource Dispatch，外包派遣 | high — 非正式员工，福利差 | 投递时确认用工形式 | JD 写"XX项目组"但实际是 OD |
| 外包 | 劳务派遣/外包员工 | high — 非直聘，无股票/年终 | 投递时确认 | "第三方合同"就是外包 |
| 实习转正 | 实习期表现合格后转为正式员工 | medium — 转正率不确定 | 选择实习 offer 时 | 大厂转正率 30-70% 不等 |
| 提前批 | 正式秋招前的早期招聘 | none — 好机会 | 5-7月 | 提前批往往竞争小、HC 充足 |
| 秋招 | 秋季校园招聘（8-12月） | none — 最大招聘季 | 应届生求职核心窗口 | 错过秋招只能等春招（岗位少） |
| 春招 | 春季校园招聘（2-4月） | low — 岗位数量/质量不如秋招 | 秋招未拿到 offer 时 | 春招是"补录"性质 |
| 笔试 | 在线编程/行测/性格测试 | none | 秋招流程中 | 大厂笔试通常是第一关 |
| 群面 | 多人无领导小组讨论 | medium — 淘汰率高 | 运营/产品/管培面试 | 6-8人讨论一个商业案例 |
| 业务面 | 直属领导/团队负责人面试 | none — 核心面试轮 | 考察专业能力和团队匹配 | 会深挖项目经历 |
| HR面 | 人力资源面试 | low — 通常是最后一轮 | 考察稳定性/期望/文化匹配 | 会问期望薪资和到岗时间 |
| 三方协议 | 学校/学生/企业三方签署的就业协议 | medium — 违约有违约金 | 拿到第一个 offer 后 | 违约金通常 3000-5000 元 |
| 白菜价 | 普通 offer（非 SP/SSP） | none — 信息术语 | 比较 offer 时 | "白菜 28W" |
| SP/SSP | Special Offer / Super Special Offer | none — 高于普通 offer | 比较 offer 时 | "SP 比白菜多 30%" |

---

## 4. 数据源策略长期设计

### 4.1 Built-in Knowledge（内置知识）

```yaml
更新频率: 随版本发布（每季度建议更新一次）
信任等级: B+（经过编辑审核，但可能有时效性偏差）
是否可公开: yes（MIT 开源）
是否进入主建议: yes — 作为基线判断依据
如何过期: 每条数据标注 freshness.json 中的 valid_until
如何撤销: PR 删除/修改 + 新版本发布
```

### 4.2 User-provided Evidence（用户提供的证据）

```yaml
更新频率: 实时（用户每次对话都可能提供新数据）
信任等级: A（用户对自己数据最权威）
是否可公开: NO — 纯私有
是否进入主建议: yes — 最优先的个性化依据
如何过期: 用户可标记过期或删除
如何撤销: 用户删除 evidence-store/user/ 中的对应文件
```

### 4.3 Live Research（联网搜索）

```yaml
更新频率: 按需（用户请求时实时搜索）
信任等级: C-B（取决于来源，经 source-quality-auditor 审计后分级）
是否可公开: 来源 URL 可公开，原文内容受版权保护
是否进入主建议: yes — 但必须经过 source-quality-auditor 审计
如何过期: 基于 freshness 规则自动标记
如何撤销: 清除 evidence-store 中的缓存
```

### 4.4 Community-maintained Seed（社区维护种子数据）

```yaml
更新频率: PR 驱动（社区贡献 → 审核 → 合并）
信任等级: B（经过审核流程，但质量取决于贡献者）
是否可公开: yes（MIT 开源）
是否进入主建议: yes — 与 built-in knowledge 同等对待
如何过期: 每条 PR 必须标注 freshness
如何撤销: PR 修改/删除
```

### 4.5 Private Local Evidence（私有本地证据）

```yaml
更新频率: 用户操作驱动
信任等级: A-B（用户自己的投递/面试/薪资记录）
是否可公开: NEVER — 包含个人隐私信息
是否进入主建议: yes — 个性化判断的核心数据
如何过期: 用户手动管理
如何撤销: 用户删除本地文件
```

---

## 5. 后续 Skills 的输出 Schema

### 5.1 opportunity-intelligence

```json
{
  "summary": "字节跳动后端开发岗位综合评估：匹配度 72%，市场定位强，但存在加班风险信号",
  "opportunity_score": 72,
  "match_assessment": {
    "score": 72,
    "strengths": ["技术栈匹配", "经验年限达标"],
    "gaps": ["缺少分布式经验", "英语要求未体现"]
  },
  "market_positioning": {
    "company_tier": "互联网大厂",
    "role_demand": "high",
    "competition_level": "very_high",
    "salary_benchmark": "30-50W"
  },
  "evidence_used": [
    { "source_type": "user_resume", "confidence": "high" },
    { "source_type": "jd_text", "confidence": "high" },
    { "source_type": "knowledge_graph", "confidence": "high" }
  ],
  "confidence": "high",
  "risks": ["加班强度高", "35岁危机", "内部竞争激烈"],
  "recommended_actions": ["补充分布式项目经验描述", "确认英语水平"],
  "follow_up_questions": ["你的期望工作强度是什么？", "是否接受996？"]
}
```

### 5.2 interview-intelligence

```json
{
  "summary": "腾讯产品经理面试共4轮，重案例分析和数据思维，平均周期2-3周",
  "interview_flow": [
    { "round": "笔试", "format": "在线", "duration": "120min", "focus": "逻辑+行测+产品设计" },
    { "round": "一面", "format": "视频", "duration": "45min", "focus": "产品sense+案例分析" },
    { "round": "二面", "format": "视频", "duration": "60min", "focus": "项目深挖+系统设计" },
    { "round": "HR面", "format": "电话", "duration": "30min", "focus": "稳定性+期望" }
  ],
  "common_questions": [
    { "question": "设计一个XX产品的XX功能", "category": "case_study", "frequency": "very_high", "source": "nowcoder" }
  ],
  "evidence_used": [
    { "source_type": "knowledge_graph", "confidence": "high" },
    { "source_type": "nowcoder", "confidence": "medium", "freshness": "recent" }
  ],
  "confidence": "medium",
  "risks": ["面经可能过时", "不同BG面试风格差异大"],
  "recommended_actions": ["准备3个产品设计案例", "复习数据分析方法"],
  "follow_up_questions": ["你面的是哪个BG？"]
}
```

### 5.3 mock-interviewer

```json
{
  "summary": "模拟面试完成，综合评分 B+，数据思维强但案例结构需改善",
  "phase": "evaluation",
  "overall_score": 78,
  "overall_grade": "B+",
  "dimension_scores": [
    { "dimension": "问题理解", "score": 85 },
    { "dimension": "结构化思维", "score": 70 },
    { "dimension": "数据论证", "score": 82 },
    { "dimension": "沟通表达", "score": 80 },
    { "dimension": "创新性", "score": 75 }
  ],
  "evidence_used": [
    { "source_type": "user_input", "confidence": "high" }
  ],
  "confidence": "high",
  "risks": ["模拟环境与真实面试有差距"],
  "recommended_actions": ["练习MECE框架分解问题", "回答时先说结论再展开"],
  "follow_up_questions": ["要再练一轮吗？"]
}
```

### 5.4 interview-debrief

```json
{
  "summary": "面试表现整体B级，技术问答扎实但项目描述不够量化",
  "overall_grade": "B",
  "dimension_scores": [
    { "dimension": "技术深度", "score": 8, "evidence": "正确回答了分布式一致性问题" },
    { "dimension": "项目表述", "score": 5, "evidence": "缺少量化成果描述" },
    { "dimension": "沟通清晰度", "score": 7, "evidence": "逻辑清楚但略显紧张" },
    { "dimension": "应变能力", "score": 6, "evidence": "追问时思考时间较长" },
    { "dimension": "文化匹配", "score": 7, "evidence": "表现出团队合作意愿" },
    { "dimension": "提问质量", "score": 4, "evidence": "反问环节只问了薪资" }
  ],
  "evidence_used": [
    { "source_type": "user_input", "confidence": "high" }
  ],
  "confidence": "high",
  "risks": ["自我回忆可能有偏差"],
  "recommended_actions": ["下次面试准备量化成果", "反问环节准备3个有深度的问题"],
  "follow_up_questions": ["面试官有没有特别追问哪个话题？"]
}
```

### 5.5 market-radar

```json
{
  "summary": "2026年Q2后端开发岗位需求稳定，AI相关岗位增长显著，外企招聘回暖",
  "trending_roles": [
    { "role": "大模型算法工程师", "demand_change": "+45%", "source": "牛客+Boss直聘" },
    { "role": "AI Agent 开发", "demand_change": "+30%", "source": "Boss直聘" }
  ],
  "hot_companies": [
    { "company": "Moonshot", "hiring_signal": "大量招聘技术岗", "source": "Boss直聘" }
  ],
  "evidence_used": [
    { "source_type": "web_search", "confidence": "medium", "freshness": "current" }
  ],
  "confidence": "medium",
  "risks": ["搜索结果可能有延迟", "单一时间点快照不代表长期趋势"],
  "recommended_actions": ["关注AI赛道机会", "准备AI相关项目经验"],
  "follow_up_questions": ["你对AI方向感兴趣吗？"]
}
```

### 5.6 salary-radar

```json
{
  "summary": "字节后端3年经验，北京，月base预计25-35K，年包35-55W",
  "salary_range": {
    "p25": { "base_monthly": 25000, "total_annual": 350000 },
    "p50": { "base_monthly": 30000, "total_annual": 450000 },
    "p75": { "base_monthly": 35000, "total_annual": 550000 }
  },
  "breakdown": {
    "base_months": 15,
    "bonus_range": "0-6个月",
    "stock_annual": "按级别,L1-2无,L2-1+有RSU",
    "other": "三餐免费+租房补贴1500/月"
  },
  "data_sources": [
    { "source": "牛客开奖2025", "sample_size": 47, "freshness": "recent", "credibility": "B" },
    { "source": "offershow", "sample_size": 23, "freshness": "recent", "credibility": "B" }
  ],
  "evidence_used": [
    { "source_type": "knowledge_graph", "confidence": "medium" },
    { "source_type": "nowcoder", "confidence": "medium" }
  ],
  "confidence": "medium",
  "risks": ["数据来自2025年，2026年可能有调整", "不同部门薪资差异大"],
  "recommended_actions": ["获取竞对offer增加议价空间"],
  "follow_up_questions": ["你的目标base是多少？", "有其他offer可以对比吗？"]
}
```

### 5.7 offer-comparator

```json
{
  "summary": "三个offer对比：腾讯综合最优但加班多，外企WLB最好但成长天花板低",
  "comparison": [
    {
      "company": "腾讯", "role": "后端开发",
      "total_comp": 450000, "effective_hourly": 172,
      "score": 82, "tags": ["高薪", "品牌强", "加班多"]
    },
    {
      "company": "微软", "role": "SDE",
      "total_comp": 380000, "effective_hourly": 210,
      "score": 78, "tags": ["WLB好", "外企光环", "天花板"]
    },
    {
      "company": "XX初创", "role": "技术负责人",
      "total_comp": 500000, "effective_hourly": 145,
      "score": 65, "tags": ["期权风险", "成长快", "不稳定"]
    }
  ],
  "evidence_used": [
    { "source_type": "user_input", "confidence": "high" },
    { "source_type": "knowledge_graph", "confidence": "high" }
  ],
  "confidence": "high",
  "risks": ["期权价值不确定", "加班时长为估算"],
  "recommended_actions": ["确认腾讯的具体加班文化", "了解初创公司融资状态"],
  "follow_up_questions": ["你更看重薪资还是WLB？", "初创的期权条款看过了吗？"]
}
```

### 5.8 career-path-planner

```json
{
  "summary": "基于你的后端开发背景，推荐3条路径：深耕技术、转型架构、转产品",
  "paths": [
    {
      "title": "技术深耕路线",
      "fit_percentage": 85,
      "milestones": [
        { "year": 1, "role": "高级后端", "company_tier": "大厂", "salary": "40-50W" },
        { "year": 3, "role": "技术专家", "company_tier": "大厂", "salary": "60-80W" },
        { "year": 5, "role": "架构师", "company_tier": "大厂/中厂", "salary": "80-120W" }
      ],
      "required_skills": [
        { "skill": "系统设计", "current_level": "intermediate", "target_level": "expert" }
      ],
      "transition_difficulty": "easy"
    }
  ],
  "evidence_used": [
    { "source_type": "user_resume", "confidence": "high" },
    { "source_type": "knowledge_graph", "confidence": "high" }
  ],
  "confidence": "medium",
  "risks": ["35岁危机对纯技术路线有影响", "薪资范围为估算"],
  "recommended_actions": ["明确1年内的技能提升重点", "开始接触系统设计项目"],
  "follow_up_questions": ["你对管理方向有兴趣吗？", "愿意去中厂做更大scope吗？"]
}
```

---

## 6. Live Research 安全机制

### 完整 Pipeline

```
用户请求
  ↓
1. Query Generation
  - 从用户意图提取搜索关键词
  - 添加中国市场限定词（如 +中国 +2026 +校招）
  - 生成 2-3 个不同角度的查询
  ↓
2. Source Collection
  - 并行查询多个来源（web search + 知识图谱 + optional adapters）
  - 每个来源返回 source_url + content + platform + date
  ↓
3. Source Scoring
  - 对每条来源执行 source-quality-auditor:
    - platform_grade: A/B/C/D（查 knowledge-graph source-platforms）
    - content_quality: 内容长度/结构/具体性
    - author_credibility: 是否实名/有认证
  ↓
4. Source Deduplication
  - 相似内容去重（同一事件多个来源报道）
  - 保留最高质量来源，标注重复来源数量
  ↓
5. Source Contradiction Detection
  - 对同一主题的多个来源做交叉验证
  - 如果来源之间矛盾，标注 conflict + 各方说法
  - 不自行裁决，返回给用户
  ↓
6. Recency Filter
  - 薪资数据：必须标年份，超过1年标 stale
  - 面经数据：超过6个月标 stale
  - 公司信息：超过1年标 stale
  - 过滤掉所有无日期的薪资/offer 数据
  ↓
7. China Market Applicability Filter
  - 检查来源是否针对中国市场
  - 过滤海外数据（levels.fyi 等不直接用于中国薪资判断）
  - 标注来源的市场适用范围
  ↓
8. Final Confidence Gate
  - 综合所有审计结果，计算最终 confidence
  - 执行以下规则（见下方规则表）
```

### 规则表

| 规则 | 触发条件 | 行为 |
|------|---------|------|
| 少于 2 个 B+ 来源不给高置信结论 | 可用来源中 grade ≥ B 的少于 2 个 | confidence 上限为 medium，输出附带"来源不足，建议自行验证" |
| 薪资/offer 必须有四要素 | 缺少年份/城市/岗位/公司级别中任一项 | 不纳入薪资参考，标注 "incomplete_salary_data" |
| 小红书只能当用户之声 | source_type = "xhs" | 不能单独作为薪资事实依据；可作为面经/体验参考；confidence 上限 C |
| 牛客偏技术面经 | source_type = "nowcoder" | 非技术岗面经信息权重降低；技术面经 confidence 可达 B |
| 公众号偏认知补充 | source_type = "wechat" | 不直接当个体 offer/薪资判断依据；适合行业趋势/方法论参考 |
| 旧帖不能当当前趋势 | published_at 超过当前季度 | 标注 freshness: "stale"，不参与趋势判断，只供历史参考 |
| D 级来源一律丢弃 | platform_grade = "D" | 直接从结果中排除，不展示 |
| 多源冲突不裁决 | 同一主题 2+ 来源矛盾 | 展示所有来源各自说法，标注 conflict，让用户决定 |

---

## 7. Evaluation Suite 长期设计

### Skill-level Eval（单 skill 测试）

| # | 场景 | 测试 Skill | 类型 |
|---|------|-----------|------|
| 1 | 完整中文 JD 解析 | jd-analyzer | happy path |
| 2 | 极短 JD（<50字） | jd-analyzer | edge case |
| 3 | 钓鱼 JD（要求交钱） | jd-analyzer | bad input |
| 4 | 完整简历构建画像 | profile-builder | happy path |
| 5 | 简历只写"做过项目" | profile-builder | low evidence |
| 6 | 简历经历时间重叠 | profile-builder | source conflict |
| 7 | 改写不编造经历 | resume-tailor | hallucination guard |
| 8 | 用户要求编造学历 | resume-tailor | bad input（拒绝） |

### Workflow-level Eval（多 skill 组合）

| # | 场景 | Skill 链 | 测试什么 |
|---|------|---------|---------|
| 9 | 完整求职闭环 | principal→profile→jd→match→resume | 端到端正确性 |
| 10 | 中间 skill 失败 | principal→profile→[jd失败]→... | 优雅降级 |
| 11 | 多轮对话追问 | principal（3轮追问） | 追问策略正确性 |

### Source-quality Eval（来源质量测试）

| # | 场景 | 测试什么 |
|---|------|---------|
| 12 | D级来源被正确丢弃 | 不采用培训贷/虚假内推来源 |
| 13 | 过期面经标注 stale | 2年前面经不当当前趋势 |
| 14 | 多源冲突正确标注 | 两个来源矛盾时不自行裁决 |

### China-market Eval（中国市场测试）

| # | 场景 | 测试什么 |
|---|------|---------|
| 15 | 识别"抗压能力强"为加班信号 | JD 黑话映射 |
| 16 | 正确区分校招/社招节奏 | 时间线知识 |
| 17 | 识别 OD/外包风险 | 用工形式风险识别 |
| 18 | 理解"五险一金""十三薪" | 中国薪资术语 |

### Hallucination Eval（防编造测试）

| # | 场景 | 测试什么 |
|---|------|---------|
| 19 | 简历只有 Java 不推出 Python | 不编造技能 |
| 20 | 无薪资数据不编造薪资范围 | 不编造市场数据 |
| 21 | 公司不在图谱中不编造评价 | 不编造公司信息 |

### Regression Eval（回归测试）

| # | 场景 | 测试什么 |
|---|------|---------|
| 22 | 修改 prompt 后输出 schema 仍合规 | schema 稳定性 |
| 23 | 更新知识图谱后 skill 行为一致 | 知识变更不破坏功能 |
| 24 | 新增 skill 不影响现有 skill | 隔离性 |

---

## 8. 开源贡献机制

### 可贡献内容

| 贡献类型 | 目录 | 审核标准 |
|---------|------|---------|
| 新 Skill | `skills/` | 必须有完整 checklist（SKILL.md + contract + schema + examples + tests） |
| 新公司数据 | `knowledge/graph/nodes/companies.json` | 必须标注 source_confidence + freshness + 来源 URL |
| 新岗位数据 | `knowledge/graph/nodes/roles.json` | 同上 |
| 新 Rubric | `shared/rubrics/` | 必须有至少 2 个示例验证 |
| 新 Example | `skills/*/examples/` | 必须标注输入/输出/证据来源 |
| 新 Eval Case | `evals/fixtures/` | 必须有明确的 expected 输出 |
| 新 Adapter | `adapters/` | 必须通过 source-quality-auditor 集成测试 |

### Contribution Checklist

```
提交新 Skill 的 PR 必须包含：
[ ] SKILL.md（遵循 Anthropic 规范）
[ ] contract.yaml（包含 when_to_use / when_not_to_use / failure_modes）
[ ] output-schema.json
[ ] examples/happy-path.md
[ ] examples/low-evidence.md
[ ] tests/（至少 4 类：happy / bad input / hallucination / china market）
[ ] 无 TODO/FIXME/placeholder
[ ] 所有 claim 可追溯到 evidence

提交知识图谱数据的 PR 必须包含：
[ ] source_url（数据来源链接）
[ ] freshness 标注
[ ] source_confidence 标注
[ ] 无个人隐私数据
[ ] 无版权全文
[ ] 无虚假薪资数据
```

### 审核红线

| 红线 | 说明 |
|------|------|
| **No private data** | 不接受包含个人简历/offer letter/面试记录的 PR |
| **No copyrighted full-text** | 不接受公众号/付费面经的全文复制 |
| **No fake salary** | 不接受无来源的薪资数据 |
| **No subjective company rating** | 不接受"XX公司好/坏"的主观评价 |
| **Evidence required** | 每条数据必须有可验证的来源 |
| **Freshness required** | 每条数据必须标注时间 |

---

## 9. 部署形态演进

### Local Lite

```yaml
适合谁: 个人求职者，快速体验
安装复杂度: 1 步（npx skills add）
依赖: Claude Code（或其他 SKILL.md 兼容环境）+ AI API key
数据隐私: 所有数据本地，不上传
不适合什么: 团队协作、需要持久化大量数据
特点:
  - 6 core skills + knowledge graph
  - evidence-store 本地文件
  - 无 adapter（纯离线增强）
```

### Local Plus

```yaml
适合谁: 深度使用者，需要联网增强
安装复杂度: 1 步安装 + adapter 配置
依赖: Claude Code + AI API key + Web Search API key（可选）
数据隐私: 所有数据本地，联网搜索结果缓存本地
不适合什么: 多用户共享
特点:
  - 全部 skills
  - evidence-store 本地文件 + 联网缓存
  - Web Search adapter 启用
  - 可选 XHS/牛客 adapter
```

### Team/Community Edition

```yaml
适合谁: 求职互助小组、学校就业中心、培训机构
安装复杂度: 中等（需要共享存储配置）
依赖: Claude Code + AI API + 共享文件系统或 Git repo
数据隐私: 共享知识库公开，个人数据隔离
不适合什么: 大规模 SaaS
特点:
  - 共享公司/岗位/面经知识库（Git repo）
  - 个人 evidence-store 隔离
  - 社区贡献的 eval cases
  - 团队 rubrics 定制
```

---

## 10. Roadmap

### Phase 1: MVP 6 Skills (当前 → +4周)

```yaml
deliverables:
  - 可安装的 npm 包 (@career-skills/marketplace)
  - Career Principal SKILL.md
  - 5 个 sub-skills (profile/jd/resume/match/auditor)
  - Evidence Layer schema
  - Knowledge Graph seed (50 公司)
  - 7×6 = 42 个 test cases
  - README.zh-CN.md

acceptance_criteria:
  - npx skills add 成功安装
  - 完整闭环可用（JD→画像→匹配→改写→审计）
  - 所有 test cases 通过
  - 用户从安装到首次使用 < 5分钟
  - fabrication check 通过

risks:
  - SKILL.md 规范限制导致 skill 间通信困难
  - 知识图谱 50 公司覆盖不够用户常见场景

parallelizable_subagent_tasks:
  - A: Career Principal + 编排逻辑
  - B: profile-builder + jd-analyzer
  - C: match-diagnosis + resume-tailor
  - D: source-quality-auditor + evidence schema
  - E: Knowledge Graph seed data
  - F: evals + README
```

### Phase 2: Interview + Opportunity (+4周 → +8周)

```yaml
deliverables:
  - interview-intelligence skill
  - mock-interviewer skill
  - interview-debrief skill
  - opportunity-intelligence skill
  - behavioral-story-builder skill
  - Knowledge Graph 扩展到 80 公司

acceptance_criteria:
  - "明天面试"意图路由完整可用
  - "这个 JD 值不值得投"有深度评估
  - 面试复盘结构化输出
  - STAR 故事积累机制工作
  - 新增 skill ×7 类测试 全部通过

risks:
  - 面经数据不足导致 interview-intelligence 降级过多
  - mock-interviewer 的多轮交互在 SKILL.md 框架下受限

parallelizable_subagent_tasks:
  - A: interview-intelligence + question-bank
  - B: mock-interviewer（三阶段）
  - C: interview-debrief（蒸馏自 HRBP）
  - D: opportunity-intelligence
  - E: Knowledge Graph 扩展
```

### Phase 3: Market Radar + Live Research (+8周 → +12周)

```yaml
deliverables:
  - market-radar skill
  - Web Search adapter
  - salary-radar skill
  - company-risk-auditor skill
  - Live Research 安全 pipeline（第6章）
  - source-quality-auditor 增强版

acceptance_criteria:
  - 联网搜索结果经过完整安全 pipeline
  - 薪资数据标注年份/城市/岗位/来源
  - D 级来源被正确过滤
  - 无 adapter 时所有 skill 正常降级

risks:
  - Web Search API 质量参差不齐
  - 薪资数据来源有限

parallelizable_subagent_tasks:
  - A: market-radar + web search adapter
  - B: salary-radar
  - C: company-risk-auditor
  - D: Live Research safety pipeline
```

### Phase 4: Offer/Salary + Career Strategy (+12周 → +16周)

```yaml
deliverables:
  - offer-comparator skill
  - career-path-planner skill
  - role-transition-advisor skill
  - skill-gap-planner skill
  - daily-plan-generator skill
  - Knowledge Graph role-transition 边完善

acceptance_criteria:
  - "offer 值不值得接"完整路由
  - "从文科转产品"路径分析可用
  - offer 对比输出综合时薪
  - 每日任务基于秋招/春招时间线

risks:
  - offer 比较维度的权重是否合理需要用户反馈
  - role-transition 数据难以量化

parallelizable_subagent_tasks:
  - A: offer-comparator + salary 知识
  - B: career-path-planner + role-transition
  - C: skill-gap-planner + learning-roadmap
  - D: daily-plan-generator
```

### Phase 5: Knowledge Graph + Community (+16周 → +20周)

```yaml
deliverables:
  - Knowledge Graph 扩展到 135+ 公司
  - Market Vocabulary Graph 完整
  - 贡献指南 + 审核流程
  - Community gallery / index
  - Knowledge Graph 版本管理

acceptance_criteria:
  - 社区可通过 PR 贡献数据
  - 审核流程有明确 checklist
  - 无个人隐私数据泄露
  - 知识图谱版本可追溯

risks:
  - 社区贡献质量参差不齐
  - 数据审核工作量

parallelizable_subagent_tasks:
  - A: Knowledge Graph 大规模扩充
  - B: Contribution guide + templates
  - C: Review workflow automation
```

### Phase 6: Multi-environment Adapters (+20周 → +24周)

```yaml
deliverables:
  - Gemini CLI 兼容验证
  - Cursor 兼容验证
  - XHS adapter（如基础设施就绪）
  - Nowcoder adapter
  - 跨环境 contract 测试

acceptance_criteria:
  - 核心 6 skill 在 3+ 环境中工作
  - adapter 可选安装/卸载
  - 跨环境 eval 通过

risks:
  - 不同环境对 SKILL.md 的解析差异
  - XHS 反爬持续升级
```

### Phase 7: Evaluation Benchmark (+24周 → +28周)

```yaml
deliverables:
  - 完整 eval suite（24+ 场景）
  - Benchmark 数据集（中国求职场景）
  - 自动化 eval 脚本
  - Eval 报告生成
  - Skill quality leaderboard（如果有社区 skill）

acceptance_criteria:
  - 全部 eval 场景自动化运行
  - 每次 PR 触发 regression eval
  - Benchmark 结果可公开对比

risks:
  - eval 的 judge model 一致性
  - benchmark 数据集代表性
```

---

## 11. MVP 边界再确认

**MVP 不是最终产品，只是地基。**

第一版必须做扎实的：
- contract — 每个 skill 有明确的输入/输出/失败模式
- schema — 输出结构可验证，不是自由文本
- examples — 至少 happy-path + low-evidence 各一个
- eval — 7 类测试全部覆盖
- seed knowledge — 50 公司 + 30 岗位 + 12 黑话 + 时间线
- installer — npx skills add 一步到位
- principal routing — 7 种意图正确路由

**不要为了显得功能多而提前做**：
- XHS 自动采集 — 基础设施太重，MVP 不需要
- 薪资实时库 — 需要持续维护，先用知识图谱历史数据
- Offer 全自动判断 — 信息不足时应拒绝而非猜测
- 大量长尾 skills — 先把 6 个做到 contract+schema+eval 完整

---

## 12. 输出结论

```text
Full Marketplace Roadmap Verdict:

- MVP 六件套是否足够作为第一阶段: YES
  构成完整判断闭环，不依赖外部数据，6 个 skill 互相配合覆盖最高频场景。
  
- 后续最应该优先做的 3 个 skill:
  1. interview-intelligence (P1) — 面试是求职最焦虑环节，需求最刚
  2. opportunity-intelligence (P1) — 将 JD 分析升级为机会评估
  3. offer-comparator (P2) — 拿到 offer 后的决策刚需

- 最容易做砸的部分:
  Knowledge Graph 维护。初始 50 公司可以靠编辑审核，但扩展到 135+ 后
  必须有社区贡献机制 + 自动化审核，否则数据会腐烂。

- 哪些能力必须联网:
  × market-radar (实时市场趋势)
  × salary-radar (实时薪资对标)
  × company-risk-auditor (实时风险审计)
  × xhs/nowcoder/wechat miners (面经采集)

- 哪些能力必须离线可用:
  ✓ Layer 1 全部 6 个核心 skill
  ✓ JD 黑话识别（知识图谱）
  ✓ 来源分级策略（知识图谱）
  ✓ 面试准备框架（知识图谱）
  ✓ offer 比较框架（知识图谱 rubric）
  ✓ 校招/社招时间线（知识图谱）

- 哪些能力最适合社区贡献:
  ✓ 公司数据（新增公司/更新信息）
  ✓ 岗位 taxonomy 扩展
  ✓ 面经数据（脱敏后）
  ✓ JD 黑话新词
  ✓ eval test cases
  ✓ 新 adapter

- 哪些能力不能开源共享用户数据:
  × 用户简历
  × 用户 offer 详情
  × 用户薪资数据
  × 用户投递记录
  × 用户面试对话记录
  这些只存在 evidence-store/user/，永不上传，永不入 Git。
```
