# 示例：零基础 SQL 路线图，中文资源优先

## 输入

```json
{
  "skill_gaps": [
    {
      "skill_name": "SQL",
      "gap_severity": "critical",
      "user_current": "无任何编程基础，有Excel数据整理经验",
      "target_required": "能用 SQL 自主查询数据库，编写 JOIN/GROUP BY/窗口函数"
    }
  ],
  "weekly_hours": 8,
  "preferred_language": "zh"
}
```

## 输出（关键字段）

```json
{
  "skill_name": "learning-roadmap-builder",
  "skill_version": "1.0.0",
  "summary": "零基础 SQL 路线图，共3阶段，每周8小时，总计约10周。Excel基础有助于理解数据结构概念，中文资源优先。",
  "confidence": "medium",
  "total_estimated_weeks": 10,
  "roadmap": [
    {
      "skill_name": "SQL",
      "priority": 1,
      "total_weeks": 10,
      "phases": [
        {
          "phase_name": "基础阶段：数据查询语法",
          "goal": "能用 SELECT/WHERE/ORDER BY/LIMIT 从单表查询数据",
          "estimated_weeks": 3,
          "activities": [
            "用 SQLiteOnline 或 DB Fiddle 在线平台练习，无需本地安装",
            "完成20个从简单到复杂的单表查询练习",
            "学习 GROUP BY + 聚合函数（COUNT/SUM/AVG/MAX/MIN）",
            "理解 NULL 值的处理（IS NULL, COALESCE）"
          ],
          "completion_criteria": "给定一张「用户订单表」，能独立写出：按城市统计总销售额、找出最近7天新注册用户数、找出没有下过订单的用户",
          "output_artifact": "一份包含20个 SQL 练习题和答案的文档，每题附自己的解题思路"
        },
        {
          "phase_name": "实践阶段：多表关联查询",
          "goal": "掌握 INNER/LEFT/RIGHT JOIN，能处理3张表以上的关联查询",
          "estimated_weeks": 4,
          "activities": [
            "用真实业务数据（申请公司数据库只读权限）替代练习数据",
            "练习 INNER JOIN / LEFT JOIN 的区别（重点：LEFT JOIN 的 NULL 含义）",
            "学习子查询（IN/EXISTS/相关子查询）",
            "了解窗口函数（ROW_NUMBER/RANK/LAG/LEAD）"
          ],
          "completion_criteria": "能完成一个「用户留存分析」查询：计算每月新用户数、次月留存率，使用 JOIN + 窗口函数",
          "output_artifact": "一份真实业务场景的 SQL 分析报告，包含查询语句和数据结论"
        },
        {
          "phase_name": "进阶阶段：SQL 优化基础",
          "goal": "能读懂执行计划（EXPLAIN），优化常见慢查询",
          "estimated_weeks": 3,
          "activities": [
            "学习索引的基本原理（B树索引、覆盖索引）",
            "用 EXPLAIN 分析现有查询的执行计划",
            "实践：找一个执行时间 >500ms 的查询，添加索引后对比"
          ],
          "completion_criteria": "能展示一个真实的 SQL 慢查询优化案例（有 EXPLAIN 前后对比）",
          "output_artifact": "一个 SQL 优化案例文档，包含：原查询 → EXPLAIN 分析 → 优化方案 → 优化后 EXPLAIN + 时间对比"
        }
      ]
    }
  ],
  "resource_list": [
    {
      "skill_name": "SQL",
      "resource_type": "practice_platform",
      "description": "在线 SQL 练习平台（如 SQLZoo 中文版、LeetCode SQL 题目、DB Fiddle），无需本地安装即可练习",
      "quality_criteria": "选有即时反馈的平台，优先练习有真实业务场景的题目（销售数据/用户行为）而非纯算法题",
      "language": "zh",
      "for_level": "beginner"
    },
    {
      "skill_name": "SQL",
      "resource_type": "chinese_community",
      "description": "掘金/思否上的 MySQL 入门和 SQL 优化专栏（点赞 > 500），优先找有真实案例的系列文章",
      "quality_criteria": "有EXPLAIN截图、有前后性能对比数据的文章质量更高",
      "language": "zh",
      "for_level": "intermediate"
    }
  ],
  "evidence_used": [
    { "field": "skill_gaps[0].user_current", "value": "Excel数据整理经验", "relevance": "理解表格数据结构，SQL入门阶段有助于类比" },
    { "field": "weekly_hours", "value": "8", "relevance": "时间估计基准，低于12小时标准，阶段时间适当延长" }
  ],
  "recommendations": [
    "Excel 有「数据透视表」概念，与 SQL 的 GROUP BY 逻辑类似，学习时可做类比加速理解",
    "建议第2阶段开始用真实业务数据，分析日常工作中的真实问题，比练习题更有动力坚持"
  ],
  "risks": [
    "每周8小时时间较少，建议在工作中找机会用 SQL 解决实际问题，而非只在课外练习"
  ],
  "next_actions": [
    "今天在 SQLZoo 或 LeetCode 完成第一道 SELECT 基础题，验证环境可用"
  ],
  "follow_up_questions": [],
  "cannot_determine": []
}
```
