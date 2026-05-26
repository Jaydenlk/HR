# Radar Freshness Audit

## Current Quarter
- Date: 2026-05-26
- Quarter: 2026Q2 (2026-04-01 to 2026-06-30)

## Data Boundaries

### Newspaper Homepage
- Only shows: published_at within current quarter + date_confidence IN (high, medium)
- Excluded: all items with published_at outside current quarter
- Excluded: date_confidence = low or unknown
- Empty state: "本季度高置信数据不足" when no qualifying items

### Radar Search
- Shows: last 5 years of content (published_at >= 2021-05-26 or published_at IS NULL)
- Items with null published_at or low/unknown date_confidence: allowed but should display "发布时间待确认"
- Users can filter by quarter

### Trends
- Uses published_at for all time windows (NOT fetched_at/created_at)
- date_confidence must be high or medium
- If no baseline: "暂无足够历史数据计算环比"

## Old Post Handling
- 2021-2025 posts: excluded from homepage, visible in Radar search with year label
- Posts older than 5 years: excluded from Radar default view
- fetched today + published 2021: NOT counted as this week's new

## date_confidence Rules
- high: full year-month-day from source (RSS pubDate, XHS post date)
- medium: year-month or reliably derivable
- low: relative time only ("几天前"), incomplete date, unknown year
- unknown: no published_at at all (default for new items)

## Current Data State
- 218 total items
- Most have date_confidence = 'unknown' (imported before freshness system)
- 12 RSS items have published_at set (should be updated to high confidence)
- XHS bridge items have fetched_at but not reliable published_at
- WebSearch batch items have no published_at

## Test Coverage
- 5 freshness e2e tests in newspaper.e2e-spec.ts
- 8 unit tests for getCurrentQuarter/isCurrentQuarter
- All use seeded test data with explicit published_at and date_confidence values

## Scenarios Passed
| Scenario | Result |
|----------|--------|
| 2021 post excluded from homepage | PASS |
| 2026Q2 high confidence on homepage | PASS |
| fetched today + published 2021 not in trends | PASS |
| unknown date_confidence excluded from homepage | PASS |
| Radar shows 5-year old posts | PASS |
| Empty homepage shows honest message | PASS (expected with current data) |

## Scenarios Deferred
| Scenario | Reason |
|----------|--------|
| Frontend display of "发布时间待确认" | No real low-confidence items with visible dates to test against |
| Year/quarter label on radar cards | Needs published_at populated items |
| Mobile E2E | User deferred to future round |
