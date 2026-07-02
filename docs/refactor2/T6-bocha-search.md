# T6 · 博查统一搜索服务(公司搜索重设计)

## 目标
根治"同名/模糊公司搜不到或搜错"的问题:多候选+消歧+落库缓存,以模拟面试为主战场;搜索结果持久化,供 T5 投递详情页复用。

## 病根(侦察已实锤,2026-07-02)
- `packages/api/src/mock/company-search.service.ts:85-93` 请求博查 `web-search` count=5,但 `extractCandidate()`(L119-130)**只取 items[0]**,扔掉其余 4 条;name/url 任一为空即判"没搜到"。
- 前端 `(main)/mock/page.tsx:495-507` 只展示这 1 条让用户点"是/不是",用户没机会看到其他候选。
- 无任何消歧:不给 AI 多候选、不用简历/JD 上下文二次匹配。
- 调优药方已有文档但从未落地:`docs/part5-bocha-tuning-obscure-2026-06-26.md`(天眼查/企查查强召回 + 上下文二次匹配 + count 提升 + 多候选级联)。实现前必读。
- 两处独立实现:mock 的 company-search + industry-trend 的 industry-bocha(后者已随 T1 删除)。
- `ai-search` 端点该 key 403 无套餐,只用 `web-search`。

## 设计定稿

### 1. 统一服务
新建 `packages/api/src/company-research/` 模块:
- `bocha.client.ts`:唯一博查低层客户端(8s 超时、AbortController、无 key/超时/非2xx 归一化为 `{available:false, reason}` 不抛 500 —— 保留现有降级语义)。
- `company-research.service.ts`:业务层,聚合 搜索→候选→消歧→缓存。
- mock 模块改为注入本服务;`company-search.service.ts` 删除。

### 2. 搜索与候选
- count=10;两路查询合并:通用查询 + `include=tianyancha.com,qcc.com` 强召回(按调优文档配方)。
- **候选全量保留**,提取为 `SearchCandidate[]`(name/summary/source_url/domain),不再截断。

### 3. 消歧三层(顺序执行,命中即止)
1. **精确命中**:归一化(去空格/全半角/大小写/常见后缀"有限公司/科技/集团"剥离比对,但展示原名)后与输入完全相等的唯一候选 → 直接确认。
2. **上下文匹配**:多候选时,把候选列表+可用上下文(该场景的 JD 文本/用户简历里的城市、行业)交给 GLM(经 AiService)打分排序,输出置信度。高置信(阈值实现时定,建议 ≥0.85 且第 1、2 名分差明显)→ 取首位但仍走前端确认。
3. **人工消歧**:置信不足 → 前端展示 **top 3-5 候选列表**(名称+一句简介+来源域名)供用户点选,附"都不是→通用模式"。**模拟面试永不只给一个结果**(用户明确要求)。

### 4. 落库与缓存(用户拍板的防错规则)
新实体 `company_research`:`id / canonical_name(归一化名,唯一索引) / display_name / summary / source_url / source_domain / retrieved_at / raw(jsonb)`。
- **缓存命中条件 = 归一化名精确相等 且 retrieved_at 距今 ≤7 天**。
- **模糊匹配永远只用于生成候选,永远不用于命中缓存**——形似名字绝不静默复用别家公司的资料;历史查过的相近公司最多作为候选之一标注"此前查询过"摆出来供选择。
- 缓存命中时 mock 流程仍走前端确认(展示缓存候选,用户可拒绝触发新搜索)。

### 5. 消费方
- mock:`checkCompany` 返回候选数组(破坏性 API 变更,前端同步改多候选 UI);确认后的公司信息拼 prompt 逻辑(`buildCompanyContext` 防编造规则)保留不动。
- T5:投递详情页通过 application 关联读取 company_research(见 T5 文档)。

## 改动清单
1. 新建 `packages/api/src/company-research/`(module/service/client/entity/spec)。
2. 手写 migration:建 `company_research` 表。
3. `mock.service.ts` / `mock.controller.ts`:company-check 返回 `candidates: SearchCandidate[]` + `confidence` 结构;删除 `company-search.service.ts`。
4. `packages/web/src/app/(main)/mock/page.tsx`:公司确认 UI 改多候选点选(雷达列表+都不是兜底)。
5. GLM 上下文匹配 prompt 走 AiService(不直连供应商)。

## 派工方案

**编排:一条 dynamic workflow** — stage1: A 后端(串行)→ stage2: B 前端(依赖 A 的 API 形状,串行)→ stage3: C(jest e2e + Playwright)与 D(审计)**并行扇出** → 汇总。

**Agent A(implementer,Sonnet,worktree)** — 后端,prompt:
```
任务:按 docs/refactor2/T6-bocha-search.md 设计定稿 1-5 实现统一公司搜索服务。
必读输入:该文档;docs/part5-bocha-tuning-obscure-2026-06-26.md;packages/api/src/mock/company-search.service.ts(现状);mock.service.ts;concurrency/credit 现有守卫用法。
禁止触碰:ai.service.ts 流式部分、限流器、diagnoses 模块。
硬规则:缓存只认归一化名精确相等;候选不截断;博查降级语义({available:false})保持;migration 手写。
交付:worktree 分支 feat/t6-bocha;单测覆盖:缓存精确命中/形似名不命中/7天过期/候选全量提取/无key降级。
验证:cd packages/api && npx jest company-research --verbose 附原始输出;npx jest 全量回归。
```

**Agent B(implementer,Sonnet,同 worktree 串行)** — 前端多候选 UI(依赖 A 的 API 形状,串行不并行)。验证:eslint 0 错 + build 过。

**Agent C(test-agent,Sonnet)** — Playwright:①常见公司精确名→直接确认;②模糊/同名场景(如"华为"vs"华为云计算技术有限公司")→出现多候选列表;③"都不是"→通用模式;④二次搜索同名公司 7 天内→秒回(缓存)。Jest e2e:company-check 端点正常/异常(无key)两路。

**Agent D(reviewer,Sonnet,只读)** — 重点找茬:缓存键是否可能被模糊命中;候选截断是否复发;mock 出题 prompt 防编造规则是否被动过。

## step→verify
1. 统一服务+落库 → verify: 单测 5 项全绿(附输出)
2. 多候选 API → verify: jest e2e 返回候选数组,同名公司场景 ≥2 候选
3. 前端多候选 UI → verify: Playwright 模糊场景出现点选列表
4. 缓存防错 → verify: 单测"形似名不命中缓存"绿
5. 回归 → verify: jest 全量绿 + mock 出题全流程 Playwright 过

## 红线
- 模拟面试确认环节永不单候选。
- 缓存永不模糊命中。
- 不动 buildCompanyContext 的防编造规则。
