export const meta = {
  name: 't5-app-detail',
  description: 'T5 投递追踪二级页:归属校验补洞(cover_letters/interviews/mock_sessions)+聚合/link/建议 API + 详情页前端,侦察→实现(后端串行→前端串行)→验证(测试/审计并行)',
  phases: [
    { title: '侦察', detail: '只读代理核对设计文档+审计校准+实时代码坐标,含 T6/T1 依赖就绪检查,产出精确执行清单' },
    { title: '实现', detail: '后端(数据打通+归属校验+聚合/link/建议 API)与前端(详情页+审计校准前端项)在 feat/t5-app-detail 分支串行实现' },
    { title: '验证', detail: '质量门(单测+e2e+eslint+build+Playwright+残留 grep)与只读审计并行' },
  ],
}

// ── 设计+审计+红线简报(2026-07-02 定稿,侦察坐标为撰写脚本时核实,可能漂移)──────────
const BRIEF = `# T5 投递追踪二级页——设计+审计校准+红线简报(仓库根 E:\\Agent program\\HRBP,基线分支 dev)

设计文档全文:docs/refactor2/T5-application-detail.md(必读,本简报是摘要不是替代)。
关联文档:docs/refactor2/T6-bocha-search.md(company_research 实体定义,T5 的前置依赖)、
docs/refactor2/CODE-AUDIT-2026-07-02.md(B2/M12/B4/M2/m8/m10/m13/M18/M11/M21 各条原文出处)、
docs/refactor2/00-master-plan.md(全局红线与执行顺序,T6→T5)。

## 一、设计定稿摘要

### 1. 数据打通(手写 migration,一次做齐,全部 nullable,存量数据零迁移不回填)
- mock_sessions.application_id:现状是纯 @Column({nullable:true}),无 FK、mock.service.ts 写入(create()
  内构造 session 时,约 L366 附近)零归属校验。补:①migration 加真外键 FOREIGN KEY...REFERENCES
  applications(id) ON DELETE SET NULL;②实体加 @ManyToOne/@JoinColumn(参考 interview.entity.ts 现有写法);
  ③mock.service.ts create() 收到 dto.application_id 时,在调用 generateQuestions()(AI 调用,会计费)之前
  先做归属校验,校验不过直接拒绝,不要等 AI 出完题才发现越权。
- cover_letters.application_id:现状同 mock_sessions(纯 @Column,无 FK,generate()/regenerate() 零归属校验,
  regenerate() 还会把 existing.application_id 原样塞回)。补法同上(FK + 实体 relation + service 归属校验)。
- interviews.application_id:现状已是真外键(@ManyToOne + @JoinColumn,onDelete SET NULL,已完备,不要重复
  加 FK/migration)。缺的是 service 层:create()/update() 把 dto.application_id 原样写入/Object.assign,
  零归属校验——这条只补校验代码,不碰 schema。
- applications 加 resume_version_id(nullable,软引用,语义="发送的是哪一版"):与既有 resume_id 不是一回事——
  resume_id 指向 Resume(简历级,assertOwnedRefs 已校验),resume_version_id 指向 ResumeVersion(版本级,新表)。
  resume_versions 表本身没有 user_id 列,归属校验必须经 resume_id 反查其所属 Resume 的 user_id(参考
  resumes.service.ts 现有 findOne(id,userId) 的用法或 resume_versions 表结构自行确认联表方式)。
- applications 加 company_research_id(nullable,指向 T6 的 company_research 实体)。**company_research 是全局
  缓存表,没有 user_id 列**——它的"归属校验"只需要校验行存在(target 是否真的在 company_research 表里),
  不需要也不能套用"属于当前用户"的判断,否则要么恒假拒绝要么代码编译不出来。

### 2. 聚合 API
GET /applications/:id/related(JwtAuthGuard)。第一步必须先用既有 ApplicationsService.findOne(id,userId)
(已有 404 未归属保护)确认该 application 属于当前用户,再查各关联表(WHERE application_id=? 且各表自身有
user_id 的加 AND user_id=?;resume_versions 走 resume_id 联查;company_research 走"存在即返回"不加用户过滤)。
返回形状:{ interviews:[...含转写任务态], mock_sessions:[...], cover_letters:[...], resume:{resume,version?},
company_research:{}|null }。Application 实体本身不加反向 relations,保持现状简单——查询用独立 Repository 完成。

### 3. link / unlink / AI 建议(全部落在 applications 域下,不要让消费方模块反向依赖回来)
- PATCH /applications/:id/link,body: { type: 'interview'|'mock'|'cover_letter'|'resume_version'|
  'company_research', target_id: string, action: 'link'|'unlink' }。内部按 type 更新对方表的 application_id
  (resume_version_id 是本表字段,是更新 applications 自己那一行)。
  - link 时:target 必须存在;除 company_research 外,target 必须属于当前用户(resume_version 经 resume_id
    反查;interview/mock/cover_letter 直接查 user_id);application 本身也要属于当前用户(即 findOne 已保证)。
  - unlink 时:除上面的存在性/归属校验外,还要校验 target 当前确实 link 在这个 application 上(即
    target.application_id === 本 application 的 id),不满足就拒绝,不能悄悄把一条实际挂在别的 application
    下的记录解绑。
  - 双向归属校验缺一不可(target 与 application 都要属于当前用户,company_research 除外)。
- GET /applications/:id/link-suggestions:按公司名归一化模糊匹配,扫当前用户尚未关联(application_id 为
  null)的 interviews/mock_sessions/cover_letters,返回候选清单+匹配理由。**归一化函数要与 T6 用的同一套
  (去空格/全半角/大小写/常见后缀剥离),提炼成共享 util,不允许复制一份出来**——如果 T6 已落地,函数应该已
  经存在于某处(多半在 company-research 模块内),抽出来放common/shared 位置两边一起用;如果 T6 还没落地
  (见下方"T6 依赖"一节),就在本任务新建这个共享 util 并在报告里写清楚"待 T6 落地后需切换/复用"。
  **建议永远只是建议,后端不写库,前端必须等用户点了"采纳"才调用 link 接口**——不允许任何自动生效路径。

### 4. 前端 /applications/[id]
- 看板卡片(application-card.tsx 现状:onClick 直接 onEdit 弹层)点击行为改为跳转详情页;原编辑弹层组件挪进
  详情页作为一个动作按钮触发,复用组件本体不重写。
- 头部(公司/岗位/阶段/关键日期/阶段推进)→ AI link 建议横幅(有建议才出现,一键采纳/忽略,采纳后调用
  PATCH link)→ 时间线(ApplicationTimeline 组件现状是 applications/page.tsx 编辑弹层的 footer,要挪出来给
  详情页复用,搬移后原弹层不留死引用)→ 聚合区块:面试&录音、模拟面试、求职信、简历版本(展示哪一版+跳简历馆)、
  公司背景(T6 缺失时诚实空态+"查一下"按钮或直接不渲染该区块,不得假设字段必然存在)、跟进消息(嵌 follow-up
  生成面板,POST /follow-up/generate,DTO 字段为 scenario/application_id?/interview_details?/contact?——
  把公司/岗位/阶段拼进 interview_details 真实文本,不能只传裸 application_id 让后端 prompt 里出现一串 UUID)。
- 每个聚合区块带手动"关联已有记录"选择器。空状态文案诚实:"暂无关联记录"。
- 每条已关联记录旁边带"取消关联"按钮(调用 PATCH link 的 action:'unlink'),点击后从该区块消失——这不是可选项,
  验证阶段的 Playwright 用例会实际点击它,漏做这个按钮会导致质量门测不过。
- 详情页补删除投递按钮(后端 DELETE /applications/:id 早已存在且带归属校验,纯前端零入口,直接接线)。

## 二、审计校准增补(编号见 CODE-AUDIT-2026-07-02.md,这些是验收硬项不是锦上添花)
1. cover_letters.generate()/regenerate() 写入 application_id 时补归属校验,比照 follow-up.service.ts
   L187-199 的模式(try 查 applications.findOne(applicationId,userId),NotFound/Forbidden 一律归一成
   ForbiddenException,避免向未授权用户泄露"这个 application 是否存在");不能只加数据库外键——外键只保证
   目标行存在,不保证属于当前调用者(B2/M12)。CoverLettersModule 需要 imports:[ApplicationsModule](参照
   FollowUpModule 现有写法,ApplicationsModule 已 export ApplicationsService)。
2. interviews.create()/update() 同样补上面这套归属校验(B4/M2);interviews 的 GET 端点(controller 现有
   findAll()/findOne(),service 侧 findAllByUser/findOne 都是 relations:{application:true} 全量预加载并裸
   传给前端)要补 DTO 白名单投影或收窄 relations,堵住"伪造 application_id 回读他人 Application 全字段
   (notes/salary_range/referrer/deadline/location)"的隐私泄露路径(B4)——这是本任务的验收硬项之一,不能
   只做归属校验不做 GET 侧投影。
3. StrategyPanel(applications/page.tsx 里的独立组件,现状是无 props 纯手填 current_applications 文本框)
   接收页面已拉取的 applications 列表(page.tsx 里已有,约 L963/979 一带)预填当前在投公司,不让用户重打
   一遍(m8)。
4. follow-up 面板生成时把 company/role/stage 真实值填入 interview_details 参数,终结"裸 UUID 塞 prompt"
   (follow-up.service.ts buildPrompt() 现状直接 push 一行"投递 ID:{uuid}")——前端组装真实文本即可,不需要
   改后端 service 结构(m10)。
5. 投递阶段中文标签(想投/已投递/面试中/终面/Offer/已拒)当前在 kanban-board.tsx、application-card.tsx、
   application-form.tsx、application-timeline.tsx、tracker-stats.tsx 五处硬编码,onboarding-surfaces.tsx
   (约 L407-412)是第六处复制。本任务抽 packages/web/src/lib/tracker-stages.ts 共享 STAGE_META 常量,六处
   全部改为消费共享常量,不是加第七份复制(M18)。
6. 求职信生成表单(cover-letter/page.tsx handleGenerate(),约 L125 有一行 TODO(#103) 声称"待后端开放简历
   上下文入参")与现状不符——后端 generate() 早已支持 dto.resume_id(L25-28 读简历,L56-59 按 resumeText
   切换含防编造规则的两套 prompt)。补简历选择器,传 resume_id;从详情页进入生成求职信时顺带传
   application_id(M11/M21)。

## 三、红线(超出即停或直接判 FAIL,不许自作主张扩大范围)
- **AI 建议不自动生效**:link-suggestions 只产生候选,任何写库动作必须来自用户显式点击"采纳"触发的 PATCH
  link 调用;不允许 useEffect/挂载时自动调用 link,不允许后端在建议接口里顺手写库。
- **存量数据不回填不清洗**:resume_version_id/company_research_id 两个新列对已有 applications 行一律留
  NULL,不写任何 UPDATE 去推断/回填旧数据。(注意:这条红线不等于"不能碰已有脏数据"——给 cover_letters/
  mock_sessions 的 application_id 加外键约束前,如果存量表里已有指向不存在 applications 行的脏值,migration
  的 up() 里必须先做一次防御性 UPDATE ... SET application_id = NULL WHERE application_id NOT IN
  (SELECT id FROM applications),再 ADD CONSTRAINT,否则线上迁移会直接失败——这是数据完整性维护,不算
  违反"不回填"红线,该做还是要做。)
- **同名 salary_range 禁碰**:applications 实体现有 salary_range 字段(entity 约 L41,纯历史字段,与投递详情
  改造无关)一个字不许动、不许重命名、不许当"薪资相关"顺手清理——它跟仓库里另一条正在进行的薪资雷达模块
  删除任务无关,那个任务的产出(如 packages/api/src/salary/ 整目录、data/seed/salary_data.json 等)也一律
  不碰,如果发现工作区里已经有那类改动(未提交/已提交都可能),不要 revert 也不要顺手继续做,那不是本任务范围。
- **CompanyRegistryService 边界不合并**:packages/api/src/feed/company-registry.service.ts 的
  matchCompany()(月刊优先公司白名单精确匹配)与本任务/T6 要共用的公司名归一化(模糊匹配,服务模拟面试/
  投递详情候选)是两套不同用途的东西,只读参考不改,不允许"顺手统一成一套"。
- **follow-up 后端能力只复用不重写**:follow-up.service.ts 的 generate()/buildPrompt() 核心结构与既有归属
  校验模式不允许推倒重写,只允许让前端把真实 company/role/stage 拼进 interview_details 参数(或最小化地让
  service 在已查到的 application 结果里取值拼接,二选一都行,但不能借机重构整个文件)。
- 本轮范围就是 T5 文档定的这些;不顺手做 T1(导航重组)/T2(月刊)/T3(职业维基)/T4(稳定性加固)/T6(博查
  搜索本体)范围内的事;发现顺手能干的活写进交付报告的遗留问题,不擅自动手。

## 四、循环依赖提示(架构注意事项,不这样写会互相 import 成环)
cover-letters/mock/interviews 三个模块各自新增 imports:[ApplicationsModule](ApplicationsModule 已经
exports:[ApplicationsService,StrategyService],直接照抄 follow-up.module.ts 现有写法即可)去调用归属校验。
**反过来,ApplicationsModule 不要 import 这三个消费方模块**(否则和它们对 ApplicationsModule 的依赖成环)。
新增的 related/link/suggestions 逻辑放在 ApplicationsModule 域下新建一个 service(比如
application-links.service.ts),直接对 Interview/MockSession/CoverLetter/ResumeVersion(如 T6 已落地还有
CompanyResearch)这些实体做 TypeOrmModule.forFeature 二次注册,注入独立 Repository 读写——这不是野路子,
仓库里 interviews.module.ts 与 speech.module.ts 已经是同一个 Interview/InterviewTranscribeTask 实体分别
forFeature 各自拿 Repository 的先例,直接抄这个模式。

## 五、T6/T1 依赖识别(执行时用实时代码判断,不要凭本简报的静态描述猜)
- T6(company_research 实体,packages/api/src/company-research/)如果尚未落地:company_research_id 列本身
  可以正常加(nullable 外键式软引用不要求目标表此刻就有数据,但**建表关系需要 company_research 表已存在
  才能建真正的外键约束**——如果表不存在,这一列先做成不带 FK 约束的纯 nullable 列,related 响应里
  company_research 字段固定返回 null,link 的 type=company_research 分支与前端公司背景区块一并 SKIP,在
  交付报告里写清楚"T6 未落地,以下 N 项 SKIP,待 T6 合并后补上",不许伪造一个 company_research 实体/表来
  让自己的代码编译通过。
- T1(导航重组,含删除 packages/web/src/app/(main)/follow-up/ 独立页)如果尚未执行,该页可能还在——不影响
  本任务:直接参考它现有的表单字段/校验逻辑抽成可嵌入详情页的组件即可,不需要等它被删除;如果已经被删除,
  从 follow-up.controller.ts 的 GenerateFollowUpDto(scenario/application_id?/interview_details?/contact?)
  逆推表单字段。
- 两个依赖是否就绪都要在侦察清单里明确写出结论,不许跳过不提。

## 六、测试基线与命令(两套 jest 配置分别覆盖不同文件,只跑一套会漏另一半)
- packages/api/jest.config.json:testRegex 只匹配 .spec.ts 结尾(不含 e2e-spec),覆盖单测与
  *-migration-smoke.spec.ts 这类结构冒烟测试。命令:cd packages/api && npx jest --runInBand。
- packages/api/test/jest-e2e.json:testRegex 匹配 .e2e-spec.ts 结尾,覆盖 applications/interviews/
  cover-letters/mock-sessions/follow-up 等全部现有 e2e 用例(e2e 用内存 sqlite,不需要真实 Postgres)。
  命令:cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit(或等价 pnpm --filter
  @coach/api test:e2e)。
- migration 命名约定(deploy/README.md §2.1):文件名 <毫秒时间戳>-<PascalCase 描述>.ts,类名同名加时间戳,
  放 packages/api/src/database/migrations/,时间戳取当前目录最大值之上;改完新写一个
  packages/api/test/<描述>-migration-smoke.spec.ts(参考现有 credit-migration-smoke.spec.ts 写法:
  QueryRunner 录制 SQL 断言 up()/down() 内容,不需要真实数据库)。
`

// ── 侦察 ───────────────────────────────────────────────────────────────────
phase('侦察')
const RECON_PROMPT = `你是只读侦察代理。仓库 E:\\Agent program\\HRBP,基线分支 dev(先 git status 确认干净/记录当前有什么未跟踪或未提交的东西,不要碰它们)。

任务:为「T5 投递追踪二级页」产出一份精确到可执行的当前执行清单。

必读:
1) docs/refactor2/T5-application-detail.md 全文(设计定稿+审计校准两节是重点)。
2) 下面的简报(设计+审计+红线的摘要,以文档原文为准,冲突以文档为准):

${BRIEF}

3) 用 Grep/Read 核对实时代码,简报里给的文件路径与行号是撰写时坐标,可能已漂移,一律以你此刻读到的内容为准。
   至少确认以下每一条现状(现状描述如与简报不符,以你读到的为准,并在清单里注明"与简报不符,实际是……"):
   - packages/api/src/mock/entities/mock-session.entity.ts 的 application_id 列定义、mock.service.ts
     create() 写入该字段处、mock.module.ts 的 imports。
   - packages/api/src/cover-letters/entities/cover-letter.entity.ts 的 application_id 列定义、
     cover-letters.service.ts 的 generate()/regenerate()、cover-letters.module.ts 的 imports。
   - packages/api/src/interviews/entities/interview.entity.ts 的 application_id 关系定义(应已是真外键)、
     interviews.service.ts 的 create()/update()、interviews.controller.ts 与 service 的 GET 相关方法。
   - packages/api/src/applications/entities/application.entity.ts 全部字段(尤其 salary_range 在第几行)、
     applications.module.ts 的 imports/exports、applications.service.ts 的 assertOwnedRefs。
   - packages/api/src/follow-up/follow-up.service.ts 的归属校验模式与 buildPrompt()。
   - packages/api/src/resumes/entities/resume-version.entity.ts 是否有 user_id 列(用于判断归属校验怎么写)。
   - packages/api/src/company-research/ 目录是否存在(T6 是否已落地)——存在的话进去看它的归一化函数在哪个
     文件、叫什么名字、entity 长什么样;不存在就在清单里明确写"T6 未落地"。
   - packages/web/src/app/(main)/follow-up/ 是否还存在(T1 是否已执行到删这一页)。
   - packages/web/src/components/tracker/ 下 application-card.tsx 的点击处理、application-timeline.tsx
     现在被谁引用、kanban-board.tsx/application-form.tsx/tracker-stats.tsx 里的阶段标签硬编码写法、
     packages/web/src/components/onboarding/onboarding-surfaces.tsx 里的复制处。
   - packages/web/src/app/(main)/applications/page.tsx 里 StrategyPanel 组件定义与 applications 状态。
   - packages/web/src/app/(main)/cover-letter/page.tsx 的 TODO 注释与 handleGenerate()。
   - packages/api/src/database/migrations/ 目录当前最大时间戳文件名(给新迁移定序号用)。
   - packages/api/test/ 下 applications.e2e-spec.ts / interviews.e2e-spec.ts / cover-letters.e2e-spec.ts /
     mock-sessions.e2e-spec.ts / follow-up.e2e-spec.ts 是否存在(现有基线,不要假设不存在就整体新写)。

产出格式(纯文本,不要用 JSON):
- 按"数据打通/聚合API/link与建议/前端详情页/审计校准补项/测试"六个小节,每节内逐条列:
  文件路径 / 内容锚点(给可 grep 的独特字符串,不止行号) / 改法一句话 / 该条的 verify 方式。
- T6/T1 依赖就绪情况单独写一段结论(就绪/未就绪+证据)。
- 目标内容确实不存在、或与简报描述矛盾到无法照办的条目,标注"[缺失-需人工]"并说明看到的实际情况,不要替
  它凭空编一个解决方案。
- 末尾列一份"红线与同名陷阱清单"(直接摘 BRIEF 第三、四节,加上你侦察中新发现的任何同名/易混淆点)。
- 你不改动任何文件,纯只读产出这份清单文本作为你的最终回复。`

const checklist = await agent(RECON_PROMPT, { label: 'recon:t5-app-detail', phase: '侦察', model: 'sonnet' })
if (!checklist) throw new Error('侦察代理未返回,中止后续实现')

// ── 实现:后端 → 前端 串行 ───────────────────────────────────────────────────
phase('实现')

const IMPL_BACKEND_PROMPT = `你是实现代理,只做后端。仓库 E:\\Agent program\\HRBP。

${BRIEF}

## 侦察产出的执行清单(照此逐条做,清单与简报冲突时,清单里的实时坐标优先;清单与简报都不清楚的地方按简报的
"设计定稿/审计校准/红线"原则判断)
${checklist}

## 操作规程
- 先 git status 确认工作区状态(工作区里可能已有其它任务的未跟踪/未提交改动,那不是你的,不许 stage、不许
  清理、不许 revert)。检查分支 feat/t5-app-detail 是否已存在:不存在则基于 dev 创建并切换;已存在则
  git log 看它最近几条提交是不是本任务(T5/application/interview/cover-letter/mock 相关)产物,是就直接切
  过去继续、不要用 dev 重新分支覆盖;明显是别的任务遗留就停下来报告不要动。就在主工作区做,不新开 worktree。
  另注:工作区里已跟踪文档类改动(docs/、CLAUDE.md、.claude/ 下)同未跟踪杂物一样不是你的,如实记录后继续
  即可,不算脏;packages/ 代码文件有未提交改动才停下报告。
- 增量提交铁律(防配额中断全损;2026-07-03 实证教训:另一任务曾三次单窗烧尽 300k+ token 且零提交,全部
  白干):若上一步判定是续跑,先 git diff dev...HEAD --stat 对照清单做缺口分析,只做未完成部分,不许重做
  已完成的、不许 revert 半成品重来;每完成清单一个条目(或一组强耦合条目,如"实体+migration"一组)立即
  git add 涉及文件(逐路径,不用 -A)并 commit(message 可用 "wip(t5-app-detail): <条目>",最后不必整理
  历史)。不许攒到最后一次性提交——配额中断时,已提交的就是断点,没提交的就是白干。
- 只做后端:migration + entity + service(mock/cover-letters/interviews/applications 四处)+ module 的
  imports/exports 调整 + 新的 related/link/link-suggestions 端点(挂在 applications 域下,遵照 BRIEF 第四节
  的循环依赖提示,不要让 ApplicationsModule 反向 import 三个消费方模块)+ e2e/单测。
- 只许改:packages/api/src/applications/**、packages/api/src/mock/entities/mock-session.entity.ts、
  packages/api/src/mock/mock.service.ts、packages/api/src/mock/mock.module.ts、
  packages/api/src/cover-letters/entities/cover-letter.entity.ts、
  packages/api/src/cover-letters/cover-letters.service.ts、
  packages/api/src/cover-letters/cover-letters.module.ts、
  packages/api/src/interviews/interviews.service.ts、packages/api/src/interviews/interviews.module.ts、
  packages/api/src/interviews/interviews.controller.ts、packages/api/src/interviews/dto/**(如需新增投影
  DTO)、packages/api/src/database/migrations/(新增文件)、packages/api/src/common/**或等价共享位置(如需
  新建公司名归一化 util)、packages/api/test/**(仅新增/扩展与本任务相关的 spec 与 e2e-spec)。
  例外(仅限这一种情况):如果 T6 已落地且归一化函数现在定义在 packages/api/src/company-research/ 内某个文件
  里,允许对**那一个定义归一化函数的文件**做最小改动——把函数体挪到 common/共享位置后,原文件只保留一行
  re-export/import 调用,不许顺手改该文件里的其它逻辑;company-research 目录下的其它文件仍不许碰。
- 禁止触碰:packages/api/src/diagnoses/**、packages/api/src/ai/ai.service.ts 的流式/限流器/watchdog 部分、
  packages/api/src/salary/**与 data/seed/salary_data.json(另一任务正在删除,工作区里若已有相关改动/删除
  痕迹不要碰、不要恢复、不要继续做)、packages/api/src/feed/company-registry.service.ts(只读参考不改)、
  T1/T2/T3/T4/T6 范围内的其它文件(上面那条归一化函数搬家的例外除外)、任何 packages/web/** 前端文件(下一步
  交给前端代理)、docs/ 下任何 md、.env*、已存在的其它 migration 文件。
- BRIEF 第三节红线与第四节循环依赖提示、第五节 T6/T1 依赖识别逐条遵守;company_research 相关项如清单标注
  [缺失-需人工]就 SKIP 并写清原因,不许伪造实体。
- 每改一处先 Read 确认内容与清单描述一致再动手;遇到清单描述与实际代码矛盾到无法判断怎么改,停在该条,
  报告不猜。
- 自验(全部跑完,原始输出附在最终回复里):
  1) cd packages/api && npx tsc --noEmit(编译探针,不是测试)。
  2) cd packages/api && npx jest --runInBand(覆盖 .spec.ts,含你新写的 migration-smoke,必须全绿)。
  3) cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit(覆盖全部 .e2e-spec.ts;必须全绿,
     贴 passed/total 摘要;至少要新增覆盖:mock/cover-letters/interviews 三处越权写入 403、interviews GET
     不泄露他人字段、related/link/link-suggestions 的正常与越权路径)。
  4) 残留自查:git grep 确认没有改动 salary_range 字段定义、没有碰 company-registry.service.ts、没有对
     company_research 套用"属于当前用户"式校验代码。
  5) 只提交本次改动的后端文件:git add 逐路径,git commit -m 一句话说明。
- 最终回复=交付报告:BRIEF 每条逐条 DONE/SKIP(附原因,SKIP 必须可核实不是偷懒)、四条自验的原始输出关键段
  (失败贴完整错误)、commit hash、git diff --stat、以及一段"给前端代理的 API 形状说明"(related/link/
  link-suggestions 三个端点最终的请求体/响应体字段,精确到字段名,前端要照这个对接,不能靠猜)。`

const implBackend = await agent(IMPL_BACKEND_PROMPT, { label: 'impl-backend:t5-app-detail', phase: '实现', model: 'sonnet' })
if (!implBackend) throw new Error('后端实现代理未返回,中止后续实现与验证')

const IMPL_FRONTEND_PROMPT = `你是实现代理,只做前端。仓库 E:\\Agent program\\HRBP,分支 feat/t5-app-detail
(后端代理刚提交完毕,先 git log -1 确认在该分支最新提交上,不要新建分支,不要基于 dev 重开)。

${BRIEF}

## 侦察产出的执行清单(照此逐条做前端相关部分)
${checklist}

## 后端实现代理交付报告(据此对接真实 API 形状,不要靠猜,若报告里某项标了 SKIP,对应前端区块要优雅降级,不
渲染或渲染诚实空态,不能假设字段一定存在)
${implBackend}

## 操作规程
- 增量提交铁律(防配额中断全损):开工先 git log --oneline dev..HEAD 认清已有提交(后端提交+可能存在的前端
  "wip(" 抢救性提交);若有前端半成品提交,先缺口分析只做剩余部分,不许重做、不许 revert。每完成一个前端
  改动点(如"详情页骨架""AI建议横幅""tracker-stages 抽取+六处替换"各算一个)立即 git add 涉及文件(逐路径)
  并 commit(可用 "wip(t5-app-detail): <条目>" 前缀)。不许攒到最后一次性提交——配额中断时,已提交的就是
  断点,没提交的就是白干。
- 只做前端:详情页新建、看板卡片点击行为改造、编辑弹层与时间线组件搬移复用、AI 建议横幅(仅用户点击"采纳"
  才调用 link 接口,不允许自动生效)、聚合区块与手动关联选择器+每条已关联记录的"取消关联"按钮(调用 PATCH
  link 的 action:'unlink')、删除投递入口、StrategyPanel 预填、跟进消息面板嵌入(真实 company/role/stage,
  不传裸 UUID)、lib/tracker-stages.ts 抽取与六处消费点改造、求职信生成表单简历选择器+resume_id(+从详情页
  进入时的 application_id)。
- 只许改:packages/web/src/app/(main)/applications/**(含新建 [id]/page.tsx)、
  packages/web/src/components/tracker/**、packages/web/src/components/onboarding/onboarding-surfaces.tsx、
  packages/web/src/lib/tracker-stages.ts(新建)、packages/web/src/lib/api.ts(如需新增接口调用封装)、
  packages/web/src/app/(main)/cover-letter/page.tsx、packages/web/src/lib/types.ts(如需为新接口补类型,
  不许动无关类型定义)。若 packages/web/src/app/(main)/follow-up/ 仍存在且其表单逻辑需要参考,只读借鉴,
  是否删除该页属于 T1 范围,不在本任务内动手删除或修改它。
- 禁止触碰:packages/api/**(后端已完成)、packages/web/src/app/(main)/salary/**(另一任务范围)、T1/T2/T3/
  T4/T6 范围内的其它前端文件、docs/ 下任何 md、.env*。
- BRIEF 第三节红线逐条遵守,尤其"AI 建议不自动生效"——采纳动作必须是用户点击触发的显式调用。
- 自验(原始输出附最终回复):
  1) cd packages/web && npx eslint src/ —— 必须 0 错误。
  2) cd packages/web && npm run build —— 必须通过,贴构建输出的路由清单,确认包含 /applications/[id]。
  3) 残留自查:git grep 确认阶段标签抽取后原六处硬编码不再各自定义一份(改为 import 共享常量),AI 建议横幅
     的采纳逻辑确实挂在按钮 onClick 而不是 useEffect。
  4) 只提交本次改动的前端文件:git add 逐路径,git commit -m 一句话说明。
- 最终回复=交付报告:BRIEF 前端相关每条逐条 DONE/SKIP(附原因)、三条自验的原始输出关键段(失败贴完整
  错误)、commit hash、git diff --stat。`

const implFrontend = await agent(IMPL_FRONTEND_PROMPT, { label: 'impl-frontend:t5-app-detail', phase: '实现', model: 'sonnet' })
if (!implFrontend) throw new Error('前端实现代理未返回,中止后续验证')

// ── 验证:质量门 与 只读审计 并行 ─────────────────────────────────────────────
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

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,切到分支 feat/t5-app-detail(先 git log -2
确认在后端+前端两次提交之上)。逐门跑,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事)。
不改任何代码,挂了如实 FAIL,不许自己修。

${BRIEF}

## 质量门清单
1) cd packages/api && npx tsc --noEmit —— 编译探针,必须无错。
2) cd packages/api && npx jest --runInBand —— 覆盖 .spec.ts(含新的 migration-smoke),必须全绿。注意必须
   从 packages/api 目录跑,从仓库根跑会走 babel-jest 报 TS 语法错,那是环境坑不是代码错,不要误判为实现有问题。
3) cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit —— 覆盖全部 .e2e-spec.ts,必须
   全绿(基线原有约 60 条不能倒退,新增的越权/关联用例逐条核实真的存在且通过,贴 passed/total 摘要)。不许用
   裸的 npx jest(不带这个 --config)代替这一步——.e2e-spec.ts 结尾的文件会被裸 npx jest 安静跳过(0 匹配不
   报错),那样跑出来"全部通过"是假通过。
4) cd packages/web && npx eslint src/ —— 必须 0 错误。
5) cd packages/web && npm run build —— 必须通过,贴路由清单,确认包含 /applications/[id]。
6) Playwright 桌面端全流程(找 bug 不是走过场):
   - 本机端口:web 3001 / api 3002(ports.env);本机数据库 Docker 容器 coach-postgres。验收一律用
     build+start,不用 dev 模式(dev 模式编译慢且吃内存)。
   - 步骤:cd packages/api && pnpm migration:run(把新迁移应用到本机库,本机库无真实用户数据可以直接跑)
     → pnpm build:api && pnpm build:web(仓库根跑)→ 分别 start 两个服务并等待就绪。
   - 登录:本机 packages/api/.env 已有 DEV_LOGIN=1,走 POST /api/auth/dev-login(body {email},对已存在邮箱
     幂等发 token、不存在则新建用户,不会碰真实短信/邮件验证码)。写法照抄
     packages/web/e2e/credit-full-flow.spec.ts 里的 devLogin()+setToken()(固定邮箱如
     "pw2-t5-user@coach.dev",token 写进 localStorage 的 'token' 键)。不许尝试真实注册流程走邮箱验证码
     (拿不到验证码会卡死),不许自己发明另一套登录方式。
   - 用 Playwright 走:登录(见上)→ 用一个写死的固定测试公司名(如"T5-PW-测试公司",不要用随机值,保证可
     重复执行)先创建一条**未关联投递的模拟面试记录**
     (走现有模拟面试创建流程,只填公司名,不选投递)——这一步是为了保证下面的 AI 建议横幅一定有候选,不是可
     选步骤 → 再用同一个公司名创建一条投递 → 打开该投递详情页 → 确认 AI 建议横幅出现且候选包含刚才那条模拟
     面试记录,点击采纳,确认对应聚合区块出现该记录 → 对该记录点"取消关联",确认从区块消失 → 在详情页内生成
     一条跟进消息成功(不是裸 UUID 报错)→ 点删除投递,确认真的删除并跳回看板 → 回到看板验证原有拖拽换阶段/
     统计数字功能仍正常(回归,不能被本任务改坏)。若按上述步骤操作后 AI 建议横幅仍未出现候选,判这一门 FAIL
     并贴清楚是撮合逻辑没做还是前端没渲染,不许跳过这条断言。
   - 若本机 5432 被 Windows winnat 吞了绑不上,按项目手册处理(net stop winnat →
     netsh int ipv4 add excludedportrange protocol=tcp startport=5432 numberofports=1 → net start winnat)
     后重试;若 docker/环境本身不可用导致这一步跑不起来,如实 FAIL 并写清楚卡在哪一步、报错原文,不要用
     "应该没问题"代替真跑。
7) 残留复扫:git grep 确认 applications 实体的 salary_range 字段未被改动;
   git grep company-registry.service.ts 确认其归一化逻辑未被合并/篡改;
   git grep 确认对 company_research 的 link/related 代码里没有出现"target.user_id === userId"这类校验
   (company_research 无 user_id 列,出现这种代码要么编译不过要么逻辑恒假,判 FAIL)。
不改任何代码。实现背景:cover_letters/mock_sessions/interviews 三处 application_id 写入路径新增了归属
校验,interviews GET 做了 DTO 投影/relations 收窄,applications 新增 resume_version_id/company_research_id
两个软引用字段与 related/link/link-suggestions 三个端点,前端新增 /applications/[id] 详情页。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP,审计分支
feat/t5-app-detail 相对 dev 的完整 diff(git diff dev...feat/t5-app-detail)。不改任何文件。

${BRIEF}

## 后端/前端实现代理各自的交付报告(仅供你核对下面"报告里的理由是否可核实"用,报告是自述,不代表已验证正确
——一切以你自己读到的 diff/代码/仓库实时状态为准,报告与实际 diff 不符本身就是一条发现)
### 后端实现报告
${implBackend}
### 前端实现报告
${implFrontend}

## 对照下面逐条核(每条给 file:line,漏做/做错都要点名)
一、数据打通四项(mock_sessions 补 FK+relation+归属校验;cover_letters 补 FK+relation+归属校验;interviews
   只补归属校验不重复加 FK;applications 加 resume_version_id/company_research_id 两个 nullable 软引用,
   存量行是否被误回填——检查 migration 是否有对已有行的 UPDATE 写死值,防御性"置 NULL 脏外键"不算回填,
   写死具体业务值才算)。
二、聚合/link/建议三个端点是否按简报形状实现,尤其:
   - GET related 是否先过 ApplicationsService.findOne(id,userId) 再查关联表,各表查询是否都带上归属限定
     (resume_versions 是否正确经 resume_id 反查 user_id,而不是凭空当它有 user_id 列)。
   - PATCH link 的 type 分支里,company_research 是否被错误套上了"属于当前用户"式校验(这是本任务最容易
     踩的坑,套了就是 bug);unlink 是否校验了 target 当前确实挂在这个 application 上,而不是只查了归属。
   - link-suggestions 是否只返回候选、后端零写库;归一化函数是否复用/共享而不是另起一份复制。
三、审计校准六项逐条核对(cover_letters/interviews 归属校验用没用 follow-up.service.ts 同款"NotFound/
   Forbidden 归一"模式;interviews GET 是否真的做了 DTO 投影或收窄 relations——实测看 controller/service
   返回值结构,不能因为文件里出现了"DTO"字样就轻信;StrategyPanel 是否接了 applications 列表预填;follow-up
   面板是否传了真实 company/role/stage 而不是裸 application_id;tracker-stages.ts 是否真的被六个消费点
   import 而不是又加了一份;cover-letter 表单是否传了 resume_id/application_id)。
四、前端详情页:卡片点击是否真的跳转详情页(不是仍打开旧编辑弹层);编辑弹层组件是否复用而非重写;
   ApplicationTimeline 搬移后原弹层是否清理干净没留死引用;AI 建议横幅采纳逻辑是否挂在显式用户点击而非
   useEffect/挂载时自动调用;每个聚合区块是否有手动关联选择器;每条已关联记录是否有"取消关联"按钮且确实调用
   action:'unlink';空状态文案是否诚实(没有编造假数据)。
五、红线扫描(全部 blocking):
   - applications 实体 salary_range 字段是否被误改/重命名/删除。
   - packages/api/src/feed/company-registry.service.ts 是否被合并/篡改。
   - follow-up.service.ts 的 generate()/buildPrompt() 核心结构与既有归属校验模式是否被整体重写(允许最小
     化改动让它拼进真实上下文,不允许推倒重来)。
   - salary 模块相关文件(packages/api/src/salary/**、data/seed/salary_data.json 等,那是另一个任务的删除
     范围)diff 里是否出现进一步改动——出现即 blocking,说明误碰了别的任务范围。
六、循环依赖:ApplicationsModule 是否被迫 import 了 interviews/mock/cover-letters 模块导致环形依赖(检查
   packages/api/src/applications/applications.module.ts 的 imports);如果确实成环但用 forwardRef 硬顶,
   记为 major(能跑但不优雅),不算 blocking。
七、T6/T1 依赖处理是否诚实:company_research 相关项如果 SKIP,报告里的理由是否可核实(真的查不到该模块),
   有没有为了"看起来完成"而伪造字段/编造实体导致代码实际编译不过或运行时必然报错。
八、范围外改动:diff 里任何不在本简报范围内的文件都要点名(尤其检查有没有顺手碰 T1/T2/T3/T4/T6 范围或
   docs/ 下的文档);唯一允许的例外是:若 T6 已落地,company-research 模块内原定义公司名归一化函数的那一个
   文件被改成把函数体挪去共享位置、原处只留 re-export/import——这一处改动不算违规,但如果该文件里出现了
   函数体搬家以外的其它逻辑改动,仍要点名。`

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t5-app-detail', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t5-app-detail', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  backend_impl_report: implBackend,
  frontend_impl_report: implFrontend,
  gates,
  review,
}
