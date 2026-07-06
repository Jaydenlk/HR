export const meta = {
  name: 't6-bocha-search',
  description: 'T6 博查统一搜索服务重设计——公司多候选消歧+落库缓存+防伪造(company-check破坏性API变更),侦察先行吸收代码漂移',
  phases: [
    { title: '侦察', detail: '核对设计文档+审计校准四条+实时代码坐标(节流现状/迁移时间戳/既有测试场景),产出精确执行清单' },
    { title: '实现', detail: '基于dev建feat/t6-bocha分支,按清单实现company-research模块+手写migration+mock改造+前端多候选UI+测试改造' },
    { title: '验证', detail: '测试代理与只读审计并行扇出' },
  ],
}

const DESIGN_DOC = 'docs/refactor2/T6-bocha-search.md'
const AUDIT_DOC = 'docs/refactor2/CODE-AUDIT-2026-07-02.md'
const TUNING_DOC = 'docs/part5-bocha-tuning-obscure-2026-06-26.md'
const MASTER_PLAN = 'docs/refactor2/00-master-plan.md'
const T5_DOC = 'docs/refactor2/T5-application-detail.md'

const AUDIT_CALIBRATION = `## 审计校准四条(${AUDIT_DOC} 原文,必须逐条落地,不得挑着做)
- M3(约L97,mock.service.ts:97,安全硬项):公司确认环节改为前端回传候选id/hash,后端按id查company_research表取真实候选内容拼prompt;禁止信任前端回传的name/summary/source_url原文。现状(改造前)confirmed_company_info四字段只有字符串/长度校验,create()/generateQuestions()把它直接当已核实来源写进防编造prompt,全程无反查——用户可绕过前端直接调API塞任意"来源可信"的公司简介进prompt。
- m6(约L257,mock.service.ts:98):checkCompany()把博查失败原因(reason: no_key/timeout/error)在服务层直接丢弃,只回search_candidate:null,前端永远无法区分"没搜到"与"搜索服务挂了/未配置key"。新结构要把reason(或等价判定)透传给前端,区分两种提示文案。
- m12(约L293,feed/company-registry.service.ts:47):公司名归一化在feed模块已有一套实现(CompanyRegistryService.matchCompany,trim+toLowerCase精确比对,被feed/mock/newspaper多处实际调用,不是孤儿代码)。T6要建的company_research归一化定位不同(服务模糊消歧+7天缓存,规则更复杂:去空格/全半角/大小写/常见后缀剥离),两者允许并存,但不许合并/不许起第三套等价逻辑替代CompanyRegistryService。
- m3(约L239,mock.controller.ts:39,与T4协同):company-check端点会触发真实计费的博查调用,当前只有共享的全局IP限流(120次/60s),没有专属节流;T6把count从5升到10且改两路查询后,单次调用成本翻倍,必须同步补一个与成本相称的专属节流。执行顺序是T4→T1→T6(见${MASTER_PLAN}),T4可能已经先落地这个节流——先用Grep核实mock.controller.ts的company-check端点当前是否已有@Throttle,已有就复用不重复加,没有就本任务补上。
- m5(时态校准,约L251,industry-bocha.service.ts:4):无论industry-trend/industry-bocha.service.ts此刻是否还存在(T1负责删除它),都与本任务无关,不必等它、也不用管它的状态,更不能碰它。`

const RED_LINES = `## 红线(超出即停,不许猜、不许绕过)
- 缓存命中判定只认"归一化名精确相等 且 retrieved_at距今≤7天";模糊/相似匹配永远只能产生候选,绝不能用于命中缓存——哪怕只是某个兜底分支里顺手加了模糊命中缓存的逻辑,都算违反红线。
- 候选全量保留:博查两路查询合并去重后的candidates数组,在到达前端之前的任何service层代码都不许截断(不许slice(0,N)/不许只取排序后前几条再返回)。"人工消歧展示top3-5候选"是前端展示层的呈现数量,不是后端返回数组的裁剪——去重(按source_url/域名去掉两路查询里的重复条目)不算截断,但去重之外不得再做任何精简。
- 模拟面试的人工确认环节永不只给一个候选可选(除"都不是→通用模式"这个兜底选项外)。即便消歧步骤②(GLM上下文匹配)判定某候选高置信度,也必须"取首位但仍走前端确认"——不允许任何分支跳过前端确认直接把某个候选当作已确认使用。
- 防伪造(M3安全硬项的具体化):前端确认阶段只能回传候选的数据库id;后端必须按该id重新查company_research表取真实display_name/summary/source_url等字段用于拼防编造prompt,绝不能信任同一请求体里前端夹带的任何原始name/summary/source_url文本字段(哪怕内容看起来和库里一致也不可信,客户端可任意构造)。这不是越权读取问题(company_research是公开数据、全局共享缓存,不需要按用户assertOwner),真正的风险是"客户端伪造文本注入防编造prompt",查库校验的目的是内容可信度而不是访问权限。
- company_research的归一化函数只服务本模块的搜索缓存,不吃并/不合并feed的CompanyRegistryService.matchCompany(packages/api/src/feed/company-registry.service.ts),不得起第三套等价逻辑替代它——两者允许并存。
- 不削弱buildCompanyContext里"仅限来源范围内、不得编造"这条防编造硬规则的表述强度,只能改参数来源(从前端文本→按id查库结果),不能改文案立场或删弱化任何一句"不得编造"的措辞。
- 不碰packages/api/src/industry-trend/(industry-bocha.service.ts等,是T1的删除范围,不论它此刻是否还存在,都不属于本任务)。
- 不碰ai.service.ts的流式部分、ConcurrencyLimiter(限流器核心)、diagnoses模块——这些是危险区,出过生产事故。
- 不做T5(投递详情页)的任何工作:company_research实体将来会被applications.company_research_id外键引用,本任务只需保证id是标准uuid主键,不需要现在建那个外键或做T5范围内的任何事。
- 迁移手写,禁用migration:generate(本机无真实Postgres,生成的diff不可信,依据deploy/README.md §2.1)。
- 任意JSON型字段(如设计文档里说的raw字段)一律用@Column('simple-json')(项目双库兼容惯例:e2e走better-sqlite3 in-memory+synchronize,生产走Postgres迁移;simple-json在两端都落为text列,不是字面jsonb类型)。参照packages/api/src/career/entities/career-analysis.entity.ts的result_json、packages/api/src/ops/entities/ops-event.entity.ts的detail字段——设计文档写"raw(jsonb)"是语义描述数据形态,不是要求写字面'jsonb'列类型;写死jsonb会在sqlite端触发DataTypeNotSupportedError。
- app.module.ts不需要为新模块新增任何import/注册(TypeORM autoLoadEntities=true,新实体只要被某个TypeOrmModule.forFeature()引用到即可被自动加载,新模块只要被MockModule import即可完成装配)——不要为此改动app.module.ts,那是范围外改动。
- 不做超出本清单的顺手重构;发现CompanyRegistryService或其他模块"看起来也能顺便改进",不做,那是别的任务的事。
- 只提交本任务涉及的文件,不夹带CLAUDE.md改动或工作区里其它任务留下的未跟踪/未提交内容(那些不是你的,不许stage、不许清理)。`

phase('侦察')
log('核对T6设计文档+审计校准四条+实时代码坐标,产出精确执行清单')
const RECON_PROMPT = `你是只读侦察代理,任务key=t6-bocha。仓库根 E:\\Agent program\\HRBP,基线分支dev(当前工作区分支可能不是dev,不用管,你只读不改)。

## 第一步:必读文档(全文)
1. ${DESIGN_DOC} —— 设计定稿全文(目标/病根/设计定稿1-5:统一服务/搜索与候选/消歧三层/落库与缓存/消费方/改动清单/审计校准/派工方案/step→verify/红线)。这是本任务唯一的设计依据,下面的摘要不能代替原文,原文与摘要冲突以原文为准。
2. ${AUDIT_DOC} 用下面命令定位五条原始条目,连同各自"核实"与"suggestion"段落一起读:
   grep -n "^### M3\\.\\|^### m6\\.\\|^### m12\\.\\|^### m3\\.\\|^### m5\\." ${AUDIT_DOC}
   再用 grep -n "^### T6(docs" -A 10 ${AUDIT_DOC} 看文档末尾对T6文档的官方校准清单(5条),确认${DESIGN_DOC}的"审计校准"节是否完整转述了这5条,如有遗漏细节写进清单。
3. ${TUNING_DOC} 的"推荐落地配方"节(BochaProvider级联,Step1用query=公司名+include="tianyancha.com,qcc.com"+summary:true+count:15的实测证据)——T6文档定稿用count=10、两路查询合并(不是调优文档的条件级联),字段配方(include域名/summary:true)以调优文档为准,是否发两路查询以及何时发以T6文档定稿为准,两者若有分歧在清单里写清楚你的判断依据。
4. ${MASTER_PLAN}:确认执行顺序T4→T1→T6(本任务排第3),"待用户输入的遗留项"与"用户已拍板的关键决策"两节里没有与本任务相关的悬而未决项(如果有,记入清单)。
5. ${T5_DOC} 开头"现状坐标"里提到"公司背景:此前不落库;T6已建company_research实体(本任务前置依赖)"——仅作为上下文了解,T5还没执行,不代表company_research现在就要支持它,只需确保id是标准uuid主键。

${AUDIT_CALIBRATION}

## 第二步:必读实时代码(逐一Read,不要只读摘要;以下路径与锚点是先前侦察的线索,行号可能已漂移,以你实测的内容为准;目标内容找不到就标[缺失-需人工])
- packages/api/src/mock/company-search.service.ts(整个文件,现状病根所在):fetchBocha()请求count=5;extractCandidate()(约L119-130)只取items[0],name/url任一为空即判"没搜到";search()的内存缓存按companyName字符串精确key、24h TTL、只缓存成功结果。这个文件整个要被新的company-research模块取代。
- packages/api/src/mock/company-search.service.spec.ts —— 逐条列出它的it()标题(现有覆盖场景),供实现代理对照迁移到新模块的单测里,不能丢场景。
- packages/api/src/mock/mock.service.ts:第8行import CompanySearchService;第27行interface ConfirmedCompanyInfo;第35行buildCompanyContext()函数(前端确认结果convert成prompt文案的地方);第73行注入companySearch;第87行checkCompany();第97行调用companySearch.search();第102行generateQuestions()(内部按lookup.company_known/confirmed两个分支组装antiHallucination文案,约L108-135);第137行buildCompanyContext调用点;第330行create()(内部lookup company→generateQuestions传入dto.confirmed_company_info,约L349-361)。这些都要随新数据流(id引用而非原始文本)改造,但antiHallucination三段文案的"不得编造"表述强度不能被削弱。
- packages/api/src/mock/mock.controller.ts:第37-40行GET 'company-check'端点(companyCheck方法),当前只有类级JwtAuthGuard,没有任何@Throttle;create/submitAnswer/complete三个端点上有CreditGuard+AiUsageInterceptor+CreditInterceptor的写法可作装饰器风格参照(但company-check本身不需要计费,只需要节流)。
- packages/api/src/mock/mock.module.ts:providers数组里的CompanySearchService、imports里的AiModule/QuotaModule/CreditModule/FeedModule/SpeechModule。
- packages/api/src/mock/dto/create-mock-session.dto.ts:ConfirmedCompanyInfoDto类(name/summary/source_url/searched_at四个字段校验)与CreateMockSessionDto.confirmed_company_info字段。
- packages/api/src/mock/dto/company-check-query.dto.ts:当前只有name字段;核实是否需要新增查询参数(如jd_text/role做上下文匹配用),没有明确需求就不改。
- packages/api/src/mock/mock.service.spec.ts:两个describe块——"MockService — confirmed_company_info prompt注入"(约L72-124,断言prompt含source_url/检索日期/防编造约束/公司简介)与"MockService — 无confirmed_company_info时不暴露搜索来源"(约L126-137)。这两块要随新数据流改造(mock掉按id查库返回的场景),但四条断言语义(来源标注/检索日期/防编造约束/纯通用模式不暴露来源)必须保留等价覆盖,不能删掉图省事。
- packages/api/src/feed/company-registry.service.ts:matchCompany()(约L44-51,trim+toLowerCase精确比对,查全部Company实体的name与aliases)——这是m12点名的既有归一化实现,本任务不许合并/替代它。
- packages/api/src/auth/auth.controller.ts:@Throttle({default:{limit:N,ttl:60000}})的用法范例(约L15/23/31,验证码/登录等端点),company-check补节流时参照这个装饰器写法与import来源(@nestjs/throttler)。
- packages/api/src/app.module.ts:ThrottlerModule.forRoot(约L46-49的全局限流配置,默认120次/60s)与APP_GUARD全局ThrottlerGuard注册(约L130-131)——确认全局限流现状,判断company-check现在是否已经被某个更早任务(T4)加过专属@Throttle。
- packages/api/src/database/migrations/ 目录:ls确认当前最大时间戳文件名(供后续迁移命名);Read packages/api/src/database/migrations/1781700000000-CreateFileMetadata.ts作为"纯新建表"迁移的写法范本(uuid主键gen_random_uuid()默认值、唯一索引、down()逆序drop);Read packages/api/src/career/entities/career-analysis.entity.ts或packages/api/src/ops/entities/ops-event.entity.ts确认simple-json字段在Postgres迁移里落地为text列(不是字面jsonb)的既有约定;Read packages/api/src/database/column-types.ts了解TIMESTAMP_COLUMN_TYPE的用途(可空时间列才需要,retrieved_at是否需要视你的nullable设计而定)。
- packages/api/jest.config.json 与 packages/api/test/jest-e2e.json —— 重要且容易踩坑:jest.config.json的testRegex是"\\\\.spec\\\\.ts$",只匹配*.spec.ts(单测),不匹配*.e2e-spec.ts;e2e测试(如mock-sessions.e2e-spec.ts)要用test/jest-e2e.json单独跑(等价于pnpm --filter @coach/api test:e2e)。清单与后续实现/验证阶段的跑测命令必须分成两条:unit用默认jest.config.json(裸npx jest --runInBand),e2e用--config ./test/jest-e2e.json --forceExit,不能只跑一条就号称"全量"。
- deploy/README.md 的"2.1 迁移命名约定"节:手写迁移的文件名/类名/时间戳规则,禁用migration:generate的理由。
- packages/api/src/ai/ai.service.ts:completeStructured()方法签名与用法(mock.service.ts里generateQuestions/evaluateAnswer已有两处调用范例可抄),GLM上下文匹配消歧要走这个方法,不直连供应商。
- packages/web/src/app/(main)/mock/page.tsx:第43-52行SearchCandidate/CompanyCheckResult接口定义;第108-113行checkResult/candidateConfirmed状态;第127-142行checkCompany()函数;第152-172行handleCreate()里payload.confirmed_company_info组装;第420-506行三态UI(态2确认框"是,就是这家"/"不是"两按钮、态3通用模式提示)。这些要整体改造成多候选点选交互。
- packages/web/e2e/mock-search-confirm.spec.ts、packages/web/e2e/mock-company-ui-states.spec.ts:这两个是真实调用博查的live Playwright(用"字节跳动"/"量子翻斗云科技"等真实公司名触发网络请求,断言company-check返回结构与确认框交互),字段名/交互方式改变后这两个文件的断言会失效,需要列出具体要改的test块。
- packages/api/test/ 下用git grep -n "company-check\\|confirmed_company_info\\|CompanySearchService\\|search_candidate" packages/api/test 确认还有没有其它e2e引用到这些即将改变的字段/服务(如mock-sessions.e2e-spec.ts、mock-voice-tts.e2e-spec.ts)。
- 全仓复核:git grep -n "CompanySearchService\\|SearchCandidate\\|search_candidate\\|confirmed_company_info\\|ConfirmedCompanyInfo\\|company-search.service" -- ':!docs' ':!career-skills-marketplace',与上面清单逐一比对,找出遗漏的命中文件补进清单并标注"[新发现]"。

## 第三步:产出「当前精确执行清单」(纯文本,分四段,每段内逐条列:文件路径 / 内容锚点(可grep的独特字符串,不要只给行号)/ 改法一句话 / 该条的verify方法)
### A. 新增
(packages/api/src/company-research/整个模块——module/service/bocha.client/entity/spec;手写migration一份;新增单测覆盖设计文档要求的5类场景:缓存精确命中/形似名不命中/7天过期/候选全量提取/无key降级)
### B. 同步修改(现有文件插入点)
(company-search.service.ts+其spec整体删除;mock.service.ts的checkCompany/generateQuestions/buildCompanyContext/create/ConfirmedCompanyInfo;mock.controller.ts节流;mock.module.ts装配;create-mock-session.dto.ts字段替换;page.tsx多候选UI与状态机)
### C. 测试改造
(mock.service.spec.ts两个describe块;两个live Playwright spec;packages/api/test/下如有其它引用的e2e)
### D. 红线与审计校准清单
把下面这两段原样抄录,再补上你侦察中发现的、文档未覆盖但会导致误执行的新增风险点(如果有):

${AUDIT_CALIBRATION}

${RED_LINES}

## 清单最前面必须先回答这四个判定问题
1. company-check端点当前有没有专属节流(@Throttle)?有→贴出装饰器现状;没有→记录"本任务需补"。
2. 下一条迁移应该用的时间戳数字是多少(必须大于packages/api/src/database/migrations/目录当前实际存在的最大时间戳,现查不许套用任何写死的数字)?
3. company-search.service.spec.ts里有几个it()场景需要被新模块的单测覆盖?逐条列出标题。
4. packages/api/src/industry-trend/industry-bocha.service.ts当前是否还存在?(仅记录事实,不代表本任务要对它做任何操作)

## 规则
- 文档里点名的坐标(行号)当线索不当圣旨,一切以你刚才Read到的实时内容为准;目标内容不存在的条目标注[缺失-需人工],不许猜着往下走。
- 只产出清单文本作为你的最终回复,不要写任何文件,不要执行任何写操作。`

const checklist = await agent(RECON_PROMPT, { label: 'recon:t6-bocha', phase: '侦察', model: 'sonnet' })
if (!checklist) throw new Error('侦察代理未返回,中止后续实现')
log('侦察完成,进入实现阶段')

phase('实现')
log('按侦察清单在feat/t6-bocha分支实现company-research模块+手写migration+mock改造+前端多候选UI')
const IMPL_PROMPT = `你是实现代理,执行「T6博查统一搜索服务重设计」建造任务,任务key=t6-bocha。设计文档:${DESIGN_DOC}(全文,含审计校准节与红线节,必读)。

## 操作规程
- 仓库 E:\\Agent program\\HRBP。先git status摸底:已跟踪文件里**文档类改动(docs/、CLAUDE.md、.claude/下)与未跟踪杂物不是你的**,不许stage、不许清理,如实记录后继续即可,不算脏;**packages/等代码文件存在未提交改动才是异常——立即停止如实报告,不许自己checkout/stash/清理**。
- 分支判定:git branch --list feat/t6-bocha。①已存在且git log显示有本任务提交(company-research/bocha相关,含"wip("前缀抢救性提交)→切过去续跑(按下方增量提交铁律的续跑判定走);②不存在→基于dev创建并切换(就在主工作区做,不建独立worktree);③存在但提交明显是别的任务→停止报告。

## 增量提交铁律(防配额中断全损;2026-07-03实证教训:另一任务曾三次单窗烧尽300k+token且零提交,全部白干)
- 开工先看git log --oneline dev..HEAD:本分支已有本任务提交→你是续跑,先git diff dev...HEAD --stat对照执行清单做缺口分析,只做未完成部分,不许重做已完成的、不许revert半成品重来。
- 每完成执行清单一个条目(或一组强耦合条目,如"实体+migration"一组)立即git add涉及文件(逐路径,不用-A)并commit(message可用"wip(t6-bocha): <条目>",最后不必整理历史)。不许攒到最后一次性提交——配额中断时,已提交的就是断点,没提交的就是白干。
- 最终全量自验仍按「自验」节统一做;自验后的修补也要及时commit。
- 严格按下面"侦察产出的执行清单"逐条执行,范围外一行不改;每改一处先Read确认内容与清单描述一致再动手。
- 清单里标[缺失-需人工]的条目,或执行中发现目标内容与清单描述不符(比如所指代码段已经不存在、或和红线冲突),停在该条,如实报告,不许猜、不许硬着头皮绕过。

## 设计定稿(来自${DESIGN_DOC},照此实现,不许自行加戏)
1. 新建packages/api/src/company-research/模块:bocha.client.ts(唯一博查低层客户端,8s超时+AbortController,无key/超时/非2xx归一化为{available:false,reason},不抛500,保留company-search.service.ts现有的容错语义)+ company-research.service.ts(业务层:搜索→候选→消歧→缓存)。mock模块改注入本服务;company-search.service.ts整体删除。
2. 搜索:count=10;两路查询合并——通用查询(不带include)+ include="tianyancha.com,qcc.com"强召回查询,两路结果按source_url/域名去重合并,候选全量保留提取为SearchCandidate[](name/summary/source_url/domain),不再像现状那样只取items[0]。
3. 消歧三层,顺序执行命中即止:①精确命中——归一化(去空格/全半角/大小写/常见后缀"有限公司/科技/集团"剥离比对,但展示原名)后与输入完全相等的唯一候选→直接确认,但仍走前端确认框。②上下文匹配——多候选时把候选列表+可用上下文(该场景下能拿到的jd_text等)交给GLM(经AiService.completeStructured,参照mock.service.ts现有generateQuestions/evaluateAnswer的调用范式)打分排序,高置信(如≥0.85且第1/2名分差明显,具体阈值你可以酌定并说明理由)→取首位但仍走前端确认;如果当前调用点缺少足够上下文(比如还没有jd_text),直接进入第③层是合理降级,不算功能缺失。③人工消歧——置信不足时,前端展示top3-5候选(名称+简介+来源域名)供点选,附"都不是→通用模式"。模拟面试永不只给一个结果(除都不是兜底外)。
4. 落库与缓存:新实体company_research:id(uuid主键)/canonical_name(归一化名,唯一索引)/display_name/summary/source_url/source_domain/retrieved_at/raw(用simple-json,不要写字面jsonb类型,见下方红线)。缓存命中条件=归一化名精确相等且retrieved_at距今≤7天;缓存命中时mock流程仍走前端确认(展示缓存候选,用户可拒绝触发新搜索)。候选返回给前端前应当已经/立即被落库为company_research行(upsert by canonical_name,取得真实数据库id),这样前端确认阶段回传的id才有真实数据可查——不能只在最终确认后才落库,否则用户点选阶段拿不到可验证的id。
5. 消费方:mock的checkCompany()返回候选数组(破坏性API变更,前端同步改多候选UI);确认后拼prompt的buildCompanyContext()防编造规则保留不动(措辞强度不能削弱,只改数据来源)。GLM上下文匹配走AiService,不直连博查以外的任何供应商。

${AUDIT_CALIBRATION}

${RED_LINES}

## 实现顺序建议(不强制,但有依赖关系)
①先落company_research实体+手写migration ②company-research模块(client+service+单测,覆盖设计文档要求的5类场景:缓存精确命中/形似名不命中/7天过期/候选全量提取/无key降级)③mock.controller.ts补节流(先核实是否T4已加,清单开头已有判定)④mock.service.ts+DTO+module改造(id引用而非原始文本)⑤既有测试同步改造(mock.service.spec.ts两个describe块、company-search.service.spec.ts场景迁移后删除该文件)⑥前端page.tsx多候选UI ⑦两个live Playwright spec同步改造 ⑧全部完成后统一自验。

## 自验(全部完成后做,附原始输出到最终回复,不许只说"通过"两个字)
1. 残留扫描:git grep -n "CompanySearchService\\|company-search.service\\|ConfirmedCompanyInfo" -- ':!docs' 应为空(如有历史注释合理提及需逐条说明为何合法);另外人工审查company-research.service.ts里合并候选的代码,确认没有slice/splice/取前N条之类的截断逻辑。
2. cd packages/api && npx tsc --noEmit(编译探针,不冒充测试)。
3. 跑测命令必须分两条,不能只跑一条就号称"全量"(packages/api/jest.config.json的testRegex只匹配"*.spec.ts",不匹配"*.e2e-spec.ts";裸npx jest会把所有.e2e-spec.ts文件安静跳过——0匹配、不报错也不报"跳过",那样"全部通过"是假通过):
   a) cd packages/api && npx jest --runInBand(单测全量;附原始输出,确认company-research.service.spec.ts覆盖了侦察清单确认的5类场景,且company-search.service.spec.ts原有场景已等价迁移不丢)。
   b) cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit(e2e全量,必须用这个--config参数;含mock-sessions.e2e-spec.ts等被本任务改造的用例,附原始输出)。
4. cd packages/web && npx eslint src/(0错误)。
5. 只提交本任务涉及的文件:git add逐路径(不要用git add -A/.),git commit -m "feat(mock): 博查统一搜索服务重设计——多候选消歧+落库缓存+防伪造(company-check破坏性API变更)"。

## 最终回复格式
交付报告:清单逐条DONE/SKIP(附原因,SKIP必须说清是[缺失]还是红线冲突还是别的)、审计校准四条逐条DONE/SKIP、节流处理方式(复用T4已有 或 本任务新加+理由)、残留扫描原始输出、tsc输出、两条jest(单测+e2e)的关键原始输出、eslint输出、commit hash、git diff --stat dev...feat/t6-bocha。遇到清单与现实不符或红线冲突立即停在该条,报告不猜。

## 侦察产出的执行清单(照此逐条做)
${checklist}`

const impl = await agent(IMPL_PROMPT, { label: 'impl:t6-bocha', phase: '实现', model: 'sonnet' })
if (!impl) throw new Error('实现代理未返回,中止后续验证')

phase('验证')
log('质量门与只读审计并行扇出')
const GATE = {
  type: 'object', required: ['gates', 'overall_pass'],
  properties: {
    gates: { type: 'array', items: { type: 'object', required: ['name', 'pass', 'evidence'], properties: {
      name: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string', description: '原始输出关键段,失败时含完整错误' } } } },
    overall_pass: { type: 'boolean' },
    notes: { type: 'string' },
  },
}
const REVIEW = {
  type: 'object', required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    findings: { type: 'array', items: { type: 'object', required: ['severity', 'file', 'issue'], properties: {
      severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, file: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } } } },
  },
}

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,切到分支feat/t6-bocha(实现代理刚提交完毕,先git log -1确认在该分支最新提交上)。逐门跑质量门,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事):
1) cd packages/api && npx jest --runInBand —— 单测全量必须绿(含company-research新单测、mock.service.spec.ts改造后的用例)。注意:packages/api/jest.config.json的testRegex只匹配"*.spec.ts"结尾,不匹配"*.e2e-spec.ts",这条命令覆盖不到任何e2e测试,只是第一条不是全部。必须从packages/api目录跑,从仓库根跑会走babel-jest报TS语法错,那是环境坑不是代码错。
2) cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit —— e2e全量必须绿(含mock-sessions.e2e-spec.ts等被本任务改造的用例;等价于docs/AGENT-HANDBOOK.md记录的基线跑法pnpm --filter @coach/api test:e2e)。陷阱提醒(已实测确认,不是猜测):不许用裸的npx jest代替这一步——".e2e-spec.ts"结尾的文件会被裸npx jest安静地跳过(0匹配,不报错、不报"跳过",只是列表里根本没有这些文件),那样跑出来"全部通过"是假通过。必须用这个--config参数,且必须从packages/api目录跑。
3) cd packages/api && npx jest company-research --verbose —— 单独核对:缓存精确命中/形似名不命中/7天过期/候选全量提取/无key降级五类场景是否都有对应it块且通过。
4) cd packages/api && npm run build(或等价nest build)。
5) cd packages/web && npx eslint src/ —— 0错误。
6) cd packages/web && npm run build —— 通过。
7) Playwright(硬门,计入overall_pass——本任务把mock页改成多候选交互,这是运行时行为,前面几门测不出来;"环境起不来"不算过,起不来如实FAIL并写清卡点,那是环境问题按STOP处置,不许标SKIPPED混过):
   a) 前置:本机数据库Docker容器coach-postgres须在跑;cd packages/api && pnpm migration:run(把company_research新迁移应用到本机dev库,本机库无真实用户数据可直接跑);本机packages/api/.env已有DEV_LOGIN=1与博查key,不需要额外配置。
   b) 起服务(验收用build+start,不用dev模式;第4/6门已产出build产物直接复用):一个终端 cd packages/api && npm run start(3002);另一个终端 cd packages/web && npx next start --port 3001(不要裸npm run start,web的start脚本默认监听3000,和playwright.config.ts的baseURL http://localhost:3001对不上)。若3001/3002被主dev服务占用,先确认冲突再决定停掉或换端口(换端口要同步改.env.local的NEXT_PUBLIC_API_URL与baseURL)。
   c) cd packages/web && npx playwright test e2e/mock-search-confirm.spec.ts e2e/mock-company-ui-states.spec.ts —— 这两个是真实调用博查的live用例,已被本任务适配多候选交互,必须真跑真过;若博查搜索因网络/配额偶发失败,重试一次仍失败则如实FAIL附错误原文。
8) 残留复扫:git grep -n "CompanySearchService\\|company-search.service\\|ConfirmedCompanyInfo" -- ':!docs' 应为空;git grep -n "mock-sessions/company-check" 核对现存端点仍能正常路由,字段名与前端一致。
9) 红线抽查:git diff dev...feat/t6-bocha -- packages/api/src/feed/ 应为空(未碰CompanyRegistryService);git diff dev...feat/t6-bocha -- packages/api/src/industry-trend/ 应为空(未碰T1范围);git diff dev...feat/t6-bocha -- packages/api/src/ai/ai.service.ts packages/api/src/ai/concurrency-limiter.ts packages/api/src/diagnoses/ 应为空(未碰危险区);检查新migration文件里raw等JSON字段用的是@Column('simple-json')而非字面jsonb类型声明,且没有对salary_entries等无关表的DROP动作。
不改任何代码;测试挂了如实报FAIL附错误,不许自己修。实现背景:博查统一搜索服务重设计,company-check端点破坏性API变更(候选数组+id确认),新增company_research表与手写migration,mock模块的company-search.service.ts已被删除替换。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP,先读${DESIGN_DOC}全文(设计定稿+审计校准+红线)建立标准,再审计分支feat/t6-bocha相对dev的完整diff(git diff dev...feat/t6-bocha)。

${AUDIT_CALIBRATION}

${RED_LINES}

## 找茬重点(每条发现附file:line)
① 范围外改动——diff里任何不在设计文档范围内的文件/行,尤其检查有没有碰industry-trend/、feed/company-registry.service.ts、ai.service.ts流式部分、concurrency-limiter.ts、diagnoses/、app.module.ts(新模块不该需要改它)。
② 设计定稿1-5节逐条对diff打勾:company-research模块是否真的建了且company-search.service.ts已删除;搜索是否真的count=10+两路查询合并;候选提取是否全量无截断;消歧三层是否都实现且"高置信仍走前端确认"没有被跳过;缓存实体字段是否齐全、canonical_name唯一索引是否真的建了。
③ 防伪造是否真正生效(M3,blocking级)——必须能在diff里找到"前端只传候选id→后端按id查company_research表取真实字段拼prompt"的具体代码证据,而不能只是把字段名从confirmed_company_info改成新名字但内部逻辑仍然读了请求体里的原始name/summary/source_url文本字段。
④ 缓存精确匹配红线(blocking级)——canonical_name是否真的建了唯一索引;有没有代码路径用模糊/相似匹配去命中缓存(哪怕只是某个兜底分支)。
⑤ 候选截断复发——company-research.service.ts里合并/提取候选的代码搜索slice/splice/前N条之类逻辑,确认候选数组在到达前端之前没有被人为砍到3-5条(那应该只是前端展示层的呈现行为,不是后端返回的数组本身)。
⑥ 模拟面试单候选风险(blocking级)——是否有分支在候选数为1(尤其是"精确命中"分支)时跳过前端确认直接把该公司信息当已确认使用。
⑦ migration正确性——raw等JSON字段是否用了字面jsonb类型(会导致sqlite端e2e报DataTypeNotSupportedError)而不是项目约定的simple-json;canonical_name唯一索引、down()回滚是否完整;是否使用了migration:generate的产物而非手写;时间戳是否确实大于此前已存在的最大值;有没有误碰其它表结构。
⑧ 节流(m3)——company-check端点是否补了与两倍博查成本相称的专属节流;如果发现T4已经加过,复用未重复加是合理的不算问题;如果两边都没有任何节流才是问题。
⑨ 既有测试断言语义是否被削弱——mock.service.spec.ts里"来源标注/检索日期/防编造约束/纯通用模式不暴露来源"四条语义是否都还有等价覆盖,而不是被删掉图省事;company-search.service.spec.ts原有场景是否等价迁移到新模块单测,而不是直接删文件不接续覆盖。
⑩ 两个live Playwright(mock-search-confirm.spec.ts/mock-company-ui-states.spec.ts)是否被简单删除测试用例来"让门禁变绿",而不是真正适配新的多候选交互;三态语义(库内命中无感知/库外多候选/通用模式)是否保留。
⑪ 归一化边界(m12)——company-research模块的归一化实现是否误合并/复用/替代了CompanyRegistryService.matchCompany,两者应当各自独立存在。

## 侦察产出的执行清单(供你核对diff是否逐条落实)
${checklist}`

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t6-bocha', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t6-bocha', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
