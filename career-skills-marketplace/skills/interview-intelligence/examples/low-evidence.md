# 示例：小公司，低证据场景

## 场景

用户准备面试一家成立3年的B轮创业公司，市场上几乎没有该公司的面经。

## 输入

```json
{
  "company_name": "锐思数据科技",
  "job_title": "产品经理"
}
```

## 输出

```json
{
  "skill_name": "interview-intelligence",
  "skill_version": "1.0.0",
  "confidence": "low",
  "summary": "未找到锐思数据科技产品经理岗位的直接面经，以下情报基于同规模（B轮）数据科技公司产品经理岗位的通用规律，具体流程和题目可能存在较大差异。",
  "evidence_used": [
    { "source": "B轮数据科技公司产品经理通用面试模式", "time_range": "通用规律", "count": 0 }
  ],
  "interview_flow": [
    {
      "stage": "简历筛选+电话初筛",
      "description": "HR简单了解背景和薪资期望，确认基本匹配",
      "typical_duration": "15-20分钟",
      "format": "phone",
      "confidence": "medium"
    },
    {
      "stage": "业务面1（产品负责人面）",
      "description": "考察产品思维、需求分析能力、项目经历，通常有1道产品设计题",
      "typical_duration": "60分钟",
      "format": "offline",
      "confidence": "low"
    },
    {
      "stage": "HR面",
      "description": "文化契合、薪资期望确认",
      "typical_duration": "30分钟",
      "format": "offline",
      "confidence": "medium"
    }
  ],
  "common_questions": [
    {
      "question": "请设计一个数据产品的核心功能，帮助企业用户进行销售数据分析",
      "category": "case",
      "frequency": "high",
      "source_hint": "数据产品类公司产品面常见题型，非该公司直接面经"
    },
    {
      "question": "介绍你做过最复杂的产品需求，如何处理需求冲突",
      "category": "behavioral",
      "frequency": "very_high",
      "source_hint": "产品经理岗位通用高频题"
    }
  ],
  "preparation_priorities": [
    {
      "priority": "critical",
      "area": "深入研究锐思数据科技的产品（官网、AppStore、公众号）",
      "rationale": "小公司最看重候选人对其产品的理解和热情，了解产品是基础"
    },
    {
      "priority": "high",
      "area": "准备2-3个数据产品或To B产品的项目经历",
      "rationale": "数据科技公司倾向招有B端产品经验的候选人"
    },
    {
      "priority": "medium",
      "area": "了解数据分析/BI行业竞品（如帆软、神策、tableau）",
      "rationale": "面试官可能考察行业认知和竞品分析能力"
    }
  ],
  "red_flags_to_watch": [
    {
      "signal": "面试官无法清晰说明产品路线图或近期目标",
      "interpretation": "可能公司产品方向尚不清晰，产品经理将面临频繁需求变更",
      "severity": "yellow"
    }
  ],
  "recommendations": [
    "在面试前主动使用该公司产品，准备真实的产品体验反馈和改进建议",
    "面试时主动询问团队规模、产品迭代节奏、近期核心目标"
  ],
  "risks": [
    "本情报置信度低，具体流程和考题与实际可能存在较大差异",
    "建议通过LinkedIn或脉脉联系该公司员工获取一手信息"
  ],
  "next_actions": [
    "通过官网、AppStore下载并体验产品，记录使用体验",
    "在LinkedIn/脉脉搜索该公司产品员工，尝试获取内部信息",
    "准备一套To B产品的产品设计框架（用户场景→痛点→方案→验证）"
  ],
  "follow_up_questions": [
    "你有To B产品经历吗？这会影响面试策略",
    "你是通过什么渠道投递的？内推渠道可以帮你提前了解岗位具体情况"
  ],
  "cannot_determine": [
    "锐思数据科技的具体面试轮次（无直接面经）",
    "是否有笔试或产品设计题作业",
    "技术考察深度（是否需要SQL或数据分析能力）",
    "面试官背景和偏好"
  ]
}
```

## 说明

- `confidence: low` 因为没有该公司直接面经，数据来源为同类型公司通用规律
- `cannot_determine` 明确列出4项无法确认的信息，不编造具体细节
- 建议部分引导用户主动获取一手信息
