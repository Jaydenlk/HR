# 示例：完整流程（高置信度 + 不连坐 + 续接提议）

## 场景描述

用户是有4年经验的产品经理，提供完整简历和 JD，要求评估匹配度并优化简历。展示：分维度标源标置信（薪资维 medium 不连坐拖低主结论 high）、内联标源标签、`suggested_next` 续接提议。

---

## 输入

**用户消息**：
> 我想投这个产品经理的职位，帮我看看我的简历和 JD 的匹配度，顺便帮我把简历优化一下

**jd_text**（节选）：高级产品经理，B轮互联网公司，北京；要求3年以上产品经验、AARRR/growth、SQL或Python、跨部门协作；加分项 B端SaaS 或 DAU>100万；薪资 30-45K，14薪。

**resume_text**（节选）：张明，4年产品经验；主导用户增长产品线，DAU 80万→150万；年均 200+ A/B 实验，核心转化率 +23%；SQL+Python 建 AARRR 漏斗；协调技术/运营/市场跨部门项目；前职 SaaS CRM 产品经理，服务 B端客户 500+；北京大学信息管理本科。

---

## 执行过程（摘要）

- **意图识别**：主意图 `match_diagnosis`，次意图 `tailor_resume`。jd_text/resume_text 均满足 confidence_gate，**不追问**（首次最小画像：称呼=张明、背景=4年在职PM、目标=B轮PM岗，已可从输入推断，不重复问）。
- **编排**：阶段1 并行 `jd-analyzer` + `profile-builder`；阶段2 `match-diagnosis` + `resume-tailor`；薪资维度缺当季数据 → 先 WebSearch，无果则用知识库（标 stale）。
- **主动盘点**：按"投递/比较"情境，主动点出 ②竞争强度、⑪冲稳保 写进 next_actions（不展开成长问卷）。

---

## 最终输出

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "success",
  "intent_detected": "match_diagnosis",
  "confidence": "high",
  "summary": "[据CV]你4年增长产品经验超过[据JD]要求的3年，技能栈（SQL/Python/AARRR/A/B测试）完全对齐，[据CV]DAU 150万与SaaS经历同时满足两个加分项——强匹配。薪资合理性维度因[据知识库]参考为 stale 单独标 medium，不拖低整体判断。",
  "dimension_level_visibility": [
    { "dimension": "硬性要求匹配", "confidence": "high", "source_type": "jd_text", "basis": "[据JD]学历/年限/技能逐条 vs [据CV]全部命中" },
    { "dimension": "加分项匹配", "confidence": "high", "source_type": "user_resume", "basis": "[据CV]B端SaaS 2年 + DAU 150万>100万门槛" },
    { "dimension": "薪资合理性", "confidence": "medium", "source_type": "knowledge_graph", "basis": "[据知识库]北京PM薪资参考为 stale；已尝试联网核实当季水位" }
  ],
  "skills_invoked": [
    { "skill_name": "jd-analyzer", "status": "completed", "result_summary": "解析岗位要求与两个加分项，薪资30-45K", "confidence": "high" },
    { "skill_name": "profile-builder", "status": "completed", "result_summary": "4年增长产品经验，DAU 150万，B端SaaS背景", "confidence": "high" },
    { "skill_name": "match-diagnosis", "status": "completed", "result_summary": "强匹配，硬性+加分项均达标", "confidence": "high" },
    { "skill_name": "resume-tailor", "status": "completed", "result_summary": "3项优化：突出DAU、加AARRR关键词、SaaS经历前置", "confidence": "high" }
  ],
  "evidence_used": [
    {
      "source_type": "jd_text", "source_name": "JD原文",
      "source_url": null, "content_excerpt": "加分项：有B端SaaS产品经验，或有DAU>100万产品经历",
      "freshness": "current", "reason": "对照用户实绩判断加分项是否达标"
    },
    {
      "source_type": "user_resume", "source_name": "用户简历",
      "source_url": null, "content_excerpt": "DAU从80万增长至150万；SaaS公司CRM产品，B端客户500+家",
      "freshness": "current", "reason": "用户实绩直接命中两个加分项"
    },
    {
      "source_type": "knowledge_graph", "source_name": "knowledge/salary-data 北京PM参考",
      "source_url": null, "content_excerpt": "北京产品经理 30-45K 属正常区间（社区汇编，非官方）",
      "freshness": "stale", "reason": "薪资合理性维度的背景参考，已标 stale 待当季核实"
    }
  ],
  "recommendations": [
    "[据CV]在技能栏明确写出「AARRR 增长体系」，与[据JD]关键词直接对齐（目前简历未显式出现该词）",
    "[据CV]将 SaaS CRM 经历前置，强化[据JD]加分项曝光",
    "[据CV]突出 DAU 80万→150万，与[据JD]的100万门槛形成超越对比"
  ],
  "risks": [
    "[推断]目标为 B 轮、你现职 C 轮，面试可能问稳定性顾虑，宜准备说法",
    "[行业惯例]薪资数据有时效性，30-45K 区间宜在 offer 阶段以当季行情复核"
  ],
  "next_actions": [
    "按上述3项建议更新简历（约30分钟）",
    "准备2-3个 A/B 测试案例（实验设计→样本量→业务影响）",
    "可顺手看②同岗竞争强度与⑪冲稳保梯度，避免把这个强匹配岗当唯一筹码"
  ],
  "suggested_next": [
    { "next_intent": "tailor_resume", "reason": "匹配度够，值得把简历针对这个 JD 打磨到位、放大优势项", "ready_inputs": ["resume_text", "jd_text"], "priority": "recommended" },
    { "next_intent": "plan_application_strategy", "reason": "既然匹配，顺势把这个岗位排进冲稳保梯度、定投递节奏", "ready_inputs": ["resume_text", "user_profile", "jd_text"], "priority": "recommended" },
    { "next_intent": "interview_prep", "reason": "确定要投就可以开始备面，越早越从容", "ready_inputs": ["jd_text", "resume_text", "user_profile"], "priority": "optional" }
  ],
  "follow_up_questions": [],
  "cannot_determine": [],
  "missing_information": [],
  "conflict_markers": []
}
```

---

## 说明

- **不连坐**：薪资维度 medium，但主结论 confidence 仍为 high（取最关键的「匹配度」维度），写进 `dimension_level_visibility` 分维度可见。这是与旧 `min()` 规则的关键区别。
- **续接**：诊断完顺势提议改简历/投递策略/备面，且 `ready_inputs` 已带齐会话内已得入参——用户点头即续接，不重新索要简历和 JD。
