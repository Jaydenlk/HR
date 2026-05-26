# 示例：阿里巴巴后端工程师题库（有完整面经数据）

## 输入

```json
{
  "company_name": "阿里巴巴",
  "job_title": "Java后端工程师",
  "max_questions": 20
}
```

## 输出（节选）

```json
{
  "skill_name": "question-bank-builder",
  "skill_version": "1.0.0",
  "confidence": "high",
  "summary": "基于2025-2026年47份牛客面经构建阿里巴巴Java后端工程师题库，共20题，覆盖技术基础/Java深度/系统设计/行为题四大模块，估算覆盖已知出题范围约70%。",
  "question_bank": [
    {
      "id": "ali-be-001",
      "question": "Java中HashMap的底层实现原理，JDK8与JDK7的区别",
      "category": "technical_domain",
      "subcategory": "Java核心",
      "difficulty": "medium",
      "frequency": "very_high",
      "source": "牛客面经2025-2026，出现率>70%",
      "answer_hint": "数组+链表+红黑树（JDK8），链表长度>8转红黑树；JDK7为数组+链表，头插法",
      "time_estimate": 3
    },
    {
      "id": "ali-be-002",
      "question": "设计一个支持10亿用户的微博消息系统，包括发帖、关注和feed流",
      "category": "system_design",
      "subcategory": "社交系统设计",
      "difficulty": "hard",
      "frequency": "high",
      "source": "牛客面经2025-2026，系统设计题出现率约40%",
      "answer_hint": "推拉结合策略（大V用拉，普通用户用推）；Redis缓存热点feed；消息队列削峰",
      "time_estimate": 15
    },
    {
      "id": "ali-be-003",
      "question": "MySQL InnoDB的MVCC实现原理，如何解决幻读",
      "category": "technical_cs",
      "subcategory": "数据库",
      "difficulty": "medium",
      "frequency": "very_high",
      "source": "牛客面经2025-2026，数据库题必考",
      "answer_hint": "版本链+ReadView；RC和RR隔离级别下ReadView创建时机不同；间隙锁+临键锁防幻读",
      "time_estimate": 4
    },
    {
      "id": "ali-be-004",
      "question": "描述你解决过的最复杂的技术问题，如何定位和解决",
      "category": "behavioral",
      "subcategory": "技术攻坚",
      "difficulty": "medium",
      "frequency": "very_high",
      "source": "阿里面试高频行为题，几乎必问",
      "answer_hint": "STAR结构，重点在行动：问题定位工具（arthas/jstack/gc log）+解决方案+预防机制",
      "time_estimate": 5
    }
  ],
  "coverage": {
    "total_questions": 20,
    "by_category": {
      "technical_cs": 5,
      "technical_domain": 7,
      "system_design": 4,
      "behavioral": 3,
      "motivation": 1
    },
    "estimated_coverage_percentage": 70
  },
  "gaps": [
    {
      "area": "分布式事务处理（Seata/TCC）",
      "reason": "面经中出现频率中等，且答案差异较大，未纳入高置信度题库",
      "workaround": "参考阿里技术博客中的分布式事务实践文章作为补充"
    },
    {
      "area": "特定业务线专属题（如淘宝/钉钉）",
      "reason": "不同BU的面试题差异较大，通用题库无法覆盖",
      "workaround": "面试前询问HR确认具体BU，在脉脉搜索该BU员工获取定向信息"
    }
  ],
  "evidence_used": [
    { "source": "牛客面经", "time_range": "2025-06至2026-05", "count": 47 }
  ],
  "recommendations": [
    "技术基础（特别是JVM/并发/MySQL）是阿里Java面必考，优先复习",
    "准备2-3个系统设计答题框架，覆盖常见场景（缓存/消息队列/分布式锁）"
  ],
  "risks": ["部分高频题答案随JDK版本迭代变化，注意确认目标版本"],
  "next_actions": [
    "按 frequency: very_high 的题目优先复习",
    "系统设计题建议用纸笔画架构图练习"
  ],
  "follow_up_questions": [
    "你面的是哪个BU？不同BU考察重点有差异",
    "你的Java工作年限？这会影响题目难度期望"
  ],
  "cannot_determine": []
}
```

## 说明

- `confidence: high` 因为有近6个月47份面经
- 每题 `source` 明确标注，无来源的题不放入高频
- `gaps` 列出题库空白区域，引导用户自行补充
