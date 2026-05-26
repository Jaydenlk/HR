# 示例：无实时数据时的降级行为

## 场景

用户请求小红书面经，但无法访问实时内容。

## 输入

```json
{
  "company": "腾讯",
  "role": "后端工程师"
}
```

## 输出

```json
{
  "skill_name": "xhs-interview-miner",
  "skill_version": "1.0.0",
  "summary": "当前无法访问小红书实时内容，无法提取面经。请手动搜索获取最新信息。",
  "confidence": "insufficient",
  "evidence_used": [],
  "recommendations": [
    "请在小红书搜索「腾讯 后端 面经」获取最新分享",
    "同时建议查阅牛客网，技术面试内容更可靠"
  ],
  "risks": [
    "本 skill 当前无实时数据，任何面试判断均不可靠"
  ],
  "next_actions": [
    "手动搜索小红书：关键词「腾讯 后端工程师 面经 2026」",
    "使用 nowcoder-tech-miner 获取更可靠的技术面试数据"
  ],
  "follow_up_questions": [
    "您投的是腾讯哪个业务线？"
  ],
  "cannot_determine": [
    "腾讯后端工程师面试流程",
    "常见面试题目",
    "面试通过率"
  ],
  "mined_posts": [],
  "quality_report": {
    "total_found": 0,
    "usable_count": 0,
    "promotional_count": 0,
    "average_grade": "N/A",
    "notes": [
      "无法访问小红书实时内容"
    ]
  },
  "credibility_ceiling": "C"
}
```

## 说明

- 无实时数据时 mined_posts 必须为空数组，不推断任何面试内容
- quality_report 如实反映 total_found: 0
- credibility_ceiling 仍标注为 C，说明这是小红书来源的固有上限
