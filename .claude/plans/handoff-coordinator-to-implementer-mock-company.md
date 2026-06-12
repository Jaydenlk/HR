# Handoff: Coordinator → Implementer (D1 模拟面试公司层,不含联网搜索)

## 状态: 待 Phase A 合 dev 后启动(可与 B1 并行,文件集不相交;协调者届时建 worktree feature/mock-company 并填入路径)
## 工作目录: 【派工时填写】
## 任务: 600 家公司库移植 + 模拟面试防编造 + 公司库命中/未命中双路径明示
## 输入文件: packages/api/src/mock/**、packages/api/src/feed/company-registry.service.ts(读懂灌库与匹配逻辑)、data/sources/company_seed.json、career-skills-marketplace/skills/_career-skills-shared/knowledge/company-taxonomy/*.yaml(只读源数据)、packages/web/src/app/(main)/mock/page.tsx(小改:未命中提示)
## 禁止触碰: ai/**、conversations/**、credit/**、interview-prep/**(只许参考其防编造写法,不许改它)、.env

## 背景
模拟面试现状:公司名自由文本直插 prompt(mock.service.ts:37),零防编造——AI 会编造陌生公司的面试风格。用户拍板三层方案,本批做第 1、3 层(第 2 层联网搜索等 BOCHA_API_KEY 到位另批)。

## 规格
1. **公司库扩充**:写一次性转换脚本(scripts/ 下,Node/TS)把 skill 侧 company-taxonomy 三个 yaml(seed 50 + tier_2 250 + tier_3 300)转入 data/sources/company_seed.json 现行 schema(name/aliases/bu_aliases/company_type/priority/source_preference/role_focus/sector/reason_type/reason);按 name+aliases 与现有 80 家去重合并(现有 80 家字段不动)。**硬约束:新增公司 priority 一律 'C'**——先读 search-scheduler.service.ts 的 fetchPriorityCompanies 确认它只取 A/B,确保 feed 情报雷达的每日搜索预算(30)不被 520 家新公司撑爆;CompanyRegistryService.onModuleInit 灌库逻辑确认幂等(重启不重复插)。
2. **mock 创建时查库**:create 流程加公司解析步(name/aliases 匹配,复用或对齐 CompanyRegistryService.matchCompany 的匹配语义):
   - 命中 → 出题 prompt 注入库内已知字段(company_type/sector/role_focus 等),并括注"以下公司背景来自本站公司库";响应加 `company_known: true`。
   - 未命中 → prompt 不含任何公司具体信息,明确指示"以通用校招面试 + JD/岗位驱动出题";响应 `company_known: false`。
3. **三段 prompt 防编造硬约束**(出题/单题评分/总评,写法对齐 interview-prep.service.ts:594 风格):不得编造该公司的具体面试流程、真题来源、内部评价标准;公司特定信息仅限本次提供的内容;无公司信息时不得伪装了解该公司。总评的 AI 调用标 `tier: 'pro'`(若 AiService 尚无 tier 参数则跳过此小项并记遗留,B1 合入后协调者收口)。
4. **前端明示**(mock/page.tsx 小改):创建表单公司名失焦或提交后,company_known=false 时展示一行非阻断提示:"该公司不在资料库,将以通用面试+JD 驱动出题,不会假装了解这家公司"。需要后端暴露轻量查询(GET /mock-sessions/company-check?name= 或在创建响应里带,二选一,选实现最简者并在产出物里说明)。
5. **范围纪律**:模拟面试现有流程(出题→作答→总评)与数据结构不变;只加层。

## 执行计划 (step→verify)
1. pnpm install → verify: build+既有 jest 基线绿
2. 转换脚本 + 灌库 → verify: 脚本输出统计(总数≈600+80去重后实数、各 tier 计数);启动 api 后 companies 表行数一致;重启不重复;search-scheduler 仍只调度 A/B(贴 grep/测试证据)
3. 查库双路径 + prompt 改造 → verify: jest——库内公司(如"字节跳动"及别名"抖音")prompt 含库内背景注入;生造公司("量子翻斗云科技")prompt 含通用模式指令且无编造素材;三段 prompt 均含防编造约束(断言关键句)
4. company_known 透出 + 前端提示 → verify: 前端本地真跑截图(命中无提示/未命中有提示);eslint+tsc 双端 0 错
5. AI 真跑找茬 1 次:用生造公司名走完整场 2 题模拟面试 → verify: 贴输出全文,人工检查无"编造该公司风格/流程"语句(找到=FAIL,修 prompt 再跑)
6. 门禁 → verify: api+web 各自 tsc/eslint 0 错、jest 全绿,原始摘要
7. 提交 feature/mock-company(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
- feed 模块行为零回退是硬约束(公司库是它的地基)
- 不许为绕 lint/类型加 any;不许动 interview-prep
- 完成后更新本文件(已完成/产出物/逐 step 验证结果/遗留)
