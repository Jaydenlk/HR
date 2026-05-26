# 示例：大厂后端岗，完整近期面经

## 场景

用户收到字节跳动后端开发岗位面试邀请，询问面试流程和备考重点。

## 输入

```json
{
  "company_name": "字节跳动",
  "job_title": "后端开发工程师",
  "interview_date": "2026-06-10"
}
```

## 输出

```json
{
  "skill_name": "interview-intelligence",
  "skill_version": "1.0.0",
  "confidence": "high",
  "summary": "字节跳动后端开发面试共4-5轮，笔试+3轮技术面+1轮HR面，重点考算法（LeetCode中等偏难）、系统设计（高并发场景）和项目经历深挖，整体难度较高，流程周期约2-3周。",
  "evidence_used": [
    { "source": "牛客网面经", "time_range": "2025-12-至2026-05", "count": 47 },
    { "source": "看准网评价", "time_range": "2026-01-至2026-04", "count": 23 }
  ],
  "interview_flow": [
    {
      "stage": "笔试",
      "description": "2-3道算法题，在线OJ，时限90分钟，题型以LeetCode中等为主，偶有困难题",
      "typical_duration": "90分钟",
      "format": "online",
      "confidence": "high"
    },
    {
      "stage": "技术面1（基础面）",
      "description": "考察数据结构、算法手写、操作系统和网络基础，通常有1道现场手撕代码",
      "typical_duration": "60分钟",
      "format": "online",
      "confidence": "high"
    },
    {
      "stage": "技术面2（项目深挖）",
      "description": "深入追问简历项目细节，系统设计题（如设计消息队列/短链系统），关注技术选型理由",
      "typical_duration": "60-90分钟",
      "format": "online",
      "confidence": "high"
    },
    {
      "stage": "技术面3（主管面）",
      "description": "主管考察技术视野、未来规划，可能涉及业务场景设计，较少手撕代码",
      "typical_duration": "45-60分钟",
      "format": "online",
      "confidence": "medium"
    },
    {
      "stage": "HR面",
      "description": "了解求职动机、职业规划、薪资期望，核实背景信息，通常1周内出结果",
      "typical_duration": "30分钟",
      "format": "phone",
      "confidence": "high"
    }
  ],
  "common_questions": [
    {
      "question": "手写：实现LRU缓存（get/put，O(1)时间复杂度）",
      "category": "technical",
      "frequency": "very_high",
      "source_hint": "牛客面经2025-2026年出现率>60%"
    },
    {
      "question": "设计一个高并发的短链系统，支持百亿级URL，QPS万级",
      "category": "technical",
      "frequency": "high",
      "source_hint": "技术面2高频系统设计题"
    },
    {
      "question": "说说你做过最有挑战性的项目，遇到了什么技术难点，怎么解决的",
      "category": "behavioral",
      "frequency": "very_high",
      "source_hint": "几乎每轮必问，准备2-3个项目故事"
    },
    {
      "question": "为什么选择字节跳动？为什么从现在公司离职？",
      "category": "motivation",
      "frequency": "very_high",
      "source_hint": "HR面必问，提前准备真实且积极的答案"
    },
    {
      "question": "TCP三次握手和四次挥手，为什么是四次而不是三次",
      "category": "technical",
      "frequency": "high",
      "source_hint": "基础面高频网络题"
    }
  ],
  "preparation_priorities": [
    {
      "priority": "critical",
      "area": "LeetCode算法刷题（中等难度，重点：动态规划、二叉树、链表）",
      "rationale": "笔试+技术面1必有手撕代码，面经显示算法是最主要筛选关"
    },
    {
      "priority": "critical",
      "area": "系统设计（高并发、分布式、缓存、消息队列场景）",
      "rationale": "技术面2必考系统设计，字节业务规模大，对高并发设计要求高"
    },
    {
      "priority": "high",
      "area": "项目经历深度准备（每个项目的技术选型理由、难点、成果量化）",
      "rationale": "技术面2-3会深挖项目，准备3个项目的STAR故事"
    },
    {
      "priority": "high",
      "area": "操作系统+网络基础（进程/线程、TCP/IP、HTTP/HTTPS）",
      "rationale": "技术面1基础知识考察，面经显示考察频率约40%"
    },
    {
      "priority": "medium",
      "area": "了解字节主要产品线和技术博客",
      "rationale": "主管面和HR面可能问对字节业务的了解，体现匹配度"
    }
  ],
  "red_flags_to_watch": [
    {
      "signal": "面试官在技术面突然问薪资期望",
      "interpretation": "可能是初步判断候选人价位，此时不宜给出下限，建议给区间或询问岗位薪资范围",
      "severity": "yellow"
    },
    {
      "signal": "HR提到"内部竞争激烈"或"末位淘汰"",
      "interpretation": "字节绩效体系较严，了解清楚考核周期和晋升机制后再决策",
      "severity": "yellow"
    }
  ],
  "recommendations": [
    "距面试约2周，建议优先刷高频算法题（每天2题），准备系统设计模板",
    "准备3个项目的STAR故事，每个控制在3分钟内",
    "笔试通过后3-5天内会安排技术面，注意保持状态"
  ],
  "risks": [
    "算法是最主要筛选门槛，若刷题量不足（<200题），笔试风险较高",
    "字节面试流程较长（2-3周），请勿因此拒绝其他offer"
  ],
  "next_actions": [
    "开始LeetCode刷题计划，优先Hot100中的动态规划和树类题目",
    "整理每个项目的技术难点和量化成果",
    "准备一套系统设计回答框架（需求→估算→架构→深入→扩展）"
  ],
  "follow_up_questions": [
    "你的算法基础如何？需要专门制定刷题计划吗？",
    "你有几年工作经验？这会影响面试难度预期",
    "你的目标薪资范围是多少？需要我帮你分析字节的薪资结构吗？"
  ],
  "cannot_determine": []
}
```

## 说明

- `confidence: high` 因为有近6个月47份面经数据，精确匹配公司和岗位
- `interview_flow` 中技术面3的 `confidence: medium`，因为主管面变数较多
- 红线预警来自真实面经中的候选人反馈，非推断
