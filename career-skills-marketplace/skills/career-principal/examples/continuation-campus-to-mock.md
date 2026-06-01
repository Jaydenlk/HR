# 示例：端到端续接（校招诊断 → 提议模拟面试 → 确认 → mock 接住 interviewHooks）

## 场景描述

女娲式连贯体验样板：用户来做校招简历诊断，代表诊断完**顺势提议模拟面试**（把 `diagnosis.interviewHooks` 作 `handoff_payload`），用户点头后 `mock-interviewer` **直接拿 interviewHooks 当弹药出追问题**，全程不重复索要简历/职业（会话级输入复用）。验证 next-intent-graph 的 `campus_diagnosis → mock_interview` 续接链 + orchestration-rules §12 续接层。

---

## 第 1 轮：校招诊断

**用户消息**：
> 我应届想投后端开发，帮我按校招标准看看简历。
> （附简历：李响，某双非一本计算机；项目「校园二手交易平台」用 Spring Boot + MySQL；ACM 校赛三等奖；实习：某小厂后端3个月，参与订单模块。）

**意图**：`campus_diagnosis`。required_inputs：`resume_text`✓ + `target_profession`=后端开发✓。首次最小画像（称呼=李响、背景=双非应届、目标=后端）已从输入得到，不追问。

**代表调度** `campus-recruitment-diagnosis`，产出（节选，扁平结构 + 标源）：

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "success",
  "intent_detected": "campus_diagnosis",
  "confidence": "medium",
  "summary": "[据CV]后端开发方向，标准档总分约 62/100；最大短板：项目深度与并发/分布式经验薄。[据知识库]按后端标尺逐维评，已生成3条面试追问预演。",
  "dimension_level_visibility": [
    { "dimension": "项目深度", "confidence": "high", "source_type": "user_resume", "basis": "[据CV]二手交易平台仅 CRUD 描述，未见并发/缓存/分库" },
    { "dimension": "实习含金量", "confidence": "medium", "source_type": "user_resume", "basis": "[据CV]3个月小厂、仅「参与」订单模块，角色深度待核" }
  ],
  "skills_invoked": [
    { "skill_name": "campus-recruitment-diagnosis", "status": "completed", "result_summary": "后端标准档 62 分，短板项目深度，产出 interviewHooks×3", "confidence": "medium" }
  ],
  "evidence_used": [
    {
      "source_type": "user_resume", "source_name": "用户简历",
      "source_url": null, "content_excerpt": "校园二手交易平台：Spring Boot + MySQL；实习参与订单模块3个月",
      "freshness": "current", "reason": "逐维打分的第一手事实来源"
    },
    {
      "source_type": "knowledge_graph", "source_name": "campus-recruitment-rubrics/后端开发",
      "source_url": null, "content_excerpt": "后端5维标尺：项目深度/语言基础/数据结构算法/工程实践/沟通",
      "freshness": "stale", "reason": "locked rubric 提供维度与满分（不因公司情报漂移）"
    }
  ],
  "recommendations": [
    "[据CV]项目只写了 CRUD，建议补一处真实做过的技术取舍（如索引/缓存/事务边界），讲清为什么这么选"
  ],
  "risks": [
    "[据CV]实习用「参与」，面试官常据此追问你独立负责的部分，需准备具体说法（不可拔高为「主导」）"
  ],
  "next_actions": [
    "针对3条 interviewHooks 准备真实可讲的答案",
    "项目补1处技术深度细节（基于你真实做过的，非编造）"
  ],
  "suggested_next": [
    { "next_intent": "mock_interview", "reason": "诊断已点出最可能被追问的薄弱点，直接拿 interviewHooks 当弹药模拟一轮压力面，趁热补漏", "ready_inputs": ["resume_text", "target_profession", "interviewHooks"], "priority": "recommended" },
    { "next_intent": "build_stories", "reason": "把 interviewHooks 指向的命中点打磨成经得起追问的 STAR 故事", "ready_inputs": ["resume_text", "interviewHooks", "target_profession"], "priority": "recommended" },
    { "next_intent": "identify_skill_gaps", "reason": "把各维度 gap 转成可执行的技能补齐清单", "ready_inputs": ["resume_text", "target_profession"], "priority": "recommended" }
  ],
  "follow_up_questions": [],
  "cannot_determine": [
    "你实习中独立负责 vs 团队协作的真实边界（只有你本人清楚，影响实习含金量评估）"
  ],
  "missing_information": []
}
```

诊断附带的 `diagnosis.interviewHooks`（来自 campus skill 的领域载荷，随产出一并在会话上下文中）：

```json
[
  { "resumeHit": "二手交易平台用 MySQL", "interviewQuestion": "订单表数据量大了你怎么优化查询？分库分表考虑过吗？", "prepDirection": "诚实说明当前规模未触发分库，准备讲索引设计与你真实做过的慢查询优化" },
  { "resumeHit": "实习参与订单模块", "interviewQuestion": "订单模块里你独立负责哪一部分？遇到的最难的问题是什么？", "prepDirection": "如实区分你独立做的与团队做的，挑一个你真正解决的问题讲透" },
  { "resumeHit": "ACM 校赛三等奖", "interviewQuestion": "现场写一道中等难度算法题（如 LRU 缓存）", "prepDirection": "回顾常见数据结构题，确保能手写不靠回忆" }
]
```

**代表向用户提议**（自然语言，对应 suggested_next）：
> 诊断完了——标准档约 62 分，最拖后腿的是项目深度。我已经把面试官最可能拿你简历追问的 3 个点列出来了（订单查询优化、实习里你独立做了啥、现场算法题）。**要不要我直接用这 3 个点给你来一轮模拟面试？趁热练，比你自己干想更扎实。** 简历和职业方向我都记着了，不用再发一遍。

---

## 第 2 轮：用户确认续接

**用户消息**：
> 好，来吧，模拟一下。

**续接执行**（orchestration-rules §12）：
- 新主意图 = `mock_interview`。
- **会话级输入复用**：`resume_text` / `target_profession`（后端开发）/ `interviewHooks` 均在会话上下文 → 直接喂入，**跳过 mock_interview 的 required_inputs 追问**（不重问简历、不重问岗位）。
- `mock-interviewer` 以 `interviewHooks` 为题源，逐条出题并据用户回答追问。

**代表产出**（节选）：

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "success",
  "intent_detected": "mock_interview",
  "confidence": "high",
  "summary": "[据CV]以诊断 interviewHooks 为题源完成一轮后端模拟面试（3题）。订单查询优化答得偏浅、实习边界说清了、算法题手写通过。给出逐题反馈与补强方向。",
  "dimension_level_visibility": [
    { "dimension": "题源贴合度", "confidence": "high", "source_type": "user_resume", "basis": "[据CV]3题全部源自本人简历命中点（interviewHooks 复用）" }
  ],
  "skills_invoked": [
    { "skill_name": "mock-interviewer", "status": "completed", "result_summary": "据 interviewHooks 出3题+追问，逐题反馈", "confidence": "high" }
  ],
  "evidence_used": [
    {
      "source_type": "user_resume", "source_name": "上一意图产出 interviewHooks（复用）",
      "source_url": null, "content_excerpt": "订单查询优化 / 实习独立部分 / 现场算法题 LRU",
      "freshness": "current", "reason": "续接复用诊断产出作模拟题源，未重复索要简历"
    }
  ],
  "recommendations": [
    "[据CV]订单查询优化你只答到加索引——补一层缓存与分页深翻页问题的应对，体现对规模增长的预判",
    "[行业惯例]算法题手写通过，建议再练 2-3 道中等题保持手感"
  ],
  "risks": [
    "[据CV]实习「参与」你已说清独立边界，面试时保持同一口径，别临场拔高"
  ],
  "next_actions": [
    "把订单查询优化补到能讲 3 层（索引→缓存→分页/分库的取舍）",
    "再约一轮模拟，重点压你这次答浅的项目深度题"
  ],
  "suggested_next": [
    { "next_intent": "build_stories", "reason": "把这次答得好的实习边界问题，固化成一个 STAR 故事，行为面随时调用", "ready_inputs": ["resume_text", "interviewHooks", "target_profession"], "priority": "recommended" },
    { "next_intent": "identify_skill_gaps", "reason": "模拟暴露的项目深度短板，转成系统的技能补齐清单", "ready_inputs": ["resume_text", "target_profession"], "priority": "optional" }
  ],
  "follow_up_questions": [],
  "cannot_determine": []
}
```

---

## 说明

- **续接 = 提议 + 确认**：第 1 轮代表只**提议**（写进 `suggested_next`，priority=recommended），不自动跳；用户第 2 轮说"来吧"才真正调度 `mock_interview`。符合铁律1。
- **会话级输入复用**：第 2 轮没有重新索要简历/职业方向，`interviewHooks` 直接作为题源喂入。符合铁律2，体现"连贯聊天"。
- **interviewHooks 作合法入参**：诊断的 `interviewHooks` 经 `handoff_payload` 成为 `mock-interviewer` 的 `ready_inputs`——这是诊断→面试核心链（spec §3.4）的落地。
- **防编造贯穿**：mock 反馈始终引导"如实说明""别拔高""基于真实做过的"，不教编造（locked rubric / honesty 一致）。
