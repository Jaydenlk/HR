---
name: nowcoder-tech-miner
description: >
  从牛客网提取技术面经和笔试题，结构化供其他 skill 使用。
  当用户询问牛客网面经、技术笔试题时触发。
  来源上限 B 级；优先当场 WebSearch/WebFetch 搜近 6 个月内容并附来源 URL+时效标注，确实搜不到才返回空数组。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# nowcoder-tech-miner — 牛客网技术面经提取

## 核心职责

从牛客网实时搜索和提取技术面试经验和笔试题，结构化为可用格式。

**严格约束：**
1. 牛客网来源可靠性上限为 B 级（技术社区，质量高于小红书）
2. 优先 WebSearch/WebFetch 当场搜近 6 个月内容、附来源 URL+时效标注；确实搜不到再返回空数组并写明已尝试的检索路径与关键词，confidence: insufficient
3. 禁止从训练数据推断笔试题目

## 与 xhs-interview-miner 对比

| 维度 | nowcoder-tech-miner | xhs-interview-miner |
|------|--------------------|--------------------|
| 来源上限 | B 级 | C 级 |
| 技术题可靠性 | 较高（用户有技术背景） | 较低（混杂推广） |
| 适用场景 | 技术岗位笔试/面试 | 公司文化/非技术岗 |

## 检索与降级行为

默认姿态：先用 WebSearch/WebFetch 当场搜近 6 个月的牛客网技术面经与笔试题，命中即结构化输出、逐条附来源 URL 与时效标注（标「实时·未核实·日期」）。
只有在确实搜不到（无网、检索无结果）时才降级：
1. `confidence` 设为 `insufficient`
2. `mined_posts` 和 `technical_questions` 返回空数组
3. `next_actions` 引导用户手动访问牛客网，并写明已尝试的检索路径与关键词

## source_audit 动态置信度调整

当调用方传入 `source_audit`（来自 `source-quality-auditor` 的审计结果）时，
本 skill 以审计结果中的 `credibility_ceiling` 动态调整本次输出的可信度上限。

- **有 source_audit 时**：读取 `source_audit.credibility_ceiling`，以该等级作为本次输出的最高允许 `credibility_grade`。
- **无 source_audit 时**：回退到硬编码上限 B 级（牛客网技术社区内容可信度固定上限）。

## 输出字段说明

### mined_posts[]
- `post_id`：帖子标识
- `content_type`：interview_experience / online_test / offer_report
- `interview_rounds[]`：面试轮次
- `result`：结果（offer/rejected/pending/unknown）
- `credibility_grade`：可信度（上限 B）

### technical_questions[]
技术题目，每项含：
- `question`：题目描述（来自原文）
- `category`：algorithm / system_design / language_specific / database / network / project_related / other
- `difficulty`：easy / medium / hard / unknown
- `source_post_id`：来源帖子
- `frequency`：多帖出现次数（高频题重点关注）
