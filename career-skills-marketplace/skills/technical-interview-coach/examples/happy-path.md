# 示例：4周备考字节跳动后端

## 输入

```json
{
  "job_title": "后端开发工程师",
  "company_name": "字节跳动",
  "available_weeks": 4,
  "interview_intelligence": {
    "common_questions": [
      { "question": "手写LRU缓存", "category": "technical", "frequency": "very_high" }
    ]
  }
}
```

## 输出

```json
{
  "skill_name": "technical-interview-coach",
  "skill_version": "1.0.0",
  "confidence": "high",
  "summary": "字节跳动后端工程师4周备考计划：重点攻算法（LeetCode中等偏难，约60%备考时间）和系统设计（高并发场景，约30%时间），基础知识查漏补缺（10%）。字节笔试难度较高，算法是最主要筛选关。",
  "preparation_plan": [
    {
      "priority": "critical",
      "area": "算法刷题（动态规划/二叉树/链表/滑动窗口）",
      "estimated_hours": 60,
      "target_week": 2,
      "resources_hint": "LeetCode Hot 100，按题型分类刷，每题理解思路后再看优化"
    },
    {
      "priority": "critical",
      "area": "系统设计框架（高并发/缓存/消息队列场景）",
      "estimated_hours": 20,
      "target_week": 3,
      "resources_hint": "System Design Interview相关书籍，重点：缓存一致性、限流、分布式锁"
    },
    {
      "priority": "high",
      "area": "Java/Go 语言特性（JVM/goroutine/GC）",
      "estimated_hours": 12,
      "target_week": 2,
      "resources_hint": "官方文档+掘金高质量文章，重点记忆高频问题的答题框架"
    },
    {
      "priority": "high",
      "area": "计算机基础（操作系统/网络/数据库）",
      "estimated_hours": 10,
      "target_week": 1,
      "resources_hint": "《计算机网络》谢希仁 + MySQL InnoDB内核分析"
    },
    {
      "priority": "medium",
      "area": "字节产品和技术博客了解",
      "estimated_hours": 3,
      "target_week": 4,
      "resources_hint": "字节技术团队官方博客，了解其技术栈和解决方案"
    }
  ],
  "practice_questions": [
    {
      "title": "实现LRU缓存（O(1)get/put）",
      "type": "algorithm",
      "difficulty": "medium",
      "target_company_relevance": "high",
      "key_concepts": ["哈希表", "双向链表", "缓存淘汰策略"]
    },
    {
      "title": "设计秒杀系统（支持10万QPS，防超卖）",
      "type": "system_design",
      "difficulty": "hard",
      "target_company_relevance": "high",
      "key_concepts": ["Redis预减库存", "消息队列异步处理", "分布式锁", "接口幂等性"]
    },
    {
      "title": "二叉树的序列化与反序列化",
      "type": "algorithm",
      "difficulty": "medium",
      "target_company_relevance": "high",
      "key_concepts": ["BFS/DFS", "字符串处理", "树结构"]
    },
    {
      "title": "MySQL查询优化（含 EXPLAIN 分析）",
      "type": "cs_fundamentals",
      "difficulty": "medium",
      "target_company_relevance": "medium",
      "key_concepts": ["索引原理", "执行计划", "慢查询优化"]
    }
  ],
  "common_patterns": [
    {
      "pattern_name": "系统设计五步法",
      "applicable_types": ["system_design"],
      "description": "需求→规模估算→核心组件→深入设计→扩展优化；先说框架再展开，主动引导面试官"
    },
    {
      "pattern_name": "算法解题四步",
      "applicable_types": ["algorithm"],
      "description": "理解→举例→暴力→优化；先说暴力解法，再推导优化，展示思维过程比结果更重要"
    },
    {
      "pattern_name": "手撕代码注释先行",
      "applicable_types": ["coding"],
      "description": "写代码前先写注释说明思路，再填充代码；有语法错误时主动说明「实际写时会注意」"
    }
  ],
  "company_specific_focus": [
    {
      "focus_area": "算法高频题（LeetCode中等偏难）",
      "rationale": "字节笔试和技术面均有算法考察，面经显示通过率约30-40%，算法是主要筛选关",
      "evidence_source": "牛客面经2025-2026，47份面经统计"
    },
    {
      "focus_area": "高并发系统设计（万级QPS场景）",
      "rationale": "字节业务规模大，系统设计题倾向高并发场景，与美团/阿里有相似考察重点",
      "evidence_source": "牛客面经2025-2026，技术面2高频题型"
    }
  ],
  "evidence_used": [
    { "source": "interview-intelligence 面试情报", "company": "字节跳动" }
  ],
  "recommendations": [
    "前2周优先攻算法，这是笔试的核心筛选项",
    "第3周系统设计，准备3-5个场景的完整设计方案",
    "最后1周模拟实战（mock-interviewer + 计时练习）"
  ],
  "risks": [
    "4周时间略紧，算法要保持每天刷题节奏（至少2题），不能一次性冲刺"
  ],
  "next_actions": [
    "今天开始：LeetCode每天2题，从Hot100的「两数之和」开始",
    "本周内：系统设计框架学习（推荐System Design Interview书籍）"
  ],
  "follow_up_questions": [
    "你目前LeetCode刷题量大概是多少？这影响备考计划的起点"
  ],
  "cannot_determine": []
}
```
