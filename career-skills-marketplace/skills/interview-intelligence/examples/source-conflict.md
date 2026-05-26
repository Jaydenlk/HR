# 示例：面经来源描述矛盾

## 场景

用户询问某公司面试流程，但现有面经中对流程描述存在明显矛盾（部分说3轮，部分说5轮）。

## 输入

```json
{
  "company_name": "滴滴出行",
  "job_title": "数据分析师"
}
```

## 输出

```json
{
  "skill_name": "interview-intelligence",
  "skill_version": "1.0.0",
  "confidence": "medium",
  "summary": "滴滴出行数据分析师岗位面经存在流程描述矛盾：部分面经显示3轮（技术面2轮+HR面），另一部分显示5轮（含笔试和总监面）。差异可能与部门和业务线有关，以下综合多方信息提供置信度标注。",
  "evidence_used": [
    { "source": "牛客面经（3轮流程）", "time_range": "2025-06至2026-01", "count": 18 },
    { "source": "看准网面经（5轮流程）", "time_range": "2025-03至2025-11", "count": 12 }
  ],
  "interview_flow": [
    {
      "stage": "笔试（部分部门）",
      "description": "SQL题+逻辑思维题，并非所有部门都有，广告/增长业务线概率更高",
      "typical_duration": "60分钟",
      "format": "online",
      "confidence": "low"
    },
    {
      "stage": "技术面1（数据分析）",
      "description": "SQL手写（多表关联、窗口函数）、数据指标设计、A/B测试方案",
      "typical_duration": "60分钟",
      "format": "online",
      "confidence": "high"
    },
    {
      "stage": "技术面2（业务分析）",
      "description": "业务场景分析、数据诊断（指标下降原因分析），部分面试有Python/统计题",
      "typical_duration": "60分钟",
      "format": "online",
      "confidence": "high"
    },
    {
      "stage": "HR面",
      "description": "职业规划、薪资期望，部分候选人反映有总监终面",
      "typical_duration": "30-45分钟",
      "format": "phone",
      "confidence": "medium"
    }
  ],
  "common_questions": [
    {
      "question": "写SQL：从用户订单表中找出连续3天都有下单的用户",
      "category": "technical",
      "frequency": "very_high",
      "source_hint": "牛客/看准高频题，两个来源均多次提及"
    },
    {
      "question": "滴滴某个核心指标（如日活/完单率）突然下降30%，你如何分析原因",
      "category": "case",
      "frequency": "very_high",
      "source_hint": "业务面必考，结合滴滴实际业务场景"
    }
  ],
  "preparation_priorities": [
    {
      "priority": "critical",
      "area": "SQL进阶（窗口函数、复杂关联、性能优化）",
      "rationale": "所有面经来源一致，SQL是最主要技术筛选项"
    },
    {
      "priority": "critical",
      "area": "数据指标诊断框架（分层拆解、假设验证）",
      "rationale": "业务分析题是高频考点，结合滴滴网约车/货运/电单车业务准备"
    }
  ],
  "red_flags_to_watch": [
    {
      "signal": "面试官暗示"内部HC被冻结但在走流程"",
      "interpretation": "部分候选人反映遇到此情况，建议直接询问HC状态",
      "severity": "red"
    }
  ],
  "recommendations": [
    "面经流程矛盾可能是部门差异，建议询问 HR 确认具体部门的面试轮次",
    "无论3轮还是5轮，SQL和业务分析是确定考点，优先准备"
  ],
  "risks": [
    "面经来源对流程描述存在矛盾，实际轮次因部门而异",
    "部分面经时间较老（2025年初），公司组织架构调整可能影响流程"
  ],
  "next_actions": [
    "联系HR确认具体部门名称和面试轮次",
    "刷LeetCode SQL题目（Hard级别），练习窗口函数"
  ],
  "follow_up_questions": [
    "你是哪个业务线的数据分析师岗位？广告、增长还是运营？",
    "你的SQL水平如何，需要我出几道练习题检验一下吗？"
  ],
  "cannot_determine": [
    "是否有笔试（因部门而异，无法确认）",
    "是否有总监终面（面经描述不一致）",
    "具体业务线的差异化考点"
  ]
}
```

## 说明

- `confidence: medium` 因为有数据但来源存在矛盾
- `cannot_determine` 列出因矛盾无法确认的3个关键点
- 建议用户主动澄清信息（联系HR确认部门）
- 不因矛盾而拒绝输出，而是综合多方并标注置信度
