# Phase 7: 求职总览 Implementation Plan

> **Retroactive documentation.** This plan was written after implementation to document what was actually built.

**Goal:** 构建求职数据总览仪表盘 — 单个 API 端点并行聚合五个数据源（投递漏斗、面试表现、简历状态、AI 使用记录），前端以两行双列 section 卡片布局展示，含求职漏斗横条图和面试评级统计。

**Architecture:** 后端新增 `overview` 模块，`OverviewService` 用 `Promise.all` 并行拉取五个已有 service 的数据后组装为 `DashboardData` DTO 返回。前端单页 `/overview`，使用两个独立展示组件：`FunnelChart`（求职漏斗横条图）和 `StatCard`（数字统计卡）。

**Tech Stack:** NestJS + TypeORM | Next.js 15 + inline styles + lucide-react | 无新 AI 调用（纯数据聚合）

---

## File Structure

### Backend (`packages/api/src/overview/`)

```
packages/api/src/overview/
├── overview.module.ts
├── overview.controller.ts
└── overview.service.ts       ← DashboardData 接口 + 数据聚合逻辑
```

### Frontend (`packages/web/src/`)

```
packages/web/src/
├── app/(main)/overview/
│   └── page.tsx              ← 主页面（含 SectionCard 内联组件）
└── components/overview/
    ├── funnel-chart.tsx      ← 求职漏斗横条图
    └── stat-card.tsx         ← 数字统计展示卡
```

---

## Task 1: Backend — OverviewService (数据聚合)

**Files:**
- Create: `packages/api/src/overview/overview.service.ts`
- Create: `packages/api/src/overview/overview.controller.ts`
- Create: `packages/api/src/overview/overview.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [x] **Step 1: 定义 `DashboardData` 接口**

```typescript
export interface DashboardData {
  funnel: {
    wishlist: number; applied: number; interview: number;
    final: number; offer: number; rejected: number;
  };
  interviews: {
    total: number;
    avgGrade: string | null;                    // 字母等级平均值
    recentGrades: Array<{ company: string; grade: string; date: string }>;
  };
  resumes: {
    total: number;
    primaryTitle: string | null;
    latestDiagnosisScore: number | null;
  };
  activity: {
    totalDiagnoses: number;
    totalConversations: number;
  };
}
```

- [x] **Step 2: 字母等级平均计算**

定义 `GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D']`，转换为数值 → 取平均 → 转回字母等级。只对有有效等级的面试记录计算。

- [x] **Step 3: `getDashboard()` — 并行聚合**

```typescript
const [funnel, allInterviews, allResumes, allDiagnoses, allConversations] =
  await Promise.all([
    this.applications.getStats(userId),
    this.interviews.findAllByUser(userId),
    this.resumes.findAllByUser(userId),
    this.diagnoses.findAllByUser(userId),
    this.conversations.findAllByUser(userId),
  ]);
```

计算逻辑：
- `recentGrades`：取前 5 条有 `overall_grade` 的面试记录，company 取面试记录的 company 字段或关联 application 的 company
- `primaryTitle`：找 `is_primary = true` 的简历，无则取第一条
- `latestDiagnosisScore`：诊断列表已按 created_at DESC 排序，取 `[0].score`

- [x] **Step 4: Controller**

单个 GET 路由：`GET /overview` → `getDashboard(userId)`。无分页，无查询参数。

- [x] **Step 5: Commit**

```bash
git add packages/api/src/overview/
git commit -m "feat: overview module — parallel data aggregation for dashboard"
```

---

## Task 2: Frontend — 展示组件

**Files:**
- Create: `packages/web/src/components/overview/funnel-chart.tsx`
- Create: `packages/web/src/components/overview/stat-card.tsx`

- [x] **Step 1: `FunnelChart` 组件**

按固定顺序展示 5 个漏斗阶段（wishlist/applied/interview/final/offer）。每行三栏：阶段标签（80px）+ 横条（flex-grow，颜色各异：紫/蓝/橙/深橙/绿）+ 数量（mono 字体，右对齐）。横条宽度 = `count / maxCount * 100%`，最大计数值作为参考，并设 `minWidth: count > 0 ? '26px' : '0'` 保证非零值可见。

阶段颜色：
- wishlist: `#6366f1`
- applied: `#0ea5e9`
- interview: `#f59e0b`
- final: `#f97316`
- offer: `#10b981`

- [x] **Step 2: `StatCard` 组件**

小型统计卡：icon 徽章（11px，surface-3 背景）+ 大数字（24px mono 加粗）+ 标签文字（11px uppercase）。Props: `{ label: string; value: string | number; icon: React.ReactNode }`。

- [x] **Step 3: Commit**

```bash
git add packages/web/src/components/overview/
git commit -m "feat: overview components — FunnelChart + StatCard"
```

---

## Task 3: Frontend — Overview 页面

**Files:**
- Create: `packages/web/src/app/(main)/overview/page.tsx`

- [x] **Step 1: 内联 `SectionCard` 组件**

白色卡片（surface 背景 + line 边框 + 22px 圆角 + 22×26px 内边距），顶部标题行 + 可选"查看更多"链接（ArrowRight 图标）。

- [x] **Step 2: Loading 骨架**

两行两列 grid，每格显示固定高度（180px / 140px）的 surface 色占位块，无动画（仅 opacity 0.6）。

- [x] **Step 3: Empty state**

当所有数据均为 0 时，显示居中的 TrendingUp 图标 + 说明文字 + 两个 CTA 链接按钮（"上传简历" → `/resumes`，"开始投递" → `/applications`）。

- [x] **Step 4: 数据展示布局**

**行 1（两列）：**
- 左：`SectionCard` "求职漏斗"，action 链接到 `/applications`，内嵌 `FunnelChart`
- 右：`SectionCard` "面试表现"，action 链接到 `/debrief`，内嵌 2 个 `StatCard`（总场次 + 平均评级）+ 最近面试列表（最多 4 条，surface-2 行内显示公司/日期/等级）

**行 2（两列）：**
- 左：`SectionCard` "简历状态"，action 链接到 `/resumes`，内嵌 2 个 `StatCard`（简历数量 + 最新诊断分）+ 主简历标题行
- 右：`SectionCard` "使用记录"，内嵌 2 个 `StatCard`（诊断次数 + 对话次数）

- [x] **Step 5: 面试评级颜色函数**

```typescript
function gradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'S') return '#10b981';
  if (grade.startsWith('A')) return '#22c55e';
  if (grade.startsWith('B')) return '#f59e0b';
  if (grade.startsWith('C')) return '#f97316';
  return '#ef4444';
}
```

- [x] **Step 6: Commit**

```bash
git commit -m "feat: overview page — dashboard with funnel, interview stats, resume status, activity"
```

---

## Self-Review Checklist

- [x] **并行聚合：** `Promise.all` 同时拉取 5 个数据源，总延迟取最慢的一个而非累加
- [x] **无 AI 依赖：** Overview 完全是数据聚合，不调用 LLM，响应快速
- [x] **依赖模块：** `OverviewModule` 需 import `ApplicationsModule`、`InterviewsModule`、`ResumesModule`、`DiagnosesModule`、`ConversationsModule` 并使用其 exported services
- [x] **空数据处理：** isEmpty 判断覆盖 funnel 全零 + interviews/resumes/activity 全零，显示引导空态
- [x] **类型同步：** `DashboardData` 接口在后端 `overview.service.ts` 和前端 `lib/types.ts` 中保持一致
