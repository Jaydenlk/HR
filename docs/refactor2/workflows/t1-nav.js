export const meta = {
  name: 't1-nav-cleanup',
  description: 'T1 导航四模块重组+删页(学习路线/行业趋势/跟进消息独立页,后端follow-up模块保留)——侦察→实现→验证扇出',
  phases: [
    { title: '侦察', detail: '核对设计文档+审计校准+实时代码坐标,产出精确执行清单' },
    { title: '实现', detail: '按清单在 feat/t1-nav 分支执行导航重组与删页' },
    { title: '验证', detail: '质量门与只读审计并行' },
  ],
}

phase('侦察')
const RECON_PROMPT = `你是只读侦察代理。仓库根 E:\\Agent program\\HRBP,基线分支 dev,任务代号 t1-nav。

## 第一步:读文档
1. 全文读 docs/refactor2/T1-nav-cleanup.md ——这是本任务的设计定稿,含四模块导航映射、改动清单、红线。
2. 读 docs/refactor2/CODE-AUDIT-2026-07-02.md 里两处:
   - 搜 'm9. packages/api/src/conversations/chat.service.ts:59' 那一节(约L275-279):AI 教练系统 prompt 里硬编码了两个被删路由,清理只按前端跳转 grep 走查会漏掉这处后端 prompt 字符串。
   - 搜文件末尾 'T1(docs/refactor2/T1-nav-cleanup.md)' 那一节(约L371-372):官方补丁点名 chat.service.ts:59 + me/page.tsx:32-33 + nav-hints.ts:21/25 三处必须连带清理,验收 grep 范围要扩到后端 AI prompt 文件。

## 第二步:核对下面这份"线索清单"是否仍与实时代码吻合(逐条 Read/Grep 确认,行号可能已漂移,以内容定位为准;下面的行号是先前侦察时的坐标,当线索不当圣旨)

### 待整体删除
- packages/web/src/app/(main)/learning-roadmap/ 整目录
- packages/web/src/app/(main)/industry-trend/ 整目录
- packages/web/src/app/(main)/follow-up/ 整目录 —— 只删这个前端页面目录,后端 follow-up 模块不在此列
- packages/api/src/learning-roadmap/ 整目录
- packages/api/src/industry-trend/ 整目录(含 industry-bocha.service.ts 与其 spec;T6 会另建统一博查服务,不是本任务要建的东西,本任务只管删)
- packages/api/test/learning-roadmap.e2e-spec.ts
- packages/api/test/industry-trend.e2e-spec.ts

### 导航重构本体(核心工作)
- packages/web/src/app/(main)/layout.tsx:当前 buildMainNav()(今天/月刊·面经/面试复盘/求职总览 4 项,含 interviewCount badge 与 today 的 dot)+ buildToolNav()(core 6 项 + more 6 项,more 里含 learning-roadmap/follow-up/industry-trend/offer-comparator/interview-prep/career,配一套 showMore 折叠 state 与 nav-indicator 滑动高亮 useLayoutEffect)。要改造成四模块常驻展开结构,設計文档给定的映射:
  - 面试前:简历馆 /resumes、校招诊断 /diagnoses/campus、求职信 /cover-letter、机会中心 /opportunities、投递追踪 /applications(保留 applicationCount badge)
  - 面试中:面试备战 /interview-prep、模拟面试 /mock、面试录音上传(href 指向 '/debrief?upload=1'——这个查询参数直达上传流程的机制已经存在,读 packages/web/src/app/(main)/debrief/page.tsx 里 searchParams.get('upload') 那段确认,不需要新建上传逻辑,只需新增一个 NavItem 指过去,id 要和"面试复盘"区分开,例如 debrief-upload)
  - 面试后:面试复盘 /debrief(保留 interviewCount badge)、Offer比对 /offer-comparator。**先查 packages/api/src/salary 和 packages/web/src/app/(main)/salary 是否存在**——存在则按文档在本组追加第三项"薪资雷达 /salary";不存在(大概率,前序删除任务已处理)则本组只有 2 项,在报告里写明"薪资雷达已被前序任务删除,本组按 2 项处理",不算异常、不许臆造第三项。
  - 其他:今天 /today(保留 dot)、月刊·面经 /newspaper、求职总览 /overview、职业地图 /career。明确**不加**职业维基入口(T3 才加,现在加=提前留空壳)。
  - 四组各一个标题,默认全展开;showMore 相关 state/按钮/"更多功能"折叠 UI 整体删除(若做成组内可折叠也必须默认展开,不许任何一组默认收起)。
  - 校验现有 badge/dot 迁移路径:面试复盘 badge ← interviewCount、投递追踪 badge ← applicationCount、今天 dot,三者行为不能丢;nav-indicator 滑动高亮那套 useLayoutEffect 依赖需要跟着新结构调整,不能让点击态高亮失效。

### 同步修改(缺一个就有死链或AI继续推荐已删页面)
- packages/api/src/app.module.ts:删 LearningRoadmapModule、IndustryTrendModule 的 import 与数组注册。**FollowUpModule 的 import 与注册禁止删除**(T5 要复用)。
- packages/api/src/conversations/chat.service.ts:系统 prompt「站内能力地图」一段里有一行原文类似"行业趋势(/industry-trend)、offer 对比(/offer-comparator)、职业规划与学习路线(/career、/learning-roadmap)。"——**只删"行业趋势(/industry-trend)、"和"、学习路线"这两个片段,offer-comparator 和 /career 原样保留,绝不整行删除**(整行删会连累 offer-comparator 和 career 两个仍存在功能的 AI 提议能力)。这正是审计校准 m9 点名的坑,历史教训写明白了:只按前端路由/导航 grep 走查会漏掉这处后端 prompt 字符串。
- packages/web/src/app/(main)/me/page.tsx:ENDPOINT_LABELS 对象里删 '/learning-roadmap/build' 与 '/industry-trend/analyze' 两条。**紧邻的 '/follow-up/generate': '跟进消息' 那一条禁止删除**——后端端点还活着,T5 会继续用。
- packages/web/src/components/onboarding/nav-hints.ts:NAV_HINTS 对象里删 'learning-roadmap' 键和 'industry-trend' 键两行。**紧邻的 'follow-up' 键禁止删除**——即使新导航里暂时没有"跟进消息"独立入口,这条 hint 文案留着不动,等 T5 把跟进能力并入投递详情页时再复用/调整,不属于本任务的死链判定范围。
- packages/web/src/lib/types.ts:两块类型定义整块删除——① 注释头"Industry Trend"起到 IndustryTrendResult interface 结束那一整块(IndustryTrendConfidence/IndustryHiringOutlook/SignalStrength/SignalSeverity/DemandLevel/IndustryGrowthSignal/IndustryRiskSignal/IndustryEntryRole/IndustryTrendResult 共 9 个类型);② 注释头"Learning Roadmap"起到 BuildRoadmapResult interface 结束那一整块(RoadmapPhase/RoadmapItem/RoadmapResource/BuildRoadmapRequest/BuildRoadmapResult 共 5 个类型)。删之前先 grep 确认这些类型名在 packages/web 全仓(排除即将删除的两个页面目录本身)确实没有其他消费者——目前核实的结果是确实没有(只有对应页面自己在用)。**紧邻这两块的 FollowUpTimingAdvice/FollowUpToneGuide 等 follow-up 类型禁止删除**。

### 测试改造
- packages/api/test/learning-roadmap.e2e-spec.ts、packages/api/test/industry-trend.e2e-spec.ts:整文件删除(模块没了)。
- packages/web/e2e/iter2-w1-three-lines.spec.ts:当前有 4 个 test.describe 块——"线1: 点数同步bug修复"、"线2: Tooltip组件验证"、"线3: 行业趋势接博查联网搜索"、"回归: 核心流程"。**删除"线3"整个 describe 块**(线3-A/B/C,专测 industry-trend 页面+博查联网,页面没了测试主体也没了;博查搜索测试职责移交 T6 新服务,不在本任务补测试)。**删除"线1"里名为"线1-E: 行业趋势真扣点后侧边栏和/me页两处同步更新"的那一个 test**(同样因为 industry-trend 页面删除失去测试对象)。"线1"里的 A/B/C/D(用校园诊断等其他端点覆盖同类 credit-sync 行为)、"线2"、"回归" 三个 describe 块原样保留,一行不动。
- packages/api/test/follow-up.e2e-spec.ts:**禁止删除或修改**,后端模块保留,测试也保留。

### 低优先级伴随发现(可选,不做不算 SKIP 失败)
- packages/api/src/interview-prep/interview-prep.service.ts 里有一行注释提到"learning-roadmap"字样(讲 confidence 枚举对齐范式),顺手删掉这个字样可以,不删也不算失败,残留扫描命中这行按已知豁免处理。
- packages/api/src/career/career.service.ts 里有一行注释提到"industry_trend"字样(讲 schema 范式对照),同理豁免。

### 红线(不许碰)
- packages/api/src/follow-up/ 整个后端模块(controller/service/module/dto)——禁止删除、禁止修改,T5 投递详情页要复用。
- packages/api/test/follow-up.e2e-spec.ts、packages/api/test/test-utils.ts——禁止修改。
- nav-hints.ts 的 'follow-up' 键、me/page.tsx 的 '/follow-up/generate' 条目——禁止删除。
- 薪资雷达/salary 相关内容:如果执行时该模块已不存在(前序任务删除),不属于本任务范围,不倒查、不修复其他任务的遗留,只在报告里说明"目标不存在,按设计文档少一项处理"即可,不许臆造。
- 移动端 gate 相关逻辑不动。
- 不碰 ai.service/limiter/watchdog 等 AI 服务代码;chat.service.ts 只能改前面点名的那一处 prompt 文本片段,不动其他任何逻辑。
- 不加职业维基导航入口(T3 的事)。
- layout.tsx 里与四模块导航无关的逻辑——运营分组(admin 可见那部分)、最近对话列表、问 Coach 顶部 CTA——原样保留,不顺手改动格式或逻辑。

## 第三步:补充自查
额外做一次全仓 grep(排除 docs/ 与 .claude/):搜 "learning-roadmap"、"industry-trend"、"industry_trend"、"LearningRoadmapModule"、"IndustryTrendModule"、"'/follow-up'" 这几类关键字,确认线索清单没有漏掉某个引用点;如果发现线索清单之外的新引用点,补进你的产出清单并标注"[新发现]"。

## 产出要求
产出一份纯文本「当前精确执行清单」,逐条包含:
1. 文件路径
2. 内容锚点(给一段可以直接拿去 grep 命中且在文件里独一无二的原文片段或函数/变量名,不要只给行号——行号会漂移)
3. 改法一句话(具体到做什么,不是"处理一下")
4. 该条目的 verify 方法(一条可执行的命令或检查动作)

对目标内容确实找不到的条目,标注"[缺失-需人工]"并说明找了哪里没找到,不许猜一个坐标凑数。清单最后单列一节"红线禁碰清单",把上面第二步"红线"一节的内容连同你自己发现的追加项一起收进去,原样交给下一步的实现代理。`

const checklist = await agent(RECON_PROMPT, { label: 'recon:t1-nav', phase: '侦察', model: 'sonnet' })
if (!checklist) throw new Error('侦察代理未返回,中止后续实现')
log('侦察完成,进入实现阶段')

phase('实现')
const IMPL_PROMPT = `你是实现代理,执行「T1 导航四模块重组+删页」。仓库 E:\\Agent program\\HRBP,当前在 dev。

## 操作规程
- 先 git branch --show-current 与 git status 摸底。已跟踪文件里**文档类改动(docs/、CLAUDE.md、.claude/ 下)与未跟踪杂物不是你的**:不许 stage、不许清理,如实记录后继续即可,不算脏。**packages/ 等代码文件存在未提交改动才是异常——立即停止,如实报告当前分支与 git status 原文,不许自己 checkout/stash/清理来"帮忙"、也不许硬着头皮开工。**
- 分支判定:git branch --list feat/t1-nav。①分支已存在且 git log 显示有本任务提交(导航/删页相关,含 "wip(" 前缀的抢救性提交)→ 切过去续跑(按下方增量提交铁律的续跑判定走);②分支不存在 → 确认当前在 dev 后基于 dev 创建 feat/t1-nav 并切换(就在主工作区做,不建独立 worktree);③分支存在但提交内容明显是别的任务 → 停止报告。
- 严格按下面"侦察产出的执行清单"逐条执行,范围外一行不改;每改一处先 Read 确认内容与清单描述一致再动手。
- 遇到清单里标"[缺失-需人工]"的条目,或执行中发现目标内容与清单描述不符(比如所指代码段已经不存在、或和红线冲突),**停在该条,如实报告,不许猜、不许硬着头皮删**。
- 红线清单(清单末尾那一节)是硬约束,任何一条动了都算失败,不因为"顺手""看起来该删"就越界。

## 增量提交铁律(防配额中断全损;2026-07-03 实证教训:另一任务曾三次单窗烧尽 300k+ token 且零提交,全部白干)
- 开工先看 git log --oneline dev..HEAD:本分支已有本任务提交 → 你是续跑,先 git diff dev...HEAD --stat 对照执行清单做缺口分析,只做未完成部分,不许重做已完成的、不许 revert 半成品重来。
- 每完成执行清单一个条目(或一组强耦合条目)立即 git add 涉及文件(逐路径,不用 -A)并 commit(message 可用 "wip(t1-nav): <条目>",最后不必整理历史)。不许攒到最后一次性提交——配额中断时,已提交的就是断点,没提交的就是白干。
- 最终全量自验仍按「自验」节统一做;自验后的修补也要及时 commit。

## 硬红线(不管侦察清单有没有记全,以下每一条都独立成立,违反任何一条都是失败)
- packages/api/src/follow-up/ 整个后端模块(controller/service/module/dto)——禁止删除、禁止修改。app.module.ts 里 FollowUpModule 的 import 与注册禁止删除。packages/api/test/follow-up.e2e-spec.ts、packages/api/test/test-utils.ts 禁止修改。
- packages/web/src/components/onboarding/nav-hints.ts 的 'follow-up' 键、packages/web/src/app/(main)/me/page.tsx 的 '/follow-up/generate' 条目——禁止删除,即使新导航里暂时没有"跟进消息"独立入口。
- packages/web/src/lib/types.ts 里 FollowUpTimingAdvice/FollowUpToneGuide 等 follow-up 类型——禁止删除;它们在文件里正好夹在待删的 Learning Roadmap 块与 Industry Trend 块中间,整块删除时最容易被手滑带走,删之前务必确认块的起止边界。
- packages/api/src/conversations/chat.service.ts 系统 prompt「站内能力地图」那一行原文含"行业趋势(/industry-trend)、offer 对比(/offer-comparator)、职业规划与学习路线(/career、/learning-roadmap)。"——**只删"行业趋势(/industry-trend)、"和"、学习路线"这两个片段**,"offer 对比(/offer-comparator)"与"/career"必须原样留在这句话里,禁止整行删除或整句重写。
- 不加职业维基导航入口(T3 的事,现在加=提前留空壳)。
- 不碰 ai.service/limiter/watchdog 等 AI 服务代码;移动端 gate 逻辑不动;layout.tsx 里运营分组(admin 可见部分)、最近对话列表、问 Coach 顶部 CTA 原样保留,不顺手改动格式或逻辑。
- 若 packages/api/src/salary 或 packages/web/src/app/(main)/salary 已不存在(前序删除任务已处理),不属于本任务范围,不倒查、不修复、不臆造"薪资雷达"导航项,按侦察清单的结论处理即可。

## 自验(全部完成后做,附原始输出到最终回复)
1. 残留扫描——用等价的多次 git grep 也行,排除 docs/ 与 .claude/:
   git grep -niE "learning-roadmap|industry-trend|industry_trend|LearningRoadmapModule|IndustryTrendModule|RoadmapPhase|RoadmapItem|RoadmapResource|BuildRoadmapRequest|BuildRoadmapResult|IndustryTrendResult|IndustryTrendConfidence|IndustryHiringOutlook|IndustryGrowthSignal|IndustryRiskSignal|IndustryEntryRole" -- ':!docs' ':!.claude'
   预期:空,或只剩"低优先级伴随发现"里点名的两行注释(interview-prep.service.ts / career.service.ts)——如果剩这两行,说明为什么合法(未清理的可选项,不影响功能)。任何其他残留都要处理干净或停下来报告。
   另外单独跑:
   git grep -n "id: 'follow-up'" -- "packages/web/src/app/(main)/layout.tsx"
   预期:空(说明导航项已撤下)。
   git grep -n "'follow-up'" -- packages/web/src/components/onboarding/nav-hints.ts "packages/web/src/app/(main)/me/page.tsx"
   预期:各自命中一条(说明红线保留项没被误删)。
2. cd packages/api && npx tsc --noEmit(后端编译探针)。
3. cd packages/web && npx tsc --noEmit(前端编译探针——本任务核心改动在前端,这一步不能省)。
4. cd packages/api && npx jest --runInBand(单测全量必须绿——本任务删了后端模块,必须证明无回归;注意这条匹配不到 .e2e-spec.ts,不是全部)。
5. cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit(e2e 全量必须绿——裸 npx jest 会把 .e2e-spec.ts 安静跳过,必须用这条 --config 命令;被删的 learning-roadmap/industry-trend 两个 e2e 文件不应再被跑到,保留的 follow-up.e2e-spec.ts 必须仍绿)。
6. 收尾确认:全部改动已按增量提交铁律逐条入库;git status 确认无本任务残留未提交文件;最后一条 commit 用 "feat(nav): 导航四模块重组+删除学习路线/行业趋势/跟进消息三个独立页(后端follow-up模块与chat.service能力地图已同步清理)" 收口。

## 最终回复格式
交付报告:清单逐条 DONE/SKIP(附原因,SKIP 必须说清是[缺失]还是红线冲突还是别的)、残留扫描原始输出(含上面三条 git grep)、两个 tsc 输出、commit hash、git diff --stat dev...feat/t1-nav。`

const impl = await agent(IMPL_PROMPT + '\n\n## 侦察产出的执行清单(照此逐条做)\n' + checklist,
  { label: 'impl:t1-nav', phase: '实现', model: 'sonnet' })

if (!impl) throw new Error('实现代理未返回,中止后续验证')

phase('验证')
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

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,切到分支 feat/t1-nav(实现代理刚提交完毕,先 git log -1 确认在该分支最新提交上)。逐门跑质量门,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事):
1. cd packages/api && npx jest --runInBand —— 单测全量必须绿。注意两点:①jest.config.json 的 testRegex 只匹配 *.spec.ts,这条命令跑不到任何 *.e2e-spec.ts 文件(它们被安静跳过,0 匹配不报错),所以它不是"全量",e2e 见下一门;②必须从 packages/api 目录跑,从仓库根跑会走 babel-jest 报 TS 语法错,那是环境坑不是代码错。
2. cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit —— e2e 全量必须绿(这才是 e2e 的正确跑法)。重点核对:follow-up.e2e-spec.ts 仍存在且绿(红线保留项);learning-roadmap.e2e-spec.ts 与 industry-trend.e2e-spec.ts 应已不存在——如果还在(还被跑到)说明实现代理漏删,记为 FAIL。
3. cd packages/api && npm run build(或等价 nest build)。
4. cd packages/web && npx eslint src/ —— 0 错误。
5. cd packages/web && npm run build —— 通过,且构建输出的路由清单里不再有 /learning-roadmap、/industry-trend、/follow-up 三个路由;/debrief、/offer-comparator、/applications 等保留路由仍在。
6. 残留复扫(排除 docs/ 与 .claude/):
   git grep -niE "learning-roadmap|industry-trend|industry_trend|LearningRoadmapModule|IndustryTrendModule|RoadmapPhase|RoadmapItem|RoadmapResource|BuildRoadmapRequest|BuildRoadmapResult|IndustryTrendResult|IndustryTrendConfidence|IndustryHiringOutlook|IndustryGrowthSignal|IndustryRiskSignal|IndustryEntryRole" -- ':!docs' ':!.claude'
   预期:空,或只剩 interview-prep.service.ts / career.service.ts 里的两行豁免注释,逐条核对是否确实只剩这两行。
   git grep -n "'follow-up'" -- packages/web/src/components/onboarding/nav-hints.ts "packages/web/src/app/(main)/me/page.tsx"
   预期:各自仍有一条命中(红线保留项不能被误删),如果没命中记为 FAIL。
7. Playwright 实机走查(必须做,计入 overall_pass——nav-indicator 滑动高亮/badge/dot/新导航项可达性是运行时 DOM 行为,前面几门的 jest/eslint/build/grep 一条都测不出来):
   a. 起服务:一个终端 cd packages/api && npm run dev(本地 packages/api/.env 已有 DEV_LOGIN=1,不用额外设置;监听 3002);另一个终端 cd packages/web && npm run dev(监听 3001)。等两端就绪(能访问 http://localhost:3001 且 http://localhost:3002/api 有响应即可,不必是 200)。
   b. cd packages/web && npx playwright test e2e/iter2-w1-three-lines.spec.ts —— 确认"线3"整个 describe 块和"线1-E"这一个 test 在文件里已经不存在(不是跳过,是不存在),保留的"线1-A/B/C/D""线2""回归"用例仍然绿。
   c. 用 Playwright 浏览器工具(browser_navigate/browser_click/browser_snapshot 等)登录后走查新导航:登录方式参照上面 spec 文件里的 devLogin() 函数——POST http://localhost:3002/api/auth/dev-login 拿 token,写入 localStorage 的 'token' 键(同时把 'coach_tour_done' 设为 '1' 跳过新手导览),再访问 http://localhost:3001。依次点击侦察清单确认的四组导航项(面试前 5 项、面试中 3 项、面试后 2 或 3 项——视薪资雷达是否存在、其他 4 项),确认每一项都能点击到达、页面不白屏、浏览器控制台无 404 请求;再直接访问三个被删路由 /learning-roadmap、/industry-trend、/follow-up,确认均不是可用页面(404 或跳转,不能还能正常渲染出旧页面);确认面试复盘 badge、投递追踪 badge、今天页 dot 在新结构对应的导航项上仍然正常显示。
   若两端服务确实起不来(端口占用、SQLite 锁等),先尝试排查一次(换端口/查残留进程),仍然起不来就在 evidence 里如实写清楚起不来的原因,并把这一条计为 FAIL——这是唯一能测出运行时导航行为的手段,不能因为麻烦就降级成"仅供参考、不计分"。
不改任何代码;测试挂了如实报 FAIL 附错误,不许自己修。实现背景:导航从"主导航4项+工具区core6+more6"的旧结构改成"面试前/面试中/面试后/其他"四模块常驻展开结构,删掉学习路线、行业趋势、跟进消息三个独立页;学习路线/行业趋势连后端模块+类型定义一起删,跟进消息后端模块保留给 T5 用;chat.service.ts 的 AI 系统 prompt 里做了外科手术式的字符串片段删除(不是整行删)。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP,审计分支 feat/t1-nav 相对 dev 的完整 diff(git diff dev...feat/t1-nav)。对照下面"侦察产出的执行清单"逐条核对:
找茬重点:
① 范围外改动——diff 里任何不在清单内的文件/行改动。
② 清单条目漏做——逐条对 diff 打勾,尤其容易漏的:chat.service.ts 那处外科手术式删除(必须是删片段不是删整行,offer-comparator 和 /career 必须还在那句话里)、types.ts 两块类型定义是否删干净、layout.tsx 里 showMore 折叠机制和 nav-indicator 逻辑是否妥善处理而不是留半截。
③ 红线触碰(逐条查,任何一条命中都是 blocking)——packages/api/src/follow-up/ 是否被动过;app.module.ts 里 FollowUpModule 的 import/注册是否还在;nav-hints.ts 的 'follow-up' 键是否被误删;me/page.tsx 的 '/follow-up/generate' 条目是否被误删;是否新加了职业维基导航入口(不该有);是否碰了移动端 gate 或 ai.service/limiter/watchdog;是否给已经不存在的 /salary 模块臆造了导航项。
④ 徽标/dot 行为是否保留——面试复盘 badge、投递追踪 badge、今天 dot 是否在新结构里各自对应的项上还在生效(看代码逻辑即可,不要求跑起来点)。
⑤ 测试改造是否精准——packages/web/e2e/iter2-w1-three-lines.spec.ts 是否只删了"线3"整块和"线1-E"一个 test,"线1"其余(A/B/C/D)、"线2"、"回归"三个 describe 是否原样未动;packages/api/test/follow-up.e2e-spec.ts 是否被误改。
⑥ 提交范围是否克制——git diff --stat 里出现的文件是否都能对应到清单上的某一条,有没有夹带无关文件(比如 CLAUDE.md、未跟踪的临时文件)。
每条发现附 file:line。不改任何文件。`

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t1-nav', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT + '\n\n## 侦察产出的执行清单(核对用)\n' + checklist,
    { label: 'review:t1-nav', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
