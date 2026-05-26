# skill-gap-planner

技能差距分析与补强计划 skill — 对比用户当前技能和目标职位要求，生成结构化学习计划。

## 核心原则

**双向引用**：每项差距必须同时引用 profile 字段（当前水平）和 JD/角色标准（目标水平）。禁止无来源的技能判断。

## 使用场景

- match-diagnosis 后的补强规划
- 用户收到面试反馈需要改进
- 主动对比目标 JD 发现差距

## 前置依赖

| 依赖 | 必填 |
|---|---|
| profile-builder | 是 |
| jd-analyzer | 否（推荐） |
| match-diagnosis | 否（推荐） |

## 输入

| 字段 | 必填 |
|---|---|
| `profile` | 是 |
| `jd_analysis` | 否，但推荐 |
| `match_result` | 否 |
| `target_role` | 否，jd_analysis 缺失时必填 |

## 输出结构

```
gap_analysis[]
├── skill_name
├── gap_severity     # critical / important / nice_to_have
├── user_current     # 引用 profile 字段
├── target_required  # 引用 JD 或角色标准
└── source_evidence

learning_plan[]
├── priority
├── approach
├── estimated_weeks
└── completion_criteria   # 可验证

quick_wins[]      # 3个月内可见效
long_term_investments[]   # 3个月以上
```

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 有 JD 数据的完整差距分析 |
| `examples/no-jd.md` | 仅用 target_role 的通用差距分析 |
| `examples/no-gap.md` | 技能完全覆盖，无明显差距 |
| `examples/critical-gap.md` | 有核心差距的补强计划 |
