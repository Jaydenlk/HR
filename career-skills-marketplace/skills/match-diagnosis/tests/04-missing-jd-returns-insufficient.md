# 测试 04：缺少 JD 数据时返回 insufficient 置信度，不产生评分

## 测试目标

验证缺少必要输入时的降级处理：当 jd_analysis 未提供时，技能必须返回 confidence = insufficient，并说明原因，而不是凭空猜测 JD 要求进行评分。

## 测试输入

### user_profile
```yaml
basic_info:
  name: 王芳
  years_of_experience: 5
  location: 北京

work_experience:
  - company: 某互联网公司
    title: 项目经理
    description: 管理多个研发项目

skills:
  technical: [PMP, JIRA, Confluence, 项目管理]
```

### jd_analysis
（未提供，字段完全缺失）

## 断言（必须全部成立）

### 断言 1：confidence = "insufficient"

**预期结果**：match_result.confidence === "insufficient"

### 断言 2：overall_match_pct 不存在或为 null

**预期结果**：不输出具体的匹配百分比数字（因为没有 JD 无法计算）

### 断言 3：insufficient_data_explanation 字段存在且非空

**预期结果**：insufficient_data_explanation 字段存在，内容说明缺少 jd_analysis 数据

### 断言 4：技能提供初步观察（非评分）

**预期结果**：输出中包含对用户画像的初步描述性观察，但明确标注这不是评分结果

### 断言 5：dimension_scores 不存在或为空数组

**预期结果**：不产生五维评分（因为无法评分）

## 失败标准

- confidence 不是 "insufficient"（技能凭空猜测 JD 要求进行评分）
- overall_match_pct 输出了具体数字
- insufficient_data_explanation 缺失（技能静默失败，无任何说明）
- dimension_scores 包含评分数据
