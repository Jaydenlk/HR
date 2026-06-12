# Handoff: Coordinator → Implementer (B2 对话教练体验:行为骨架+流式+排队前端)

## 状态: READY_FOR_IMPL(B1 已合 dev @2da4eb9:AiService.chat 多轮流式/tier 档位/runObservable 排位订阅/GET /ai/queue-status 全部就绪)
## 工作目录: E:\Agent program\HRBP-wt\chat-experience(git worktree,分支 feature/chat-experience)
## ⚠️ B1 重要情报: deepseek-v4-pro 是思考模型,流式先吐大量 thinking(已被 AiService 过滤不外吐),pro 档 maxTokens 必须给足(≥4096,勿调小否则全耗在思考首字不来);排位订阅用 ConcurrencyLimiter.runObservable,详见 ai/concurrency-limiter.ts 与 handoff-coordinator-to-implementer-ai-foundation.md 遗留节
## 前置依赖: B1 已提供 AiService.chat(messages+tier+流式)、ConcurrencyLimiter 队列状态/排位订阅、GET /ai/queue-status
## 输入文件: packages/api/src/conversations/**、packages/api/src/intelligence/evidence.service.ts(只读复用)、packages/web/src/app/(main)/chat/**、packages/web/src/components/chat/**、packages/web/src/lib/api.ts
## 禁止触碰: ai/**(只调用不修改)、credit/**、mock/**、feed/**、.env 入库

## 目标(用户原话)
"像我在 Claude code 里面调用 career principal plugin 一样的效果","coach 可以调用我在平台内的全部数据和我对话式交流"。

## 规格

### 后端
1. **SSE 端点**:POST /conversations/:id/messages/stream(JwtAuthGuard+CreditGuard;CreditInterceptor 语义改为流完成才扣点,流式中断/报错不扣——与 B1 约定的记账回调机制对齐)。现有非流式端点原样保留(前端降级用)。
2. **真多轮**:ChatService 历史从字符串拼接改为 messages 数组传给 AiService.chat(tier:'pro')。maxTokens 上调至 4096。
3. **行为骨架 system prompt**:先 Read E:\Agent program\HRBP\career-skills-marketplace\skills\career-principal\SKILL.md(§2.5 主动盘点/§2.6 续接/追问策略段/标源标签段),把以下七要素蒸馏成 Coach 的 system prompt(中文,贴合 SaaS 场景,不照抄 CC 工具语义):
   - 追问纪律:最多 3 轮、每轮≤2 问、每问附"为什么需要";问够就用现有信息下结论并声明置信度。
   - 主动盘点:给出建议前,点出 1-3 个用户没问但高价值的维度,带"不看会损失什么"的理由,选择权交用户。
   - 续接提议:每次产出后提议最该做的下一步(站内模块口径:诊断/改写/求职信/模拟面试/面试准备…),用户确认才展开。
   - 句句标源:[据简历]/[据诊断]/[据平台记录]/[推断]/[通用经验] 五种内联标签;无据不下确定结论。
   - 防编造红线(沿用现有 + 强化):平台数据没有的信息不得虚构;用户口头主张标记"未经核实"。
   - 身份与语气:校招求职主理人,中文,说人话,结论先行。
   - 模块地图:告知模型站内能力清单及对应路径(为续接提议提供词汇,本批不做跳转卡片——那是 Phase C)。
4. **按需取数**:开场上下文 = EvidenceService 画像 + 主简历全文(resumes 取 is_primary 的 raw_text)+ 最新诊断要点 + 产物目录(各类 type/标题/日期/id)。用户消息引用旧产物时,先用一次 completeStructured(tier:'flash',小 schema:{need:[{kind,id}]})判定需加载哪几份全文(上限 3 份),取数后并入本轮上下文。选择器失败→静默用开场上下文(不报错不重试)。
5. **排队事件**:SSE 流先推 queue 事件(排位变化逐条推,用 B1 的排位订阅),进入生成后推 token 增量,完成推 done(含 message id/余额)。错误推 error 事件(可读中文)。

### 前端
6. **流式渲染**:chat-detail.tsx 改造——fetch+ReadableStream 读 SSE(带 Bearer 头),收 queue 事件显示"当前使用人数较多,正在排队,前面还有 x 个请求";token 事件增量渲染(光标动效沿用现有 TypingIndicator 风格);done 后落定消息并刷新余额;error 显示可读提示且不丢已渲染内容;浏览器不支持/流失败→自动退回现有非流式 POST(保留的旧端点)。
7. **其他 AI 页排队提示**:lib/api.ts 的 post 等待超 2.5s 时轮询 GET /ai/queue-status(2s 间隔),有排队则全局轻提示"前面还有 x 个请求";完成即消。实现成全局机制,不逐页改造。

## 执行计划 (step→verify)
1. pnpm install + 复制 .env → verify: 双端 build 基线绿
2. 后端 SSE+多轮+记账时机 → verify: jest——SSE 端点 mock AiService 流出 token 事件序列正确;流完成扣 1 点;中断不扣;非流式旧端点回归绿
3. system prompt 行为骨架 + 按需取数 → verify: jest 断言 prompt 含七要素关键句;选择器返回 need 时上下文含对应全文;选择器抛错走静默降级
4. 前端流式+排队 → verify: 本地起服 Playwright——发消息看到增量渲染(截屏两帧对比);人为压并发看到排队提示;拔 AI key 走 error 路径提示可读
5. **AI 真跑体验剧本(花真钱,3-4 条消息,tier 生效)**:真实简历用户问"我该投什么岗"→ 验证回复含标源标签、有追问或盘点行为、结尾有续接提议;贴全文输出人工核对
6. 门禁 → verify: api tsc 0 错+全量 jest;web eslint+tsc 0 错+build;全部原始摘要
7. commit 不 push

## 红线
- 现有非流式聊天链路必须原样可用(降级路径)
- prompt 七要素是产品灵魂,不许偷工减料成一句"你要追问和标源"
- 范围手术刀;完成写回本文件
