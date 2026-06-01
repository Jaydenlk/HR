---
name: career-path-planner
description: >
  职业路径规划。基于用户画像，生成 1-3 条可行的职业发展路径，
  每条路径包含适配度评分（基于画像匹配度计算）、关键里程碑、所需技能和转型难度。
  拒绝在画像不足时给出高置信度建议。
allowed-tools: [Read, Grep]
---

# career-path-planner — 职业路径规划

## 职责

基于用户的结构化画像（来自 profile-builder），为用户规划 1-3 条可行的职业发展路径。
每条路径的适配度评分必须基于画像匹配度计算，每条建议必须引用 profile 字段作为证据。
**禁止根据职位名称或行业泛化给出建议，所有路径必须锚定用户的实际技能和经历。**

## 输入要求

必须提供 `profile` 字段，内容来自 profile-builder 的输出。
若 profile 缺失关键字段（education、skills.technical、experience），降级为通用框架并标注 `confidence: low`。

## 适配度计算（fit_pct）

| 维度 | 权重 | 说明 |
|---|---|---|
| 技能覆盖率 | 40% | 用户现有技能 / 目标角色要求技能 |
| 经验年限匹配 | 25% | 用户工龄 vs 目标角色典型要求 |
| 学历匹配 | 15% | 用户学历 vs 目标角色通常要求 |
| 行业相关度 | 20% | 当前行业与目标行业的距离 |

适配度 = 各维度分数加权求和，结果为整数百分比（0-100）。

## 路径生成规则

### 路径数量
- profile.confidence == "high"：生成 2-3 条路径
- profile.confidence == "medium"：生成 1-2 条路径
- profile.confidence == "low" 或 "insufficient"：生成 0-1 条通用框架路径，confidence 标记为 low

### 路径类型
1. **纵向晋升路径**：在当前赛道内向上（如：高级工程师 → 技术专家 → 架构师）
2. **横向转型路径**：跨职能转换（如：开发 → 产品、技术 → 管理）
3. **行业切换路径**：同职能在不同行业间转换（如：互联网 → 金融科技）

### 证据引用规则
每条路径必须在 `evidence_basis` 中列出支撑该路径的 profile 字段：
```json
{
  "evidence_basis": [
    "profile.skills.technical[Go, Redis]：与目标角色架构师要求匹配",
    "profile.basic.years_of_experience = 5：满足高级路径晋升年限要求"
  ]
}
```

## 即时行动（immediate_actions）

基于 recommended_path，给出 3-5 个可在 30 天内开始的具体行动：
- 每条行动必须对应到 profile 中的一个当前短板或优势延伸
- 禁止给出"持续学习"等模糊建议

## 中国市场特性

- 大厂背景对路径的加分效应（BAT/字节/美团 > 独角兽 > 普通公司）
- 国企/体制内路径与市场化路径的分叉逻辑
- 一线城市与新一线的职业天花板差异
- 职级体系差异：互联网 P6-P8 vs 传统企业的对应关系

## 输出格式

见 `output_schema.json`。输出语言为中文（字段名保持英文）。

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/career-path-patterns.yaml` | 中国市场已验证的职业转型路径模式（如开发→产品、运营→增长等），用于评估转型可行性（feasibility）和典型里程碑 | 生成横向转型路径和行业切换路径时 | 不输出横向路径，仅输出纵向晋升路径，并标注 confidence: low |
| `../_career-skills-shared/knowledge/role-taxonomy/roles.yaml` | 目标岗位的标准技能要求，用于计算适配度（fit_pct）中的技能覆盖率维度（40%权重） | 计算每条路径的适配度分数时 | 仅依赖 profile.skills 与路径名称的文字匹配，技能覆盖率计算精度降低 |

## 产品原则适用

本 skill 遵循 `../_career-skills-shared/policies/product-principles.md` 中的两项核心原则。

### 信息不足时 (Ask-before-judging)
- 当未提供用户画像（`profile` 缺失或为空对象）时，视为信息不足
- 信息不足时不能输出路径适配度（`fit_pct`），因为适配度计算的四个维度（技能/经验/学历/行业相关度）全部依赖 profile 数据
- 低置信度时只列出通用转型模式（如「同类岗位纵向晋升」「技术转管理通用路径」），不计算 fit_pct，confidence 标注 low
- 追问：「请先使用 profile-builder 构建您的画像，或直接提供您的工作年限、技能和教育背景」

### 出处-思考-观点 (Source-Reason-Opinion)
- Source: 每条路径的 `evidence_basis` 字段必须引用 profile 中的具体字段（如 `profile.skills.technical[Go]`），路径合理性锚定真实数据而非泛化假设
- Reasoning: `fit_pct` 计算过程在 `evidence_basis` 中展开，体现技能覆盖率 40% + 经验年限 25% + 学历 15% + 行业相关度 20% 的加权逻辑
- Opinion: `recommended_path` 的推荐理由引用最高 fit_pct，`immediate_actions` 每条行动对应 profile 中的一个具体短板或优势，标注「建议」而非「必须」
