# 示例：完整简历 → 高置信度画像

## 输入

```json
{
  "resume_text": "张伟\n\n教育背景\n复旦大学 计算机科学与技术 本科 2016-2020\n\n工作经历\n\n字节跳动 2020.07 - 2023.06\n高级后端工程师\n- 负责抖音推荐系统服务端开发，使用 Go 构建高并发微服务，QPS 峰值 50w+\n- 主导 Redis 缓存层改造，接口 P99 延迟从 120ms 降低到 35ms\n- 带领 3 人小组完成春节大促保障，零故障\n\n美团 2023.07 - 至今\n技术专家\n- 负责外卖履约调度系统架构设计，服务覆盖全国 500+ 城市\n- 推动团队 Go 模块化改造，构建时间缩短 40%\n\n技术技能\nGo（熟练），Java（了解），Redis、MySQL、Kafka、Kubernetes\n\n英语：CET-6 580 分，日常读写无障碍\n\n期望：北京/上海，后端架构方向，薪资面谈"
}
```

## 输出

```json
{
  "skill": "profile-builder",
  "confidence": "high",
  "evidence_count": 14,
  "missing_fields": [],
  "profile": {
    "basic": {
      "name": "张伟",
      "education": {
        "school": "复旦大学",
        "major": "计算机科学与技术",
        "degree": "本科",
        "evidence_source": "复旦大学 计算机科学与技术 本科 2016-2020"
      },
      "years_of_experience": 5,
      "current_role": {
        "value": "技术专家",
        "evidence_source": "美团 2023.07 - 至今 技术专家"
      }
    },
    "skills": {
      "technical": [
        {
          "name": "Go",
          "proficiency": "used_in_project",
          "evidence_source": "使用 Go 构建高并发微服务，QPS 峰值 50w+"
        },
        {
          "name": "Redis",
          "proficiency": "used_in_project",
          "evidence_source": "主导 Redis 缓存层改造，接口 P99 延迟从 120ms 降低到 35ms"
        },
        {
          "name": "MySQL",
          "proficiency": "mentioned",
          "evidence_source": "技术技能：Go（熟练），Java（了解），Redis、MySQL、Kafka、Kubernetes"
        },
        {
          "name": "Kafka",
          "proficiency": "mentioned",
          "evidence_source": "技术技能：Go（熟练），Java（了解），Redis、MySQL、Kafka、Kubernetes"
        },
        {
          "name": "Kubernetes",
          "proficiency": "mentioned",
          "evidence_source": "技术技能：Go（熟练），Java（了解），Redis、MySQL、Kafka、Kubernetes"
        },
        {
          "name": "Java",
          "proficiency": "mentioned",
          "evidence_source": "Java（了解）"
        }
      ],
      "soft": [
        {
          "name": "团队领导",
          "evidence_source": "带领 3 人小组完成春节大促保障，零故障"
        }
      ],
      "languages": [
        {
          "language": "英语",
          "level": "CET-6 580 分，日常读写无障碍",
          "evidence_source": "英语：CET-6 580 分，日常读写无障碍"
        }
      ]
    },
    "experience": [
      {
        "company": "字节跳动",
        "role": "高级后端工程师",
        "duration": "2020.07 - 2023.06",
        "achievements": [
          {
            "text": "负责抖音推荐系统服务端开发，使用 Go 构建高并发微服务，QPS 峰值 50w+",
            "evidence_source": "字节跳动工作经历第一条"
          },
          {
            "text": "主导 Redis 缓存层改造，接口 P99 延迟从 120ms 降低到 35ms",
            "evidence_source": "字节跳动工作经历第二条"
          },
          {
            "text": "带领 3 人小组完成春节大促保障，零故障",
            "evidence_source": "字节跳动工作经历第三条"
          }
        ]
      },
      {
        "company": "美团",
        "role": "技术专家",
        "duration": "2023.07 - 至今",
        "achievements": [
          {
            "text": "负责外卖履约调度系统架构设计，服务覆盖全国 500+ 城市",
            "evidence_source": "美团工作经历第一条"
          },
          {
            "text": "推动团队 Go 模块化改造，构建时间缩短 40%",
            "evidence_source": "美团工作经历第二条"
          }
        ]
      }
    ],
    "strengths": [
      {
        "description": "高并发系统设计与性能优化，有量化指标支撑",
        "evidence_source": "P99 延迟从 120ms 降到 35ms；QPS 50w+"
      },
      {
        "description": "跨团队大促保障经验，有零故障记录",
        "evidence_source": "带领 3 人小组完成春节大促保障，零故障"
      }
    ],
    "weaknesses": [],
    "constraints": {
      "location": ["北京", "上海"],
      "salary_expectation": "薪资面谈",
      "deal_breakers": []
    },
    "career_intent": {
      "target_roles": ["后端架构"],
      "industry_preference": [],
      "urgency": "unknown"
    }
  }
}
```

## 说明

- 工龄由字节跳动入职时间 2020.07 推算至今（2026.05），约 5 年
- Python 未出现在简历中，因此不在技术技能列表内（幻觉防护验证点）
- `weaknesses` 为空：无跳槽频繁、能力缺口等负面信号
