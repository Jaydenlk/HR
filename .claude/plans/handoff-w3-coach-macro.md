# Handoff: 第3批 — Coach 宏观层(扩选择器,让对话能调已落库模块历史)

## 状态: READY_FOR_IMPL
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
