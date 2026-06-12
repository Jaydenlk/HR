# Coach 升级设计:对话教练 + Credit 计费 + 排队可见化 + 模拟面试公司层

> 2026-06-12 与用户逐条确认拍板。总要求:**好用、可信、顺手、代码质量过关**。
> 总原则:现有功能不动,加一层上去;全程 worktree;主代理只派工不写码;能并行则并行(文件集不相交为前提)。

## W1 对话式教练(调度台模式)

对标 career-principal 的体验,但架构上**对话当调度台、模块当执行场**(用户原创方案,替代 agentic 工具循环)。

### 步骤 1:行为骨架 + 流式
- AiService 新增多轮方法:真 messages 数组(替代 chat.service.ts 的字符串拼接历史)+ 流式输出。
- conversations 新增 SSE 端点(普通 POST 保留不动);前端 `fetch + ReadableStream` 增量渲染(token 在 localStorage,原生 EventSource 带不了 Bearer 头,已查死)。
- 降级语义:首 token 前主通道失败→切备通道;备通道不支持流→整段一次发回(前端兼容两种)。流中途断→明示错误让用户重发,不静默重试。
- 行为规范移植进 system prompt(从 career-principal SKILL.md 逐条搬):追问纪律(≤3 轮×每轮≤2 问、附原因)/主动盘点(产出前点 1-3 个未问但该看的维度,带损失理由)/续接提议(提议+确认才动)/句句标源([据CV]/[据诊断]/[推断])/防编造红线(现有保留)。
- 按需取数:开场注入画像(EvidenceService)+ 主简历全文 + 最新诊断要点 + 全部产物目录(标题/日期/id);引用旧产物时由一次小型前置结构化调用(flash 档)决定加载哪几份全文。前置调用失败→静默退回静态上下文。**这是 2C 压力下第一个可砍项。**
- maxTokens 从 2048 适当上调(流式下长回复体验可接受)。

### 步骤 2:双手 = 任务交接(handoff)
- 新表 `coach_handoffs`:user_id / conversation_id / message_id / target(mock|diagnosis|cover_letter|resume_rewrite)/ payload_json(预填:公司、岗位、JD、基于哪个简历版本)/ status(proposed|accepted|dismissed|completed)。
- Coach 回复尾部以约定标记输出 handoff 提议 → 后端解析剥离、落 handoff 记录、写进 assistant message 的 `rich_card`(字段已预留)→ 前端渲染行动卡片"已为你配置好模拟面试:公司X·岗位Y·基于简历v3,一键开始"→ 跳 `/mock?handoff=<id>`。解析失败→丢弃卡片只留正文(优雅降级)。
- 模块页接待:载入时有 `?handoff=` → 拉 payload → 弹确认"Coach 对话为你准备了一个模拟面试,是否开始?"→ 确认才预填创建、**此刻才扣 credit**;拒绝→dismissed,无任何副作用。
- 完成回流:本次产物来自 handoff → 弹"返回 Coach 继续聊?"(可不选,带回 /chat/[conversationId])。不点也成立:Coach 下条回复经平台数据看到新产出,主动接话(续接闭环与卡片点击无关)。
- 首批四模块:模拟面试、诊断、求职信、简历改写。

## W2 Credit 计费 + "我的"页 + 管理后台

### 计费规则(已拍板)
- **1 次用户触发的 AI 端点调用 = 1 credit**(即现 ai_usage 记账粒度;端点内部多次模型子调用不重复扣——诊断内部三步记 1 点;对话的前置选择器不另扣)。推论:模拟面试一整场 ≈ 出题 1 + 每题 1 + 总评 1 ≈ 10 点,各操作按钮旁明示消耗。
- **完全替代制**:停用每日免费 20 次(QuotaGuard 日额逻辑退役,`daily_quota_override` 字段废弃不再读)。新注册送 50 点;**线上存量用户迁移时一次性补 50 点**(migration 内完成,流水记"注册赠送")。
- 定价文案 10 元/50 点;**支付模块本期不做**,充值引导"联系管理员"。
- 余额 0 → 友好拦截(提示余额不足+如何获取),不是裸 4xx。

### 数据与接线
- users 加 `credit_balance`(int,默认 0);新表 `credit_transactions`(user_id / delta / type: signup_grant|admin_grant|consume / balance_after / note / created_by / endpoint)。
- CreditGuard + CreditInterceptor 替换现 QuotaGuard + AiUsageInterceptor 的接线位(所有挂点统一换装;扣点与流水在**成功完成**时落账,与现行"失败不扣"语义一致;SSE 端点在流完成回调记账)。ai_usage 表保留继续记(运营口径),credit 流水独立。
- 扣账与余额更新用事务+行锁防并发双扣。

### "我的"页(/me)
- 入口:侧边栏头像区(点击进入)。
- 内容:头像(可上传,复用 files 模块 `upload(file,'avatars')`,users.avatar_url 字段已存在)、基本信息(邮箱/注册时间/邀请码)、credit 余额、充值与消耗流水(管理员充值显示"管理员充值")、价目说明(10 元/50 点 + 联系管理员)。

### 管理后台(适度)
- 用户列表加余额列;行内"充值"操作(点数+备注→写 admin_grant 流水);用量区加 credit 消耗概览。不做更多。

## W3 并发排队可见化

- 现状:全局 AI 并发 2、队列 8,超限 503、排队期间用户干等无感知。
- 改造:ConcurrencyLimiter 暴露队列状态;SSE 端点入队时直接推"排队中,前面还有 x 个请求"事件;非流式端点前端等待超阈值轮询轻量 `GET /ai/queue-status` 显示同款提示;队列满给友好文案而非裸 503。
- 并发/队列参数环境变量化——后期用户提供 API 号池与更大并发时只改配置。**号池本期不做。**

## W4 模拟面试:库外公司三层降级 + 防编造

1. **本地公司库**:把 career-principal 侧 600 家公司库(companies.seed.yaml 50 + tier_2 250 + tier_3 300,含 canonical_name/aliases/company_type/tier/main_roles/cities/risk_signals 等)写转换脚本灌入现 companies 表(现仅 80 家,字段做映射,保留 feed 模块兼容)。输入公司名先查库(name+aliases 匹配)。
2. **联网搜索确认**:库中无 → 调搜索数据源查公司简介 → 向用户确认"我找到的是这家:XX(一句话简介),是吗?"→ 确认后以真实信息出题并标注来源。**搜索数据源现状为零**(小红书/牛客 importer 是垂直聚合服务,不能通用搜索),选型在实施计划给方案(候选:博查等中文搜索 API / 中转商若有搜索能力),需要用户提供 key。
3. **通用模式明示**:搜不到或用户否认 → 明说"将以通用面试+JD 驱动出题,不假装了解该公司"。
- 三段 prompt(出题/评分/总评)补防编造硬约束,对齐 interview-prep 现成写法(`interview-prep.service.ts:594` 风格 + 代码层 guard)。
- 现有创建流程不变,公司确认作为创建前的附加一步(无公司名/库内命中则零感知)。

## 模型分级(已拍板:按产出价值分)

- AiService 加场景档位参数(pro|flash),型号 ID 走 .env(AI_MODEL_PRO / AI_MODEL_FLASH 类),默认 flash=现状。
- Pro:Coach 对话主回复、简历诊断/改写、模拟面试总评。Flash:解析、出题、单题评分、标题、前置选择器等。
- 实现前必查 DeepSeek/中转商当前文档核实型号名与流式支持,不凭训练记忆写(hardcore standard 1)。

## 不做清单
支付模块 / 对话内上传简历(继续走简历页)/ 移动端放行(MobileGate 不动)/ 真 agentic 工具循环(调度台模式替代)/ API 号池(留配置口)/ 40 意图路由表整体移植(system prompt 给模块地图即够)。

## 验收要点(套 docs/PROMPTS.md C/D)
- 流式:Playwright 真开浏览器看增量渲染;主通道拔线降级演练(备通道整段返回);流中断明示。
- 排队:并发压到 3+ 请求,看到"前面还有 x 个"提示;队列满文案。
- Credit:扣点与按钮标注一致;余额 0 拦截文案;管理员充值→用户侧流水即时可见;存量用户迁移后余额=50;事务防双扣(并发同测)。
- handoff:提议→卡片→跳转→确认创建(此刻扣点)→完成→回流接话全链路;拒绝路径零副作用;卡片解析失败正文完好。
- 公司三层:库内命中零感知;库外搜到→确认→出题含真实信息且标源;生造公司→通用模式明示;防编造场景(编造公司细节)必测。
- 回归:现有功能(诊断/求职信/资讯/管理后台原功能)全量门禁不回退。

## 风险与实现前验证项
1. 双通道(auto-v2 中转、DeepSeek Anthropic 兼容端点)流式支持——查官方文档+冒烟。
2. DeepSeek V4 Pro/flash 实际型号 ID 与中转商可用性。
3. 搜索数据源选型与计费(需用户 key)。
4. SSE 下 credit 记账时机(流完成回调)与中断语义。
5. 2C/1.6G 内存:SSE 长连接 + 并发队列的内存占用,上线前压测。

## 分期与依赖
- **Phase A:Credit 全套**(表+guard 换装+流水+/me+admin)。独立,先行——guard 换装动所有 AI controller 接线,先收口,后续 phase 在其上 rebase。
- **Phase B:对话骨架+流式+排队**(W1 步骤 1 + W3,同动 ai/conversations 层,一个 worktree)。
- **Phase C:handoff 双手**(W1 步骤 2,依赖 B 的卡片渲染位)。
- **Phase D:模拟面试公司层**(W4,文件集与 B/C 基本不相交,可并行;联网搜索部分依赖搜索 key 到位,公司库移植+防编造不依赖)。
- 决策记录:credit 完全替代制推翻了试运行"不做计费"中的额度模式(支付模块仍不做);调度台模式替代了最初的 agentic 工具循环提案(规避 DeepSeek 工具兼容与并发占满风险)。
