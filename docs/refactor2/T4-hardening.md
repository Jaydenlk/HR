# T4 · 技术债清偿 + 防护性建设(基础预防级)

## 目标
两段式:①先派审计核实每项技术债的**当前真实状态**(不凭记忆开药),②按核实结果逐项修;防护按用户拍板的范围建:防批量注册薅 AI 额度 + 防接口滥用/压测,基础预防级,**不过度建设**。

## 第一段:审计清单(explorer/reviewer 只读核实,每项给 file:line 证据 + 现状判定)

| # | 债项 | 要核实的问题 |
|---|------|--------------|
| D1 | 限流器嵌套死锁 | 诊断管线内层 AI 调用是否仍可能与外层互等槽位;600s 管线超时自愈兜底是否在;skipLimiter 透传要改多少处 |
| D2 | MockSession 越权 | 若 T5 已修则关闭,否则并入 T5(不重复修) |
| D3 | JWT secret 兜底值 | 生产 env 是否有强 secret;代码里默认值是否还能被走到 |
| D4 | Azure 新机备份 cron | 迁移后每日备份是否真在跑(查 crontab+最近备份文件时间戳,坐标见运维手册) |
| D5 | 看门狗参数 | AI_STREAM_IDLE_MS/MAX_MS 生产实配;两组 spec 是否全绿 |
| D6 | 注册链路现状 | 邮箱验证码+邀请码之外,IP 频控/验证码请求节流有没有 |
| D7 | 全局限流现状 | 有无 @nestjs/throttler 或等价物;AI 端点之外的裸奔面 |
| D8 | 阿里云老站 | 是否仍在跑;Azure 稳定观察期是否可收官下线(下线要用户确认) |
| D9 | 依赖安全 | npm audit 高危项清点(只清点,修不修看结果轻重) |

审计产出:`docs/refactor2/T4-audit-result.md`,逐项 PASS(无需处理)/FAIL(附证据+建议修法+风险)。

## 第二段:修复与防护(按审计结果裁剪,以下为预案)

### 债务修复预案
- D1:给 AiService 调用链加 `skipLimiter` 透传(审计估算过约 15 处,中风险改动)——**危险区纪律生效**:改完必跑 `ai-stream-watchdog.spec.ts` + `concurrency-limiter.spec.ts`,并对"两用户同时诊断"场景加并发单测。
- D3:移除代码内弱默认值,启动时无 secret 直接 fail-fast 报错(生产已配则零影响)。
- D4:未配则按运维手册补每日 pg_dump cron + 保留 7 份轮转 + 备份文件非空校验告警。
- D8:确认稳定后**报用户拍板**再下线,不自作主张。

### 防护建设(固定范围,三件)
1. **全局限流**:@nestjs/throttler(或等价)全局默认阈值 + auth/注册/验证码端点更严档;超限 429 + OpsEvent 记录。
2. **注册风控**:同 IP 注册频控(如 1 小时 N 个)、验证码发送节流(同邮箱/同 IP 冷却)、失败次数封禁窗口。阈值实现时定初值,写进 env 可调,不硬编码。
3. **异常告警**:限流触发/注册风控命中写 OpsEvents(已有体系),admin 平台健康页可见计数;不建独立告警系统(过度建设)。

## 派工方案

**编排:两条 dynamic workflow** — ①审计 workflow:D1-D9 **一项一 agent 并行扇出**(只读),汇总 agent 合成 T4-audit-result.md;②修复 workflow:A(债修,危险区可换 fable-dev 单点)与 B(防护三件)**并行**(文件集不相交:A=ai/*,B=main.ts+auth/*)→ C 测试与 D 审计并行扇出 → 汇总。

**Agent 0(审计扇出,Sonnet,只读)** — 按第一段清单逐项审计,产出 T4-audit-result.md。prompt 要点:每项必须 file:line 证据,查不到就写"查证路径+结论:不存在",禁止"应该没问题"。
**Agent A(implementer,Sonnet/Opus 按 D1 复杂度,worktree)** — 按审计结果修 D1/D3/D4 等 FAIL 项。D1 是危险区,prompt 里必须包含 01-dev-principles 第四节全文。
**Agent B(implementer,Sonnet,worktree,可与 A 并行——文件集不相交:A=ai/*,B=main.ts+auth/*)** — 防护三件。
**Agent C(test-agent,Sonnet)** — 单测:限流 429(第 N+1 个请求)、注册频控触发、验证码冷却;并发诊断死锁回归(D1);e2e 正常用户不受影响(阈值内全通)。
**Agent D(reviewer,Sonnet,只读)** — 找茬:限流是否误伤正常轮询端点(如转写任务轮询)、封禁逻辑有无把合法共享出口 IP(校园网 NAT)一刀切死的风险——阈值必须考虑同校学生共用 IP 场景。

## step→verify
1. 审计 → verify: T4-audit-result.md 九项全有证据结论
2. D1 修复 → verify: 两组危险区 spec + 新增并发单测全绿(附输出)
3. 防护三件 → verify: 429/频控/冷却单测绿;Playwright 正常注册登录流不受影响
4. 部署后 → verify: 线上登录+诊断+模拟面试冒烟;OpsEvents 出现限流计数项

## 红线
- 防护范围就这三件,不加验证码大战/设备指纹/风控引擎等"以后再说"的东西。
- 阈值必须容忍校园网同 IP 多用户场景,宁松勿误伤(免费试运行期,误伤真用户比被薅更伤)。
- D8 下线老站必须用户点头。
