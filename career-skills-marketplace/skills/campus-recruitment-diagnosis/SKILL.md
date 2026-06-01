---
name: campus-recruitment-diagnosis
description: >
  校招简历诊断、打分与改写。针对应届生/校招生,按目标职业的锁定标尺逐维评分、列差距、预演面试追问、给防编造改写建议。
  覆盖 11 大类岗位:技术研发(后端/前端/算法/测试/运维/大数据/安全/游戏)、产品运营(产品经理/运营/电商/增长/新媒体)、
  设计(UI/UX/视觉/交互/工业/动效/用研/3D)、数据(数据分析/数据科学/数仓/BI)、市场销售(市场营销/销售/品牌公关/BD/投放)、
  金融(证券研究/投行/风控/量化/银行/资管/精算)、财务(管培/审计/会计/FP&A/税务/内审)、
  人力资源(招聘/HRBP/薪酬/OD/培训)、职能法务(法务/供应链/客服/采购/PMO/合规/知产)、咨询战略(管理咨询/商业分析/战略)、
  行业垂类(快消管培/医药代表/地产/教育/工艺/质量/CRA/店长)。触发词:校招、应届、简历诊断、简历打分、简历改写、面试追问、求职。
allowed-tools: [Read, Grep, Bash]
---

# campus-recruitment-diagnosis — 校招简历诊断技能

本 skill 是**路由 + 工作流**,自身不内联评分标尺;每次诊断**只按需读取**所选职业 1 个标尺文件。

## 一、何时用

用户是**应届生/校招生**,需要:针对某个**目标职业**做简历**诊断打分**、看**差距**、预演**面试追问**、或要**简历改写**。
非校招(社招/转行/中高级岗)请改用 `match-diagnosis` 等社招技能。

---

## 二、Phase 0 — 输入路由(先到位再开工)

**必要信息**:① 简历正文(`resume_text`) ② 目标职业(`target_profession`)。

| 缺什么 | 怎么办 |
|--------|--------|
| 缺简历 | 追问「请贴上简历正文(经历/项目/技能/竞赛荣誉)」,无简历不诊断 |
| 缺目标职业 | `Grep` 标尺索引从简历推断 1-2 个候选 → 让用户确认(见下) |
| 难度档未提 | 默认 `standard`(校招友好档);**仅当**用户提「压力档/大厂卡人/想被狠批」才用 `pressure` |
| 职业找不到精确项 | 取**最相近**职业,**显式告知**「未找到精确标尺,按最接近的 X 评估」,`confidence` 降为 `medium` |

**从简历推断职业**:`Grep` 关键词到 `../_career-skills-shared/knowledge/campus-recruitment-rubrics/index.md`(如 Java/分布式→后端;Figma/交互稿→设计;尽调/估值→投行),取命中大类下 1-2 个候选,列给用户二选一。

**追问纪律(绝不死循环)**:每轮 ≤2 问,每问附「为何需要」(如「想知道你主导还是参与,关系到能力维度评分」)。**最多 2 轮**;到顶仍缺,用现有信息出结论并把 `confidence` 标 `low`、缺口写进 `cannot_determine` 与 `follow_up_questions`。遵循 `../_career-skills-shared/policies/product-principles.md` 的 ask-before-judging。

**Checkpoint 1**:把「确认的目标职业 + 难度档 + 选用的标尺文件」回报给用户确认后,才进入打分。

---

## 三、四阶段工作流(每阶段做完勾 verify)

### 阶段 1 · 解析(parse)
- [ ] 把简历结构化:基本信息/工作实习/教育/项目/技能/**竞赛与荣誉**/链接作品集。
- [ ] **忠实读取**:竞赛名次、证书/语言成绩(如「六级480分」「ACM 区域赛银牌」)**照抄原文具体分数/名次**,不得漏读、不得臆断「未标注分数/暗示不高」。
- [ ] 用**中文标签**呈现;**严禁回显英文字段名**(如 `basic_info`/`work_experience`/`skills.soft`),术语中文化(soft skills 写「软技能」)。
- verify: 简历里每段竞赛/荣誉/成绩都被收进结构里 ✅;输出文本里搜不到任何英文 key ✅。

### 阶段 2 · 打分(score)
- [ ] `Grep` `../_career-skills-shared/knowledge/campus-recruitment-rubrics/index.md` 定位所选职业 → `Read` 对应 `../_career-skills-shared/knowledge/campus-recruitment-rubrics/professions/<id>.md`,取其为**锁定标尺(locked rubric)**:维度、各维满分、好的样子、应届证据、常见缺失/反模式。
- [ ] **证据优先三步**(逐维执行):
  1. 从简历**抽原句**填进该维度 `evidenceFound[]`(无则空数组);
  2. 对照标尺 `常见缺失` 逐条比对,把简历**没有**的列进 `gap`;
  3. 落**离散行为档**:有相关经历且有量化→中高档;有经历但**完全无量化数字**→明显低于及格的低档;**完全空白**→极低分。此规则对所有维度一致,不选择性放宽。
- [ ] 每维 `score` 封顶该维满分,`total_score` = 各维之和。
- [ ] 每维 `why`:① 落到简历**具体事实**(技术栈深度/项目决策/实习公司+业务数字/竞赛名次);② 命中标尺反模式**直接点名**(如「CRUD仔」「八股背诵机」「语言搬运工」);③ `why` 与分数一致,不得「给高分却 why 全是缺口」。
- [ ] **打分话术红线**:`why`/`evidenceFound`/`gap`/`conventionChecks.note` 等所有用户可见文本**严禁**出现内部计算/比例措辞——「满分的X%」「给到满分的约X%」「给分不超过…」「扣X分」「上限调整」「修正为X分」「故给满分」一律违规;只陈述最终结论(如「核心能力缺失,仅给基础分」)。
- [ ] **本土惯例核查**:按标尺「本土惯例与硬规则」逐条核(如技术栈分精通/熟悉/了解三档、项目须有 GitHub 或大厂实习、竞赛含金量排序),落进 `conventionChecks[]`(status: pass|warn|fail)。
- verify: 维度数量/顺序/满分与 `professions/<id>.md` 完全一致 ✅;搜不到任何「满分的X%/扣X分」内部话术 ✅;`total_score` = 各维之和 ✅。

### 阶段 3 · 面试追问预演(interviewHooks)
- [ ] 针对**得分低**或**表述可能夸大/被质疑**的点,给 2-4 条 `interviewHooks`:
  - `resumeHit`:简历中的具体命中点或原句;
  - `interviewQuestion`:面试官很可能据此追问的问题;
  - `prepDirection`:**诚实**的准备方向,引导补齐真实能力,**绝不教编造**。
- verify: 每条都锚定简历真实存在的句子 ✅;prepDirection 无「这样回答就行」式话术诱导 ✅。

### 阶段 4 · 防编造改写(rewrite_suggestions)
**前置 Checkpoint 2**:先把诊断结果展示给用户,**问是否需要改写**;不要未问就改。

生成 3-5 条建议,**严格区分两类**:
- **改进型**(`type` ∈ `rewrite`/`quantify`/`restructure`/`add_keywords`):只对简历**已有原句**做表达/结构/量化优化。
  - `original` **必须是简历原文一字不差**;
  - `suggested` **不得加入原句没有体现的能力/动作/技术名词/分析变量**(「做了缓存」≠「布隆过滤器/多级缓存」;「参与尽调」≠「独立负责尽调」;「用 Figma 画图」≠「Auto Layout 组件化」);
  - **数字铁律**:`suggested` 里每个具体数字都要能在简历原文**逐字找到**;简历没有的数字一律写 `[具体数字]` 占位,**绝不填具体数值**(反例:「回收约300份」不得改成「发放350份、回收率86%」)。
- **建议补充型**(`type` 必须用 `gap_advice`):凡简历**没有**、需候选人额外具备的能力/经历,一律走此类。
  - `original` **必须为空字符串** `''`;
  - `suggested` 写成**给候选人的行动建议**(「若你确实做过X,可这样描述…;否则先补齐X再写入」),**绝不写成可直接粘贴的成品句**;
  - `reason` 必须标注「**面试穿帮风险:高——需你真实具备后再写入**」。
- **缺口铁律**:阶段 2 列进 `gap` 的能力一定是简历没有的,**绝不能**在改进型里当作已具备补进 `suggested`,只能进 `gap_advice`。

**自校验三招(交付前必须全过)**:
1. **确定性兜底**:有 `Bash` 工具时跑 `scripts/check_fabrication.mjs`(传入简历原文 + 改写建议 JSON),它对改进型逐条做「original 是否是简历子串」「suggested 里的数字是否都在简历中出现」的机械校验,任何一条不过 → 该条降级为 `gap_advice` 或改回 `[具体数字]` 占位。
2. **逐条引语回溯自证**:对每条改进型,自己把 `suggested` 相对简历**新增的实质内容**(能力/方法/工具/变量/数字/经历)列出来,凡简历无支撑 → 打回降级。把握不准从严,宁可打回。**注意:招 1 脚本只抓「伪造数字」与「凭空原句」,抓不到「无数字的动词/能力夸大」**(如把「参与/协助」改成「主导/独立负责」、把「用了缓存」夸成「设计了多级缓存」)——这类只能靠本招逐条揪出,必须打回。
3. **locked rubric 防漂移**:全程只用阶段 2 读入的那一个标尺文件,不凭记忆改维度/满分/反模式名。
- verify: `scripts/check_fabrication.mjs` 退出码 0(或无 Bash 时人工三招过)✅;每条 `gap_advice` 的 `original` 为空且带穿帮风险标注 ✅。

---

## 四、四个硬 Checkpoint(顺序不可跳)

1. **职业 + 难度档确认**:Phase 0 末,确认目标职业与 `standard`/`pressure` 后才打分。
2. **诊断展示 → 问是否改写**:阶段 3 后,先给诊断,问用户要不要改写,再进阶段 4。
3. **改写交付**:阶段 4 自校验三招全过,才交付改写。
4. **诚实边界签字**:输出末尾必须有 `honesty_boundary` 段(模板见第六节)。

---

## 五、输出

严格按 `output_schema.json` 输出(顶层复用 `../_career-skills-shared/output-schema/skill-output-base.schema.json`)。
- 顶层:`skill_name`/`skill_version`/`summary`/`confidence`(high|medium|low|insufficient)/`evidence_used[]`(每条对齐 `../_career-skills-shared/evidence-schema/evidence.schema.json`,标 `source_type`,如简历→`user_resume`、标尺→`knowledge_graph`)/`cannot_determine[]`/`follow_up_questions[]`/`risks[]`/`recommendations[]`(总体建议,基础 schema **必填**,如「优先补齐 X 能力的真实项目」)/`next_actions[]`(下一步行动,如「按 gap_advice 补强后重诊」)。
- 域载荷:`diagnosis`(`total_score` + `dimensions[]` + `conventionChecks[]` + `interviewHooks[]`)、`rewrite_suggestions[]`、`honesty_boundary`。
- 信息不足时:不输出精确 `total_score`,只给维度级定性评估,`confidence` 标 `low`/`insufficient`,缺口进 `cannot_determine`。

---

## 六、诚实边界段模板(`honesty_boundary`)

```
本次诊断说明:
- 本次只做了:[已完成的阶段,如「按 standard 档 backend-campus 标尺打分 + 面试追问预演」];
- 本次没做:[如「未做改写,因你未确认需要」/「未联网核实公司信息」];
- 以下建议属「建议补充(gap_advice)」,需你真实具备相应能力后再写入简历,否则面试有穿帮风险:[逐条列 gap_advice 的能力];
- 标尺与判断基于截至模型知识更新日的中国校招通行做法,具体公司当季要求可能不同,以官方 JD 为准。
```

---

## 七、引用路径

| 资产 | 路径 | 何时用 |
|------|------|--------|
| 标尺索引 | `../_career-skills-shared/knowledge/campus-recruitment-rubrics/index.md` | Phase 0 推断/定位职业 |
| 职业标尺 | `../_career-skills-shared/knowledge/campus-recruitment-rubrics/professions/<id>.md` | 阶段 2,只读所选 1 个 |
| 产品原则 | `../_career-skills-shared/policies/product-principles.md` | ask-before-judging + 出处-思考-观点 |
| 证据结构 | `../_career-skills-shared/evidence-schema/evidence.schema.json` | `evidence_used[]` 每条字段 |
| 输出基类 | `../_career-skills-shared/output-schema/skill-output-base.schema.json` | 顶层字段 |
| 防编造脚本 | `scripts/check_fabrication.mjs` | 阶段 4 确定性兜底 |

> 运行期零外部依赖:标尺已预生成提交,单次诊断只读 1 个职业文件。
