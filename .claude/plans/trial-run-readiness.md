# 试运行就绪实施计划（2026-06-10 拍板版）

## 拍板基线
- 免费试运行，**不做收费功能**；邀请码作为放量限制手段
- 登录 = **邮箱验证码 + 邀请码**（首次注册需邀请码，老用户仅邮箱+验证码）
- 基础设施按 **4C4G** 设计，数据库 **PostgreSQL**（dev 仍可 sqlite）
- 运营 = **网页管理后台**（/admin + 管理员角色）
- 导航**维持现状**（6 核心 + 7 折叠），打磨只做体验细节

## 阶段与 step→verify

### T0 收尾（进行中）
1. api e2e 全量重跑 → verify: 36 套件 0 failed
2. 提交 pending 批次(P2×29 文件 + parse_jd 修复 + 计划文件) → verify: git log 新 commit、工作区干净

### T1 安全硬化（试运行第一前置）
**T1.1 邮箱验证码登录（修账号接管 P0）**
- email 模块:nodemailer + SMTP_HOST/PORT/USER/PASS/FROM env;无 SMTP 且非 production → request-code 响应带 dev_code(开发/测试用);production 经 env 校验强制要求 SMTP
- login_codes 表(email/code_hash/expires_at 10min/attempts≤5);POST /auth/request-code(限流 3/min·email);POST /auth/login {email, code, invite_code?, name?} — 仅首次注册需 invite_code+name
- web /login 两步式 UI(邮箱→验证码[+首次邀请码]);test-utils.loginUser 改走 request-code→dev_code→login,全部 e2e 不破
- verify: 不带验证码登录 401;错码 5 次锁 10min;老用户无需邀请码;新用户无码 403;全 e2e 绿
**T1.2 邀请码 DB 化**
- invite_codes 实体(code/max_uses/used_count/disabled/note);删硬编码 COACH2026(seed 初始码替代);users.invited_by_code
- verify: 停用码立即失效;超 max_uses 拒绝;用户可溯源到码
**T1.3 边界硬化**
- helmet + CORS_ORIGINS 白名单 env(prod 必填) + @nestjs/throttler 全局(120/min/IP) + auth 端点收紧(request-code 3/min, login 10/min)
- verify: 非白名单 Origin 被拒;第 N+1 次请求 429
**T1.4 per-user AI 配额**
- ai_usage 表(user_id/endpoint/created_at) + QuotaGuard 套所有 AI 端点;DAILY_AI_QUOTA 默认 20,users.daily_quota_override 可调
- verify: 第 21 次 AI 调用返回 429 中文提示;次日恢复;管理员可调

### T2 数据/部署地基（4C4G）
**T2.1 PostgreSQL 路径**
- TypeORM migration 初始 schema(从实体生成);prod synchronize=false 走 migration;seed.ts 支持 pg(读 DB_* env);备份脚本 pg_dump + 保留策略 + cron 文档
- verify: 全新 pg 库跑 migration+seed 后 e2e(DB_TYPE=postgres)绿;备份文件可还原
**T2.2 部署编排**
- Dockerfile(api/web) + docker-compose.prod.yml(api+web+pg+caddy HTTPS) + .env.production.example;GET /health(DB ping+AI 配置存在)
- verify: compose up 后 /health 200;HTTPS 反代可访问
**T2.3 可观测**
- AI 主备降级/队列满事件 → 结构化日志 + 管理后台可见(T3);进程日志落盘轮转
- verify: 人为断主通道,后台能看到降级事件

### T3 网页管理后台
- users.role('user'|'admin') + users.status('active'|'banned');ADMIN_EMAILS env 引导首个管理员;AdminGuard
- /admin(web):用户列表(用量/状态/封禁)、邀请码管理(批量生成/停用/溯源)、用量看板(日 AI 调用/Top 用户/配额命中)、AI 通道健康(近期降级)
- api admin 模块:对应只读统计 + 操作端点(封禁/发码/调配额)
- verify: 非管理员访问 /admin 与 admin API 全 403;封禁用户登录被拒;Playwright 走查后台全流程

### T4 合规基线（免费试运行版）
- 隐私政策 + 用户协议静态页;注册时勾选同意(记录时间)
- 账号注销(自助:删用户+级联全部数据) + 数据导出(JSON)
- AI 生成内容标识:AI 产物 UI 角标"内容由 AI 生成" + 复制/导出文本追加标识行(对齐 2025-09-01《人工智能生成合成内容标识办法》基线)
- 输入层敏感词最小拦截(政治/违法类,简历场景低风险但留机制)
- verify: 注销后该用户数据 0 残留(SQL 验证);导出 JSON 含全部资产;AI 产物均带标识

### T5 打磨 + 终验
- 埋点:events 表 + 5 指标点位(激活/诊断完成/改写采纳/分享/留存由查询算);管理后台展示
- 剩余 5 页 Playwright 走查(industry-trend/learning-roadmap/interview-prep/follow-up/campus)→修出的问题
- AI 等待体验:长调用(~190s)分步进度提示(排队中/分析中/生成中)
- 终验:全门 + AI-live + Playwright 全页 + 并发演练(4C4G 下模拟 8-10 并发用户)
- verify: 各项门绿;演练无 OOM/雪崩;验收报告落 .claude/audit/

## 执行约束
- app.module.ts/共享文件由协调者собственно整合,子代理不碰(防冲突)
- 每批 worktree 隔离或文件不相交;实现者+独立复审;改完即跑受影响测试
- 中文 only/严格类型/防编造红线继续适用;新增 env 全部进 env.validation + .env.example
