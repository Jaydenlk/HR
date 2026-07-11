# T3 外部评审存档:Codex 5.6 两轮全面评审(2026-07-10)

> 评审方式:Codex 5.6(MCP 通道,read-only 沙箱读仓库实码)两轮对话。第一轮全面评审(适合性/满足需求/迭代空间/自由发挥),第二轮输出可派工执行规格(R1-R8)。
> **重磅指控已由 leader 逐条实机核验坐实**:Dockerfile.api:57 整目录 COPY data(受限三件套会进生产镜像,合并后未构建过新镜像故线上尚未泄露)+ seed-importer.ts 四项(:151 证据可缺不报错 / :215 硬编码 validated / :217 last_verified=导入时 now / :192-206 自动 upsert slug 绕过冻结注册表)。
> 本文档 = T3 迭代的权威输入。执行顺序以 §R1 三级门控表为准。

## 一、总裁决

- 产品方向**对**:9 层骨架、证据侧表、断言级校验、非向量检索优于多数职业百科(O*NET 机器可消费性强但可读性弱;脉脉类体感强但证据纪律弱)。
- 但当前地基 **No-Go:不应启动 150/300/800 量产,更不能上线**,直到门A/B/C 修完对应项。
- 分项:9 层骨架通过(修字段语义,禁再加层)/369 注册表足以 MVP 甚至偏宽/**700-800 否决为交付 KPI,降级为容量上限**(与设计原文"顶天"一致)/S1-S10 允许跑经济批但先修 Blocker/回归 5 条先修门A。

## 二、第一轮核心发现(按 severity)

### BLOCKER
1. **restricted 数据会进生产镜像**:`Dockerfile.api:57` `COPY data /repo/data` 整目录复制,registry/edges/aliases-restricted.csv 全部进镜像——违反"永不上生产"红线。✅已核验。
2. **零证据词条仍可 validated**:`seed-importer.ts:151-166` 证据文件缺失按空证据继续,`:215` 硬编码 status='validated';测试 `occupation-seed-importer.spec.ts:86-93` 甚至把该行为固化为预期。✅已核验。
3. **"无源硬数据→null"无法表达**:occupation.schema.ts 全字段强制非空、validator 拒绝 null——防编造硬闸的核心语义在类型层根本写不出来,模型只能硬填或导入失败。

### CRITICAL
4. B 层没有推理链结构(evidence 只有三态 verdict,无 premises/rule/reviewer)。
5. rejected 证据与 skeleton 无一致性检查(被拒断言可能仍留正文)。
6. 导入时间冒充核验时间(`seed-importer.ts:217` last_verified=now,旧内容重部署即"洗新")。✅已核验。
7. 内容导入器可自动建 slug(`:192-206`),绕过"注册表先行、量产冻结"。✅已核验。

### HIGH(节选)
8. registry CSV importer 不存在(369 坑位无法成为 DB 权威注册表)。
9. l2_scene 空值与 seed-importer/dim6 非空校验冲突(353 母条会被误杀)。
10. JSON Schema 是不执行的文档,已与手写校验器漂移(OrgNature 枚举只在 Schema 里查)。
11. edges 质量与声明不符:768 条中 756 是 adjacent、521(67.8%)note 为占位语、22 个 slug 不足 2 条出边——是"保证有线"不是职业图谱。
12. AI 新兴 L1 混轴(算法/Infra/产品/运营/售前混一族);L0 三轴混用(职能/准入性质/技术时代),建议 L0 单一职能轴+横切标签。
13. 369→700-800 算术不闭合(活跃补量路径只有 O*NET 反查 50-80 条)。
14. dim1 词汇密度指标自证循环(专业词集来自词条自身再数自身),应重做或砍。
15. 坐标层 adjacent/upstream/downstream 与 edges 表双写,必然漂移——edges 应为唯一关系事实源,坐标层渲染时投影。
16. 保鲜机制不够:无来源发布日期/抓取日期/快照/字段级易腐等级/过期策略。
17. 缺 source_documents 表(publisher/published_at/fetched_at/snapshot_hash)。

### S3 蕴含闸十大失效模式(回归 5 条要实测)
复合断言半支持/数字同值异范围(年份地区样本单位)/单公司 JD 泛化为全职业/摘录被生成模型改写截断/URL 无快照源页已变/生成与审核同族模型相关性错误/把"无矛盾"误判"已支持"/B 层用"公开常识"洗白/低质来源互相转载伪装独立交叉/网页内容提示注入。

### 结构性建议(已采纳)
- **700-800 → 容量上限**;首波 150-250 高需求词条,后续零结果搜索驱动。
- 发展层三字段升级:promotion_path 分三分支(专业IC/管理/独立经营),年限须≥2 独立源否则 null;ceiling 拆"常见瓶颈/可能上限"。
- 盲测防放水四层:真实校招生小样本任务测试/跨模型族 LLM 盲测/每批混入已知坏样例测错误召回率/按 L0×证据稀缺度×高危字段分层抽样。三问追加两个可判定问题("列 3 个可核验事实及来源"/"读完仍答不了什么")。
- 上线策略:边产边灰度(经济批仅内部→2-3 高频 L1 beta→按族 feature flag 可回滚→先 noindex→零结果/打开率/相邻跳转率反馈→滚动开放),不等全量。
- D1 最该问的问题:**用户读完词条要做出什么可观察的决定?** go/no-go 判据除成本+盲测外,应加真实用户的搜索→打开率/30 秒复述正确率/相邻点击率/零结果率/阅读后下一步行动。

## 三、第二轮:可派工执行规格(R1-R8)

### R1. 三级门控表(执行顺序权威)
门A=回归 5 条前必修(回归=本地实验,产物只落 git);门B=经济验证批前;门C=生产上线前。

| 问题 | 门 | 修法 |
|---|---|---|
| 骨架不能表达无源硬数据 | A | 按 R2 硬数据叶子 nullable,禁哨兵文案冒充 |
| 发展层单线晋升 | A | promotion_path 三分支;年限无多源=null |
| Schema 与校验器双源漂移 | A | occupation.schema.ts 为唯一结构规则由 Ajv 执行;validator 只留跨字段语义 |
| evidence 可缺失 | A | evidence 必需;缺失/空/覆盖不全禁止写库 |
| 硬编码 validated | A | 删除;validated 只能由 R3 coverage gate 计算 |
| B 层无推理链 | A | 加 reasoning_chain;缺最小字段不得判 inference_supported |
| rejected 残留正文 | A | coverage gate 双向一致性 |
| field_path 不稳定 | A | 引入 claim_id(UUIDv7)+field_value_hash+span |
| S3 失效模式未测 | A | 植入已知坏样例 fixture,回归必须报错误放行率 |
| registry importer 不存在 | A | 新增独立 registry importer,先灌注册表再灌内容 |
| 内容导入器自动建 slug | A | 只接受已存在 slug,未注册整批失败 |
| l2_scene 空值冲突 | A | 注册表 l2_scene: string\|null,CSV 空→null |
| dim1 自证循环 | A/B | 门A 先移出硬闸;门B 定重做或删 |
| last_verified 洗新 | B | 只保留源文件 verified_at;entry 时间=claim 最旧核验时间 |
| 缺 source_documents/快照 | B | 按 R5 增表 |
| 字段级时效缺失 | B | claim 加 freshness_class/verified_at/valid_until |
| S3 同族模型相关性 | B | 跨模型族盲测,统计错误放行率+错误拒绝率 |
| AI 新兴 L1 混轴 | B | 首波选择前拆同轴 L1,禁混族共享源池 |
| edges 三类语义不足 | B | 按 R6 五类迁移(回归不等待) |
| 坐标层与 edges 双写 | B | edges 为关系事实源,坐标由投影生成 |
| 经济批涉及边占位/重分类 | B(全库 C) | 经济批+首波边先清零占位 |
| 出边<2 的 22 个 slug | B(首波)/C(全库) | 补足或不发布 |
| facets 未结构化 | B | 落 R7 v0 |
| 700-800 算术不闭合 | B | 文档改"容量上限" |
| 首波拍脑袋 | B | 按 R8 算法选 |
| restricted 进镜像 | C | 按 R4 目录隔离+.dockerignore+镜像双重扫描 |
| restricted 可被检索 | C | 构建时资产闸+运行时访问闸两把钥匙 |
| 全图占位/方向一致性 | C | published 子图零占位零悬空 |
| API 可能返回 draft | C | 对外固定 status='published' AND access='public' |

### R2. null 语义字段级规格
总规则:9 层对象与字段键始终存在;"存在但未知"用 JSON null;**禁止哨兵文案**(暂无数据/待补充/未知/TBD/不详/视情况而定);nullable 数组 null=证据不足、[]=已核验为无;非空结构字段仍需 claim 覆盖。

| 层 | 必须非空 | 允许 null |
|---|---|---|
| positioning | one_liner/problem_solved/social_rationale | 无 |
| coordinates | occupation_family;adjacent_occupations≥3 | industry_scenes/upstream/downstream |
| boundary | adjacent_diffs≥3(每项 occupation/diff) | 无 |
| operations | workflow 对象及三键存在 | workflow.daily/project/cycle、deliverables/tools_systems/eval_metrics |
| entry | 层对象及全部键存在 | 五个字段全部可 null |
| variation | 两数组键存在;有条目时 scene/org_nature/diff 非空 | industry_diffs/org_nature_diffs |
| threshold | 层对象及全部键存在 | 五字段全部可 null |
| development | 三分支键/ceiling/lateral_moves 键存在 | 各分支整体、每级 typical_years、三类 ceiling、lateral_moves |
| trend | 层对象及三键存在 | 三数组全部可 null |
| 横切 | axis;domain_specifics≤5 | 不知道的专有项不创建,禁 value:null |

发展层定稿类型:
```ts
interface YearRange { min: number; max: number; unit: 'year'; }
interface DevelopmentStep { title: string; typical_years: YearRange | null; }
interface DevelopmentLayer {
  promotion_path: {
    professional_ic: DevelopmentStep[] | null;
    management: DevelopmentStep[] | null;
    independent: DevelopmentStep[] | null;
  };
  ceiling: { professional_ic: string | null; management: string | null; independent: string | null; };
  lateral_moves: string[] | null;
}
```
年限:≥2 独立来源;范围不一致取并集不取平均;单 JD/单帖=null。

代码改法:schema.ts nullable 写 `type:['string','null']`;`pnpm --filter @coach/api add ajv`;validator 删逐字段重复规则改 Ajv 编译,只保留:证据字段深扫/boundary↔coordinates 一致/nullable 数组禁空串/typical_years.min≤max/年限多源规则/skeleton-edges-evidence 跨文件一致。

### R3. claim-evidence 覆盖闸规格
- claim ID:field_path 不够(数组重排/复合断言/重写歧义)。claim_id=UUIDv7(S2 创建全程沿用)+field_path(定位)+field_value_hash=sha256(normalize(字段值))+claim_text(原子断言,禁"且/同时"连接两事实)+span_start/end。hash 不一致必须重审。
- verdict 枚举定稿:`pending | directly_supported | inference_supported | rejected`。
- 高危字段(非 null claim 必须 directly_supported,不得降 B):任意数字/比例/金额/年限/日期/频次/排名;eligible_majors;campus_signals 中学历院校证书门槛;eval_metrics;industry_diffs/org_nature_diffs 的 diff;threshold 的 hidden_cost/attrition_reality/income_structure;typical_years;ceiling 具体职位;法律准入证照编制考试监管类;domain_specifics 中数字专名制度。
- 源等级:法规证照准入须≥1 A1;校招门槛考核收入须 A2 且禁单雇主 JD 泛化;A3 不得单独验证高危;年限须≥2 独立 source document。
- B 层推理链最小字段:premise_claim_ids(全部 directly_supported)/bridge_rule/conclusion(与 claim_text 一致)/scope_limit/counterevidence_note。禁:单JD→全行业/某公司→全职业/相邻职业→本职业/异口径求平均/同模型互证/相关写因果/预测写事实。
- validated 计算(全部满足):Schema 过 AND evidence 存在非空 AND 每个非null可见事实叶子有原子claim覆盖 AND 无pending AND 正文claim verdict∈{directly,inference} AND 高危全directly且源合格 AND inference有合法推理链 AND rejected不在skeleton/prose/facets AND hash与当前skeleton一致 AND B层占比≤30% AND 年限满足多源。gate 不过=整批失败零写入;published 只能由独立 publish 流程提升。
- 门A 必加反例 fixture:证据缺失/空数组/一字段两claim只验一个/数字同单位异范围/单JD泛化/rejected仍在skeleton/改写复用旧hash/B推理引用rejected前提/两来源同一发布主体/年限单源。

### R4. restricted 物理隔离规格
- 布局:留 git 版本化(不放 _local,因需留存+未来开放;部署只传镜像不传仓库),移 `data/occupations/restricted/{registry,edges,aliases}.csv`。
- .dockerignore 加:`data/occupations/restricted/**` 与 `**/*-restricted.csv`(防迁移期漏网)。
- Dockerfile COPY data 行上方注释注明隔离由 build-context 完成。
- 构建后双重检查:①`docker run --rm --entrypoint sh <img> -c "find /repo -type f \( -name '*-restricted.csv' -o -path '*/occupations/restricted/*' \) -print"` 期望零输出;②docker save 后逐 layer `tar -tf layer.tar | Select-String 'restricted'` 期望零输出(查所有层非仅最终文件系统)。
- 未来开放"两把钥匙":构建时显式复制指定类别资产进新镜像 + 运行时 `OCCUPATION_ACCESS_CATEGORIES=public,xxx` 才允许 importer/index/API 使用;DB/搜索/related/alias/evidence 全端点按类别过滤;public edge 连 restricted slug 时关闭态整条边不进索引;未同时完成新镜像+显式开关+数据审计+负向搜索测试,安全效果必须等价"文件不存在"。

### R5. 保鲜与来源快照 v1 最小集
- 新表 source_documents:id/canonical_url(规范化唯一)/title/publisher/published_at(nullable)/retrieved_at(必填真实抓取时间)/content_sha256/snapshot_path/source_tier(A1A2A3)/employer_key(识别同雇主JD)/document_type(official_rule/jd/company_page/industry_report/article/other)。
- evidence 最小新增:claim_id/source_document_id/field_value_hash/span/reasoning_chain jsonb nullable/freshness_class/verified_at/valid_until/verifier_model_family。
- freshness_class:stable(职业定义分工)/seasonal(校招信号门槛流程)/volatile(收入/AI工具/政策/考试证照)。
- 快照:`content/source-snapshots/<sha256>.json.gz`,只存支持 claim 的规范化正文片段,≤64KiB/条,按 hash 去重,进 git 但入 .dockerignore 不进 4C4G 镜像。
- last_verified 语义:evidence.verified_at=S3 对当前 snapshot 判断时间(非下载/导入时间);entry.last_verified=所有已发布非null claim 的 MIN(verified_at);任一 verified_at=null → entry 不得 validated;importer 严禁 new Date() 覆盖;valid_until<now 自动 needs_refresh,重导入不能洗新。

### R6. edges 五类迁移决策
- 时机:**不堵回归 5 条,经济批前必须完成**(回归验 9 层/S3/成本,旧边不影响;经济批起边参与源池/边界互验/首波选择/前端跳转,再拖=整批返工)。
- 类型定稿:`confusable_with`(易混淆,对称)/`collaborates_with`(稳定协作,对称)/`upstream_of`/`downstream_of`(互逆)/`career_transition_to`(有向)。
- 投影:coordinates.adjacent←confusable_with;upstream/downstream←方向边;development.lateral_moves←career_transition_to;operations 协作描述←collaborates_with。
- 旧 adjacent **禁止批量机械映射**,逐条依据 note/boundary claim/evidence 重分类,无法判断不发布。
- 占位 note 清偿:门B 清经济批+首波边;每量产批发布前清 incident edges;门C published 子图零占位。
- 质量门:published slug 出边≥2 且 confusable_with≥1;对称边成对;上下游逆边一致;career_transition_to 须有 development claim;note 不匹配占位词。

### R7. facets v0 最小 schema
表 occupation_facets(一职业一行):slug/education_min(7档枚举,nullable)/credential_requirement(none_verified|preferred|required|varies_by_employer)+credential_names/work_modes(onsite|hybrid|remote|field_based)/employer_types(10类枚举)/location_patterns(7类)/shift_requirement/travel_requirement/provenance(facet path→claim_id[])/schema_version='facets-v0'。
一致性铁律:S2 先生成 skeleton+原子claim,facet 不单独问模型;S3 验证后由**确定性 projector** 从已验证 claim 投影;每个非null facet 的 provenance 指向≥1 非rejected claim;v0 禁 facet-only claim;skeleton hash 变化→相关 facet 自动失效重投影;禁从 prose 反向抽 facet;无据写 null,明确核验"没有"才写 none_verified。

### R8. 首波 150-250 条选择算法(确定性,复跑同 SHA)
1. 建 `data/occupations/preset-slug-map.csv`(profession,slug,match_method,reviewed):90 职业库一对一映射公开 slug,未匹配或一对多→脚本失败。
2. 图预处理:只用门B 已重分类、非占位、两端公开的边;degree=不同邻居数。
3. 初始集:90 库映射 slug + 回归 5 条;restricted 与纯 L3 长尾不自动入。
4. 逐条追加按字典序规则:L1 未达 min(3,候选数)→减少"已选节点<2 已选邻居"缺口→与已选集有效邻居更多→全图 degree 更高→l3_flag=0 优先→slug 字典序。L3 仅当:是 90 锚点/同 L1 母条已入/能闭合 confusable 或 transition 缺口。
5. 停止条件(150 起查,最大 250):90 全入 AND 44 L1 均达标 AND 6 L0 各有完整 L1 AND 每 slug 选内邻居≥2 AND 每 slug confusable≥1 AND restricted=0 AND 占位边=0。250 仍不满足→fail loud 出缺口报告,不凑数。
6. 实现:`packages/api/scripts/select-occupation-first-wave.mjs` → `data/occupations/first-wave-v0.csv` + report.json;通过判据含连续两次运行输出 SHA-256 一致。

## 四、leader 采纳决议(2026-07-10)
1. R1 三级门控表为 T3 后续执行的权威顺序;回归 5 条前先做门A 全部 12 项(其中大部分是 Stage0 产物的硬化改造)。
2. 700-800 正式降级为容量上限;首波按 R8 算法定 150-250。
3. restricted 隔离(R4)虽是门C,但 data 目录迁移+.dockerignore 属低成本高险预防,随门A 批一起做(防中途误构建镜像)。
4. 经济批 go/no-go 判据扩充:成本+盲测 之外加入 D1 的真实用户行为指标(搜索打开率/复述正确率/相邻点击率/零结果率)。
