# role-transition-advisor

角色转型可行性分析 skill — 分析从当前角色转向目标角色的可行性，重点覆盖中国市场高频转型场景。

## 核心原则

**证据驱动**：可行性评级（feasibility）必须基于 profile 字段，每项技能差距必须说明用户现有水平来自哪个 profile 字段。禁止给出"你可以尝试"类无证据可行性判断。

## 使用场景

- 用户明确表示想从当前职位转向另一个职位
- 求职主理人判断用户画像与目标职位有较大落差

## 前置依赖

**必须**先运行 `profile-builder`，且输入中必须同时提供 `profile` 和 `target_role`。

## 输入

| 字段 | 类型 | 必填 |
|---|---|---|
| `profile` | object | 是，来自 profile-builder |
| `target_role` | string | 是 |
| `target_company_type` | enum | 否 |
| `timeline_months` | integer | 否 |

## 输出结构

```
feasibility         # high / medium / low / not_feasible
feasibility_rationale  # 引用 profile 字段的理由
skill_gap[]
├── skill_name
├── current_level   # 来自 profile
├── required_level  # 目标角色要求
├── gap_severity    # critical / important / nice_to_have
├── remedy
└── estimated_months
typical_transition_path[]  # 经典转型路径
success_factors[]           # 关键成功因素（has/partial/missing）
first_step                  # 最重要的第一步
```

## 中国市场覆盖场景

| 场景 | 特殊说明 |
|---|---|
| 文转产品 | SQL/数据能力是大厂 PM 门槛 |
| 技术转管理 | 大厂要求大团队经验，从小团队 TL 切入 |
| 大厂转体制 | 薪资折损40-60%，技术型国企匹配度更高 |
| 应届转行 | 作品集和内部迁移是最低风险路径 |

## 置信度说明

| 等级 | 含义 |
|---|---|
| `high` | profile.confidence == high + target_role 明确 |
| `medium` | profile 部分完整或 target_role 为非标准名称 |
| `low` | profile 稀疏 |
| `insufficient` | 缺少 profile 或 target_role，返回 error |

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/tech-to-pm.md` | 技术转产品，可行性 medium |
| `examples/tech-to-management.md` | 技术转管理，可行性 high |
| `examples/internet-to-state.md` | 大厂转体制，可行性 medium |
| `examples/impossible-transition.md` | 无技术背景转高级架构师，not_feasible |
