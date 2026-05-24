# Phase 6: 今日任务 Implementation Plan

> **Retroactive documentation.** This plan was written after implementation to document what was actually built.

**Goal:** 构建 AI 驱动的每日任务系统 — 每天自动生成 5 个个性化求职任务（覆盖投递/练习/复盘/学习/简历），用户可一键标记完成，支持强制重新生成。任务内容基于用户当前的简历状态、投递情况、面试记录动态定制。

**Architecture:** 后端新增 `tasks` 模块，包含 `DailyTask` 实体（按用户 + 日期索引）、`TasksService`（CRUD）、`TaskGeneratorService`（上下文收集 + AI 调用）。前端单页 `/today`，展示日期 hero 卡（含进度环）+ 任务列表（乐观更新勾选状态）。

**Tech Stack:** NestJS + TypeORM | Next.js 15 + inline styles | CloudDreamAI auto-v2（任务生成）

---

## File Structure

### Backend (`packages/api/src/tasks/`)

```
packages/api/src/tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── task-generator.service.ts    ← 上下文收集 + AI 生成
├── entities/
│   └── daily-task.entity.ts     ← DailyTask 实体（task_date 按 YYYY-MM-DD 存储）
└── dto/
    └── update-task.dto.ts       ← 仅 status 字段
```

### Frontend (`packages/web/src/app/(main)/today/`)

```
packages/web/src/app/(main)/today/
└── page.tsx                     ← 完整页面（内联所有子组件）
```

---

## Task 1: Backend — DailyTask 实体

**Files:**
- Create: `packages/api/src/tasks/entities/daily-task.entity.ts`

- [x] **Step 1: 定义类型别名**

```typescript
export type TaskType = 'practice' | 'apply' | 'review' | 'learn' | 'resume';
export type TaskStatus = 'todo' | 'done';
export type LinkedType = 'diagnosis' | 'interview' | 'application';
```

- [x] **Step 2: 创建实体**

字段包含：`task_date: string`（YYYY-MM-DD，非 Date 类型，便于日期过滤）、`title: string`（20 字以内）、`duration_min: number | null`（预计分钟数）、`task_type: string`（TaskType）、`reason: string | null`（为什么今天做）、`status: string`（默认 'todo'）、`linked_type: string | null`、`linked_id: string | null`（关联到特定诊断/面试/投递记录，可选）。

- [x] **Step 3: Commit**

```bash
git add packages/api/src/tasks/entities/
git commit -m "feat: DailyTask entity"
```

---

## Task 2: Backend — TaskGeneratorService (上下文 + AI)

**Files:**
- Create: `packages/api/src/tasks/task-generator.service.ts`

- [x] **Step 1: `gatherContext()` — 收集三维上下文**

并行收集三类信息：
- **简历状态**：`resumes.findAllByUser()`，输出主简历名 + 总数（无简历时提示"尚未上传"）
- **投递状态**：`applications.getStats()`，输出各状态数量（applied/interview/final/offer/rejected）
- **面试记录**：`interviews.findAllByUser()`，找出未来 7 天内的即将面试 + 最近 3 场记录描述

每个维度独立 try/catch，失败时输出"无法获取"继续生成。

- [x] **Step 2: `generateDailyTasks()` — AI 生成 + 幂等写入**

```typescript
// 幂等检查：今天已有任务则直接返回
const existing = await this.repo.find({ where: { user_id, task_date: today } });
if (existing.length > 0) return existing;

// AI 调用，要求生成恰好 5 个任务
const result = await this.ai.completeStructured<{ tasks: AiTaskItem[] }>({
  system: '...职业规划教练 system prompt...',
  prompt: `用户的求职状态如下：\n${context}\n\n请生成5个适合今天完成的具体任务...`,
  toolName: 'generate_daily_tasks',
  schema: { /* tasks 数组，minItems: 5, maxItems: 5 */ },
});

// 批量保存到 DB
return this.repo.save(tasks.slice(0, 5).map((item) => this.repo.create({...})));
```

- [x] **Step 3: Commit**

```bash
git add packages/api/src/tasks/task-generator.service.ts
git commit -m "feat: task generator — context gathering + AI generation"
```

---

## Task 3: Backend — TasksService + Controller

**Files:**
- Create: `packages/api/src/tasks/tasks.service.ts`
- Create: `packages/api/src/tasks/tasks.controller.ts`
- Create: `packages/api/src/tasks/tasks.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [x] **Step 1: TasksService 方法**

- `getToday(userId)` — 委托给 `generator.generateDailyTasks()`（幂等）
- `getByDate(userId, date)` — 按日期查询历史任务
- `forceGenerate(userId)` — 删除今日已有任务后重新生成
- `update(id, userId, dto)` — 更新单条任务（主要用于 status 切换）

- [x] **Step 2: Controller 路由**

```
GET  /tasks/today           ← 获取今日任务（自动生成）
GET  /tasks?date=YYYY-MM-DD ← 按日期查询（无 date 参数默认今天）
POST /tasks/generate        ← 强制重新生成今日任务
PATCH /tasks/:id            ← 更新任务（标记完成/未完成）
```

注意：`/today` 和 `/generate` 路由需定义在 `/:id` PATCH 之前。

- [x] **Step 3: `UpdateTaskDto`**

仅包含 `status?: TaskStatus`（可选，IsIn(['todo', 'done'])）。

- [x] **Step 4: Commit**

```bash
git add packages/api/src/tasks/
git commit -m "feat: tasks module — daily task CRUD + force regenerate"
```

---

## Task 4: Frontend — 今日页面

**Files:**
- Create: `packages/web/src/app/(main)/today/page.tsx`

- [x] **Step 1: 类型元数据 `TASK_TYPE_META`**

为 5 种任务类型（practice/apply/review/learn/resume）定义标签文本、文字颜色、背景颜色、图标（来自 lucide-react）。

- [x] **Step 2: `TaskCard` 组件（内联）**

三栏 grid layout（checkbox | 主体 | 时长）。checkbox 按钮：done 时显示 CheckCircle2（绿色），todo 时显示 Circle（灰色）。主体：标题（done 时带删除线）+ TypeBadge + reason 文字。右侧：mono 字体时长（若有）。disabled + opacity 处理 toggling 状态。

- [x] **Step 3: `ProgressRing` 组件（内联）**

100×100px SVG 环，底层灰色轨道 + 顶层蓝色（#0a84ff）进度弧，中心显示 `done/total` + "已完成"文字。用于 hero 卡内嵌。

- [x] **Step 4: Hero 卡片**

深色背景（`var(--color-ink)`）+ 蓝色辐射渐变（右上角 radial-gradient）。左侧：日期文本（格式：2026年5月24日 星期日）+ 大标题"今天" + 进度文字（已完成 x/y 项 · 剩余 n 分钟）。右侧：`ProgressRing`。

- [x] **Step 5: 工具栏**

左侧：任务数量 + 预计总时长。右侧："重新生成"按钮（RefreshCw/Loader2 图标，loading 时禁用）。

- [x] **Step 6: 乐观更新勾选**

```typescript
const handleToggle = async (id: string, current: 'todo' | 'done') => {
  const nextStatus = current === 'done' ? 'todo' : 'done';
  setTogglingId(id);
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
  try {
    await api.patch<DailyTask>(`/tasks/${id}`, { status: nextStatus });
  } catch {
    // Revert on failure
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: current } : t)));
  } finally { setTogglingId(null); }
};
```

- [x] **Step 7: 庆祝提示**

全部完成时显示绿色横幅："全部完成！今天做得很好。去过别的生活吧。"

- [x] **Step 8: Commit**

```bash
git commit -m "feat: today page — AI daily tasks, progress ring, optimistic toggle"
```

---

## Self-Review Checklist

- [x] **幂等性：** 同一天多次调用 `getToday()` 只生成一次任务，`forceGenerate()` 才会删除后重建
- [x] **容错：** 上下文收集三个维度各自 try/catch，AI 调用失败时不崩溃，返回空数组
- [x] **乐观 UI：** 勾选任务立即更新 UI，网络失败时回滚
- [x] **依赖注入：** `TaskGeneratorService` 依赖 `ResumesService`、`ApplicationsService`、`InterviewsService`，这些模块需要在 `TasksModule` 的 imports 中引入
- [x] **类型一致：** `DailyTask` 类型在后端 entity 和前端 `lib/types.ts` 中字段一致（task_date, title, duration_min, task_type, reason, status）
