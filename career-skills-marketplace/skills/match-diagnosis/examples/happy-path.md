# 示例 01：高匹配度（85%+）— 资深前端工程师投字节跳动高级前端岗

## 场景说明

资深前端工程师，5年经验，技术栈高度覆盖 JD 要求，投递字节跳动高级前端工程师职位。

---

## 输入

### user_profile
```yaml
basic_info:
  name: 周文涛
  target_role: 高级前端工程师
  years_of_experience: 5
  location: 北京

work_experience:
  - company: 美团
    title: 高级前端工程师
    industry: 互联网/O2O
    start_date: "2021.07"
    end_date: 至今
    description: 负责美团外卖商家端 PC 和 H5 业务开发，主导性能优化项目，将首屏加载时间从 4.2s 降至 1.8s
    achievements:
      - 主导商家端低代码平台研发，支撑 200+ 模板
      - 推动 TypeScript 全面迁移，测试覆盖率提升至 80%
  - company: 滴滴出行
    title: 前端工程师
    industry: 互联网/出行
    start_date: "2019.07"
    end_date: "2021.06"
    description: 负责司机端 APP H5 页面开发

education:
  - school: 北京航空航天大学
    degree: 本科
    major: 计算机科学
    graduation_date: "2019.06"

skills:
  technical: [React, Vue, TypeScript, Webpack, Vite, Node.js, GraphQL, 性能优化, SSR, Docker]
  soft: [技术领导力, 跨团队协作, 代码审查]
  certifications: []

constraints:
  preferred_locations: [北京]
  work_type: full_time
```

### jd_analysis
```yaml
job_title: 高级前端工程师
company: 字节跳动
required_skills:
  - skill: React
    level: required
    years: "3年以上"
  - skill: TypeScript
    level: required
  - skill: 性能优化
    level: required
  - skill: Webpack/Vite
    level: preferred
  - skill: SSR
    level: preferred
  - skill: Node.js
    level: nice_to_have
qualifications:
  education: 本科及以上
  experience_years: "4年以上"
  must_have: [React 3年以上, TypeScript, 有大型项目经验]
  nice_to_have: [低代码平台经验, 跨端开发经验]
location: 北京
work_type: full_time
keywords: [React, TypeScript, 性能优化, Webpack, Vite, SSR, 前端工程化, 大型项目]
```

---

## 输出

### match_result

**overall_match_pct**：91

**match_label**：perfect_fit

**confidence**：high

#### dimension_scores

| 维度 | 得分 | 满分 | 分析 |
|------|------|------|------|
| skills | 28 | 30 | React 5年（超过要求3年）、TypeScript、性能优化、Webpack/Vite 全部覆盖；SSR 有经验；仅缺 GraphQL 未在 JD 中要求 |
| experience | 23 | 25 | 5年经验（超过4年要求）；大厂经验（美团、滴滴）高度相关；有主导大型项目经验；低代码平台是加分项 |
| education | 15 | 15 | 北航计算机本科，完全满足要求 |
| role | 14 | 15 | 职业轨迹清晰（前端初级→中级→高级），与目标岗位层级高度一致；仅微扣 1 分因没有字节系经验 |
| constraints | 15 | 15 | 北京→北京，全职→全职，无约束冲突 |

**总分**：28+23+15+14+15 = 95 → 校准后 91（因个别软指标未完全量化）

#### strengths

1. React 实战年限（5年）超过 JD 要求（3年），且有美团外卖大流量场景验证
2. 有实际量化的性能优化成果（首屏 4.2s → 1.8s），完全对应 JD 的性能优化要求
3. 低代码平台经验是 JD 的 nice_to_have，用户恰好具备（200+ 模板）
4. TypeScript 迁移经验直接回应 JD 对代码规范的隐含期待

#### gap_classification

1. gap_item: "字节内部技术栈（如飞书生态、TikTok 前端架构）了解有限"
   gap_type: quick_fix
   description: 非 JD 要求但面试中可能被问及，1-2 周研究即可熟悉

#### improvement_suggestions

1. suggestion: "面试前研究字节跳动前端架构特点（Modern.js、Rspack 等开源项目），了解其工程化方向"
   priority: medium
   estimated_effort: "3-5天研究和准备"

---

### 总结

这是一个高匹配案例。用户不仅满足 JD 的所有 required 和 preferred 要求，还在部分方向上超出预期（性能优化有真实数据、低代码经验）。91% 的评分反映了真实的强竞争力，建议直接投递。
