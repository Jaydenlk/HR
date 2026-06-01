# 示例：信息不足（标出处即呈现 + 当场联网 + 收敛 cannot_determine）

## 场景描述

用户给了学历背景和目标公司+岗位，但没有 JD 原文、简历、专业、实习经历。展示口径松绑后的正确做法：**先采集首次最小画像、当场联网核时效信息、标出处即呈现低置信推断（不动辄 cannot_determine）、cannot_determine 只留非人工不可核实项**。

---

## 用户消息

> 我是 985 本科，想投字节产品，但简历一般，这个 JD 值得冲吗？帮我今天规划一下。

---

## career-principal 响应（摘要）

- **意图**：`evaluate_opportunity`（主）+ `daily_planning`（次）。
- **首次最小画像**：已知背景=985本科应届、目标=字节产品岗；缺称呼+专业+城市，合并进一次追问（不占多轮）。
- **缺 JD/简历**：不给精确分数；按"标出处即呈现"给低置信普适推断，**标 market_prior**，不一律塞 cannot_determine。
- **当场联网**：字节产品岗当季招聘窗口/竞争度属时效信息 → WebSearch（本例假设命中一条社区帖，标 `[实时·未核实·URL·日期]`）。
- **主动盘点**：按"准备投递"情境点出 ①时间窗、③内推（高价值盲区），写进 next_actions。

---

## 输出

```json
{
  "skill_name": "career-principal",
  "skill_version": "1.0.0",
  "status": "partial",
  "intent_detected": "evaluate_opportunity",
  "confidence": "low",
  "summary": "[据CV]你 985 本科应届想投字节产品。缺 JD 原文和简历，无法做个性化匹配诊断；以下为标了出处的普适推断 + 今日可执行行动，等你补 JD/简历后再升级为个性化评估。",
  "dimension_level_visibility": [
    { "dimension": "字节产品岗通过率", "confidence": "low", "source_type": "market_prior", "basis": "[行业惯例]985本科产品岗通过率约30-40%，普适非个性化" },
    { "dimension": "当季招聘窗口/竞争度", "confidence": "medium", "source_type": "web_search", "basis": "[实时·未核实·https://example-community/bytedance-2026·2026-06-01]本轮检索社区口径" }
  ],
  "skills_invoked": [
    { "skill_name": "opportunity-intelligence", "status": "skipped", "result_summary": "缺 JD 原文，无法做机会评估，待用户补充", "confidence": "low" }
  ],
  "evidence_used": [
    {
      "source_type": "market_prior", "source_name": "行业惯例：校招产品岗通过率",
      "source_url": null, "content_excerpt": "985本科在头部互联网产品岗一般通过率约30-40%（普适认知，非个性化）",
      "freshness": "stale", "reason": "缺个性化数据时给普适锚点，标明非针对本人"
    },
    {
      "source_type": "web_search", "source_name": "社区招聘讨论帖",
      "source_url": "https://example-community/bytedance-2026", "content_excerpt": "字节2026校招产品岗竞争较激烈，多要求互联网实习/产品项目",
      "freshness": "current", "reason": "招聘窗口/竞争度为时效信息，本轮当场联网核实（示例 URL）"
    }
  ],
  "recommendations": [
    "[行业惯例]字节产品岗通常要求互联网实习或产品相关项目，建议先盘点你简历里能体现产品思维的经历",
    "[推断]「简历一般」未必是硬障碍，关键看有无可讲的亮点经历——补给我看才能判断"
  ],
  "risks": [
    "[推断]以上通过率为普适数据，依赖「无个性化信息」前提，补 JD/简历后可能大幅偏移"
  ],
  "next_actions": [
    "今天找到目标 JD 原文，完整复制给我做具体分析",
    "准备简历初稿（框架即可），帮你诊断差距",
    "顺手核①字节本届产品岗招聘窗口（提前批是否已开）与③有无可靠内推渠道——这两项错过损失最大"
  ],
  "suggested_next": [
    { "next_intent": "match_diagnosis", "reason": "补上 JD 与简历后，把通过率从普适推断升级为个性化匹配诊断", "ready_inputs": ["user_profile"], "priority": "recommended" },
    { "next_intent": "find_referral_path", "reason": "字节产品岗内推可显著提通过率，值得投递前先找渠道", "ready_inputs": [], "priority": "optional" }
  ],
  "follow_up_questions": [
    "能粘贴你目标的那个 JD 吗？你的专业和实习经历是什么？"
  ],
  "cannot_determine": [
    "你简历里的真实实习/项目细节（只有你本人知道，简历未提供前无法评估）"
  ],
  "missing_information": [
    "JD 原文（无法评估这个职位是否值得冲）",
    "简历文本（无法诊断个人竞争力）",
    "专业方向 / 城市偏好（影响字节产品岗优势判断）"
  ]
}
```

---

## 说明

- **标出处即呈现**：通过率推断标 `market_prior`、当季竞争标 `web_search`，按出处正常输出，**不因是推断就一律压进 cannot_determine**——这是口径松绑的核心。
- **cannot_determine 收敛**：只留「简历里的真实实习/项目细节」这类**非人工不可核实**项；"这个 JD 值不值得投""精确通过率"不再塞进去，而是落进 `missing_information`（补输入即可解）。
- **当场联网**：招聘窗口/竞争度是时效信息，先 WebSearch 再说，标 `[实时·未核实·URL·日期]`，无网才降级。
- **追问合并**：JD + 专业/实习合并为一个问题，不超过2项，不占多轮。
