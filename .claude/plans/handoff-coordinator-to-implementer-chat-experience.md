# Handoff: Coordinator → Implementer (B2 对话教练体验:行为骨架+流式+排队前端)

## 状态: READY_FOR_REVIEW
> 注:本文件是工作目录内的副本(主仓 `.claude/plans/` 那份因 worktree 隔离不可写)。
> 实现结果与证据写在此处,请审查时以本副本为准。

## 任务: 把聊天教练升级为 SSE 流式 + career-principal 行为骨架七要素 + 按需取数 + 排队可见化前端;现有非流式链路原样保留。
## 工作目录: E:\HRBP-wt\chat-experience(branch feature/chat-experience)
## 前置依赖(B1 已就绪): AiService.chat(messages+tier+流式)、ConcurrencyLimiter(status/runObservable/runStreaming)、GET /ai/queue-status

## 执行计划与验证结果 (step→verify)

### Step 1: pnpm install + 复制 .env → 双端 build 基线绿
- **PASS** — pnpm install Done(1097 包);.env 从主仓 packages/api/.env 复制并 `git check-ignore` 确认被忽略(永不入库)。
  api `pnpm build` 绿;web `pnpm build` 绿(31 页全出)。

### Step 2: 后端 SSE+多轮+记账时机 → jest
- **PASS** — 新增 `test/chat-stream.e2e-spec.ts`(11 用例全绿)+ `test/conversations.e2e-spec.ts` 新增 SSE 端点 4 用例:
  - SSE token 增量序列正确(`['你好','，','我来帮你']`)+ done 落库 user/assistant 消息。
  - **流完成才扣 1 点**:done.credit_balance 7→6,DB 余额 6。
  - **流中途失败 → error 事件 + 不扣点 + 不落 assistant 消息**(余额保持 4,只落 user 消息)。
  - 排队积压 → 先推 queue 事件(position>0)。
  - 非流式旧端点 sendMessage 回归绿(降级路径)。
  - 真实 AppModule e2e:`/messages/stream` 401(无 JWT)/400(缺 content)/200+text/event-stream+data帧/越权→error 帧。
- 记账实现:CreditInterceptor 不挂在 SSE 端点(它在 observable 完成时扣,无法表达"中断不扣");改由 `ConversationsService.streamMessage` 在流正常 done 后显式 `credit.consume`,error/中断路径不调。CreditGuard 仍前置校验余额<1→402。
- 真多轮:`ChatService.buildMessages` 把历史+本轮整理成 user/assistant 交替数组(首条须 user);`ChatService.stream/reply` 走 `ai.chat({tier:'pro', maxTokens:4096})`。

### Step 3: system prompt 行为骨架 + 按需取数 → jest
- **PASS** — chat-stream спец断言 prompt 含七要素关键句(追问纪律「最多追问3轮」+「为什么需要」/ 主动盘点「不看会损失什么」/ 续接「用户确认才执行」/ 五种标源标签 [据简历][据诊断][据平台记录][推断][通用经验] / 防编造「未经核实的口头主张」/ 身份「求职主理人」「结论先行」/ 模块地图「站内能力地图」+ /diagnoses + /mock)。
- 按需取数(`CoachContextService.loadReferencedProducts`):flash 小 schema 选择器命中 cover_letter → 上下文并入该求职信全文;幻觉/越权 id 被目录白名单过滤;选择器抛错 → 静默降级返回空串(不抛错不重试)。
- 开场上下文(`buildContext`):EvidenceService 画像 + 主简历全文(is_primary raw_text)+ 最新诊断要点 + 产物目录(诊断/求职信 type/标题/日期/id)——断言含「主簡历全文」+独特口令+「最新诊断要点」+公司名+「产物目录」。
- 七要素蒸馏自 `career-skills-marketplace/skills/career-principal/SKILL.md`(§2.5/§2.6/§4/标源标签段),中文贴 SaaS,不照抄 CC 工具语义。

### Step 4: 前端流式+排队 → 本地起服 Playwright
- **PASS** — 起本地服(API:sqlite+DEV_LOGIN+真实 .env AI key,port 3012;web dev,port 3011):
  - **流式增量(两帧对比)**:dev-login → 进会话页 → 发消息,轮询采集流式气泡(带光标 `▍`)。
    - 帧1 @5458ms len=22 尾"好的小李,你的背景挺清晰了:大四在读、一段"
    - 帧2 @6277ms len=65 尾"...榨干,并且马上补齐大厂后端岗的硬通货——八股文、算法"
    - 文本 22→65 增长 = 真流式逐字渲染,非整段一次性落。截图 `.playwright-mcp/chat-streaming-rendered.png`。
  - **扣点+余额刷新**:发一条后侧边栏余额 50→49(done 事件触发 coach:credit-refresh,layout 拉新余额)。
  - **error 路径可读(拔 AI key)**:另起无效 AI key 的 API(port 3013),消费 SSE → 单个 error 事件,message="AI 服务暂时不可用(chat 主备通道均失败:Connection error.),请稍后重试。",**余额保持 50(未扣)**。
  - **排队接口**:GET /ai/queue-status 返回 {active,queued}=200(全局轮询提示的后端支点)。
  - 浏览器控制台无 JS 报错。
- 注:队列"逐条推"在 SSE 内只推进入生成前的初始排位快照(chat() 内部走 runStreaming 不带 onPosition,无法在不改 ai/** 的前提下逐 token 推排位);**连续排位变化由 step 7 的全局 GET /ai/queue-status 轮询提示承载**(2s 间隔),两者互补。后端 chat-stream спец已确定性验证 queue 事件在积压时触发。

### Step 5: AI 真跑体验剧本(花真钱,3-4 条消息,tier 生效)
- **PASS** — 新增 `test/chat-behavior-ai-live.e2e-spec.ts`(RUN_AI_LIVE=1,真实简历用户,连发 4 条消息)全绿。断言:标源标签出现=true / 追问或盘点(①)=true / 续接提议(②④)=true / 防编造把关(③)=true。全文人工核对:
  - **剧本①(我该投什么岗位)**:结论先行(「直接说结论:你的背景匹配后端开发岗」);[据简历][推断][通用经验] 大量标源;**一次问完 3 个问题、每个附"理由:..."**(求职进度/其他方向/公司类型);**主动盘点高损失维度**「你没问但会损失很大的一个维度:上海应届生落户政策...价值远超起薪差,错过应届窗口...」;结尾续接「先做 JD 匹配诊断 → 再给投递清单」。
  - **剧本②(下一步)**:续接锁定后端主赛道,给"现在就能做且必须做"的项目故事打磨 + 站内模块口径续接;仍按追问纪律补问剩余 2 个关键信息(各带理由)。
  - **剧本③(口头夸大:字节实习+千万级,简历无)**:**防编造红线生效**——「你说的字节实习/主导千万级重构目前属于未经核实的口头主张。[据简历]简历里没有任何字节记录...直接给你写能背的自我介绍等同于编造履历,面试官追问就露馅」,给合规路径(补简历→用真实 P95 优化做战绩钩子),不编造。
  - **剧本④(现在具体做什么)**:再次给最该做的下一步(补简历技能标签+项目技术栈 → 跑简历诊断 → 准备"410ms→120ms"保底故事),续接到站内"简历诊断"模块,问不穿的版本。

### Step 6: 门禁 → api tsc 0 错+全量 jest;web eslint+tsc 0 错+build
- **PASS**:
  - api `tsc --noEmit` 0 错;`pnpm test`(单元)275 通过/11 skip;touched e2e(conversation|chat-stream|credit|coach-context)70 通过/2 skip;health|evidence 52 通过(确认 AppModule 启动正常)。
  - web `eslint src/` 0 错;`tsc --noEmit` 0 错;`pnpm build` 绿。

### Step 7: 其他 AI 页排队提示(全局机制) + commit 不 push
- **PASS(实现)** — lib/api.ts 的 `post` 包一层 `watchQueue`:2.5s 后才探测、2s 间隔轮询 GET /ai/queue-status,有排队广播 `coach:ai-queue{position}`,完成 `coach:ai-queue-clear`;layout.tsx 全局监听渲染 sonner toast「当前使用人数较多,正在排队,前面还有 x 个请求」,固定 toast id 就地更新、完成 dismiss。全局机制,各 AI 页无需逐页改造。
- commit:见下方"产出物";**未 push**(遵守纪律)。

## 产出物
后端(packages/api):
- src/conversations/chat.service.ts:七要素 system prompt(buildSystemPrompt)+ 真多轮 buildMessages + stream/reply 走 ai.chat(pro,4096)。
- src/conversations/coach-context.service.ts:开场上下文(画像+主简历全文+最新诊断+产物目录)+ 按需取数选择器(flash,白名单过滤,静默降级)。
- src/conversations/conversations.service.ts:streamMessage 生成器(queue/token/done/error 事件 + 流完成才扣点)+ 共享 helper + buildUserContext(开场+按需)。
- src/conversations/conversations.controller.ts:POST :id/messages/stream(@Res 手写 SSE,CreditGuard 前置,200+event-stream,error 帧归一中文)。
- src/conversations/conversations.module.ts:补 Resume/CoverLetter 仓库 + 新依赖。
- src/ai/ai.module.ts:**唯一对 ai/** 的改动 = 把 ConcurrencyLimiter 加入 exports**(纯增量,启用 conversations 读 queue 状态;不改任何 ai 行为)。
- test/chat-stream.e2e-spec.ts(新,11 用例)、test/chat-behavior-ai-live.e2e-spec.ts(新,RUN_AI_LIVE)、test/conversations.e2e-spec.ts(补 SSE 端点 4 用例)、test/conversation-context.e2e-spec.ts + test/coach-context.e2e-spec.ts(补新依赖 DI,断言不变)。

前端(packages/web):
- src/lib/api.ts:postStream(SSE fetch+ReadableStream,带 Bearer,逐 data 帧解析 ChatStreamEvent)+ 全局排队轮询(watchQueue)+ ChatStreamEvent 类型。
- src/app/(main)/chat/[id]/chat-detail.tsx:流式渲染(StreamingBubble 带光标)+ 排队提示 + done 落定刷余额 + error 不丢已渲染内容 + 不支持/失败→非流式降级。
- src/app/(main)/layout.tsx:全局排队 toast + coach:credit-refresh 余额刷新监听。

## 遗留问题 / 决策上下文
- **ai/** 触碰说明**:仅 ai.module.ts 增 1 行 exports(ConcurrencyLimiter),为让 conversations 读队列状态。这是"调用"启用,不改 ai 任何行为/逻辑。若审查认为越线,可改为 conversations 经 AiService 暴露只读 status() 转发——但当前做法更直接、零 glue。请审查拍板。
- **队列"逐条推"取舍**:SSE 内只推进入生成前初始排位(理由见 step4 注);连续排位变化由全局 /ai/queue-status 轮询承载。若要 SSE 内逐 token 推排位,需在 ai/** 让 chat() 改用 runObservable——超出本批禁区,记为后续。
- 记账时机语义已与 B1 "成功才扣"对齐(CreditInterceptor next 回调 = SSE done 后 consume)。
- 现有非流式 POST /conversations/:id/messages 原样保留并回归绿(降级路径,红线达成)。

## 决策上下文
- 已选方案:SSE 手写流(@Res)+ 服务层生成器吐 queue/token/done/error;按需取数用 flash 小 schema 选择器 + 目录白名单 + 静默降级;前端流式默认 + 自动非流式降级;全局排队提示用事件广播 + layout 单点 toast。
- 已排除:① CreditInterceptor 直接复用于 SSE(无法表达"中断不扣")→ 改服务层手动 consume;② 逐页改造排队提示 → 改 lib/api.ts 全局机制;③ 在 ai/** 让 chat 走 runObservable 逐 token 推排位 → 越禁区,留待后续。
