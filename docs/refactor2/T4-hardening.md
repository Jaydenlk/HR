# T4 · 稳定性建设:流式状态保持 + 技术债清偿 + 防护(基础预防级)

> 用户 2026-07-02 指令:**T4 调整为下个编码 session 的打头任务**,S0 流式状态保持与 D1 死锁修复同批先行;验收按标准走,稳定性/可靠性/可用性最大化,反优绩主义持续生效。

## 目标
三段式:⓪流式任务状态保持与防重复(最高优先,新增);①审计核实每项技术债现状;②按核实结果修债+建防护(防批量注册薅额度+防接口滥用,基础预防级,**不过度建设**)。

## H0 热修:头像上传裂图(session 开工第一件小活,可独立先行部署)
audit B3/B5:`me.service.ts:78-81` 头像上传返回**裸存储 key**(如 `avatars/uuid.jpg`),全站没有任何路由/静态服务能把它解析成可加载图片——上传必裂,且全链路报 200"成功"。线上真实用户在用。
修法:返回可访问 URL,走**带鉴权/ACL 的下载路由**生成;**不许**用静态目录挂载图省事(会绕过 files 的 assertOwner ACL)。顺带清 `resume.file_url` 死字段(B3 关联)。
verify:Playwright 上传头像→刷新→图片可见;非本人构造 URL 访问被拒。

## 第零段(最高优先):流式任务状态保持与防重复(用户 2026-07-02 报告的 bug)

### 现状(侦察实锤,2026-07-02)
- 三条 SSE:JD 诊断 `POST /diagnoses/stream`(controller L73-84)、校招诊断 `/diagnoses/campus/stream`(L56-71)、对话 `/conversations/:id/messages/stream`(L61-111);前端统一走 `packages/web/src/lib/api.ts` 的 `postStreamRaw`(L193-250)。模拟面试/求职信/面试准备是阻塞 POST,不在本 bug 范围。
- 诊断:**分析完成才落库**(diagnoses.service.ts:161/198),之前失败且无 resumeId 时连 failed 记录都没有;status 只有终态(success/failed/partial),**无 running 态**;断开后管线继续跑完并落库(DiagnosisEventStream 解耦,设计正确),但页面 mount 不查进行中任务,进度纯前端 state——用户回来一片空白,也不知道结果稍后就有。
- 防重复:后端零拦截(CreditGuard 只查余额;ConcurrencyLimiter 是全局闸不分用户);前端防抖 remount 即失效;重复发起各自扣费(bill 无幂等)。
- 对话:断开**真取消**当轮生成且不落库(conversations.controller.ts:82-83 把 res close 接到 AbortController)——用户回来看到"自己发了消息 AI 没回",无重试入口。与诊断策略相反,且违反 diagnosis-event-stream.ts:1-13 类注释自己立的铁律"DB 落库不得绑定 SSE 订阅生命周期"。

### 设计定稿(KISS:不建通用任务系统,四目标各用最小改动)
1. **回来可见**:诊断发起即插最小行(status 新增 `running`,手写 migration;随管线推进 update)——顺带治好"无痕失败"(所有失败路径现在都有行可标 failed)。诊断页 mount 时查询进行中/最近诊断:有 running → 显示"诊断进行中"卡片,轮询 `GET /diagnoses/:id` 至终态后自动进结果页。**明确不做 SSE 断线重连/事件回放**——轮询已完全满足用户目标,回放属于优绩主义。
2. **防重复+防重复扣费**:发起时后端查同用户同类型的未超时 running 诊断,存在则 409 携带进行中 id;前端收 409 转入进行中视图。
3. **对话不丢回复**:对齐诊断哲学——断开只停转发、不取消生成,生成完照常落库(拆掉 close→abort 联动,消费与落库交给服务端独立任务)。用户回来重开会话即见完整回复。前端"生成中轮询"(最后一条是用户消息且 <2 分钟时几秒拉一次详情)为可选打磨,不是验收门。
4. **防僵尸**:running 超过管线超时由超时处理器标 failed;进程重启遗留的孤儿 running 行用**读取时惰性规则**兜底(读到 running 且已超 15 分钟 → 更新为 failed),不建清扫 cron。

### 派工(与 D1 死锁修复同批同 worktree——两者都动 diagnoses.service,串行)
- **Agent A(implementer)**:后端全部(running 状态机+早落库+409 防重+超时/惰性 failed+chat 解耦)。危险区纪律生效:改完必跑 `cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts`。
- **Agent B(implementer,串行)**:前端(mount 恢复卡片+轮询+409 处理;chat 可选轮询)。
- **Agent C(test)**:单测:发起即有 running 行/并发第二次 409/超时标 failed/惰性规则/chat 断开后回复仍落库。Playwright:发起诊断→跳走→回来→见进行中→完成自动到结果;chat 发消息→立刻刷新→回复最终出现。
- **Agent D(reviewer)**:找茬重点:**409 死锁风险——上一条卡在 running 永不终态会导致用户永远 409,惰性 failed 规则必须先于 409 判定执行**;扣费与 running 的关系;移动端 gate 不受影响。

### step→verify
1. running+早落库 → verify: 单测"发起即可查";全部失败路径有终态
2. 防重复 409 → verify: 并发发起单测 + "惰性规则先于 409"用例
3. chat 解耦 → verify: 断开场景集成测,回复落库
4. 恢复 UI → verify: Playwright 离开-返回全流程
5. 回归 → verify: watchdog+limiter 两组 spec 全绿 + 诊断/对话正常流 Playwright

## 第一段:审计清单(explorer/reviewer 只读核实,每项给 file:line 证据 + 现状判定)

> **范围收窄(2026-07-02)**:代码侧已由 51 条实锤的审计 workflow 完成(档案=`CODE-AUDIT-2026-07-02.md`):D1 判 FAIL 免核直修、D2 转 T5、D6/D7 已有结论(下表已更新)。**执行期仍需核实的只剩环境侧五项:D3(生产 env)、D4(备份 cron)、D5(spec 真跑)、D8(老站)、D9(npm audit)**——别再对代码侧重复派审计,浪费产能(audit M10 的教训)。

| # | 债项 | 要核实的问题 |
|---|------|--------------|
| D1 | 限流器嵌套死锁 | **已由 2026-07-02 审计 workflow 实锤,免核直接修**:2 个并发诊断即 100% 必现自锁(外层 runObservable 与内层 completeStructured 争同一单例的 2 个槽,diagnoses.service.ts:251 ↔ ai.service.ts:490/674);600s 超时只释放外层槽,**内层僵尸 waiter 残留队列继续污染排位**。修复与 S0 同批(同文件);修法二选一:AiService 内层调用 skipLimiter 透传,或拆成"管线槽/AI调用槽"两个独立池 |
| D2 | MockSession 越权 | 若 T5 已修则关闭,否则并入 T5(不重复修) |
| D3 | JWT secret 兜底值 | 生产 env 是否有强 secret;代码里默认值是否还能被走到 |
| D4 | Azure 新机备份 cron | 迁移后每日备份是否真在跑(查 crontab+最近备份文件时间戳,坐标见运维手册) |
| D5 | 看门狗参数 | AI_STREAM_IDLE_MS/MAX_MS 生产实配;两组 spec 是否全绿 |
| D6 | 注册链路现状 | **已核实(audit M10)**:登录/发码端点已有限流;真缺口=登录失败封禁窗口(IP/邮箱维度)+限流命中写 OpsEvent |
| D7 | 全局限流现状 | **已核实(audit M10)**:全局限流已存在(120 次/60s),**勿重复实现**;缺口见防护段专项 |
| D8 | 阿里云老站 | 是否仍在跑;Azure 稳定观察期是否可收官下线(下线要用户确认) |
| D9 | 依赖安全 | npm audit 高危项清点(只清点,修不修看结果轻重) |

审计产出:`docs/refactor2/T4-audit-result.md`,逐项 PASS(无需处理)/FAIL(附证据+建议修法+风险)。

## 第二段:修复与防护(按审计结果裁剪,以下为预案)

### 债务修复预案
- D1:给 AiService 调用链加 `skipLimiter` 透传(审计估算过约 15 处,中风险改动)——**危险区纪律生效**:改完必跑 `ai-stream-watchdog.spec.ts` + `concurrency-limiter.spec.ts`,并对"两用户同时诊断"场景加并发单测。
- D3:移除代码内弱默认值,启动时无 secret 直接 fail-fast 报错(生产已配则零影响)。
- D4:未配则按运维手册补每日 pg_dump cron + 保留 7 份轮转 + 备份文件非空校验告警。
- D8:确认稳定后**报用户拍板**再下线,不自作主张。

### 防护建设(按审计校准后的真实缺口,不重复造已有的轮子)
1. **限流补缺**(全局限流已存在):限流命中写 OpsEvent + 登录失败封禁窗口(IP/邮箱维度,阈值 env 可调不硬编码)。
2. **注册风控**:同 IP 注册频控、验证码发送冷却,按 D6 已核实的缺口补齐。
3. **专项防滥用三件**(audit M4/M23/m3):question-audio 每次真实调付费 TTS 无缓存无计费→加会话级缓存/节流;resumes 上传无大小上限(同仓其余 4 个上传端点都有)→补 limits 对齐 10MB;company-check 加与博查成本相称的专属节流(与 T6 联动)。
4. **权限补漏**(audit M14):GET /feed/sources、/feed/runs 补 AdminGuard(与同控制器写端点对称);/digest 页前端管理员门的 UI 细化随 T2。
5. **观测与脱敏**(audit M1/m2/M22):diagnoses.recordFailure() 与 conversations 流式错误分支补记 AI_CALL_FAILED(否则 admin 成功率对这两类端点系统性虚高);sanitizeError() 接入 withFailover 主路径,不再把 provider 名/上游原始响应体经 SSE 透传给浏览器;ENDPOINT_LABELS 改用稳定 action 常量修复带 :id 端点的标签失配。
6. **异常告警**:沿用 OpsEvents+admin 健康页计数,不建独立告警系统(过度建设)。

### 第三段:共享化与死代码清理批(低风险顺手活,排在 H0/S0/债修/防护之后,窗口富余才做;逐项对照 CODE-AUDIT-2026-07-02.md)
- **共享化**(M5/M15/M16/M17/M18/M19/M20/m4/m14/m16/m17/m18):AI 结果信封+confidence 枚举抽共享(9 处重复,字段漂移已发生);分数颜色阈值统一(**76 分在诊断页和面试页颜色语义相反**,这是真 bug 不只是洁癖);手搓弹窗收敛到现成 Dialog 组件(5 处均无 Esc);公告工具/relativeTime(6 处口径不一)/handoff 映射/humanFileSize/formatDate(8 文件)/轮询骨架各抽一处共享。
- **死代码**(m1/m11/m19/m21/m15):非流式 POST /diagnoses、/diagnoses/campus;GET /admin/ops-events(**删前先把 LIMITER_RESET 补进 error-stream 白名单**);GET /resumes/:id/versions(保留 POST);5 个 shadcn 脚手架死组件;resume.file_url 随 H0 清。
- **getChatContext 两套统一**(M13):建议=对话侧复用完整版,找回丢失的「建议行动」板块;确认不要则删。
- **保留不清**:transcribe-task.asr_job_id(ASR 战线仍活跃,不许清)。
- **纪律**:每项独立小提交;一旦发现某项引发连锁改动立即中止该项——**清理批不许变成重构批**。

## 派工方案

**编排:两条 dynamic workflow** — ①审计 workflow:D1-D9 **一项一 agent 并行扇出**(只读),汇总 agent 合成 T4-audit-result.md;②修复 workflow:A(债修,危险区可换 fable-dev 单点)与 B(防护三件)**并行**(文件集不相交:A=ai/*,B=main.ts+auth/*)→ C 测试与 D 审计并行扇出 → 汇总。

**Agent 0(审计扇出,Sonnet,只读)** — 按第一段清单逐项审计,产出 T4-audit-result.md。prompt 要点:每项必须 file:line 证据,查不到就写"查证路径+结论:不存在",禁止"应该没问题"。
**Agent A(implementer,Sonnet/Opus 按 D1 复杂度,worktree)** — 按审计结果修 D1/D3/D4 等 FAIL 项。D1 是危险区,prompt 里必须包含 01-dev-principles 第四节全文。
**Agent B(implementer,Sonnet,worktree,可与 A 并行——文件集不相交:A=ai/*,B=main.ts+auth/*)** — 防护三件。
**Agent C(test-agent,Sonnet)** — 单测:限流 429(第 N+1 个请求)、注册频控触发、验证码冷却;并发诊断死锁回归(D1);e2e 正常用户不受影响(阈值内全通)。
**Agent D(reviewer,Sonnet,只读)** — 找茬:限流是否误伤正常轮询端点(如转写任务轮询)、封禁逻辑有无把合法共享出口 IP(校园网 NAT)一刀切死的风险——阈值必须考虑同校学生共用 IP 场景。

## step→verify
0. H0 头像热修 → verify: Playwright 上传→刷新可见;非本人访问被拒
1. 环境侧审计(D3/D4/D5/D8/D9)→ verify: T4-audit-result.md 五项全有证据(代码侧 51 条已在 CODE-AUDIT-2026-07-02.md,不重复审)
2. S0+D1 → verify: 两组危险区 spec+并发死锁回归+S0 五步 verify 全绿(附输出)
3. 防护与补漏 → verify: 封禁窗/三专项节流/AdminGuard/脱敏/AI_CALL_FAILED 各有单测或 e2e 证据;Playwright 正常注册登录流不受影响
4. 清理批(如做)→ verify: 每项独立提交,jest+eslint+build 全绿
5. 部署后 → verify: 线上登录+诊断+对话+模拟面试冒烟;OpsEvents 出现限流/失败计数

## 红线
- 防护范围就这三件,不加验证码大战/设备指纹/风控引擎等"以后再说"的东西。
- 阈值必须容忍校园网同 IP 多用户场景,宁松勿误伤(免费试运行期,误伤真用户比被薅更伤)。
- D8 下线老站必须用户点头。
