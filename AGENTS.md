# AGENTS.md — Coach 仓库速查入口

> 本仓库的完成定义 = 证据。不跑第 6 节验证矩阵的改动,一律视为未完成,不管代码看起来多正确。

## 项目一句话

Coach = 校招求职 AI SaaS,核心是"诚实的简历诊断 + 改写"(AI 绝不编造简历里没有的内容)。**已上线,免费试运行中,有真实用户**。pnpm monorepo:`packages/api`(NestJS 11 + TypeORM + Postgres/sqlite)+ `packages/web`(Next.js 16 App Router)。

## 必读顺序(按此顺序,不要跳读)

1. `docs/PROJECT-TECH-MANUAL.md` —— 完整技术手册,含标准作业流程(SOP)、按改动类型的验证矩阵、负面清单、危险代码区、部署纪律。**这是主文档,本文件只是它的速查卡片。**
2. `CLAUDE.md`(仓库根) —— 行为红线与质量门顺序,自动加载生效。
3. `docs/refactor2/01-dev-principles.md` —— 执行期证据标准与环境坑位速查。

## 十条最要命的规则

1. **两套 jest 配置,漏一套 = 假绿**:裸 `npx jest` 的 `testRegex` 匹配不到 `.e2e-spec.ts` 文件,会静默跳过全部 e2e 用例却报"通过"。e2e 必须用 `cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit` 单独跑,两条命令的输出都要有。
2. **危险区改动必跑指定 spec**:`ai.service.ts` 流式部分 / `concurrency-limiter.ts` / `diagnoses.service.ts` 管线,改动后先跑 `cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts`,这里出过两次生产事故。
3. **迁移一律手写,禁用 `migration:generate`**:本机没有生产库真实 schema,生成的 diff 不可信。命名 `<毫秒时间戳>-<PascalCase描述>.ts`,放 `packages/api/src/database/migrations/`,配一条 `*-migration-smoke.spec.ts`。`DROP` 任何东西 / `DELETE` 用户数据行一律禁止(清洗只许 `SET NULL`)。
4. **密钥永不入库**:`.env`、`.env.production`、`_local/coach-deploy/` 任何内容不许出现在代码、文档、提交信息里。服务器坐标见仓库 `_local/coach-deploy/运维手册.md`(gitignored,只在本机,不在 GitHub 上)。
5. **生产 `DEV_LOGIN` 必须为 `0`,无例外**——这是跳过验证码/邀请码的登录后门,`main.ts` 启动期已 fail-closed 拒启,配置和文档里也不许写建议打开它的内容。
6. **业务代码不许绕过 `AiService` 直连 AI 供应商**(GLM/DeepSeek/CloudDreamAI)。`AiService` 是唯一的主备降级 + 并发限流入口。
7. **e2e 零失败才允许合并**:不接受"已知失败白名单",出现失败先归因回归还是环境,处置完再合并,不能带病合并。
8. **完成的定义 = 可复跑的证据**:测试原始输出 / 命令结果 / 截图。"看起来没问题"不是证据,`tsc --noEmit` 不是 lint 也不是测试。
9. **环境失败 ≠ 代码失败,不能混为一谈**:端口占用、Docker 没起、依赖网络超时导致验证跑不出结果,是先修环境再重验的 STOP 情形,不能标记成"跳过"混过验收,也不能当代码 bug 去改代码。
10. **线上有真实用户,任何生产迁移前先备份**:数据库变更可能不可逆(如列类型转换),不备份 = 没有退路。部署顺序铁律:先 `migration/seed`(`run --rm`)后 `up -d`,否则 API 容器会因查不到表进崩溃重启循环。

## 改完必须跑的最小验证集

不确定自己的改动属于哪一类时,至少跑这一组(更完整的按改动类型分的矩阵见 `docs/PROJECT-TECH-MANUAL.md` 第 3 章):

```bash
cd packages/api && npx tsc --noEmit
cd packages/api && npx jest                                              # 单测,判据:Tests: N passed, N total,无 failed
cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit    # e2e,判据同上,裸 jest 不算数

cd packages/web && npx eslint src --ext ts,tsx    # 判据:0 problems
cd packages/web && npx tsc --noEmit               # 判据:无 error TS
cd packages/web && npm run build                  # 判据:退出码 0,无 Failed to compile
```

涉前端改动或用户可见行为变更时,以上命令通过之后还要跑一遍 Playwright(`cd packages/web && npx playwright test`,前提 api:3002 与 web:3001 已用 build+start 方式在跑),判据 `N passed, 0 failed`。

## 常用命令速查

```bash
pnpm install                                # 装依赖
pnpm dev:api / pnpm dev:web                 # 本地开发(watch 模式;验收别用,用 build+start)
pnpm build:api / pnpm build:web             # 构建
pnpm --filter @coach/api migration:run      # 跑迁移(本地,ts-node)
pnpm --filter @coach/api seed               # 灌种子数据
pnpm --filter @coach/api test:e2e           # 等价 npx jest --config ./test/jest-e2e.json --forceExit
```

端口惯例:web 3001 / api 3002 / postgres 5432(本机容器 `coach-postgres`)。Windows 构建镜像用 PowerShell,不要用 git-bash(会改坏路径)。
