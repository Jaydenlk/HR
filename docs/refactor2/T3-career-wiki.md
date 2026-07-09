# T3 · 职业维基体系化(设计修订定稿 + 经济量产执行方案)

> 上位依据:`T3-总体设计-原稿.md`(用户方定稿,已抄录入库)。本文件 = 原稿 + 10 项 bug 裁决 + 反优绩主义修正 + 完整执行方案(存储/检索/流水线/派工)。冲突时以本文件为准。
> 试点资产:5 份词条稿在 `E:\Agent program\coach-wt\p2lib\docs\p2-libraryB-samples\<slug>\`;老规格 `docs/p2-libraryB-phase1-spec.md`;Stage0/1 脚手架在 p2lib worktree 分支 `feat/p2-libB-phase1`(standard-v0.1 + occupation.types.ts + checks/dim1,3,6.mjs,可改造复用)。**老流水线作废,不再续跑老 workflow。**

## 0. 范围(用户拍板)
本轮 = **维基 + 检索先行**:词条量产体系 + 检索/消歧/词条页,前端能查能读。测评问卷、推荐匹配下一轮。规模 700–800 顶天,首期按分批节奏走(§7)。

## 1. 设计裁决(对原稿 10 个 bug 的定稿,执行期不重开)
1. **对抗审**:高危字段(具体数字/证书规范/跨性质差异)保留**一轮**对抗审;其余一次合并语义审。
2. **拆条判据**:默认一条职业一条词条,行业变体写进差异层;仅当变体在 ≥4/8 骨架层有实质差异**且**有独立 JD 池时才拆 L3 独立条。拆条只在注册表阶段决定,量产中冻结。
3. **散文护栏**:散文渲染后跑脚本——抽取散文全部数字/专名,对照主干白名单,查无此项即 fail 重渲。渲染环节结构上无法引入新事实,故可下放 GLM。
4. **注册表先行**:量产前先建全库 slug 注册表(700–800 坑位:slug/名称/L0-L3/状态),edges(相邻/上下游)为一等公民数据,脚本查引用完整性;**生产按 L1 职业族聚簇分批**,边界层跨条互验。
5. **保鲜**:断言与词条挂 `last_verified`;趋势层/校招信号标记易腐;每年校招季前只重验高危+易腐字段(增量刷新,便宜)。
6. **检索**:别名表精确命中 → PG trigram/全文兜底 → 同名多义出消歧页。**不上向量库**(800 条规模不需要,省运维)。
7. **源池**:职业族共享源池替代每条自凑;字段按风险配源等级(硬数据只认 A1 官方/A2 JD 汇聚,A3 行业文章只作佐证)。**无存量 JD 资产(春招已收尾),源池全靠抓取自建。**
8. **B 层规则**:蕴含失败默认删;仅当能写明"推自哪条已验证事实+什么公开常识"才准降 B;B 层断言占比设上限(初值 30%,试点批校准)。
9. **预算**:**单条目标 ≤5 万 token,8 万熔断**(用户定)。质量压过预算:8 万内做不到合格 → park 进人工队列,fail loud,不出次品也不无声硬烧。
10. **存储/服务**:见 §3/§4,补齐原稿空白。

## 1b. 验收北极星 v2(用户 2026-07-09 增补,五维,与 §2 盲测三问并行生效)
最终产出必须同时达到:**好用 / 能用 / 能信 / 信息足够 / 设计优秀(含信息架构,不只前端美学)**。落地判据:
- 能用:搜索→消歧→词条→相邻跳转 Playwright 全流程零断链;seed 导入零脏数据;空态诚实。
- 好用:检索三层兜底真实生效;词条页渐进式披露(3 秒懂定位,展开见深度);任何职业 ≤2 步可达;**Agent B 动工前 IA 设计稿先过评审**(frontend-logic-design 方法论:MECE/渐进披露/层级)。
- 能信:防编造硬闸零豁免;关键断言可展开来源+核验时间明示;注册表零编造零错分类。
- 信息足够:注册表覆盖对齐真实校招市场结构(公共制度板块占比对齐真实报考热度;整族缺口清零);8 层字段完整度脚本检查;edges 保证"读一条见相邻"。
- 设计优秀:IA 评审 + S9 读者盲测三问双门;板块编排先于视觉。

## 2. 反优绩主义四修正(用户强调:形式不许大于实用)
1. **验收北极星 = 读者盲测**,不是流程通过率。盲测三问:读完知道这职业是干嘛的吗?知道自己该不该考虑它吗?有没有一句空话?不过即打回,流程分再高无效。
2. **硬闸只有一道:防编造**(蕴含 + 无源硬数据 null)。其余检查全部降级为修补信号,不设"过 N 道门"仪式。
3. **固定数字配额废除**(N≥8 之类)。标准 = 每条断言有足够的源撑它自己,强度按字段风险走。
4. **每道闸在经济验证批自证价值**:统计各闸抓到的真问题数;抓不到真错的闸,量产时砍掉。

## 3. 骨架 schema(焊死为常量,Stage 0 的交付物)
- **8 层固定骨架**(所有职业一致):定位 / 坐标 / 边界(≥3 相邻对比) / 实操 / 入行 / 差异 / 门槛 / 趋势——字段明细以原稿第一、二部分为准,Stage 0 落成 TS 类型+JSON Schema。
- **axis 枚举草案**(Stage 0 定稿,封死后量产不改):`product_lifecycle / project_delivery / accreditation_cycle / crop_cycle / case_cycle / patient_flow / fiscal_cycle / academic_cycle / campaign_cycle / ops_routine`。
- **domain_specifics**:封顶 5 条/词条,超出回落固定骨架。
- **彻底移出正文**:source_ref/A1A2A3/蕴含日志/自查表/维度分数/inferred 前缀——全部进证据侧表。

## 4. 数据模型(手写 migration;serving 在 Postgres,生产产物在 git)
| 表 | 关键字段 |
|----|----------|
| `occupation_slugs` | slug PK / name / l0 / l1_family / l2_scene / l3_flag / status(planned→in_production→published→parked) |
| `occupation_entries` | slug FK / skeleton(jsonb) / prose(text) / axis / status(draft/validated/published/needs_refresh) / cost_tokens / last_verified |
| `occupation_edges` | from_slug / to_slug / type(adjacent/upstream/downstream) / note;脚本保证零悬空引用 |
| `occupation_evidence` | entry_slug / field_path / claim / source_excerpt / source_url / tier(A1/A2/A3) / verdict / last_verified |
| `occupation_aliases` | alias / slug / weight;唯一索引(alias,slug) |

生产产物同时落 git:`content/occupations/<slug>.json`(主干+散文)、`content/evidence/<slug>.json`(证据侧表)——git 是生产/版本库,DB 是服务库,seed 脚本单向导入,**杜绝试点的 MD/JSON 双写失同步**(单一事实源=json,散文也在里面)。

## 5. 检索 / 消歧 / 前端 / API
- 检索顺序:别名精确命中(归一化)→ pg_trgm 相似 + 全文(name/aliases/定位层)→ 结果为同名多 L3 时出**消歧页**(列出各行业变体一句话定位)。
- 前端新路由 `/occupations`(与现有 /career 职业地图是两回事,不合并):列表页(L0 板块浏览 + 搜索框)、词条页(8 层散文 + 相邻职业跳转(edges)+ 关键断言可展开"来源说明" + 明示核验时间)、消歧页。上线时把「职业维基」加进导航「其他」组(T1 预留的动作)。
- API:`GET /occupations/search?q=`、`GET /occupations/:slug`、`GET /occupations/:slug/related`(edges)、`GET /occupations/:slug/evidence?field=`(按需展开)。推荐系统消费的结构化字段查询接口本轮只留 schema 不实现(下轮测评/推荐一起上)。

## 6. 生产流水线(每职业族一批,dynamic workflow)
**模型分工(质量优先混合,用户拍板)**:判断力环节(生成/语义审/对抗审/蕴含)= Sonnet;机械环节(散文渲染/源摘录格式化/别名扩展)= GLM(经脚本调平台 API);确定性检查 = 脚本(免费)。**GLM 校准实验前置**:用 5 条试点稿的蕴含判断做 GLM-vs-Sonnet 对答案,一致率 ≥95% 的判断子类才允许下放,否则蕴含留 Sonnet。

| 阶段 | 执行者 | 说明 |
|------|--------|------|
| S1 族源池 | Sonnet ×1/族 | 抓校招聚合站+公司校招官网+O*NET 映射入池(带抓取日期/摘录);防挂死铁律写入 prompt |
| S2 主干生成 | Sonnet ×1/条 | 只产主干 jsonb:断言挂 source_ref,B 层写推理链,无源硬数据 null;不产散文不产自查 |
| S3 蕴含分诊 | Sonnet(校准达标子类可 GLM) | (断言,源摘录) 配对判断,批量打包;失败默认删,够格才降 B |
| S4 脚本检查 | 脚本(免费) | 字段完整度/套话黑名单/数字白名单/edges 引用完整性/B 层占比 |
| S5 合并语义审 | Sonnet ×1/条 | 一次过,发现必须点名到字段 |
| S6 对抗审 | Sonnet ×1/条 | 只审高危字段,一轮 |
| S7 定点补丁 | Sonnet | 只补被点名字段,**封顶 2 轮,永不整条重建**;仍不合格→park |
| S8 散文渲染 | GLM | 渲染+散文护栏脚本,fail 重渲(重渲染成本≈0) |
| S9 读者盲测 | Sonnet | 按批抽样(经济验证批全量,量产批 20%),三问北极星 |
| S10 批收口 | Opus | 每批 10% 抽查 + 族内边界层互验一致性;不达标整批打回 |

**workflow 运维铁律**(写进脚本):agent 因限流/网络失败返回 null 不计轮次配额;WebFetch 防挂死;resumeFromRunId 续跑;预算执行=阶段调用次数结构性封顶 + orchestrator 按 per-agent token 报告累计,单条超 8 万即 park。

## 7. 分批节奏与验收门(每道门是真门,不过不进下一步)
1. **Stage 0 焊 schema**(编码任务):TS 类型+JSON Schema+校验器+确定性检查脚本(改造 p2lib 的 checks/*.mjs)+5 张表 migration+seed 导入器 → verify: schema 校验器对合规/违规样例各判对;脚本套件跑通。
2. **注册表 v1**(workflow):700–800 slug 坑位+L0-L3+职业族聚簇+edges 草案+别名初表 → verify: 引用完整性脚本零悬空;**用户过目批准**。
3. **回归 5 条**:老试点稿重灌新骨架+重渲染 → verify: 文体统一、正文零审计噪音、axis 语义一致;读者盲测 5/5 过三问。
4. **经济验证批 30–50 条**(1–2 个职业族):全流水线真跑 → verify: 平均成本 ≤5 万/条、盲测通过率 ≥90%、每道闸真错统计出炉(决定砍哪道闸)、**go/no-go 报用户拍板**。
5. **量产 150 → 300 → 700–800**:每批 S10 收口 + 成本/盲测双指标周报;任一指标劣化 >20% 即停批排查。
6. **前端/检索**(与批 4-5 并行,编码任务):§4 表+§5 页面与 API → verify: Playwright 搜索→消歧→词条→相邻跳转全流程;词条页展示核验时间与来源说明。

## 8. 派工方案(编码部分;内容量产走 workflow 不占代码通道)

**编排:编码部分同样打包 dynamic workflow**(A 实现 → C 测试与 D 审计并行扇出);量产 workflow 用 pipeline 让各词条独立流转 S2-S9,只在 S10 批收口设栅栏,不搞逐阶段全批同步。
**Agent A(implementer,Sonnet,worktree)** — Stage 0 全部(schema/校验器/脚本/migration/seed 导入器)。prompt 核心:以本文件 §3§4 + 原稿为准;改造复用 p2lib 分支脚手架;交付含合规/违规测试样例。
**Agent B(implementer,Sonnet,worktree,批4后启动)** — §5 前端+API。prompt 核心:空状态诚实;evidence 按需加载;导航接入按 T1 预留位。
**Agent C(test-agent,Sonnet)** — Stage 0 校验器/脚本单测;前端 Playwright(含消歧页、同名 L3 场景)。
**Agent D(reviewer,Sonnet,只读)** — 每个编码交付审计;重点:schema 是否被生成方"顺手扩展"(焊死即冻结,改 schema 走用户审批)。
**workflow 脚本**由主代理(协调者)基于试点脚本改写:五段 prompt 模板保留防编造/null 红线/防挂死条款,按 §6 阶段重构;首个族跑通后模板冻结复用。

## step→verify(汇总)
1. Stage 0 → verify: 校验器+脚本套件单测绿;migration 冒烟
2. 注册表 → verify: 零悬空 + 用户批准
3. 回归 5 条 → verify: 盲测 5/5 + 零审计噪音
4. 经济批 → verify: 成本≤5万/条 + 盲测≥90% + 闸效统计 + 用户 go
5. 量产各批 → verify: S10 收口报告 + 双指标不劣化
6. 前端 → verify: Playwright 全流程 + eslint/build

## 红线
- 防编造死线(蕴含+null)不参与任何裁剪;质量压过预算,超 8 万 park 不硬烧。
- schema 焊死后改动 = 用户审批事项。
- 政治/敏感内容杜绝;萝卜坑不入库;考公考编收敛母条。
- 量产期间不重开已裁决的设计争论;新发现的系统性问题记录后报用户,不现场改制度。
