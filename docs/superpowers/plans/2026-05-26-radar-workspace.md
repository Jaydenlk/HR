# Radar Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Transform the existing single-tab Radar search page into a 4-tab intelligence workspace (Search / Company Radar / Role Radar / Trends) with real aggregation APIs, normalized quality scoring, and honest empty states. Fix the quarter filter bug. Make homepage trending tags clickable into radar search.

**Architecture:** No new routes. The existing `/newspaper/radar` page gains 4 frontend tabs controlled by `useState`. Three new backend endpoints (`/newspaper/radar/companies`, `/newspaper/radar/roles`, `/newspaper/radar/trends`) aggregate `feed_items` rows using the same `applyRadarFilters` query builder pattern. A shared `radar-helpers.ts` module provides `normalizeQualityScore`, `isUsable`, `isCandidate`, `isRejected`, `normalizeQuarter`, and `normalizeRoleCategory` --- all pure functions with unit tests. No mock data. No AI calls. All aggregation is rule-based SQL + TypeScript.

**Tech Stack:** NestJS + TypeORM + SQLite (existing), Next.js `use client` pages (existing), Playwright desktop E2E, Jest e2e tests. All code lives in the `.worktrees/newspaper-impl` worktree.

---

## Business Context

The audit (`docs/codex-handoff/monthly-newspaper-product-shape-audit.md`) confirmed:
- Radar search page exists and works, but has no company/role/trend aggregation views
- Company entity + CompanyRegistryService exist in backend but no controller endpoint exposes them
- RoleCategory entity with `question_taxonomy` exists but is not surfaced to frontend
- No weekly trend endpoint exists
- Quarter filter sends `"current"` but backend matches literal string --- returns 0 results (confirmed bug)
- Homepage trending tags are non-interactive (`cursor: default`, no `onClick`)

This plan builds the 4-tab workspace and 3 new API endpoints to close all of these gaps.

## Source Confidence Notes

- `FeedItem` entity fields verified by reading `feed-item.entity.ts`: `quality_score` (integer, default 0), `confidence` (varchar, default 'medium'), `source_url`, `content`, `company`, `role_category`, `source_kind`, `quarter`, `created_at`, `fetched_at`
- `Company` entity fields verified: `name`, `aliases`, `company_type`, `priority`, `sector`, `role_focus`
- `RoleCategory` entity fields verified: `role_key`, `label`, `aliases`, `question_taxonomy`
- `role_categories.json` seed has 12 categories with `question_taxonomy` arrays
- Existing `applyRadarFilters()` method in `newspaper.service.ts` lines 448-478 is the reuse target
- Existing e2e test pattern in `test/newspaper.e2e-spec.ts` with `seedFeedItem` helper is the test pattern to follow

## File Map

All paths relative to `.worktrees/newspaper-impl/`.

### Backend (new files)

| File | Purpose |
|------|---------|
| `packages/api/src/feed/radar-helpers.ts` | Pure functions: normalizeQualityScore, isUsable, isCandidate, isRejected, normalizeQuarter, normalizeRoleCategory, buildDominantSignal |
| `packages/api/src/feed/radar-helpers.spec.ts` | Unit tests for all radar helper functions |

### Backend (modified files)

| File | Changes |
|------|---------|
| `packages/api/src/feed/newspaper.service.ts` | Add 3 new methods: `getRadarCompanies()`, `getRadarRoles()`, `getRadarTrends()`. Fix `applyRadarFilters()` to use `normalizeQuarter()`. Import helpers from `radar-helpers.ts`. |
| `packages/api/src/feed/newspaper.controller.ts` | Add 3 new GET endpoints: `radar/companies`, `radar/roles`, `radar/trends`. |
| `packages/api/test/newspaper.e2e-spec.ts` | Add e2e tests for all 3 new endpoints + quarter filter fix. |

### Frontend (modified files)

| File | Changes |
|------|---------|
| `packages/web/src/lib/types.ts` | Add `CompanyRadarItem`, `CompanyRadarResponse`, `RoleRadarItem`, `RoleRadarResponse`, `TrendRadarResponse` interfaces. |
| `packages/web/src/app/(main)/newspaper/radar/page.tsx` | Complete rewrite to 4-tab structure. Extract existing search into SearchTab component. Add CompanyTab, RoleTab, TrendTab components. |
| `packages/web/src/app/(main)/newspaper/page.tsx` | Make trending tag pills clickable --- navigate to `/newspaper/radar` with keyword pre-filled. |

### Test files

| File | Purpose |
|------|---------|
| `packages/api/src/feed/radar-helpers.spec.ts` | Unit tests for pure helper functions |
| `packages/api/test/newspaper.e2e-spec.ts` | Extended e2e tests for new endpoints |
| `e2e/radar-workspace.spec.ts` (project root) | Playwright desktop E2E for all 4 tabs |

---

## Task 1: Backend --- normalizeQualityScore + isUsable/isCandidate/isRejected helpers

**Files:**
- Create: `packages/api/src/feed/radar-helpers.ts`
- Create: `packages/api/src/feed/radar-helpers.spec.ts`

### Steps

- [ ] **1.1** Write unit test file `packages/api/src/feed/radar-helpers.spec.ts` with test cases for `normalizeQualityScore`:
  ```typescript
  // File: packages/api/src/feed/radar-helpers.spec.ts
  import {
    normalizeQualityScore,
    isUsable,
    isCandidate,
    isRejected,
    normalizeQuarter,
    normalizeRoleCategory,
    buildDominantSignal,
  } from './radar-helpers';

  describe('normalizeQualityScore', () => {
    it('returns 0 for null', () => expect(normalizeQualityScore(null)).toBe(0));
    it('returns 0 for undefined', () => expect(normalizeQualityScore(undefined as unknown as number | null)).toBe(0));
    it('returns 0 for -1 (rejected)', () => expect(normalizeQualityScore(-1)).toBe(0));
    it('returns 0 for negative values', () => expect(normalizeQualityScore(-5)).toBe(0));
    it('scales 0-10 range to 0-100', () => {
      expect(normalizeQualityScore(0)).toBe(0);
      expect(normalizeQualityScore(5)).toBe(50);
      expect(normalizeQualityScore(10)).toBe(100);
    });
    it('passes through 11-100 range as-is', () => {
      expect(normalizeQualityScore(50)).toBe(50);
      expect(normalizeQualityScore(100)).toBe(100);
    });
    it('clamps values above 100', () => expect(normalizeQualityScore(150)).toBe(100));
  });
  ```

- [ ] **1.2** Add test cases for `isUsable`:
  ```typescript
  describe('isUsable', () => {
    const baseItem = {
      quality_score: 7,          // normalizes to 70
      confidence: 'high' as const,
      source_url: 'https://example.com',
      content: 'a'.repeat(200),
    };

    it('returns true for high quality + high confidence + valid url + long content', () => {
      expect(isUsable(baseItem)).toBe(true);
    });
    it('returns true for medium confidence', () => {
      expect(isUsable({ ...baseItem, confidence: 'medium' })).toBe(true);
    });
    it('returns false for low confidence', () => {
      expect(isUsable({ ...baseItem, confidence: 'low' })).toBe(false);
    });
    it('returns false for normalized quality < 50', () => {
      expect(isUsable({ ...baseItem, quality_score: 3 })).toBe(false);  // 30
    });
    it('returns false for null source_url', () => {
      expect(isUsable({ ...baseItem, source_url: null })).toBe(false);
    });
    it('returns false for empty source_url', () => {
      expect(isUsable({ ...baseItem, source_url: '' })).toBe(false);
    });
    it('returns false for content < 200 chars', () => {
      expect(isUsable({ ...baseItem, content: 'short' })).toBe(false);
    });
  });
  ```

- [ ] **1.3** Add test cases for `isCandidate` and `isRejected`:
  ```typescript
  describe('isCandidate', () => {
    it('returns true for low confidence but not rejected', () => {
      expect(isCandidate({
        quality_score: 7, confidence: 'low',
        source_url: 'https://example.com', content: 'a'.repeat(200),
      })).toBe(true);
    });
    it('returns false for rejected items (quality_score = -1)', () => {
      expect(isCandidate({
        quality_score: -1, confidence: 'low',
        source_url: 'https://example.com', content: 'a'.repeat(200),
      })).toBe(false);
    });
    it('returns false for usable items', () => {
      expect(isCandidate({
        quality_score: 7, confidence: 'high',
        source_url: 'https://example.com', content: 'a'.repeat(200),
      })).toBe(false);
    });
  });

  describe('isRejected', () => {
    it('returns true for quality_score = -1', () => {
      expect(isRejected({ quality_score: -1 })).toBe(true);
    });
    it('returns false for quality_score >= 0', () => {
      expect(isRejected({ quality_score: 0 })).toBe(false);
    });
  });
  ```

- [ ] **1.4** Add test cases for `normalizeQuarter`:
  ```typescript
  describe('normalizeQuarter', () => {
    it('maps "current" to actual quarter string', () => {
      const result = normalizeQuarter('current');
      expect(result).toMatch(/^\d{4}Q[1-4]$/);
    });
    it('maps "previous" to previous quarter', () => {
      const result = normalizeQuarter('previous');
      expect(result).toMatch(/^\d{4}Q[1-4]$/);
      // previous should differ from current
      expect(result).not.toBe(normalizeQuarter('current'));
    });
    it('passes through "2026Q2" unchanged', () => {
      expect(normalizeQuarter('2026Q2')).toBe('2026Q2');
    });
    it('returns null for empty string', () => {
      expect(normalizeQuarter('')).toBeNull();
    });
    it('returns null for literal "null"', () => {
      expect(normalizeQuarter('null')).toBeNull();
    });
    it('returns null for "all"', () => {
      expect(normalizeQuarter('all')).toBeNull();
    });
  });
  ```

- [ ] **1.5** Add test cases for `normalizeRoleCategory` and `buildDominantSignal`:
  ```typescript
  describe('normalizeRoleCategory', () => {
    const KNOWN_KEYS = ['backend', 'frontend', 'algorithm', 'embedded', 'product',
      'operations', 'hr', 'design', 'data', 'finance', 'consulting', 'marketing'];

    it('returns value unchanged for known keys', () => {
      expect(normalizeRoleCategory('backend')).toBe('backend');
      expect(normalizeRoleCategory('product')).toBe('product');
    });
    it('returns "general" for null', () => {
      expect(normalizeRoleCategory(null)).toBe('general');
    });
    it('returns "general" for empty string', () => {
      expect(normalizeRoleCategory('')).toBe('general');
    });
    it('returns "general" for literal "null"', () => {
      expect(normalizeRoleCategory('null')).toBe('general');
    });
    it('returns "general" for unknown values', () => {
      expect(normalizeRoleCategory('mystery_role')).toBe('general');
    });
  });

  describe('buildDominantSignal', () => {
    it('returns role concentration signal when one role > 50%', () => {
      const result = buildDominantSignal({
        roleCounts: new Map([['backend', 8], ['frontend', 2]]),
        totalCount: 10,
        xhsCount: 5, nowcoderCount: 5,
        hasRecentItems: false,
        usableCount: 5,
      });
      expect(result).toContain('backend');
      expect(result).toContain('集中');
    });
    it('returns xhs voice signal when xhs > nowcoder * 2', () => {
      const result = buildDominantSignal({
        roleCounts: new Map([['backend', 3], ['frontend', 3]]),
        totalCount: 6,
        xhsCount: 10, nowcoderCount: 2,
        hasRecentItems: false,
        usableCount: 5,
      });
      expect(result).toContain('用户之声活跃');
    });
    it('returns weekly signal when recent items exist', () => {
      const result = buildDominantSignal({
        roleCounts: new Map([['backend', 3], ['frontend', 3]]),
        totalCount: 6,
        xhsCount: 3, nowcoderCount: 3,
        hasRecentItems: true,
        usableCount: 5,
      });
      expect(result).toContain('本周有新面经');
    });
    it('returns no-data signal when usableCount = 0', () => {
      const result = buildDominantSignal({
        roleCounts: new Map(),
        totalCount: 0,
        xhsCount: 0, nowcoderCount: 0,
        hasRecentItems: false,
        usableCount: 0,
      });
      expect(result).toContain('暂无高质量数据');
    });
  });
  ```

- [ ] **1.6** Implement `packages/api/src/feed/radar-helpers.ts` to pass all tests:
  ```typescript
  // File: packages/api/src/feed/radar-helpers.ts

  // --- Quality Score Normalization ---

  export function normalizeQualityScore(raw: number | null): number {
    if (raw === null || raw === undefined || raw < 0) return 0;
    if (raw <= 10) return raw * 10;
    if (raw > 100) return 100;
    return raw;
  }

  // --- Usable / Candidate / Rejected classification ---

  interface UsableCheckFields {
    quality_score: number;
    confidence: string;
    source_url: string | null;
    content: string;
  }

  export function isUsable(item: UsableCheckFields): boolean {
    return (
      normalizeQualityScore(item.quality_score) >= 50 &&
      (item.confidence === 'medium' || item.confidence === 'high') &&
      !!item.source_url &&
      item.source_url.trim() !== '' &&
      item.content.length >= 200
    );
  }

  export function isCandidate(item: UsableCheckFields): boolean {
    return !isRejected(item) && !isUsable(item);
  }

  export function isRejected(item: Pick<UsableCheckFields, 'quality_score'>): boolean {
    return item.quality_score === -1;
  }

  // --- Quarter Normalization ---

  export function normalizeQuarter(input: string): string | null {
    if (!input || input === 'null' || input === 'all') return null;
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
    return input;
  }

  // --- Role Category Normalization ---

  const KNOWN_ROLE_KEYS = new Set([
    'backend', 'frontend', 'algorithm', 'embedded', 'product',
    'operations', 'hr', 'design', 'data', 'finance', 'consulting', 'marketing',
  ]);

  export function normalizeRoleCategory(value: string | null): string {
    if (!value || value === 'null' || value.trim() === '') return 'general';
    if (KNOWN_ROLE_KEYS.has(value)) return value;
    return 'general';
  }

  // --- Dominant Signal Builder ---

  interface DominantSignalInput {
    roleCounts: Map<string, number>;
    totalCount: number;
    xhsCount: number;
    nowcoderCount: number;
    hasRecentItems: boolean;
    usableCount: number;
  }

  export function buildDominantSignal(input: DominantSignalInput): string | null {
    if (input.usableCount === 0) return '暂无高质量数据';

    // Rule 1: dominant role
    for (const [role, count] of input.roleCounts) {
      if (input.totalCount > 0 && count / input.totalCount > 0.5) {
        return `${role}岗面经集中`;
      }
    }

    // Rule 2: xhs voice
    if (input.xhsCount > input.nowcoderCount * 2) {
      return '用户之声活跃';
    }

    // Rule 3: recent activity
    if (input.hasRecentItems) {
      return '本周有新面经';
    }

    return null;
  }
  ```

- [ ] **1.7** Run unit tests to verify all pass:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest src/feed/radar-helpers.spec.ts --verbose
  ```

- [ ] **1.8** Commit:
  ```bash
  git add packages/api/src/feed/radar-helpers.ts packages/api/src/feed/radar-helpers.spec.ts
  git commit -m "feat(radar): add normalizeQualityScore, isUsable, normalizeQuarter, normalizeRoleCategory helpers with unit tests"
  ```

---

## Task 2: Backend --- GET /newspaper/radar/companies endpoint

**Files:**
- Modify: `packages/api/src/feed/newspaper.service.ts`
- Modify: `packages/api/src/feed/newspaper.controller.ts`
- Modify: `packages/api/test/newspaper.e2e-spec.ts`

### Steps

- [ ] **2.1** Write e2e tests first in `packages/api/test/newspaper.e2e-spec.ts`. Add a new `describe` block after the existing radar tests:
  ```typescript
  describe('GET /api/newspaper/radar/companies', () => {
    it('returns CompanyRadarResponse with companies array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.companies)).toBe(true);
      expect(typeof res.body.total_companies).toBe('number');
      expect(typeof res.body.generated_at).toBe('string');
    });

    it('each company has required CompanyRadarItem fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      if (res.body.companies.length > 0) {
        const c = res.body.companies[0];
        expect(typeof c.company).toBe('string');
        expect(typeof c.total_count).toBe('number');
        expect(typeof c.usable_count).toBe('number');
        expect(typeof c.candidate_count).toBe('number');
        expect(typeof c.rejected_count).toBe('number');
        expect(typeof c.xhs_count).toBe('number');
        expect(typeof c.nowcoder_count).toBe('number');
        expect(typeof c.wechat_count).toBe('number');
        expect(Array.isArray(c.top_roles)).toBe(true);
        expect(typeof c.quality_score_avg).toBe('number');
      }
    });

    it('source counts sum to total_count for each company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.xhs_count + c.nowcoder_count + c.wechat_count).toBe(c.total_count);
      }
    });

    it('usable + candidate + rejected = total for each company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.usable_count + c.candidate_count + c.rejected_count).toBe(c.total_count);
      }
    });

    it('excludes items with null company', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const c of res.body.companies) {
        expect(c.company).not.toBeNull();
        expect(c.company).not.toBe('');
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/companies');
      expect(res.status).toBe(401);
    });
  });
  ```

- [ ] **2.2** Add response interfaces to `newspaper.service.ts` (after existing `RadarResult` interface, around line 67):
  ```typescript
  // Add these after the RadarResult interface

  export interface CompanyRadarItem {
    company: string;
    company_id: string | null;
    company_type: string | null;
    priority: string | null;
    sector: string | null;
    total_count: number;
    usable_count: number;
    low_confidence_count: number;
    candidate_count: number;
    rejected_count: number;
    xhs_count: number;
    nowcoder_count: number;
    wechat_count: number;
    top_roles: string[];
    high_confidence_count: number;
    quality_score_avg: number;
    latest_collected_at: string | null;
    dominant_signal: string | null;
  }

  export interface CompanyRadarResponse {
    companies: CompanyRadarItem[];
    total_companies: number;
    generated_at: string;
  }
  ```

- [ ] **2.3** Add `getRadarCompanies()` method to `NewspaperService` class. This method queries all feed_items with external sources, groups by company in TypeScript (not a massive SQL), and applies helper functions from `radar-helpers.ts`:
  ```typescript
  // Import at top of newspaper.service.ts:
  import {
    normalizeQualityScore,
    isUsable,
    isCandidate,
    isRejected,
    normalizeRoleCategory,
    buildDominantSignal,
  } from './radar-helpers';

  // Add method to NewspaperService class:
  async getRadarCompanies(): Promise<CompanyRadarResponse> {
    const qb = this.feedRepo.createQueryBuilder('item');
    qb.andWhere('item.source_kind IN (:...externalSources)', {
      externalSources: ['xhs', 'nowcoder', 'wechat'],
    });
    qb.andWhere('item.company IS NOT NULL');
    qb.andWhere("item.company != ''");

    const items = await qb.getMany();

    // Group by company
    const byCompany = new Map<string, FeedItem[]>();
    for (const item of items) {
      const key = item.company!;
      const list = byCompany.get(key) || [];
      list.push(item);
      byCompany.set(key, list);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const companies: CompanyRadarItem[] = [];
    for (const [company, companyItems] of byCompany) {
      const usableItems = companyItems.filter(isUsable);
      const candidateItems = companyItems.filter(isCandidate);
      const rejectedItems = companyItems.filter(isRejected);

      const xhsCount = companyItems.filter(i => i.source_kind === 'xhs').length;
      const nowcoderCount = companyItems.filter(i => i.source_kind === 'nowcoder').length;
      const wechatCount = companyItems.filter(i => i.source_kind === 'wechat').length;

      // Top roles by count
      const roleCounts = new Map<string, number>();
      for (const item of companyItems) {
        const rc = normalizeRoleCategory(item.role_category);
        if (rc !== 'general') {
          roleCounts.set(rc, (roleCounts.get(rc) ?? 0) + 1);
        }
      }
      const topRoles = [...roleCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([role]) => role);

      // Quality score avg (usable items only)
      const qualityScoreAvg = usableItems.length > 0
        ? Math.round(usableItems.reduce((sum, i) => sum + normalizeQualityScore(i.quality_score), 0) / usableItems.length)
        : 0;

      // Latest collected_at
      const latestDate = companyItems
        .map(i => i.fetched_at ?? i.created_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

      // Has recent items (7 days)
      const hasRecentItems = companyItems.some(
        i => (i.created_at ? new Date(i.created_at).getTime() : 0) > sevenDaysAgo.getTime(),
      );

      const signal = buildDominantSignal({
        roleCounts,
        totalCount: companyItems.length,
        xhsCount,
        nowcoderCount,
        hasRecentItems,
        usableCount: usableItems.length,
      });

      companies.push({
        company,
        company_id: companyItems[0].company_id,
        company_type: null,   // enriched in step 2.4
        priority: null,
        sector: null,
        total_count: companyItems.length,
        usable_count: usableItems.length,
        low_confidence_count: companyItems.filter(i => i.confidence === 'low').length,
        candidate_count: candidateItems.length,
        rejected_count: rejectedItems.length,
        xhs_count: xhsCount,
        nowcoder_count: nowcoderCount,
        wechat_count: wechatCount,
        top_roles: topRoles,
        high_confidence_count: companyItems.filter(i => i.confidence === 'high').length,
        quality_score_avg: qualityScoreAvg,
        latest_collected_at: latestDate ? new Date(latestDate).toISOString() : null,
        dominant_signal: signal,
      });
    }

    // Sort: usable_count DESC, quality_score_avg DESC
    companies.sort((a, b) =>
      b.usable_count - a.usable_count || b.quality_score_avg - a.quality_score_avg,
    );

    return {
      companies,
      total_companies: companies.length,
      generated_at: new Date().toISOString(),
    };
  }
  ```

- [ ] **2.4** Enrich company metadata from Company entity. Inject `CompanyRegistryService` into `NewspaperService` constructor and use it to look up `company_type`, `priority`, `sector` for each company in the response. Update `feed.module.ts` only if `CompanyRegistryService` is not already injected (it is already a provider in the module, but `NewspaperService` does not import it yet):
  ```typescript
  // In NewspaperService constructor, add:
  constructor(
    // ... existing injections ...
    private readonly companyRegistry: CompanyRegistryService,
  ) {}

  // In getRadarCompanies(), after building companies array, before sorting:
  // Enrich from Company entity
  const allCompanyEntities = await this.companyRegistry.findAll();
  const companyMap = new Map(allCompanyEntities.map(c => [c.name.toLowerCase(), c]));
  for (const item of companies) {
    const entity = companyMap.get(item.company.toLowerCase());
    if (entity) {
      item.company_type = entity.company_type;
      item.priority = entity.priority;
      item.sector = entity.sector ?? null;
    }
  }
  ```

  **Important:** `CompanyRegistryService` is already registered in `feed.module.ts` providers. But it needs to be injected into `NewspaperService`. Add to `NewspaperService` constructor parameters. No module changes needed since both are in the same module.

- [ ] **2.5** Add controller endpoint in `packages/api/src/feed/newspaper.controller.ts`:
  ```typescript
  @Get('radar/companies')
  getRadarCompanies() {
    return this.newspaper.getRadarCompanies();
  }
  ```
  **Note:** This route MUST be placed BEFORE the `@Get('radar')` route in the controller, otherwise NestJS will match `companies` as a query parameter to the generic radar route. Alternatively, since NestJS matches routes in definition order, place the more specific routes first.

- [ ] **2.6** Run e2e tests:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest test/newspaper.e2e-spec.ts --verbose --testNamePattern="radar/companies"
  ```

- [ ] **2.7** Commit:
  ```bash
  git add packages/api/src/feed/newspaper.service.ts packages/api/src/feed/newspaper.controller.ts packages/api/test/newspaper.e2e-spec.ts
  git commit -m "feat(radar): add GET /newspaper/radar/companies endpoint with company aggregation"
  ```

---

## Task 3: Backend --- GET /newspaper/radar/roles endpoint

**Files:**
- Modify: `packages/api/src/feed/newspaper.service.ts`
- Modify: `packages/api/src/feed/newspaper.controller.ts`
- Modify: `packages/api/test/newspaper.e2e-spec.ts`

### Steps

- [ ] **3.1** Write e2e tests first:
  ```typescript
  describe('GET /api/newspaper/radar/roles', () => {
    it('returns RoleRadarResponse with roles array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roles)).toBe(true);
      expect(typeof res.body.total_roles).toBe('number');
      expect(typeof res.body.generated_at).toBe('string');
    });

    it('role_category values are normalized (no "null" or fragments)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const r of res.body.roles) {
        expect(r.role_category).not.toBe('null');
        expect(r.role_category).not.toBe('');
        expect(r.role_category).not.toBeNull();
      }
    });

    it('each role has representative_posts with source_url', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const r of res.body.roles) {
        expect(Array.isArray(r.representative_posts)).toBe(true);
        for (const post of r.representative_posts) {
          expect(typeof post.title).toBe('string');
          expect(typeof post.source_url).toBe('string');
          expect(typeof post.source_kind).toBe('string');
        }
      }
    });

    it('each role has common_question_keywords array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const r of res.body.roles) {
        expect(Array.isArray(r.common_question_keywords)).toBe(true);
      }
    });

    it('source counts sum correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const r of res.body.roles) {
        expect(r.xhs_count + r.nowcoder_count + r.wechat_count).toBe(r.total_count);
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/roles');
      expect(res.status).toBe(401);
    });
  });
  ```

- [ ] **3.2** Add response interfaces to `newspaper.service.ts`:
  ```typescript
  export interface RoleRadarItem {
    role_category: string;
    label: string;
    total_count: number;
    usable_count: number;
    candidate_count: number;
    rejected_count: number;
    xhs_count: number;
    nowcoder_count: number;
    wechat_count: number;
    top_companies: string[];
    companies_covered: number;
    common_question_keywords: string[];
    representative_posts: Array<{
      title: string;
      company: string | null;
      source_url: string;
      source_kind: string;
    }>;
  }

  export interface RoleRadarResponse {
    roles: RoleRadarItem[];
    total_roles: number;
    generated_at: string;
  }
  ```

- [ ] **3.3** Add `getRadarRoles()` method to `NewspaperService`:
  ```typescript
  async getRadarRoles(): Promise<RoleRadarResponse> {
    const qb = this.feedRepo.createQueryBuilder('item');
    qb.andWhere('item.source_kind IN (:...externalSources)', {
      externalSources: ['xhs', 'nowcoder', 'wechat'],
    });

    const items = await qb.getMany();

    // Group by normalized role_category
    const byRole = new Map<string, FeedItem[]>();
    for (const item of items) {
      const rc = normalizeRoleCategory(item.role_category);
      const list = byRole.get(rc) || [];
      list.push(item);
      byRole.set(rc, list);
    }

    // Load role category seed data for labels and question_taxonomy
    const roleCategoryEntities = await this.companyRegistry.findAllRoleCategories();
    const rcMap = new Map(roleCategoryEntities.map(rc => [rc.role_key, rc]));

    const roles: RoleRadarItem[] = [];
    for (const [roleCategory, roleItems] of byRole) {
      const usableItems = roleItems.filter(isUsable);
      const candidateItems = roleItems.filter(isCandidate);
      const rejectedItems = roleItems.filter(isRejected);

      // Top companies by count
      const companyCounts = new Map<string, number>();
      const companySet = new Set<string>();
      for (const item of roleItems) {
        if (item.company) {
          companyCounts.set(item.company, (companyCounts.get(item.company) ?? 0) + 1);
          companySet.add(item.company);
        }
      }
      const topCompanies = [...companyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([company]) => company);

      // question_taxonomy from seed
      const rcEntity = rcMap.get(roleCategory);
      const commonQuestionKeywords = rcEntity?.question_taxonomy ?? [];

      // Representative posts: usable, highest quality, top 3
      const representativePosts = usableItems
        .sort((a, b) => normalizeQualityScore(b.quality_score) - normalizeQualityScore(a.quality_score))
        .slice(0, 3)
        .map(item => ({
          title: item.title,
          company: item.company,
          source_url: item.source_url!,
          source_kind: item.source_kind,
        }));

      roles.push({
        role_category: roleCategory,
        label: rcEntity?.label ?? roleCategory,
        total_count: roleItems.length,
        usable_count: usableItems.length,
        candidate_count: candidateItems.length,
        rejected_count: rejectedItems.length,
        xhs_count: roleItems.filter(i => i.source_kind === 'xhs').length,
        nowcoder_count: roleItems.filter(i => i.source_kind === 'nowcoder').length,
        wechat_count: roleItems.filter(i => i.source_kind === 'wechat').length,
        top_companies: topCompanies,
        companies_covered: companySet.size,
        common_question_keywords: commonQuestionKeywords,
        representative_posts: representativePosts,
      });
    }

    // Sort by total_count DESC
    roles.sort((a, b) => b.total_count - a.total_count);

    return {
      roles,
      total_roles: roles.length,
      generated_at: new Date().toISOString(),
    };
  }
  ```

- [ ] **3.4** Add `findAllRoleCategories()` method to `CompanyRegistryService` in `packages/api/src/feed/company-registry.service.ts`:
  ```typescript
  findAllRoleCategories(): Promise<RoleCategory[]> {
    return this.roleCategoryRepo.find({ order: { role_key: 'ASC' } });
  }
  ```

- [ ] **3.5** Add controller endpoint in `newspaper.controller.ts` (before the generic `@Get('radar')` route):
  ```typescript
  @Get('radar/roles')
  getRadarRoles() {
    return this.newspaper.getRadarRoles();
  }
  ```

- [ ] **3.6** Run e2e tests:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest test/newspaper.e2e-spec.ts --verbose --testNamePattern="radar/roles"
  ```

- [ ] **3.7** Commit:
  ```bash
  git add packages/api/src/feed/newspaper.service.ts packages/api/src/feed/newspaper.controller.ts packages/api/src/feed/company-registry.service.ts packages/api/test/newspaper.e2e-spec.ts
  git commit -m "feat(radar): add GET /newspaper/radar/roles endpoint with role_category aggregation"
  ```

---

## Task 4: Backend --- GET /newspaper/radar/trends endpoint

**Files:**
- Modify: `packages/api/src/feed/newspaper.service.ts`
- Modify: `packages/api/src/feed/newspaper.controller.ts`
- Modify: `packages/api/test/newspaper.e2e-spec.ts`

### Steps

- [ ] **4.1** Write e2e tests first:
  ```typescript
  describe('GET /api/newspaper/radar/trends', () => {
    it('returns TrendRadarResponse with period and this_week', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.period).toBeDefined();
      expect(typeof res.body.period.current_start).toBe('string');
      expect(typeof res.body.period.current_end).toBe('string');
      expect(res.body.this_week).toBeDefined();
      expect(typeof res.body.this_week.new_items).toBe('number');
    });

    it('has comparison with has_baseline flag', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.comparison.has_baseline).toBe('boolean');
      expect(typeof res.body.comparison.message).toBe('string');
    });

    it('message is honest when no baseline exists', async () => {
      // With only recently seeded items, previous period is likely empty
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      if (!res.body.comparison.has_baseline) {
        expect(res.body.comparison.message).toContain('暂无足够历史数据');
        expect(res.body.comparison.item_count_delta).toBe(0);
      }
    });

    it('hot_posts have source_url', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const post of res.body.hot_posts) {
        expect(typeof post.title).toBe('string');
        expect(typeof post.source_url).toBe('string');
        expect(typeof post.source_kind).toBe('string');
      }
    });

    it('this_week.top_sources has source_kind and count', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      for (const src of res.body.this_week.top_sources) {
        expect(typeof src.source_kind).toBe('string');
        expect(typeof src.count).toBe('number');
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar/trends');
      expect(res.status).toBe(401);
    });
  });
  ```

- [ ] **4.2** Add response interface to `newspaper.service.ts`:
  ```typescript
  export interface TrendRadarResponse {
    period: {
      current_start: string;
      current_end: string;
      previous_start: string;
      previous_end: string;
    };
    this_week: {
      new_items: number;
      new_companies: string[];
      new_role_categories: string[];
      top_sources: Array<{ source_kind: string; count: number }>;
    };
    comparison: {
      has_baseline: boolean;
      item_count_delta: number;
      item_count_previous: number;
      message: string;
    };
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

- [ ] **4.3** Add `getRadarTrends()` method to `NewspaperService`:
  ```typescript
  async getRadarTrends(): Promise<TrendRadarResponse> {
    const now = new Date();
    const currentEnd = now;
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - 7);

    // Current period items
    const currentItems = await this.feedRepo
      .createQueryBuilder('item')
      .where('item.source_kind IN (:...sources)', { sources: ['xhs', 'nowcoder', 'wechat'] })
      .andWhere('item.created_at >= :start', { start: currentStart.toISOString() })
      .andWhere('item.created_at <= :end', { end: currentEnd.toISOString() })
      .getMany();

    // Previous period items
    const previousItems = await this.feedRepo
      .createQueryBuilder('item')
      .where('item.source_kind IN (:...sources)', { sources: ['xhs', 'nowcoder', 'wechat'] })
      .andWhere('item.created_at >= :start', { start: previousStart.toISOString() })
      .andWhere('item.created_at < :end', { end: currentStart.toISOString() })
      .getMany();

    // New companies this week (in current but not in previous)
    const prevCompanies = new Set(previousItems.map(i => i.company).filter(Boolean));
    const currCompanies = new Set(currentItems.map(i => i.company).filter(Boolean));
    const newCompanies = [...currCompanies].filter(c => !prevCompanies.has(c));

    // New role categories this week
    const prevRoles = new Set(previousItems.map(i => normalizeRoleCategory(i.role_category)).filter(r => r !== 'general'));
    const currRoles = new Set(currentItems.map(i => normalizeRoleCategory(i.role_category)).filter(r => r !== 'general'));
    const newRoleCategories = [...currRoles].filter(r => !prevRoles.has(r));

    // Top sources this week
    const sourceCounts = new Map<string, number>();
    for (const item of currentItems) {
      sourceCounts.set(item.source_kind, (sourceCounts.get(item.source_kind) ?? 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source_kind, count]) => ({ source_kind, count }));

    // Comparison
    const hasBaseline = previousItems.length > 0;
    const delta = currentItems.length - previousItems.length;
    let message: string;
    if (!hasBaseline) {
      message = '暂无足够历史数据计算环比';
    } else {
      const pct = previousItems.length > 0
        ? Math.round((delta / previousItems.length) * 100)
        : 0;
      if (delta > 0) {
        message = `本周新增 ${currentItems.length} 条面经，环比增长 ${pct}%`;
      } else if (delta < 0) {
        message = `本周新增 ${currentItems.length} 条面经，环比减少 ${Math.abs(pct)}%`;
      } else {
        message = `本周新增 ${currentItems.length} 条面经，与上周持平`;
      }
    }

    // Hot posts: usable items from current period, most recent 5
    const hotPosts = currentItems
      .filter(isUsable)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(item => ({
        title: item.title,
        company: item.company,
        role_category: item.role_category,
        source_kind: item.source_kind,
        source_url: item.source_url!,
        created_at: new Date(item.created_at).toISOString(),
      }));

    return {
      period: {
        current_start: currentStart.toISOString(),
        current_end: currentEnd.toISOString(),
        previous_start: previousStart.toISOString(),
        previous_end: previousEnd.toISOString(),
      },
      this_week: {
        new_items: currentItems.length,
        new_companies: newCompanies as string[],
        new_role_categories: newRoleCategories,
        top_sources: topSources,
      },
      comparison: {
        has_baseline: hasBaseline,
        item_count_delta: hasBaseline ? delta : 0,
        item_count_previous: previousItems.length,
        message,
      },
      hot_posts: hotPosts,
    };
  }
  ```

- [ ] **4.4** Add controller endpoint (before the generic `@Get('radar')` route):
  ```typescript
  @Get('radar/trends')
  getRadarTrends() {
    return this.newspaper.getRadarTrends();
  }
  ```

- [ ] **4.5** Verify controller route ordering. The final `newspaper.controller.ts` route order MUST be:
  1. `@Get()` --- getEdition
  2. `@Get('radar/companies')` --- getRadarCompanies
  3. `@Get('radar/roles')` --- getRadarRoles
  4. `@Get('radar/trends')` --- getRadarTrends
  5. `@Get('radar')` --- getRadar (generic, must be last among radar/* routes)

- [ ] **4.6** Run e2e tests:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest test/newspaper.e2e-spec.ts --verbose --testNamePattern="radar/trends"
  ```

- [ ] **4.7** Commit:
  ```bash
  git add packages/api/src/feed/newspaper.service.ts packages/api/src/feed/newspaper.controller.ts packages/api/test/newspaper.e2e-spec.ts
  git commit -m "feat(radar): add GET /newspaper/radar/trends endpoint with weekly comparison"
  ```

---

## Task 5: Backend --- Fix quarter filter bug

**Files:**
- Modify: `packages/api/src/feed/newspaper.service.ts` (the `applyRadarFilters` method)
- Modify: `packages/api/test/newspaper.e2e-spec.ts`

### Steps

- [ ] **5.1** Write e2e tests for the quarter fix:
  ```typescript
  describe('Quarter filter fix', () => {
    it('quarter=current maps to actual quarter string (e.g. 2026Q2)', async () => {
      // Seed an item with explicit quarter=2026Q2
      await seedFeedItem(feedRepo, {
        title: 'Q2 quarter test item',
        quarter: '2026Q2',
        source_kind: 'xhs',
        source_url: 'https://www.xiaohongshu.com/post/quarter-test',
      });

      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?quarter=current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should find items (the one we just seeded has quarter=2026Q2)
      // Without the fix, this would return 0 because it matches literal "current"
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('quarter=all returns all items (no quarter filter)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?quarter=all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // Should include items regardless of quarter
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('quarter=null (literal string) returns all items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?quarter=null')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('empty quarter string returns all items', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/newspaper/radar?quarter=')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **5.2** Fix `applyRadarFilters()` in `newspaper.service.ts`. Replace the quarter handling block (line ~470):

  **Before (current buggy code):**
  ```typescript
  if (query.quarter) {
    qb.andWhere('item.quarter = :quarter', { quarter: query.quarter });
  }
  ```

  **After (fixed):**
  ```typescript
  if (query.quarter) {
    const normalized = normalizeQuarter(query.quarter);
    if (normalized !== null) {
      qb.andWhere('item.quarter = :quarter', { quarter: normalized });
    }
    // null means "all" --- don't add a quarter filter
  }
  ```

  This uses the `normalizeQuarter` function from `radar-helpers.ts` (already imported in Task 2). The function maps:
  - `"current"` -> `"2026Q2"` (actual current quarter)
  - `"previous"` -> `"2026Q1"` (previous quarter)
  - `"null"`, `"all"`, `""` -> `null` (no filter, show all)
  - `"2026Q2"` -> `"2026Q2"` (passthrough)

- [ ] **5.3** Run all radar e2e tests to confirm fix and no regressions:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest test/newspaper.e2e-spec.ts --verbose --testNamePattern="radar"
  ```

- [ ] **5.4** Commit:
  ```bash
  git add packages/api/src/feed/newspaper.service.ts packages/api/test/newspaper.e2e-spec.ts
  git commit -m "fix(radar): normalizeQuarter in applyRadarFilters — 'current' now maps to actual quarter string"
  ```

---

## Task 6: Frontend --- Radar page tab structure

**Files:**
- Modify: `packages/web/src/app/(main)/newspaper/radar/page.tsx`

### Steps

- [ ] **6.1** Add tab type and state management at the top of the page component. Replace the current `RadarPage` component structure with a tab-aware version:
  ```typescript
  type RadarTab = 'search' | 'company' | 'role' | 'trend';

  const TAB_LIST: Array<{ value: RadarTab; label: string }> = [
    { value: 'search', label: '搜索' },
    { value: 'company', label: '公司雷达' },
    { value: 'role', label: '岗位雷达' },
    { value: 'trend', label: '趋势' },
  ];
  ```

- [ ] **6.2** Add `useState<RadarTab>('search')` to the `RadarPage` component. Extract the entire existing search UI (filter bar + stats bar + results grid) into a `SearchTab` component that receives `filters`, `updateFilter`, `result`, `loading`, `pageError` as props. The main component renders:
  ```tsx
  <main className="radar-shell">
    <style>{RADAR_CSS}</style>

    {/* Header */}
    <section className="radar-header">
      <div>
        <Link href="/newspaper" className="back-link">
          <ArrowLeft size={16} />
          月刊
        </Link>
        <h1>面经雷达</h1>
        <p className="subtitle">
          按公司、岗位、来源搜索面经和求职情报
        </p>
      </div>
    </section>

    {/* Tab Bar */}
    <div className="radar-tabs" role="tablist" aria-label="雷达模式">
      {TAB_LIST.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.value}
          className={`radar-tab${activeTab === tab.value ? ' active' : ''}`}
          onClick={() => setActiveTab(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>

    {/* Tab Content */}
    {activeTab === 'search' && <SearchTab ... />}
    {activeTab === 'company' && <CompanyTab onViewCompany={handleViewCompany} />}
    {activeTab === 'role' && <RoleTab onViewRole={handleViewRole} />}
    {activeTab === 'trend' && <TrendTab />}
  </main>
  ```

- [ ] **6.3** Implement `handleViewCompany` and `handleViewRole` callbacks that switch to search tab with the filter pre-filled:
  ```typescript
  const handleViewCompany = useCallback((company: string) => {
    setFilters(prev => ({ ...prev, company, page: 1 }));
    setActiveTab('search');
  }, []);

  const handleViewRole = useCallback((roleCategory: string) => {
    setFilters(prev => ({ ...prev, role_category: roleCategory, page: 1 }));
    setActiveTab('search');
  }, []);
  ```

- [ ] **6.4** Add CSS for the tab bar to `RADAR_CSS`:
  ```css
  .radar-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 18px;
    border-bottom: 2px solid var(--color-line);
    padding-bottom: 0;
  }

  .radar-tab {
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 700;
    color: var(--color-ink-3);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-family: inherit;
    transition: color 0.15s, border-color 0.15s;
  }

  .radar-tab.active {
    color: var(--color-brand);
    border-bottom-color: var(--color-brand);
  }

  .radar-tab:hover:not(.active) {
    color: var(--color-ink);
  }
  ```

- [ ] **6.5** Verify the existing search functionality still works after refactoring into `SearchTab`. All existing behavior (filters, stats bar, pagination, card rendering, error/empty states) must be preserved exactly.

- [ ] **6.6** Commit:
  ```bash
  git add packages/web/src/app/\(main\)/newspaper/radar/page.tsx
  git commit -m "feat(radar): add 4-tab structure to radar page (search/company/role/trend)"
  ```

---

## Task 7: Frontend --- Company Radar tab UI

**Files:**
- Modify: `packages/web/src/app/(main)/newspaper/radar/page.tsx`
- Modify: `packages/web/src/lib/types.ts`

### Steps

- [ ] **7.1** Add TypeScript interfaces to `packages/web/src/lib/types.ts`:
  ```typescript
  export interface CompanyRadarItem {
    company: string;
    company_id: string | null;
    company_type: string | null;
    priority: string | null;
    sector: string | null;
    total_count: number;
    usable_count: number;
    low_confidence_count: number;
    candidate_count: number;
    rejected_count: number;
    xhs_count: number;
    nowcoder_count: number;
    wechat_count: number;
    top_roles: string[];
    high_confidence_count: number;
    quality_score_avg: number;
    latest_collected_at: string | null;
    dominant_signal: string | null;
  }

  export interface CompanyRadarResponse {
    companies: CompanyRadarItem[];
    total_companies: number;
    generated_at: string;
  }

  export interface RoleRadarItem {
    role_category: string;
    label: string;
    total_count: number;
    usable_count: number;
    candidate_count: number;
    rejected_count: number;
    xhs_count: number;
    nowcoder_count: number;
    wechat_count: number;
    top_companies: string[];
    companies_covered: number;
    common_question_keywords: string[];
    representative_posts: Array<{
      title: string;
      company: string | null;
      source_url: string;
      source_kind: string;
    }>;
  }

  export interface RoleRadarResponse {
    roles: RoleRadarItem[];
    total_roles: number;
    generated_at: string;
  }

  export interface TrendRadarResponse {
    period: {
      current_start: string;
      current_end: string;
      previous_start: string;
      previous_end: string;
    };
    this_week: {
      new_items: number;
      new_companies: string[];
      new_role_categories: string[];
      top_sources: Array<{ source_kind: string; count: number }>;
    };
    comparison: {
      has_baseline: boolean;
      item_count_delta: number;
      item_count_previous: number;
      message: string;
    };
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

- [ ] **7.2** Implement the `CompanyTab` component in the radar page file. Fetch from `/newspaper/radar/companies` on first render. Show loading/error/empty states. Render 2-column grid of company cards:
  ```typescript
  function CompanyTab({ onViewCompany }: { onViewCompany: (company: string) => void }) {
    const [data, setData] = useState<CompanyRadarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      api.get<CompanyRadarResponse>('/newspaper/radar/companies')
        .then(d => { if (!cancelled) { setData(d); setError(null); } })
        .catch(e => { if (!cancelled) setError(getErrorMessage(e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载公司雷达...</div>;
    if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
    if (!data || data.companies.length === 0) {
      return (
        <div className="empty-state">
          <Search size={26} />
          <h2>暂无公司数据</h2>
          <p>还没有采集到带公司标签的面经。</p>
        </div>
      );
    }

    return (
      <section className="radar-grid" aria-label="公司雷达">
        {data.companies.map(c => (
          <CompanyCard key={c.company} item={c} onView={() => onViewCompany(c.company)} />
        ))}
      </section>
    );
  }
  ```

- [ ] **7.3** Implement the `CompanyCard` component with source distribution bar, top roles, dominant signal, and click handler:
  ```typescript
  function CompanyCard({ item, onView }: { item: CompanyRadarItem; onView: () => void }) {
    const total = item.total_count || 1;
    const xhsPct = Math.round((item.xhs_count / total) * 100);
    const ncPct = Math.round((item.nowcoder_count / total) * 100);
    const wxPct = 100 - xhsPct - ncPct;

    const latestStr = item.latest_collected_at ? formatRelativeTime(item.latest_collected_at) : '';

    return (
      <article
        className="radar-card company-card"
        style={item.priority === 'B' ? { opacity: 0.85 } : undefined}
      >
        <div className="card-top">
          <span className="company-name">{item.company}</span>
          <span className="company-meta">
            {item.priority && <span className="priority-badge">{item.priority}</span>}
            {item.sector && <span className="sector-label">{item.sector}</span>}
          </span>
        </div>

        <div className="company-stats-row">
          <span>面经 <strong>{item.total_count}</strong> 条</span>
          <span className="dot-sep" />
          <span>可用 <strong>{item.usable_count}</strong> 条</span>
        </div>

        {/* Source distribution bar */}
        <div className="source-bar">
          {item.xhs_count > 0 && (
            <div className="source-seg xhs" style={{ width: `${xhsPct}%` }}
              title={`小红书 ${item.xhs_count}`} />
          )}
          {item.nowcoder_count > 0 && (
            <div className="source-seg nowcoder" style={{ width: `${ncPct}%` }}
              title={`牛客 ${item.nowcoder_count}`} />
          )}
          {item.wechat_count > 0 && (
            <div className="source-seg wechat" style={{ width: `${wxPct}%` }}
              title={`公众号 ${item.wechat_count}`} />
          )}
        </div>
        <div className="source-legend">
          {item.xhs_count > 0 && <span className="legend-item xhs">XHS {item.xhs_count}</span>}
          {item.nowcoder_count > 0 && <span className="legend-item nowcoder">牛客 {item.nowcoder_count}</span>}
          {item.wechat_count > 0 && <span className="legend-item wechat">公众号 {item.wechat_count}</span>}
        </div>

        {/* Top roles */}
        {item.top_roles.length > 0 && (
          <div className="card-company-role">
            {item.top_roles.map(r => (
              <span key={r} className="role-tag">{ROLE_CATEGORY_LABELS[r] ?? r}</span>
            ))}
          </div>
        )}

        <div className="company-signal-row">
          <span>质量分 {item.quality_score_avg}</span>
          {item.dominant_signal && (
            <>
              <span className="dot-sep" />
              <span className="signal-text">{item.dominant_signal}</span>
            </>
          )}
        </div>

        <div className="card-footer">
          <small>{latestStr ? `最新采集 ${latestStr}` : ''}</small>
          <button type="button" className="view-company-btn" onClick={onView}>
            查看该公司面经 →
          </button>
        </div>
      </article>
    );
  }
  ```

- [ ] **7.4** Add a `ROLE_CATEGORY_LABELS` mapping and `formatRelativeTime` helper function at the top of the file:
  ```typescript
  const ROLE_CATEGORY_LABELS: Record<string, string> = {
    backend: '后端', frontend: '前端', algorithm: '算法', embedded: '嵌入式',
    product: '产品', operations: '运营', hr: 'HR', design: '设计',
    data: '数据', finance: '金融', consulting: '咨询', marketing: '市场',
    general: '综合',
  };

  function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m 前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h 前`;
    const days = Math.floor(hrs / 24);
    return `${days}d 前`;
  }
  ```

- [ ] **7.5** Add CSS for company cards to `RADAR_CSS`:
  ```css
  .company-card .company-name {
    font-size: 16px;
    font-weight: 800;
  }

  .company-meta {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-left: auto;
  }

  .priority-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 800;
    background: var(--color-brand-soft);
    color: var(--color-brand-ink);
  }

  .sector-label {
    font-size: 11px;
    color: var(--color-ink-3);
  }

  .company-stats-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-ink-2);
  }

  .dot-sep {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--color-ink-4);
  }

  .source-bar {
    display: flex;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--color-surface-3);
  }

  .source-seg { min-width: 3px; }
  .source-seg.xhs { background: #ff2442; }
  .source-seg.nowcoder { background: #00c853; }
  .source-seg.wechat { background: #1890ff; }

  .source-legend {
    display: flex;
    gap: 10px;
    font-size: 11px;
    color: var(--color-ink-3);
  }

  .legend-item::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .legend-item.xhs::before { background: #ff2442; }
  .legend-item.nowcoder::before { background: #00c853; }
  .legend-item.wechat::before { background: #1890ff; }

  .company-signal-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-ink-3);
  }

  .signal-text {
    color: var(--color-brand);
    font-weight: 600;
  }

  .view-company-btn {
    border: none;
    background: none;
    color: var(--color-brand);
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
  }
  ```

- [ ] **7.6** Commit:
  ```bash
  git add packages/web/src/lib/types.ts packages/web/src/app/\(main\)/newspaper/radar/page.tsx
  git commit -m "feat(radar): add Company Radar tab with source distribution bar and drill-down to search"
  ```

---

## Task 8: Frontend --- Role Radar tab + Trend tab UI

**Files:**
- Modify: `packages/web/src/app/(main)/newspaper/radar/page.tsx`

### Steps

- [ ] **8.1** Implement `RoleTab` component:
  ```typescript
  function RoleTab({ onViewRole }: { onViewRole: (role: string) => void }) {
    const [data, setData] = useState<RoleRadarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      api.get<RoleRadarResponse>('/newspaper/radar/roles')
        .then(d => { if (!cancelled) { setData(d); setError(null); } })
        .catch(e => { if (!cancelled) setError(getErrorMessage(e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载岗位雷达...</div>;
    if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
    if (!data || data.roles.length === 0) {
      return (
        <div className="empty-state">
          <Search size={26} />
          <h2>暂无岗位数据</h2>
          <p>还没有按岗位分类的面经数据。</p>
        </div>
      );
    }

    return (
      <section className="radar-grid" aria-label="岗位雷达">
        {data.roles.map(r => (
          <RoleCard key={r.role_category} item={r} onView={() => onViewRole(r.role_category)} />
        ))}
      </section>
    );
  }
  ```

- [ ] **8.2** Implement `RoleCard` component with source preference label, common questions, and representative posts:
  ```typescript
  function RoleCard({ item, onView }: { item: RoleRadarItem; onView: () => void }) {
    const sourcePreference =
      item.xhs_count > item.nowcoder_count * 2 ? '偏 XHS'
      : item.nowcoder_count > item.xhs_count * 2 ? '偏牛客'
      : '均衡';

    return (
      <article className="radar-card role-card">
        <div className="card-top">
          <span className="role-card-name">{item.label}</span>
          <span className={`source-pref-badge ${sourcePreference === '偏 XHS' ? 'xhs' : sourcePreference === '偏牛客' ? 'nowcoder' : ''}`}>
            {sourcePreference}
          </span>
        </div>

        <div className="company-stats-row">
          <span>面经 <strong>{item.total_count}</strong> 条</span>
          <span className="dot-sep" />
          <span>覆盖 <strong>{item.companies_covered}</strong> 家公司</span>
        </div>

        {/* Source bar same as company card */}
        <div className="source-bar">
          {item.xhs_count > 0 && <div className="source-seg xhs" style={{ width: `${Math.round((item.xhs_count / (item.total_count || 1)) * 100)}%` }} />}
          {item.nowcoder_count > 0 && <div className="source-seg nowcoder" style={{ width: `${Math.round((item.nowcoder_count / (item.total_count || 1)) * 100)}%` }} />}
          {item.wechat_count > 0 && <div className="source-seg wechat" style={{ width: `${Math.max(100 - Math.round((item.xhs_count / (item.total_count || 1)) * 100) - Math.round((item.nowcoder_count / (item.total_count || 1)) * 100), 0)}%` }} />}
        </div>

        {/* Top companies */}
        {item.top_companies.length > 0 && (
          <div className="card-company-role">
            {item.top_companies.map(c => (
              <span key={c} className="company-tag">{c}</span>
            ))}
          </div>
        )}

        {/* Common question keywords */}
        {item.common_question_keywords.length > 0 && (
          <div className="question-keywords">
            <small className="section-label">常见考点:</small>
            <div className="keyword-tags">
              {item.common_question_keywords.map(kw => (
                <span key={kw} className="keyword-tag">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Representative posts */}
        {item.representative_posts.length > 0 && (
          <div className="repr-posts">
            <small className="section-label">精选面经:</small>
            {item.representative_posts.map((post, i) => (
              <a
                key={i}
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="repr-post-link"
              >
                {post.title}
                {post.company && <span className="repr-company">({post.company})</span>}
                <ExternalLink size={11} />
              </a>
            ))}
          </div>
        )}

        <div className="card-footer">
          <small>可用 {item.usable_count} 条</small>
          <button type="button" className="view-company-btn" onClick={onView}>
            查看该岗位面经 →
          </button>
        </div>
      </article>
    );
  }
  ```

- [ ] **8.3** Implement `TrendTab` component:
  ```typescript
  function TrendTab() {
    const [data, setData] = useState<TrendRadarResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      api.get<TrendRadarResponse>('/newspaper/radar/trends')
        .then(d => { if (!cancelled) { setData(d); setError(null); } })
        .catch(e => { if (!cancelled) setError(getErrorMessage(e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={20} />加载趋势...</div>;
    if (error) return <div className="error-banner" role="alert"><AlertCircle size={16} /><span>{error}</span></div>;
    if (!data) return null;

    const periodLabel = `${formatDateShort(data.period.current_start)} - ${formatDateShort(data.period.current_end)}`;

    return (
      <section className="trend-section" aria-label="趋势">
        {/* Header */}
        <div className="trend-header">
          <h2>本周趋势</h2>
          <span className="trend-period">{periodLabel}</span>
        </div>

        {/* This week stats */}
        <div className="trend-stat-card">
          <div className="trend-big-number">
            本周新增 <strong>{data.this_week.new_items}</strong> 条面经
          </div>
          <div className={`trend-comparison ${!data.comparison.has_baseline ? 'muted' : ''}`}>
            {data.comparison.message}
          </div>
        </div>

        {/* New companies & roles */}
        {data.this_week.new_companies.length > 0 && (
          <div className="trend-new-section">
            <h3>新增公司</h3>
            <div className="card-company-role">
              {data.this_week.new_companies.map(c => (
                <span key={c} className="company-tag">{c}</span>
              ))}
            </div>
          </div>
        )}

        {data.this_week.new_role_categories.length > 0 && (
          <div className="trend-new-section">
            <h3>新增岗位类</h3>
            <div className="card-company-role">
              {data.this_week.new_role_categories.map(r => (
                <span key={r} className="role-tag">{ROLE_CATEGORY_LABELS[r] ?? r}</span>
              ))}
            </div>
          </div>
        )}

        {/* Source distribution */}
        {data.this_week.top_sources.length > 0 && (
          <div className="trend-new-section">
            <h3>本周来源分布</h3>
            <div className="source-legend">
              {data.this_week.top_sources.map(s => (
                <span key={s.source_kind} className={`legend-item ${s.source_kind}`}>
                  {SOURCE_KIND_LABELS[s.source_kind as FeedSourceKind] ?? s.source_kind} {s.count} 条
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hot posts */}
        {data.hot_posts.length > 0 && (
          <div className="trend-new-section">
            <h3>本周热门面经</h3>
            <div className="hot-posts-list">
              {data.hot_posts.map((post, i) => (
                <a
                  key={i}
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hot-post-item"
                >
                  <span className="hot-post-rank">{i + 1}</span>
                  <span className="hot-post-title">{post.title}</span>
                  {post.company && <span className="hot-post-company">{post.company}</span>}
                  <span className={`source-badge ${post.source_kind}`}>
                    {SOURCE_KIND_LABELS[post.source_kind as FeedSourceKind] ?? post.source_kind}
                  </span>
                  <ExternalLink size={11} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for no hot_posts and no new_items */}
        {data.this_week.new_items === 0 && data.hot_posts.length === 0 && (
          <div className="empty-state">
            <Search size={26} />
            <h2>本周暂无新增面经</h2>
            <p>系统会持续采集，请稍后再查看。</p>
          </div>
        )}
      </section>
    );
  }
  ```

- [ ] **8.4** Add `formatDateShort` helper:
  ```typescript
  function formatDateShort(iso: string): string {
    const d = new Date(iso);
    return `${d.getMonth() + 1}.${d.getDate()}`;
  }
  ```

- [ ] **8.5** Add CSS for role cards and trend tab to `RADAR_CSS`:
  ```css
  .role-card-name {
    font-size: 16px;
    font-weight: 800;
  }

  .source-pref-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 999px;
    margin-left: auto;
    color: var(--color-ink-3);
    background: var(--color-surface-3);
  }

  .source-pref-badge.xhs { color: #ff2442; background: rgba(255,36,66,0.08); }
  .source-pref-badge.nowcoder { color: #00c853; background: rgba(0,200,83,0.08); }

  .question-keywords {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-label {
    font-size: 11.5px;
    color: var(--color-ink-4);
    font-weight: 600;
  }

  .keyword-tags {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .keyword-tag {
    font-size: 11px;
    padding: 3px 7px;
    border-radius: 4px;
    background: var(--color-surface-2);
    color: var(--color-ink-2);
  }

  .repr-posts {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .repr-post-link {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: var(--color-ink-2);
    text-decoration: none;
    line-height: 1.5;
  }

  .repr-post-link:hover { color: var(--color-brand); }
  .repr-company { color: var(--color-ink-4); font-size: 11px; }

  /* Trend tab */
  .trend-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .trend-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .trend-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }

  .trend-period {
    font-size: 13px;
    color: var(--color-ink-3);
  }

  .trend-stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: 8px;
    padding: 20px;
  }

  .trend-big-number {
    font-size: 16px;
    color: var(--color-ink);
    margin-bottom: 8px;
  }

  .trend-big-number strong {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-brand);
  }

  .trend-comparison {
    font-size: 14px;
    color: var(--color-ink-2);
  }

  .trend-comparison.muted {
    color: var(--color-ink-4);
    font-style: italic;
  }

  .trend-new-section {
    background: var(--color-surface);
    border: 1px solid var(--color-line);
    border-radius: 8px;
    padding: 16px;
  }

  .trend-new-section h3 {
    margin: 0 0 10px;
    font-size: 14px;
    font-weight: 700;
  }

  .hot-posts-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .hot-post-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--color-ink);
    text-decoration: none;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-line);
  }

  .hot-post-item:last-child { border-bottom: none; }
  .hot-post-item:hover { color: var(--color-brand); }

  .hot-post-rank {
    font-size: 14px;
    font-weight: 800;
    color: var(--color-brand);
    min-width: 20px;
  }

  .hot-post-title { flex: 1; }

  .hot-post-company {
    font-size: 11px;
    color: var(--color-ink-3);
  }
  ```

- [ ] **8.6** Commit:
  ```bash
  git add packages/web/src/app/\(main\)/newspaper/radar/page.tsx
  git commit -m "feat(radar): add Role Radar and Trend tabs with source distribution and honest empty states"
  ```

---

## Task 9: Frontend --- Search tab enhancements + Homepage tag click

**Files:**
- Modify: `packages/web/src/app/(main)/newspaper/radar/page.tsx`
- Modify: `packages/web/src/app/(main)/newspaper/page.tsx`

### Steps

- [ ] **9.1** In the `SearchTab` component, fix the quarter filter dropdown to not default to `"current"`. The `INITIAL_FILTERS` already has `quarter: ''` which maps to "all". Verify no code sets quarter to `"current"` by default. Current code is correct --- `quarter: ''` means no filter.

- [ ] **9.2** Accept `initialKeyword` prop in `RadarPage` to support pre-filled search from homepage. Use URL search params to read the keyword:
  ```typescript
  // At the top of RadarPage component:
  import { useSearchParams } from 'next/navigation';

  // Inside the component:
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<RadarTab>('search');

  // Initialize filters with keyword from URL if present
  const [filters, setFilters] = useState<Filters>(() => {
    const urlKeyword = searchParams.get('keyword') ?? '';
    return { ...INITIAL_FILTERS, keyword: urlKeyword };
  });
  ```

- [ ] **9.3** In the newspaper main page (`packages/web/src/app/(main)/newspaper/page.tsx`), make trending tag pills clickable. Find the trending tags section (around line 230) and replace the non-interactive `<span>` with a clickable element:

  **Before:**
  ```tsx
  <span key={tag} className="np-tag-pill">{tag}</span>
  ```

  **After:**
  ```tsx
  <Link
    key={tag}
    href={`/newspaper/radar?keyword=${encodeURIComponent(tag)}`}
    className="np-tag-pill np-tag-clickable"
  >
    {tag}
  </Link>
  ```

  Also add `cursor: pointer` CSS for `.np-tag-clickable` in the newspaper page styles. Find where `.np-tag-pill` is styled and ensure it doesn't have `cursor: default`.

- [ ] **9.4** Find and fix the `cursor: default` on `.np-tag-pill` in the newspaper page CSS. Search for the style definition and change it to `cursor: pointer`. The audit noted this is at around line 788 of the newspaper page.

- [ ] **9.5** Verify the company/role card click flows work end-to-end:
  - CompanyCard "查看该公司面经 →" click calls `onViewCompany(company)` which sets `filters.company` and switches to search tab
  - RoleCard "查看该岗位面经 →" click calls `onViewRole(roleCategory)` which sets `filters.role_category` and switches to search tab
  - Both must trigger the `useEffect` that calls `fetchRadar(filters)` because `filters` state changed

- [ ] **9.6** Commit:
  ```bash
  git add packages/web/src/app/\(main\)/newspaper/radar/page.tsx packages/web/src/app/\(main\)/newspaper/page.tsx
  git commit -m "feat(radar): clickable trending tags on homepage + keyword URL param + search tab enhancements"
  ```

---

## Task 10: Quality gate --- PJR + Playwright E2E

**Files:**
- All modified files
- Create: `e2e/radar-workspace.spec.ts` (Playwright test at project root or in `packages/web`)

### Steps

- [ ] **10.1** Backend quality gate --- run TypeScript compilation and build:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx tsc --noEmit
  npx nest build
  ```
  Fix any TypeScript errors immediately. Do not proceed until both commands exit 0.

- [ ] **10.2** Backend quality gate --- run all Jest tests:
  ```bash
  cd .worktrees/newspaper-impl/packages/api
  npx jest --verbose
  ```
  All tests must pass. Fix any failures.

- [ ] **10.3** Frontend quality gate --- run ESLint and build:
  ```bash
  cd .worktrees/newspaper-impl/packages/web
  npx eslint src/ --max-warnings=0
  npx next build
  ```
  Both must exit 0. `tsc --noEmit` is NOT lint --- the actual ESLint must pass.

- [ ] **10.4** Write Playwright E2E test file. This test covers all tab interactions:
  ```typescript
  // File: e2e/radar-workspace.spec.ts (or packages/web/e2e/radar-workspace.spec.ts)
  import { test, expect } from '@playwright/test';

  test.describe('Radar Workspace', () => {
    test.beforeEach(async ({ page }) => {
      // Login flow - use existing test login mechanism
      await page.goto('/login');
      // ... login steps ...
      await page.goto('/newspaper/radar');
      await page.waitForLoadState('networkidle');
    });

    test('default tab is search with filter bar visible', async ({ page }) => {
      await expect(page.getByRole('tab', { name: '搜索' })).toHaveAttribute('aria-selected', 'true');
      await expect(page.getByPlaceholder('搜索公司')).toBeVisible();
      await expect(page.getByPlaceholder('关键词搜索')).toBeVisible();
    });

    test('switch to company radar tab shows company cards', async ({ page }) => {
      await page.getByRole('tab', { name: '公司雷达' }).click();
      // Wait for API response
      await page.waitForSelector('.company-card, .empty-state', { timeout: 10000 });
      // If data exists, verify card structure
      const cards = page.locator('.company-card');
      if (await cards.count() > 0) {
        await expect(cards.first().locator('.company-name')).toBeVisible();
        await expect(cards.first().locator('.source-bar')).toBeVisible();
      }
    });

    test('company card click switches to search tab with company filter', async ({ page }) => {
      await page.getByRole('tab', { name: '公司雷达' }).click();
      await page.waitForSelector('.company-card, .empty-state', { timeout: 10000 });
      const cards = page.locator('.company-card');
      if (await cards.count() > 0) {
        const companyName = await cards.first().locator('.company-name').textContent();
        await cards.first().locator('.view-company-btn').click();
        // Should switch to search tab
        await expect(page.getByRole('tab', { name: '搜索' })).toHaveAttribute('aria-selected', 'true');
        // Company input should be filled
        await expect(page.getByPlaceholder('搜索公司')).toHaveValue(companyName!);
      }
    });

    test('switch to role radar tab shows role category cards', async ({ page }) => {
      await page.getByRole('tab', { name: '岗位雷达' }).click();
      await page.waitForSelector('.role-card, .empty-state', { timeout: 10000 });
      const cards = page.locator('.role-card');
      if (await cards.count() > 0) {
        await expect(cards.first().locator('.role-card-name')).toBeVisible();
        // Should not show "null" as a role name
        const roleNames = await cards.allTextContents();
        for (const name of roleNames) {
          expect(name).not.toContain('"null"');
        }
      }
    });

    test('role card representative post title links to source_url', async ({ page }) => {
      await page.getByRole('tab', { name: '岗位雷达' }).click();
      await page.waitForSelector('.role-card, .empty-state', { timeout: 10000 });
      const link = page.locator('.repr-post-link').first();
      if (await link.isVisible()) {
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/^https?:\/\//);
        await expect(link).toHaveAttribute('target', '_blank');
      }
    });

    test('switch to trend tab shows this_week stats or honest empty state', async ({ page }) => {
      await page.getByRole('tab', { name: '趋势' }).click();
      await page.waitForSelector('.trend-section, .empty-state', { timeout: 10000 });
      // Should show either trend data or honest empty state
      const trendSection = page.locator('.trend-section');
      if (await trendSection.isVisible()) {
        await expect(page.locator('.trend-big-number')).toBeVisible();
        await expect(page.locator('.trend-comparison')).toBeVisible();
      }
    });

    test('search tab quarter filter works without returning 0 results', async ({ page }) => {
      // Verify the quarter=current fix
      await page.getByRole('tab', { name: '搜索' }).click();
      // The "全部" quarter tab should be active by default
      const allTab = page.getByRole('tab', { name: '全部' }).last();
      await expect(allTab).toHaveAttribute('aria-selected', 'true');
    });

    test('source_kind badges have correct colors', async ({ page }) => {
      await page.getByRole('tab', { name: '搜索' }).click();
      await page.waitForSelector('.radar-card, .empty-state', { timeout: 10000 });
      const xhsBadge = page.locator('.source-badge.xhs').first();
      if (await xhsBadge.isVisible()) {
        await expect(xhsBadge).toContainText('小红书');
      }
    });

    test('company card shows usable_count as primary number', async ({ page }) => {
      await page.getByRole('tab', { name: '公司雷达' }).click();
      await page.waitForSelector('.company-card, .empty-state', { timeout: 10000 });
      const cards = page.locator('.company-card');
      if (await cards.count() > 0) {
        // The stats row should show "可用 X 条"
        await expect(cards.first().locator('.company-stats-row')).toContainText('可用');
      }
    });
  });

  test.describe('Newspaper Homepage Tag Click', () => {
    test('clicking trending tag navigates to radar with keyword', async ({ page }) => {
      await page.goto('/newspaper');
      await page.waitForLoadState('networkidle');
      const tagPill = page.locator('.np-tag-pill').first();
      if (await tagPill.isVisible()) {
        const tagText = await tagPill.textContent();
        await tagPill.click();
        // Should navigate to radar page
        await expect(page).toHaveURL(/\/newspaper\/radar/);
        // Keyword input should contain the tag text
        await expect(page.getByPlaceholder('关键词搜索')).toHaveValue(tagText!);
      }
    });
  });
  ```

- [ ] **10.5** Run Playwright E2E tests (desktop only):
  ```bash
  cd .worktrees/newspaper-impl
  npx playwright test e2e/radar-workspace.spec.ts --project=desktop
  ```
  If the test file location needs adjustment (project might have different Playwright config), check `playwright.config.ts` for the correct test directory and project names.

- [ ] **10.6** Fix any failures found by the quality gate. Common issues to check:
  - Missing imports (CompanyRadarResponse, RoleRadarResponse, TrendRadarResponse in types.ts)
  - Controller route ordering (specific before generic)
  - CSS variable names that don't exist in the theme (check layout.tsx for CSS custom properties)
  - `useSearchParams()` needs a `Suspense` boundary in Next.js App Router
  - CompanyRegistryService injection needs to be added to NewspaperService constructor

- [ ] **10.7** Run full test suite one final time:
  ```bash
  cd .worktrees/newspaper-impl/packages/api && npx tsc --noEmit && npx nest build && npx jest --verbose
  cd .worktrees/newspaper-impl/packages/web && npx eslint src/ --max-warnings=0 && npx next build
  ```

- [ ] **10.8** Final commit:
  ```bash
  git add -A
  git commit -m "test(radar): add Playwright E2E for radar workspace + quality gate fixes"
  ```

---

## Route Ordering Reference

The final `newspaper.controller.ts` must have routes in this exact order to prevent NestJS routing conflicts:

```typescript
@Controller('newspaper')
@UseGuards(JwtAuthGuard)
export class NewspaperController {
  constructor(private readonly newspaper: NewspaperService) {}

  @Get()
  getEdition(@CurrentUser() user: { id: string }) { ... }

  @Get('radar/companies')
  getRadarCompanies() { ... }

  @Get('radar/roles')
  getRadarRoles() { ... }

  @Get('radar/trends')
  getRadarTrends() { ... }

  @Get('radar')
  getRadar(@Query(...) ...) { ... }
}
```

The more specific `/radar/companies`, `/radar/roles`, `/radar/trends` routes MUST appear before the generic `/radar` route. NestJS matches routes in definition order, and if `/radar` comes first, it would consume the request before the sub-routes are checked.

## Dependency Chain

```
Task 1 (helpers + tests)
  |
  +---> Task 2 (companies endpoint) --+
  |                                    |
  +---> Task 3 (roles endpoint) -------+---> Task 6 (tab structure) ---> Task 7 (company UI)
  |                                    |                            |
  +---> Task 4 (trends endpoint) ------+                            +--> Task 8 (role + trend UI)
  |                                                                 |
  +---> Task 5 (quarter fix) -------------------------------------------> Task 9 (search enhancements)
                                                                    |
                                                                    +--> Task 10 (quality gate)
```

Tasks 2, 3, 4, 5 can run in parallel after Task 1 is complete.
Tasks 7, 8, 9 can run in parallel after Task 6 is complete.
Task 10 runs last after all other tasks.

## Anti-Patterns to Avoid

1. **No mock data** --- all tabs fetch from real API endpoints, empty states are honest
2. **No `onClick={() => {}}` handlers** --- every button must have real functionality
3. **No hardcoded numbers** --- all counts come from API responses
4. **No fabricated signals** --- `dominant_signal` is rule-based, never invented
5. **No duplicate query builders** --- reuse `applyRadarFilters` pattern
6. **No `"null"` role cards** --- `normalizeRoleCategory` catches these
7. **No glue SQL** --- each aggregation method is independent and testable
8. **No claiming "done" without `npx jest` and `npx eslint` passing** --- run the commands, paste the output
