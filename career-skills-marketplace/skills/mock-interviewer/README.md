# mock-interviewer

模拟面试 skill — 三阶段流程：生成问题→评分回答→综合评估，严格基于用户实际回答评分。

## 核心能力

- Phase 1：基于目标岗位和用户背景生成定向面试题
- Phase 2：逐题评分，引用用户原话，给出改进建议
- Phase 3：综合评估报告，含整体得分、6维度分析和录用概率

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `phase` | string | 是 | 当前阶段：generate_questions/evaluate_answer/final_report |
| `job_title` | string | 是 | 目标岗位名称 |
| `user_profile` | object | 否 | 用户画像，来自 profile-builder |
| `jd_analysis` | object | 否 | JD 解析结果 |
| `interview_intelligence` | object | 否 | 面试情报，用于生成定向高频题 |
| `questions` | array | Phase 2/3 | Phase 1 生成的题目 |
| `answers` | array | Phase 2/3 | 用户的回答列表 |
| `answer_evaluations` | array | Phase 3 | Phase 2 的评分结果 |

## 三阶段说明

### Phase 1: generate_questions
输出包含题型、难度、考察重点的面试题列表。

### Phase 2: evaluate_answer
逐题评分，0-10 分，必须引用用户原话，给出具体改进建议。

### Phase 3: final_report
综合 0-100 分，A+~D 等级，6维度分析，录用概率判断。

## 评分诚信

- 缺失 STAR 要素必须扣分
- `strengths` 只引用用户实际说出的内容
- 明显有缺陷的回答不得给出 8+/10 分

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 完整三阶段模拟面试（产品经理岗） |
| `examples/low-evidence.md` | 仅有岗位名，无 profile 和 JD，通用题目 |
| `examples/bad-input.md` | phase 字段无效，返回验证错误 |
| `examples/source-conflict.md` | 用户回答自相矛盾，评分如何处理 |
