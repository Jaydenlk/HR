# source-quality-auditor

来源质量审计 skill，是 Career Skills Marketplace 的信任基础设施。

对每条来源给出 grade (A/B/C/D)、freshness 和 verification_status，并汇总整体置信度上限。

---

## 它解决什么问题

AI 系统在处理求职信息时面临两种典型风险：

1. **幻觉**：AI 基于训练数据编造薪资数据、公司信息，而非真实来源
2. **引用垃圾**：引用已失效的 URL、营销软文或多年前的旧帖，以"看起来有来源"的形式呈现

source-quality-auditor 提供一套一致的审计机制，让所有 skill 在使用外部信息前先经过质量门控。

---

## 在其他 skill 中如何引用

任何需要外部事实的 skill 都应在 SKILL.md 中声明依赖：

```yaml
depends_on:
  - source-quality-auditor
```

在 skill 的执行逻辑中：

1. 收集外部来源（URL、口述等）
2. 调用 source-quality-auditor，传入 sources 数组
3. 根据 audit_results 中的 grade 和 recommendation 决定是否使用某条来源
4. 使用 overall_confidence_ceiling 约束最终输出的置信度

**关键约束：** 等级 D 的来源必须丢弃，不得出现在最终建议中。

---

## 输入结构

```json
{
  "sources": [
    {
      "source_id": "唯一标识符",
      "source_type": "url | verbal | screenshot | document | api_response",
      "source_url": "https://...",
      "content": "来源内容或摘要",
      "platform": "nowcoder | xhs | maimai | boss | zhihu | official_website | ...",
      "date": "2024-03-15",
      "claim_type": "salary | job_demand | company_info | interview_experience | market_trend | other"
    }
  ]
}
```

---

## 输出结构

```json
{
  "confidence": "low",
  "audit_results": [
    {
      "source_id": "对应 input 的 source_id",
      "grade": "A | B | C | D",
      "freshness": "fresh | stale | unknown",
      "verification_status": "verified | unverifiable | unreachable | mismatch",
      "issues": ["问题描述"],
      "recommendation": "use | use_with_caution | discard",
      "conflict": false,
      "conflict_detail": ""
    }
  ],
  "overall_confidence_ceiling": "high | medium | low",
  "conflict_detected": false,
  "usable_source_count": 2,
  "summary": "整体审计摘要"
}
```

---

## 等级含义

| 等级 | 含义 | 处理 |
|------|------|------|
| A | 官方权威来源 | 直接引用 |
| B | 有价值，需交叉验证 | 谨慎引用 |
| C | 低质量线索 | 仅供参考 |
| D | 无效/不可达 | 丢弃 |

---

## 关键规则速查

- URL 不可达 → grade D，verification_status "unreachable"，不能输出 "verified"
- B+ 来源 < 2 → overall_confidence_ceiling 为 "medium"
- 小红书 claim_type=salary → 不计入薪资事实
- 薪资数据缺年份/城市/岗位 → 降至 C
- 来源冲突 → 列出所有版本，不裁决
- 无日期 → freshness "unknown"，等级最高 C

---

## 参考文件

- `references/source-grading-policy.md` — 各平台详细分级规则
- `references/freshness-rules.md` — 各内容类型有效期规则
- `_career-skills-shared/source-policy/grading-policy.yaml` — 机器可读分级策略
- `_career-skills-shared/source-policy/freshness-rules.yaml` — 机器可读时效性规则
- `examples/` — 4 个典型场景的完整输入/输出示例
- `tests/` — 5 个测试用例，含防幻觉核心测试

---

## 这个 skill 不做什么

- 不自行访问 URL（allowed-tools 只有 Read 和 Grep）
- 不自行判断内容真假（只评估可验证性）
- 不裁决冲突信息哪条正确（只列出所有版本）
- 不对用户自己的简历进行审计（用户自述默认 A 级）
