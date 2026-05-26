---
name: interview-intelligence
description: >
  面试情报聚合。当用户准备投递或已收到面试邀请，
  询问"这家公司面试流程是什么"、"面试考什么"、
  "怎么准备这个岗位的面试"时触发。
  聚合特定公司+岗位的面试流程、题型、考察重点。
allowed-tools: [Read, Grep]
---

# interview-intelligence — 面试情报聚合

## 职责

为特定公司和岗位聚合结构化面试情报，涵盖笔试、群面、业务面、HR 面等中国市场特有流程阶段。
**无实时数据时必须声明降级，不得凭空编造公司具体题目或流程细节。**

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
| `insufficient` | 无任何该公司/岗位相关面经，降级到通用知识图谱 |

## 降级行为

当无实时数据时，输出基于知识图谱通用信息，`confidence` 标注为 `low`，
`cannot_determine` 列出无法确认的具体细节，禁止编造具体题目或流程轮数。

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
