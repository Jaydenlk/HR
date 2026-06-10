export const meta = {
  name: 'saas-fix-p2',
  description: 'SaaS 复审 P2×42 修复(按文件分组,fix-or-document)',
  phases: [{ title: '修P2', detail: '每文件组一名实现者' }, { title: '复审', detail: '只读核对' }],
};
const ROOT = 'E:/Agent program/HRBP';
const STD = `仓库根:${ROOT}。NestJS+TypeORM+Next16.2.6,中文 SaaS。只改你点名文件。严格类型无 any。中文 only。无 drive-by。
AiService.completeStructured 已对 required 做"缺失(undefined)即重试;null 仅对数组型非法"校验。防编造红线:guard 抑制编造载荷而非仅降元数据。
【判断】每条 finding:能修则按类修(扫同文件兄弟实例)+更新对应 e2e 回归;若属"by-design 合理行为"或"需真实联网/外部数据才能根治"(无法在不引入新依赖下解决),则 done=false 并在 notes 说明理由,不要硬凑。
不跑全局 tsc/build(协调者统一跑)。返回结构化摘要。`;
const SCHEMA = { type: 'object', properties: { scope: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { finding: { type: 'string' }, done: { type: 'boolean' }, how: { type: 'string' } }, required: ['finding', 'done', 'how'] } }, tests: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['scope', 'items', 'notes'] };
const REVIEW = { type: 'object', properties: { scope: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] }, issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, problem: { type: 'string' } }, required: ['severity', 'problem'] } } }, required: ['scope', 'verdict', 'issues'] };

const TASKS = [
  { key: 'ai-core', model: 'opus',
    files: 'packages/api/src/ai/ai.service.ts, packages/api/test/ai-service-structured.spec.ts',
    spec: `#25/#63 validateAgainstSchema 不校验 enum、不处理 oneOf/anyOf:为 oneOf/anyOf 节点实现"匹配任一分支即通过"(含 {type:'null'} 分支允许 null);为含 enum 的字段做成员校验——但仅当值存在且非法时判失败(缺失仍由 required 逻辑管),避免误伤。务必跑 ai-service-structured.spec 确认不回归(真实模型偶发枚举漂移不应频繁触发 503,故 enum 校验失败走既有重试链即可)。补单测覆盖 enum 非法→重试、oneOf null 分支→放行。
#26 complete() 在响应无 text 块时返回空字符串,用户面产物(求职信)会被持久化为空白。改:无 text 块时抛错(交 withFailover 重试/降级),不静默返回 ''。
#23(efficiency,PLAUSIBLE) 结构化最坏 6 次 limiter 占用放大队满 503 风险:评估可否把结构化 ATTEMPTS 由 3 降到 2,或仅在真正空块时重试。若判断当前权衡合理则 done=false 说明。`,
  },
  { key: 'be-interview-prep', model: 'opus',
    files: 'packages/api/src/interview-prep/interview-prep.service.ts, packages/api/test/interview-prep.e2e-spec.ts',
    spec: `#32 guardCase 绝对化保证语 scrub 正则缺 /g,单句多处"保证拿offer/必过"只删首个。加 /g 全局标志。
#33 guardPlaybook hasSource 正则把裸"数据/平台/报告"当有来源,套话即绕过。收紧为需显式来源结构(来源:xxx / 平台名+年份 / 样本说明),裸通用词不算来源。
#34 negotiation_timing 在 TS SalaryNegotiationNotes 可选,却在 PLAYBOOK_SCHEMA required。从 required 移除(模型合理省略不应触发重试/503)。同时复查 4 个 schema 其余 required 是否都与 TS 可选性一致。
#60/#64/#311 STAR 编造数字检测是 token 级/纯数字字面量集合:同一数字串在输入任意处出现即放行(跨字段串号),且对中文数字(三十万)不设防。收紧:数字需在"同一来源上下文"匹配而非全局集合;并把常见中文数字(万/千/百分比中文)纳入检测。`,
  },
  { key: 'be-networking', model: 'opus',
    files: 'packages/api/src/networking/networking.service.ts, packages/api/test/networking.e2e-spec.ts',
    spec: `#36/#62 成功率虚报 guard 只校验 cold_contact,direct/indirect 不拦。按系统提示区间(direct 30-50% / indirect 15-30% / cold 5-15%)对三类路径都做服务端 clamp/校验,超区间即收口到区间上界并标注。
#37 isColdContactRateInflated 取字符串中所有数字最大值,上下文数字(如"2年""第3个")误判。改为只解析百分比模式(\\d+%-?\\d*% 或 含'%'的区间),忽略非百分比数字。
#38 insufficientMessage 总把两个字段都列缺失,诊断不准。按实际缺失的字段动态列出。`,
  },
  { key: 'be-offer-comparator', model: 'sonnet',
    files: 'packages/api/src/offer-comparator/offer-comparator.service.ts, packages/api/src/offer-comparator/dto/*.ts, packages/api/test/offer-comparator.e2e-spec.ts',
    spec: `#39 comparison/weighted_scores/hourly_rate 只遍历 AI 返回行,AI 漏某 offer 则该 offer 静默消失。改:以输入 offers 为基准补齐缺失行(缺失项标注"AI 未给出/信息不足"),不静默丢。
#40 DTO offers 数组加 @ArrayMaxSize(5)(与 UI"最多5个"一致);company/notes/user_priorities 等字符串加 @MaxLength。
#41 total_score/dimension_scores 在 high/medium 完全采信模型、不按声明权重复算。改:服务端按 weights 对各维度归一化分做加权复算 total_score 覆盖模型值(纯数学,确定性);维度分若可由已剥离/复算字段推导则一并校验,否则低置信剥离(已有)。`,
  },
  { key: 'be-salary', model: 'opus',
    files: 'packages/api/src/salary/salary-analysis.service.ts, packages/api/src/salary/city-industry-fit.service.ts, packages/api/test/salary-analysis.e2e-spec.ts, packages/api/test/city-industry-fit.e2e-spec.ts',
    spec: `#42 salary-analysis salary_range.unit 缺失静默默认 monthly_rmb,可能把年薪误标月薪(12x)。改:unit 缺失/非法时,若数额量级明显是年薪(如 >100000)给 annual_rmb 或直接判 insufficient 不臆测;至少不要静默假定 monthly。
#44 city-industry-fit confidence=insufficient 时未清空 fit_matrix,自相矛盾(数据不足却附完整矩阵)。insufficient 时强制 fit_matrix=[](或仅保留定性提示)。
#43(fabrication,需真实数据) 高置信仅凭 AI 自报 source_name+grade=A 放行,服务端无来源真实性校验。无真实联网无法根治——可做的:对 grade=A/B 但 url 缺失或非真实域名的来源降级为 C;若判断需外部检索才能根治则 done=false 说明并确保不对外宣称"来源已验真"。`,
  },
  { key: 'be-misc', model: 'sonnet',
    files: 'packages/api/src/industry-trend/industry-trend.service.ts, packages/api/src/learning-roadmap/learning-roadmap.service.ts, packages/api/src/applications/applications.service.ts, packages/api/src/follow-up/follow-up.service.ts, packages/api/src/salary/dto/city-industry-fit.dto.ts, packages/api/test/industry-trend.e2e-spec.ts, packages/api/test/learning-roadmap.e2e-spec.ts',
    spec: `#30 industry-trend isStale 只设过期下界无未来上界,编造未来日期(2030-01)不算陈旧而放行。加未来日期上界:date 晚于当前即视为非法/陈旧剔除。
#31 industry-trend demand_level guard 是数组级:任一信号存活即放行所有 role 的 high demand_level。改为逐条:每个 recommended_entry_role 的 demand_level 独立按其自身是否有支撑判定。
#35 learning-roadmap stripFabrication 只剔带 http(s):// 的 URL,裸链(www.x.com)/短链漏过。扩展正则覆盖无协议域名(www./常见 TLD)与短链域名。
#61 city-industry-fit.dto profile 用 @IsNotEmpty 无法保证非空且缺 @IsObject():加 @IsObject() + 嵌套 @ValidateNested/@Type 或至少 @IsObject + 关键子字段校验。
#28(applications,PLAUSIBLE) update() Object.assign 合 DTO,stage 任意跳转无状态机校验:看板允许自由移动卡片属正常产品行为;若无真实业务不变量被破坏则 done=false 说明 by-design。
#29(follow-up,PLAUSIBLE) 中文only/防编造仅靠 prompt,applyGuards 无服务端确定性校验:可加"草稿中文字符占比过低→降级/标注"的轻量确定性兜底;编造内容无字面标记难根治的部分 done=false 说明。`,
  },
  { key: 'fe-offer-comparator', model: 'sonnet',
    files: 'packages/web/src/app/(main)/offer-comparator/page.tsx',
    spec: `#53 useState 用非惰性初始化器,emptyForm() 每次 render 执行并自增模块级 idCounter → addOffer id 跳号 + 每 render 无谓分配。改用惰性初始化 useState(() => ...);id 生成移出 render(如 useRef 计数器或 crypto/递增于事件回调内)。
#54 选填数值字段非法输入被 parse 静默返回 undefined 丢弃,用户无感。对非法选填输入显示内联提示(或保留原值+标红),不静默丢数据。
#55 weekly_hours 用 parsePositiveNumber:0/负被丢弃退化为"未知",且无上限,可填 500 致荒谬时薪。加范围校验(如 1-100),越界内联报错。`,
  },
  { key: 'fe-misc', model: 'sonnet',
    files: 'packages/web/src/app/(main)/applications/page.tsx, packages/web/src/app/(main)/follow-up/page.tsx, packages/web/src/app/(main)/learning-roadmap/page.tsx, packages/web/src/app/(main)/salary/page.tsx, packages/web/src/app/(main)/cover-letter/page.tsx',
    spec: `#45 applications 每次移动卡片/新增公司都把整块看板替换为全屏"加载中…"并重挂载。改:首次加载才显示 spinner;后续 mutation 用乐观更新或局部 loading,不整屏重挂。
#46 applications 策略结果只渲染 4 个结构化数组,AI 把内容放进 recommendations/risks/next_actions 时被判"信息不足"丢弃。补渲染这三块(对空数组安全)。
#47 follow-up 复制失败提示渲染在左侧表单列,用户在右侧结果区点复制看不到。把复制反馈移到复制按钮附近/右侧结果区。
#50 learning-roadmap 每周时长输入 min/max 不约束手动键入,键入 0 或 >80 原样提交触发后端英文 400。前端加整数+范围校验与中文提示,提交前拦截。
#56 salary Offer 提交表单只做空值校验,可提交 0/负/超大/月薪>总包。加数字合法性+正负+一致性(月薪≤总包)校验与中文提示。
#52 cover-letter 顶层 tab 与内层 sub-tab 条件渲染切换,切走即卸载丢失输入与结果。把 tab 状态提升/用 display 隐藏而非卸载(参考 interview-prep 已修模式)。`,
  },
  { key: 'fe-diag-trend', model: 'sonnet',
    files: 'packages/web/src/app/(main)/diagnoses/campus/page.tsx, packages/web/src/app/(main)/diagnoses/[id]/diagnosis-detail.tsx, packages/web/src/app/(main)/industry-trend/page.tsx, packages/web/src/lib/types.ts',
    spec: `#58 diagnosis-detail 对 nullable 的 suggestions/keywords 数组直接 .length/.slice,null 行崩溃白屏。加 (x ?? []) 兜底。
#59 types.ts JdMatchDiagnosis.keywords_hit/keywords_miss 声明非空 string[] 但后端 entity nullable,旧数据 null 会崩。改类型为可选/可空并在用处兜底。
#57 diagnoses/campus analyzing 状态无超时/取消,慢/挂起请求让用户卡 spinner。加超时(如 180s 后给"请重试"提示)或取消入口。
#48 industry-trend 信号卡只展示 source+date 纯文本无可点击核验链接。把每条信号关联到 evidence_used 中匹配的 url 并渲染为可点击 <a target=_blank rel=noopener>;无 url 标注"无可核验链接"。`,
  },
];

log(`P2 修复:${TASKS.length} 文件组`);
const results = await pipeline(
  TASKS,
  (t) => agent(`${STD}\n\n范围:${t.files}\n\n需处理的 P2:\n${t.spec}`, { label: `fix:${t.key}`, phase: '修P2', schema: SCHEMA, ...(t.model ? { model: t.model } : {}) }).then((r) => ({ t, fix: r })),
  (prev) => {
    if (!prev) return null;
    return agent(`只读独立审查(找茬)。组【${prev.t.key}】已处理,范围:${prev.t.files}\n原 P2:\n${prev.t.spec}\n实现者自报:\n${JSON.stringify(prev.fix, null, 2)}\n用 Read/Grep 核对:①标 done 的是否真修好且扫了兄弟;②标 done=false 的理由是否成立(确属 by-design/需外部数据);③有无新缺陷/类型错误。给 verdict 与遗留。`, { label: `review:${prev.t.key}`, phase: '复审', schema: REVIEW }).then((rev) => ({ scope: prev.t.key, verdict: rev?.verdict, issues: rev?.issues ?? [], items: prev.fix?.items ?? [], tests: prev.fix?.tests ?? [], notes: prev.fix?.notes ?? '' }));
  },
);
const all = (results || []).filter(Boolean);
const fails = all.filter((r) => r.verdict === 'FAIL');
const doneCount = all.flatMap((r) => r.items).filter((i) => i.done).length;
const wontfix = all.flatMap((r) => r.items).filter((i) => !i.done).length;
log(`P2 完成:修复 ${doneCount} / 文档说明 ${wontfix} / FAIL组 ${fails.length}`);
return { modules: all, doneCount, wontfix };
