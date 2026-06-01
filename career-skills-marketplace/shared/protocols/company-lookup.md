# 公司背景查询协议(company-lookup)

> 复用方:`career-principal`(单一入口) / `campus-recruitment-diagnosis` / 相关 worker(`company-risk-auditor` / `interview-intelligence` / `opportunity-intelligence` / `city-industry-fit-advisor`)。
> 装后路径:本文件位于 `../_career-skills-shared/protocols/company-lookup.md`(install 把 `shared/*` 打平进 `_career-skills-shared/`,去掉 `shared/` 中间层)。
> 公司库装后路径:`../_career-skills-shared/knowledge/company-taxonomy/`(knowledge 保留 `knowledge/` 前缀)。

## 0. 这份协议解决什么

公司库 = **按需注入的背景增强**,不是主路径硬依赖。命中就把已知考点/风险/业务线喂进产出当弹药,缺失就优雅降级、绝不阻塞主流程。任何一步都**不静默返回空**:查不到也要明说"查了哪几层、都没命中、改用什么兜底"。

库的家底(全部装后路径 `../_career-skills-shared/knowledge/company-taxonomy/`):

| 文件 | 规模 | 字段深度 | 用途 |
|------|------|---------|------|
| `companies.seed.yaml` | 50 家 tier_1 | 最全:`interview_style`(`known_focus`/`rounds`/`difficulty`)、`salary_structure`、`risk_signals`、`business_lines`、`main_roles` | 第①层主查 |
| `aliases.yaml` | 2504 条 | `official_cn`/`official_en`/`nicknames`/`sub_brands`/`biz_units` | 规范化(把口语别名映射到 canonical id) |
| `tier_2_companies.yaml` | 250 家 | 较浅:`company_type`/`main_roles`/`cities`/`hiring_relevance`,`confidence:medium`+`needs_verification:true` | 第③层降级 |
| `tier_3_extended.yaml` | 300 家 | 最浅:`canonical_name`/`aliases`/`company_type`/`cities`,`confidence:low`+`needs_verification:true` | 第③层再降级 |
| `company-types.yaml` | 8 类 | `characteristics`/`salary_range`/`stability`/`typical_culture` | 命中公司类型后补"该类型通用画像";或全未命中时按类型给行业惯例 |

## 1. 三条铁律(先记住,再看流程)

1. **公司库一律标 `freshness:stale` + `data_caveat`**:全库 `freshness:"2026-Q2-estimate"`,是社区/公开 JD 汇编,**非官方认证数据**。任何注入的字段,标源一律 `[据知识库]`,并附口径声明:`data_caveat:"社区汇编非官方,以实际 offer / 官方公告为准"`。
2. **多源冲突显式并列,不硬编、不取中位数**。库里一个口径、实时搜来另一个口径 → 两个都摆出来并标各自来源,例:"薪资 base 月数:[据知识库]16(社区面经口径,stale) / [实时·未核实·某 URL·2026-06-01]15(当季招聘页口径)"。让用户自己判断,不替他选。
3. **需要当季实时信息时按需联网,不拿 stale 数据冒充新鲜**。招聘时间窗/批次、最新薪资、近期组织调整/裁员/暴雷、当季面试流程变化 → 这些时效性强的维度,即便库里命中也要叠加一次 WebSearch,并把库口径标 stale、实时口径标 `[实时·未核实·URL·日期]`。

## 2. 标源标签对照(内联,生成时即绑定来源)

| 标签 | source_type | 何时用 |
|------|-------------|--------|
| `[据JD]` | `jd_text` | 出自用户给的岗位描述 |
| `[据CV]` | `user_resume` | 出自用户简历 |
| `[据知识库]` | `knowledge_graph` | 出自本协议查到的公司库(必带 `freshness:stale`) |
| `[行业惯例]` | `market_prior` | 出自 `company-types.yaml` 的类型通用画像,或公认行业常识 |
| `[推断]` | `ai_inference` | 模型据已有线索推断,无直接出处 |
| `[实时·未核实·URL·日期]` | `web_search` | 本轮真 WebSearch/WebFetch 拿到的当季信息(URL 必须真访问过) |

> 红线:标 `[实时·URL]` 的 URL 必须本轮真搜/真访问过,**严禁编造权威 URL/标题**;标 `[据知识库]` 的字段必须能在 yaml 里定位到原条目。

## 3. 三级降级查询流程(按 tier)

```
用户提到公司名(可能是昵称/简称/子品牌)
        │
  ① Grep companies.seed.yaml ──命中──▶ 注入 tier_1 全字段(known_focus/risk_signals/...)
        │ 未命中                          标 [据知识库] + freshness:stale + data_caveat
        ▼
  ② 过 aliases.yaml 规范化(昵称/子品牌→canonical id)
        │  → 拿到 canonical 名/id 后,回查 ① 的 seed,再命中即注入
        │ 仍未命中
        ▼
  ③ 降 tier_2_companies.yaml ──命中──▶ 注入较浅字段,标 confidence:medium + needs_verification:true
        │ 未命中
        ▼
     降 tier_3_extended.yaml ──命中──▶ 注入最浅字段,标 confidence:low + needs_verification:true
        │ 全未命中
        ▼
  ④ 触发按需联网(WebSearch/WebFetch) ──▶ 标 [实时·未核实·URL·日期];搜不到则
        明说"库三层 + 联网都未命中",改用 company-types.yaml 按类型给 [行业惯例] 通用画像,
        不静默返回空。
```

### 步骤①:先查 tier_1 seed(字段最全,命中即注入)

`companies.seed.yaml` 每家条目的 `aliases` 字段已内联常见昵称(如 tencent 的 `aliases` 含"鹅厂"),所以**第一次 Grep 用用户原话直接搜往往就能命中**,不必先过 aliases.yaml。

```
Read 或 Grep:../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml
关键词 = 用户原话(公司名/昵称/子品牌),如 "鹅厂" 或 "字节" 或 "抖音"
```

命中后注入这些字段(按复用方需要取):
- `interview_style.known_focus` → 喂面试钩子(campus 的 `interviewHooks` / interview-intelligence 的追问预演)
- `interview_style.rounds` / `difficulty` → 面试节奏预期
- `risk_signals` → 风险提示 / honesty_boundary
- `business_lines` / `main_roles` → 业务线与团队选择、岗位匹配
- `salary_structure` → 谈薪/总包拆解(标 stale,实时叠加见铁律3)

> campus 专用约束:公司情报**只增强 `interviewHooks` 与风险提示,不改标尺维度与满分**(locked rubric 防漂移红线不破)。查不到则按通用标尺并注明。

### 步骤②:未命中先过 aliases.yaml 规范化再回查

用户常说昵称/子品牌/事业部简称(库的 canonical 名是全称)。先在 `aliases.yaml` 把它映射回 canonical,再拿 canonical 回查步骤①。

```
Grep:../_career-skills-shared/knowledge/company-taxonomy/aliases.yaml
关键词 = 用户原话
读出该条目的 official_cn(canonical 名)/ key(canonical id)
→ 用 official_cn 或 id 重新 Grep companies.seed.yaml
```

`aliases.yaml` 四类映射字段都要扫:
- `nicknames`:鹅厂→腾讯、度厂→百度、老铁→快手、毒/毒App→得物、小破站→哔哩哔哩
- `sub_brands`:抖音/飞书/TikTok→字节跳动、支付宝/蚂蚁/钉钉/盒马→阿里巴巴、原神/崩铁→米哈游
- `official_en`:ByteDance→字节跳动、Tencent→腾讯、Kuaishou→快手
- `biz_units`:WXG/IEG/PCG→腾讯、CSIG→腾讯、火山引擎→字节跳动

> 注意子品牌可能与目标公司**强弱关系不同**(如"蚂蚁集团"虽列在 alibaba 的 sub_brands,但已独立运营)——映射后若语义存疑,在产出里注明"按库口径归于 X,实际可能为独立实体"。

### 步骤③:降 tier_2 → tier_3

seed 与 aliases 都未命中 → 依次查 tier_2、tier_3。这两层字段浅(无 `interview_style`/`salary_structure`),只能给 `company_type`/`main_roles`/`cities`/`hiring_relevance` 这类轮廓。

```
Grep:../_career-skills-shared/knowledge/company-taxonomy/tier_2_companies.yaml  关键词 = 公司名
未命中再 Grep:../_career-skills-shared/knowledge/company-taxonomy/tier_3_extended.yaml
```

注入时如实标:
- tier_2:`confidence:medium` + `needs_verification:true`("标准画像公司,数据来自公开招聘信息汇编,需定期核实")
- tier_3:`confidence:low` + `needs_verification:true`("低置信度扩展公司,待社区验证")
- 拿到 `company_type` 后,可去 `company-types.yaml` 取该类型的 `characteristics`/`salary_range`/`stability`/`typical_culture` 补一层 `[行业惯例]` 通用画像。

### 步骤④:全未命中或需当季信息 → 按需联网,不返回空

触发条件(满足其一):
- 库三层全未命中;
- 或命中了但维度时效性强(招聘时间窗/批次、最新薪资、近期组织调整/裁员/暴雷、当季面试流程)——此时即便命中也要叠加联网,把库口径标 stale。

```
WebSearch:"<公司名> 校招 2026 面试 流程 薪资"(按缺的维度组关键词)
命中权威/社区源 → WebFetch 读取 → 注入并标 [实时·未核实·<真实URL>·2026-06-01]
搜不到 → 退到 company-types.yaml 按 company_type 给 [行业惯例] 通用画像,
         并明说:"公司库三层 + 联网均未命中该公司具体信息,以下为按公司类型推断的通用参考。"
```

宿主(Claude Code CLI / Codex)本就有 WebSearch/WebFetch,需要时当场搜、附 URL、标实时·未核实·日期;**确无网才降级**并说明此为训练知识/库存数据可能过时。

## 4. 可直接照做的范例

### 范例 A:用户说"我面鹅厂后端"(命中 tier_1)

1. `Grep ../_career-skills-shared/knowledge/company-taxonomy/companies.seed.yaml` 关键词 `鹅厂` → 命中 `id: tencent`(其 `aliases` 已含"鹅厂")。
2. 取字段注入,产出示例(内联标源):
   > 腾讯面试通常 [据知识库]4-5 轮(技术3+业务1+HR1),难度偏高(`freshness:stale,社区面经口径`)。后端方向已知考点 [据知识库]:C++/Go 底层(游戏部门)、系统设计、项目深度拷问、腾讯文化(用户为本)。
   > `data_caveat`:以上来自社区面经/公开薪资分享,非官方,以实际面试为准。
3. 若用户还问"现在还在招吗/给多少" → 时效维度,叠加步骤④:
   > 薪资 base:[据知识库]16 个月(社区口径,stale);当季实际以 [实时·未核实·<真实招聘页URL>·2026-06-01] 为准——已为你现搜:……

### 范例 B:用户说"我拿了 Lark 的 offer"(昵称/子品牌,需先规范化)

1. `Grep companies.seed.yaml` 关键词 `Lark` → 未命中(seed 的 bytedance 别名里没有 "Lark")。
2. `Grep ../_career-skills-shared/knowledge/company-taxonomy/aliases.yaml` 关键词 `Lark` → 命中 `bytedance` 条目(`sub_brands` 含 "Lark"、`biz_units` 含 "飞书")。规范化:**Lark = 飞书 = 字节跳动旗下**。
3. 用 canonical 回查:`Grep companies.seed.yaml` 关键词 `字节` → 命中 `id: bytedance`,注入其 `interview_style.known_focus`(算法 LeetCode 困难级、系统设计/推荐系统、增长思维)、`risk_signals`(["TikTok海外政策风险","部分业务方向调整(教育已收缩)"])。
4. 产出标源:
   > [据知识库]Lark/飞书属字节跳动旗下;字节面试已知考点:算法(LeetCode 困难)、系统设计(推荐系统/信息流)、增长思维(`freshness:stale`)。

### 范例 C:用户说"我面观远数据"(降到 tier_3)

1. `Grep companies.seed.yaml` 关键词 `观远` → 未命中。
2. `Grep aliases.yaml` 关键词 `观远` → 命中 `guanyu-tech`(`official_cn:观远数据`、`tier:tier_3`、`nicknames:["观远","Guandata"]`)。注意:aliases.yaml 也收录了 tier_3 条目,这里直接告诉你它是 tier_3 公司,**回查 seed 必然落空,应直接去 tier_3 取详情**。
3. `Grep tier_3_extended.yaml` 关键词 `观远` → 命中 `id: guanyu-tech`(`canonical_name:观远数据`、`company_type:stable_mid_tech`、`cities:["成都","上海"]`、`confidence:low`、`needs_verification:true`)。
4. 取 `company_type` 去 `company-types.yaml` 查 `stable_mid_tech` 补通用画像。产出标源:
   > [据知识库,confidence:low,needs_verification]观远数据,稳定中厂类(数据 BI 方向),成都/上海。该公司库为低置信扩展数据,**建议联网核实**。
   > [行业惯例]稳定中厂通常:业务垂直晋升空间足、薪资稳定但次于大厂、年终 0.5-3 个月。
5. 因 confidence:low,主动叠加步骤④联网核实关键事实(在招岗位/最新动态),把实时结果标 `[实时·未核实·URL·日期]`,与库口径并列。

### 范例 D:用户说"XX 智能(一家没听过的初创)"(全未命中 → 联网兜底)

1. seed / aliases / tier_2 / tier_3 四查全未命中。
2. 触发步骤④:`WebSearch "<XX智能> 公司 融资 招聘 2026"` → 若命中,`WebFetch` 读取,标 `[实时·未核实·<真实URL>·2026-06-01]`。
3. 若联网也查不到 → 明说降级,不返回空:
   > 公司库三层 + 联网均未查到「XX 智能」的具体信息。[推断]从名称看可能属 AI 初创类;[行业惯例]AI 初创通常股权占比高、不确定性高、人均产出要求极高(见 company-types `ai_startup`)。建议你直接向 HR / 公开融资信息核实。

## 5. 写进 evidence_used 的最小字段(给可机械校验)

命中库时,在产出的 `evidence_used.items` 至少带:

```yaml
- source_type: knowledge_graph        # 库命中
  source_name: "company-taxonomy/companies.seed.yaml#tencent"
  freshness: stale                    # 全库强制 stale
  reason: "目标公司面试考点与风险信号背景增强"
  data_caveat: "社区汇编非官方,以实际 offer / 官方公告为准"
```

联网叠加时再追加一条 `source_type: web_search` + 真实 `source_url` + `freshness: live`。多源冲突时两条都保留,产出正文显式并列。
