# 示例：仅有 C 级来源的低置信度行业分析

## 场景

获取到行业数据，但只有论坛讨论等 C 级来源，无权威报告。

## 输入

```json
{
  "industry": "Web3",
  "region": "中国",
  "timeframe": "near_term"
}
```

## 输出（节选）

```json
{
  "skill_name": "industry-trend-analyst",
  "skill_version": "1.0.0",
  "summary": "Web3 行业在中国政策环境下数据有限，仅找到 C 级来源，置信度为 low。以下趋势判断参考价值有限。",
  "confidence": "low",
  "evidence_used": [
    { "source": "某区块链论坛讨论", "grade": "C", "date": "2026-03" }
  ],
  "risks": [
    "Web3 在中国受到政策严格管控，行业合规性风险高",
    "仅有 C 级来源，分析结论可靠性有限"
  ],
  "trend_summary": "Web3 行业在中国政策空间极为有限，主要活跃在境外市场，国内就业机会稀少。",
  "growth_signals": [],
  "risk_signals": [
    {
      "signal": "中国监管部门对加密货币和 NFT 的限制政策持续",
      "severity": "high",
      "source": "政策文件（历史知识库）",
      "date": "2023-01-01"
    }
  ],
  "hiring_outlook": "contracting",
  "recommended_entry_roles": [],
  "market_radar_used": true
}
```
