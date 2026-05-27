# 示例：完整数据 → 高置信度机会评估

## 场景

用户（3年Java后端，北京，目标互联网中大厂）收到一份字节跳动的 JD，已完成 jd-analyzer 和 match-diagnosis，想综合评估是否值得投递。

## 输入

```json
{
  "jd_analysis": {
    "skill_name": "jd-analyzer",
    "confidence": "high",
    "parsed_jd": {
      "basic": {
        "title": "后端开发工程师（推荐系统方向）",
        "company": "字节跳动",
        "location": "北京",
        "salary_range": "30k-50k × 16 薪",
        "employment_type": "full_time"
      },
      "requirements": {
        "explicit": [
          { "text": "本科及以上，计算机相关专业", "type": "education", "priority": "must_have" },
          { "text": "3年以上Java/Go后端开发经验", "type": "experience", "priority": "must_have" },
          { "text": "熟悉分布式系统、高并发架构", "type": "technical", "priority": "must_have" }
        ],
        "implicit": [
          { "text": "需适应高强度迭代节奏", "inference_reason": "「快速迭代」出现3次", "confidence": "high" }
        ]
      },
      "risk_signals": [
        { "signal": "大小周", "real_meaning": "隔周工作6天，实际周均工时约55小时", "severity": "yellow", "evidence": "福利：大小周" }
      ],
      "responsibilities": [
        { "text": "负责今日头条推荐引擎核心模块开发", "category": "core" }
      ],
      "benefits": [
        { "text": "五险一金", "verified": true },
        { "text": "大小周", "verified": true }
      ],
      "company_context": { "stage": "mature", "signals": ["头部互联网公司，已上市"] }
    }
  },
  "user_profile": {
    "years_of_experience": 3,
    "skills": ["Java", "Spring Boot", "MySQL", "Redis"],
    "education": "本科，计算机科学",
    "target_location": "北京",
    "target_salary_min": 30000
  },
  "match_diagnosis": {
    "overall_match_score": 75,
    "strengths": ["Java经验完全匹配", "学历满足要求", "分布式系统有实际项目"],
    "gaps": ["推荐系统领域经验为零", "Go语言不熟悉"]
  },
  "source_quality": {
    "overall_quality": "verified",
    "red_flags": []
  }
}
```

## 输出

```json
{
  "skill_name": "opportunity-intelligence",
  "skill_version": "1.0.0",
  "summary": "字节跳动推荐系统后端岗位综合评分74分，建议谨慎投递。候选人技术栈匹配度良好（匹配分75），但推荐系统领域经验缺失是主要差距。薪资竞争力强，大小周为已知风险（风险分30）。",
  "confidence": "high",
  "evidence_used": [
    { "source": "jd_analysis", "content": "职位要求3年以上Java/Go后端，薪资30k-50k×16薪" },
    { "source": "match_diagnosis", "content": "整体匹配分75，主要差距为推荐系统经验" },
    { "source": "source_quality", "content": "来源已核实，无红色风险信号" }
  ],
  "recommendations": [
    "重点准备推荐系统相关知识：协同过滤、召回排序基础概念",
    "简历中突出高并发、分布式相关项目经验",
    "提前了解大小周政策，评估个人接受度"
  ],
  "risks": [
    "推荐系统领域经验缺失，面试可能被追问",
    "大小周制度导致实际工作时间较长"
  ],
  "next_actions": [
    "使用 resume-tailor 优化简历，突出分布式和高并发经验",
    "准备推荐系统基础知识（1-2天学习）",
    "在BOSS直聘上直接投递，同时关注内推渠道"
  ],
  "follow_up_questions": [
    "你对大小周的接受度如何？",
    "是否有推荐系统相关的项目经历（哪怕边缘相关）？"
  ],
  "cannot_determine": [],
  "opportunity_score": 74,
  "match_assessment": {
    "score": 75,
    "strengths": ["Java经验完全匹配", "学历满足要求", "分布式系统有实际项目"],
    "gaps": ["推荐系统领域经验为零", "Go语言不熟悉"]
  },
  "market_positioning": {
    "score": 75,
    "salary_competitiveness": "above_market",
    "company_tier": "tier1",
    "growth_potential": "high"
  },
  "risk_flags": [
    {
      "flag": "大小周制度",
      "severity": "yellow",
      "evidence": "JD 福利列表明确标注「大小周」，实际周均工时约55小时"
    },
    {
      "flag": "推荐系统领域经验缺失",
      "severity": "yellow",
      "evidence": "JD 明确要求推荐系统经验，候选人该领域经验为零，面试被刷风险较高"
    }
  ],
  "recommendation": "apply_with_caution"
}
```

## 说明

- 综合分74 = 匹配75×0.4 + 市场分75×0.35 + (100-30)×0.25 = 30 + 26.25 + 17.5 = 73.75 ≈ 74
- 市场分75：字节tier1基础分80，但薪资区间跨度大无法确认高于市场中位数，保守取75
- 风险分30（两个yellow信号：大小周+领域经验缺失，各15分）
- `apply_with_caution` 而非 `strong_apply` 主要因领域经验差距和工时风险
