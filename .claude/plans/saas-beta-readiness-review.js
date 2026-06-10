export const meta = {
  name: 'saas-beta-readiness',
  description: '商业化公开测试就绪评审:达标复审+计划漏洞+合规/成本/安全/运维缺口→分级路线图',
  phases: [
    { title: '多维评审', detail: '7 个维度并行(代码审查×4 + 联网调研×3)' },
    { title: '汇总', detail: '交叉去重→P0/P1/P2 分级→最短公测路径' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const FACTS = `
【项目事实(评审基线,均为已确认信息)】
- 产品:校招求职 AI 教练 SaaS「Coach」。monorepo:packages/api(NestJS+TypeORM+SQLite/PG,端口3002)+ packages/web(Next.js 16.2.6,端口3001)。仓库根:${ROOT}。
- 北极星:一个产品两形态对等(Claude skills 形态 + SaaS GUI 形态),SaaS 体验/效果须≥skills 形态。
- 市场调研结论(2026-06-06,7-agent 联网调研):唯一真壁垒=校招 rubric 深度+防编造产品护栏;建议砍一半功能聚焦「诚实诊断+改写」楔子;定价 99-199 元/校招季单次;要狠做减法+做出 10x 差距。
- V1 定位:简历诊断+改写为核心,初期 ~20 人内测 SaaS,邀请码制(INVITE_CODES env,默认 COACH2026)。
- 基础设施约束:生产=单台 VPS 2C2G。AI=CloudDreamAI 中转 auto-v2(接 GLM-5)主通道 + DeepSeek 备用降级;并发护栏 2 并发+8 队列,超出 503;单次 AI 请求可长达 ~190s。
- 质量现状(2026-06-08 已完成):两轮对抗式审计(R1 113 findings/R2 112)→P0×6+P1×51 全部修复;P2 33/35 修复;P3×48 未修。质量门:api tsc/build/unit(124)/e2e(36套件745+) 、web tsc/eslint/build 全绿。AI-live 真跑 9 套件绿。防编造护栏(数据缺失→insufficient拒绝编造)已按类收口。审计明细在仓库 .claude/audit/ 下三个文件。
- 已做减法:删 education-path/personal-brand/question-bank/role-transition 四模块,求职信合并内推,导航折叠(6核心+7更多)。
- 当前面向用户能力:简历馆/校招诊断(核心)/机会中心/投递追踪+投递策略/求职信+内推/模拟面试/面试复盘/面试备战(4合1)/职业地图/学习路线/跟进消息/薪资雷达+AI对标+城市行业适配/Offer比对/行业趋势/月刊面经/今日任务/问Coach(chat)。
- 鉴权:JWT(7d过期,secret 必填经 env 校验)+邀请码注册(无密码,email+name+invite_code 即登录)。无支付、无配额、无按用户限流。
- main.ts:enableCors({origin:true,credentials:true});bodyParser 2mb;无 helmet;无全局 throttler。DB 生产 synchronize=NODE_ENV!=='production'。
`;

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0-blocker', 'P1-before-beta', 'P2-during-beta', 'P3-later'] },
          area: { type: 'string' },
          title: { type: 'string' },
          detail: { type: 'string', description: '具体证据:代码 file:line / 计划文档条目 / 引用来源 URL' },
          recommendation: { type: 'string', description: '可执行的最小修复/动作' },
          effort: { type: 'string', enum: ['hours', 'days', 'week+'] },
        },
        required: ['severity', 'area', 'title', 'detail', 'recommendation', 'effort'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['dimension', 'findings', 'summary'],
};

const CODE_DIMS = [
  {
    key: 'plan-gap',
    prompt: `${FACTS}
你是产品战略审查员(找茬思想)。任务:对照上述北极星/市场调研结论/V1 定位,审查当前交付与计划之间的落差与计划本身的漏洞。
步骤:
1. Read 仓库 .claude/audit/2026-06-08-cycle-summary.md 与两个 findings 文件,了解质量基线与诚实遗留。
2. Read .claude/plans/ 下相关计划文件(如 phase3-build-plan.md 等)与 packages/web/src/app/(main)/ 页面清单,盘点实际交付面。
3. 重点找:①市场调研说"砍一半聚焦诚实诊断+改写楔子",但当前仍有 15+ 功能入口——功能面与战略结论的矛盾是否构成公测风险(用户心智分散/维护面过大/AI 成本面过大)?②计划里"SaaS 效果≥skills 形态"如何验证?有无验证手段缺失?③20人内测→公开测试的跨越,计划里缺了什么(增长/反馈回路/留存指标)?④定价 99-199/季 但代码无任何支付/配额——计划是否有"如何收钱"的漏洞?⑤有没有计划承诺但代码缺失的能力(逐条指认)?
输出每条带证据(文件/计划条目),按公测阻断性分级。最多 10 条,宁缺毋滥。`,
  },
  {
    key: 'security-public',
    prompt: `${FACTS}
你是安全审查员(找茬思想),评估"从内网/邀请内测 → 公网公开测试"的暴露面。只读审查 packages/api。
必查清单(逐项给 file:line 证据,逐项判定):
1. CORS:main.ts enableCors({origin:true,credentials:true}) —— 公网下任意源+携凭证的风险等级与最小修复。
2. 无 helmet/安全响应头;无全局 rate-limit/throttler(@nestjs/throttler 未装)——结合 AI 端点昂贵(190s/调用),无限流意味着什么(成本放大/DoS)。Grep 验证。
3. 认证强度:无密码登录(email+name+邀请码即得 7d JWT)——任何知道邀请码的人可无限注册任意 email(冒用他人邮箱);公测下邀请码必然外泄。评估账号体系最小硬化方案(邮箱验证码/限制注册速率/单码次数上限)。读 auth.service.ts/users.service.ts 确认注册逻辑。
4. 文件上传(files/resumes):类型/大小限制?存储位置?读 files.controller.ts。
5. 错误信息泄漏:全局异常过滤器有无;5xx 是否把内部细节回给用户。
6. secrets:.env 是否被 gitignore;仓库内有无硬编码密钥(Grep sk-/api_key/secret 模式,排除 .env.example/test)。
7. SQLite 单文件在公网多写并发下的锁/损坏风险。
8. 依赖告警:package.json 中明显过期/可疑版本。
按公测阻断性分级,最多 12 条。`,
  },
  {
    key: 'monetization-infra',
    prompt: `${FACTS}
你是商业化基础设施审查员。市场结论定价 99-199元/校招季,但代码层面"收钱与控成本"的地基是否存在?只读审查。
逐项核查(给证据):
1. 支付:有无任何支付/订单/权益模块(Grep pay/order/wechat/alipay/stripe)。缺失→公测期用什么替代(邀请码=免费测试?手动开通?)给出最小可行方案与工作量。
2. 配额/计量:AI 调用无 per-user 配额、无用量记录(确认 Grep quota/usage/credit)。公测免费期没有配额=成本不可控;给最小配额方案(per-user 每日 N 次,哪一层实现最薄:guard/interceptor/limiter 扩展)。
3. 用户分层:users 表有无 plan/role 字段;管理员能力(封号/发码/看用量)是否存在——公测运营最低需要什么。
4. 数据埋点:有无任何产品分析(激活/留存/功能使用),公测验证"诚实诊断楔子"假设需要哪几个最小事件。
5. 邀请码体系:INVITE_CODES env 逗号分隔——能否支撑"分批放量公测"(每码限次数/可作废/溯源)?读 auth 实现评估。
按公测阻断性分级,最多 10 条。`,
  },
  {
    key: 'ops-readiness',
    prompt: `${FACTS}
你是运维/可靠性审查员,评估单台 2C2G VPS 公开测试的运维就绪度。只读审查。
逐项核查(给证据):
1. 生产 DB:sqlite(默认)→ postgres 切换路径;TypeORM synchronize 生产=false 后**没有任何 migration 文件**意味着什么(schema 如何建立/演进)——Glob migrations 确认,给最小方案。
2. 备份:任何备份机制/脚本存在吗?用户简历数据丢失=致命。
3. 进程管理与部署:有无 Dockerfile/pm2/systemd/部署脚本(Glob);崩溃自愈靠什么。HTTPS/反代(nginx/caddy)有无配置痕迹。
4. 日志与可观测:Nest Logger 落到哪;有无错误聚合/告警;AI 主备降级发生时运营如何感知(目前只有进程日志)。
5. 容量推演:2C2G + AI 并发2/队列8 + 单次 AI 190s 极限 → 高峰可服务多少并发用户?next dev vs next start 内存占用;api+web+postgres 同机 2G 内存是否挤爆——给出公测放量上限的量化估算与扩容触发线。
6. ScheduleModule 定时任务(feed 抓取/XHS)在生产小机上的资源争抢风险。
按公测阻断性分级,最多 10 条。`,
  },
];

const RESEARCH_DIMS = [
  {
    key: 'compliance-cn',
    prompt: `${FACTS}
你是中国 AI 产品合规调研员。任务:用 WebSearch/WebFetch(经 ToolSearch 加载)调研「个人/小团队在中国大陆向公众提供生成式 AI 求职辅导 SaaS(公开测试+收费)」的合规义务清单。
必须覆盖并给出**来源 URL 引用**:
1. 《生成式人工智能服务管理暂行办法》(2023)适用性:面向公众提供服务是否需要备案/安全评估;"具有舆论属性或社会动员能力"的判定对本产品的适用。
2. 算法备案/深度合成备案(网信办)实操:个人开发者/无公司主体能否备案;不备案公测的实际执法风险水平(查处先例)。
3. ICP 备案 vs ICP 许可证(经营性):收费 SaaS 是否触发经营性 ICP;个人备案能否挂商业产品。
4. 个保法基线:隐私政策/用户协议/账号注销/数据导出删除——公测最低必备清单。
5. 内容安全义务:AI 输出是否需内容审核机制(简历/求职场景风险低,但法规要求?)。
6. 常见小团队的现实路径:套壳备案/借主体/先海外后国内/仅邀请制规避"面向公众"——各路径的合规性与风险。
诚实区分:法规明文要求 vs 实操灰色地带 vs 你不确定的(标注"需咨询专业人士")。每条 finding 的 detail 必须含至少一个来源 URL。最多 10 条。`,
  },
  {
    key: 'cost-pricing',
    prompt: `${FACTS}
你是单位经济模型调研员。任务:测算公测期每用户 AI 成本,验证 99-199元/季定价的毛利空间。
步骤:
1. Read packages/api/src/diagnoses/ 与 src/ai/ 下 1-2 个核心 service,估算单次校招诊断的 prompt+completion token 量级(简历~2-4k字+rubric prompt;输出结构化诊断)。再抽 1 个轻端点(求职信)对比。
2. WebSearch/WebFetch 查 GLM(智谱 glm-4/glm-4-plus 或 GLM-5 若有公开价)与 DeepSeek(deepseek-chat V3)的当前每百万 token 官方价格,给来源 URL。CloudDreamAI 是中转,按上游官价近似。
3. 建模:典型公测用户旅程(注册→上传简历→2次诊断→1次改写→3次轻功能)的 token 总量与人民币成本;重度用户(20次调用/季)成本;按 100/500/2000 公测用户推总成本。
4. 结论:免费公测无配额的月成本区间;99元定价下的毛利;建议的免费额度线(N 次诊断)与付费墙位置。
所有价格数字必须有来源 URL;估算注明假设。最多 8 条 findings(含成本表放 detail)。`,
  },
  {
    key: 'beta-playbook',
    prompt: `${FACTS}
你是公测策略调研员。任务:用 WebSearch/Exa 调研 2-3 个可类比产品(AI 简历/求职工具,中国市场优先:如 智联/猎聘 AI 简历、Kickresume、Rezi、面试鸭/牛客等)的公测/上线打法,提炼对本产品的可执行启示。
关注:①邀请制→公开的放量节奏与渠道(小红书/牛客/校园);②免费额度与付费墙设计先例;③公测期收集什么指标验证 PMF(激活/诊断完成率/改写采纳率/分享率);④校招季节性(秋招9-11月/春招3-4月)对公测窗口选择的影响——当前 2026-06,距秋招还有 ~3 个月,最佳节奏是什么;⑤差异化叙事:"诚实诊断/拒绝编造"如何转化为公测传播点。
每条启示给来源 URL;区分"调研到的事实"与"你的推断"。最多 8 条。`,
  },
];

log(`公测就绪评审启动:代码维度 ${CODE_DIMS.length} + 调研维度 ${RESEARCH_DIMS.length}`);

// 7 个维度互相独立 → 并行;synthesis 需要全部结果 → barrier 合理。
const all = await parallel([
  ...CODE_DIMS.map((d) => () =>
    agent(d.prompt, { label: `review:${d.key}`, phase: '多维评审', schema: REVIEW_SCHEMA, model: 'opus' })
      .then((r) => ({ key: d.key, r }))),
  ...RESEARCH_DIMS.map((d) => () =>
    agent(d.prompt, { label: `research:${d.key}`, phase: '多维评审', schema: REVIEW_SCHEMA, model: 'opus' })
      .then((r) => ({ key: d.key, r }))),
]);

const ok = all.filter(Boolean);
log(`维度完成 ${ok.length}/7,开始汇总`);

const SYNTH_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', description: '一句话总判定:当前离商业化公测有多远' },
    blockers_p0: { type: 'array', items: { type: 'string' } },
    before_beta_p1: { type: 'array', items: { type: 'string' } },
    during_beta_p2: { type: 'array', items: { type: 'string' } },
    plan_holes: { type: 'array', items: { type: 'string' }, description: '原计划本身的漏洞(非执行落差)' },
    roadmap: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          week: { type: 'string' }, theme: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['week', 'theme', 'items'],
      },
      description: '到公开测试的最短周计划(对齐秋招窗口)',
    },
    open_questions: { type: 'array', items: { type: 'string' }, description: '需用户拍板/需专业咨询的问题' },
  },
  required: ['verdict', 'blockers_p0', 'before_beta_p1', 'during_beta_p2', 'plan_holes', 'roadmap', 'open_questions'],
};

const resultsJson = JSON.stringify(
  ok.map((x) => ({ dimension: x.key, summary: x.r?.summary, findings: x.r?.findings })),
  null,
  1,
);

const synthesis = await agent(
  `${FACTS}
你是总编审。下面是 7 个维度的评审/调研结果 JSON。任务:
1. 交叉去重(同一问题多维度报→合并取最全证据)。
2. 校准分级:P0-blocker=不解决就不能公开(法律风险/数据安全/成本失控);P1=公测前应做;P2=公测期间补。对争议项给出你的裁定理由。
3. 识别「原计划本身的漏洞」(战略/验证手段/商业闭环层面,区别于执行落差)。
4. 产出对齐 2026 秋招窗口(9月)的最短周路线图:当前 2026-06-10,倒排到 9 月初公开。
5. 列出必须用户拍板/需专业咨询(法务)的开放问题。
保持诚实:调研型结论保留来源 URL;不确定的标注不确定。

七维结果:
${resultsJson}`,
  { label: 'synthesis', phase: '汇总', schema: SYNTH_SCHEMA, model: 'opus' },
);

return { dimensions: ok.map((x) => ({ key: x.key, summary: x.r?.summary, findings: x.r?.findings })), synthesis };
