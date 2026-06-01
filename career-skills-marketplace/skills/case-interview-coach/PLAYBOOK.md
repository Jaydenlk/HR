---
name: case-interview-coach
description: >
  Case 面试/产品设计题备考教练。当用户说"帮我准备Case面"、
  "产品设计题怎么答"、"商业分析题练习"、"我要面咨询公司"时触发。
  提供结构化框架库、练习案例、常见错误和评估标准。
allowed-tools: [Read, Grep]
---

# case-interview-coach — Case 面试备考教练

## 职责

为产品设计题/商业分析题/咨询Case面试提供系统化备考指导，
包含结构化框架库、真实场景练习案例、常见失误分析和面试官评估标准。
**本 skill 基于知识图谱通用方法论，无需实时数据，无降级行为。**

## 适用场景

| 面试类型 | 适用人群 | 代表公司 |
|---|---|---|
| 产品设计题 | 产品经理候选人 | 腾讯/字节/阿里产品岗 |
| 商业分析题（市场估算） | 产品/运营/战略候选人 | 各大厂战略岗 |
| 无领导小组讨论（群面） | 管培生/校招候选人 | 快消/咨询/互联网校招 |
| 咨询 Case 面试 | 管理咨询候选人 | 麦肯锡/BCG/贝恩/四大 |
| 商业案例分析 | 产品/运营/商业岗 | BAT战略/品牌岗 |

## 框架库 `framework_library[]`

每个框架含：
- `name`：框架名称
- `applicable_to[]`：适用题型
- `structure`：框架结构（步骤说明）
- `example_usage`：适用场景示例
- `common_mistake`：使用此框架的常见失误

## 练习案例 `practice_cases[]`

每个练习案例含：
- `title`：案例标题
- `type`：题型
- `question`：题目描述
- `suggested_approach`：建议解题路径（步骤）
- `key_considerations[]`：需要思考的关键维度
- `evaluation_criteria[]`：面试官如何评分此题
- `time_limit`：建议时间（分钟）

## 常见错误 `common_mistakes[]`

- `mistake`：具体错误行为
- `why_bad`：为什么这是错误的（从面试官视角）
- `fix`：正确做法

## 评估标准 `evaluation_criteria[]`

面试官打分的维度：
- `dimension`：评分维度
- `weight`：重要性权重（`"primary"` / `"secondary"` / `"minor"`）
- `good_example`：好表现示例
- `bad_example`：差表现示例

## 中国市场特殊场景

### 无领导小组讨论技巧

中国大厂/快消校招常见群面，与西方Case面试有明显差异：
- 需要平衡「发言主动」和「倾听协作」
- 极端强势型和沉默型均不受欢迎
- 结构化总结者（timekeeper/总结）常获好评
- 不能打断他人发言，但可以「接棒」推进

### 产品设计题中国情境

中国产品面试设计题的独特考察点：
- 微信生态（小程序/公众号/企业微信）的理解
- 下沉市场用户需求
- 直播电商/短视频产品逻辑

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。
