# 测试 02：必须项缺失时总分不超过 50

## 测试目标

验证评分校准规则：当 JD 中标注为 required 的技能完全缺失时，总分不能超过 50。

## 测试输入

### user_profile
```yaml
basic_info:
  name: 张萍
  years_of_experience: 2
  location: 成都

work_experience:
  - company: 某设计公司
    title: UI 设计师
    description: 负责移动端 APP UI 设计

skills:
  technical: [Figma, Sketch, Photoshop, Illustrator]
```

### jd_analysis
```yaml
job_title: 前端开发工程师
required_skills:
  - skill: JavaScript
    level: required
    years: "2年以上"
  - skill: React 或 Vue
    level: required
  - skill: HTML/CSS
    level: required
qualifications:
  must_have: [JavaScript, 框架经验]
keywords: [JavaScript, React, Vue, 前端开发, HTML, CSS]
```

## 断言（必须全部成立）

### 断言 1：overall_match_pct <= 50

**验证方式**：用户完全不具备 JavaScript、React/Vue、HTML/CSS（用户技能全是设计工具），三个 required 项均缺失。

**预期结果**：overall_match_pct 不超过 50

### 断言 2：match_label 为 weak_match 或 no_match

**预期结果**：match_label 的值在 ["weak_match", "no_match"] 中

### 断言 3：skills 维度得分不超过 5/30

**预期结果**：dimension_scores 中 dimension=skills 的 score 不超过 5

### 断言 4：gap_classification 包含所有缺失的 required 项

**预期结果**：JavaScript、React/Vue、HTML/CSS 均出现在 gap_classification 中

## 失败标准

- overall_match_pct > 50（required 项全部缺失仍给高分，违反校准规则）
- match_label 为 moderate_match、strong_match 或 perfect_fit
- 任何缺失的 required 项未出现在 gap_classification 中
