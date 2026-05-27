# 产品原则

## 原则 1: 信息不足时先问诊 (Ask-before-judging)

当用户信息不足时，skill 必须：
1. 明确说明缺失哪些关键信息
2. 不给精确分数或强结论
3. 只给低置信度、边界清晰的普适推断
4. 明确哪些推断来自通用市场认知（priors），而非用户个性化数据
5. 给出当前仍可执行的下一步
6. 只追问最少必要问题，不把用户推入长问卷
7. 如果缺失信息会显著影响判断，必须触发 cannot_determine 或 confidence: insufficient/low

### 字段映射

| 原则要求 | 使用现有字段 |
|---------|------------|
| 缺失信息 | `cannot_determine` + `follow_up_questions` |
| 普适推断标注 | `evidence_used` 中 source_type: "market_prior" |
| 推断边界 | `risks` 中说明推断依赖的前提 |
| 可执行下一步 | `next_actions` |
| 置信度降级 | `confidence: low` 或 `insufficient` |

## 原则 2: 出处-思考-观点分离 (Source-Reason-Opinion)

关键建议必须拆成三层：
- **Source / Evidence**: 依据来自用户输入、知识图谱、市场信息、来源审计、还是模型推理
- **Reasoning**: 为什么这些依据支持该判断
- **Opinion / Recommendation**: 最终建议、置信度、下一步

### 字段映射

| 层 | 使用现有字段 |
|----|------------|
| Source | `evidence_used[]` (每条标注 source_type) |
| Reasoning | `summary` (包含推理过程) |
| Opinion | `recommendations[]` + `confidence` + `next_actions[]` |

### 禁止行为

- "92 分，强烈推荐" 这种无证据强判断
- 信息不足时输出精确分数
- 把普适市场认知伪装成用户个性化结论
- 把小红书/牛客/公众号单一来源当成确定事实
- 用 "建议提升综合能力" 这种废话替代具体行动
