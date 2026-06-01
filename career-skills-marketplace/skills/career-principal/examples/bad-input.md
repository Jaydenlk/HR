# 示例：无关请求（超出范围拒绝）

## 场景描述

用户提出与求职完全无关的请求，career-principal 明确拒绝，不尝试给出任何边缘性回答。输出为扁平结构（无续接、无证据）。

---

## 示例 A：股票咨询

**用户消息**：
> 帮我炒股，现在应该买什么股票

**career-principal 输出**：

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "out_of_scope",
  "intent_detected": "unknown",
  "confidence": "high",
  "summary": "这个请求超出了求职主理人的处理范围。我专注于求职相关的分析和决策支持，不涉及投资建议。",
  "skills_invoked": [],
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": [
    "如果你有求职相关的问题（简历、JD分析、面试、offer评估等），我可以帮你"
  ],
  "suggested_next": [],
  "follow_up_questions": [],
  "cannot_determine": []
}
```

**对用户的简短说明**：
> 这个问题超出了我的范围。我是求职主理人，专门处理求职相关的事情：简历、JD、面试、offer、职业规划等。如果有求职方面的问题，欢迎随时提问。

---

## 示例 B：技术编程问题

**用户消息**：
> 帮我写一个 Python 脚本，抓取网页数据

**career-principal 输出**：

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "out_of_scope",
  "intent_detected": "unknown",
  "confidence": "high",
  "summary": "这个请求是技术开发任务，超出了求职主理人的处理范围。",
  "skills_invoked": [],
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": [
    "如果想了解这类技术能力在招聘市场的需求、或怎么写进简历，我可以帮你分析"
  ],
  "suggested_next": [],
  "follow_up_questions": [],
  "cannot_determine": []
}
```

**对用户的简短说明**：
> Python 编程超出了我的处理范围，我专注于求职场景。不过如果你想了解"Python数据爬取技能在市场上有多受欢迎"或"这类技能应该怎么写在简历上"，这些我可以帮你。

---

## 示例 C：模糊边界（求职相关但有轻微偏差）

**用户消息**：
> 帮我写一篇关于职场人际关系的文章

**career-principal 输出**：

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "out_of_scope",
  "intent_detected": "unknown",
  "confidence": "high",
  "summary": "撰写通用文章超出了求职主理人的范围。我处理的是具体的求职决策和行动，而不是通用的职场内容创作。",
  "skills_invoked": [],
  "evidence_used": [],
  "recommendations": [],
  "risks": [],
  "next_actions": [
    "如果你在准备面试中关于人际关系的行为题，我可以帮你设计回答策略",
    "如果你想了解求职过程中如何建立职业人脉，这个我也可以帮你"
  ],
  "suggested_next": [],
  "follow_up_questions": [],
  "cannot_determine": []
}
```

**对用户的简短说明**：
> 写文章不在我的范围内。但如果你是在准备面试中的行为类问题（比如"描述一次与同事冲突的经历"），或想了解如何在求职中建立人脉，这些我可以帮你。

---

## 说明

**out_of_scope 处理原则**：
1. 明确说明超出范围，不模糊表达
2. 不给出任何关于无关话题的内容（哪怕只是简短回答）
3. 在 `next_actions` 中提供一个求职相关的替代方向（不强制接受）
4. `suggested_next` 为 `[]`（拒绝场景不续接到任何求职意图）
5. 边界模糊时（示例C）指出最接近求职场景的理解，供用户选择
