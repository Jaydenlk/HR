---
name: xhs-interview-miner
description: >
  从小红书提取面试经验，结构化供其他 skill 使用。
  当用户询问小红书面经、某公司面试体验时触发。
  内容可靠性上限为 C 级，无实时数据时返回空结果。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# xhs-interview-miner — 小红书面经提取

## 核心职责

从小红书实时搜索和提取面试经验帖，结构化为其他 skill 可用的格式。

**严格约束：**
1. 小红书来源可靠性上限为 C 级（混杂推广内容）
2. 无实时数据时返回空结果，confidence: insufficient
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

## 降级行为

无法获取实时小红书内容时：
1. `confidence` 设为 `insufficient`
2. `mined_posts` 返回空数组
3. `quality_report` 中 `total_found: 0`
4. `next_actions` 引导用户手动搜索小红书
5. `credibility_ceiling` 仍标注为 `C`

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
