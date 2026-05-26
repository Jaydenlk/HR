# interview-debrief

面试后复盘 skill — 分析面试对话记录，逐题点评评分，预测通过概率，提炼可复用 STAR 故事。

## 核心能力

- 逐题分析：评分（0-10）、亮点引用、缺口定位、改进示例
- 六维度综合评分：专业能力/表达清晰/逻辑结构/STAR完整度/文化契合/综合印象
- 结果预测：通过概率估算（非精确值），标注不确定因素
- 故事沉淀：从面试回答中提炼可复用 STAR 故事素材

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `interview_transcript` | string | 是 | 面试对话记录（>= 50 字） |
| `user_profile` | object | 否 | 用户画像，来自 profile-builder |
| `company_name` | string | 否 | 面试公司名称 |
| `job_title` | string | 否 | 目标岗位名称 |

## 输出结构

```
overall_grade              # A+/A/B+/B/C/D
dimension_scores[6]        # 六维度评分（0-10）
question_analysis[]        # 逐题分析
prediction                 # 结果预测（通过概率+依据）
stories_to_save[]          # 可提炼的 STAR 故事
```

## 评分诚信

- `strength` 只引用用户实际说出的内容
- 缺失 STAR 要素必须在 `gap` 中指出
- `prediction` 是粗略估算，不给确定性保证

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 完整面试记录，5题复盘 |
| `examples/low-evidence.md` | 仅有2题简短记录，低置信度 |
| `examples/bad-input.md` | 输入不是面试记录 |
| `examples/source-conflict.md` | 面试回答与简历信息矛盾 |
