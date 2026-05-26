# Staging Runbook — 内测环境部署手册

> 分支: `dev` | 提交: `54a4bd3` | 日期: 2026-05-26

---

## 1. Prerequisites (环境要求)

| 工具 | 最低版本 | 检查命令 |
|------|---------|---------|
| Node.js | >= 20.x | `node -v` |
| pnpm | >= 8.x | `pnpm -v` |
| Git | >= 2.x | `git -v` |
| PowerShell | >= 5.1 | `$PSVersionTable.PSVersion` |

可选 (仅需要外部数据源时):
- Docker Desktop (WeChat RSS 服务)
- Python 3.x (XHS MCP bridge)

---

## 2. Clone and Install (克隆与安装)

```powershell
# 克隆仓库
git clone <repo-url> HRBP
cd HRBP

# 切换到 dev 分支
git checkout dev

# 安装所有依赖 (monorepo)
pnpm install
```

---

## 3. Configure .env (配置环境变量)

### 3.1 后端配置

复制并编辑 `packages/api/.env`:

```env
# 数据库 — 内测用 SQLite
DB_TYPE=sqlite
DB_PATH=./coach-dev.db

# JWT — 必须替换为随机值
JWT_SECRET=<生成方式: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# AI 服务 — 必填
CLOUDDREAM_API_KEY=sk-<向管理员获取有效密钥>
CLOUDDREAM_BASE_URL=https://api.tutorial.clouddreamai.com
CLOUDDREAM_MODEL=auto-v2

# DeepSeek — 可选备用
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# 外部数据源 — 全部可选
XHS_MCP_BASE_URL=http://localhost:18060
RSS_FEED_URL=https://rsshub.rssforever.com/nowcoder/interview/11200
WECHAT_SOURCE_FEEDS=http://localhost:8001
WECHAT_RSS_USERNAME=admin
WECHAT_RSS_PASSWORD=<自行设置>

# OSS — 当前未启用，留空即可
OSS_REGION=oss-cn-shanghai
OSS_BUCKET=coach-files
OSS_ACCESS_KEY=
OSS_ACCESS_SECRET=
```

### 3.2 端口配置

编辑项目根目录 `ports.env`:

```env
API_PORT=3002
WEB_PORT=3001
```

如果端口被占用，修改此文件即可，`start-dev.ps1` 会自动读取。

---

## 4. Start Backend (启动后端)

### 方式 A: 使用一键启动脚本 (推荐)

```powershell
# 在项目根目录执行
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

脚本会自动:
1. 释放占用端口
2. 检查并安装依赖
3. 启动 NestJS 后端 (watch 模式)
4. 等待后端就绪
5. 运行 seed 数据 (如果 seed 脚本存在)
6. 启动 Next.js 前端
7. 创建默认账户
8. 打开浏览器

### 方式 B: 手动分步启动

```powershell
# 终端 1: 启动后端
cd packages/api
$env:PORT = "3002"
npx nest start --watch
```

等待看到以下日志表示后端就绪:
```
[NestFactory] Starting Nest application...
[NestApplication] Nest application successfully started
```

```powershell
# 终端 2: 启动前端
cd packages/web

# 先写入 .env.local
[System.IO.File]::WriteAllText(".env.local", "NEXT_PUBLIC_API_URL=http://localhost:3002/api`n", [System.Text.UTF8Encoding]::new($false))

$env:NEXT_PUBLIC_API_URL = "http://localhost:3002/api"
npx next dev --port 3001
```

---

## 5. Start Frontend (前端已在步骤 4 中启动)

前端启动后访问: `http://localhost:3001`

---

## 6. Health Check Commands (健康检查)

```powershell
# 检查后端是否存活 (预期: 401 Unauthorized — 表示后端正常运行)
Invoke-WebRequest -Uri "http://localhost:3002/api/auth/me" -Method GET -ErrorAction SilentlyContinue

# 检查前端是否存活 (预期: 200 OK)
Invoke-WebRequest -Uri "http://localhost:3001" -Method GET -ErrorAction SilentlyContinue

# 测试完整登录流程
$body = '{"email":"admin@coach.dev","name":"Jayden","invite_code":"COACH2026"}'
$response = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -ContentType "application/json" -Body $body
$response.access_token  # 应输出 JWT token
```

---

## 7. Create/Login Test Account (创建测试账号)

### 默认账号

`start-dev.ps1` 会自动创建:
- **Email**: `admin@coach.dev`
- **Name**: `Jayden`
- **Invite Code**: `COACH2026`

### 手动创建

```powershell
$body = '{"email":"test@coach.dev","name":"TestUser","invite_code":"COACH2026"}'
Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

### 通过浏览器登录

1. 打开 `http://localhost:3001/login`
2. 输入邮箱: `admin@coach.dev`
3. 输入姓名: `Jayden`
4. 输入邀请码: `COACH2026`
5. 点击登录

---

## 8. Stop Services (停止服务)

### 如果使用 start-dev.ps1

按 `Ctrl+C` 即可，脚本会自动清理端口。

### 手动停止

```powershell
# 查找并停止占用端口的进程
Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
```

---

## 9. Common Errors and Fixes (常见问题)

### 端口被占用

```
Error: listen EADDRINUSE: address already in use :::3002
```

**解决**: 修改 `ports.env` 中的端口号，或手动结束占用进程（见步骤 8）。

### SQLite 数据库锁定

```
Error: SQLITE_BUSY: database is locked
```

**解决**: 确保只有一个后端实例在运行。SQLite 不支持高并发写入，内测场景 (< 5 人同时在线) 通常不会触发。

### AI API 超时或 401

```
Error: 401 Unauthorized (CloudDream API)
```

**解决**: 检查 `CLOUDDREAM_API_KEY` 是否有效，确认 `CLOUDDREAM_BASE_URL` 可访问。

### PDF 解析失败

```
BadRequestException: 无法解析此文件格式
```

**解决**: 确保上传的 PDF 不是扫描件 (纯图片 PDF)。当前仅支持文本型 PDF。也可改为粘贴简历文本。

### pnpm install 失败

**解决**:
```powershell
# 清除缓存后重试
pnpm store prune
pnpm install
```

### TypeORM 实体同步错误

```
Error: QueryFailedError: table "xxx" already has a column named "yyy"
```

**解决**: 内测阶段可删除 `packages/api/coach-dev.db` 文件重新启动，数据库会自动重建 (注意: 数据会丢失)。

---

## 10. XHS Bridge Setup (小红书数据源 — 可选)

小红书数据通过 MCP bridge 采集。此为可选功能，不影响核心体验。

1. 确保 `.tools/rednote-mcp` 目录存在
2. 安装依赖并启动:
   ```powershell
   cd .tools/rednote-mcp
   npm install
   npm start
   ```
3. 验证:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:18060/health" -ErrorAction SilentlyContinue
   ```
4. 确保 `.env` 中 `XHS_MCP_BASE_URL=http://localhost:18060`

**注意**: XHS 数据采集可能受平台反爬限制，返回 0 结果属正常降级。

---

## 11. Nowcoder RSS Setup (牛客面经 — 可选)

RSS 订阅已配置默认地址，无需额外设置:

```env
RSS_FEED_URL=https://rsshub.rssforever.com/nowcoder/interview/11200
```

验证 RSS 源可访问:
```powershell
Invoke-WebRequest -Uri "https://rsshub.rssforever.com/nowcoder/interview/11200" -ErrorAction SilentlyContinue
```

如 RSSHub 实例不可用，可替换为其他 RSSHub 镜像:
- `https://rsshub.app/nowcoder/interview/11200`
- 自建 RSSHub 实例

---

## 12. WeChat/公众号 Setup (微信公众号数据源 — 可选，需 Docker)

此为最复杂的可选数据源，建议内测初期跳过。

### 前置条件
- Docker Desktop 已安装并运行

### 启动步骤

1. 启动 WeChat RSS 服务:
   ```powershell
   docker run -d --name wechat-rss -p 8001:8001 wechat-rss:latest
   ```
   (具体镜像名以实际部署文档为准)

2. 配置 `.env`:
   ```env
   WECHAT_SOURCE_FEEDS=http://localhost:8001
   WECHAT_RSS_USERNAME=admin
   WECHAT_RSS_PASSWORD=<你设置的密码>
   ```

3. 验证:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:8001" -ErrorAction SilentlyContinue
   ```

**注意**: WeChat RSS 服务需要微信登录授权，可能有 token 过期问题。内测阶段建议优先使用 RSS (牛客) 作为数据源。
