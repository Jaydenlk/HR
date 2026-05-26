# 示例：成功提取小红书面经

## 场景

用户询问某互联网公司产品经理面试经验，实时获取到小红书内容。

## 输入

```json
{
  "company": "字节跳动",
  "role": "产品经理",
  "max_posts": 5
}
```

## 输出

```json
{
  "skill_name": "xhs-interview-miner",
  "skill_version": "1.0.0",
  "summary": "从小红书提取到 4 篇字节跳动产品经理面经（1 篇疑似推广已过滤），可用 3 篇，可信度均为 C 级，建议交叉验证。",
  "confidence": "low",
  "evidence_used": [
    { "post_id": "xhs://post/abc123", "grade": "C" },
    { "post_id": "xhs://post/def456", "grade": "C" },
    { "post_id": "xhs://post/ghi789", "grade": "C" }
  ],
  "recommendations": [
    "小红书面经可靠性有限，建议同时查阅牛客网验证",
    "3 篇帖子均提到「数据驱动」和「用户增长」问题，可重点准备",
    "面试轮次普遍为 4-5 轮，注意时间安排"
  ],
  "risks": [
    "小红书内容可信度上限 C 级，部分描述可能失实或夸大",
    "面试题目随时间变化，超过 3 个月的内容时效性存疑"
  ],
  "next_actions": [
    "在牛客网搜索字节跳动产品经理面经交叉验证",
    "重点准备数据驱动分析和用户增长案例"
  ],
  "follow_up_questions": [
    "您投的是哪个业务线的产品岗？",
    "是否已有牛客网面经供参考？"
  ],
  "cannot_determine": [
    "面试题目是否为最新版本（小红书无法保证时效）"
  ],
  "mined_posts": [
    {
      "post_id": "xhs://post/abc123",
      "title": "字节跳动产品经理面经分享，4 轮面试全过！",
      "date": "2026-04-10",
      "interview_rounds": ["一面：产品设计", "二面：数据分析", "三面：综合业务", "HR 面"],
      "key_questions": [
        "如何设计一个直播功能的增长方案",
        "DAU 下降了 10%，你会如何排查原因"
      ],
      "result": "offer",
      "credibility_grade": "C",
      "is_promotional": false
    },
    {
      "post_id": "xhs://post/def456",
      "title": "字节 PM 面试心得，被拒了但学到很多",
      "date": "2026-03-20",
      "interview_rounds": ["一面", "二面", "三面"],
      "key_questions": [
        "你如何看待抖音和微信视频号的竞争"
      ],
      "result": "rejected",
      "credibility_grade": "C",
      "is_promotional": false
    },
    {
      "post_id": "xhs://post/ghi789",
      "title": "秋招上岸！字节产品经理备考攻略",
      "date": "2026-02-15",
      "interview_rounds": ["笔试", "一面", "二面", "三面", "HR 面"],
      "key_questions": [
        "产品感知题：改进某功能",
        "数据分析：用户留存下降分析"
      ],
      "result": "offer",
      "credibility_grade": "C",
      "is_promotional": false
    }
  ],
  "quality_report": {
    "total_found": 4,
    "usable_count": 3,
    "promotional_count": 1,
    "average_grade": "C",
    "notes": [
      "1 篇帖子疑似推广（含「课程报名」链接），已过滤",
      "所有内容来自小红书，可信度上限为 C 级"
    ]
  },
  "credibility_ceiling": "C"
}
```

## 说明

- 即使成功提取，confidence 最高为 low（因可信度上限 C）
- 推广帖子已标记并从可用计数中排除
- key_questions 仅来自原文，不推断
