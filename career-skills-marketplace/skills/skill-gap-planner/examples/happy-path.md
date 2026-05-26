# 示例：有 JD 数据的完整差距分析

## 输入

```json
{
  "profile": {
    "basic": {
      "name": "张伟",
      "education": { "degree": "本科" },
      "years_of_experience": 5,
      "current_role": { "value": "技术专家" }
    },
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "Redis", "proficiency": "used_in_project" },
        { "name": "MySQL", "proficiency": "mentioned" },
        { "name": "Kafka", "proficiency": "mentioned" }
      ]
    },
    "experience": [
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今" }
    ]
  },
  "jd_analysis": {
    "required_skills": [
      { "name": "Go", "level": "proficient", "importance": "critical" },
      { "name": "Kubernetes", "level": "proficient", "importance": "critical" },
      { "name": "分布式系统设计", "level": "expert", "importance": "critical" },
      { "name": "MySQL", "level": "proficient", "importance": "important" },
      { "name": "Python", "level": "basic", "importance": "nice_to_have" }
    ],
    "job_title": "高级后端架构师"
  }
}
```

## 输出

```json
{
  "skill_name": "skill-gap-planner",
  "skill_version": "1.0.0",
  "summary": "对比画像与架构师JD要求，识别出2项critical差距（Kubernetes、分布式系统设计）和1项important差距（MySQL深度）。Go是核心优势，无差距。学习计划共3项，预计总时长约20周。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.skills.technical[Go=used_in_project]", "value": "Go熟练", "relevance": "JD要求 Go proficient，已满足" },
    { "field": "profile.skills.technical[MySQL=mentioned]", "value": "MySQL仅提及", "relevance": "JD要求 MySQL proficient，存在重要差距" },
    { "field": "jd_analysis.required_skills[Kubernetes=critical]", "value": "JD要求Kubernetes熟练", "relevance": "profile中无Kubernetes记录，critical差距" }
  ],
  "recommendations": [
    "优先补强 Kubernetes（critical，且无任何基础），建议用3个月时间在实际项目中实践",
    "分布式系统设计是经验型技能，不能靠读书补，需要在现岗主导真实架构决策"
  ],
  "risks": [
    "分布式系统设计需要实际项目经验支撑，纯自学难以应付架构师面试的深度追问"
  ],
  "next_actions": [
    "本月内在本地搭建 Kubernetes 集群，完成一个完整的应用部署和故障演练",
    "向现任组长申请主导下一个新服务的架构设计，留存架构文档作为面试材料"
  ],
  "follow_up_questions": [
    "你在美团的调度系统中是否有接触过 Kubernetes 相关运维？哪怕是间接接触？",
    "你目前负责的服务规模是多少（QPS、节点数）？"
  ],
  "cannot_determine": [
    "分布式事务实战经验（profile 中的调度系统描述未说明是否涉及分布式事务）"
  ],
  "gap_analysis": [
    {
      "skill_name": "Kubernetes",
      "gap_severity": "critical",
      "user_current": "profile.skills.technical 中无 Kubernetes 任何记录",
      "target_required": "jd_analysis.required_skills[Kubernetes, level=proficient, importance=critical]：能独立管理生产级K8s集群",
      "source_evidence": "JD原文要求：熟练使用Kubernetes进行容器编排和服务部署"
    },
    {
      "skill_name": "分布式系统设计",
      "gap_severity": "critical",
      "user_current": "profile 中有调度系统架构经验，但未标注分布式设计深度",
      "target_required": "jd_analysis.required_skills[分布式系统设计, level=expert]：能设计CAP权衡、一致性协议",
      "source_evidence": "JD原文要求：精通分布式系统设计，理解CAP理论和一致性协议"
    },
    {
      "skill_name": "MySQL（进阶）",
      "gap_severity": "important",
      "user_current": "profile.skills.technical[MySQL=mentioned]：仅在技能列表中提及，无项目佐证",
      "target_required": "jd_analysis.required_skills[MySQL, level=proficient]：SQL优化、索引设计、分库分表",
      "source_evidence": "JD原文要求：熟练MySQL，有SQL调优和大表处理经验"
    }
  ],
  "learning_plan": [
    {
      "skill_name": "Kubernetes",
      "priority": 1,
      "approach": "在本地搭建 Kubernetes 集群（Minikube 或 Kind），将现有 Go 服务容器化并在 K8s 上运行，模拟节点故障恢复、滚动更新、资源限制等生产场景",
      "estimated_weeks": 8,
      "completion_criteria": "能独立完成一个包含 3 个微服务的 K8s 部署，实现自动伸缩和健康检查，并能描述每个配置参数的生产含义",
      "resource_type": "project_practice"
    },
    {
      "skill_name": "分布式系统设计",
      "priority": 2,
      "approach": "在现岗主导一个新服务的架构设计方案，包含高可用设计、数据一致性方案选型，输出架构设计文档（含 ADR：架构决策记录）",
      "estimated_weeks": 12,
      "completion_criteria": "完成1份完整的架构设计文档，包含一致性策略选型理由和权衡，可在面试中直接引用",
      "resource_type": "project_practice"
    },
    {
      "skill_name": "MySQL 进阶",
      "priority": 3,
      "approach": "选取现岗业务中的一个慢查询问题，完整执行「问题定位 → 索引优化 → 执行计划验证 → 前后对比」的完整优化流程，留存量化数据",
      "estimated_weeks": 4,
      "completion_criteria": "能展示一个真实的 SQL 慢查询优化案例，优化前后查询时间有量化对比",
      "resource_type": "project_practice"
    }
  ],
  "quick_wins": [
    {
      "skill_name": "MySQL 进阶",
      "action": "找到现有系统中一个执行时间 >100ms 的 SQL，分析执行计划（EXPLAIN），添加合适的索引并验证效果",
      "expected_result": "有1个真实的 SQL 优化案例可在面试中展示，查询时间量化改善",
      "basis": "profile.skills.technical[MySQL=mentioned]：已有基础知识，深度不足，但实践门槛低"
    }
  ],
  "long_term_investments": [
    {
      "skill_name": "Kubernetes 生产运维经验",
      "rationale": "Kubernetes 生产经验需要在实际规模下（数百节点）积累，本地演练只能覆盖基础场景，critical 级差距需要长期投入",
      "path": "从本地实验环境 → 参与公司生产 K8s 运维 → 主导一个服务的 K8s 迁移项目，预计需要12个月以上"
    },
    {
      "skill_name": "分布式系统设计（专家级）",
      "rationale": "Expert 级别的分布式设计需要在多个大型系统中历练，无法通过短期学习达到",
      "path": "在现岗持续主导架构设计，积累3-5个不同场景的设计案例（高并发/强一致性/跨机房），预计2-3年"
    }
  ]
}
```
