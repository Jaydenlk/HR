# 示例：仅用 target_role 的通用差距分析

## 输入

```json
{
  "profile": {
    "basic": { "name": "陈静", "years_of_experience": 4, "current_role": { "value": "前端开发工程师" } },
    "skills": {
      "technical": [
        { "name": "React", "proficiency": "used_in_project" },
        { "name": "TypeScript", "proficiency": "used_in_project" }
      ]
    },
    "experience": [{ "company": "某公司", "role": "前端工程师", "duration": "2022-至今" }]
  },
  "target_role": "高级前端工程师"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "skill-gap-planner",
  "skill_version": "1.0.0",
  "summary": "基于「高级前端工程师」通用角色要求（无具体JD）对比画像，发现工程化能力和性能优化是主要差距。置信度 medium（无具体JD数据）。",
  "confidence": "medium",
  "gap_analysis": [
    {
      "skill_name": "前端工程化（Webpack/Vite/Monorepo）",
      "gap_severity": "critical",
      "user_current": "profile.skills.technical 中无工程化工具记录",
      "target_required": "高级前端工程师通用要求：能配置构建工具、优化构建速度、搭建 Monorepo 体系",
      "source_evidence": "基于 role-taxonomy 中高级前端工程师的通用要求（无具体JD，置信度 medium）"
    },
    {
      "skill_name": "性能优化（Core Web Vitals）",
      "gap_severity": "important",
      "user_current": "profile.skills.technical 中无性能优化相关记录",
      "target_required": "高级前端通用要求：能分析并优化 LCP/FID/CLS 指标",
      "source_evidence": "基于通用角色要求，建议结合具体JD验证优先级"
    }
  ],
  "learning_plan": [
    {
      "skill_name": "前端工程化",
      "priority": 1,
      "approach": "在当前或个人项目中配置一套完整的 Vite 构建流程，实现代码分割、Tree-shaking、构建时间优化",
      "estimated_weeks": 6,
      "completion_criteria": "能独立配置 Vite 构建，构建时间有量化指标，能解释每个优化点的原理",
      "resource_type": "project_practice"
    }
  ],
  "quick_wins": [
    {
      "skill_name": "TypeScript 类型体操",
      "action": "将当前项目中的 any 类型全部改为具体类型，使用泛型重构复用组件",
      "expected_result": "TypeScript 水平从 used_in_project 提升至 expert 级别，面试可展示代码片段",
      "basis": "profile.skills.technical[TypeScript=used_in_project]：已有基础，提升相对容易"
    }
  ],
  "long_term_investments": [
    {
      "skill_name": "跨端开发（React Native / 小程序）",
      "rationale": "高级前端综合竞争力的加分项，但从零开始需要独立项目实践机会",
      "path": "在副业或开源项目中实践，不建议在没有实际需求的情况下投入"
    }
  ],
  "cannot_determine": [
    "具体JD对技能的优先级排序（建议提供具体JD后重新分析）"
  ]
}
```
