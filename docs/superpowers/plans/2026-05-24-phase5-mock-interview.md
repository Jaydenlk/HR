# Phase 5: 模拟面试 Implementation Plan

> **Retroactive documentation.** This plan was written after implementation to document what was actually built.

**Goal:** 构建 AI 模拟面试系统 — 用户输入公司/岗位/JD，AI 生成定制面试题，逐题作答后实时评分打反馈，全部回答完毕后生成综合评估报告，含口头禅检测。

**Architecture:** 后端新增 `mock` 模块（`MockSession` 实体，`MockService` 封装问题生成/答题评分/综合报告三个 AI 调用）。前端新增模拟面试列表页 + 详情页，详情页分两个阶段（作答中 → 已完成），由 `mock-stage.tsx` 和 `mock-result.tsx` 两个组件承接。

**Tech Stack:** NestJS + TypeORM + SQLite(dev)/PostgreSQL(prod) | Next.js 15 + Tailwind CSS + inline styles | CloudDreamAI auto-v2（所有 AI 调用）

---

## File Structure

### Backend (`packages/api/src/mock/`)

```
packages/api/src/mock/
├── mock.module.ts
├── mock.controller.ts
├── mock.service.ts
├── entities/
│   └── mock-session.entity.ts      ← Question / Answer / Evaluation 接口 + MockSession 实体
└── dto/
    ├── create-mock-session.dto.ts
    └── submit-answer.dto.ts
```

### Frontend (`packages/web/src/`)

```
packages/web/src/
├── app/(main)/mock/
│   ├── page.tsx                    ← 面试列表 + 新建对话框
│   └── [id]/
│       ├── page.tsx                ← 数据加载层（useEffect + polling）
│       └── mock-detail.tsx         ← 核心交互组件（stage 切换）
└── components/mock/
    ├── mock-session-card.tsx       ← 列表项卡片（含状态徽章 + 得分预览）
    ├── mock-stage.tsx              ← 作答阶段 UI（题目卡 + 作答区 + 实时反馈）
    └── mock-result.tsx             ← 结果阶段 UI（得分环 + 优劣势 + 逐题回顾）
```

---

## Task 1: Backend — MockSession 实体 + DTO

**Files:**
- Create: `packages/api/src/mock/entities/mock-session.entity.ts`
- Create: `packages/api/src/mock/dto/create-mock-session.dto.ts`
- Create: `packages/api/src/mock/dto/submit-answer.dto.ts`

- [x] **Step 1: 定义三个嵌套接口**

```typescript
export interface Question {
  n: number;          // 题号（从 1 开始）
  type: string;       // '技术' | '行为' | '项目' | '反问'
  topic: string;      // 考察主题
  difficulty: string; // '简单' | '中等' | '困难'
  question: string;
  hint: string;
}

export interface Answer {
  n: number;
  answer: string;
  score: number;       // 0-10
  feedback: string;
  filler_count: number; // 口头禅次数
}

export interface Evaluation {
  overall_score: number;  // 0-100
  overall_grade: string;  // 'A+' | 'A' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D'
  strengths: string[];
  weaknesses: string[];
  summary: string;
}
```

- [x] **Step 2: 创建 MockSession 实体**

使用 `simple-json` 列类型存储 `questions`、`answers`、`evaluation`（兼容 SQLite + PostgreSQL）。`status` 字段：`'in_progress'` | `'completed'`，`mode` 字段：`'text'` | `'voice'`（语音模式预留）。

- [x] **Step 3: 创建 DTOs**

`CreateMockSessionDto`：`company?`、`role?`、`jd_text?`、`mode?`（`'text' | 'voice'`）、`question_count?`（1-20，默认 5）均可选。`SubmitAnswerDto`：仅 `answer: string`（MinLength 1）。

- [x] **Step 4: Commit**

```bash
git add packages/api/src/mock/entities/ packages/api/src/mock/dto/
git commit -m "feat: MockSession entity + DTOs"
```

---

## Task 2: Backend — MockService (三个 AI 调用)

**Files:**
- Create: `packages/api/src/mock/mock.service.ts`
- Create: `packages/api/src/mock/mock.controller.ts`
- Create: `packages/api/src/mock/mock.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [x] **Step 1: `generateQuestions()` — 调用 CloudDreamAI 结构化输出**

System prompt 要求生成包含 `技术/行为/项目/反问` 四种类型、难度合理分布、附带答题提示的面试题列表。使用 `generate_questions` tool，schema 包含完整的题目结构（n, type, topic, difficulty, question, hint）。

- [x] **Step 2: `evaluateAnswer()` — 实时评分**

System prompt 定义四个评分维度（完整性/深度/结构性/表达清晰度），输出 0-100 分 + 建设性反馈（150 字内）。同时统计回答文本中口头禅（呃/嗯/那个/就是）次数。

- [x] **Step 3: `generateEvaluation()` — 综合报告**

将所有 Q&A 记录拼接为 context，生成字母等级（A+ 到 D）、3-5 条优势、3-5 条改进方向、200 字综合评语。

- [x] **Step 4: CRUD 方法**

`create()`：先保存 session，再异步生成题目（失败不阻塞）。`submitAnswer()`：检查 status 不为 completed，找到当前题（按 answers.length + 1），调用评分，append 到 answers 列表，保存。`complete()`：汇总 filler count，调用 `generateEvaluation()`，更新 status。

- [x] **Step 5: Controller 路由**

```
POST   /mock-sessions          ← 创建 session（触发问题生成）
GET    /mock-sessions          ← 列表
GET    /mock-sessions/:id      ← 详情
POST   /mock-sessions/:id/answer   ← 提交单题回答
POST   /mock-sessions/:id/complete ← 结束面试，触发综合报告
DELETE /mock-sessions/:id      ← 删除
```

注意：`/answer` 和 `/complete` 路由需定义在 `/:id` DELETE 之前，避免 NestJS 路由优先级冲突。

- [x] **Step 6: Commit**

```bash
git add packages/api/src/mock/
git commit -m "feat: mock interview module — AI question generation + per-answer scoring + final evaluation"
```

---

## Task 3: Frontend — 列表页 + 卡片组件

**Files:**
- Create: `packages/web/src/app/(main)/mock/page.tsx`
- Create: `packages/web/src/components/mock/mock-session-card.tsx`

- [x] **Step 1: `MockSessionCard` 组件**

左侧显示 52×52px 的得分方块（已完成显示 `score` 数字 + `grade`，未完成显示 Play 图标）。右侧显示公司/岗位、状态徽章（已完成/进行中/待开始）、日期、答题进度（`answers.length / questions.length 题`）。hover 时 boxShadow + borderColor 过渡。

- [x] **Step 2: 列表页**

页面顶部：标题"模拟面试" + 副标题 + "开始新模拟"按钮。内容区：loading skeleton（3 行脉冲动画）、error 状态、empty state（大图标 + 文案 + CTA）、session 列表（竖向卡片流）。

- [x] **Step 3: 新建 Dialog**

Modal overlay（点击遮罩关闭）内含"开始新模拟"表单：公司（选填）、岗位（选填）、JD 文本（选填，5 行 textarea）。提交时 POST `/mock-sessions`，成功后 navigate 到 `/mock/${session.id}`。

- [x] **Step 4: Commit**

```bash
git commit -m "feat: mock session list page + session card + new session dialog"
```

---

## Task 4: Frontend — 详情页（作答 + 结果）

**Files:**
- Create: `packages/web/src/app/(main)/mock/[id]/page.tsx`
- Create: `packages/web/src/app/(main)/mock/[id]/mock-detail.tsx`
- Create: `packages/web/src/components/mock/mock-stage.tsx`
- Create: `packages/web/src/components/mock/mock-result.tsx`

- [x] **Step 1: `MockStage` 组件**

顶部进度条（当前题 / 总题数 + 百分比）。上一题即时反馈区（分数色标：7+ 绿色、4-6 橙色、<4 红色）。题目卡片：类型/主题/难度徽章 + 题目正文 + 折叠式提示（ChevronRight/Down 切换）。作答区：6 行 textarea + `⌘Enter` 快捷提交 + "结束面试"按钮（灰色次要）+ "提交回答"主按钮（蓝色）。所有题目答完后显示"生成报告"状态页。

- [x] **Step 2: `MockResult` 组件**

顶部得分汇总：`ScoreRing`（120px SVG 环，颜色 70+ 绿/50+ 橙/<50 红）+ 字母等级（44px 粗体，等级决定颜色）+ 口头禅次数徽章 + 综合评语。中部两栏卡片：优势亮点（绿色 CheckCircle 图标列表）+ 待提升（红色 XCircle 图标列表）。底部逐题回顾：每题显示类型/主题徽章 + 题目正文 + 44×44px 得分方块 + 用户原始回答 + AI 点评（蓝色左边框） + 口头禅次数（如有）。

- [x] **Step 3: `mock-detail.tsx`**

根据 `session.status` 决定渲染 `MockStage` 还是 `MockResult`。包含 `onAnswer()`（POST `/mock-sessions/:id/answer`）、`onComplete()`（POST `/mock-sessions/:id/complete`）回调，提交完成后刷新 session 数据。

- [x] **Step 4: `page.tsx`（数据加载层）**

`'use client'` 页面。`useEffect` 加载 session，传递给 `MockDetail`。添加 `generateStaticParams() { return []; }` + `dynamicParams = true` 支持静态导出。

- [x] **Step 5: Commit**

```bash
git commit -m "feat: mock interview detail — stage (Q&A) + result (report) views"
```

---

## Self-Review Checklist

- [x] **AI 调用链：** 创建时生成问题，每次提交时评分，完成时生成综合报告 — 三个独立的 `completeStructured` 调用，失败均为 non-fatal（try/catch 不阻塞主流程）
- [x] **状态机：** `in_progress` → `submitAnswer` (n次) → `complete` → `completed`，已 completed 的 session 拒绝继续提交（BadRequestException）
- [x] **类型一致性：** `MockSession`, `MockQuestion`, `MockAnswer` 类型在后端 entity 接口和前端 `lib/types.ts` 中定义一致
- [x] **路由一致性：** 控制器路由顺序正确（`/:id/answer` 在 `/:id` DELETE 之前），前端 API 调用路径匹配
- [x] **空状态覆盖：** 列表空态 + 加载态 + 错误态均实现
