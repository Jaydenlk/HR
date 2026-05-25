# Digest Source Ingestion Product Design

Date: 2026-05-25

Status: Draft for user review

## Goal

Turn Monthly/Digest from a decorative feed into a trusted job-market intelligence product.

The user should be able to open Digest and trust that every item has:

- a real source,
- a clickable original URL,
- a clear source type,
- a correctly identified company and role when applicable,
- a visible publish/capture time,
- a summary that does not fabricate beyond the source,
- and a repeatable ingestion path that can refresh recent market information.

This is not a marketing page and not a generic community feed. It is an editorial-quality, source-backed intelligence layer for job seekers.

## Non-Goals

- Do not scrape or store full copyrighted articles when summaries and links are enough.
- Do not claim Xiaohongshu or WeChat automation is complete without a configured and verified access path.
- Do not use fake fallback "hot" claims when no source data exists.
- Do not keep frontend-only hardcoded market intelligence.
- Do not mix PDD, ByteDance, Tencent, or other company-specific interview experiences into a generic bucket when the source identifies a company.

## Product Model

Digest has four content lanes:

1. **面经**
   - Primary sources: Xiaohongshu, NowCoder, verified public interview posts.
   - Purpose: understand current interview questions, company-specific process, role-specific signals.

2. **市场一线**
   - Primary sources: 晚点, 36氪, 财经/科技 media, high-quality WeChat official account articles when accessible.
   - Purpose: understand real industry movement, AI hiring, company strategy, market temperature.

3. **求职信息差**
   - Primary sources: selected WeChat official accounts, public blogs, NowCoder/Zhihu high-quality posts.
   - Purpose: tactical advice: referral mechanics, offer negotiation, platform choice, internship conversion.

4. **Coach 编辑精选**
   - Derived from the above sources.
   - Purpose: summarize "what changed and what should I do about it?"
   - Must cite source items used to produce the summary.

## Source Adapters

### Xiaohongshu Adapter

Primary path: local `xiaohongshu-mcp`.

Expected configuration:

```text
XHS_MCP_BASE_URL=http://localhost:18060
```

Required operations:

- Check MCP health/login status before import.
- Search role/company-specific keywords through `search_feeds`.
- Use filters:
  - `publish_time`: one day for daily update, one week for manual backfill.
  - `sort_by`: latest for freshness, most liked/collected for editorial discovery.
- Store title, summary/excerpt, author, original URL, company, role, captured time, and confidence.
- Do not store full comments or full post body unless explicitly needed and legally acceptable.

Fallback path: Apify `kuaima/xiaohongshu-search`.

Expected configuration:

```text
APIFY_API_TOKEN=...
```

Rule:
- Apify is acceptable only if the token is configured and a live import succeeds.
- If neither MCP nor Apify is configured, XHS import must return a visible "not configured" admin status and Digest must not pretend XHS is covered.

### NowCoder Adapter

Primary path: RSSHub NowCoder experience route.

Expected configuration:

```text
RSSHUB_BASE_URL=https://rsshub.app
NOWCODER_EXPERIENCE_ROUTE=/nowcoder/experience/639
```

Rules:
- Prefer self-hosted RSSHub if public RSSHub is blocked.
- If RSSHub fails, log the failure and expose it in import status.
- Do not replace failed NowCoder source with unrelated GitHub fallback while still calling it NowCoder.
- Each imported item must preserve the source URL.

### Media/WeChat Adapter

This lane is source-list driven.

Configuration file:

```text
data/sources/digest_sources.json
```

Each source entry:

```json
{
  "id": "latepost-ai",
  "name": "晚点",
  "type": "media",
  "lane": "market_insight",
  "url": "https://...",
  "ingestion_method": "rss_or_web",
  "trust_level": "editorial",
  "enabled": true
}
```

Rules:
- If a source cannot be crawled reliably, it can still be used as manually verified editorial seed, but it must be marked `ingestion_method: "manual_verified"`.
- WeChat official account content should not be represented as "auto imported" unless the actual access path is configured and tested.
- Manual verified items are allowed for v1 only when the original URL, source name, and captured time are stored.

## Data Model

Replace the current generic feed shape with source-backed fields.

### `feed_sources`

Purpose: source registry.

Fields:

- `id`
- `name`
- `type`: `xhs | nowcoder | media | wechat | blog | user`
- `lane`: default lane
- `base_url`
- `ingestion_method`: `xhs_mcp | apify | rsshub | web | manual_verified | user_post`
- `enabled`
- `trust_level`: `official | editorial | community | unverified`
- `last_imported_at`
- `last_error`
- `created_at`
- `updated_at`

### `feed_items`

Purpose: user-facing Digest items.

Fields:

- `id`
- `source_id`
- `source_name`
- `source_type`
- `source_url`
- `external_id`
- `title`
- `raw_excerpt`
- `summary`
- `company`
- `role`
- `lane`: `interview_exp | market_insight | job_tips | editorial`
- `tags`
- `author`
- `published_at`
- `captured_at`
- `confidence`
- `ingestion_method`
- `dedupe_key`
- `created_at`
- `updated_at`

Important:
- `source_url` is required for imported or manual-verified content.
- `company` can be null only for non-company-specific market/job-tip items.
- `confidence` is lowered when company/role extraction is uncertain.

### `digest_runs`

Purpose: audit trail for imports.

Fields:

- `id`
- `started_at`
- `finished_at`
- `mode`: `daily | manual | backfill`
- `source_filter`
- `status`: `success | partial | failed`
- `items_seen`
- `items_created`
- `items_skipped`
- `error_summary`

## AI Use

CloudDreamAI `auto-v2` is the only default AI provider for Digest summarization/classification.

AI tasks:

- classify lane,
- extract company,
- extract role,
- summarize source into short Chinese digest copy,
- generate editorial "what changed / why it matters / what to do" insights from source items.

AI must not:

- invent source URLs,
- invent company/role if confidence is low,
- mix companies,
- quote large portions of the original text,
- turn a generic market article into company-specific interview experience.

Structured output from AI should include:

```json
{
  "summary": "...",
  "lane": "interview_exp",
  "company": "拼多多",
  "role": "前端工程师",
  "confidence": 0.84,
  "reason": "标题和正文均出现拼多多/前端/校招面经"
}
```

If confidence is below threshold, store `company = null` and mark item as generic.

## Ingestion Flow

### Daily Run

At local server time, daily after midnight:

1. Create `digest_run`.
2. Load enabled sources.
3. For each source, import recent 24h items.
4. Normalize source records.
5. Deduplicate by source URL or external ID.
6. Run AI classification/summarization when needed.
7. Save items.
8. Save import status.
9. Generate editorial summary only from successfully imported items.

### Manual Backfill

Admin/manual endpoint:

```text
POST /api/feed/import
```

Payload:

```json
{
  "source": "xhs",
  "keyword": "拼多多 前端 面经",
  "window": "week"
}
```

Manual import must return:

- source backend used,
- items seen,
- items created,
- items skipped,
- errors,
- sample imported item titles.

## Frontend Experience

Digest should display source confidence directly in the UX:

- source label: 小红书 / 牛客 / 晚点 / 36氪 / 公众号 / 用户分享,
- original link,
- company filter,
- role filter,
- publish/capture time,
- "来源未配置" admin notice when XHS or key source path is not configured.

Empty state rules:

- If no data: say "暂无已验证来源内容".
- Do not show fake PDD salary, fake hot topics, or fake 24h data.
- Show setup status and next action instead.

Cards:

- Interview cards emphasize company + role + source.
- Market insight cards emphasize source + summary + why it matters.
- Job-tip cards emphasize actionability.
- Editorial summary card cites the source items it uses.

## Error Handling

- Source unavailable: record `last_error`, run status `partial`, and continue other sources.
- XHS not configured: return `backend: none`; do not create fake items.
- AI unavailable: store normalized item with raw excerpt and `summary_status: pending`, then retry later.
- Source URL missing for imported source: skip item unless source is user-created content.

## Testing Requirements

### Backend

Non-AI tests:

- create/import source config,
- import status when XHS not configured,
- source URL required for imported content,
- dedupe by URL,
- company filter returns only matching company,
- PDD item does not appear under ByteDance filter,
- source outage records `digest_runs.status = partial`,
- unauthorized import returns 401.

AI tests:

- classify a complex XHS-style PDD frontend interview note.
- classify a ByteDance AI market article as market insight, not interview experience.
- refuse company extraction for generic market article.
- verify Chinese summary.
- verify source URL preserved.
- verify no invented company when not present.

### Frontend Playwright

Desktop and mobile:

- login,
- open Digest,
- verify no fake fallback cards when DB has no imported items,
- run/manual-trigger import status if admin UI exists,
- search ByteDance and PDD separately,
- click original source link,
- submit user feed item,
- verify validation errors for missing title/content,
- verify mobile card layout and filters.

### Data Verification

Seed/backfill data must pass:

- source URL reachable or manually verified,
- title/source match,
- company match,
- category match,
- no duplicate source URL,
- no unverifiable market claim without source.

## Migration Strategy

This project has no backwards-compatibility requirement. Prefer a clean migration:

1. Add `feed_sources` and `digest_runs`.
2. Replace loose `FeedItem` fields with explicit source-backed fields.
3. Rewrite seed data into verified source format.
4. Remove hardcoded frontend market intelligence.
5. Rebuild importers around a shared adapter interface.

## Approval Gate

Implementation should not start until this design is reviewed and accepted.

After approval, write a detailed implementation plan and execute in a project-local worktree.

