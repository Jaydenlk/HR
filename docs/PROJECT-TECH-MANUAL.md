# Coach 项目技术手册(给零上下文维护者)

> 读者假设:你是第一次接触本项目的 AI 或工程师(例如 OpenAI Codex),没有任何会话记忆,只有这个仓库。
> 目标:读完本文,你应该能独立完成"改代码 → 验证 → 提交"的闭环,并且**不修出新 bug**。
> 本文是知识文档,但更重要的是第 2~4 章的强制流程——那三章不是背景知识,是防呆装置,不遵守等于没读。
>
> 配套文档(不要重复发明,遇到细节先查这些):`CLAUDE.md`(行为红线,自动加载)、
> `docs/AGENT-HANDBOOK.md`(项目干活手册,本手册的主要素材来源)、
> `docs/refactor2/01-dev-principles.md` / `02-execution-playbook.md`(执行期纪律与合并规程)、
> `deploy/README.md`(生产部署完整步骤)。第 15 章有完整文档索引。

---

## 1. 项目概览

**Coach** 是一个校招求职 AI SaaS:核心功能是**简历诊断 + 改写**,产品命门是"诚实"——AI 绝不在诊断、改写、求职信里编造简历原文没有的内容,数据缺失就明确说缺什么,不瞎猜。这是产品护城河,也是本手册反复强调"不许编造/不许 mock"的原因。

产品现状(2026-07):**已上线,免费试运行中,有真实用户**,邀请码制注册,目标 20-50 人规模。部署形态是单台 2C2G(建议 4C4G)服务器,IP 直连或域名 + HTTPS,容器化部署(Postgres + API + Web + Caddy)。

产品有两个对等形态:本仓库是 SaaS 形态;`career-skills-marketplace/` 目录是移植成 Claude Skills 的形态,两者互相反哺,不是这份手册的重点(它有自己的 README)。

**线上坐标不在仓库里**:服务器 IP、SSH 方式、各项密钥的存放位置,都记录在仓库 `_local\coach-deploy\运维手册.md`(该目录已 gitignore,只存在于本机磁盘,不会出现在 GitHub 上),这是**有意为之**的隔离——密钥永不入库是硬红线(见第 4 章负面清单)。如果你需要做任何触达线上环境的操作(部署、备份、排障),先去读那份手册,本仓库不会告诉你服务器在哪。

产品红线(违反任何一条 = 返工,不是风格建议):
- AI 不编造:简历里没有的内容绝不出现在诊断/改写/求职信里。
- 前端无 mock:所有数字/列表来自真实 API,按钮必须有真实功能。
- 文案不编数据:没有的用户量/好评率一律不写。
- `DEV_LOGIN` 生产环境必须是 `0`,无例外。
- 做减法:新功能提案要先回答"砍掉什么/为什么非做不可",默认拒绝扩面。

---

## 2. 标准作业流程 SOP(任何改动都要走,不分大小)

这是本手册最重要的一章。**不区分"小改动"和"大改动"**——一行 typo 修复和一个新模块都走同样的五步,区别只在第③步要跑的验证集大小不同(见第 3 章验证矩阵)。跳过任何一步 = 违反本手册。

### ① 改前:定位改动属于哪一类

1. 打开第 3 章的验证矩阵,先确定你的改动落在哪一行(api 业务代码 / 危险区 / web / 迁移 / 测试本身 / 依赖)。这决定了改完要跑哪些命令。
2. 打开你要改的文件,读文件头部注释——本仓库大量文件在头部用注释解释"为什么这么写"(例如 `column-types.ts`、`ai.config.ts`),这些注释里常常藏着"看起来可以简化但其实不能动"的原因。
3. 找到同目录下的 `*.spec.ts` / `*.e2e-spec.ts`,读一遍——它们是这段代码的行为契约,改代码前先知道现有测试断言了什么。
4. 如果你的改动涉及第 12 章列出的危险区文件,**先完整读第 12 章**,再动手。

### ② 改中:最小改动原则

- 每一行改动必须能追溯到明确的需求。不顺手重构、不顺手改格式、不加没人要的"灵活性"或配置项。
- 匹配现有代码风格,即使你会写得不一样。
- 只删除因为你的改动而失效的 import/函数;历史遗留的死代码不属于你这次改动的范围,不要动它。
- 严格类型:不允许 `any`,不允许 `as unknown as`。TypeScript 报错要真的修掉,不要用类型断言糊弄过去。

### ③ 改后:按验证矩阵跑齐命令,判据写死

- 对照第 3 章,把你改动类型对应的那一整行命令全部跑一遍,不许挑着跑。
- 每条命令的通过判据是**写死的字符串形式**,不是"看起来正常":
  - lint/tsc:输出里没有 `error TS` 字样,退出码 0。
  - 单测:Jest 摘要出现 `Tests: N passed, N total` 且**没有** `failed` 字样(N 处数字必须相等)。
  - e2e:同上,且必须是用 `--config ./test/jest-e2e.json --forceExit` 跑出来的那次输出(裸 `npx jest` 的结果不算数,原因见第 8 章)。
  - build:命令退出码 0,且没有 `Failed to compile` / `Error:` 字样。
  - Playwright:HTML/list reporter 摘要出现 `N passed`,`0 failed`。
- 把原始命令输出保留下来作为证据。"我跑了,应该没问题"不是证据,复制粘贴的终端输出才是。

### ④ 提交:逐路径 git add,禁止 `-A`

```bash
git add packages/api/src/ai/ai.service.ts packages/api/test/ai.e2e-spec.ts   # 逐个列出你真正改动的文件
git commit -m "fix(ai): 说明改了什么、为什么"
```

- 禁止 `git add -A` 或 `git add .`——它们会把你没检查过的文件(临时产物、别人的未提交改动、误生成的文件)一起提交进去。
- 提交前用 `git status` 确认改动文件清单和你的预期一致,没有多出来的文件。

### ⑤ 修复循环:最多 2 轮,仍不过就停

- 验证矩阵里任何一条命令 FAIL,原地修复、重跑那一条,不是重跑全部。
- 同一条命令修复尝试 **2 轮**仍然 FAIL:停下,不要开始第 3 次尝试,不要"改测试断言让它变绿"(那是伪造证据,见第 4 章负面清单),写清楚:
  - 卡在哪一条命令、报错原文是什么;
  - 已经尝试过什么、为什么没解决;
  - 你判断这是代码问题还是环境问题(参考第 9 章"环境失败 ≠ 代码失败"的分诊标准);
  - 建议的下一步。
- 把这份记录交给用户或上一级协调者,不要自己继续硬撑。

---

## 3. 验证矩阵(按改动类型的必跑命令 + 判据)

所有 `packages/api` 命令必须在 `packages/api` 目录下执行(`cd packages/api && ...`)。从仓库根目录跑 `npx jest` 会走到根目录的 babel-jest 配置,报 TypeScript 语法错误——这是环境限制,不是代码问题,但也不能拿来当"测试跑过"的证据。

| 改动类型 | 必跑命令(原文) | 通过判据(写死) |
|---|---|---|
| **api 业务代码**(非危险区模块的 controller/service/dto 等) | `cd packages/api && npx tsc --noEmit`<br>`cd packages/api && npx jest`(单测全量)<br>`cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit`(e2e 全量) | tsc:无 `error TS` 输出,退出码 0<br>单测:`Tests: N passed, N total`,无 `failed`<br>e2e:`Tests: M passed, M total`,无 `failed` |
| **危险区**:`ai.service.ts` 流式部分 / `concurrency-limiter.ts` / `diagnoses.service.ts` 管线(第 12 章清单)任一文件改动 | 先跑:`cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts`<br>再跑上面"api 业务代码"整行的三条命令 | 危险区两个 spec:`Tests: K passed, K total`,无 `failed`(必须先过这一步才能继续)<br>其余同上 |
| **web(前端)** | `cd packages/web && npx eslint src --ext ts,tsx`<br>`cd packages/web && npx tsc --noEmit`<br>`cd packages/web && npm run build`<br>该页面对应的 Playwright spec(有则跑;没有就手工在浏览器里走一遍真实用户流程,点击每个按钮/提交每个表单) | eslint:`0 problems`(0 error,警告需逐条确认非新增)<br>tsc:无 `error TS`<br>build:退出码 0,路由清单里该页面存在,无 `Failed to compile`<br>Playwright:`N passed, 0 failed`;手工走查需明确记录点了什么、看到了什么,不是"看起来能用" |
| **加/改数据库迁移** | 先核对第 11 章"手写迁移纪律核对表"<br>`cd packages/api && npx jest -- migration-smoke`(跑该迁移对应的 smoke spec)<br>本地真 Postgres 上跑一次:确保 `coach-postgres` 容器在跑,`DB_TYPE=postgres` 环境下执行 `pnpm --filter @coach/api migration:run` | 核对表逐项打勾<br>smoke spec:`Tests: passed`,无 `failed`<br>`migration:run` 命令输出显示迁移成功执行(无 `QueryFailedError`),且能对应 `migration:revert` 回滚不报错 |
| **改测试本身**(不是改被测代码) | 先在改测试之前的基线代码上跑一次原测试,证明"改之前原测试是绿的"(`git stash` 暂存你的改动或直接对照上一次绿色 CI 记录)<br>然后写清楚为什么要改这个测试(需求变了 / 测试本身有 bug),再改 | 必须先拿到"原测试在旧代码上 PASS"的证据,才允许改动测试断言。**不能倒着做**(先看到红灯,再改断言让它变绿,而不解释为什么旧断言错了) |
| **改依赖**(新增/升级/删除 npm 包) | 用 `pnpm add` / `pnpm remove` / `pnpm up`(不是 `npm install`)<br>检查 `pnpm-lock.yaml` 是否随之更新并纳入提交<br>跑全量门:对应包(api 或 web)的 tsc + 单测 + e2e(api)或 eslint + build(web) | lockfile 有对应改动且被提交<br>全量门按上面各行的判据逐条通过 |

---

## 4. 负面清单:绝不许做的事

每一条都在本项目历史上真实发生过或有明确的事故/设计理由,不是假设性风险。

| 禁止行为 | 为什么 |
|---|---|
| 裸 `npx jest` 当"全量测试"的证据 | 单测 jest 的 `testRegex` 是 `\.spec\.ts$`,e2e 文件以 `.e2e-spec.ts` 结尾,裸命令匹配不到任何 e2e 文件,会**静默跳过**并报"全部通过"——实际上最核心的 e2e 用例一条都没跑。这是 2026-07-02 校验实锤过的真实陷阱。 |
| 业务代码绕过 `AiService` 直连 AI 供应商(GLM/DeepSeek/CloudDreamAI) | `AiService` 是唯一的主备降级入口,绕过它意味着这次调用不会在主通道故障时自动切备份通道,也绕开了并发限流器,会重演过的生产事故。 |
| 用 `migration:generate` 生成迁移文件 | 本机没有生产环境的真实 Postgres schema,`migration:generate` 只能对比本机 sqlite/空库,生成的 diff 可能漏列、错判类型、错配外键——历史上多次不可信。迁移一律手写。 |
| `DROP` 任何列或表 | 不可逆,线上有真实用户数据。任何列/表清理必须先经用户明确批准,批准前默认保留(参见 `salary_entries` 孤儿表的处置先例——代码零引用但用户拍板"不清、永留")。 |
| `DELETE` 用户数据行(包括"防御性清洗") | 数据清洗只允许 `SET NULL` 或转型,不允许删行。历史迁移(如 `1782700000000-AddApplicationDetailLinks.ts`)遇到脏数据是"清空该列的值",不是"删掉这一行"。 |
| 删除 `salary_entries` 表 | 该表是刻意保留的孤儿表:薪资雷达功能已整体下线,代码零引用,但表和历史数据(含用户自报+市场种子)按用户 2026-07-03 拍板原样保留,`migration-smoke` 仍校验它存在。想清理必须重新走用户确认+备份流程,不算"顺手清理"。 |
| 生产环境开启 `DEV_LOGIN` | 这是跳过验证码/邀请码的登录后门,写死给公网用户会让任何人免密码登录。`main.ts` 启动期已做 fail-closed 拒启检查,但配置文件/文档里也不能出现建议打开它的内容。 |
| 密钥写进任何文件(代码、文档、提交信息、迁移脚本) | `.env` / `.env.production` / 服务器坐标永不入库是硬红线;写文档时哪怕是"示例"也不许用真实密钥格式的字符串。 |
| `skipLimiter` 用在诊断管线以外 | 这个参数的语义是"外层已经持有并发槽,内层跳过二次 acquire 避免嵌套死锁",只对 diagnoses 管线内部的 analyzer/rewriter/parser 链路成立。其他调用方传 `skipLimiter: true` 等于让该请求完全绕开并发限流,可能打爆 AI 供应商配额或制造新的并发 bug。 |
| 在服务器上构建 Docker 镜像 | 服务器是 2C2G 小机器,构建(尤其 native 依赖编译)会打满资源,且历史上验证过"本地构建 → docker save → scp → 服务器 load"才是稳定路径。 |
| 生产迁移前不备份就执行 | 迁移可能包含列类型转换等不可逆操作(如 T5 的 varchar→uuid 转型),一旦破坏数据只能靠恢复备份找回,不备份就等于没有退路。 |
| 改动危险区代码不跑指定 spec | 第 12 章列的两个 spec(`ai-stream-watchdog.spec.ts`、`concurrency-limiter.spec.ts`)是这块代码两次生产事故后补上的回归测试,不跑等于对这段全项目最脆弱的代码不做任何验证。 |
| 把"环境起不来"标记成 SKIP 混过验收 | Playwright/e2e 因为端口占用、Docker 没起等环境原因跑不起来,是需要先修环境再重验的 STOP 情形,不是"这一项不适用"。把环境失败当作已验证会让真实回归被放过。 |
| 改测试数据/断言让红灯变绿 | 如果修复思路是"改期望值让测试通过"而不是"修代码让行为符合原本正确的期望值",这是伪造证据,等于自己骗自己"过了"。 |

---

## 5. 架构与技术栈

### 5.1 Monorepo 结构

pnpm workspace(`pnpm-workspace.yaml`:`packages/*`),Node ≥ 20(`package.json` engines)。

```
packages/api/                  NestJS 后端
packages/web/                  Next.js 前端
deploy/                        Caddyfile + 生产部署手册(README.md)
docker-compose.prod.yml        生产编排(2C2G 起,资源配额见文件头注释)
Dockerfile.api / Dockerfile.web  多阶段构建,产出精简运行镜像
career-skills-marketplace/     Claude Skills 形态(独立子项目,有自己的文档)
docs/                          项目文档(见第 15 章索引)
.claude/rules/                 团队协作协议(自动加载)
.claude/plans/                 handoff 文件与实施计划
```

### 5.2 后端技术栈(以 `packages/api/package.json` 为准)

- **框架**:NestJS 11(`@nestjs/core` ^11.1.23,`@nestjs/common`、`@nestjs/config`、`@nestjs/jwt`、`@nestjs/passport`、`@nestjs/platform-express`、`@nestjs/schedule`、`@nestjs/throttler`)。
- **ORM**:`@nestjs/typeorm` ^11.0.1 + `typeorm`。
- **数据库**:生产用 `pg`(PostgreSQL 16,见 `docker-compose.prod.yml`);测试/部分本地场景用 `better-sqlite3`(双库差异见第 11 章)。
- **鉴权**:`passport` + `passport-jwt`。
- **AI SDK**:`@anthropic-ai/sdk`(GLM、DeepSeek 均走 Anthropic 兼容协议接入)、`openai`(库存在但 GLM coding 端点走的是原生 fetch,见 5.3)。
- **其他关键依赖**:`ip2region-ts`(离线 IP 归属地)、`mammoth`/`pdf-parse`(简历解析)、`exceljs`/`csv-parse`(校招情报表格解析)、`rss-parser`、`nodemailer`(SMTP 邮件)、`helmet`(安全头)、`uuid`。
- **测试**:`jest` ^30 + `ts-jest` + `supertest`(见第 8 章)。

版本号以 `packages/api/package.json` 实际内容为准,升级依赖后请回来更新本节引用的版本号说法(不要凭记忆推测)。

### 5.3 AI 层:AiService 统一入口

**铁律:业务代码不许绕过 AiService 直连任何 AI 供应商**(第 4 章负面清单已列)。

- 通道:`glm`(智谱 GLM-5.1 coding 端点,主力)/ `deepseek`(官方直连,pro/flash 双档,备份)/ `relay`(CloudDreamAI 中转,别名 `auto-v2`,当前配置为停用状态)。顺序由 `AI_PRIMARY_PROVIDER` 或运行时数据库 `ai_providers` 表决定(`packages/api/src/config/ai.config.ts`)。
- 无密钥的通道在 `AiService` 构造期被自动过滤,不影响实际可用顺位。
- 并发护栏:`ConcurrencyLimiter`(`packages/api/src/ai/concurrency-limiter.ts`),槽位数 `AI_MAX_CONCURRENCY`(默认 2)、队列深度 `AI_MAX_QUEUE`(默认 8)。这是危险区,详见第 12 章。
- `skipLimiter` 参数仅供 diagnoses 管线内部链路(analyzer/rewriter/parser)使用,语义与风险见第 4 章。
- ASR(语音转写):`SpeechProvider` 抽象(`packages/api/src/speech/providers/`),当前对接阶跃(StepFun),预留切换讯飞等其他供应商的空间。

### 5.4 前端技术栈(以 `packages/web/package.json` 为准)

- **框架**:Next.js 16.2.6(App Router)+ React 19.2.4。
- **UI**:`@base-ui/react`、`class-variance-authority`、`tailwindcss` ^4、`tw-animate-css`、`lucide-react`(图标)、`sonner`(toast)。
- **主题**:`next-themes`(暗/亮双主题)。
- **测试**:`@playwright/test` ^1.60(见第 8 章)。
- **lint**:`eslint src --ext ts,tsx && tsc --noEmit`(两步都要过,见第 8 章"lint 陷阱")。

> 注意:`packages/web/AGENTS.md` 已提醒这是较新版本的 Next.js,行为可能与训练数据里的旧版本不同,改前端代码前建议查 `node_modules/next/dist/docs/` 里的对应文档,不要凭训练记忆写已废弃的 API。

---

## 6. 代码地图

### 6.1 `packages/api/src` 模块一句话职责表

| 模块 | 职责 |
|---|---|
| `admin/` | 管理后台数据接口(用户表、AB 报告读取等),`AdminGuard` 查库验角色 |
| `ai/` | `AiService` 统一入口、`AiProviderService`、`ConcurrencyLimiter`、`analyzer.service`(危险区,见第 12 章) |
| `announcements/` | 站内公告(含 AI 生成公告草稿、变更日志读取) |
| `applications/` | 投递追踪(投递记录、策略建议、跨模块关联链接) |
| `auth/` | 邮箱验证码 + 邀请码登录注册 |
| `career/` | 求职策略/career 相关服务 |
| `coach-handoffs/` | 对话教练的任务交接记录 |
| `common/` | 跨模块公共代码:装饰器、Guard、公司名归一化、密钥加解密(`secret-crypto.ts`) |
| `company-research/` | 公司背调:博查(Bocha)搜索客户端、消歧、缓存 |
| `config/` | 环境变量类型化配置(`ai.config.ts`、`env.validation.ts`、`speech.config.ts`) |
| `conversations/` | 对话教练的多轮聊天(`chat.service`)、上下文管理、交接解析 |
| `cover-letters/` | 求职信生成 |
| `credit/` | 点数计费:Guard + Interceptor,AI 端点默认挂载 |
| `data/` | 静态数据/性能报告存放 |
| `database/` | TypeORM 实体、迁移文件、数据源配置、双端列类型工具 |
| `diagnoses/` | 简历诊断管线(危险区,见第 12 章),含 SSE 流式事件 |
| `feed/` | 校招情报摄入(公司名录、月刊 digest 生成、分类、抓取)+ 校招情报子域 recruit-intel(表格/链接/微信 dump 三类源适配) |
| `files/` | 文件上传/下载,鉴权 ACL 下载路由(非静态挂载) |
| `follow-up/` | 投递跟进消息 |
| `geo/` | `ip-region.service` 离线 IP → 省市 |
| `health/` | `/api/health` 健康检查 |
| `intelligence/` | 证据链服务(AI 输出可溯源的证据类型) |
| `interview-prep/` | 面试准备辅助 |
| `interviews/` | 模拟面试、面试复盘(debrief)、二维码上传 token |
| `invites/` | 邀请码管理 |
| `mail/` | 邮件发送(Resend / SMTP) |
| `mock/` | 模拟面试会话 |
| `networking/` | 求职人脉/networking 相关服务 |
| `offer-comparator/` | Offer 比对 |
| `opportunity/` | 机会评估、解析、风险识别、整合 |
| `ops/` | 运维事件记录(`OpsEventsService`) |
| `profession-presets/` | 职业预设数据 |
| `quota/` | AI 用量拦截统计 |
| `resumes/` | 简历上传、解析、版本管理 |
| `speech/` | ASR/TTS,`SpeechProvider` 抽象、词库纠错(`lexicon.ts`) |
| `tasks/` | 后台任务生成与追踪 |
| `users/` | 用户信息(`me` 接口) |

全局路由前缀 `/api`(见 `main.ts` 的 `setGlobalPrefix('api')`)。

### 6.2 `packages/web/src/app` 路由清单

```
(auth)/login/               登录页(邮箱验证码 + 邀请码,条款门)
(main)/                     登录后主功能区(共享导航 layout)
  ├─ admin/                 管理后台
  ├─ applications/          投递追踪列表 + 详情页
  ├─ career/                求职策略
  ├─ chat/                  对话教练
  ├─ cover-letter/          求职信生成
  ├─ debrief/               面试复盘
  ├─ diagnoses/             简历诊断
  ├─ digest/                月刊校招情报
  ├─ interview-prep/        面试准备
  ├─ me/                    个人中心
  ├─ mock/                  模拟面试
  ├─ newspaper/             校招情报板块
  ├─ offer-comparator/      Offer 比对
  ├─ opportunities/         机会列表
  ├─ overview/              求职总览
  ├─ resumes/               简历库
  └─ today/                 首页仪表盘
landing/                    未登录落地页
terms/                      用户条款
upload/                     文件上传入口
```

> 路由结构会随迭代变化,以 `ls packages/web/src/app` 实际内容为准,上表是撰写时(2026-07)的快照。

### 6.3 前端关键共享件(`packages/web/src/lib/`)

| 文件 | 作用 |
|---|---|
| `api.ts` | 统一的后端 API 调用封装 |
| `tracker-stages.ts` | 投递追踪各阶段标签的共享定义(避免多处硬编码同名文案) |
| `use-diagnosis-resume.ts` | 诊断结果与简历数据联动的 hook |
| `use-authed-image.ts` | 鉴权图片拉取 hook(如头像),用于绕开静态资源无 ACL 的问题 |
| `feature-tour.ts` / `feature-updates.ts` | 新手引导与功能更新提示状态管理 |
| `score-utils.ts` | 诊断评分相关工具函数 |
| `wechat.ts` | 微信相关适配(如内推分享) |

---

## 7. 本地开发环境

### 7.1 前置条件

- Node ≥ 20,pnpm(workspace 管理器)。
- Docker Desktop(本机 Postgres 走容器 `coach-postgres`)。
- Windows 本机需注意 7.3 节的坑位。

### 7.2 `.env` 约定(只列变量名,不列真实值——真实值参考 `.env.production.example` 的注释,永不抄真实密钥进任何文档)

`packages/api/.env`(本地开发,gitignored):

- 数据库:`DB_TYPE`(sqlite 或 postgres)、`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASS`、`DB_NAME`
- 鉴权:`JWT_SECRET`
- AI:`AI_PRIMARY_PROVIDER`、`AI_GLM_API_KEY`/`AI_GLM_BASE_URL`/`AI_GLM_MODEL_PRO`/`AI_GLM_MODEL_FLASH`、`AI_DEEPSEEK_API_KEY` 等(完整清单见 `.env.production.example`)
- 邮件:`RESEND_API_KEY` 或 `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`
- 邀请码/管理员:`ADMIN_EMAILS`、`INITIAL_INVITE_CODE`、`INITIAL_INVITE_MAX_USES`
- **`DEV_LOGIN=1` 仅本地开发使用**,跳过验证码方便调试;生产必须为 `0`(第 4 章负面清单)

`packages/web/.env.local`(本地开发,gitignored):`NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_DEV_LOGIN` 等。

两份 `.env` 都不随 git/worktree 迁移(gitignored),在新 worktree 或新机器上开发前需要手动补齐,否则服务起不来。

### 7.3 端口惯例(`ports.env`)

| 服务 | 端口 |
|---|---|
| web(Next.js) | 3001 |
| api(NestJS) | 3002 |
| postgres(本机容器 `coach-postgres`) | 5432 |

### 7.4 Windows 特有坑

1. **重启后 5432 端口绑不上**:Windows `winnat` 的端口排除区间可能吞掉 5432。管理员权限下:
   ```
   net stop winnat
   netsh int ipv4 add excludedportrange protocol=tcp startport=5432 numberofports=1
   net start winnat
   ```
2. **构建 Docker 镜像必须用 PowerShell,不要用 git-bash**:git-bash(MSYS)会把命令行里的 `/api` 这类路径自动改写成 `D:/Git/api`,曾经因此弄坏登录功能。构建镜像统一走 PowerShell。
3. **PowerShell 5.1 没有 `&&`/`??`/三元运算符**:复杂脚本改用 Bash 工具执行;PowerShell 里链式命令用 `;` + `if ($?) { ... }`。
4. Playwright 脚本如果在临时目录运行,可能出现 `Cannot find module '@playwright/test'`(裸包名解析不到),需要 `require` 绝对路径。

---

## 8. 常用命令

### 8.1 安装与启动

```bash
pnpm install                          # 仓库根,安装全部 workspace 依赖

pnpm dev:api                          # NestJS watch 模式(仓库根脚本,等价 pnpm --filter @coach/api dev)
pnpm dev:web                          # Next dev(仓库根脚本)
```

**dev 模式 vs build+start**:Next.js `dev` 模式单页首次编译可能 100 秒以上且吃爆内存;**验收/测试一律用 build + start**,不要用 dev 模式跑 Playwright 或做正式验证。

```bash
pnpm build:api                        # nest build → packages/api/dist
pnpm build:web                        # next build

cd packages/api && node dist/main     # 生产模式启动 api(等价 packages/api 的 start 脚本)
cd packages/web && npx next start     # 生产模式启动 web
```

### 8.2 Lint

```bash
pnpm --filter @coach/web lint         # eslint src --ext ts,tsx && tsc --noEmit —— 这才是真正的 lint
pnpm --filter @coach/api lint         # 只是 tsc --noEmit,不代表 lint 通过(见第 9 章)
```

api 端目前没有独立的 ESLint 脚本(`package.json` 里 `lint` 就是 `tsc --noEmit`)。如果需要真正的 ESLint 检查,用 `npx eslint src/`(前提是仓库配置了 eslint 规则;以实际运行结果为准,不要假设它一定存在)。

### 8.3 迁移与种子(本地,走 ts-node + src)

```bash
pnpm --filter @coach/api migration:run     # 应用未执行的迁移
pnpm --filter @coach/api migration:show    # 查看迁移状态
pnpm --filter @coach/api migration:revert  # 回滚最近一次迁移
pnpm --filter @coach/api seed               # 灌入种子数据(市场数据 + INITIAL_INVITE_CODE)
```

生产环境用编译产物版本(`migration:run:prod` / `seed:prod`),细节见第 10 章与 `deploy/README.md`。

**禁止使用 `pnpm --filter @coach/api migration:generate`**:本机没有生产库真实 schema,生成的 diff 不可信(第 4 章负面清单)。迁移一律手写,命名规则见第 11 章。

### 8.4 测试

```bash
cd packages/api && npx jest                                              # 单测全量
cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit    # e2e 全量(等价 npm run test:e2e)
cd packages/api && npx jest -- migration-smoke                           # 只跑迁移冒烟 spec
cd packages/web && npx playwright test                                   # Playwright(需 web:3001 + api:3002 已在跑)
```

详细的两套 jest 配置差异、假绿陷阱、当前基线计数见第 9 章。

---

## 9. 测试体系(重点,含假绿陷阱)

### 9.1 两套 jest 配置,必须都跑

| | 单测 | e2e |
|---|---|---|
| 配置文件 | `packages/api/jest.config.json` | `packages/api/test/jest-e2e.json` |
| `testRegex` | `\.spec.ts$` | `.e2e-spec.ts$` |
| `rootDir` | `.`(packages/api) | `..`(即 packages/api,因为配置文件在 test/ 下) |
| 运行命令 | `cd packages/api && npx jest` | `cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit` |

**假绿陷阱**:e2e 文件命名以 `.e2e-spec.ts` 结尾,裸 `npx jest`(走单测配置)的 `testRegex` 匹配不到它们,会 **0 匹配、静默跳过**,Jest 仍然打印"通过"摘要——实际上一条 e2e 用例都没跑。任何声称"e2e 通过"的证据,必须来自带 `--config ./test/jest-e2e.json` 的那次运行输出,不能是裸 `npx jest` 的输出。这是 2026-07-02 项目内部校验实锤过的真实教训,不是假设性风险。

必须从 `packages/api` 目录执行。从仓库根目录跑会走到根目录的 babel-jest 配置,报 TypeScript 语法错误,这是环境路径问题,不代表代码有问题,但也不能拿来当测试通过的证据——正确做法是切到正确目录重跑。

### 9.2 Playwright(前端 e2e)

- 配置:`packages/web/playwright.config.ts`。
- `baseURL: 'http://localhost:3001'`,单 worker,桌面 Chrome 项目(`chromium-desktop`),失败自动截图(`screenshot: 'only-on-failure'`)。
- **前置依赖:后端已在 3002 运行、前端已在 3001 运行**(配置注释明确写"外部启动",Playwright 本身不负责拉起服务)。
- 验收要求用 build + start 起服务(不是 dev 模式),否则页面编译慢会导致超时误判为失败。
- devLogin:本地测试可通过 `DEV_LOGIN=1` 跳过验证码登录流程,加快测试准备阶段,但生产绝不能开(第 4 章)。

### 9.3 当前基线计数(以最近一次记录在案的合并验证为准,2026-07 · dev 分支)

以 `docs/refactor2/00-master-plan.md` 执行记录 + `git log`(HEAD 在 T2 合并提交 `6ffc579` 之后)为准:

- api 单测:606 passed / 0 failed
- api e2e:1106 passed / 0 failed
- web build:28 个路由,构建成功

这个数字会随后续任务(T3 职业维基等)变化,**不要直接引用这个数字当作"当前一定是这样"**——正确做法是自己按 8.4 节命令重新跑一遍,拿到你自己动手时刻的真实计数,再和这里的历史值做增减比对(新功能应该让计数只增不减,除非你确实按规范删除了某些路由/功能)。

---

## 10. 质量门与验收标准

改动完成后,合入 `dev` 分支前要走完以下六道门(顺序固定,不许跳过任何一道):

1. **实现完成** —— 按第 2 章 SOP 完成改动。
2. **测试真跑并附原始输出** —— 按第 3 章验证矩阵跑齐对应类型的命令,贴出原始输出(不是转述"跑过了")。
3. **Playwright 全流程走查**(涉及前端改动或用户可见行为变更时必须做;纯后端/纯测试改动此项 N/A,但要在验收记录里写明 N/A 的理由)。
4. **独立审计** —— 由没有参与实现的一方(另一个 agent 或人)对照原始需求逐行审查 diff,专门找茬,不是背书。审计发现按严重度分级:
   - `blocking`:必须清零才能合并。
   - `major`:记入该任务遗留清单,不阻断合并,除非同类问题累计 ≥3 条则升级为必须修。
   - `minor`:只记录,不处理。
5. **合并 dev + 复跑冒烟** —— 合并后至少复跑一次单测 + e2e(两条 jest 命令都要跑,裸 jest 不含 e2e),涉前端的话再跑一次 build。
6. **部署**(如需要)—— 按第 13 章部署纪律执行,且需要用户明确同意上线,不能自作主张部署。

**判据细则**:
- e2e 必须零失败才允许合并,不接受"已知失败白名单"——出现失败先归因是回归还是环境问题,处置完再合并,不能带病合并。
- ESLint 必须 0 错误(`tsc --noEmit` 不是 lint,历史上把两者混淆过,见 `CLAUDE.md` 违规日志)。
- **环境失败 ≠ 代码失败的分诊纪律**:如果验证命令因为端口占用、Docker 未启动、依赖网络请求超时等环境原因跑不出结果,这是需要先修环境再重验的情况,不能当作"这项不适用"直接跳过,也不能当作"代码有 bug"去改代码。要明确写清楚是环境问题、如何确认的(例如同一份代码在合并后的主仓库里跑通了,只有在某个特定 worktree 环境里失败)。

**"完成"的定义 = 有可复跑的证据**。测试原始输出、截图、命令结果——没有证据的"已完成"一律按未完成处理。

---

## 11. 数据库与迁移纪律

### 11.1 手写迁移(不使用 `migration:generate`)

原因见第 4 章负面清单:本机没有生产库真实 schema,生成的 diff 不可信。

**命名规则**:`<毫秒时间戳>-<PascalCase 描述>.ts`(例如 `1782800000000-CreateRecruitEvents.ts`),类名 `<描述><时间戳>`,`name` 字段与文件名时间戳一致(TypeORM 据此记录已执行的迁移)。放在 `packages/api/src/database/migrations/`,按时间戳升序执行。撰写时仓库内已有 19 个迁移文件,可参照最新几个的写法(`up`/`down` 成对,`down` 逆序回滚)。

**手写迁移纪律核对表**(每次改迁移前逐项核对):

- [ ] 文件名与类名的时间戳/PascalCase 描述一致
- [ ] 优先纯 `ADD`(加列/加表/加索引),不涉及删除
- [ ] 需要 `DROP` 任何东西 → 先停下,找用户批准,不能自己决定
- [ ] 需要清洗脏数据 → 只用 `SET NULL`,不允许 `DELETE` 任何行
- [ ] 可空时间列使用 `src/database/column-types.ts` 的 `TIMESTAMP_COLUMN_TYPE`,迁移里对应写 PostgreSQL 落地类型(`timestamp`)
- [ ] 新增的唯一约束/索引,实体装饰器(`@Index`/`@Column({unique: true})` 等)与迁移 DDL 两边都要写,不能只改一边
- [ ] 为这条迁移配一个 `<描述>-migration-smoke.spec.ts`(放在 `packages/api/test/`),校验建表/回滚/外键类型
- [ ] 涉及列类型转换(如历史 varchar 列改 uuid)必须先处理现有脏值(转型前 `SET NULL` 清洗),并在部署说明里特别标注"上线前必须先备份"

### 11.2 双库差异(better-sqlite3 vs PostgreSQL)

- 生产用 PostgreSQL 16,本地测试/部分场景用 `better-sqlite3`。
- 列类型不完全兼容:例如 JSON 列用 `simple-json`(TypeORM 抽象类型)而不是 Postgres 专有的 `jsonb`,保证两端都能跑。
- 可空时间列必须显式指定 `type`(见 `column-types.ts` 头部注释的技术原因:`emitDecoratorMetadata` 对 `Date | null` 联合类型只能反射出 `Object`,TypeORM 无法据此推断列类型),按 `DB_TYPE` 环境变量选择 `'timestamp'`(postgres)或 `'datetime'`(sqlite)。
- 实体与迁移的约束要双端对齐(见上面核对表最后一项)。

### 11.3 `salary_entries` 是刻意保留的孤儿表

薪资雷达功能已整体下线(代码零引用),但表和历史数据(用户自报 + 市场种子数据)按用户 2026-07-03 拍板原样保留,不许当作"顺手清理"删掉。`migration-smoke.spec.ts` 仍然校验这张表存在。想清理这张表必须重新走一次用户确认+备份流程。

### 11.4 生产迁移执行顺序铁律

**先 migration/seed(`docker compose run --rm api ...`),后 `up -d`**。原因:API 容器启动时 `onModuleInit` 就会查表,表不存在会进入崩溃重启循环——虽然建表后能自愈,但重启中的容器 `exec` 不进去,不方便补救。完整命令见第 13 章与 `deploy/README.md`。

---

## 12. 危险代码区(改动前必读,改完必跑指定测试)

这块代码在项目历史上出过**两次生产事故**,是全项目风险最集中的地方。任何触碰以下文件的改动,除了走第 3 章"危险区"那一行的验证矩阵,还要理解下面这些不变量——违反不变量的改动即使测试碰巧过了,也可能在生产并发场景下暴露问题。

### 12.1 涉及文件

- `packages/api/src/ai/ai.service.ts` 的流式(streaming)部分
- `packages/api/src/ai/concurrency-limiter.ts`
- `packages/api/src/diagnoses/diagnoses.service.ts` 的管线超时逻辑

### 12.2 改动后必跑

```bash
cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
```

两个 spec 都必须零失败,这一步过了才能继续跑其余验证矩阵项。

### 12.3 不变量(改代码时不能破坏的假设)

1. **并发槽位只在 `finally` 块里释放**——无论任务成功、失败还是抛异常,都必须释放槽位,否则槽位会被永久占用,后续请求全部排队直至看门狗超时。
2. **`reset` 操作必须 `reject` 所有排队中的 waiter**——不能让它们悬空等待一个永远不会到来的槽位。
3. **看门狗(watchdog)的 idle 重置点是 `reader.read()` 返回**(包括 reasoning 帧返回的时刻),**不是** yield 的时刻。如果把重置点错放在 yield,会导致模型长时间"思考"(reasoning)但还没吐字时被误判超时。
4. **`skipLimiter` 参数只能用于 diagnoses 管线内层调用**(analyzer/rewriter/parser),其它任何调用方传 `true` 都是违规(见第 4 章负面清单)。
5. **409 防重复提交依赖进程内锁**,这个设计前提是**单进程部署**。如果未来 API 要横向扩展成多实例,这个内存锁不再可靠,需要补一条 Postgres 部分唯一索引兜底(形如 `CREATE UNIQUE INDEX ... (user_id, mode) WHERE status = 'running'`),相关代码注释里已经标注了这个前提,扩容前必须处理,不能假装内存锁在多实例下仍然有效。

### 12.4 为什么这么严格

历史上这块代码因为槽位释放时机、看门狗重置点判断错误,导致过诊断任务卡死、并发请求互相锁死(死锁)等生产事故,其中一次是"同一用户 74-99ms 内并发双发诊断请求,409 防重复失效,导致双倍建行 + 双倍扣费",根因是"查重复"和"插入运行中记录"两步操作不是原子的。修复方式是把检查和插入合并成进程内 per-(user, mode) 的串行原子预留操作。改这块代码前,把这个案例当作反面教材读一遍。

---

## 13. 部署与运维

完整步骤以 `deploy/README.md` 为准,本节是浓缩版 + 纪律提醒。

### 13.1 镜像构建与搬运(不在服务器上构建)

```
本机(PowerShell,不要用 git-bash): docker compose -f docker-compose.prod.yml --env-file .env.production build api web
本机: docker save coach-api:latest coach-web:latest -o coach-update.tar   # 不压缩,gzip 管道曾导致传输损坏
scp 把 tar 传到服务器
服务器: docker load -i coach-update.tar
```

服务器坐标、SSH 方式:见仓库 `_local\coach-deploy\运维手册.md`(gitignored,只在本机,不在 GitHub 上),本文档不记录。

### 13.2 部署顺序铁律

**先备份 → 先 migration/seed(`run --rm` 一次性容器)→ 后 `up -d`**:

```bash
# 数据库 migration(runner 镜像只有 dist + node,没有 pnpm/ts-node)
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api node_modules/.bin/typeorm -d dist/database/data-source.js migration:run
# 种子数据(幂等,可重跑)
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm api node dist/seed.js
# 起全家桶
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

原因见第 11.4 节:API 启动即查表,顺序反了会进崩溃重启循环。

### 13.3 部署后必测

```bash
curl -s http://localhost/api/health    # 期望 {"status":"ok","db":"ok",...}
```

并且要**从外部视角**验证一次(浏览器打开登录页,真的走一遍登录),容器 healthy 不等于用户能用。

### 13.4 生产环境铁律

- `DEV_LOGIN=0`,无例外(第 4 章)。
- `.env.production` 必须被 git 忽略(`git check-ignore .env.production` 应有输出)。
- 只有 `caddy` 对公网开放 80/443;api/web/postgres 都不映射宿主端口,只走容器内网。
- `APP_VERSION` 建议填本次 git short sha,方便通过 `/api/health` 的 `version` 字段核对线上跑的是哪个版本。

### 13.5 备份与恢复

- 数据只存在于 PostgreSQL 的 `postgres_data` 卷,备份 = `pg_dump`(容器内执行,自定义格式 `-Fc`)。
- 备份脚本:`packages/api/scripts/backup.sh`(按 `DB_TYPE` 自动分支,默认保留最近 14 份,输出到 `packages/api/backups/`,已 gitignore)。
- **任何生产迁移前先跑一次备份**,这是不可商量的前提(第 4 章负面清单)。
- 恢复用 `pg_restore --clean --if-exists`,恢复后不需要再跑迁移(dump 已含 schema + 数据)。
- 建议 cron 每日定时备份并同步到异地存储;截至撰写时,是否已在服务器配好 cron 属于运维现状,不要假设,去本机运维手册和服务器 crontab 核实。

### 13.6 密钥管理

`.env`、`.env.production`、`_local\coach-deploy\` 目录下任何内容:**永不入库、永不出现在提交信息和文档里**。需要密钥时去仓库 `_local\coach-deploy\运维手册.md`(gitignored,只在本机)或对应的密钥管理位置查,不要把值抄进任何会被提交的文件。

---

## 14. 已知遗留与注意事项

以下内容整理自 `docs/refactor2/00-master-plan.md` 各任务的"遗留(非阻断)"记录,不是阻断性 bug,但改相关功能前应该知道这些背景,避免"重新发现"已知问题或误判为新回归。

- **老用户旧头像不自动恢复**:头像存储链路修复后,历史上用旧格式存的 `avatar_url` 会被静默降级成文字头像(不再裂图,但也不会自动变回真实头像),不会有重传提示。如果要恢复,需要额外做数据处理或引导用户重传。
- **公司背调消歧层②(GLM `rankByContext`)当前生产不可达**:因为调用方(`checkCompany`)目前没有传 `jd_text` 上下文,恒走第三层降级逻辑。这是设计上认可的合理降级,**不要把这层代码当死代码删掉**——后续如果把 `jd_text` 接入 `company-check`(例如投递详情页场景),这层就会被激活。
- **409 防重复的进程内锁前提是单进程部署**:见第 12.3 节第 5 条,未来多实例部署前必须补 Postgres 部分唯一索引。
- **`evidence_used` 字段已从 4 个 AI 功能的 schema/prompt 中删除**(用户 2026-07-03 授权裁定):前端从未渲染这个字段,却在每次 AI 调用里额外烧输出 token。"诚实可溯源"的产品诉求未来由职业维基(T3)的证据侧表承载,不再靠这个死字段。
- **onboarding 引导中曾指向"更多功能"入口的一步文案会失真**:因为该入口按钮已在导航重组中删除,引导会优雅降级为居中卡片(不会崩溃),但提示文案"点开「更多功能」就能看到这些辅助工具"已经不准确,属于已知的小文案债务。
- **对话删除端点存在但前端无入口**:后端有 `DELETE /conversations/:id`,前端目前任何地方都没有调用它的删除按钮。是否要补前端入口待用户决策,不要自作主张删掉这个端点或凭空加按钮。
- **`salary_range` 等同名字段与已删除的薪资雷达模块无关**:薪资雷达模块删除时特意确认过这些同名字段不受影响,不要因为名字相似就误判它们是遗留死代码去清理。
- **T3(职业维基)截至撰写时尚未开工**:`00-master-plan.md` 状态表显示 T3 的实现/测试/审计/合并均未完成,内容量产是独立的 pipeline,需要先完成 Stage0 schema + 注册表 + 用户对经济模型的 go/no-go 批准。

这份清单会随项目推进过时,**遇到不确定的遗留项,优先去读 `docs/refactor2/00-master-plan.md` 的最新记录**,它比本节更新更及时。

---

## 15. 文档索引

| 文档 | 一句话导读 |
|---|---|
| `CLAUDE.md`(仓库根) | 开发标准与红线,自动加载,涵盖行为内核、质量门顺序、违规案例日志 |
| `docs/AGENT-HANDBOOK.md` | 项目干活手册:代码地图、常用命令、Prompt 模板库、坑位清单(症状→根因→解法)、迭代路线图 |
| `docs/FABLE-PLAYBOOK.md` | 前任模型(Fable)的做事风格与编队方法论移植手册,讲"怎么把活干好"而不是"这个项目是什么" |
| `docs/PROMPTS.md` | 任务派发 Prompt 模板库(总控/开发/测试/审计四类) |
| `docs/refactor2/00-master-plan.md` | 二次重构的总调度台:任务索引、状态追踪表、执行进展与已知问题(最新遗留项以此为准) |
| `docs/refactor2/01-dev-principles.md` | 执行期行为准则:证据标准、环境坑位速查、危险代码区、提交纪律 |
| `docs/refactor2/02-execution-playbook.md` | 执行手册:通过判据、合并规程、修复循环规程、任务→脚本索引表 |
| `docs/refactor2/03-operations-handbook.md` | 运行手册:配额作战模型、中断处置流程、长期稳定性维护 |
| `docs/refactor2/CODE-AUDIT-2026-07-02.md` | 二次重构前的代码现状审计档案(51 条实锤问题的溯源) |
| `docs/refactor2/T1~T6-*.md` | 各任务的详细设计文档(导航重组、校招情报、职业维基、稳定性建设、投递详情、博查搜索) |
| `deploy/README.md` | 生产部署完整手册:首次部署、升级、备份恢复、回滚、架构端口表、安全提醒 |
| `career-skills-marketplace/` | Claude Skills 形态的独立子项目,有自己的 README/CHANGELOG,不在本手册覆盖范围 |
| `AGENTS.md`(仓库根) | 给 Codex 类工具的精简入口文件,速查十条最要命的规则 |
| `packages/web/AGENTS.md` | 提醒 Next.js 版本较新,行为可能与训练数据不同,改前先查本地文档 |

