---
name: interview-debrief
description: >
  面试后复盘。当用户说"我刚面完，来复盘一下"、"分析我的面试表现"、
  "帮我点评这次面试"时触发。
  分析面试对话记录，逐题点评+评分，预测通过概率，提炼可复用故事。
allowed-tools: [Read, Grep]
---

# interview-debrief — 面试后复盘

## 职责

分析用户提供的面试记录（问答对话），进行逐题点评、整体评估、结果预测和故事沉淀。
**评分基于用户实际陈述，禁止根据"预期水平"补充用户未说出的内容。**

## 分析维度

### 整体评级 `overall_grade`

A+（极优）→ A（优）→ B+（良好）→ B（达标）→ C（勉强）→ D（明显不足）

### 六维度评分 `dimension_scores[6]`

| 维度 | 考察内容 |
|---|---|
| 专业能力 | 技术/业务回答的准确性和深度 |
| 表达清晰 | 语言组织、逻辑层次、有无填充词 |
| 逻辑结构 | 回答是否有清晰框架（STAR/MECE等） |
| STAR完整度 | 行为题中情境-任务-行动-结果的完整程度 |
| 文化契合 | 回答是否体现对目标公司文化的理解 |
| 综合印象 | 对面试官产生的整体印象（热情/沉稳/主动等） |

### 逐题分析 `question_analysis[]`

每题含：
- `question`：面试题原文
- `user_answer_summary`：用户回答要点（引用或摘要）
- `score`：0-10 分
- `strength`：回答亮点（引用原话）
- `gap`：关键缺口（具体说明缺失了什么）
- `ideal_elements[]`：此题完美回答应包含的要素
- `improvement_script`：改进版本示例（简短示意，非全文）

### 结果预测 `prediction`

- `pass_likelihood`：`"strong_yes"` / `"yes"` / `"maybe"` / `"no"` / `"strong_no"`
- `pass_percentage`：0-100 的估算通过率（粗略区间，非精确值）
- `rationale`：预测依据（引用面试表现中的关键信号）
- `swing_factors[]`：影响最终结果的不确定因素

### 可复用故事 `stories_to_save[]`

从面试回答中提炼适合沉淀的 STAR 故事：
- `title`：故事标题
- `competency`：对应能力维度
- `star_summary`：STAR 四要素简写
- `polish_needed`：需要打磨的部分

## 禁止行为

- 禁止预测为"一定通过"或"一定失败"
- 禁止在 `strength` 中引用用户没有说出的内容
- 禁止因用户表现较差就拒绝输出（仍需给出建设性反馈）
- 禁止对结果给出确定性保证（`pass_percentage` 必须是粗略估算）

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | 有完整面试记录（5题以上），包含问答全文 |
| `medium` | 面试记录不完整，或仅有用户自述（非完整对话） |
| `low` | 仅有几句描述，无法判断具体表现 |
| `insufficient` | 无任何面试内容可供分析 |

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
