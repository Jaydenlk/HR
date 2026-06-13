# Handoff: 第2批 — career 可信度一条龙(防编造 + 落库 + AI能力板块 + 问卷自评 + 历史)

## 状态: READY_FOR_IMPL
## 工作目录: E:\Agent program\HRBP-wt\career(分支 feature/career-trust,基于 dev @c3fbf28)
## 执行代理: fable-dev(Opus)。前后端契约耦合紧,一个代理一条龙收口,不拆 agent。
## 禁止触碰: ai/analyzer.service.ts、diagnoses/**(career 与诊断打分链路互不依赖,别动)、credit 后端内核、其他模块

## 病根(侦察坐实,这是产品可信度红线)
career.service.ts:76 让 AI 直接给能力盘点 current 分(0-10),**完全没有诊断那套防编造护栏**——对照 ai/prompts/analyze-profession-standard.ts:21-26 有"直接证据铁律/无证据给低分/evidenceFound/退化检测",career 一个都没有。用户实证:自己 Python 只有 if-else 水平,却被打 6 分,因为 AI 拿训练记忆对"Python 这个词"泛化打分,与简历里有没有真 Python 项目无关。career 模块当前不落库(无 entity 无表),每次即时生成即弃。

## 依赖影响(侦察已分析,放心改)
- career 改打分**不牵连** AnalyzerService/diagnoses(两者互不依赖,各打各的)。
- 新建表不影响现有表(diagnoses/resumes/credit 等)。
- 前端 tooltip 用第1批已合入 dev 的 `components/ui/tooltip.tsx`(直接 import)。
- 点数广播用第1批已合入的事件机制 `coach:credit-refresh`(career 页这批才补,第1批没碰它)。
- career 落库后,第3批 Coach 宏观层会把它纳入选择器(本批只管落库+历史接口,不碰 conversations)。

## 规格

### 后端 career.service.ts + 新表
1. **防编造(核心)**:
   - system prompt 加"直接证据铁律"(参照 analyze-profession-standard.ts:21-26 精简为 career 版):skill_audit 的 current 分必须能在简历里找到**直接证据**(具体项目/经历/技术描述)才能给中高分;有相关经历但无具体深度证据只能给低档(1-3);简历完全没提该技能 → 0 分。严禁凭技能名泛化打分。
   - skill_audit schema 每条加 `evidenceFound` 字段(string:该技能在简历中的证据原文片段;无证据则空字符串)。
   - 服务端**退化检测**(参照 analyze-profession-standard 的 isDegenerate/suppressForSuspiciousNumbers):若某技能 current≥4 但 evidenceFound 为空 → 判定编造,服务端压到低档(如 2)或整体重试(最多 3 次)。压分要在响应里留痕(让前端能显示"未在简历找到证据,分数已下调")。
2. **落库(满足"看历史"+"为第3批 Coach 可调铺路")**:
   - 新建 `career_analysis` 表(手写 migration,命名冒烟按 deploy/README.md §2.1):id/user_id/result_json(simple-json)/created_at,索引 (user_id, created_at)。
   - analyze 成功后 save 一条。
   - 加 GET /career/history(列该用户历史,JwtAuthGuard,只返回 id/created_at/摘要)+ GET /career/history/:id(owner-only,404 不泄露)。这俩不扣 credit(只读历史)。
3. **AI 能力(AI skills)板块**(用户明确要):
   - skill_audit prompt 里**专门产出一组 AI 能力维度**(如:AI 工具应用、提示工程/Prompt、AI 辅助工作流、数据与 AI 素养——按岗位调整),与普通技能区分(schema 加 category 字段:'general'|'ai',或单独 ai_skills 数组)。
   - AI 能力**同样套防编造**:简历没提 AI 相关就给低分+evidenceFound 空,不许因为"现在都用 AI"就泛给分。
4. **问卷自评校准**:
   - 新建 `user_skill_self_assessment` 表(user_id/skill_name/self_score 0-10/updated_at,唯一约束 user_id+skill_name)。
   - POST /career/self-assessment(JwtAuthGuard,不扣 credit,body: [{skill_name, self_score}]):upsert 用户自评。
   - analyze 时:先查该用户自评,**有自评的技能用自评 self_score 覆盖 AI 的 current**(AI 分仅作参考保留),响应标注该分来自"用户自评"。这是"以真实自评精进数据"的落点,也是对 AI 虚高分的人工纠偏。

### 前端 career/page.tsx(本批收口所有 career 前端改动)
5. **AI 能力板块**:能力盘点里单独渲染 AI 能力组(对应后端 ai 类技能),视觉与普通技能区分。
6. **问卷自评二级页**:初次生成职业地图后,页面留入口(如"觉得分数不准?填自评精进")→ 点进二级页(/career/self-assessment 或弹层),各技能滑块自评 0-10 → 提交调 POST /career/self-assessment → 回到职业地图重新生成/刷新,分数按自评校准。
7. **bigGap bug 修**:career/page.tsx:489 `needed-current>30` → `>3`(量程 0-10,原阈值永远触发不到,危险色失效)。
8. **分数 tooltip**:import 第1批的 `@/components/ui/tooltip`,给能力盘点每个分数加悬停说明——内容含"这分怎么来的"(evidenceFound 依据;若被退化检测压分则说明"未在简历找到证据,已下调";若来自用户自评则说明"你的自评")。停留约 500ms 出现。
9. **点数广播**:career analyze 扣点成功后补 `window.dispatchEvent(new Event('coach:credit-refresh'))`(第1批没碰 career 页,这批补,对齐其他 6 页写法)。
10. **历史记录入口**:职业地图加"历史"入口,列过往生成记录,可回看(调 GET /career/history)。

## step→verify
1. pnpm install + 复制主仓 .env(永不提交) → verify: 双端 build 基线绿
2. 后端防编造 prompt+evidenceFound+退化检测 → verify: jest 断言 prompt 含证据铁律关键句、schema 含 evidenceFound;退化场景(高分无证据)被压分
3. 落库 migration + 历史接口 → verify: migration 冒烟(career_analysis 表);jest history owner-only 404/列表;analyze 后落一条
4. AI 能力板块(后端产出 ai 类技能 + 同防编造) → verify: jest 断言 ai 类技能存在且无证据给低分
5. 问卷自评表+接口+校准 → verify: jest——POST 自评 upsert;analyze 时有自评的技能用自评覆盖 AI 分
6. 前端 5-10 全部 → verify: 本地起服真浏览器——AI 能力板块渲染/问卷二级页填提交回流/bigGap 危险色能触发/分数 tooltip 悬停出现/历史列表/扣点后侧边栏刷新;每项截图
7. **AI 真跑防编造验收(关键,花真钱)**:造一份"Python 只在某课程作业写过 if-else 判断"的简历跑职业地图 → 验证 Python 不再给 6 分,而是低档分(≤3)+ evidenceFound 如实(或空)+ 若 AI 仍想给高分被退化检测压下。贴输出。**这是用户原始痛点的直接验收。**
8. 门禁 → verify: api tsc 0 错+全量 jest;web eslint+tsc 0 错+build;贴数字
9. commit feature/career-trust(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),不 push

## 红线
- 防编造是本批灵魂:宁可分数偏低也不许无证据虚高(诚实 > 好看)
- migration 纯加法,不碰现有表
- 零 mock 零 any(测试 mock 的 as unknown as 可,产品代码不可)
- 范围手术刀;前后端契约自洽(一个代理一条龙的优势,别让前端调不存在的字段)
- 完成写回本文件(隔离则工作目录副本+说明)
