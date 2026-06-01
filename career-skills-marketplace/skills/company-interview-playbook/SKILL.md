---
name: company-interview-playbook
description: >
  公司面试攻略手册。当用户说"给我做一个XX公司的面试攻略"、
  "系统整理这家公司的面试全攻略"、"从零到offer怎么准备"时触发。
  为特定公司生成综合面试攻略手册，含公司画像、流程全图、文化心法、踩坑预警。
allowed-tools: [Read, Grep]
---

# company-interview-playbook — 公司面试攻略手册

## 职责

为特定公司生成一份系统化的面试攻略手册，整合公司文化、面试流程、备考策略、薪资谈判等模块。
**优先经上游 interview-intelligence / salary-radar 取实时情报；缺失才降级并标注，不得编造具体薪资数字或面试内部细节。**

## 手册结构

### 公司画像 `company_profile`

- `company_name`：公司名称
- `stage`：发展阶段（上市/独角兽/成长期/创业期）
- `culture_keywords[]`：核心文化关键词（如「阿里味」「腾讯赛马」）
- `hiring_volume`：招聘体量（大量招聘/精招/收缩期）
- `reputation_summary`：口碑概述（中性客观）
- `common_pain_points[]`：常见员工槽点（来自真实反馈）

### 面试流程全图 `interview_process[]`

各阶段详情（见 interview-intelligence skill 的 interview_flow 结构），
额外包含：
- `key_assessment_angle`：本轮面试官重点关注的维度
- `pass_rate_estimate`：估算通过率（粗略区间）

### 文化契合攻略 `culture_fit_tips[]`

- `tip`：攻略要点
- `example_answer_pattern`：体现文化的回答模式（示例句式）
- `anti_pattern`：常见失误（要避免的表达）

### 常见踩坑预警 `common_pitfalls[]`

- `pitfall`：踩坑场景
- `consequence`：可能后果
- `avoidance_strategy`：规避策略

### 薪资谈判注记 `salary_negotiation_notes`

- `salary_range_estimate`：薪资范围估算（标注数据来源和时间，无数据时为 null）
- `negotiation_timing`：最佳谈判时机
- `leverage_points[]`：有效谈判筹码
- `taboos[]`：薪资谈判禁忌

## 中国市场特殊文化注意事项

| 文化现象 | 代表公司 | 面试体现 |
|---|---|---|
| 阿里味/价值观面 | 阿里系 | HR面重点考察「客户第一」「拥抱变化」 |
| 腾讯赛马 | 腾讯 | 强调个人能力，竞争性强 |
| 字节飞速 | 字节跳动 | 强调效率、直接、数据驱动 |
| 家文化 | 中小公司 | 可能要求超时工作，注意识别 |

## 取数与降级行为

优先经上游 interview-intelligence / salary-radar 获取该公司实时情报（本 skill 不单独联网，走上游取数）。
仅当上游也缺失时才降级并标注：
- `company_profile` 基于知识图谱通用画像，标注置信度
- `salary_negotiation_notes.salary_range_estimate` 为 null，不推断具体数字
- `interview_process` 来自类似规模公司通用规律，标注来源

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
