---
name: jd-analyzer
description: >
  JD 结构化分析。当用户粘贴职位描述、问"这个 JD 怎么样"、
  "值不值得投"、"岗位要求是什么"时触发。
  解析显性/隐性要求，识别风险信号和中国求职黑话。
allowed-tools: [Read, Grep]
---

# jd-analyzer — JD 结构化分析

## 职责

将职位描述（JD）解析为结构化字段，识别显性和隐性要求，标记中国职场风险信号。
**所有隐性要求推断必须附带 `inference_reason`，禁止无依据的负面标签。**

## 解析维度

### 基本信息 `basic`

| 字段 | 说明 | 缺失时 |
|---|---|---|
| `title` | 职位名称 | `null` |
| `company` | 公司名称 | `null` |
| `location` | 工作地点 | `null` |
| `salary_range` | 薪资范围（原文字符串） | `null`，**禁止推断** |
| `employment_type` | 用工类型（全职/兼职/实习/外包） | `"full_time"`（默认）或 `null` |

### 要求解析 `requirements`

#### 显性要求 `explicit[]`

原文中明确列出的要求，每项含：
- `text`：原文描述
- `type`：`"education"` / `"experience"` / `"technical"` / `"soft"` / `"other"`
- `priority`：`"must_have"`（必须） / `"nice_to_have"`（加分项）
  - 含「熟练」「必须」「要求」→ `must_have`
  - 含「优先」「加分」「最好」→ `nice_to_have`
  - 无标注 → 默认 `must_have`

#### 隐性要求 `implicit[]`

从 JD 语义推断的要求，每项含：
- `text`：推断的要求描述
- `inference_reason`：推断依据（引用原文片段）
- `confidence`：`"high"` / `"medium"` / `"low"`

隐性要求推断规则：
- 「带团队」→ 推断需要管理经验
- 「独立完成整个项目」→ 推断接受加班或无额外支持
- 「快速迭代」→ 推断高频发布压力
- 薪资区间很宽（如 8k-30k）→ 推断实际薪资取决于谈判，非透明

### 风险信号 `risk_signals[]`

见 `references/jd-risk-signals.md` 知识图谱。每项含：
- `signal`：原文中的表述
- `real_meaning`：实际含义
- `severity`：`"red"` / `"yellow"` / `"notice"`
- `evidence`：原文片段

### 职责 `responsibilities[]`

原文职责列表，保留原始表述：
- `text`：职责原文
- `category`：`"core"` / `"ancillary"` / `"unclear"`

### 福利 `benefits[]`

原文福利列表，每项含 `text` 和 `verified`（是否可验证，如「五险一金」可验证，「有竞争力薪酬」不可验证）。

### 公司背景 `company_context`

从知识图谱和 JD 内容推断：
- `stage`：发展阶段（`"startup"` / `"growth"` / `"mature"` / `"unknown"`）
- `signals[]`：判断依据（如「处于高速发展期」→ stage: startup）

## 中国市场术语解析

| 术语 | 含义 |
|---|---|
| 五险一金 | 养老/医疗/失业/工伤/生育保险 + 住房公积金（法定最低） |
| 六险一金 | 五险一金 + 补充医疗或大病保险 |
| 十三薪 | 年底多发一个月工资（=月薪 × 13） |
| 十四薪 | 月薪 × 14，含年中奖金 |
| 校招 | 面向应届毕业生的招聘（通常 9-12 月） |
| 社招 | 面向有工作经验人员的招聘 |
| 大小周 | 隔周休息，实际周工作约 6 天 |
| 996 | 工作时间 9:00-21:00，每周 6 天（非法但隐晦存在） |
| KPI / OKR | 绩效考核体系；无说明时按标准解析 |
| 期权 | 股票期权，需关注行权条件和锁定期 |
| 虚拟股 | 非真实股票，仅享受分红权 |
| 扁平化管理 | 层级少；有时意味着职级晋升空间有限 |

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | JD 内容 >= 200 字，包含职位/公司/要求 |
| `medium` | 100-199 字，或缺少部分关键段落 |
| `low` | < 100 字 |
| `insufficient` | 输入不是 JD（无职位描述特征） |

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` | 已知公司的类型、发展阶段、已知风险信号 | 解析 `company_context` 字段时 | `company_context.stage` 置为 `unknown`，不补充知识图谱信息 |
| `../_career-skills-shared/knowledge/company-taxonomy/company-types.yaml` | 公司类型分类（互联网/传统/外企等）辅助阶段判断 | JD 中公司信息不足时 | 仅依赖 JD 原文判断 |
| `../_career-skills-shared/knowledge/market-vocabulary/china-job-search-terms.yaml` | 中国求职黑话词汇表（大小周/996/虚拟股等）用于风险信号识别 | 解析 `risk_signals` 时 | 使用内置术语表，覆盖范围可能较窄 |

## 产品原则适用

本 skill 遵循 `shared/policies/product-principles.md` 中的两项核心原则。

### 信息不足时 (Ask-before-judging)
- 当 JD 原文少于 100 字时，视为信息不足
- 信息不足时不能输出隐性要求推断（`implicit[]` 字段），因为语义依据不足，推断会脱离原文
- 低置信度时只输出可从原文提取的显性字段（`basic`、`requirements.explicit`、`responsibilities`），不补全 `company_context` 和 `implicit` 推断
- 如需更准确分析，追问：「请提供更完整的 JD 原文，包含职位职责和任职要求」

### 出处-思考-观点 (Source-Reason-Opinion)
- Source: 所有字段必须引用 JD 原文片段作为依据；隐性要求每项附 `inference_reason`，引用原文触发语句
- Reasoning: 在 `risk_signals` 的 `real_meaning` 字段中体现从原文表述到风险含义的推理过程
- Opinion: `company_context.stage` 和 `implicit` 字段标注 `confidence` 等级（high/medium/low），推断类内容标注推断依据而非陈述为事实
