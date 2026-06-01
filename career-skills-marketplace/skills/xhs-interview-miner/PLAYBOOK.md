---
name: xhs-interview-miner
description: >
  从小红书提取面试经验，结构化供其他 skill 使用。
  当用户询问小红书面经、某公司面试体验时触发。
  内容可靠性上限为 C 级；优先当场 WebSearch/WebFetch 搜近 6 个月内容并附来源 URL+时效标注，确实搜不到才返回空数组。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# xhs-interview-miner — 小红书面经提取

## 核心职责

从小红书实时搜索和提取面试经验帖，结构化为其他 skill 可用的格式。

**严格约束：**
1. 小红书来源可靠性上限为 C 级（混杂推广内容）
2. 优先 WebSearch/WebFetch 当场搜近 6 个月内容、附来源 URL+时效标注；确实搜不到再返回空数组并写明已尝试的检索路径与关键词，confidence: insufficient
3. 禁止从训练数据推断面试题目或流程

## 小红书内容特点

| 特点 | 影响 |
|------|------|
| 混杂真实面经和推广内容 | 所有来源上限 C 级 |
| 用户身份无法验证 | is_promotional 标记必填 |
| 内容时效性参差不齐 | 超过 6 个月的帖子降级 |
| 推广笔记通常有明显特征 | 见 references/xhs-quality-signals.md |

## 推广内容识别规则

见 `references/xhs-quality-signals.md`。疑似推广笔记：
- `is_promotional: true`，不纳入 `usable_count`
- 不用作面试题素材

## 检索与降级行为

默认姿态：先用 WebSearch/WebFetch 当场搜近 6 个月的小红书面经，命中即结构化输出、逐条附来源 URL 与时效标注（标「实时·未核实·日期」）。
只有在确实搜不到（无网、检索无结果）时才降级：
1. `confidence` 设为 `insufficient`
2. `mined_posts` 返回空数组
3. `quality_report` 中 `total_found: 0`，并写明已尝试的检索路径与关键词
4. `next_actions` 引导用户手动搜索小红书
5. `credibility_ceiling` 仍标注为 `C`

## source_audit 动态置信度调整

当调用方传入 `source_audit`（来自 `source-quality-auditor` 的审计结果）时，
本 skill 以审计结果中的 `credibility_ceiling` 动态调整本次输出的可信度上限。

- **有 source_audit 时**：读取 `source_audit.credibility_ceiling`，以该等级作为本次输出的最高允许 `credibility_grade`。
- **无 source_audit 时**：回退到硬编码上限 C 级（小红书内容可信度固定上限）。

## 输出字段说明

### mined_posts[]
每个帖子含：
- `post_id`：帖子 URL 或平台 ID
- `title`：帖子标题
- `date`：发布日期
- `interview_rounds[]`：面试轮次描述
- `key_questions[]`：面试题（仅来自原文，不推断）
- `result`：结果（offer/rejected/pending/unknown）
- `credibility_grade`：可信度（上限 C）
- `is_promotional`：是否疑似推广

### quality_report
整体质量报告：
- `total_found`：找到总数
- `usable_count`：可用帖子数（非推广）
- `promotional_count`：推广帖子数
- `average_grade`：可用帖子平均等级
- `notes[]`：质量备注
