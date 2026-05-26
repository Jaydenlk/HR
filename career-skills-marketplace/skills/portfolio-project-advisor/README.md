# portfolio-project-advisor

Portfolio 项目推荐 skill — 基于画像和技能差距，推荐适合做 portfolio 的项目，并列出应避免的反模式。

## 核心原则

- 每个项目推荐必须基于 profile 字段（技能/经历）
- 包含具体的面试谈话要点（interview_talking_points）
- 明确列出 anti_patterns（避免浪费时间在无效项目上）

## 输出结构

```
project_ideas[]
├── title
├── description
├── skills_demonstrated[]
├── size              # small / medium / large
├── estimated_weeks
├── interview_talking_points[]  # 面试展示维度
├── evidence_basis    # 来自 profile 哪个字段
└── github_visibility

anti_patterns[]
├── pattern
└── reason
```

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | Go 后端工程师的3个 portfolio 推荐 |
| `examples/career-change.md` | 转产品方向的 portfolio 建议 |
| `examples/no-skills.md` | 无技术技能 → 建议先积累 |
| `examples/anti-patterns.md` | 常见 portfolio 反模式 |
