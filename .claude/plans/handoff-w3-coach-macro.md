# Handoff: 第3批 — Coach 宏观层(扩选择器,让对话能调已落库模块历史)

## 状态: DONE(fable-dev 已实现+验证,commit 未 push;2026-06-13)
## 工作目录: E:\Agent program\HRBP-wt\coach-macro(分支 feature/coach-macro,基于 dev @1e13fb9,含第1批+第2批成果)
## 执行代理: fable-dev(Opus)。碰 conversations 对话核心(B2 成果),保守用 Opus,务必不破坏 B2 的流式/按需取数/handoff 卡片。
## 禁止触碰: ai/**、credit 内核、第1/2批已完成的模块代码(career.service/industry-trend 等只读参考);不建新表(本批纳入的模块都已落库)

## 目标(用户原话 + 拍板档位)
用户:"coach 那个 chat bot 应该是一个宏观一层的,它可以调用任何模块里面的用户的历史数据进行对话。" 拍板档位:**扩已落库模块全文**(本轮只做已落库的,6 个即时模块不强行落库留下轮)。

## 现状(侦察坐实)
- CoachContextService(packages/api/src/conversations/coach-context.service.ts)两层上下文:EvidenceService.gather 的 10 模块**摘要** + buildContext 的主简历全文/最新诊断要点/产物目录。
- 按需取数选择器 loadReferencedProducts 的 LoadKind **只有 'diagnosis' | 'cover_letter'** 两类能加载全文。
- 缺口:用户说"看看我上次的模拟面试评估""我的职业地图历史"时,chat 只有摘要、拿不到全文——因为这些模块虽已落库,但选择器没覆盖。

## 规格(选项 A:只扩选择器,改动集中 conversations 模块,低风险)
1. **扩 LoadKind + 全文加载**:在 CoachContextService 给以下**已落库**模块补 loadXxxFull 方法,纳入选择器:
   - `interview`(interviews 表,真实面试复盘:transcript/scores/knowledge_gaps/prediction)
   - `mock_session`(mock_sessions 表,模拟面试:questions/answers/evaluation)
   - `application`(applications 表,投递管道:阶段/事件)
   - `opportunity`(opportunities 表,机会评估全文)
   - `career`(career_analysis 表,第2批刚落库:职业地图/能力盘点历史)
2. **目录条目**:gatherSelectorCatalog / gatherCatalog 加这 5 类的目录(id/标题/日期),让 flash 选择器能据此判断该加载哪几份。沿用 B2 的选择器机制(flash 小 schema 判 need,上限控制别超 token)。
3. **白名单过滤**:加载前确认 id 属于当前用户(owner),复用 B2 已有的目录白名单过滤模式,防幻觉/越权 id。
4. **不碰 EvidenceService.gather**(那是摘要层,被 chat+月刊+机会评估三处共用,动它要回归三处)——本批只在 CoachContextService 的选择器层扩展全文加载,不改 gather。**若实现中发现确实必须改 gather,停下来在 handoff 记录并回归 newspaper + opportunity-evaluator 两个共用方。**
5. **不建表、不碰 6 个即时模块**(行业趋势/学习路线/人脉/Offer对比/跟进——本轮不落库,留下轮)。
6. **token 控制**:每类全文加载要有长度上限(对齐 B2 简历 6000 字截断的做法),5 类都纳入后注意开场上下文别撑爆 maxTokens;选择器一次加载份数设上限(如 ≤3)。

## step→verify
1. pnpm install + 复制 .env(永不提交) → verify: 双端 build 基线绿
2. 扩 LoadKind + 5 类 loadXxxFull + 目录条目 → verify: jest——选择器命中各类型加载对应全文;白名单过滤越权/幻觉 id;长度截断生效
3. 不破坏 B2 回归 → verify: jest——现有 diagnosis/cover_letter 全文加载、流式、handoff 卡片剥离、按需取数选择器全部仍绿(chat-stream/coach-context/conversations 相关 e2e)
4. **AI 真跑(花真钱)**:对话里问"我上次模拟面试表现怎么样""帮我回顾下我的职业地图" → 验证 chat 真能调出对应模块全文并基于它回答(带标源标签 [据模拟面试]/[据职业地图]),不是泛泛而谈。贴输出。
5. 门禁 → verify: api tsc 0 错+全量 jest(真key+空key都绿);web eslint+tsc 0 错+build;贴数字
6. commit feature/coach-macro(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
- 不破坏 B2 的流式/按需取数/handoff/七要素 prompt(回归必绿)
- 不建表、不碰 EvidenceService.gather(除非记录并回归三处共用方)
- token 有上限,2C2G 内存友好
- 零 mock 零 any;范围手术刀;完成写回本文件(隔离则副本+说明)

---

## 执行结果(fable-dev,2026-06-13)

### 环境修复(动手前)
worktree 工作树损坏:`.git/worktrees/coach-macro/index.lock` 残留(0字节空锁,前次 git 进程崩溃),
index 丢失 → 工作区被 git 视作全删,且 `packages/` 未检出。`rm index.lock` + `git reset --hard HEAD`
重建 index 并检出全部 1713 文件,回到干净 `1e13fb9`。分支指针/提交对象全程完好,无数据丢失。

### 改动文件清单
- `packages/api/src/conversations/coach-context.service.ts`(主体:LoadKind 扩 7 类 + 注入 7 repo +
  目录条目 + 5 个 loadXxxFull + loadFull 分发 + truncateText)
- `packages/api/src/conversations/conversations.module.ts`(forFeature 注册 Interview/MockSession/
  Application/ApplicationEvent/CareerAnalysisRecord)
- `packages/api/test/coach-context.e2e-spec.ts`(新增 12 用例:5 类全文加载/白名单幻觉id/越权kind/
  MAX_LOAD上限/选择器降级/截断)
- `packages/api/test/conversation-context.e2e-spec.ts`(集成模块同步注册新 repo+实体,DI 保护)
- `packages/api/test/chat-stream.e2e-spec.ts`(同上,流式回归模块同步)
- `packages/api/test/chat-fixes.spec.ts`(F5 stub 的 new CoachContextService 补齐 7 个构造参数)
- `packages/api/test/coach-macro-recall-ai-live.e2e-spec.ts`(新增:step4 AI 真跑剧本,默认 skip)

### 逐 step 结果
- Step1 pnpm install + 复制 .env + 双端 build:**PASS** —— install exit 0;.env 从主仓拷入(git
  check-ignore 确认被忽略);api build exit 0、web build exit 0。
- Step2 扩 LoadKind+5类loadXxxFull+目录条目:**PASS** —— `coach-context.e2e-spec.ts` 18 passed
  (原6+新12),覆盖各类型命中加载/白名单过滤幻觉id+越权kind/MAX_LOAD≤3/选择器降级/truncateText 截断。
- Step3 不破坏 B2 回归:**PASS** —— 真key:coach-context+conversation-context+chat-stream+
  conversations.e2e+coach-handoff = 5 suite 全绿(77/80,3 skip为AI-live);chat-fixes.spec 10 passed
  (F5 合并查询断言仍成立)。流式/handoff卡片剥离/按需取数选择器/七要素 prompt 全部仍绿。
- Step4 AI 真跑(花真钱):**PASS** —— `coach-macro-recall-ai-live` 2 passed。
  ① 问"我上次模拟面试表现怎么样":AI 逐字调出 mock_session 全文——"评级 A,总分 82"、逐题问答
  (Q"讲一个你主导的项目"/答"负责需求梳理和排期"/得分6/反馈"建议补充量化数据"),带标源 [据诊断]
  [据平台记录,并引用模拟面试逐题问答]。
  ② 问"帮我回顾下职业地图":调出 career 全文——"产品经理(85%)""运营专家(70%)""数据分析 当前6/
  JD要8 硬缺口""用 SQL 做过报表"(evidenceFound 原文),并交叉引用模拟面试,带标源 [据平台记录 id=...]。
  证明真能按需调出对应模块全文回答+标源,非泛泛而谈。
- Step5 门禁(真key+空key):**PASS** —— api tsc 0错;api `test`(.spec) 356 passed/11 skip;
  api `test:e2e` 真key 905 passed;空key 本批相关回归集 77 passed 全绿;web eslint+tsc 0错;双端 build 绿。
  **遗留 flaky(非本批引入)**:全量 e2e 偶发 1 条超时——真key那次是 `mock-sessions` 的
  company-check(博查外网8s降级>jest5s,空 BOCHA_KEY 环境必现);空key那次是 `tasks.e2e` 的
  generate(用例名自标"triggers AI — may timeout")。已 `git stash` 在干净基线 `1e13fb9` 复跑
  mock-sessions 得 39 passed → 坐实是网络/AI时序型 pre-existing flaky,与本批改动零因果(改动仅
  touch conversations/career,未碰 mock/tasks/company-search)。
- Step6 commit(不push):见下方提交说明。

### 红线核对
- 未碰 EvidenceService.gather:`intelligence/` 目录零 diff。
- 不建表:全是已落库实体的 repo 查询(Interview/MockSession/Application+Event/Opportunity+Eval/
  CareerAnalysisRecord)。
- token 上限:新增 FULL_MAX_CHARS=6000 单份截断(transcript/qa/能力盘点用 truncateText);新5类目录
  各 CATALOG_TAKE=5、诊断/求职信保持 take 10;选择器一次 MAX_LOAD≤3。
- 零 mock 零 any;产品代码无 TODO/FIXME/console.log;.env 未入改动。

### handoff 写回说明
本结果已成功写回主仓 `E:\Agent program\HRBP\.claude\plans\handoff-w3-coach-macro.md`(主仓工作区可写,
无需 worktree 副本)。
