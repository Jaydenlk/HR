export const meta = {
  name: 'saas-fix-backend',
  description: 'SaaS 后端逐模块修复审计发现(文件不相交并行)→ 独立复审',
  phases: [
    { title: '修复', detail: '每模块一名实现者按 finding 清单修复 + 更新自有 e2e' },
    { title: '复审', detail: '每模块一名只读审查员核对修复完整性与新增缺陷' },
  ],
};

const ROOT = 'E:/Agent program/HRBP';

const STANDARDS = `
仓库根:${ROOT}(路径相对此根)。本项目:NestJS+TypeORM+SQLite,中文 SaaS。
【修复纪律】
- 只改你范围内文件。禁止改:packages/api/src/ai/ai.service.ts、packages/api/src/salary/salary-analysis.service.ts、salary-analysis.e2e-spec.ts(已由协调者修)。
- 严格类型:无 any/as unknown as。中文 only。KISS。无 drive-by 重构,每行改动对应一条 finding。
- 【关键】AiService.completeStructured 现已:①递归校验 schema.required 字段存在+类型(缺失→重试/降级/最终503);②max_tokens 截断即抛错;③默认 maxTokens=8192。
  因此:不要为了"防漏字段"而把大量字段塞进 OUTPUT_SCHEMA 的 required(会抬高 503 率)。对 schema.required 之外的字段,在 service guard 里用 (x ?? []) / 类型守卫做防御兜底 + 优雅降级,而非强制 required。
- 【防编造红线】guard 必须"抑制编造载荷"而不仅"降元数据":数据缺失/无来源时要置空对应字段或返回 insufficient,绝不照样输出编造的数字/URL/推荐。
【交付物】
- 修复代码;更新本模块自有 e2e-spec.ts 使其匹配新行为,并为每条 P0/P1(尤其防编造与崩溃)新增回归用例(确定性 mock,断言修复后行为)。
- 不要运行全局 tsc/build(协调者统一跑)。返回结构化变更摘要。`;

const MODULES = [
  {
    key: 'ai-core', model: 'sonnet',
    files: 'packages/api/src/config/ai.config.ts, packages/api/src/config/env.validation.ts, packages/api/src/ai/concurrency-limiter.ts, packages/api/test/env-validation.spec.ts',
    findings: `
#36 env.validation 漏校验 ai.config 实际读取的多个 env:AI_PRIMARY_MAX_RETRIES/AI_FALLBACK_MAX_RETRIES(@IsOptional @IsNumberString)、CLOUDDREAM_MODEL/CLOUDDREAM_BASE_URL/DEEPSEEK_API_KEY/DEEPSEEK_MODEL/DEEPSEEK_BASE_URL(@IsOptional @IsString)。补齐缺失项的校验装饰器。
#37 ai.config.ts:47 timeoutMs/maxRetries 用 Number() 解析,非法 env(NaN)直接污染 SDK。改为解析后 Number.isFinite 校验,非法则回退默认值(timeout 60000/120000,retries 0/3)。
#80 concurrency-limiter.ts:56 release() 无下溢护栏。active-- 前加 if(active>0) 或 Math.max(0,...),防御性兜底。
更新/补 env-validation.spec.ts 覆盖新校验。`,
  },
  {
    key: 'applications', model: 'sonnet',
    files: 'packages/api/src/applications/strategy.service.ts, packages/api/src/applications/applications.service.ts, packages/api/src/applications/dto/*.ts, packages/api/test/application-strategy.e2e-spec.ts, packages/api/test/applications.e2e-spec.ts',
    findings: `
#38 strategy.service.ts:67 stripCompanyNames 的描述性标记判定放行带括号/数字的真实公司名,绕过防编造。收紧:含公司名特征(括号/数字/"公司""集团"等)也应被剥离或标注,不放行。
#39 dto/application-strategy.dto.ts:11 current_applications 仅 @IsArray。补 @IsString({each:true}) + @ArrayMaxSize(合理上限如100)。
#40 dto/application-strategy.dto.ts:5 user_profile 无 @MaxLength。补 @MaxLength(如 8000)防超大文本直送 AI。
#82(P3) applications.service.ts:123 getStats 用 row.stage 直接索引写入,未校验已知 stage 键。加已知 stage 白名单守卫。
#112(P3) applications.service.ts:82 update 用 Object.assign 写 resume_id/diagnosis_id 未校归属。校验引用的 resume/diagnosis 属于当前 user,否则拒绝或忽略该字段。
#81(P3) strategy.service.ts:111 detectWindowNote 用进程本地时区判窗口期。改用显式时区(Asia/Shanghai)或基于月份的稳健判断。`,
  },
  {
    key: 'follow-up',
    files: 'packages/api/src/follow-up/follow-up.service.ts, packages/api/src/follow-up/dto/*.ts, packages/api/test/follow-up.e2e-spec.ts',
    findings: `
#5(P1) follow-up.service.ts:122 message_draft 缺失/非字符串时 .replace/.length 抛 TypeError→500。入口加类型守卫:非 string → 返回 {confidence:'insufficient', message_draft:'', cannot_determine:[...,'AI 未返回有效消息正文']}。
#6(P1) follow-up.service.ts:121 催促词 guard 用裸子串 replace 破坏中文语义产出残句。改为:检测到禁用词→降 confidence + 在 risks/cannot_determine 标注(或删整个最小句段并补标点),不在成品裸删两字。
#41(P2) :110 防编造仅 high→medium 软降级,confidence=insufficient 服务端永不可达。补足:严重缺失场景能落到 insufficient。
#42(P2) :127 150字截断在逗号/硬切产生残句,且与禁用词剔除顺序致二次超界不复检。截断按句界 + 剔除后复检长度。
#43(P2) :87 归属校验 catch 吞所有异常(含 DB 故障)统一伪装 403。区分 NotFound/Forbidden 与真实错误(后者应 500/原样抛)。
#83(P3) :39 死正则 /尽快回复/ 等;system prompt 承诺禁'急'但 guard 不剔除独立'急'。对齐 prompt 与 guard。
#84(P3) :1 导入 BadRequestException 但未使用 → 删除无效导入。
#113(P3) :115 感谢信缺面试细节仅 high→medium,不阻止/不洗白已编造的"我们讨论了X"。补:检测占位式编造内容并降级/标注。`,
  },
  {
    key: 'industry-trend',
    files: 'packages/api/src/industry-trend/industry-trend.service.ts, packages/api/src/industry-trend/dto/*.ts, packages/api/test/industry-trend.e2e-spec.ts',
    findings: `
#7(P1) :69 防编造 guard 只查 evidence_used 是否存在任一 http URL,不校验每条 growth/risk signal 的 source 对应到带 URL 的证据。改:每条 signal.source 必须能在带 http 的 evidence_used 中按 source 串/URL host 匹配,匹配不上则剔除该信号或降 confidence。
#8(P1) :81 成功路径无时效性/陈旧校验,signal.date 可多年前仍当"当前趋势"。对 signal.date 做陈旧校验(超 N 月剔除/降级),并在 trend_summary 末尾统一拼时效性免责。
#34/#75(P1/P2) :88 applyGuards 第二段 result.growth_signals.length 无 ?. 兜底,模型漏字段即 500。改 (result.growth_signals ?? []).length,并对 risk_signals/recommended_entry_roles 统一 ?? []。
#44(P2) :43 market_radar_used 完全由 LLM 自报、从不接真实 radar 且 guard 不纠正。服务端强制 market_radar_used=false(或据真实接入情况设定),不采信模型自报。
#45(P2) :88 Guard2 中 !hasWebSources 是死分支。清理逻辑使其真正可达/有意义。
#46(P2) :217 OUTPUT_SCHEMA demand_level 未列 required 但接口声明非可选。二选一:guard 对 demand_level 缺失兜底(推荐),或前端类型改可选(此项归前端,这里只在 guard 兜底)。
#85(P3) :174 industry/region/timeframe 直插 prompt 无约束。DTO 加 @MaxLength/@IsString 收口。`,
  },
  {
    key: 'interview-prep',
    files: 'packages/api/src/interview-prep/interview-prep.service.ts, packages/api/src/interview-prep/dto/*.ts, packages/api/test/interview-prep.e2e-spec.ts',
    findings: `
#9(P1) :241 薪资"有来源"判定正则含 \\d{4},任意≥4位数字(月薪/年薪)都被当有来源而保留编造薪资。移除 \\d{4},改为只接受显式来源标注或带"年"上下文年份,如 /来源|数据来源|截至|样本|samples|(19|20)\\d{2}\\s*年?/。e2e:453 同缺陷同步修。
#10/#78(P1/P2) :283-284 guardStar 对 story.result 调 extractNumbers 无 ?? '' 兜底(action 有,result 没有),模型漏 result 即 500。改 extractNumbers(story.result ?? '')。
#47(P2) :282 STAR 数字防编造只覆盖 result/action,situation/task 里杜撰量化数字不校验。把 situation/task 一并纳入数字来源校验。
#48(P2) :424 user_profile/experiences 等用户输入未隔离即拼入 prompt 且标"可信来源"。去掉"可信来源"标注或加注入隔离(分隔标记 + 明确"以下为用户自述,需甄别")。
#49(P2) :315 tech-coach 非技术岗判定为关键词黑名单,产品经理/数据分析仍放行做技术面;NON_TECH_KEYWORDS 含重复'行政'。去重 + 改为更稳健判定(白名单技术岗 或 扩黑名单含 产品/运营/数据分析/市场 等)。
#86(P3) :348 available_weeks<2 仅保留 critical,若无 critical 则 plan 空且无说明。空 plan 时补 cannot_determine/说明。
#87(P3) :207 单 service 815 行承载 4 子能力违背单一职责。【暂不强拆】仅在文件顶部加 TODO 注释标注后续拆分计划,避免本轮大重构引入风险。`,
  },
  {
    key: 'learning-roadmap',
    files: 'packages/api/src/learning-roadmap/learning-roadmap.service.ts, packages/api/src/learning-roadmap/dto/*.ts, packages/api/test/learning-roadmap.e2e-spec.ts',
    findings: `
#11/#79(P1) :105 sanitizeRoadmap 对 item.phases.map 无空值守卫,模型漏 phases 即 500。改 (item.phases ?? []).map,并对形状不符的 roadmap 项跳过或归 cannot_determine。
#12/#77(P1/P2) :138 resource_list 防编造仅靠 prompt 无服务端守卫,易输出杜撰 URL/课程名。新增 sanitizeResources:正则剔除/标注 description 与 quality_criteria 中的 http(s) URL;疑似具体课程名/书名标注"仅描述类型,不保证存在"。
#50(P2) :86 build() 直接展开 AI result 未校验 confidence/必填。补字段兜底(数组 ?? [],对象判空)。
#51(P2) :70 backlog 截断注释谎称 prompt 提示优先级,实际 prompt 未提。改注释为实情,或在 prompt 补充优先级说明使注释成立。
#88(P3) dto/build-roadmap.dto.ts:24 preferred_language 接受任意字符串,非 zh/en 静默回退英文,可能违反中文 only。限定枚举(@IsIn(['zh','en']))且默认 zh。
#89(P3) :156 resource_list/roadmap 无 minItems。在 guard 层对空清单给出 cannot_determine 说明(不强行 schema minItems 以免抬 503)。`,
  },
  {
    key: 'networking',
    files: 'packages/api/src/networking/networking.service.ts, packages/api/src/networking/dto/*.ts, packages/api/test/networking.e2e-spec.ts',
    findings: `
#13/#33(P1) :265 有人脉分支直接 for-of raw.referral_paths 无数组防御,漏字段即 500。归一化:const paths = Array.isArray(raw.referral_paths)?raw.referral_paths:[]; 并对 cold_outreach_targets/network_gaps/recommendations/risks/cannot_determine 统一 ?? []。
#14(P1) :234 无人脉分支只清空 referral_paths,未阻止 AI 在 cold_outreach_targets[].approach/target_profile_type 编造具体联系人/"内部有人"。加关键词体检(具体人名/"内部有人"/夸大保证)命中则剥离或降级。
#52(P2) :299 isColdContactRateInflated 只取区间首数字,'10-20%'等上界超限漏判。改为取区间上界判断。
#53(P2) dto/referral-strategy.dto.ts:8 target_companies 缺 @ArrayNotEmpty/@ArrayMinSize,空数组 join 空串。补 @ArrayNotEmpty + @IsString({each:true})。
#54(P2) :190 writeMessage 仅 insufficient 时清空 message_draft,low/medium 不校验是否真有共同背景即放行。补:无共同背景且声称有时降级/标注。
#90(P3) :66 MESSAGE_SCHEMA message_draft {type:'string'} 不可空,但 TS/运行时用 null,schema 与实现矛盾。统一:schema 不把 message_draft 列 required(或允许空串),与运行时一致。`,
  },
  {
    key: 'offer-comparator',
    files: 'packages/api/src/offer-comparator/offer-comparator.service.ts, packages/api/src/offer-comparator/dto/*.ts, packages/api/test/offer-comparator.e2e-spec.ts',
    findings: `
#15(P1) :82 所有薪资数字(年总包/试用期损失/时薪/加权分)全由 AI 生成,服务端从不复算。对可确定计算的字段服务端复算并覆盖模型值:annual_total_compensation=base_monthly×(months_per_year??12)+(annual_bonus??0);probation_loss=base_monthly×(1-probation_discount)×probation_months;hourly_rate_rmb=年总包/(weekly_hours×52)。模型只负责定性维度。
#16(P1) :113 Guard3 只在工时缺失时置 null 时薪,工时已知时直接采信模型时薪从不复算。工时已知分支也用服务端复算覆盖。
#17(P1) :95 guard 不校验模型输出 offer_id/company 是否在输入 offers 中,可幻觉额外行/张冠李戴。构建 validIds=new Set(输入 offer ids);过滤 comparison/weighted_scores/hourly_rate_comparison/missing_info 中非法 offer_id;company 用服务端 id→company 映射覆盖;校验 recommendation.preferred_offer_id ∈ validIds,否则降级/置空。
#35(P1) :95 confidence=insufficient 时只删 total_score,仍返回带 preferred_offer_id 的确定性推荐("编造赢家")。insufficient 时把 recommendation 收口为 {preferred_offer_id:'', rationale:'信息不足,无法给出可靠推荐', ...} 并记 cannot_determine/missing_info。
#55(P2) dto/compare-offers.dto.ts:14 OfferWeightsDto 各权重无 @Min/@Max 且不要求和为1。补 @Min(0)@Max(1);权重和≠1 时归一化或拒绝。
#56(P2) :100 低置信只删 total_score,保留 dimension_scores 与 comparison[].dimensions 精确数字。低置信时一并剥离精确分值。
#57(P2) dto/compare-offers.dto.ts:115 user_priorities 仅 @IsArray @IsOptional,元素无 @IsString。补 @IsString({each:true}) + @MaxLength。
#91(P3) :116 !inputHours 把 weekly_hours===0 误判未知;weekly_hours 无 @Min。用 != null 判断 + DTO @Min(1)。
#92(P3) :96 offer id 无唯一性校验,重复 id 覆盖。校验 id 唯一,重复则拒绝或去重并标注。`,
  },
  {
    key: 'salary-extras',
    files: 'packages/api/src/salary/city-industry-fit.service.ts, packages/api/src/salary/salary.service.ts, packages/api/src/salary/dto/city-industry-fit.dto.ts, packages/api/test/city-industry-fit.e2e-spec.ts, packages/api/test/salary.e2e-spec.ts',
    findings: `
注意:不要改 salary-analysis.service.ts(已修)。
#19(P1) city-industry-fit.service.ts:167 cost_of_living_impact.typical_salary_range 是无来源/无 grade/无 freshness 的自由文本薪资,与主通道平行的第二条编造通道。要么删该字段,要么施加与 salary-analysis 一致的"无来源即不输出数字"收口;industry_hub_analysis 的 cluster_effect/career_ceiling 同为无约束自由文本,至少在 prompt+guard 标注为粗略估算/要求引用 profile。
#59(P2) salary.service.ts:69 getStats()/findAll() 公开聚合含 self/peer 提交记录,小样本(count=1)可反推单个发布者精确薪资。对小样本(如 count<3)聚合做隐藏/打码或不返回精确值。
#93(P3) city-industry-fit.service.ts:55 stripCompanyNames 用长度<=6+纯中英字符启发式,误伤/漏判。收紧或改为更稳健的公司名识别。`,
  },
];

const FIX_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    module: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', properties: {
      finding: { type: 'string' }, file: { type: 'string' }, what: { type: 'string' }, done: { type: 'boolean' },
    }, required: ['finding', 'file', 'what', 'done'] } },
    tests_added_or_updated: { type: 'array', items: { type: 'string' } },
    deferred: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['module', 'changes', 'tests_added_or_updated', 'notes'],
};

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    module: { type: 'string' },
    verdict: { type: 'string', enum: ['PASS', 'PASS_WITH_RISKS', 'FAIL'] },
    issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] }, file: { type: 'string' }, line: { type: 'number' }, problem: { type: 'string' },
    }, required: ['severity', 'file', 'problem'] } },
    unfixed_findings: { type: 'array', items: { type: 'string' } },
  },
  required: ['module', 'verdict', 'issues', 'unfixed_findings'],
};

log(`后端修复:${MODULES.length} 模块并行(文件不相交)→ 逐模块复审`);

const results = await pipeline(
  MODULES,
  (m) => agent(
    `${STANDARDS}\n\n你负责模块【${m.key}】。范围文件:${m.files}\n\n需修复的 finding 清单:\n${m.findings}\n\n逐条修复并更新/新增测试,返回变更摘要。`,
    { label: `fix:${m.key}`, phase: '修复', schema: FIX_SUMMARY_SCHEMA, ...(m.model ? { model: m.model } : {}) },
  ).then((r) => ({ m, fix: r })),
  (prev) => {
    if (!prev) return null;
    const m = prev.m;
    return agent(
      `你是只读独立审查员(找茬思想)。模块【${m.key}】刚被修复,范围文件:${m.files}\n\n原 finding 清单:\n${m.findings}\n\n实现者自报摘要:\n${JSON.stringify(prev.fix, null, 2)}\n\n用 Read/Grep 核对真实代码:①每条 finding 是否真修好(给 file:line);②是否引入新缺陷/类型错误/drive-by 改动/编造载荷未抑制;③测试是否对应断言修复后行为。给 verdict 与未修项。`,
      { label: `review:${m.key}`, phase: '复审', schema: REVIEW_SCHEMA },
    ).then((rev) => ({ module: m.key, fix: prev.fix, review: rev }));
  },
);

const all = (results || []).filter(Boolean);
const fails = all.filter((r) => r.review && r.review.verdict === 'FAIL');
const risks = all.filter((r) => r.review && r.review.verdict === 'PASS_WITH_RISKS');
log(`后端修复完成:PASS ${all.length - fails.length - risks.length} / PASS_WITH_RISKS ${risks.length} / FAIL ${fails.length}`);

return {
  summary: {
    modules: all.length,
    pass: all.length - fails.length - risks.length,
    pass_with_risks: risks.length,
    fail: fails.length,
  },
  modules: all.map((r) => ({
    module: r.module,
    verdict: r.review?.verdict,
    deferred: r.fix?.deferred ?? [],
    unfixed: r.review?.unfixed_findings ?? [],
    issues: r.review?.issues ?? [],
    tests: r.fix?.tests_added_or_updated ?? [],
  })),
};
