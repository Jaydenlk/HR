# T2 · 月刊校招情报(自动搜集→汇总→可跳转)

## 目标
把"信息贩子在线表格(购买)+公益网站+公众号"三类源的校招信息,自动摄入→GLM5.1 解析成结构化事件→去重→**周更**呈现在月刊页「校招情报」常驻板块(按截止日排序、可跳转原链),每期月刊再做深度汇总。

## 现状坐标(侦察已核实,2026-07-02)
- 后端 `packages/api/src/feed/` 已有完整流水线:`FeedSource`→抓取→`FeedItem`→`digest-generator.service.ts`(DigestRun)→`newspaper.service.ts`→`/newspaper` 读者页。
- 供给管理页 `/digest`(`(main)/digest/page.tsx`,不在导航):情报源管理+抓取记录+投稿,API=`/feed/sources`、`/feed/runs`、`/feed/import`。
- 读者页 `(main)/newspaper/page.tsx`(数据来自 `GET /newspaper`)。
- **实现前置侦察**:implementer 动手前必须先读 feed 模块现有 source 类型/抓取调度机制,适配而非另起炉灶。

## 设计定稿

### 1. 源接入(三类适配器,挂在 FeedSource 体系上,新增 source 类型)
| 类型 | 形态(用户确认) | 接入方式 |
|------|------|----------|
| `sheet_file` | Excel/CSV 文件 | 管理员在 /digest 供给页上传,后端解析(xlsx/csv 库) |
| `sheet_link` | 腾讯文档/飞书在线链接 | 尽力而为:优先走导出/公开访问抓取;登录态/反爬挡住时,管理页明确提示"请导出 CSV 上传"降级到 sheet_file。**不为反爬对抗投入,降级路径就是正解** |
| `wechat_dump` | 公众号现成爬取工具的产物文件(用户:此前做过,GitHub 有相关 app;具体仓库名待用户提供) | 管理页上传工具导出文件(json/md/html 均预留),适配器解析。等用户给具体工具后按其真实输出格式对齐 |

### 2. 解析:GLM5.1 结构化(经 AiService,不直连)
新实体 `recruit_events`:`id / company / role_hint / event_type(网申开启|网申截止|宣讲会|笔试|面试批次|其他) / event_date / city / apply_url / source_ref(FeedItem或上传批次) / confidence / dedup_key / created_at`。
- Prompt 铁律(防编造,与全站一致):字段缺失就 null,**禁止推断补全日期/链接**;每行原始数据附带进 prompt,输出走 JSON schema 校验,不合格丢弃并记日志。
- 去重:`dedup_key = hash(归一化公司名 + event_type + event_date)`;冲突时保留 source 更权威/更早者,合并 apply_url。

### 3. 调度:周更 cron
- 挂在现有 digest/feed 的调度机制上(实现前先读现状,同机制注册周任务);抓取+解析+去重一条龙,产出写 `recruit_events`,运行记录进现有 runs 体系,管理页可见。
- 上传类源(文件)在上传时即时解析,不等 cron。

### 4. 呈现
- `/newspaper` 页新增「校招情报」常驻板块:未过期事件按 `event_date` 升序(临近截止置顶),展示 公司/事件/日期/城市/跳转原链;过期自动隐藏。API:`GET /newspaper` 扩展返回或新端点(实现时按 newspaper.service 现状选侵入最小者)。
- 每期月刊生成时,digest-generator 把当期新增 recruit_events 纳入汇总段落。
- `/digest` 供给页扩展:三类源的管理 UI(新增源/上传文件/查看解析结果与失败行)。

### 5. 与 T3 的协同(本任务只留钩子)
`recruit_events` 就是职业维基「入行层-校招信号」的一手源之一;本任务不做维基侧消费,只保证 `recruit_events` 表结构含 `role_hint` 字段可供未来按职业族聚合。

## 派工方案

**编排:一条 dynamic workflow** — stage0: Agent 0 侦察 → stage1: A 后端(三适配器可在 A 内部并行小分队,前提文件不相交)→ stage2: B 前端 → stage3: C(e2e/Playwright)与 D(审计)**并行扇出** → 汇总。

**Agent 0(explorer,Sonnet,只读)** — 前置侦察:feed 模块 source 类型体系/抓取调度机制/runs 记录方式/digest 生成钩子,产出接入点坐标清单(file:line)。
**Agent A(implementer,Sonnet,worktree)** — 后端:适配器×3 + recruit_events + GLM 解析 + 去重 + 周 cron。prompt:
```
任务:按 docs/refactor2/T2-recruit-intel.md 设计定稿 1-3 实现校招情报摄入流水线。
必读输入:该文档;Agent 0 的接入点清单;feed 模块相关文件;AiService 调用范式(找一个现有 GLM 调用照抄结构)。
禁止触碰:newspaper 前端;其他模块。
硬规则:解析经 AiService;缺失字段 null 不许编;migration 手写;sheet_link 抓不到就降级提示,不搞反爬对抗。
交付:worktree 分支 feat/t2-intel;单测:CSV 解析(含脏行)、去重键冲突合并、GLM 输出 schema 校验拒绝不合格、事件过期过滤。
测试夹具:自造 3 份样例(规整CSV/脏CSV/公众号文章文本),放 test/fixtures/。
验证:cd packages/api && npx jest recruit --verbose 附输出;全量回归。
```
**Agent B(implementer,Sonnet,同 worktree 串行)** — 前端:newspaper 校招情报板块 + /digest 供给页三类源管理 UI。
**Agent C(test-agent,Sonnet)** — Jest e2e:上传样例 CSV→事件入库→newspaper 端点返回;防编造测试(缺截止日的行→event_date 为 null 且不进"按截止日排序"主列表,落"日期待确认"分区)。Playwright:管理员上传→读者页板块出现→点击跳转原链。
**Agent D(reviewer,Sonnet,只读)** — 重点找茬:GLM 解析有没有编造回退、去重误合(不同公司同名事件)、cron 是否会重复摄入同一文件。

## step→verify
1. 三适配器+实体 → verify: 单测(含脏数据夹具)全绿
2. GLM 解析防编造 → verify: 缺字段夹具产出 null,无凭空日期/链接
3. 周 cron+runs 记录 → verify: 手动触发一轮,runs 可见,重跑不产生重复事件
4. 读者页板块 → verify: Playwright 上传→展示→跳转全流程
5. 月刊汇总钩子 → verify: 生成一期 digest,含当期情报汇总段

## 红线
- 缺失字段 null,禁止 AI 补全;来源链接必须原样保留可跳转。
- 不做反爬对抗;链接源抓不到就走上传降级。
- 公众号工具具体格式落地前,wechat_dump 适配器按"通用文本/json 摄入"实现,不猜专有格式;等用户提供工具仓库名后再对齐(遗留项记入 00 总纲)。
