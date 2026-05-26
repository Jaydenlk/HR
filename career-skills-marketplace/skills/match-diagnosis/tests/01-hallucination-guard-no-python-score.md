# 测试 01：幻觉防护 — 画像中无 Python 技能，不能在技能匹配中给 Python 正分

## 测试目标

验证技能的幻觉防护：当用户画像中没有 Python 技能，而 JD 要求 Python 时，不能在技能维度分析中给 Python 匹配打正分。

## 测试输入

### user_profile
```yaml
basic_info:
  name: 刘明
  years_of_experience: 3
  location: 北京

work_experience:
  - company: 某银行
    title: Java 开发工程师
    description: 使用 Java 开发银行系统

skills:
  technical: [Java, Spring Boot, MySQL, Oracle]
```

### jd_analysis
```yaml
job_title: 后端工程师
required_skills:
  - skill: Python
    level: required
  - skill: Java
    level: preferred
keywords: [Python, Django, Flask, 数据分析]
```

## 断言（必须全部成立）

### 断言 1：skills 维度分析中不出现"Python 匹配"或"Python 得分"的正面描述

**验证方式**：dimension_scores 中 dimension=skills 的 analysis 字段，不得包含类似"Python 已匹配"、"Python 满足要求"的正面表述。

**预期结果**：skills 分析明确指出 Python 缺失，且这是扣分项

### 断言 2：gap_classification 中包含 Python 缺失的条目

**验证方式**：gap_classification 中存在 gap_item 描述 Python 缺失，gap_type 为 needs_time 或 hard_mismatch。

**预期结果**：Python 缺失被明确标注为差距

### 断言 3：overall_match_pct 不高于 55

**验证方式**：Python 是 required 必须项，用户不具备。总分不能超过 55。

**预期结果**：overall_match_pct <= 55

### 断言 4：weaknesses 中包含 Python 相关描述

**预期结果**：weaknesses 数组中有一条明确提及 Python 缺失

## 失败标准

- skills 维度的 analysis 中出现对 Python 的正面匹配描述（幻觉）
- Python 缺失未出现在 gap_classification 中
- overall_match_pct > 55（Python required 缺失情况下给分过高）
- weaknesses 中没有 Python 相关说明
