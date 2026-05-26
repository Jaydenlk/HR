# 示例：大厂后端工程师 → 技术深度型品牌

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
      { "company": "字节跳动", "role": "高级后端工程师", "duration": "2020.07-2023.06",
        "achievements": [
          { "text": "使用Go构建高并发微服务，QPS峰值50w+", "evidence_source": "工作描述" },
          { "text": "主导Redis缓存层改造，P99延迟从120ms降到35ms", "evidence_source": "工作描述" }
        ]
      },
      { "company": "美团", "role": "技术专家", "duration": "2023.07-至今",
        "achievements": [
          { "text": "外卖履约调度系统架构设计，覆盖500+城市", "evidence_source": "工作描述" }
        ]
      }
    ]
  }
}
```

## 输出

```json
{
  "skill_name": "personal-brand-builder",
  "skill_version": "1.0.0",
  "summary": "基于字节+美团5年大厂后端经验，推荐「高并发后端工程技术深度型」品牌定位。Redis优化案例（P99 120ms→35ms）和调度系统（500+城市）是核心内容资产。优先布局掘金和GitHub。",
  "confidence": "high",
  "evidence_used": [
    { "field": "profile.skills.technical[Go=used_in_project]", "value": "Go高并发", "relevance": "技术深度内容的核心方向" },
    { "field": "profile.experience[字节].achievements[Redis优化]", "value": "P99 120ms→35ms", "relevance": "有量化数据的技术案例，适合写技术文章" },
    { "field": "profile.experience[美团].achievements[调度系统]", "value": "500+城市规模", "relevance": "大规模系统经验是差异化内容资产" }
  ],
  "recommendations": [
    "核心内容资产是「Redis缓存优化实战」和「大规模调度系统架构」，这两个案例都有量化数据，内容可信度高",
    "优先掘金（技术深度型内容匹配度最高），GitHub 次之（展示真实代码）",
    "避免在 CSDN 发布高质量内容（平台定位低端，会稀释个人品牌）"
  ],
  "risks": [
    "字节/美团的具体项目细节涉及公司保密，内容需要做适当泛化处理（不暴露具体业务数据）",
    "Kafka 仅 mentioned 级别，不建议发布 Kafka 深度内容（背书不足，读者会追问）"
  ],
  "next_actions": [
    "将 Redis 优化案例写成掘金文章（主题：「一次 Redis 缓存改造：P99 从 120ms 到 35ms」），具体到代码层面",
    "整理调度系统架构设计思路（去掉公司敏感信息），形成 GitHub 公开的系统设计文档"
  ],
  "follow_up_questions": [
    "你对开源有兴趣吗？如果有，Go 生态有哪些小工具是你在工作中写过但未开源的？",
    "字节/美团的项目中哪些是你可以公开讨论的？（影响内容选材）"
  ],
  "cannot_determine": [
    "是否有可以开源的工具代码（影响 GitHub 策略）"
  ],
  "brand_strategy": {
    "type": "technical_depth",
    "positioning": "Go 高并发后端工程师 | 大规模系统设计实践者（字节/美团）",
    "evidence_basis": [
      "profile.skills.technical[Go=used_in_project]：Go是核心技术方向",
      "profile.experience[字节,美团]：双大厂背景是权威性背书",
      "profile.experience[字节].achievements[QPS50w+,P99优化]：有量化数据的技术案例"
    ]
  },
  "platform_actions": [
    {
      "platform": "掘金",
      "action": "开设「Go高并发工程实践」专栏，首篇文章主题：Redis缓存优化实战（P99 120ms→35ms）",
      "priority": "high",
      "rationale": "profile.experience[字节].achievements 中的Redis优化有量化数据，适合技术深度文章；掘金Go后端技术内容受众精准"
    },
    {
      "platform": "GitHub",
      "action": "创建个人主页 README，将调度系统架构设计文档（脱敏版）作为 pinned 项目展示",
      "priority": "high",
      "rationale": "profile.experience[美团].调度系统覆盖500+城市，规模数据是强力 GitHub 展示材料"
    },
    {
      "platform": "思否",
      "action": "在思否回答 Go 并发相关高票问题，建立技术权威性",
      "priority": "medium",
      "rationale": "profile.skills.technical[Go=used_in_project]：有实战经验，回答质量有保证"
    },
    {
      "platform": "知乎",
      "action": "发布「大厂后端工程师的5年成长路径」经验总结",
      "priority": "low",
      "rationale": "profile.experience[字节+美团]：双大厂背景的职业路径有受众，但优先级低于技术内容"
    }
  ],
  "content_ideas": [
    {
      "title": "Redis 缓存层改造实战：P99 从 120ms 到 35ms",
      "angle": "用量化数据说话，展示完整的「问题定位 → 方案设计 → 落地验证」全流程",
      "source_experience": "profile.experience[字节跳动].achievements[主导Redis缓存层改造，P99延迟从120ms降到35ms]",
      "format": "case_study"
    },
    {
      "title": "全国 500+ 城市的外卖调度系统：如何设计高可用调度架构",
      "angle": "从实际规模出发（500城市），讨论调度算法选型和容灾策略（需脱敏）",
      "source_experience": "profile.experience[美团].achievements[外卖履约调度系统架构设计，覆盖500+城市]",
      "format": "article"
    },
    {
      "title": "Go 高并发微服务从 0 到 QPS 50w+：我们做了什么",
      "angle": "具体的技术决策记录（Go协程模型选择、限流策略、监控埋点）",
      "source_experience": "profile.experience[字节跳动].achievements[使用Go构建高并发微服务，QPS峰值50w+]",
      "format": "tutorial"
    }
  ],
  "profile_optimization": [
    {
      "platform": "GitHub",
      "current_issue": "profile 中未提及 GitHub 账号，无法判断当前状态",
      "suggested_change": "创建个人主页 README.md，展示：核心技术栈（Go/Redis）、代表项目（脱敏版调度系统设计文档）、联系方式"
    },
    {
      "platform": "BOSS直聘",
      "current_issue": "profile.experience 描述未量化：「高级后端工程师」缺少规模数据",
      "suggested_change": "修改为：「字节跳动高级后端工程师 | 负责推荐系统服务端，日均QPS峰值50w+；主导Redis优化，P99延迟降低70%」"
    }
  ]
}
```
