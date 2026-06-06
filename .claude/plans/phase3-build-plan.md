# Phase 3 反哺建造计划 + 统一范式(13 模块,覆盖 16 能力)

> 目标:把插件 16 能力做进 SaaS Web,**用后端编排放大**让 SaaS ≥ skills(定位见 memory project-saas-vs-skills-positioning)。
> 全部走统一 AI 网关 `packages/api/src/ai/ai.service.ts`,**不直连 LLM**。**严禁碰 newspaper/feed/digest(用户延后)。**

## 一、统一建造范式(每个模块照此,保证一致)

### 后端(样板:`packages/api/src/cover-letters/`)
- 文件:`<feature>.module.ts` / `<feature>.controller.ts` / `<feature>.service.ts` / `dto/*.dto.ts`(+ `entities/*.entity.ts` 仅当需要持久化)。
- Controller:`@Controller('<feature>')` + `@UseGuards(JwtAuthGuard)`(`../common/guards/jwt-auth.guard`)+ `@CurrentUser() user:{id:string}`(`../common/decorators/current-user.decorator`)+ `@Body() dto`。
- Service:注入 `AiService`(`../ai/ai.service`)。结构化输出用 **`this.ai.completeStructured<T>({ system, prompt, toolName, toolDescription, schema })`**(纯文本才用 `complete`)。`schema` = 该 worker 的 output_schema 核心(JSON Schema)。
- Module:`imports:[AiModule, (TypeOrmModule.forFeature([Entity]) 仅持久化时)]`,`controllers/providers/exports`。
- **防编造 = 两层(本阶段的核心价值,务必做实)**:
  1. **系统提示硬规则**:把源 worker `key_logic_to_port` 的防编造规则逐条写进 `system`(如 cover-letters 的「硬性规则」段),中文。
  2. **服务端确定性 guard**:AI 返回后用代码强制校验/收口(不只靠提示词)。例:offer<2 直接 400;confidence<medium 时代码删掉 weighted_scores 伪分;薪资四要素缺失代码强制 grade=C/range=null;evidence_basis 必须能在输入里定位否则剔除。这是"后端放大"——GLM-5 之上加确定性护栏。
- 输入不足:按 worker 约定返回 `confidence:'insufficient'` + 缺失字段说明,或 400(参数非法),**绝不编造**。
- 类型严格无 any;响应不泄漏 user_id(如有 entity)。

### 持久化(仅需要的模块)
- 无状态分析(offer/networking/role-transition 等)**不建 entity**,POST 即算即返。
- 需沉淀的(question-bank)建 entity + TypeOrm,响应经 DTO 去 user_id。

### 测试(`packages/api/test/<feature>.e2e-spec.ts`)
- env:`beforeAll` 设 `process.env.DB_TYPE='sqlite'; DB_PATH=':memory:'; CLOUDDREAM_API_KEY='test-key'`;`Test.createTestingModule({imports:[AppModule]}).overrideProvider(AiService).useValue(mockAiService)`(样板见 newspaper.e2e/mock-sessions.e2e)。
- **正常**:mock AiService 返回合法结构 → 断言 controller/guard 处理正确 + 防编造 guard 生效(喂"伪造数字/无依据"的 mock 输出,断言被服务端 guard 剔除/降级)。
- **异常**:参数缺失/非法 → 400;输入不足 → confidence insufficient。
- **AI 决策/执行力(live)**:`const LIVE = process.env.RUN_AI_LIVE==='1'; (LIVE?describe:describe.skip)('<feature> (AI live)', ...)` 真调 AiService 验证 AI 能产出合规结构。默认 skip(不烧 API/确定性绿)。
- 跑:`pnpm --filter @coach/api exec jest --config ./test/jest-e2e.json <feature> --runInBand` 默认全绿。

### 前端(`packages/web/src/app/(main)/<feature>/page.tsx`)
- ⚠️**先读 `node_modules/next/dist/docs/` 相关指南再写**(packages/web/AGENTS.md:这版 Next.js 有破坏性改动,别凭训练记忆)。
- `'use client'`;用 `api`(`@/lib/api`)调后端;类型加进 `@/lib/types`。
- 表单录入 → 调 API → 结果面板。**四态齐全**:loading / error / 空态(用户向中性文案,不暴露运维) / insufficient(展示缺失项与追问)。全中文、无 mock、无空 onClick。
- 视觉沿用现有页(CSS 变量 `--color-*`、lucide-react 图标、卡片风格),参考 career/page.tsx、cover-letter 页。

### 注册(为避免并行冲突,**agent 在自己 worktree 注册+自测,但报告里给出精确注册行,协调者统一集成**)
- app.module.ts:`imports` 加 `<Feature>Module`。
- `(main)/layout.tsx` 的 `buildToolNav()` 加一项 `{ id, label:'中文', href:'/<feature>', icon:<Icon size={16}/> }`(选 lucide 图标)。
- 报告中明确列出:加了哪个 Module import、buildToolNav 加了哪行、用了哪个图标 —— 供协调者无冲突重放。

### 红线
不直连 LLM(必走 AiService)/ 不 mock 生产数据 / 不空按钮 / 防编造服务端 guard 必做 / 报告 PASS 必附 lint+build+jest 真实输出 / 不碰 newspaper·feed·packages/api 的 ai·config(已定稿)/ 不 git commit(协调者收口)。

---

## 二、分批计划(高价值先行)

### Batch 1（HIGH,4 模块,新建为主 + 1 扩展)
| 模块 | 类型 | 端点 | 源 worker | 防编造要点(服务端 guard) |
|---|---|---|---|---|
| **offer-comparator** | 新建 | POST /offer-comparator/compare | offer-comparator | offer<2→400;confidence<medium 删 weighted_scores 伪分;工时未知 hourly_rate=null |
| **networking** | 新建 | POST /networking/message + /networking/referral-strategy | networking-message-writer + referral-strategy | 无联系人→referral_paths 空、不虚构;禁"我们很熟"等不实关系;冷接触不标高成功率 |
| **salary-analysis** | 扩展 salary | POST /salary/analyze | salary-radar | 四要素(year+city+role+source)缺任一→grade=C;无来源→range=null;缺 role/city→insufficient 追问 |
| **role-transition** | 新建 | POST /role-transition/analyze | role-transition-advisor | feasibility 四档按 gap 数;evidence_used 必锚定 profile 字段;same_role→改推路径规划;extreme_gap→not_feasible |

### Batch 2（HIGH/MED,4)
| interview-prep | 新建(4合1) | POST /interview-prep/{playbook,star-stories,tech-coach,case-coach} | company-interview-playbook + behavioral-story-builder + technical-interview-coach + case-interview-coach | 薪资估算无来源→null;无面经→cannot_determine;STAR result 不编量化数字;tech 非技术岗→400;case interview_type 非法枚举→400 |
| learning-roadmap | 新建 | POST /learning-roadmap/build | learning-roadmap-builder | 空 skill_gaps→error;>10 项只处理 critical;完成标准须可验证;不推具体课程名 |
| question-bank | 新建(持久化) | POST /question-bank/generate + GET /question-bank | question-bank-builder | 频率/来源不得推断标高频;source 必填;无数据标"知识图谱通用"+gaps;answer_hint 只给要点 |
| follow-up | 新建 | POST /follow-up/generate | follow-up-message-writer | 感谢信缺真实面试细节→降 confidence;禁"尽快/急";除 offer 回复外≤150字 |

### Batch 3（MED,5)
| personal-brand | 新建(品牌+作品集) | POST /personal-brand/{brand-strategy,portfolio-advice} | personal-brand-builder + portfolio-project-advisor | profile insufficient→error;evidence_basis 必锚定真实经历;无项目基础→low+说明 |
| industry-trend | 新建 | POST /industry-trend/analyze | industry-trend-analyst | 无实时来源→confidence insufficient+信号数组空+outlook unknown,禁用训练数据推断 |
| application-strategy | 扩展 applications | POST /applications/strategy | application-strategist | 禁输出具体公司名(只类型/规模);缺 profile→insufficient;时间窗过期明确告知 |
| education-path | 新建 | POST /education-path/analyze | graduate-school-vs-job-advisor | 缺 education→error;在职(经验≥3)切在职读研框架;禁情绪化建议;算机会成本;不推超 GPA 目标 |
| city-industry-fit | 扩展 salary | POST /salary/city-industry-fit | city-industry-fit-advisor | 适配加权公式;禁超 constraints.location 城市;每条引 profile 字段;禁"北上广机会多"泛化 |

## 三、集成纪律(协调者)
每批:并行派 implementer(各自 worktree,Sonnet,复杂上 Opus)→ 各自 build+jest+lint 绿 → 协调者 `git checkout <branch> -- <新文件/目录>` 抓新文件 → 统一在 app.module.ts + layout.tsx 注册一次(无冲突)→ 主树 `pnpm --filter @coach/api build` + e2e(默认套件)+ `@coach/web lint+build` 全绿 → 提交 → 下一批。Phase 4 做整体 review + 多用户体验评测 + 降级演练。
