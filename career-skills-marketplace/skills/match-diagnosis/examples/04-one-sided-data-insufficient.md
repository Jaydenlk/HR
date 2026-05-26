# 示例 04：只有单方数据 — 置信度 insufficient，拒绝评分

## 场景说明

用户只提供了用户画像，未提供 JD 数据（jd_analysis 字段缺失）。技能应拒绝评分并说明原因。

---

## 输入

### user_profile（已提供）
```yaml
basic_info:
  name: 陈国强
  target_role: 算法工程师
  years_of_experience: 2
  location: 杭州

work_experience:
  - company: 某 AI 创业公司
    title: 算法工程师
    start_date: "2022.08"
    end_date: 至今
    description: 负责推荐系统算法研发

education:
  - school: 浙江大学
    degree: 硕士
    major: 计算机科学（机器学习方向）
    graduation_date: "2022.06"

skills:
  technical: [Python, PyTorch, TensorFlow, 推荐算法, 特征工程, SQL]
```

### jd_analysis（未提供）
（字段缺失）

---

## 输出

### match_result

**overall_match_pct**：（无法评分）

**match_label**：（无法评分）

**confidence**：insufficient

### insufficient_data_explanation

无法执行匹配诊断，原因如下：

**缺失的关键数据**：
- `jd_analysis` 字段未提供，无法知道目标职位的具体要求

**缺失数据的影响**：
- 无法对比技能匹配度（不知道 JD 要求哪些具体技能）
- 无法评估经验相关度（不知道 JD 所在行业和具体职责）
- 无法判断教育背景是否满足要求（不知道 JD 的学历要求）
- 无法分析隐性约束（不知道岗位地点、工作性质）

**恢复评分的方法**：

请提供目标职位 JD，技能将自动解析 JD 并完成评估。提供方式：
1. 直接粘贴 JD 原文
2. 或提供结构化的 jd_analysis 对象

---

### 已有信息的初步观察（供参考）

虽然无法评分，但根据用户画像，可以观察到以下信息供参考：

**用户优势（通用层面）**：
- 浙大计算机硕士（机器学习方向），学历背景强
- 2年推荐系统算法工程师经验，方向明确
- PyTorch/TensorFlow + 推荐算法 + 特征工程的技术栈是当前 AI 行业主流

**潜在关注点**（取决于目标 JD）：
- 年限较短（2年），若目标岗位要求 3年以上，可能有经验门槛
- 现有经验集中在推荐系统，若目标方向是 CV/NLP 等其他 AI 方向，需补充相关经验

这些观察**不构成评分**，仅在用户获取 JD 前提供一个思考框架。
