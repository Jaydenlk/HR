export const meta = {
  name: 't4-s0-d1-closeout',
  description: 'T4 S0+D1 半成品收口——不从头重做:基于 worktree 已抢救提交的 WIP(0722155)做缺口审计(只读+探针)→只补缺口(opus,增量提交)→质量门+审计并行;判据与原任务完全一致',
  phases: [
    { title: '缺口审计', detail: '只读代理对照设计文档 R1-R9 逐项判 DONE/PARTIAL/MISSING,并跑 tsc+危险区两 spec 探针' },
    { title: '补完', detail: '仅当有缺口:opus 按缺口清单补完,每条立即 commit,危险区纪律全程生效' },
    { title: '验证', detail: '质量门测试与只读审计并行(与原任务同判据:惰性failed先于409是blocking级核点)' },
  ],
}

const REPO = 'E:\\Agent program\\HRBP'
const WORKTREE = 'E:\\Agent program\\coach-wt\\t4-s0-d1'
const BRANCH = 'feat/t4-s0-d1-stability'
const DESIGN_DOC = 'E:\\Agent program\\HRBP\\docs\\refactor2\\T4-hardening.md'
const AUDIT_DOC = 'E:\\Agent program\\HRBP\\docs\\refactor2\\CODE-AUDIT-2026-07-02.md'

const DANGER_ZONE = `## 危险代码区纪律(01-dev-principles.md 第四节原文,全程适用,不是走过场)
1. AI 流式/看门狗/限流器(ai.service.ts 流式部分、concurrency-limiter.ts、diagnoses.service.ts 管线超时):这里出过两次生产事故。改动后必跑:
   cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
   不变量:槽位只在 finally 释放;reset 必须 reject 排队 waiter;看门狗 idle 重置点是 reader.read() 返回(含 reasoning 帧),不是 yield。
2. AiService 主备降级(GLM 主力 + DeepSeek 备份):不许在业务代码里绕开 AiService 直连供应商。
3. 鉴权/额度:凡新增 AI 端点,默认挂 JwtAuthGuard + CreditGuard + 计费拦截器,和现有端点对齐。
本任务额外加码:每次改动 ai.service.ts / concurrency-limiter.ts / diagnoses.service.ts 三者之一后,当次改动必须先把上面那条 jest 命令跑到全绿再进行下一步。命令要在同一条里用绝对路径定位 worktree,例如 cd "${WORKTREE}\\packages\\api" && npx jest ...,不许裸写 cd packages/api(每条新终端命令的工作目录都会重置,裸相对路径会跑到别的目录,测的是别的代码)。`

const SCOPE_REDLINES = `## 本任务范围与红线(逐条照办,越界=违规)
- 本次只收口两件事:①T4-hardening.md「第零段:流式任务状态保持与防重复」;②D1(限流器嵌套死锁)。
- 明确不做、一个字不碰:H0(头像,已另行完成合并)、D2-D9 其余审计项、第二段「防护建设」三件套、第三段清理批、salary 模块。
- 明确不做(设计定稿排除,做了=优绩主义违规):诊断侧 SSE 断线重连/事件回放——轮询已完全满足需求。
- chat 前端"生成中轮询"是可选打磨,不是验收门,做不做都不算 FAIL。
- transcribe_task.asr_job_id 及其 status 字段与本任务无关,禁止碰。
- diagnosis-event-stream.ts 头部注释铁律不许破坏:DB 落库不得绑定 SSE 订阅生命周期。chat 侧同哲学:断开只停止向浏览器转发,不取消服务端生成,上游 AI 流完整消费到自然结束后照常落库——不许把"停止转发"错改成"提前结束上游流式请求"(那会落半截回复)。
- ConcurrencyLimiter 是全局单例,除 diagnoses 管线外还被约20个其他服务经 AiService 间接消费(chat/cover-letters/mock/interviews/career/opportunity-evaluator/follow-up/announcement-generator/networking/feed 等)。D1 修法绝不能让这些独立调用路径被误伤(失去限流保护)或被误放行(总并发翻倍)。诊断管线内层真正二次 acquire 的只有 analyzer.service.ts / rewriter.service.ts / parser.service.ts 对 this.ai.completeStructured(...) 的调用;skipLimiter 方案的跳过范围必须精确卡在这条链,不能做成 AiService 全局开关。
- GET /ai/queue-status 暴露的排位语义必须保持诚实;不改也可以,但交付报告里要说明理由。
- 手写 migration 只许新增,不许 DROP 任何列、不许改动/回填 diagnoses 表存量行的 status 值;时间戳必须大于 migrations 目录现存最大值(现查)。
- 每行改动可追溯到缺口清单;不顺手重构、不加没人要的配置项;历史死代码不动。`

const RUBRIC = `## 需求量规 R1-R9(设计定稿的完整拆解,缺口审计与最终审计都按这份来)
R1 running 状态机:诊断发起即插最小行(status 新增 'running'),随管线推进 update 到终态;entity(diagnosis.entity.ts 联合类型)/DTO/前端 types.ts 同步。
R2 migration:纯 ADD(为 running 提供必要 DDL,如索引),风格照抄 1782100000000-AddDiagnosisStatus.ts,时间戳大于现存最大;配套 migration-smoke spec。
R3 防重复 409:发起时后端查同用户同类型未超时 running 诊断,存在则 409 携带进行中 id;【关键正确性,审计 blocking 级】惰性 failed 判定必须先于 409——先对查到的 running 行判"是否已超 15 分钟"并就地更新为 failed,再看是否还有真 running 决定 409;顺序反了会让僵尸行把用户永久卡死在"进行中"。
R4 chat 解耦:conversations.controller.ts 的 res.on('close')→abort.abort() 联动拆除;断开只停转发,上游完整消费后落库。
R5 防僵尸:600s 管线超时处理器标 failed;读取时惰性规则(>15 分钟 running→failed);不建清扫 cron。
R6 D1 死锁:默认 A 方案(skipLimiter 精确透传诊断管线内层链);其余约20个消费方仍受限流;600s 超时路径不残留内层僵尸 waiter(reset()/finally 补齐);queue-status 语义诚实。
R7 前端恢复:new/campus 两诊断页 mount 时查进行中/最近诊断(复用现成 GET /diagnoses 与 GET /diagnoses/:id,不新建端点),有 running → "诊断进行中"卡片轮询至终态自动进结果页;409 → 转进行中视图不重复扣费;postStreamRaw 能把 409 状态码与 body 暴露给调用方。
R8 测试覆盖(每场景要有真实用例,不是占位):发起即有 running 行/并发第二次 409/超时标 failed/惰性 failed 先于 409 的顺序/chat 断开后回复仍落库/两个并发诊断不再自锁/迁移 smoke。
R9 范围纪律:diff dev...HEAD 里没有 H0、D2-D9、防护三件套、清理批、salary、SSE 重连等范围外内容。`

phase('缺口审计')
const GAP = {
  type: 'object', required: ['has_gaps', 'items', 'probes'],
  properties: {
    has_gaps: { type: 'boolean', description: '任一项非 DONE 或任一探针失败即 true' },
    items: { type: 'array', items: { type: 'object', required: ['req', 'status', 'evidence'], properties: {
      req: { type: 'string', description: 'R1..R9' },
      status: { type: 'string', enum: ['DONE', 'PARTIAL', 'MISSING'] },
      evidence: { type: 'string', description: 'file:line 或测试名等可核实证据;PARTIAL/MISSING 必须写清缺什么' },
      fix_hint: { type: 'string', description: '给补完代理的一句话改法提示' } } } },
    probes: { type: 'object', required: ['tsc_pass', 'danger_specs_pass'], properties: {
      tsc_pass: { type: 'boolean' }, danger_specs_pass: { type: 'boolean' },
      notes: { type: 'string', description: '探针失败时贴关键错误原文' } } },
  },
}

const GAP_PROMPT = `你是只读缺口审计代理,任务 key=t4-s0-d1-closeout。背景:S0+D1 稳定性任务的 opus 实现被配额中断三次,半成品已被抢救性提交到 worktree "${WORKTREE}"(分支 ${BRANCH},最新应含 commit 0722155 "wip(t4-s0-d1): ..."),内容未经过质量门。你的职责:对照设计定稿逐项判定完成度,产出结构化缺口清单。**不许修改任何文件**;允许且必须运行只读探针命令(tsc/jest)。

## 第一步:确认现场
git -C "${WORKTREE}" log --oneline -5 与 git -C "${WORKTREE}" status --short:确认分支是 ${BRANCH}、WIP 提交在、工作区无未提交残留。现场不符(worktree 不存在/分支不对/还有未提交改动)→ 在 items 里加一条 req="现场异常" status=MISSING 写明实况,has_gaps=true,其余照常尽力审。

## 第二步:读需求基准
1. ${DESIGN_DOC}:「第零段:流式任务状态保持与防重复」整段 + 第一段 D1 行 + 第二段 D1 修复预案 + 红线段(标题定位,行号会漂移)。
2. ${AUDIT_DOC} 第 52-55 行与第 384 行:D1 原始证据。
3. 下方 R1-R9 量规——判定就按它逐条来。

${RUBRIC}

## 第三步:审 WIP
git -C "${WORKTREE}" diff dev...HEAD(全量 diff)+ 按需 Read worktree 里的具体文件。R1-R9 逐项判 DONE/PARTIAL/MISSING,每项给可核实证据(file:line/测试名/grep 命中)。R8 要逐场景点名:哪个场景有用例、哪个没有。

## 第四步:跑探针(在 worktree 里,绝对路径 cd)
1. cd "${WORKTREE}\\packages\\api" && npx tsc --noEmit
2. cd "${WORKTREE}\\packages\\api" && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
结果如实写进 probes,失败贴关键错误原文到 notes。

${SCOPE_REDLINES}

按 schema 返回结构化结果;items 必须 R1-R9 每项都有一条(外加可能的"现场异常")。`

const gap = await agent(GAP_PROMPT, { label: 'gap-audit:t4-s0-d1', phase: '缺口审计', schema: GAP, model: 'sonnet' })
if (!gap) throw new Error('缺口审计代理未返回,中止')
log(`缺口审计完成:has_gaps=${gap.has_gaps},tsc=${gap.probes.tsc_pass},危险区spec=${gap.probes.danger_specs_pass}`)

let fixReport = '无需补完:缺口审计判定 R1-R9 全部 DONE 且探针全绿,直接进入验证段。'
if (gap.has_gaps) {
  phase('补完')
  const FIX_PROMPT = `你是补完代理(opus,危险区任务,不许降级思维草草了事),任务 key=t4-s0-d1-closeout。前任 opus 的实现被配额中断三次,半成品已提交在 worktree "${WORKTREE}"(分支 ${BRANCH})。你的职责:**只修下方缺口清单里 status 为 PARTIAL/MISSING 的项与失败的探针,DONE 的项一个字不碰**。不许重做、不许 revert 半成品重来、不许"顺手改进"已完成部分。

## 增量提交铁律(你的前任就是因为没做这条,三个窗口 300k+ token 全部白干)
每修完一个缺口项(或一组强耦合项)立即 git -C "${WORKTREE}" add <逐路径> 并 commit(message 用 "wip(t4-s0-d1): 补<R编号> <一句话>")。不许攒到最后。配额中断时,已提交的就是断点。

## 操作规程
- 全部读写在 "${WORKTREE}" 里做;每条终端命令都用绝对路径 cd 或 git -C(每条新命令工作目录会重置,裸 cd packages/api 会跑到 "${REPO}" 主目录,改的测的都是别的代码)。
- 每改一处先 Read 确认现状与缺口描述一致再动手;发现缺口描述与实际代码矛盾,停在该条如实报告,不许猜。
- 设计基准:${DESIGN_DOC} 第零段+D1 相关段;需求量规见下方 R1-R9。

${RUBRIC}

${SCOPE_REDLINES}

${DANGER_ZONE}

## 自验(缺口全部补完后统一做,原始输出附最终回复,不许说"通过"两个字了事)
1. 残留扫描:git -C "${WORKTREE}" grep -n "runObservable" -- packages/api/src/ai packages/api/src/diagnoses;git -C "${WORKTREE}" diff dev...HEAD --stat 确认改动都在范围内。
2. cd "${WORKTREE}\\packages\\api" && npx tsc --noEmit
3. cd "${WORKTREE}\\packages\\api" && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts —— 危险区门槛必须全绿。
4. cd "${WORKTREE}\\packages\\api" && npx jest —— 单测全量(testRegex 只匹配 .spec.ts,覆盖不到 e2e)。
5. cd "${WORKTREE}\\packages\\api" && npx jest --config ./test/jest-e2e.json --forceExit —— e2e 全量(裸 npx jest 会安静跳过全部 .e2e-spec.ts,必须这条 --config 命令)。
6. 全部改动已按增量提交铁律入库,git -C "${WORKTREE}" status 干净。
最终回复=交付报告:缺口清单逐项 FIXED/SKIP(附原因)、每项的证据(测试输出/diff 片段)、全部新 commit hash、自验 1-5 的原始输出关键段。

## 缺口审计结果(只修这些)
` + JSON.stringify(gap.items, null, 2) + '\n\n## 探针现状\n' + JSON.stringify(gap.probes, null, 2)

  const fix = await agent(FIX_PROMPT, { label: 'fix:t4-s0-d1', phase: '补完', model: 'opus' })
  if (!fix) throw new Error('补完代理未返回,中止验证(已完成的补完提交都在分支上,续跑无损)')
  fixReport = fix
}

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

const GATES_PROMPT = `你是测试代理,任务 key=t4-s0-d1-closeout。工作目录用 "${WORKTREE}"(分支 ${BRANCH};不要在 "${REPO}" 主目录尝试切这个分支,会报 already checked out)。先 git -C "${WORKTREE}" log -1 确认在最新提交上,再逐门跑,每门附原始输出关键段(失败贴完整错误,不改任何代码,挂了如实 FAIL)。每条命令都用绝对路径 cd 或 git -C(每条新命令工作目录会重置,裸 cd packages/api 会跑到 "${REPO}" 主目录,测的是别的分支):

${DANGER_ZONE}

1) 危险区门槛(优先跑):cd "${WORKTREE}\\packages\\api" && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts
2) cd "${WORKTREE}\\packages\\api" && npx jest --runInBand —— 单测全量(testRegex 只匹配 .spec.ts,覆盖不到 e2e;必须从 packages/api 目录跑,从仓库根跑会走 babel-jest 报 TS 语法错,那是环境坑不是代码错)。
3) cd "${WORKTREE}\\packages\\api" && npx jest --config ./test/jest-e2e.json --forceExit —— e2e 全量(裸 npx jest 会把 .e2e-spec.ts 安静跳过,必须这条命令)。重点核对:diagnosis-stream / diagnoses-campus / diagnosis-response-dto / diagnosis-response-dto-post-sse / chat-stream / conversations / conversation-context / chat-behavior-ai-live 各 e2e 及新增并发死锁回归用例。
4) cd "${WORKTREE}\\packages\\api" && npm run build
5) cd "${WORKTREE}\\packages\\web" && npx eslint src/ —— 0 错误。
6) cd "${WORKTREE}\\packages\\web" && npm run build
7) 并发死锁回归专项:确认"两个并发诊断不再自锁"场景已被某个测试实际覆盖(读测试代码判断);没覆盖判 FAIL 附证据。
8) Playwright 真实用户流(硬门;"${WORKTREE}" 是 worktree,.env 属 gitignore 不随 worktree 带过来,先补环境否则服务起不来):
   a) 复制本机开发配置(本机内拷贝不入库,不违反密钥纪律):"${REPO}\\packages\\api\\.env" → "${WORKTREE}\\packages\\api\\.env";"${REPO}\\packages\\web\\.env.local" → "${WORKTREE}\\packages\\web\\.env.local"(源缺失就用 packages/web/.env.example 复制并保持 NEXT_PUBLIC_DEV_LOGIN=1、NEXT_PUBLIC_API_URL=http://localhost:3002/api)。
   b) 用 build+start 不用 dev 模式(第 4/6 门产物直接复用):cd "${WORKTREE}\\packages\\api" && npm run start(3002);cd "${WORKTREE}\\packages\\web" && npx next start --port 3001(不要裸 npm run start,默认 3000 对不上 playwright baseURL)。3001/3002 被主 dev 服务占用就先确认冲突再决定停掉或换端口(换端口同步改 .env.local 与 baseURL)。
   c) 登录:POST http://localhost:3002/api/auth/dev-login,token 写 localStorage 'token' 键,再访问 http://localhost:3001。
   走查:①诊断页发起诊断→立刻跳走→返回→应见"诊断进行中"卡片(非空白)→等完成自动进结果页;②对话页发消息→立刻刷新→生成完成后重开会话→应见完整回复;③同一简历快速连发两次诊断→第二次收到进行中提示(409 语义),不重复扣费不卡死。
   环境起不来先排查一次(端口/残留进程/5432 winnat),仍起不来如实 FAIL 写清卡点——那是环境问题按 STOP 处置,不许标 SKIPPED 混过。
9) 残留复扫:git -C "${WORKTREE}" grep -n "res.on\\('close'" -- packages/api/src/conversations(断开逻辑应是"停转发不取消生成"而非删一半);新增迁移文件里 grep "DROP COLUMN" 应为空。
实现背景:S0(流式状态保持+防重复)+D1(限流嵌套死锁)半成品收口,危险区任务,实现历经配额中断由缺口补完接续。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书),任务 key=t4-s0-d1-closeout。仓库 "${REPO}",审计 git -C "${REPO}" diff dev...${BRANCH} 的完整 diff(-C 指定仓库路径,不依赖当前目录)。不改任何文件。背景:该实现历经三次配额中断+抢救提交+缺口补完,你要按统一量规审最终结果,不管它中间断过几次。

${SCOPE_REDLINES}

${DANGER_ZONE}

${RUBRIC}

## 找茬重点(按优先级,每条发现附 file:line;第①条判错直接 verdict=FAIL,severity=blocking)
① R3 的顺序:惰性 failed 是否先于 409 判定执行——读发起诊断时查 running 行的那段代码,必须先判超时(15分钟)就地更新 failed,再决定 409。顺序反了或没做惰性更新 = blocking。
② R6 修复正确性:改动是否精确卡在诊断管线内层链(analyzer/rewriter/parser 的 completeStructured 调用);其余约20个 AiService 消费方是否仍受限流;若拆双池,总并发是否被无意放大;queue-status 是否仍诚实。
③ 600s 超时路径是否仍残留内层僵尸 waiter(reset()/finally)。
④ diagnosis-event-stream.ts 铁律是否被破坏;chat 解耦是否做成"断开即取消上游导致半截落库"(错)而非"停转发、完整生成后落库"(对)。
⑤ migration:纯 ADD、无 DROP、无回填存量 status;命名/头注对齐 1782100000000-AddDiagnosisStatus.ts;时间戳大于此前最大。
⑥ 范围红线:diff 出现 H0/D2-D9/防护三件套/清理批/salary 相关改动即 blocking;顺手实现 SSE 断线重连/事件回放判 major。
⑦ R7 前端:是否复用现成 GET /diagnoses 与 /:id 而非新建端点;409 是否被 postStreamRaw 或调用方正确解析并转进行中视图。
⑧ R1-R9 逐项核对 diff 是否落实,漏项列出;diff 里量规外的改动逐条列出。
⑨ R8 测试是否真实覆盖(发起即 running/并发 409/惰性顺序/chat 断开落库/两诊断不死锁),还是敷衍占位。
verdict 判法:①②有问题或存在任何 blocking → FAIL;只有 major/minor → PASS(如实列进 findings,会记入遗留清单,不许为凑 PASS 漏报,也不许拿 minor 压 FAIL)。

## 缺口审计与补完的过程记录(供溯源,不代表已验证正确;一切以你读到的 diff 为准)
### 缺口审计 items
` + JSON.stringify(gap.items, null, 2) + `
### 补完报告
` + fixReport

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t4-s0-d1', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t4-s0-d1', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  gap,
  fix_report: fixReport,
  gates,
  review,
}
