---
name: interview-intelligence
description: >
  面试情报聚合。当用户准备投递或已收到面试邀请，
  询问"这家公司面试流程是什么"、"面试考什么"、
  "怎么准备这个岗位的面试"时触发。
  聚合特定公司+岗位的面试流程、题型、考察重点。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# interview-intelligence — 面试情报聚合

## 职责

为特定公司和岗位聚合结构化面试情报，涵盖笔试、群面、业务面、HR 面等中国市场特有流程阶段。
**遇到时效信息（公司近期面试流程/高频题/考官风格）先用 WebSearch/WebFetch 搜近 6 个月真实面经，命中即引用并附来源 URL、标注「实时·未核实·日期」；确实搜不到才降级到通用框架，并写明已尝试的检索路径，不得凭空编造公司具体题目或流程细节。**

## 情报维度

### 面试流程 `interview_flow[]`

每轮面试含：
- `stage`：阶段名（笔试/简历筛选/电话面/群面/业务面1/业务面2/HR面/总监面/体检/背调）
- `description`：本轮考察重点
- `typical_duration`：典型时长
- `format`：`"online"` / `"offline"` / `"phone"` / `"group"` / `"written_test"`
- `confidence`：数据来源置信度

### 常见问题 `common_questions[]`

每题含：
- `question`：问题原文或典型表述
- `category`：`"behavioral"` / `"technical"` / `"case"` / `"cultural_fit"` / `"motivation"`
- `frequency`：`"very_high"` / `"high"` / `"medium"`
- `source_hint`：来源提示（如「牛客/看准近6个月高频」）

#### 题型配比与出题逻辑

按目标职业从 `../_career-skills-shared/knowledge/interview-focus.yaml` 取该职业的题型配比
（`{behavioral, case_study, technical, culture_fit}`，四项之和 = 100），以此分配 `common_questions[]` 的
题量与题型权重：

- 将配比按比例换算为各 `category` 的目标题数（如某职业 `behavioral: 40 / case_study: 30 / technical: 20 / culture_fit: 10`，
  则在 12 道题里大致出 5 / 4 / 2 / 1 道），高权重题型多出、低权重题型少出。
- 配比中的字段映射到 `common_questions[].category`：`behavioral→behavioral`、`case_study→case`、
  `technical→technical`、`culture_fit→cultural_fit`（`motivation` 不在配比内，按公司/岗位实际面经补充）。
- 仍受「句句有源」约束：配比只决定**每类出几道**，每道题本身必须有 `source_hint`（真实面经或知识图谱通用题库），
  无来源的具体题目不得为凑配比而编造。
- 该职业不在 `interview-focus.yaml` 中、或文件不可用时降级使用均衡配比（四类等权），并在 `cannot_determine` 注明未取到定向题型配比。

### 备考优先项 `preparation_priorities[]`

按优先级排序的备考建议，每项含：
- `priority`：`"critical"` / `"high"` / `"medium"`
- `area`：备考方向
- `rationale`：为何优先（引用证据）

### 红线预警 `red_flags_to_watch[]`

面试中需警惕的情况：
- `signal`：信号描述
- `interpretation`：可能含义
- `severity`：`"red"` / `"yellow"`

## 中国市场面试特殊流程

| 流程 | 说明 | 适用公司类型 |
|---|---|---|
| 笔试 | 技术题/行测/逻辑题在线测评 | 大厂/国企/金融 |
| 群面（无领导小组讨论） | 6-8 人讨论商业案例 | 快消/咨询/互联网大厂 |
| 业务面 | 直属 leader 考察专业能力 | 所有 |
| HR 面 | 薪资谈判+文化契合+背景核实 | 所有 |
| 背景调查 | 前雇主核实+学历认证 | 大厂/金融/外企 |
| 压力面 | 故意刁难测试心理素质 | 部分咨询/销售岗 |

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | 有近6个月真实面经，公司和岗位精确匹配 |
| `medium` | 面经时间超过1年，或公司匹配但岗位仅相近 |
| `low` | 仅有公司名，无岗位面经；或面经超过2年 |
| `insufficient` | 先经 WebSearch/WebFetch 检索仍无任何该公司/岗位相关面经，确实搜不到才降级到通用知识图谱 |

## 降级行为

遇到时效信息先用 WebSearch/WebFetch 搜近 6 个月真实面经：命中即引用，附来源 URL，标注「实时·未核实·日期」。
确实搜不到才降级——输出基于知识图谱通用信息，`confidence` 标注为 `low`，
`cannot_determine` 列出无法确认的具体细节，并写明已尝试的检索路径（搜了哪些关键词/站点），禁止编造具体题目或流程轮数。

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。

## source_audit 动态置信度调整

当调用方传入 `source_audit`（来自 `source-quality-auditor` 的审计结果）时，
本 skill 以审计结果中的 `credibility_ceiling` 作为置信度上限，替代内置的固定上限（默认 B 级）。

- **有 source_audit 时**：读取 `source_audit.credibility_ceiling`，将其作为本次输出的最高允许置信度等级。
- **无 source_audit 时**：回退到硬编码上限 B 级（`confidence` 最高为 `medium`）。

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/interview-question-taxonomy.yaml` | 面试题类型分类和通用高频题库，用于在无实时面经时生成备考优先项 | 无实时面经数据（confidence: insufficient）时降级使用 | 输出仅含通用面试知识，confidence 置为 low，cannot_determine 说明缺失的定向情报 |
| `../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` | 已知公司的面试风格（interview_style）和流程特征 | 查询目标公司的面试流程类型时 | 面试风格标注为 unknown，仅给出岗位通用流程框架 |
| `../_career-skills-shared/knowledge/company-taxonomy/company-types.yaml` | 公司类型与典型面试流程的映射（如大厂/国企/外企的流程差异） | 无公司精确数据时按公司类型推断流程 | 仅输出通用面试流程，不做公司类型推断 |
| `../_career-skills-shared/knowledge/interview-focus.yaml` | 各目标职业的题型配比（`{behavioral/case_study/technical/culture_fit}` 和 = 100），用于分配 `common_questions[]` 的题量与题型权重 | 生成 `common_questions[]` 时，按目标职业取配比换算各 `category` 目标题数 | 该职业缺配比或文件不可用时降级为四类均衡配比，`cannot_determine` 注明未取到定向题型配比 |

## 产品原则适用

本 skill 遵循 `../_career-skills-shared/policies/product-principles.md` 中的两项核心原则。

### 信息不足时 (Ask-before-judging)
- 当目标公司不在知识图谱（`companies.seed.yaml`）时，先用 WebSearch/WebFetch 搜近 6 个月真实面经（关键词如「公司名 岗位 面经 2026 牛客/小红书」），命中即引用、附来源 URL、标注「实时·未核实·日期」
- 检索仍搜不到时才视为信息不足；此时不能输出具体面试题（`common_questions[]` 中的 `question` 字段），因为无来源支撑的具体题目属于编造，会误导用户备考方向
- 信息不足降级时只给出通用流程框架（按公司类型：大厂/国企/外企/初创推断流程轮数），`confidence` 标注为 low，`cannot_determine` 列明缺失的定向情报，并写明已尝试的检索路径（搜了哪些关键词/站点）
- 追问：「我搜了近期面经但没找到该公司该岗位的可靠来源，您手头有近期面经链接（如牛客/小红书帖子）吗？这将帮助我提供更精准的备考建议」

### 出处-思考-观点 (Source-Reason-Opinion)
- Source: `common_questions` 每题必须附 `source_hint`（如「牛客/看准近6个月高频」），无来源题目不得出现在输出中
- Reasoning: `preparation_priorities` 每项的 `rationale` 字段说明「为何该方向是优先级」，引用面经数据或公司类型推断依据
- Opinion: `interview_flow` 每轮的 `confidence` 字段区分「已有面经数据支撑」与「基于公司类型推断」，`red_flags_to_watch` 标注 severity 并说明推断基础
