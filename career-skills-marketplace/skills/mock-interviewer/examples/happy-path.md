# 示例：完整三阶段模拟面试（产品经理岗）

## 场景

用户准备腾讯产品经理面试，完整执行三阶段模拟流程。

## Phase 1 输入

```json
{
  "phase": "generate_questions",
  "job_title": "产品经理",
  "interview_intelligence": {
    "company_name": "腾讯",
    "common_questions": [
      { "question": "设计微信红包的核心功能", "category": "case", "frequency": "very_high" }
    ]
  }
}
```

## Phase 1 输出（节选）

```json
{
  "skill_name": "mock-interviewer",
  "skill_version": "1.0.0",
  "phase": "generate_questions",
  "confidence": "medium",
  "summary": "基于腾讯产品经理面试情报生成5道面试题，涵盖行为题、产品设计题和动机题。",
  "questions": [
    {
      "id": "q1",
      "question": "请描述你主导过的最复杂产品需求，遇到了什么技术和业务的冲突，你是如何解决的？",
      "type": "behavioral",
      "difficulty": "medium",
      "time_limit": 4,
      "evaluation_focus": "STAR结构、需求优先级判断、跨团队协作能力"
    },
    {
      "id": "q2",
      "question": "请设计一个微信红包的防刷功能，需要考虑高并发场景和用户体验平衡。",
      "type": "case",
      "difficulty": "hard",
      "time_limit": 8,
      "evaluation_focus": "产品思维、技术可行性意识、安全与体验的权衡"
    },
    {
      "id": "q3",
      "question": "为什么选择产品经理这条职业路径？为什么是腾讯？",
      "type": "motivation",
      "difficulty": "easy",
      "time_limit": 3,
      "evaluation_focus": "职业清晰度、对腾讯文化和产品的了解程度"
    }
  ],
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": ["请开始回答 q1，回答时间建议控制在4分钟内"],
  "follow_up_questions": [],
  "cannot_determine": [],
  "answer_evaluations": [],
  "overall_score": 0,
  "overall_grade": "C",
  "dimension_scores": []
}
```

## Phase 2 输入

```json
{
  "phase": "evaluate_answer",
  "job_title": "产品经理",
  "questions": [{ "id": "q1", "question": "请描述你主导过的最复杂产品需求..." }],
  "answers": [
    {
      "question_id": "q1",
      "answer_text": "我之前在上家公司负责用户激励体系的改版。当时业务方要求在两周内上线积分商城，但技术团队评估至少需要6周。我组织了需求评审会，把功能拆成必须版和增强版，两周上线核心兑换功能，后续迭代完整版。最终必须版按时上线，首周兑换率达到22%，超出预期的15%。"
    }
  ]
}
```

## Phase 2 输出

```json
{
  "skill_name": "mock-interviewer",
  "skill_version": "1.0.0",
  "phase": "evaluate_answer",
  "confidence": "high",
  "summary": "q1 回答得分7/10，STAR结构基本完整，结果有量化，但行动细节可以更丰富。",
  "answer_evaluations": [
    {
      "question_id": "q1",
      "user_answer": "我之前在上家公司负责用户激励体系的改版...",
      "score": 7,
      "strengths": [
        "结果有量化数据（「兑换率达到22%，超出预期15%」），说服力强",
        "展示了优先级拆分的产品思维（必须版+增强版）",
        "时间节点清晰，逻辑完整"
      ],
      "weaknesses": [
        "行动部分（A）较简略，「组织了需求评审会」未说明具体如何说服技术团队接受方案",
        "个人角色边界不够清晰，多处使用「业务方」和「技术团队」但未说明自己如何推动"
      ],
      "suggestion": "补充「我具体做了什么」：例如「我准备了功能价值对比表，向技术团队说明核心功能的流量入口价值，争取到资源倾斜」",
      "model_answer_hint": "优秀回答应包含：1）清晰说明自己的具体行动（而非团队）2）量化决策依据（为什么选这个拆分方案）3）结果与预期对比"
    }
  ],
  "evidence_used": [],
  "recommendations": ["q1 整体表现良好，继续回答下一题 q2"],
  "risks": [],
  "next_actions": ["请回答 q2（产品设计题），建议先说框架再展开，时间约8分钟"],
  "follow_up_questions": ["你在这个项目中具体负责哪些决策？有没有遇到业务方不认可的情况？"],
  "cannot_determine": [],
  "questions": [],
  "overall_score": 0,
  "overall_grade": "C",
  "dimension_scores": []
}
```

## 说明

- Phase 2 评分7/10，优缺点均引用用户原话，未虚假溢美
- `strengths` 引用「兑换率达到22%」等原话
- `weaknesses` 具体指出缺失内容，非泛泛而谈
- Phase 3 需在所有题目评分完成后再调用
