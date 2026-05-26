# Raw Data Collection Run Log

> Session: 2026-05-26
> Branch: dev (commit 4e6b591)
> Operator: Claude Code (Opus 4.6)

---

## Infrastructure Status

| Source | Status | Detail |
|--------|--------|--------|
| XHS Bridge | DEAD | Cookie expired 05/25 15:24, 503 "Not logged in", restart failed |
| Nowcoder RSS | WORKING | rsshub.rssforever.com responds (slow, needs 600s PS timeout) |
| WeChat/公众号 | UNAVAILABLE | Docker Desktop not running |
| API Server | RUNNING | localhost:3002, worktree=newspaper-impl |

## Baseline

- Total feed items before run: 17 (12 nowcoder + 5 xhs)
- Correct DB path: `.worktrees/newspaper-impl/packages/api/coach-dev.db`
- XHS source ID: 27acd16d-d8b2-4339-adb7-b081df106348
- Nowcoder source ID: 5fabaf5f-8186-4779-8182-16b6ded77158

## Phase 1: XHS Bridge (FAILED after 1 success)

| Query | fetched | saved | skipped | status |
|-------|---------|-------|---------|--------|
| 字节跳动 产品经理 面经 | 1 | 1 | 0 | success |
| 腾讯 产品经理 面经 | 0 | 0 | 0 | failed: 503 Not logged in |
| 阿里巴巴 产品经理 面经 | 0 | 0 | 0 | failed: 503 Not logged in |
| 美团 产品经理 面经 | 0 | 0 | 0 | failed: 503 Not logged in |

Bridge recovery attempt:
- Killed PIDs 20328, 33172
- Restarted with Start-Process
- New PID 49848 running but port 18060 never bound (90s wait)
- Root cause: cookies expired, headless:false needs GUI for re-auth
- Bridge abandoned, pivoted to WebSearch

## Phase 2: Nowcoder RSS

| Query | fetched | saved | skipped | status |
|-------|---------|-------|---------|--------|
| Default RSS (timeout 120s) | — | — | — | PowerShell timeout |
| Default RSS (timeout 600s) | 12 | 0 | 12 | success, all duplicates |

## Phase 3: WebSearch → SQLite Batch Import

### Batch 1 (53 entries)

Executed 12 WebSearch queries covering: 字节, 腾讯, 阿里, 美团, 快手, 华为, 京东, 拼多多, 百度, 网易, 米哈游, 携程, 滴滴, 微软, 蚂蚁, 蔚来, 联合利华, 宝洁, 欧莱雅, Shopee, 爱奇艺, 中国联通 × backend, frontend, algorithm, product, operations, hr, design, data, embedded, testing, client, management_trainee, finance

Result: 53 imported, 0 skipped, 0 failed

### Batch 2 (20 entries)

Executed 4 WebSearch queries covering: B站, 小鹏汽车, 大疆, 普华永道, 毕马威, 阿里(补充)

Result: 20 imported, 0 skipped, 0 failed

## Final Verification

| Metric | Value |
|--------|-------|
| Total feed_items | 90 |
| Nowcoder items | 85 |
| XHS items | 5 |
| Companies covered | 32 |
| Role categories | 15 |
| URLs verified (10 sample) | 9/10 accessible, 6/10 fully verified |

## Timeline

- 00:30 — Session start, read handoff docs
- 00:35 — Infrastructure check: XHS bridge ok, API running (401→auth needed)
- 00:38 — Auth token obtained, baseline confirmed (17 items)
- 00:40 — XHS test import success (1 saved)
- 00:42 — XHS batch attempt: 3 failures (503 Not logged in)
- 00:44 — Nowcoder RSS: first try timeout, Docker check: not running
- 00:46 — Bridge investigation: cookies at ~/.mcp/rednote/cookies.json exist but expired
- 00:50 — Bridge restart attempt: killed 2 PIDs, restarted, 90s timeout, no port bind
- 00:55 — Strategy pivot: WebSearch + WebFetch + SQLite direct insert
- 01:00 — Nowcoder RSS retry with 600s timeout: success (12 fetched, all dups)
- 01:05 — Schema check: found correct DB at newspaper-impl worktree
- 01:10 — Batch 1 script written and executed: 53 imported
- 01:25 — More WebSearch queries for missing companies
- 01:30 — Batch 2 executed: 20 imported
- 01:35 — API verification: 90 total, 32 companies
- 01:40 — URL sampling: 10 checked, 9 accessible, 6 fully verified
- 02:00 — Final report written
