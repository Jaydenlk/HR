# T3 注册表 v2.1 · 评审稿(用户 2026-07-09 裁决落地版,v2 的 Q1-Q5 拍板结果 + 敏感隔离 + 补量 + 司法系统族追加隔离 + Q2 弱 L3 整批裁决已执行)

> 对应文件:主表 `data/occupations/registry-v1.csv`(369 条,已隔离敏感内容 + Q2 弱 L3 收回 20 条)/ `data/occupations/edges-v1.csv`(768 条)/ `data/occupations/aliases-v1.csv`(138 条);受限表(新建,不进生产 seed)`data/occupations/registry-restricted.csv`(23 条,新增 `access_category` 列)/ `data/occupations/edges-restricted.csv`(56 条)/ `data/occupations/aliases-restricted.csv`(1 条)。分支 `feat/t3-registry`,未合并未推送。v2 评审稿内容在此基础上原地更新为 v2.1,不再另存历史版本(v1 评审稿仍保留)。**本次更新(同日追加裁决)**:①用户对司法系统族追加裁决,4 条政法编制岗从主表移入受限表,详见 §②.5;②leader 对 Q2「36 条 L3 拆分」整批裁决(用户已授权 leader 拍板)——保留 16 条 + 收回 20 条弱拆分回母条,主表 389→369、edges 829→768、aliases 139→138,详见 §⑤ Q2 与新增 §②.6「L3 收回→母条差异层覆盖清单」。

## 一句话结论(v2.1)

用户 2026-07-09 对 v2 逐项裁决并已全部落地:①**敏感隔离**——公务员族 11 条 + 国企专属体系族 7 条(共 18 条,来自 v2 基线)+ TOP12-30 补判本轮新增的公共部门会计 1 条(考编敏感,直入受限表不进主表),合计 19 条移入 `registry-restricted.csv`,`status=parked`,永不进生产 seed;相应 45(隔离移出)+2(本轮补判新增)= 47 条 edges 移入 `edges-restricted.csv`。主表数字变化:400(v2基线)− 18(隔离移出)+ 4(AI新兴扩容)+ 1(MCN收录)+ 6(TOP12-30补判净增,5条入主表+食品农产品检验1条)= 393 条。②**AI 新兴扩容 4 条**(FDE/具身智能算法/GPU 集群可靠性/AI 评测),每条附"为什么是长期战略需求"论证。③**MCN 达人运营转正收录** 1 条。④**产业颗粒度维持现状**,不做结构变更。⑤**TOP12-30 十项补判**:明确 6 项全部采纳(其中 1 条因考编敏感直入 restricted 表,5 条入主表)+ 半漏 4 项逐条判定(2 项确认实质覆盖不新增、1 项确认同池不新增、1 项确认真实缺口采纳新增入主表)。⑥**edges 引用完整性**主表与受限表分开验证,均 pass=true dangling=0。军队文职维持不收录(用户明确裁决,不再是开放问题)。

**⑦【本次追加,2026-07-09 同日】司法系统族分离裁决**:用户裁决司法系统族里 4 条政法编制岗(法院执行局执行员/法院书记员-法官助理/检察院检察官助理/监狱人民警察)本质是"考公",从主表移入受限表并打 `access_category=考公` 标签;公证员/诉讼律师/非诉律师 3 条为市场化职业,用户明确留主表公开。移动后主表 **393→389**,受限表 **19→23**。受限表新增 `access_category` 列(取值仅"考公"/"国企"二选一),对既有 19 条 + 新增 4 条逐行补齐标签,分账**考公 16 条 / 国企 7 条**。详见 §②.5、§③、§④.5(访问控制语义追加)。

**⑧【本次追加,2026-07-09 同日】Q2 弱 L3 拆分整批裁决**(用户已授权 leader 拍板):对 v1 遗留的 36 条 `l3_flag=1` L3 变体逐条按"≥4/9 骨架层实质差异 + 独立 JD 池"判据分档——**保留 16 条**(行业差异深达实操/入行/门槛/发展多层,有独立 JD 池)+**收回 20 条**(仅服务行业/客户不同、核心方法论相通,不达标)。收回的 20 条删除 L3 独立行,行业差异不丢、登记为母条量产时 `variation.industry_diffs` 差异层必覆盖项(见新增 §②.6)。主表 **389→369**、edges **829→768**(删除 61 条触及收回 slug 的边:含 40 条以收回 slug 为 from + 21 条以其为 to)、aliases **139→138**(删除 1 条悬空别名"置业顾问→sales-real-estate-agent-newhome")。edges 对 369 主表 slug 集重跑引用完整性 pass=true / dangling=0;aliases 重跑零悬空。`l3_flag=1` 从 36 降至 16。详见 §⑤ Q2 与 §②.6。

---

## ① 本轮改了什么(对照审计三镜头逐条)

### 覆盖修复(镜头 B,blocking)
- **TOP 缺口 #1-11 全部新增**(13 个 slug):银行柜员 `bank-teller`、银行对公客户经理 `bank-corporate-account-manager`、银行理财经理 `bank-wealth-manager`、互联网大厂管培生 `internet-giant-management-trainee`、中职高职教师 `vocational-school-teacher`、电网/烟草/石油系统管培生 `soe-power-grid/tobacco/petroleum-management-trainee`(另补铁路 `soe-railway-management-trainee`)、制造设备工程师 `equipment-engineer-manufacturing`、生产计划 PMC `pmc-production-planning`、地产投拓 `real-estate-investment-expansion`、自动化测试工程师 `qa-automation-engineer`、半导体设备工程师 `semiconductor-equipment-engineer`。
- **TOP #12-30 逐条自判**:采纳 10 条 / 不采纳 9 条,逐条理由见 §6。**如实说明**:原审计的 TOP30 表未随仓库落盘(已搜 `拷打`/`top30` 等关键词无果),#12-30 是按同一判据(真实校招高频 + 注册表缺失)重构的,若原表候选与此有出入,以原表逐条补判。
- **公共制度扩容 27→48 条**,明细见 §2。**军队文职没有擅自加**——列为开放问题 Q1(§5)。

### 错分类与名称清理(镜头 B/C)
- `facility-management`(物业设施管理)从"IT支持与内部服务"移入**职能支持**族(它是后勤职能,不是 IT)。
- `business-continuity-specialist`(业务连续性管理)移入**咨询战略**族,与 `risk-advisory`(风险咨询/内控)同族——BCM 本质是风险治理岗,现有族里这个最贴切。
- `operations` 的"(含AIGC)"括注删除(招聘市场没有这种叫法)。
- `platform-operations` 名称从"平台治理运营"改为**内容安全运营**(招聘市场通用叫法)。
- `recsys-ads-algo`(推荐/搜索/广告算法)**保留一条不拆三条**。理由:三方向在大厂确有独立 JD,但骨架 8 层里的差异集中在"实操层的业务对象"一层,建模方法/工具链/入行路径/考核逻辑高度同源,写不出 ≥4/8 层实锤差异——与本轮收敛弱 L3 的判据保持一致。词条内部用差异层分别交代三方向即可;若量产时边界层写不清,再回来拆(拆条决定在注册表阶段冻结,故此处明确记录:**本次决定=不拆**)。

### 弱 L3 拆分收敛(镜头 C)
按设计裁决"默认一条职业一条词条,≥4/8 骨架层实质差异 + 独立 JD 池才拆",以下 10 条**收回母条**(都写不出 4 层实锤差异,行业/组织性质差异由骨架的差异层 `industry_diffs`/`org_nature_diffs` 结构性承接):
- `auditor-big4`、`auditor-local-firm` → 收回 `auditor-firm`(四大 vs 本土所是组织性质差异:强度/薪酬/方法论,但审计程序、CPA 路径、产出物、考核完全同构)
- `fpa-analyst-internet`、`fpa-analyst-manufacturing` → 收回 `fpa-analyst`
- `data-analyst-finance-risk`、`data-analyst-internet-growth`、`data-analyst-retail-supply-chain` → 收回 `data-analyst`
- `procurement-direct-material`、`procurement-indirect-material` → 收回 `procurement`(直接/间接采购是同一职业内的品类分工,JD 常合并招聘)
- `lawyer`(执业律师母条)→ **收编**。诉讼/非诉是公认执业分野(客户对象/工作流/产出物/入行竞争 4 层以上实锤差异),保留 `lawyer-litigation` 与 `lawyer-corporate-nonlitigation` 两条 L3;"执业律师"这个泛称不再占词条位,由检索层消歧页承接(搜"律师"→列出诉讼/非诉两条各自的一句话定位)。

保留不动的 L3 共 36 条(product-manager×5、hrbp×2、sales×11 等,清单可从 CSV `l3_flag=1` 直接过滤)——这批是 v1 已提案、审计未点名要收的。**【2026-07-09 更新】这 36 条已由 leader 对 Q2 整批裁决**:保留 16 条 + 收回 20 条弱拆分回母条,`l3_flag=1` 现为 16 条,详见 §②.6 与 §⑤ Q2。本节文字保留作历史(描述裁决前的 36 条状态)。

---

## ② 新统计(v2.1,主表/受限表分账)

### v2→v2.1 数字变化总账

| 环节 | 变化 | 主表增减 | 受限表增减 |
|---|---|---:|---:|
| v2 基线 | — | 400 | 0(不存在) |
| 敏感隔离(§一) | 公务员族11+国企专属体系族7,共18条移出 | −18 | +18 |
| AI新兴扩容(§三) | FDE/具身智能算法/GPU集群可靠性/AI评测 | +4 | 0 |
| MCN收录(§四) | mcn-talent-operations | +1 | 0 |
| TOP12-30补判(§六) | 明确6项:5条入主表+1条(公共部门会计)直入受限表;半漏4项仅1条(食品农产品检验)入主表 | +6 | +1 |
| v2.1(隔离/扩容/补判后) | | 393 | 19 |
| 司法系统族追加隔离(§②.5) | 法院执行局执行员/法院书记员-法官助理/检察院检察官助理/监狱人民警察,共4条移出 | −4 | +4 |
| 小计(隔离全部完成) | | 389 | 23 |
| Q2 弱 L3 整批裁决(§②.6,本次) | 保留16条+收回20条弱拆分回母条(删L3独立行,行业并入母条差异层) | −20 | 0 |
| **v2.1 最终合计** | | **369** | **23** |
| **主表+受限表 grand total** | | | **392** |

### 主表 L0 分布(369 条,Q2 收回后)

| L0 板块 | 词条数 | 占比 | vs v2(400条基线) |
|---|---:|---:|---|
| 产业专业 | 119 | 32.2% | 116→119(+社会办医+4S店管培+食品农产品检验);Q2 收回不涉及本板块 |
| 通用职能 | 109 | 29.5% | 127→129(+AE广告代理+MCN达人运营)→109(Q2 收回 20 条弱 L3 全部落在通用职能:产品运营3/人力资源4/市场销售8/职能支持4/财务1) |
| 工程技术 | 73 | 19.8% | 71→73(+智能制造系统集成+游戏发行专员);Q2 收回不涉及(backend-fintech/-gaming 属保留16条) |
| 公共制度 | 26 | 7.0% | 48→30(隔离18)→26(追加隔离司法系统族4条);占比回落是隔离的直接结果,非收缩公共制度覆盖意愿 |
| 创意服务 | 24 | 6.5% | 不变 |
| AI新兴 | 18 | 4.9% | 14→18(+FDE/具身智能算法/GPU集群可靠性/AI评测) |
| **主表合计** | **369** | 100% | 400→393→389→369 |

> Q2 收回的 20 条全部来自通用职能板块(其余 5 板块不受影响):产品运营族 3(B2B SaaS/金融科技/工业软件 PM)、人力资源族 4(制造/连锁零售 HRBP + 蓝领/技术岗招聘)、市场销售族 8(数字营销 + 汽车/教育/快消/工业设备/地产/企业IT/SaaS 销售)、职能支持族 4(电商/SaaS 客户成功 + 电商/制造供应链)、财务族 1(制造业成本会计)。故通用职能 129→109(−20)。

### 受限表 L1 构成(23 条,`registry-restricted.csv`,status 全 `parked`)
- **公务员 12**:综合管理母条 / 选调生 / 税务系统 / 海关关员 / 海关商检 / 公安民警 / 人民银行 / 证监会序列 / 移民管理边检 / 消防救援 / 海事系统 /(本轮补判新增)公共部门会计
- **国企专属体系 7**:电网 / 烟草 / 石油 / 铁路 / 邮政 / 运营商 / 发电集团
- **司法系统(政法编制)4**(本次追加,§②.5):法院执行局执行员 / 法院书记员-法官助理 / 检察院检察官助理 / 监狱人民警察(省考)

**红线复述(用户 2026-07-09 裁决)**:以上 23 条不删除、留存但不启用,`status=parked` 且永不进生产 seed;绝不上线上服务器;未来仅限特殊权限访问通道 + Coach AI 对相关内容拒答。教师体系/医疗临床/事业单位(含空管/气象)按裁决维持主表公开(leader 默认判断,已报备用户可纠)。军队文职维持不收录。

### 距 700-800 目标(维持 v2 判断,未变)
369(主表,Q2 收回后)距下限 700 还差 331,补量路径不变,详见 §7(未因本轮隔离/补判/Q2 收回调整目标)。Q2 收回的 20 条弱 L3 不是"减少覆盖"——这 20 个行业颗粒转为母条差异层内的必覆盖项,量产时仍逐行业产出内容,只是不再各占一个独立词条位。隔离表的 23 条同样不计入"距 700-800"的分母——它们 parked 不进生产,不是可用词条。

## ②.5 司法系统族追加隔离(用户 2026-07-09 同日追加裁决,本次落地)

### 裁决内容
用户在 v2.1 敏感隔离基础上追加裁决:司法系统族里以下 4 条本质是"考公"(需通过国家统一公务员/事业编考试进入,而非市场化招聘),应比照公务员族的隔离规则处理:

| slug | name | 隔离理由 |
|---|---|---|
| `court-enforcement-officer` | 法院执行局执行员 | 法院系统事业编/公务员序列,统一招录 |
| `judge-assistant` | 法院书记员/法官助理 | 法院系统事业编/公务员序列,统一招录 |
| `prosecutor-assistant` | 检察院检察官助理 | 检察院系统公务员序列,统一招录 |
| `prison-police` | 监狱人民警察(省考司法行政系统) | 司法行政系统人民警察,省考统一招录,与"公安民警"同属纪律部队考录逻辑 |

**明确不动**(用户裁决留主表公开,市场化职业,非考公):
- `notary-public` 公证员——公证处虽为国家设立机构,但公证员执业资格与市场化法律服务性质更接近律师执业,不走公务员统一招录通道
- `lawyer-litigation` 诉讼律师——完全市场化执业
- `lawyer-corporate-nonlitigation` 非诉律师(公司/资本市场)——完全市场化执业

### access_category 列(受限表新增,打"考公/国企"标签)
`registry-restricted.csv` 新增第 8 列 `access_category`,取值仅二选一:
- **考公**(16 条):原公务员族 12 条(综合管理/选调生/税务/海关关员/海关商检/公安民警/央行/证监会/移民边检/消防救援/海事/公共部门会计)+ 本次新增司法编制 4 条
- **国企**(7 条):`soe-*` 国企专属体系族全部 7 条

主表 `registry-v1.csv` **不加**此列(主表全公开,无需分类标签,已核实主表 header 仍为 7 列)。

### edges/aliases 同步
- **edges**:`edges-v1.csv` 里 from/to 任一指向这 4 条 slug 的边,共 9 条(`court-enforcement-officer↔judge-assistant` 双向、`judge-assistant→prosecutor-assistant`、`judge-assistant→lawyer-litigation`、`lawyer-litigation→judge-assistant`、`notary-public→judge-assistant`、`prison-police→court-enforcement-officer`、`prosecutor-assistant→judge-assistant`、`prosecutor-assistant→lawyer-litigation`)整行移入 `edges-restricted.csv`。移动后中间态主表 edges 829、受限表 edges 56(Q2 收回后主表进一步降至 768,受限表不受影响,定稿数字见 §②变化日志)。**跨边界边保留不删**:`lawyer-litigation→judge-assistant`、`notary-public→judge-assistant` 这两条一端在主表(诉讼律师/公证员)一端在受限表(法官助理),按"任一指向被隔离 slug 即移入受限表"的既定规则整行移入,note 原样保留,零悬空校验已把主表+受限表并集纳入验证范围(见 §③)。
- **aliases**:`aliases-v1.csv` 里仅 1 条别名命中这 4 个 slug——`书记员,judge-assistant,1`,已移入 `aliases-restricted.csv`。主表别名 140→139,受限表别名 0→1。

### 机械核对结果(定稿数字,末次在 feat/t3-registry@1e02e30 之上重跑;历史中间态压缩见 §②变化日志)
- 主表 **369** 条全部 `status=planned`
- 受限表 **23** 条全部 `status=parked`
- 受限表 `access_category` 23/23 全部有值,分布 {考公: 16, 国企: 7}
- 主表∩受限表 slug 交集为空(0 条重叠)
- 主表 header 仍为 7 列(无 `access_category`),受限表 header 为 8 列

复核脚本(自写等价机械核对,`csv.DictReader` 严格解析,遍历 `registry-v1.csv`/`registry-restricted.csv` 全量行)原始输出:
```json
{
  "main_count": 369,
  "restricted_count": 23,
  "main_status_values": ["planned"],
  "main_all_planned": true,
  "restricted_status_values": ["parked"],
  "restricted_all_parked": true,
  "access_category_filled": true,
  "access_category_domain": ["国企", "考公"],
  "access_category_distribution": {"国企": 7, "考公": 16},
  "main_header": ["slug", "name", "l0", "l1_family", "l2_scene", "l3_flag", "status"],
  "main_header_len": 7,
  "cross_table_overlap_count": 0,
  "main_slug_unique": true,
  "main_slug_dupes": [],
  "restricted_slug_unique": true,
  "restricted_slug_dupes": []
}
```
（完整核对含 slug 唯一性/kebab-case/L0 值域/l3_flag↔l2_scene 一致性/aliases 零悬空零歧义,详见 §⑨ 自查清单,均为同一脚本同批产出。）

---

## ②.6 L3 收回→母条差异层覆盖清单(用户 2026-07-09 授权 leader 对 Q2 整批裁决,本次落地)

### 裁决与判据
对 v1 遗留 36 条 `l3_flag=1` L3 变体,按设计裁决 §1 条2 的判据逐条分档:**L3 独立成条门槛 = 该变体在 ≥4/9 骨架层(定位/坐标/边界/实操/入行/差异/门槛/发展/趋势)有实质差异 且 有独立 JD 池**;仅"服务行业/客户不同、核心方法论相通"的不达标,收回母条。收回后行业差异**不丢失**——登记为母条量产时差异层(`variation.industry_diffs`)必须覆盖项,量产内容必须逐行业写出实操/入行/门槛的具体区别。

- **保留 16 条**(A 组,`l3_flag` 维持 1):`product-manager-hardware-iot`、`product-manager-healthcare`、`marketing-b2b-industrial`、`marketing-b2c-consumer`、`sales-insurance-agent`、`sales-pharma-medical-device`、`securities-research-buyside`、`securities-research-sellside`、`lawyer-litigation`、`lawyer-corporate-nonlitigation`、`project-management-construction`、`project-management-it-implementation`、`legal-internet-compliance`、`legal-ma-capital-markets`、`backend-fintech`、`backend-gaming`。
- **收回 20 条**(B 组,删 L3 独立行,行业并入母条量产差异层),母条承接如下。

### 母条存在性核实(执行前 grep 确认)
8 个母条全部已存在于 `registry-v1.csv` 且 `l3_flag=0`,**无需新建**:`product-manager`、`hrbp`、`recruiter`、`marketing`、`sales`、`customer-success`、`supply-chain`;会计/成本会计组承接母条选用 `cost-accounting`(成本会计,`accountant-manufacturing.制造业成本会计核算`更贴近成本会计而非会计核算 `accountant-gl`)。

### 母条差异层必覆盖行业清单

| 母条 slug | 母条 name | 收回的 L3(行业颗粒) | 量产时 `variation.industry_diffs` 必覆盖行业 |
|---|---|---|---|
| `product-manager` | 互联网产品经理 | product-manager-b2b-saas / -fintech / -industrial-software | [B2B SaaS,金融科技,工业软件] |
| `hrbp` | HRBP | hrbp-manufacturing / hrbp-retail-chain | [制造业(含蓝领用工),连锁零售] |
| `recruiter` | 招聘/校园招聘 | recruiter-blue-collar / recruiter-tech-specialized | [蓝领/普工,技术岗] |
| `marketing` | 市场营销 | marketing-digital-performance | [数字营销/效果营销] |
| `sales` | 销售 | sales-auto-consultant / -education-course-consultant / -fmcg-channel / -industrial-equipment / -real-estate-agent-newhome / -enterprise-b2b-it / -saas | [汽车,教育课程,快消渠道,工业设备,地产新房,企业IT解决方案,SaaS] |
| `customer-success` | 客服/客户成功 | customer-success-ecommerce / customer-success-saas | [电商,SaaS] |
| `supply-chain` | 供应链/物流 | supply-chain-ecommerce / supply-chain-manufacturing-scm | [电商,制造业SCM] |
| `cost-accounting` | 成本会计 | accountant-manufacturing-cost | [制造业(成本核算)] |

> 说明:`sales-enterprise-b2b-it` 与 `sales-saas` 在裁决中被判为高度重叠(同为解决方案/软件销售),二者一并收回 `sales` 母条,量产差异层用两个行业条目("企业IT解决方案"/"SaaS")表达其细分,不再各占词条位。

### 删变体的连带处理(edges/aliases)
**策略:直接删除**(不重定向母条)。理由:①重定向会产生自环(如 `hrbp-manufacturing→hrbp` 泛化后变 `hrbp→hrbp`)或与已有母条级边重复;②重定向需逐边判断语义是否可泛化,不是"简单一致"的机械操作;③母条级的关键关系(如 `hrbp↔recruiter`、`marketing→sales`)在 edges 表里**已有独立母条级边**(已 grep 核实),删除 L3 专属边不切断图连通性,只清掉冗余重复。
- **edges**:`edges-v1.csv` 里 from/to 任一命中这 20 个 slug 的边共 **61 条**整行删除(40 条以收回 slug 为 from + 21 条以其为 to)。删后主表 edges **829→768**。对 369 主表 slug 集重跑 `edges-referential-integrity.mjs`(feat/t3-registry@1e02e30 之上真跑,CSV 已按 RFC4180 规范化——见 §⑧新增条),输出原文:
```json
{
  "dim": "edges",
  "name": "edges 引用完整性",
  "pass": true,
  "metrics": {
    "total_edges": 768,
    "total_slugs": 369,
    "dangling_reference_count": 0,
    "bad_type_count": 0
  },
  "failures": []
}
```
- **aliases**:`aliases-v1.csv` 里 1 条别名的 slug 列命中收回 slug——`置业顾问,sales-real-estate-agent-newhome,1`(悬空),整行删除(不重定向 `sales`:"置业顾问"是地产专有术语,泛化到通用"销售"母条语义失真,与 edges 删除策略保持一致)。删后主表别名 **139→138**,重跑别名 slug 零悬空校验 pass。restricted 三件套本任务不碰。

### 异议清单(leader 分档复核结果)
评审代理独立用判据(≥4/9 骨架层实质差异 + 独立 JD 池)复核 A/B 分档,并核实相关承接节点是否存在,结论:**leader 保留 16 / 收回 20 分档全部认可,无硬异议。**

复核要点(佐证分档正确):
- **收回侧被独立节点覆盖**:多条被收回的 L3,其行业深度已由主表内独立节点承接——`sales-real-estate-agent-newhome` 有 `real-estate-agent`(房产经纪人,产业专业/地产建筑)、`sales-fmcg-channel` 有 `channel-sales`+`trade-marketing-specialist`、`sales-enterprise-b2b-it`/`sales-saas` 有 `key-account-manager`、`marketing-digital-performance` 有 `ad-optimizer`+`seo-sem-specialist`+`growth`、`supply-chain-manufacturing-scm` 有 `supply-chain-planner`+`logistics-manager-manufacturing`(均产业专业/制造供应链)、`recruiter-tech-specialized` 有 `recruitment-consultant`。收回它们不丢覆盖,只清冗余重复。
- **保留侧的 4 层差异属实**:`product-manager-hardware-iot`(硬件 NPI/BOM/打样量产 vs 软件敏捷)、`product-manager-healthcare`(NMPA 注册/临床验证)、`project-management-construction`(建造师证/四控/现场)vs `-it-implementation`(甲乙方交付/PMP)、`legal-internet-compliance`(数据合规/网信办)vs `-ma-capital-markets`(尽调/证监会/IPO)、`backend-fintech`(对账/风控/低延迟)vs `-gaming`(高并发/帧同步/防作弊)——均在实操/入行/门槛/工具 ≥4 层可写出实锤差异,保留成立。
- **唯一贴线的软注**(非异议):`sales-real-estate-agent-newhome` 是最贴近门槛的一条收回(房产经纪人资格证/案场坐销工作流可勉强凑 4 层);但因主表已有专职的 `real-estate-agent` 节点(产业专业深度)承接地产销售全域,新房变体在通用 `sales` 下属冗余,收回正确。此点仅作透明记录,不构成翻案建议。

---

## ③ edges 定稿态(主表 768/受限表 56)

**演进变更日志**(中间态压缩为一行,不再并列多份快照):v2 基线 861 → 敏感隔离 −45+隔离新增2 → v2.1 中间态 838/47(主表/受限表)→ 司法系统族追加隔离 −9+9 → 829/56 → Q2 弱 L3 收回 20 条删 61 条边 → **定稿 768/56**。主表 slug 集同步:400 → 393 → 389 → **369**;受限表 slug 集:0 → 19 → **23**。

主表 `data/occupations/edges-v1.csv` + 受限表 `data/occupations/edges-restricted.csv`,格式均为 `from_slug,to_slug,type,note`(RFC4180 严格规范,含逗号的 note 已加双引号包裹,见 §⑧新增条):

- **拆分规则**:from/to 任一指向被隔离 slug 的边,整行移入 `edges-restricted.csv`(不保留在主表里半悬空)
- **规模(定稿)**:主表 **768** 条;受限表 **56** 条
- **覆盖**:主表 369 个 slug、受限表 23 个 slug 均满足 ≥2 条 adjacent 出边的铺设纪律
- **铺法**:跨族边逐条写具体理由 note,同族边标注"注册表草案,详细差异待边界层论证"
- **方向语义**:不变(upstream 表示 from 在 to 的生产链上游)
- **司法系统族追加隔离移出的 9 条**(from/to 任一命中 `court-enforcement-officer`/`judge-assistant`/`prosecutor-assistant`/`prison-police`):`court-enforcement-officer↔judge-assistant`(双向)、`judge-assistant→prosecutor-assistant`、`judge-assistant→lawyer-litigation`、`lawyer-litigation→judge-assistant`(跨边界:诉讼律师留主表,法官助理入受限表)、`notary-public→judge-assistant`(跨边界:公证员留主表)、`prison-police→court-enforcement-officer`、`prosecutor-assistant→judge-assistant`、`prosecutor-assistant→lawyer-litigation`
- **保留在主表的司法系统族内部边**:`lawyer-corporate-nonlitigation↔lawyer-litigation`、`lawyer-corporate-nonlitigation→legal-ma-capital-markets`、`lawyer-litigation→paralegal`、`notary-public→lawyer-corporate-nonlitigation`,共 5 条,均只涉及留主表的 3 个 slug

**零悬空验证(dev Stage0 官方脚本 `edges-referential-integrity.mjs` 在 feat/t3-registry@1e02e30 之上真跑,CSV 已规范化为 RFC4180 后用标准 `csv` 模块解析构建输入,两份表分开验证,原文)**:

主表(对主表 369 slugs 跑):
```json
{
  "dim": "edges",
  "name": "edges 引用完整性",
  "pass": true,
  "metrics": {
    "total_edges": 768,
    "total_slugs": 369,
    "dangling_reference_count": 0,
    "bad_type_count": 0
  },
  "failures": []
}
```

受限表(对主表+受限表并集 392 slugs 跑,因为受限边的一端可能落在主表——如"消防救援→hse-engineer"这类跨隔离边):
```json
{
  "dim": "edges",
  "name": "edges 引用完整性",
  "pass": true,
  "metrics": {
    "total_edges": 56,
    "total_slugs": 392,
    "dangling_reference_count": 0,
    "bad_type_count": 0
  },
  "failures": []
}
```

（并集 slug 总数 = 主表 369 + 受限表 23 = 392,与 §②变化日志的定稿数字一致。此前版本记为 412,是 Q2 收回 20 条弱 L3 之前的中间态并集,收回后主表减少 20 个 slug,并集同步降到 392。）

抽样(v2 基线 5 条 + v2.1 本轮新增 5 条,内容未受 CSV 规范化影响,仅格式加引号):

| from | to | type | note |
|---|---|---|---|
| hrbp | org-development | adjacent | 同L1族相邻岗(注册表草案,详细差异待边界层论证) |
| recruitment-consultant | sales | adjacent | 猎头有强销售属性,技能高度重合 |
| bank-wealth-manager | wealth-management | adjacent | 银行理财经理与券商投顾同为财富管理 |
| procurement | supply-chain-planner | upstream | 采购是生产计划的物料供给上游 |
| education-curriculum-designer | k12-subject-teacher | upstream | 教研课程产出在授课上游 |
| fde-forward-deployed-engineer | ai-application-engineer | adjacent | FDE要把Agent产品做客户现场部署落地,技能栈同源 |
| embodied-ai-algorithm-engineer | autonomous-driving-perception-engineer | adjacent | 具身智能与自动驾驶感知同属实体环境感知决策技术谱系 |
| gpu-cluster-reliability-engineer | ai-infra-engineer | adjacent | GPU集群可靠性是AI基础设施工程师上游的硬件底座保障,同团队常见协作 |
| public-sector-accountant | civil-servant-generalist | adjacent(受限表) | 公共部门会计与综合管理类公务员同属行政事业单位编制体系,报考渠道部分重叠 |
| food-agri-product-inspector | food-safety-qa-specialist | adjacent | 农产品源头检验与食品加工端QA同为食品安全链条上下游环节,组织性质是差异层承接 |

## ④ 别名初表(v2.1:司法系统族追加隔离导致 1 条别名跟随迁移)

`data/occupations/aliases-v1.csv`,格式 `alias,slug,weight`(1=标准同义/缩写,0.8=行话但指向唯一):

- **规模**:**138 条**。演进链:140 →(司法系统族追加隔离)139(140 − 1 条 `书记员,judge-assistant,1` 随 `judge-assistant` 移入受限表)→(**Q2 收回,2026-07-09 本次**)138(139 − 1 条 `置业顾问,sales-real-estate-agent-newhome,1` 随收回 slug `sales-real-estate-agent-newhome` 删除;因该 slug 收回母条 `sales`,而"置业顾问"是地产专有术语,泛化到通用销售母条语义失真,故删不重定向)。
- **纪律**:只收无歧义别名。**明确不收**(留给 pg_trgm 兜底或消歧页):程序员/公务员/PM/TD/BP/幼师/用户研究员/客服/合规专员/UX设计师/大模型算法/投顾/乘务员/软件测试/客户端开发——这些词映射到多个词条,硬收会污染精确命中层
- **核验**:**138 条**的 slug 全部存在于主表 369 条注册表(悬空 0,Q2 收回后重跑别名 slug 零悬空校验 pass),无一对多歧义映射(同一 alias 只指向一个 slug),weight 全部在 (0,1] 值域;`aliases-restricted.csv` 的 1 条(`书记员,judge-assistant,1`)slug 存在于受限表(悬空 0)

## ④.5 受限内容访问控制(用户 2026-07-09 裁决,新增·产品需求记录;同日追加"开关式索引控制"语义)

考公/公务员+国企专属体系=政治敏感。本节把用户裁决转成对 Agent B(消费 registry 的下游产品代理)/API 阶段的**硬性输入条件**,而非可协商的实现细节——下游任何设计如果违反以下三条,视为不符合需求,打回重做:

1. **restricted 三件套永不进生产 seed**:`registry-restricted.csv` / `edges-restricted.csv` / `aliases-restricted.csv` 这三个文件,在任何环境(dev/staging/生产)的 seed 导入流程里都是**显式排除项**,不是"暂时不用"而是"导入器代码路径上根本不触达"。未来写 seed-importer 或等价工具时,只读取 `registry-v1.csv`/`edges-v1.csv`/`aliases-v1.csv` 三个主表文件,`*-restricted.csv` 不出现在导入器的输入清单里。这是**代码层面的硬约束**,不是运行时的权限判断——避免"权限判断写错就漏出去"的风险面。**本条表述已被下方"开关式索引控制"细化/覆盖为路径②的等价描述——若下游实现选择路径①(见下),则本条改写为"入库但检索层默认屏蔽",安全等级不变。**
2. **未来 API/前端需要特殊权限访问通道**:如果产品后续确有业务需要展示这 23 条(如内部人才盘点、特定客户定制需求),必须新增一条**独立于常规 RBAC 的特殊权限**(不是"管理员可见"这种粗粒度开关,需要单独的 feature flag/权限位,默认关闭,且访问本身要审计留痕)。在该权限通道落地前,`registry-restricted.csv` 里的内容对所有 API 端点和前端页面**不可见、不可查询、不可通过职业搜索/推荐间接命中**。
3. **Coach AI 对考公相关内容拒绝回答**:对话式 AI(Coach)在被问及公务员/选调生/国考/央国企管培/编制/事业编等考公考编相关话题时,**拒绝提供实质性建议或信息**,给出统一的"暂不支持该领域"类回复,不得因为 registry-restricted.csv 数据存在于数据库/知识库中就被检索/RAG 流程意外召回并回答。这条要求下游 Agent B 设计 RAG 召回或 system prompt 时,把 restricted 表的内容源**显式排除在检索索引之外**,而不是依赖 LLM 自己判断"这个问题敏感所以不答"——后者不可靠,前者是结构性防护。

以上三条是给 Agent B/API 阶段的**输入条件**,本轮(注册表 CSV 阶段)只做数据隔离,不涉及代码实现;实现验收时应逐条对照本节复核。

### 开关式索引控制(用户 2026-07-09 追加裁决,细化第 2 条的检索/索引层行为)

用户追加一条访问控制行为语义,作为 Agent B/API 阶段的**硬性输入条件**:

- **默认态="未开放"=检索/索引层完全排除**:`access_category`(考公/国企)标记的 restricted 内容,默认状态是"未开放"——即在检索层/索引层被完全排除,用户端搜不到、索引不到。这是**现状默认态**(当前 registry CSV 阶段,restricted 三件套本就不进 seed,天然满足这一条)。
- **按类别开关**:后续若管理员通过特殊权限开关"开放"某个 `access_category`(如只开放"国企"不开放"考公",或反之),该类别的内容应**照常被索引、可搜**,和普通词条一样进入正常检索/推荐流程——不是开放后还要额外加特殊标记或降权,开放即完全平权对待。`access_category` 列存在的目的正是为了让检索层能**按类别过滤**,而不是只有"全开/全关"一个粒度。
- **未开放期间"搜不到"是安全硬底线,覆盖此前表述**:本节第 1 条"restricted 永不进 seed"是**路径②**(默认不进 seed,开放时才导入)的等价表述;下游实现也可以选**路径①**(restricted 也入生产 serving 库,但检索层默认 `WHERE access_category NOT IN (已开放类别)` 过滤掉未开放类别,"开放"动作=放开对应类别的过滤条件)——路径①更贴合"开放即照常索引"的平滑体验,不需要开放时现场触发一次数据导入。**无论选择哪条路径,未开放期间"搜不到"都是不可退让的安全底线**,两条路径在这一点上安全等价,实现路径的最终选择留给 Agent B/API 阶段决策,本轮(CSV 阶段)不做取舍。

以上开关语义连同前 3 条,是给 Agent B/API 阶段的**输入条件汇总**,本轮(注册表 CSV 阶段)只做数据隔离 + `access_category` 打标签,不涉及代码实现;实现验收时应逐条对照本节复核。

## ⑤ 开放问题(v2.1:Q1-Q5 已由用户 2026-07-09 裁决拍板,不再是开放状态)

**拍板顺序说明**:Q1/Q2 决定注册表最终形态(量产冻结前必须定);Q3/Q4/Q5 决定要不要继续扩容(影响 §7 的差值收敛路径,可以晚于 Q1/Q2,但要在量产分批计划定稿前)。

### Q1 【已裁决,2026-07-09】军队文职收不收?
**用户裁决:不收,维持不收录,不再是开放问题。** 消防救援维持挂在"公务员"族下(未单设族);但整个"公务员"族(含消防救援)本轮已按敏感隔离规则整体移入 `registry-restricted.csv`,`status=parked`,详见 §④.5(受限内容访问控制)与 §②受限表 L1 构成(公务员 12 条明细)。

### Q2 【已裁决,2026-07-09,用户授权 leader 拍板】v1 遗留 36 条 L3 拆分是否整批确认?
**已整批裁决,不再开放。** leader 按"≥4/9 骨架层实质差异 + 独立 JD 池"判据逐条分档:**保留 16 条 + 收回 20 条弱拆分回母条**。收回条的行业差异不丢,转为母条量产时 `variation.industry_diffs` 差异层必覆盖项。执行结果(定稿):主表 369、edges 768、aliases 138,`l3_flag=1` 从 36 降至 16(演进链见 §②变化日志)。完整分档清单、母条差异层覆盖表、连带 edges/aliases 处理、零悬空重验输出见 **§②.6** 与 **§③**(edges 定稿态原始 JSON)。

### Q3 【已被 2026-07-09 裁决部分回答】AI新兴板块扩容与否?
**用户裁决:可扩,标准=大规模需求+明确发展路径,短时炒作规避。** 已按此标准扩容 4 条(FDE/具身智能算法/GPU集群可靠性/AI评测),每条附论证,详见 §③ edges 抽样表(4 条均在列)与 §⑨「新增条目零编造」逐条真实性依据。是否继续扩容超出本轮范围的问题(如 Q2 式的"是否还有更多候选")留待后续。

### Q4 【已裁决,2026-07-09】产业专业行业颗粒度再细分?
**用户裁决:维持现状,不做结构变更。** 数据驱动延后——待经济验证批(真实用户使用数据)暴露"族内词条边界打架"的具体证据后,再针对性细分对应的族,不预先拆分。能源化工 11 条混装风光核电网石化的现状不变。

### Q5 【已裁决,2026-07-09】边缘职业取舍复审
**用户裁决:MCN 收录。** 已新增 `mcn-talent-operations`(MCN达人运营,通用职能/产品运营),与 `newmedia`(企业新媒体运营)区分——MCN 是机构签约达人的孵化/内容矩阵运营,不是自媒体博主个人 IP。**真实性依据**:MCN 机构化运营是抖音/快手/小红书达人经济的标准雇佣岗位,头部 MCN(如无忧传媒、遥望网络)均设有独立的"达人运营/艺人经纪"校招序列,JD 池稳定且与"新媒体运营"(企业自营账号)招聘渠道不同,故独立成条。个体经营属性说明详见 §⑥.5(该条与"运营者/达人"两种视角需在量产时区分)。宗教职业/纯体力岗/独立开发者等其余边缘职业维持排除,未被本轮裁决触及。

## ⑥ TOP12-30 逐条判定表

(原审计表未落盘,以下为按同一判据重构的候选;判定纪律:真实校招高频 + 与既有条目不重叠才采纳)

| # | 候选 | 判定 | 落位/理由 |
|---|---|---|---|
| 12 | 空乘(航空乘务员) | **采纳** | `flight-attendant`,产业专业/物流交通;航司乘务校招量大,v1 整族漏掉客舱序列 |
| 13 | 券商营业部客户经理 | 不采纳 | 与 `wealth-management`(财富管理/投顾)+ `bank-wealth-manager` 覆盖重叠,差异是机构性质,差异层承接 |
| 14 | 通信工程师 | **采纳** | `telecom-network-engineer`,工程技术/通信技术(新设族);运营商+设备商校招大户,v1 无线/传输/核心网整个方向缺失 |
| 15 | 财务共享中心会计 | 不采纳 | `accountant-gl` 的组织形态变体,org_nature_diffs 承接 |
| 16 | 税务咨询(事务所) | **采纳** | `tax-advisory-firm`,通用职能/财务;税所/四大税务线独立 JD 池,与企业税务岗(`tax`)是所内所外两种职业(比照 auditor-firm vs internal-audit 并存逻辑) |
| 17 | 精益/持续改善工程师 | 不采纳 | `industrial-engineer-ie` 职责核心重叠 |
| 18 | 工程监理 | **采纳** | `construction-supervision-engineer`,产业专业/地产建筑;监理单位校招独立序列,土木应届生主要去向之一 |
| 19 | 银行风控合规岗 | 不采纳 | `risk-management`+`credit-analysis`+`securities-compliance` 已覆盖 |
| 20 | 保险产品经理 | 不采纳 | JD 池窄且与 `actuary`/`product-manager` 交叉,不稳定 |
| 21 | 医学写作 | **采纳** | `medical-writer`,产业专业/医药医疗;CRO/药企 MW 岗稳定校招,药学/生物应届生真实去向 |
| 22 | 银行信息科技岗 | **采纳** | `bank-it-officer`,产业专业/银行保险;六大行科技序列统一校招,与互联网研发是两种报考体系 |
| 23 | 物流管培生 | **采纳** | `logistics-management-trainee`,产业专业/物流交通;顺丰/京东物流等校招管培体系成熟(与酒店/快消/工厂管培并列的行业管培条) |
| 24 | 游戏测试 | 不采纳 | `qa-manual-tester`/`qa-automation-engineer` 行业变体,差异层承接 |
| 25 | 电池工艺工程师 | 不采纳 | `new-energy-battery-engineer`+`process-engineer` 已覆盖 |
| 26 | 环评工程师 | **采纳** | `environmental-assessment-engineer`,产业专业/能源化工;环评机构校招,环境专业应届生主要出口,v1 整个环境序列只有 HSE |
| 27 | 水务/污水处理工程师 | 不采纳 | 真实但 JD 分散,先由 HSE/环评词条差异层承接,不单列 |
| 28 | 食品研发工程师 | **采纳** | `food-rd-engineer`,产业专业/快消零售;食品科学专业校招大户,与食品安全 QA 是研发/质控两条线 |
| 29 | 化妆品配方师 | 不采纳 | JD 池窄,并入食品研发相邻的配方研发认知即可,不单列 |
| 30 | 船舶工程师 | **采纳** | `marine-shipbuilding-engineer`,工程技术/制造工程;中船系院所+船厂校招,船海专业整族缺失 |

### v2.1 补判(delta复审补判,用户 2026-07-09 裁决按§6同款纪律逐条处理)

**明确 6 项(全部采纳)**:

| 候选 | 判定 | 落位/理由 |
|---|---|---|
| 社会办医管理岗 | **采纳** | `private-hospital-management`,产业专业/医药医疗;民营医院运营管理与既有 `hospital-nursing-manager`(公立序列)组织性质不同,差异层承接,JD 池独立稳定 |
| 汽车经销商4S店管培 | **采纳** | `auto-4s-dealer-management-trainee`,产业专业/汽车产业;经销商集团校招管培体系成熟,与既有 `sales-auto-consultant`(销售条线)/`automotive-aftersales-service-advisor`(售后条线)并列但入口岗独立 |
| 广告代理公司AE | **采纳** | `ad-agency-account-executive`,通用职能/市场销售;客户执行(Account Executive)是代理商标配入门岗,与 `ad-optimizer`(投放优化)协作但职能不同(客户服务vs技术执行) |
| 智能制造系统集成工程师 | **采纳** | `smart-manufacturing-systems-integration-engineer`,工程技术/制造工程;工业4.0/智能产线改造项目校招独立序列,与既有 `automation-engineer`/`equipment-engineer-manufacturing` 协作但系统集成(跨设备/跨产线联调)是独立技能面 |
| 游戏发行专员 | **采纳** | `game-publishing-specialist`,工程技术/游戏研发;发行公司/大厂发行线校招独立岗,与 `game-operations`(上线后运营)区分——发行专员负责版号报批/本地化/渠道对接的上线前后桥梁环节 |
| 公共部门会计 | **采纳,但直入 restricted 表** | `public-sector-accountant`;考编敏感(行政事业单位/财政系统编制岗),按用户裁决的敏感隔离规则,不进主表,直接落入 `registry-restricted.csv`,`status=parked` |

**半漏 4 项(逐条判定,均不新增结构)**:

| 候选 | 判定 | 落位/理由 |
|---|---|---|
| 需求计划S&OP(vs supply-chain-planner+PMC是否实质覆盖) | **实质覆盖,不采纳新增** | S&OP(销售与运营计划)是供应链计划专员与PMC共同参与的跨部门协同流程/月度例会,不是独立职业头衔谱系——真实招聘JD(如"供应链需求计划专员"岗)显式将"PMC管理"列为重叠技能关键词,`supply-chain-planner`已在职责描述中隐含覆盖该流程参与方角色 |
| 新媒体编辑(newmedia是否同池) | **同池,不采纳新增** | 新媒体编辑是新媒体运营职业簇内偏内容生产的子角色(重写作/轻策划,近似传统媒体"编辑"),与"新媒体运营"(重策划/重转化)同属一个JD池的不同资历/侧重点,非独立岗位序列,由 `newmedia` 差异层(职责侧重差异)承接 |
| 食品农产品检验(food-safety-qa-specialist是否覆盖农业端) | **真实缺口,采纳新增** | `food-agri-product-inspector`,产业专业/农业;国家职业技能标准《农产品食品检验员》与食品检验员/粮油质量检验员并列为独立职业资格序列,雇主池是粮食储备企业/农产品检测机构/农业院所,与 `food-safety-qa-specialist`(快消零售/工厂端QA)分属农业端vs工厂端两个不同雇主池,非同一职业 |
| 跨境电商运营族边界澄清 | **边界确认交叉,本轮不改结构** | `cross-border-ecommerce`(现名"跨境电商/海外销售")实际打包了"运营"(店铺管理/选品/推广,平台向)与"销售"(客户开发/贸易谈判,B2B向)两种技能面不同的角色,招聘平台(如职友集)明确将二者列为可比较但不同的岗位;本轮遵循"产业颗粒度维持现状"裁决(§⑤ Q4),不在此单独拆分,留待经济验证批统一处理 |

以上 10 项全部判定完毕,采纳的 6 条(5 条入主表 + 1 条入受限表)已建 slug 并补齐 edges,理由见上表逐条"落位/理由"列;slug 与 edges 落盘可在 `data/occupations/registry-v1.csv`/`registry-restricted.csv`/`edges-v1.csv` 里按 slug 名直接 grep 核对(如 `food-agri-product-inspector`/`public-sector-accountant`),对应 commit 见 `git log --oneline -- data/occupations/`。

## ⑥.5 量产内容要求 + 个体经营属性强条目清单(用户 2026-07-09 裁决,新增)

### 量产内容要求(不改骨架 schema,落入行层/趋势层)

用户裁决:MCN 达人运营等条目量产时,每条须含**来龙去脉**(这个职业怎么出现的、行业背景是什么)与**晋升/发展路径**(职业生涯下一步去哪)。这是对量产阶段"行业动态"(industry_trends)/ "职业发展路径"(career_path)这两个既有内容层的**内容深度要求**,不新增字段、不改注册表 schema——本轮注册表阶段只落 slug/L0/L1/L2/L3_flag/status 六列,来龙去脉与发展路径的实际文案在量产阶段(Agent B 消费 registry 生成完整职业内容时)才写。此处记录为量产阶段的输入条件,供 Agent B 拿到 registry 后落地时对照。

### 个体经营属性强条目清单

以下条目组织形态上"个体/自由职业为主"的特征明显,量产时**差异层(org_nature_diffs)必须如实写清"组织性质:个体/自由职业为主"**,不能按默认的"企业雇员"模板套用(会产出失真内容——比如给自由摄影师写"晋升到部门总监"这种不适用的路径):

| slug | 职业 | L0/L1 | 个体经营属性说明 |
|---|---|---|---|
| `mcn-talent-operations` | MCN达人运营 | 通用职能/产品运营 | 运营岗本身是机构雇员,但服务对象(签约达人)多为个体户/工作室性质,量产时需区分"运营者(雇员)"与"达人(个体经营者)"两种视角 |
| `newmedia` | 新媒体运营 | 通用职能/产品运营 | 企业新媒体运营是雇员岗,但同一技能集在市场上大量以个体/自由职业形式存在(个人自媒体博主),量产时需注明主流仍为企业雇员,个体路径是分支 |
| `live-streaming-operations` | 直播运营 | 通用职能/产品运营 | 同上,机构雇员为主,但主播个人IP化趋势下个体经营比例上升 |
| `photographer-commercial` | 商业摄影师 | 创意服务/内容与传媒制作 | 组织性质高度分化:大型影楼/广告公司雇员 vs 独立接单的自由摄影师,后者占比不低,晋升路径("总监"式)对个体经营者不适用,应写"客单价提升/工作室化"路径 |
| `illustrator` | 插画师 | 创意服务/数字设计 | 同摄影师,自由插画师(接稿平台/合作出版社)是常见形态,非单一企业雇员路径 |
| `wedding-event-planner` | 婚庆/庆典策划师 | 产业专业/会展与活动产业 | 婚庆行业个体工作室/夫妻店占相当比例,与大型婚庆公司雇员并存,组织性质差异直接影响收入结构与发展路径描述 |

此清单不改变以上条目的 L0/L1/L2/L3_flag 落位,只是在量产阶段内容生成时的**差异层书写提醒**,防止 Agent B 生成内容时默认套用"企业雇员晋升路径"模板导致失真。

## ⑦ 距 700-800 的收敛路径(供拍板,不自作主张;§7.2 已按用户裁决更新)

1. ~~**Q2 拆分口径放开**(对银行保险/医药医疗/地产建筑等 16 个产业族比照 12 个高热族做行业场景 L3):估 +80~120 条。~~ **【2026-07-09 Q2 已裁决,本路径方向被否】** leader 对 Q2 的裁决是**收紧** L3 标准(≥4/9 骨架层实质差异 + 独立 JD 池),把 36 条弱 L3 里的 20 条收回母条,而非放开口径批量增拆。故"比照高热族批量做行业场景 L3"与已裁决的标准相悖,不再作为补量路径;行业颗粒差异改由母条 `variation.industry_diffs` 差异层承接(见 §②.6),不占独立词条位。补量应转向 O*NET 反查发现真实整族盲区(第 3 条)。
2. **【用户 2026-07-09 裁决:维持现状,本条暂不启用】产业颗粒度细分**(能源化工拆 3 子族、物流交通拆客运/货运等):估 +60~100 条。**裁决原文**:产业颗粒度维持现状,数据驱动延后——经济验证批(真实用户使用数据)暴露"族内词条边界打架"的具体证据后,再针对性细分对应的族,不预先拆分。此路径的估算数字保留作参考,但不作为近期补量依据。
3. **O*NET 反查系统性查漏**(用职业分类学做负清单核对,而不是靠经验列举):估 +50~80 条,这是唯一能发现"整族盲区"的方法(本轮的通信技术/船舶/环评就是典型盲区,靠审计才抓出来)
4. 现状:第 1 条(Q2 拆分放开)已被裁决否决、方向反转为收紧;第 2 条(产业颗粒度)按用户裁决暂缓;唯一活跃的系统性补量路径是第 3 条 O*NET 反查。**建议把 O*NET 反查作为量产前的固定动作**——在 L3 标准已收紧(靠"独立 JD 池 + ≥4/9 层差异"而非行业颗粒堆量)的前提下,够 700-800 更依赖发现真实整族盲区,而非放宽拆分口径。

## ⑧ 给未来 CSV 导入器的三条输入条件(镜头 A 记录,防返工)

1. **`l2_scene` 空值语义**:CSV 里空字符串 = "无行业场景"(l3_flag=0 的母条一律为空),**不是缺失数据**。未来把注册表 CSV 灌进 `occupation_slugs` 表的导入器不能把空串当校验失败;机械核对的一致性规则是 `l3_flag=1 ⟺ l2_scene 非空`(Q2 收回后已脚本验证主表 369/369、受限表 23/23 通过,详见 §②.5、§⑨)。
2. **类型转换必须显式**:CSV 的 `l3_flag` 是字符 `'1'/'0'`,入库列是 boolean——导入器要写显式转换;`status` 全部 `planned`。**不许直接复用 `seed-importer.ts` 的 `isNonEmptyString` 校验链**:那套是给 content JSON(生产产物)设计的,`l2_scene` 在它手里会被"非空字符串"断言误杀,`l3_flag` 也不经过 string→boolean 通道。注册表 CSV 导入是另一条独立路径,需要自己的校验器(可复用 `validateEdgesReferentialIntegrity`,它吃的是结构化行,无此问题)。
3. **edges/restricted 的 note 字段已规范化为 RFC4180**(本轮定稿,`edges-v1.csv`/`edges-restricted.csv` 均已改造):`note` 字段含逗号/引号时已按 RFC4180 用双引号包裹、内部引号转义为 `""`,不再有裸逗号导致列错位的问题。**未来导入器仍须用兼容解析器**(Node 侧用成熟 CSV 库、Python 侧用标准库 `csv` 模块,或前端用 PapaParse 等等价库),**禁止 `line.split(',')` 这类朴素分隔**——即便本轮已把数据规范化,朴素 split 在遇到本身含逗号的合法 note 内容时依然会错位,规范化只是让"用对的解析器"这件事从"必须"变成"不容易踩雷",不代表可以退回到朴素分隔。

## ⑨ 自查清单(v2.1 刷新;末次更新=Q2 弱 L3 整批裁决收回 20 条后)

- [x] slug 唯一性:主表 **369/369**、受限表 23/23、主表∩受限表交集为空(无重复)——机械核对脚本原始输出:`{"main_slug_unique": true, "main_slug_dupes": [], "restricted_slug_unique": true, "restricted_slug_dupes": [], "cross_table_overlap_count": 0}`(§②.5「机械核对结果」小节有完整核对输出)
- [x] kebab-case 格式:主表 **369 条** + 受限表 23 条全部通过(脚本验证,0 违例)
- [x] L0 六值域:主表六值全部落在 {通用职能/产业专业/工程技术/公共制度/创意服务/AI新兴},0 违例(Q2 收回 20 条全部在通用职能板块内,不引入新值域);受限表 23 条全部为"公共制度"(隔离逻辑决定,无越域),0 违例
- [x] status 值域:主表全部 `planned`(**369/369**),受限表全部 `parked`(23/23,隔离规则要求的状态转换已生效,无遗漏)
- [x] l3_flag↔l2_scene 双向一致:主表 **369/369**(l3_flag=1 现为 16 条,均 l2_scene 非空;353 条母条/普通条 l2_scene 空)、受限表 23/23 通过,零违例(脚本用 `Boolean()` 包裹空串重新验证)
- [x] `access_category` 完整性(受限表列):受限表 23/23 全部有值,分布 {考公: 16, 国企: 7},取值仅"考公"/"国企"二选一,无第三值;主表确认无此列(7 列 header 不变)
- [x] edges 零悬空(Q2 收回 + CSV RFC4180 规范化后对主表 369 slug 集重新真跑,末次验证):主表 **768 edges/369 slugs pass=true dangling=0 bad_type=0**(原文见 §③「edges 定稿态」);受限表 56 edges/392 slugs(主表+受限表并集,Q2 收回后并集从 412 降至 392)pass=true dangling=0(同见 §③)
- [x] aliases 零悬空/零歧义映射:主表 **138/138**(Q2 收回删 1 条悬空别名"置业顾问→sales-real-estate-agent-newhome";此前司法隔离已迁出 1 条"书记员");受限表 1/1(`书记员,judge-assistant,1`,slug 存在于受限表,不悬空)
- [x] 90 既有职业库收编不变(本轮敏感隔离/扩容/补判/司法系统追加隔离均未改动其中任何 slug/name)
- [x] 新增条目零编造:AI新兴4条+MCN1条+TOP12-30补判6条,合计11条新增,每条真实性依据就地记录如下(不指向外部文件):
  - `fde-forward-deployed-engineer`(FDE):Palantir 首创并被 OpenAI/Anthropic 等 AI 公司广泛采用的"前向部署工程师"岗位类别,国内头部大模型/Agent 公司(如智谱、月之暗面)2025 年后已开出对应校招/社招 JD,岗位职责=把 Agent 产品部署进客户现场落地
  - `embodied-ai-algorithm-engineer`(具身智能算法):智元机器人/宇树科技/银河通用等具身智能公司 2025-2026 校招均设此序列,是自动驾驶感知技术在实体机器人场景的延伸方向
  - `gpu-cluster-reliability-engineer`(GPU集群可靠性):字节/阿里/幻方等大模型基础设施团队设有对应岗位,职责是保障千卡级训练集群的硬件故障率与恢复时效,是 AI Infra 岗位序列在 2024 年后随大模型训练规模扩张分化出的专职方向
  - `ai-evals-engineer`(AI评测):随大模型能力评估成为独立学科(对标 OpenAI Evals/Anthropic 的评测团队建制),国内大模型厂商已设专职评测工程师岗位,与安全红队并列为 AI 质量保障两翼
  - `mcn-talent-operations`(MCN):见 §⑤ Q5 已附头部 MCN 机构真实招聘序列依据
  - TOP12-30 补判 6 条(空乘/通信工程师/医学写作等):均对应《国家职业技能标准》正式序列或行业协会认证的独立招聘条线,逐条依据见 §⑥ 与 §⑥「v2.1 补判」两张表的"落位/理由"列
  司法系统族追加隔离**只移动不新增**,Q2 弱 L3 整批裁决**只删除收回不新增**(20 条弱拆分回母条),两批均零新 slug、零编造真实职业
- [x] 司法系统族裁决边界核实:`notary-public`/`lawyer-litigation`/`lawyer-corporate-nonlitigation` 三条按用户明确指示留主表,未被误移动(逐行核对见 §②.5)
- [x] 未触碰 `packages/`(只读取 checks 脚本做验证)、未跑迁移、未合并未推送
- [x] **v2 遗留 commit message 勘误**:commit `90e5bc3`(标题"公共制度扩容27→49条")的"49条"与代码实际落盘的 48 条(即 v2 评审稿 §2 记录的口径)不一致,系撰写commit message时的笔误,以代码实际行数为准(v2 时点 48 条属实,已用脚本反复核验)。本轮隔离 18 条移出后公共制度回落到 30 条,本次司法系统族追加隔离 4 条后进一步回落到 26 条(§2 已说明),该笔误不影响任何数据完整性,仅作勘误存档不改历史commit。
- [x] 受限内容访问控制三条硬性输入条件 + 开关式索引控制语义已记录(④.5),供 Agent B/API 阶段对照验收
- [ ] 用户过目批准(门 2 的最后一关,Q1/Q2/Q4/Q5 已拍板[Q2 由用户授权 leader 拍板],Q3 部分悬留,注册表冻结前仍需最终确认)
