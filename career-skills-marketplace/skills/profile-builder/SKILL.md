---
name: profile-builder
description: >
  用户画像构建。当需要了解用户背景、解析简历、构建能力画像时触发。
  从简历文本或用户对话中提取结构化画像，每个字段标注 evidence 来源。
allowed-tools: [Read, Grep]
---

# profile-builder — 用户画像构建

## 职责

从简历文本或用户对话中提取结构化能力画像。每个提取字段必须附带 `evidence_source`，
指向支撑该字段的原始文本片段或对话轮次。**禁止推断未明确提及的技能或经历。**

## 输入来源

| 来源类型 | 字段 | 处理方式 |
|---|---|---|
| 简历文本 | `resume_text` | 全文解析，按段落标记证据 |
| 用户对话 | `user_background` | 逐句提取，标注对话轮次 |
| 混合输入 | 两者均提供 | 以 `resume_text` 为主，`user_background` 补充，冲突时双存 |

## 提取维度

### 基本信息 `basic`

| 字段 | 说明 | 缺失时 |
|---|---|---|
| `name` | 姓名 | `null`，evidence: "not_provided" |
| `education` | 最高学历（学校、专业、学位） | `null` |
| `years_of_experience` | 工作年限（数字） | 从工作经历推算；无法推算则 `null` |
| `current_role` | 当前/最近职位 | `null` |

### 技能 `skills`

- `technical[]`：每项含 `name`、`proficiency`（自评/推断）、`evidence_source`
  - proficiency 取值：`"mentioned"`（仅提及）、`"used_in_project"`（有项目佐证）、`"expert_claim"`（自称专家）
  - 禁止添加未出现在原文中的技术栈
- `soft[]`：软技能，每项含 `name`、`evidence_source`
- `languages[]`：语言能力，含 `language`、`level`、`evidence_source`

### 工作经历 `experience[]`

每条记录：
- `company`：公司名
- `role`：职位
- `duration`：时间段（原文字符串，不做格式转换）
- `achievements[]`：每条成就/职责原文，含 `evidence_source`

### 优势与劣势

- `strengths[]`：每项含 `description`、`evidence_source`；只写简历/对话中有明确支撑的
- `weaknesses[]`：每项含 `description`、`evidence_source`；通常从隐性信号推断（如：频繁跳槽）

### 求职约束 `constraints`

| 字段 | 说明 |
|---|---|
| `location` | 期望城市/可接受城市 |
| `salary_expectation` | 期望薪资（原文字符串） |
| `deal_breakers[]` | 明确拒绝的条件 |

### 求职意向 `career_intent`

- `target_roles[]`：期望职位
- `industry_preference[]`：行业偏好
- `urgency`：求职紧迫程度（`"active"`/`"passive"`/`"unknown"`）

## 处理规则

### 缺失字段

所有未出现的字段统一标记：
```json
{ "value": null, "evidence": "not_provided" }
```

### 来源冲突

当两个来源对同一字段有不同描述时，**不做判断**，保留两条记录：
```json
{
  "current_role": {
    "source_a": { "value": "高级工程师", "evidence": "简历标题行" },
    "source_b": { "value": "初级工程师", "evidence": "用户对话：「我刚晋升不久」" },
    "conflict": true
  }
}
```

### 置信度

整体画像输出 `confidence` 字段：
- `"high"`：有完整简历，关键字段齐全
- `"medium"`：简历残缺或信息量不足
- `"low"`：输入极少（< 50 字）
- `"insufficient"`：输入不是简历/背景描述

### 幻觉防护

- 输出中的每项技能、每段经历，必须能在原文中找到对应的 `evidence_source`
- 若无法找到对应原文，该字段必须为 `null` 或省略
- 禁止根据职位名称推断技能（如：看到"后端工程师"不能自动添加 Java/Python）

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
