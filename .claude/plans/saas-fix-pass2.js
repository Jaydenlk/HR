export const meta = {
  name: 'saas-fix-pass2',
  description: 'SaaS 第二轮修复:复审新增 P0/P1(按"类"修,扫同文件兄弟实例)',
  phases: [{ title: '修复P0P1', detail: '每模块/页一名实现者按类修复 + 兄弟实例扫描' }, { title: '复审', detail: '只读核对' }],
};
const ROOT = 'E:/Agent program/HRBP';
const STD = `仓库根:${ROOT}。NestJS+TypeORM+Next16.2.6,中文 SaaS。只改你点名文件。严格类型无 any。中文 only。无 drive-by。
【已由协调者修,勿动】packages/api/src/ai/ai.service.ts、packages/api/src/salary/salary-analysis.service.ts。
【关键纪律——按"类"修,不要只修被点名那一行】修完后必须在同文件内扫描同一缺陷类的其它实例并一并修(例如:一处归属校验缺失→检查所有按 id 取/写用户资源处;一处精确数字无来源门控→检查所有精确数字输出字段;一处采信 AI confidence 未白名单→检查所有枚举采信点)。这是因为上一轮"只修点名行"导致复审又发现大量兄弟漏洞。
AiService.completeStructured 已对 required 字段做"缺失(undefined)即重试;null 仅对数组型非法"的校验。防编造红线:guard 要抑制编造载荷而非仅降元数据。改完更新对应 e2e 回归断言。不跑全局 tsc/build(协调者统一跑)。返回变更摘要。`;
const SCHEMA = { type: 'object', properties: { scope: { type: 'string' }, changes: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, done: { type: 'boolean' } }, required: ['what', 'done'] } }, siblings_swept: { type: 'array', items: { type: 'string' } }, tests: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['scope', 'changes', 'notes'] };
const REVIEW = { type: 'object', properties: { scope: { type: 'string' }, verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] }, issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string' }, problem: { type: 'string' } }, required: ['severity', 'problem'] } } }, required: ['scope', 'verdict', 'issues'] };

const TASKS = [
  { key: 'applications', model: 'opus',
    files: 'packages/api/src/applications/applications.service.ts, packages/api/src/applications/strategy.service.ts, packages/api/src/applications/dto/*.ts, packages/api/test/applications.e2e-spec.ts, packages/api/test/application-strategy.e2e-spec.ts',
    spec: `P0 applications.service.ts:34 create() 不校验 resume_id/diagnosis_id 归属(IDOR),而 update()(89-100)校验了→不对称。抽出私有 assertOwnedRefs(userId,dto),create 落库前与 update 都调用。【类扫描】检查本 service 所有按 id 取/写用户资源的方法都有归属校验。
P1 strategy.service.ts:72 stripCompanyNames 黑名单可被"品牌名+头部/知名/互联网平台"句式绕过。反转为:检测 example_type 含疑似实体公司名(或命中 TYPE_QUALIFIERS 仍含具体品牌)则剔整条/置空该 tier example_types 并降 confidence,不依赖事后子串删。
P1 strategy.service.ts:160 target_count 非法值静默填 3(编造)且无上限。改:缺失/非法→省略该 week 或标 cannot_determine(不杜撰);并对 1-15 区间确定性 clamp。
P2 dto/application-strategy.dto.ts current_applications 每项 @MaxLength 限长。
更新 e2e 回归:create 传他人 resume_id→403;target_count=50→clamp/剔除;品牌+描述词→被剔除。`,
  },
  { key: 'networking', model: 'opus',
    files: 'packages/api/src/networking/networking.service.ts, packages/api/test/networking.e2e-spec.ts',
    spec: `P0 :308 有人脉分支 referral_paths[].contact_description 无溯源校验,可编造不在 known_contacts 的联系人。对每条 path 要求 contact_description 能与某条 known_contacts 文本匹配(子串/关键词);不可溯源者剔除该 path 或降为 cold_contact 并清空 contact_description,记 cannot_determine。
P1 :209 只要填了 contact_description 就绕过共同背景防编造检查。把共同背景可信来源收窄为 shared_background 或 relationship_type∈{alumni_or_ex_colleague,direct_friend},不把 contact_description 当共同背景来源。
P1 :225/:202 空串 message_draft + confidence=high 自相矛盾;raw.confidence 未走 VALID_CONFIDENCE 白名单。新增 VALID_CONFIDENCE 收口(has(x)?x:'low');空/纯空白 draft→message_draft=null + confidence=insufficient + cannot_determine。
【类扫描】两个端点(message / referral-strategy)所有 confidence 采信点都白名单收口;所有"声称有某来源却不校验"的字段都补服务端校验。`,
  },
  { key: 'be-interview-prep', model: 'opus',
    files: 'packages/api/src/interview-prep/interview-prep.service.ts, packages/api/test/interview-prep.e2e-spec.ts',
    spec: `P1 :693 PLAYBOOK_SCHEMA 把 salary_range_estimate 列 required,但产品无来源时返回 null。虽然协调者已让 AiService 对"null 非数组型 required"放行,但仍请把 salary_range_estimate 从 salary_negotiation_notes.required 移除(语义上它可空,guardPlaybook 已兜底),双保险。【类扫描】检查本文件 4 个 schema(PLAYBOOK/STAR/TECH/CASE)所有 required 列表:凡 guard 会在无数据时置 null 的字段,都从 required 移除,避免合法 null 触发重试/503。
P1 :202 引入 VALID_CONFIDENCE 白名单收口 raw.confidence(与其它 service 对齐)。
更新 e2e:无薪资数据场景 playbook 返回 salary_range_estimate=null 且 200(不 503)。`,
  },
  { key: 'be-salary-cityfit', model: 'opus',
    files: 'packages/api/src/salary/city-industry-fit.service.ts, packages/api/test/city-industry-fit.e2e-spec.ts',
    spec: `注意:勿动 salary-analysis.service.ts(协调者已修 breakdown/comparison 门控)。
P1 :266 recommendation 未与过滤后的 fit_matrix 对账,可推荐已被过滤掉的城市。Guard 7 增加:recommendation 引用城市必须在过滤后 fitCities 集合内;否则丢弃 AI 文本由服务端按最高分重写(矩阵空给中性提示)。
P1 :68 公司名白名单把"含数字"当类别标记,360/58同城/4399 等真实品牌名漏网。删除裸数字单独保留逻辑,数字只在与规模/轮次词共现(B轮/500强/A股/X线/X级)时才算类别标记。
【类扫描】所有透传到用户的精确数字/具体公司名字段都确认有来源门控或类别化。更新 e2e 回归。`,
  },
  { key: 'be-offer-comparator', model: 'sonnet',
    files: 'packages/api/src/offer-comparator/offer-comparator.service.ts, packages/api/src/offer-comparator/dto/*.ts, packages/api/test/offer-comparator.e2e-spec.ts',
    spec: `P1 dto probation_discount 加 @Min(0)@Max(1);probation_months @Min(0);months_per_year @Min(1);annual_bonus/social_insurance_monthly/equity_annual @Min(0)。从源头杜绝非法值进入确定性计算(否则试用期损失算负数当权威值返回)。
P1 :133 effective_monthly(实际到手)是模型杜撰精确数字,目前仅 low/insufficient 才剥离。改为与置信度无关一律剥离(无个税/社保基数输入无法确定计算)。
【类扫描】所有"模型给的精确金额且服务端无法复算"的字段统一剥离;所有可由输入确定计算的字段统一服务端复算覆盖。更新 e2e。`,
  },
  { key: 'be-industry-trend', model: 'sonnet',
    files: 'packages/api/src/industry-trend/industry-trend.service.ts, packages/api/test/industry-trend.e2e-spec.ts',
    spec: `P1 :80 防编造 guard 只做模型自产字段字符串自洽,evidence_used[].url 从不验真,模型可一次编造证据+信号双过。可达的硬化(不引入真实联网):①对 evidence_used[].url 做格式校验(必须 http(s)://+合法 host),格式非法的证据剔除;②可选维护可信域名 allowlist(gov.cn/工信部/艾瑞/IDC/麦肯锡/36kr 等),非 allowlist 域名的证据标记为"未核验来源"而非直接作为信任信号解锁全部内容;③在 summary/返回里诚实声明"来源由 AI 提供、未经服务端验真"。不要对外宣称"已防编造来源"。更新 e2e:格式非法 url 的证据被剔除/不解锁信号。`,
  },
  { key: 'be-ai-core', model: 'sonnet',
    files: 'packages/api/src/config/ai.config.ts, packages/api/test/env-validation.spec.ts',
    spec: `注意:勿动 ai.service.ts(协调者已修)。
P2 ai.config.ts parseEnvNumber 接受负数/0:对 timeout 用 Math.max(1000,...) 之类合理下限钳制,对 maxRetries 用 Math.max(0,...) 钳制,避免负值污染 SDK。补 env-validation/单测覆盖负值回退。`,
  },
  { key: 'fe-applications', model: 'sonnet',
    files: 'packages/web/src/app/(main)/applications/page.tsx, packages/web/src/components/application/application-card.tsx',
    spec: `P1 page.tsx:912 卡片改阶段为"已拒(rejected)"后从看板与统计彻底消失且无恢复入口(黑洞)。优先方案:KanbanBoard 增"已拒"列 + TrackerStats 增"已拒"tile(复用后端 stats.rejected),并允许从该列移回其它阶段。若组件结构不便加列,则退而求其次:从 application-card 阶段选项移除 rejected,避免把记录推入不可见黑洞。择一实现,确保 rejected 投递有归处与可见性。`,
  },
  { key: 'fe-interview-prep', model: 'opus',
    files: 'packages/web/src/app/(main)/interview-prep/page.tsx',
    spec: `P1 :1005 切 tab 卸载子组件→已生成 AI 结果与表单输入全丢(用户重新生成=再花一次 AI 调用)。把 4 个 tab 的 result/form 状态提升到父组件(useReducer 或父级持有),非活动 tab 用 CSS display:none 隐藏而非条件卸载,保证切回结果仍在。
P1 :109/:summary envelope 的 recommendations 与 next_actions 在 4 个 tab 全未渲染,AI 产出被丢弃。在各 tab 结果区补"建议"/"下一步行动"列表(对空数组返回 null 安全)。`,
  },
  { key: 'fe-learning-roadmap', model: 'sonnet',
    files: 'packages/web/src/app/(main)/learning-roadmap/page.tsx',
    spec: `P1 :295 仅 confidence==='insufficient' 进信息不足分支;但后端校验失败/空时兜底为 'low',导致空路线被当正常结果渲染。进 result 分支前改为 (data.confidence==='insufficient' || (data.roadmap?.length ?? 0)===0) → 走不足分支;并在不足/result 两处都渲染 cannot_determine 列表(与 follow_up_questions 并列),不丢弃后端拒绝说明、不展示空白结果页。`,
  },
  { key: 'fe-coverletter-referral', model: 'sonnet',
    files: 'packages/web/src/app/(main)/cover-letter/_referral/index.tsx',
    spec: `P1 :252 与 :671 两处根 grid 无高度约束,长 AI 结果被父容器 overflow:hidden 裁掉且无法滚动。给这两处根 grid 加 height:'100%'(或 flex:1)并保留 minHeight:0,使右栏 overflowY:auto 获得有界高度,长结果可正常内部滚动。同时(残留)MessageTab handleCopy 补 navigator.clipboard 判空 + .catch。`,
  },
];

log(`第二轮修复:${TASKS.length} 模块/页(按类修 + 兄弟扫描)`);
const results = await pipeline(
  TASKS,
  (t) => agent(`${STD}\n\n范围:${t.files}\n\n${t.spec}`, { label: `fix:${t.key}`, phase: '修复P0P1', schema: SCHEMA, ...(t.model ? { model: t.model } : {}) }).then((r) => ({ t, fix: r })),
  (prev) => {
    if (!prev) return null;
    return agent(`只读独立审查(找茬)。模块【${prev.t.key}】已修,范围:${prev.t.files}\n原需求:\n${prev.t.spec}\n实现者自报:\n${JSON.stringify(prev.fix, null, 2)}\n用 Read/Grep 核对:①每条是否真修好;②是否扫了兄弟实例(同类还有没有漏的);③有无新缺陷/类型错误/编造载荷未抑制。给 verdict 与遗留。`, { label: `review:${prev.t.key}`, phase: '复审', schema: REVIEW }).then((rev) => ({ scope: prev.t.key, verdict: rev?.verdict, issues: rev?.issues ?? [], siblings: prev.fix?.siblings_swept ?? [], tests: prev.fix?.tests ?? [] }));
  },
);
const all = (results || []).filter(Boolean);
const fails = all.filter((r) => r.verdict === 'FAIL');
log(`第二轮完成:FAIL ${fails.length}/${all.length}`);
return { modules: all };
