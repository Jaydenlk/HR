# Handoff: Coordinator → Implementer (credit-api)

## 状态: READY_FOR_IMPL
## 任务: Credit 计费体系后端——1 次 AI 端点调用=1 点,完全替代每日免费配额,含流水/守卫/管理员充值//me 接口/migration
## 工作目录(必须在此工作): E:\Agent program\HRBP-wt\credit-api(git worktree,分支 feature/credit-api)
## 输入文件: packages/api/src/(quota/ users/ admin/ auth/ files/ common/ database/ 为主);设计稿 .claude/plans/coach-upgrade-design-2026-06-12.md §W2
## 禁止触碰: packages/web/**、.env*、deploy/**、feed/**、conversations/**、ai/ai.service.ts(本期不动 AI 层)、其他 handoff 文件

## 背景(需求原文摘录)
用户拍板:"credit 的计费方式,调用一次 API 即为用一次 credit,价格 10r/50credit,先不做支付模块,管理后台可以提供点数,给的点数要在用户那边体现出来"。完全替代制:停用每日免费 20 次;新注册送 50 点;存量用户迁移一次性补 50 点。

## 规格(与前端并行开发,契约必须严格一致)
1. **数据**:
   - `users` 表加 `credit_balance`(int, NOT NULL, default 0)。
   - 新表 `credit_transactions`:id(uuid)/user_id/delta(int,消耗为负)/type('signup_grant'|'admin_grant'|'consume')/balance_after(int)/note(varchar,可空)/created_by(uuid,可空,管理员充值时记管理员id)/endpoint(varchar,可空,consume 时记路由)/created_at。建索引 (user_id, created_at)。
   - **手写 migration**(migration:generate 伪 diff 不可信),命名与冒烟规范见 deploy/README.md §2.1。migration 内给所有存量用户 +50:置 balance=balance+50 并逐人插一条 signup_grant 流水(balance_after 正确)。
2. **CreditService**(新模块 packages/api/src/credit/):`grant(userId, delta, type, note?, createdBy?)` 与 `consume(userId, endpoint)`,两者都在**数据库事务+行锁**(pessimistic_write 锁 user 行)内更新余额+写流水,杜绝并发双扣。consume 扣 1 点;余额可被并发竞态打到 -1(守卫挡下一次),可接受,代码注释说明。
3. **CreditGuard**:替换现有 QuotaGuard 的全部挂载点(先 `grep -rn "QuotaGuard" packages/api/src` 列全清单再换)。余额 < 1 → 抛 HTTP **402**,body `{message: "点数不足，请联系管理员充值"}`。QuotaGuard/daily_quota_override 逻辑退役:删 QuotaGuard 文件与引用,user 实体的 daily_quota_override 列**保留不读**(不出 migration 删列),admin UpdateUserDto 中移除该字段。
4. **CreditInterceptor**:与现有 AiUsageInterceptor 并列挂载(AiUsageInterceptor 原样保留,ai_usage 继续记运营口径)。仅在响应成功时调 `consume`(语义对齐现状:失败/503 不扣)。挂载点与 CreditGuard 相同清单。
5. **注册赠送**:在用户创建处(auth 注册流程,自己定位)成功创建后 grant +50 signup_grant。
6. **/me 接口**(users 模块内加 me.controller 或独立模块,JwtAuthGuard):
   - `GET /me` → `{id,email,name,avatar_url,invite_code,created_at,credit_balance}`
   - `GET /me/credits?limit=&offset=` → `{items:[{id,delta,type,balance_after,note,endpoint,created_at}],total}`(按 created_at 倒序)
   - `POST /me/avatar`(multipart 字段名 `file`,限 2MB、仅 image/jpeg|png|webp)→ 复用 FilesService.upload(file,'avatars') → 更新 users.avatar_url → 返回 `{avatar_url}`。avatar_url 的对外可访问形态对齐简历 file_url 现行模式(先看 resumes 怎么存怎么读)。
7. **管理员接口**(admin 模块):
   - `POST /admin/users/:id/credits` body `{delta: 正整数, note?: string}` → grant admin_grant → 返回 `{credit_balance}`。
   - `GET /admin/users` 返回中增加 `credit_balance` 字段。

## 执行计划 (step→verify)
1. pnpm install(worktree 全新)→ verify: `pnpm --filter @coach/api build` 通过(基线)
2. migration + 实体改动 → verify: 本地跑 migration(项目现行方式)后表结构正确,存量用户余额+50 且流水 balance_after 自洽(贴 SQL 查询输出)
3. CreditService 事务实现 → verify: jest 单测——并发 10 个 consume 余额准确不丢账;余额 1 时并发 2 个 consume 结果余额 ≥ -1 且流水条数=实际扣减数
4. CreditGuard/CreditInterceptor 全量换装 → verify: grep 证明 QuotaGuard 引用为 0;jest e2e——余额 0 调 AI 端点返回 402 + 指定文案;成功调用后余额 -1 且流水 endpoint 正确;失败调用(mock AI 抛错)不扣
5. 注册赠送 → verify: jest e2e 注册新用户余额=50,流水 1 条 signup_grant
6. /me 三端点 + admin 两改动 → verify: jest e2e 正常+异常(未登录 401/越权充值非 admin 403/avatar 超 2MB、非图片 400/delta 非正整数 400)
7. 全量门禁 → verify: `npx tsc --noEmit` 0 错;`npx eslint src/` 0 错(tsc 不是 lint);全部 jest 通过,贴原始摘要
8. 提交 → verify: 在 feature/credit-api 分支 commit(信息含 Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),`git status` 干净,不 push

## 红线
- 严禁 mock 数据、空实现、TODO 占位;严禁 any/as unknown as/@ts-ignore
- 每行改动可追溯到本规格;不顺手重构无关代码
- 测试必须真跑,贴原始输出;"测过了"无输出=未完成
- 完成后更新本文件:已完成/产出物/验证结果(逐 step PASS/FAIL+证据)/遗留问题

## 决策上下文
- 完全替代制已拍板(用户 2026-06-12),402 而非 429 是为了前端区分"没点"与"限流"
- ai_usage 与 credit_transactions 双轨并存是有意设计(运营口径 vs 账务口径),不要合并
