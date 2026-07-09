# T3 注册表 v2 · 评审稿(v1 被三份最高标准审计打回后的返工版,请过目拍板)

> 对应文件:`data/occupations/registry-v1.csv`(400 条)、`data/occupations/edges-v1.csv`(861 条)、`data/occupations/aliases-v1.csv`(140 条)。分支 `feat/t3-registry`(已 rebase 到最新 dev),未合并未推送。旧评审稿 `t3-registry-v1-review.md` 保留作历史,本稿全面替代它。

## 一句话结论

v1 的 369 条修成 **400 条**:审计点名的 TOP 缺口全部补上(银行柜员/大厂管培生/中职教师/PMC 这类"校招投递量最大却漏掉"的岗)、公共制度从 27 条扩到 **48 条(占比 12.0%,进入 12-15% 目标区间)**、10 条站不住脚的行业拆分收回母条、**edges 和别名表这两样门 2 验收的硬前提从零建到有**,零悬空脚本真跑全绿。离 700-800 的差距(300-400 条)依然真实存在,补法在 §7,不藏。

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

保留不动的 L3 共 36 条(product-manager×5、hrbp×2、sales×11 等,清单可从 CSV `l3_flag=1` 直接过滤)——这批是 v1 已提案、审计未点名要收的,**是否整批复核确认见开放问题 Q2**。

---

## ② 新统计

### L0 分布(400 条,46 个 L1 族)

| L0 板块 | 词条数 | 占比 | L1 族数 | vs v1 |
|---|---:|---:|---:|---|
| 通用职能 | 127 | 31.8% | 9 | 132→127(收敛6拆分,+税所税务咨询) |
| 产业专业 | 116 | 29.0% | 16 | 103→116(银行3+管培1+PMC+投拓+监理+医学写作+银行科技+空乘+物流管培+环评+食品研发等,中职教师移出) |
| 工程技术 | 71 | 17.8% | 10 | 69→71(+设备/半导体设备/自动化测试/船舶/通信,收敛数分3拆分) |
| **公共制度** | **48** | **12.0%** | 7 | **27→48(扩容主战场,占比进 12-15% 目标区间)** |
| 创意服务 | 24 | 6.0% | 3 | 不变 |
| AI新兴 | 14 | 3.5% | 1 | 不变(扩容待拍板,Q3) |
| **合计** | **400** | 100% | 46 | 369→400 |

### 公共制度 48 条构成(7 族)
- **公务员 11**:综合管理母条(名称已去掉"含选调生")/ **选调生独立成条**(报考条件、培养路径与国省考差异大,应届生认知里是独立赛道)/ **税务系统**(国考招录最大户)/ 海关关员 / 海关商检 / 公安民警 / 人民银行 / 证监会序列 / 移民管理边检 / 消防救援 / 海事系统
- **教师体系 5(新设族)**:公办中小学教师(从"高校科研"族移入纠错)/ 公办幼儿园教师 / 特岗教师 / 中职高职教师(从产业专业移入,事业编为主)/ 高校行政教务岗
- **国企专属体系 7(新设族)**:电网 / 烟草 / 石油 / 铁路 / 邮政 / 运营商 / 发电集团——每个都是独立报考体系(国网统考、烟草统一考试这类),不是普通校招
- **事业单位 7**:原 5 条 + 空管(民航空管系统统一招录)+ 气象部门(气象局系统统一招聘)
- **医疗临床 7**:不变
- **司法系统 7**:原 7 条 − lawyer 母条 + 监狱人民警察(省考司法行政系统)
- **高校科研 4**:原 4 条 − 公办中小学教师移出 + 高校专任教师(讲师/助理教授)

以上每一条都是真实存在的公开招录体系,零编造;**消防救援的编制序列独立于公务员法序列,现归入"公务员"族是权宜落位,如需单设族请在 Q1 一并拍**。

### 距 700-800 目标
400 条,距下限 700 还差 300,距上限 800 差 400。差距构成与 v1 判断一致:既有 90 库收编到头、L1 族自然容量有限、不许编造凑数。**可行的补法与各自天花板见 §7**,是否推进由您定,不自作主张铺量。

---

## ③ edges 草案(新增,门 2 验收硬前提之一)

`data/occupations/edges-v1.csv`,格式 `from_slug,to_slug,type,note`:

- **规模**:861 条 = adjacent 849 + upstream/downstream 12
- **覆盖**:400 个 slug **每条都有 ≥2 条 adjacent 出边**(边界层设计要求 ≥3 相邻对比,注册表阶段按任务要求给 2+ 起步)
- **铺法**:同族内先铺真实相邻;跨族只收有把握的,且**跨族边逐条写了具体理由 note**(如"猎头有强销售属性,技能高度重合"/"银行理财经理与券商投顾同为财富管理");同族边的默认 note 标明"注册表草案,详细差异待边界层论证"——诚实标注这是草案粒度,不冒充成品
- **方向语义**:upstream 表示 from 在 to 的生产链上游(如 采购→供应链计划、工艺→生产、剧本→拍摄)
- **零悬空验证(dev Stage0 官方脚本真跑)**:`packages/api/src/occupations/checks/edges-referential-integrity.mjs` 输出:

```json
{
  "dim": "edges",
  "name": "edges 引用完整性",
  "pass": true,
  "metrics": {
    "total_edges": 861,
    "total_slugs": 400,
    "dangling_reference_count": 0,
    "bad_type_count": 0
  },
  "failures": []
}
```

抽样 5 条(每类看一眼):

| from | to | type | note |
|---|---|---|---|
| hrbp | org-development | adjacent | 同L1族相邻岗(注册表草案,详细差异待边界层论证) |
| recruitment-consultant | sales | adjacent | 猎头有强销售属性,技能高度重合 |
| bank-wealth-manager | wealth-management | adjacent | 银行理财经理与券商投顾同为财富管理 |
| procurement | supply-chain-planner | upstream | 采购是生产计划的物料供给上游 |
| education-curriculum-designer | k12-subject-teacher | upstream | 教研课程产出在授课上游 |

## ④ 别名初表(新增,门 2 验收硬前提之二)

`data/occupations/aliases-v1.csv`,格式 `alias,slug,weight`(1=标准同义/缩写,0.8=行话但指向唯一):

- **规模**:140 条,覆盖主流职业的 JD 简称/英文缩写/通用叫法(FP&A→fpa-analyst、SDR→sales-development-rep、总账会计→accountant-gl、置业顾问→sales-real-estate-agent-newhome、规培→clinical-physician 等)
- **纪律**:只收无歧义别名。**明确不收**(留给 pg_trgm 兜底或消歧页):程序员/公务员/PM/TD/BP/幼师/用户研究员/客服/合规专员/UX设计师/大模型算法/投顾/乘务员/软件测试/客户端开发——这些词映射到多个词条,硬收会污染精确命中层
- **核验**:140 条的 slug 全部存在于注册表(悬空 0),无一对多歧义映射(同一 alias 只指向一个 slug),weight 全部在 (0,1] 值域

## ⑤ 开放问题(按拍板顺序排列,标注依赖)

**拍板顺序说明**:Q1/Q2 决定注册表最终形态(量产冻结前必须定);Q3/Q4/Q5 决定要不要继续扩容(影响 §7 的差值收敛路径,可以晚于 Q1/Q2,但要在量产分批计划定稿前)。

### Q1(新增,独立,无依赖)军队文职收不收?
镜头 B 审计认为"非涉密岗属合法公开招录,不该按敏感排除";但设计红线写"政治/敏感内容杜绝"。这个边界只能您拍:**收**(按文职人员统一招考,作为公共制度独立条,只写公开招录信息)还是**不收**(维持红线从严解释)。v1 把它按敏感直接排除,v2 维持不收待此裁决。附带一起拍:消防救援现挂在"公务员"族下是否接受,还是单设"其他招录序列"族。

### Q2(依赖:无;影响:量产冻结)v1 遗留 36 条 L3 拆分是否整批确认?
本轮收敛了审计点名的 10 条弱拆分,但 v1 原有的 45 条提案中还有 36 条保留(product-manager×5 / sales×11 / hrbp×2 / legal×2 / customer-success×2 / project-management×2 / supply-chain×2 / marketing×3 / recruiter×2 / backend×2 / securities-research×2 / lawyer×2 / accountant×1)。拆条决定量产中冻结,**这 36 条需要您逐族批准或指定再收敛**。我的建议:sales 族 11 条里 `sales-auto-consultant`/`sales-insurance-agent`/`sales-real-estate-agent-newhome` 三条其实是独立职业不是"销售的行业变体"(有独立管照/佣金结构/职业路径),建议转正为 l3_flag=0 的独立条;其余维持 L3。

### Q3(依赖 Q2 的收敛口径)AI新兴板块扩容与否?
现 14 条。市场上确有增量叫法(AI Infra 细分/具身智能算法/AI 合规审计),但多数是既有岗位换皮或 JD 池不稳定。若您要扩,建议给"有 6 个月以上稳定 JD 池"的硬标准再铺;否则维持 14 条等校招季观察。

### Q4(依赖 Q3 同一批拍)产业专业行业颗粒度再细分?
能源化工 11 条混装风光核电网石化。是拆"新能源/传统能源/电网"三个 L1 子族(注册表阶段动结构),还是保持现状靠词条差异层承接?影响 §7 补量路径的第 2 条。

### Q5(依赖 Q1;最低优先级)边缘职业取舍复审
v1 排除的:宗教职业、纯体力岗、极小众自由职业(独立开发者/自媒体 IP)。v2 维持排除。唯一建议重审的是**自媒体运营(机构 MCN 岗)**——它有稳定 JD 池,和"自媒体博主个人 IP"不是一回事,当前 `newmedia`(新媒体运营)只覆盖企业新媒体岗。若您认可,MCN 向的岗位可作为 1-2 条新增。

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

## ⑦ 距 700-800 的收敛路径(供拍板,不自作主张)

1. **Q2 拆分口径放开**(对银行保险/医药医疗/地产建筑等 16 个产业族比照 12 个高热族做行业场景 L3):估 +80~120 条
2. **Q4 产业颗粒度细分**(能源化工拆 3 子族、物流交通拆客运/货运等):估 +60~100 条
3. **O*NET 反查系统性查漏**(用职业分类学做负清单核对,而不是靠经验列举):估 +50~80 条,这是唯一能发现"整族盲区"的方法(本轮的通信技术/船舶/环评就是典型盲区,靠审计才抓出来)
4. 三项全开的理论上限约 **590-700**,800 仍要靠放宽"独立 JD 池"标准才够得着。**建议把 O*NET 反查(第 3 条)作为量产前的固定动作**,其余两条按 Q2/Q4 拍板结果走。

## ⑧ 给未来 CSV 导入器的两条输入条件(镜头 A 记录,防返工)

1. **`l2_scene` 空值语义**:CSV 里空字符串 = "无行业场景"(l3_flag=0 的母条一律为空),**不是缺失数据**。未来把注册表 CSV 灌进 `occupation_slugs` 表的导入器不能把空串当校验失败;机械核对的一致性规则是 `l3_flag=1 ⟺ l2_scene 非空`(本轮已脚本验证 400/400 通过)。
2. **类型转换必须显式**:CSV 的 `l3_flag` 是字符 `'1'/'0'`,入库列是 boolean——导入器要写显式转换;`status` 全部 `planned`。**不许直接复用 `seed-importer.ts` 的 `isNonEmptyString` 校验链**:那套是给 content JSON(生产产物)设计的,`l2_scene` 在它手里会被"非空字符串"断言误杀,`l3_flag` 也不经过 string→boolean 通道。注册表 CSV 导入是另一条独立路径,需要自己的校验器(可复用 `validateEdgesReferentialIntegrity`,它吃的是结构化行,无此问题)。

## ⑨ 自查清单

- [x] slug 唯一性 400/400、kebab-case 格式、L0 六值域、status 全 planned、l3_flag↔l2_scene 双向一致——机械核对脚本 pass=true,failures=[](输出原文在交付报告)
- [x] edges 零悬空:dev Stage0 官方脚本 pass=true(§3 原文)
- [x] aliases 零悬空/零歧义映射:140/140(§4)
- [x] 90 既有职业库收编不变(本轮未动其中任何 slug/name)
- [x] 新增条目零编造:每条对应真实可检索的校招 JD 池/公开招录体系
- [x] 未触碰 `packages/`(只读取 checks 脚本做验证)、未跑迁移
- [ ] 用户过目批准(门 2 的最后一关,Q1-Q5 拍板后注册表冻结)
