# 设计:女娲式统一求职代表(career-principal 升级)

- 日期:2026-06-01
- 状态:已批准方向(用户授权自主执行),分两批实施
- 范围:**仅 skills 层** `career-skills-marketplace/`,不碰 `packages/`(SaaS),不做仓库重构
- 来源:阶段0 摸底+实时调研工作流 `wf_1af0f1ed-31b`(6 路测绘 + 2 路调研 + 综合设计)

## 1. 北极星

把 `career-skills-marketplace` 养成**一个女娲式统一求职代表**:`career-principal` 作单一入口、手握全部 worker 当工具(校招诊断 + 模拟面试 + JD + 简历 + offer + 市场情报 + 职业战略),用起来像跟一个懂行的人**连贯聊天**——marketplace 的能力体量,单 skill 的体验。**全部打通**,不只"诊断→面试"。

三条操作底线 + 质量底线:
1. **主动全面**:主动想到用户没提但该看的维度,而非问一句答一句。
2. **句句有源**:所有产出标来源;只有"非人工不可核实"的才要用户确认,其余标出处即可,不动辄压低 confidence / 塞 cannot_determine。
3. **时效信息当场联网**:宿主(Claude Code CLI/Codex)本就有 WebSearch/WebFetch,需要时当场搜、附 URL、标"实时·未核实·日期",无网才降级说明。
- **质量底线**:效果不差于用户直接把 JD+CV 扔给 Opus 4.8 自由讨论谋略。

## 2. 现状与六大差距(阶段0 实证)

能力体量已到位(40 意图 / ~37 worker / 厚知识库),但**体验仍是机械路由器**:

| # | 差距 | 严重度 | 证据(file:line) |
|---|------|--------|------------------|
| G1 | **实时联网被架构性禁用**:allowed-tools 仅 Read/Grep/Glob,SKILL/README 把实时能力锚在不存在的"adapter"上,默认对外宣称"上不了网" | high | career-principal/SKILL.md:22,:278; README.md:191; contract.yaml:77 |
| G2 | **口径过紧**:confidence 硬 `min()` 全局连坐 + 多重 ceiling,把"带出处的合理推断"也压成 low+cannot_determine;evidence enum 缺 `market_prior`(写出来即 schema 非法) | high | SKILL.md:316-321; confidence-levels.yaml:73-76; evidence.schema.json:23-39 |
| G3 | **被动非主动**:无"该看哪些维度"的主动盘点机制(调研已产出 15 个高价值校招谋略维度,候选人常忽略) | high | SKILL.md:32-37,:90 |
| G4 | **链路不通**:无跨意图续接图;output schema 无 `next_intent`/`handoff_payload` 承载字段;campus 诊断在编排层是孤岛(secondary_skills:[]、orchestration-rules 0 次出现、intent enum 缺它) | high | orchestration-rules.md §7/§11; intent-router.yaml:68-86; output_schema.json:54-62 |
| G5 | **路径装后必断**:campus 全用裸 `knowledge/`、`shared/` 路径;install 把 `shared/*` 打平进 `_career-skills-shared/`、`knowledge/` 整目录拷进 `_career-skills-shared/knowledge/`,装后 91 标尺/schema 全 resolve 不到(数据没丢,纯前缀问题);全仓 ~13 个 contract.yaml 的 `knowledge_dependencies.path` 与 `policy_reference` 也有同类裸路径 | high | campus SKILL.md:35,52,126-133; install.ps1:56-59 |
| G6 | **600 公司 92% 死料**:仅 50 家 tier_1 被消费且仅作降级兜底;tier_2/3(550 家)+ aliases(2504 条)0 引用;且与 campus 诊断割裂 | high | validate-all.mjs:145; campus contract.yaml:111-123 |

## 3. 设计决策

### 3.1 路径约定统一(解 G5)
**唯一运行期约定 = 从 skill 目录出发的 `../_career-skills-shared/...`**。三条规则:
1. 共享策略/schema **去掉 `shared/` 中间层**:`shared/policies/x` → `../_career-skills-shared/policies/x`;`shared/evidence-schema/x` → `../_career-skills-shared/evidence-schema/x`;`shared/output-schema/x` → `../_career-skills-shared/output-schema/x`。
2. knowledge **保留 `knowledge/` 前缀**:`knowledge/x` → `../_career-skills-shared/knowledge/x`。
3. skill 自带的 `scripts/`、`references/` **保持裸路径**(随 skill 目录拷贝,装后就在 `~/.claude/skills/<skill>/` 下)。
- 新增 `scripts/validate-resource-paths.mjs`:扫所有 SKILL.md/contract.yaml,出现裸 `knowledge/` 或裸 `shared/`(非 `../_career-skills-shared/` 前缀、非自带 scripts//references/)即报错;接入 `validate-all.mjs` 成 CI 闸门防回归。

### 3.2 联网姿态纠正(解 G1,底线3)
删除全仓"adapter / 不假装联网"框架。默认姿态改为"**遇时效信息当场 WebSearch/WebFetch、附 URL、标实时·未核实·日期;确无网才降级并说明此为训练知识可能过时**"。allowed-tools 补 `WebSearch`+`WebFetch` 给:`career-principal`(单一入口)、`opportunity-intelligence`、`interview-intelligence`(后两者 marketplace 标 live_research_required:true 但工具缺)。已有 web 工具的 miner 类只改措辞(从"拿不到当默认态"→"先搜再说,搜不到才返回空并写明检索路径")。**注**:allowed-tools 是"预授权免确认"不是沙箱(官方文档 + issue #18837/#37683),加它仅减少打断,工具本就可用。

### 3.3 主动全面(解 G3,底线1)
新增 `references/coverage-checklist.md`:15 个谋略维度(每项标 中国校招特调点 + 是否挂实时联网 + 对应可调度 skill)。①招聘时间窗口/批次 ②同岗竞争强度/供需比 ③内推/隐藏渠道(真伪内推) ④谈薪空间与筹码 ⑤总包结构拆解 ⑥业务线/团队/部门选择 ⑦公司/行业风险信号 ⑧长期职业路径联动 ⑨城市/落户红利 ⑩三方协议与违约风险 ⑪冲稳保梯度自评 ⑫公司/行业研究深度 ⑬申请时机微操 ⑭面试双向评估与黄金前7分钟 ⑮实习转正与 AI/ATS 适配。
- **主动度(open-q 决议)**:按用户目标**动态选 3-5 个最相关维度**主动点出("你还没提但建议一起看 X/Y,因为…"),把选择权交还用户,不一次性全做完;**高损失维度(三方违约⑩/落户红利⑨)一旦情境相关必点**,避免错过损失大。SKILL.md 新增"主动盘点(proactive coverage sweep)"节触发它。首次使用最小画像采集(称呼+背景+目标)从原则提升为**编排前置硬步骤**(识别流程第 0 步)。

### 3.4 跨意图续接(解 G4,北极星核心)
新增 `references/next-intent-graph.yaml`:每意图定义 `on_complete` 续接候选 + 触发条件 + `handoff_payload`(携带就绪入参)。关键链:
- `analyze_jd`→(有简历)`match_diagnosis`;`match_diagnosis`→(强匹配)`tailor_resume`+`plan_application_strategy`,(有 gap)`skill_gap_planner`,(任意)`interview_prep`;
- `campus_diagnosis`→ 把 `interviewHooks` 当弹药提议 `mock_interview`/`build_stories`,`gap`→`skill_gap_planner`/`learning_roadmap`,`rewrite_suggestions`→`tailor_resume` 复核,目标公司→`company_check`/`interview_intelligence`;
- `offer_evaluation`/`compare_offers`→`salary_check`/`audit_company_risk`/城市落户。
- **诊断→面试核心链**:把 match-diagnosis 的 `gap` 与 campus 的 `interviewHooks` 定义为 `mock-interviewer`/`behavioral-story-builder`/`question-bank-builder` 的合法入参。orchestration-rules.md 新增 **§12 续接层**。
- **续接=提议+用户确认才执行**(`suggested_next` 标 optional/recommended),默认不自动连跳,防失控长链。
- **会话级输入复用**:已得的 resume_text/jd_text/user_profile/上一意图产出,续接时直接复用、跳过 required_inputs 追问(防"失忆"重复索要)。
- **区分语义**:`secondary_skills`=本次同一调度内辅助 worker(一锅端);`suggested_next`=本意图完成后顺势提议的下一意图(分步、条件触发)。

### 3.5 公司背景层(解 G6,Q1 方案)
公司库 = **按需注入的背景增强**,非主路径硬依赖,缺失优雅降级、绝不阻塞。新增 `references/company-lookup.md`(career-principal/campus/相关 worker 复用):
- 按 tier 三级降级:①Grep `companies.seed.yaml`(50 家 tier_1,字段最全)命中即注入,标 `knowledge_graph`+`freshness:stale`;②未命中先过 `aliases.yaml`(2504 条)规范化("鹅厂=腾讯")再回查;③降到 tier_2(250)→tier_3(300,标 confidence:low+needs_verification);④全未命中或需当季信息→按需联网(见 3.2)。
- **盘活 92% 死料**:把 aliases/tier_2/tier_3 接进降级链(无需补数据,只补查询路径)。
- **campus 接入**:新增可选输入 `target_company`;命中时把 `interview_style.known_focus` 喂进阶段3 `interviewHooks`(面试追问预演贴合该公司真实考点)、`risk_signals` 提示进 honesty_boundary;查不到则按通用标尺并注明。**公司情报只增强 interviewHooks/风险提示,不改标尺维度与满分(locked rubric 防漂移红线不破)。**

### 3.6 标源口径松绑 + 防编造全局化(解 G2,底线2)
- **废 `min()`,改分维度标源标置信**:综合结论按维度/子结论分别给 confidence+来源,只在确有跨维度依赖时局部降级;启用被架空的 `dimension_level_visibility` 为强制项;主 summary 给"最关键维度置信"而非全局最低值。
- **cannot_determine 仅留"非人工不可核实"**:用户本人才知道的真实经历/GPA/未公开内部薪资档;其余标出处即可。**多源冲突(open-q 决议)= 显式并列多方+标口径(如"脉脉口径供需比2.09,智联口径17.2份/岗"),不判 cannot_determine、不取中位数硬编。**
- **固定标源标签**(内联,生成时即绑定来源,优于事后补标):`[据JD]`=jd_text、`[据CV]`=user_resume、`[据知识库]`=knowledge_graph、`[行业惯例]`=market_prior、`[推断]`=ai_inference、`[实时·未核实·URL·日期]`=web_search。
- **修 market_prior schema 非法**:evidence.schema.json 的 source_type enum 增补 `market_prior`。
- **防编造范式全局化**:把 campus 三招提为全仓闸门——①把 `campus/scripts/check_fabrication.mjs` 提炼到 `shared/scripts/check_fabrication.mjs`(子串+数字确定性校验,退出码0/1/2),供 resume-tailor/behavioral-story-builder/personal-brand-builder/portfolio-project-advisor 复用;②逐条引语回溯 ③locked rubric 防漂移,写进 product-principles.md 成通用交付前 verify。
- **resume-tailor 收敛 NEED_USER_CONFIRM**:按 campus 二分——可逐字/逐事实溯源→标出处即 PASS;原材料没有、非用户不可核实→才走 gap_advice 式确认。
- **禁装饰性引用**:标 `[实时·URL]` 的 URL 必须本轮真 WebFetch 过;标 `[据JD/CV]` 的必须能定位原文片段;严禁编造权威 URL/来源标题。

### 3.7 输出规范(承载续接 + 可机械校验)
- base schema:`next_actions` 提升进 required(37 skill 实际都已必填);新增 `suggested_next`(数组:`next_intent`/`reason`/`ready_inputs[]`/`optional|recommended`);`evidence_used.items` 收紧为引用 evidence.schema.json 核心子集(source_type/source_name/source_url/content_excerpt/freshness/reason)。
- career-principal/output_schema.json:`intent_detected` enum 从 13 补到与 router 的 40 对齐(含 campus + Pack A/B/C/D);废弃 SKILL.md:291-313 的 `aggregated_result/key_findings/next_steps` 嵌套示范,改与 schema 一致;4 个 examples 同步改为可过 schema。
- validate-all.mjs 扩展:校验 evidence_used.items 含来源子集 + intent_detected 在 enum 内 + suggested_next 结构合法 + "router 意图集 == output_schema enum 集"一致性 + 接入 validate-resource-paths.mjs。

## 4. 实施计划(两批,step→verify)

### 批1:路径统一 + 联网姿态(纯 bug 修复,低风险先发)
1. 全仓裸路径 → `../_career-skills-shared/...`(campus 全量 + ~13 contract.yaml 的 knowledge_dependencies/policy_reference + 各 SKILL.md 末尾裸 shared/);删 campus "路径以 marketplace 根为基准" → **verify**:`validate-resource-paths.mjs` 0 报错。
2. 新增 `scripts/validate-resource-paths.mjs` 并接入 validate-all.mjs → **verify**:故意插一条裸 `knowledge/` 能被它抓到(exit≠0),修回后 exit 0。
3. 联网姿态:删 career-principal SKILL.md:22/:278 + README:191 的 adapter/不假装联网,改"当场搜+标实时·未核实+无网才降级";miner/interview-intelligence/playbook 降级措辞改"先搜再说";allowed-tools 给 career-principal/opportunity-intelligence/interview-intelligence 补 WebSearch+WebFetch → **verify**:grep 全仓无 "adapter"/"不假装联网" 残留;3 个 skill frontmatter 含 WebSearch+WebFetch。

### 批2:续接图 + 主动盘点 + 口径松绑 + 公司层 + 防编造全局化(行为变更,要 evals)
4. 新增 next-intent-graph.yaml + orchestration §12 + suggested_next 字段 + intent enum 对齐 → **verify**:每意图有 on_complete;校招诊断 eval 续接到 mock_interview 带 interviewHooks。
5. coverage-checklist.md(15 维)+ SKILL.md 主动盘点节 + 首次画像前置 → **verify**:eval"只给 JD"时代表主动点出 3-5 相关维度且含高损失维度。
6. 口径松绑:删 min() 改分维度置信 + market_prior enum + 固定标源标签 + cannot_determine 收敛 → **verify**:happy-path 强匹配维度可出 high 不被连坐;hallucination-guard 两端都守(不连坐降级、不无据强结论)。
7. 公司层:company-lookup.md + campus target_company + interviewHooks 注入 → **verify**:给"字节后端"诊断时 interviewHooks 含字节 known_focus;查不到的公司优雅降级;标尺维度/满分不变。
8. 防编造全局化:shared/scripts/check_fabrication.mjs + resume-tailor 接线 + product-principles verify → **verify**:伪造数字 exit1、合规 exit0;resume-tailor 可溯源扩写不再误判 NEED_USER_CONFIRM。
9. schema/examples 同步 + 端到端续接 example(campus→提议模拟面试→确认→mock 接 interviewHooks) → **verify**:全 examples 过 schema;validate-all.mjs 全绿。

## 5. 验收(evals,质量门)
- **可安装**:模拟 install 布局后,campus 与各 skill 的资源路径全 resolve(validate-resource-paths.mjs 绿)。
- **联网**:时效维度(招聘时间窗/薪资/公司动态)当场搜、附 URL、标实时·未核实;无网优雅降级。
- **主动全面**:仅给 JD+CV 时,代表主动盘点 3-5 相关维度 + 必点高损失维度,不变长问卷。
- **句句有源 + 不过度确认**:每条主张有标源标签;cannot_determine 只含非人工不可核实项;多源冲突显式并列。
- **链路连贯**:诊断完顺势提议面试/改简历/补技能并复用上下文不重复追问;续接需用户确认不自动连跳。
- **防编造**:check_fabrication 全仓闸门有效;locked rubric 不漂移。
- **质量底线**:端到端样例效果 ≥ 直接把 JD+CV 扔 Opus 自由谋划(对抗式审查 + 样例对照)。

## 6. 风险与缓解
- 改动面广 → 分两批,批1 纯 bug 先发。
- 口径松绑过头滑向"过度自信" → hallucination-guard 守两端,"非人工不可核实才确认"作硬边界。
- 防编造脚本提到 shared 后复用方调用路径变 `../_career-skills-shared/scripts/check_fabrication.mjs`,campus 自己仍裸 `scripts/`(随目录走)→ 两入口路径不同,各自 SKILL.md 写对,纳入 validate-resource-paths 例外。
- 续接自动连跳失控 → 强制"提议+确认",默认不自动执行下一意图。
- 入口 SKILL.md 撑爆 <500 行 → 展开放 references/ 渐进披露,入口只留触发器+导航。
- enum 与 router 再次脱节 → validate-all 加"router 意图集 == enum 集"一致性校验。

## 7. 不在本轮范围
- SaaS(packages/)、仓库重构/hrbp 同步(用户"暂时只做 skills 层")。
- role-taxonomy(30 角色)与 campus 91 职业两套体系映射对齐(记录为已知重叠,留后续)。
- 付费意向探针(用户先前已搁置)。
