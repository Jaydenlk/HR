# 统一开发原则(Opus 4.8 执行纪律)

> 本文件是执行期的行为准则,和 CLAUDE.md、`.claude/rules/` 并行生效;冲突时以本文件+用户当场指令为准。
> 写给"不需要思考也能执行"的场景:每条都是命令句,不解释哲学。

## 一、角色与派工

1. 主代理是协调者:分解、派工、质量门、集成、提交。**产品代码一律经 subagent**(worktree 内),文档/配置/运维可直接做。
2. 子代理模型:默认 Sonnet;复杂/关键任务用 Opus;**subagent 禁用 Fable**(用户 2026-06-12 指令)。单点重活可用 `fable-dev` 预设代理。
3. 编排优先 dynamic workflow;team-agent-workflow(jayden-workflow 5-agent 套装)已禁用,不许启用。
4. 并行派工前提:各 agent 改动文件集不相交;有共享文件就拆出串行集成 agent 收口。
5. 每个 handoff 必含五件套:任务一句话 / 输入文件清单 / 禁止触碰 / 交付物与写入位置 / 验证命令。T 文档里的派工 prompt 已按此写好,直接复制使用。

## 二、证据标准(没有证据=没有完成)

1. `tsc --noEmit` 不是 lint,不是测试。lint = `npx eslint src/` 0 错误;测试 = jest/Playwright 真跑真过,附原始输出。
2. **jest 必须从 `packages/api` 目录跑**(`cd packages/api && npx jest ...`)。从仓库根跑会走 babel-jest 报 TS 语法错——这是已知坑,不是代码问题。
3. 前端验收 = Playwright 走真实用户流(点按钮、填表单),不是截图存在即通过。
4. 汇报格式:每个 step→verify 给 PASS/FAIL + 证据(命令输出/截图路径);FAIL 不许粉饰成"minor"。

## 三、环境坑位速查(踩过的坑,别再踩)

| 坑 | 规则 |
|----|------|
| Docker 构建 | **只在本地 Docker Desktop 构建**,`docker save`(不压缩 tar)→ scp → 服务器 `docker load`。不在服务器构建,不用 gzip 管道(踩过传输损坏)。 |
| PowerShell vs git-bash | 构建镜像用 PowerShell。git-bash 会把 `/api` 改写成 `D:/Git/api` 弄坏登录(MSYS 路径改写)。 |
| SSH 绕 Clash | 需要 `route add <服务器IP> mask 255.255.255.255 <物理网关>`;网关随用户网络漂移,用 `Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway }` 查当前网关再加。 |
| 部署顺序 | 先备份 → 先 migration/seed(`run --rm`)→ 后 `up -d`。部署后必测登录。 |
| migration | 一律手写(`migration:generate` 伪 diff 不可信),命名与冒烟见 `deploy/README.md` §2.1。 |
| 服务器坐标/密钥 | 在 `E:\coach-deploy\运维手册.md` 与本机记忆,不在仓库。 |

## 四、危险代码区(改动前必读,改完必跑指定测试)

1. **AI 流式/看门狗/限流器**(`ai.service.ts` 流式部分、`concurrency-limiter.ts`、`diagnoses.service.ts` 管线超时):这里出过两次生产事故。改动后必跑:
   `cd packages/api && npx jest ai-stream-watchdog.spec.ts concurrency-limiter.spec.ts`
   不变量:槽位只在 finally 释放;reset 必须 reject 排队 waiter;看门狗 idle 重置点是 `reader.read()` 返回(含 reasoning 帧),不是 yield。
2. **AiService 主备降级**(GLM 主力 + DeepSeek 备份):不许在业务代码里绕开 AiService 直连供应商。
3. **鉴权/额度**:凡新增 AI 端点,默认挂 JwtAuthGuard + CreditGuard + 计费拦截器,和现有端点对齐。

## 五、行为熔断线

1. 同一思路失败 3 次 → 换思路;同一问题缠斗 8 次 → 停,写清卡点/已试/建议,报用户。
2. workflow 里的 agent 因限流/网络失败返回 null → **不计入轮次/配额**,等恢复重跑;不许拿配额失败当质量结论(试点吃过这亏)。
3. 子代理 prompt 一律写入防挂死铁律:"单个 WebFetch 久无响应就放弃换下一个,不许死等"(OfferIN 事故:一个挂死请求冻住整个 workflow 40 分钟)。
4. 发现文档未覆盖的决策点 → 停下问用户,不自作主张;可逆的小事直接做完再汇报。

## 六、范围与风格

1. 每行改动可追溯到 T 文档的某一条;不顺手重构、不加没人要的配置项。
2. 匹配现有代码风格;只删自己改动导致失效的 import/函数,历史死代码不动。
3. 严格类型:no `any`,no `as unknown as`。
4. 反优绩主义:检查与文档为产出服务。任何流程指标(轮数/源数/门数)都不是目标本身;写"给评审看"的仪式性内容 = 违规。

## 七、提交纪律

- 分支:日常在 dev;大任务用 worktree 分支,收口合并 dev。
- 推送:`git push origin dev && git push origin dev:main`(已授权)。
- 提交信息中文,格式沿用仓库现状(`feat(scope): 说明`)。
- `.env` / `E:\coach-deploy\` 内容永不入提交。
