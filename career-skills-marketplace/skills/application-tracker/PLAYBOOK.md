---
name: application-tracker
description: >
  投递状态追踪与漏斗视图。当用户说"我投了很多简历没消息"、
  "帮我整理一下投递状态"、"哪些公司我还没跟进"、
  "我的求职进展怎么样"、"有哪些要跟进的"时触发。
  生成漏斗视图、统计数据、过期提醒和幽灵岗识别。
allowed-tools:
  - Read
  - Grep
---

# application-tracker — 投递状态追踪

## 职责

分析用户提供的投递记录，生成可视化漏斗统计、识别需要跟进的投递、检测可能已"幽灵"（长期无回音）的岗位。**所有统计基于用户实际提供的数据，不推测未提供的状态。**

## 投递状态定义

| 状态 | 含义 |
|---|---|
| `submitted` | 已投递，等待筛简 |
| `in_review` | 简历已被查看/被HR标记 |
| `interview_scheduled` | 已约面试 |
| `interviewing` | 面试进行中 |
| `offer` | 已获 offer |
| `rejected` | 已被拒绝 |
| `withdrawn` | 用户主动撤回 |
| `ghost` | 超过跟进阈值无回音 |

## 漏斗计算

漏斗各阶段 = 各状态的投递数量：
- 投递层：submitted + in_review
- 面试层：interview_scheduled + interviewing
- offer层：offer
- 流失：rejected + ghost + withdrawn

## 幽灵检测规则

- 状态为 `submitted` 且超过 **14天** 无更新 → 标记为 `stale`
- 状态为 `in_review` 且超过 **21天** 无更新 → 标记为 `ghost_candidate`
- 状态为 `interview_scheduled` 且距面试日期已过 **7天** 无更新 → 标记为 `ghost_candidate`

## 跟进提醒优先级

1. 面试后 24-48小时内：发送感谢信（优先级 high）
2. 超过阈值无回音：发送一次性跟进（优先级 medium）
3. 简历被查看后 7天无消息：轻量询问（优先级 low）

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | 投递记录 >= 3条，含日期信息 |
| `medium` | 1-2条记录，或部分缺少日期 |
| `low` | 仅有投递列表，无状态或日期 |
| `insufficient` | 无任何投递数据 |

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
