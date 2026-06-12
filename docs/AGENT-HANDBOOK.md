# Coach 干活手册(Agent Handbook)

> 读者:接手本项目的 AI 编码代理(Opus 4.8 或任何后继模型)与人类协作者。
> 目的:在零会话记忆的前提下,读完本文即可安全动手——知道全图、知道命令、知道坑在哪。
> 配套:`CLAUDE.md`(行为铁律,自动加载)、`.claude/rules/`(团队协议,自动加载)、
> `deploy/README.md`(生产部署细节)、本机 `E:\coach-deploy\运维手册.md`(服务器坐标与密钥位置,**不入库**)。

---

## 0. 会话启动程序(每次新会话照做)

1. 记忆索引(MEMORY.md)已自动加载——把与今日任务相关的记忆文件用 Read 展开,别凭印象。
2. 读本手册相关章节 + `CLAUDE.md` 行为内核 + `docs/FABLE-PLAYBOOK.md`(做事风格/编队设计/经济效率平衡的完整方法论)。
3. `git status` + `git log --oneline -5`,确认在 `dev` 分支、工作区干净。
4. 涉及线上操作 → 先读本机 `E:\coach-deploy\运维手册.md`(服务器 IP/SSH/密钥位置全在那,仓库里故意不写)。
5. **线上有真实用户**。任何改动想清楚回滚路径再动手。

---

## 1. 产品一页纸

- **Coach = 校招求职 AI SaaS**。核心楔子:**诚实的简历诊断 + 改写**——"诚实"指 AI 绝不编造简历里没有的内容,这是命门也是护城河。
- 两形态对等:SaaS(本仓库)+ Claude skills(`career-skills-marketplace/`),互相反哺,SaaS 形态目标体验 ≥ skills。
- 当前阶段(2026-06):**免费试运行**,邀请码制,目标 20-50 用户,已上线(IP 直连,无域名)。
- 市场调研结论(2026-06-06,详见记忆 `project_market_research_2026-06-06`):真壁垒只有两个——校招 rubric 深度 + 防编造产品护栏。其余功能都不是壁垒,**做减法**,别堆功能。
- 收费设想(验证后):校招季单次 99-199 元。试运行期一律免费。

---

## 2. 代码地图

pnpm monorepo,Node ≥ 20:

| 路径 | 是什么 |
|------|--------|
| `packages/api/` | NestJS 11 + TypeORM。按域分模块:auth / users / resumes / diagnoses / admin / quota / geo(IP归属) / mail / ai / invites / …。全局前缀 `/api` |
| `packages/web/` | Next.js App Router。`(auth)/login`、`(main)/` 功能页、`landing`、`terms` |
| `deploy/` | Caddyfile + **生产部署手册 README.md(部署前必读)** |
| `docker-compose.prod.yml` | 生产编排,按 2C2G 实机定档(资源配额见文件头注释) |
| `career-skills-marketplace/` | skills 形态(女娲式自包含诊断大 skill) |
| `.claude/rules/` | 团队协议/反划水/handoff 格式/决策节点(每会话自动加载) |
| `.claude/plans/` | handoff 文件与实施计划 |

关键文件速查:

| 文件 | 作用 |
|------|------|
| `packages/api/src/main.ts` | 启动闸:production 必须有邮件通道(Resend 或 SMTP);`trust proxy`(Caddy 后取真实 IP) |
| `packages/api/src/config/env.validation.ts` | 环境变量校验;**校验前会剔除空串值的键**(compose env_file 注入 `KEY=` 的坑) |
| `packages/api/src/seed.ts` | 幂等种子:市场数据 + `INITIAL_INVITE_CODE` 初始邀请码(production 唯一发码途径) |
| `packages/api/src/database/migrations/` | 全部手写迁移,命名 `<毫秒时间戳>-<PascalCase>.ts`(纪律见 §7) |
| `packages/api/src/geo/ip-region.service.ts` | ip2region 离线 IP→省市;内网→「内网」;查不到→null(不编造) |
| `packages/api/src/admin/admin.service.ts` | 管理后台数据(用户表含最近登录 IP/省市) |
| `packages/web/src/app/layout.tsx` | 挂 `<MobileGate />`(<768px 拦截页) |
| `packages/web/src/app/(main)/layout.tsx` | 导航 + 新手聚光灯导览(`coach_tour_done` localStorage) |
| `packages/web/src/app/(auth)/login/page.tsx` | 条款门:复选框必须手动勾,不勾零请求+弹提示抖动 |
| `packages/web/src/app/terms/page.tsx` | 用户条款八节(隐私节明示记录登录 IP 及归属地) |

---

## 3. 本机开发

端口:web **3001** / api **3002**(`ports.env`)。本机数据库:Docker 容器 `coach-postgres`。

```bash
pnpm dev:api          # NestJS watch 模式
pnpm dev:web          # Next dev(注意:dev 模式编译极慢且吃内存,验收一律用 build+start)
pnpm build:api && pnpm build:web
pnpm --filter @coach/web lint      # eslint + tsc(这才是 lint)
pnpm --filter @coach/api lint      # 只是 tsc --noEmit,不算 lint 过!
pnpm --filter @coach/api test:e2e  # Jest e2e(基线 60 条,全绿才算过)
pnpm --filter @coach/api migration:run / migration:show / seed
```

验收口径:**ESLint 0 错误才叫 lint 通过**,`tsc --noEmit` 不是 lint(历史上栽过,见 CLAUDE.md 违规日志)。

Windows 本机三件套(详见 §9 坑位清单):重启后 5432 端口可能被 winnat 吞、Playwright 脚本要 require 绝对路径、复杂 shell 走 Bash 而不是 PowerShell 5.1。

---

## 4. 质量门(顺序固定,不许跳)

1. **自审/简化** — 改动是否最小、有无顺手重构、有无死代码
2. **lint + build 双端** — eslint 0 错 + 两个包 build 通过
3. **测试真跑** — `test:e2e` 全绿(当前基线 60 条);新功能必须带新用例(正常+异常路径)
4. **Playwright 桌面端全流程** — 真点按钮真走流程,目标是**找 bug 不是验证正确**
5. **独立审计** — reviewer 子代理对照需求逐行审 diff(模板见 §6.3)
6. **提交推送** — `git push origin dev && git push origin dev:main`(main 直推已获授权)

**完成的定义 = 有可复跑的证据**(测试原始输出/截图/命令结果)。没有证据的"已完成"按未完成处理。

---

## 5. 团队作业法

**主代理不写产品代码**(用户铁律,记忆 `feedback_no_direct_coding`):产品代码一律经 subagent/workflow 完成;主代理只做任务分解、派工、质量门、集成、提交。文档/配置/运维操作可以直接做。

- 角色表与通信规则:`.claude/rules/team-protocol.md`(代理间不直连,全部经主代理 + handoff 文件)
- handoff 格式与状态机:`.claude/rules/handoff-format.md`
- 反划水条款:`.claude/rules/anti-slacking.md`(无证据的 PASS = 违规)
- 并行派工原则:**文件集不相交才并行**;有共享文件就拆出一个串行的"集成 agent"收口
- 决策节点必须记录:`.claude/rules/decision-nodes.md`

---

## 6. Prompt 模板库(直接复制改空格)

> 本节是**主代理派工给子代理**的模板;**用户派任务给主代理**的总控/验收 prompt 在 `docs/PROMPTS.md`(A 总控每任务贴,B/C/D 常驻),两套配合使用。

### 6.1 派工 implementer

```
任务:{一句话说清做什么}
工作分支:{dev 或 worktree 路径}
只许改这些文件:{精确清单}
禁止触碰:{清单,至少含 migrations 已存在文件 / .env* / 其他 agent 的文件}
执行计划(step→verify):
1. {具体动作} → verify: {精确命令 + 期望输出}
2. {具体动作} → verify: {精确命令 + 期望输出}
背景与决策:{为什么这么做,已排除什么方案}
红线:不写 TODO/占位实现;每步做完立刻跑 verify 不攒到最后;卡同一问题 8 次停下来写阻塞报告;
不顺手重构无关代码;新增依赖必须先报批。
完成后输出:改动文件清单 + 每步 verify 的 PASS/FAIL + 原始证据。
```

### 6.2 派工 test agent

```
被测目标:{能力描述}
先写成功判据(在写任何测试之前):{列出}
测试范围:{spec 文件路径};运行命令:pnpm --filter @coach/api test:e2e
要求:
- 新增 {N} 条用例,覆盖:{正常路径} + {异常路径逐条列出,如 缺字段/越权/重复提交}
- 修 bug 场景:先写复现测试看它 FAIL,再验证修复后 PASS
- 报告必须贴 jest 原始摘要(X passed, Y total),禁止只说"通过了"
- 同一测试失败 2 次就换思路或上报,不许原样重试
```

### 6.3 独立审计 reviewer

```
你是独立审计员,职责是找茬,不是背书。
原始需求(原文):{贴用户原话}
审计材料:git diff {range} + handoff 文件 {路径}
逐项裁决(每项 PASS/FAIL + file:line 引用):
1. 每一行改动都能追溯到需求?有没有越界/顺手重构?
2. step→verify 每一步都有 PASS 证据?证据可信吗?
3. 红线扫描:mock 数据/空 onClick/编造内容/硬编码数字/TODO 残留?
4. 测试是否真跑过——你自己复跑一遍,贴你跑出来的结果
5. 安全:有没有把密钥/内网信息带进代码或文档?
FAIL 就写 FAIL,不许软化成"小建议"。
```

### 6.4 上线前自检(主代理自己过一遍)

```
□ eslint 双端 0 错;build 双端通过
□ test:e2e 全绿(≥ 基线 60 条,数量只增不减)
□ Playwright 主流程通过,截图留存
□ git check-ignore .env.production 有输出(密钥没进库)
□ 生产 DEV_LOGIN=0(免验证码后门绝不上公网)
□ 有 schema 变更 → migration 手写 + migration-smoke 冒烟通过 + 部署时先跑迁移后起服务
□ APP_VERSION 更新为本次 git short sha(上线后 /api/health 可对版本)
□ 改动公网行为的,部署后用 curl 在外网视角验证一遍
```

### 6.5 排障模板(给任何 agent)

```
症状:{贴原始报错,不要转述}
1. 复现:最小命令稳定复现一次,贴原始输出。复现不了就别改代码。
2. 定位:日志 / git diff 二分 / 隔离变量,缩小到单文件单函数
3. 根因:一句话说清因果链。没把握就明说"这是假设",并说明验证方法
4. 修复:修根因不绕过。"清缓存/重启就好了"不是修复,是掩盖
5. 验证:复跑第 1 步的复现命令证明症状消失 + 全量质量门防止回归
```

---

## 7. 数据库纪律

- **一律手写迁移**。`migration:generate` 在本机拿不到线上真实 schema,生成的伪 diff 会漏列/错类型,不可信。
- 命名:`<毫秒时间戳>-<PascalCase描述>.ts`,类名 `<描述><时间戳>`,放 `packages/api/src/database/migrations/`。
- 双端列类型(可空时间列等)用 `src/database/column-types.ts` 的 `TIMESTAMP_COLUMN_TYPE`,迁移里固定写 postgres 落地类型。
- 写完跑 `pnpm --filter @coach/api test -- migration-smoke` 冒烟(建表/回滚/FK 校验)。
- 生产执行顺序铁律:**先 migration/seed(`docker compose run --rm api …`),后 `up -d`**——API 启动时 onModuleInit 就查表,表不在会进崩溃循环,而 `exec` 进不去重启中的容器。完整命令见 `deploy/README.md` §1.3。

---

## 8. 部署与线上更新(概要)

服务器 2C2G,**没能力在服务器上构建镜像**,更新走"本机构建+镜像搬运":

```
本机: docker compose -f docker-compose.prod.yml --env-file .env.production build api web
      (api 的 env_file 指向仓库根 .env.production —— 从 E:\coach-deploy\ 临时拷一份,
       先 git check-ignore 验证被忽略,构建完立刻删)
本机: docker save coach-api:latest coach-web:latest | gzip > coach-update.tar.gz
scp 上服务器 → docker load → (有 schema 变更先跑 migration) → up -d api web
验证: curl http://<服务器>/api/health 看 version 字段 = 新 sha,db=ok
```

服务器坐标、SSH 命令、本机路由修复(Clash TUN 坑)、回滚步骤:见本机 `E:\coach-deploy\运维手册.md`(故意不入库)。
完整首次部署/备份/恢复流程:`deploy/README.md`。

**密钥纪律**:`.env`、`.env.production`、`E:\coach-deploy\` 任何内容永不入库、永不出现在提交信息和文档里。

---

## 9. 坑位清单(症状 → 根因 → 解法)

1. **API 启动报环境变量校验错,值看着没问题** → compose env_file 把 `KEY=` 注入为空串,空串过不了 isIn/isNumberString → env.validation.ts 已在校验前剔除空串键;新增可选变量时记得这个行为。
2. **Caddy 起不来:`unrecognized global option`** → DOMAIN 注入了空串,Caddy 把空站点名的块当全局配置块 → compose 用 `${DOMAIN:-:80}` 兜底,Caddyfile 写 `{$DOMAIN}`;**永远别给 Caddy 传空串站点名**。
3. **API 容器崩溃循环且 exec 不进去** → 先 `up` 后迁移的顺序反了 → 见 §7 铁律。
4. **本机 5432 绑不上(重启后)** → Windows winnat 排除端口区间吞了 5432 → 管理员:`net stop winnat` → `netsh int ipv4 add excludedportrange protocol=tcp startport=5432 numberofports=1` → `net start winnat`。
5. **SSH 国内服务器超时(banner exchange)** → Clash TUN 网卡接管了默认路由 → 加直连主机路由(命令在 E:\coach-deploy\运维手册.md;**Windows 重启后路由失效要重加**)。
6. **web dev 模式页面打不开/OOM** → next dev 单页编译 100s+ 且吃爆内存 → 验收用 `build` + `start`(62ms 级响应)。
7. **PowerShell 5.1 没有 `&&`/`??`/三元** → 复杂脚本一律走 Bash 工具;PS 里用 `;` + `if ($?)`。
8. **Playwright 脚本 `Cannot find module '@playwright/test'`** → 脚本在 Temp 目录解析不了裸包名 → require 绝对路径 `E:/Agent program/HRBP/packages/web/node_modules/@playwright/test`。
9. **pnpm install 提示 ip2region-ts 要构建** → 已在 pnpm-workspace.yaml 禁掉(`allowBuilds: ip2region-ts: false`),xdb 数据文件本来就捆在包里,不需要构建。
10. **Next build 拉 Google Fonts 失败** → 网络抖动,重试即可,不是代码问题。
11. **Ubuntu 装不上 docker-compose-plugin** → Ubuntu 源的 Docker 对应包名是 `docker-compose-v2`。
12. **migration:generate 的 diff 看着合理** → 不可信,见 §7。

---

## 10. 产品红线(违反任何一条 = 返工)

- AI **不编造**:简历里没有的内容绝不出现在诊断/改写/求职信里;数据缺失时明确拒绝并说缺什么。
- 前端**无 mock**:所有数字/列表来自真实 API;按钮必须有真实功能。
- 文案**不编数据**:用户量/好评率这类没有的数字一律不写,用"公测进行中"等诚实口径。
- **DEV_LOGIN 生产必须 0**。
- **做减法**:新功能提案先回答"砍掉什么/为什么非做不可";扩面功能默认拒绝。
- `E:\cv-testset` 永不入库;仓库 `CV/` 目录原件已 gitignore,保持现状。

---

## 11. 迭代路线图(2026-06-12 评估,详细论证见提交说明与记忆)

排序逻辑:活下去(数据安全/合规/留存证据)> 核心体验 10x > 低成本获客 > 商业化试水。
秋招提前批 6-8 月启动,这是校招产品一年里最大的窗口。

**P0(两周内,试运行验证期)**
1. 服务器每日自动备份 cron + 简单磁盘/内存告警——真实用户数据已经在涨,丢库=死(backup.sh 已有,服务器 crontab 未配)
2. 激活漏斗四个数字进管理后台:注册→传简历→首次诊断→7 日回访(一个人运营每天只需要看这个)
3. 诊断结果"准/不准/编造了"一键反馈 + 后台汇总——防编造是命门,让用户帮你抓漏网,也是 rubric 改进的数据源
4. landing 邀请码索取渠道落地(等用户定渠道,一行文案)

**P1(秋招提前批前 = 8 月前)**
5. 域名 + HTTPS + ICP 备案启动(备案周期长,要先动;无域名没法微信内分享)
6. 诊断报告可分享(长图或只读链接)——校招生在群里晒报告是最便宜的获客
7. 诊断→改写→采纳→落回简历库的主线闭环打磨(调研结论:唯一值得做厚的地方)
8. 滥用防护补档:邀请码用量监控 + 注册 IP 频控(一码 50 人,泄露到社交平台一天就满)
9. AI 主通道恢复(auto-v2 修好切回)+ 降级演练例行化

**P2(验证后再说)**
10. 商业化试水:校招季单次 99-199(先有留存数据,再做支付与合规主体)
11. 移动端适配(现为拦截页;等桌面端体验被验证)
12. SaaS 验证过的 rubric 改进反哺 skills 形态

**明确不做**:面试题库/内推社区/资讯 feed 等扩面功能(已砍过,别长回来);BI/埋点平台(20 人规模 SQL 就够);英文简历;自建/微调模型。
