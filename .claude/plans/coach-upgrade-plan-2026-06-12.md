# Coach 升级实施计划(配套设计稿 coach-upgrade-design-2026-06-12.md)

> 派工批次与依赖序。每批 = implementer(worktree)→ test-agent → reviewer → 门禁 → 合 dev。
> 子代理模型纪律:默认 Sonnet,重难 Opus 4.8,禁 Fable。

## 实现前验证结论(2026-06-12 夜,联网核实)

1. **DeepSeek V4 型号名**(查官方文档与多方报道):`deepseek-v4-flash`(输入$0.14/百万、输出$0.28)与 `deepseek-v4-pro`(促销 $0.435/$0.87,标准 $1.74/$3.48);现配置的 `deepseek-chat` 将于 **2026-07-24 弃用**(映射 v4-flash 非思考模式)→ Phase B 必须把备用通道型号迁为 `deepseek-v4-flash`。
   来源:[Models & Pricing | DeepSeek API Docs](https://api-docs.deepseek.com/quick_start/pricing)、[DeepSeek V4 Pricing & API Migration (2026)](https://www.verdent.ai/guides/deepseek-v4-pricing-api-migration-2026)
2. **Anthropic 兼容端点流式**:`https://api.deepseek.com/anthropic` 官方支持 SSE 流式;注意它会做型号名映射(claude-opus*→v4-pro,claude-sonnet/haiku*→v4-flash),我们显式传 deepseek 型号名,不依赖映射。
   来源:[Anthropic API | DeepSeek API Docs](https://api-docs.deepseek.com/guides/anthropic_api)
3. **搜索源选型:博查 Bocha Web Search API**(open.bochaai.com):¥3.6/千次资源包、免费 1000 次、DeepSeek 官方搜索引擎、国内直连合规、带文本摘要(对比 Bing $28/千次且数据出海)。**需用户注册提供 BOCHA_API_KEY(进 .env,永不入库)。**
   来源:[博查AI开放平台](https://open.bochaai.com/)、[Bocha Web Search API 测评](https://deepseek.csdn.net/682451e2e47cbf761b6d0308.html)
4. auto-v2 中转流式与其侧 V4 Pro/flash 别名:文档不可外查,Phase B 实施时本机冒烟验证;中转侧型号别名以用户提供为准。

## Phase A:Credit 全套(进行中,2026-06-12 23:40 派出)
- A1 后端 implementer(Opus):worktree E:\Agent program\HRBP-wt\credit-api,handoff = handoff-coordinator-to-implementer-credit-api.md
- A2 前端 implementer(Sonnet):worktree E:\Agent program\HRBP-wt\credit-web,handoff = handoff-coordinator-to-implementer-credit-web.md
- A3 集成:主代理合 feature/credit-api + feature/credit-web → feature/credit(共享文件预计为零,有冲突再拆集成代理)
- A4 test-agent(Sonnet,连败2次升Opus):集成分支起前后端,jest e2e + Playwright 真流程(注册送50/扣点/402拦截/管理员充值/流水/头像上传/me页)
- A5 reviewer(Sonnet,只读):对照两份 handoff 找茬审计
- A6 门禁(主代理):双端 eslint+tsc+build、回归冒烟 → 合 dev(不部署,部署等用户醒来拍板——含 migration 的计费切换要彩排)

## Phase B:AI 基础层 + 对话骨架 + 排队(A 合 dev 后)
- B1 AI 基础层(Opus,单独批次先行):AiService 多轮 messages + 流式方法 + 场景档位(pro|flash,env:AI_MODEL_PRO/AI_MODEL_FLASH 与中转侧别名)+ 备用通道型号迁 deepseek-v4-flash + ConcurrencyLimiter 暴露队列状态 + GET /ai/queue-status。冒烟:双通道流式真跑。
- B2 对话体验(B1 合后,前后端两 worktree 并行):conversations SSE 端点 + system prompt 行为骨架(career-principal 移植:追问纪律/主动盘点/续接提议/标源)+ 按需取数前置选择器(flash档);web 端 chat 流式渲染 + 排队提示 + 聊天页余额联动。
- 验收重点:流式增量渲染、首token前降级、排队"前面还有x个"、行为骨架四要素逐项对话剧本测试。

## Phase C:handoff 双手(B 合 dev 后)
- coach_handoffs 表 + 回复尾部标记解析(失败优雅降级)+ rich_card 行动卡片 + 四模块接待(?handoff= 确认弹窗,确认才创建才扣点)+ 完成回流弹窗 + Coach 接话续接。
- 验收重点:全链路 + 拒绝路径零副作用 + 解析失败正文完好。

## Phase D:模拟面试公司层(可与 B2/C 并行,文件集不相交:mock/feed-companies/search)
- D1(不依赖 key):600 家公司库 yaml→seed 转换灌库(兼容 feed 现有 80 家,按 name 去重合并)+ mock 三段 prompt 防编造硬约束(对齐 interview-prep.service.ts:594 写法+代码 guard)+ 创建流程公司库命中检查。
- D2(依赖 BOCHA_API_KEY):搜索服务封装 + 库外公司搜索→用户确认交互→确认信息进 prompt 并标源;搜不到/否认→通用模式明示文案。key 未到位时 D2 不启动,库外直接走通用模式明示(诚实降级,无死代码)。

## 部署纪律(全部完成后)
- 先本机彩排:migration(credit 字段+存量补50)→ 容器顺序(先 migration/seed 后 up -d)→ 公网视角验证。
- 计费切换影响线上真实用户,**部署前必须用户点头**;回滚路径:migration down + 镜像回退到 082f17c 系列。
