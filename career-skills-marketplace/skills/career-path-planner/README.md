# career-path-planner

职业路径规划 skill — 基于用户画像，生成 1-3 条可行的职业发展路径，每条路径适配度评分基于画像匹配度计算。

## 核心原则

**证据驱动**：每条路径的适配度（fit_pct）必须基于 profile 字段的量化计算，每条建议必须引用 evidence_basis。禁止给出无画像支撑的泛化建议。

## 使用场景

- 用户想了解自己有哪些可行的职业发展方向
- 求职主理人需要为用户制定中长期路径规划
- 用户在多个方向之间犹豫，需要基于画像的客观分析

## 前置依赖

**必须**先运行 `profile-builder`，获得用户画像后才能调用本 skill。

## 输入

| 字段 | 类型 | 必填 |
|---|---|---|
| `profile` | object | 是，来自 profile-builder |
| `target_role` | string | 否 |
| `target_industry` | string | 否 |
| `time_horizon` | "1year"\|"3year"\|"5year" | 否，默认 3year |

## 输出结构

```
paths[]
├── title              # 路径名称
├── path_type          # vertical / lateral / industry_switch
├── fit_pct            # 适配度（0-100，基于画像计算）
├── fit_breakdown      # 各维度分解
├── milestones[]       # 关键里程碑
├── required_skills[]  # 所需技能（含 has/partial/missing）
├── transition_difficulty  # low / medium / high
└── evidence_basis[]   # 支撑该路径的 profile 字段引用
recommended_path       # 推荐路径
immediate_actions[]    # 30天内可执行的具体行动
```

## 适配度计算

| 维度 | 权重 |
|---|---|
| 技能覆盖率 | 40% |
| 经验年限匹配 | 25% |
| 学历匹配 | 15% |
| 行业相关度 | 20% |

## 置信度说明

| 等级 | 含义 |
|---|---|
| `high` | profile.confidence == high，evidence_count >= 8 |
| `medium` | profile.confidence == medium |
| `low` | profile 稀疏，输出通用框架 |
| `insufficient` | 未提供 profile，返回 error |

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 完整画像 → 3条路径，高置信度 |
| `examples/sparse-profile.md` | 稀疏画像 → 1条通用路径，低置信度 |
| `examples/lateral-move.md` | 技术转产品横向路径示例 |
| `examples/no-profile.md` | 未提供 profile → error |

## 限制

- 不做薪资预测（市场薪资数据缺失）
- 不预测招聘需求量（需实时市场数据）
- fit_pct 基于画像与角色要求的文本匹配，非真实录用概率
