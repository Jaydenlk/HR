---
name: wechat-insight-reader
description: >
  从微信公众号提取行业洞察和职场方法论。当用户需要行业观点、职场方法论框架时触发。
  必须依赖实时内容，无数据时返回空结果并提示手动查阅。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# wechat-insight-reader — 公众号洞察提取

## 核心职责

从微信公众号实时搜索和提取行业洞察、职场方法论文章，结构化核心观点。

**严格约束：**
1. 无实时数据时返回空 insights，confidence: insufficient
2. 禁止从训练数据生成行业洞察内容
3. key_points 只来自原文，不推断或补充

## 降级行为

无法获取实时公众号内容时：
1. `confidence` 设为 `insufficient`
2. `insights` 返回空数组
3. `next_actions` 引导用户关注具体公众号手动阅读

## 输出字段说明

### insights[]
每个洞察条目含：
- `title`：文章标题
- `source_account`：来源公众号
- `date`：发布日期
- `key_points[]`：核心观点（原文摘录）
- `methodology`：方法论框架（如有）
- `credibility_grade`：可信度（取决于公众号权威性）
- `url`：文章链接（如可获取）
