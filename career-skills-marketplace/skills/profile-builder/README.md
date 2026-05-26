# profile-builder

用户画像构建 skill — 从简历文本或用户对话中提取结构化能力画像。

## 核心原则

**零幻觉**：每个提取字段必须附带 `evidence_source`，指向原始文本。未提及的技能不出现在输出中。

## 使用场景

- 用户提交简历，求职主理人需要解析背景
- 进行 JD 匹配诊断前的画像构建
- 用户用自然语言描述背景，需要结构化存储

## 输入

至少提供以下之一：

| 字段 | 类型 | 最小长度 |
|---|---|---|
| `resume_text` | string | 30 字符 |
| `user_background` | string | 20 字符 |

可选提供 `existing_profile` 用于增量更新。

## 输出结构

```
profile
├── basic          # 姓名、学历、工龄、当前职位
├── skills
│   ├── technical  # 技术技能（含 proficiency + evidence）
│   ├── soft       # 软技能
│   └── languages  # 语言能力
├── experience[]   # 工作经历（含成就列表）
├── strengths[]    # 优势（有据可查）
├── weaknesses[]   # 劣势（有据可查）
├── constraints    # 地点/薪资/拒绝条件
└── career_intent  # 目标职位/行业/紧迫度
```

所有字段缺失时值为 `null`，不做推断。

## 置信度说明

| 等级 | 含义 |
|---|---|
| `high` | 完整简历，关键字段齐全（>= 300 字） |
| `medium` | 简历残缺或依赖对话（100-299 字） |
| `low` | 信息极少（< 100 字） |
| `insufficient` | 输入不是简历/背景描述，返回 error |

## 来源冲突处理

当简历与对话描述同一字段有矛盾时，**不做判断**，在字段下双存记录并标记 `"conflict": true`。

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 完整简历 → 高置信度画像 |
| `examples/low-evidence.md` | 信息极少 → 稀疏画像 |
| `examples/bad-input.md` | 非简历输入 → error |
| `examples/source-conflict.md` | 简历/对话冲突 → 双存 |

## 限制

- 不解析 PDF/Word 格式，只处理纯文本
- 不做薪资数字标准化（保留原文字符串）
- 不推断未明确提及的技能或经历
