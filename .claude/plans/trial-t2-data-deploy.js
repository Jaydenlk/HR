export const meta = {
  name: 'trial-t2-data-deploy',
  description: '试运行 T2 数据/部署地基(4C4G):PostgreSQL迁移+备份 / Docker编排+health / 可观测(零主代理代码)',
  phases: [
    { title: '实现', detail: 'pg-migration / deploy-stack / observability 三轨并行' },
    { title: '复审', detail: '逐轨只读审查' },
    { title: '集成', detail: '集成 agent 接线共享文件+pg 全量 e2e 验证' },
    { title: '集成复审', detail: '只读审查' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const BASE = `
【背景】校招求职 AI SaaS「Coach」试运行地基。monorepo:packages/api(NestJS 11+TypeORM,端口3002)+packages/web(Next 16.2.6,端口3001)。目标机器 4C4G 单机。dev 用 sqlite(better-sqlite3),生产走 PostgreSQL(pg 驱动已装)。当前 TypeORM 配置在 app.module.ts:DB_TYPE 切 sqlite/postgres,sqlite synchronize:true,postgres synchronize=NODE_ENV!=='production'。**生产无任何 migration 文件,seed.ts 写死 sqlite** —— 这是本阶段要消灭的 P0。
T1 已落地:邮箱验证码登录(login_codes)/邀请码 DB(invite_codes)/配额(ai_usage)/users 加列(role/status/daily_quota_override)——实体以仓库当前代码为准,先 Read 再写。
【纪律】严格类型无 any;中文 only;新增 env 必须列入 module_wiring_needed(由集成轨进 env.validation/.env.example);**禁止改**:app.module.ts/main.ts/env.validation.ts/.env.example/package.json/test-utils.ts(集成轨统一改,你把需要的改动写进 module_wiring_needed,含 package.json scripts);每条 step→verify 给真实命令证据。仓库根:${ROOT}。
`;

const SCHEMA = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, verify: { type: 'string' }, result: { type: 'string', enum: ['PASS', 'FAIL', 'SKIPPED'] }, evidence: { type: 'string' } }, required: ['step', 'verify', 'result', 'evidence'] } },
    files_created: { type: 'array', items: { type: 'string' } },
    files_modified: { type: 'array', items: { type: 'string' } },
    module_wiring_needed: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['track', 'steps', 'files_created', 'files_modified', 'module_wiring_needed', 'notes'],
};

const REVIEW = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, problem: { type: 'string' } }, required: ['severity', 'problem'] } },
  },
  required: ['track', 'verdict', 'issues'],
};

const TRACKS = [
  {
    key: 'pg-migration', model: 'opus',
    files: 'packages/api/src/database/**(新:data-source.ts CLI 配置+migrations/)、packages/api/src/seed.ts(改造支持 pg)、packages/api/scripts/backup.sh(新)、packages/api/test/(必要的迁移冒烟 spec)',
    spec: `${BASE}
你负责【pg-migration】轨:
1. TypeORM CLI data-source.ts(读 DB_* env,postgres);从当前全部实体生成**初始 migration**(典型做法:本地起临时 pg 或用 typeorm migration:generate 对空库;若环境无 pg 可用,手写 migration——以实体为准逐表建,宁可手写也要可审计)。注意 uuid 主键在 pg 用 uuid 类型+默认 gen_random_uuid() 或应用层生成(看实体当前怎么生成,保持一致)。
2. seed.ts 去掉写死 sqlite:复用与 app 相同的 env 驱动数据源(sqlite/pg 都能跑)。
3. scripts/backup.sh:pg_dump 每日备份+保留 14 份+恢复说明注释;同时给 sqlite 备份分支(dev 用)。
4. wiring 需求:package.json scripts(migration:generate/run/revert、seed)、app.module postgres 分支 synchronize 永远 false+migrationsRun 可选——写清楚交集成轨。
verify 至少含:migration 文件能被 tsc 编译;(若本机有 docker)起临时 pg 跑 migration:run+seed 成功,否则给出手工核对清单并标注 SKIPPED 原因。`,
  },
  {
    key: 'deploy-stack', model: 'opus',
    files: 'Dockerfile.api(新)、Dockerfile.web(新)、docker-compose.prod.yml(新)、deploy/Caddyfile(新)、deploy/README.md(新)、.env.production.example(新)、packages/api/src/health/**(新 health 模块)',
    spec: `${BASE}
你负责【deploy-stack】轨:
1. Dockerfile.api:多阶段(pnpm install→nest build→仅 dist+prod deps;node:22-alpine;better-sqlite3 是 native 依赖,生产走 pg 可不装——用 pnpm prune 或忽略可选;确保镜像能起)。
2. Dockerfile.web:next build→next start standalone(查 next.config 是否需 output:'standalone',需要的话写进 wiring 而不是直接改 config)。
3. docker-compose.prod.yml:postgres16(挂卷+健康检查+内存参数 shared_buffers=256MB)+api+web+caddy(80/443,反代 / → web,/api → api);restart:unless-stopped;4C4G 合理的资源限制。
4. deploy/Caddyfile + deploy/README.md(中文部署手册:首次部署/升级/备份恢复/回滚步骤)。
5. .env.production.example:生产全量 env 模板(中文注释,含 T1 新增的 SMTP/CORS_ORIGINS/ADMIN_EMAILS 等——Read env.validation.ts 取全集)。
6. health 模块:GET /health(DB ping+版本+uptime;不需鉴权;Module 不挂 app.module,写进 wiring)。
verify:docker build 两镜像成功(本机有 docker 才跑,没有则 SKIPPED+给手工验证清单);health 模块单测或最小 e2e。`,
  },
  {
    key: 'observability', model: 'sonnet',
    files: 'packages/api/src/ops/**(新:ops-events 模块)、packages/api/src/ai/ai.service.ts(只加事件钩子行)、packages/api/src/ai/concurrency-limiter.ts(只加事件钩子行)、packages/api/test/ops-events.e2e-spec.ts(新)',
    spec: `${BASE}
你负责【observability】轨:
1. ops_events 实体(id/type/detail json/created_at):记录 AI_FAILOVER(主→备降级)、AI_BOTH_DOWN(两通道皆败)、QUEUE_FULL(并发队列满)三类事件。
2. OpsEventsService.record(type, detail) 注入 AiService 与 ConcurrencyLimiter 的对应路径(withFailover 降级处/unavailable 处/queue 满抛 503 处)——只加调用行,不改既有逻辑;注意不要让记录失败影响主流程(catch 吞掉+Logger.warn)。
3. 查询端:OpsEventsService.recent(limit)/dailyStats() 供 T3 管理后台用;先不做 controller(T3 做),Module 导出 service,写进 wiring。
4. e2e:mock 主通道挂→断言落一条 AI_FAILOVER;队列满→QUEUE_FULL。
verify:tsc 0 错;新 e2e 绿;既有 ai-service-structured.spec 19 例不回归。`,
  },
];

log(`T2 数据/部署:${TRACKS.length} 轨并行`);
const results = await pipeline(
  TRACKS,
  (t) => agent(`${t.spec}\n\n你的文件范围:${t.files}`, { label: `impl:${t.key}`, phase: '实现', schema: SCHEMA, model: t.model }).then((r) => ({ t, impl: r })),
  (prev) => {
    if (!prev) return null;
    return agent(
      `只读独立审查(找茬)。轨【${prev.t.key}】实现完毕。背景:${BASE}\n实现者自报:\n${JSON.stringify(prev.impl, null, 1)}\n\n用 Read/Grep(及只读 Bash)核对:①每条 step 是否真落地(file:line);②migration 与实体一致性/Docker 可构建性/事件钩子不影响主流程;③SKIPPED 项理由是否成立;④类型/中文。给 verdict。`,
      { label: `review:${prev.t.key}`, phase: '复审', schema: REVIEW },
    ).then((rev) => ({ track: prev.t.key, impl: prev.impl, review: rev }));
  },
);

const ok = (results || []).filter(Boolean);
log(`三轨完成:${ok.map((r) => `${r.track}=${r.review?.verdict}`).join(' / ')},进入集成`);

const wiringSummary = JSON.stringify(
  ok.map((r) => ({ track: r.track, wiring_needed: r.impl?.module_wiring_needed ?? [], files_created: r.impl?.files_created ?? [], reviewer_issues: (r.review?.issues ?? []).filter((i) => ['P0', 'P1', 'high', 'medium'].includes(i.severity)), notes: r.impl?.notes ?? '' })),
  null,
  1,
);

const integration = await agent(
  `${BASE}
你是【集成轨】agent(当前唯一写代码者)。三轨产出与接线需求:
${wiringSummary}

任务(step→verify):
1. app.module.ts:postgres 分支 synchronize 永远 false(+migrationsRun 按 pg-migration 轨建议);挂 health/ops-events 模块。
2. package.json(api):migration:generate/run/revert、seed、backup 相关 scripts。
3. env.validation.ts/.env.example:三轨新增 env 全量补齐(中文注释)。
4. 若 deploy-stack 轨要求 next.config 改动(standalone),落实并验证 web build。
5. 全量验证:api tsc 0 错;api 全量 e2e(sqlite 路径)0 failed;若本机有 docker:docker compose config 校验+尝试 build;web build 绿。所有命令贴证据。
6. 跨轨冲突由你修(可改任意文件)。`,
  { label: 'integration', phase: '集成', schema: SCHEMA, model: 'opus' },
);

const integrationReview = await agent(
  `只读独立审查(找茬)。T2 集成完成,自报:\n${JSON.stringify(integration, null, 1)}\n\n核对:①synchronize 生产路径确为 false 且 migration 链路完整(CLI 配置/scripts/初始 migration 三件套);②backup 脚本可执行性与保留策略;③compose/Caddy 反代路径与端口正确(web 3001/api 3002,/api 前缀);④env 三件套(validation/.env.example/.env.production.example)一致;⑤全量 e2e 是否真跑且绿。可重跑部分测试验证。给 verdict。`,
  { label: 'review:integration', phase: '集成复审', schema: REVIEW },
);

log(`T2 完成:集成=${integrationReview?.verdict}`);
return {
  tracks: ok.map((r) => ({ track: r.track, verdict: r.review?.verdict, issues: r.review?.issues ?? [] })),
  integration: { steps: integration?.steps ?? [], notes: integration?.notes ?? '' },
  integration_review: integrationReview,
};
