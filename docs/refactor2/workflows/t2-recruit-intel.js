export const meta = {
  name: 't2-recruit-intel',
  description: '月刊校招情报摄入流水线(三类源适配器 sheet_file/sheet_link/wechat_dump + GLM结构化解析 + 去重 + 周更cron + newspaper呈现),含审计校准(摘C端计费/权限门UI/digest生成器接活/投稿删除入口),侦察先行吸收feed模块代码漂移',
  phases: [
    { title: '侦察', detail: '摸清feed模块现有source类型/抓取调度/runs机制/AI解析范式,产出当前精确执行清单' },
    { title: '实现', detail: '基于dev建feat/t2-intel分支,照清单逐条实现三适配器+recruit_events+GLM解析+去重+周cron+前后端呈现+四条审计校准' },
    { title: '验证', detail: '测试代理与只读审计并行' },
  ],
}

const DESIGN_DOC = 'docs/refactor2/T2-recruit-intel.md'
const MASTER_PLAN = 'docs/refactor2/00-master-plan.md'
const AUDIT_DOC = 'docs/refactor2/CODE-AUDIT-2026-07-02.md'

const RED_LINES = `## 红线(超出即停,不许猜、不许绕过)
- 缺失字段一律 null,禁止 AI 或代码推断/补全日期与链接;来源链接必须原样保留可跳转,不得规范化/裁剪导致失效。
- 不做反爬对抗:不引入无头浏览器绕登录、验证码破解、请求签名逆向等手段;sheet_link(腾讯文档/飞书链接)抓不到就在管理页明确提示"请导出 CSV 上传"降级到 sheet_file,到此为止,这是正解不是妥协。
- wechat_dump 适配器按"通用文本/json 摄入"实现,不假设/不猜测任何专有字段结构;具体现成爬取工具的仓库名与产物格式待用户提供——这条遗留已经记在 ${MASTER_PLAN}「待用户输入的遗留项」第 1 条,不许重复添加新条目;若发现该行文字与你的实现口径不一致可原地小改一行使其准确,不许删除整条或大改结构。
- 新增的三个 source kind(建议 sheet_file / sheet_link / wechat_dump)不得与已存在的 'wechat' kind(现有 We-MP-RSS API 拉取式导入器,packages/api/src/feed/importers/wechat-importer.service.ts)混用或覆盖——那是另一条已工作的通道,本任务不许改动它的行为。
- 不做 T3(职业维基)侧消费:只保证 recruit_events 表结构含 role_hint 字段供未来聚合,不建其余关联、不写维基侧读取代码。
- 不顺手改动:industry-trend/learning-roadmap 页面与路由(T1 范围)、限流器/watchdog/AI 并发控制核心逻辑(T4 范围)、company-research 归一化服务(T6 范围)。
- 若发现 GET /feed/sources、GET /feed/runs 仍缺 AdminGuard(设计文档假设 T4 已先行补上,但实际执行顺序可能未完全同步):允许你补一个最小化的 AdminGuard 补丁让 M8 前端门有意义,但不许借机做 T4 的其余审计项;必须在交付报告里明确注明"补了 T4 遗留缺口:xxx"。
- 不做"摘 C 端计费"之外的计费改动:CreditGuard/CreditInterceptor 只摘 feed/import、feed/digest 这两个既有端点,以及本任务新增的全部源管理/上传/解析端点(它们本来就不该挂);AiUsageInterceptor(用量/失败观测,不是计费)不在摘除范围内,不许连它一起删。
- 不改 docs/ 下其它任何 md 文件(除上面明确允许的 00-master-plan.md 遗留项第 1 条原地小改);不碰本工作区里非本任务产生的未跟踪/未提交内容(如仓库当前可能存在的其它任务残留改动,不是你的,不许 stage、不许清理、不许 commit)。
- salary 相关任何文件不属于本任务范围,禁止触碰(另有独立任务在处理)。`

phase('侦察')
log('侦察 feed 模块现状与设计文档,产出精确执行清单')
const RECON_PROMPT = `你是只读侦察代理,任务 key=t2-recruit-intel。仓库根 E:\\Agent program\\HRBP,基线分支 dev(当前工作区分支可能不是 dev,不用管,你只读不改)。

## 第一步:必读文档(全文)
1. ${DESIGN_DOC} —— 设计定稿全文(源接入三类适配器/GLM解析/周更调度/呈现/与T3协同/派工方案/step→verify)+ 审计校准节(M7/M8/M9/m23)+ 红线节。这是本任务唯一的设计依据。
2. ${MASTER_PLAN} —— 重点看「待用户输入的遗留项」第 1 条(公众号爬取工具格式待用户提供)与「用户已拍板的关键决策」里"校招情报"那一条(周更;源=购买的在线表格+公众号现成爬取工具产物;解析用平台自有GLM5.1)。
3. ${AUDIT_DOC} —— 用 grep -n "^### M7\\.\\|^### M8\\.\\|^### M9\\.\\|^### m23\\." 定位这四条原文,连同各自"核实"与"suggestion"段落一起读,确认设计文档的「审计校准」节是否完整转述了这四条(如有遗漏细节,写进清单)。

## 第二步:必读实时代码(以下逐一 Read,不要只 grep 摘要)
- packages/api/src/feed/types/feed.types.ts —— FEED_SOURCE_KINDS 现有枚举值、EXTERNAL_SOURCE_KINDS、FEED_CATEGORIES。
- packages/api/src/feed/entities/feed-source.entity.ts —— FeedSource 字段结构(kind 是 varchar 无 DB CHECK 约束,新增 kind 字符串值本身不需要额外 migration,但要确认这个判断在当前代码仍成立)。
- packages/api/src/feed/importers/feed-importer.interface.ts —— FeedImporter 接口与 FeedCandidate 形状,新增适配器要实现这个接口。
- packages/api/src/feed/importers/wechat-importer.service.ts —— 现有 'wechat' kind 的实现(We-MP-RSS API 拉取式,含 login+fetch),确认它与设计文档提出的新 'wechat_dump'(上传现成爬取工具产物文件)是两回事,不得混淆或复用同一个 kind 字符串。
- packages/api/src/feed/importers/rss-importer.service.ts、xhs-importer.service.ts —— 另外两个现有导入器实现,作为新适配器代码风格参考。
- packages/api/src/feed/feed-ingestion.service.ts —— importerFor() 的 kind 分支写法、@Cron('0 0 3 * * *', { name: 'digest-daily-ingestion' }) 现有调度机制、import()/importSource() 的抓取→去重(existsExternal)→分类→保存流程、DigestRun 记录方式。新的周更 cron 要挂在同一套机制上,不要另起一个独立的调度框架。
- packages/api/src/feed/source-registry.service.ts —— FeedSource 的 CRUD 与 ensureDefaults() 种子逻辑(data/sources/digest_sources.json),确认新 kind 是否需要种子或完全由管理员在 UI 上新建。
- packages/api/src/feed/feed-classifier.service.ts —— AiService.complete() 的调用范式(system/prompt/maxTokens)+ JSON parse/normalize 时"缺字段返回 null、不合法就 BadRequestException"的防编造写法。GLM 结构化解析 recruit_events 要照抄这个范式的结构(system prompt 铁律 + JSON 输出 + 逐字段 normalize 校验),不得另起一套风格迥异的实现。
- packages/api/src/feed/feed.controller.ts —— 当前 @Post('import') 与 @Post('digest') 上挂的 @UseGuards(AdminGuard, CreditGuard) + @UseInterceptors(AiUsageInterceptor, CreditInterceptor);GET 'sources'/GET 'runs' 当前只有类级 JwtAuthGuard、没有 AdminGuard(这是 M8/M14 指出的缺口,确认是否已被 T4 修复——若 dev 分支上仍未修复,清单里要写清楚由本任务补一个最小 AdminGuard)。
- packages/api/src/feed/feed.module.ts —— providers/controllers/imports 注册方式,新增的 service/importer/controller 要按此风格注册。
- packages/api/src/feed/digest-generator.service.ts —— generateWeeklyDigest() 现状(汇总近7天 FeedItem,AI 生成周刊正文,存回 FeedItem)。设计文档已经拍板"接入周更流程,把当期新增 recruit_events 纳入汇总段落"(不是删除二选一,设计文档已定案),清单要写清楚具体怎么接(prompt 里加一段 recruit_events 摘要、还是新增字段)。
- packages/api/src/feed/newspaper.service.ts + newspaper.controller.ts —— NewspaperEdition 现有返回结构、GET /newspaper 端点,评估新增"校招情报"板块是扩展 NewspaperEdition 字段还是新增端点,选侵入最小者。
- packages/api/src/feed/entities/feed-item.entity.ts —— 实体写法风格(TIMESTAMP_COLUMN_TYPE、simple-json 等约定),recruit_events 新实体照此风格写。
- packages/web/src/app/(main)/digest/page.tsx —— 现有供给管理页结构(1181行,导入按钮位置约312-320行、来源状态区、SOURCE_KIND_LABELS 等常量),M8 要求对非 admin 隐藏导入按钮与来源状态区,新增三类源管理 UI 也只对 admin 可见;confirm 投稿面经条目当前是否已有删除按钮(m23 要求补上,后端 DELETE /feed/:id 已有归属校验)。
- packages/web/src/app/(main)/newspaper/page.tsx —— 现有读者页渲染结构,评估新增"校招情报"常驻板块的插入位置。
- packages/web/src/app/(main)/admin/page.tsx —— 只看权限门写法(约 L66 if (!me || me.role !== 'admin')),作为 /digest 页补权限门的参照范式,不改这个文件。
- packages/api/package.json —— grep 确认是否已有 csv/xlsx 解析依赖(截至设计时侦察结论是没有);没有的话清单里要列"新增依赖"一条,写清楚建议包名与理由(体量小、维护活跃、纯 JS 无原生编译依赖优先)。
- packages/api/src/database/migrations/ 目录下最近 3-5 个文件 —— 手写 migration 的命名规则(时间戳前缀+PascalCase类名)与写法;并确认 CLAUDE.md 铁律"sqlite dev/test 走 synchronize 不跑迁移,只有生产 Postgres 需要"在当前代码里依然成立(看是否有类似 ReconfigureGlmPrimary 迁移文件里的说明注释)。
- packages/api/test/feed.e2e-spec.ts、feed-ingestion-stability.e2e-spec.ts、feed-classifier.service.spec.ts —— 现有测试写法与断言风格,新测试要接续这个规范。
- packages/api/test/credit.e2e-spec.ts、credit-dual-track.e2e-spec.ts —— grep "feed/import\\|feed/digest" 确认这两个受测端点是否被用作"CreditGuard 生效"的测试样例;若是,摘掉 CreditGuard 后这些测试要同步改造(换一个仍挂 CreditGuard 的端点),清单里要写清楚。
- packages/api/jest.config.json 与 packages/api/test/jest-e2e.json —— **重要且容易踩坑**:jest.config.json 的 testRegex 是 "\\\\.spec\\\\.ts$",只匹配 *.spec.ts(单测),不匹配 *.e2e-spec.ts;e2e 测试要用 test/jest-e2e.json 单独跑(等价于 npm run test:e2e)。清单与后续验证阶段的跑测命令必须分成两条:unit 用默认 jest.config.json,e2e 用 --config ./test/jest-e2e.json,不能只跑一条就号称"全量"。

## 第三步:产出「当前精确执行清单」(纯文本,以下四段,每段内逐条列:文件路径 / 内容锚点(可 grep 的独特字符串,不要只给行号) / 改法一句话 / 该条的 verify 方法)
### A. 新增
（recruit_events 实体+手写migration、sheet_file/sheet_link/wechat_dump 三个适配器文件、GLM 解析 service、去重逻辑、周更 cron 注册点、依赖新增、newspaper 板块前后端、/digest 供给页三类源管理 UI、面经删除按钮、测试夹具目录 packages/api/test/fixtures/ 及三份样例文件、新增测试文件清单）
### B. 同步修改(现有文件插入点)
（feed.types.ts 扩枚举、feed.module.ts 注册新 provider、feed.controller.ts 摘 CreditGuard+加/补 AdminGuard、feed-ingestion.service.ts 挂周cron、digest-generator.service.ts 接入 recruit_events 汇总、newspaper.service.ts/controller.ts 扩展返回、digest/newspaper 前端页面改动点)
### C. 测试新增/改造
（单测:CSV解析含脏行/去重键冲突合并/GLM输出schema校验拒绝不合格/事件过期过滤;e2e:上传CSV→入库→newspaper返回、缺字段防编造断言;credit e2e 若引用 feed/import 需要的换端点方案)
### D. 红线清单
将下方"必须写入清单的红线"原样抄录,再补上你侦察中发现的、文档未覆盖但会导致误执行的新增风险点(如果有)。

必须写入清单的红线:
${RED_LINES}

## 规则
- 文档里点名的坐标(行号)当线索不当圣旨,一切以你刚才 Read 到的实时内容为准;目标内容不存在的条目标注 [缺失-需人工]，不许猜着往下走。
- 若发现依赖未满足(如 T4 尚未给 GET /feed/sources、/feed/runs 补 AdminGuard),标注 [依赖未满足] 并给出实现代理应如何最小化补齐的建议。
- 只产出清单文本作为你的最终回复,不要写任何文件,不要执行任何写操作。`

const checklist = await agent(RECON_PROMPT, { label: 'recon:t2-recruit-intel', phase: '侦察', model: 'sonnet' })
if (!checklist) throw new Error('侦察代理未返回,中止后续实现')

phase('实现')
log('按侦察清单在 feat/t2-intel 分支实现三适配器+GLM解析+去重+周cron+呈现+四条审计校准')
const IMPL_PROMPT = `你是实现代理,执行「月刊校招情报摄入流水线」建造任务,任务 key=t2-recruit-intel。设计文档:${DESIGN_DOC}(全文,含审计校准节与红线节,必读)。

## 操作规程
- 仓库 E:\\Agent program\\HRBP。先 git status + git branch 确认现状(工作区里可能存在其它任务留下的未跟踪/未提交改动,那不是你的,不许 stage、不许清理、不许 commit,只针对你自己改动的文件操作)。基于 dev 创建分支 feat/t2-intel 并切换(就在主工作区做,不建 worktree)。
- 严格按下面「侦察产出的执行清单」逐条执行,范围外一行不改。清单标 [缺失] 或与红线冲突的条目,停在该条报告,不许猜、不许绕过、不许静默跳过后继续做别的。
- 每改一处先 Read 确认内容与清单描述一致再动手。

## 铁律(与设计文档一致,原样重复以防执行时遗漏)
1. **三类源适配器**:sheet_file(Excel/CSV 文件上传,管理员在 /digest 供给页上传,后端解析)/ sheet_link(腾讯文档/飞书在线链接,尽力而为抓取,登录态/反爬挡住时管理页明确提示"请导出 CSV 上传"降级到 sheet_file——不为反爬对抗投入,降级路径就是正解)/ wechat_dump(公众号现成爬取工具产物文件上传,json/md/html 均预留,具体格式待用户提供仓库名前按"通用文本/json 摄入"实现,不猜专有格式)。三个新 kind 字符串值不得与已存在的 'wechat' kind(现有 We-MP-RSS API 拉取式导入器)混用或覆盖它的行为。
2. **新实体 recruit_events**:字段 id / company / role_hint / event_type(网申开启|网申截止|宣讲会|笔试|面试批次|其他) / event_date / city / apply_url / source_ref(FeedItem或上传批次) / confidence / dedup_key / created_at。手写 migration(参照 packages/api/src/database/migrations/ 既有文件命名与写法,不许用 migration:generate 生成的伪 diff);sqlite dev/test 走 synchronize 不需要 migration 即可跑通测试,但生产 Postgres 必须有对应手写 migration,两者结构要一致。
3. **GLM 解析走 AiService**,照抄 feed-classifier.service.ts 的 ai.complete() 调用范式 + JSON parse/normalize 防编造模式,不直连任何厂商 SDK。Prompt 铁律:字段缺失就 null,禁止推断补全日期/链接;每行原始数据带进 prompt;输出走 JSON schema 校验(逐字段 normalize,类型不对/枚举不合法就落 null 或丢弃该条并 Logger.warn 记日志),不合格的整条丢弃,不得静默吞掉也不得编造回退值。
4. **去重**:dedup_key = hash(归一化公司名 + event_type + event_date);冲突时保留 source 更权威/更早者,合并 apply_url(不是简单覆盖丢失另一个链接)。
5. **调度**:挂在现有 feed 调度机制上(FeedIngestionService 的 @Cron 体系)注册周任务,不另起独立 cron 框架;抓取+解析+去重一条龙,产出写 recruit_events,运行记录进现有 DigestRun/runs 体系,管理页(/digest)可见。上传类源(sheet_file/wechat_dump)在上传时即时解析,不等 cron;sheet_link 走周 cron 尽力抓取。
6. **呈现**:/newspaper 页新增"校招情报"常驻板块,未过期事件按 event_date 升序(临近截止置顶)展示 公司/事件/日期/城市/跳转原链;过期自动隐藏。event_date 为 null 的事件(缺失字段,禁止编造补全)不得强行塞进按日期排序的主列表,落"日期待确认"分区。API 在 newspaper.service.ts/controller.ts 现状基础上选侵入最小方案(扩展 GET /newspaper 返回或新端点,以侦察清单结论为准)。
7. **月刊汇总钩子**:设计文档已经拍板"接入周更流程"(不是删除,不要重新讨论二选一)——digest-generator.service.ts 生成周刊时把当期新增 recruit_events 纳入汇总段落;同时要确保有真实触发路径(现状 @Cron('digest-daily-ingestion') 从未调用 digestGenerator,是"建成即弃"的 M9 缺口),按侦察清单结论把它接进新的周更流程里,不能只加内容不加触发,不留孤儿功能。
8. **审计校准四条,逐条落地,不得挑着做**:
   - M7:feed.controller.ts 的 @Post('import')、@Post('digest') 两处摘掉 CreditGuard + CreditInterceptor(AiUsageInterceptor 是用量/失败观测不是计费,不在摘除范围,不许连它一起删);本任务新增的所有源管理/上传/解析端点一律不挂 CreditGuard/CreditInterceptor——这是 C 端计费与管理员运营操作的边界,不得混用。
   - M8:/digest 页对普通用户隐藏"导入来源"按钮与来源状态区(仿 admin/page.tsx 的 me.role !== 'admin' 门控写法,只读该文件参考写法,不要改动它);本任务新增的三类源管理 UI 同样只对 admin 可见。
   - M9:按上面第 7 条执行。
   - m23:给用户投稿的面经条目补前端删除按钮(后端 DELETE /feed/:id 归属校验已就绪,纯前端缺口)。
9. **红线(超出即停)**:
${RED_LINES}

## 侦察产出的执行清单(照此逐条做)
${checklist}

## 测试要求
- 单测:CSV 解析(含脏行)、去重键冲突合并、GLM 输出 schema 校验拒绝不合格、事件过期过滤。测试夹具自造 3 份样例(规整CSV/脏CSV/公众号文章文本),放 packages/api/test/fixtures/(目录不存在就新建)。
- e2e:上传样例 CSV → 事件入库 → newspaper 端点返回;防编造测试(缺截止日的行 → event_date 为 null 且不进"按截止日排序"主列表,落"日期待确认"分区)。
- **跑测命令必须分两条,不能只跑一条就号称"全量"**(jest.config.json 的 testRegex 只匹配 *.spec.ts,不匹配 *.e2e-spec.ts):
  1) cd packages/api && npx jest --runInBand(单测,含新增 recruit 相关单测)
  2) cd packages/api && npx jest --config ./test/jest-e2e.json --runInBand(e2e,含新增 recruit e2e 与被改造的 credit e2e——如清单判定需要改造)

## 自验(全部完成后,最终回复里附原始输出,不许只说"通过"两个字)
1) 残留/红线自查:git grep 确认新增 kind 值(sheet_file/sheet_link/wechat_dump 或清单实际采用的命名)未与既有 'wechat' 混淆;git grep 确认 feed.controller.ts 的 import/digest 两端点已无 CreditGuard/CreditInterceptor 且新端点未挂;确认 recruit_events 实体含 role_hint 字段。
2) cd packages/api && npx tsc --noEmit(编译探针,不冒充测试)。
3) 按上面「跑测命令」跑两条 jest,附完整原始输出。
4) 只提交本任务涉及的文件:git add 逐路径,git commit -m "feat(feed): 月刊校招情报摄入流水线——三类源适配器+GLM解析+去重+周更+newspaper呈现(审计校准M7/M8/M9/m23)"。

最终回复 = 交付报告:执行清单逐条 DONE/SKIP(附原因)、四条审计校准逐条 DONE/SKIP、tsc 与两条 jest 的原始输出、commit hash、diff --stat。遇到清单与现实不符或红线冲突,立即停在该条,报告不猜。`

const impl = await agent(IMPL_PROMPT, { label: 'impl:t2-recruit-intel', phase: '实现', model: 'sonnet' })
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

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,切到分支 feat/t2-intel(实现代理刚提交完毕,先 git log -1 确认在该分支最新提交上)。逐门跑质量门,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事):
1) cd packages/api && npx jest --runInBand —— 单测全量必须绿(jest.config.json 的 testRegex 只匹配 *.spec.ts,这条覆盖不到 e2e,是第一条不是全部)。
2) cd packages/api && npx jest --config ./test/jest-e2e.json --runInBand —— e2e 全量必须绿,含新增的 recruit 相关 e2e 与被改造的 credit e2e(若实现代理判定需要换受测端点)。必须用这个 --config 参数,直接跑 npx jest --runInBand 会漏掉所有 *.e2e-spec.ts。
3) cd packages/api && npm run build(或等价 nest build)。
4) cd packages/web && npx eslint src/ —— 0 错误。
5) cd packages/web && npm run build —— 通过。
6) 审计校准逐条复核(不是删除任务,不做残留关键字清零检查,而是确认落地):
   - git grep -n "CreditGuard\\|CreditInterceptor" packages/api/src/feed/feed.controller.ts —— 应确认 import/digest 两个端点上已不挂这两者,新增端点也不挂。
   - git grep -n "role !== 'admin'\\|role === 'admin'" packages/web/src/app/(main)/digest/page.tsx —— 应确认存在权限门,把导入按钮/来源状态区/新增源管理UI 圈进去。
   - 确认 digest-generator.service.ts 的调用点是否真的被某个周期任务/流程触发(不是只加了代码没接线)。
   - 确认月刊·面经投稿卡片是否新增了删除按钮,并对应调用 DELETE /feed/:id。
7) 新 kind 值不与既有 'wechat' 混淆:git grep -n "kind === 'wechat'\\|kind: 'wechat'" packages/api/src/feed —— 逐条核对新增的 sheet_file/sheet_link/wechat_dump(或清单实际命名)分支未误写成 'wechat'。
不改任何代码;测试挂了如实报 FAIL 附错误,不许自己修。实现背景:月刊校招情报摄入流水线新建,feed 模块新增三类源适配器与 recruit_events 实体,digest-generator 已接入周更流程,feed/import 与 feed/digest 已摘除 C 端计费。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP,先读 ${DESIGN_DOC} 全文(设计定稿+审计校准+红线)建立标准,再审计分支 feat/t2-intel 相对 dev 的完整 diff(git diff dev...feat/t2-intel)。

找茬重点:
①范围外改动(diff 里任何不在设计文档范围内的文件/行,尤其检查有没有碰 salary/ 目录、industry-trend、learning-roadmap、company-research、限流器/watchdog 核心逻辑——这些都是红线)。
②设计文档 1-5 节逐条对 diff 打勾:三适配器是否真的实现且互不冲突(新 kind 没有误用/覆盖既有 'wechat' kind)、recruit_events 实体字段是否齐全、GLM 解析是否真的经 AiService、去重逻辑是否正确、周 cron 是否真的挂上、newspaper 呈现是否含"日期待确认"分区处理。
③防编造红线:GLM 解析 prompt 是否真的要求"缺字段返回 null",normalize 代码是否真的落 null 而不是编造/推断填充;event_date 为 null 的事件有没有被错误地塞进按日期排序的主列表。
④反爬红线:sheet_link 适配器有没有引入无头浏览器/验证码破解/请求签名逆向等反爬对抗手段(应该是抓不到就提示降级)。
⑤四条审计校准是否真的落地而非假装:M7(feed/import、feed/digest 是否真的摘掉了 CreditGuard+CreditInterceptor,新端点是否也没挂;AiUsageInterceptor 不该被误删)、M8(/digest 页权限门是否真的生效,不是加了个不起作用的条件)、M9(digest-generator 是否真的接了触发路径,不是又一次"建成即弃")、m23(面经删除按钮是否真的调用了 DELETE /feed/:id)。
⑥去重是否可能误合并不同公司的同名事件(dedup_key 算法是否真的纳入公司名归一化)。
⑦周 cron 是否有幂等保护,重复抓取同一 sheet_link/上传同一文件是否会产生重复 recruit_events。
⑧手写 migration 是否规范(不是 migration:generate 生成的伪 diff),是否误碰了其它表结构。
⑨wechat_dump 遗留记录:确认 ${MASTER_PLAN} 的"待用户输入的遗留项"第 1 条没有被删除或大改结构(允许原地小改一行使其准确)。
每条发现附 file:line。不改任何文件。`

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t2-recruit-intel', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t2-recruit-intel', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
