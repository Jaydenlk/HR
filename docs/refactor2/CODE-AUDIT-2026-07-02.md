# 代码审计档案 2026-07-02(二次重构执行前全仓现状审计)

来源:代码审计 workflow(59 agents,分区扫描 + 对抗核实两阶段)。原始发现 51 条,对抗核实后确认 51 条、证伪 0 条。本档案 51 条全部照录,每条压缩为要点;51 条 verdict.isReal 全部为 true。

## 统计

| 维度 | 数值 |
|---|---|
| 总数 | raw 51 / confirmed 51 / rejected 0(实际解析 5+23+23=51,与 stats 一致) |

按 severity:

| severity | 条数 |
|---|---|
| blocking | 5 |
| major | 23 |
| minor | 23 |

按 category:

| category | 条数 |
|---|---|
| halfwired(半接线) | 14 |
| guard(护栏缺失) | 12 |
| duplicate(重复实现) | 12 |
| glue(胶水/复制粘贴) | 7 |
| dead(死代码) | 6 |

按 scanner:

| scanner | 条数 |
|---|---|
| hunt-dead | 9 |
| api-mock | 8 |
| web-shared | 8 |
| api-apps | 6 |
| api-feed | 6 |
| web-pages | 5 |
| hunt-dup | 5 |
| api-ai | 4 |

转录说明(数据如实报告):
- major 第 8 条(M8)原始 JSON 缺 `line` 字段,只有 file 与 claim,照实标注。
- 多扫描器独立发现导致的重复条目均照录未去重:B3/B5(头像裸 key)、m11/m19(ops-events 死端点)、B2/M12(cover_letters 归属校验)、B4/M2(interviews 归属校验)、M11/m21′(cover-letter 不传 resume_id,见 M21)。
- 个别 verdict 对原始断言细节有订正(如 M6 的 5 处实为 4 处、M15 的举例分数、m17 的文件计数),已在对应「核实」里如实转录,不影响结论成立。

---

## 一、blocking(5 条)

### B1. packages/api/src/diagnoses/diagnoses.service.ts:251
- claim:校招/JD 流式诊断管线用 ConcurrencyLimiter.runObservable 占外层槽位后,其内部 work() 会触发 AiService 对同一个 ConcurrencyLimiter 单例做第二次 acquire,达到 AI_MAX_CONCURRENCY(默认 2)时会自锁,只能靠 600s 管线超时兜底,用户体验为"卡 10 分钟后报错"。
- guard | blocking | scanner: api-ai | isReal: true
- 核实:外层 runObservable(diagnoses.service.ts:251-259)占槽后,work() 经 analyzer/rewriter 调 AiService 在 ai.service.ts:490/674 对同一单例(AiModule 唯一 provider,Nest 默认单例)二次 acquire;默认并发 2 时只需 2 个并发诊断即 100% 必现死锁,唯一解锁是 600s 管线超时,且超时只清外层槽,内层僵尸 waiter 仍留队列污染后续排位。
- suggestion:并入 T4——把 D1 从"待审计"直接标记为已确认 FAIL,作为该任务最高优先修复项;修法可考虑给 AiService 内层调用加 skipLimiter 透传,或拆成"pipeline 槽"与"AI 调用槽"两个独立 limiter 池。

### B2. packages/api/src/cover-letters/cover-letters.service.ts:73
- claim:求职信生成/重新生成时,application_id 只被原样存库,从不校验是否属于当前用户——与 applications.service.ts 的 assertOwnedRefs 纪律、以及 T5 文档里专门给 mock_sessions 补的『写入时归属校验』不对称,同一类洞在 cover_letters 上被漏掉。
- guard | blocking | scanner: api-apps | isReal: true
- 核实:generate()(73 行)/regenerate()(104-120 行)对 application_id 原样落库、零归属查询;模块未 import ApplicationsModule,结构上就不具备校验能力;同一 DTO 的 resume_id 却有 findOne(id,userId) 校验。真实 IDOR:任何登录用户可把求职信挂到他人投递记录上。T5 文档对 cover_letters 只写"补真外键",FK 不等于归属校验,会被实现者照抄执行。
- suggestion:并入 T5——cover_letters.application_id 写入(generate/regenerate)时按 assertOwnedRefs 模式补归属校验(比照 follow-up.service.ts:187-199),不能只加外键;T5 文档改动清单需显式补上这一句。

### B3. packages/api/src/users/me.service.ts:78
- claim:头像上传返回的 avatar_url 是裸存储 key(如 avatars/uuid.jpg),不是可访问 URL;全站没有任何路由/静态服务/反代规则能把它解析成可加载的图片,上传后头像必现裂图。
- glue | blocking | scanner: hunt-dup | isReal: true
- 核实:files.service.ts:25 生成裸 key;前端 layout.tsx:460、me/page.tsx:304 裸 `<img src>` 直用;唯一下载端点 GET /files/download 需 Bearer 头且前端零调用(裸 img 标签原理上带不了认证头);Caddyfile 无静态映射,请求必落 Next.js 404。该模式注释自陈抄自 resume.file_url——一个从未被写入过的死字段。
- suggestion:单列新项(或并入 T4 hardening):让 /me/avatar 返回真实可访问 URL(经 /api/files/download/... 或对象存储直链);同时清理 resume.file_url 死字段,别让下一个功能继续抄错误模板。

### B4. packages/api/src/interviews/interviews.service.ts:144
- claim:interviews/cover-letters/mock-sessions 写入 application_id 均无归属校验,且 interviews 一侧因 @ManyToOne 关系+findAll 未做 DTO 投影,会把伪造 application_id 指向的他人 Application 全字段(notes/salary_range/referrer/deadline/location)直接回传给攻击者;T5 重构计划已知悉 mock_sessions 越权洞但未覆盖 interviews 与 cover-letters 的同类缺口。
- guard | blocking | scanner: hunt-dup | isReal: true
- 核实:create()(144 行)无校验,UpdateInterviewDto 也带 application_id 故 PATCH 同为越权入口;findAllByUser/findOne `relations:{application:true}` 全量预加载 + controller 无 DTO 投影、全仓无 ClassSerializerInterceptor,他人 Application 隐私字段整条回传,可直接复现的 BOLA/IDOR。T5 文档把 interviews 标"真外键"视为已完备,完全遗漏泄露路径。
- suggestion:并入 T5 但扩大覆盖面:interviews.service.ts / cover-letters.service.ts 的 create(及 update)补 follow-up 同款归属校验;并核查 interviews GET 端点改 DTO 投影而非裸传实体。

### B5. packages/api/src/users/me.service.ts:80
- claim:头像上传接口全链路"成功"但头像永远无法显示:返回的 avatar_url 只是存储 key,不是可访问 URL,且没有任何静态文件服务/下载路由把它接起来。
- halfwired | blocking | scanner: hunt-dead | isReal: true
- 核实:与 B3 同一问题的另一扫描器独立发现。main.ts 无 useStaticAssets/express.static,next.config.ts 无 rewrites,前端两处裸 `<img src>` 会把 key 当相对路径请求必 404;上传写盘、入库、返回 200 全"成功"但图片永远裂。静态挂载修复需注意 files.controller 现有 assertOwner 属主校验会被绕过,要重新设计 ACL。
- suggestion:并入 T4 技术债清偿:avatar_url 拼成 `/api/files/download/${key}` 并让前端走该端点,或加静态文件服务;线上已有真实用户在用,建议优先级提前于 T4 常规顺序单独热修。

---

## 二、major(23 条)

### M1. packages/api/src/diagnoses/diagnoses.service.ts:305
- claim:diagnoses 与 conversations 两个实际在用的流式端点失败时从不写 ops_events AI_CALL_FAILED,导致 /admin/success-stats、/admin/recent-failures 完全遗漏这两类端点的失败请求,与项目里已有的 interviews 模块处理方式不一致。
- halfwired | major | scanner: api-ai | isReal: true
- 核实:recordFailure()(305-343)全函数无 opsEvents 调用;conversations.service.ts:199-201/220-227 错误分支只 yield 错误帧;对照 interviews.service.ts:366-389 有显式 AI_CALL_FAILED 记录;两端点 controller 特意未挂 AiUsageInterceptor 故无外层兜底;admin.service.ts 成功率统计只认 AI_CALL_FAILED。
- suggestion:并入 T4:在 recordFailure() 与 streamMessage 错误分支补记 opsEvents.record('AI_CALL_FAILED',...),复用 isAiCallFailure 判定,对齐 interviews 写法。

### M2. packages/api/src/interviews/interviews.service.ts:144
- claim:interviews.create() 与 update() 把 dto.application_id 原样写入/Object.assign,从不校验该 application 是否属于当前用户;cover-letters.generate() 同款漏洞。T5 设计文档只点名修 mock_sessions 的这个洞,interviews/cover_letters 的同类洞会被漏掉。
- guard | major | scanner: api-mock | isReal: true
- 核实:create() 144 行/update() 185 行均无归属校验;assertOwnedRefs(applications.service.ts:36-52)未被复用;cover-letters.service.ts:73 同款;T5 文档第 11/20/21 行只点名 mock_sessions;三模块均无 application_id 回归测试。与 B4 同题。
- suggestion:并入 T5:数据打通改动清单扩大到 interviews.create/update 与 cover-letters.generate,否则 T5 新建 link/related 接口建在仍可被污染的关联面上。

### M3. packages/api/src/mock/mock.service.ts:97
- claim:generateQuestions 出题时用于'防编造'的 confirmed_company_info 完全由前端在 create() 请求体里回传,后端从未校验它是否等于 checkCompany() 真正返回过的搜索结果,用户可绕过前端直接调 API 塞任意'来源可信'的公司简介进 prompt。
- guard | major | scanner: api-mock | isReal: true
- 核实:checkCompany() 不生成 token/候选 id 也不落库;ConfirmedCompanyInfoDto 四字段只有字符串/长度校验;create()/generateQuestions() 把 confirmed 直接当已核实来源写进防编造 prompt,全程无反查。
- suggestion:并入 T6:company_research 落库后,前端回传候选 id/hash 而非原始字段,后端按 id 查库取真实候选内容拼 prompt,杜绝客户端伪造已验证公司背景。

### M4. packages/api/src/mock/mock.controller.ts:76
- claim:语音模式读题端点 question-audio 每次调用都重新调用付费的 StepFun TTS 合成,无缓存、无 CreditGuard/计费,仅靠全局 IP 限流兜底,同一题可被反复触发无限次真实合成。
- guard | major | scanner: api-mock | isReal: true
- 核实:questionAudio 只挂 JwtAuthGuard(74 行注释自认"不计费"),对比同文件三个端点全挂 CreditGuard+拦截器;synthesizeQuestion 无 session+题号缓存;speech limiter 只是并发护栏。"无限次"略夸张——受全局 120 次/60s 软约束。
- suggestion:并入 T4(防接口滥用):加同 session+题号的合成结果缓存,或对该端点加轻量会话级节流。

### M5. packages/api/src/applications/strategy.service.ts:55
- claim:『AI结果信封』(skill_name/skill_version/confidence 枚举/evidence_used/recommendations/risks/next_actions/follow_up_questions/cannot_determine + 对应 JSON Schema 片段 + VALID_CONFIDENCE 集合)在本分区至少 5 个文件里逐字重复手写,无共享类型/schema builder,六个重构任务都未覆盖这块技术债。
- duplicate | major | scanner: api-apps | isReal: true
- 核实:strategy/follow-up/offer-comparator/salary-analysis/city-industry-fit 五个 service 字段与枚举逐字一致,confidence 枚举全仓命中 9 处;无 AiResultEnvelope 共享类型;salary-analysis.dto 已缺 3 字段,字段漂移已发生;T3/T4/T5/T6 文档均未覆盖。
- suggestion:并入 T4(或单列新项):抽共享 AiResultEnvelope 基础类型 + VALID_CONFIDENCE 常量 + schema builder,9 处替换为复用。

### M6. packages/api/src/applications/dto/application-strategy.dto.ts:48
- claim:投递策略(applications/strategy)、Offer 比对、跟进消息、薪资分析、城市-行业契合度这 5 个 AI 功能,后端都按 system prompt 要求 AI 输出 evidence_used(证据锚定,防编造用),但前端全部 5 处都没有渲染这个字段——AI 算了但用户永远看不到。
- halfwired | major | scanner: api-apps | isReal: true
- 核实(verdict 订正:4/5 属实):投递策略/Offer 比对/跟进消息/城市契合度四个前端页面 grep evidence_used 零命中;薪资分析实际无该字段(用 data_sources 且已渲染),审计引用行号错位;industry-trend/learning-roadmap 页面有 EvidenceList 消费模式,证明是 4 个存活功能漏接而非不可行。
- suggestion:单列新项或并入 T4,二选一:前端补渲染(迁移 EvidenceList 组件),或确认不需要后从 schema 删掉 evidence_used 省高频调用的输出 token。

### M7. packages/api/src/feed/feed.controller.ts:49
- claim:管理员专用的 feed/import 与 feed/digest 端点错误地挂了面向 C 端用户的 CreditGuard+CreditInterceptor,导致每次点击都从操作它的管理员本人的 credit_balance 里扣 1 点,而不是走平台运营成本。
- guard | major | scanner: api-feed | isReal: true
- 核实:feed.controller.ts:49-51/61-63 两处均挂 AdminGuard+CreditGuard+两拦截器;AdminGuard 只验角色不换账号,credit 服务无 admin 豁免;对照 admin-announcements.controller 同为管理员触发 AI 却不叠加 Credit;digest-generator 确认真实调 AI 触发扣点。
- suggestion:并入 T2:重做月刊摄入/生成流程时去掉这两个端点上的 CreditGuard+CreditInterceptor,改为不消耗个人 credit 的运营操作;若沿用旧端点也要顺手摘掉。

### M8. packages/web/src/app/(main)/digest/page.tsx(原始 JSON 缺 line 字段)
- claim:/digest 页面对所有登录用户可见且不做角色判断,里面却渲染了仅管理员可用的数据源管理与「导入」按钮(后端 AdminGuard 强制 403),与全站既有的 admin 页面前端门控范式不一致。
- guard | major | scanner: api-feed | isReal: true
- 核实:全文件无角色判断;「导入来源」按钮(312-320 行)无条件渲染,普通用户点了吃 403 落到通用报错;admin/page.tsx:66 的门控写法未被复用。verdict 轻微修正:实际暴露的管理动作只有导入按钮+只读来源状态条,属体验不一致而非安全穿透(后端有硬 Guard)。
- suggestion:并入 T2:重做校招情报/月刊页面时,数据源管理+导入拆到管理员专属入口或对普通用户隐藏,对齐 /admin 门控模式。

### M9. packages/api/src/feed/digest-generator.service.ts:17
- claim:POST /feed/digest(AI 周刊生成,DigestGeneratorService.generateWeeklyDigest)已完整实现且挂了完整守卫链,但全仓库没有任何触发路径——无 @Cron、无前端调用、无 admin 面板按钮,是个建成即弃的半接线功能。
- halfwired | major | scanner: api-feed | isReal: true
- 核实:实现完整非空壳;全仓唯一调用点是 e2e 测试;唯一 @Cron(feed-ingestion)名叫 digest-daily-ingestion 但从未调 digestGenerator(命名误导);admin 面板 14 个组件 grep digest 零命中。
- suggestion:并入 T2:月刊重做时决定去留——接进新的周更流程,或连 digest-generator.service.ts 一起删除。

### M10. docs/refactor2/T4-hardening.md:16
- claim:T4 审计清单 D7(全局限流现状)和 D6(注册链路频控)把这两项当作待核实的未知状态派发审计 agent,但实际代码里全局限流与登录/发码端点级限流已经实现,继续按文档口径派发全量审计/重建会浪费一轮 agent 产能。
- duplicate | major | scanner: api-feed | isReal: true
- 核实:app.module.ts 已有全局 ThrottlerModule(120 次/60s)+APP_GUARD;auth.controller 发码 3/分钟、登录 10/分钟;auth.service 另有按邮箱 60s 重发冷却,均在 44d97dc 已完成。真实缺口:ThrottlerException 全仓零命中(限流命中不写 OpsEvent)、无 IP/邮箱维度登录失败封禁窗口。
- suggestion:并入 T4:D6/D7 审计范围从「是否存在」收窄为「补 OpsEvent 记录 + 登录失败封禁窗口」,避免重复实现已有限流。

### M11. packages/web/src/app/(main)/cover-letter/page.tsx:125
- claim:求职信生成从未把 resume_id / application_id 传给后端,前端 TODO 声称"待后端开放简历上下文入参",但后端早已完整支持并按简历定制文案——注释与现状不符,产品核心承诺(简历×JD 定制,不编造)长期空转成纯 JD 通用信。
- halfwired | major | scanner: web-pages | isReal: true
- 核实:handleGenerate() 只传 company/role/tone/length_words/jd_text,resume_id 全文件零出现;后端 DTO 与 service(简历读取→防编造 prompt 分支→落库)全链路就绪,纯前端未接。
- suggestion:并入 T5:生成表单加简历选择器传 resume_id;application_id 待 T5 详情页场景补上。

### M12. packages/api/src/cover-letters/cover-letters.service.ts:73
- claim:cover_letters.application_id 与已知反面教材 mock_sessions.application_id 是同一类缺陷(有字段无归属校验),但 T5 文档审计时只标注了'有字段无外键'、漏记归属校验缺失,写入路径完全绕开未来 link 接口的双向校验设计。
- guard | major | scanner: web-pages | isReal: true
- 核实:与 B2 同题。regenerate() 还会把 existing.application_id 原样塞回;T5 文档第 11 行给 mock_sessions 写了"无归属校验"、第 12 行给 cover_letters 只写"有字段无外键";PATCH /applications/:id/link 尚未实现,即便上线也拦不住 POST /cover-letters 直接写库路径。
- suggestion:并入 T5:与 mock_sessions 同批补归属校验——generate/regenerate 收到 application_id 时必须校验属于当前用户。

### M13. packages/api/src/opportunity/opportunity-integration.service.ts:118
- claim:OpportunityIntegrationService.getChatContext()(经 GET /opportunities/:id/chat-context 暴露)全仓零消费者;"问 Coach"跳转机会上下文时实际走的是 conversations.service.ts 里独立重写的一份阉割版逻辑,遗漏了'建议行动'板块,导致真实对话拿到的机会上下文比这份被弃用的实现更贫乏。
- duplicate | major | scanner: web-pages | isReal: true
- 核实:chat-context 生产代码零消费(仅 e2e);真实链路走 conversations.service.ts buildBoundContext()(336-353 行),内容无 actions/建议行动字段;POST /opportunities/:id/tasks 同样零前端直接消费。
- suggestion:单列新项(建议 T4 收尾顺手清):删 getChatContext/chat-context 死代码,或反过来让 conversations.service.ts 复用它,统一成一份实现。

### M14. packages/web/src/app/(main)/digest/page.tsx:141
- claim:/digest 供给管理页(导航中隐藏但可直接 URL 访问)全文件没有任何管理员角色门,与仓库内其余管理页(admin/page.tsx、admin/announcements/page.tsx)统一的'非 admin 显示无权限空态'模式不一致;后端 GET /feed/sources、GET /feed/runs 同样没挂 AdminGuard,与同控制器内 POST /feed/import、POST /feed/digest 的守卫不对称——任何登录用户都能看到情报源配置、抓取失败记录等运营数据。
- guard | major | scanner: web-pages | isReal: true
- 核实:digest 页无角色门(对照两个 admin 页均有 me.role!=='admin' 门禁);feed.controller 类级仅 JwtAuthGuard,findSources/findRuns 无 AdminGuard,同控制器写端点却有——读写守卫不对称;FeedSource/DigestRun 暴露 homepage_url/status/error_message 等运营数据。
- suggestion:并入 T4:补一条审计项——digest 页权限门 + feed 读端点 AdminGuard 一致性,基础预防级,防护建设阶段一并处理。

### M15. packages/web/src/lib/score-utils.ts:7
- claim:同一"分数→颜色/等级"能力两套阈值并存,同一分数在诊断页和模拟面试页会显示不同的颜色语义。
- duplicate | major | scanner: web-shared | isReal: true
- 核实:score-utils.ts 阈值 ≥80/≥60,score-radar.tsx 阈值 ≥75/≥55,两套均有真实调用方;真正漂移区间是 [75,79] 与 [55,59](76 分橙 vs 绿相反语义;原举例的 70 分实际无差异,verdict 已订正)。
- suggestion:并入 T4:收口成唯一 getScoreColor,阈值由产品拍板统一,score-radar.tsx 改为消费 lib/score-utils.ts。

### M16. packages/web/src/components/ui/dialog.tsx:1
- claim:基于 @base-ui/react/dialog 的可复用 Dialog 组件(自带 Esc 关闭/焦点陷阱)零消费者,全站 5 处弹窗改为手搓 .modal-overlay/.modal-scrim,均未实现 Esc 关闭。
- glue | major | scanner: web-shared | isReal: true
- 核实:dialog.tsx 全仓零消费;5 处手搓弹窗(handoff-reception/audio-uploader/interview-form/resume-uploader/application-form)grep Escape/keydown 零命中;对照 announcement-modal.tsx:103-113 有 Esc 处理,证明遗漏并非技术不可行。
- suggestion:并入 T4:5 处弹窗改用现成 Dialog 组件或补齐 Esc;已死的 Dialog 组件安全删除或真正启用,二选一。

### M17. packages/web/src/components/ui/announcement-modal.tsx:131
- claim:站内跳转安全校验正则、KIND_META 配色表、已读集合读写工具在横幅与弹窗两个公告组件里逐字复制两份。
- glue | major | scanner: web-shared | isReal: true
- 核实(重复面比断言更广):跳转正则实际重复 5 处(含 admin 页与后端两个 DTO),KIND_META 重复 3 处;localStorage 读写函数体逐字一致仅命名不同;组件注释自称"与后端 DTO/admin 同口径",作者知晓却未抽公共模块。
- suggestion:单列小项或并入 T4:抽取 lib/announcements.ts 共享 KIND_META + isSafeInternalPath + 已读集合工具。

### M18. packages/web/src/components/tracker/kanban-board.tsx:14
- claim:投递阶段(想投/已投递/面试中/终面/Offer/已拒)中文标签在 5 个组件里各自硬编码一份,无共享常量。
- duplicate | major | scanner: web-shared | isReal: true
- 核实:5 处硬编码内容一致(kanban-board/application-card/application-form/application-timeline/tracker-stats);核实中额外发现第 6 处:onboarding-surfaces.tsx:407-412 注释自称"逐字对齐真实 KanbanBoard 的 STAGES"——"会继续叠加复制"的预测已经发生。
- suggestion:并入 T5:application-detail 重构时顺带抽 lib/tracker-stages.ts 共享 STAGE_META 常量。

### M19. packages/web/src/components/tracker/application-timeline.tsx:26
- claim:"相对时间"(刚刚/N分钟前/N小时前/N天前)格式化逻辑在三个组件里各自独立实现,边界口径互不一致。
- duplicate | major | scanner: web-shared | isReal: true
- 核实:实际命中 6 处而非 3 处(另 3 处在 admin 页与 admin/_components);_shared.ts:116 已有一份"共享"实现,但同目录 LogCenterTab.tsx:86 并未 import 而是又手写一份边界值略异的——"新增消费点继续复制而非引用共享 util"已发生。
- suggestion:并入 T4:提炼 lib/format-time.ts 统一 relativeTime,各处改为消费共享实现。

### M20. packages/web/src/components/chat/handoff-reception.tsx:103
- claim:Coach 任务交接卡片的 target→中文标签映射与 payload 摘要拼接函数在两个文件里逐字重复。
- glue | major | scanner: web-shared | isReal: true
- 核实:handoff-card.tsx:9-25 的 TARGET_META 与 handoff-reception.tsx:103-118 的 TARGET_LABELS 四键映射完全相同,payloadSummary 两份字段读取顺序完全一致;两处均为活代码,无共享 lib。
- suggestion:并入 T4:提炼 lib/handoff.ts 共享 TARGET_META + payloadSummary。

### M21. packages/api/src/cover-letters/cover-letters.service.ts:25
- claim:求职信生成后端早已支持"简历×JD"双向定制(含防编造 prompt 分支),但前端从未传 resume_id,导致每封求职信都退化成纯 JD 通用信;前端 TODO 还声称"待后端开放",与代码现状不符。
- halfwired | major | scanner: hunt-dead | isReal: true
- 核实:与 M11 同题的后端侧独立发现。generate() 25-28 行有 if(dto.resume_id) 读简历,56-59 行按 resumeText 切换含防编造硬性规则的两套 prompt;前端 POST body 就是不含 resume_id,纯前端半接线。
- suggestion:单列新项(工作量小:加简历选择器+传 resume_id),也可捎带并入 T5(详情页本就要渲染求职信区块)。

### M22. packages/web/src/app/(main)/me/page.tsx:10
- claim:credit 流水与 ai_usage 的 endpoint 友好标签映射表与实际记账值格式不一致,大多数带 :id 的 AI 动作在用户「我的-点数记录」页会直接显示裸路由字符串(如 `/api/opportunities/:id/evaluate`)而非中文标签。
- glue | major | scanner: hunt-dead | isReal: true
- 核实:ENDPOINT_LABELS 全是不带 /api 前缀、不带 :id 的裸路径;后端拦截器用 request.route?.path 落库(实际值带 /api 前缀+字面量 :id,有 e2e 断言佐证);friendlyEndpoint 三层匹配全失配走 fallback;无测试覆盖该映射。
- suggestion:并入 T4:各 AI 端点显式传入稳定 action 常量(类似 TRANSCRIBE_ENDPOINT 做法)而非依赖 Express route.path,或让 friendlyEndpoint 按 :id 分段做模式匹配。

### M23. packages/api/src/resumes/resumes.controller.ts:27
- claim:简历上传接口未设文件大小上限,与同仓另外两个上传端点口径不一致,2C/2G 小机上存在内存耗尽风险。
- guard | major | scanner: hunt-dead | isReal: true
- 核实:FileInterceptor 无 limits(multer 默认 Infinity);同仓另外四处上传端点全部显式设了上限(比断言的"另外两个"更严重),唯独 resumes 没有;拿到文件后 pdf-parse/mammoth 对整个 buffer 内存解析无流式处理。
- suggestion:并入 T4 防护三件:顺手加一行 limits 配置,与 files/upload 的 10MB 对齐。

---

## 三、minor(23 条)

### m1. packages/api/src/diagnoses/diagnoses.controller.ts:30
- claim:诊断模块存在两套"创建诊断"实现——非流式 POST /diagnoses、POST /diagnoses/campus(含守卫/拦截器全套)与流式 /stream 版本;前端已完全切到流式版本,非流式端点仅被 e2e 测试调用,是与生产流量脱节的重复实现。
- dead | minor | scanner: api-ai | isReal: true
- 核实:service 注释自称"非流式(向后兼容兜底)";前端只调 /stream 版本;非流式端点调用方全是 e2e 测试。
- suggestion:并入 T4:确认无第三方消费后删除非流式端点及 service 对应方法,只留 SSE 版本。

### m2. packages/api/src/ai/ai.service.ts:825
- claim:AiService 内建的错误脱敏方法 sanitizeError() 只接入了 admin 连通性测试路径,主运行时的 withFailover/unavailable() 抛出的原始错误(含通道名 glm/deepseek、上游最多 300 字节原始响应体)会经诊断 SSE 'error' 事件原样透传给终端用户浏览器。
- halfwired | minor | scanner: api-ai | isReal: true
- 核实:sanitizeError 仅被三个 testConnection* 方法调用;主路径 openaiFetch 抛含 provider.name+300 字节响应体的 Error,经 unavailable(用 errMsg 直取)→readableError→SSE→前端直接渲染进 DOM。
- suggestion:并入 T4 防护建设:把脱敏逻辑接入 withFailover/unavailable 抛给终端用户的错误路径。

### m3. packages/api/src/mock/mock.controller.ts:39
- claim:company-check 搜索端点会触发真实计费的博查 API 调用,但没有任何专属的成本/频率门(只共享全局 IP 限流 120次/60s,与 AI 端点的 CreditGuard 规格不一致),T6 重设计后单次搜索成本还会翻倍(count 10 + 两路查询)。
- guard | minor | scanner: api-mock | isReal: true
- 核实:companyCheck 只有 JwtAuthGuard;缓存按公司名精确匹配、换名可绕过;T6 文档确认 count 从 5 升 10 且改两路查询,成本翻倍属实。
- suggestion:并入 T4/T6:给 company-check 加与外部调用成本相称的专属节流,T6 提升 count/查询路数后尤其需要。

### m4. packages/api/src/interviews/qr-upload.controller.ts:17
- claim:音频上传的体积上限计算与 MIME 过滤函数在 interviews.controller.ts 与 qr-upload.controller.ts 两处逐字复制(仅注释措辞不同),未抽共享。
- glue | minor | scanner: api-mock | isReal: true
- 核实:两处 AUDIO_MAX_BYTES 计算式与 audioFileFilter 函数体逐字节一致;speech.config.ts:64 已有共享 audioMaxSizeMb 却都没复用,实为三份独立维护。
- suggestion:并入 T4:抽成 speech 模块共享 multer 配置工厂(如 audio-upload.config.ts),两个 controller 复用。

### m5. packages/api/src/industry-trend/industry-bocha.service.ts:4
- claim:T6 文档称 industry-trend/industry-bocha.service.ts 与 mock/company-search.service.ts 的重复实现'已随T1删除',但代码库里该文件当前仍完整存在,T1 尚未执行——确认现状与计划一致,无新增动作,仅作执行前校准。
- duplicate | minor | scanner: api-mock | isReal: true
- 核实:文件完整存在且模块仍在 app.module 装配(非死代码);00-master-plan.md 状态表 T1 未打勾;T6-bocha-search.md:6,11 用既成时态描述了尚未发生的删除。
- suggestion:不需单列新项:按 00-master-plan 既定顺序 T1(删 industry-trend)→T6(建 company-research)执行,此发现仅作进度校准。

### m6. packages/api/src/mock/mock.service.ts:98
- claim:checkCompany() 把博查失败原因(SearchUnavailable.reason: no_key/timeout/error)在服务层直接丢弃,只回 search_candidate:null,前端永远无法区分'没搜到'与'搜索服务挂了/未配置key'。
- halfwired | minor | scanner: api-mock | isReal: true
- 核实:mock.service.ts:96-99 三元判断后丢弃 reason;三种 reason 从未被读取;前端对两种完全不同情况展示同一句通用文案;OpsEvent 在 mock 模块零命中。
- suggestion:并入 T6:新设计的候选/降级返回结构把 reason(或等价判定)透传给前端,区分两种提示文案。

### m7. packages/api/src/speech/entities/transcribe-task.entity.ts:101
- claim:InterviewTranscribeTask.asr_job_id 字段(含专属 migration 列)全仓库无任何读写者,是确认无消费者的死字段。
- dead | minor | scanner: api-mock | isReal: true
- 核实:字段注释"P1 文件识别路线预留";全仓 grep 仅命中 entity 定义、migration、设计文档,无任何 service/controller 读写。
- suggestion:若 T3/后续路线图确无 P1 文件识别 ASR 计划,建议 T4 顺手清掉该列;若仍是明确的未来路线占位,保留不动。

### m8. packages/web/src/app/(main)/applications/page.tsx:1200
- claim:投递追踪页里,『制定投递策略』面板要求用户手填『当前在投公司』(逗号分隔文本框),但同一个页面组件里 applications 状态已经从 /applications 拉取了完整的公司列表——StrategyPanel 是独立组件,没有接收这份已有数据,用户被迫重新打一遍已经在看板里的公司名。
- glue | minor | scanner: api-apps | isReal: true
- 核实:page.tsx:963/979 已拉取含 company 的 applications;StrategyPanel 是无 props 独立组件,current_applications 来自用户手填的 appsInput。
- suggestion:顺手修(不必单开任务):StrategyPanel 接收 applications 列表预填 appsInput;可在 T5 前端改造时顺带处理。

### m9. packages/api/src/conversations/chat.service.ts:59
- claim:求职教练 AI 的 system prompt 里『站内能力地图』硬编码了 /industry-trend 与 /learning-roadmap 两个路由,用于指导 AI 在续接提议时口头推荐;T1 删除这两个页面后,若清理只按前端路由/导航 grep 走查,容易漏掉这处后端 prompt 字符串,导致 AI 教练在对话里继续向用户口头推荐一个 404 的页面。
- halfwired | minor | scanner: api-apps | isReal: true
- 核实:chat.service.ts:59 原文含两个路由;T1-nav-cleanup.md:32 改动清单第 4 条未点名该文件;同类未点名遗漏还有 me/page.tsx:32-33、nav-hints.ts:21,25。
- suggestion:并入 T1 改动清单第 4 条,验收 grep 范围明确扩到 conversations/chat.service.ts 等 AI system prompt 文件,不能只搜前端跳转代码。

### m10. packages/api/src/follow-up/follow-up.service.ts:344
- claim:follow-up.generate() 收到 application_id 后只做归属校验(通过/拒绝),从不读取该投递的公司/岗位/阶段等实际数据;prompt 里直接把裸 UUID 字符串塞给 AI(『## 投递 ID:{uuid}』),AI 无法从一串 UUID 推断任何有用上下文,这段拼接对生成质量没有任何贡献,是『收了参数但没用上』的半接线。
- halfwired | minor | scanner: api-apps | isReal: true
- 核实:findOne 结果仅用于 403 校验后丢弃(实际含 company/role/stage);buildPrompt 直接 push 裸 UUID;且前端唯一调用方有 TODO 注明目前从未真正发送 application_id——该参数路径当前端到端 no-op。
- suggestion:并入 T5:详情页跟进面板改造时,前端把 company/role/stage 填入 interview_details,或后端 fetch application 拼进 prompt——二选一,不要维持现状。

### m11. packages/api/src/admin/admin.controller.ts:103
- claim:GET /admin/ops-events(AdminService.recentOpsEvents)是已被 /admin/error-stream 取代的死端点,前端全部改走 error-stream 的分页+类型过滤版本,这条旧路径无消费者。
- dead | minor | scanner: api-feed | isReal: true
- 核实:旧端点只收 limit 无过滤分页;error-stream 是功能超集;前端实际全部调用 error-stream;唯一引用者是后端 3 个 e2e 白盒测试。
- suggestion:并入 T4:删除 GET /admin/ops-events 端点及 recentOpsEvents/AdminErrorEventResponseDto.fromMany 相关死代码,只保留 error-stream。

### m12. packages/api/src/feed/company-registry.service.ts:47
- claim:公司名归一化已经在 feed 模块存在一套实现(白名单精确/别名匹配,服务于月刊优先公司统计),而 T6 设计文档要新建 company-research 模块做另一套归一化规则(去空格/全半角/大小写/常见后缀剥离),两者定位不同但都叫「公司归一化」,T6 落地时如果被误合并或起第三套实现会产生新的重复能力。
- duplicate | minor | scanner: api-feed | isReal: true
- 核实:matchCompany 仅 trim+toLowerCase 精确比对且被 feed/mock/newspaper 多处实际调用(非孤儿);T6 文档定义另一套规则,全文未提及现有实现或划分边界。
- suggestion:并入 T6:文档补边界说明——company-research 归一化只服务模拟面试公司搜索缓存,不吃掉/不合并 feed 的 CompanyRegistryService,避免施工中被顺手"统一"成第三套逻辑。

### m13. packages/web/src/app/(main)/applications/page.tsx:1
- claim:投递看板与薪资页均只造了'新建/编辑'链路,后端早已备好的单条删除接口在前端完全没有入口——用户误建的投递记录、误提交的薪资条目无法自行撤回,同一缺口在两个模块各出现一次,是系统性遗漏而非孤立疏忽。
- halfwired | minor | scanner: web-pages | isReal: true
- 核实:applications/salary 两个 controller 均有完整 @Delete(':id');两页面无任何 api.delete;全仓另外 5 个模块已落地同款删除模式,唯独这两个后端已备好的没接。
- suggestion:投递部分并入 T5(详情页顺手加删除);薪资部分单列新项或并入 T4 一起补。

### m14. packages/web/src/components/interview/transcript-progress.tsx:86
- claim:人类可读文件大小格式化函数在两处重复实现,且开发者已在注释里承认是复制而非共享。
- duplicate | minor | scanner: web-shared | isReal: true
- 核实:fileSize()/humanSize() 逻辑逐字相同,注释原文"与 audio-uploader 同口径"自证知情复制;核实中另发现第三处 upload/[token]/page.tsx:30-33,重复面比断言更广。
- suggestion:并入 T4(顺手做,风险极低):抽到 lib/utils.ts 共享 humanFileSize。

### m15. packages/web/src/components/ui/dropdown-menu.tsx:1
- claim:5 个 shadcn/ui 脚手架组件(575行)自初始化提交后从未被任何页面/组件引用,是确凿死代码。
- dead | minor | scanner: web-shared | isReal: true
- 核实:dropdown-menu/tabs/separator/label/input(加上另条单独审计的 dialog.tsx 才凑足 575 行,"5 个"口径与 6 文件清单有出入)全仓导入路径与 JSX 用法零命中,自 scaffold 提交 4f6ef3b 后无任何消费方。
- suggestion:并入 T4:安全删除(已二次确认 grep 全仓零引用)。

### m16. packages/api/src/interviews/qr-upload.controller.ts:19
- claim:音频上传上限常量与 fileFilter 函数在 interviews.controller.ts 与 qr-upload.controller.ts 逐字复制两份,注释自陈'同口径'却靠人工保持同步,未来改 AUDIO_MAX_SIZE_MB 或允许的 mimetype 容易漏改一处导致两条上传通道校验不一致。
- duplicate | minor | scanner: hunt-dup | isReal: true
- 核实:与 m4 同题的独立发现;两份函数体逐字节相同,speech.config.ts:64 现成共享配置未被复用,无编译期/测试保障一致性。
- suggestion:并入 T4:抽到 speech 模块或 common 下共享 util,两个 controller 一起 import。

### m17. packages/web/src/app/(main)/digest/page.tsx:112
- claim:formatDate 在前端 9 个文件里各写一份(参数类型/格式各异),没有共享的日期格式化 util,横向能力重复散落。
- duplicate | minor | scanner: hunt-dup | isReal: true
- 核实:逐一核对实为 8 个文件(radar 页内是两个函数名,"9 个文件"计数偏差 1 但不影响结论);lib/ 目录 grep formatDate 零命中,确无共享实现。
- suggestion:并入 T4(低优先级):抽 lib/format.ts 共享;非阻塞,顺手做。

### m18. packages/web/src/components/interview/qr-upload-panel.tsx:106
- claim:扫码上传面板自己写了一套 setTimeout 链轮询 /interviews/:id/transcribe/status,与已抽出的共享轮询 hook(useTranscribeStatusPolling)重复了 mounted 守卫+setTimeout 链的样板代码,而非复用/扩展该 hook。
- duplicate | minor | scanner: hunt-dup | isReal: true
- 核实:pollPhoneUpload() 与共享 hook 结构同构(仅终止条件不同);该 hook 已被 debrief-detail/transcript-progress 正常复用,唯独 qr-upload-panel 对同端点另起炉灶。
- suggestion:单列新项或并入 T4:把『setTimeout 链+mounted 守卫』轮询骨架抽成通用 hook,按各自终止条件传入判定函数。

### m19. packages/api/src/admin/admin.controller.ts:103
- claim:GET /admin/ops-events 端点及其唯一实现 admin.service.ts recentOpsEvents() 是死代码,已被同一 controller 里的 error-stream 取代。
- dead | minor | scanner: hunt-dead | isReal: true
- 核实:与 m11 同题的独立发现;补充纠偏:ops-events 返回全部事件类型而 error-stream 白名单不含 LIMITER_RESET,并非严格等价替代——删除前需先把 LIMITER_RESET 补进 error-stream 白名单,以免丢失该审计记录的查看入口。
- suggestion:并入 T4:删除该端点与 recentOpsEvents 方法(先补 LIMITER_RESET 白名单)。

### m20. packages/api/src/salary/salary.controller.ts:61
- claim:GET /salary/:id 与 DELETE /salary/:id 从未被前端调用,薪资记录一旦录入既无法查看详情也无法删除。
- halfwired | minor | scanner: hunt-dead | isReal: true
- 核实:两端点带归属校验实现完整;全仓无任何 /salary/{id} 形式的 get/delete 调用,entry.id 仅用作 React key。
- suggestion:需先向用户确认产品意图(薪资记录是否设计为只增不删);要保留删除能力则单列新项补 UI,产品不需要则归入 T4 删死端点。

### m21. packages/api/src/resumes/resumes.controller.ts:73
- claim:GET /resumes/:id/versions 是冗余死端点,版本数据已随 GET /resumes/:id 详情响应内嵌返回,前端从未单独请求过该端点。
- dead | minor | scanner: hunt-dead | isReal: true
- 核实:findOne 已 relations 查出 versions 并内嵌进详情响应,前端直接取 resume.versions;getVersions 仅命中定义与自家 e2e;POST :id/versions(创建版本)仍在用,是另一回事。
- suggestion:并入 T4:删除该 GET 端点(保留 POST 创建版本端点)。

### m22. packages/api/src/conversations/conversations.controller.ts:113
- claim:DELETE /conversations/:id 有完整实现和归属校验,但前端聊天界面从无「删除对话」入口,端点无法被触达。
- halfwired | minor | scanner: hunt-dead | isReal: true
- 核实:remove() 实现完整、where:{id,user_id} 归属校验;全仓 api.delete 调用点无一指向 /conversations;chat 页面搜"删除/Trash/onDelete/归档"零命中。
- suggestion:单列新项(补删除对话 UI),或产品判断不需要则归入 T4 一并清理。

### m23. packages/api/src/feed/feed.controller.ts:56
- claim:DELETE /feed/:id 有归属校验实现,但月刊·面经页从无撤回入口,用户投稿的 UGC 面经条目一旦提交就无法自行删除。
- halfwired | minor | scanner: hunt-dead | isReal: true
- 核实:remove() 带 user_id 归属校验;digest 页有投稿入口(api.post('/feed'))但全文无删除相关代码,DigestCard 无删除按钮;另两个消费 FeedItem 的页面同样零命中。
- suggestion:单列新项(给用户投稿面经补删除按钮),或归入 T2(月刊任务本就要动 feed 模块)顺手补上。

---

## 四、六任务校准清单

51 条按各自 suggestion 归位。跨扫描器重复发现合并为一个修改点(注明全部依据)。

### T1(docs/refactor2/T1-nav-cleanup.md)
1. 改动清单第 4 条补一处:删 /industry-trend、/learning-roadmap 时必须同步清掉 chat.service.ts:59 system prompt「站内能力地图」里的两个硬编码路由,连带 me/page.tsx:32-33、nav-hints.ts:21/25 同类引用;验收 grep 范围明确扩到后端 AI prompt 文件,不能只搜前端跳转代码。(依据 m9)

### T2(docs/refactor2/T2-recruit-intel.md)
1. feed/import、feed/digest 两端点摘掉 CreditGuard+CreditInterceptor——管理员运营操作不该扣本人个人 credit;若沿用旧端点也要顺手摘。(依据 M7)
2. /digest 页「导入来源」按钮与来源状态区对普通用户隐藏或拆到管理员专属入口,对齐 /admin 既有门控模式。(依据 M8)
3. 明确 POST /feed/digest(AI 周刊生成)去留:接进新的周更流程,或连 digest-generator.service.ts 一起删——它当前全仓无任何触发路径。(依据 M9)
4. 给用户投稿的面经条目补删除入口(后端 DELETE /feed/:id 归属校验已就绪,纯前端缺按钮)。(依据 m23,亦可单列)

### T3(docs/refactor2/T3-career-wiki.md)
1. 无直接归属的发现。唯一涉及 T3 的是一个确认前提:T3/后续路线图是否还有「P1 文件识别 ASR」计划——有则 transcribe-task.entity.ts 的 asr_job_id 占位字段保留不动,没有则清理动作转给 T4。(依据 m7)

### T4(docs/refactor2/T4-hardening.md)
1. D1 并发审计项直接改判:嵌套 limiter 自锁已确认 FAIL(2 个并发诊断请求即 100% 必现),从"待审计"改为 T4 最高优先修复项;修法二选一——AiService 内层调用加 skipLimiter 透传,或拆"pipeline 槽/AI 调用槽"两个 limiter 池;另注意超时后内层僵尸 waiter 残留队列的次生问题。(依据 B1)
2. D6/D7 审计范围收窄:全局限流(120 次/60s)与登录/发码端点限流已存在,改为只补「限流命中写 OpsEvent + 登录失败封禁窗口(IP/邮箱维度)」,勿重复实现。(依据 M10)
3. 新增防护审计项:digest 页前端权限门 + GET /feed/sources、/feed/runs 补 AdminGuard(与同控制器写端点守卫对称)。(依据 M14)
4. 失败观测补齐:diagnoses.recordFailure() 与 conversations.streamMessage 错误分支补记 AI_CALL_FAILED,否则 admin 成功率统计对这两类端点系统性偏高。(依据 M1)
5. 防滥用三件:question-audio TTS 加 session+题号缓存或会话级节流(依据 M4);resumes 上传 FileInterceptor 补 limits、对齐 10MB(依据 M23);company-check 加与博查成本相称的专属节流、与 T6 联动(依据 m3)。
6. 错误脱敏:sanitizeError() 接入 withFailover/unavailable 主路径,不再把 provider 名与上游原始响应体经 SSE 透传给用户浏览器。(依据 m2)
7. ENDPOINT_LABELS 失配修复:AI 端点显式传稳定 action 常量(类似 TRANSCRIBE_ENDPOINT)或 friendlyEndpoint 按 :id 分段模式匹配。(依据 M22)
8. 共享化技术债清单(增补到 T4 技术债节,均低风险顺手做):AiResultEnvelope+VALID_CONFIDENCE+schema builder 抽共享、9 处替换(M5);分数颜色阈值统一到 lib/score-utils、score-radar 改消费它(M15);5 处手搓弹窗改用 Dialog 组件或补 Esc、死 Dialog 删或启用二选一(M16);抽 lib/announcements.ts(M17);抽 lib/format-time.ts 统一 relativeTime 6 处(M19);抽 lib/handoff.ts(M20);音频上传 multer 配置抽共享、复用 speech.config(m4/m16);humanFileSize 抽 lib/utils.ts 3 处(m14);formatDate 抽 lib/format.ts 8 文件(m17);轮询骨架抽通用 hook(m18)。
9. 死代码清理清单(增补):非流式 POST /diagnoses、/diagnoses/campus(m1);GET /admin/ops-events + recentOpsEvents——删除前先把 LIMITER_RESET 补进 error-stream 白名单(m11/m19);GET /resumes/:id/versions,保留 POST 创建版本(m21);5 个 shadcn 脚手架死组件(m15);asr_job_id 列视 T3 结论清理(m7);resume.file_url 死字段随头像修复一并清(B3)。

### T5(docs/refactor2/T5-application-detail.md)
1. 「数据打通」一节 cover_letters 行补一句:generate/regenerate 写入 application_id 时按 assertOwnedRefs 模式补归属校验(比照 follow-up.service.ts:187-199),不能只加外键——否则实现者会照"只加 FK"执行,IDOR 洞原样带过去。(依据 B2、M12)
2. 归属校验覆盖面从 mock_sessions 扩大到 interviews.create/update 与 cover-letters.generate;文档现把 interviews 标"真外键"当已完备,漏了 service 层零校验。(依据 B4、M2)
3. interviews GET 端点补 DTO 白名单投影(或收窄 relations),堵住伪造 application_id 回读他人 Application 隐私字段(notes/salary_range/referrer 等)的泄露路径。(依据 B4)
4. cover-letter 生成表单加简历选择器传 resume_id(后端防编造分支早已就绪,前端 TODO 注释与现状不符);详情页场景顺带接 application_id。(依据 M11、M21)
5. 跟进消息面板改造时终结「裸 UUID 塞 prompt」:前端把已拉取的 company/role/stage 填入 interview_details,或后端 fetch application 后拼进 prompt——二选一。(依据 m10)
6. 抽 lib/tracker-stages.ts 共享 STAGE_META:投递阶段中文标签已复制 6 处(含 onboarding-surfaces.tsx)。(依据 M18)
7. 详情页补「删除投递」操作(后端 DELETE 已备好归属校验,前端零入口)。(依据 m13 投递部分)
8. StrategyPanel 接收页面已拉取的 applications 列表预填「当前在投公司」,别让用户重打一遍。(依据 m8)

### T6(docs/refactor2/T6-bocha-search.md)
1. 防伪造设计:前端确认公司信息时回传候选 id/hash 而非原始 name/summary/source_url,后端按 id 查库取真实候选拼 prompt——堵死绕过前端伪造 confirmed_company_info 的路径。(依据 M3)
2. 降级透传:候选/降级返回结构带上 reason(no_key/timeout/error 或等价判定),前端区分「真没搜到」与「搜索服务暂不可用」两种文案。(依据 m6)
3. 文档补边界说明:company-research 的归一化只服务模拟面试公司搜索缓存,不吃掉/不合并 feed 的 CompanyRegistryService 白名单匹配,避免施工中被顺手"统一"成第三套逻辑。(依据 m12)
4. 修正文档时态错误:T6-bocha-search.md 写 industry-bocha"已随 T1 删除",实际 T1 尚未执行、文件仍在;按 00-master-plan 顺序 T1→T6 执行即可。(依据 m5)
5. count 升 10 + 两路查询落地时,company-check 专属节流必须同步落地(与 T4 第 5 条联动,成本翻倍后不能只靠全局 IP 限流)。(依据 m3)

### 新增独立项(归不进六任务)
1. 【热修,建议提前于一切 T】头像上传裂图:avatar_url 返回裸存储 key,全站无解析路径,上传必裂;修法=返回 /api/files/download/... 可访问 URL 或挂静态服务(注意 assertOwner ACL 会被静态挂载绕过,需重新设计);线上真实用户在用。(依据 B3、B5;B5 建议并入 T4 但两条发现都强调应提前单独热修)
2. evidence_used 半接线拍板:4 个存活 AI 功能(投递策略/Offer 比对/跟进消息/城市契合度)前端补渲染(迁移 EvidenceList 组件),或从 schema 删字段省高频输出 token——二选一。(依据 M6)
3. getChatContext/chat-context 两套机会上下文实现统一:删死代码,或让 conversations.service.ts 复用它(顺带找回丢失的「建议行动」板块)。(依据 M13,建议 T4 收尾顺手清)
4. 薪资记录删除能力需产品拍板:GET/DELETE /salary/:id 从未被调用——「只增不删」则 T4 删死端点,要保留则补 UI。(依据 m20、m13 薪资部分)
5. 对话删除能力需产品拍板:DELETE /conversations/:id 无前端入口——补「删除对话」按钮或判定不需要后归 T4 清理。(依据 m22)
