# Radar Workspace Playwright Evidence

## Test Environment
- Branch: feature/radar-workspace
- API: radar-workspace worktree, port 3002
- Web: radar-workspace worktree, port 3000
- Data: 218 feed items (121 XHS + 97 Nowcoder)
- Date: 2026-05-26

## Desktop E2E Results

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
- [x] Click "查看该公司面经" → switches to search tab → company filter pre-filled → results filtered (腾讯 = 13 results)

### Role Radar Tab
- [x] 13 role category cards with Chinese labels
- [x] Source preference labels: 偏 XHS / 偏牛客 / 均衡
- [x] top_companies tags present
- [x] common_question_keywords (常见考点) present
- [x] representative_posts with clickable source_url links
- [x] No "null" role category card

### Trend Tab
- [x] Shows "本周新增 218 条面经"
- [x] "暂无足够历史数据计算环比" honest message (no baseline)
- [x] New companies list
- [x] Source distribution: 小红书 121 / 牛客 97
- [x] Hot posts with clickable source_url

### Freshness
- [x] Backend test: 2021 post excluded from homepage (56 e2e tests pass)
- [x] Backend test: 2026Q2 high confidence post included
- [x] Backend test: fetched today + published 2021 not counted as this week
- [x] Backend test: unknown date_confidence excluded from homepage
- [ ] Frontend Playwright verification of freshness: DEFERRED — current real data all has date_confidence=unknown, so homepage shows "本季度高置信数据不足" honest empty state. This is correct behavior. Real freshness UI testing requires data with proper published_at dates, which will come from future XHS/RSS imports that set date_confidence.

### Search Enhancements
- [x] Homepage trending tags clickable → navigates to radar with keyword

### Bug Fixes Verified
- [x] Quarter filter: "current" maps to "2026Q2" (not literal match)
- [x] No "null" in company radar
- [x] No "null" in trend role categories
- [x] Role labels all Chinese, no raw keys

## Mobile E2E
- [ ] DEFERRED per user instruction (desktop only this round)

## PJR Results
- [x] tsc --noEmit: PASS
- [x] nest build: PASS
- [x] eslint src/: PASS (0 errors, 0 warnings)
- [x] next build: PASS
- [x] 56 newspaper e2e tests: PASS
- [x] 45 radar-helpers unit tests: PASS
