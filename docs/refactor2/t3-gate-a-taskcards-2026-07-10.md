# T3 门A 修复批 · 降智任务卡包(Codex 5.6 出品,2026-07-10)

> 执行者:Sonnet 级 implementer,照卡执行,不需要也不允许自行设计。上位依据:docs/refactor2/t3-codex56-review-2026-07-10.md(§R1-R3 规格)。
> 每张卡:先红后绿(TDD 顺序强制),完成即 commit(前缀 `feat(t3-gate-a): TC-XX ...`),附验证原始输出。
> **leader 编排调整**:TC-07 改在主树独立分支 feat/t3-restricted-isolation 执行(与 TC-01 物理隔离防 git 索引竞争),其余卡在 worktree coach-wt/t3-gate-a(分支 feat/t3-gate-a,基于 dev)。

## 并行图
```text
P1: TC-01(worktree) ∥ TC-07(主树独立分支)
TC-01 完成 → P2: TC-02 ∥ TC-03 ∥ TC-06
TC-02+TC-03 完成 → TC-04 → TC-05 → TC-08(总验收)
```

## 全卡通用红线
- 不改 packages/web/**;不改 data/occupations/*-v1.csv 主表内容;不改任何既有 migration(含时间戳);不用 migration:generate;不用 any / as unknown as。
- 不顺手做门B内容(edges五分类/source_documents/facets/freshness)。
- 不改 Axis 枚举、L0 枚举、9 层名称;不加第 10 层。
- 不碰 ai.service.ts / concurrency-limiter.ts / diagnoses.service.ts。
- 改既有测试必须在报告里说明"旧断言为何因已批准规格失效";不得删除与新规格无关的断言。

---

## TC-01:R2 null 语义、发展层三分支、Ajv 单一结构源
**goal**:9 层骨架能表达"有字段但无证据"(null);Ajv 执行唯一 JSON Schema,消灭手写结构校验双源。
**并行组 P1(worktree)**

### files_allowed
packages/api/package.json、pnpm-lock.yaml、occupation.types.ts、occupation.schema.ts、occupation.validator.ts、checks/dim6-field-completeness.mjs(删除)、checks/smoke.mjs、test/occupation-schema-validator.spec.ts、test/occupation-checks.spec.ts、test/fixtures/occupations/valid/** 与 invalid-*/**(共 7 个 fixture 文件)

### files_forbidden
seed-importer.ts、occupation-evidence.types.ts、entities/**、migrations/**、data/**、packages/web/**、.env*、_local/**

### steps
1. 基线:`npx jest occupation-schema-validator.spec.ts occupation-checks.spec.ts` 全绿,保存输出。
2. **先写红灯断言**(不改实现):coordinates.industry_scenes/upstream/downstream=null 可过;operations.workflow 三键=null 可过;deliverables/tools_systems/eval_metrics=null 可过;entry 五字段 null 可过;variation 两数组 null 或 [] 可过;threshold 五字段 null 可过;trend 三数组 null 或 [] 可过;**positioning 任一字段 null 必须失败;adjacent_occupations=null 必须失败;nullable 数组含 "" 必须失败;哨兵文案(暂无数据/待补充/未知/TBD/不详/视情况而定)必须失败;非法 org_nature 由 Ajv 拒绝;development 三分支结构可过;typical_years.min>max 拒绝;boundary 与 coordinates 相邻集合不一致失败**。跑出红灯,存输出。
3. `pnpm --filter @coach/api add ajv@^8.17.1`(不用 npm)。
4. occupation.types.ts 替换发展层为三分支定稿(YearRange{min,max,unit:'year'}/DevelopmentStep{title,typical_years:YearRange|null}/DevelopmentLayer{promotion_path{professional_ic|management|independent: DevelopmentStep[]|null},ceiling{三分支:string|null},lateral_moves:string[]|null});其余 nullable 化:CoordinatesLayer(industry_scenes/upstream/downstream→string[]|null)、Workflow 三键→string|null、OperationsLayer 三数组→|null、EntryLayer 五字段→|null、VariationLayer 两数组→|null、ThresholdLayer 五字段→|null、TrendLayer 三数组→|null、OccupationSlugRow.l2_scene→string|null。**不改** positioning/boundary/axis/domain_specifics。
5. occupation.schema.ts 改头注(Schema=唯一结构规则,Ajv 运行时执行);helper:nonEmptyString/nullableString{type:['string','null'],minLength:1}/stringArray/nullableStringArray;development 用 $defs(yearRange{min/max: number minimum:0,unit:{const:'year'}}/developmentStep{title:nonEmptyString,typical_years:anyOf[$ref yearRange,null]}/developmentBranch{type:['array','null'],items:$ref developmentStep});禁止另建第二份结构表。
6. occupation.validator.ts 重写:模块级 `const ajv=new Ajv({allErrors:true,strict:true}); const validateStructure=ajv.compile(OCCUPATION_SKELETON_SCHEMA);` 删除 getLayer/requireNonEmptyString/requireStringArray 及逐层结构检查;保留:被禁证据字段深扫、哨兵深扫(trim 后整值等于禁词才拒,不做子串误杀)、boundary↔coordinates 双向相等、nullable 数组元素非空串、development min<=max、edges 引用完整性;Ajv 错误转 ValidationError(点号路径)。年限多源规则不在本卡(归 TC-02)。
7. 删除 dim6-field-completeness.mjs(理由写进 smoke.mjs 注释:结构完整度由 Ajv 唯一执行);smoke.mjs 删 checkDim6 import/调用/断言/头注;occupation-checks.spec.ts 删 dim6 describe(dim1/dim3/edges 保留)。
8. fixture 同步:两个 valid 改三分支 development,**所有 typical_years 一律 null**(不得把旧文本"0-3年"拆成硬数字);structural fixture 补齐"机电工程师"boundary diff(4 adjacent 全配对);invalid-* 除目标缺陷外结构须符合新 Schema;invalid-missing-layer 继续缺 development+trend 不许补;允许 null 的未知字段写 null 禁哨兵。
9. 验证:`npx jest occupation-schema-validator.spec.ts occupation-checks.spec.ts` + `npx tsc --noEmit` 全绿;Ajv 抓非法 OrgNature;axis/domain 旧反例仍失败。

### must_not
不改 10 个 Axis 值;不放宽 positioning/boundary/adjacent≥3;不留手写逐字段结构校验;不把 null 自动转 [];不把 [] 解释成"未知"([]=已核验为无);不凭旧文本生成 typical_years;不删旧反例凑绿。

### 既有测试改动边界
允许:development 旧三字段断言→三分支;null 原应失败→指定字段可过;删 dim6 重复检查。禁止:axis 非法/domain 超5/缺层/被禁字段/悬空 edge 仍必须失败;不降 adjacent/boundary 3 条下限。

### acceptance
新断言先红后绿有证据;Schema 唯一结构源;两 valid 过、新旧反例按目标失败;package.json 与 lockfile 同步;tsc+两 spec 全绿。
**depends_on**:无

---

## TC-02:claim_id、verdict、推理链与 coverage gate
**goal**:建立不可绕过的 claim-evidence 覆盖闸,只有完整/当前/合法断言集合才算得出 validated。
**并行组 P2**

### files_allowed
occupation-evidence.types.ts、occupation-coverage-gate.ts(新)、entities/occupation-evidence.entity.ts、test/occupation-coverage-gate.spec.ts(新)、test/fixtures/occupations/gate-a-coverage-cases.json(新)

### files_forbidden
occupation.types.ts、occupation.schema.ts、occupation.validator.ts、seed-importer.ts、registry-importer.ts、migrations/**、data/**、packages/web/**

### steps
1. 先写 spec+fixture 红灯(模块不存在而 FAIL)。
2. 替换 evidence 类型定稿:EvidenceSourceLevel='A1'|'A2'|'A3';EvidenceVerdict='pending'|'directly_supported'|'inference_supported'|'rejected';ReasoningChain{premise_claim_ids:string[],bridge_rule,conclusion,scope_limit,counterevidence_note:string|null};OccupationEvidenceRow{entry_slug,claim_id,field_path,field_value_hash,claim_text,span_start,span_end,source_excerpt,source_url,tier,verdict,reasoning_chain:ReasoningChain|null,last_verified:Date|null}。
3. entity:现有 id 列直接作 claim ID(`@PrimaryColumn({name:'id',type:'uuid'}) claim_id`);旧 claim 列映射 claim_text(`@Column({name:'claim',type:'text'})`);新增 field_value_hash varchar(64)/span_start int/span_end int/reasoning_chain JSONB_COLUMN_TYPE nullable。不加 freshness/source_document(门B)。
4. 新建 occupation-coverage-gate.ts:evaluateOccupationCoverageGate(input{skeleton,prose,evidence,facets?})→{validated,status:'validated'|'draft',errors[{code,field,message}]};17 个错误码:EVIDENCE_MISSING/EVIDENCE_EMPTY/CLAIM_ID_INVALID/CLAIM_NOT_ATOMIC/SPAN_INVALID/CLAIM_COVERAGE_INCOMPLETE/PENDING_CLAIM/UNSUPPORTED_VISIBLE_CLAIM/HIGH_RISK_NOT_DIRECT/SOURCE_TIER_INSUFFICIENT/NUMERIC_SCOPE_MISMATCH/INFERENCE_CHAIN_INVALID/REJECTED_CONTENT_PRESENT/FIELD_HASH_MISMATCH/INFERENCE_RATIO_EXCEEDED/SOURCE_NOT_INDEPENDENT/YEAR_RANGE_SOURCE_INSUFFICIENT。
5. 确定性规则钉死:UUIDv7 正则 `/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`;hash=sha256(normalizeLeafValue(值))——string:NFC+trim+连续空白压一格;YearRange 按 min,max,unit 固定序序列化;数组按单元素 hash(防重排误伤);span=claim 在当前叶子规范化串的半开区间,accepted claims 的 span 并集须覆盖全部非空白字符;claim_text 命中 `且|同时|以及|并且` =非原子;evidence 缺失/空数组直接失败;无 pending;非 null 可见事实叶子必须有覆盖;rejected 的 hash/path 不得匹配当前 skeleton 且 claim_text 不得现于 prose/facets;inference_supported 必须 chain 非空+premises 全 directly+conclusion 与 claim_text 规范化相等+bridge/scope 非空+禁自引用;inference 比例≤0.30;高危字段或含数字 claim 必须 directly;数字/年份/金额/比例须在 excerpt 中同口径出现(2024vs2023 必须失败);A1 强制=法律/准入/证照/编制/考试/监管;A2+两个不同 publisher host=校招门槛/考核/收入/年限;A3 不得单独撑高危;独立来源=hostname 小写去 www 后不同;typical_years≠null 须≥2 不同 URL 且 2 不同 host。
6. gate-a-coverage-cases.json:1 valid + 10 反例(missing-evidence→EVIDENCE_MISSING/empty-evidence→EVIDENCE_EMPTY/partial-compound-field→CLAIM_COVERAGE_INCOMPLETE/same-number-different-scope→NUMERIC_SCOPE_MISMATCH/single-jd-generalization→SOURCE_NOT_INDEPENDENT/rejected-still-in-skeleton→REJECTED_CONTENT_PRESENT/rewritten-value-old-hash→FIELD_HASH_MISMATCH/inference-uses-rejected-premise→INFERENCE_CHAIN_INVALID/same-publisher-two-urls→SOURCE_NOT_INDEPENDENT/year-range-single-source→YEAR_RANGE_SOURCE_INSUFFICIENT);每反例独立 it(),禁循环只断言"有错误"。
7. `npx jest occupation-coverage-gate.spec.ts` + tsc 全绿。

### must_not
不用 field_path 作主键;不用 v4 自动生成;inference 缺链不降级放行;"没有矛盾"≠supported;同域名两页≠独立;不做门B;不只查数量不查 span/hash/verdict。

### 既有测试
本卡不改旧 spec;若旧 importer 编译失败,允许暂只跑新 gate spec,P2 结束前不得称全量绿。

### acceptance
先红后绿;10 反例逐个命中指定 code;validated 只能由 gate 返回;entity 可存 Gate A 字段。
**depends_on**:TC-01

---

## TC-03:独立 registry importer 与 l2_scene null
**goal**:registry-v1.csv 成为 occupation_slugs 唯一权威输入;353 个空 l2_scene 导入为 DB null。
**并行组 P2**

### files_allowed
registry-importer.ts(新)、entities/occupation-slug.entity.ts、test/occupation-registry-importer.spec.ts(新)、test/fixtures/occupations/registry-invalid.csv(新)

### files_forbidden
data/*.csv、seed-importer.ts、migrations/**、occupation.types.ts、packages/web/**

### steps
1. 红灯 spec:真实 CSV 导入 369 行;353 空 l2→null;重复导入幂等仍 369;重复 slug/非法 L0/非法 boolean/status 整批零写入。
2. entity:`@Column({type:'varchar',nullable:true}) l2_scene: string|null`。
3. registry-importer.ts:importOccupationRegistry(dataSource,csvPath)→{importedCount,errors};**csv-parse/sync**(禁手写 split);header 精确=slug,name,l0,l1_family,l2_scene,l3_flag,status;全量验证后才开事务;slug 小写连字符批内唯一;l0∈6 值;l2 trim 空→null;l3_flag 只收 '0'/'1';status∈4 值;save() 按 slug upsert;整批失败零写入;不导 aliases/edges/entries/evidence;不改 CSV。
4. registry-invalid.csv 固定 4 行:两行重复 slug/一行非法 L0/一行 l3_flag=yes/一行 status=draft;断言错误定位到行号+字段。

### must_not
不读 content JSON;空 l2 不写 ""/未知/待补充;不自动修 slug;不部分导入;不改主 CSV 迁就测试。

### 既有测试
不改旧 spec;occupation-tables-migration-smoke 仍绿(nullable 由 TC-04 迁移单独验)。

### acceptance
真实 CSV 可重复导入同 369;空 l2 统一 null;一处非法=事务前失败零写入;registry 与内容 importer 物理分离。
**depends_on**:TC-01

---

## TC-04:Gate A additive migration
**goal**:新迁移同步 l2 nullable + evidence gate 字段,不动历史迁移。
**串行(TC-02+TC-03 后)**

### files_allowed
migrations/1783100000000-HardenOccupationGateA.ts(新)、test/occupation-gate-a-migration-smoke.spec.ts(新)

### files_forbidden
其余全部 migration、occupation-tables-migration-smoke.spec.ts、src/occupations/**、data/**

### steps
1. 红灯 smoke:name/时间戳一致;l2 DROP NOT NULL;evidence 加 4 列;up 无 DROP 表列无 DELETE;down 在 evidence 非空时 fail closed;down 只删本迁移 4 列。
2. class HardenOccupationGateA1783100000000。up():`ALTER TABLE occupation_slugs ALTER COLUMN l2_scene DROP NOT NULL; ALTER TABLE occupation_evidence ADD COLUMN field_value_hash varchar(64) NOT NULL, ADD COLUMN span_start integer NOT NULL, ADD COLUMN span_end integer NOT NULL, ADD COLUMN reasoning_chain jsonb;`(claim_id 复用现有 id 列;claim_text 复用 claim 列;若已有旧 evidence 行 NOT NULL 会 fail loud——不许假默认值回填)。
3. down() 先 DO $$ 检查:evidence 有行→RAISE;slugs 有 NULL l2→RAISE;过检后删 4 列+l2 SET NOT NULL。

### must_not
不改既有迁移;不 generate;不填伪默认;不 DELETE;非空表不许 down;不把 null 清洗成空串求回滚。

### verify
两 smoke 全绿+tsc;本地 PG:migration:run→revert→run(有数据则 fail closed 换空库验,不许删数据求绿)。
**depends_on**:TC-02、TC-03

---

## TC-05:内容 importer 禁建 slug、evidence 必需、validated 由 gate 计算
**goal**:内容导入只消费已注册 slug,coverage gate 全过后一次事务写库。
**串行(TC-04 后)**

### files_allowed
seed-importer.ts、test/occupation-seed-importer.spec.ts、test/fixtures/occupations/importer-valid|importer-missing-evidence|importer-empty-evidence|importer-unregistered 四组(新)

### files_forbidden
types/schema/validator/coverage-gate/registry-importer、migrations/**、data/**、packages/web/**

### steps
1. 跑旧基线存输出。旧测试中"第二个 slug 无 evidence 仍导入"与"自动建 slug"是**已批准废止的错误契约**,只许改这两类预期。
2. 先改 spec 红灯:未注册 slug→整批失败 5 表零新增;evidence 缺失→失败;evidence []→失败;coverage 不全→失败;gate 过→validated;注册表元数据/status 不被内容文件覆盖;重复导入幂等;claim_id 往返不变(不重新生成)。
3. OccupationSeedFile 收缩为 {slug,axis,skeleton,prose,cost_tokens?,aliases?,edges?}——**删 name/l0/l1_family/l2_scene/l3_flag**(只属 registry CSV)。
4. evidence seed 形状=TC-02 定稿字段;删旧三态与旧 claim 解析。
5. 导入顺序钉死:解析全部→每 slug 必须已在 occupation_slugs(否则失败)→evidence 文件存在→非空数组→Ajv/跨字段→coverage gate→edges 检查(knownSlugs 只来自 DB registry,禁把内容文件 slug 自动加入)→任一错误零事务→全过后一个事务写 entries/edges/aliases/evidence→**不调用 slugRepo**。
6. 删 `status:'validated'` 与 `last_verified: now`→`status: gateResult.status, last_verified: null`(evidence 同 null;门B 才引入真实 verified_at)。
7. importer-valid 最小合法词条:positioning 三字段非空;coordinates=family+3 adjacent 其余 null;boundary 恰 3 条与 adjacent 相等;operations/entry/variation/threshold/trend 允许字段全 null;development 全 null;domain_specifics [];13 个非 null 叶子各 1 条 directly_supported claim(UUIDv7);aliases 2 条;edge 指向测试预注册的第二 slug。三个坏 fixture:missing(无 evidence 文件)/empty([])/unregistered(不预注册)。

### must_not
不建/改 occupation_slugs;不把文件 slug 加 knownSlugs;缺 evidence 不按空继续;不许调用方传 validated;不用 new Date() 写 last_verified;不用类型断言绕解析;不改旧 fixture 装作有 evidence 实则覆盖不全。

### 既有测试改动边界
必须改:"无 evidence 也成功"→失败(修 Blocker);"自动生成 slug"→预注册+断言不被改;verdict 旧枚举→新;last_verified 断言→null。不得改:整批原子性/悬空拒绝/幂等/零部分写入/解析 fail loud。

### verify
`npx jest occupation-seed-importer.spec.ts occupation-coverage-gate.spec.ts occupation-registry-importer.spec.ts` + tsc 全绿。
**depends_on**:TC-01..04

---

## TC-06:dim1 移出硬闸
**goal**:dim1 保留为诊断指标,不再阻断验收或写库。
**并行组 P2**

### files_allowed
checks/smoke.mjs、test/occupation-checks.spec.ts、test/fixtures/occupations/diagnostic-low-vocab/occupations/low-vocab.json(新)

### files_forbidden
dim1-vocab-density.mjs(不许删不许改)、validator、coverage-gate、seed-importer、migrations、data

### steps
1. low-vocab.json:新 Schema 完全合法/无被禁字段无哨兵/文案刻意平凡使 dim1 pass=false/无其他结构错误。
2. spec 加断言:validateSkeleton(low-vocab)=valid;dim1 pass=false 且仍出 metrics;不抛异常不进 smoke 硬门。
3. smoke.mjs 删 checkDim1 import/调用/断言/头注"Dim1 是通过条件"。
4. describe 改名"dim1 专业词汇密度诊断指标(非阻断)";旧 structural 的 dim1 通过测试可留但注明只验脚本可运行。

### must_not
不删 dim1 脚本;不改低阈值凑全过;不给 low-vocab 塞术语求绿;gate 不引用 dim1;不连带降级 dim3/edges。

### verify
`npx jest occupation-checks.spec.ts` + `node src/occupations/checks/smoke.mjs`(退出 0 且无 Dim1 通过条件;dim3/edges 仍执行)。
**depends_on**:TC-01

---

## TC-07:restricted 目录迁移与镜像双扫描
**goal**:restricted 三件套在 build-context 阶段即不可进镜像,最终文件系统+历史 layer 双扫描取证。
**并行组 P1(主树独立分支 feat/t3-restricted-isolation)**

### files_allowed
data/occupations/*-restricted.csv(移动源)→data/occupations/restricted/{registry,edges,aliases}.csv(目标)、.dockerignore、Dockerfile.api、scripts/scan-restricted-image.ps1(新)

### files_forbidden
data/occupations/*-v1.csv、packages/**、docker-compose.prod.yml、.env*、_local/**

### steps
1. **移动不复制**(git 识别 rename,内容 hash 不变):mkdir data/occupations/restricted;三个 Move-Item 到 registry.csv/edges.csv/aliases.csv。
2. .dockerignore 加:`data/occupations/restricted/**` 与 `**/*-restricted.csv`(防旧命名漏网)。
3. Dockerfile.api 的 COPY data 行上方加注释:"restricted 职业资产由 .dockerignore 在 build-context 阶段物理排除;不得依赖 runner 阶段 rm(历史 layer 仍会泄露)"。不改 COPY 目标。
4. scripts/scan-restricted-image.ps1(param [string]$Image 必填)两道门:①最终文件系统 `docker run --rm --entrypoint sh $Image -c "find /repo -type f \( -name '*-restricted.csv' -o -path '*/occupations/restricted/*' \) -print"` 有输出即退出 1;②docker image save→解 manifest→遍历每 layer tar→tar -tf 匹配 restricted 三模式,命中退出 1;finally 清理临时目录(路径须在 $env:TEMP 下才删);成功输出 "PASS: no restricted occupation assets found in final filesystem or image layers"。
5. 仓库级验证:旧路径三文件不存在、新路径三文件存在(PowerShell Test-Path 脚本)。
6. `docker build -f Dockerfile.api -t coach-api:t3-gate-a .` + 跑扫描脚本。**若 Docker daemon 不可达:完成 1-5 步与脚本编写,报告里把镜像构建/扫描标注 PENDING-DOCKER(非失败),leader 后补跑**。

### must_not
不移 _local 不删数据;不只 RUN rm;不只扫最终文件系统跳过 layer;不改三 CSV 内容;不把 restricted 接入运行时配置/importer;不构建部署生产镜像(只打本地验收 tag)。

### verify
git diff 显示三个 rename 零内容变化;容器 find 零输出;全 layer 零命中;脚本 PASS 退出 0。
**depends_on**:无

---

## TC-08:门A 集成验收(只验证不修码)
**串行最终**。files_allowed:无(发现失败回派对应卡)。
1. 边界:`git diff --name-only dev...HEAD` 只见 TC-01..07 allowed 文件;主 CSV/既有迁移/web/.env/_local 零 diff。
2. occupation 定向七 spec 全绿(schema-validator/coverage-gate/registry-importer/seed-importer/checks/gate-a-migration-smoke/tables-migration-smoke)。
3. API 全量:tsc/npx jest/npx jest --config ./test/jest-e2e.json --forceExit 全绿(裸 jest 不算 e2e)。
4. 本地 PG:migration run→revert→run(数据非空 fail closed 换空库,不删数据)。
5. web 最小回归:eslint src 0 错/tsc/build 过(虽未改 web)。
6. 镜像构建+双扫描 PASS。
7. 输出 coverage gate 反例汇总:10 invalid/10 rejected/0 false accepts/valid=validated。
**must_not**:不把裸 jest 当 e2e;Docker/DB 未启动不算 skip;不在本卡修码;不带失败合并;不部署。
