# Phase 2: Coach 对话 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Coach AI 对话系统 — 独立聊天入口 + 从诊断结果带上下文进入对话，支持多轮对话和对话历史。

**Architecture:** 后端新增 conversations 模块（Conversation + Message 实体，ChatService 封装 AI 多轮对话）。前端新增 Chat 页面（对话列表 + 对话详情），在诊断结果页添加"问 Coach"按钮创建上下文对话。

**Tech Stack:** NestJS + TypeORM + SQLite(dev) | Next.js + Tailwind + shadcn/ui | CloudDreamAI auto-v2 API

**Design Reference:** `Claude design/s-chat.jsx` — iMessage 风格对话 UI

---

## File Structure

### Backend (new/modified)

```
packages/api/src/
├── conversations/
│   ├── conversations.module.ts        ← NEW
│   ├── conversations.controller.ts    ← NEW
│   ├── conversations.service.ts       ← NEW
│   ├── chat.service.ts                ← NEW (AI 多轮对话封装)
│   ├── entities/
│   │   ├── conversation.entity.ts     ← NEW
│   │   └── message.entity.ts          ← NEW
│   └── dto/
│       ├── create-conversation.dto.ts ← NEW
│       └── send-message.dto.ts        ← NEW
├── app.module.ts                      ← MODIFY (add ConversationsModule)
```

### Frontend (new/modified)

```
packages/web/src/
├── app/(main)/
│   ├── chat/
│   │   ├── page.tsx                   ← NEW (对话列表 + 新建)
│   │   └── [id]/
│   │       └── page.tsx               ← NEW (对话详情)
│   ├── diagnoses/[id]/
│   │   └── diagnosis-detail.tsx       ← MODIFY (加"问 Coach"按钮)
│   └── layout.tsx                     ← MODIFY (侧边栏加最近对话)
├── components/
│   └── chat/
│       ├── message-bubble.tsx         ← NEW
│       ├── chat-input.tsx             ← NEW
│       └── conversation-card.tsx      ← NEW
├── lib/
│   └── types.ts                       ← MODIFY (加 Conversation, Message 类型)
```

---

## Task 1: Backend — Conversation + Message Entities

**Files:**
- Create: `packages/api/src/conversations/entities/conversation.entity.ts`
- Create: `packages/api/src/conversations/entities/message.entity.ts`
- Modify: `packages/web/src/lib/types.ts` (add frontend types)

- [ ] **Step 1: Create Conversation entity**

```typescript
// packages/api/src/conversations/entities/conversation.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  title: string;

  @Column({ default: 'free' })
  context_type: string; // 'diagnosis' | 'interview' | 'application' | 'free'

  @Column({ nullable: true })
  context_id: string;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 2: Create Message entity**

```typescript
// packages/api/src/conversations/entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversation_id: string;

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column()
  role: string; // 'user' | 'assistant'

  @Column('text')
  content: string;

  @Column('simple-json', { nullable: true })
  rich_card: Record<string, unknown> | null;

  @Column({ nullable: true })
  tool_used: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 3: Add frontend types**

Append to `packages/web/src/lib/types.ts`:

```typescript
export interface Conversation {
  id: string;
  title: string | null;
  context_type: string;
  context_id: string | null;
  created_at: string;
  updated_at: string;
  messages?: ChatMessage[];
  last_message?: ChatMessage;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  rich_card: Record<string, unknown> | null;
  tool_used: string | null;
  created_at: string;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/conversations/entities/ packages/web/src/lib/types.ts
git commit -m "feat: Conversation + Message entities"
```

---

## Task 2: Backend — Conversations Module (CRUD + Chat)

**Files:**
- Create: `packages/api/src/conversations/dto/create-conversation.dto.ts`
- Create: `packages/api/src/conversations/dto/send-message.dto.ts`
- Create: `packages/api/src/conversations/conversations.service.ts`
- Create: `packages/api/src/conversations/chat.service.ts`
- Create: `packages/api/src/conversations/conversations.controller.ts`
- Create: `packages/api/src/conversations/conversations.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// packages/api/src/conversations/dto/create-conversation.dto.ts
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  context_type?: string; // 'diagnosis' | 'free'

  @IsUUID()
  @IsOptional()
  context_id?: string;
}
```

```typescript
// packages/api/src/conversations/dto/send-message.dto.ts
import { IsString, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  content: string;
}
```

- [ ] **Step 2: Create ChatService — AI multi-turn conversation**

```typescript
// packages/api/src/conversations/chat.service.ts
import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { Message } from './entities/message.entity';

const COACH_SYSTEM = `你是 Coach，一个专业的求职 AI 教练，专门帮助中国应届毕业生准备秋招。

你的风格：
- 温暖但直接，像一个经验丰富的学长学姐
- 给出具体、可执行的建议，不说空话
- 用中文交流，技术术语可以用英文
- 回答简洁，除非用户要求详细解释

你的能力范围：
- 简历诊断和改写建议
- 面试准备和复盘
- 求职策略和规划
- 薪资谈判建议
- 行业和公司分析

如果用户问了你不确定的事实性问题，诚实说"我不确定"。`;

@Injectable()
export class ChatService {
  constructor(private readonly ai: AiService) {}

  async reply(
    history: Message[],
    userMessage: string,
    context?: { type: string; data: string },
  ): Promise<string> {
    let systemPrompt = COACH_SYSTEM;

    if (context) {
      systemPrompt += `\n\n## 当前上下文\n类型: ${context.type}\n数据:\n${context.data}`;
    }

    const messages = history
      .map((m) => `${m.role === 'user' ? '用户' : 'Coach'}: ${m.content}`)
      .join('\n\n');

    const prompt = messages
      ? `${messages}\n\n用户: ${userMessage}\n\nCoach:`
      : `用户: ${userMessage}\n\nCoach:`;

    return this.ai.complete({
      provider: 'clouddream',
      system: systemPrompt,
      prompt,
      maxTokens: 2048,
    });
  }
}
```

- [ ] **Step 3: Create ConversationsService**

```typescript
// packages/api/src/conversations/conversations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
    private readonly chat: ChatService,
  ) {}

  async create(userId: string, dto: CreateConversationDto): Promise<Conversation> {
    return this.convRepo.save(this.convRepo.create({
      user_id: userId,
      title: dto.title,
      context_type: dto.context_type ?? 'free',
      context_id: dto.context_id,
    }));
  }

  findAllByUser(userId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Conversation> {
    const conv = await this.convRepo.findOne({
      where: { id, user_id: userId },
      relations: { messages: true },
      order: { messages: { created_at: 'ASC' } },
    });
    if (!conv) throw new NotFoundException();
    return conv;
  }

  async sendMessage(convId: string, userId: string, content: string): Promise<Message> {
    const conv = await this.findOne(convId, userId);

    // Save user message
    const userMsg = await this.msgRepo.save(this.msgRepo.create({
      conversation_id: convId,
      role: 'user',
      content,
    }));

    // Build context if conversation has one
    let context: { type: string; data: string } | undefined;
    if (conv.context_type === 'diagnosis' && conv.context_id) {
      context = { type: '简历诊断结果', data: `诊断 ID: ${conv.context_id}` };
    }

    // Get AI reply
    const reply = await this.chat.reply(conv.messages, content, context);

    // Save assistant message
    const assistantMsg = await this.msgRepo.save(this.msgRepo.create({
      conversation_id: convId,
      role: 'assistant',
      content: reply,
    }));

    // Auto-generate title from first message
    if (!conv.title && conv.messages.length <= 1) {
      const title = content.length > 30 ? content.substring(0, 30) + '…' : content;
      await this.convRepo.update(convId, { title });
    }

    // Touch updated_at
    await this.convRepo.update(convId, { updated_at: new Date() });

    return assistantMsg;
  }

  async remove(id: string, userId: string): Promise<void> {
    const conv = await this.findOne(id, userId);
    await this.convRepo.remove(conv);
  }
}
```

- [ ] **Step 4: Create controller**

```typescript
// packages/api/src/conversations/conversations.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateConversationDto) {
    return this.conversations.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.conversations.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.conversations.findOne(id, user.id);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.conversations.sendMessage(id, user.id, dto.content);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.conversations.remove(id, user.id);
  }
}
```

- [ ] **Step 5: Create module and register in AppModule**

```typescript
// packages/api/src/conversations/conversations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AiModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
```

Add `ConversationsModule` to `app.module.ts` imports.

- [ ] **Step 6: Verify and commit**

```bash
cd packages/api && npx tsc --noEmit
git add packages/api/src/conversations/ packages/api/src/app.module.ts
git commit -m "feat: conversations module — CRUD + AI chat service"
```

---

## Task 3: Frontend — Chat List Page

**Files:**
- Create: `packages/web/src/app/(main)/chat/page.tsx`
- Create: `packages/web/src/components/chat/conversation-card.tsx`

- [ ] **Step 1: Create conversation-card component**

A card showing conversation title, last message preview, time ago. Click navigates to `/chat/[id]`.

Props: `{ conversation: Conversation }`

Style: surface background, line border, 14px radius. Title bold, preview text muted, time small mono.

- [ ] **Step 2: Create chat list page**

`'use client'` page at `/chat`. Fetches `api.get<Conversation[]>('/conversations')`.

Layout:
- Header: "对话" title + "新建对话" button
- List of conversation-card components
- Empty state: "开始你的第一次对话" + CTA

"新建对话" flow: `api.post<Conversation>('/conversations', { context_type: 'free' })` → navigate to `/chat/[id]`

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/\(main\)/chat/ packages/web/src/components/chat/
git commit -m "feat: chat list page + conversation card"
```

---

## Task 4: Frontend — Chat Detail Page

**Files:**
- Create: `packages/web/src/app/(main)/chat/[id]/page.tsx`
- Create: `packages/web/src/components/chat/message-bubble.tsx`
- Create: `packages/web/src/components/chat/chat-input.tsx`

- [ ] **Step 1: Create message-bubble component**

iMessage-style bubbles. Props: `{ message: ChatMessage }`.

User messages: brand blue background, white text, right-aligned, `border-radius: 18px 18px 6px 18px`.
Assistant messages: surface background with line border, left-aligned, `border-radius: 18px 18px 18px 6px`.

Show timestamp below each message in mono font.

Reference: `Claude design/s-chat.jsx` lines 12-28 for exact styling.

- [ ] **Step 2: Create chat-input component**

Props: `{ onSend: (content: string) => void, loading: boolean }`.

Rounded input box (22px radius), placeholder "输入消息…", send button (brand blue circle).
Disable input and show loading indicator while waiting for AI response.

Reference: `Claude design/s-chat.jsx` lines 92-106 for exact styling.

- [ ] **Step 3: Create chat detail page**

`'use client'` page at `/chat/[id]`. Core logic:

1. Fetch conversation with messages: `api.get<Conversation>('/conversations/${id}')`
2. Display message feed (scrollable, auto-scroll to bottom on new messages)
3. Input at bottom → `api.post<ChatMessage>('/conversations/${id}/messages', { content })`
4. Append user message immediately (optimistic), then append AI response when it returns
5. Loading state while AI is thinking (show typing indicator in assistant bubble area)
6. Back button → `/chat`

Layout: flex column, feed takes remaining space, input fixed at bottom.

- [ ] **Step 4: Add `generateStaticParams` for static export**

```typescript
export const dynamicParams = true;
export function generateStaticParams() { return []; }
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: chat detail page — message feed + AI reply"
```

---

## Task 5: Frontend — Diagnosis → Chat Integration

**Files:**
- Modify: `packages/web/src/app/(main)/diagnoses/[id]/diagnosis-detail.tsx`

- [ ] **Step 1: Add "问 Coach" button to diagnosis result page**

In the header area of the diagnosis detail, add a button:
- Label: "问 Coach"
- Icon: MessageSquare from lucide-react
- Style: primary button (brand blue background)

On click:
1. Create conversation with diagnosis context: `api.post<Conversation>('/conversations', { context_type: 'diagnosis', context_id: diagnosisId, title: '诊断: ' + jdRole })`
2. Navigate to `/chat/${conversation.id}`

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: 'Ask Coach' button on diagnosis result — creates contextual chat"
```

---

## Task 6: Frontend — Sidebar Recent Conversations

**Files:**
- Modify: `packages/web/src/app/(main)/layout.tsx`

- [ ] **Step 1: Add recent conversations to sidebar**

Below the tool nav section, add a "最近对话" section:
1. Fetch `api.get<Conversation[]>('/conversations')` (limit to 5 most recent)
2. Show each as a nav-thread item (title, time ago)
3. Click → navigate to `/chat/[id]`
4. Add "问 Coach" CTA link to `/chat` in the nav

Reference: `Claude design/core.jsx` lines 307-311 for sidebar thread styling.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: sidebar recent conversations + chat navigation"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Conversation entity (Task 1), Message entity (Task 1), Chat CRUD (Task 2), AI multi-turn (Task 2), Chat UI (Tasks 3-4), Diagnosis→Chat (Task 5), Sidebar threads (Task 6)
- [x] **Placeholder scan:** All tasks have concrete code or clear implementation instructions
- [x] **Type consistency:** `Conversation`, `ChatMessage` types match between backend entities and frontend types. `SendMessageDto` matches the API call in frontend. `context_type` and `context_id` used consistently.
- [x] **API route consistency:** Backend controller routes (`/conversations`, `/conversations/:id`, `/conversations/:id/messages`) match frontend `api.post`/`api.get` calls
