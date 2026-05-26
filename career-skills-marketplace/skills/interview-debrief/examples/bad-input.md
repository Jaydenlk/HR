# 示例：输入不是面试记录

## 场景

用户传入了工作日志而非面试记录。

## 输入

```json
{
  "interview_transcript": "今天完成了季度报告的编写，下午开了产品评审会，晚上加班到9点修改了代码。整体工作进展顺利。"
}
```

## 输出

```json
{
  "skill_name": "interview-debrief",
  "skill_version": "1.0.0",
  "confidence": "insufficient",
  "summary": "输入内容不是面试记录，无法进行面试复盘。识别到输入为日常工作日志，缺乏面试问答结构（面试官问题+候选人回答）。",
  "overall_grade": "D",
  "dimension_scores": [],
  "question_analysis": [],
  "prediction": {
    "pass_likelihood": "maybe",
    "pass_percentage": 0,
    "rationale": "无面试记录，无法预测",
    "swing_factors": []
  },
  "stories_to_save": [],
  "evidence_used": [],
  "recommendations": [
    "请提供面试对话记录：面试官的问题和你的回答",
    "可以是文字记录、语音转文字、或者你的回忆描述（包含具体问题内容）"
  ],
  "risks": [],
  "next_actions": ["重新提供面试问答记录"],
  "follow_up_questions": ["你想复盘哪次面试？可以把面试中被问到的问题和你的回答告诉我"],
  "cannot_determine": ["所有评估维度（因无面试记录）"],
  "error": {
    "type": "non_interview_input",
    "message": "输入内容不包含面试问答结构，请提供面试对话记录"
  }
}
```

## 说明

- `confidence: insufficient` + `error.type: non_interview_input`
- `dimension_scores` 和 `question_analysis` 返回空数组，不编造评分
- `recommendations` 引导用户提供正确格式的内容
