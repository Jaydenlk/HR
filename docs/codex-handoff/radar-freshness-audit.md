# Radar Freshness Audit

## Current Quarter
- Date: 2026-05-26
- Quarter: 2026Q2 (2026-04-01 to 2026-06-30)

## Data Boundaries

### Newspaper Homepage
- Only shows: published_at within current quarter + date_confidence IN (high, medium)
- Further filtered: isUsable standard (quality_score >= 50 normalized, confidence medium/high, source_url present, content >= 200 chars)
- Excluded: all items with published_at outside current quarter
- Excluded: date_confidence = low or unknown
- Excluded: items failing isUsable check (short content, low quality, missing URL)
- Empty state: returns empty arrays with coach_actions still populated when no qualifying items

### Radar Search
- Shows: last 5 years of content (published_at >= 5 years ago or published_at IS NULL)
- Items with null published_at or low/unknown date_confidence: allowed but should display "发布时间待确认"
- Users can filter by quarter (current, previous, specific like 2026Q2, all, null)

### Trends
- Uses published_at for all time windows (NOT fetched_at/created_at)
- date_confidence must be high or medium for inclusion
- hot_posts return published_at and date_confidence fields
- If no baseline week data: "暂无足够历史数据计算环比"

## Old Post Handling
- 2021-2025 posts: excluded from homepage, visible in Radar search with year label
- Posts older than 5 years: excluded from Radar default view
- Fetched today + published 2021: NOT counted as this week's new content

## date_confidence Rules
- **high**: full year-month-day from source (RSS isoDate present, WeChat publish_time present)
- **medium**: year-month or reliably derivable
- **low**: relative time only, incomplete date, unknown year
- **unknown**: no published_at at all (default for new items, XHS bridge always unknown)

### Import Chain
- FeedCandidate interface carries date_confidence from importer
- RSS importer: 'high' when isoDate parsed successfully, 'unknown' otherwise
- XHS importer: always 'unknown' (bridge returns no reliable publish dates)
- WeChat importer: 'high' when publish_time field present, 'unknown' otherwise
- saveExternal persists date_confidence to FeedItem entity column

## Quarter Derivation
- Quarter is derived from published_at date, NOT from AI classifier output
- deriveQuarterFromPublishedAt(publishedAt, dateConfidence) computes quarter
- Returns null when: published_at is null, dateConfidence is 'low' or 'unknown', date is invalid
- AI classifier's quarter field is always overridden in saveExternal
- This prevents AI from assigning wrong quarters to old or undated content

## Current Data State
- 218 total items
- Most have date_confidence = 'unknown' (imported before freshness system via XHS bridge)
- RSS items with isoDate now get date_confidence = 'high'
- WeChat items with publish_time now get date_confidence = 'high'
- XHS bridge items always get date_confidence = 'unknown' until bridge provides dates

## Test Coverage

### Unit Tests (60 total in radar-helpers.spec.ts)
- 10 deriveQuarterFromPublishedAt tests:
  - High confidence: May 2026 -> 2026Q2, March 2021 -> 2021Q1, Jan 2026 -> 2026Q1, Dec 2025 -> 2025Q4, Jul 2026 -> 2026Q3
  - Medium confidence: derives correctly
  - Null published_at: returns null
  - Low confidence: returns null
  - Unknown confidence: returns null
  - ISO string input: parses correctly
  - Invalid date string: returns null
- 7 normalizeQualityScore tests
- 7 isUsable tests
- 3 isCandidate tests
- 2 isRejected tests
- 6 normalizeQuarter tests
- 8 normalizeRoleCategory tests
- 4 getCurrentQuarter tests
- 4 isCurrentQuarter tests
- 4 buildDominantSignal tests

### E2E Tests (61 total in newspaper.e2e-spec.ts)
- 5 freshness rule tests: old post excluded, fresh post included, fetched-today-old excluded, unknown confidence excluded, radar 5-year window
- 3 quarter derivation tests: derived from published_at (not AI), null for low confidence, null for missing published_at
- 1 homepage usable filter test: short content excluded
- 1 trend hot_posts fields test: published_at and date_confidence present
- 10 GET /newspaper tests
- 4 user_voice/tech_radar section tests
- 10 GET /newspaper/radar tests
- 8 GET /newspaper/radar/companies tests
- 6 GET /newspaper/radar/roles tests
- 8 GET /newspaper/radar/trends tests
- 4 quarter filter normalization tests
- 1 coach actions personalization test
- 1 edge case test (no source_url)

## Scenarios Passed
| Scenario | Result |
|----------|--------|
| 2021 post excluded from homepage | PASS |
| 2026Q2 high confidence on homepage | PASS |
| Fetched today + published 2021 not in trends | PASS |
| Unknown date_confidence excluded from homepage | PASS |
| Radar shows 5-year old posts | PASS |
| Short content excluded by isUsable | PASS |
| Quarter derived from published_at, not AI | PASS |
| Null quarter for low confidence | PASS |
| Null quarter for missing published_at | PASS |
| hot_posts include published_at and date_confidence | PASS |
| Empty homepage shows coach_actions | PASS |

## Scenarios Deferred
| Scenario | Reason |
|----------|--------|
| Frontend display of "发布时间待确认" | No real low-confidence items with visible dates to test against |
| Year/quarter label on radar cards | Needs published_at populated items |
| Mobile E2E | User deferred to future round |
