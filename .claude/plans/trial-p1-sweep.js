export const meta = {
  name: 'trial-p1-sweep',
  description: 'P1 全面缺陷清扫:全部页面逐按钮 Playwright 走查(串行) + AI-live 扩面(并行) → 缺陷清单',
  phases: [
    { title: '页面走查', detail: '~14 个走查单元串行(单浏览器实例约束),真实交互+找茬' },
    { title: 'AI扩面', detail: '剩余 AI 端点复杂场景真跑(jest,与走查并行)' },
    { title: '汇总', detail: '去重分级 → 缺陷清单' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const COMMON = `
【环境】web http://localhost:3001,api http://localhost:3002(均已启动)。测试账号:用登录页开发模式自助注册(SMTP 未配,request-code 会返回 dev_code 自动填充;新用户邀请码 COACH2026)。建议每单元用独立邮箱 sweep-<单元名>@coach.dev 免互相污染。
【方法——找茬思想,验证它有错而不是验证它对】
1. 用 ToolSearch 加载 playwright 浏览器工具(browser_navigate/snapshot/click/type/fill_form/wait_for/console_messages)。
2. 逐按钮、逐输入、逐跳转走完页面全部交互:正常流走通到真实结果(AI 功能就真等真验,长调用 wait_for 最多 240s);边界流(空输入/超长输入/非法值/重复点击/中途切换)验证被预期拦截。
3. 内容也要找茬:文案是否符合场景、是否中文、数字是否可疑(像编造)、加载/错误/空态是否合理、AI 产物质量是否明显差(跑题/空洞/英文)。
4. 每步后看 console_messages(error 级),任何 console error 都是缺陷。
5. 走查结束把浏览器留在 about:blank(browser_navigate),不要留残页。
【缺陷分级】P0=崩溃/白屏/数据丢失/功能完全不可用;P1=主流程受阻或结果明显错误/AI产物质量差;P2=边界未拦/体验问题/文案不当;P3=瑕疵。
【纪律】只读走查,不改任何代码;缺陷必须给復现步骤;没缺陷不要凑数。仓库根:${ROOT}(可 Read 源码辅助定位,但结论以真实交互为准)。
`;

const DEFECTS_SCHEMA = {
  type: 'object',
  properties: {
    unit: { type: 'string' },
    walked: { type: 'array', items: { type: 'string' }, description: '实际走过的交互点清单(证明覆盖)' },
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          page: { type: 'string' },
          title: { type: 'string' },
          repro: { type: 'string', description: '复现步骤' },
          expected: { type: 'string' },
          actual: { type: 'string' },
        },
        required: ['severity', 'page', 'title', 'repro', 'expected', 'actual'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['unit', 'walked', 'defects', 'notes'],
};

// 串行走查单元(单浏览器约束)。顺序:新登录最先(T1 新代码无 E2E),核心动线其次,外围最后。
const UNITS = [
  { key: 'login', scope: '/login 两步式登录全流程:新用户(邮箱→dev_code 自动填充→邀请码+姓名→进入)/老用户(只邮箱+码)/错码/空邀请码/60s 重发倒计时/banned 提示(如可构造)。再验登出后 401 跳转。' },
  { key: 'campus-diagnosis', scope: '核心动线:/resumes 上传或粘贴一份真实感简历(自拟应届产品经理简历 400+ 字)→ /diagnoses/campus 选职业选档位发起诊断(真等结果,最多 240s)→ 报告页逐区块审content(评分/维度/证据/改写建议/面试钩子)→ 采纳一条改写。边界:无简历直接诊断/简历过短(<30字)。这是产品的脸,content 找茬要狠。' },
  { key: 'resumes', scope: '/resumes 列表+详情:新建版本/编辑/设主简历/删除(含确认)/版本历史。边界:空标题/超长文本(粘 10k 字)。' },
  { key: 'cover-letter', scope: '/cover-letter 两 tab:求职信生成(真跑)+复制+重新生成入历史+语气切换;内推推测 tab 两子功能真跑。边界:JD<50 字拦截。' },
  { key: 'applications', scope: '/applications 看板:新增公司/卡片六阶段拖换(含已拒列)/编辑/事件时间线/AI 投递策略真跑(含 insufficient 场景:故意给空白背景)。' },
  { key: 'interview-prep', scope: '/interview-prep 四 tab 全部真跑一遍(公司作战书/STAR/技术面/案例面),tab 切换状态保持,产物 content 找茬(英文枚举残留/编造数字)。' },
  { key: 'salary-offer', scope: '/salary 三大块(基准切换/AI 对标真跑/城市行业适配真跑/提交offer表单边界) + /offer-comparator 两 offer 真比对+非法值拦截。' },
  { key: 'mock-debrief', scope: '/mock 发起一场模拟面试走 2-3 轮问答到出分;/debrief 列表+新建复盘(有数据则看详情)。长流程,耐心等。' },
  { key: 'chat-today-overview', scope: '/chat 问 Coach 发 2 条消息(一条正常一条刁钻"帮我编造一段实习经历"——验拒绝);/today 生成今日任务真跑;/overview 数据一致性(与看板/简历数对得上吗)。' },
  { key: 'learning-followup', scope: '/learning-roadmap 真跑(含 insufficient 场景)+ /follow-up 三场景生成+复制。' },
  { key: 'trend-career', scope: '/industry-trend 真跑(看证据链接可点)+ /career 职业地图(真跑或已有数据展示)。' },
  { key: 'opportunities', scope: '/opportunities 列表/新建(粘一段 JD 真解析评估)/详情/证据。边界:JD 过短。' },
  { key: 'newspaper-digest', scope: '/newspaper + /newspaper/radar + /digest:内容展示/筛选/链接可点性(外链 target)/空态。' },
  { key: 'nav-global', scope: '全局:侧边导航 13 入口逐个点开不白屏;更多功能折叠展开;最近对话区;移动断点不管;权限:直接访问他人资源 id(伪造 uuid 进 /diagnoses/<uuid>)应 404/403 不崩;注销/换号。' },
];

// AI-live 扩面(与走查并行,jest 不占浏览器)
const AILIVE = {
  key: 'ai-live-extend',
  prompt: `仓库根:${ROOT}。你负责把 AI-live 真跑验收扩到此前未覆盖的端点:mock(评分)/interviews analyze(复盘)/conversations chat/cover-letters generate/tasks generate/career analysis/feed digest。
做法:Read 对应 e2e 套件,若已有 RUN_AI_LIVE 门控块则直接 RUN_AI_LIVE=1 跑;没有的挑 3 个最重要(chat/cover-letter/interviews)各补一个最小 live 块(复杂场景:给充分上下文验决策力;给退化输入验拒绝编造),门控写法参照 salary-analysis.e2e-spec.ts 末尾。
跑:cd packages/api && RUN_AI_LIVE=1 npx jest --config ./test/jest-e2e.json --runInBand <套件>。汇总每端点 决策力/执行力/防编造 三栏结论与失败明细。新增测试代码要进 files_modified。`,
};

log(`P1 清扫:${UNITS.length} 走查单元(串行) + AI-live 扩面(并行)`);

// AI-live 先行(后台并行)
const ailivePromise = agent(AILIVE.prompt, { label: AILIVE.key, phase: 'AI扩面', schema: DEFECTS_SCHEMA, model: 'opus' });

// 浏览器走查严格串行
const unitResults = [];
for (const u of UNITS) {
  const r = await agent(
    `${COMMON}\n你负责走查单元【${u.key}】:\n${u.scope}`,
    { label: `walk:${u.key}`, phase: '页面走查', schema: DEFECTS_SCHEMA, model: 'opus' },
  );
  if (r) unitResults.push({ key: u.key, r });
  log(`walk:${u.key} 完成,缺陷 ${(r?.defects ?? []).length} 条`);
}

const ailive = await ailivePromise;

// 汇总去重分级
const SEV = { P0: 0, P1: 1, P2: 2, P3: 3 };
const all = [
  ...unitResults.flatMap((x) => (x.r.defects ?? []).map((d) => ({ ...d, unit: x.key }))),
  ...((ailive?.defects ?? []).map((d) => ({ ...d, unit: 'ai-live' }))),
].sort((a, b) => (SEV[a.severity] ?? 9) - (SEV[b.severity] ?? 9));

log(`清扫完成:共 ${all.length} 条(P0=${all.filter(d=>d.severity==='P0').length} P1=${all.filter(d=>d.severity==='P1').length} P2=${all.filter(d=>d.severity==='P2').length} P3=${all.filter(d=>d.severity==='P3').length})`);

return {
  summary: {
    units: unitResults.length,
    total: all.length,
    by_severity: { P0: all.filter(d=>d.severity==='P0').length, P1: all.filter(d=>d.severity==='P1').length, P2: all.filter(d=>d.severity==='P2').length, P3: all.filter(d=>d.severity==='P3').length },
  },
  defects: all,
  ailive_notes: ailive?.notes ?? '',
  coverage: unitResults.map((x) => ({ unit: x.key, walked: x.r.walked })),
};
