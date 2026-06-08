export const meta = {
  name: 'saas-fix-residuals',
  description: 'SaaS 修复复审残留的 P2(防编造半成品 + 前端回归)',
  phases: [{ title: '修残留', detail: '6 个精确点修复(文件不相交)' }],
};

const ROOT = 'E:/Agent program/HRBP';
const STD = `仓库根:${ROOT}。NestJS+Next16.2.6,中文 SaaS。只改你点名的文件。严格类型无 any。中文 only。无 drive-by。
AiService.completeStructured 已做运行期 schema.required 校验+截断检测,故防漏字段用 service 内 (x ?? []) 兜底而非扩 schema.required。
防编造红线:guard 要"抑制编造载荷"非"只降元数据"。改完更新对应 e2e 回归断言。不要跑全局 tsc/build(协调者统一跑)。返回变更摘要。`;

const SCHEMA = {
  type: 'object',
  properties: {
    scope: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', properties: { what: { type: 'string' }, file: { type: 'string' }, done: { type: 'boolean' } }, required: ['what', 'done'] } },
    tests: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },
  },
  required: ['scope', 'changes', 'notes'],
};

const TASKS = [
  {
    key: 'interview-prep-regex', model: 'opus',
    files: 'packages/api/src/interview-prep/interview-prep.service.ts, packages/api/test/interview-prep.e2e-spec.ts',
    spec: `#9 残留泄漏(P2):薪资"有来源"判定正则 /来源|数据来源|截至|样本|samples|(19|20)\\d{2}\\s*年?/ 里的 (19|20)\\d{2} 会把任何含 19xx/20xx 子串的薪资数字误判为有来源——实测 '月薪 12000'(含2000)、'年包 120000'、'约 2050 元' 均 true,正是要拦的编造薪资被保留。
修复:彻底移除基于数字/年份的来源推断,改为仅显式来源标记才算有来源,例如 /来源|数据来源|数据|截至|样本|samples|平台|调研|报告|招聘网站|JD/。年份不再作为"有来源"信号(年份≠来源)。同步更新 e2e:新增 '月薪12000元无来源→salary_range_estimate 置 null'、'含"来源:BOSS直聘 2024"→保留' 两类断言。检查全文是否有第二处同款正则(如 line 453 附近)一并修。`,
  },
  {
    key: 'industry-trend-downgrade', model: 'opus',
    files: 'packages/api/src/industry-trend/industry-trend.service.ts, packages/api/test/industry-trend.e2e-spec.ts',
    spec: `#7/#8 残留(P2):happy-path(有 web 来源)末尾 return 在 growth/risk 信号被溯源/陈旧过滤后全部清空时,仍可返回 confidence:'high' + hiring_outlook:'growing' 却 growth_signals=[],自相矛盾。
修复:过滤后若 growthSignals.length===0 && riskSignals.length===0,则把 confidence 降到至多 'low'(若原为 high/medium)、hiring_outlook 置 'unknown',与 Guard1 一致;时效性免责声明改为仅在有保留信号时才拼接(空信号不要出现"以上信号…"措辞)。
另(P3)收紧 isSignalTraceable 的双向子串匹配:对过短 evidence.source(length<3)不走 sig.includes(evSource) 反向匹配,避免"网""报告"等命中放行编造信号。更新 e2e:新增"有 web 来源但所有信号被过滤→confidence<=low 且 hiring_outlook=unknown 且无'以上信号'措辞"用例。`,
  },
  {
    key: 'offer-comparator-recompute', model: 'opus',
    files: 'packages/api/src/offer-comparator/offer-comparator.service.ts, packages/api/test/offer-comparator.e2e-spec.ts',
    spec: `#15/#56 残留(P2):comparison[].dimensions 经 ...c.dimensions 透传(约 line 119),其中 effective_monthly 与 social_insurance_annual 两个 AI 精确数字:①低/insufficient 置信时未被剥离(与 stability_score/total_score 一样应剥);②social_insurance_annual 可由输入确定计算(social_insurance_monthly×12)却采信模型值不复算。
修复:①服务端复算 social_insurance_annual = social_insurance_monthly×12(输入可得时),以服务端值覆盖模型值;effective_monthly 若可由输入确定计算则同样复算覆盖,否则在低/insufficient 置信时连同其它精确分值一并剥离(置 null)。②确保低/insufficient 时 dimensions 中所有 AI 精确数字都被剥离,不只 total_score/stability_score。更新 e2e 断言覆盖"低置信→effective_monthly/social_insurance_annual 被剥离/复算"。`,
  },
  {
    key: 'city-industry-fit', model: 'opus',
    files: 'packages/api/src/salary/city-industry-fit.service.ts, packages/api/test/city-industry-fit.e2e-spec.ts',
    spec: `注意:勿改 salary-analysis.service.ts。
#19 残留(P2):housing_cost_note 与 purchasing_power_note(约 line 215-216)原样透传,含无来源的房价/薪资精确数字(如"租金约5k-10k/月,房价均价7-10万/平")——与主通道平行的无来源编造数字通道。修复:对这两个 note 施加与主薪资一致的收口——剥离/标注其中的精确金额,或在文本后统一追加"以上为粗略估算,非实时来源,仅供参考",并在 prompt 中要求其为定性描述而非精确数字。
#93 不连贯(P2):stripCompanyNames 现在只保留含 CATEGORY_MARKERS/数字的条目、剥离所有真实公司名,但 prompt/schema(约 line 483-487 "该城市目标行业的头部公司")仍要 AI 返回真实头部公司——自相矛盾(把要的东西全删了)。修复:二者对齐——把 prompt+schema 描述改为要求返回"公司类型/梯队描述(如'头部互联网大厂''本地龙头国企')"而非具体公司名,使 strip 与诉求一致;防编造意图(不杜撰具体公司名)得以贯彻。更新 e2e 相应断言。`,
  },
  {
    key: 'follow-up-regex', model: 'sonnet',
    files: 'packages/api/src/follow-up/follow-up.service.ts, packages/api/test/follow-up.e2e-spec.ts',
    spec: `#83 残留(P3但有破坏性):独立'急'正则 /(?<![焦紧着危緊])急(?![需切促迫忙])/ 误命中复合词 加急/应急/救急/心急/情急(lookbehind/lookahead 字符类不全),而 stripForbiddenSegments 会删除命中所在整句 → 删掉合法内容(如"我并不心急"被整句删)。
修复:补全 lookbehind/lookahead 字符类,使其只命中真正独立的催促"急"(把 加应救心情焦紧着危 等都纳入 lookbehind,把 需切促迫忙 等纳入 lookahead),或更稳妥地:对单字'急'不做整句删除,仅触发 confidence 降级 + risks 标注(与其它多字催促词保持"降级+标注"而非"裸删")。确保 加急/应急/救急/心急/情急 不被误删。更新 e2e:新增"含'加急'/'心急'的合法句子不被删除"、"独立催促'急'触发降级标注"用例。`,
  },
  {
    key: 'salary-frontend-regression', model: 'opus',
    files: 'packages/web/src/app/(main)/salary/page.tsx',
    spec: `新回归(P2,由 #31 单一数据源重构引入):MarketTable 的「全部」按钮 onClick 把父级 selectedRole 置为 ''(onRoleFilterChange('')),而 MarketBenchmark 在 selectedRole='' 时 MARKET_PERCENTILES[''] 为 undefined → if(!pcts) return null → 整个"市场薪资基准"卡片连同角色 tab 一起消失,用户无法恢复(tab 没了)。
修复:让 MarketBenchmark 在 !pcts(selectedRole='' 或未知)时不要整体 return null,而是仍渲染角色 tab + 一条"选择上方岗位查看薪资基准"的轻量占位提示,使用户可点 tab 回到具体岗位;仅把依赖 pcts 的分位数可视化部分条件渲染。保持单一数据源(父级 selectedRole)不回退到双状态。勿动 MARKET_PERCENTILES(:33 带免责的种子数据,合规)。`,
  },
];

log(`修残留:${TASKS.length} 个精确点并行`);
const results = await parallel(TASKS.map((t) => () =>
  agent(`${STD}\n\n范围:${t.files}\n\n${t.spec}`, { label: t.key, phase: '修残留', schema: SCHEMA, ...(t.model ? { model: t.model } : {}) })
    .then((r) => ({ key: t.key, r }))
));
const ok = results.filter(Boolean);
log(`残留修复完成:${ok.length}/${TASKS.length}`);
return { fixed: ok.map((x) => ({ key: x.key, changes: x.r?.changes ?? [], tests: x.r?.tests ?? [], notes: x.r?.notes ?? '' })) };
