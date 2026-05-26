---
description: "sub-skill 调用的编排规则：依赖顺序、并行条件、输出聚合方式"
version: "1.0.0"
---

# 编排规则

## 1. 依赖顺序

sub-skill 之间存在数据依赖，违反顺序会导致下游 skill 缺少必要输入。

### 强制依赖关系

```
profile-builder  ──依赖──► match-diagnosis
jd-analyzer      ──依赖──► match-diagnosis
jd-analyzer      ──依赖──► resume-tailor
```

**规则解释**：
- `match-diagnosis` 需要用户档案（profile-builder 输出）和 JD 解析结果（jd-analyzer 输出）才能计算匹配度
- `resume-tailor` 需要 JD 的结构化要求（jd-analyzer 输出）才能针对性优化简历
- `source-quality-auditor` 无依赖，可在任何阶段调用

### 可并行的 skill

以下 skill 无互相依赖，可同时调用：
- `profile-builder` 和 `jd-analyzer` 可以并行执行
- `source-quality-auditor` 可以在任何其他 skill 运行期间并行执行

---

## 2. 完整编排流程（按意图）

### 意图：match_diagnosis（完整流程）

```
阶段 1（并行）:
  ├── profile-builder(resume_text)
  └── jd-analyzer(jd_text)

阶段 2（等待阶段 1 完成）:
  └── match-diagnosis(profile-builder.output, jd-analyzer.output)

阶段 3（如有市场事实声明）:
  └── source-quality-auditor(match-diagnosis.market_claims)
```

### 意图：tailor_resume（完整流程）

```
阶段 1（并行）:
  ├── jd-analyzer(jd_text)
  └── profile-builder(resume_text)  [可选，提升质量]

阶段 2（等待阶段 1 完成）:
  └── resume-tailor(jd-analyzer.output, resume_text)
```

### 意图：analyze_jd（简单流程）

```
阶段 1:
  └── jd-analyzer(jd_text)

阶段 2（如有市场薪资/行业声明）:
  └── source-quality-auditor(jd-analyzer.market_claims)
```

### 意图：career_direction / interview_prep

```
阶段 1:
  └── profile-builder(resume_text 或 user_profile)

阶段 2（如有行业趋势声明）:
  └── source-quality-auditor(career_claims)
```

### 意图：offer_evaluation / salary_check / company_check / find_interview_experience

```
阶段 1:
  └── source-quality-auditor(user_message 中的核心问题)

补充（如有 JD 文本）:
  └── jd-analyzer(jd_text)
```

### 意图：write_message

```
阶段 1（并行）:
  ├── profile-builder(resume_text)  [提取亮点]
  └── jd-analyzer(jd_text)         [如有 JD]

阶段 2（等待阶段 1 完成）:
  └── 基于 profile-builder 和 jd-analyzer 输出生成消息
```

---

## 3. 何时调用 source-quality-auditor

**必须调用**（涉及以下任何一类声明）：
- 薪资范围的具体数字（如"该岗位市场薪资 25-40K"）
- 行业趋势陈述（如"AI 岗位需求在增长"）
- 公司规模/融资状态（如"该公司 C 轮，估值 10 亿"）
- 岗位市场供需（如"产品经理目前市场竞争激烈"）
- 任何含"普遍"、"一般来说"、"行业标准"的陈述

**不需要调用**：
- 仅基于用户提供的 JD 原文得出的结论
- 仅基于用户提供的简历原文得出的结论
- 明确标注为"仅供参考"的通用框架建议

---

## 4. 输出聚合规则

### 4.1 confidence 聚合

```
最终 confidence = min(所有调用的 skill 的 confidence)
```

示例：
- jd-analyzer: high
- profile-builder: high
- match-diagnosis: medium
- 最终 confidence: **medium**

### 4.2 evidence 聚合

将所有 skill 的 evidence 数组合并，去重，保留来源标注：

```yaml
evidence:
  - "[jd-analyzer] JD 原文第3段：要求5年以上产品经验"
  - "[profile-builder] 简历显示：用户有6年产品经历"
  - "[source-quality-auditor] 薪资范围经验证：来自XX数据集"
```

### 4.3 conflict_markers 聚合

当任何两个来源对同一事实有不同描述时，填写 conflict_markers：

```yaml
conflict_markers:
  - field: "薪资范围"
    source_a: "JD 原文"
    value_a: "月薪 20-30K"
    source_b: "knowledge/salary-data"
    value_b: "该岗位市场均值 35K"
    resolution: "不自动解决，由用户判断"
```

**原则**：主理人不主动解决冲突，只标记并告知用户。

### 4.4 失败 skill 的处理

当某个 skill 返回 failed 状态：

```yaml
skills_invoked:
  - skill_name: "source-quality-auditor"
    status: "failed"
    result_summary: "服务暂时不可用，市场数据未经验证"
```

此时：
- 删除依赖该 skill 的声明（不替代）
- 将受影响字段列入 `cannot_determine`
- 主结论 confidence 降为 low

---

## 5. 追问与编排的协调

当 `required_inputs` 缺失时，先追问，再编排：

```
用户消息不含 jd_text
  └── 发起追问（第1轮）
      └── 用户补充 jd_text
          └── 开始编排（jd-analyzer + ...）
```

**不可以**：先用不完整输入调用 skill，再用结果填补缺口。这会导致 skill 产生低质量输出，污染后续步骤。

---

## 6. 编排超时和降级

如果某个 skill 响应超时（超过合理等待）：

1. 标记该 skill 为 `skipped`（不是 failed）
2. 继续执行不依赖该 skill 的后续步骤
3. 对依赖该 skill 的步骤：列入 `cannot_determine`
4. 最终输出中说明"因 X skill 超时，以下分析未完成"
