# 示例：来源冲突 → 双存记录

## 场景

简历中标注「高级工程师」，但用户在对话中说「我刚晋升不久，其实还算初级」。
两个来源对职级描述有明显矛盾。

## 输入

```json
{
  "resume_text": "李明\n高级工程师\n\n工作经历\n某互联网公司 高级工程师 2024.01 - 至今\n- 负责后端 API 开发\n- 使用 Java 完成业务需求开发",
  "user_background": "我在简历上写了高级工程师，但其实我是刚晋升的，工作上还有很多不懂的地方，感觉自己还算初级"
}
```

## 输出

```json
{
  "skill": "profile-builder",
  "confidence": "medium",
  "evidence_count": 4,
  "missing_fields": [
    "basic.education",
    "skills.soft",
    "skills.languages",
    "constraints",
    "career_intent"
  ],
  "profile": {
    "basic": {
      "name": "李明",
      "education": null,
      "years_of_experience": null,
      "current_role": {
        "source_a": {
          "value": "高级工程师",
          "evidence": "简历标题行：「高级工程师」及工作经历「某互联网公司 高级工程师」"
        },
        "source_b": {
          "value": "初级（自述）",
          "evidence": "用户对话：「其实我是刚晋升的，感觉自己还算初级」"
        },
        "conflict": true
      }
    },
    "skills": {
      "technical": [
        {
          "name": "Java",
          "proficiency": "used_in_project",
          "evidence_source": "使用 Java 完成业务需求开发"
        }
      ],
      "soft": [],
      "languages": []
    },
    "experience": [
      {
        "company": "某互联网公司",
        "role": "高级工程师",
        "duration": "2024.01 - 至今",
        "achievements": [
          {
            "text": "负责后端 API 开发",
            "evidence_source": "工作经历第一条"
          },
          {
            "text": "使用 Java 完成业务需求开发",
            "evidence_source": "工作经历第二条"
          }
        ]
      }
    ],
    "strengths": [],
    "weaknesses": [
      {
        "description": "自我评估与简历标注存在落差，可能存在职级虚标风险",
        "evidence_source": "用户对话：「感觉自己还算初级」与简历「高级工程师」冲突"
      }
    ],
    "constraints": {
      "location": null,
      "salary_expectation": null,
      "deal_breakers": []
    },
    "career_intent": {
      "target_roles": [],
      "industry_preference": [],
      "urgency": "unknown"
    }
  }
}
```

## 说明

- `current_role` 使用冲突结构，`conflict: true` 标记
- 两个来源都完整保留，不做「哪个更可信」的主观判断
- `weaknesses` 中记录职级落差信号，供匹配诊断参考
- 上游 skill（如 match-diagnosis）应读取 `conflict: true` 字段，决定是否需要向用户澄清
