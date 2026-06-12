# Handoff: Coordinator → Implementer (B1 AI 基础层)

## 状态: READY_FOR_REVIEW(实现完成,门禁全绿;relay 真机冒烟因所给 .env 无 CloudDreamAI 密钥被阻塞,见遗留问题)
## 工作目录: E:\Agent program\HRBP-wt\ai-foundation(分支 feature/ai-foundation)
## 任务: AiService 升级——真多轮 messages + 流式 + 场景档位(pro|flash)+ 备用通道型号迁移 + 并发队列可见化
## 输入文件: packages/api/src/ai/**、packages/api/src/config/ai.config.ts、packages/api/src/diagnoses|resumes 的 AI 调用点(仅加 tier 参数)
## 禁止触碰: packages/web/**、conversations/**(B2 的事)、mock/**(D1 的事)、credit/quota 模块、.env 入库(本地可复制主仓 .env 到 worktree 用,永不提交)

## 已核实事实(2026-06-12 联网验证,不要再凭记忆怀疑)
- DeepSeek Anthropic 兼容端点 https://api.deepseek.com/anthropic 官方支持 SSE 流式([文档](https://api-docs.deepseek.com/guides/anthropic_api))。
- 型号:`deepseek-v4-flash` / `deepseek-v4-pro`;现配的 `deepseek-chat` 2026-07-24 弃用,必须迁移。
- 主通道(CloudDreamAI 中转 auto-v2)流式支持未经验证 → 本批冒烟实测。
- **用户拍板(2026-06-12 夜,两条)**:① DeepSeek 走官方直连地址,只有 auto-v2 走中转,分档型号参考 DeepSeek 官方文档;② **测试期间主备调换:DeepSeek 官方为主力通道(两档都是),auto-v2 降为备份**。通道顺序做成 env 可切(测试期默认 deepseek 在前),日后切回不改代码。

## 规格
1. **AiService.chat(...)**:接受 system + 真 messages 数组(user/assistant 交替)+ tier + maxTokens;流式(SDK messages.stream),以 async iterable 或回调向上交付增量文本;沿用 withFailover:首 token 前失败→切备通道重试;首 token 后失败→向上抛明确错误(不静默重试);两通道都失败→503。保留现有 complete/completeStructured 行为不变。
2. **场景档位与通道顺序**:complete/completeStructured/chat 增加可选 `tier?: 'pro'|'flash'`(默认 flash)。路由规则(用户已拍板,测试期 DeepSeek 主力):
   - `flash`(默认):主 DeepSeek 官方 `deepseek-v4-flash`(直连 api.deepseek.com,流式官方支持),备 auto-v2 现有别名(中转)。
   - `pro`:主 DeepSeek 官方 `deepseek-v4-pro`,备 auto-v2 现有别名(降档保命,记 AI_FAILOVER 事件)。
   - 通道顺序 env 可切(如 `AI_PRIMARY_PROVIDER=deepseek|relay`,缺省 deepseek);型号 env:`AI_MODEL_PRO`(缺省 deepseek-v4-pro)/`AI_MODEL_FLASH`(缺省 deepseek-v4-flash)。ai.config.ts 与 env.validation 同步;主通道沿用"maxRetries=0 快速失败切备"的现行哲学;不引入中转侧新别名。
3. **型号迁移**:备用通道默认型号 deepseek-chat → deepseek-v4-flash(含配置注释更新)。
4. **调用点 tier 标注(仅此两处模块)**:简历诊断/改写链路(diagnoses 的 analyze/suggest 等核心产出调用)标 tier:'pro';解析类(parseResume/parseJD)保持 flash。mock 与 conversations 的 tier 由各自批次负责,本批不碰。
5. **并发队列可见化**:ConcurrencyLimiter 增加状态读取(active/queued)与"本请求当前排位+排位变化订阅"(供 B2 的 SSE 推送用);新增轻量 `GET /ai/queue-status`(JwtAuthGuard)→ `{active, queued}`。超队列上限的错误信息改为友好中文文案(给前端直接展示)。

## 执行计划 (step→verify)
1. pnpm install + 复制主仓 packages/api/.env → verify: build 通过,现有 jest 全绿(基线)
2. chat 流式 + failover → verify: jest(mock SDK)覆盖——多轮 messages 正确传递/首token前主挂切备/首token后挂上抛/两败503
3. tier 档位 + env + 型号迁移 → verify: jest 断言各档位实际选用型号;env 缺省行为=现状
4. 诊断/改写调用点 tier:'pro' → verify: grep 列出全部修改行,无 mock/conversations 文件被改
5. 队列可见化 → verify: jest——并发压 3 请求时 queue-status 数字正确、排位回调按序触发
6. **真机冒烟(花真钱,各 1-2 次小调用)**:auto-v2 中转流式真跑一次(验证中转 SSE);DeepSeek 官方 deepseek-v4-flash 与 deepseek-v4-pro 各流式真跑一次 → verify: 贴增量 chunk 到达的原始日志(证明是流不是整段)
7. 门禁 → verify: npx tsc --noEmit 0 错、npx eslint src/ 0 错、全量 jest 通过,贴原始摘要
8. 提交 feature/ai-foundation(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
- 现有所有调用方零行为变化(默认参数=现状)是硬约束,回归 jest 必须全绿
- 流式中途失败不许静默换通道重发(会导致用户看到重复内容)——明确上抛
- .env 永不入库;冒烟日志不得包含 key
- 完成后更新本文件(已完成/产出物/逐 step 验证结果/遗留)

## 已完成
- AiService 重构为「按 AI_PRIMARY_PROVIDER 排序的通道数组(deepseek 直连 / relay 中转)」;每通道按 tier 选型号(deepseek→pro/flash,relay→单一 auto-v2);complete/completeStructured 行为不变(默认 tier=flash)。
- 新增 `AiService.chat(ChatParams)`:真多轮 messages + SDK messages.stream 流式,返回 async generator 逐增量文本;首 token 前失败切下一通道、首 token 后失败直接上抛(不静默重发)、全通道首 token 前皆败抛 503;降级/双败写 AI_FAILOVER/AI_BOTH_DOWN。
- ai.config.ts 重构:primaryProvider(缺省 deepseek)+ deepseek{modelPro/modelFlash}+ relay{model};型号迁移 deepseek-chat→deepseek-v4-flash(flash 缺省);新名 AI_PRIMARY_PROVIDER/AI_DEEPSEEK_*/AI_MODEL_PRO/AI_MODEL_FLASH/AI_RELAY_*,?? 旧名 DEEPSEEK_*/CLOUDDREAM_*/AI_PRIMARY_*/AI_FALLBACK_* 全兜底(存量 .env 与 19 个 module 测试零改动)。
- env.validation 同步:新增上述 env 字段校验 + 跨字段必填改为「relay 或 deepseek 任一通道有 key」。
- ConcurrencyLimiter 队列可见化:status()→{active,queued};runObservable(task,onPosition) 推送排位变化(入队初始位→前移→0 执行);runStreaming(factory) 为整段流持槽至耗尽才释放。
- 新增 `GET /ai/queue-status`(JwtAuthGuard)→{active,queued};队列满友好中文文案沿用现有。
- 调用点 tier:'pro' 标注(仅 ai 模块的诊断/改写核心产出):analyzer.analyze / analyzer.analyzeAgainstPreset / rewriter.suggest / rewriter.suggestAgainstPreset;parseResume/parseJD 与 auditFaithfulness 保持 flash。

## 产出物
- src/ai/ai.service.ts:通道数组化 + 按 tier 选型号 + 新增 chat() 流式 + streamProvider/withFailover 多通道化
- src/ai/concurrency-limiter.ts:status()/runObservable()/runStreaming() + QueueStatus/PositionListener 类型
- src/ai/ai.controller.ts(新):GET /ai/queue-status
- src/ai/ai.module.ts:注册 AiController
- src/ai/analyzer.service.ts、src/ai/rewriter.service.ts:4 处核心产出调用加 tier:'pro'
- src/config/ai.config.ts:AiConfig 重构(primaryProvider/deepseek/relay)+ AiTier 类型 + 型号迁移
- src/config/env.validation.ts:新 env 字段 + 跨字段必填放宽
- test/ai-service-chat-tier.spec.ts(新):chat 流式 + failover + tier 选型(10 例)
- test/ai-config.spec.ts:新增 aiConfig() 工厂默认值/env 覆盖/旧名兜底(11 例)
- test/concurrency-limiter.spec.ts:新增队列可见化(status/runObservable/runStreaming,3 例)
- test/ai-service-structured.spec.ts、test/ops-events.e2e-spec.ts:AiConfig stub 适配新结构(AI_FAILOVER detail 改记 provider 名 relay/deepseek)

## 验证结果
- Step 1 基线: PASS — pnpm install 成功;主仓 .env 已复制到 worktree(gitignored,未入库);tsc --noEmit 0 错;nest build 0 错;unit jest 21 套 253 例全绿(基线)。
- Step 2 chat 流式+failover: PASS — test/ai-service-chat-tier.spec.ts 覆盖:逐 chunk 产出(['改','简','历:'])且三轮 messages 原样下发/首 token 前主挂切备/首 token 后挂上抛(/流式中途失败/,备通道未被调用)/两败 503。10 例全过。
- Step 3 tier+env+型号迁移: PASS — chat-tier spec 断言 complete/completeStructured/chat 各档实际型号(pro→deepseek-v4-pro、默认/flash→deepseek-v4-flash、relay 两档均 auto-v2);ai-config spec 断言全缺省 primaryProvider=deepseek、modelFlash=deepseek-v4-flash、AI_MODEL_* 覆盖透传、旧名 DEEPSEEK_*/CLOUDDREAM_* 兜底(现状不变)。
- Step 4 调用点 tier:'pro': PASS — grep 'tier: \'pro\'' 命中 4 行(analyzer:71,108;rewriter:72,92);git status 仅 ai/、config/ 被改,无 mock/、无 conversations/。
- Step 5 队列可见化: PASS — concurrency-limiter spec:max=1 压 3 请求时 status()={active:1,queued:2}→放行后正确递减到 0;runObservable 排位回调按序(A:[0],B 初始 1→0,C 初始 2→1→0);runStreaming 持槽至流耗尽(中途 active=1,耗尽后 0)。
- Step 6 真机冒烟: PARTIAL —
    · DeepSeek deepseek-v4-flash 流式 PASS:79 个 text 增量 chunk(+18 thinking),firstToken 2493ms,时间戳递增证明是流不是整段,产出完整三点建议。
    · DeepSeek deepseek-v4-pro 流式 PASS:71 个 text 增量 chunk(+368 thinking),firstToken 6001ms,stop_reason=end_turn,产出完整。重要发现:pro 是思考模型,先产大量 thinking_delta 再产 text_delta,小 max_tokens 会全耗在思考上无正文(见遗留)。
    · auto-v2 中转流式 BLOCKED:所给 packages/api/.env 无 CloudDreamAI 密钥(其 AI_PRIMARY_*/AI_FALLBACK_* 两槽均指向 deepseek 直连),无 relay key 可用,无法真跑。冒烟日志全程只打印 keyLen,无 key 泄漏;临时冒烟脚本已删除,未入库。
- Step 7 门禁: PASS — npx tsc --noEmit 0 错;npm run lint(=tsc --noEmit)0 错;unit jest 22 套 273 例全绿(3 套 skip 为 AI-live);e2e jest 43 套 823 例全绿(1 套 skip)。注:本仓未配置 ESLint(无依赖、无 config,lint 脚本即 tsc --noEmit),故以 tsc 为 lint 门禁。
- Step 8 提交: 见下方 commit。

## 遗留问题
- 【阻塞·交回 Coordinator】auto-v2(CloudDreamAI 中转)流式真机冒烟未做:所给主仓 .env 不含 CloudDreamAI 密钥(两槽都是 deepseek 直连)。需 Coordinator/用户提供 relay key(AI_RELAY_API_KEY/CLOUDDREAM_API_KEY)后补跑「relay 流式一次」以验证中转 SSE 是否支持(handoff 已核实事实里标注「主通道中转流式未经验证」正是要本步实测)。代码侧 relay 流式路径已就绪(streamProvider 通用,只认 text_delta)。
- 【需 B2/调用方注意】deepseek-v4-pro 是思考模型:流式会先产大量 thinking_delta 再产 text_delta。chat() 默认 maxTokens=4096 对 pro 够用,但若调用方调小预算可能全耗在思考、首字迟迟不来(实测 max_tokens=200 时 0 正文)。建议 B2 的流式 chat 对 pro 档设较大 maxTokens(冒烟用 1500 正常)。streamProvider 已只对外吐 text_delta(不泄思考),符合设计。
- 【判断说明】auditFaithfulness(防编造复核,flag_fabrication)保持 flash 未标 pro:它是「返回 index 列表」的分类型增强项(失败不阻断),非核心产出;按模型选型常识分类任务走 flash 更经济。若 Reviewer 认为该步也属改写核心产出,可一行加 tier:'pro'。
- 队列「排位变化订阅」以 runObservable(task,onPosition) 形式提供给 B2;B2 的 SSE 端点应用 runObservable 包住整段 chat 消费(或自行组合 runStreaming + 订阅)。本批未建 SSE 端点(属 B2/conversations,禁止触碰)。

## 决策上下文
- 已选方案:AiConfig 由「primary/fallback 固定结构」重构为「primaryProvider 排序 + 命名通道(deepseek/relay)」。每通道按 tier 选型号(deepseek 分档 pro/flash,relay 单一 auto-v2)。AI_FAILOVER/AI_BOTH_DOWN 的 detail 改记 provider 名(relay/deepseek)而非型号名——因型号现随 tier 变,provider 名更稳定可读。
- 已排除方案:① 保留 primary/fallback 二元结构、仅在其上挂 tier——会让"通道顺序 env 可切"难以表达(primary 语义被钉死),且 deepseek/relay 谁主谁备需靠改 key 槽位,违背"env 可切不改代码"。② chat 用 limiter.run 包生成器——run 在任务 Promise settle 即释放槽,会在首 chunk 后就放槽,后半段流脱离并发护栏;故新增 runStreaming 持槽至流耗尽。
