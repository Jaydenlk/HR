# 二次重构 · 总纲(唯一入口文档)

> 本文件是二次重构的总调度台。**任何模型(尤其 Opus 4.8)接手时,先读本文件 → `01-dev-principles.md` → `02-execution-playbook.md`,然后按执行手册照单跑脚本即可。**
> 设计已全部定稿(2026-07-02 与用户逐项确认),执行阶段**不需要再做任何架构决策**——每个任务已被 Fable 预制成一条可直接运行的侦察先行 workflow 脚本(在 `docs/refactor2/workflows/`),Opus 只需:跑脚本→按判据读结果→合并或升级。遇到文档没覆盖的决策点:停下,问用户,不许自作主张。
>
> **降级 Opus 交接铁律**:不要自己分解任务、不要自己写派工 prompt。`02-execution-playbook.md` 的「任务→脚本 索引表」是唯一执行清单,按序 `Workflow({scriptPath})` 即可;判定、合并、STOP 规则全在手册里。

## 窗口约定

- 设计窗口(本轮):只出文档,不写代码。✅ 已完成。
- 编码窗口(下一个 5 小时起):按本文件顺序执行 T1→T6。
- 每个编码窗口开始的启动仪式:
  1. 读本文件「状态追踪」表,确认当前进行到哪一步;
  2. `git status` + `git branch` 确认工作区干净、在 dev;
  3. 读当前任务的 T 文档,按其「派工方案」发子代理;
  4. 每完成一个 verify 步骤,**立即更新本文件状态表**(这是断点续跑的生命线)。

## 六任务索引与执行顺序

| 序 | 任务 | 文档 | 体量 | 依赖 |
|----|------|------|------|------|
| 1 | **T4 稳定性建设(S0 流式状态保持 + D1 死锁修复打头)** | `T4-hardening.md` | 中大 | 无——**用户 2026-07-02 指令:下个编码 session 从这里开工** |
| 2 | T1 导航四模块重组+删页 | `T1-nav-cleanup.md` | 小 | 无 |
| 3 | T6 博查统一搜索服务 | `T6-bocha-search.md` | 小中 | T1(行业趋势模块先删) |
| 4 | T5 投递追踪二级页 | `T5-application-detail.md` | 中 | T6(公司背景实体) |
| 5 | T2 月刊校招情报 | `T2-recruit-intel.md` | 中大 | 可与 T4 的第二段(防护三件)并行 |
| 6 | T3 职业维基体系 | `T3-career-wiki.md` | 特大 | 无硬依赖,放最后总攻 |

> 顺序调整理由(2026-07-02):S0 流式状态保持(用户报告的 bug)与 D1 死锁互相放大(界面丢→用户重发→并发翻倍→死锁必现),必须先修;T4 的 H0 头像裂图热修是 session 开工第一件小活。其余五任务计划保持就绪,T4 收口后立即回归原序,不挤占它们的开发与校验流。
>
> **代码现状审计档案**:`CODE-AUDIT-2026-07-02.md`(51 条实锤:5 blocking/23 major/23 minor,对抗核实零否决)。各 T 文档的「审计校准」节由它派生,执行时以校准后的 T 文档为准,审计档案作溯源。

**并行规则**:T2 与 T4 允许双 worktree 并行(文件集基本不相交:T2=feed模块+newspaper页,T4=auth/限流/基建),但两者都可能碰 `app.module.ts`——由集成 agent 串行收口合并。其余任务一律串行。T3 的内容量产(workflow 跑词条)不占代码通道,可在 T2/T4 之后与收尾工作重叠。

## 编排方式(用户指令:dynamic workflow 为主力,agent 单点只做补充)

- **每个任务默认打包成一条 dynamic workflow**:实现 stage(有依赖就串行)→ 验证扇出(单测/e2e/lint/grep 残留检查**并行**)→ 审计扇出(reviewer 多镜头**并行**找茬)→ 汇总判定。T 文档里的 Agent A/B/C/D 就是 workflow 里的 agent() 调用,不是逐个手发的单点任务。
- **典型拓扑**:T4 审计九项=一项一 agent 并行扇出;T2/T5/T6 的 test+review 阶段并行;T3 量产本身就是 workflow(S1-S10),按 pipeline 让各词条独立流转,不设不必要的批间栅栏。
- **Agent 单点(fable-dev 等)只用于**:单文件小改、需要长上下文连续作业的单点重活(如 T4-D1 危险区修复可考虑)。
- workflow 运维铁律见 `01-dev-principles.md` 第五节(失败轮不计数/防挂死/resume 缓存续跑)。

## 全局质量门(每个任务收口必须走完,顺序固定)

1. 实现完成(implementer,worktree 内)
2. 测试通过并附原始输出(jest 从 `packages/api` 目录跑;前端 `npx eslint src/` 0 错误 + build 过)
3. Playwright E2E 走查(涉及前端的任务)
4. 独立审计(reviewer 只读,找茬不背书)
5. 合并 dev + 提交(`git push origin dev && git push origin dev:main` 已获授权)
6. 部署按 `01-dev-principles.md` 部署纪律(**本地构建**,先 migration 后 up -d,数据保护三查)

## 状态追踪(执行时逐格更新)

| 任务 | 设计 | 实现 | 测试 | 审计 | 合并 | 部署 |
|------|------|------|------|------|------|------|
| T1 | ✅ | ✅ | ✅ | ✅ | ✅(23f8fc3) | ☐ |
| T6 | ✅ | ✅ | ✅ | ✅ | ✅(fb79545) | ☐ |
| T5 | ✅ | ✅ | ✅ | ✅ | ✅(e2b326f) | ☐ |
| T2 | ✅ | ✅ | ✅ | ✅ | ✅(6ffc579) | ☐ |
| T4 | ✅ | ◐ H0✅+S0+D1✅ / 防护+清理批待 | ◐ H0✅ S0+D1✅ | ◐ H0✅ S0+D1✅ | ◐ H0(c02ed37) S0+D1(b4682eb) | ☐ |
| T3 | ✅ | ◐ Stage0+9层骨架+注册表v2.1✅ / 流水线搭建中 | ◐ 骨架✅ | ◐ 三镜头终验✅ | ◐ 骨架(3a958b2)+注册表(92ab081) | ☐ |

## 执行进展与已知问题(2026-07-02 自主执行,Fable 值守)

**已完成(仅到 dev,未部署)**
- 薪资雷达模块整删:合并 dev `b5ef6ff`(← 3f4d740),已推 dev+main。独立审计 PASS;**`salary_entries` 表:用户 2026-07-03 拍板不清、永留记录**——该表现为孤儿表:代码零引用、数据原样保留(含用户自报+81条market种子),由初始迁移 `1781186894991-InitialSchema.ts` 创建,`migration-smoke.spec.ts` 仍校验其存在。未来任何人想清理:必须用户再次确认+备份先行,不许当"顺手清理"做掉;同名 `salary_range` 等零误伤;intelligence 的 `salary_context` 证据链一并摘除;credit e2e 受测端点改用 `/api/applications/strategy`。遗留死枚举值 `EVIDENCE_KINDS.'salary_data'` / `source_type.'salary'`(纯类型死值,不阻断,可并入 T4 清理批)。
  - **验收终裁(2026-07-02,dev@f3b878c,六门)**:PASS——api 单测 539 过/0 败;api e2e 1111 过、仅 newspaper 已知 4 条时间 bug(唯一失败 suite);api build 0 错;web eslint 0 错;web build 成功且路由清单确认无 /salary;残留复扫 4 组 grep 全 0 命中(连压测脚本的 `/salary` 采样串都已清,比基线更干净)。原始输出留存 scratchpad(e2e-out.txt / web-build.txt)。

**✅ 首修已完成:newspaper e2e 时间 bug(曾阻断所有任务的 e2e 门)**
- 根因:`test/newspaper.e2e-spec.ts` 种子写死 `2026Q2`,而首页/雷达按"当前季度"过滤(今为 Q3),Q2 数据被全滤掉,4 条恒挂;已证实既有(dev 基线同样挂,与任何改动无关)。
- ✅ **已修(commit 30ad455 → 合并 a81a2be)**:种子改为动态取当前季度(import 产品同一套 `radar-helpers.getCurrentQuarter`)。验证:newspaper.e2e 61/61 绿;**全量 e2e 1115 passed / 0 failed(基线彻底转绿)**——此后各任务的 e2e 门判据不再被污染。纯测试改动→Playwright 门 N/A(无前端/用户可见变更);合并后审计由集成者 git 核验代行(纯测试+clean merge 无代码交互面,不派 agent 免通胀)。
- 附:t4-s0-d1 危险区实现阶段已升 opus(commit 4863be4;曾因并发误落 fix 分支,已 rescue 保全+cherry-pick 归位 dev)。

**✅ T4-H0 头像热修:已完成并合并(merge `c02ed37` ← 34c254e/9248c9d,dev+main)**
- 修复:me.service 返回 `/files/download/<key>` 可访问 URL(复用鉴权下载路由的 assertOwner ACL,非静态挂载)、me页/layout 两处 `<img>` 接鉴权 Blob 拉取(新建 `use-authed-image.ts` hook)、清 `resume.file_url` 死字段、A3 补 `naturalWidth>0` 真断言(唯一精确定位器)。红线守住:未碰 ACL、无静态挂载、无 DROP migration。
- 全六门通过:api e2e 1115过0败 / api build / web eslint 0错 / web build / **Playwright A3 真过(201+naturalWidth>0,13 passed 0 failed,D1/D2 是既有 429-skip)** / 残留复扫(file_url 命中仅 .claude/audit 历史文本=误报,源码零残留);workflow 内审计 + **合并后对抗审计均 PASS 零阻断**。
- 曲折:首跑撞 session 配额中止→复位;resume 跑完但本机 coach-postgres 迁移滞后缺 file_metadata 表致 A3 报 500(非代码,jest e2e sqlite 侧同链路 21/21 绿)→收口时 `migration:run` 补齐本机库(仅应用已有的 CreateFileMetadata 等 5 个迁移,本地 dev 库非生产)→A3 因非唯一定位器 strict-mode 失败→修定位器转绿。
- **⚠️ 部署注意(非阻断遗留)**:线上老用户 DB 里可能存旧裸 key 格式 avatar_url,部署后其 getBlob 拼出畸形 URL→静默降级文字头像(比裂图净改善、不崩),但不自动恢复旧头像、无重传提示。本次热修范围外,部署时知悉;若要恢复需另做数据处理或引导重传。
- 现场:测试留了 coach-postgres 容器(部署前本就在跑)+ api(:3002)/web(:3001)dev 进程,后续任务的 Playwright 可复用(注意端口占用,t4-s0-d1 脚本会处理冲突)。

**🔄 T4-S0+D1:closeout 完成,修复第 1 轮进行中(2026-07-03 晚)**
- 历程:opus 实现三撞配额→半成品抢救提交 0722155→派工体系9处bug升级(f1af2e9)→closeout workflow(缺口审计R1-R9→opus补完→双验证,总耗791k token/4代理)。
- 缺口审计:R1-R6/R9 全 DONE(后端状态机/migration/409顺序/chat解耦/防僵尸/D1 skipLimiter 全在半成品里),R7 前端恢复 MISSING、R8 测试 PARTIAL——补完代理已全部补齐(前端 hook+卡片+409转视图、7用例 S0 e2e+skipLimiter 单测+chat断开落库),另抓修一处 R1 回归(UPDATE 不回填 mode 默认值,buildJdMatchEntity 显式 mode)。补完后 e2e 全量 1123/0 失败。
- 验证:review PASS(1 minor);gates 6/8——门6 web build FAIL 判环境非代码(worktree .git 指针+pnpm 软链触发 Next16 Turbopack 误判 root;主仓库同代码构建绿、webpack 构建绿),门8③ **抓到真缺陷(blocking)**:同用户 74-99ms 并发双发诊断,409 防重复失效、双建行双扣费(2/2 复现)。根因=findRunningConflict 裸 SELECT 与 insertRunningRow(被推迟到后台任务)非原子。门8①②(断开恢复/刷新不丢回复)真实浏览器 PASS。
- 处置:修复第 1 轮已派 opus 代理(原子化 check+insert+真并发回归用例),完成后重验→合并。worktree Turbopack 限制记入 02 注意事项。
- **✅ 已完成合并(merge `b4682eb`,dev+main,2026-07-03 深夜)**:fix1 交付=reserveRunningSlot 进程内 per-(user,mode) 串行原子预留(INSERT 提前到同步路径,直调路径零变化保 30+ 既有用例)+ [S0-race] 真并发回归用例(旁路锁反向转红证明有效);fix1 自验四门全绿(危险区 20/20/单测 547/0/e2e 1124/0 含新用例)。合并零冲突;主仓库冒烟 leader 亲跑:单测 547/0 ✅、e2e 1124/0 ✅、web build ✅(31 路由产出,坐实门6为 worktree 环境问题)。合并后对抗审计:**未发现**(sonnet 只读实证四专项:无半合并痕迹/无红线触碰/迁移纯索引/全部签名变更为尾部可选参向后兼容、30+ 直调点天然兼容/ApiConflictError 继承链与两处显式捕获顺序正确)——T4-S0+D1 正式收工。
- **遗留(非阻断)**:①409 原子性依赖生产单 Node 进程前提(进程内锁);未来 API 横向扩多实例需补 Postgres 部分唯一索引兜底(`CREATE UNIQUE INDEX ...(user_id,mode) WHERE status='running'`),代码注释已标注。②review 1条minor:R7 前端恢复路径未做逐钮 Playwright(门8①②已真实浏览器覆盖主路径)。

**✅ T1 导航四模块重组:已完成合并(merge `23f8fc3`,dev+main,2026-07-04,agent team 模式首单)**
- 交付:四模块常驻展开(面试前5/面试中3/面试后2/其他4,薪资雷达已删故面试后仅2项)+删学习路线/行业趋势/跟进消息三独立页(-6764 行)+chat.service 能力地图外科手术清理+badge/dot 迁移保全;follow-up 后端模块完整保留给 T5。
- 质量链:开发代理自验(tsc×2/eslint 0/单测532/0/e2e 1054/0/Playwright 实机 14 项导航+三删路由真 404)→独立审计 PASS(六找茬重点全绿、红线零触碰)→合并树一致性校验为空(合并零引入,以此代替对抗审计,零变数有数学保证)→主仓库冒烟三门全绿(web build 28 页,删除路由零出现)。
- 执行注:agent team 模式(1 开发代理+复用审计代理)运转良好,比 workflow 扇出省约一半新开;开发代理曾把主树留在 feat 分支上,leader 合并前须 `git branch --show-current` 确认在 dev(已入切换动作,后续任务注意)。
- **遗留(非阻断)**:①minor:layout.tsx 注释"15 项"实为 14 项(纯注释失实)。②onboarding-tour.tsx 'aux' 引导步骤(realTarget:'more')锚点随"更多功能"按钮删除而消失——优雅降级为居中卡不崩,但文案"点开「更多功能」就能看到这些辅助工具"失真,归后续小任务(可并入 T4 清理批)。③debrief-upload 深链项(query 参数)永不显示激活态,行为自洽非缺陷,仅记录。

**✅ T6 博查统一搜索:已完成合并(merge `fb79545`,dev+main,2026-07-04,agent team 第二单)**
- 交付:company-research 新模块(bocha.client 两路查询/消歧三层/7 天精确缓存/候选全量/防伪造 id 查库)+mock 破坏性 API 迁移(company_research_id 取代 confirmed_company_info 四文本字段)+前端多候选点选 UI+company-check @Throttle 20/60s+审计校准 M3/m6/m12/m3 全落地+手写迁移 1782600000000。
- 质量链:开发自验全绿→独立审计 PASS(11 找茬重点、4 个 blocking 检查点全有代码证据)但抓 1 major+2 minor→**修复第 1 轮**(缓存候选被拒自动 force 重搜一次闭环设计定稿4后半句;upsert 跨请求唯一冲突双库形态自愈)→delta 复审确认闭环→合并树一致性为空→冒烟三门全绿(单测 564/0、e2e 1057/0、web build 28 页)。
- 测验战果:本任务抓修 3 只真 bug(同批 upsert 竞态 500=开发自抓、缓存拒绝无重搜=审计抓、跨请求 upsert 竞态=审计抓)。
- **遗留(非阻断)**:消歧层②(GLM rankByContext,含 3 单测)生产不可达——checkCompany 未传 jd_text,恒走层③。脚本明文豁免("缺上下文进层③是合理降级");T5 接入投递详情或后续把 jd_text 接进 company-check 时激活,勿删。

**✅ T5 投递追踪二级页:已完成合并(merge `e2b326f`,dev+main,2026-07-04,agent team 第三单,本轮最大体量 +2637/-191)**
- 交付:数据打通(mock_sessions/cover_letters 补真外键+归属校验、interviews GET 移除 relations 堵隐私泄露、applications 加 resume_version_id/company_research_id 软引用)+related/link/link-suggestions 三端点(ApplicationLinksService)+详情页 842 行(AI 建议横幅仅显式采纳/五聚合区块/跟进面板真实文本/删除入口)+审计校准六项全落地(含 tracker-stages.ts 六处标签共享化)。
- 质量链:开发自验(单测 571/0、e2e 1090/0 净增 33、Playwright 门6 全流程两次过)→独立审计 PASS(迁移安全五点全过、六 blocking 核点全绿,2 minor 均裁合理:resume_id 联动写回/ wishlist 配色统一)→合并树一致性空→冒烟三门绿(web build 含 /applications/[id] 路由)。
- 测验战果:真机迁移抓修 1 只真 bug(mock_sessions/cover_letters.application_id 历史建表为 varchar 非 uuid,FK 建不上;防御性 SET NULL 清洗+USING 转型,零 DELETE 零回填)。累计 7 只真 bug 合并前拦截。
- **⚠️ 部署注意**:迁移 1782700000000 含列类型转换(varchar→uuid)与存量脏值置 NULL——上线执行前必须先备份数据库(全局红线本就要求,此处特别提醒)。

**✅ T2 月刊校招情报:已完成合并(merge `6ffc579`,dev+main,2026-07-04,agent team 第四单,+3042/-66)**
- 交付:三类源适配器(sheet_file CSV/XLSX、sheet_link 朴素抓取+降级、wechat_dump 按调研报告 json schema 落地对接面)+recruit_events(迁移 1782800000000)+GLM 解析(防编造 null 纪律,15 行/批)+去重(归一化哈希+confidence 权威合并+apply_url 补空)+周一 4:00 cron+digest 汇总真接线(M9 终结"建成即弃")+newspaper 校招情报板块(含"日期待确认"分区)+/digest 管理员门控与三类源 UI(M8)+投稿删除按钮(m23)+M7 摘 C 端计费+sources/runs 补 AdminGuard(T4 缺口最小补丁,注释注明)。
- 质量链:开发自验(单测 606/0、e2e 1106/0 净增 16、Playwright 硬门 4/4 真 GLM 真 Postgres)→独立审计 PASS(四 blocking 核点全过、自报 7 条实现判断逐条裁定合理/属实)→2 minor 当场闭环(dedup_key 实体唯一索引对齐双端、去重函数更名 normalizeCompanyForDedup)→合并树一致性空→冒烟三门绿(e2e 1106/0、web build 28 页)。
- 决策记录:wechat_dump 实现口径=调研报告推荐的"人工把关+GLM5.1"JSON schema({account_name,batch_note,articles[]});将来用户选定自动化工具只需在产物层适配该 schema,管线零改动。00 遗留项第 1 条已同步该口径。

## 体验反馈批-1(用户 2026-07-04 实测拍板,新增执行队列)

用户在本地实机浏览已合并成果后下达四项(记录即决策,不重开讨论):
1. **[bug,已派修]** mock 多候选列表返回后挤满全屏无法滚动,只能先选——列表容器限高+内部滚动+"都不是"按钮常驻可见。分支 feat/ux-mock-scroll。
2. **[改版]** 导航调整:「今天」与「月刊·面经」移到侧栏最上方(四模块之上);**求职总览(/overview)并入 /today 后删除独立页**(此前口头要求,T1 未含,本批补做);**追加(2026-07-04 用户反馈):/digest 供给页在 T1 重组后失去全部导航入口,补一个 admin-only 的"内容供给"入口(普通用户不可见)**。
3. **[新功能]** 公司背调二级页:模拟面试表单点公司名 → 二级卡片页,字段=公司名(预填)+城市(下拉选择)+行业(下拉常用类目)+是否上市(单选,"不确定"置顶默认、非必填)+规模/官网(选填);确认后发起**背调任务**——用结构化线索重搜(企查查/天眼查域名强召回已有)并**激活 T6 遗留的消歧层②**(城市/行业作为上下文给 GLM 排序);结果回填模拟面试流程(仍走 company_research id 防伪造链)。设计细案待 leader 出简报后派工。
4. **[答疑,已答]** 月刊内容源操作方式(三类源+/digest 上传)已向用户说明。

执行顺序:1(修 bug)→2(导航/合并页)→3(背调页,涉后端)。主树串行,一次一个分支。T3-Stage0 在独立 worktree 不受影响。

**✅ 公司背调二级页 + 验收基建:已完成合并(merge `623a630` + `8184c35`,dev+main,2026-07-08)**
- 二级页:/mock/company-detail=消歧上下文补充页(mock 创建流跳入→填城市/行业→company-check 激活消歧层② rankByContext→候选经 sessionStorage bridge 回填;防伪造链路核验完整:前端只传 company_research_id,后端按 id 查库拼 prompt)。收口代理修 ESLint 两处+删死表单字段(是否上市/规模/官网,收而不用)+补 Playwright 5 用例;六门自验全绿(单测610/0、e2e 1110/0、Playwright 14/14 真实博查)。
- 验收基建:`scripts/run-gates.mjs`(六门确定性一键跑门,stats 行缺失即 FAIL 防静默假绿)+ `.claude/skills/verify-coach-change`(验收单一真相源)。合并后冒烟即用它跑,六门全绿(head=623a630)。
- 合并前对抗审计:两分支 PASS;唯一 minor 遗留:**city/industry 后端缺枚举白名单校验**(仅 @MaxLength(50),绕前端可注入 50 字内文本进重排 prompt;有结构化输出+用户确认双兜底,非可利用漏洞)→ 并入下一单搜索调优一起修。
- 下一单(搜索调优,待派):基准集 30-50 家(简称/同名/生僻)先量化 hit@1/hit@5→count 15/级联/城市行业拼进搜索词/域名先验/高频别名表;**把删掉的"是否上市/规模"以"接进 rankByContext 证据"方式请回**(不再做死表单);顺带补白名单校验。
- 现场:本地 coach-postgres 重建+迁移到最新(CreateRecruitEvents);api:3002/web:3001 已用 623a630 产物重启(脱离会话进程);verify-infra worktree 目录被文件锁卡住未删(分支 feat/verify-infra 随之保留),归磁盘清理批。

**🚀 生产部署 + 数据融合(2026-07-08,Azure 主服务器,version=2db62e9)**
- ASR 聚句修复+三视图 merge `2db62e9`(审计 PASS,4 minor 记遗留:退化形状冗余写/GET内写库无降级/理论并发窗口/拉丁拼接空格;第②条列下批小修);run-gates 冒烟六门全绿(单测626/0、e2e 1112/0)后推送 dev+main。
- **Azure(4.190.163.228,jaydenpark.fun)部署全程绿**:预部署备份 coach-pg-predeploy-20260708-064727.dump(328K)→回滚tag(coach-api/web:rollback-pre2db62e9)→本地构建镜像(Dockerfile直构,176MB tar)→scp→load→5迁移(1782500000000~1782900000000)→up -d;postgres 指纹 PRE==POST(0cd4071b…/2026-06-28T04:13:08)零触碰;health version=2db62e9 db=ok;dev-login 404(生产拦截铁律)。
- **阿里云→Azure 数据融合**:用户 32***@qq.com(users 行,验证码登录无密码)+interviews 77c147d8+转写任务 4a8e0091(segments 523272B 完整)单事务 COPY,零冲突;PII 中转文件即插即清。该用户在 jaydenpark.fun 登录打开复盘确认页即触发读取层再聚合自愈,无需重传。**阿里云 139.224.248.44 自此转只读遗留,不再部署**。
- 本轮 = "除 T3 全部可部署"目标达成并已上线;剩余:T3(量产等 go/no-go)、搜索调优单(基准集+上市/规模接进重排+白名单校验)、ASR minor 小修批、磁盘清理批(含 verify-infra/debrief-minutes worktree)。

**✅ T3 Stage0 骨架焊死 + 注册表 v1 草案(2026-07-08 夜,agent team 全 sonnet)**
- **Stage0 已合并上线 dev**(merge `18b81ea`,dev=main):8 层骨架 schema+axis 10 值+校验器(证据字段深扫拒绝)+确定性检查脚本(dim1/3/6 改造+edges 引用完整性)+5 表 migration(1783000000000,纯加法)+seed 导入器;合规/5 类违规样例各判对。审计 PASS 零 blocking,2 minor 遗留:①枚举列(edges.type/status/axis/tier 等)DB 端无 CHECK 约束=全表一致的架构取舍(完整性归应用层 validator+seed 落库前校验,设计文档明示);②seed 幂等靠 edges/aliases/evidence 先删后插。api 四门全绿(单测 665/0、e2e 1112/0),web 门 N/A(纯后端零前端)。迁移撞车已修:原 1782900000000 与已上生产的 AddInterviewSummary 撞,让位 1783000000000。**本地库 1783000000000 迁移待补**(Docker 掉线,下次预览重启时 migration:run)。
- **注册表 v1 草案完成待用户过目**(§7 第 2 门=用户批准):分支 `feat/t3-registry`(已推远端,未并 dev),`data/occupations/registry-v1.csv` 369 条 + `docs/refactor2/t3-registry-v1-review.md` 评审稿。6 个 L0 板块(通用职能132/产业专业103/工程技术69/公共制度27/创意服务24/AI新兴14),42 个 L1 族;既有 90 职业库 100% 收编零走样;距 700-800 目标 46-53%,诚实标注差距(未拆水凑数)。**5 条开放问题待拍板**:①45 条 L3 行业场景拆分是否认可 ②AI 新兴仅 14 条是否扩容 ③考公考编收敛母条边界 ④产业专业板块是否按行业再细分 L1 ⑤边缘小众职业取舍标准。
- **后续路线(§7 门控,均需用户节点)**:注册表 v1 批准 → 回归 5 条(老试点稿重灌新骨架,盲测 5/5)→ 经济验证批 30-50 条(全流水线真跑,成本≤5万/条+盲测≥90%+闸效统计,**go/no-go 用户拍板**)→ 量产 150→300→700-800。**§8 Agent B(前端+API)批 4 后启动**。量产内容生产未经 go/no-go 不自启(用户红线)。

**✅ T3 骨架加第 9 层发展层 + 注册表 v2.1(2026-07-09,用户裁决落地)**
- **发展层已上 dev**(merge 3a958b2 + 文档 d43a884,dev=main):骨架 8→9 层,新增发展层(promotion_path 晋升阶梯/ceiling 天花板/lateral_moves 横向出口),插门槛与趋势之间;用户拍板"唯一一次动焊死骨架后重新冻结",趁 0 词条量产前补=零重刷。校验器强制每篇词条 9 层齐(含发展层),回归/量产不可能漏填。leader 逐行过目+run-gates api 四门绿(单测 667/0)。
- **✅ 注册表 v2.1 终版**(feat/t3-registry,未合并未推远端,本地 git 安全):主表 369 公开(planned)/受限 23(考公 16/国企 7,parked,access_category 打好)/edges 768主+56受限/aliases 138主+1受限/L3 独立 16/grand total 392。按用户裁决全部落地:考公国企隔离三件套(永不进 seed/绝不上服务器/未来特殊权限+AI 拒答/开关式索引 access_category 控制)+AI 扩容 4(FDE/具身智能/GPU集群/AI评测)+MCN 转正+TOP12-30 补判+Q2 弱 L3 收敛。
- **✅ 隔离补齐(用户圈定 4 条政法编制)**:法院执行员/法官助理/检察官助理/监狱警察(省考)移 restricted 打考公 tag;公证员+律师 2 条按用户边界留主表公开。
- **✅ Q2 弱 L3 整批裁决(leader 拍板经执行代理独立质检全部认可无硬异议)**:保留 16 条(根本分野/实操门槛多层差异)/收回母条 20 条(仅行业客户差异,8 母条全承接,行业登记母条差异层必覆盖清单=信息不丢);连带删 edges 61+悬空别名 1,零悬空 768边/369slug pass+机械核对全绿。
- **✅ 注册表 v2.1 已定稿合并 dev(92ab081,2026-07-09 用户 ultracode「现有的完成然后开始T3」)**:多镜头终验 PASS 零 blocking(政法隔离/L3收回20保留16/机械/零编造独立复跑全 RESOLVED),定稿修复评审稿断链+edges RFC4180 规范化。主表369 planned坑位/受限23(考公16+国企7,access_category tag,永不上服务器+开关式索引+AI拒答)/edges768/aliases138。
- **🔄 阶段B:门A 修复批执行中(2026-07-10 用户令恢复;任务卡=t3-gate-a-taskcards-2026-07-10.md;协作规则=sonnet 执行+独立 sonnet 验收,leader 只分发记账)**
  门A 进度账(leader 实时维护,**本表为门A唯一进度真相**;工作法=sonnet开发+独立sonnet验收双盲,leader只分发判定记账):
  | 卡 | 开发 | 独立验收 | 位置/备注 |
  |---|---|---|---|
  | TC-01 null语义+Ajv+三分支 | ✅(4提交至ff299f0,37/37) | ✅ PASS(六维全过) | feat/t3-gate-a |
  | TC-06 dim1移出硬闸 | ✅(3提交至1250074) | ✅ PASS(14项,dim1本体零diff) | feat/t3-gate-a(TC-01之上) |
  | TC-03 registry importer | ✅(2提交,10/10+全量695零失败) | ✅ PASS(16项,369/353独立复核) | feat/t3-gate-a-tc03→已并回gate-a |
  | TC-07 restricted隔离 | ✅(4提交含tar双臂加固,镜像双扫描三连PASS) | ✅ PASS(含反向对抗测试)→**已合并dev f5691c6,部署雷拆除** | 已收口 |
  | TC-02 覆盖闸(最重) | ✅(5提交:3+修复轮红绿2,28/28+四spec 75/75) | ✅ **两轮闭环PASS关闭**(轮1击穿domain_specifics零证据validated→修复轮金标准翻转+红灯detached实证+7对抗词探针;minor遗留=A1宽词fail-closed过触发,量产按误拦率精化) | tc02→已并回gate-a(5890364) |
  | TC-04 GateA迁移 | ✅(c7a491d,红先绿+PG三连+fail-closed实证) | ✅ PASS(6/6,独立临时容器复证三连+插数据revert正确拒绝且schema零损;coach-postgres全程未碰) | 已关闭 |
  | TC-05 导入器收口 | ✅(4975e14红/1feb16d绿,9/9;全仓tsc零错债清;四零写入+claim_id往返有断言;全仓738零失败) | (并入TC-08总验收面) | 已完成 |
  | TC-08 总验收 | ✅ **整卡 PASS**(首轮6/7绿→TC-07修复轮2[dockerignore裸目录模式8ea5df6]→delta复验:独立重建镜像+手工19 blob零命中/双门clean/主表零误伤)。附注:①e2e并行偶发coach-handoffs超时抖动=环境性(串行/隔离均绿)②gate fixture实测12 invalid+3 valid | ✅ | 已关闭 |
  **✅✅ 门A 全量收官(2026-07-10,merge `fb76ef7`,dev=main)**:八卡全关,每卡 sonnet 开发+独立 sonnet 验收双盲;TC-02 两轮闭环(金标准击穿翻转);TC-08 七段矩阵。里程碑:**零证据词条无法 validated/无源硬数据可写 null/注册表冻结不可绕/敏感数据物理出镜像——防编造硬闸从设计变为代码强制**。
  **✅ 回归5条门3达成 5/5(2026-07-16 终判,afcb4de)**:医师/律师原三轮稳过;park三条经 playbook 新标准补源重跑后量化验收一轮全 PASS(定级留证:PM稳定型5/10、HRBP初步型4/10、智农~~未兴起型0/10~~【定级范畴错误,2026-07-16已修,见下条】;claim↔摘录抽查全真实;百度0岗位反向验证证实零注水)。**新制度首战数据:一轮执行+一轮验收=定案(旧模式=三轮盲测两轮修复)**。清单外4条记录留档(hrbp上下游未入文/源池漏记1URL/JS渲染源验证分级/URL标注精度),进 playbook 修订积累不阻断。**待用户:经济验证批 go/no-go(材料齐:流程全链路两次实战/标准全量化/成本结构清楚)+playbook 定稿确认**。
**⚠️→✅ 智农定级范畴错误已修(2026-07-16,新流水线首战 company codex产出→sol初审→sonnet二审→leader终判)**:用户指出「智农未兴起型0/10」是范畴错误——§8.1拿互联网TOP10当跨L0板块统一分母,而注册表早标智农=L0产业专业·L1农业(data/occupations/registry-v1.csv),百度不做农业量出的0是假信号。修:①§8.1定级分母改为按注册表L0/L1_family/L2_scene/axis条件化(TOP10仅『通用职能』及确属互联网业务的职业样本,不动焊死schema)②智农重判**国内初步规模型**(农业口径3家在招JD坐实:中科院自动化所/中科合肥智慧农业谷/中国水稻研究所,URL+逐字摘录+日期三重核验;平台14<20不兜底,产业专业支线≥3独立成立)。**二审重大发现(旧账,防编造红线)**:原智农source-pool一条福建农林大学摘录=**虚假引用**(该URL真实内容是「中化现代农业MAP经作华南2021校招公告」,原摘录文字页面全文中根本不存在),它过了先前5/5验收+codex-56初审,只在sonnet逐URL核验时现形→**验收标准缺口:须加『每条摘录回原URL核验存在性』;其余4条职业source-pool同样未做此核验,建议经济批前批量补验**。改动:playbook§8.1+source-pool智农(2文件),CLI 5/5过闸errors=0。**待用户:①经济批go/no-go+playbook定稿(§8.1已改L0条件化)②是否批量补验其余4条摘录URL存在性**。
**◐ 4条源池补验完成(2026-07-16,新流水线复用:company codex批验→sol初审→sonnet二审→leader终判)**:对其余4职业补『摘录回原URL核验存在性』。①clinical/lawyer**无source-pool文件**,其evidence各108/125条带URL,抽样16条(卫健委/司法局/律协A1为主)**缺陷率0%**,干净不全量;②HRBP/PM各1条字节摘录与当前URL不符——**定性=源失效/岗位更新,非造假**(Sonnet反查脉脉2021-09-14/牛客确认HRBP实习生JD当年真实,postId后被回收换正式岗;PM同族岗位换版本),source-pool措辞已从『虚假引用』改准(hrbp.md:24/product-manager.md:60-63,已commit)。③**门3悬案(待用户)**:2条失效摘录波及13条directly_supported claim,其中**11条字节独证**(9条HRBP全部+PM的ceiling.professional_ic/coordinates.downstream[2]),撤销即字段零覆盖、词条跌出validated,必须补源或降null=实打实门3内容手术;PM eval_metrics[2](高危)删字节后牛企单独触发SOURCE_NOT_INDEPENDENT需补1独立源;PM lateral_moves[3]美团独立够用可无痛删。**门A校验证据集内部一致性、不查URL存活,故HRBP/PM当前仍validated=true(CLI实测),门3是独立动作**。④**标准固化建议**:验收加『摘录回原URL核验』+JD类证据须在捕获时记抓取日期+存档快照(Wayback)扛源老化,否则量产JD证据都会随时间烂。**待用户拍板**:HRBP/PM 11条失效claim处置=补源(推荐:facts真实、大厂JD易得、保覆盖)/降null(最省、词条变薄)/接受源老化补快照;及两条标准是否固化。
**⛔ HRBP/PM 补源 v1 被打回并回滚(2026-07-16)**:按用户"补源"决定,company codex 对 13 条字节失效 claim 改挂活源——leader+codex-56 初审**双否**:①用 r.jina.ai 实时代理伪充 §8.5 存档(非冻结快照,还现 r.jina.ai/http://r.jina.ai 嵌套破结构)②把三茅"JD 写作模板"页(zhaopin.hrloo.com/hr/tools/jd/382)批量挂到 **10 个不同 HRBP 字段**(本轮4+旧存6)=违禁"一段摘录批量挂无关叶子"③猎聘/michaelpage 用列表/聚合页当逐字证据④逐条语义核查 **7 条根本不蕴含 claim_text(应 null)**⑤零降级不可信。已 `git checkout` 回滚 evidence 到 a0ff547(13 claim 仍挂字节·源失效·validated=true 的已知态)。**更深旧账**:三茅模板挂 6 字段/字节 JD 挂 9 字段=HRBP evidence **预存过度拉伸/批量挂载**,连 5/5 验收也没抓到——这是 evidence 层"真支撑"质量问题,非仅 URL 失效。**待用户拍板**:①HRBP/PM 诚实修法(严格重做逐字段测真源→改挂真快照或降 null / 直接采信初审降 null);②是否顺带审其余 3 条 evidence 真支撑;③此发现影响经济批(量产验收需加"真支撑审"gate,非仅 URL 存在核验)。
**◐ 回归5条收官(2026-07-16,b662167;新体制首战:GPT干活/Sonnet审/Fable只leader)**:门3判定=**未达5/5(2/5盲测过),按判据3报用户拍板**。技术面全绿:骨架+证据5/5过加固闸、源合规(裁决7:社媒禁入)、dim3零命中、护栏零编造。过程战果:①R5跨模型审查抓出GPT首轮R3全占位空转(258条假证据过旧闸)→②覆盖闸三盲区加固上dev(ab877ea,占位证据物理拒收)→③R3重做524条真证据(抽样自证断言↔摘录对应)。盲测:医师/律师三轮稳过;pm/hrbp/智农卡Q3"零空话"(三轮点名句子零重叠=渐近线标准)+软门槛职业缺薪资/工时硬数据(骨架里全null=防编造红线所致,源池深度问题归经济批S1)。**待用户拍板**:①盲测Q3标准校准(建议:空话密度阈值或删句重测制)②3条park处置(带park进经济批/补源后重跑/维持park)③经济批go/no-go:5 份 p2lib 老稿重灌 9 层新骨架,slug 映射已全齐(ai-product-manager→product-manager/clinical-physician→clinical-physician[主表公共制度·医疗临床]/hrbp→hrbp/lawyer→lawyer-litigation/smart-agriculture-engineer→smart-agriculture-technician);产物只落 git 不上生产;验收=9层齐+coverage gate 真跑+盲测三问5/5。之后:**经济验证批30-50 go/no-go 用户闸门**→首波量产150-250(700-800仅容量上限)。

## 全局红线(超出即停,找用户)

- 线上有真实用户。任何 migration 前先备份(运维手册在 `_local\coach-deploy\运维手册.md`——2026-07-04 由 E:\coach-deploy 归集,gitignored 坐标密钥仍不进 git);postgres 容器/数据卷永不触碰重建。
- 破坏性操作(删表、覆盖用户数据、下线功能页之外的删除)必须先向用户确认。
- 密钥永不入库、不进文档。
- 生产 `DEV_LOGIN=0` 无例外。
- 本轮范围就是 T1~T6,不顺手加需求、不顺手重构范围外代码。社区功能明确延后,不许提前动。

## 待用户输入的遗留项(执行到对应节点时索要,不阻塞其他工作)

1. T2:公众号工具——用户已知候选 `https://github.com/cooderl/wewe-rss` 但疑不合适;**2026-07-03 已派 Sonnet 调研**(wewe-rss+替代品对比,产出 `T2-wechat-source-research-2026-07-03.md`,结论:wewe-rss 已归档停止维护不建议采用,推荐人工把关+GLM5.1);**2026-07-04 已按该结论实现** wechat_dump 适配器(管理页上传通用 json,结构见调研报告§4.2),自动化抓取工具仍待用户提供才对齐格式。
2. T4-D8:阿里云老站下线,需用户点头。
3. T3:注册表 v1 与经济验证批 go/no-go,两处用户过目节点。
4. ~~evidence_used 拍板(audit M6)~~ **已裁决(用户 2026-07-03 授权"看着办",leader 裁:删)**:4 个 AI 功能的 evidence_used 字段从 schema/prompt 删除——前端从未渲染、用户从未见过,却在每次调用烧输出 token;"诚实可溯源"卖点未来由 T3 维基的证据侧表承载(那里有完整设计),不靠这个死字段。归入 T4 第三段清理批执行。
5. ~~薪资记录删除(audit m20)~~ **已了结**:用户 2026-07-02 拍板删整个薪资雷达模块,已执行并合并 dev(见「执行进展」);表处置见执行进展 salary 条。
6. 对话删除(audit m22):后端有 DELETE /conversations/:id 端点(删除一条聊天会话),前端任何地方都没有删除按钮——用户想删自己的对话做不到,端点是死的。**leader 建议:补前端删除入口**(对话列表项加删除,轻量、有隐私/整理价值),归 T4 清理批;用户如反对(不想让用户删对话)改为删端点,一句话即可。

## 用户已拍板的关键决策(执行期不得重开讨论)

- 导航:整栏按「面试前/面试中/面试后/其他」四模块重组;问 Coach 保持顶部 CTA。
- 删页:学习路线、行业趋势删除;跟进消息独立页删除、能力并入投递详情;Offer 比对保留待升级。
- 校招情报:周更;源=购买的在线表格(腾讯文档/飞书链接+Excel/CSV 文件)+公众号现成爬取工具产物,管理员页接入;解析用平台自有 GLM5.1。
- 防护:防批量注册薅额度+防接口滥用,基础预防级,不过度建设。
- 职业维基:维基+检索先行,测评/推荐下轮;执行底座=质量优先混合(判断力环节 Sonnet,机械环节 GLM/脚本);单条预算 5 万 token 目标、8 万熔断,质量压过预算;反优绩主义四修正(见 T3 文档)生效。
- 2026-07-02 追加:流式任务状态保持(离开页面回来进度不丢/防重复/防僵尸)并入 T4 作 S0 最高优先;**下个编码 session 从 T4 开工**;验收按标准;为其余五任务的开发与校验流保留空间;全程以稳定性/可靠性/可用性为最高目标,反优绩主义。
