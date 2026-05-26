# 示例：Kubernetes 学习路线图（有 Go 基础）

## 输入

```json
{
  "skill_gaps": [
    {
      "skill_name": "Kubernetes",
      "gap_severity": "critical",
      "user_current": "profile 中无 Kubernetes 记录，有 Go 和 Docker 基础",
      "target_required": "能独立管理生产级 K8s 集群，处理滚动更新、故障排查"
    }
  ],
  "profile": {
    "skills": {
      "technical": [
        { "name": "Go", "proficiency": "used_in_project" },
        { "name": "Docker", "proficiency": "mentioned" }
      ]
    }
  },
  "weekly_hours": 12,
  "preferred_language": "zh"
}
```

## 输出

```json
{
  "skill_name": "learning-roadmap-builder",
  "skill_version": "1.0.0",
  "summary": "基于有 Go+Docker 基础的用户，生成 Kubernetes 3阶段学习路线图，每周 12 小时，总计约 10 周。中文资源优先。",
  "confidence": "high",
  "evidence_used": [
    { "field": "skill_gaps[0].user_current", "value": "有Go和Docker基础", "relevance": "有 Docker 基础可跳过容器化基础，直接进入 K8s 概念阶段" },
    { "field": "weekly_hours", "value": "12", "relevance": "时间估计基准，业余学习标准" }
  ],
  "recommendations": [
    "有 Docker 基础，Kubernetes 入门阶段可缩短至2周，直接从 Pod/Deployment 概念开始",
    "建议全程用真实的 Go 服务作为被部署应用，而非示例 nginx，更贴近工作场景"
  ],
  "risks": [
    "K8s 生产经验无法完全在本地复现，第3阶段建议争取在公司生产环境实践"
  ],
  "next_actions": [
    "本周在本机安装 Minikube 或 Kind，完成第一阶段第一个活动"
  ],
  "follow_up_questions": [
    "你使用 Docker 是仅在本地构建镜像，还是有过 docker-compose 多服务部署经验？"
  ],
  "cannot_determine": [],
  "total_estimated_weeks": 10,
  "roadmap": [
    {
      "skill_name": "Kubernetes",
      "priority": 1,
      "total_weeks": 10,
      "phases": [
        {
          "phase_name": "基础阶段：核心概念与基础操作",
          "goal": "理解 K8s 核心资源模型，能在本地集群部署和访问一个应用",
          "estimated_weeks": 2,
          "activities": [
            "安装 Minikube 或 Kind，搭建本地单节点集群",
            "学习 Pod、Deployment、Service、ConfigMap、Secret 核心概念",
            "用 kubectl 完成：创建/查看/删除/更新 Deployment",
            "将现有 Go 服务打包为 Docker 镜像，部署到本地 K8s"
          ],
          "completion_criteria": "能独立在本地集群部署一个 Go 服务，通过 kubectl port-forward 访问，能描述 Pod 和 Deployment 的关系",
          "output_artifact": "一份记录了完整部署过程的 README，包含所有 kubectl 命令和配置文件"
        },
        {
          "phase_name": "实践阶段：生产级配置与常见场景",
          "goal": "掌握生产级 K8s 配置：健康检查、资源限制、滚动更新、故障恢复",
          "estimated_weeks": 5,
          "activities": [
            "为 Go 服务配置 liveness/readiness probe",
            "配置资源限制（CPU/Memory requests & limits）",
            "实践滚动更新（rolling update）和回滚（rollback）",
            "模拟 Pod 崩溃，观察自动重启和 PodDisruptionBudget",
            "使用 Horizontal Pod Autoscaler 实现自动扩缩容",
            "配置 Ingress 实现域名路由"
          ],
          "completion_criteria": "能完整演示一个包含健康检查、滚动更新和自动扩缩容的 K8s 部署，能解释每个配置项的生产含义",
          "output_artifact": "一套完整的 K8s YAML 配置文件（含 Deployment/Service/HPA/Ingress），附上每个配置参数的注释说明"
        },
        {
          "phase_name": "进阶阶段：故障排查与运维实战",
          "goal": "能独立排查 K8s 常见故障，理解 K8s 底层机制",
          "estimated_weeks": 3,
          "activities": [
            "故障模拟：故意制造 OOMKilled、CrashLoopBackOff、Pending 状态并排查",
            "学习 kubectl logs、kubectl describe、kubectl exec 的故障排查流程",
            "了解 RBAC 基础配置（ServiceAccount、ClusterRole）",
            "学习 PersistentVolume 和 StatefulSet 的使用场景"
          ],
          "completion_criteria": "给定一个故障 K8s 集群状态截图，能在30分钟内定位故障原因并给出修复命令",
          "output_artifact": "一份「K8s 常见故障排查手册」（Markdown），覆盖5种以上常见故障场景"
        }
      ]
    }
  ],
  "resource_list": [
    {
      "skill_name": "Kubernetes",
      "resource_type": "official_docs",
      "description": "Kubernetes 官方文档（kubernetes.io），包含中文翻译版本，概念解释权威且更新及时",
      "quality_criteria": "优先看官方 Concepts 和 Tasks 章节，Tutorial 章节可作为补充",
      "language": "zh",
      "for_level": "beginner"
    },
    {
      "skill_name": "Kubernetes",
      "resource_type": "chinese_community",
      "description": "掘金/CSDN 的 Kubernetes 实战专栏，重点找有真实生产场景案例的文章（点赞 > 500）",
      "quality_criteria": "优先有量化数据（集群规模、节点数、资源配置）的文章，避免纯概念复述的文章",
      "language": "zh",
      "for_level": "intermediate"
    },
    {
      "skill_name": "Kubernetes",
      "resource_type": "practice_platform",
      "description": "本地 Minikube 或 Kind 集群，配合 K8s 官方 playground（play.k8s.io）进行实验",
      "quality_criteria": "优先用自己的 Go 项目部署，而非 hello-world 示例",
      "language": "both",
      "for_level": "beginner"
    },
    {
      "skill_name": "Kubernetes",
      "resource_type": "book",
      "description": "K8s 领域评分较高的中文书籍，选择出版时间在最近2年内的版本（K8s 变化较快）",
      "quality_criteria": "豆瓣评分 > 8.0，优先有实战案例而非纯理论的书",
      "language": "zh",
      "for_level": "intermediate"
    }
  ]
}
```
