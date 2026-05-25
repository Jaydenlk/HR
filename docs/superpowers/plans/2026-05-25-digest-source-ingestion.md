# Digest Source Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Digest from a hardcoded content page into a source-backed market intelligence product with verified sources, scheduled ingestion, CloudDreamAI classification, and full backend/frontend acceptance.

**Architecture:** Feed becomes a small ingestion domain: configured sources produce raw candidates, a classifier normalizes them into evidence-backed feed items, digest runs record what happened, and the frontend renders only API-backed content with provenance. No fake fallback cards, no mixed-company interview experiences, no unlabeled source claims.

**Tech Stack:** NestJS + TypeORM + SQLite, `@nestjs/schedule` per official Nest task scheduling docs, CloudDreamAI `auto-v2` through existing `AiService`, Next.js + Tailwind/shadcn-style components, Playwright/browser manual E2E.

---

## Business Requirement Chain

用户打开 Digest/月刊时，真正想解决的是求职信息差，不是看一堆漂亮卡片。产品必须支持四类内容：

1. 面经：小红书、牛客等来源，必须保留公司、岗位、来源、原文链接，不能把 PDD、字节、美团混在一起。
2. 市场一线观察：晚点、公众号、博客等高质量内容，显示摘要、来源、可跳转链接，重点是“为什么对求职有用”。
3. 求职认知和策略：信息差、投递策略、面试准备、行业变化，必须和应届生求职动作关联。
4. 用户/Coach 内容：用户自己发布的经验和 AI 周刊，但要标明是 UGC 或 Coach 整理，不能伪装成外部来源。

用户流程应是：进入 Digest -> 看到本日/本周可信情报 -> 按公司/来源/类型筛选 -> 打开原文 -> 回到产品继续写自己的面经或把信息用于投递/面试准备。

## Current Problems This Plan Fixes

- `packages/web/src/app/layout.tsx` imports Google Fonts, causing `next build` to fail in restricted/domestic environments.
- `packages/web/src/app/(main)/digest/page.tsx` contains hardcoded trending topics and fake fallback hero cards.
- `packages/api/src/feed/importers/rss-importer.service.ts` falls back to GitHub static directories but labels them as NowCoder.
- `packages/api/src/feed/digest-generator.service.ts` contains mojibake prompts and creates an AI digest even when source data is empty.
- `FeedItem.source` is a loose string with no source registry, no run log, no fetched timestamp, and no quality/provenance fields.
- XHS import is a direct service call without a reusable source adapter contract or daily ingestion orchestration.

## Source Confidence Notes

- Official Nest scheduling documentation says to install `@nestjs/schedule`, import `ScheduleModule.forRoot()`, and use cron decorators for recurring jobs: https://docs.nestjs.com/techniques/task-scheduling
- For XHS, implementation must use the configured MCP endpoint first. If the endpoint contract differs from the current `search_feeds` shape, stop and record the real response in `docs/codex-handoff/`, then adapt the adapter. Do not guess.
- For WeChat/公众号 ingestion, if no configured legal source API exists, ship the registry and manual seed/import path first. Do not scrape private pages or invent data.

## File Structure

### Backend

- Create `packages/api/src/feed/types/feed.types.ts`
  - Defines strict unions for `FeedSourceKind`, `FeedCategory`, `FeedSourceStatus`, `DigestRunStatus`.
- Create `packages/api/src/feed/entities/feed-source.entity.ts`
  - One configured source: XHS MCP, RSS, manual seed, or future source.
- Create `packages/api/src/feed/entities/digest-run.entity.ts`
  - One ingestion run with status, counts, errors, and timestamps.
- Modify `packages/api/src/feed/entities/feed-item.entity.ts`
  - Adds strict source metadata: `source_kind`, `source_name`, `source_url`, `external_id`, `fetched_at`, `published_at`, `summary`, `tags_json`, `quality_score`.
- Create `packages/api/src/feed/dto/feed-query.dto.ts`
  - Filters by category, company, source kind, source id, keyword.
- Create `packages/api/src/feed/dto/import-feed.dto.ts`
  - Manual import/run trigger with optional source id and keyword.
- Create `packages/api/src/feed/source-registry.service.ts`
  - Seeds and reads configured sources. No crawling logic.
- Create `packages/api/src/feed/feed-ingestion.service.ts`
  - Orchestrates source runs, deduplication, classification, save, and run logs.
- Create `packages/api/src/feed/feed-classifier.service.ts`
  - Uses CloudDreamAI via `AiService` to classify candidates into strict JSON.
- Create `packages/api/src/feed/importers/feed-importer.interface.ts`
  - Shared importer contract.
- Modify `packages/api/src/feed/importers/xhs-importer.service.ts`
  - Implements importer contract and returns raw candidates only.
- Modify `packages/api/src/feed/importers/rss-importer.service.ts`
  - Implements importer contract; removes GitHub/static fallback mislabeled as RSS/NowCoder.
- Modify `packages/api/src/feed/feed.service.ts`
  - Query, create UGC, save normalized external item, and delete owner UGC only.
- Modify `packages/api/src/feed/feed.controller.ts`
  - Adds source list, run list, import trigger, and filtered feed endpoints.
- Modify `packages/api/src/feed/feed.module.ts`
  - Registers new entities/services.
- Modify `packages/api/src/app.module.ts`
  - Adds `ScheduleModule.forRoot()` after dependency install.
- Test `packages/api/test/feed.e2e-spec.ts`
  - Covers auth, source config, import normal/error paths, filtering, dedupe, and ownership.
- Test `packages/api/src/feed/feed-classifier.service.spec.ts`
  - Unit tests AI output parsing with mocked `AiService`.

### Frontend

- Modify `packages/web/src/app/layout.tsx`
  - Remove `next/font/google` and use local/system font stack.
- Modify `packages/web/src/lib/types.ts`
  - Adds `FeedSource`, `DigestRun`, strict feed types.
- Modify `packages/web/src/app/(main)/digest/page.tsx`
  - Replace hardcoded fallback UI with source-backed states, filters, source badges, run status, and empty-state instructions.
- Optionally create `packages/web/src/app/(main)/digest/components/source-badge.tsx`
  - Small source/provenance display component if page size becomes too large.
- Optionally create `packages/web/src/app/(main)/digest/components/digest-card.tsx`
  - Card rendering with source link and company/category tags if page size remains unwieldy.

### Data and Docs

- Create `data/sources/digest_sources.json`
  - Verified configured sources, not scraped content dumps.
- Create `data/seed/digest_seed_verified.json`
  - Small, manually verified starter set only when source links and metadata are real.
- Create `docs/codex-handoff/digest-implementation-log.md`
  - Step-by-step implementation and verification log for Claude/Codex handoff.

## Task 0: Create Implementation Worktree

**Files:**
- No code files.
- Update: `docs/codex-handoff/digest-implementation-log.md`

- [ ] **Step 1: Start from `dev` in the main repo**

Run from `E:\Agent program\HRBP`:

```powershell
git checkout dev
git status --short
```

Expected:

```text
On branch dev
```

Only untracked local artifacts are allowed. Do not implement on `dev`.

- [ ] **Step 2: Create project-local worktree**

```powershell
git worktree add ".worktrees\digest-source-ingestion" -b feature/digest-source-ingestion dev
```

Expected:

```text
Preparing worktree (new branch 'feature/digest-source-ingestion')
HEAD is now at <dev commit>
```

- [ ] **Step 3: Create handoff log**

Create `docs/codex-handoff/digest-implementation-log.md`:

```markdown
# Digest Source Ingestion Implementation Log

## Scope
Replace hardcoded Digest content with verified source-backed ingestion, classification, and UI.

## Rules
- No fake fallback content.
- No source relabeling.
- No company mixing.
- All AI calls use CloudDreamAI through existing AiService.
- Every implementation step records verification evidence here.

## Progress
- [ ] Worktree created.
- [ ] Backend model implemented.
- [ ] Ingestion implemented.
- [ ] Frontend Digest refactored.
- [ ] PJR passed.
- [ ] Desktop Playwright E2E passed.
- [ ] Mobile Playwright E2E passed.
```

- [ ] **Step 4: Commit log skeleton**

```powershell
git add docs/codex-handoff/digest-implementation-log.md
git commit -m "docs: start digest source ingestion handoff log"
```

## Task 1: Remove Build-Blocking Google Font

**Files:**
- Modify: `packages/web/src/app/layout.tsx`
- Modify: `packages/web/src/app/globals.css` if a global font token already exists

- [ ] **Step 1: Verify current failure**

Run:

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\web"
npx.cmd next build
```

Expected current failure:

```text
Failed to fetch `Plus Jakarta Sans` from Google Fonts
```

- [ ] **Step 2: Replace `next/font/google`**

Set `packages/web/src/app/layout.tsx` to this structure:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Coach - 你的求职 AI 教练',
  description: '简历诊断、面试复盘、投递追踪和求职情报工作台',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Ensure font stack lives in CSS**

If `globals.css` has no font family on `body`, add:

```css
body {
  font-family:
    "Inter",
    "PingFang SC",
    "Microsoft YaHei",
    Arial,
    sans-serif;
}
```

- [ ] **Step 4: Verify**

```powershell
npx.cmd eslint src/
npx.cmd next build
```

Expected:

```text
Compiled successfully
```

- [ ] **Step 5: Commit**

```powershell
git add packages/web/src/app/layout.tsx packages/web/src/app/globals.css
git commit -m "fix: remove remote Google font dependency"
```

## Task 2: Add Strict Feed Source Domain Model

**Files:**
- Create: `packages/api/src/feed/types/feed.types.ts`
- Create: `packages/api/src/feed/entities/feed-source.entity.ts`
- Create: `packages/api/src/feed/entities/digest-run.entity.ts`
- Modify: `packages/api/src/feed/entities/feed-item.entity.ts`
- Modify: `packages/api/src/feed/feed.module.ts`

- [ ] **Step 1: Write type unions**

Create `packages/api/src/feed/types/feed.types.ts`:

```ts
export const FEED_SOURCE_KINDS = ['xhs', 'nowcoder', 'wechat', 'blog', 'ugc', 'coach'] as const;
export type FeedSourceKind = (typeof FEED_SOURCE_KINDS)[number];

export const FEED_CATEGORIES = [
  'interview_exp',
  'market_insight',
  'job_tips',
  'hiring_signal',
  'editorial',
] as const;
export type FeedCategory = (typeof FEED_CATEGORIES)[number];

export const FEED_SOURCE_STATUSES = ['active', 'paused', 'needs_config'] as const;
export type FeedSourceStatus = (typeof FEED_SOURCE_STATUSES)[number];

export const DIGEST_RUN_STATUSES = ['running', 'success', 'partial', 'failed'] as const;
export type DigestRunStatus = (typeof DIGEST_RUN_STATUSES)[number];

export interface FeedTags {
  companies: string[];
  roles: string[];
  topics: string[];
}
```

- [ ] **Step 2: Create source entity**

Create `packages/api/src/feed/entities/feed-source.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { FeedSourceKind, FeedSourceStatus } from '../types/feed.types';

@Entity('feed_sources')
export class FeedSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  kind: FeedSourceKind;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  homepage_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  config_key: string | null;

  @Column({ type: 'varchar', default: 'active' })
  status: FeedSourceStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'datetime', nullable: true })
  last_run_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 3: Create run entity**

Create `packages/api/src/feed/entities/digest-run.entity.ts`:

```ts
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FeedSource } from './feed-source.entity';
import type { DigestRunStatus } from '../types/feed.types';

@Entity('digest_runs')
export class DigestRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  source_id: string | null;

  @ManyToOne(() => FeedSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source: FeedSource | null;

  @Column({ type: 'varchar' })
  status: DigestRunStatus;

  @Column({ type: 'integer', default: 0 })
  fetched_count: number;

  @Column({ type: 'integer', default: 0 })
  saved_count: number;

  @Column({ type: 'integer', default: 0 })
  skipped_count: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 4: Extend feed item entity**

Modify `packages/api/src/feed/entities/feed-item.entity.ts` so the source fields are explicit:

```ts
  @Column({ type: 'varchar', default: 'ugc' })
  source_kind: FeedSourceKind;

  @Column({ type: 'varchar', nullable: true })
  source_name: string | null;

  @Column({ type: 'varchar', nullable: true })
  source_id: string | null;

  @ManyToOne(() => FeedSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source_ref: FeedSource | null;

  @Column({ type: 'varchar', default: 'interview_exp' })
  category: FeedCategory;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  source_url: string | null;

  @Column({ type: 'varchar', nullable: true })
  external_id: string | null;

  @Column({ type: 'datetime', nullable: true })
  fetched_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  published_at: Date | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'text', nullable: true })
  tags_json: string | null;

  @Column({ type: 'integer', default: 0 })
  quality_score: number;
```

Keep a temporary `source` property only if existing frontend/tests still compile, but route all new code through `source_kind`. If keeping it adds complexity, remove it and update all references in the same task.

- [ ] **Step 5: Register entities**

Update `packages/api/src/feed/feed.module.ts`:

```ts
imports: [TypeOrmModule.forFeature([FeedItem, FeedSource, DigestRun]), AiModule],
```

- [ ] **Step 6: Verify API compile**

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\api"
npx.cmd tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```powershell
git add packages/api/src/feed
git commit -m "feat: add feed source and digest run model"
```

## Task 3: Add Source Registry and Query DTOs

**Files:**
- Create: `packages/api/src/feed/dto/feed-query.dto.ts`
- Create: `packages/api/src/feed/dto/import-feed.dto.ts`
- Create: `packages/api/src/feed/source-registry.service.ts`
- Create: `data/sources/digest_sources.json`
- Modify: `packages/api/src/feed/feed.service.ts`
- Modify: `packages/api/src/feed/feed.controller.ts`

- [ ] **Step 1: Create configured source seed**

Create `data/sources/digest_sources.json`:

```json
[
  {
    "kind": "xhs",
    "name": "小红书面经",
    "homepage_url": "https://www.xiaohongshu.com",
    "config_key": "XHS_MCP_BASE_URL",
    "status": "needs_config",
    "description": "面经、面试体验、校招求职信息差。必须按公司和岗位标注。"
  },
  {
    "kind": "nowcoder",
    "name": "牛客面经",
    "homepage_url": "https://www.nowcoder.com",
    "config_key": "RSS_FEED_URL",
    "status": "active",
    "description": "面经与校招讨论。只保存标题、摘要和原文链接。"
  },
  {
    "kind": "wechat",
    "name": "公众号深度观察",
    "homepage_url": null,
    "config_key": "WECHAT_SOURCE_FEEDS",
    "status": "needs_config",
    "description": "晚点、行业观察、真实市场一线信息。无合法来源接口前只允许人工校验种子。"
  }
]
```

- [ ] **Step 2: Add DTOs**

Create `feed-query.dto.ts`:

```ts
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FEED_CATEGORIES, FEED_SOURCE_KINDS } from '../types/feed.types';

export class FeedQueryDto {
  @IsOptional()
  @IsIn(FEED_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsIn(FEED_SOURCE_KINDS)
  source_kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}
```

Create `import-feed.dto.ts`:

```ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportFeedDto {
  @IsOptional()
  @IsString()
  source_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;
}
```

- [ ] **Step 3: Implement source registry**

Create `source-registry.service.ts` with these public methods:

```ts
async ensureDefaults(): Promise<void>
findAll(): Promise<FeedSource[]>
findActive(): Promise<FeedSource[]>
findOne(id: string): Promise<FeedSource>
markRun(sourceId: string): Promise<void>
```

Implementation rules:
- Read `data/sources/digest_sources.json` with `fs/promises`.
- Resolve path from `process.cwd()` and fallback two levels up if running from `packages/api`.
- Upsert by `kind + name`.
- If `config_key` is present and env var is missing, status becomes `needs_config`.
- Do not create fake source data.

- [ ] **Step 4: Update feed query**

`FeedService.findAll(query: FeedQueryDto)` must:
- Order by `published_at DESC`, then `created_at DESC`.
- Filter category/source/company/keyword.
- Never return items with empty `source_url` for external sources except `ugc` and `coach`.

- [ ] **Step 5: Update controller endpoints**

`FeedController` must expose:

```ts
@Get('sources')
sources() { return this.sources.findAll(); }

@Get('runs')
runs() { return this.ingestion.findRuns(); }

@Post('import')
import(@Body() dto: ImportFeedDto) { return this.ingestion.import(dto); }

@Get()
findAll(@Query() query: FeedQueryDto) { return this.feed.findAll(query); }
```

- [ ] **Step 6: Test source endpoints**

Add e2e expectations:

```ts
await request(app.getHttpServer())
  .get('/feed/sources')
  .set('Authorization', `Bearer ${token}`)
  .expect(200)
  .expect(({ body }) => {
    expect(body.some((s: { kind: string }) => s.kind === 'xhs')).toBe(true);
  });
```

- [ ] **Step 7: Verify and commit**

```powershell
npx.cmd jest --config ./test/jest-e2e.json --runInBand --testPathPattern=feed.e2e-spec.ts
git add packages/api/src/feed data/sources/digest_sources.json packages/api/test/feed.e2e-spec.ts
git commit -m "feat: add digest source registry and feed filters"
```

## Task 4: Refactor Importers Into Candidate Adapters

**Files:**
- Create: `packages/api/src/feed/importers/feed-importer.interface.ts`
- Modify: `packages/api/src/feed/importers/xhs-importer.service.ts`
- Modify: `packages/api/src/feed/importers/rss-importer.service.ts`
- Remove or stop registering: `packages/api/src/feed/importers/github-importer.service.ts` for Digest ingestion
- Modify: `packages/api/src/feed/feed.module.ts`

- [ ] **Step 1: Define importer contract**

Create `feed-importer.interface.ts`:

```ts
import { FeedSource } from '../entities/feed-source.entity';
import type { FeedSourceKind } from '../types/feed.types';

export interface FeedCandidate {
  source_kind: FeedSourceKind;
  source_name: string;
  source_url: string;
  external_id: string;
  title: string;
  content: string;
  author: string | null;
  published_at: Date | null;
  fetched_at: Date;
  raw: Record<string, unknown>;
}

export interface FeedImporter {
  readonly kind: FeedSourceKind;
  fetch(source: FeedSource, keyword?: string): Promise<FeedCandidate[]>;
}
```

- [ ] **Step 2: XHS adapter**

Change `XhsImporterService` so it no longer saves entities. It returns candidates from MCP:

```ts
readonly kind = 'xhs' as const;

async fetch(source: FeedSource, keyword = '校招 面经'): Promise<FeedCandidate[]> {
  const baseUrl = process.env[source.config_key ?? 'XHS_MCP_BASE_URL'];
  if (!baseUrl) return [];
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/search_feeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, limit: 20 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`XHS MCP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as McpSearchResult;
  return (data.feeds ?? [])
    .filter((item) => item.note_url && (item.title || item.desc))
    .map((item) => ({
      source_kind: 'xhs',
      source_name: source.name,
      source_url: item.note_url as string,
      external_id: item.note_url as string,
      title: item.title ?? item.desc?.slice(0, 80) ?? '小红书面经',
      content: item.desc ?? item.title ?? '',
      author: item.user?.nickname ?? null,
      published_at: null,
      fetched_at: new Date(),
      raw: { liked_count: item.liked_count ?? null },
    }));
}
```

- [ ] **Step 3: RSS/NowCoder adapter**

Change `RssImporterService` so it only parses configured RSS. Remove GitHub and static fallbacks. A failed RSS source should produce a failed run, not mislabeled data.

```ts
readonly kind = 'nowcoder' as const;

async fetch(source: FeedSource): Promise<FeedCandidate[]> {
  const url = process.env[source.config_key ?? 'RSS_FEED_URL'];
  if (!url) return [];
  const parsed = await this.parser.parseURL(url);
  return (parsed.items ?? [])
    .filter((item) => item.link || item.guid)
    .slice(0, 30)
    .map((item) => {
      const sourceUrl = item.link ?? item.guid ?? '';
      const rawContent = item.contentEncoded ?? item.content ?? item.summary ?? '';
      return {
        source_kind: 'nowcoder',
        source_name: source.name,
        source_url: sourceUrl,
        external_id: sourceUrl,
        title: this.stripHtml(item.title ?? '').slice(0, 200) || '牛客面经',
        content: this.stripHtml(rawContent).slice(0, 5000),
        author: item.creator ?? null,
        published_at: item.isoDate ? new Date(item.isoDate) : null,
        fetched_at: new Date(),
        raw: {},
      };
    });
}
```

- [ ] **Step 4: Verify no mislabeled fallback remains**

Run:

```powershell
rg "FALLBACK|static fallback|GitHub fallback|source: 'nowcoder'" packages/api/src/feed
```

Expected: no GitHub/static fallback remains inside RSS/XHS importer. `source_kind: 'nowcoder'` may remain only in the RSS adapter.

- [ ] **Step 5: Commit**

```powershell
git add packages/api/src/feed
git commit -m "refactor: make feed importers source adapters"
```

## Task 5: Ingestion Orchestrator, Classifier, and Daily Schedule

**Files:**
- Create: `packages/api/src/feed/feed-classifier.service.ts`
- Create: `packages/api/src/feed/feed-ingestion.service.ts`
- Modify: `packages/api/src/feed/digest-generator.service.ts`
- Modify: `packages/api/src/feed/feed.module.ts`
- Modify: `packages/api/src/app.module.ts`
- Modify: `packages/api/package.json`
- Test: `packages/api/src/feed/feed-classifier.service.spec.ts`
- Test: `packages/api/test/feed.e2e-spec.ts`

- [ ] **Step 1: Install scheduler from official Nest package**

Run:

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\api"
npm.cmd install @nestjs/schedule
```

Expected: `package.json` and lockfile update. If install fails due network/sandbox, stop and record the failure in `docs/codex-handoff/digest-implementation-log.md`.

- [ ] **Step 2: Register scheduler**

In `packages/api/src/app.module.ts`:

```ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // existing imports
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Implement classifier with strict JSON**

`FeedClassifierService.classify(candidate)` must call:

```ts
await this.ai.complete({
  system: [
    '你是 Coach 求职情报编辑。',
    '只能基于输入内容分类和摘要，不得编造公司、岗位、薪资、结果。',
    '如果无法判断公司或岗位，返回 null。',
    '输出严格 JSON，不要 Markdown。',
  ].join('\n'),
  prompt,
  maxTokens: 1200,
});
```

Returned shape:

```ts
interface ClassifiedFeed {
  category: FeedCategory;
  title: string;
  summary: string;
  company: string | null;
  role: string | null;
  outcome: string | null;
  tags: FeedTags;
  quality_score: number;
}
```

Parse defensively:
- `quality_score` clamps to `0..100`.
- Unknown category becomes `job_tips`.
- Empty title uses candidate title.
- Invalid JSON throws `BadRequestException` in unit test but is caught by ingestion run as skipped item.

- [ ] **Step 4: Implement ingestion orchestration**

`FeedIngestionService.import(dto)` flow:

```ts
const sources = dto.source_id
  ? [await this.registry.findOne(dto.source_id)]
  : await this.registry.findActive();
for (const source of sources) {
  const run = await this.startRun(source.id);
  try {
    const candidates = await importer.fetch(source, dto.keyword);
    for (const candidate of candidates) {
      if (await this.exists(candidate.external_id, candidate.source_url)) {
        skipped++;
        continue;
      }
      const classified = await this.classifier.classify(candidate);
      await this.feed.saveExternal(candidate, classified, source.id);
      saved++;
    }
    await this.finishRun(run.id, saved === 0 && candidates.length > 0 ? 'partial' : 'success', counts);
  } catch (error) {
    await this.finishRun(run.id, 'failed', counts, error);
  }
}
```

No exception from one source may prevent another source from running.

- [ ] **Step 5: Add daily cron**

In `FeedIngestionService`:

```ts
@Cron('0 0 3 * * *', { name: 'digest-daily-ingestion', timeZone: 'Asia/Shanghai' })
async importDaily(): Promise<void> {
  await this.import({});
}
```

This is 03:00 Asia/Shanghai. If deployment uses multiple API instances, document that the job may run per instance and needs a distributed lock later.

- [ ] **Step 6: Rewrite digest generator**

`DigestGeneratorService.generateWeeklyDigest()` must:
- Refuse to generate when fewer than 3 source-backed items exist in the last 7 days.
- Include source name + URL in the prompt.
- Store generated item as `source_kind: 'coach'`, `category: 'editorial'`.
- Use Chinese only.

Expected insufficient-data response:

```ts
throw new BadRequestException('Digest requires at least 3 source-backed items from the last 7 days');
```

- [ ] **Step 7: Unit-test classifier**

Use mocked `AiService`:

```ts
it('keeps PDD interview separate from ByteDance interview', async () => {
  ai.complete.mockResolvedValue(JSON.stringify({
    category: 'interview_exp',
    title: 'PDD 产品一面复盘',
    summary: '候选人提到 PDD 产品岗一面，重点是增长实验和高压追问。',
    company: '拼多多',
    role: '产品经理',
    outcome: null,
    tags: { companies: ['拼多多'], roles: ['产品经理'], topics: ['增长实验'] },
    quality_score: 82
  }));
  const result = await service.classify(pddCandidate);
  expect(result.company).toBe('拼多多');
  expect(result.tags.companies).not.toContain('字节跳动');
});
```

- [ ] **Step 8: E2E-test no-source and failed-source cases**

Add tests:

```ts
await request(server)
  .post('/feed/import')
  .set('Authorization', `Bearer ${token}`)
  .send({ source_id: xhsSource.id, keyword: '字节 面经' })
  .expect(201)
  .expect(({ body }) => {
    expect(body.runs[0].status).toMatch(/success|partial|failed/);
    expect(body.runs[0].saved_count).toBeGreaterThanOrEqual(0);
  });
```

Mock importer failure in a unit test and assert run status becomes `failed`.

- [ ] **Step 9: Verify and commit**

```powershell
npx.cmd tsc --noEmit
npx.cmd nest build
npx.cmd jest --config ./test/jest-e2e.json --runInBand --testPathPattern=feed.e2e-spec.ts
git add packages/api package-lock.json
git commit -m "feat: add scheduled digest ingestion pipeline"
```

## Task 6: Refactor Digest Frontend Around Real API Data

**Files:**
- Modify: `packages/web/src/lib/types.ts`
- Modify: `packages/web/src/app/(main)/digest/page.tsx`
- Optional create: `packages/web/src/app/(main)/digest/components/source-badge.tsx`
- Optional create: `packages/web/src/app/(main)/digest/components/digest-card.tsx`

- [ ] **Step 1: Add strict frontend types**

Add to `types.ts`:

```ts
export type FeedSourceKind = 'xhs' | 'nowcoder' | 'wechat' | 'blog' | 'ugc' | 'coach';
export type FeedCategory = 'interview_exp' | 'market_insight' | 'job_tips' | 'hiring_signal' | 'editorial';

export interface FeedSource {
  id: string;
  kind: FeedSourceKind;
  name: string;
  homepage_url: string | null;
  status: 'active' | 'paused' | 'needs_config';
  description: string | null;
  last_run_at: string | null;
}

export interface DigestRun {
  id: string;
  source_id: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  fetched_count: number;
  saved_count: number;
  skipped_count: number;
  error_message: string | null;
  created_at: string;
  source?: FeedSource | null;
}

export interface FeedItem {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  company: string | null;
  role: string | null;
  outcome: string | null;
  source_kind: FeedSourceKind;
  source_name: string | null;
  category: FeedCategory;
  source_url: string | null;
  author: string | null;
  quality_score: number;
  published_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Remove hardcoded topics and fake fallback**

Delete:
- `TRENDING_TOPICS`
- Default hero text claiming numbers like "1,247 份简历"
- Default PDD salary/base claims
- Any `source !== 'github'` filtering logic

The page must show empty/config states instead:

```tsx
function EmptyDigestState({ hasSources }: { hasSources: boolean }) {
  return (
    <div className="digest-empty">
      <h2>{hasSources ? '还没有抓取到新情报' : '还没有配置情报来源'}</h2>
      <p>
        {hasSources
          ? '请稍后重新导入，或先写一篇自己的面经。'
          : '需要配置小红书 MCP、牛客 RSS 或人工校验来源后，月刊才会展示内容。'}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Load all API-backed data**

Use:

```tsx
const [items, setItems] = useState<FeedItem[]>([]);
const [sources, setSources] = useState<FeedSource[]>([]);
const [runs, setRuns] = useState<DigestRun[]>([]);

async function loadDigest() {
  const [feedItems, feedSources, digestRuns] = await Promise.all([
    api.get<FeedItem[]>('/feed'),
    api.get<FeedSource[]>('/feed/sources'),
    api.get<DigestRun[]>('/feed/runs'),
  ]);
  setItems(feedItems);
  setSources(feedSources);
  setRuns(digestRuns);
}
```

- [ ] **Step 4: Add source controls**

Add:
- Source status strip: active/needs_config/last_run.
- Source filter segmented control: 全部 / 小红书 / 牛客 / 公众号 / Coach / UGC.
- Category tabs: 面经 / 市场观察 / 求职策略 / 招聘信号 / 编辑精选.
- Import button: calls `POST /feed/import`.
- Disabled/importing/loading states.

Button behavior:

```tsx
async function handleImport() {
  setImporting(true);
  setError(null);
  try {
    await api.post<{ runs: DigestRun[] }>('/feed/import', {});
    await loadDigest();
  } catch (err) {
    setError(err instanceof Error ? err.message : '导入失败');
  } finally {
    setImporting(false);
  }
}
```

- [ ] **Step 5: Card content rules**

Each card must show:
- Category label.
- Company and role when known.
- Source badge, source name, and published/fetched time.
- Summary first, not raw scraped text.
- External link button if source URL exists.

Card must not:
- Invent likes.
- Invent read time from raw character count as if factual.
- Hide source identity.

- [ ] **Step 6: UX responsive rules**

Desktop:
- Dense dashboard/feed layout.
- Source status row visible.
- Three-column cards only when width allows readable content.

Mobile:
- Single-column cards.
- Sticky controls may wrap, but no horizontal text overflow.
- Import button remains visible and reachable.

- [ ] **Step 7: Verify frontend**

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\web"
npx.cmd eslint src/
npx.cmd next build
```

Expected: both pass.

- [ ] **Step 8: Commit**

```powershell
git add packages/web/src/lib/types.ts packages/web/src/app/(main)/digest
git commit -m "feat: make digest page source-backed"
```

## Task 7: Backend Quality Gate and API Acceptance

**Files:**
- Update: `docs/codex-handoff/digest-implementation-log.md`

- [ ] **Step 1: Full backend PJR**

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\api"
npx.cmd tsc --noEmit
npx.cmd nest build
npx.cmd jest --config ./test/jest-e2e.json --runInBand
```

Expected:
- `tsc` no output/errors.
- `nest build` succeeds.
- Jest all suites pass. If Today AI outage tests still fail, fix root cause or record as separate blocker; do not claim product-ready.

- [ ] **Step 2: Manual API checks with JWT**

Start backend and run:

```powershell
$body = '{"email":"digest-audit@coach.dev","name":"Digest Auditor","invite_code":"COACH2026"}'
$token = (Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -ContentType "application/json" -Body $body).access_token
Invoke-RestMethod -Uri "http://localhost:3002/api/feed/sources" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3002/api/feed/import" -Method POST -ContentType "application/json" -Headers @{ Authorization = "Bearer $token" } -Body '{}'
Invoke-RestMethod -Uri "http://localhost:3002/api/feed?source_kind=xhs" -Headers @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:3002/api/feed/runs" -Headers @{ Authorization = "Bearer $token" }
```

Expected:
- Sources list returns configured sources.
- Import returns run records, not 500.
- Feed returns array.
- Runs returns array with status/counts/errors.

- [ ] **Step 3: AI complex scenario**

With real CloudDreamAI env configured, run one XHS or manual candidate through classifier containing:
- PDD and ByteDance both mentioned.
- One company is target interview company, the other is comparison.
- Role is ambiguous.

Expected:
- Classification chooses only the target interview company.
- Summary says uncertainty when role cannot be proven.
- No invented salary or offer result.

Record exact prompt/output summary in `digest-implementation-log.md`, redacting secrets.

- [ ] **Step 4: Commit verification log**

```powershell
git add docs/codex-handoff/digest-implementation-log.md
git commit -m "docs: record digest backend verification"
```

## Task 8: Frontend Playwright E2E Acceptance

**Files:**
- Update: `docs/codex-handoff/digest-implementation-log.md`

This task uses Playwright/browser interaction manually. Do not replace it with only screenshots.

- [ ] **Step 1: Start services**

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion"
.\start-dev.ps1
```

If the script is unsafe or fails, fix the script in a separate root-cause task before continuing.

- [ ] **Step 2: Desktop normal flow**

Viewport: desktop width.

Flow:
1. Open `http://localhost:3001/login`.
2. Login with `admin@coach.dev`, name `Jayden`, invite code `COACH2026`.
3. Navigate to Digest/月刊.
4. Confirm source status row appears.
5. Click import.
6. Confirm loading state.
7. Confirm run status updates.
8. Filter by source.
9. Filter by category.
10. Search for a company keyword.
11. Open an external source link from a card.
12. Return to app.
13. Click write/share button.
14. Submit a user interview experience.
15. Confirm the UGC card appears and is labeled as UGC/用户内容.

Pass criteria:
- No fake fallback cards.
- No mojibake.
- Every card has visible source provenance.
- Imported items do not mix unrelated companies.

- [ ] **Step 3: Desktop edge flow**

Flow:
1. Use a keyword with no results.
2. Trigger import when XHS MCP/RSS is unavailable.
3. Submit write form empty.
4. Submit overlong title/content if UI allows typing.

Pass criteria:
- No crash.
- Error or empty state explains what happened.
- Invalid form is blocked before API or returns visible validation.

- [ ] **Step 4: Mobile normal flow**

Viewport: 390 x 844.

Repeat:
- Login.
- Open Digest.
- Source filter.
- Category filter.
- Import.
- Open card/source link.
- Write/share modal.

Pass criteria:
- No horizontal overflow.
- Buttons remain reachable.
- Text does not overlap.
- Cards are readable in one column.

- [ ] **Step 5: Record evidence**

Update `digest-implementation-log.md` with:
- Viewport.
- Flow name.
- Exact pass/fail observations.
- Screenshot paths only as supporting evidence, not as the whole test.

- [ ] **Step 6: Commit E2E log**

```powershell
git add docs/codex-handoff/digest-implementation-log.md
git commit -m "docs: record digest Playwright acceptance"
```

## Task 9: Simplify Review, PJR, and Merge

**Files:**
- Update: `docs/codex-handoff/digest-implementation-log.md`
- Update: `docs/codex-handoff/codex-to-claude-supervision-2026-05-24.md` if Claude claims completion without evidence

- [ ] **Step 1: Simplify review**

Use exported `docs/codex-handoff/skills-export/simplify.md`:
- Check Reuse: no duplicate importer logic.
- Check Quality: no fake fallbacks, no mojibake, no `any`, no loose source strings in new code.
- Check Efficiency: no per-item database query if batch dedupe can be done simply.

Record findings and fixes in the implementation log.

- [ ] **Step 2: PJR**

Backend:

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\api"
npx.cmd tsc --noEmit
npx.cmd nest build
npx.cmd jest --config ./test/jest-e2e.json --runInBand
```

Frontend:

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion\packages\web"
npx.cmd eslint src/
npx.cmd next build
```

Expected: all pass.

- [ ] **Step 3: Merge to dev**

Use exported `docs/codex-handoff/skills-export/git-merge-to-develop.md`.

```powershell
cd "E:\Agent program\HRBP\.worktrees\digest-source-ingestion"
git status --short
git checkout feature/digest-source-ingestion
git rebase dev
cd "E:\Agent program\HRBP"
git checkout dev
git merge feature/digest-source-ingestion --no-ff -m "feat: source-backed Digest ingestion"
```

- [ ] **Step 4: Post-merge smoke**

From `dev`, rerun:

```powershell
cd "E:\Agent program\HRBP\packages\api"
npx.cmd tsc --noEmit
npx.cmd nest build
cd "E:\Agent program\HRBP\packages\web"
npx.cmd eslint src/
npx.cmd next build
```

Expected: pass.

## Self-Review Checklist

- Spec coverage:
  - XHS source configuration: Task 3, Task 4, Task 7, Task 8.
  - NowCoder/source labels: Task 4 removes false fallback.
  - WeChat/public account limitation: Task 3 creates explicit source registry and avoids illegal guessed scraping.
  - No fake monthly content: Task 6.
  - CloudDreamAI auto-v2: Task 5 through existing `AiService`.
  - Daily update: Task 5 cron at 03:00 Asia/Shanghai.
  - Desktop/mobile E2E: Task 8.
  - PJR/Simplify/merge: Task 9.
- Placeholder scan:
  - No unresolved placeholder markers remain in task steps.
- Type consistency:
  - Backend and frontend both use `source_kind`, `source_name`, strict category/source unions.
