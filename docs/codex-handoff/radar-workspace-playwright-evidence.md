# Radar Workspace Playwright Evidence

## Test Environment
- Branch: feature/radar-workspace
- API: radar-workspace worktree, port 3002
- Web: radar-workspace worktree, port 3000
- Data: 218 feed items (121 XHS + 97 Nowcoder)
- Date: 2026-05-26

## Test Counts Summary
- **55 unit tests** (radar-helpers.spec.ts) — ALL PASS
- **61 e2e tests** (newspaper.e2e-spec.ts) — ALL PASS
- **Total: 116 tests passing**

---

## Section A: Radar Workspace UI Structure Verification (Pre-freshness)

These results were verified via real Playwright browser interaction against the live dev server.

> Note: The Trend tab showed "本周新增 218 条" before freshness rules were applied — this is a pre-freshness observation and does not reflect the post-freshness homepage behavior.

### Tab Structure
- [x] /newspaper/radar loads with 4 tabs: 搜索, 公司雷达, 岗位雷达, 趋势
- [x] Default tab is 搜索 (selected)
- [x] 218 items in search results

### Company Radar Tab
- [x] Company cards load with real data (50+ companies)
- [x] Each card shows: company name, usable count, source distribution bar (XHS red / 牛客 green)
- [x] top_roles display Chinese labels (后端开发, 产品经理, etc.), NOT raw keys
- [x] dominant_signal shows Chinese (e.g., "本周有新面经"), NOT raw role keys
- [x] No "null" company card appears
- [x] Click "查看该公司面经" switches to search tab with company filter pre-filled

### Role Radar Tab
- [x] 13 role category cards with Chinese labels
- [x] Source preference labels: 偏 XHS / 偏牛客 / 均衡
- [x] top_companies tags present
- [x] common_question_keywords (常见考点) present
- [x] representative_posts with clickable source_url links
- [x] No "null" role category card

### Trend Tab (Pre-freshness observation)
- [x] Shows "本周新增 218 条面经" (pre-freshness — all items counted before rules applied)
- [x] "暂无足够历史数据计算环比" honest message (no baseline)
- [x] New companies list
- [x] Source distribution: 小红书 121 / 牛客 97
- [x] Hot posts with clickable source_url
- [x] hot_posts include published_at and date_confidence fields

### Search Enhancements
- [x] Homepage trending tags clickable and navigate to radar with keyword

### Bug Fixes Verified
- [x] Quarter filter: "current" maps to "2026Q2" (not literal match)
- [x] No "null" in company radar
- [x] No "null" in trend role categories
- [x] Role labels all Chinese, no raw keys

---

## Section B: Freshness Backend E2E Verification

All freshness rules verified via Jest e2e test fixtures (newspaper.e2e-spec.ts). These are deterministic fixture-based tests — not dependent on real data state.

- [x] 2021 post excluded from homepage: **PASS** (fixture test)
- [x] 2026Q2 high confidence on homepage: **PASS** (fixture test)
- [x] Fetched today + published 2021 not in trends: **PASS** (fixture test)
- [x] Quarter derived from published_at not AI: **PASS** (fixture test)
- [x] Homepage requires isUsable: **PASS** (fixture test)
- [x] date_confidence import chain verified end-to-end: **PASS** (fixture test)

### Freshness Import Chain
- [x] FeedCandidate interface includes date_confidence field
- [x] RSS importer sets date_confidence: 'high' when isoDate present, 'unknown' otherwise
- [x] XHS importer always sets date_confidence: 'unknown' (no reliable dates)
- [x] WeChat importer sets date_confidence: 'high' when publish_time present
- [x] saveExternal persists date_confidence to FeedItem entity

### Quarter Derivation
- [x] deriveQuarterFromPublishedAt computes quarter from published_at date
- [x] AI-classified quarter is overridden by derived quarter in saveExternal
- [x] Low/unknown confidence yields null quarter
- [x] Missing published_at yields null quarter
- [x] 10 unit tests covering all edge cases

### Homepage isUsable Filter
- [x] Homepage applies isUsable filter after date/confidence query
- [x] Items with content < 200 chars excluded from homepage
- [x] Items with quality_score < 50 excluded from homepage
- [x] Items with low confidence excluded from homepage
- [x] Empty state returned when no usable items qualify

---

## Section C: Freshness Frontend Playwright Verification

**Status: DEFERRED**

**Reason:** Real data currently has date_confidence=unknown for the vast majority of items (all XHS bridge imports pre-date the freshness system). After freshness rules are applied, the homepage shows an empty state — which is correct behavior, but means UI freshness display cannot be verified with current data.

**What's needed:** Future XHS/RSS imports with proper date_confidence values will populate the homepage, enabling Playwright verification of:
- "发布时间待确认" label display on low-confidence items
- Year/quarter labels on radar cards
- Homepage populated state under freshness rules

---

## Section D: What Was NOT Tested

| Area | Status | Reason |
|------|--------|--------|
| Mobile E2E | DEFERRED | Per user instruction (desktop only this round) |
| Freshness frontend Playwright | DEFERRED | Backend E2E fixture tests cover the logic; real data all has date_confidence=unknown so homepage is empty state |
| "发布时间待确认" label display | DEFERRED | No real low-confidence items with visible dates in current dataset |

---

## PJR Results
- [x] tsc --noEmit: PASS
- [x] nest build: PASS
- [x] eslint src/ (web): PASS (0 errors, 0 warnings)
- [x] next build: PASS
- [x] 61 newspaper e2e tests: PASS
- [x] 55 radar-helpers unit tests: PASS
