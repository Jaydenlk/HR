# Phase 8: 扩展工具模块 Implementation Plan

> **Retroactive documentation.** This plan was written after implementation to document what was actually built.

**Goal:** 构建四个独立的扩展工具页面：薪资雷达（匿名 offer 数据分位统计）、求职信（AI 定制三种语气）、职业地图（AI 路径规划 + 技能盘点）、动态广场（面经/资讯社区 feed）。

**Architecture:** 后端四个独立 NestJS 模块，各自一套实体 + service + controller。前端四个独立页面，无跨页面共享组件，均遵循 `'use client'` + `useEffect` 获取数据 + inline style 的统一范式。

**Tech Stack:** NestJS + TypeORM | Next.js 15 + inline styles | CloudDreamAI（cover-letters, career）| 无 AI（salary, feed）

---

## File Structure

### Backend

```
packages/api/src/
├── salary/
│   ├── salary.module.ts
│   ├── salary.controller.ts
│   ├── salary.service.ts
│   ├── entities/salary-entry.entity.ts
│   └── dto/create-salary-entry.dto.ts
├── cover-letters/
│   ├── cover-letters.module.ts
│   ├── cover-letters.controller.ts
│   ├── cover-letters.service.ts
│   ├── entities/cover-letter.entity.ts
│   └── dto/create-cover-letter.dto.ts
├── career/
│   ├── career.module.ts
│   ├── career.controller.ts
│   └── career.service.ts             ← 无实体，纯 AI 计算
└── feed/
    ├── feed.module.ts
    ├── feed.controller.ts
    ├── feed.service.ts
    ├── entities/feed-item.entity.ts
    └── dto/create-feed-item.dto.ts
```

### Frontend

```
packages/web/src/app/(main)/
├── salary/page.tsx
├── cover-letter/page.tsx
├── career/page.tsx
└── (feed 页面未独立实现，归入 overview 或待后续迭代)
```

---

## Task 1: 薪资雷达 (Salary Radar)

### 1a: Backend

**Files:**
- Create: `packages/api/src/salary/entities/salary-entry.entity.ts`
- Create: `packages/api/src/salary/salary.service.ts`
- Create: `packages/api/src/salary/salary.controller.ts`

- [x] **SalaryEntry 实体字段**

```typescript
company: string;
role: string;
location?: string;
base_salary: float;      // 月薪（元）
bonus?: float;           // 年终奖（元）
stock_value?: float;     // 股票/年（元）
total_comp: float;       // 总包/年（元，必填）
level?: string;          // P5 / T3 / M1 等
source: 'self' | 'peer'; // 默认 'self'
```

- [x] **SalaryService 方法**

- `create()` — 新增一条 offer 数据（绑定当前用户）
- `findAll(filters?)` — 全量查询，支持按 company/role/location 过滤（用于未来搜索功能）
- `findAllByUser()` — 仅返回当前用户数据
- `getStats()` — QueryBuilder 按 company+role 分组，聚合 AVG(base_salary)/AVG(total_comp)/COUNT(*)

- [x] **Controller 路由**

```
GET  /salary         ← 当前用户的 offer 列表
POST /salary         ← 提交新 offer
GET  /salary/stats   ← 全量分位统计（前端自行按响应计算 P25/P75）
DELETE /salary/:id   ← 删除（仅限自己的数据）
```

注意：`/stats` 路由定义在 `/:id` 之前以避免冲突。

### 1b: Frontend (`packages/web/src/app/(main)/salary/page.tsx`)

- [x] **SubmitDialog 组件**

Modal 弹窗，6 个输入字段（公司 \*、岗位 \*、城市、月薪 \*、年终奖、股票/年、总包 \* 、职级），2×2 grid 布局。提交验证：公司/岗位/月薪/总包必填。

- [x] **页面主体**

Header：标题"薪资雷达" + 副标题"真实 offer 数据 · 匿名共享 · 已脱敏" + "提交我的 offer"按钮（蓝色）。

统计卡（count > 0 才显示）：左侧大字体中位总包（如 44.8w / 年 · 中位），右侧 P25/P50/P75/P90 四格展示。

数据表格：9 列（公司/岗位/城市/月薪/年终奖/股票/年/总包/年/职级/时间），overflow-x: auto 支持横向滚动，总包列品牌蓝色加粗。

空态：带虚线边框的居中空白区域 + "提交我的第一个 offer"CTA。

`formatSalary()` 格式化函数：>= 10000 时显示 Xw，否则 toLocaleString()。

- [x] **Commit**

```bash
git commit -m "feat: salary radar — offer data collection + stats display"
```

---

## Task 2: 求职信 (Cover Letters)

### 2a: Backend

**Files:**
- Create: `packages/api/src/cover-letters/entities/cover-letter.entity.ts`
- Create: `packages/api/src/cover-letters/cover-letters.service.ts`

- [x] **CoverLetter 实体字段**

```typescript
application_id?: string;   // 可选关联投递记录
resume_id?: string;        // 可选关联简历（用于提取候选人背景）
tone: 'professional' | 'warm' | 'direct';  // 默认 'warm'
length_words?: number;     // 目标字数
company?: string;
role?: string;
content: text;             // 生成的正文
version: number;           // 默认 1，重新生成时 +1
```

- [x] **CoverLettersService 方法**

`generate(userId, dto)`：
1. 若 `dto.resume_id` 有值，从 `ResumesService.findOne()` 获取简历原文
2. 组装 prompt：候选人简历 + JD + 目标公司 + 目标岗位 + 语气指令
3. 调用 `ai.complete()`（非结构化，直接返回正文文本）
4. 保存到 DB

`regenerate(id, userId)`：
1. 查找已有 letter
2. 用同样参数重新 `generate()`
3. 将新 letter 的 `version = existing.version + 1`

- [x] **Controller 路由**

```
GET    /cover-letters              ← 用户所有求职信列表
POST   /cover-letters              ← 生成新求职信
GET    /cover-letters/:id          ← 单条详情
POST   /cover-letters/:id/regenerate ← 重新生成同配置求职信
DELETE /cover-letters/:id          ← 删除
```

### 2b: Frontend (`packages/web/src/app/(main)/cover-letter/page.tsx`)

- [x] **双栏布局**

左栏（1fr）：配置表单 + 历史版本列表。右栏（1.4fr）：求职信预览（pre-wrap，可滚动）。整体 `overflow: hidden`，右栏 `flex: 1; min-height: 0`。

- [x] **配置表单**

目标公司/目标岗位（必填）+ 语气选择器（分段控件：专业克制/真诚热情/简短直接）+ 字数选择器（200/350/500字）+ JD 原文（可选 100px textarea）。

- [x] **语气/字数选择器 UI**

使用 surface-2 背景圆角容器 + 三等分 flex，选中项 surface 白底 + shadow，未选项透明背景 + ink-3 文字。

- [x] **操作按钮**

顶部工具栏（仅当有 currentLetter 时显示）：重新生成 + 复制全文（copy 后 2 秒切换为"已复制"文字）。生成中时右侧预览区显示半透明遮罩 + 转圈动画。

- [x] **历史版本侧边栏**

竖向列表，当前选中项显示 brand-soft 背景 + "当前"标签。每项显示版本号/语气/字数/公司/时间（相对时间，如"3分钟前"）。

- [x] **Commit**

```bash
git commit -m "feat: cover letter generator — AI generation + history versions"
```

---

## Task 3: 职业地图 (Career)

### 3a: Backend

**Files:**
- Create: `packages/api/src/career/career.service.ts`
- Create: `packages/api/src/career/career.controller.ts`

- [x] **无实体 — 纯 AI 计算**

`CareerService.analyze(userId)`:
1. 从 `ResumesService.findAllByUser()` 获取主简历文本（无简历时传空字符串）
2. 调用 `ai.completeStructured<CareerAnalysis>()` 返回：
   - `paths[]`：1-3 条职业路径（title, fit_pct 0-100, description, skills[], alumni_count）
   - `skill_audit[]`：技能盘点（name, current 0-10, needed 0-10, ok boolean）

```
GET /career/analysis  ← 每次调用都触发新的 AI 分析（无缓存）
```

### 3b: Frontend (`packages/web/src/app/(main)/career/page.tsx`)

- [x] **PathCard 组件**

卡片左上显示路径标题，右上显示 fit_pct 徽章（>= 80% 蓝色/否则橙色）。中间 description 文字（ink-3）。下方技能标签（surface-2 背景小圆角）。底部：校友参考人数（mono 字体）。最高匹配度的第一条路径显示蓝色边框区分。

- [x] **技能盘点区块**

双列 grid，每个技能项：名称 + `current/needed` 数字（颜色：ok 绿/bigGap 红/否则品牌蓝）+ 双层进度条（底层 surface-2 轨道 + 顶层 current 宽度 + needed 位置竖线标记）。底部汇总：列出所有未达标技能名称的提示文字。

- [x] **Loading 状态**

56px 蓝色圆角图标框 + 转圈 Loader2 + 说明文字"AI 正在分析你的简历…大约需要 5-10 秒"。

- [x] **无简历空态**

检测 error 包含"404"/"no resume"/"简历"关键字时显示"请先上传你的简历"引导页，带"前往简历馆"链接按钮。

- [x] **Commit**

```bash
git commit -m "feat: career page — AI career paths + skill audit"
```

---

## Task 4: 动态广场 (Feed)

### 4a: Backend

**Files:**
- Create: `packages/api/src/feed/entities/feed-item.entity.ts`
- Create: `packages/api/src/feed/feed.service.ts`

- [x] **FeedItem 实体字段**

```typescript
user_id: string;       // 发布者（关联 User）
title: string;
content: text;
company?: string;
role?: string;
outcome?: string;      // 面试结果：'pass' | 'fail' | 'pending' 等
```

- [x] **FeedService 方法**

- `create(userId, dto)` — 发布一条 feed 项
- `findAll()` — 查询全量 feed（加载发布者 user 关联，按 created_at DESC），供所有登录用户读取
- `remove(id, userId)` — 仅删除自己发布的内容

- [x] **Controller 路由**

```
GET    /feed          ← 全量 feed 列表（所有用户可见）
POST   /feed          ← 发布新内容
DELETE /feed/:id      ← 删除（仅限自己的）
```

- [x] **Commit**

```bash
git commit -m "feat: feed module — community feed CRUD"
```

---

## Self-Review Checklist

- [x] **薪资雷达：** `getStats()` 使用原生 QueryBuilder 聚合，`/stats` 路由在 `/:id` 之前注册
- [x] **求职信：** `regenerate()` 复用 `generate()` 逻辑但增量 version，AI 调用使用 `ai.complete()`（非结构化，直接返回正文）
- [x] **职业地图：** 无实体，纯 AI 调用，每次访问重新分析（适合小规模场景），无简历时 prompt 仍可运行
- [x] **Feed：** `findAll()` 加载 user relation，但控制器返回时应避免暴露用户敏感信息（entity 仅含 name/avatar）
- [x] **前端路由：** cover-letter 页面路由为 `/cover-letter`（连字符），与侧边栏导航配置一致
