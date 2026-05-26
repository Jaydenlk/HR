# 来源分级策略

> 被 SKILL.md 和 shared/source-policy/grading-policy.yaml 引用。
> 定义各平台在中国求职场景下的默认等级和适用范围。

---

## 等级定义

| 等级 | 标准 | 在最终建议中的地位 |
|------|------|-----------------|
| A | 官方权威来源，内容可追溯，无明显利益冲突 | 可直接引用，无需交叉验证 |
| B | 有价值的第三方来源，但存在一定的偏差风险 | 可使用，需至少一条独立来源佐证 |
| C | 低质量线索，信息价值有限或难以核实 | 仅供参考，不能作为核心证据 |
| D | 无效来源，不可靠或不可访问 | 直接丢弃，禁止引用 |

---

## 平台分级规则

### 企业官网 (official_website)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 官方招聘页面 JD | A | 直接来源，权威 |
| 产品介绍/公司简介 | A | 官方自述，可信 |
| 新闻公告/财报摘要 | A | 官方发布 |
| 博客/技术文章 | B | 内容质量参差，需核实发布日期 |

### 领英 (LinkedIn)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 职位发布 JD | B | 实时性好，但部分为第三方代发 |
| 公司主页信息 | B | 公司自维护，但更新不稳定 |
| 个人用户帖子 | C | 个人观点，缺乏核实 |

### Boss直聘 (boss)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| JD 文本 | B | 实时招聘意图强，JD 内容可信 |
| 薪资区间（JD 中标注）| B | 招聘方报价，非实际到手薪资，需注明 |
| 公司评价 | C | 用户自评，筛选机制弱 |

### 牛客网 (nowcoder)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 技术面经（算法/系统设计）| B | 社区积累丰富，技术细节可信度高 |
| 薪资 offer 帖子 | C | 候选人自报，夸大常见，缺乏验证 |
| 非技术岗信息（运营/产品/HR）| C | 技术社区对非技术岗覆盖不足 |
| 公司八卦/内部消息 | C | 匿名发布，无法核实 |

### 小红书 (xhs)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 求职体验分享 | C | 主观性强，但可作为用户声音参考 |
| 薪资数据 | C | **禁止作为薪资事实**，只计为用户声音 |
| 公司文化描述 | C | 情绪化，存在明显偏向性 |
| 面经分享 | C | 质量参差，无结构化验证 |

**特别注意：** 无论内容质量如何，小红书来源在 `claim_type=salary` 场景下永远不能支撑薪资事实声明。

### 脉脉 (maimai)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 所有内容 | C | 匿名机制导致无法核实身份，造谣/夸大风险高 |
| 内部消息流传 | C | 即使是真实内部信息，也无法在外部验证 |

### 智联招聘 (zhilian)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| JD 文本 | B | 主要招聘渠道，JD 可信 |
| 薪资区间 | C | 更新不及时，数据偏滞后 |

### 猎聘 (liepin)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 中高端岗位 JD | B | 猎头渠道，JD 质量较高 |
| 薪资区间 | C | 区间跨度大，实际谈判空间不确定 |

### 知乎 (zhihu)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 认证专业人士回答（高赞）| B | 有实名认证，内容可追溯 |
| 匿名回答 | C | 无法核实身份 |
| 低赞回答 | C | 未经社区筛选 |
| 个人专栏文章 | B 或 C | 取决于作者认证状态和发布日期 |

### 微信公众号 (wechat_mp)

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 企业官方认证公众号 | A | 等同企业官网公告 |
| 行业媒体公众号 | B | 专业媒体，但需核实发布日期 |
| 个人公众号 | C | 作者背景不明，质量不可控 |
| 无明确作者/来源的转发 | D | 无法追溯原始来源 |

### 国家/政府数据来源

| 内容类型 | 等级 | 说明 |
|---------|------|------|
| 国家统计局数据 | A | 官方统计，权威 |
| 人力资源和社会保障部政策文件 | A | 官方政策，权威 |
| 地方政府招聘公告 | A | 官方公示 |

---

## 通用降级规则（覆盖平台默认等级）

以下任何条件满足时，等级在平台默认值基础上降一级（最低 D）：

1. **薪资数据缺要素**：薪资数据未同时标注年份 + 城市 + 岗位类型 → 降至 C
2. **无发布日期**：freshness 设为 "unknown"，等级最高 C
3. **URL 不可达**：等级设为 D，verification_status 设为 "unreachable"
4. **内容高度营销化**：通篇正面表述、无具体数据、有推广链接 → 等级 D
5. **转载且找不到原文**：等级降一级
6. **内容与 URL 描述不符**：verification_status 设为 "mismatch"，等级降一级

---

## 用于 shared/source-policy/grading-policy.yaml 的机器可读摘要

```yaml
platform_defaults:
  official_website: A
  linkedin_jd: B
  boss_jd: B
  boss_salary: B
  nowcoder_tech: B
  nowcoder_nonttech: C
  nowcoder_salary: C
  xhs: C
  maimai: C
  zhilian_jd: B
  zhilian_salary: C
  liepin_jd: B
  liepin_salary: C
  zhihu_verified: B
  zhihu_anonymous: C
  wechat_official: A
  wechat_media: B
  wechat_personal: C
  gov_stats: A

demotion_triggers:
  - condition: salary_missing_year_or_city_or_role
    demote_to: C
  - condition: no_publish_date
    max_grade: C
    freshness: unknown
  - condition: url_unreachable
    force_grade: D
    verification_status: unreachable
  - condition: marketing_content
    force_grade: D
  - condition: repost_no_original
    demote_by: 1

xhs_special_rule: xhs sources never count as salary facts, only user voice
```
