# 示例：无实时数据时的降级行为

## 场景

无法访问牛客网实时内容。

## 输入

```json
{
  "company": "百度",
  "role": "算法工程师"
}
```

## 输出

```json
{
  "skill_name": "nowcoder-tech-miner",
  "skill_version": "1.0.0",
  "summary": "当前无法访问牛客网实时内容，无法提取面经和笔试题。请手动搜索获取最新信息。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请访问牛客网搜索「百度 算法工程师 面经」",
    "牛客题库中有百度历年笔试题，建议直接查阅"
  ],
  "risks": [
    "本 skill 当前无实时数据，任何技术题判断均不可靠"
  ],
  "next_actions": [
    "手动访问牛客网：https://www.nowcoder.com",
    "搜索关键词「百度 算法 2026 面经」"
  ],
  "follow_up_questions": [
    "您投的是百度哪个方向（NLP/CV/搜索/推荐）？"
  ],
  "cannot_determine": [
    "百度算法工程师面试流程",
    "近期笔试题目",
    "面试难度分布"
  ],
  "mined_posts": [],
  "technical_questions": [],
  "credibility_ceiling": "B"
}
```
