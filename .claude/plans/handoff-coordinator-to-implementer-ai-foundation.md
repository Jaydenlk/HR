# Handoff: Coordinator → Implementer (B1 AI 基础层)

## 状态: 待 Phase A 合 dev 后启动(协调者届时建 worktree feature/ai-foundation 并填入路径)
## 工作目录: 【派工时填写】
## 任务: AiService 升级——真多轮 messages + 流式 + 场景档位(pro|flash)+ 备用通道型号迁移 + 并发队列可见化
## 输入文件: packages/api/src/ai/**、packages/api/src/config/ai.config.ts、packages/api/src/diagnoses|resumes 的 AI 调用点(仅加 tier 参数)
## 禁止触碰: packages/web/**、conversations/**(B2 的事)、mock/**(D1 的事)、credit/quota 模块、.env 入库(本地可复制主仓 .env 到 worktree 用,永不提交)

## 已核实事实(2026-06-12 联网验证,不要再凭记忆怀疑)
- DeepSeek Anthropic 兼容端点 https://api.deepseek.com/anthropic 官方支持 SSE 流式([文档](https://api-docs.deepseek.com/guides/anthropic_api))。
- 型号:`deepseek-v4-flash` / `deepseek-v4-pro`;现配的 `deepseek-chat` 2026-07-24 弃用,必须迁移。
- 主通道(CloudDreamAI 中转 auto-v2)流式支持未经验证 → 本批冒烟实测;中转侧分档别名用户未给 → 主通道 pro/flash 先都用现有 auto-v2 别名(env 留位,用户给了改 env 即可)。

## 规格
1. **AiService.chat(...)**:接受 system + 真 messages 数组(user/assistant 交替)+ tier + maxTokens;流式(SDK messages.stream),以 async iterable 或回调向上交付增量文本;沿用 withFailover:首 token 前失败→切备通道重试;首 token 后失败→向上抛明确错误(不静默重试);两通道都失败→503。保留现有 complete/completeStructured 行为不变。
2. **场景档位**:complete/completeStructured/chat 增加可选 `tier?: 'pro'|'flash'`(默认 flash=现状)。env:`AI_MODEL_PRO`/`AI_MODEL_FLASH`(主通道别名,缺省都落现有 auto-v2 值)、`AI_FALLBACK_MODEL_PRO`(缺省 deepseek-v4-pro)/`AI_FALLBACK_MODEL_FLASH`(缺省 deepseek-v4-flash)。ai.config.ts 收口,env.validation 同步。
3. **型号迁移**:备用通道默认型号 deepseek-chat → deepseek-v4-flash(含配置注释更新)。
4. **调用点 tier 标注(仅此两处模块)**:简历诊断/改写链路(diagnoses 的 analyze/suggest 等核心产出调用)标 tier:'pro';解析类(parseResume/parseJD)保持 flash。mock 与 conversations 的 tier 由各自批次负责,本批不碰。
5. **并发队列可见化**:ConcurrencyLimiter 增加状态读取(active/queued)与"本请求当前排位+排位变化订阅"(供 B2 的 SSE 推送用);新增轻量 `GET /ai/queue-status`(JwtAuthGuard)→ `{active, queued}`。超队列上限的错误信息改为友好中文文案(给前端直接展示)。

## 执行计划 (step→verify)
1. pnpm install + 复制主仓 packages/api/.env → verify: build 通过,现有 jest 全绿(基线)
2. chat 流式 + failover → verify: jest(mock SDK)覆盖——多轮 messages 正确传递/首token前主挂切备/首token后挂上抛/两败503
3. tier 档位 + env + 型号迁移 → verify: jest 断言各档位实际选用型号;env 缺省行为=现状
4. 诊断/改写调用点 tier:'pro' → verify: grep 列出全部修改行,无 mock/conversations 文件被改
5. 队列可见化 → verify: jest——并发压 3 请求时 queue-status 数字正确、排位回调按序触发
6. **真机冒烟(花真钱,各 1-2 次小调用)**:主通道流式真跑一次(验证中转 SSE);备通道 deepseek-v4-flash 流式真跑一次 → verify: 贴增量 chunk 到达的原始日志(证明是流不是整段)
7. 门禁 → verify: npx tsc --noEmit 0 错、npx eslint src/ 0 错、全量 jest 通过,贴原始摘要
8. 提交 feature/ai-foundation(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
- 现有所有调用方零行为变化(默认参数=现状)是硬约束,回归 jest 必须全绿
- 流式中途失败不许静默换通道重发(会导致用户看到重复内容)——明确上抛
- .env 永不入库;冒烟日志不得包含 key
- 完成后更新本文件(已完成/产出物/逐 step 验证结果/遗留)
