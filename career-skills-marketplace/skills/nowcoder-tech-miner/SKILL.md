---
name: nowcoder-tech-miner
description: >
  从牛客网提取技术面经和笔试题，结构化供其他 skill 使用。
  当用户询问牛客网面经、技术笔试题时触发。
  来源上限 B 级，无实时数据时返回空结果。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# nowcoder-tech-miner — 牛客网技术面经提取

## 核心职责

从牛客网实时搜索和提取技术面试经验和笔试题，结构化为可用格式。

**严格约束：**
1. 牛客网来源可靠性上限为 B 级（技术社区，质量高于小红书）
2. 无实时数据时返回空结果，confidence: insufficient
3. 禁止从训练数据推断笔试题目

## 与 xhs-interview-miner 对比

| 维度 | nowcoder-tech-miner | xhs-interview-miner |
|------|--------------------|--------------------|
| 来源上限 | B 级 | C 级 |
| 技术题可靠性 | 较高（用户有技术背景） | 较低（混杂推广） |
| 适用场景 | 技术岗位笔试/面试 | 公司文化/非技术岗 |

## 降级行为

无法获取实时牛客网内容时：
1. `confidence` 设为 `insufficient`
2. `mined_posts` 和 `technical_questions` 返回空数组
3. `next_actions` 引导用户手动访问牛客网

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
