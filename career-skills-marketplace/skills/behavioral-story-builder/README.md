# behavioral-story-builder

STAR 故事库构建 skill — 从用户工作经历提炼面试故事，按八大能力维度分类，识别覆盖空白。

## 核心能力

- 从工作经历中提炼 STAR 结构故事
- 按8个能力维度分类（问题解决/领导力/协作影响等）
- 标注故事打磨程度（ready/needs_polish/skeleton）
- 分析覆盖度，识别关键空白

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_profile` | object | 是 | 用户画像（含工作经历），来自 profile-builder |
| `target_competencies` | array | 否 | 重点覆盖的能力维度 |
| `interview_debrief_stories` | array | 否 | 来自面试复盘的故事素材 |
| `target_job_type` | string | 否 | 岗位类型（tech/product/ops/sales） |

## 输出结构

```
story_bank[]       # STAR 故事库（含 STAR 四要素+打磨程度）
coverage_map       # 各维度覆盖度（strong/weak/missing）
gaps[]             # 空白维度及严重程度
```

## 八大能力维度

| 维度 | 说明 |
|---|---|
| 问题解决 | 技术/业务复杂问题的定位和解决 |
| 领导力 | 带领团队/影响他人 |
| 协作影响 | 跨团队合作 |
| 主动创新 | 主动提出并推动改进 |
| 逆境应对 | 挫折/失败/压力下的表现 |
| 数据驱动 | 用数据推动决策 |
| 客户中心 | 以用户/客户为核心 |
| 自我学习 | 快速学习新技能或领域 |

## 故事诚信

- `result` 中的量化数据必须来自用户原始描述
- 无数据时标注「待补充」，不推断数字
- 不修改用户经历的事实，只做结构化重组

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 5年工程师，6个故事，覆盖度分析 |
| `examples/low-evidence.md` | 简历经历简略，skeleton 级别故事 |
| `examples/bad-input.md` | user_profile 无工作经历，返回错误 |
| `examples/source-conflict.md` | 经历中时间线存在矛盾 |
