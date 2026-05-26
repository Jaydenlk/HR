# career-principal — 求职主理人

Career Skills Marketplace 的入口 skill。当用户在 Claude Code 中谈到任何求职相关话题时，此 skill 触发，理解用户意图，调度合适的专业 sub-skill，并将多个分析结果汇总为结构化结论。

---

## 职责范围

**处理**：简历分析与优化、JD解读、匹配度诊断、面试准备全流程、offer评估与对比、公司调查与风险审计、薪资判断、职业规划、学习路线、个人品牌、求职流程管理、市场情报

**不处理**：与求职无关的任何话题（明确拒绝）

---

## 意图路由

career-principal 识别39种意图，分为5个功能层：

### 核心求职（6种）

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `analyze_jd` | 解读职位描述，分析要求和隐含条件 | jd-analyzer |
| `tailor_resume` | 针对特定 JD 优化简历内容 | resume-tailor |
| `match_diagnosis` | 评估用户背景与岗位的匹配程度 | match-diagnosis |
| `career_direction` | 职业方向规划和转型建议 | profile-builder |
| `write_message` | 撰写自荐信、感谢信等求职沟通消息 | profile-builder |
| `daily_planning` | 求职进度和日程管理规划 | profile-builder |

### Pack A — 求职流程管理（7种）

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `evaluate_opportunity` | 综合评估一个职位机会的投资价值 | opportunity-intelligence |
| `plan_application_strategy` | 制定多公司投递策略和优先级 | application-strategist |
| `track_applications` | 追踪和更新在途投递进度 | application-tracker |
| `plan_today` | 生成今日求职任务清单 | daily-plan-generator |
| `write_networking_message` | 撰写人脉开拓消息 | networking-message-writer |
| `find_referral_path` | 规划内推获取路径 | referral-strategy |
| `write_follow_up` | 撰写面试后跟进消息 | follow-up-message-writer |

### Pack B — 面试准备深度工具（8种）

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `interview_prep` | 面试准备综合入口 | profile-builder |
| `interview_debrief` | 面试表现复盘和改进建议 | profile-builder |
| `mock_interview` | 模拟真实面试场景并提供反馈 | mock-interviewer |
| `build_question_bank` | 按岗位生成结构化面试题库 | question-bank-builder |
| `get_company_playbook` | 获取目标公司面试风格攻略 | company-interview-playbook |
| `build_stories` | 用 STAR 法则构建行为面试故事库 | behavioral-story-builder |
| `prepare_technical` | 技术面试专项备考 | technical-interview-coach |
| `prepare_case` | 案例面试框架和练习 | case-interview-coach |

### Pack C — 市场情报（10种）

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `offer_evaluation` | offer 条件评估和决策支持 | jd-analyzer |
| `company_check` | 公司背景、口碑和发展前景调查 | source-quality-auditor |
| `salary_check` | 薪资水平的市场合理性判断 | source-quality-auditor |
| `find_interview_experience` | 查找特定公司/岗位面经 | source-quality-auditor |
| `check_market` | 查询行业/岗位市场行情 | market-radar |
| `find_xhs_interview` | 搜索小红书面经和求职帖子 | xhs-interview-miner |
| `find_nowcoder_interview` | 搜索牛客技术面经和真题 | nowcoder-tech-miner |
| `compare_offers` | 多维度横向对比多个 offer | offer-comparator |
| `audit_company_risk` | 评估目标公司经营风险 | company-risk-auditor |
| `analyze_industry` | 分析特定行业发展趋势 | industry-trend-analyst |

### Pack D — 职业战略规划（8种）

| 意图 | 描述 | 主要 skill |
|------|------|-----------|
| `plan_career` | 制定中长期职业发展路径 | career-path-planner |
| `evaluate_transition` | 评估职业转型可行性和路径 | role-transition-advisor |
| `identify_skill_gaps` | 识别能力差距并制定补强优先级 | skill-gap-planner |
| `build_learning_roadmap` | 制定可落地的技能学习计划 | learning-roadmap-builder |
| `build_personal_brand` | 设计职场个人品牌策略 | personal-brand-builder |
| `suggest_portfolio` | 推荐能提升竞争力的作品集项目 | portfolio-project-advisor |
| `grad_school_vs_job` | 系统比较深造与就业利弊 | graduate-school-vs-job-advisor |
| `find_city_industry_fit` | 匹配目标城市与行业生态适配度 | city-industry-fit-advisor |

详细路由规则见 `references/intent-router.yaml`。

---

## 调用的 sub-skills（37种）

### 基础分析层

| skill | 职责 |
|-------|------|
| `profile-builder` | 从简历文本提取结构化用户档案 |
| `jd-analyzer` | 解析 JD，提取要求、隐含条件、红旗信号 |
| `resume-tailor` | 基于 JD 分析结果重写/优化简历 |
| `match-diagnosis` | 计算用户档案与 JD 要求的多维匹配度 |
| `source-quality-auditor` | 验证市场事实类声明的来源可靠性（Pack C 强制调用） |

### Pack A — 求职流程管理

| skill | 职责 |
|-------|------|
| `opportunity-intelligence` | 综合评估职位机会的投资回报 |
| `application-strategist` | 制定投递策略和公司优先级排序 |
| `application-tracker` | 追踪和管理所有在途投递状态 |
| `daily-plan-generator` | 基于当前进展生成今日任务清单 |
| `networking-message-writer` | 撰写自然有效的人脉拓展消息 |
| `referral-strategy` | 规划获取内推的路径和方法 |
| `follow-up-message-writer` | 撰写面试后跟进、催进度等消息 |

### Pack B — 面试准备深度工具

| skill | 职责 |
|-------|------|
| `mock-interviewer` | 模拟真实面试场景，提供即时反馈 |
| `question-bank-builder` | 按岗位/公司生成结构化面试题库 |
| `company-interview-playbook` | 整合公司特定面试风格和高频考点 |
| `behavioral-story-builder` | 用 STAR 法则将经历提炼为面试故事 |
| `technical-interview-coach` | 技术面试知识点和算法专项辅导 |
| `case-interview-coach` | 案例面试框架和练习辅导 |

### Pack C — 市场情报

| skill | 职责 |
|-------|------|
| `market-radar` | 实时市场行情查询和薪资基准 |
| `xhs-interview-miner` | 从小红书提取面经和求职真实反馈 |
| `nowcoder-tech-miner` | 从牛客提取技术面经和真题 |
| `offer-comparator` | 多维度横向对比多个 offer |
| `company-risk-auditor` | 评估目标公司的经营风险和稳定性 |
| `industry-trend-analyst` | 分析特定行业的发展趋势和就业前景 |

### Pack D — 职业战略规划

| skill | 职责 |
|-------|------|
| `career-path-planner` | 制定中长期职业发展路径规划 |
| `role-transition-advisor` | 评估职业转型可行性和路径设计 |
| `skill-gap-planner` | 识别能力差距并制定补强优先级 |
| `learning-roadmap-builder` | 制定可落地的技能学习计划 |
| `personal-brand-builder` | 设计和建立职场个人品牌策略 |
| `portfolio-project-advisor` | 推荐能提升竞争力的作品集项目 |
| `graduate-school-vs-job-advisor` | 系统比较深造与就业的利弊 |
| `city-industry-fit-advisor` | 匹配目标城市与行业生态适配度 |

sub-skill 之间存在依赖关系，career-principal 负责保证调用顺序正确（见 `references/orchestration-rules.md`）。

---

## 输入

| 字段 | 必须 | 说明 |
|------|------|------|
| `user_message` | 是 | 用户的自然语言消息 |
| `resume_text` | 否 | 简历原文（部分意图需要） |
| `jd_text` | 否 | JD 原文（部分意图需要） |
| `user_profile` | 否 | 已有的用户档案对象 |

缺少必要输入时，career-principal 会追问用户（最多3轮）。

---

## 输出

所有输出遵循 `output_schema.json` 定义的结构：

```json
{
  "status": "success",
  "intent_detected": "match_diagnosis",
  "confidence": "medium",
  "skills_invoked": [...],
  "aggregated_result": {
    "summary": "综合结论",
    "key_findings": [...],
    "recommendations": [...],
    "evidence": [...]
  },
  "missing_information": [],
  "cannot_determine": [],
  "next_steps": [...]
}
```

confidence 取所有 sub-skill 置信度的最低值。

---

## 限制

1. **无法访问实时数据**：除非配置了外部 adapter，否则不会获取最新招聘信息、公司动态等
2. **市场事实需经验证**：所有薪资、行业趋势等声明须经 source-quality-auditor 确认，未经验证的不会呈现为确定性结论
3. **不处理求职以外的话题**：直接拒绝，不尝试给出边缘性回答
4. **知识图谱有时效限制**：`knowledge/` 目录中的数据为静态数据，可能与实时情况有出入
