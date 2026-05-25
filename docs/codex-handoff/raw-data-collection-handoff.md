# 原始数据采集交接文档

> 给下一轮 Claude Code / Codex 的操作手册
> 日期：2026-05-26
> 当前分支：dev
> 目标：睡眠期间做原始数据采集，不开发新功能

---

## 一、当前分支与状态

### 分支

- **当前分支：** `dev`
- **工作区：** `E:\Agent program\HRBP`（主仓库）
- **Evidence Layer E0-E7 已合并 dev** — commit `819b012`

### 最近 10 个 commit

```
819b012 refactor: remove unused mockCompanies variable
3cf7cb4 fix(E7): knowledge_gaps from QuestionItem array + single company signal source + newspaper E7 test
b8ba6e6 docs: E7 info-chain fix recorded — 10 sources unified
ada0474 fix(E7): 4 information chain breaks — company signals, question text, mock grade, README
98c527f docs: E7 complete — 10 core modules in Evidence Layer
934a269 feat(E7): add interviews/mock_sessions/cover_letters to Evidence Layer
f9b4cc0 docs: E6 stability fix recorded in WORKLIST
7fbb172 fix(E6): recordSuccess clears last_error + fix stability test mocks
26421b1 docs: E6 complete — source health + fallback, real availability noted
680654c feat(E6): FeedSource health tracking + Nowcoder multi-URL fallback
```

### 数据源可用性

| 来源 | 状态 | 启动方式 | 端口 | 已知风险 |
|------|------|---------|------|---------|
| **XHS** | 需手动启动 bridge | `cd .tools && node xhs-bridge.mjs` | 18060 | Playwright 抓取每条 5-10 秒；反爬可能导致崩溃；每次限 5 条（IMPORT_LIMIT）；用户需事先扫码授权（cookie 在 `~/.xhs-mcp/cookies.json`） |
| **牛客** | 自动（env var 配好） | 无需手动启动 | — | 依赖公共 RSSHub `rsshub.rssforever.com`，不稳定；支持逗号分隔多 URL fallback（在 .env RSS_FEED_URL 中配置） |
| **公众号** | 需 Docker + 扫码 | `docker start we-mp-rss` | 8001 | 需要 Docker Desktop 运行；用户需在 `http://localhost:8001` 登录（admin/coach2026）并微信扫码授权；授权可能过期 |

### 环境变量（packages/api/.env）

```
XHS_MCP_BASE_URL=http://localhost:18060
RSS_FEED_URL=https://rsshub.rssforever.com/nowcoder/interview/11200
WECHAT_SOURCE_FEEDS=http://localhost:8001
WECHAT_RSS_USERNAME=admin
WECHAT_RSS_PASSWORD=coach2026
CLOUDDREAM_API_KEY=sk-...（已配置）
```

---

## 二、数据采集现状

### XHS Bridge 操作流程

```powershell
# 1. 启动 bridge（需用户先扫码过一次）
cd "E:\Agent program\HRBP\.tools"
node xhs-bridge.mjs
# 等待 "Ready! XHS bridge is accepting requests."

# 2. 验证 bridge 在线
Invoke-WebRequest -Uri "http://localhost:18060/health" -UseBasicParsing

# 3. 启动 API
cd "E:\Agent program\HRBP\packages\api"
npx.cmd nest start

# 4. 登录获取 token
$token = ((Invoke-WebRequest -Uri "http://localhost:3002/api/auth/login" -Method POST `
  -ContentType "application/x-www-form-urlencoded" `
  -Body "email=test@example.com&name=test&invite_code=COACH2026" `
  -UseBasicParsing).Content | ConvertFrom-Json).access_token

# 5. 获取 XHS source ID
$sources = (Invoke-WebRequest -Uri "http://localhost:3002/api/feed/sources" `
  -Headers @{Authorization="Bearer $token"} -UseBasicParsing).Content | ConvertFrom-Json
$xhsId = ($sources | Where-Object { $_.kind -eq 'xhs' }).id

# 6. 触发导入（默认关键词"校招 面经"，限 5 条）
Invoke-WebRequest -Uri "http://localhost:3002/api/feed/import" -Method POST `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{`"source_id`":`"$xhsId`"}" -UseBasicParsing -TimeoutSec 300

# 7. 验证入库
$feed = (Invoke-WebRequest -Uri "http://localhost:3002/api/feed?source_kind=xhs" `
  -Headers @{Authorization="Bearer $token"} -UseBasicParsing).Content | ConvertFrom-Json
Write-Host "XHS items: $($feed.Count)"
```

**定向搜索（非默认关键词）：**
XHS importer 的 `fetch(source, keyword)` 接受 keyword 参数。通过 import API 的 keyword 字段传递：

```powershell
Invoke-WebRequest -Uri "http://localhost:3002/api/feed/import" -Method POST `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{`"source_id`":`"$xhsId`",`"keyword`":`"字节跳动 后端 面经`"}" `
  -UseBasicParsing -TimeoutSec 300
```

### 牛客 RSS 操作流程

牛客不需要手动触发——API 启动时 source registry 自动标记 active（如果 RSS_FEED_URL 环境变量存在）。

```powershell
# 触发牛客导入
$nowcoderId = ($sources | Where-Object { $_.kind -eq 'nowcoder' }).id
Invoke-WebRequest -Uri "http://localhost:3002/api/feed/import" -Method POST `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{`"source_id`":`"$nowcoderId`"}" -UseBasicParsing -TimeoutSec 60
```

**多 URL Fallback：** RSS_FEED_URL 支持逗号分隔多个 URL，按顺序尝试：
```
RSS_FEED_URL=https://rsshub.rssforever.com/nowcoder/interview/11200,https://rsshub.app/nowcoder/interview/11200
```

### 公众号 We-MP-RSS 操作流程

```powershell
# 1. 确保 Docker Desktop 运行
docker start we-mp-rss

# 2. 访问 http://localhost:8001 登录（admin/coach2026）

# 3. 在 Web UI 中添加目标公众号（搜索+关注）

# 4. 触发导入
$wechatId = ($sources | Where-Object { $_.kind -eq 'wechat' }).id
Invoke-WebRequest -Uri "http://localhost:3002/api/feed/import" -Method POST `
  -Headers @{Authorization="Bearer $token"; "Content-Type"="application/json"} `
  -Body "{`"source_id`":`"$wechatId`"}" -UseBasicParsing -TimeoutSec 60
```

### 关键文件路径

| 文件 | 用途 |
|------|------|
| `packages/api/src/feed/feed-ingestion.service.ts` | 采集入口（import/importDaily） |
| `packages/api/src/feed/importers/xhs-importer.service.ts` | XHS 适配器（IMPORT_LIMIT=5，DEFAULT_TIMEOUT=120s） |
| `packages/api/src/feed/importers/rss-importer.service.ts` | 牛客 RSS 适配器（多 URL fallback） |
| `packages/api/src/feed/importers/wechat-importer.service.ts` | 公众号适配器 |
| `packages/api/src/feed/feed-classifier.service.ts` | AI 分类（company/role/category/confidence） |
| `packages/api/src/feed/search-scheduler.service.ts` | 定向搜索调度（coverage gap → query） |
| `.tools/xhs-bridge.mjs` | XHS HTTP 桥接脚本 |
| `data/sources/company_seed.json` | 80 家目标公司 seed |
| `data/sources/role_categories.json` | 12 个岗位大类 seed |
| `data/sources/search_targets.json` | 旧版搜索目标（已被 company_seed 替代） |

---

## 三、下一 Session 目标

### 目标

睡眠期间做**原始数据采集**，不是开发新功能。

### 优先级

1. **XHS 面经**（最重要）— 定向搜索 A 类公司 × 核心岗位
2. **牛客技术面经**（次要）— RSS 导入
3. **公众号认知补给**（可选）— 仅在 Docker 可用时

### 采集策略

不要用单一泛关键词"校招 面经"。按 `company_seed.json` 中的 A 类公司 × 岗位组合定向搜索：

```
字节跳动 后端 面经
字节跳动 产品 面经
腾讯 算法 面经
阿里 后端 面经
美团 运营 面经
...
```

每个组合搜 3-5 条，去重入库。

### 每条数据必须包含

| 字段 | 要求 |
|------|------|
| source_url | 必须非空，可点击跳转 |
| source_kind | xhs / nowcoder / wechat |
| company | AI 分类提取，null 则标 null |
| role | AI 分类提取 |
| title | 不超过 200 字 |
| summary | AI 生成，不超过 1000 字 |
| author | 如能获取 |
| published_at / fetched_at | 至少有 fetched_at |
| confidence | AI 分类置信度 |

### 禁止事项

- ❌ 不能伪造数据
- ❌ 不能用 mock 冒充真实导入
- ❌ 不能用"搜索到了"代替"已入库"
- ❌ 不能只搜一个关键词说完成
- ❌ 不能开发新功能

---

## 四、防摸鱼规则

### 每次声称成功必须写证据

```
命令: POST /api/feed/import { source_id: "xxx", keyword: "字节跳动 后端 面经" }
返回: { runs: [{ status: "success", fetched_count: 4, saved_count: 3, skipped_count: 1 }] }
入库验证: GET /api/feed?source_kind=xhs&company=字节跳动 → 3 items
样例 URL: https://www.xiaohongshu.com/explore/xxxxx
```

### 如果搜到了但未入库，必须说明

| 卡在哪一步 | 如何判断 |
|-----------|---------|
| bridge 未启动 | health endpoint 503 |
| Playwright 打开失败 | bridge 返回 500 + error message |
| 内容截取失败 | fetched_count=0 |
| AI 分类失败 | fetched_count>0 but saved_count=0, skipped_count>0 |
| 去重跳过 | skipped_count>0（已存在的 URL） |
| DB 保存失败 | 查 API 日志 |

### 单个 source 失败不阻塞

牛客 RSS 挂了不影响 XHS 导入。XHS bridge 崩了不影响牛客。每个 source 独立记录 run status。

---

## 五、输出模板

下一 session 完成后，必须填写以下表格并追加到本文档末尾。

### Run 概览

| 维度 | 值 |
|------|---|
| Run 开始时间 | |
| Run 结束时间 | |
| API 版本 (commit) | |
| XHS bridge 状态 | |
| 牛客 RSS 状态 | |
| 公众号状态 | |

### 平台采集统计

| 平台 | attempted | imported | skipped | failed | 说明 |
|------|-----------|----------|---------|--------|------|
| XHS | | | | | |
| 牛客 | | | | | |
| 公众号 | | | | | |
| **合计** | | | | | |

### 公司覆盖

| 公司 | XHS 条数 | 牛客条数 | 合计 |
|------|---------|---------|------|
| 字节跳动 | | | |
| 腾讯 | | | |
| 阿里巴巴 | | | |
| 美团 | | | |
| 京东 | | | |
| 拼多多 | | | |
| 华为 | | | |
| ... | | | |

### 岗位大类覆盖

| 岗位大类 | XHS 条数 | 牛客条数 | 合计 |
|---------|---------|---------|------|
| backend | | | |
| frontend | | | |
| algorithm | | | |
| product | | | |
| operations | | | |
| hr | | | |
| design | | | |
| data | | | |
| ... | | | |

### 失败记录

| URL/Query | 平台 | 失败阶段 | 错误信息 |
|-----------|------|---------|---------|
| | | | |

### 质量样例（10 条）

| # | 公司 | 岗位 | 标题 | 来源 | source_url | confidence |
|---|------|------|------|------|-----------|-----------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |
