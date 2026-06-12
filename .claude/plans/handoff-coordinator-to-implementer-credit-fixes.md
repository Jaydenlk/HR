# Handoff: Coordinator → Implementer (credit 修复批:审计 3P1+2P2 + 测试 2BUG + 2 加固)

## 状态: READY_FOR_IMPL
## 工作目录: E:\Agent program\HRBP-wt\credit-integration(分支 feature/credit,前后端已合入,测试/审计已完成腾空)
## 输入: 审计报告(handoff-coordinator-to-reviewer-credit.md 尾部)+ 测试报告(handoff-coordinator-to-test-agent-credit.md 尾部)
## 禁止触碰: ai/**、mock 后端逻辑、feed/**、.env*、测试代理新增的测试文件(只许让它们变绿,不许改其断言意图)

## 修复清单(逐条修,每条带验证)

### F1(P1)模拟面试点数标注少算总评
- packages/web/src/app/(main)/mock/page.tsx:296 现写"约消耗 5 点",实际一场 = 出题1 + 每题1×N + 总评1 = N+2。
- 修法:按表单当前所选题数动态计算并写明三段构成;若题数固定 5 则写"约 7 点(出题 1 + 作答 5 + 总评 1)"。
- verify: 测试代理的 credit-label-consistency.spec.ts 中对应 BUG 断言翻绿(其余断言不许动)。

### F2(P1)聊天页无消耗提示
- 后端 POST /conversations/:id/messages 扣 1 点,但 /chat/[id] 界面全程无提示。注意:components/chat/chat-input.tsx 里已加过"消耗 1 点"却没出现在页面——先查它是否真被 chat-detail.tsx 引用,把标注落到实际渲染的输入组件上(孤儿标注勿留双份)。
- verify: 本地起 web 后 /chat/[id] 截图可见标注;label-consistency 断言翻绿。

### F3(P1)admin 前端退役字段清理
- packages/web/src/app/(main)/admin/page.tsx:169 patchUser 参数类型仍含 daily_quota_override 且会随 body 发往后端;lib/types.ts:10、:1343 User/AdminUserRow 同名死字段。
- 修法:三处全删。verify: 全前端 grep daily_quota_override = 0;tsc 0 错。

### F4(P1)头像上传魔数校验
- packages/api/src/users/me.service.ts:53 现仅查 file.mimetype(multipart 头可伪造)。
- 修法:校验 buffer 魔数——JPEG FF D8 FF / PNG 89 50 4E 47 / WebP 前 4 字节 RIFF 且 8-11 字节 WEBP;不符返 400(沿用现有文案口径)。mimetype 检查保留为第一道。
- verify: jest 用例——伪造 Content-Type 的非图片 buffer 被 400 拒;真 png 仍 201。

### F5(P2)充值 DTO 边界
- packages/api/src/admin/dto/grant-credits.dto.ts:delta 加 @Max(10000)(防手滑多个零),note 加 @MaxLength(200)。
- verify: jest——delta=99999 → 400;note 201 字符 → 400;原有用例不回退。

### F6(加固)CreditGuard 防御性兜底
- packages/api/src/credit/credit.guard.ts:25-27 无 userId 时由 return true 改为抛 UnauthorizedException(不再依赖上游守卫的隐式假设)。
- verify: jest——无 JWT 上下文直接调 guard 抛 401;现有 e2e 全绿(JwtAuthGuard 在前的正常路径不受影响)。

### F7(加固)扣点失败可见化
- packages/api/src/credit/credit.interceptor.ts:35-39 consume 失败现仅 logger 记一行,账务漏扣不可见。
- 修法:失败时写一条 ops_events(复用现有 OpsEvents 机制,事件名如 CREDIT_CONSUME_FAILED,载荷含 userId/endpoint);若 OpsEvents 注入到拦截器代价过大,允许退而求其次:logger.error 带结构化标记 + 在 handoff 遗留区写明原因。
- verify: jest——mock consume 抛错时 ops_events 新增 1 条(或结构化日志断言)。

### F8(P2)admin 充值后余额用后端返回值
- packages/web/src/app/(main)/admin/page.tsx:197-204 现为乐观 +n,改用 POST 返回的 credit_balance 回填行内余额。
- verify: 代码审查级(行内逻辑直读),tsc 0 错。

## 完成口径
1. 全部 F1-F8 逐条 PASS/FAIL 写回本文件 + 证据。
2. 门禁:api `npx tsc --noEmit` 0 错 + 全量 jest 绿(除已知 tasks.e2e 预存在项);web eslint+tsc 0 错 + build 通过。
3. commit 到 feature/credit(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push。
4. 范围手术刀:只修这 8 条,不顺手改任何其他东西。
