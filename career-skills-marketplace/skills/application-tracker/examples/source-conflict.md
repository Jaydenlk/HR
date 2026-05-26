# 示例：同一公司多条投递记录（状态矛盾）→ 标注冲突

## 场景

用户同一家公司有两条投递记录，状态不一致（一条 rejected，一条 interviewing），系统需标注冲突而非自行判断哪个正确。

## 输入

```json
{
  "applications": [
    { "company": "某大厂", "position": "后端工程师（A部门）", "applied_date": "2026-02-01", "status": "rejected", "last_updated": "2026-02-20" },
    { "company": "某大厂", "position": "后端工程师（B部门）", "applied_date": "2026-02-15", "status": "interviewing", "last_updated": "2026-03-10" }
  ],
  "current_date": "2026-03-15"
}
```

## 输出

```json
{
  "skill_name": "application-tracker",
  "skill_version": "1.0.0",
  "summary": "共2条投递，均为同一公司不同部门。A部门已拒，B部门面试中。注意：同公司不同部门状态需分开追踪，避免混淆。",
  "confidence": "medium",
  "evidence_used": [
    { "source": "applications", "content": "某大厂A部门rejected，B部门interviewing" }
  ],
  "recommendations": [
    "某大厂B部门面试进行中，优先推进",
    "A部门拒信不影响B部门进程（不同部门独立招聘）"
  ],
  "risks": [
    "同公司两条记录状态不同，需确认是否为独立投递流程"
  ],
  "next_actions": [
    "确认B部门当前处于哪轮面试（笔试/一面/二面）",
    "明确A部门拒信是否有反馈（技术不匹配或时机问题）"
  ],
  "follow_up_questions": [
    "B部门面试目前进行到哪一轮了？"
  ],
  "cannot_determine": [],
  "pipeline_view": {
    "submitted_count": 0,
    "interview_count": 1,
    "offer_count": 0,
    "rejected_count": 1,
    "withdrawn_count": 0,
    "ghost_count": 0
  },
  "stats": {
    "total_applications": 2,
    "active_applications": 1,
    "interview_rate": 0.5,
    "offer_rate": null,
    "avg_response_days": 14
  },
  "stale_alerts": [],
  "ghost_detection": []
}
```

## 说明

- 两条记录分别计入各自状态，不合并
- 系统标注同公司多条记录的情况但不自行判断哪条为准
- `interview_rate: 0.5` = 1(interview)/2(total)
