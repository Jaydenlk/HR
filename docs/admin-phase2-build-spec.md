# 管理面板 Phase2 建造规格(2026-06-16 夜·自治)

> 本规格 = leader 决策 + Plan agent 文件级计划的固化。所有建造/测试 agent 统一读此文件。基线分支 dev=73b11d1。worktree 路径 `E:/coach-wt-admin`,分支 `feat/admin-panel-phase2`。
> **范围纪律**:只做"管理面板丰富化 + 其数据隔离红线",不扩面到全站安全审计。

## 0. 已拍板决策(不要再问,按此做)
- **成功率走选项 A:零生产迁移。** 失败 AI 调用记入既有 `ops_events`(扩 `OpsEventType` 联合类型,`type` 列是 VARCHAR 无 DB 约束→纯 TS 改动,**不建任何 migration**)。成功侧复用 `ai_usage`(语义:成功才写)。**本轮严禁新增 DB migration / 严禁改 diagnoses 实体加列。**
- **不开 `forbidNonWhitelisted`**(全站行为变更)。保持现状 whitelist 剥离未知字段。
- **既存隔离债本轮只收两个**:`POST /feed/import`、`POST /feed/digest` 补 `AdminGuard`(本就该管理员)。`GET /feed` 他人信息泄露、`GET /salary`、`POST /applications/strategy`、`POST /files/upload` ACL → **登记为已知债,本轮不动**(写进最终报告的"晨审建议")。
- **不加** `users.role` DB CHECK 约束(需迁移)。
- **隐私铁律**:管理面板"每用户活动明细"**只展示计数级数据**(各端点调用次数、成功率),**绝不展示任何正文**(简历原文/对话内容/转写文本/JD 原文一律不出现在任何 admin 响应)。出站响应 DTO 必须字段白名单,`ops_events.detail` 经白名单过滤,剔除任何 token/原始请求体/敏感正文。
- **成功率分母** = AI 调用成功数(ai_usage)与 AI 调用失败数(ops_events 的 AI 失败类);credit 扣点失败是**单独指标**(进流水中心,不进成功率分母)。

## 1. 现状要点(已核实)
- `/admin` 单页,api 7 端点全 `@UseGuards(JwtAuthGuard, AdminGuard)`(admin.controller.ts:21)。**AdminGuard 每请求查库验 role,不读 JWT claim**(role 伪造已挡)。
- `JWT_SECRET` 已 `@IsNotEmpty`(env.validation.ts:21)缺失即拒启;但三处 `config.get('JWT_SECRET','dev-secret')` 兜底(auth.module.ts:28、jwt.strategy.ts:15、auth.service.ts:236)。
- devLogin 已 `!enabled || isProd → 404`(auth.service.ts:151);auth-dev-login.e2e-spec 已覆盖 prod 404。
- 测试地基:`test-utils.ts`(createTestApp/loginUser)、`admin.e2e-spec.ts`(registerUser 双账户)、`ops-events.e2e-spec.ts`、`auth-dev-login.e2e-spec.ts`、`env-validation.spec.ts`、`migration-smoke.spec.ts`。**新测试必须复用这些 fixture + 唯一临时 sqlite 文件模式。**
- `listUsers` 是 N+1(admin.service.ts:53),新聚合方法**禁止 N+1**,用 QueryBuilder GROUP BY。
- 测试 app 的 ValidationPipe 在 test-utils.ts:52 等处各自 new,改 main.ts pipe 时**本轮不改 pipe**(不开 forbidNonWhitelisted),故无需同步。

## 2. 波次与文件分区(同一 worktree;共享文件必须串行)
### 波0 隔离地基(串行最先,安全门)
- `packages/api/src/main.ts`:bootstrap 现有 prod 自检块后加 fail-closed:`if (isProd && process.env.DEV_LOGIN==='1') throw`;并把 JWT_SECRET 自检(非 'dev-secret' 且 length≥32,生产下违反则 throw 拒启)抽成可单测的纯函数。
- `packages/api/src/config/env.validation.ts`:`validate()` 跨字段块加 `JWT_SECRET !== 'dev-secret' && length>=32`(对齐现有 AI key 二选一手写校验风格)。
- `packages/api/src/feed/feed.controller.ts`:`POST /feed/import`、`POST /feed/digest` 方法级 `@UseGuards(AdminGuard)`;`feed.module.ts` 补 AdminGuard 依赖链(AdminGuard 依赖 UsersService → import UsersModule)。
- **波0 不绿不开波2。**

### 波1 采集点(串行,碰 ops 实体 + admin.service)
- `packages/api/src/ops/entities/ops-event.entity.ts`:`OpsEventType` 联合加 `'AI_CALL_FAILED' | 'CREDIT_CONSUME_FAILED' | 'ADMIN_ACTION'`。
- `packages/api/src/ops/ops-events.service.ts`:`dailyStats` 聚合识别新 type。
- `packages/api/src/credit/credit.interceptor.ts`(:40 现 logger.error)→ 注入 `OpsEventsService.record('CREDIT_CONSUME_FAILED',{user_id,endpoint,error})`;`credit.module.ts` import `OpsEventsModule`。
- `packages/api/src/admin/admin.service.ts`:`updateUser`(:94)、`grantCredits` 成功后 `record('ADMIN_ACTION',{actor,target,op})`;`admin.module.ts` import `OpsEventsModule`。**(此段先于波2A,因同文件)**
- (可选)AI 失败落库:若改动可控,在 AI 调用失败点 record `'AI_CALL_FAILED'`(供成功率分母);拿不准就只在诊断流式 error 分支记,范围最小。

### 波2 聚合+端点(2A 串行于波1;2B 并行;2C 收口)
全部新端点进现有 `AdminController`,继承 controller 级 `@UseGuards(JwtAuthGuard, AdminGuard)`。
- **2A** `admin.service.ts`(聚合方法,QueryBuilder + setParameter 绑定,分页 take 服务端 clamp≤200)+ `admin.controller.ts`(6 个 @Get):
  - `GET /admin/ops-events?limit=` → OpsEventsService.recent()(detail 白名单过滤)
  - `GET /admin/ops-stats?days=` → OpsEventsService.dailyStats()
  - `GET /admin/health-snapshot` → HealthService.check() + ConcurrencyLimiter.status()
  - `GET /admin/user-activity?userId=&from=&to=` → ai_usage GROUP BY endpoint + credit_transactions(type=consume)GROUP BY endpoint(**仅计数**)
  - `GET /admin/error-stream?limit=&type=` → ops_events 失败类/ADMIN_ACTION(detail 白名单)
  - `GET /admin/success-stats?days=` → 成功=ai_usage 按日;失败=ops_events AI 失败类按日
- **2B** 新建 `packages/api/src/admin/dto/`:入参 `user-activity-query.dto.ts`(userId `@IsUUID`、from/to、排序枚举白名单)、`ops-events-query.dto.ts`、`error-stream-query.dto.ts`、`stats-query.dto.ts`;出参 `admin-activity-response.dto.ts`、`admin-error-event-response.dto.ts`、`admin-health-response.dto.ts`(字段白名单投影,沿用 AdminUserRow 手工映射风格)。
- **2C** 收口(串行)`admin.module.ts`:imports 加 `OpsEventsModule`、`HealthModule`、`TypeOrmModule.forFeature([CreditTransaction])`,注入 `ConcurrencyLimiter`。**先核 `ai.module.ts`/`health.module.ts` 是否 export 了 ConcurrencyLimiter/HealthService,没 export 就补 export(扩 1 共享文件)。**

### 波3 前端子页(3-pre 串行先行;3A/3B/3C 并行;3D 收口)
沿用现有玻璃 UI(.lg/cardStyle/thStyle)与 `@/lib/api`,**全连真端点无 mock**。
- **3-pre** `packages/web/src/lib/types.ts` 加响应类型:`AdminUserActivity`、`AdminOpsEvent`、`AdminHealthSnapshot`、`AdminSuccessStats`。
- **3A** 新建 `packages/web/src/app/(main)/admin/_components/PlatformHealthTab.tsx`(页2:uptime/版本/DB探活、并发 active/queued、近7日降级/队列满趋势)。
- **3B** 新建 `.../admin/_components/LogCenterTab.tsx`(页3:tabA 报错流水[AI失败/扣点失败 倒序翻页]+每日成功vs失败分层;tabB 管理操作审计)。
- **3C** 新建 `.../admin/_components/UserActivityPanel.tsx`(页1 活动明细抽屉,**只计数**)。
- **3D** 收口 `packages/web/src/app/(main)/admin/page.tsx` 改 tab 容器,保留现有 用户/邀请码/充值 作页1 基座。

## 3. 三测规格(上线硬门,先写到 RED 再实现/或实现后真跑)
复用 test-utils + 双账户 + 唯一临时 sqlite。
### ① 隔离对抗 `packages/api/test/admin-isolation.e2e-spec.ts`
- **403 矩阵**:现有7+新增6 端点 × {无token→401、role=user→403、banned→403/401、admin→200}。
- **跨用户零泄露**:admin 调 `/admin/user-activity?userId=X` 只含 X;对 `/admin/users`、`/admin/error-stream`、`/admin/user-activity` 响应做**显式 key 白名单断言**(Object.keys ⊆ DTO 白名单),出现 password_hash/raw_text/transcript/token/正文字段即 FAIL。
- **本人隔离回归**:普通用户带他人 res_id/conv_id/app_id 调本人业务端点→404。
### ② 压测(脚本 autocannon/k6,放 scripts 或 test,不入 jest 主跑)
- seed ai_usage 10万 + ops_events 1万。50 并发×30s 打 /admin/users、/admin/usage、/admin/user-activity(混 2 admin + 普通 token)。
- 判据:普通批 100% 403 不漏判;两 admin 不互串;无 500/连接耗尽;单聚合查 <500ms 走索引;limit=999999 被 clamp 到 200;listUsers 大用户数不退化(退化则改单条 GROUP BY)。
### ③ 越狱渗透 `packages/api/test/admin-jailbreak.e2e-spec.ts`(+扩 env-validation/auth-dev-login)
| # | 构造 | 期望 |
|---|---|---|
| ① JWT 改 sub 不重签 | 401 验签失败 |
| ② dev-secret 自签 admin | 波0 自检函数 throw(env-validation.spec 加例) |
| ③ token 塞 role:'admin' | 403(AdminGuard 查库) |
| ④ prod devLogin / DEV_LOGIN=1+NODE_ENV=production | 404 + 自检拒启 |
| ⑤ user-activity 传非UUID/`' OR '1'='1`/不存在UUID | @IsUUID→400 不进库;合法他人id→只返回该id |
| ⑥ 日期/排序传 `;DROP TABLE`/`union select` | QueryBuilder 绑定+排序枚举白名单→无效无泄漏 |
| ⑦ updateUser body 塞 credit_balance/role | whitelist 剥离不写入(断言库里没变) |
| ⑧ ops_event.detail 含模拟 token,查 error-stream | 响应已白名单剔除 |
> ②④ 进程拒启用对 main.ts 抽出的自检纯函数做单测断言 throw,不真启进程。

## 4. 上线门(deployGate)
**可自动合 dev+推服务器 当且仅当**:① 三测全绿(附原始输出)② 无 DB migration(本规格已保证)③ PJR 绿(api+web 的 lint=tsc--noEmit + build)④ 全量 api jest e2e 不回归 ⑤ 波0 安全自检测试绿。
**任一不满足/有偶发失败/有不确定 → 留分支 feat/admin-panel-phase2,写晨审报告,不推。**

## 5. 晨审建议(最终报告固定带上)
- 选B(诊断精确成功率,需迁移)是否要?role DB CHECK?forbidNonWhitelisted 全站开?
- 既存隔离债:GET /feed 泄露他人 email/姓名、GET /salary 去 user_id 核验、applications/strategy 归属、files/upload ACL —— 下一波处置?
- 隐私:管理员可见每用户计数级行为画像,是否授权(本轮已做成只计数无正文)。
- JWT_SECRET 兜底 'dev-secret':确认生产 .env 已设强随机值。
