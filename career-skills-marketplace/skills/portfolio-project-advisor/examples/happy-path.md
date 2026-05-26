# 示例：Go 后端工程师的 Portfolio 项目推荐

## 输入

```json
{
  "profile": {
    "basic": { "name": "张伟", "years_of_experience": 5, "current_role": { "value": "技术专家" } },
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "Redis", "proficiency": "used_in_project" },
        { "name": "Kafka", "proficiency": "mentioned" }
      ]
    },
    "experience": [
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今",
        "achievements": [{ "text": "外卖履约调度系统架构设计", "evidence_source": "工作描述" }] }
    ]
  },
  "skill_gaps": [
    { "skill_name": "Kubernetes", "gap_severity": "critical" }
  ],
  "target_role": "高级后端架构师",
  "available_weeks": 12
}
```

## 输出

```json
{
  "skill_name": "portfolio-project-advisor",
  "skill_version": "1.0.0",
  "summary": "基于 Go+Redis 技能和调度系统经验，推荐3个项目：K8s部署实践（弥补差距）、分布式限流库（展示核心技术）、开源调度器（高影响力，高成本）。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.skills.technical[Go=used_in_project]", "value": "Go熟练", "relevance": "项目技术栈选择基准" },
    { "field": "skill_gaps[0].skill_name", "value": "Kubernetes", "relevance": "第一个项目以弥补此差距为目标" },
    { "field": "profile.experience[美团].achievements[调度系统]", "value": "调度系统架构经验", "relevance": "第三个项目的内容基础" }
  ],
  "recommendations": [
    "优先做项目1（K8s部署实践）：与 critical 差距直接对应，完成后可立即用于面试",
    "项目2（分布式限流库）是核心竞争力展示，但比项目1耗时，建议在项目1完成后进行"
  ],
  "risks": [
    "项目3（开源调度器）规模较大，在有工作压力的情况下容易半途而废，建议只在时间充裕时开始"
  ],
  "next_actions": [
    "本周开始项目1：在本机搭建 Minikube，将现有 Go 服务部署到 K8s"
  ],
  "follow_up_questions": [
    "你在美团的调度系统代码能否开源（哪怕只是架构设计文档）？这会直接影响项目3的可行性"
  ],
  "cannot_determine": [],
  "project_ideas": [
    {
      "title": "将个人 Go 服务完整部署到 Kubernetes",
      "description": "选择一个有实际功能的 Go 服务（可以是自己写的工具），完整配置 K8s 部署（Deployment/Service/HPA/Ingress/ConfigMap），实现健康检查、滚动更新、自动扩缩容。",
      "skills_demonstrated": ["Go", "Kubernetes", "Docker", "系统运维"],
      "size": "small",
      "estimated_weeks": 3,
      "interview_talking_points": [
        "为什么选择这些 K8s 配置参数（资源限制/probe阈值），理由是什么",
        "如何处理 Pod 崩溃和自动恢复",
        "滚动更新策略的选择与零宕机部署的实现"
      ],
      "evidence_basis": "skill_gaps[0].skill_name=Kubernetes(critical)：直接弥补最重要的差距",
      "github_visibility": true
    },
    {
      "title": "Go 实现的高并发分布式限流库",
      "description": "基于 Redis 实现一个支持滑动窗口/令牌桶/漏桶三种算法的分布式限流库，支持多种存储后端，提供 Go 原生 API 和 HTTP 中间件。",
      "skills_demonstrated": ["Go", "Redis", "分布式系统", "API 设计", "单元测试"],
      "size": "medium",
      "estimated_weeks": 5,
      "interview_talking_points": [
        "三种限流算法的实现差异和适用场景（能展示技术深度）",
        "分布式场景下的竞争条件处理（Redis Lua 脚本的使用）",
        "如何设计可扩展的存储后端抽象层",
        "基准测试结果（QPS、延迟数据）"
      ],
      "evidence_basis": "profile.skills.technical[Go=used_in_project, Redis=used_in_project]：两项核心技能的深度组合",
      "github_visibility": true
    },
    {
      "title": "轻量级任务调度引擎（Go 实现）",
      "description": "参考美团调度系统经验，实现一个轻量级的分布式任务调度引擎，支持 cron、一次性任务、DAG依赖调度，提供 Web UI 和 API。",
      "skills_demonstrated": ["Go", "分布式系统", "系统设计", "调度算法"],
      "size": "large",
      "estimated_weeks": 12,
      "interview_talking_points": [
        "调度引擎的分布式一致性如何保证（选主策略）",
        "任务执行失败的重试机制设计",
        "与美团生产调度系统的对比（差异和改进空间）",
        "性能指标（并发任务数、调度延迟）"
      ],
      "evidence_basis": "profile.experience[美团].achievements[外卖履约调度系统架构设计]：有真实调度系统设计经验，可做开源版本",
      "github_visibility": true
    }
  ],
  "anti_patterns": [
    {
      "pattern": "TodoApp 或 Blog 系统",
      "reason": "网上有成千上万个 Go TodoApp，无差异化价值，面试官见过太多次"
    },
    {
      "pattern": "跟着视频做的电商系统",
      "reason": "架构决策不是你做的，面试时无法回答「为什么这样设计」，反而暴露经验不足"
    },
    {
      "pattern": "Kafka 流处理项目（因为 Kafka 是 mentioned 技能）",
      "reason": "profile.skills.technical[Kafka=mentioned]：Kafka 仅提及级别，做相关项目无法应对面试深度追问"
    },
    {
      "pattern": "规模过大的微服务平台（>6个月）",
      "reason": "在有工作的情况下，>6个月的项目完成率极低，半成品比没有更差"
    }
  ]
}
```
