# 示例：低质量来源的处理

## 场景

获取到公众号内容，但来源均为个人小号，无数据支撑，只有观点性内容。

## 输入

```json
{
  "topic": "互联网大厂跳槽时机"
}
```

## 输出

```json
{
  "skill_name": "wechat-insight-reader",
  "skill_version": "1.0.0",
  "summary": "找到 3 篇相关文章，但均为个人公众号的主观观点，无数据支撑，可信度为 C 级。",
  "confidence": "low",
  "evidence_used": [
    { "source": "某个人职场号", "grade": "C" }
  ],
  "recommendations": [
    "以下洞察来自个人公众号，仅代表作者观点，不具备数据支撑",
    "建议参考猎聘、BOSS直聘等平台的权威报告"
  ],
  "risks": ["来源可信度较低，不建议作为决策主要依据"],
  "next_actions": ["查阅 BOSS直聘研究院等权威机构公众号"],
  "follow_up_questions": [],
  "cannot_determine": [],
  "insights": [
    {
      "title": "互联网人跳槽的三个黄金时机",
      "source_account": "某职场公众号",
      "date": "2026-03-10",
      "key_points": [
        "年后（3月）是跳槽高峰，机会较多",
        "年终奖到手后（2月）是较佳时机"
      ],
      "credibility_grade": "C"
    }
  ]
}
```
