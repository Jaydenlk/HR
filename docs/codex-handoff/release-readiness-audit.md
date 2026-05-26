# Release Readiness Audit — 内测版

> 分支: `dev` | 提交: `54a4bd3` | 日期: 2026-05-26  
> 类型: 内测 (Internal Beta) — 非公开发布

---

## 模块审计总览

| # | 模块 | 真实API | AI依赖 | 外部数据依赖 | 后端测试 | 前端E2E | 判定 |
|---|------|---------|--------|-------------|---------|---------|------|
| 1 | Auth/Login | Yes | No | No | Yes | Deferred | 可内测 |
| 2 | Today | Yes | Yes | No | Yes | Deferred | 可内测 |
| 3 | Overview | Yes | No | No | Yes | Deferred | 可内测 |
| 4 | Resumes | Yes | Yes | No | Yes | Deferred | 可内测 |
| 5 | Diagnoses | Yes | Yes | No | No (无独立测试) | Deferred | 可内测但有限制 |
| 6 | Coach Chat | Yes | Yes | No | Yes | Deferred | 可内测但有限制 |
| 7 | Applications | Yes | No | No | Yes | Deferred | 可内测 |
| 8 | Interviews | Yes | Yes | No | Yes | Deferred | 可内测 |
| 9 | Mock Interview | Yes | Yes | No | Yes | Deferred | 可内测但有限制 |
| 10 | Salary | Yes | No | No | Yes | Deferred | 可内测 |
| 11 | Cover Letter | Yes | Yes | No | Yes | Deferred | 可内测但有限制 |
| 12 | Career | Yes | Yes | No | Yes | Deferred | 可内测但有限制 |
| 13 | Newspaper | Yes | Yes | XHS/RSS/WeChat | Yes | Deferred | 可内测但有限制 |
| 14 | Radar | Yes | Yes | XHS/RSS/WeChat | Yes | Deferred | 可内测但有限制 |
| 15 | Opportunity Intelligence | Yes | Yes | No | Yes | Deferred | 可内测 |

---

## 模块详细审计

### 1. Auth/Login

- **真实 API**: Yes — `auth.controller.ts` 提供 `POST /auth/login` 和 `GET /auth/me`
- **AI 依赖**: No
- **外部数据依赖**: No
- **后端测试**: Yes — `auth.e2e-spec.ts` (13 个 describe/it/test 调用)
- **前端 Playwright**: Deferred — 无 Playwright 测试文件
- **已知风险**: 使用邀请码 (`COACH2026`) 登录，非密码体系；JWT_SECRET 硬编码在 .env 中，内测可接受
- **判定**: **可内测**

### 2. Today (每日任务)

- **真实 API**: Yes — `tasks.controller.ts` 提供 `GET /tasks/today`, `POST /tasks/generate`, `PATCH /tasks/:id`
- **AI 依赖**: Yes — `task-generator.service.ts` 调用 AiService 生成个性化任务
- **外部数据依赖**: No
- **后端测试**: Yes — `tasks.e2e-spec.ts` (17 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: AI 生成任务依赖用户已有求职数据；空数据时可正常显示空状态
- **判定**: **可内测**

### 3. Overview (仪表板)

- **真实 API**: Yes — `overview.controller.ts` 提供 `GET /overview`
- **AI 依赖**: No — 纯聚合查询
- **外部数据依赖**: No
- **后端测试**: Yes — `overview.e2e-spec.ts` (18 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: 数据量少时仪表板数字偏低，但不影响功能
- **判定**: **可内测**

### 4. Resumes (简历管理)

- **真实 API**: Yes — `resumes.controller.ts` 提供 CRUD + 文件上传 + 版本管理
- **AI 依赖**: Yes — 通过 `parser.service.ts` 解析简历结构
- **外部数据依赖**: No
- **后端测试**: Yes — `resumes.e2e-spec.ts` (33 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: PDF/DOCX 解析依赖 `pdf-parse` 和 `mammoth` 库；极端格式可能解析失败（有 BadRequestException 兜底）
- **判定**: **可内测**

### 5. Diagnoses (简历诊断)

- **真实 API**: Yes — `diagnoses.controller.ts` 提供 `POST /diagnoses`, `GET /diagnoses`, `GET /diagnoses/:id`
- **AI 依赖**: Yes — 调用 ParserService (解析JD)、AnalyzerService (匹配分析)、RewriterService (改写建议)
- **外部数据依赖**: No
- **后端测试**: No — 无独立的 `diagnoses.e2e-spec.ts` (诊断逻辑可能被 resumes 测试间接覆盖)
- **前端 Playwright**: Deferred
- **已知风险**:
  - JD 文本需 >= 50 字，简历需 >= 30 字（有校验）
  - 三次连续 AI 调用（解析、分析、改写），单次请求可能耗时 15-30 秒
  - AI API 失败时无重试机制
- **判定**: **可内测但有限制** — 缺少独立后端测试，AI 链路长

### 6. Coach Chat (教练对话)

- **真实 API**: Yes — `conversations.controller.ts` 提供 CRUD + `POST /:id/messages`
- **AI 依赖**: Yes — `chat.service.ts` 调用 AiService
- **外部数据依赖**: No
- **后端测试**: Yes — `conversations.e2e-spec.ts` (26) + `conversation-context.e2e-spec.ts` (6) + `coach-context.e2e-spec.ts` (7) = 39 个测试调用
- **前端 Playwright**: Deferred
- **已知风险**:
  - AI 回复时间不确定（取决于 CloudDream API 延迟）
  - CLAUDE.md 记录了「AI suggestions sometimes invented resume content not present in original」的历史问题
- **判定**: **可内测但有限制** — AI 可能生成偏离事实的内容

### 7. Applications (求职追踪)

- **真实 API**: Yes — `applications.controller.ts` 提供 CRUD + stats + events
- **AI 依赖**: No — 纯 CRUD 操作
- **外部数据依赖**: No
- **后端测试**: Yes — `applications.e2e-spec.ts` (26 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: 无重大风险
- **判定**: **可内测**

### 8. Interviews (面试记录)

- **真实 API**: Yes — `interviews.controller.ts` 提供 CRUD + `POST /:id/analyze`
- **AI 依赖**: Yes — `debrief.service.ts` 调用 AiService 进行面试分析
- **外部数据依赖**: No
- **后端测试**: Yes — `interviews.e2e-spec.ts` (31 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: 面试分析 (debrief) 依赖 AI，质量取决于用户提供的 transcript 质量
- **判定**: **可内测**

### 9. Mock Interview (模拟面试)

- **真实 API**: Yes — `mock.controller.ts` 提供 CRUD + `POST /:id/answer` + `POST /:id/complete`
- **AI 依赖**: Yes — `mock.service.ts` 调用 AiService 生成面试问题和评估答案
- **外部数据依赖**: No
- **后端测试**: Yes — `mock-sessions.e2e-spec.ts` (20 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**:
  - 多轮 AI 对话，每轮 answer 都需要 AI 响应
  - AI 延迟可能影响用户体验
- **判定**: **可内测但有限制** — AI 交互延迟可能明显

### 10. Salary (薪资数据)

- **真实 API**: Yes — `salary.controller.ts` 提供 CRUD + stats + 按公司/角色/地区筛选
- **AI 依赖**: No — 纯 CRUD + 聚合
- **外部数据依赖**: No
- **后端测试**: Yes — `salary.e2e-spec.ts` (26 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**: 初始无数据时统计为空，但 UI 应能正确显示
- **判定**: **可内测**

### 11. Cover Letter (求职信生成)

- **真实 API**: Yes — `cover-letters.controller.ts` 提供 CRUD + regenerate
- **AI 依赖**: Yes — `cover-letters.service.ts` 调用 AiService 生成求职信
- **外部数据依赖**: No
- **后端测试**: Yes — `cover-letters.e2e-spec.ts` (16 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**:
  - CLAUDE.md 记录了「Cover letter generated in English despite Chinese-only requirement」的历史问题
  - 需确认当前版本是否已修复语言问题
- **判定**: **可内测但有限制** — 历史语言问题需人工验证

### 12. Career (职业规划)

- **真实 API**: Yes — `career.controller.ts` 提供 `GET /career/analysis`
- **AI 依赖**: Yes — `career.service.ts` 调用 AiService 分析职业路径
- **外部数据依赖**: No
- **后端测试**: Yes — `career.e2e-spec.ts` (5 个 describe/it/test 调用)
- **前端 Playwright**: Deferred
- **已知风险**:
  - CLAUDE.md 记录了「Career Map generated recommendations without any resume data (fabrication)」
  - 需验证空简历状态下是否拒绝生成而非编造
- **判定**: **可内测但有限制** — AI 编造风险需人工验证

### 13. Newspaper (求职日报)

- **真实 API**: Yes — `newspaper.controller.ts` 提供 `GET /newspaper`
- **AI 依赖**: Yes — `feed-classifier.service.ts` + `digest-generator.service.ts` 使用 AiService
- **外部数据依赖**: Yes — XHS (小红书 MCP)、RSS (牛客网)、WeChat (公众号)
- **后端测试**: Yes — `newspaper.e2e-spec.ts` (76) + `newspaper-personalization.e2e-spec.ts` (9) + `feed.e2e-spec.ts` (29) + `feed-ingestion-stability.e2e-spec.ts` (4) + `source-health.e2e-spec.ts` (14) = 132 个测试调用
- **前端 Playwright**: Deferred
- **已知风险**:
  - 外部源 (XHS/RSS/WeChat) 可能不可用
  - XHS 需要本地 MCP bridge (port 18060)
  - WeChat 需要 Docker 容器 (port 8001)
  - RSS 依赖第三方 RSSHub 实例
  - 无外部数据时，日报页面应显示空状态而非崩溃
- **判定**: **可内测但有限制** — 外部数据源是可选的，无数据时功能降级

### 14. Radar (市场雷达)

- **真实 API**: Yes — `newspaper.controller.ts` 提供 `GET /newspaper/radar`, `radar/companies`, `radar/roles`, `radar/trends`
- **AI 依赖**: Yes — 通过 feed 分类管道间接依赖 AI
- **外部数据依赖**: Yes — 与 Newspaper 共享数据源 (XHS/RSS/WeChat)
- **后端测试**: Yes — 共享 newspaper 测试 + `xhs-importer-stability.e2e-spec.ts` (2)
- **前端 Playwright**: Deferred — 有专门的 Playwright 证据文档 (`radar-workspace-playwright-evidence.md`)
- **已知风险**:
  - 数据需要先通过 feed 采集管道导入
  - 无 seed 数据时 4 个 tab 可能全部为空
  - 公司卡片点击下钻依赖已有公司数据
- **判定**: **可内测但有限制** — 需先运行数据采集才有内容

### 15. Opportunity Intelligence (机会评估)

- **真实 API**: Yes — `opportunity.controller.ts` 提供 CRUD + evaluate + track + tasks + chat-context
- **AI 依赖**: Yes — `opportunity-evaluator.service.ts`, `opportunity-parser.service.ts`, `opportunity-risk.service.ts` 均调用 AiService
- **外部数据依赖**: No
- **后端测试**: Yes — `opportunity.e2e-spec.ts` (46) + `opportunity-ai.e2e-spec.ts` (8) + `opportunity-evidence.e2e-spec.ts` (9) = 63 个测试调用
- **前端 Playwright**: Deferred
- **已知风险**:
  - AI 评估是 fire-and-forget 模式（创建后异步评估）
  - 评估失败静默吞掉错误 (`.catch(() => {})`)
- **判定**: **可内测**

---

## 测试覆盖总结

### 后端 E2E 测试
- 测试文件: 23 个 `.e2e-spec.ts`
- 总测试调用: ~467 个 (describe + it + test)
- 覆盖模块: Auth, Tasks, Overview, Resumes, Conversations (含 context/coach), Applications, Interviews, Mock, Salary, Cover Letters, Career, Newspaper (含 personalization), Feed (含 ingestion/stability), Opportunity (含 AI/evidence), Source Health, Evidence, XHS Importer
- 缺失: Diagnoses 无独立测试

### 前端 E2E 测试
- Playwright 测试文件: **0 个**
- 状态: 全部 Deferred
- 备注: 有手动 Playwright 证据文档 (radar, newspaper) 但无自动化测试脚本

---

## Release Readiness Verdict

- **内测上线**: **YES** — 核心流程 (登录、简历、诊断、对话、追踪) 均有真实 API，可在小范围内使用
- **正式公开上线**: **NO** — 缺少前端 E2E 自动化测试、AI 编造风险未完全消除、外部数据源可靠性未验证

### 阻塞项 (内测阻塞)
- 无硬性阻塞项。所有模块均有真实 API 和后端逻辑

### 非阻塞风险
1. 前端 Playwright E2E 测试全部 Deferred (0 个自动化测试)
2. Diagnoses 模块缺少独立后端测试
3. AI 编造风险 — Career Map 和 Coach Chat 可能在缺少数据时生成虚假内容 (CLAUDE.md 已记录)
4. Cover Letter 历史有英文输出 bug (需人工验证当前状态)
5. Opportunity 评估错误被静默吞掉 (fire-and-forget .catch(() => {}))
6. 外部数据源 (XHS/RSS/WeChat) 默认不可用，Newspaper/Radar 将以空内容运行
7. `synchronize: true` 在 TypeORM 配置中 — 内测可接受，生产环境必须关闭

### 必须人工配置
1. `packages/api/.env` — 确保 `CLOUDDREAM_API_KEY` 有效
2. `ports.env` — 确认 3001/3002 端口未被占用
3. 邀请码 `COACH2026` — 告知内测用户
4. (可选) XHS MCP bridge — 如需小红书数据，需启动 `localhost:18060`
5. (可选) WeChat RSS — 如需公众号数据，需 Docker 启动 `localhost:8001`

### 上线后第一小时观察项
1. CloudDream AI API 响应时间 — 监控诊断/对话/生成任务的延迟
2. SQLite 文件锁 — 并发用户是否导致 database locked 错误
3. JWT 认证流程 — 登录后 token 是否正常持久化
4. AI 生成内容质量 — 抽查诊断结果、教练回复、模拟面试题目是否合理
5. 空数据状态 — 新用户首次进入各页面是否正确显示空状态而非报错
6. 文件上传 — 简历 PDF/DOCX 上传解析是否正常
