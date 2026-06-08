export const meta = {
  name: 'saas-fix-frontend',
  description: 'SaaS 前端逐页修复审计发现(每页一文件不相交)→ 独立复审',
  phases: [
    { title: '修复', detail: '每页一名实现者按 finding 清单修复' },
    { title: '复审', detail: '每页一名只读审查员核对' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const STANDARDS = `
仓库根:${ROOT}。Next.js **16.2.6**(相对训练数据有破坏性变更:如 error 边界 recover prop 为 unstable_retry 而非 reset)。不确定的 Next API/约定先查 node_modules/next/dist/docs/,不要凭旧知识改。
【已由协调者完成,勿改这些文件】packages/web/src/lib/api.ts、lib/types.ts、app/(main)/layout.tsx、app/(main)/error.tsx(已新增 (main) 路由段错误边界,可作渲染崩溃的兜底,但你仍须为每条链路提供优雅的 加载/错误/空/insufficient 状态)。
【已改类型,注意适配】lib/types.ts 中 IndustryGrowthSignal.strength / IndustryRiskSignal.severity / IndustryEntryRole.demand_level 已改为**可选**(前端必须对 undefined 兜底文案,不得渲染空徽章);CoverLetter.tone 已收窄为联合类型 'professional'|'warm'|'direct'。
【修复纪律】只改你范围内的页面文件。严格类型无 any。中文 only:禁止把英文枚举(priority/type/tone/difficulty/severity/weight 等)原样渲染给用户,必须映射中文标签。无 mock/假数据、无空 onClick、无"敬请期待/建设中"。无 drive-by 重构,每行改动对应一条 finding。KISS。
【交付物】修复代码;不要运行全局 tsc/build(协调者统一跑);不写 Playwright(验收阶段统一做)。返回结构化变更摘要。`;

const PAGES = [
  {
    key: 'applications', model: 'opus',
    files: 'packages/web/src/app/(main)/applications/page.tsx',
    findings: `
#20(P1) :391 done 视图与 insufficient 视图都不渲染 confidence 与 cannot_determine,AI 诚实降级信号被丢弃。done 视图显示 result.confidence(low 给低置信提示);cannot_determine.length>0 时渲染"无法判定项"区块;insufficient 态也渲染 cannot_determine。
#60(P2) :529 风险区块整体被 main_risks.length>0 把守,导致 mitigation 数据可能被静默丢弃。拆分:各自按自身长度渲染。
#61(P2) :734 创建/移动卡片失败用原生 alert(),与页面内联错误状态机割裂。改为内联错误提示。
#62(P2) :74 done 态在 confidence='low' 且所有数组为空时展示近乎空白却当"成功"。空结果时给出明确"信息不足/请补充"提示而非空白成功。
#94(P3) :345 insufficient 态 follow_up_questions 为空时仅一句 summary,缺可行动指引。补默认指引。`,
  },
  {
    key: 'industry-trend', model: 'opus',
    files: 'packages/web/src/app/(main)/industry-trend/page.tsx',
    findings: `
#21(P1) :564 信号卡片展示 signal.source·date 纯文本,但从不渲染 result.evidence_used 的可点击来源 URL,用户无法核验。新增"数据来源"区/每信号下方渲染 evidence_used,url 渲染为 <a href target=_blank rel="noopener noreferrer">,无 url 标注"无可核验链接"。
#22(P1) :前述 strength/severity/demand_level 现为可选。STRENGTH_LABELS[signal.strength] 等对 undefined 必须兜底(如"未标注"),不得渲染空 pill。
#64(P2) :633 result.cannot_determine 在任何分支都不渲染,诚实降级信号被丢弃。补渲染。
#98(P3) :140 ConfidenceBadge/招聘前景对未知值拼出 'undefined22' 非法色值。对未知 confidence/hiring_outlook 提供兜底颜色与文案。`,
  },
  {
    key: 'interview-prep', model: 'sonnet',
    files: 'packages/web/src/app/(main)/interview-prep/page.tsx',
    findings: `
#23(P1) :534 对 AI 结果嵌套对象/数组无空值守卫,缺字段渲染期抛 TypeError。对所有直接 .map/.length/.join 的字段加 (result.xxx ?? []),对 company_profile/coverage_map/salary_negotiation_notes 等对象加可选链/判空降级。(error 边界已兜底白屏,但仍要优雅降级)
#65(P2) :812 多处英文枚举(priority/type/difficulty/severity/weight)原样渲染给中文用户。建中文标签映射表逐一映射。
#99(P3) :634 可用备考周数无客户端整数/范围校验,小数(2.5)被后端 @IsInt 拒 400。前端加 step=1/min/max 与整数校验 + 友好提示。`,
  },
  {
    key: 'learning-roadmap', model: 'sonnet',
    files: 'packages/web/src/app/(main)/learning-roadmap/page.tsx',
    findings: `
#24(P1) :510 insufficient 态直接访问 result.follow_up_questions.length 可崩。const followUps = result.follow_up_questions ?? [] 后再用。
#25(P1) :658 result 态 result.next_actions.length 与 result.resource_list 无防御。统一 ?? [] 兜底。
#100(P3) :549 resourcesBySkill 以 r.skill_name 作 key,缺失聚合到 'undefined' 分组。对缺失 skill_name 归"其他"或过滤。
#101(P3) :546 result 含 recommendations/risks/evidence_used 但前端完全不渲染,信息丢失。补渲染(尤其 evidence_used 可点击来源)。`,
  },
  {
    key: 'coverletter', model: 'opus',
    files: 'packages/web/src/app/(main)/cover-letter/page.tsx, packages/web/src/app/(main)/cover-letter/_referral/index.tsx',
    findings: `
#26(P1) cover-letter/page.tsx:110 重新生成后新信永远进不了历史列表(prev.map 按 id 找不到匹配),且"当前"高亮丢失。改为新增:setLetters((prev)=>[letter,...prev]),与 handleGenerate(:95) 一致。
#27(P1) _referral/index.tsx:783 结果数组字段无空值保护,AI 漏任一数组即整页崩。对 referral_paths/cold_outreach_targets/network_gaps/recommendations/risks/cannot_determine/key_points 全部 (x ?? []);TagList 改 if(!items?.length) return null。
#66(P2) cover-letter/page.tsx:120 clipboard 复制无 catch,HTTP 部署/无权限静默失败 + 未处理 Promise 拒绝。加 .catch 提示 + navigator.clipboard 判空降级。
#67(P2) cover-letter/page.tsx:450 历史列表直接展示英文 tone(warm/professional/direct)。映射中文标签(tone 现为联合类型,映射可类型安全)。
#102(P3) _referral/index.tsx:166 ConfidenceBadge 对未知 confidence 无兜底颜色,可能非法 CSS。加兜底。
#103(P3) cover-letter/page.tsx:87 求职信永不带简历,"针对 JD 量身定制"承诺只实现一半。若简历接线超范围,则至少在 UI 文案上不夸大(去掉过度承诺)或加 TODO 注释说明缺口。`,
  },
  {
    key: 'offer-comparator', model: 'sonnet',
    files: 'packages/web/src/app/(main)/offer-comparator/page.tsx',
    findings: `
#28(P1) :288 ResultPanel 直接 comparison.map/recommendation.*/result.risks.length 等未防空,字段缺失整页白屏。入口统一兜底:const comparison = result.comparison ?? [] 等;recommendation 缺失时整块跳过。
#29(P1) :896 insufficient 分支裸用 result.follow_up_questions.length。const followUps = result.follow_up_questions ?? [];summary 兜底。
#68(P2) :688 提交校验仅判 base_monthly 空串,未拦非法/0;formToItem 用 Number() 可产 0/NaN。加 >0 与 NaN 校验 + 提示。
#104(P3) :547 "信息不足时不展示评分"提示为不可达死代码。修正逻辑使其可达,或移除死分支。
#105(P3) :94 试用期折扣百分比无范围约束,>100/负值原样换算送 AI。加 0-100 范围校验。`,
  },
  {
    key: 'salary', model: 'opus',
    files: 'packages/web/src/app/(main)/salary/page.tsx',
    findings: `
注意:MARKET_PERCENTILES(:33)是带免责声明的种子参考数据,合规,**不要动**。
#30(P1) :834 市场对比空态用红线禁止的"敬请期待"。改合规文案如"暂无该岗位的市场 offer 数据,提交你的 offer 帮助补全"并保留提交 CTA,去掉"敬请期待"。
#31(P1) :683 MarketTable 用 prop 派生 state(filterRole)+useEffect 单向覆盖,与父级 role 选择打架。去掉本地 filterRole 与该 effect,统一由父级 selectedRole 受控透传给表格筛选,单一 source of truth。
#69(P2) :706 toggleSort 经无意义 setsSortAsc 包装间接调 setSortAsc,纯胶水。直接调用,删包装。
#70(P2) :686 useEffect 内 void async IIFE 包裹纯同步 setState,无 await 目的。去掉 async IIFE。
#106(P3) :854 SalaryAnalysisResult.next_actions 存在但从未渲染。补渲染(若有内容)。
#107(P3) :10 SalaryStats.avg_total_comp 声明但全页未使用。渲染它或从使用处清理(勿动后端类型)。`,
  },
  {
    key: 'follow-up', model: 'sonnet',
    files: 'packages/web/src/app/(main)/follow-up/page.tsx',
    findings: `
#63(P2) :238 handleCopy 调 navigator.clipboard.writeText 无 .catch 且未判空 clipboard。加判空 + .catch 提示。
#95(P3) :216 必填校验错误文案用脆弱字符串 replace 拼装。改为明确文案常量。
#96(P3) :469 insufficient 分支 cannot_determine 为空时只剩一句"信息不足",无指引。补默认指引。
#97(P3) :223 前端从不传 application_id,DTO/prompt 支持的投递关联能力闲置。若可低成本接线则接,否则加 TODO 注释说明。`,
  },
  {
    key: 'diagnoses', model: 'sonnet',
    files: 'packages/web/src/app/(main)/diagnoses/campus/page.tsx, packages/web/src/app/(main)/diagnoses/[id]/diagnosis-detail.tsx',
    findings: `
#71(P2) diagnosis-detail.tsx:573 创建投递时把 null 公司/职位降级成空串提交,触发后端 @MinLength(1) 400。提交前校验非空,空则提示用户补全,不提交空串。
#72(P2) diagnosis-detail.tsx:600 问 Coach 失败静默吞错,用户看 loading 闪一下无反馈。加错误提示。
#108(P3) diagnosis-detail.tsx:71 DimensionRow 对 max=0 未除零保护,产生 NaN 宽度并传入配色。max<=0 时兜底(宽度 0、默认色)。`,
  },
];

const FIX_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', properties: {
      finding: { type: 'string' }, what: { type: 'string' }, done: { type: 'boolean' },
    }, required: ['finding', 'what', 'done'] } },
    deferred: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['page', 'changes', 'notes'],
};

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] },
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] }, line: { type: 'number' }, problem: { type: 'string' },
    }, required: ['severity', 'problem'] } },
    unfixed_findings: { type: 'array', items: { type: 'string' } },
  },
  required: ['page', 'verdict', 'issues', 'unfixed_findings'],
};

log(`前端修复:${PAGES.length} 页并行(文件不相交)→ 逐页复审`);

const results = await pipeline(
  PAGES,
  (p) => agent(
    `${STANDARDS}\n\n你负责页面【${p.key}】。范围文件:${p.files}\n\n需修复的 finding 清单:\n${p.findings}\n\n逐条修复,返回变更摘要。`,
    { label: `fix:${p.key}`, phase: '修复', schema: FIX_SUMMARY_SCHEMA, ...(p.model ? { model: p.model } : {}) },
  ).then((r) => ({ p, fix: r })),
  (prev) => {
    if (!prev) return null;
    const p = prev.p;
    return agent(
      `你是只读独立审查员(找茬思想,查布局与文案是否符合场景)。页面【${p.key}】刚被修复,范围文件:${p.files}\n\n原 finding 清单:\n${p.findings}\n\n实现者自报:\n${JSON.stringify(prev.fix, null, 2)}\n\n用 Read 核对真实代码:①每条 finding 是否真修好(给 line);②是否引入新缺陷/类型错误(注意 strength/severity/demand_level 现可选)/英文枚举残留/drive-by 改动;③状态机(加载/错误/空/insufficient)是否完整、文案是否中文且符合场景。给 verdict 与未修项。`,
      { label: `review:${p.key}`, phase: '复审', schema: REVIEW_SCHEMA },
    ).then((rev) => ({ page: p.key, fix: prev.fix, review: rev }));
  },
);

const all = (results || []).filter(Boolean);
const fails = all.filter((r) => r.review && r.review.verdict === 'FAIL');
const risks = all.filter((r) => r.review && r.review.verdict === 'PASS_WITH_RISKS');
log(`前端修复完成:PASS ${all.length - fails.length - risks.length} / RISKS ${risks.length} / FAIL ${fails.length}`);

return {
  summary: { pages: all.length, pass: all.length - fails.length - risks.length, pass_with_risks: risks.length, fail: fails.length },
  pages: all.map((r) => ({
    page: r.page, verdict: r.review?.verdict,
    deferred: r.fix?.deferred ?? [], unfixed: r.review?.unfixed_findings ?? [], issues: r.review?.issues ?? [],
  })),
};
