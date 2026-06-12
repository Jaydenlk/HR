# Handoff: Coordinator → Reviewer (credit 独立审计,只读)

## 状态: READY_FOR_REVIEW
## 审计对象: worktree E:\Agent program\HRBP-wt\credit-integration(分支 feature/credit @ c529292),审 `git diff dev...HEAD` 全部改动
## 对照依据: .claude/plans/handoff-coordinator-to-implementer-credit-api.md(含实现者自报验证)、handoff-coordinator-to-implementer-credit-web.md、设计稿 coach-upgrade-design-2026-06-12.md §W2
## 你只读,不改任何文件。找茬是你的业绩:我们不是验证它对,而是验证它是否有错。

## 审计清单(每条结论必须 file:line)
1. **范围手术刀**:diff 里有没有任何一行追溯不到两份 handoff 的规格?顺手重构/无关格式改动/没人要的灵活性,逐条列。
2. **账务正确性(重点)**:credit.service.ts 的事务边界——grant/consume 的余额更新与流水插入是否同事务;balance_after 计算在锁内还是锁外;Postgres 行锁分支与 sqlite 分支的行为差异是否会导致生产/测试语义漂移;interceptor 在响应链哪个时点 consume,异常路径(AI 抛错/超时/客户端断开)会不会漏扣或误扣。
3. **安全**:/me/credits 与 /me 有无越权可能(user_id 来源);POST /admin/users/:id/credits 的 AdminGuard 是否真挂上;avatar 上传的类型校验是绕得过的 content-type 还是看魔数;流水接口是否泄露 created_by/其他用户信息。
4. **守卫换装完备性**:对照 git grep,所有原 QuotaGuard 挂点是否一个不漏换成 CreditGuard+CreditInterceptor;有没有"挂了 Guard 没挂 Interceptor"(只拦不扣)或反之(不拦白扣)的端点;auth 顺序(Jwt→Credit)是否每处一致。
5. **前端真实性**:/me 页与 admin 充值有没有假数据/写死数字/空 onClick;402 监听链路(api.ts→layout)是否真的连通;按钮标注"消耗 N 点"与后端实际扣点是否一致(特别是模拟面试"约 5 点"的口径——实际一场=出题1+每题1+总评1);流水 type 文案映射是否覆盖全部三种。
6. **类型纪律**:diff 内 any/as unknown as/@ts-ignore 计数(应为 0);DTO 校验完备性(delta 上限?note 长度?limit/offset 边界)。
7. **回归风险**:被换装的 17 个控制器里,有没有原有装饰器(已有 interceptor/guard 顺序)被打乱;quota.module 退役后 AiUsageInterceptor 的依赖是否还成立;web layout.tsx 改动(+112行)是否动了导航/导览锚点等无关区域。

## 交付物
- 审计报告写回本文件下方:按严重度分级(P0 必须修/P1 应修/P2 建议),每条 file:line + 一句话问题 + 一句话依据;没有问题的维度也要写"查过,证据是什么"。
- "探索过但没找到"必须附 grep 词与路径。
