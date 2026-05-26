# Deployment Environment Checklist — 内测版

> 分支: `dev` | 提交: `54a4bd3` | 日期: 2026-05-26

---

## 环境变量清单

### Backend (`packages/api/.env`)

| 变量名 | 用途 | Staging 必需 | 默认值 | 备注 |
|--------|------|-------------|--------|------|
| `DB_TYPE` | 数据库类型 | Yes | `sqlite` | 内测用 sqlite 即可，生产建议 postgres |
| `DB_PATH` | SQLite 数据库文件路径 | Yes (sqlite) | `./coach-dev.db` | 相对于 packages/api 目录 |
| `DB_HOST` | PostgreSQL 主机 | No (sqlite) | `localhost` | 仅 DB_TYPE=postgres 时需要 |
| `DB_PORT` | PostgreSQL 端口 | No (sqlite) | `5432` | 仅 DB_TYPE=postgres 时需要 |
| `DB_USER` | PostgreSQL 用户名 | No (sqlite) | `coach` | 仅 DB_TYPE=postgres 时需要 |
| `DB_PASS` | PostgreSQL 密码 | No (sqlite) | `coach` | 仅 DB_TYPE=postgres 时需要 |
| `DB_NAME` | PostgreSQL 数据库名 | No (sqlite) | `coach` | 仅 DB_TYPE=postgres 时需要 |
| `JWT_SECRET` | JWT 签名密钥 | Yes | `<generate>` | 必须替换为随机生成的 64 位 hex 字符串 |
| `CLOUDDREAM_API_KEY` | CloudDream AI 中转 API 密钥 | Yes | `sk-...` | 所有 AI 功能的核心依赖 |
| `CLOUDDREAM_BASE_URL` | CloudDream API 基础地址 | Yes | `https://api.tutorial.clouddreamai.com` | |
| `CLOUDDREAM_MODEL` | 使用的 AI 模型 | Yes | `auto-v2` | |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | No | (空) | 备用 AI 提供商，当前未启用 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | No | `https://api.deepseek.com/v1` | |
| `DEEPSEEK_MODEL` | DeepSeek 模型名 | No | `deepseek-chat` | |
| `XHS_MCP_BASE_URL` | 小红书 MCP bridge 地址 | No | `http://localhost:18060` | 可选 — 仅采集小红书数据时需要 |
| `RSS_FEED_URL` | RSS 订阅源地址 | No | `https://rsshub.rssforever.com/nowcoder/interview/11200` | 牛客面经 RSS，可选 |
| `WECHAT_SOURCE_FEEDS` | WeChat 公众号 RSS 地址 | No | `http://localhost:8001` | 可选 — 需要 Docker 运行 WeChat RSS 服务 |
| `WECHAT_RSS_USERNAME` | WeChat RSS 管理账号 | No | `admin` | |
| `WECHAT_RSS_PASSWORD` | WeChat RSS 管理密码 | No | `<generate>` | |
| `OSS_REGION` | 阿里云 OSS 区域 | No | `oss-cn-shanghai` | 文件存储，当前未启用 |
| `OSS_BUCKET` | OSS 存储桶名 | No | `coach-files` | |
| `OSS_ACCESS_KEY` | OSS Access Key | No | (空) | |
| `OSS_ACCESS_SECRET` | OSS Access Secret | No | (空) | |

### Frontend (`packages/web/.env.local`)

| 变量名 | 用途 | Staging 必需 | 默认值 | 备注 |
|--------|------|-------------|--------|------|
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 | Yes | `http://localhost:3002/api` | 由 `start-dev.ps1` 自动写入 |

### 端口配置 (`ports.env`)

| 变量名 | 用途 | 默认值 | 备注 |
|--------|------|--------|------|
| `API_PORT` | NestJS 后端端口 | `3002` | 也可通过 `PORT` 环境变量覆盖 |
| `WEB_PORT` | Next.js 前端端口 | `3001` | |

---

## 服务配置详情

### API 服务 (NestJS)

- **端口**: `process.env.PORT ?? 3002` (main.ts)
- **全局前缀**: `/api` — 所有接口以 `/api/` 开头
- **CORS**: `origin: true, credentials: true` — 允许所有来源（内测环境可接受）
- **验证管道**: `ValidationPipe({ whitelist: true, transform: true })` — 全局 DTO 校验
- **调度器**: `@nestjs/schedule` 已启用 — 用于定时任务（feed 采集等）

### Web 服务 (Next.js)

- **端口**: 默认 `3001` (通过 `--port` 参数指定)
- **图片优化**: 已禁用 (`images: { unoptimized: true }`)
- **API 代理**: 无 — 前端直连后端 API

### 数据库

- **类型**: SQLite (better-sqlite3) 或 PostgreSQL
- **SQLite 路径**: `packages/api/coach-dev.db`
- **自动同步**: `synchronize: true` — TypeORM 自动创建/更新表结构
- **重要**: 生产环境必须将 `synchronize` 设为 `false` 并使用 migration

### 文件上传

- **方式**: Multer 内存存储 (`FileInterceptor`)
- **支持格式**: PDF (pdf-parse)、DOCX (mammoth)、纯文本
- **存储**: 文件内容解析为文本后存入数据库，原文件不持久化
- **OSS**: 配置项存在但当前未启用

### 日志输出

- **位置**: 标准输出 (stdout/stderr) — NestJS 默认 Logger
- **无持久化日志文件**: 建议通过部署工具 (PM2/Docker) 捕获日志

---

## 最小可用配置 (内测)

仅需以下变量即可启动完整内测环境:

```env
# packages/api/.env
DB_TYPE=sqlite
DB_PATH=./coach-dev.db
JWT_SECRET=<随机生成64位hex>
CLOUDDREAM_API_KEY=sk-<有效密钥>
CLOUDDREAM_BASE_URL=https://api.tutorial.clouddreamai.com
CLOUDDREAM_MODEL=auto-v2
```

```env
# ports.env (项目根目录)
API_PORT=3002
WEB_PORT=3001
```

前端 `.env.local` 由 `start-dev.ps1` 自动生成，无需手动配置。

---

## 注册模块清单

以下 18 个 NestJS 模块已在 `app.module.ts` 中注册:

1. ConfigModule (全局)
2. ScheduleModule
3. TypeOrmModule
4. AuthModule
5. UsersModule
6. FilesModule
7. ResumesModule
8. AiModule
9. DiagnosesModule
10. ConversationsModule
11. ApplicationsModule
12. InterviewsModule
13. TasksModule
14. OverviewModule
15. MockModule
16. CoverLettersModule
17. SalaryModule
18. CareerModule
19. FeedModule
20. OpportunityModule
21. IntelligenceModule
