---
description: "sub-skill 调用的编排规则：依赖顺序、并行条件、输出聚合方式"
version: "2.0.0"
---

# 编排规则

> **调度机制(与 career-principal `SKILL.md` §3.0 一致)**:本文中「调用 / 执行 skill X」均指主理人 **读取并执行 `../X/PLAYBOOK.md`**(worker 已改为 playbook 文件,不自动触发、不互相调用)。依赖由主理人按序串联:逐个读取+执行,把上游产出喂给下游。

## 1. 依赖顺序

sub-skill 之间存在数据依赖，违反顺序会导致下游 skill 缺少必要输入。

### 强制依赖关系

```
profile-builder  ──依赖──► match-diagnosis
jd-analyzer      ──依赖──► match-diagnosis
jd-analyzer      ──依赖──► resume-tailor
```

**规则解释**：
- `match-diagnosis` 需要用户档案（profile-builder 输出）和 JD 解析结果（jd-analyzer 输出）才能计算匹配度
- `resume-tailor` 需要 JD 的结构化要求（jd-analyzer 输出）才能针对性优化简历
- `source-quality-auditor` 无依赖，可在任何阶段调用

### 可并行的 skill

以下 skill 无互相依赖，可同时调用：
- `profile-builder` 和 `jd-analyzer` 可以并行执行
- `source-quality-auditor` 可以在任何其他 skill 运行期间并行执行

---

## 2. 完整编排流程（按意图）

### 意图：match_diagnosis（完整流程）

```
阶段 1（并行）:
  ├── profile-builder(resume_text)
  └── jd-analyzer(jd_text)

阶段 2（等待阶段 1 完成）:
  └── match-diagnosis(profile-builder.output, jd-analyzer.output)

阶段 3（如有市场事实声明）:
  └── source-quality-auditor(match-diagnosis.market_claims)
```

### 意图：tailor_resume（完整流程）

```
阶段 1（并行）:
  ├── jd-analyzer(jd_text)
  └── profile-builder(resume_text)  [可选，提升质量]

阶段 2（等待阶段 1 完成）:
  └── resume-tailor(jd-analyzer.output, resume_text)
```

### 意图：analyze_jd（简单流程）

```
阶段 1:
  └── jd-analyzer(jd_text)

阶段 2（如有市场薪资/行业声明）:
  └── source-quality-auditor(jd-analyzer.market_claims)
```

### 意图：career_direction / interview_prep

```
阶段 1:
  └── profile-builder(resume_text 或 user_profile)

阶段 2（如有行业趋势声明）:
  └── source-quality-auditor(career_claims)
```

### 意图：offer_evaluation / salary_check / company_check / find_interview_experience

```
阶段 1:
  └── source-quality-auditor(user_message 中的核心问题)

补充（如有 JD 文本）:
  └── jd-analyzer(jd_text)
```

### 意图：write_message

```
阶段 1（并行）:
  ├── profile-builder(resume_text)  [提取亮点]
  └── jd-analyzer(jd_text)         [如有 JD]

阶段 2（等待阶段 1 完成）:
  └── 基于 profile-builder 和 jd-analyzer 输出生成消息
```

---

## 3. 何时调用 source-quality-auditor

**必须调用**（涉及以下任何一类声明）：
- 薪资范围的具体数字（如"该岗位市场薪资 25-40K"）
- 行业趋势陈述（如"AI 岗位需求在增长"）
- 公司规模/融资状态（如"该公司 C 轮，估值 10 亿"）
- 岗位市场供需（如"产品经理目前市场竞争激烈"）
- 任何含"普遍"、"一般来说"、"行业标准"的陈述

**不需要调用**：
- 仅基于用户提供的 JD 原文得出的结论
- 仅基于用户提供的简历原文得出的结论
- 明确标注为"仅供参考"的通用框架建议

---

## 4. 输出聚合规则

### 4.1 confidence 聚合（分维度标源标置信，不连坐）

**废弃全局 `min()` 连坐**。改为：

- **分维度/分子结论分别给 confidence + 来源**，写进产出的 `dimension_level_visibility`（强制启用）。
- 主结论 `confidence` = **最关键维度的置信度**，而非全局最低值。
- 只在**确有跨维度依赖**时局部降级（如下游维度直接依赖上游 failed 维度的输出，见 4.4）。
- 只要标了来源（source_type + source_name + reason）就按"标出处即呈现"输出，**不因是推断就强制压 low**；反向也禁止——不无据给 high。

示例：
- jd-analyzer: high（[据JD] 硬性要求清晰）
- match-diagnosis: high（[据CV] 逐条命中）
- salary 维度: medium（[据知识库] 薪资参考为 stale）
- 主结论 confidence: **high**（最关键维度=匹配度为 high；薪资维度单独标 medium，不连坐拖低主结论）

### 4.2 evidence 聚合

将所有 skill 的 evidence 数组合并，去重，保留来源标注：

```yaml
evidence:
  - "[jd-analyzer] JD 原文第3段：要求5年以上产品经验"
  - "[profile-builder] 简历显示：用户有6年产品经历"
  - "[source-quality-auditor] 薪资范围经验证：来自XX数据集"
```

### 4.3 conflict_markers 聚合

当任何两个来源对同一事实有不同描述时，填写 conflict_markers：

```yaml
conflict_markers:
  - field: "薪资范围"
    source_a: "JD 原文"
    value_a: "月薪 20-30K"
    source_b: "knowledge/salary-data"
    value_b: "该岗位市场均值 35K"
    resolution: "不自动解决，由用户判断"
```

**原则**：主理人不主动解决冲突，只标记并告知用户。

### 4.4 失败 skill 的处理

当某个 skill 返回 failed 状态：

```yaml
skills_invoked:
  - skill_name: "source-quality-auditor"
    status: "failed"
    result_summary: "服务暂时不可用，市场数据未经验证"
```

此时（局部降级，不连坐全局）：
- 删除**直接依赖**该 skill 的声明（不替代、不编造）
- 将受影响维度的 `dimension_level_visibility` 该维度 confidence 降为 low（或列入 `cannot_determine`，若属"非人工不可核实"）
- **不受影响的维度保持各自置信**；主结论 confidence 仍取最关键**可用**维度的置信，不因一个 failed 维度连坐拖低

---

## 5. 追问与编排的协调

当 `required_inputs` 缺失时，先追问，再编排：

```
用户消息不含 jd_text
  └── 发起追问（第1轮）
      └── 用户补充 jd_text
          └── 开始编排（jd-analyzer + ...）
```

**不可以**：先用不完整输入调用 skill，再用结果填补缺口。这会导致 skill 产生低质量输出，污染后续步骤。

---

## 6. 编排超时和降级

如果某个 skill 响应超时（超过合理等待）：

1. 标记该 skill 为 `skipped`（不是 failed）
2. 继续执行不依赖该 skill 的后续步骤
3. 对依赖该 skill 的步骤：列入 `cannot_determine`
4. 最终输出中说明"因 X skill 超时，以下分析未完成"

---

## 7. Pack A 编排链：求职流程管理

### 机会 → 策略 → 追踪 完整链路

```
用户提供目标公司/岗位列表
  阶段 1（并行）:
    ├── jd-analyzer(jd_text)          [如有 JD]
    └── profile-builder(resume_text)  [如有简历]

  阶段 2:
    └── opportunity-intelligence(jd-analyzer.output, profile-builder.output)

  阶段 3（用户确认要投递）:
    └── application-strategist(opportunity-intelligence.output, user_profile)

  阶段 4（持续跟踪）:
    └── application-tracker(application-strategist.output)
```

**规则**：
- `opportunity-intelligence` 依赖 `jd-analyzer`；若无 JD，使用用户描述降级运行
- `application-strategist` 需要机会评估结果；不可在 `opportunity-intelligence` 前调用
- `application-tracker` 是独立状态存储，可在任意阶段读写，不依赖其他 skill 的实时输出

### 人脉开拓链路

```
用户提出内推/人脉需求
  阶段 1:
    └── referral-strategy(user_message, user_profile)

  阶段 2（生成具体消息）:
    └── networking-message-writer(referral-strategy.targets)

  阶段 3（跟进）:
    └── follow-up-message-writer(context)
```

### 每日任务规划

```
阶段 1（并行读取现有状态）:
  ├── application-tracker.read_state()
  └── profile-builder(user_profile)  [如无已有 profile]

阶段 2:
  └── daily-plan-generator(tracker.output, profile.output)
```

---

## 8. Pack B 编排链：面试准备深度工具

### 面试情报 → 模拟 → 复盘 链路

```
阶段 1（并行，市场情报预检）:
  ├── source-quality-auditor(company_context)   [必须先于其他 skill]
  ├── xhs-interview-miner(company, role)
  └── nowcoder-tech-miner(company, role)        [技术岗位时]

阶段 2（等待情报完成）:
  ├── company-interview-playbook(情报汇总)
  └── question-bank-builder(情报汇总, jd_text)

阶段 3（依赖题库和攻略）:
  └── behavioral-story-builder(resume_text, question-bank-builder.themes)

阶段 4（模拟练习）:
  └── mock-interviewer(company-interview-playbook.style, question-bank-builder.questions)

阶段 5（复盘后更新故事库）:
  └── behavioral-story-builder.update(mock-interviewer.debrief_feedback)
```

**规则**：
- `source-quality-auditor` 在 Pack B 中必须先于 `company-interview-playbook` 运行，用于核验公司面试风格信息的可靠性
- `behavioral-story-builder` 可由两条路径触发：简历提炼（正向）或模拟复盘后更新（反向迭代）
- 技术岗位必须额外调用 `technical-interview-coach`；案例类岗位调用 `case-interview-coach`

### 技术面专项链路

```
阶段 1:
  └── nowcoder-tech-miner(company, tech_stack)

阶段 2（等待情报）:
  ├── technical-interview-coach(tech_stack, nowcoder.output)
  └── question-bank-builder(tech_focus)

阶段 3（模拟）:
  └── mock-interviewer(mode: technical, question-bank-builder.output)
```

### 案例面专项链路

```
阶段 1:
  └── case-interview-coach(case_type)

阶段 2:
  ├── question-bank-builder(case_themes)
  └── behavioral-story-builder(business_context)

阶段 3:
  └── mock-interviewer(mode: case, case-interview-coach.framework)
```

---

## 9. Pack C 编排链：市场情报

### 市场情报强制预检规则

**所有 Pack C skill 在输出市场声明前，必须先通过 source-quality-auditor 检验**：

```
Pack C skill 产出含以下任一类型时，强制调用 source-quality-auditor：
  - 薪资区间数字
  - 行业趋势判断
  - 公司竞争格局描述
  - 岗位供需数据
  - 城市行业聚集度描述
```

**来源分级显式标注（强制）**：Pack C 市场声明产出**末尾必须显式标注 source-quality-auditor 的来源分级**——单源 / 多源、权威度。规则：

- 标明每条声明是**单源**还是**多源交叉**，并给出权威度（官方/数据集 > 行业报告 > 社区帖）。
- **同一 URL 多次复用须标"同源"**，不得计作多源交叉。
- **同源社区帖（同一帖子/同一作者搬运/转载）不计作独立交叉源**——多条同源贴仍是单源。
- 仅当来自相互独立的多个来源时，才可声明"多源交叉验证"。

**降级规则（先联网搜，确无网才降级）**：

宿主本就有 WebSearch/WebFetch。市场声明缺实时数据时，**先当场联网搜，不要直接降级到静态知识**：

```
市场声明缺实时数据（或 source-quality-auditor 返回 failed/skipped）:
  1. 先 WebSearch/WebFetch 当场检索该声明（薪资/行业/公司动态/供需比等）
        命中 → 附本轮真实抓取的 URL，标 [实时·未核实·URL·日期]，正常输出
  2. 仅当确实无网（工具不可用 / 反复搜不到）才降级：
        - 改用知识库 / 行业惯例（标 [据知识库,stale] / [行业惯例]）
        - 该维度 confidence 标 low（仅此维度，不连坐主结论）
        - 显式告知用户："已尝试联网检索未果，以下为训练知识/静态知识库估算，可能过时，建议自行核实"
  3. 多源冲突（库口径 vs 实时口径打架）→ 显式并列两方 + 标各自口径（填 conflict_markers），不取中位数、不判 cannot_determine
        冲突并列不限薪资：当用户问某岗位、主动维度涉及竞争格局 / 供需（如"竞争激烈程度""供需比"）
        且多源口径有差异时，同样按 conflict_markers 并列两方口径（与薪资口径处理一致），
        不取中位数、不二选一替用户判断
  4. 禁止伪造：标 [实时·URL] 的 URL 必须本轮真访问过；搜不到就老实写检索路径与空结果
```

### 完整市场情报链路

```
用户提出市场查询
  阶段 1（并行）:
    ├── source-quality-auditor(query)  [必须先行，验证查询范围可信度]
    ├── xhs-interview-miner(company_or_role)   [如涉及具体公司/岗位]
    └── nowcoder-tech-miner(tech_role)         [如涉及技术岗位]

  阶段 2（等待情报汇集）:
    ├── market-radar(汇总情报)
    └── industry-trend-analyst(汇总情报)   [如涉及行业趋势]

  阶段 3（offer 决策场景）:
    └── offer-comparator(market-radar.benchmarks, offer_details)
    └── company-risk-auditor(company_name, market-radar.output)
```

### offer 决策链路

```
阶段 1（并行）:
  ├── source-quality-auditor(company_names)
  ├── market-radar(role, city)
  └── company-risk-auditor(company_name)

阶段 2（等待阶段 1）:
  └── offer-comparator(所有阶段 1 输出)

阶段 3（如用户需要行业视角）:
  └── industry-trend-analyst(company.industry)
```

---

## 10. Pack D 编排链：职业战略规划

### profile-builder 前置规则

**Pack D 所有职业战略 skill 都依赖用户档案，profile-builder 必须在其他 Pack D skill 之前完成**：

```
Pack D skill 调用前的必要条件：
  - user_profile 已存在（来自历史对话或本次 profile-builder 输出）
  OR
  - resume_text 字符数 >= 100（profile-builder 可以实时提取）

如两者均不满足：
  - 先追问用户提供简历或描述背景
  - 不可用空档案调用职业战略 skill（会产生无意义的通用建议）
```

### 完整职业规划链路

```
用户发起职业规划需求
  阶段 1:
    └── profile-builder(resume_text)  [强制先行]

  阶段 2（并行）:
    ├── match-diagnosis(profile.output, target_jd)   [如有目标岗位]
    └── industry-trend-analyst(target_industry)       [如有目标行业]

  阶段 3（等待阶段 2）:
    ├── career-path-planner(profile.output, trend.output)
    └── skill-gap-planner(profile.output, match-diagnosis.gaps)

  阶段 4（如有学习需求）:
    └── learning-roadmap-builder(skill-gap-planner.output)
```

### 转型评估链路

```
阶段 1:
  └── profile-builder(resume_text)

阶段 2（并行）:
  ├── role-transition-advisor(profile.output, target_role)
  └── skill-gap-planner(profile.output, target_role)

阶段 3:
  ├── career-path-planner(transition路径)
  └── learning-roadmap-builder(skill-gap-planner.output)
```

### 读研 vs 工作决策链路

```
阶段 1:
  └── profile-builder(resume_text 或 user_profile)

阶段 2（并行）:
  ├── industry-trend-analyst(target_industry)
  └── market-radar(target_role, city)

阶段 3:
  └── graduate-school-vs-job-advisor(profile.output, market.benchmarks, trend.output)

阶段 4（如需进一步规划）:
  └── career-path-planner(graduate-school-vs-job-advisor.recommendation)
```

---

## 11. 跨 Pack 编排链

### "全局求职规划"（跨 Pack A + D）

触发条件：用户问"我现在该怎么找工作"或"帮我整体规划求职"

```
阶段 1:
  └── profile-builder(resume_text)  [Pack D 前置]

阶段 2（并行）:
  ├── match-diagnosis(profile.output, target_jds)    [Pack A 评估]
  ├── career-path-planner(profile.output)            [Pack D 方向]
  └── skill-gap-planner(profile.output)              [Pack D 差距]

阶段 3:
  ├── application-strategist(match-diagnosis.output)  [Pack A 投递策略]
  └── learning-roadmap-builder(skill-gap-planner.output)  [Pack D 补强]

阶段 4:
  └── daily-plan-generator(所有阶段输出汇总)  [Pack A 今日行动]
```

### "面试机会评估"（跨 Pack A + B + C）

触发条件：用户拿到面试邀请，要求全面准备

```
阶段 1（并行）:
  ├── source-quality-auditor(company_name)       [Pack C 风控]
  ├── jd-analyzer(jd_text)                       [Pack A 解析]
  └── xhs-interview-miner(company, role)         [Pack C 情报]

阶段 2（等待情报）:
  ├── opportunity-intelligence(阶段1输出)        [Pack A 评估值不值]
  └── company-interview-playbook(阶段1输出)      [Pack B 攻略]

阶段 3（决定参加面试后）:
  ├── question-bank-builder(playbook.output)     [Pack B 题库]
  └── behavioral-story-builder(resume_text)     [Pack B 故事]

阶段 4:
  └── mock-interviewer(question-bank.output, playbook.style)  [Pack B 模拟]
```

---

## 12. 续接层（cross-intent continuation）

前面 §2-§11 处理的是**单次调度内**的 sub-skill 编排（一锅端）。本节处理**意图与意图之间**的顺势续接——一个意图做完后，顺势提议最该接的下一个独立意图，让体验像跟懂行的人连贯聊天，而非每次都重新发问。

数据源：`references/next-intent-graph.yaml`（每意图的 `on_complete` 候选 + 触发条件 + handoff_payload）。承载字段：`output_schema.json` 的 `suggested_next`。

### 12.1 三条铁律（与 next-intent-graph.yaml 的 iron_rules 一致）

1. **续接 = 提议 + 用户确认才执行，默认不自动连跳。** `on_complete` 候选只用于「提议」，写进本意图产出的 `suggested_next`，由用户点头才真正调度下一意图。代表绝不自动连跳整条链（防失控长链 / 防越权）。`priority` 仅表达建议强度：`recommended`=情境强相关、应主动点出；`optional`=锦上添花、顺带提一句。两者都不等于自动执行。
2. **会话级输入复用：续接不重复追问。** 本会话已拿到的 `resume_text` / `jd_text` / `user_profile` / `target_company` / `target_profession` 及上一意图产出（如 `interviewHooks` / `gap` / `rewrite_suggestions`），续接时直接喂入、跳过 intent-router 的 `missing_input_questions`。这些就绪入参写进 `suggested_next[].ready_inputs`。仅当下一意图仍有真实缺口（既不在会话上下文、也不在上一意图 handoff_payload 里）时才追问缺口字段。
3. **区分 `secondary_skills` 与 `suggested_next`。** `secondary_skills`（intent-router）= 本次同一调度内的辅助 worker，一锅端、立即执行；`suggested_next`（本图）= 本意图完成后顺势提议的下一个独立意图，分步、条件触发、需确认。

### 12.2 续接执行流程

```
意图 X 完成产出
  └── 读 next-intent-graph.yaml 的 X.on_complete 候选
      └── 对每个候选，判定其 condition 是否命中（基于本次产出 + 会话上下文）
          ├── 命中 → 写进 suggested_next：{ next_intent, reason, ready_inputs(=handoff_payload∩已就绪), priority }
          └── 未命中 → 不写
  └── 向用户提议（按 priority 排序，recommended 在前），等用户选择
      ├── 用户确认某条 → 以该意图为新主意图，复用 ready_inputs，跳过已覆盖字段的追问，进入 §2-§11 编排
      └── 用户不选 / 选别的 → 不执行，结束本轮
```

### 12.3 诊断 → 面试核心链（北极星样板）

把 `match-diagnosis` 的 `gap` 与 `campus_diagnosis` 的 `interviewHooks` 定义为下游意图的**合法入参**：

```
campus_diagnosis 完成（产出 diagnosis.interviewHooks / diagnosis.dimensions[].gap / rewrite_suggestions）
  ├── interviewHooks 非空 → 提议 mock_interview（recommended）
  │       handoff_payload: [resume_text, target_profession, interviewHooks, jd_text]
  │       用户确认 → mock-interviewer 直接拿 interviewHooks 当弹药出追问题（不重问背景）
  │       缺 JD / 缺目标公司不得退化为脱离 interviewHooks 的通用题——interviewHooks 是强制题源，
  │       缺 JD / 目标公司只降级"某公司真题风格"这一维，其余题仍逐条由 interviewHooks 派生
  ├── interviewHooks 非空 + 简历有可讲经历 → 提议 build_stories（recommended）
  ├── dimensions[].gap 非空 → 提议 identify_skill_gaps（recommended）→（有时间窗）build_learning_roadmap（optional）
  ├── rewrite_suggestions 非空 → 提议 tailor_resume 复核（recommended）
  └── target_company 已知 → 提议 company_check / get_company_playbook（optional）

match_diagnosis 完成
  ├── 强匹配 → tailor_resume + plan_application_strategy（recommended）
  ├── 有 gap → identify_skill_gaps（recommended，handoff gap）
  └── 任意 → interview_prep（optional）
```

> 端到端样板见 `examples/continuation-campus-to-mock.md`：campus 诊断 → 代表提议模拟面试（带 interviewHooks 作 handoff_payload）→ 用户确认 → mock 接住。
