# Radar Workspace 二级页面设计规格

> 状态：待确认
> 日期：2026-05-26
> 分支：dev
> 前置：monthly-newspaper-product-shape-audit.md

---

## 一、架构决策

**路由：** 保持 `/newspaper/radar` 单页，不新增路由。页面顶部 4 个 Tab 切换内容区：

| Tab | 标签 | 功能 |
|-----|------|------|
| search | 搜索 | 现有筛选+搜索（保持+增强） |
| company | 公司雷达 | 按公司聚合的情报面板 |
| role | 岗位雷达 | 按 role_category 归一化聚合 |
| trend | 趋势 | 本周新增 + 周环比（有数据时） |

**不做：**
- 不新增路由
- 不做三级详情页
- 不做移动端（本轮）
- 不做 mock 数据——所有 tab 必须接真实 API，数据不足时显示诚实空状态

---

## 二、后端 API 设计

### 2.1 公司雷达 `GET /newspaper/radar/companies`

返回按公司聚合的情报卡片数据。

```typescript
interface CompanyRadarItem {
  company: string;
  company_id: string | null;
  company_type: string | null;   // big_tech / foreign_brand / startup_ai / ...
  priority: string | null;       // A / B
  sector: string | null;

  total_count: number;
  usable_count: number;          // quality_score >= 50 AND confidence IN ('medium','high')
  low_confidence_count: number;  // confidence = 'low'
  
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  
  top_roles: string[];           // role_category 去重，按 count 排序，取前 5
  high_confidence_count: number; // confidence = 'high'
  quality_score_avg: number;     // usable 条目的平均 quality_score
  
  latest_collected_at: string;   // 最新 fetched_at ISO
  
  candidate_count: number;       // confidence='low' OR normalized_quality < 50
  rejected_count: number;        // quality_score = -1

  dominant_signal: string | null; // 纯规则生成的一句话信号描述（不调 AI）
}

// Response
interface CompanyRadarResponse {
  companies: CompanyRadarItem[];
  total_companies: number;
  generated_at: string;
}
```

**dominant_signal 生成规则（纯规则，不调 AI）：**
- 如果某个 role_category 占比 > 50%：`"{role}岗面经集中"`
- 如果 xhs_count > nowcoder_count * 2：`"用户之声活跃"`
- 如果最近 7 天有新增：`"本周有新面经"`
- 如果 usable_count = 0：`"暂无高质量数据"`
- 多条规则命中时取第一条

**排序：** 默认按 usable_count DESC，quality_score_avg DESC。

**口径说明：** `total_count = usable_count + candidate_count + rejected_count`

### 2.1.1 quality_score 归一化（全局统一）

真实 DB 中 quality_score 尺度不一致：XHS 管线输出 0-10，WebSearch 入库为 40-60，rejected 为 -1。
所有聚合、排序、usable 判定统一使用 normalized score：

```typescript
function normalizeQualityScore(raw: number | null): number {
  if (raw === null || raw === undefined || raw < 0) return 0;
  if (raw <= 10) return raw * 10;     // 0-10 → 0-100
  if (raw > 100) return 100;
  return raw;                          // 11-100 → 原值
}
```

**isUsable 判定规则（全局统一，抽成方法）：**
```
isUsable(item) = normalizeQualityScore(item.quality_score) >= 50
                 AND item.confidence IN ('medium', 'high')
                 AND item.source_url IS NOT NULL
                 AND LENGTH(item.content) >= 200
```

**isCandidate：** 不满足 isUsable 但 quality_score != -1
**isRejected：** quality_score = -1

### 2.2 岗位雷达 `GET /newspaper/radar/roles`

返回按 role_category 归一化聚合的数据。**不用 role 原字符串，只用 role_category。**

```typescript
interface RoleRadarItem {
  role_category: string;         // backend / frontend / product / ...
  label: string;                 // 后端开发 / 前端开发 / 产品经理 / ...
  
  total_count: number;
  usable_count: number;
  candidate_count: number;
  rejected_count: number;
  
  xhs_count: number;
  nowcoder_count: number;
  wechat_count: number;
  
  top_companies: string[];       // 按 count 排序取前 5
  companies_covered: number;     // 去重公司数
  
  common_question_keywords: string[];  // 从 question_taxonomy seed 读取
  representative_posts: Array<{        // usable 中 quality_score 最高的 3 条
    title: string;
    company: string | null;
    source_url: string;
    source_kind: string;
  }>;
}

// Response
interface RoleRadarResponse {
  roles: RoleRadarItem[];
  total_roles: number;
  generated_at: string;
}
```

**归一化规则：**
- 使用 feed_items.role_category 字段，值为 role_categories.json 的 role_key
- role_category 为 null、空字符串、字面量 `"null"`、或不在已知列表中的，全部归入 "general"
- 前端不允许出现 "null" 岗位卡片
- 不对 role 原字符串做 group by

### 2.3 趋势雷达 `GET /newspaper/radar/trends`

基于 created_at 时间窗口的真实统计。

```typescript
interface TrendRadarResponse {
  period: {
    current_start: string;    // ISO，最近 7 天起始
    current_end: string;
    previous_start: string;   // 上一个 7 天起始
    previous_end: string;
  };
  
  this_week: {
    new_items: number;
    new_companies: string[];     // 本周首次出现的公司
    new_role_categories: string[]; // 本周首次出现的岗位类
    top_sources: Array<{ source_kind: string; count: number }>;
  };
  
  // 环比：只在 previous period 有数据时返回
  comparison: {
    has_baseline: boolean;       // false 则下面字段不可信
    item_count_delta: number;    // 正=增长
    item_count_previous: number;
    message: string;             // "本周新增 23 条面经，环比增长 15%" 或 "暂无足够历史数据计算环比"
  };
  
  // 本周热门面经（usable，最新 5 条）
  hot_posts: Array<{
    title: string;
    company: string | null;
    role_category: string | null;
    source_kind: string;
    source_url: string;
    created_at: string;
  }>;
}
```

**环比口径：**
- current = 最近 7 天（today - 7d ~ today）
- previous = 前 7 天（today - 14d ~ today - 7d）
- `has_baseline = previous period item count > 0`
- 如果 `!has_baseline`，message = "暂无足够历史数据计算环比"，delta 字段为 0
- 绝不 hardcode 百分比，绝不编造趋势

### 2.4 修复 quarter 过滤

**现状 bug：** radar 前端发 `quarter=current`，后端做 `WHERE item.quarter = 'current'`，但实际值是 "2026Q2"。

**修复方案：** 后端 `applyRadarFilters()` 中增加 `normalizeQuarter()` 方法：

```typescript
function normalizeQuarter(input: string): string | null {
  if (input === 'current') {
    const now = new Date();
    const q = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}Q${q}`;
  }
  if (input === 'previous') {
    const now = new Date();
    let q = Math.ceil((now.getMonth() + 1) / 3) - 1;
    let year = now.getFullYear();
    if (q <= 0) { q = 4; year--; }
    return `${year}Q${q}`;
  }
  return input; // 已经是 "2026Q2" 格式
}
```

**quarter 口径（修订）：**
- DB 现状：139 条 quarter=null，2 条 "2026Q2"，部分字面量 `"null"`，部分未来季度如 "2026Q3"
- 字面量 `"null"` 视同 null
- **Radar 默认筛选为"全部"**，不默认 current quarter（否则页面几乎空）
- 只有用户主动选择 current/previous/具体季度时才过滤
- quarter 为 null 的条目：选"全部"时显示，选具体季度时排除
- 未来季度（> current）：不计入趋势统计，可在"全部"中显示但标记为 "待确认"

### 2.5 后端代码组织

在 `newspaper.service.ts` 中抽出清晰聚合方法，保持单一职责：

```
NewspaperService
  ├── normalizeQuarter(input)
  ├── buildBaseRadarQuery(filters)    // 复用现有 applyRadarFilters
  ├── isUsableItem(item)              // 统一 usable 判定
  ├── aggregateByCompany(items)       // 公司雷达聚合
  ├── aggregateByRoleCategory(items)  // 岗位雷达聚合
  ├── buildDominantSignal(stats)      // 公司信号生成
  └── computeTrends(currentItems, previousItems)  // 趋势计算
```

不写胶水 SQL 大坨，每个聚合方法独立可测试。

---

## 三、前端设计

### 3.1 Radar 页面 Tab 结构

```
┌────────────────────────────────────────────┐
│  ← 月刊    面经雷达                          │
├────────────────────────────────────────────┤
│  [搜索] [公司雷达] [岗位雷达] [趋势]            │
├────────────────────────────────────────────┤
│  (当前 tab 的内容区)                          │
└────────────────────────────────────────────┘
```

Tab 切换为前端状态（useState），不新增路由。各 tab 独立 fetch 数据，第一次进入时加载。

### 3.2 公司雷达 Tab

**卡片布局：** 2 列网格，每张公司卡片包含：

```
┌──────────────────────────────────┐
│  字节跳动              A · 互联网  │
│  ─────────────────────────────── │
│  面经 17 条 · 可用 12 条           │
│  ■■■ XHS 8  ■■ 牛客 4  □ 公众号 0 │
│  岗位：后端 · 产品 · 运营 · 算法     │
│  质量分 65  · 本周有新面经          │
│  最新采集 2h 前                    │
│              [查看该公司面经 →]     │
└──────────────────────────────────┘
```

- 来源分布用色块条：XHS 红 / 牛客绿 / 公众号蓝
- dominant_signal 显示在质量分旁边
- "查看该公司面经 →" 点击后：切到搜索 tab + 自动填入 company filter + 触发真实 API 查询
- 低优先级公司（priority=B）opacity 稍低

### 3.3 岗位雷达 Tab

**卡片布局：** 2 列网格，按 role_category 显示：

```
┌──────────────────────────────────┐
│  产品经理                 偏 XHS   │
│  ─────────────────────────────── │
│  面经 18 条 · 覆盖 12 家公司        │
│  ■■■ XHS 14  ■ 牛客 4             │
│  热门公司：字节 · 美团 · 腾讯 · B站  │
│  常见考点：竞品分析 · 数据指标 ·     │
│           用户研究 · 产品设计        │
│  ─────────────────────────────── │
│  精选面经：                        │
│  · 美团产品三轮+HR面（已意向书）     │
│  · 字节产品UX设计师offer           │
│  · B站产品一面二面面经              │
└──────────────────────────────────┘
```

- 来源偏好标签：偏 XHS / 偏牛客 / 均衡
- common_question_keywords 从 role_categories.json 的 question_taxonomy 读取
- representative_posts 的标题可点击跳 source_url

### 3.4 趋势 Tab

```
┌──────────────────────────────────┐
│  本周趋势  5.19 - 5.26            │
│  ─────────────────────────────── │
│  本周新增 23 条面经                 │
│  环比增长 15%                     │
│  (或: 暂无足够历史数据计算环比)      │
│  ─────────────────────────────── │
│  🆕 新增公司：比亚迪、中金、普华永道  │
│  🆕 新增岗位类：管培生、金融/财务    │
│  ─────────────────────────────── │
│  本周来源分布：                     │
│  XHS 68 条 · 牛客 12 条            │
│  ─────────────────────────────── │
│  本周热门面经：                     │
│  1. 字节产品经理面经 (XHS)          │
│  2. 美团运营面经 (XHS)             │
│  3. 腾讯后端暑期实习 (牛客)         │
└──────────────────────────────────┘
```

- 如果 `comparison.has_baseline = false`，显示灰色提示而非假数字
- hot_posts 每条可点击跳 source_url

### 3.5 搜索 Tab 增强

保持现有功能，增加：
- 热词标签加 `onClick` → 填入 keyword 搜索框并触发查询
- 从公司/岗位雷达卡片跳入时自动填入 filter 并触发查询
- 修复 quarter 过滤前端（发送 "current"/"previous"，后端已修复映射）

### 3.6 首页热词标签联动

Newspaper 首页的 trending tags 加 `onClick`：
- 点击标签 → 跳转 `/newspaper/radar` + 搜索 tab + keyword 预填 + 自动触发搜索

### 3.7 source_kind UI 语义

所有 tab 中 source_kind 必须显示为语义标签：
- `xhs` → "小红书 · 用户之声" 红色 #ff2442
- `nowcoder` → "牛客 · 技术雷达" 绿色 #00c853
- `wechat` → "公众号 · 认知补给" 蓝色 #1890ff

不允许只给总数不分来源。

---

## 四、设计风格

延续截图中的 newspaper 设计理念：
- 卡片式布局，圆角阴影
- 分类标签 badge（面经/热点/故事/题库）
- 质量指标可见（质量分、置信度）
- 来源色标明确
- 简洁的排版，不堆砌信息
- 空状态有引导文案，不显示空白

---

## 五、验收标准

### 5.1 后端测试

| 测试场景 | 预期 |
|---------|------|
| 公司聚合 source 分布 | xhs_count + nowcoder_count + wechat_count = total_count |
| role_category 归一化 | 不出现 "产品经理"/"AI产品经理"/"产品实习" 碎片，全部归 "product" |
| low confidence 不计入 usable | usable_count 只含 medium/high + quality_score>=50 + content>200 |
| current quarter 映射 | normalizeQuarter('current') = '2026Q2' |
| 无历史数据时趋势 | comparison.has_baseline=false, message 为诚实提示 |
| 公司卡片字段完整 | company_card 包含所有 CompanyRadarItem 字段 |
| 空公司数据 | company=null 的条目不出现在公司雷达 |

### 5.2 前端 Playwright 桌面端 E2E

| 步骤 | 验证 |
|------|------|
| 打开 /newspaper/radar | 默认搜索 tab 可用 |
| 切公司雷达 tab | 公司卡片列表出现，有真实数据 |
| 查看公司卡片 | 显示来源分布条、岗位标签、质量分 |
| 点击公司卡片 | 自动切搜索 tab + company filter 已填入 + 结果只含该公司 |
| 切岗位雷达 tab | 显示 role_category 归一化卡片，不是碎片 role |
| 查看岗位卡片 | 显示公司分布、来源分布、常见问题 |
| 点击精选面经标题 | 新窗口跳 source_url |
| 切趋势 tab | 显示本周新增或诚实空状态 |
| 回到搜索 tab | 筛选器正常：company + keyword + role + source_kind + quarter |
| 首页热词标签 | 点击跳 radar + keyword 预填 |
| 公司卡片显示 usable_count | 显示的是 usable 数而非 total_count |
| low/candidate 不算可用 | 公司/岗位卡片的主数字是 usable_count |
| source_kind 三色标签 | 每张卡片上的来源色标正确（红/绿/蓝） |
| "null" 岗位不出现 | 岗位雷达不显示 "null" 卡片 |

### 5.3 红线

- 所有 tab 必须接真实 API，禁止 mock
- 不准为赶工打补丁，所有改动深度融合到现有逻辑
- source_kind 分工必须在 UI 上明确
- usable 和 candidate/low 必须区分
- 环比数据必须基于真实时间窗口
- 空状态必须诚实展示
