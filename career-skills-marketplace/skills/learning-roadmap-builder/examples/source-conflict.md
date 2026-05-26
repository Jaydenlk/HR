# 示例：多技能并行路线图（优先级排序）

## 输入

```json
{
  "skill_gaps": [
    { "skill_name": "Kubernetes", "gap_severity": "critical", "user_current": "无K8s经验", "target_required": "生产级K8s管理" },
    { "skill_name": "分布式系统设计", "gap_severity": "critical", "user_current": "有单体系统经验", "target_required": "设计分布式事务方案" },
    { "skill_name": "Python", "gap_severity": "nice_to_have", "user_current": "无Python经验", "target_required": "基础数据处理脚本" }
  ],
  "weekly_hours": 12
}
```

## 输出（关键字段）

```json
{
  "skill_name": "learning-roadmap-builder",
  "skill_version": "1.0.0",
  "summary": "3项技能差距：2项 critical（Kubernetes/分布式设计）+ 1项 nice_to_have（Python）。建议串行学习 critical 项，Python 列入 backlog。总计约 22 周（critical 项）。",
  "confidence": "medium",
  "total_estimated_weeks": 22,
  "roadmap": [
    {
      "skill_name": "Kubernetes",
      "priority": 1,
      "total_weeks": 10,
      "phases": [
        {
          "phase_name": "基础阶段",
          "goal": "能在本地集群部署和管理应用",
          "estimated_weeks": 2,
          "activities": ["搭建 Minikube 集群", "部署第一个服务"],
          "completion_criteria": "能用 kubectl 完整操作 Deployment 生命周期",
          "output_artifact": "部署记录文档"
        },
        {
          "phase_name": "实践阶段",
          "goal": "掌握生产级配置",
          "estimated_weeks": 5,
          "activities": ["健康检查", "滚动更新", "HPA"],
          "completion_criteria": "完整演示包含健康检查和自动扩缩容的部署",
          "output_artifact": "完整K8s YAML配置集"
        },
        {
          "phase_name": "进阶阶段",
          "goal": "故障排查与运维",
          "estimated_weeks": 3,
          "activities": ["故障模拟与排查"],
          "completion_criteria": "30分钟内定位并修复给定故障",
          "output_artifact": "K8s故障排查手册"
        }
      ]
    },
    {
      "skill_name": "分布式系统设计",
      "priority": 2,
      "total_weeks": 12,
      "phases": [
        {
          "phase_name": "概念阶段",
          "goal": "理解CAP、一致性模型、分布式事务基础",
          "estimated_weeks": 4,
          "activities": ["阅读分布式系统经典材料（Raft论文/中文版解析）", "分析现有系统的一致性策略"],
          "completion_criteria": "能用白板解释 Raft 选举过程和 2PC 的局限性",
          "output_artifact": "一篇对比 2PC/3PC/Saga 的技术分析文章"
        },
        {
          "phase_name": "设计实践阶段",
          "goal": "主导一个真实系统的分布式改造方案设计",
          "estimated_weeks": 8,
          "activities": ["选取现岗一个系统，输出分布式改造设计文档（含ADR）", "Review他人的架构设计方案"],
          "completion_criteria": "完成1份包含一致性策略选型、权衡说明的架构设计文档",
          "output_artifact": "架构设计文档（ADR格式）"
        }
      ]
    }
  ],
  "resource_list": [
    {
      "skill_name": "分布式系统设计",
      "resource_type": "chinese_community",
      "description": "掘金/InfoQ 上的分布式系统专栏，优先找有真实案例（如：某公司分布式事务改造实录）的文章",
      "quality_criteria": "有具体数据（QPS/延迟/一致性保证）的工程实践文章质量更高",
      "language": "zh",
      "for_level": "intermediate"
    }
  ],
  "recommendations": [
    "Kubernetes 和分布式设计建议串行学习（先完成K8s，再做分布式设计），避免同时学习两个深度技能导致进度分散",
    "Python（nice_to_have）建议在 critical 项完成后再启动，本期不纳入学习计划"
  ],
  "risks": [
    "分布式系统设计是经验型技能，12周的「设计实践阶段」需要有真实项目驱动，若现岗无合适项目则时间会延长"
  ],
  "next_actions": ["本周启动 Kubernetes 基础阶段，分布式设计在 Kubernetes 完成后（第11周）开始"],
  "follow_up_questions": [],
  "cannot_determine": ["Python backlog 的具体启动时间（取决于 critical 项完成情况）"],
  "evidence_used": [
    { "field": "skill_gaps[0].gap_severity", "value": "critical", "relevance": "K8s 优先级第一" },
    { "field": "skill_gaps[2].gap_severity", "value": "nice_to_have", "relevance": "Python 列入 backlog，不纳入当期计划" }
  ]
}
```
