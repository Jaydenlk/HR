# 示例：多源冲突（显式并列，不取中位数、不判 cannot_determine）

## 场景描述

用户的 JD 薪资范围与知识库静态薪资数据、本轮联网当季口径三方打架。career-principal **显式并列三方 + 标各自口径**（填 `conflict_markers`），不替用户硬编中位数，把判断权交还用户。

---

## 输入

**用户消息**：
> 帮我分析这个数据分析师的 JD，尤其是薪资合不合理

**jd_text**（节选）：数据分析师（用户行为方向），上海，已上市在线教育公司；要求2年以上、SQL/Python/用户行为分析；薪资 12-18K，13薪。

---

## 执行过程（摘要）

- `jd-analyzer` 解析：技能 SQL/Python/A-B测试/用户行为分析（漏斗/留存/RFM）必须；2年经验；薪资 12-18K，13薪（年薪约 156K-234K）。
- 薪资核查：知识库 `salary-data`（上海数据分析师2年，stale）记录中位数 22K、区间 18-30K。
- **当场联网**（薪资属时效信息）：WebSearch 命中一条当季招聘聚合，口径约 15-22K（标 `[实时·未核实·URL·日期]`）。
- 三方口径不一致 → 显式并列，填 `conflict_markers`，不解决。

---

## 最终输出

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "success",
  "intent_detected": "analyze_jd",
  "confidence": "medium",
  "summary": "[据JD]这个数据分析师 JD 要求清晰、技能栈标准；薪资 12-18K 与多个市场口径存在差距：[据知识库]中位数约22K(stale) / [实时·未核实·URL·2026-06-01]当季约15-22K。三方口径并列供你判断，建议面试时核实完整薪酬结构。",
  "dimension_level_visibility": [
    { "dimension": "岗位要求解析", "confidence": "high", "source_type": "jd_text", "basis": "[据JD]职责与任职要求原文清晰" },
    { "dimension": "薪资合理性", "confidence": "medium", "source_type": "web_search", "basis": "三方口径冲突，已并列；本轮联网口径为当季但单源未交叉验证" }
  ],
  "skills_invoked": [
    { "skill_name": "jd-analyzer", "status": "completed", "result_summary": "解析技能/经验/薪资，上海数据分析师2年", "confidence": "high" },
    { "skill_name": "source-quality-auditor", "status": "completed", "result_summary": "薪资三方口径冲突，已标记未解决", "confidence": "medium" }
  ],
  "evidence_used": [
    {
      "source_type": "jd_text", "source_name": "JD原文",
      "source_url": null, "content_excerpt": "薪资范围：12-18K，13薪",
      "freshness": "current", "reason": "薪资判断的第一手口径（公司给定）"
    },
    {
      "source_type": "knowledge_graph", "source_name": "knowledge/salary-data 上海数据分析师2年",
      "source_url": null, "content_excerpt": "中位数约22K，区间18-30K（社区汇编，非官方）",
      "freshness": "stale", "reason": "市场参考口径之一，已标 stale" 
    },
    {
      "source_type": "web_search", "source_name": "当季招聘聚合（示例）",
      "source_url": "https://example-jobs/sh-data-analyst-2026", "content_excerpt": "上海数据分析师2年经验当季约15-22K",
      "freshness": "current", "reason": "薪资属时效信息，本轮当场联网核实当季口径"
    }
  ],
  "recommendations": [
    "[据JD]岗位要求标准，若有兴趣可投；[行业惯例]面试时主动问清薪酬结构（绩效/年终/期权是否计入）",
    "[推断]三方口径差距可能源于公司策略性压低或统计范围不同，不宜单凭某一口径下结论"
  ],
  "risks": [
    "[实时·未核实·URL·2026-06-01]联网口径为单一来源、未交叉验证，仅作参考",
    "[据知识库]知识库薪资为 stale，可能滞后于当季行情"
  ],
  "next_actions": [
    "若决定投递，面试时询问完整薪酬结构（固定薪+绩效+其他补贴）",
    "拿到 offer 阶段再以多平台当季数据复核薪资水位"
  ],
  "suggested_next": [
    { "next_intent": "salary_check", "reason": "把这个薪资逐项对照市场行情，判断该接、该谈、还是该等", "ready_inputs": ["jd_text"], "priority": "recommended" }
  ],
  "follow_up_questions": [],
  "cannot_determine": [
    "该公司是否有未写进 JD 的额外绩效/股权补充（属未公开内部信息，非人工不可核实）"
  ],
  "missing_information": [],
  "conflict_markers": [
    {
      "field": "薪资范围（月薪，上海数据分析师2年）",
      "source_a": "JD原文（jd_text）",
      "value_a": "12-18K，13薪，年薪约156K-234K",
      "source_b": "knowledge/salary-data（knowledge_graph, stale）",
      "value_b": "中位数约22K，区间18-30K"
    }
  ]
}
```

---

## 说明

- **显式并列、不硬编中位数**：三方口径（JD / 知识库 stale / 当季联网）全摆出来并标各自来源，不取平均、不判 cannot_determine——`conflict_markers` 承载库 vs JD 口径，正文 summary 把第三方联网口径也并列。
- **先联网再降级**：薪资为时效信息，先 WebSearch 拿当季口径（标 `[实时·未核实·URL·日期]`），而非直接用 stale 知识库冒充新鲜。
- **不连坐**：薪资维度 medium，但岗位解析维度仍 high；主结论取整体 medium（薪资是本意图最关键维度，故主结论与之一致）。
- **cannot_determine 收敛**：只留「未公开内部薪酬补充」这一非人工不可核实项。
