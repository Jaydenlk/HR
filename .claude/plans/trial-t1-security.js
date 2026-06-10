export const meta = {
  name: 'trial-t1-security',
  description: '试运行 T1 安全硬化:邮箱验证码+邀请码DB化+配额(三轨并行+集成专轨,主代理零代码)',
  phases: [
    { title: '实现', detail: 'auth-api / login-web / quota 三轨并行(文件不相交)' },
    { title: '复审', detail: '逐轨只读审查' },
    { title: '集成', detail: '集成 agent 接线共享文件+联调修复+受影响测试' },
    { title: '集成复审', detail: '只读审查集成质量' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const CONTRACT = `
【认证 API 契约(前后端共同遵守,不得擅改)】
POST /api/auth/request-code  body {email}
  → 201 { registered: boolean, dev_code?: string }
  (dev_code 仅在 SMTP 未配置且 NODE_ENV!=='production' 时返回;registered 表示该邮箱是否已注册——试运行邀请制下枚举风险可接受,代码注释说明)
POST /api/auth/login  body {email, code, invite_code?, name?}
  → 201 { access_token, user }
  规则:验证码必须有效(10min 内、未消费、错误尝试<5);老用户(registered)只需 email+code;新用户必须带有效邀请码+name;被封禁(status='banned')用户 401「账号已被停用」。
错误一律中文 message。

【数据模型】
- login_codes: id uuid / email / code_hash(HMAC-SHA256, key=JWT_SECRET) / expires_at / attempts int default 0 / consumed bool default false / created_at。同邮箱新申请使旧码 consumed。
- invite_codes: id uuid / code unique / max_uses int default 1 / used_count int default 0 / disabled bool default false / note nullable / created_at。
- users 新增列: role varchar default 'user' ('user'|'admin') / status varchar default 'active' ('active'|'banned') / daily_quota_override int nullable。保留现有 invite_code 列(记录注册所用码)。
- ai_usage: id uuid / user_id / endpoint varchar / created_at(索引 user_id+created_at)。

【启动引导】
- 非 production 且 invite_codes 表为空 → 自动 seed 一条 COACH2026(max_uses=100000,note='dev bootstrap')。production 不自动 seed(运营经管理后台/seed 发码)。auth.service 删除硬编码 validCodes。
- ADMIN_EMAILS env(逗号分隔):登录时邮箱命中 → role 提升为 admin。

【邮件】
- nodemailer + SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM env(已由协调者装包并加入 env.validation:全部 @IsOptional,production 由 main.ts 启动检查 SMTP_HOST 必填——此检查协调者做,agent 不动 main.ts/env.validation)。
- MailService.sendLoginCode(email, code):无 SMTP 配置时仅 Logger.log(开发态)。

【配额】
- QuotaGuard:对 AI 端点检查当日(本地时区日界)ai_usage 计数 ≥ (user.daily_quota_override ?? DAILY_AI_QUOTA env 默认 20) → 抛 429「今日 AI 次数已用完,明天再来或联系管理员提额」。
- AiUsageInterceptor:AI 调用成功后写一条 ai_usage(失败/503 不计数)。
- 应用范围(9 个 AI 端点控制器):diagnoses(campus)/applications strategy/follow-up/industry-trend/interview-prep(4子端点)/learning-roadmap/networking(2)/offer-comparator/salary(analyze+city-industry-fit)/cover-letters(generate)/mock 评分类端点。Grep 确认每个含 AiService 调用的 controller 都套上。

【纪律】严格类型无 any;中文 only;新实体不动既有实体字段;**禁止改**:app.module.ts / main.ts / env.validation.ts / .env.example / package.json / test/test-utils.ts(由后续集成轨 agent 统一改,把你需要的接线写进 module_wiring_needed);改完跑你范围的受影响测试;每条 step→verify 给证据。仓库根:${ROOT}。
【已装依赖(按装机版本写代码,不确定 API 就读 node_modules 内 d.ts/文档)】nodemailer ^8.0.10、helmet ^8.2.0、@nestjs/throttler ^6.5.0(v6 配置为数组形式 ThrottlerModule.forRoot([{ttl,limit}]),ttl 单位毫秒)。
`;

const SCHEMA = {
  type: 'object',
  properties: {
    track: { type: 'string' },
    steps: { type: 'array', items: { type: 'object', properties: { step: { type: 'string' }, verify: { type: 'string' }, result: { type: 'string', enum: ['PASS', 'FAIL', 'SKIPPED'] }, evidence: { type: 'string' } }, required: ['step', 'verify', 'result', 'evidence'] } },
    files_created: { type: 'array', items: { type: 'string' } },
    files_modified: { type: 'array', items: { type: 'string' } },
    module_wiring_needed: { type: 'array', items: { type: 'string' }, description: '需要协调者在 app.module.ts 等共享文件做的接线' },
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
    key: 'auth-api', model: 'opus',
    files: 'packages/api/src/auth/**(controller/service/dto/新 entities)、packages/api/src/users/**(entity 加列+service)、packages/api/src/mail/**(新)、packages/api/src/invites/**(新,或并入 auth 模块)、packages/api/test/auth.e2e-spec.ts(重写)',
    spec: `${CONTRACT}
你负责【auth-api】轨:实现上述契约的后端全部(login_codes/invite_codes 实体、MailService、request-code/login 流程、dev bootstrap seed、ADMIN_EMAILS 提升、banned 拦截、attempts 锁)。
分模块:mail 模块(MailService 可注入)、auth 模块扩展。新模块的 Module 类写好但**不挂进 app.module**(列入 module_wiring_needed)。
测试:重写 packages/api/test/auth.e2e-spec.ts 覆盖:申码→dev_code→登录 / 错码5次锁 / 过期码拒 / 新用户无邀请码403 / 邀请码超额拒 / 停用码拒 / banned 登录拒 / ADMIN_EMAILS 提升。测试内自行用 TypeORM repo 准备 invite_codes 数据(不依赖 test-utils 改动;test-utils 由协调者改)。
注意:其它 e2e 仍用旧 test-utils.loginUser,会暂时红——不归你管,协调者统一切换。`,
  },
  {
    key: 'login-web', model: 'opus',
    files: 'packages/web/src/app/login/page.tsx(重写)、packages/web/src/lib/api.ts 不动、packages/web/src/lib/types.ts 仅加 auth 相关类型',
    spec: `${CONTRACT}
你负责【login-web】轨:把 /login 改为两步式(契约见上):
步骤1 输入邮箱→请求验证码(展示倒计时 60s 可重发;dev_code 存在时自动填入并提示「开发模式」);
步骤2 输入 6 位验证码;若 registered=false 追加显示 邀请码+姓名 两个必填字段。
保持现有视觉语言(暗示性文案/卡片风格,参考现页);全部中文;错误内联展示(400/401/429 的 message 直接显示);登录成功存 token 跳 /today。
不依赖后端真实现:按契约 mock 不可用——直接按契约写,后端并行实现,联调由协调者做。tsc/eslint 你范围内必须 0 错(可跑 npx tsc --noEmit 看你文件相关报错)。`,
  },
  {
    key: 'quota', model: 'opus',
    files: 'packages/api/src/quota/**(新:ai_usage entity + QuotaGuard + AiUsageInterceptor + module)、各 AI 控制器(只加装饰器/UseGuards/UseInterceptors 行)、packages/api/test/quota.e2e-spec.ts(新)',
    spec: `${CONTRACT}
你负责【quota】轨:实现 ai_usage 实体 + QuotaGuard + AiUsageInterceptor + QuotaModule(导出 guard/interceptor,Module 不挂 app.module,列 wiring)。
逐个 Grep 含 AiService 的 controller,在 AI 端点上加 @UseGuards(QuotaGuard) + @UseInterceptors(AiUsageInterceptor)(注意保持既有 JwtAuthGuard 顺序:Jwt 先行)。
users.daily_quota_override 列由 auth-api 轨加——你按它存在来写(类型引用 User 实体即可,两轨改 user.entity 不同字段?不:为防冲突,该列也由 auth-api 轨负责加;你只读取)。
测试 quota.e2e-spec.ts:mock AiService;DAILY_AI_QUOTA=3 下第 4 次 429;失败调用(AI 503)不计数;override=5 时第 6 次才 429;不同用户互不影响。测试登录:暂用旧 loginUser(若红了说明 auth 轨已并入,改用新契约自助申码——以协调者联调为准,你保证逻辑与单测正确)。`,
  },
];

log(`T1 安全硬化:${TRACKS.length} 轨并行`);
const results = await pipeline(
  TRACKS,
  (t) => agent(`${t.spec}\n\n你的文件范围:${t.files}`, { label: `impl:${t.key}`, phase: '实现', schema: SCHEMA, model: t.model }).then((r) => ({ t, impl: r })),
  (prev) => {
    if (!prev) return null;
    return agent(
      `只读独立审查(找茬)。轨【${prev.t.key}】按以下契约实现完毕:\n${CONTRACT}\n\n实现者自报:\n${JSON.stringify(prev.impl, null, 2)}\n\n用 Read/Grep 核对:①契约每条是否真实现(给 file:line);②安全边界(码哈希/attempts/过期/消费/banned/邀请码原子扣减并发安全);③类型/中文/无 any;④测试是否真断言行为。给 verdict。`,
      { label: `review:${prev.t.key}`, phase: '复审', schema: REVIEW },
    ).then((rev) => ({ track: prev.t.key, impl: prev.impl, review: rev }));
  },
);

const ok = (results || []).filter(Boolean);
log(`三轨完成:${ok.map((r) => `${r.track}=${r.review?.verdict}`).join(' / ')},进入集成`);

// ── 集成专轨(串行):接管全部共享文件 + 联调 + 受影响测试修复 ──────────────────
const wiringSummary = JSON.stringify(
  ok.map((r) => ({
    track: r.track,
    wiring_needed: r.impl?.module_wiring_needed ?? [],
    files_created: r.impl?.files_created ?? [],
    files_modified: r.impl?.files_modified ?? [],
    reviewer_issues: (r.review?.issues ?? []).filter((i) => ['P0', 'P1', 'high', 'medium'].includes(i.severity)),
    notes: r.impl?.notes ?? '',
  })),
  null,
  1,
);

const integration = await agent(
  `${CONTRACT}
你是【集成轨】agent,三个并行轨(auth-api/login-web/quota)已完成,现在由你完成共享文件接线与全链路联调。你拥有完整读写权限,且是当前唯一写代码的 agent(无并发冲突)。

三轨产出与接线需求:
${wiringSummary}

任务(step→verify 全程):
1. app.module.ts:挂载三轨新模块(Mail/Invites(若独立)/Quota 等,按 wiring_needed)。→ verify: nest 能编译。
2. main.ts:app.use(helmet());CORS 改为 CORS_ORIGINS env 白名单(逗号分隔;未配置且非 production 时回退 origin:true 并 Logger.warn;production 未配置则启动报错);production 启动检查 SMTP_HOST 必填(缺失即 throw,防上线后验证码发不出)。→ verify: 代码评审级自检+编译。
3. ThrottlerModule 全局接入(app.module forRoot([{ttl:60000,limit:120}]) + APP_GUARD ThrottlerGuard),auth request-code/login 端点用 @Throttle 收紧(3/min 与 10/min)。→ verify: e2e 里能观察到 429(可写一个最小限流 e2e 或在 auth e2e 补)。
4. env.validation.ts + .env.example:新增 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM/ADMIN_EMAILS/DAILY_AI_QUOTA/CORS_ORIGINS(全部 @IsOptional 合理类型;.env.example 带中文注释)。→ verify: env-validation.spec 仍绿(必要则补用例)。
5. test/test-utils.ts:loginUser 切新流程(request-code→dev_code→login;新用户带 invite_code 'COACH2026'+name;依赖 dev bootstrap seed)。→ verify: 随机抽 4 个旧 e2e 套件(resumes/applications/salary/overview)运行全绿。
6. 全量联调:跑 npx tsc --noEmit(0 错)+ auth.e2e + quota.e2e + 上述抽测套件;任何跨轨编译/行为冲突由你修(可改三轨文件)。→ verify: 全部命令输出贴证据。
7. 前端联调自检:启动不必,只核对 login-web 页面调用的路径/字段与后端实现一致(Read 双方代码逐字段比对);不一致以契约为准修代码。→ verify: 字段对照表。
纪律:严格类型无 any;中文 only;不做范围外重构;所有 verify 必须真实运行命令并贴输出关键行。`,
  { label: 'integration', phase: '集成', schema: SCHEMA, model: 'opus' },
);

const integrationReview = await agent(
  `只读独立审查(找茬)。集成轨刚完成共享文件接线与联调,自报:
${JSON.stringify(integration, null, 1)}

用 Read/Grep/Bash(只读命令+重跑测试) 核对:①app.module/main.ts/env.validation/.env.example/test-utils 五处接线是否真实落地且正确(helmet/CORS 白名单逻辑/throttler 配置形态(v6 数组+毫秒)/production SMTP 检查);②test-utils 新 loginUser 是否所有旧套件兼容(可抽 2 个套件重跑验证);③有无遗漏 wiring_needed 项;④登录前后端字段是否逐项一致。给 verdict 与问题清单。`,
  { label: 'review:integration', phase: '集成复审', schema: REVIEW },
);

log(`T1 全部完成:集成=${integrationReview?.verdict}`);
return {
  tracks: ok.map((r) => ({
    track: r.track,
    verdict: r.review?.verdict,
    issues: r.review?.issues ?? [],
    wiring: r.impl?.module_wiring_needed ?? [],
    files: { created: r.impl?.files_created ?? [], modified: r.impl?.files_modified ?? [] },
  })),
  integration: { steps: integration?.steps ?? [], notes: integration?.notes ?? '' },
  integration_review: integrationReview,
};
