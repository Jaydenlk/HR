# 示例 03：信息不完整时的中等置信度评分

## 场景说明

用户提供了基本画像，但 JD 信息非常简短（只有几句话），缺乏对技能要求的详细分级。置信度应为 medium，评分仍然输出但需注明局限性。

---

## 输入

### user_profile（信息充足）
```yaml
basic_info:
  name: 林晓雨
  target_role: 产品经理
  years_of_experience: 3
  location: 上海

work_experience:
  - company: 某 B2B SaaS 公司
    title: 产品经理
    industry: 企业软件
    start_date: "2021.09"
    end_date: 至今
    description: 负责 CRM 产品线，从 0 到 1 搭建销售管理模块，月活用户 5000+
    achievements:
      - 独立完成 3 个核心功能模块的需求→PRD→上线全流程
      - 推动 API 开放平台立项，协调技术团队完成设计

education:
  - school: 上海交通大学
    degree: 本科
    major: 工业设计
    graduation_date: "2021.06"

skills:
  technical: [Axure, Figma, SQL（基础）, JIRA, Confluence]
  soft: [需求分析, 跨团队协作, 产品规划]
  certifications: []
```

### jd_analysis（信息不完整）
```yaml
job_title: 产品经理
company: 某金融科技公司
required_skills: []  # JD 只写了一段描述性文字，未提供结构化技能要求
qualifications:
  education: ""  # JD 未明确教育要求
  experience_years: "3年以上"
  must_have: []
  nice_to_have: []
responsibilities:
  - "负责金融产品功能设计和迭代"
  - "与研发团队协作推进项目"
location: 上海
work_type: full_time
keywords: [产品经理, 金融, 需求分析, 功能设计]
```

---

## 输出

### match_result

**overall_match_pct**：62

**match_label**：moderate_match

**confidence**：medium

> 置信度说明：JD 信息过于简短，技能要求、教育要求均未明确。评分基于通用产品经理岗位标准估算，可能与实际要求有偏差。建议获取完整 JD 后重新评估。

#### dimension_scores

| 维度 | 得分 | 满分 | 分析 |
|------|------|------|------|
| skills | 18 | 30 | 用户有 Axure、Figma、JIRA 等常用 PM 工具经验，基础 SQL 满足数据分析要求。但 JD 提到"金融产品"，用户无金融行业产品经验，可能影响匹配度（因 JD 未说明金融经验是否必须，存在不确定性） |
| experience | 16 | 25 | 3年 SaaS 产品经验（满足年限要求）；但金融科技行业特性（合规、风控逻辑、金融监管）与 SaaS/CRM 有差异，跨行业适应成本存在 |
| education | 10 | 15 | JD 未明确教育要求，按通用标准：上交本科完全合格。工业设计专业对产品设计有加分，但非计算机/商科背景可能在金融公司评审中存在轻微劣势 |
| role | 12 | 15 | 职业发展轨迹合理（3年 B2B PM → 金融科技 PM），层级匹配，有 0-1 产品经验是加分项 |
| constraints | 6 | 15 | 地点匹配（上海→上海）；金融科技公司工作强度通常较高，用户未提供相关偏好，此维度置信度不足，保守给分 |

#### strengths

1. 3年产品经验满足 JD 的"3年以上"要求
2. 有 0-1 产品建设经验（搭建销售管理模块），相比只做功能迭代的候选人有差异化优势
3. 上海→上海，无地理障碍

#### gap_classification

1. gap_item: "缺乏金融行业产品经验（如支付、贷款、理财等）"
   gap_type: needs_time
   description: 行业知识可以通过 3-6 个月自学和实践补充，但金融合规知识（如 KYC、反洗钱逻辑）有学习曲线

2. gap_item: "JD 中提到 API 开放平台相关工作未展开"
   gap_type: uncertain
   description: JD 信息不足，无法判断 To B API 产品经验是否会成为加分或必须项

#### improvement_suggestions

1. suggestion: "在投递前研究目标公司的核心金融产品（借款、理财或支付），了解金融产品的监管要求和用户需求特点，面试中主动体现跨行业学习能力"
   priority: high
   estimated_effort: "1-2周定向研究"

2. suggestion: "尝试获取更完整的 JD（如联系内推人或 HR 了解具体技能要求），重新做一次高置信度评估"
   priority: medium
   estimated_effort: "获取 JD 信息即可"

---

### 总结

62% 属于 moderate_match，核心原因是用户基础扎实但缺乏金融行业垂直经验。中等置信度提示：JD 本身信息不足，实际匹配度可能在 55%-75% 之间波动。建议获取完整 JD 后做精确评估。
