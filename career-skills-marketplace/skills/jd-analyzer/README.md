# jd-analyzer

JD 结构化分析 skill — 将职位描述解析为结构化字段，识别风险信号和中国市场隐语。

## 核心能力

- 提取显性要求（学历/经验/技能）并标注优先级
- 推断隐性要求（附推断依据）
- 识别 12+ 类中国职场风险信号（见 `references/jd-risk-signals.md`）
- 解析中国市场术语（五险一金、十三薪、大小周等）

## 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `jd_text` | string | 是 | 职位描述原文（>= 20 字） |
| `user_profile` | object | 否 | 用户画像，用于个性化评估 |
| `market_context` | object | 否 | 行业/城市背景 |

## 输出结构

```
parsed_jd
├── basic              # 职位/公司/地点/薪资/用工类型
├── requirements
│   ├── explicit[]     # 显性要求（含 type + priority）
│   └── implicit[]     # 隐性要求（含 inference_reason + confidence）
├── risk_signals[]     # 风险信号（含 severity + evidence）
├── responsibilities[] # 职责列表
├── benefits[]         # 福利（含 verified 标记）
└── company_context    # 公司发展阶段推断
```

## 薪资字段规则

`salary_range` 仅来自 JD 原文。JD 未注明薪资时，该字段**必须为 null**，禁止推断行业均值或区间。

## 置信度说明

| 等级 | 条件 |
|---|---|
| `high` | JD >= 200 字，含职位/公司/职责/要求 |
| `medium` | 100-199 字，或缺少部分关键段落 |
| `low` | < 100 字 |
| `insufficient` | 不是 JD，返回 error |

## 风险信号等级

| 等级 | 含义 |
|---|---|
| `red` | 强烈建议谨慎，常见于劳动权益风险 |
| `yellow` | 需要进一步核实的模糊信号 |
| `notice` | 提示性信息，不一定是问题 |

## 示例参考

| 文件 | 说明 |
|---|---|
| `examples/happy-path.md` | 标准 JD → 完整解析结果 |
| `examples/ultra-short.md` | 超短 JD（< 50 字）→ 低置信度 |
| `examples/not-a-jd.md` | 非 JD 输入 → error |
| `examples/internal-contradiction.md` | JD 内容自相矛盾 → 矛盾标记 |

## 限制

- 不解析 PDF/图片格式，只处理纯文本
- 公司发展阶段为推断，非权威认定
- 隐性要求基于语义推断，存在误判可能
