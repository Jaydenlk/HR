---
name: industry-trend-analyst
description: >
  分析行业/赛道发展趋势，输出增长/风险信号和推荐入行岗位。
  当用户询问行业趋势、是否应该进入某赛道时触发。
  依赖 market-radar 提供实时市场信号，无数据时降级为 insufficient。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# industry-trend-analyst — 行业趋势分析

## 核心职责

分析行业/赛道的发展趋势，输出结构化的增长信号、风险信号和招聘前景。

**严格约束：**
1. 无实时来源时 confidence 必须为 insufficient
2. 所有信号数组在无数据时返回空
3. hiring_outlook 无数据时必须为 unknown
4. 禁止使用训练数据推断当前行业趋势

## 依赖关系

本 skill 依赖以下 skills 的输出作为数据基础：
- **market-radar**：提供实时招聘市场信号
- **source-quality-auditor**：验证行业报告来源质量

## 降级行为

当无法获取实时数据时：
1. `confidence` 设为 `insufficient`
2. `growth_signals`、`risk_signals`、`recommended_entry_roles` 均为空数组
3. `hiring_outlook` 为 `unknown`
4. `trend_summary` 说明降级原因
5. `next_actions` 引导用户查阅权威行业报告

## 信号强度说明

### growth_signals（增长信号）
- `strong`：政策支持 + 资本投入 + 招聘量显著增长
- `moderate`：部分指标向好，整体趋势积极
- `weak`：局部信号，不够系统

### risk_signals（风险信号）
- `high`：明确的下行风险（政策收紧/市场饱和/大规模裁员）
- `medium`：有风险因素但尚不确定
- `low`：潜在风险，需持续关注

## 数据来源优先级

| 来源 | 等级 |
|------|------|
| 工信部/发改委政策文件 | A |
| 权威机构行业报告（麦肯锡/IDC/艾瑞） | A/B |
| 财经媒体（36氪/界面） | B |
| 招聘平台数据（通过 market-radar） | B |
| 社区讨论 | C |
