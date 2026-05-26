# learning-roadmap-builder

结构化学习路线图生成 skill — 为技能差距生成分阶段学习路线图，优先推荐中文资源。

## 核心原则

- 不推荐具体课程名称（避免过时），只描述资源类型和质量标准
- 每个阶段有可验证的完成标准（代码/项目/文章）
- 优先中文资源（掘金/MDN中文/官方中文文档）
- 时间估计基于每周 12 小时（可定制）

## 使用场景

- skill-gap-planner 输出后的详细执行路线图
- 用户确定了要学习某项技能，需要结构化计划

## 前置依赖

`skill-gap-planner` — 提供 gap_analysis 作为输入

## 输入

| 字段 | 必填 |
|---|---|
| `skill_gaps` | 是，来自 skill-gap-planner.gap_analysis |
| `profile` | 否 |
| `weekly_hours` | 否，默认 12 |
| `preferred_language` | 否，默认 zh |

## 输出结构

```
roadmap[]
└── skill_name + phases[]
    ├── phase_name
    ├── goal
    ├── estimated_weeks
    ├── activities[]
    ├── completion_criteria  # 可验证
    └── output_artifact      # 具体输出物

resource_list[]
├── resource_type  # official_docs / chinese_community / book / ...
├── description
├── quality_criteria
└── for_level
```

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | Kubernetes 学习路线图（3阶段） |
| `examples/sql-for-beginner.md` | 零基础 SQL 路线图，中文资源优先 |
| `examples/multiple-skills.md` | 多技能并行路线图 |
| `examples/empty-gaps.md` | 空差距列表 → error |
