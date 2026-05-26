---
name: source-quality-auditor
description: >
  来源质量审计。评估信息来源的可信度、时效性和中国市场适配度。
  对每条证据给出 grade (A/B/C/D)、freshness 和 verification_status。
  被所有涉及外部事实判断的 skill 引用。
allowed-tools: [Read, Grep]
---

# source-quality-auditor

评估信息来源的可信度、时效性和中国市场适配度，为其他 skill 的外部事实判断提供信任基础设施。

---

## 1. 来源分级体系 (Grade A/B/C/D)

每条来源必须获得一个等级。等级决定其在最终置信度计算中的权重。

| 等级 | 含义 | 典型来源 |
|------|------|---------|
| A | 权威/官方，可直接引用 | 企业官网 JD、官方公告、国家统计局数据 |
| B | 有价值但需交叉验证 | 牛客网技术面经、Boss直聘 JD、领英职位 |
| C | 低质量线索，仅供参考 | 小红书帖子、脉脉匿名爆料、无日期文章 |
| D | 直接丢弃，不得引用 | 无法访问的 URL、营销软文、来源不明转载 |

各平台详细分级规则见 `references/source-grading-policy.md`。

**关键降级规则：**
- 薪资数据缺少年份/城市/岗位三要素中任意一项 → 自动降至 C 级
- 无日期内容 → freshness 标记为 "unknown"，等级最高为 C
- URL 不可达 → 等级降至 D，verification_status 为 "unreachable"
- 明显营销软文（无具体数据、只有正面表述）→ 等级降至 D

---

## 2. 时效性评估 (Freshness)

时效性反映内容是否仍然适用于当前市场。

不同内容类型有不同的有效期。具体规则见 `references/freshness-rules.md`。

**核心原则：**
- 旧帖不能代表当前趋势，即使内容本身看似合理
- 无日期的内容不能判断时效，必须标注 "unknown"
- 过时内容可保留作历史参考，但置信度必须相应下调

**Freshness 取值：**
- `fresh` — 在有效期内
- `stale` — 超过有效期
- `unknown` — 无法判断（缺少日期）

---

## 3. 中国平台识别与特性

审计时必须识别来源所属平台，并依据平台特性调整解读。

### 牛客网 (Nowcoder)
- 强项：技术岗面经（LeetCode 题目、算法轮、系统设计题）
- 弱项：非技术岗数据、薪资准确性（候选人自报，存在夸大）
- 技术岗信息 → 等级 B；非技术岗信息 → 等级 C

### 小红书 (XHS)
- 强项：求职体验分享、心态类内容、非正式职场文化
- 弱项：薪资数据（不可作为薪资事实依据）、公司评价（情绪化）
- **小红书只计入用户声音，不计入薪资事实**
- 默认等级 C

### 脉脉 (Maimai)
- 强项：内部消息流传、职场吐槽
- 弱项：匿名性导致无法核实，夸大/造谣风险高
- 默认等级 C

### Boss直聘 JD
- 强项：实时招聘需求，JD 文本可信
- 弱项：薪资区间为范围值，存在水分
- JD 文本 → 等级 B；薪资区间 → 等级 B（需注明为招聘方报价，非实际到手）

### 智联招聘 / 猎聘
- 传统招聘平台，JD 质量参差
- JD 文本 → 等级 B；薪资 → 等级 C（因更新不及时）

### 知乎
- 专栏文章/回答质量差异极大
- 高赞专业回答 → 等级 B；匿名/低赞 → 等级 C
- 必须核对作者身份和发布日期

### 企业官方公众号
- 官方认证公众号 → 等级 A
- 非官方/个人公众号 → 等级 C

### 企业官网
- 官方招聘页面、产品介绍、新闻公告 → 等级 A

---

## 4. 多来源冲突检测

当两条或以上来源对同一事实给出不同描述时：

- **列出所有版本**，不自行裁决哪个正确
- 在 `audit_results` 中标注 `conflict: true`
- 在 `issues` 列表中记录冲突详情（来源 A 说 X，来源 B 说 Y）
- 置信度上限降至 medium

**禁止行为：** 对矛盾信息取平均值或"综合判断"得出单一结论——这会隐藏数据质量问题。

---

## 5. 垃圾来源识别

以下情况直接标记为低质量：

| 信号 | 处理 |
|------|------|
| URL 不可达（404、超时、DNS 失败）| verification_status: "unreachable"，等级 D |
| 内容只有正面表述，无具体数据 | 疑似营销软文，等级 D |
| 无发布日期 | freshness: "unknown"，等级最高 C |
| 来源为截图无原始链接 | verification_status: "unverifiable" |
| 转载内容找不到原始来源 | 等级降一级 |

---

## 6. Verification Status

每条来源必须有一个验证状态：

| 状态 | 含义 |
|------|------|
| `verified` | URL 可访问，且内容与声明一致 |
| `unverifiable` | 无 URL（口述、截图、转述），无法独立核实 |
| `unreachable` | URL 存在但无法访问（404/超时/DNS 失败） |
| `mismatch` | URL 可访问，但内容与声明不符 |

**严格规则：** URL 不可达的来源，verification_status 绝对不能为 "verified"。这是防止幻觉的核心约束。

---

## 7. 审计规则汇总

1. 等级 D 的来源直接丢弃，不出现在最终建议中
2. B+ 来源数量 < 2 → 整体置信度上限为 medium
3. 小红书仅计为用户声音，不作为薪资事实依据
4. 牛客只作为技术面试参考，非技术岗数据降级
5. 旧帖（超过有效期）不能支撑"当前趋势"类声明
6. 薪资数据缺少年份/城市/岗位 → 降至 C 级
7. 发现冲突 → 列出所有版本，不自行裁决

---

## 输出格式

每条来源的审计结果包含：

```json
{
  "source_id": "来源标识符",
  "grade": "A | B | C | D",
  "freshness": "fresh | stale | unknown",
  "verification_status": "verified | unverifiable | unreachable | mismatch",
  "issues": ["问题描述1", "问题描述2"],
  "recommendation": "use | use_with_caution | discard"
}
```

整体审计结果还包含：

```json
{
  "overall_confidence_ceiling": "high | medium | low",
  "conflict_detected": true,
  "usable_source_count": 2,
  "summary": "简短的整体评估说明"
}
```
