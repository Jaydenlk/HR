export const meta = {
  name: 't3-stage0-schema',
  description: 'T3 职业维基 Stage0——焊死8层骨架schema+JSON Schema+校验器+确定性检查脚本(改造p2lib脚手架)+5张表migration+seed导入器,含合规/违规测试样例',
  phases: [
    { title: '侦察', detail: '只读代理核对设计文档定稿+p2lib老脚手架+HRBP现实代码坐标,产出精确执行清单' },
    { title: '实现', detail: '按清单在独立worktree(feat/t3-stage0)焊死schema/校验器/脚本/migration/seed导入器' },
    { title: '验证', detail: '质量门(tsc+build+jest+残留扫描)与只读审计并行' },
  ],
}

const RECON_PROMPT = `你是侦察代理(只读,不改任何文件)。任务:为「T3 职业维基 Stage0 骨架焊死」核对设计定稿与现实代码坐标,产出一份「当前精确执行清单」。

## 必读文档(按顺序,绝对路径,仓库根 E:\\Agent program\\HRBP)
1. docs/refactor2/T3-career-wiki.md —— 重点 §3(骨架schema)§4(数据模型)§7 第1条(Stage0 verify判据)§8(派工方案 Agent A 部分)。这是本任务的直接执行依据。
2. docs/refactor2/T3-总体设计-原稿.md —— 第一、二部分,是 8 层固定骨架每层字段明细的唯一权威源(T3-career-wiki.md 只给了层名,没有展开每层字段清单,字段明细必须从这份原稿的表格里抠出来)。第三部分是ROI机制说明,读一遍理解"为什么骨架要焊死"但不是本次编码对象。
3. docs/refactor2/00-master-plan.md —— 全局红线、状态追踪表、"待用户输入的遗留项"(第3条提到"T3:注册表v1与经济验证批go/no-go,两处用户过目节点"——确认这两个节点都不在Stage0范围内)。
4. docs/refactor2/01-dev-principles.md —— 环境坑位(jest必须从packages/api目录跑、migration手写、danger区)、提交纪律。
5. docs/refactor2/02-execution-playbook.md —— 找到本任务在"任务→脚本索引表"里的那一行(序7,脚本 t3-stage0-schema.js),记录它的"特别停点"原文:"只做Stage0;schema焊死后改动需用户批"。

## 必读老脚手架(只读参考,评估"哪些可改造复用、哪些必须废弃")
6. E:\\Agent program\\coach-wt\\p2lib\\packages\\api\\src\\career-explore\\phase1\\occupation.types.ts(390行)—— 老 Phase1 类型定义。注意它用 Sourced<T> 把 source_refs 内嵌进 A 层字段值里,这个模式和 T3-career-wiki.md §3 "彻底移出正文" 的裁决直接冲突,要在清单里明确写出这条冲突和裁决结果。
7. E:\\Agent program\\coach-wt\\p2lib\\packages\\api\\src\\career-explore\\phase1\\checks\\dim1-vocab-density.mjs、dim3-boilerplate-blacklist.mjs、dim6-field-completeness.mjs、smoke.mjs —— 确定性检查脚本范本(checkDimN(occupation)导出函数 + SAMPLE_PASS/SAMPLE_FAIL + smoke harness 的写法模式)。记录每个脚本当前校验的具体规则,哪些规则是老schema特有(如"deliverables.value.length≥5"这类固定数字下限,来自老标准 E:\\Agent program\\coach-wt\\p2lib\\docs\\p2-libraryB-standard-v0.1.md §5.x,不是T3新文档定的,注意这份老标准文档在 p2lib worktree 里、不在本仓库 docs/ 下),哪些规则在新8层骨架下仍然成立。
8. E:\\Agent program\\coach-wt\\p2lib 的 git log(该worktree在分支 feat/p2-libB-phase1)—— 确认该分支里除 phase1/ 之外还有一整条更早的"career-explore"实现(wiki.service.ts/wiki-content.service.ts/matching.ts/riasec.ts/career-explore.controller.ts/entities/wiki-occupation.entity.ts等),这条分支从未合并进 dev。T3-career-wiki.md 开头写明"老流水线作废,不再续跑老workflow"——在清单里明确写出:这些文件禁止被复用/参考/导入,只有 occupation.types.ts 与 checks/dim1,3,6.mjs 是"可改造复用"的范围。

## 必读 HRBP 现实代码坐标(确认落点与既有约定,内容为准、行号可漂移)
9. packages/api/src/database/migrations/ 目录 —— 看最近3-4个迁移文件(如 1782400000000-ReconfigureGlmPrimary.ts、1781500000000-CreateAnnouncements.ts)确认命名规则(<毫秒时间戳>-PascalCase描述.ts)与DDL书写风格。
10. packages/api/test/announcements-migration-smoke.spec.ts —— migration-smoke 测试范本(RecordingRunner 录制 QueryRunner.query 调用,断言 CREATE TABLE/INDEX 的DDL字符串、纯加法、down()对称回滚)。
11. packages/api/src/database/data-source.ts —— 确认 entities 是用 glob (path.resolve(__dirname,'..','**','*.entity.{ts,js}')) 自动发现的,新增 *.entity.ts 文件不需要手动去 app.module.ts 注册。
12. packages/api/src/seed.ts —— 现有 seed 脚本结构(async function seed()),评估新的 seed 导入器是挂成这个文件里的一个新步骤,还是独立文件更干净(独立文件更符合单一职责,建议独立,但由你核实后在清单里给结论)。
13. deploy/README.md §2.1 —— 迁移命名/手写纪律原文。
14. packages/api/package.json —— 确认 "lint": "tsc --noEmit"(即该项目后端没有真正的 ESLint,不要误以为需要跑 eslint)、"build": "nest build"、"test": "jest"。同时 grep 一下 dependencies 里有没有 ajv/zod/joi(目前已知只有 class-validator),把结论写进清单供实现代理决策校验器技术选型。
15. git worktree list 与 git log dev -1 —— 确认 dev 分支当前最新提交 sha;检查 E:\\Agent program\\coach-wt\\t3-stage0 这个worktree路径和 feat/t3-stage0 这个分支名当前是否已存在(可能是之前失败重跑留下的),把结论写进清单(存在则说明"复用"还是"先清理"由实现代理判断,不要求你现在处理)。

## 产出格式(纯文本,不要写代码,不要建文件)
逐条列出「当前精确执行清单」,每条包含:
- 文件路径(新建 or 需要读一眼确认约定的既有文件)
- 内容锚点:新建文件给"参照哪个现有文件的哪个可grep片段";既有文件给可grep的独特字符串或函数名
- 这一条要做什么(一句话)
- 这一条的 verify(具体命令或断言)
清单必须覆盖:①8层骨架的字段清单(从原稿摘出,逐层列字段名)②axis 10个枚举值原样抄录③domain_specifics封顶5条④5张表的关键字段(照抄T3文档§4表格)⑤哪些老p2lib文件可改造复用、哪些禁止碰⑥新模块建议放哪个目录(避免与"career-explore"撞名)⑦老脚手架里哪些校验规则(如具体数字下限)在新文档里找不到依据、必须提醒实现代理不要凭空沿用。
最后单列一节「红线清单」和一节「不确定/需实现代理自行斟酌并在回复里说明理由的点」(如是否给 occupation_edges/occupation_evidence 加数据库级 FK、evidence.verdict 字段的具体取值枚举、JSON Schema 用 .ts 字面量还是 .json 文件)。
目标内容在现实中找不到对应(比如设计文档点名的某个坐标已经不存在)才标 [缺失-需人工];不要因为"这是新建任务、大部分都是新文件"就到处标缺失——那不是缺失,是正常的新建。`

const IMPL_PROMPT = `你是实现代理,执行「T3 职业维基 Stage0——骨架 schema 焊死」。仓库 E:\\Agent program\\HRBP,基线分支 dev。

## 任务边界(一句话)
只交付:TS类型 + JSON Schema + 校验器 + 确定性检查脚本(改造p2lib的checks/*.mjs) + 5张表migration + seed导入器,含合规/违规测试样例。不做内容量产、不做700-800词条注册表、不加任何API controller/前端页面——那些是本文件之外的后续阶段(见"越界红线")。

## 操作规程(先做这步,隔离风险)
- 主工作区(E:\\Agent program\\HRBP)当前可能正被别的任务占用而处于未提交的脏状态,不要动它、不要 git add/commit 里面任何东西。
- 先 \`git log dev -1\` 确认 dev 最新提交;然后创建**独立 worktree**:\`git worktree add "E:\\Agent program\\coach-wt\\t3-stage0" -b feat/t3-stage0 dev\`(若该路径或分支已存在,说明是重跑,直接 \`cd\` 进去 \`git status\`/\`git log -1\` 确认干净可续跑,不要重复创建报错就慌)。
- 之后所有读写、所有 git 操作都在 E:\\Agent program\\coach-wt\\t3-stage0 这个 worktree 目录里进行。

## 骨架定义(T3-career-wiki.md §3 + T3-总体设计-原稿.md 第一部分,焊死为常量,不许自行增删)
8层固定骨架(所有职业一致,层名与本文件保持一致):
1. 定位层:一句话定位 / 解决什么问题 / 为什么这个职业成立(社会分工意义,非JD定义)
2. 坐标层:职业族 → 行业场景 → 相邻职业(≥3) → 上游/下游
3. 边界层:与 ≥3 个相邻职业的真实差异(百科最核心模块)
4. 实操层:真实工作流(日/项目/周期) / 典型产出物 / 工具系统 / 考核指标
5. 入行层:对口专业 / 非对口转入 / 校招信号 / 简历有效经历 / 看似相关实则无用
6. 差异层:行业差异 / 组织性质差异
7. 门槛层:隐性门槛 / 常见误解(客观事实性的:代价、淘汰、收入结构)
8. 趋势层:AI影响(被替代/被增强/新技能)

axis 枚举(差异主轴,10个值,一字不改、顺序任意但集合必须完全一致):
product_lifecycle, project_delivery, accreditation_cycle, crop_cycle, case_cycle, patient_flow, fiscal_cycle, academic_cycle, campaign_cycle, ops_routine

domain_specifics:专有槽,封顶 5 条/词条,超出必须回落固定骨架(校验器要能拒绝 >5 条的情况)。

**彻底移出正文的红线(和p2lib老脚手架最大的区别)**:source_ref / A1A2A3 / 蕴含日志(entailment-log) / 自查表(Stage5) / 维度分数(Dim1分数) / inferred前缀 —— 这些一律不许出现在骨架(skeleton)正文类型/JSON Schema里,只能存在于 occupation_evidence 证据侧表。p2lib 老文件 occupation.types.ts 用 Sourced<T> 把 source_refs 直接内嵌进 A 层字段值(value + source_refs 两件套)——**这个模式禁止照抄到新骨架类型里**。新骨架里的字段就是纯值(字符串/字符串数组/结构化子对象),不携带任何来源信息。

## 数据模型(T3-career-wiki.md §4,5张表,手写migration)
- occupation_slugs:slug(PK) / name / l0 / l1_family / l2_scene / l3_flag / status(planned→in_production→published→parked)
- occupation_entries:slug(FK→occupation_slugs) / skeleton(jsonb,即上面8层骨架+axis+domain_specifics) / prose(text) / axis / status(draft/validated/published/needs_refresh) / cost_tokens / last_verified
- occupation_edges:from_slug / to_slug / type(adjacent/upstream/downstream) / note —— 注意这三个type值和p2lib老EdgeType('traditional_to_ai'|'adjacent'|'transfers_to')不同,以这里给的三个为准。脚本要保证零悬空引用(from_slug/to_slug 都必须在 occupation_slugs 里存在)。
- occupation_evidence:entry_slug / field_path / claim / source_excerpt / source_url / tier(A1/A2/A3) / verdict / last_verified —— verdict 的具体取值集合T3文档没有列举,你需要按§1设计裁决第8条"B层规则:蕴含失败默认删;仅当能写明推理链才准降B"和原稿"失败就把断言移到B层标推断、或删掉"的语义合理定义(如 confirmed / demoted_to_b / rejected 三态或等价命名),在最终回复里写清楚你选的取值集合和理由——这属于"允许你自己定但要说清楚"的微调,不算改动schema核心结构。
- occupation_aliases:alias / slug / weight;唯一索引 (alias, slug)

是否给 edges/evidence/entries/aliases 的 slug 外键加数据库级 FK 约束(而不是只靠脚本查引用完整性),自行判断并在回复里说明理由(考虑:生产内容是分批量产的,词条之间可能存在"先建边、后建目标词条"的中间态,硬FK可能和这个节奏冲突;若不加FK,脚本层的悬空引用检查就是唯一保障,必须确保测试覆盖到位)。

## 交付清单(在下面"侦察产出的执行清单"基础上落地,冲突时以本节+设计文档字面为准)
1. TS 类型定义文件(建议 packages/api/src/occupations/occupation.types.ts,若与既有目录规划冲突可微调路径但不许叫 career-explore 或复用该目录):8层骨架接口、axis 联合类型(10个字面量)、domain_specifics 结构、5张表对应的行类型接口。必要的横切枚举(L0板块、组织性质、学历门槛、入行渠道、AI影响类型等)可参考 p2lib 老 occupation.types.ts 里的同名枚举酌情保留改造——这些纯枚举本身不违反"移出正文"红线,但**不要把 Sourced<T> 那套包装模式带过来**。
2. JSON Schema(.ts 字面量常量或 .json 文件,自行选择并说明理由;tsconfig 已开 resolveJsonModule,两条路都能走):描述 skeleton 的结构约束——8层必填、axis 枚举、domain_specifics 最多5条、且 schema 里不允许出现 source_ref/tier/verdict 这类证据字段(它们不属于 skeleton)。
3. 校验器(occupation.validator.ts):至少两个函数——校验单条 skeleton 是否合规(返回结构化错误列表,不是单纯 boolean)、校验一批 edges 是否有悬空引用(需要传入完整 slug 集合)。校验规则必须能同时抓住:①缺层 ②骨架里混入被禁字段(source_ref/tier/verdict/inferred前缀等) ③axis 不在枚举内 ④domain_specifics 超过5条 ⑤edges 引用不存在的 slug。
4. 确定性检查脚本(packages/api/src/occupations/checks/,.mjs,改造自 p2lib 对应文件,函数签名风格保持 checkXxx(occupation) 返回 {pass, failures, details} 一致):
   - 词汇密度/套话黑名单/字段完整度三个维度,字段名与规则要对齐新8层骨架(不是老的A/B层结构)。**注意**:p2lib 老 dim6 里那些具体数字下限(deliverables≥5、tools_systems≥5、eval_metrics≥3等)来自老标准 E:\\Agent program\\coach-wt\\p2lib\\docs\\p2-libraryB-standard-v0.1.md(这份文档在 p2lib worktree 里,不在本仓库 docs/ 下,别去本仓库找),T3 新文档和原稿都没有重申这些具体数字——不要凭空沿用旧数字当作新规则,除非你能在 T3-career-wiki.md 或原稿里找到对应依据;找不到依据的字段完整度检查退化为"必填字段非空+类型正确",在回复里说明这个降级决定。
   - 新增一个 edges 引用完整性检查脚本(T3-career-wiki.md §4 原文要求"脚本查引用完整性")。
   - smoke.mjs 改造版:内含一个新骨架下的 SAMPLE_PASS 与至少一个 SAMPLE_FAIL,跑通全部检查脚本并断言预期 pass/fail。
5. TypeORM 实体(packages/api/src/occupations/entities/ 或就近放置,5个 *.entity.ts):文件名以 .entity.ts 结尾即可被 packages/api/src/database/data-source.ts 的 glob 自动发现,**不需要**手动去 app.module.ts 注册任何 TypeOrmModule.forFeature。
6. 手写 migration(packages/api/src/database/migrations/<当前时间戳的下一个可用毫秒数,取比仓库里最新一个migration文件名时间戳更大的值>-CreateOccupationWikiTables.ts):建5张表+必要索引(至少 occupation_aliases 的 (alias, slug) 唯一索引);纯加法,不碰任何既有表;down() 逆序回滚。DDL风格、column-types.ts 里 TIMESTAMP_COLUMN_TYPE 的用法参照最近的迁移文件(如 1782400000000-ReconfigureGlmPrimary.ts、1781500000000-CreateAnnouncements.ts)。
7. seed 导入器(packages/api/src/occupations/seed-importer.ts):从 content/occupations/<slug>.json + content/evidence/<slug>.json 读取(源目录必须可参数化传入,不许硬编码死路径,否则测试没法指向 fixture 目录),跑校验器,校验不通过必须 fail loud(抛错或返回明确失败结果,不许静默跳过或写入部分脏数据),校验通过才在一个事务里写入5张表。content/ 目录当前在仓库里不存在,属于正常情况(要到量产阶段才会有真实数据),导入器要能在目录为空/不存在时优雅处理(不报错崩溃,返回"无内容可导入")。
8. 测试与合规/违规样例(packages/api/test/,固定 fixtures 放 packages/api/test/fixtures/occupations/,不要放进 content/ 生产目录):
   - occupation-schema-validator.spec.ts:1个合规样例通过;至少覆盖第3点校验器列出的5类违规各一个样例并断言被拒绝、错误信息能定位到具体字段。
   - occupation-checks.spec.ts(或直接以 node 子进程/动态 import() 调用 smoke.mjs 并断言退出码/输出):验证第4点的检查脚本套件在合规/违规样例上表现符合预期。
   - occupation-tables-migration-smoke.spec.ts:参照 packages/api/test/announcements-migration-smoke.spec.ts 的 RecordingRunner 模式,断言5张表的建表DDL(列名/类型/PK/索引)、纯加法(无DROP/无ALTER既有表)、down()对称回滚。
   - occupation-seed-importer.spec.ts:用合规fixture验证能成功导入且可查回;用违规fixture验证被拒绝且不留部分写入(事务回滚)。

## 越界红线(碰了就是范围外,STOP 不做)
- 不写任何 API controller/service/前端页面/路由(§5的 GET /occupations/... 等接口是后续 Agent B 的工作,批4后启动,不在本次范围)。
- 不建700-800条 slug 注册表内容,不跑任何内容生产 workflow(那是独立的 S1-S10 pipeline,需先经用户 go/no-go)。
- 不复用/不导入/不参考 E:\\Agent program\\coach-wt\\p2lib 里除 occupation.types.ts 与 checks/dim1,3,6.mjs 之外的任何 career-explore 代码(wiki.service.ts / wiki-content.service.ts / matching.ts / riasec.ts / career-explore.controller.ts / entities/wiki-occupation.entity.ts 等)——那是已被 T3-career-wiki.md 明确裁决作废的老流水线,未合并进dev。新模块目录/命名不许叫 career-explore。
- **schema 焊死后改动 = 用户审批事项**(02-execution-playbook.md 索引表第7行"特别停点"原话)。本次产出即视为定稿提案:不留 TODO/占位/"后续再完善"字样;设计文档字面有歧义处,按字面精确实现并在最终回复里明确标注你的解读依据,不擅自新增/删减 8 层字段或 axis 枚举值。
- 不引入新 npm 依赖除非确有必要:本仓库现有验证栈只有 class-validator(无 ajv/zod/joi),优先手写零依赖校验器 + 手写 JSON Schema 常量。如确实要引入新依赖(如 ajv),必须在回复里说明"为什么手写不够"并注明你已核实其当前(2026年)真实 API 用法(不许凭训练记忆臆造调用方式),否则一律手写。
- 不碰 packages/web 任何文件(Stage0 纯后端)。
- 不碰 app.module.ts(entities 靠 glob 自动发现,不需要注册;本任务也不加 controller/module 所以没有需要注册进 AppModule 的东西)。
- 不对生产/任何真实 Postgres 实例执行 migration:run;migration 正确性只靠 migration-smoke 的 QueryRunner 录制测试验证,不需要真实数据库连接。
- 不 touch CLAUDE.md、docs/refactor2/ 下任何 .md 文件、docs/refactor2/workflows/ 下任何其它脚本文件。

## 自验(全部完成后,在 E:\\Agent program\\coach-wt\\t3-stage0 里跑,最终回复必须附原始输出)
1. \`cd packages/api && npx tsc --noEmit\`(编译探针,不是测试,但必须0错误)。
2. \`cd packages/api && npm run build\`(nest build 必须成功)。
3. \`cd packages/api && npx jest --runInBand\`(全量必须绿,不只是新增的 occupation 相关测试——证明没有引入回归)。
4. 残留扫描:\`git grep -rn "career-explore" -- packages/api/src/occupations\` 必须为空(没有从老模块抄任何引用/命名);\`git grep -n "source_refs\\|'A1'\\|'A2'\\|'A3'\\|tier\\|entailment" -- packages/api/src/occupations/occupation.types.ts\` 必须为空(骨架类型文件里不能出现证据字段;注意"A1A2A3"只是设计文档里的连写简称,真实代码里会以 tier 字段名或 'A1'/'A2'/'A3' 独立枚举值出现,不要只搜连写的"A1A2A3"字面量,那样永远搜不到东西)。
5. \`git status\`/\`git diff --stat\` 确认只改动了本任务涉及的新文件,没有动到主工作区或任何既有文件(app.module.ts、CLAUDE.md、docs等)。
6. 只 \`git add\` 本任务新增的文件路径,\`git commit -m "feat(occupations): T3 Stage0——骨架schema+校验器+确定性检查脚本+5表migration+seed导入器"\`。

最终回复 = 交付报告:交付清单第1-8项逐条 DONE/SKIP(附原因),关键技术选型决策(JSON Schema落地形式、evidence.verdict取值集合、是否加DB级FK)及理由,第4点校验规则里哪些字段完整度规则被降级为"非空+类型正确"及原因,自验第1-5步的原始输出,commit hash,diff --stat。遇到设计文档与现实坐标对不上、或需要新增依赖但你判断没把握确认其当前API的情况,立即停在该条,报告不猜。`

const GATE = {
  type: 'object', required: ['gates', 'overall_pass'],
  properties: {
    gates: { type: 'array', items: { type: 'object', required: ['name', 'pass', 'evidence'], properties: {
      name: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string', description: '原始输出关键段,失败时含完整错误' } } } },
    overall_pass: { type: 'boolean' },
    notes: { type: 'string' },
  },
}
const REVIEW = {
  type: 'object', required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    findings: { type: 'array', items: { type: 'object', required: ['severity', 'file', 'issue'], properties: {
      severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, file: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } } } },
  },
}

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,工作目录切到独立 worktree E:\\Agent program\\coach-wt\\t3-stage0(实现代理刚在这里提交完毕,先 git log -1 确认在分支 feat/t3-stage0 的最新提交上;若该 worktree 不存在则说明实现代理没有按规程走,直接判定该项目FAIL并写明原因,不要自己创建worktree代跑)。

逐门跑质量门,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事):
1. cd packages/api && npx tsc --noEmit —— 0 错误(这是编译探针,不等同测试,但必须过)。
2. cd packages/api && npm run build —— nest build 必须成功。
3. cd packages/api && npx jest --runInBand —— 全量必须绿(含新增的 occupation-schema-validator / occupation-checks / occupation-tables-migration-smoke / occupation-seed-importer 等 spec,以及仓库既有全部测试无回归)。注意必须从 packages/api 目录跑,从仓库根跑会走 babel-jest 报 TS 语法错,那是环境坑不是代码错。
4. 残留扫描:git grep -rn "career-explore" -- packages/api/src/occupations 应为空;git grep -n "source_refs\\|'A1'\\|'A2'\\|'A3'\\|tier\\|entailment" -- packages/api/src/occupations/occupation.types.ts(或实现代理实际落的骨架类型文件路径,先用 git show --stat 确认路径)应为空(注意"A1A2A3"只是设计文档里的连写简称,真实代码里会以 tier 字段名或 'A1'/'A2'/'A3' 独立枚举值出现,不要只搜连写字面量);确认没有任何文件改动落在 packages/web/ 或 packages/api/src/app.module.ts 或仓库根 CLAUDE.md / docs/refactor2/*.md。
5. migration 命名核对:确认新迁移文件名格式为 <毫秒时间戳>-PascalCase描述.ts,且时间戳大于仓库里此前最新迁移文件的时间戳(不会在 typeorm 迁移记录里造成顺序冲突)。

不改任何代码;测试挂了如实报 FAIL 附错误,不许自己修。任务背景:T3职业维基Stage0——只交付8层骨架的TS类型/JSON Schema/校验器/确定性检查脚本(改造自p2lib)/5张表migration/seed导入器,不涉及任何API/前端改动,schema在设计上被要求这一步就焊死定稿。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP。审计分支 feat/t3-stage0 相对 dev 的完整 diff(可在主仓库或任一 worktree 里跑 git diff dev...feat/t3-stage0,分支引用在同一仓库的所有 worktree 间共享,不需要物理切到那个 worktree 目录)。若 feat/t3-stage0 分支不存在或 diff 为空,说明实现代理没有按规程提交,直接判定 FAIL 并在 findings 里说明"分支缺失/无 diff",不要凭空杜撰 diff 内容、不要判 PASS。

对照下面的设计定稿逐条核实(不满足任何一条都要在 findings 里点名到 file:line):

## 骨架定义(必须逐字段核对)
8层固定骨架:定位层/坐标层/边界层/实操层/入行层/差异层/门槛层/趋势层(层名和层内字段要能对应到 docs/refactor2/T3-总体设计-原稿.md 第一部分表格,不是随便起的名字)。
axis 枚举必须恰好是这10个值(不多不少,拼写一致):product_lifecycle, project_delivery, accreditation_cycle, crop_cycle, case_cycle, patient_flow, fiscal_cycle, academic_cycle, campaign_cycle, ops_routine。
domain_specifics 校验器/schema 必须能拒绝超过5条的情况。

## 5张表(docs/refactor2/T3-career-wiki.md §4)
occupation_slugs / occupation_entries / occupation_edges / occupation_evidence / occupation_aliases 五张表都要建到,关键字段要对得上设计文档表格(尤其 occupation_edges.type 必须是 adjacent/upstream/downstream 三选一,不是 p2lib 老 EdgeType 的 traditional_to_ai/transfers_to)。

## 最重要的一条红线:证据字段彻底移出正文
检查骨架的 TS 类型定义 / JSON Schema 里是否**完全不含** source_ref / A1A2A3 / 蕴含日志(entailment-log) / 自查表(Stage5) / 维度分数 / inferred前缀 这些字段——只要在骨架(skeleton)正文类型里发现任何一个,判 blocking。特别检查是否把 p2lib 老 occupation.types.ts 的 Sourced<T>(value + source_refs 内嵌包装)模式原样照抄过来了——这是设计文档明确裁决要废弃的模式,照抄=blocking。

## 老流水线隔离(T3-career-wiki.md 开篇裁决:老流水线作废,不再续跑)
diff 里新代码不能引用/复制/参考 E:\\Agent program\\coach-wt\\p2lib 分支里 occupation.types.ts 与 checks/dim1,3,6.mjs 之外的任何 career-explore 代码(wiki.service.ts/wiki-content.service.ts/matching.ts/riasec.ts/career-explore.controller.ts/entities/wiki-occupation.entity.ts等)。新模块目录/命名不能叫 career-explore。

## 范围纪律(找越界)
diff 里不应出现:任何 packages/web/ 文件、任何新增的 API controller/module/前端路由、700-800条 slug 内容/注册表数据、对 app.module.ts 的改动(entities 靠 data-source.ts 的 glob 自动发现,不需要手动注册)、对 CLAUDE.md 或 docs/refactor2/*.md 或 docs/refactor2/workflows/ 下其它脚本文件的任何改动。任何范围外文件改动都点名 blocking 或 major(视影响大小)。

## migration 正确性
新迁移必须是纯加法(只 CREATE TABLE / CREATE INDEX,不 ALTER/DROP 任何既有表),down() 必须逆序回滚且与 up() 对称,文件名/类名符合 <毫秒时间戳>-PascalCase.ts 约定。

## 合规/违规测试样例的真实性(防止"形式合规但没测到实质")
检查 occupation-schema-validator.spec.ts(或实现代理实际命名的等价文件)是否真的对下面5类违规各有一条独立样例并断言被拒绝,而不是只测了1-2种就号称覆盖:①缺某一层 ②骨架混入被禁的证据字段 ③axis不在枚举内 ④domain_specifics超5条 ⑤edges悬空引用。少于5类中的任意一类判 major。

## 依赖纪律
若 diff 里 package.json 新增了依赖(如 ajv/zod/joi),核实 impl_report 里是否说明了"为什么手写不够"及"已核实当前API用法"——没有合理说明的新依赖判 major。

不改任何文件。verdict 用 PASS/FAIL;findings 为空数组时才允许 PASS;有任意 blocking 一律 FAIL。`

phase('侦察')
const checklist = await agent(RECON_PROMPT, { label: 'recon:t3-stage0', phase: '侦察', model: 'sonnet' })

if (!checklist) throw new Error('侦察代理未返回,中止后续实现')

phase('实现')
const impl = await agent(IMPL_PROMPT + '\n\n## 侦察产出的执行清单(照此逐条做,行号/坐标漂移以内容定位为准,清单里的[缺失-需人工]条目停下报告不猜)\n' + checklist,
  { label: 'impl:t3-stage0', phase: '实现', model: 'sonnet' })

if (!impl) throw new Error('实现代理未返回,中止后续验证')

phase('验证')
const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t3-stage0', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t3-stage0', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
