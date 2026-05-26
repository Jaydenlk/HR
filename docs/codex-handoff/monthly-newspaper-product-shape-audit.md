# Monthly Newspaper Product Shape Audit

**Date:** 2026-05-26  
**Auditor:** Claude Opus 4.6 (1M context)  
**Scope:** READ-ONLY audit of all newspaper/digest/radar/feed pages and APIs  
**Worktree:** `.worktrees/newspaper-impl`

---

## 1. Current Pages and Functions

### 1.1 Newspaper Main Page (`/newspaper`)

**File:** `.worktrees/newspaper-impl/packages/web/src/app/(main)/newspaper/page.tsx` (lines 1-1134)

**What it looks like:**
- Header: "Monthly Newspaper" eyebrow + "月刊 · 面经" title + 24h update count (line 166-171)
- Two header action buttons: "搜面经" (links to `/newspaper/radar`) and "写一篇" (links to `/digest`) (lines 174-181)
- Hero section: 3-column grid with Editor's Pick (编辑精选), 24H Hot (24H 热点), Coach Action (Coach 建议) (lines 291-357)
- Category tabs: 全部 / 面经 / 热点 / 故事 / 题库 / 编辑精选 (lines 144-153, 207-221)
- Trending tags bar: "本周热词" with pill-shaped tags (lines 224-234)
- Sort controls: 最新发布 | 仅校招 (lines 237-254)
- Card grid (3 columns): FeedItemCard showing category badge, source_kind badge, quality score, company/role, title, excerpt, author, relative time, and "原文" external link (lines 360-418)
- InsightCard for 编辑精选 tab: shows title, why_read, career_implication, impact_tags, source_name, and "阅读原文" link (lines 421-457)
- Coach Actions section at bottom: 3-column grid of action/reason/data_source cards (lines 460-479)

**Data it fetches:**
- `GET /newspaper` -> `NewspaperEdition` (line 102)
- Returns: `headline_observations`, `insight_cards`, `user_voice` (xhs items), `tech_radar` (nowcoder items), `role_trends`, `coach_actions`, `trending_tags`, `total_count`, `categories`

**Source kind display:** YES -- each card shows a colored source_kind badge (小红书/牛客/公众号/博客/用户投稿/Coach) with distinct colors per source (lines 30-46, 371-376)

**Click-to-original-post:** YES -- each card has an "原文" link with `target="_blank"` pointing to `item.source_url` (lines 405-415). InsightCards also have "阅读原文" (lines 446-454).

### 1.2 Radar Page (`/newspaper/radar`)

**File:** `.worktrees/newspaper-impl/packages/web/src/app/(main)/newspaper/radar/page.tsx` (lines 1-792)

**What it looks like:**
- Back link to `/newspaper` + "面经雷达" title (lines 166-176)
- Filter bar with:
  - Company search input (line 185-189)
  - Keyword search input (line 191-199)
  - Role category tabs: 全部/后端/前端/算法/产品/运营/设计 (lines 32-40, 202-214)
  - Source kind tabs: 全部/小红书/牛客/公众号 (lines 42-47, 218-230)
  - Quarter tabs: 全部/本季度/上季度 (lines 49-53, 232-245)
- Stats bar: total count + clickable company stat pills (top 5) + clickable role stat pills (top 5) (lines 258-301)
- Results grid (2 columns): RadarCard showing category, source_kind, confidence badge (高置信/中置信/低置信), company/role tags, title, excerpt, source name, date, "原文" external link (lines 340-393)
- Load more button with pagination (lines 322-333)
- Low confidence items dimmed (opacity 0.6) with "AI 分类置信度低，仅供参考" note (lines 348-376)

**Data it fetches:**
- `GET /newspaper/radar?company=&role_category=&source_kind=&quarter=&keyword=&page=&limit=` -> `RadarResult` (lines 119-129)
- Returns: `items` (FeedItem[]), `total`, `company_stats`, `role_stats`

**Source kind filtering:** YES -- source_kind filter tabs directly map to API query param (lines 42-47, 218-230)

**Quarter filtering:** YES -- quarter filter tabs send `current` or `previous` to API (lines 49-53, 232-245)

**Click-to-original-post:** YES -- "原文" link with ExternalLink icon (lines 386-389)

### 1.3 Digest Page (`/digest`)

**File:** `.worktrees/newspaper-impl/packages/web/src/app/(main)/digest/page.tsx` (lines 1-1171)

**What it looks like:**
- "Source-backed Digest" eyebrow + "求职情报月刊" title (lines 288-293)
- Action buttons: 刷新 / 导入来源 / 写面经 (lines 295-318)
- Status grid (3 cards): 来源配置 (active/total), 最近导入 (run status), 当前结果 (item count) (lines 321-337)
- Source strip: shows configured FeedSource chips with status indicators (lines 339, 506-531)
- Run notice: shows latest digest run results (lines 340, 533-546)
- Search box + source filter segmented control + category filter tabs (lines 342-376)
- Card grid (3 columns): DigestCard showing category, source_kind, title, excerpt, company/role/outcome, source_name, date, quality score, "原文" link (lines 588-618)
- Modal form for writing user-contributed interview experiences (lines 406-501)

**Data it fetches:**
- `GET /feed?source_kind=&category=&keyword=` -> `FeedItem[]` (lines 156-164, 177-181)
- `GET /feed/sources` -> `FeedSource[]` (lines 168-169)
- `GET /feed/runs` -> `DigestRun[]` (lines 168-169)
- `POST /feed/import` to trigger ingestion (line 235)
- `POST /feed` to create user-submitted content (line 263)

### 1.4 Company Dimension Page

**Status: DOES NOT EXIST**

There is no `/newspaper/company` or `/newspaper/companies` page. The Company entity exists in the backend (`packages/api/src/feed/entities/company.entity.ts`) with rich fields (aliases, bu_aliases, company_type, priority, source_preference, role_focus, sector, reason_type, reason), and `CompanyRegistryService` provides `findAll()` and `findByPriority()` methods (lines 70-79 of `company-registry.service.ts`), but no controller endpoint exposes company lists or company-specific aggregations to the frontend.

### 1.5 Role Dimension Page

**Status: DOES NOT EXIST**

There is no `/newspaper/roles` page. The RoleCategory entity exists (`packages/api/src/feed/entities/role-category.entity.ts`) with role_key, label, aliases, source_preference, and question_taxonomy fields. The `NewspaperService.buildRoleTrends()` method (lines 314-351 of `newspaper.service.ts`) aggregates role trends internally for the newspaper edition, and the radar endpoint returns `role_stats` aggregation. But there is no dedicated role radar frontend page.

### 1.6 Quarter/Trend Dimension Page

**Status: DOES NOT EXIST as separate page**

Quarter filtering exists within the Radar page (lines 49-53 of radar/page.tsx), but there is no dedicated "本周新增趋势" page showing weekly new companies, roles, or sources. The `SearchSchedulerService` (search-scheduler.service.ts) tracks `CoverageMetric` with quarter-level data, and `FeedItem` has a `quarter` column, but no "trend radar" or "weekly-new" aggregation endpoint exists.

### 1.7 Source_kind Filtering

**Status: EXISTS on Radar and Digest pages**

- Radar page: source tabs (全部/小红书/牛客/公众号) at line 218-230
- Digest page: source segmented control (全部来源/小红书/牛客/公众号/Coach/用户内容) at line 90-97
- Newspaper main page: source_kind is DISPLAYED per card but NOT filterable (no source filter UI on main page)

### 1.8 Search

**Status: EXISTS on Radar and Digest pages**

- Radar page: company search + keyword search inputs (lines 182-199)
- Digest page: keyword search input (lines 343-350)
- Newspaper main page: NO search. The "搜面经" button navigates to /newspaper/radar (line 174-176)

### 1.9 Filter

**Status: PARTIAL**

- Radar page: full filter bar (company, role_category, source_kind, quarter, keyword) -- lines 180-246
- Digest page: source_kind + category + keyword filters -- lines 342-376
- Newspaper main page: category tabs only (no company, role, source_kind, or quarter filters)

### 1.10 Click-to-Original-Post

**Status: EXISTS everywhere**

- Newspaper main page: "原文" link per FeedItemCard (line 405-415) + "阅读原文" per InsightCard (lines 446-454)
- Radar page: "原文" link per RadarCard (lines 386-389)
- Digest page: "原文" link per DigestCard (lines 611-616)
- All use `target="_blank"` + `rel="noopener noreferrer"`

---

## 2. User Requirement Comparison

| Requirement | Status | Evidence |
|---|---|---|
| **Newspaper 首界面** | **Implemented** | `/newspaper` page has hero section, category tabs, trending tags, sort controls, card grid, coach actions. Fetches real data from `GET /newspaper`. |
| **二级雷达页** | **Partially implemented** | `/newspaper/radar` exists as a single combined search/filter page. It is NOT split into Company Radar / Role Radar / Trend Radar sub-tabs. |
| **公司雷达** | **Partially implemented** | Radar page has company search input and company_stats display, but no dedicated Company Radar view with quarterly data, source breakdown, role coverage, interview count, or quality scores per company. |
| **岗位雷达** | **Partially implemented** | Radar page has role_category filter tabs and role_stats display, but no dedicated Role Radar view with company distribution, source distribution, or common questions per role. |
| **本周新增趋势** | **Not implemented** | No trend/weekly-new endpoint or page. `SearchSchedulerService` tracks coverage metrics but does not expose weekly diff data. No UI shows "本周新增公司/岗位/来源". |
| **来源分工 (XHS/Nowcoder/WeChat distinction)** | **Implemented** | Backend splits: xhs -> user_voice, nowcoder -> tech_radar, wechat -> insight_cards (newspaper.service.ts lines 136-150). Frontend displays source_kind per card with distinct colors. |
| **无三级详情页** | **Implemented** | No detail pages exist under `/newspaper/`. Cards link directly to `source_url` (external) or show inline content. No `/newspaper/[id]` route. |
| **原文跳转** | **Implemented** | Every card (FeedItemCard, InsightCard, RadarCard, DigestCard) has "原文" external link to `source_url`. Items without `source_url` are filtered out on backend (newspaper.service.ts line 98-100). |
| **XHS 用户之声** | **Implemented** | `user_voice` array in NewspaperEdition contains only `source_kind === 'xhs'` items (newspaper.service.ts line 137). Frontend labels source as "小红书" with red color (#ff2442). |
| **牛客技术雷达** | **Implemented** | `tech_radar` array in NewspaperEdition contains only `source_kind === 'nowcoder'` items (newspaper.service.ts line 142). Frontend labels source as "牛客" with green color (#00c853). |
| **公众号认知补给** | **Implemented** | `insight_cards` built from `source_kind === 'wechat'` items (newspaper.service.ts lines 147-150). Frontend shows InsightCardComponent with "认知补给" category badge, why_read, career_implication, impact_tags. |

---

## 3. Clear Gaps

### 3.1 What's Already Implemented

1. **Newspaper main page** (`/newspaper`): Full implementation with hero section, category tabs, trending tags, sort (latest/campus), 3-column card grid, source_kind badges, quality scores, author/time display, external links, coach actions, error/loading/empty states.

2. **Radar search page** (`/newspaper/radar`): Full search/filter with company, keyword, role_category, source_kind, quarter filters. Pagination, company/role stats pills, confidence badges, load-more.

3. **Digest management page** (`/digest`): Source configuration display, import trigger, user-submitted content form, filter by source/category/keyword, real-time item count.

4. **Source-kind semantic split**: XHS = user_voice, Nowcoder = tech_radar, WeChat = insight_cards. All correctly separated in backend and displayed with distinct labels/colors in frontend.

5. **External link pattern**: All cards link to `source_url`. No third-level detail pages. Items without `source_url` are excluded.

6. **Backend evidence graph**: Company entity with aliases, bu_aliases, company_type, priority. RoleCategory entity with aliases, question_taxonomy. CoverageMetric entity tracking quarterly coverage per company/role/source. CompanyRegistryService with seed data loading and fuzzy matching.

7. **Backend radar API**: `GET /newspaper/radar` with full filter support (company, role_category, source_kind, quarter, keyword, page, limit) and aggregation stats (company_stats, role_stats).

8. **E2E tests**: 26 tests in `newspaper.e2e-spec.ts` covering edition structure, user_voice/tech_radar source filtering, insight_cards fields, coach_actions personalization, radar filtering/pagination, auth guards, edge cases.

### 3.2 What Has Backend Data But No Frontend

1. **Company list/detail aggregation**: `CompanyRegistryService.findAll()` and `findByPriority()` methods exist (company-registry.service.ts lines 70-79) but are NOT exposed via any controller endpoint. No frontend page consumes company lists.

2. **RoleCategory entity data**: Role categories with labels, aliases, question_taxonomy exist in DB but no endpoint exposes them for frontend display.

3. **CoverageMetric data**: Quarterly coverage metrics (target_count, valid_count, freshness_score, confidence_score, gap_level) per company/role/source exist in DB (coverage-metric.entity.ts) but are NOT exposed via any endpoint.

4. **SearchSchedulerService.planDailyJobs()**: Can compute search job plans showing coverage gaps per company/role, but this data is not exposed to any frontend.

5. **RoleTrend data**: `NewspaperService.buildRoleTrends()` (newspaper.service.ts lines 314-351) computes role trends with hot_topics and item_count, included in NewspaperEdition response, but the frontend DOES NOT render `role_trends` anywhere in the newspaper page.

6. **Department entity**: `packages/api/src/feed/entities/department.entity.ts` exists with a `department` column on FeedItem, but no department-level aggregation or filtering exists.

### 3.3 What's Completely Missing

1. **Company Radar page**: No `/newspaper/radar/company` or equivalent page showing:
   - Company list with quarterly data
   - Source breakdown per company (xhs vs nowcoder count)
   - Role coverage per company
   - Interview count per company
   - Quality scores per company

2. **Role Radar page**: No `/newspaper/radar/role` or equivalent page showing:
   - Role categories overview
   - Company distribution per role
   - Source distribution per role
   - Common questions per role (question_taxonomy data exists but isn't surfaced)

3. **Trend Radar page**: No weekly-new trend endpoint or page showing:
   - Weekly new companies appearing in feed
   - Weekly new roles appearing in feed
   - Weekly new sources added
   - Popularity change tracking (week-over-week comparison)

4. **Backend trend aggregation endpoints**: No API endpoint computes:
   - `GET /newspaper/trends/weekly` (new companies, roles this week vs last)
   - `GET /newspaper/companies` (company list with aggregated stats)
   - `GET /newspaper/roles` (role list with aggregated stats)
   - `GET /newspaper/coverage` (coverage metrics dashboard)

5. **Confidence-based filtering on main page**: Radar has confidence badges and filtering (quality_score thresholds), but the main newspaper page does not expose confidence level filtering.

6. **Tag-click search**: Trending tags on the newspaper main page are rendered as static pills (line 231: `cursor: default`). They do NOT trigger a search/filter action.

### 3.4 What's Mock or Static UI

1. **Trending tag pills**: Displayed but not interactive. No `onClick` handler, `cursor: default` (newspaper/page.tsx line 788). Cannot click a tag to filter by it.

2. **Category tab counts**: Some counts may be inaccurate -- "题库" tab shows `categories.editorial` count (line 151), but label says "题库" while key is "editorial". Semantic mismatch.

3. **Role tabs on Radar page**: Hardcoded role list (后端/前端/算法/产品/运营/设计) at lines 32-40, not driven by the RoleCategory seed data from the backend.

### 3.5 What Buttons/Filters Have No Real API Support

1. **Trending tag pills** (newspaper main page): Visual only, no search triggered.

2. **"仅校招" sort mode** (newspaper main page, line 250-253): Client-side text search for keywords "校招/实习/应届" in title/content/role. NOT backed by a backend field or API filter -- pure string matching, unreliable.

3. **Quarter filter "current" / "previous"** (radar page, lines 49-53): Sent to API as `quarter=current` or `quarter=previous`, but backend `applyRadarFilters` does exact match `item.quarter = :quarter` (newspaper.service.ts line 470). This means the backend expects values like "2026Q2", not "current"/"previous". The filter may return zero results unless FeedItem.quarter values happen to equal the string "current".

   **BUG CONFIRMED**: Radar page sends `quarter=current` but backend does `WHERE item.quarter = 'current'`. FeedItem.quarter values are stored as "2026Q2" format (from feed-classifier). This filter silently returns zero results.

---

## 4. Implementation Recommendations

### 4.1 Keep As-Is

- **Newspaper main page** (`/newspaper`): Well-implemented with hero section, tabs, trending tags, card grid, coach actions. Matches the design reference closely.
- **External link pattern**: All cards correctly link to `source_url`, no third-level detail pages.
- **Source-kind semantic split**: XHS/Nowcoder/WeChat distinction is correctly implemented end-to-end.
- **Digest page** (`/digest`): Functional source management, content submission, and filtering.

### 4.2 Fix Bugs

1. **Quarter filter bug**: The radar page sends `quarter=current`/`quarter=previous` but the backend expects actual quarter strings like "2026Q2". Fix either:
   - Backend: Translate "current"/"previous" to actual quarter strings in `applyRadarFilters()`
   - Frontend: Compute and send actual quarter string

2. **Trending tags non-interactive**: Add `onClick` to navigate to radar page with the tag as keyword search.

3. **Category label mismatch**: Tab label "题库" uses key `editorial` (newspaper/page.tsx line 151). Either rename the tab label to match or add a separate `question_bank` category.

4. **Hardcoded role tabs**: Radar page role tabs are hardcoded (lines 32-40). Should fetch from backend RoleCategory data.

### 4.3 Add Second-Level Radar Workspace

Enhance `/newspaper/radar` into a workspace with sub-tabs:

#### a. Company Radar

- **New backend endpoint**: `GET /newspaper/radar/companies`
  - Aggregate feed_items by company_id
  - Return: company name, aliases, company_type, priority, quarterly item count, source breakdown (xhs/nowcoder/wechat counts), role coverage list, average quality_score, interview count
  - Use Company + CoverageMetric + FeedItem entities (all exist)

- **New frontend page**: `/newspaper/radar/companies`
  - Company list with sortable columns (item count, quality, coverage)
  - Click company name -> filter radar search to that company
  - Source breakdown pie chart per company
  - Coverage status indicators

#### b. Role Radar

- **New backend endpoint**: `GET /newspaper/radar/roles`
  - Aggregate feed_items by role_category_id
  - Return: role_key, label, company distribution, source distribution, common question_types (from question_taxonomy), item count, hot_topics

- **New frontend page**: `/newspaper/radar/roles`
  - Role category cards with company distribution
  - Common questions list (from question_taxonomy seed data)
  - Source preference display (xhs vs nowcoder balance)

#### c. Trend Radar

- **New backend endpoint**: `GET /newspaper/radar/trends`
  - Compare this week vs last week: new companies, new roles, new sources
  - Popularity changes (item count delta by company/role)
  - Use `created_at` date ranges for comparison

- **New frontend page**: `/newspaper/radar/trends`
  - "本周新增" section: newly appeared companies, roles, sources
  - Trend indicators (up/down arrows)
  - Week-over-week comparison cards

#### d. Search/Filter Results

- **Already exists** at `/newspaper/radar`
- Enhancement: Add confidence level filter (high/medium/low) as explicit tabs
- Enhancement: Make trending tags clickable to pre-fill keyword search

### 4.4 Each Result Links to source_url, No Third-Level Detail Pages

**Already correctly implemented.** No changes needed. Maintain this pattern for all new radar sub-pages.

---

## 5. Acceptance Criteria

### 5.1 Backend API Gaps

| Gap | Priority | Existing Data | Endpoint Needed |
|---|---|---|---|
| Company list with stats | High | Company entity, CoverageMetric, FeedItem.company_id | `GET /newspaper/radar/companies` |
| Role list with stats | High | RoleCategory entity, FeedItem.role_category_id | `GET /newspaper/radar/roles` |
| Weekly trend diff | Medium | FeedItem.created_at, Company, RoleCategory | `GET /newspaper/radar/trends` |
| Coverage metrics dashboard | Low | CoverageMetric entity fully populated | `GET /newspaper/coverage` |
| Fix quarter filter translation | Critical (bug) | FeedItem.quarter stores "2026Q2" format | Fix in `applyRadarFilters()` |
| Expose role_trends in newspaper edition | Low | Already computed, not rendered | Frontend-only fix |

### 5.2 Frontend Playwright Desktop E2E Path

The following E2E test paths should be verified/created:

1. **Newspaper main page flow:**
   - Navigate to `/newspaper`
   - Verify hero section renders 3 cards (editor's pick, 24H hot, coach)
   - Click each category tab, verify grid updates
   - Verify trending tags bar appears (if data exists)
   - Click sort toggle (最新发布 / 仅校招)
   - Verify each feed card shows source_kind badge
   - Click "原文" link -> verify `target="_blank"` external link
   - Click "搜面经" -> navigates to `/newspaper/radar`
   - Error state: verify error banner on API failure
   - Empty state: verify empty state message with CTA

2. **Radar page flow:**
   - Navigate to `/newspaper/radar`
   - Back link -> navigates to `/newspaper`
   - Type in company search -> verify results filter
   - Type in keyword search -> verify results filter
   - Click role category tabs -> verify results update
   - Click source_kind tabs -> verify results update
   - Click quarter tabs -> **currently broken (see bug #1)**
   - Verify stats bar shows company/role pills
   - Click company pill -> verify results filter by company
   - Click role pill -> verify results filter by role
   - Verify confidence badges (高置信/中置信/低置信)
   - Low confidence items have reduced opacity
   - Click "原文" -> verify external link
   - Click "加载更多" -> verify more items load

3. **Digest page flow:**
   - Navigate to `/digest`
   - Verify status grid (3 cards)
   - Click source filter buttons -> verify results update
   - Click category filter buttons -> verify results update
   - Type keyword -> verify results update
   - Click "写面经" -> modal opens
   - Fill form and submit -> new item appears
   - Click "导入来源" -> import runs
   - Click "原文" on card -> verify external link

### 5.3 Data Requirements

- **Use real XHS/Nowcoder data, no mock**: The current implementation correctly only displays items with valid `source_url` (newspaper.service.ts line 98-100). Empty states are properly handled with informative messages (not fake cards).
- **No mock data in cards**: All card content comes from `GET /newspaper` or `GET /newspaper/radar` API responses. No hardcoded card content in frontend.
- **Source-kind labels are real**: Labels map directly from `source_kind` enum values to Chinese labels (小红书/牛客/公众号).

### 5.4 Mobile Deferred

- Responsive CSS exists in all three pages (newspaper, radar, digest) with `@media (max-width: 720px)` breakpoints
- Mobile layout adjusts grid columns (3 -> 2 -> 1)
- Mobile testing deferred per project standards

---

## Appendix: File Reference

### Frontend Source Files

| File | Path | Lines |
|---|---|---|
| Newspaper main page | `.worktrees/newspaper-impl/packages/web/src/app/(main)/newspaper/page.tsx` | 1-1134 |
| Radar page | `.worktrees/newspaper-impl/packages/web/src/app/(main)/newspaper/radar/page.tsx` | 1-792 |
| Digest page | `.worktrees/newspaper-impl/packages/web/src/app/(main)/digest/page.tsx` | 1-1171 |
| Layout (sidebar nav) | `.worktrees/newspaper-impl/packages/web/src/app/(main)/layout.tsx` | 1-561 |
| Types | `.worktrees/newspaper-impl/packages/web/src/lib/types.ts` | 1-510 |
| API client | `.worktrees/newspaper-impl/packages/web/src/lib/api.ts` | 1-53 |

### Backend Source Files

| File | Path | Lines |
|---|---|---|
| Newspaper controller | `.worktrees/newspaper-impl/packages/api/src/feed/newspaper.controller.ts` | 1-36 |
| Newspaper service | `.worktrees/newspaper-impl/packages/api/src/feed/newspaper.service.ts` | 1-480 |
| Feed controller | `.worktrees/newspaper-impl/packages/api/src/feed/feed.controller.ts` | 1-60 |
| Feed service | `.worktrees/newspaper-impl/packages/api/src/feed/feed.service.ts` | 1-135 |
| Feed query DTO | `.worktrees/newspaper-impl/packages/api/src/feed/dto/feed-query.dto.ts` | 1-23 |
| FeedItem entity | `.worktrees/newspaper-impl/packages/api/src/feed/entities/feed-item.entity.ts` | 1-134 |
| Company entity | `.worktrees/newspaper-impl/packages/api/src/feed/entities/company.entity.ts` | 1-50 |
| RoleCategory entity | `.worktrees/newspaper-impl/packages/api/src/feed/entities/role-category.entity.ts` | 1-30 |
| CoverageMetric entity | `.worktrees/newspaper-impl/packages/api/src/feed/entities/coverage-metric.entity.ts` | 1-42 |
| Company registry service | `.worktrees/newspaper-impl/packages/api/src/feed/company-registry.service.ts` | 1-178 |
| Source registry service | `.worktrees/newspaper-impl/packages/api/src/feed/source-registry.service.ts` | 1-121 |
| Search scheduler service | `.worktrees/newspaper-impl/packages/api/src/feed/search-scheduler.service.ts` | 1-204 |
| Feed module | `.worktrees/newspaper-impl/packages/api/src/feed/feed.module.ts` | 1-52 |
| Feed types | `.worktrees/newspaper-impl/packages/api/src/feed/types/feed.types.ts` | 1-24 |
| Newspaper types | `.worktrees/newspaper-impl/packages/api/src/feed/types/newspaper.types.ts` | 1-19 |

### Test Files

| File | Path | Tests |
|---|---|---|
| Newspaper E2E | `.worktrees/newspaper-impl/packages/api/test/newspaper.e2e-spec.ts` | 26 tests |
