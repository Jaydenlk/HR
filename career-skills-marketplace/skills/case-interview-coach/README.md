# case-interview-coach

Case 面试备考教练 skill — 产品设计题/商业分析题/咨询 Case/无领导群面的系统化备考指导。

## 核心能力

- 提供各类型 Case 面试的结构化框架库
- 生成符合目标公司/行业背景的练习案例
- 分析常见失误及改进方法
- 明确面试官的评分维度和权重

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `interview_type` | string | 是 | 面试类型（见下表） |
| `target_company` | string | 否 | 目标公司/行业 |
| `experience_level` | string | 否 | 经验水平 |
| `focus_area` | string | 否 | 重点练习方向 |

## 支持的面试类型

| 类型 | 说明 |
|---|---|
| product_design | 产品设计题（产品经理岗） |
| market_estimation | 市场估算题（Fermi题） |
| case_consulting | 咨询 Case 面试（麦肯锡/BCG等） |
| group_discussion | 无领导小组讨论（群面） |
| business_analysis | 商业案例分析 |

## 输出结构

```
framework_library[]    # 结构化框架（含步骤和常见失误）
practice_cases[]       # 练习案例（含建议解题路径和评分标准）
common_mistakes[]      # 常见错误（含改进方法）
evaluation_criteria[]  # 面试官评分维度
```

## 特别说明

本 skill 基于行业方法论知识图谱，无实时数据依赖，不受实时数据缺失影响。

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 产品设计题完整指导 |
| `examples/low-evidence.md` | 咨询 Case，无目标公司背景 |
| `examples/bad-input.md` | interview_type 无效 |
| `examples/source-conflict.md` | 多种框架在同一题适用，如何选择 |
