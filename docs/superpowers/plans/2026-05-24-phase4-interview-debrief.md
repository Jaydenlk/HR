# Phase 4: 面试复盘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建面试复盘系统 — 用户录入面试记录（文字/录音），AI 逐题分析 + 6 维度评分 + 下一轮预测。

**Architecture:** 后端新增 interviews 模块（Interview 实体 + AI 分析链路：提取问题 → 逐题评估 → 维度评分 → 预测）。前端新增面试列表 + 详情页（评分、逐题卡、预测卡）。

**Tech Stack:** NestJS + TypeORM | Next.js + Tailwind + shadcn/ui | CloudDreamAI auto-v2

**Design Reference:** `Claude design/s-interview.jsx` + `Claude design/shared.jsx` (COACH_REVIEW)

---

## File Structure

### Backend
```
packages/api/src/interviews/
├── interviews.module.ts
├── interviews.controller.ts
├── interviews.service.ts
├── debrief.service.ts          ← AI 复盘分析引擎
├── entities/interview.entity.ts
└── dto/
    ├── create-interview.dto.ts
    └── update-interview.dto.ts
```

### Frontend
```
packages/web/src/
├── app/(main)/debrief/
│   ├── page.tsx                ← 面试列表
│   └── [id]/
│       ├── page.tsx
│       └── debrief-detail.tsx  ← 面试详情
├── components/interview/
│   ├── interview-card.tsx      ← 列表卡片
│   ├── interview-form.tsx      ← 录入表单
│   ├── score-radar.tsx         ← 6 维度评分
│   ├── question-card.tsx       ← 逐题分析卡
│   └── prediction-card.tsx     ← 下一轮预测
```

---

## Task 1: Backend — Interview Entity

**Files:**
- Create: `packages/api/src/interviews/entities/interview.entity.ts`
- Modify: `packages/web/src/lib/types.ts`

- [ ] **Step 1: Create Interview entity**

```typescript
// packages/api/src/interviews/entities/interview.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Application } from '../../applications/entities/application.entity';

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  application_id: string;

  @ManyToOne(() => Application, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column()
  round: string; // "一面·技术", "二面·技术+主管", "HR面"

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  role: string;

  @Column({ nullable: true })
  interview_at: string;

  @Column({ nullable: true })
  duration_min: number;

  @Column({ nullable: true })
  interviewer: string;

  @Column({ nullable: true })
  audio_url: string;

  @Column('text', { nullable: true })
  transcript: string;

  @Column({ nullable: true })
  overall_grade: string; // A/A+/B+/B/B-/C+/C/D

  @Column('simple-json', { nullable: true })
  scores: Array<{ name: string; score: number; color: string }>;

  @Column('simple-json', { nullable: true })
  questions: Array<{
    n: number; time: string; type: string; topic: string;
    diff: string; tone: string; q: string; you: string;
    ai: string; better: string | null;
    gap: { topic: string; url: string } | null;
  }>;

  @Column('simple-json', { nullable: true })
  prediction: {
    nextRound: string; nextWhen: string;
    likely: Array<{ topic: string; pct: number }>;
  } | null;

  @Column({ nullable: true })
  overall_note: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 2: Add frontend types**

Append to `packages/web/src/lib/types.ts`:
```typescript
export interface InterviewScore {
  name: string; score: number; color: string;
}

export interface InterviewQuestion {
  n: number; time: string; type: string; topic: string;
  diff: string; tone: 'good' | 'warn' | 'bad'; q: string; you: string;
  ai: string; better: string | null;
  gap: { topic: string; url: string } | null;
}

export interface InterviewPrediction {
  nextRound: string; nextWhen: string;
  likely: Array<{ topic: string; pct: number }>;
}

export interface Interview {
  id: string;
  application_id: string | null;
  company: string | null;
  role: string | null;
  round: string;
  interview_at: string | null;
  duration_min: number | null;
  interviewer: string | null;
  audio_url: string | null;
  transcript: string | null;
  overall_grade: string | null;
  overall_note: string | null;
  scores: InterviewScore[] | null;
  questions: InterviewQuestion[] | null;
  prediction: InterviewPrediction | null;
  created_at: string;
}
```

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: Interview entity + frontend types"
```

---

## Task 2: Backend — Interviews Module + AI Debrief Service

**Files:**
- Create: DTOs, service, debrief.service, controller, module
- Modify: `app.module.ts`

- [ ] **Step 1: Create DTOs**

CreateInterviewDto: round (required), company?, role?, interview_at?, duration_min?, interviewer?, transcript?, application_id?

UpdateInterviewDto: all fields optional

- [ ] **Step 2: Create DebriefService — AI analysis engine**

```typescript
// packages/api/src/interviews/debrief.service.ts
```

Inject `AiService`. Single method:

`analyze(transcript: string, company: string, role: string, round: string): Promise<{ overall_grade, overall_note, scores, questions, prediction }>`

This makes ONE CloudDreamAI call with a comprehensive system prompt that:
1. Extracts questions from transcript
2. Evaluates each question (tone, assessment, better answer, gap)
3. Scores 6 dimensions (技术深度, 清晰表达, 结构化思考, 行为面试STAR, 反问环节, 气场自信)
4. Generates overall grade + note
5. Predicts next round topics with likelihood %

Uses `completeStructured<T>()` with a tool schema matching the output structure.

System prompt should instruct the AI to act as a senior interviewer reviewing the transcript.

- [ ] **Step 3: Create InterviewsService**

Methods:
- `create(userId, dto)` → save Interview; if transcript provided, trigger debrief analysis
- `findAllByUser(userId)` → list ordered by created_at DESC
- `findOne(id, userId)` → full detail
- `update(id, userId, dto)` → update; if transcript newly provided and no scores yet, trigger analysis
- `analyze(id, userId)` → manually trigger AI analysis
- `remove(id, userId)`

- [ ] **Step 4: Create controller**

Routes (JWT guarded):
- POST /interviews
- GET /interviews
- GET /interviews/:id
- PATCH /interviews/:id
- POST /interviews/:id/analyze (trigger AI analysis)
- DELETE /interviews/:id

- [ ] **Step 5: Create module, register in AppModule**

- [ ] **Step 6: Verify and commit**
```bash
cd packages/api && npx tsc --noEmit
git commit -m "feat: interviews module — CRUD + AI debrief analysis"
```

---

## Task 3: Frontend — Interview List + Detail Pages

**Files:**
- Create: `packages/web/src/app/(main)/debrief/page.tsx`
- Create: `packages/web/src/app/(main)/debrief/[id]/page.tsx`
- Create: `packages/web/src/app/(main)/debrief/[id]/debrief-detail.tsx`
- Create: 5 components in `packages/web/src/components/interview/`

**NO MOCK DATA.**

- [ ] **Step 1: Create interview-card.tsx**

List card. Props: `{ interview: Interview }`. Shows: grade badge (colored), company + role, round, date, duration. Badges for transcript availability, insight count. Click → `/debrief/${id}`.

Grade colors: A=success, B=ink, C=warn, D=danger.

- [ ] **Step 2: Create interview-form.tsx**

Dialog form for creating new interviews. Fields: company, role, round (dropdown: 一面·技术/二面/HR面/终面), interview_at (datetime), duration_min, interviewer, transcript (textarea). Application select (optional, from API).

- [ ] **Step 3: Create score-radar.tsx**

6 dimension score bars. Props: `{ scores: InterviewScore[] }`. Horizontal bars with label + score/100 + colored fill. Same pattern as diagnosis dimension bars but with 6 items.

- [ ] **Step 4: Create question-card.tsx**

Per-question analysis card. Props: `{ question: InterviewQuestion, index: number }`.
Shows: numbered badge, type+topic+difficulty tags, question text, you/coach side-by-side cells, better answer (green bg), gap identification link. Tone-based card background (good=white, warn=yellow tint, bad=red tint).

Reference: `s-interview.jsx` `.q` class structure.

- [ ] **Step 5: Create prediction-card.tsx**

Dark card with next round prediction. Props: `{ prediction: InterviewPrediction }`.
Badge "🔮 预测·下一轮", title, timeline, likely topics with % bars. CTA buttons.

- [ ] **Step 6: Create debrief-detail.tsx**

Client component. Fetches `api.get<Interview>('/interviews/${id}')`.
2-column layout on desktop (1.6fr + 1fr):
- Left: header (company/role/round/grade), AI note, score bars, question cards
- Right: prediction card, trend card (optional)

Loading state, error state, empty analysis state ("提交面试记录后，AI 将自动生成复盘分析").

- [ ] **Step 7: Create list page**

`/debrief` page. Fetches interviews list. Header with "录入新面试" button (opens form). Grid of interview-card. Empty state. Stats tiles at top (total interviews, avg grade, improvement areas).

- [ ] **Step 8: Commit**
```bash
git commit -m "feat: interview debrief — list + detail + AI analysis UI"
```

---

## Self-Review

- [x] **Spec coverage:** Interview entity (Task 1), AI analysis (Task 2), List UI (Task 3), Detail UI (Task 3), Per-question cards (Task 3), Prediction (Task 3)
- [x] **Type consistency:** InterviewScore/Question/Prediction types match between entity JSON columns and frontend interfaces
- [x] **API routes:** Controller `/interviews/*` matches frontend api calls
- [x] **Scope note:** Audio recording/transcription via Whisper API is NOT in scope — users input transcript as text. Audio upload stores file URL but transcription is manual for now.
