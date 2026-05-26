# 示例：成功提取牛客网技术面经

## 场景

用户备考某大厂后端工程师，从牛客网实时获取到面试数据。

## 输入

```json
{
  "company": "美团",
  "role": "后端工程师",
  "focus": "both",
  "max_posts": 5
}
```

## 输出

```json
{
  "skill_name": "nowcoder-tech-miner",
  "skill_version": "1.0.0",
  "summary": "从牛客网提取到美团后端工程师面经 5 篇，笔试题 3 套，整理出高频技术题 8 道。数据来源均在 60 天内，可信度 B 级。",
  "confidence": "medium",
  "evidence_used": [
    { "post_id": "nc://12345", "grade": "B", "date": "2026-04-15" },
    { "post_id": "nc://12346", "grade": "B", "date": "2026-04-08" }
  ],
  "recommendations": [
    "Redis 数据结构和持久化机制是高频题，出现在 4/5 篇面经中",
    "系统设计题偏向电商场景（库存/秒杀/订单），建议重点准备",
    "美团面试注重项目深度，建议准备 2 个有挑战性的项目案例"
  ],
  "risks": [
    "面试题会随时间更新，建议同时关注最新帖子",
    "B 级来源需要交叉验证，不同面试官风格可能差异较大"
  ],
  "next_actions": [
    "系统性复习 Redis 数据结构（String/Hash/List/Set/ZSet）",
    "准备电商秒杀系统设计方案",
    "熟悉 JVM GC 机制（出现在 3 篇面经中）"
  ],
  "follow_up_questions": [
    "您投的是哪个业务线（外卖/到店/优选）？",
    "您目前后端技术栈是 Java 还是 Go？"
  ],
  "cannot_determine": [],
  "mined_posts": [
    {
      "post_id": "nc://12345",
      "title": "美团后端一面二面三面全过，offer 到手！",
      "date": "2026-04-15",
      "content_type": "interview_experience",
      "interview_rounds": ["一面（技术）", "二面（技术+项目）", "三面（综合）", "HR 面"],
      "result": "offer",
      "credibility_grade": "B"
    },
    {
      "post_id": "nc://12346",
      "title": "美团暑期实习笔试题解析",
      "date": "2026-04-08",
      "content_type": "online_test",
      "interview_rounds": [],
      "result": "unknown",
      "credibility_grade": "B"
    }
  ],
  "technical_questions": [
    {
      "question": "Redis 的持久化机制有哪些？RDB 和 AOF 的区别？",
      "category": "database",
      "difficulty": "medium",
      "source_post_id": "nc://12345",
      "frequency": 4
    },
    {
      "question": "设计一个高并发秒杀系统",
      "category": "system_design",
      "difficulty": "hard",
      "source_post_id": "nc://12345",
      "frequency": 3
    },
    {
      "question": "JVM 垃圾回收机制，G1 和 CMS 的区别",
      "category": "language_specific",
      "difficulty": "medium",
      "source_post_id": "nc://12346",
      "frequency": 3
    }
  ],
  "credibility_ceiling": "B"
}
```
