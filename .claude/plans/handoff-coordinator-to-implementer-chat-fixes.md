# Handoff: Coordinator → Implementer (B2 修复批:审计 2P0+2P1+清理)

## 状态: 待 B2 测试代理完成后启动(同 worktree 不并行)
## 工作目录: E:\Agent program\HRBP-wt\chat-experience(分支 feature/chat-experience @ 43decf1 起)
## 输入: 审计报告(见本文件同目录 handoff-coordinator-to-implementer-chat-experience.md 及协调者转述)+ 届时补充的测试报告
## 例外授权: F1 允许修改 ai/ai.service.ts 与相关测试——仅限给 chat() 增加可选 signal 参数并透传 SDK,其余 ai/** 仍是禁区

## 修复清单

### F1(P0)后端断连释放
- conversations.controller.ts streamMessage 不监听连接关闭→断连后 for await 继续驱动生成器,2 并发槽被占满到 AI 生成完。
- 修法:控制器建 AbortController,`res.on('close', () => abort())`;signal 逐层透传 conversations.service → chat.service → AiService.chat(新增可选 `signal?: AbortSignal`)→ SDK `messages.stream(params, { signal })`。abort 后:不落 assistant 消息、不扣点(对齐现有"中断不扣"语义)、限流槽即时释放。
- verify: jest——mock SDK 断言收到 signal;消费中触发 abort → 槽位归零(status().active=0)、无 consume 流水、无 assistant 落库;正常路径回归绿。

### F2(P0)前端卸载取消
- chat-detail.tsx handleSend 未传 signal,组件卸载不 abort;postStream finally 只 releaseLock 不 cancel。
- 修法:handleSend 持有 AbortController,useEffect 卸载 cleanup 时 abort;postStream 在 signal abort 时 `reader.cancel()` 再 releaseLock;卸载后不再 setState(挂载标记或 abort 即返回)。
- verify: 单测/本地实测——流进行中切换路由,网络面板请求被取消,控制台无 unmounted setState 警告。

### F3(P1)简历全文截断
- coach-context.service.ts 主简历 raw_text 无截断直接进 system prompt。
- 修法:上限 6000 字符,超出截断并追加"……(简历过长,以上为前 6000 字,完整内容可在简历页查看)";截断逻辑独立小函数可测。
- verify: jest——7000 字符简历注入后上下文含截断标注且长度受控;短简历不受影响。

### F4(P1)消息长度上限
- send-message.dto.ts content 加 @MaxLength(4000)(超出 400,错误文案可读)。
- verify: jest——4001 字符 400;流式与非流式端点都生效。

### F5(P2)目录查询合并
- coach-context.service.ts 的 gatherCatalogIds 与 describeCatalogForSelector 对同一数据重复查询(每条消息约 6 次目录查询)。
- 修法:一次查询取 id+标题复用两处;不改对外行为。
- verify: jest 回归绿;代码评审级确认查询次数下降(可在测试中 spy repository 调用次数断言)。

### F6(P2)清理
- layout.tsx:100 过时注释删除;api.ts:82 注释明确"仅非流式路径走轮询,流式由 SSE queue 事件承载"。
- verify: grep 确认。

## 完成口径
全 F 逐条 PASS/FAIL+证据写回本文件;门禁 api tsc 0 错+全量 jest 绿、web eslint+tsc 0 错+build;commit 到 feature/chat-experience 不 push;范围手术刀,例外授权仅限 F1 所述。
