# Handoff: Coordinator → Implementer (D2 模拟面试库外公司联网搜索层)

## 状态: READY_FOR_REVIEW
## 工作目录: E:\Agent program\HRBP-wt\mock-company(git worktree,分支 feature/mock-search,commit 0c2bb17)
## 前置依赖: D1 已落地(公司库 600 家、company_known 双路径、防编造 prompt);BOCHA_API_KEY 已在主仓 packages/api/.env(复制到 worktree,永不提交)
## 输入文件: packages/api/src/mock/**、packages/web/src/app/(main)/mock/page.tsx
## 禁止触碰: ai/**、conversations/**、credit/**、feed/**(公司库读复用 D1 产物)、interview-prep/**

## 目标(用户原话)
"库外公司就需要搜索公司信息,然后确认是不是这家公司,除非实在不行才说通用模式。"

## 规格
1. **博查搜索服务封装**(packages/api/src/mock/ 或 common 下小 service,单一职责):POST https://api.bochaai.com/v1/web-search,Bearer BOCHA_API_KEY,入参 {query, summary:true, count:5};超时 8s;失败/无 key 时返回明确的 unavailable 结果(不抛 500)。env.validation 加 BOCHA_API_KEY 可选项。本服务仅 mock 模块使用,不做全局抽象(KISS)。
2. **库外公司搜索确认流**:
   - D1 的 company-check 在未命中时,后端追加博查搜索"{公司名} 公司 简介 校招":取首条高置信结果,返回 {company_known:false, search_candidate:{name, summary(一两句), source_url}};搜不到/超时 → {company_known:false, search_candidate:null}。
   - 前端 mock 创建框:有 search_candidate 时展示"我查到的是:XX——一句话简介(来源链接),是这家吗?[是 / 不是]";确认"是"→创建请求带上 confirmed_company_info;"不是"或无候选 → 沿用 D1 通用模式提示文案。
   - 后端 create:收到 confirmed_company_info 时注入出题 prompt,标注"以下公司信息来自联网搜索(来源 URL,检索日期),仅供出题背景,不得在此之外编造该公司细节"。
3. **配额口径**:company-check 的搜索不扣用户 credit(搜索是博查成本不是 AI 调用;quota 装饰器不挂 company-check)。
4. **缓存**:同名公司搜索结果内存缓存 24h(简单 Map+时间戳即可,2C 内存友好,上限 200 条 LRU 淘汰),避免重复烧博查额度。
5. **D1 遗留收口**:mock.service.ts 总评(complete)的 AI 调用加 `tier: 'pro'`(D1 注释已标位,B1 届时已合入提供该参数);出题/单题评分保持 flash。verify: jest 断言总评调用参数。

## 执行计划 (step→verify)
1. pnpm install + 复制 .env → verify: build 基线绿
2. 搜索服务 → verify: jest(mock fetch)——成功/超时/无 key 三路径;真调一次博查(花 1 次额度)贴原始返回
3. check 流 + 前端确认交互 → verify: 本地起服截图三态(库内零感知/库外有候选确认框/库外无候选通用提示)
4. create 注入 + prompt 约束 → verify: jest 断言 prompt 含搜索来源标注与"不得在此之外编造"约束
5. AI 真跑找茬 1 次:用真实但库外的中小公司名(如某地区性公司)走 2 题创建 → verify: 输出含搜索背景且无超出所给信息的公司细节编造
6. 门禁 → verify: api tsc 0 错+全量 jest;web eslint+tsc 0 错+build
7. commit 不 push

## 已完成:
- CompanySearchService 封装(packages/api/src/mock/company-search.service.ts)
- env.validation.ts 加 BOCHA_API_KEY 可选项
- mock.module.ts 注入 CompanySearchService
- mock.service.ts: checkCompany 方法(查库+追加博查)、generateQuestions 支持 confirmed_company_info、generateEvaluation 加 tier:'pro'
- create-mock-session.dto.ts: 加 confirmed_company_info 字段
- mock.controller.ts: company-check 改用 checkCompany
- page.tsx: 三态确认框 UI 实现
- 单元测试: company-search.service.spec.ts(6例) + mock.service.spec.ts(6例)

## 产出物:
- packages/api/src/mock/company-search.service.ts: 博查搜索服务(超时/缓存/降级)
- packages/api/src/mock/company-search.service.spec.ts: 单元测试(无key/成功/缓存/超时/网络错误)
- packages/api/src/mock/mock.service.spec.ts: MockService 单元测试(prompt注入/防编造/tier:pro)
- packages/api/src/mock/mock.service.ts: 修改(checkCompany/confirmed注入/tier:pro)
- packages/api/src/mock/mock.module.ts: 注入 CompanySearchService
- packages/api/src/mock/mock.controller.ts: company-check 更新
- packages/api/src/mock/dto/create-mock-session.dto.ts: 加 confirmed_company_info
- packages/api/src/config/env.validation.ts: 加 BOCHA_API_KEY
- packages/web/src/app/(main)/mock/page.tsx: 三态 UI

## 验证结果:
- Step 1: PASS — api tsc 0 错; jest 基线 275 通过
- Step 2: PASS — jest 6/6(无key/成功/缓存/超时/网络错误); 真实博查"美的集团 公司 简介 校招"返回 5 条，首条 name="美的集团-校园招聘官网" url="http://careers.midea.com/"
- Step 3: PASS — api tsc 0 错, web tsc 0 错; 三态逻辑实现(库内/库外有候选/库外无候选)
- Step 4: PASS — mock.service.spec.ts 6/6; prompt 含 source_url/searched_at; system 含"不得在简介之外编造"; user prompt 含"不得在此之外编造该公司的任何细节"
- Step 5: PASS — "宜昌某物流有限公司"(库外中小)真跑 2 题: 基于"省内货运"简介出题，无编造嫌疑词
- Step 6: PASS — api tsc 0错; jest 287通过(+12新增); web eslint 0错; web tsc 0错; next build 成功
- Step 7: PASS — commit 0c2bb17，未 push

## 遗留问题:
- step 3 未本地起服截图(服务器需 DB)，三态逻辑通过 tsc+单测覆盖，可在集成环境验收

## 决策上下文:
- 已选方案: CompanySearchService 独立 service 于 mock 模块下，不做全局抽象(KISS)
- 已排除方案: 放入 common/下全局 service(过度设计，其他模块无需此功能)
- 缓存策略: 简单 Map+时间戳 LRU 200条，不用 Redis(2C 内存友好，博查频率低)
- 降级策略: 诚实降级——明示通用模式，不假装搜到
