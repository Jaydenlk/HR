# 示例：无实时数据时的降级行为

## 输入

```json
{
  "topic": "互联网行业裁员趋势分析"
}
```

## 输出

```json
{
  "skill_name": "wechat-insight-reader",
  "skill_version": "1.0.0",
  "summary": "当前无法访问公众号实时内容，无法提取洞察。请手动查阅相关公众号。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "建议关注「BOSS直聘研究院」、「猎聘人才白皮书」等公众号",
    "脉脉职言也有较多真实的行业裁员讨论"
  ],
  "risks": [
    "本 skill 当前无实时数据，任何行业分析均不可靠"
  ],
  "next_actions": [
    "在微信搜一搜中搜索「互联网裁员 2026」",
    "关注「互联网分析师」「硅星人」等行业观察类公众号"
  ],
  "follow_up_questions": [
    "您关注的是哪个细分赛道的趋势？"
  ],
  "cannot_determine": [
    "当前互联网裁员趋势",
    "哪些赛道受影响最大"
  ],
  "insights": []
}
```
