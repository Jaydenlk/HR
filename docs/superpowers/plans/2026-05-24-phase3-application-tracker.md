# Phase 3: 投递追踪 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建看板式投递追踪系统 — 五列看板（想投→已投→面试中→终面→Offer）+ 状态流转 + 事件审计 + 统计面板。

**Architecture:** 后端新增 applications 模块（Application + ApplicationEvent 实体），前端新增看板页面（拖拽改变状态、卡片 CRUD、统计概览）。

**Tech Stack:** NestJS + TypeORM + SQLite(dev) | Next.js + Tailwind + shadcn/ui

**Design Reference:** `Claude design/s-tools.jsx` lines 726-834 — 看板 UI

---

## File Structure

### Backend

```
packages/api/src/applications/
├── applications.module.ts
├── applications.controller.ts
├── applications.service.ts
├── entities/
│   ├── application.entity.ts
│   └── application-event.entity.ts
└── dto/
    ├── create-application.dto.ts
    └── update-application.dto.ts
```

### Frontend

```
packages/web/src/
├── app/(main)/applications/page.tsx
├── components/tracker/
│   ├── kanban-board.tsx
│   ├── kanban-column.tsx
│   ├── application-card.tsx
│   ├── application-form.tsx
│   └── tracker-stats.tsx
```

---

## Task 1: Backend — Application + ApplicationEvent Entities

**Files:**
- Create: `packages/api/src/applications/entities/application.entity.ts`
- Create: `packages/api/src/applications/entities/application-event.entity.ts`

- [ ] **Step 1: Create Application entity**

```typescript
// packages/api/src/applications/entities/application.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApplicationEvent } from './application-event.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  company: string;

  @Column()
  role: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'wishlist' })
  stage: string; // wishlist | applied | interview | final | offer | rejected

  @Column({ nullable: true })
  salary_range: string;

  @Column({ nullable: true })
  deadline: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  resume_id: string;

  @Column({ nullable: true })
  diagnosis_id: string;

  @OneToMany(() => ApplicationEvent, (e) => e.application)
  events: ApplicationEvent[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 2: Create ApplicationEvent entity**

```typescript
// packages/api/src/applications/entities/application-event.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Application } from './application.entity';

@Entity('application_events')
export class ApplicationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  application_id: string;

  @ManyToOne(() => Application, (a) => a.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column({ nullable: true })
  from_stage: string;

  @Column()
  to_stage: string;

  @Column({ nullable: true })
  note: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 3: Add frontend types to `packages/web/src/lib/types.ts`**

```typescript
export interface Application {
  id: string;
  company: string;
  role: string;
  location: string | null;
  stage: 'wishlist' | 'applied' | 'interview' | 'final' | 'offer' | 'rejected';
  salary_range: string | null;
  deadline: string | null;
  referrer: string | null;
  notes: string | null;
  resume_id: string | null;
  diagnosis_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  from_stage: string | null;
  to_stage: string;
  note: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: Application + ApplicationEvent entities"
```

---

## Task 2: Backend — Applications Module

**Files:**
- Create: DTOs, service, controller, module
- Modify: `app.module.ts`

- [ ] **Step 1: Create DTOs**

CreateApplicationDto: company (required), role (required), location?, stage?, salary_range?, deadline?, referrer?, notes?, resume_id?, diagnosis_id?

UpdateApplicationDto: all optional — stage?, company?, role?, location?, salary_range?, deadline?, notes?

- [ ] **Step 2: Create ApplicationsService**

Methods:
- `create(userId, dto)` → save Application + create initial ApplicationEvent
- `findAllByUser(userId)` → list ordered by updated_at DESC
- `findOne(id, userId)` → with events relation
- `update(id, userId, dto)` → update fields; if stage changes, create ApplicationEvent
- `remove(id, userId)` → delete
- `getStats(userId)` → count by stage, return `{ wishlist, applied, interview, final, offer, rejected }`

Key: stage transitions auto-create ApplicationEvent records for audit trail.

- [ ] **Step 3: Create controller**

Routes (all JWT guarded):
- POST /applications
- GET /applications
- GET /applications/stats
- GET /applications/:id
- PATCH /applications/:id
- DELETE /applications/:id
- GET /applications/:id/events

- [ ] **Step 4: Create module, register in AppModule**

- [ ] **Step 5: Verify and commit**

```bash
cd packages/api && npx tsc --noEmit
git commit -m "feat: applications module — CRUD + stage transitions + stats"
```

---

## Task 3: Frontend — Tracker Page + Kanban Components

**Files:**
- Create: `packages/web/src/app/(main)/applications/page.tsx`
- Create: `packages/web/src/components/tracker/kanban-board.tsx`
- Create: `packages/web/src/components/tracker/kanban-column.tsx`
- Create: `packages/web/src/components/tracker/application-card.tsx`
- Create: `packages/web/src/components/tracker/application-form.tsx`
- Create: `packages/web/src/components/tracker/tracker-stats.tsx`

**NO MOCK DATA. All from real API.**

- [ ] **Step 1: Create tracker-stats component**

5 stat tiles showing counts per stage. Props: `{ stats: Record<string, number> }`.
Fetch from `api.get('/applications/stats')`.

- [ ] **Step 2: Create application-card component**

Kanban card. Props: `{ application: Application, onUpdate: () => void }`.
Shows: company (bold), role (gray), location, salary/deadline, optional tag badges.
Urgent styling for cards with approaching deadlines.

- [ ] **Step 3: Create application-form component**

Dialog form for creating/editing applications. Props: `{ onSubmit, initial? }`.
Fields: company, role, location, stage (dropdown), salary_range, deadline, referrer, notes.

- [ ] **Step 4: Create kanban-column component**

Single column. Props: `{ stage, label, dotColor, applications, onUpdate }`.
Header with dot + label + count. List of application-card. "+ 添加" button at bottom.

- [ ] **Step 5: Create kanban-board component**

5-column grid. Props: `{ applications, onUpdate }`.
Groups applications by stage into columns. Stages: wishlist, applied, interview, final, offer.

- [ ] **Step 6: Create tracker page**

`'use client'` page. Fetches applications + stats from API. Shows stats tiles at top, kanban below.
"新增公司" button opens application-form dialog.
After create/update/delete → refetch data.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: application tracker — kanban board + stats + CRUD"
```

---

## Self-Review

- [x] **Spec coverage:** Application entity (Task 1), Event entity (Task 1), CRUD + stats API (Task 2), Kanban UI (Task 3), stage transitions (Task 2)
- [x] **Type consistency:** Application/ApplicationEvent types match between backend entities and frontend types
- [x] **API route consistency:** Controller routes match frontend api calls
