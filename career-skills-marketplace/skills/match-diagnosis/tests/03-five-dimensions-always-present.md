# 测试 03：输出中必须包含五个维度评分

## 测试目标

验证输出格式完整性：无论输入数据多简单，dimension_scores 必须包含五个维度（skills, experience, education, role, constraints），各维度满分固定。

## 测试输入

### user_profile
```yaml
basic_info:
  name: 李磊
  years_of_experience: 4
  location: 深圳

work_experience:
  - company: 某互联网公司
    title: 数据分析师
    description: 负责用户行为分析

skills:
  technical: [Python, SQL, Tableau]
```

### jd_analysis
```yaml
job_title: 高级数据分析师
required_skills:
  - skill: Python
    level: required
  - skill: SQL
    level: required
location: 深圳
work_type: full_time
keywords: [数据分析, Python, SQL]
```

## 断言（必须全部成立）

### 断言 1：dimension_scores 包含恰好 5 个元素

**预期结果**：dimension_scores.length === 5

### 断言 2：五个维度名称均存在

**验证方式**：dimension_scores 中，dimension 字段的值集合为 {"skills", "experience", "education", "role", "constraints"}。

**预期结果**：五个维度名称全部出现，无重复无缺失

### 断言 3：各维度满分符合规范

**预期结果**：
- skills 的 max_score = 30
- experience 的 max_score = 25
- education 的 max_score = 15
- role 的 max_score = 15
- constraints 的 max_score = 15

满分之和 = 100

### 断言 4：每个维度的 score <= max_score

**预期结果**：所有维度的 score 不超过其 max_score

### 断言 5：overall_match_pct 与各维度得分之和基本一致（误差 <= 3）

**预期结果**：|overall_match_pct - sum(dimension_scores[i].score)| <= 3

## 失败标准

- dimension_scores 数量不等于 5
- 任何维度名称缺失或拼写错误
- 任何维度的 max_score 不符合规范值
- 任何维度的 score 超过其 max_score
- overall_match_pct 与维度总和差距超过 3 分
