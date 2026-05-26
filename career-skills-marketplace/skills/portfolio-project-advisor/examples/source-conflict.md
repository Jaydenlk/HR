# 示例：Profile 揭示的常见 Portfolio 反模式

## 场景

用户有 Kafka mentioned 级别、想做 Kafka 流处理项目。

## 分析

profile.skills.technical[Kafka=mentioned] 意味着用户只是「见过/听过」Kafka，
没有在项目中实际使用过。如果做 Kafka 相关 portfolio，面试中会被追问：
- Kafka 的 consumer group 是如何工作的？
- 如何保证消息不丢失？
- 如何处理消息积压？

用户很可能无法回答，反而暴露经验空洞。

## 核心 anti_patterns 输出

```json
{
  "anti_patterns": [
    {
      "pattern": "基于 mentioned 级别技能做深度技术项目",
      "reason": "面试中会被追问实现细节，而 mentioned 级别无法支撑深度追问，反效果"
    },
    {
      "pattern": "教程克隆项目（视频跟做）",
      "reason": "架构决策不是你做的，面试时「为什么这样设计」无法回答；技术岗面试官一眼能看出"
    },
    {
      "pattern": "功能不完整的大项目（半成品）",
      "reason": "半成品比没有更差：说明执行力不足；面试官会问「为什么没做完」，很难给出好答案"
    },
    {
      "pattern": "第100个聊天室 / TodoApp",
      "reason": "无差异化价值，面试官见过太多，不会产生兴趣"
    },
    {
      "pattern": "与目标职位完全无关的项目",
      "reason": "投资产出比低；应该把有限时间放在能直接提升目标职位竞争力的项目上"
    }
  ]
}
```
