# 示例：有核心差距的补强计划（文科背景转数据分析）

## 输入

```json
{
  "profile": {
    "basic": { "name": "王梅", "education": { "degree": "本科", "major": "汉语言文学" }, "years_of_experience": 2, "current_role": { "value": "运营专员" } },
    "skills": {
      "technical": [],
      "soft": [{ "name": "数据整理", "evidence_source": "使用Excel做数据汇总" }]
    },
    "experience": [{ "company": "某公司", "role": "运营专员", "duration": "2024.01-至今" }]
  },
  "jd_analysis": {
    "required_skills": [
      { "name": "SQL", "level": "proficient", "importance": "critical" },
      { "name": "Python（数据分析）", "level": "basic", "importance": "critical" },
      { "name": "数据可视化（Tableau/PowerBI）", "level": "basic", "importance": "important" },
      { "name": "统计学基础", "level": "basic", "importance": "important" }
    ],
    "job_title": "初级数据分析师"
  }
}
```

## 输出（关键字段）

```json
{
  "skill_name": "skill-gap-planner",
  "skill_version": "1.0.0",
  "summary": "运营2年（文科背景）转数据分析师，发现4项差距：SQL和Python为critical缺失，数据可视化和统计基础为important缺失。Excel基础是唯一的正向基础。总学习计划约20-24周。",
  "confidence": "high",
  "gap_analysis": [
    {
      "skill_name": "SQL",
      "gap_severity": "critical",
      "user_current": "profile.skills.technical 为空，仅有 Excel 数据整理经验",
      "target_required": "jd_analysis.required_skills[SQL=critical,proficient]：能自主查询数据库，编写复杂查询",
      "source_evidence": "JD原文：熟练SQL，能进行数据提取、清洗和分析"
    },
    {
      "skill_name": "Python（数据分析）",
      "gap_severity": "critical",
      "user_current": "profile.skills.technical 中无任何编程语言记录",
      "target_required": "jd_analysis.required_skills[Python=critical,basic]：能用 Pandas/NumPy 进行数据处理",
      "source_evidence": "JD原文：掌握Python数据分析基础（Pandas、NumPy）"
    }
  ],
  "learning_plan": [
    {
      "skill_name": "SQL",
      "priority": 1,
      "approach": "从 SELECT/WHERE/JOIN/GROUP BY 基础开始，使用真实业务数据（运营岗可以访问的数据）完成10个真实查询任务",
      "estimated_weeks": 8,
      "completion_criteria": "能独立完成「用户留存分析」的完整 SQL 查询，包含多表 JOIN 和窗口函数",
      "resource_type": "project_practice"
    },
    {
      "skill_name": "Python 数据分析",
      "priority": 2,
      "approach": "用 Python + Pandas 重做当前岗位中使用 Excel 完成的数据分析任务，实现自动化报表",
      "estimated_weeks": 10,
      "completion_criteria": "完成1个自动化日报脚本（数据读取→清洗→汇总→输出），可以展示运行结果",
      "resource_type": "project_practice"
    }
  ],
  "quick_wins": [
    {
      "skill_name": "Excel 进阶",
      "action": "将现有 Excel 工作转向数据透视表、VLOOKUP/INDEX-MATCH、Power Query，展示更强的数据处理能力",
      "expected_result": "短期内增强简历中数据相关描述的说服力，同时为学习 SQL 打好逻辑基础",
      "basis": "profile.skills.soft[数据整理=Excel]：已有 Excel 基础，进阶门槛低"
    }
  ],
  "long_term_investments": [
    {
      "skill_name": "统计学基础",
      "rationale": "统计学基础是高级数据分析的底层能力，但初级职位通常不强制要求，可在工作中边学边用",
      "path": "在实际分析工作中遇到具体统计问题时深入学习（如：A/B测试统计显著性），不建议提前全量学习"
    }
  ],
  "evidence_used": [
    { "field": "profile.skills.soft[数据整理]", "value": "Excel数据汇总经验", "relevance": "是唯一相关基础，作为quick_wins的出发点" },
    { "field": "profile.skills.technical", "value": "空数组", "relevance": "确认SQL和Python为从零起步" }
  ],
  "recommendations": [
    "优先学 SQL（比 Python 更快出成果，也更容易在当前运营岗使用），3个月内可用 SQL 做真实业务分析",
    "建议向现任公司申请访问数据库查询权限，将学习与真实业务结合"
  ],
  "risks": [
    "从0编程基础学 Python 的完成率在无项目驱动时偏低，建议每周用 Python 完成一个真实运营任务"
  ],
  "next_actions": [
    "本周申请公司数据库的只读查询权限，从真实业务数据开始学 SQL"
  ],
  "follow_up_questions": [
    "你现在有访问公司数据库的权限吗？有没有可以分析的真实数据集？"
  ],
  "cannot_determine": []
}
```
