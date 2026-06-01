---
name: question-bank-builder
description: >
  面试题库构建。当用户说"帮我整理这家公司的面试题"、"给我做一个XX岗的题库"、
  "系统整理面试题，按类型分类"时触发。
  为特定公司+岗位构建结构化面试题库，标注来源和出现频率。
allowed-tools: [Read, Grep]
---

# question-bank-builder — 面试题库构建

## 职责

聚合特定公司和岗位的真实面试题，构建结构化题库，按维度分类，标注来源和频率。
**所有题目必须来自真实面经或已知知识体系，禁止凭空生成"可能出现"的题目而不注明来源。**

## 题型配比（按目标职业）

构建题库前，先按目标职业从 `../_career-skills-shared/knowledge/interview-focus.yaml` 取该职业的题型配比，
分配各类别的题量与题型权重。

- `Read: ../_career-skills-shared/knowledge/interview-focus.yaml`，定位目标职业条目，取其四档权重
  `{behavioral / case_study / technical / culture_fit}`（四项之和 = 100，单位为百分比）。
- 按权重分配题量：某档题量 = `round(total_questions × 权重 / 100)`，权重越高该题型出题越多。
- 配比到分类体系的映射（见下表「类别」）：
  - `behavioral` → `behavioral`
  - `case_study` → `case_product` / `case_business`（按职业属性归并：产品/运营走前者，咨询/策略走后者）
  - `technical` → `technical_cs` / `technical_domain` / `system_design`（技术岗内部再按子方向细分）
  - `culture_fit` → `cultural_fit`（`motivation` 求职动机题随 `culture_fit` 档一并分配）
- 在 `coverage.by_category` 中体现按配比分配后的各类别题量，使其与目标职业的题型权重一致。

**降级**：若 `interview-focus.yaml` 未命中目标职业，则按通用配比（behavioral / technical / case_study / culture_fit
≈ 30 / 30 / 20 / 20）分配，并在 `gaps[]` 标注「未命中职业题型配比，按通用权重」。

## 题库结构

### 题目分类 `question_bank[]`

每道题含：
- `id`：唯一标识
- `question`：题目原文或标准化表述
- `category`：分类（见下表）
- `subcategory`：细分方向（如技术题下的「操作系统」）
- `difficulty`：`"easy"` / `"medium"` / `"hard"`
- `frequency`：出现频率（`"very_high"` / `"high"` / `"medium"` / `"low"`）
- `source`：来源描述（如「牛客2025-2026高频」或「岗位知识图谱」）
- `answer_hint`：回答要点提示（非完整答案）
- `time_estimate`：预计回答时长（分钟）

### 题目分类体系

| 类别 | 适用岗位 | 说明 |
|---|---|---|
| `behavioral` | 所有岗位 | STAR结构行为题 |
| `technical_cs` | 技术岗 | 计算机基础（数据结构/OS/网络/数据库） |
| `technical_domain` | 技术岗 | 领域专业技术（后端/前端/算法/数据等） |
| `case_product` | 产品/运营 | 产品设计/业务分析案例题 |
| `case_business` | 咨询/策略 | 商业分析/市场估算题 |
| `motivation` | 所有岗位 | 求职动机/离职原因/职业规划 |
| `cultural_fit` | 所有岗位 | 价值观/文化契合 |
| `system_design` | 技术岗 | 系统设计/架构设计 |

### 覆盖度 `coverage`

- `total_questions`：总题目数
- `by_category`：各类别题目数
- `estimated_coverage_percentage`：估算覆盖率（基于已知出题范围）

### 空白区域 `gaps[]`

题库中未覆盖的重要方向：
- `area`：空白领域
- `reason`：为何有空白（无面经数据 / 该方向出题不固定等）
- `workaround`：临时应对建议

## 降级行为

当无实时数据时：
- 基于知识图谱的通用题目（明确标注 `source: "岗位知识图谱通用"`）
- `gaps[]` 列出无法从实时数据获取的具体题目
- 禁止将推断题目标注为"真实高频"

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
