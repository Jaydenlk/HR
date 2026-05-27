---
name: salary-radar
description: >
  聚合薪资数据（岗位/公司/城市维度）。当用户询问薪资行情、评估 offer 是否合理时触发。
  无实时数据时降级到历史知识库并标注 stale。禁止在无来源时给出精确薪资数字。
allowed-tools: [Read, Grep, WebSearch, WebFetch]
---

# salary-radar — 薪资数据聚合

## 核心职责

从多个来源聚合岗位/公司/城市维度的薪资数据，输出分位数区间和横向对比。

**严格约束：**
1. 薪资数据缺少 year + city + role + source 任一字段 → grade 强制为 C
2. 无实时来源时降级到知识图谱，标注 freshness: stale，confidence: low
3. 完全无数据时 salary_range 为 null，confidence: insufficient

## 四要素完整性规则

薪资数据必须包含以下四要素才能获得 B 级以上评级：
1. **year**：数据年份（如 2026）
2. **city**：城市（如 北京）
3. **role**：岗位（如 后端工程师）
4. **source**：来源（如 BOSS直聘、猎聘）

缺少任一 → grade 强制为 C，无论内容多详细。

## 降级行为

| 情况 | 行为 |
|------|------|
| 有实时来源（A/B级） | 正常输出，标注 freshness: fresh |
| 无实时来源，有历史数据 | 降级：freshness: stale, confidence: low，明确标注 |
| 无任何数据 | salary_range: null, confidence: insufficient |

## 中国市场薪资组成

salary-radar 需要分解以下中国特有组成部分：
- **base_monthly**：月基本工资
- **months_per_year**：年薪月数（标准 12，十三薪=13，十四薪=14）
- **annual_bonus**：年终奖（通常以月薪为单位，如"2-4个月"）
- **equity**：股权（RSU/期权，需注明行权条件）
- **social_insurance**：社保公积金（公司缴纳比例）

## 数据来源优先级

| 来源 | 等级 | 特点 |
|------|------|------|
| BOSS直聘 JD 薪资范围 | B | 样本量大，但为招聘方标注，非实际 offer |
| 猎聘薪资报告 | B | 有参考价值，需交叉验证 |
| 脉脉薪资爆料 | B | 实名较多但仍有水分 |
| 牛客 Offer 报告 | B | 技术岗较可靠 |
| 口碑/传言 | C | 无法验证，仅供参考 |

## 知识图谱引用

本 skill 使用以下知识文件辅助判断：

| 文件 | 用途 | 何时使用 | 不可用时降级 |
|------|------|---------|------------|
| `../_career-skills-shared/knowledge/offer-comparison-factors.yaml` | 中国薪资结构的标准组成要素定义（base/bonus/equity/社保等），用于解析和标准化用户提供的薪资数据 | 分解薪资结构（breakdown 字段）时 | 使用内置薪资结构定义，可能缺少某些特殊条款说明 |

## 产品原则适用

本 skill 遵循 `shared/policies/product-principles.md` 中的两项核心原则。

### 信息不足时 (Ask-before-judging)
- 当缺少岗位（role）、城市（city）或数据年份（year）任一要素时，视为信息不足
- 信息不足时不能输出薪资范围（`salary_range`），因为缺少定位维度的薪资数字无参考价值且可能严重误导
- 低置信度时只给出知识图谱历史参考（标注 freshness: stale, confidence: low），不结合无来源数据推算实际值
- 追问最小必要问题：缺岗位时追问「请提供具体职位名称（如：后端工程师、产品经理）」；缺城市时追问「请提供工作所在城市」

### 出处-思考-观点 (Source-Reason-Opinion)
- Source: 每条薪资数据在 `data_sources` 字段列出来源平台、数据年份、样本说明，grade 字段标注来源等级（A/B/C）
- Reasoning: `comparison` 字段体现当前 offer 与市场分位数的对比逻辑，说明「高于/低于市场中位数的原因推断」
- Opinion: `breakdown` 字段区分确定性薪资（base × 月数）与不确定部分（equity/期权），建议标注「建议核实」而非给出确定性判断
