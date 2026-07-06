# 02 · 执行手册(给降级后的 Opus:照单执行,不需自己分解)

> 背景:Opus 系列近期算力紧张、明显降智,自主"分解+派工"环节最易出错(看门狗那次事故即此类)。对策:Fable 在位时已把每个代码任务**预制成一条可直接运行的侦察先行 workflow 脚本**。你(Opus)的职责被压缩到三步,**不需要自己切任务、不需要自己写派工 prompt**。
>
> 读完本文即可开工。上位文档:先读 `00-master-plan.md`(顺序/红线/状态表)、`01-dev-principles.md`(纪律/环境坑/危险区)。设计细节在各 `Tx-*.md`。审计底账在 `CODE-AUDIT-2026-07-02.md`。

## 你每个任务的标准动作(三步,不许跳、不许改序)

1. **运行**:`Workflow({scriptPath: "<索引表里的绝对路径>"})`。它自带侦察→实现→验证三段,会自己吸收代码漂移。等后台通知。
2. **判定**:读返回 JSON,套「通过判据」(见下)。这是唯一标准,不许凭感觉放宽。
3. **收口**:
   - 通过 → 按「合并规程」合并进 dev,更新 `00-master-plan.md` 状态表对应格,进下一任务。
   - 不通过 → 按「修复循环」派修复,**最多 2 轮**;仍不过 → **STOP**,在状态表写清卡点、已试、下一步建议,等用户。

## 开工预检(每次 Workflow({scriptPath}) 之前,leader 逐项过,缺一项不许发车)

1. **配额窗口**:上一个 agent 是否秒报 session limit?是 → 本轮不发实现类任务,只做文档/判定/收口,写明等下次唤醒。
2. **主树状态**:`git status`——若脚本在主工作区跑(t1/t6/t2),主树的**文档类**已跟踪改动(docs/、CLAUDE.md、.claude/)先由 leader 收口提交;**代码文件**有未提交改动则先查明归属,不许带病发车。任务在主树进行期间,leader 不得在主树做任何提交。
3. **分支/worktree 残留**:`git branch --list feat/<key>` + `git worktree list`——目标分支已存在且有本任务提交 = 续跑局面(脚本 impl 已内置续跑判定,放心发);分支存在但内容不明 → 先查清再发。
4. **端口/服务**:涉 Playwright 的任务,确认 3001/3002/5432 的占用现状(主树 dev 服务可能在跑),脚本内已写处理方式,但 leader 心里要有数。
5. **任务体量预判**:实现段预估要动 >10 个文件或含"新模块+migration+前端"三件套的,确认脚本已含增量提交铁律(2026-07-03 后所有脚本已注入);没有的老脚本不许直接跑。

## 增量提交与任务切片(2026-07-03 实证教训,硬约束)

**教训**:t4-s0-d1 实现代理连续三个配额窗口烧尽(单窗 359k token/90 工具调用/37 分钟),三次都把提交压到任务最后,中断=全部白干,靠主树 leader 抢救性快照+代付提交才保住。

- **增量提交铁律**:实现代理每完成执行清单一个条目(或一组强耦合条目)立即 commit(可用 `wip(<key>):` 前缀)。配额中断时,已提交的就是断点,没提交的就是白干。所有脚本的 impl prompt 已内置此条,修复代理的派工 prompt 也必须带上。
- **续跑判定铁律**:实现代理开工先 `git log` 查本分支有无本任务已有提交(含 wip 前缀的抢救性提交),有 → 缺口分析后只做剩余部分,不许重做、不许 revert 重来。
- **切片原则**:单个实现代理的任务量以"一个配额窗口能收口"为上限(经验值:≤10 文件改动或 ≤150k token 预估)。超过的在脚本层拆成串行多段(参照 t5 的后端/前端两段式),每段独立提交。
- **同任务第 3 次被配额打断** = 结构性过大,不许第 4 次原样重跑;必须改走"缺口审计→只补剩余"的 closeout 式流程(见下节)。

## 配额中断处置(症状→动作)

症状:后台任务通知实现代理死于 session limit / 进程退出。

1. **先保资产**:立即查 worktree/分支的 `git status`。有未提交改动 → leader 亲自 `git add <本任务路径> && git commit -m "wip(<key>): 抢救性提交(未过质量门)"`(这是 git 运维不是写产品代码,leader 可做);危险区任务同时打快照(`git diff > E:\Agent program\HRBP\_local\_snapshots\<key>-<时刻>\tracked-changes.patch` + 拷走 untracked 新文件;快照区已于 2026-07-04 归集至 `_local\_snapshots`)。
2. **再定处置**:写明断点到 00 与记忆文件,等配额恢复后走 closeout 式续跑:①缺口审计代理(只读+跑探针)对照设计文档列 DONE/PARTIAL/MISSING;②补完代理只做缺口(危险区用 opus),增量提交;③正常验证段收口。**不许无脑从头重跑原实现段。**
3. **t4-s0-d1 现状坐标(2026-07-03)**:半成品已抢救提交(worktree `E:\Agent program\coach-wt\t4-s0-d1`,分支 feat/t4-s0-d1-stability,commit 0722155,14 文件含 migration+smoke spec,未过质量门);快照在 `_local\_snapshots\t4s0d1-20260703-1431`(已随归集迁移);续跑一律走 `t4-s0-d1-closeout.js`,不再跑原脚本的实现段。

## 省配额模式:agent team(2026-07-03 用户指令,t4-s0-d1 收口之后的任务适用)

weekly 配额吃紧,从 T1 起不再用 workflow 四段扇出(侦察/实现/测试/审计=每任务 4 个新模型实例),改为**常驻小队+SendMessage 续用**:

- **开发代理(每任务 1 个,sonnet)**:一个代理吃下"侦察+实现+自验"全程——prompt 直接取对应 workflow 脚本里的 RECON+IMPL 段拼接(脚本仍是唯一的红线/判据来源,只是执行载体从 workflow 换成 Agent)。增量提交铁律照旧。FAIL 修复不新开代理:**SendMessage 给同一个开发代理**发失败清单定点修(它有全上下文,最省 token),≤2 轮。
- **审计代理(全程 1 个,sonnet,跨任务复用)**:只读找茬,prompt 取脚本 REVIEW 段;每个任务收口时 SendMessage 发新任务的 diff 坐标续审。独立性靠"只读+不参与实现"保证,不靠新开实例。
- **测试门**:优先让开发代理自验时一次跑全(它反正在现场);leader 合并前的复跑冒烟照旧亲自跑(运维不算写码)。仅当自验与审计结论冲突时才单独开测试代理仲裁。
- **禁用项不变**:team-agent-workflow 插件(jayden-workflow hooks)仍然禁用,这里说的 agent team 是 Agent 工具+SendMessage 常驻复用,不是那个插件。
- 判据、STOP 规则、合并规程、修复≤2轮、增量提交铁律——全部照本手册原文执行,一条不松。

## 通过判据(唯一标准)

全部满足才算通过(**缺一门都不许合并 dev**,用户 2026-07-03 指令):
- `gates.overall_pass === true`(即 jest 全量绿 / api build 过 / 涉前端则 eslint 0 错 + web build 过)。
- **api e2e 必须真跑且零失败**(`npx jest --config ./test/jest-e2e.json --forceExit`;newspaper 时间 bug 首修合并后不再存在任何"已知失败白名单",出现失败先归因回归/环境再处置,不许带病合并)。
- **Playwright 硬门**:凡任务含前端改动或用户可见行为变更,Playwright 用例必须真跑真过;"环境起不来"不算过——按 STOP 修环境后重验。纯后端/纯测试改动此门 N/A,但判定记录里必须写明 N/A 理由。
- `review.verdict === "PASS"`,且 `review.findings` 里**无 `severity === "blocking"`**。
- 脚本约定的残留扫描符合预期(仅剩脚本白名单里的合法同名残留)。

裁决细则:
- `blocking` 必须清零才合并。`major` 记入该任务遗留清单、不阻断合并(除非累计 ≥3 条同类,则升级为需修)。`minor` 只记录。
- 侦察阶段若把某条标 `[缺失-需人工]`:不是失败,是设计与现实对不上——**STOP**,把这条拎出来问用户,别让实现代理猜。

## 何时必须 STOP 等用户(降级期尤其不许自作主张)

- **任何推线上/部署**:所有任务只做到合并 dev。部署是用户可见的对外变更,合并后停手,等用户一句"上线"再走 `01-dev-principles.md` 部署纪律(本地构建→scp→load→先 migration 后 up→测登录)。
- **drop 数据表 / 覆盖或删除用户数据 / 任何不可逆动作**。
- 脚本红线区被迫触碰,或侦察报 `[缺失-需人工]`。
- `00-master-plan.md` 的「待用户输入的遗留项」里相关项未定(如 T2 公众号工具格式、T3 注册表 go/no-go、evidence_used 去留等)。
- 同一任务修复 2 轮仍 FAIL(别无脑重试,写清卡点)。
- 出现文档未覆盖的决策点。

## 微调允许边界(你能自己定的 vs 不能)

能自己定(可逆、范围内):行号漂移→以内容锚点定位继续;临时改 workflow 脚本里的 label/model/prompt 措辞让它更清楚(改后同 runId 可 resume 走缓存);FAIL 后组织修复代理。
不能自己定(必须 STOP):扩大任务范围、顺手重构范围外代码、合并两个任务、跳过某道质量门、放宽通过判据、碰红线、碰危险区不跑指定 spec、部署、动数据。

## 任务 → 脚本 索引表(顺序即执行序;绝对路径前缀 `E:\Agent program\HRBP\`)

| 序 | 任务 | 脚本(docs/refactor2/workflows/) | 类型 | 依赖 | 合并目标 | 特别停点 |
|----|------|------|------|------|----------|----------|
| 0 | 薪资雷达删除 | (已由 Fable 执行,见状态表) | 删除 | — | dev | 不 drop 表;不推线上 |
| 1 | T4-H0 头像热修 | `t4-h0-avatar.js` | 修复 | 无 | dev | 禁静态挂载绕 ACL |
| 2 | T4-S0+D1 稳定性 | **`t4-s0-d1-closeout.js`**(半成品续跑;原 `t4-s0-d1-stability.js` 实现段作废不再从头跑) | 缺口审计+补完(危险区) | 无 | dev | 改完必跑 watchdog+limiter spec;惰性 failed 先于 409 |
| 3 | T1 导航重组删页 | `t1-nav.js` | 删除重组 | 无(薪资若已删则少一项) | dev | 禁删 follow-up 后端;清后端 AI prompt 死路由 |
| 4 | T6 博查统一搜索 | `t6-bocha.js` | 构建+migration | T1(行业趋势先删) | dev | 缓存只认精确名;候选不截断;防伪造 |
| 5 | T5 投递详情页 | `t5-app-detail.js` | 构建+migration | T6(公司背景实体) | dev | 写入补归属校验(非只加FK);同名 salary_range 禁碰 |
| 6 | T2 校招情报 | `t2-recruit-intel.js` | 侦察加重构建 | 无(可与 T4 二段并行) | dev | 缺字段 null;不反爬;摘 C 端计费 |
| 7 | T3-Stage0 骨架 | `t3-stage0-schema.js` | 构建 | 无 | dev | 只做 Stage0;schema 焊死后改动需用户批 |

> T3 内容量产(700-800 词条)不在本表——它是独立的内容 pipeline workflow,须在 Stage0 完成 + 注册表 + 经济验证批 go/no-go(用户过目)之后另启,单条预算 5 万 token 目标 / 8 万熔断,详见 `T3-career-wiki.md` §6-§8。

## 每条脚本的返回结构(怎么读结果)

脚本统一返回:
```
{
  checklist,        // 侦察阶段产出的当前精确执行清单(纯文本);出现 [缺失-需人工] 即 STOP 信号
  impl_report,      // 实现代理的逐条 DONE/SKIP + commit hash + diff --stat
  gates: {          // 测试代理
    gates: [{name, pass, evidence}],   // 每道质量门
    overall_pass,   // 布尔:通过判据看它
    notes
  },
  review: {         // 审计代理(只读找茬)
    verdict,        // "PASS" | "FAIL"
    findings: [{severity, file, issue, evidence}]   // 有 blocking 就不许合并
  }
}
```
判定顺序:先看 `checklist` 有无 `[缺失-需人工]`(有→STOP)→ 再看 `gates.overall_pass` → 再看 `review` 有无 blocking。三关都过才合并。

## 合并规程(通过后)

1. 确认在对应 `feat/<key>` 分支且实现代理已提交(`git log -1`);确认「通过判据」全部满足(含 Playwright 硬门)。
2. 切 dev,`git merge --no-ff feat/<key>`(冲突→若非平凡则 STOP 报告,别硬解)。
3. 复跑一次冒烟:单元 `cd packages/api && npx jest` + e2e `npx jest --config ./test/jest-e2e.json --forceExit`(两条都要,裸 jest 不含 e2e)+ 涉前端 `cd packages/web && npm run build`。
4. `git push origin dev && git push origin dev:main`(已授权)。
5. **合并后对抗式审计(用户 2026-07-03 指令;轻量一次,不搞扇出,不为凑发现浪费 token)**:派**一个** Sonnet 只读审计代理,对抗立场审该任务在 dev 上的最终 diff(`git show <merge_commit>` / `git diff <merge前dev>..dev`),专找"合并环节引入的问题":冲突解错、半合并、红线触碰、与 dev 既有改动的相互作用。**保证没问题即收工**——没有实质问题就一句"未发现",不许报鸡毛蒜皮凑数。发现 blocking → 立即 dev 上小修,修不动则 revert 合并并 STOP。结论一行记入 00 执行进展。
6. 更新 `00-master-plan.md` 状态表该任务「合并」列打勾;把 review 的 major 遗留追加到该任务遗留清单。
7. **不部署**(见 STOP 规则)。

## 修复循环规程(不通过时)

1. 从 `gates`/`review` 里摘出所有 FAIL 门与 blocking 发现,原样(带 evidence)。
2. 派一个修复代理(Sonnet,同 `feat/<key>` 分支):prompt = 原任务红线 + 这批具体失败项 + "只修这些,不扩范围,修完复跑失败的那几门附输出"。
3. 复跑该任务脚本的验证段(可 resume 原 runId 走缓存,只重跑验证)或单独派测试代理复验。
4. 通过→合并;仍不过且已第 2 轮→STOP,写清卡点。

## 脚本执行注意事项(2026-07-02 防呆校验补跑发现,已在脚本内修好,此处提醒)

- **jest 两条都要跑**:脚本已内置"单元 `npx jest` + e2e `npx jest --config ./test/jest-e2e.json --forceExit`"两条命令;别手贱改回只跑一条裸 jest(会静默漏掉全部 e2e 报假绿)。详见 `01-dev-principles.md` 第二节。
- **t4-s0-d1(危险区)实现/补完必须 opus,不许降回 sonnet**(用户 2026-07-03 指令;原脚本已改好并提交 4863be4,closeout 脚本同样内置 opus)。其余脚本 sonnet 即可,无需运行前微调。
- **Playwright 门的环境前置**:涉前端/e2e 的脚本要在 worktree 里补 `packages/api/.env` 与 `packages/web/.env.local`(gitignored 不随 worktree 带过来,缺了服务起不来);需要本机 Docker Postgres(coach-postgres)与端口 3001/3002/5432 空闲。脚本已写"起不来就如实 FAIL"兜底——真起不来时那是环境问题,不是代码 FAIL,按 STOP 处理别误判。
- **REVIEW 判据以「通过判据」节为准**:verdict=PASS 且无 blocking 才放行;major 记遗留不阻断,minor 只记录。各脚本 review prompt 已统一对齐这个口径(2026-07-03 修正:此前 t3 脚本写的"findings 非空即 FAIL"会让 minor 触发假 FAIL 修复循环,已改)。
- **分支预检查**:`feat/<key>` 若因上次残留已存在,`git checkout -b` 会报错;脚本侦察阶段会如实报告,你先确认该分支已清理或改为续跑。
- **worktree 里 Next 16 Turbopack build 必挂(2026-07-03 实测)**:worktree 的 .git 是指针文件+pnpm 软链 node_modules 指回主仓库,Turbopack 误判 workspace root 报 "couldn't find next/package.json"。这是环境限制不是代码回归:在 worktree 用 `npx next build --webpack` 验证,或以合并后主仓库的 `npm run build` 为权威判定(合并冒烟必跑)。别让它把门6误判成代码 FAIL。

## 交接自检(Opus 开工前确认)

- [ ] 已读 00 / 01 / 本文件。
- [ ] `git status` 干净、在 dev、最新。
- [ ] 索引表脚本文件都在 `docs/refactor2/workflows/` 且已提交。
- [ ] 明确本轮只做到合并 dev,不碰部署与数据。
- [ ] 按索引表顺序,一次一个任务,每个走满三步。
