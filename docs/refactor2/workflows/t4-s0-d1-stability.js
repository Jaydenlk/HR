export const meta = {
  name: 't4-s0-d1-stability',
  description: 'T4第零段(流式诊断/对话状态保持+防重复)与D1(限流器嵌套死锁)同批修复——两者同动diagnoses.service.ts,危险区纪律生效;侦察→实现→验证三段式',
  phases: [
    { title: '侦察', detail: '只读代理核对设计文档T4-hardening.md第零段+D1行与实时代码坐标,产出精确执行清单' },
    { title: '实现', detail: '新建隔离worktree基于dev建feat分支,按清单串行完成running状态机+防重复409+chat解耦+D1死锁修复,危险区每次改动即跑两组spec' },
    { title: '验证', detail: '质量门测试与只读审计并行,审计重点核惰性failed规则是否先于409判定' },
  ],
}

const REPO = 'E:\\Agent program\\HRBP'
const WORKTREE = 'E:\\Agent program\\coach-wt\\t4-s0-d1'
const BRANCH = 'feat/t4-s0-d1-stability'
const DESIGN_DOC = 'E:\\Agent program\\HRBP\\docs\\refactor2\\T4-hardening.md'
const AUDIT_DOC = 'E:\\Agent program\\HRBP\\docs\\refactor2\\CODE-AUDIT-2026-07-02.md'
const DEV_PRINCIPLES = 'E:\\Agent program\\HRBP\\docs\\refactor2\\01-dev-principles.md'

const DANGER_ZONE = `## 危险代码区纪律(01-dev-principles.md 第四节原文,全程适用,不是走过场)
1. AI 流式/看门狗/限流器(ai.service.ts 流式部分、concurrency-limiter.ts、diagnoses.service.ts 管线超时):这里出过两次生产事故。改动后必跑:
   cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
   不变量:槽位只在 finally 释放;reset 必须 reject 排队 waiter;看门狗 idle 重置点是 reader.read() 返回(含 reasoning 帧),不是 yield。
2. AiService 主备降级(GLM 主力 + DeepSeek 备份):不许在业务代码里绕开 AiService 直连供应商。
3. 鉴权/额度:凡新增 AI 端点,默认挂 JwtAuthGuard + CreditGuard + 计费拦截器,和现有端点对齐。
本任务额外加码:危险区纪律不是"最后跑一次就行"。每次改动 ai.service.ts / concurrency-limiter.ts / diagnoses.service.ts 三者之一后,当次改动必须先把上面那条 jest 命令跑到全绿,再进行下一步或下一次 commit,不许攒到最后一次性跑。上面那条 jest 命令里的 packages/api 是相对路径:每次新开一条终端命令,工作目录都会重置回默认位置,不会继承你上一条命令 cd 过的地方,所以必须在同一条命令里用绝对路径先定位到本任务的 worktree 再执行,例如写成 cd "${WORKTREE}\\packages\\api" && npx jest ...,不许只写裸的 cd packages/api(那样会跑到别的目录,测的是别的代码)。`

const SCOPE_REDLINES = `## 本任务范围与红线(逐条照办,越界=违规)
- 本次只做两件事:①T4-hardening.md「第零段:流式任务状态保持与防重复」;②D1(限流器嵌套死锁)。
- 明确不做、一个字不碰:H0(头像上传裂图,me.service.ts)、D2-D9 其余审计项(JWT弱默认值/备份cron/老站下线/npm audit 等)、第二段「防护建设」三件套(限流补缺/注册风控/专项节流)、第三段共享化与死代码清理批、salary 模块(另一任务 feat/del-salary 在处理,与本任务无关不许碰)。
- 明确不做(设计已定稿排除,做了=优绩主义违规):诊断侧的 SSE 断线重连/事件回放——轮询已完全满足需求。
- chat 前端"生成中轮询"是可选打磨,不是验收门,做不做都不算 FAIL。
- transcribe_task.asr_job_id 及其 status 字段与本任务无关,ASR 战线仍活跃,禁止碰。
- diagnosis-event-stream.ts 头部注释立的铁律不许破坏:DB 落库不得绑定 SSE 订阅生命周期(客户端断开,流水线继续跑完落库)。这条铁律现在要"反向"应用到 chat:chat 目前是断开即真取消(conversations.controller.ts 里 res.on('close') 联动 AbortController.abort()),要改成和诊断同一套哲学——断开只停止向浏览器转发,不取消服务端生成,生成完照常落库。改的时候不要把"停止转发"错改成"提前结束上游 AI 流式请求本身"——上游调用应继续被完整消费到自然结束才落库,否则记录的是半截回复。
- ConcurrencyLimiter 是全局单例,除 diagnoses 管线外还被约20个其他服务直接消费(chat.service.ts、cover-letters.service.ts、mock.service.ts、interviews.service.ts、career.service.ts、opportunity-evaluator.service.ts、follow-up.service.ts、industry-trend.service.ts、announcement-generator.service.ts、networking.service.ts、feed 相关服务等,均经由 AiService 间接使用同一个 limiter)。D1 的修法(无论选 skipLimiter 透传还是拆分"pipeline槽/AI调用槽"两个池)绝不能让这些独立调用路径被误伤(变成不再受限流保护)或被误放行(总并发实际翻倍失去护栏意义)。诊断管线内部真正触发二次 acquire 的只有三个调用点:analyzer.service.ts、rewriter.service.ts、parser.service.ts 里对 this.ai.completeStructured(...) 的调用(均在 diagnoses.service.ts 的 runObservable 外层槽已持有的情况下发生)——如果选 skipLimiter 方案,跳过范围必须精确卡在"由 diagnoses 管线发起的这条调用链",不能做成 AiService 全局开关。
- GET /ai/queue-status(ai.controller.ts)对外暴露的排位语义如果因为本次改动分裂成两个池,必须保持诚实(不能报出与实际排队不符的数字);不改这个端点也可以,但要在交付报告里说明选择理由。
- 手写 migration 只许新增(为 running 状态提供必要的 DDL 支持,例如按需加索引),不许 DROP 任何列、不许改动/回填 diagnoses 表里任何存量行的既有 status 值(success/failed/partial/NULL 全部保持原样)。命名与头注风格照抄 packages/api/src/database/migrations/1782100000000-AddDiagnosisStatus.ts,时间戳必须大于当前 migrations 目录里实际存在的最大时间戳(执行时现查,不许套用任何写死的数字)。
- 每行改动可追溯到本任务清单里的某一条;不顺手重构、不加没人要的配置项;只删自己改动导致失效的 import,历史死代码不动。`

const RECON_PROMPT = `你是只读侦察代理,任务 key=t4-s0-d1-stability。仓库根 ${REPO},基线分支 dev。不许修改任何文件,只读+产出清单文本。

## 第一步:读设计文档,吃透定稿(不读代码前先读完这三份)
1. ${DESIGN_DOC} 全文,重点是:
   - 「第零段(最高优先):流式任务状态保持与防重复」整段(现状实锤/设计定稿四目标/派工/step→verify),约 L13-38(文档若被他人编辑过行号会漂移,以标题定位为准,内容不会变)。
   - 第一段审计清单表格里 D1 那一行(限流器嵌套死锁,已判 FAIL 免核直修)。
   - 第二段修复预案里的 D1 小节(两种修法二选一:AiService 内层调用加 skipLimiter 透传,或拆成"pipeline 槽/AI 调用槽"两个独立 limiter 池)。
   - 派工方案段(Agent A/B/C/D 职责分工、"与 D1 死锁修复同批同 worktree——两者都动 diagnoses.service,串行"这句话)。
   - step→verify 总纲里第 2 条(S0+D1 那条)。
   - 红线段。
   明确排除、不许写进清单:H0(头像上传)、D2-D9 其余债项、第二段"防护建设三件套"、第三段清理批——这些都是同一份文档里的其他任务,不属于本次。
2. ${AUDIT_DOC} 第 52-55 行与第 384 行:D1 的原始证据(diagnoses.service.ts:251-259 外层 runObservable 占槽 ↔ ai.service.ts:490/674 内层二次 acquire 导致死锁;600s 超时只清外层槽,内层僵尸 waiter 残留队列污染后续排位)。
3. ${DEV_PRINCIPLES} 第四节「危险代码区」,记住:改 ai.service.ts / concurrency-limiter.ts / diagnoses.service.ts 任一个都要标「危险区」。

## 第二步:核对实时代码(以此为准,文档坐标只是线索,漂移不算异常;文档点名但代码里找不到的,标[缺失-需人工],不许猜着补)
逐个 Read/Grep 确认现状与设计描述是否一致,记录当前精确锚点:
- packages/api/src/diagnoses/diagnoses.service.ts —— status 三态赋值处('success'/'failed'/'partial' 各分支)、recordFailure() 方法、runObservable 调用点(约 L251)、诊断发起的入口方法(controller 调用的那个方法)签名与参数。
- packages/api/src/diagnoses/entities/diagnosis.entity.ts —— status 字段定义(约 L75-76,当前是 varchar 可空、无 CHECK 约束,联合类型 'success'|'failed'|'partial',无 'running')。
- packages/api/src/diagnoses/diagnoses.controller.ts —— campus 流式端点(约 L56-71)、普通流式端点(约 L73-84)、已存在的 GET '/'(findAll,列出当前用户全部诊断)与 GET ':id'(findOne)——前端要靠这两个现成端点做"回来可见",原则上不需要新建查询端点。
- packages/api/src/diagnoses/diagnosis-event-stream.ts —— 头部注释铁律(DB 落库不得绑定 SSE 订阅生命周期),确认该解耦机制的具体实现方式(push/close/异步迭代器),供后面判断 chat 侧要不要复用同一个类。
- packages/api/src/ai/concurrency-limiter.ts —— run()/runObservable()/runStreaming() 三个公开方法签名(约 L71/84/99)、私有 acquire/release/reset 实现、reset() 对排队 waiter 的 reject 处理;确认当前完全没有 skipLimiter 或等价跳过参数。
- packages/api/src/ai/ai.service.ts —— completeStructured 等方法里调用 this.limiter.run(...) 的位置(约 L175/261/442/490/674),哪几处会被 analyzer/rewriter/parser 在诊断管线内层触发。
- packages/api/src/ai/analyzer.service.ts、rewriter.service.ts、parser.service.ts —— 各自对 this.ai.completeStructured(...) 的调用点(这三个文件是诊断管线内层真正触发二次 acquire 的唯一来源)。
- packages/api/src/ai/ai-stream-watchdog.spec.ts、packages/api/src/ai/concurrency-limiter.spec.ts(注意 packages/api/test/ 下还有同名 concurrency-limiter.spec.ts,两个都存在,jest 按文件名匹配会两个都跑)——现有用例范围,确认改动后哪些用例可能受影响、需要新增哪些用例(并发两个诊断不再死锁;reset 仍正确 reject waiter;skipLimiter 若采用,验证非诊断路径的独立 AiService 调用仍正常受限流)。
- packages/api/src/conversations/conversations.controller.ts —— res.on('close', () => abort.abort()) 联动处(约 L82-83)。
- packages/api/src/conversations/chat.service.ts、conversations.service.ts —— streamMessage 生成与落库的耦合点,确定改成"断开只停转发、不取消生成、生成完照常落库"具体要碰哪几行。
- packages/web/src/lib/api.ts —— postStreamRaw(约 L193-250),确认它现在怎么把 HTTP 状态码暴露给调用方(前端要能识别 409 并读到 body 里的进行中 id)。
- packages/web/src/app/(main)/diagnoses/new/page.tsx 与 campus/page.tsx —— mount 时的现状(有没有查进行中任务;进度是不是纯前端 state;发起请求收到非 200 时现在怎么处理)。
- packages/web/src/app/(main)/chat/[id]/chat-detail.tsx —— 断开场景现状(可选轮询打磨点,非验收门,只记录现状不强制要求改)。
- packages/api/src/database/migrations/ 目录:ls 一下拿到当前最大时间戳文件名;Read 1782100000000-AddDiagnosisStatus.ts 作为手写迁移头注风格与"纯 ADD、无 DROP、无回填"范本;同时找 packages/api/test/diagnosis-status-migration-smoke.spec.ts 作为新迁移配套 smoke 测试的范本。
- packages/api/src/ai/ai.controller.ts 的 GET queue-status 端点(约 L11-12),记录它现在暴露的 QueueStatus 形状,供判断 D1 修复方案是否会影响其语义诚实性。

## 产出格式(纯文本直接回复,不要写文件)
逐条列(每条独立一段):
- 文件路径
- 内容锚点:不止行号,给一段当前代码里真实存在、可 grep 定位的独特字符串
- 改法一句话(具体到怎么改,不是"需要修改"这种空话)
- 该条对应的 verify(命令或断言,越具体越好)
最后单列两块:
- 「红线清单」:汇总本任务不许碰的文件/逻辑(可直接照抄本次设计文档的红线段,加上你侦察中发现的新同名陷阱,比如 ConcurrencyLimiter 的其他约20个消费方名单、transcribe_task 无关字段等)。
- 「缺失清单」:文档点名但实时代码里核对不到的条目,原样标 [缺失-需人工],绝不脑补实现方式。`

const IMPL_PROMPT = `你是实现代理,任务 key=t4-s0-d1-stability。执行 T4「第零段:流式任务状态保持与防重复」+ D1(限流器嵌套死锁)。这是危险区任务,S0 与 D1 同一批改动、都动 diagnoses.service.ts,必须串行完成,不许并发拆两个人做。

${SCOPE_REDLINES}

## 设计定稿(四目标,来自 ${DESIGN_DOC} 第零段,照此实现,不许自行加戏)
1. 回来可见:诊断发起即插最小行(status 新增 'running',手写 migration 提供必要 DDL 支持);随管线推进 update 到终态。诊断页(new/campus 两处)mount 时查询进行中/最近诊断:有 running → 显示"诊断进行中"卡片,轮询 GET /diagnoses/:id(已存在,不必新建)至终态后自动进结果页。不做 SSE 断线重连/事件回放。
2. 防重复+防重复扣费:发起时后端查同用户同类型的未超时 running 诊断,存在则返回 409 并携带进行中 id;前端收到 409 转入进行中视图,不重复发起、不重复扣费。
3. 对话不丢回复:对齐诊断哲学——断开只停止向浏览器转发,不取消服务端生成;生成完照常落库。拆掉 conversations.controller.ts 里 res.on('close') → abort.abort() 的联动,消费与落库交给服务端独立完成(可参考 diagnosis-event-stream.ts 的解耦思路,但不要求硬套同一个类,只要满足"断开不取消生成"这个不变量)。用户回来重开会话即见完整回复。前端"生成中轮询"是可选打磨,不是验收门。
4. 防僵尸:running 超过管线超时(现有 600s 超时处理器)由超时处理器标 failed。进程重启遗留的孤儿 running 行用读取时惰性规则兜底:读到 running 且已超 15 分钟 → 更新为 failed。不建清扫 cron。

## D1(限流器嵌套死锁)修复(来自 ${DESIGN_DOC} 第一段 D1 行 + 第二段修复预案,证据见 ${AUDIT_DOC} 第52-55/384行)
现状:外层 diagnoses.service.ts 的 runObservable 占一个槽后,其内部经 analyzer/rewriter/parser 调用 AiService.completeStructured 会对同一个 ConcurrencyLimiter 单例做第二次 acquire;AI_MAX_CONCURRENCY 默认 2 时,2 个并发诊断即 100% 必现自锁,只能靠 600s 管线超时兜底(用户体验是"卡 10 分钟后报错"),且超时只释放外层槽,内层僵尸 waiter 残留队列继续污染排位。
修法默认选 A(设计文档「债务修复预案」段已把这个定为落地方案:改动面最集中,也不会新增第二个 limiter 实例的容量配置心智负担):
A) 给 AiService 内层调用(仅限由诊断管线发起的 completeStructured 调用链)加 skipLimiter 透传,跳过时不重复 acquire。
只有当你读完实时代码后,发现 A 在当前代码结构下明显做不到"精确卡在诊断管线内层调用链"(比如调用一路传到 completeStructured 内部真正发起 provider 调用那层时,已经拿不到"这是不是诊断管线发起的"这个信息)才允许改用 B,并且必须在交付报告里写清楚 A 具体卡在哪一步、为什么走不通——不许因为觉得"B 架构更好看"就换成 B:
B) 拆成"pipeline 槽"(diagnoses.service.ts 的 runObservable 专用)与"AI 调用槽"(ai.service.ts 内部所有实际调用统一走这个池,含诊断管线内部与其余约20个独立消费方)两个独立 limiter 池。
无论选哪个,必须同时处理次生问题:确认超时路径不再残留内层僵尸 waiter 污染队列(reset()/finally 是否补齐)。

## 操作规程
1. 建隔离 worktree(本任务是危险区非平凡任务,按 CLAUDE.md"All development in worktrees"执行,不在主工作区做——主工作区此刻可能停在其他任务分支且有未提交内容,与你无关,不要管它也不要清理它):
   git -C "${REPO}" worktree add "${WORKTREE}" -b ${BRANCH} dev
   如果 "${WORKTREE}" 目录已存在:先 git -C "${WORKTREE}" status 确认分支是否已是 ${BRANCH};如果是就直接继续用;如果目录存在但分支不对或损坏,先 git -C "${REPO}" worktree remove --force "${WORKTREE}"(只删这一个,不许动其他 worktree)再重新 add。
   之后所有涉及仓库/构建/测试的命令,都要么用 git -C "${WORKTREE}" ... 这种不依赖当前目录的写法,要么在同一条命令里先绝对路径 cd 到 "${WORKTREE}" 下再执行——每次新开的终端命令工作目录都会重置回默认位置,不会继承上一条命令 cd 过的地方,裸写相对路径(比如 cd packages/api)会跑到 "${REPO}" 主目录去,不要在 "${REPO}" 主目录下改动任何文件。
2. 逐条执行下面"侦察产出的执行清单"(见本 prompt 末尾追加内容)。每改一处先 Read 确认内容与清单描述一致再动手。
3. 每个新行为都要配对应测试(遵循仓库既有惯例:单测放在改动文件同目录 xxx.spec.ts;e2e 放 packages/api/test/xxx.e2e-spec.ts;新迁移配一个仿 diagnosis-status-migration-smoke.spec.ts 风格的 smoke 测试)——覆盖:发起即有 running 行、并发第二次收到 409、超时标 failed、惰性 failed 规则(且必须验证该规则在 409 判定之前生效,见下方"关键正确性要求")、chat 断开后回复仍落库、两个并发诊断不再自锁。
4. 手写 migration(不用 migration:generate):先 ls "${WORKTREE}\\packages\\api\\src\\database\\migrations" 找当前最大时间戳,新文件时间戳取比它更大的值;头注风格照抄 1782100000000-AddDiagnosisStatus.ts(说明背景/字段含义/回滚策略);内容只许 ADD(如需要的索引等),不许 DROP 任何列,不许回填任何存量行的 status 值。
5. 危险区纪律见下方「危险代码区纪律」一段,严格执行(不是最后跑一次)。

## 关键正确性要求(审计会重点核这一条,做错=blocking)
"惰性 failed 规则"必须先于"409 判定"执行。也就是说:检查"该用户是否已有进行中诊断"时,必须先对查到的 running 行做一次"是否已超时(超15分钟)"的判断——超时就地更新为 failed,然后再判断"是否还有真正处于 running 的行"来决定要不要返回 409。如果顺序反了(先看到有 running 行就直接 409,不检查是否早已超时该被判死),会导致一条卡死的僵尸 running 行让用户永远拿不到 409 之外的结果、永久卡死在"进行中"错觉里——这是比原 bug 更差的死锁。

${DANGER_ZONE}

## 自验(全部完成后,在最终回复里附原始输出,不许说"通过"两个字了事;下面每条命令都要用绝对路径 cd 到 worktree 或用 git -C,不要假设上一条命令 cd 过的目录还留着——每次新开的终端命令工作目录都会重置回默认位置,裸写相对路径会跑到 "${REPO}" 主目录,测的是别的分支)
1. 残留扫描:git -C "${WORKTREE}" grep -n "runObservable" -- packages/api/src/ai packages/api/src/diagnoses,确认死锁修复没有留下矛盾逻辑;git -C "${WORKTREE}" diff dev...HEAD --stat 确认改动文件都在清单范围内。
2. cd "${WORKTREE}\\packages\\api" && npx tsc --noEmit(只作编译探针,不冒充测试)。
3. cd "${WORKTREE}\\packages\\api" && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts —— 必须全绿(危险区门槛)。
4. cd "${WORKTREE}\\packages\\api" && npx jest —— 跑一次全量单测(默认 jest.config.json 的 testRegex 只匹配 "\\.spec\\.ts$",这条会覆盖 ai-stream-watchdog.spec.ts、concurrency-limiter.spec.ts、diagnosis-status-migration-smoke.spec.ts、你新建的迁移 smoke 测试等所有 .spec.ts 文件,必须全绿;它不会匹配任何 .e2e-spec.ts 文件,e2e 覆盖见下一条,不要指望这条命令替代它)。
5. cd "${WORKTREE}\\packages\\api" && npx jest --config ./test/jest-e2e.json --forceExit —— 这才是 e2e 套件的正确跑法(等价于 docs/AGENT-HANDBOOK.md §3 的 pnpm --filter @coach/api test:e2e)。陷阱(已用真实 regex 验证,不是猜测):裸的 npx jest 用的是 jest.config.json 的 testRegex "\\.spec\\.ts$",".e2e-spec.ts" 结尾的文件(如 diagnosis-stream.e2e-spec.ts)匹配不上会被安静跳过(0 匹配不报错也不提示跳过),那样上一条命令"全部通过"不代表这些文件真的跑了。必须单独用这条 --config 命令跑,全部绿才算数,重点核对:diagnosis-stream.e2e-spec.ts、diagnoses-campus.e2e-spec.ts、diagnosis-response-dto.e2e-spec.ts、diagnosis-response-dto-post-sse.e2e-spec.ts、chat-stream.e2e-spec.ts、conversations.e2e-spec.ts、conversation-context.e2e-spec.ts。
6. 只提交本任务涉及的文件(不要用 git add -A/.):逐路径执行 git -C "${WORKTREE}" add <path>,可以拆多次 commit(建议按 step→verify 的 5 步各一个提交:①running状态机+早落库 ②防重复409 ③chat解耦 ④前端恢复UI ⑤D1死锁修复,顺序不强制,但每次 commit 前如果涉及危险区文件必须先跑绿危险区两个 spec),每次用 git -C "${WORKTREE}" commit -m "..." 提交,commit message 用 "feat(diagnoses): ..." / "fix(ai): ..." 风格,和仓库现状一致。
7. 完成后不要删除 "${WORKTREE}",验证阶段的测试代理与审计代理还要用它。

最终回复=交付报告:清单逐条 DONE/SKIP(附原因)、D1 修法选择与理由、残留扫描输出、tsc 输出、两组危险区 spec 的原始输出、全量单测(裸 npx jest)与全量 e2e(--config ./test/jest-e2e.json --forceExit)两条命令各自的关键结果、全部 commit hash 列表、diff --stat。遇到清单与现实不符(目标内容不存在/行号漂移找不到对应逻辑)立即停在该条,报告不猜。`

phase('侦察')
const checklist = await agent(RECON_PROMPT, { label: 'recon:t4-s0-d1', phase: '侦察', model: 'sonnet' })

if (!checklist) throw new Error('侦察代理未返回,中止后续实现')

phase('实现')
const impl = await agent(IMPL_PROMPT + '\n\n## 侦察产出的执行清单(照此逐条做,行号漂移以内容为准,[缺失-需人工]的条目停下报告不猜)\n' + checklist,
  { label: 'impl:t4-s0-d1', phase: '实现', model: 'opus' })

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

const GATES_PROMPT = `你是测试代理,任务 key=t4-s0-d1-stability。工作目录用 "${WORKTREE}"(实现代理在此建的隔离 worktree,分支 ${BRANCH};不要在 "${REPO}" 主目录尝试切换到这个分支,该分支已被这个 worktree 占用,会报"already checked out"错误)。先 git -C "${WORKTREE}" log -1 确认在 ${BRANCH} 最新提交上,再逐门跑,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事,不改任何代码,挂了如实 FAIL 附错误)。下面每条命令都用绝对路径 cd 或 git -C,不要假设上一条命令 cd 过的目录还留着——每次新开的终端命令工作目录都会重置回默认位置,不会继承,裸写 cd packages/api 会跑到 "${REPO}" 主目录而不是这个 worktree,测出来的是别的分支的结果:

${DANGER_ZONE}

1) 危险区门槛(优先跑,这两个必须先绿):cd "${WORKTREE}\\packages\\api" && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
2) cd "${WORKTREE}\\packages\\api" && npx jest --runInBand —— 默认 jest.config.json 的 testRegex 只匹配 "\\.spec\\.ts$",这条覆盖所有 .spec.ts 单测(含危险区两个 spec、diagnosis-status-migration-smoke.spec.ts、实现代理新建的迁移 smoke 测试),必须全绿。注意必须从 packages/api 目录跑,从仓库根跑会走 babel-jest 报 TS 语法错,那是环境坑不是代码错。
3) cd "${WORKTREE}\\packages\\api" && npx jest --config ./test/jest-e2e.json --forceExit —— 这才是 e2e 套件的正确跑法(等价于 docs/AGENT-HANDBOOK.md §3 的 pnpm --filter @coach/api test:e2e)。陷阱(已用真实 regex 验证,不是猜测):上一条裸 npx jest 的 testRegex 匹配不到任何 ".e2e-spec.ts" 结尾的文件,会被安静跳过(0 匹配不报错也不提示跳过),那样上一条"全部通过"不代表这些文件真的跑了,必须单独用这条 --config 命令跑,全部绿才算数。重点核对本次涉及的:diagnosis-stream.e2e-spec.ts、diagnoses-campus.e2e-spec.ts、diagnosis-response-dto.e2e-spec.ts、diagnosis-response-dto-post-sse.e2e-spec.ts、chat-stream.e2e-spec.ts、conversations.e2e-spec.ts、conversation-context.e2e-spec.ts、chat-behavior-ai-live.e2e-spec.ts、以及新增的并发死锁回归用例。
4) cd "${WORKTREE}\\packages\\api" && npm run build(或等价 nest build)。
5) cd "${WORKTREE}\\packages\\web" && npx eslint src/ —— 0 错误。
6) cd "${WORKTREE}\\packages\\web" && npm run build —— 通过。
7) 并发死锁回归专项:如果实现代理提供的新增单测里没有覆盖"两个并发诊断请求不再自锁"这个场景,自己在只读观察下确认该场景是否已被某个测试实际覆盖(读测试代码判断,不许自己写新代码改仓库);没有覆盖到就判这一门 FAIL 并说明证据。
8) Playwright(走真实用户流,不是截图)前置准备——"${WORKTREE}" 是全新 git worktree,.env 属于 gitignore 不会随 worktree 带过来,不做这一步服务根本起不来或 DEV_LOGIN 不生效,不要略过:
   a) 复制本机已配置好的开发环境文件(只是本机开发配置,不含线上密钥,本机内两个目录间拷贝不算入库,不违反密钥纪律;用你手上能用的任何方式复制,比如 PowerShell 的 Copy-Item 或 Bash 的 cp,不强制命令形式):
      把 "${REPO}\\packages\\api\\.env" 复制为 "${WORKTREE}\\packages\\api\\.env"。
      把 "${REPO}\\packages\\web\\.env.local" 复制为 "${WORKTREE}\\packages\\web\\.env.local";如果源文件不存在,改用 packages/web/.env.example 复制为 .env.local 并保持 NEXT_PUBLIC_DEV_LOGIN=1、NEXT_PUBLIC_API_URL=http://localhost:3002/api。
   b) 验收一律用 build+start,不用 dev 模式(docs/AGENT-HANDBOOK.md §3 明文:dev 模式编译极慢且吃内存;第 4/6 步已经跑过两个包的 build,产物已在,直接复用起服务,不用重新 build)。起两个终端:
      cd "${WORKTREE}\\packages\\api" && npm run start(即 node dist/main,端口由 process.env.PORT ?? 3002 决定,刚复制的 .env 未显式设 PORT 时就是 3002)
      cd "${WORKTREE}\\packages\\web" && npx next start --port 3001 —— 不要用裸 npm run start,web 的 start 脚本是裸 "next start",默认监听 3000 不是 3001,和 playwright.config.ts 写死的 baseURL http://localhost:3001 对不上。
      如果本机常驻的主 dev 服务此刻正占着 3001/3002(两个工作区共享同一台机器),先确认冲突再决定停掉主 dev 服务还是换空闲端口(换端口要同步改 worktree 里 packages/web/.env.local 的 NEXT_PUBLIC_API_URL 和这里用到的 baseURL)。
   c) 登录用 DEV_LOGIN 通道(worktree 的 .env 已经带着本机 DEV_LOGIN=1):POST http://localhost:3002/api/auth/dev-login,body { "email": "<任意已存在或将被自动建号的测试邮箱>" },拿 token 写入浏览器 localStorage 的 'token' 键,再访问 http://localhost:3001。
   走查场景:
   a) 诊断页(new 或 campus 任一)发起诊断 → 立刻跳转到其他页面 → 返回诊断页 → 应看到"诊断进行中"卡片(不是空白)→ 等到完成自动进入结果页。
   b) 对话页发一条消息 → 立刻刷新页面 → 等 AI 回复生成完成后刷新/重新打开会话 → 应能看到完整回复(不是"发了没回"）。
   c) 快速连续两次对同一份简历发起诊断 → 第二次应收到进行中提示(409 语义),不应重复扣费或卡死。
9) 残留复扫:git -C "${WORKTREE}" grep -n "res.on\\('close'" -- packages/api/src/conversations,确认断开逻辑已按新哲学(断开不取消生成)实现,而不是删了整个 close 处理只留半成品;git -C "${WORKTREE}" grep -n "DROP COLUMN" -- packages/api/src/database/migrations/1782*.ts 之后新增的迁移文件,应为空(不许出现 DROP)。
实现背景:S0(流式任务状态保持+防重复)与 D1(限流器嵌套死锁)同批修复,危险区任务。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书),任务 key=t4-s0-d1-stability。仓库 "${REPO}",worktree "${WORKTREE}" 分支 ${BRANCH}(基线 dev)。审计 git diff dev...${BRANCH} 的完整 diff:固定用这条命令 git -C "${REPO}" diff dev...${BRANCH}(-C 指定仓库路径,不依赖你当前终端在哪个目录,不要自己 cd 去猜"哪个目录能看到这个分支"——每次新开的终端命令工作目录都会重置,猜的目录大概率是错的)。不改任何文件。

${SCOPE_REDLINES}

${DANGER_ZONE}

## 找茬重点(按优先级,每条发现附 file:line;第①条判错直接 verdict FAIL,severity=blocking)
① 惰性 failed 规则是否先于 409 判定执行——去读发起诊断时"查同用户同类型未超时 running 诊断"的那段代码:必须先对查到的 running 行判断是否已超时(15分钟)并就地更新为 failed,再看是否还有真正 running 的行来决定 409。如果代码是"先看到 running 行就直接 409、之后才可能处理超时"或压根没做超时惰性更新,这是 blocking:会导致一条卡死的僵尸行让用户永久拿不到结果。
② D1 修复正确性:确认改动范围是否精确卡在"由 diagnoses 管线内部(analyzer/rewriter/parser 的 completeStructured 调用)"这条链路,其余约20个独立消费 AiService 的服务(chat.service.ts、cover-letters.service.ts、mock.service.ts、interviews.service.ts、career.service.ts、opportunity-evaluator.service.ts、follow-up.service.ts、industry-trend.service.ts、announcement-generator.service.ts、networking.service.ts、feed 相关服务等)是否仍然正常受同一套限流保护——如果选的是"拆分两个 limiter 池"方案,检查两个池的并发上限配置是否被无意间放大成两倍总并发(资源耗尽新风险),以及 GET /ai/queue-status 暴露的排位数字是否依然诚实。
③ 超时次生问题是否处理:600s 管线超时路径是否仍会残留内层僵尸 waiter 污染队列(检查 reset()/finally 是否补齐了这条)。
④ diagnosis-event-stream.ts 的铁律(DB 落库不得绑定 SSE 订阅生命周期)是否被破坏;chat 侧的解耦是否做成了"断开就整个取消上游 AI 调用导致落库半截回复"而不是"只停转发、完整生成后落库"。
⑤ 手写 migration:是否纯 ADD、无 DROP、无回填任何存量 status 值;命名/头注风格是否对齐 1782100000000-AddDiagnosisStatus.ts;时间戳是否确实大于此前已存在的最大时间戳。
⑥ 范围红线:diff 里有没有出现 H0(头像)、D2-D9 其余债项、防护三件套、清理批、salary 模块相关的改动——任何一处出现即 blocking。有没有顺手实现了"SSE 断线重连/事件回放"这种明确排除的功能(优绩主义,判 major)。
⑦ 前端 mount 逻辑是否复用了现成的 GET /diagnoses(列表)与 GET /diagnoses/:id,而不是新建重复端点;409 响应是否被 postStreamRaw 或调用方正确解析并转入进行中视图。
⑧ 清单逐条核对:侦察产出的执行清单里每一条(见下方追加内容)是否都在 diff 里能找到对应改动,漏做的条目列出来;diff 里有没有清单外的改动(范围外改动逐条列出)。
⑨ 测试是否真实覆盖设计要求的场景(发起即 running 行/并发 409/惰性 failed 顺序/chat 断开后落库/两诊断不再死锁),还是敷衍占位。

verdict=PASS 仅当①②两条都无问题且无 blocking 级发现。

## 侦察产出的执行清单(供你核对 diff 是否逐条落实)
` + checklist

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t4-s0-d1', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t4-s0-d1', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
