# Coach 全平台智能审计（Codex）

日期：2026-05-25
范围：核查 Coach 是否能读取整个平台用户数据、各模块是否能跑、是否真实调用 AI、后台是否有策略。

## 结论

当前 HRBP/Coach 的后端模块大多已经能启动并返回真实 API 数据，CloudDreamAI 通道也能真实调用；但产品尚未达到“Coach 懂你”的体验。

核心问题：系统没有统一的 User Context / Coach Memory 层。各模块各自取少量上下文，各自拼 prompt。Coach 对话本身不会自动读取简历、投递、面试、任务、求职信、机会、Feed、薪资等全平台数据。

因此：
- “模块能跑”：基本成立。
- “AI 有调用”：成立，多个模块真实调用 CloudDreamAI。
- “后台有策略”：局部成立，Opportunity 和 Today 有较明确策略，其他模块较薄。
- “Coach 懂你”：不成立，目前只是上下文型/单模块型 AI，不是全平台个人教练。

## 运行时证据

本地服务：
- `GET http://localhost:3002/api/auth/me` 返回 401：后端启动且 JWT 保护生效。
- `GET http://localhost:3001/login` 返回 200：前端启动。
- `GET http://localhost:18060/health` 返回 ok，但 `last_error` 出现过 `Cannot read properties of null (reading '$')`，说明 XHS bridge 链路可用但仍有稳定性风险。

使用测试用户 `codex-audit@coach.dev` 登录后，只读 API 状态：
- `/resumes` 200 `[]`
- `/diagnoses` 200 `[]`
- `/conversations` 200 `[]`
- `/applications` 200 `[]`
- `/applications/stats` 200 全 0
- `/interviews` 200 `[]`
- `/mock-sessions` 200 `[]`
- `/feed` 200，有真实内容
- `/feed/sources` 200，牛客、公众号、小红书 source 注册成功
- `/feed/runs` 200，出现成功 run
- `/overview` 200，聚合数据返回
- `/salary` 200 `[]`
- `/salary/stats` 200 `[]`
- `/cover-letters` 200 `[]`
- `/opportunities` 200 `[]`

Feed 数据证据：
- `/feed` 当前总数 17：牛客面经 12，小红书面经 5。
- XHS item 已入库，但 URL 字段为空，不能满足“来源标清楚、可跳转”的产品要求。
- `/feed?keyword=字节` 返回 2 条，但其中一条公司被识别为 `微信(WXG)`，说明搜索/分类策略还会混入不精准结果。

## AI 调用证据

`AiService` 默认使用：
- `CLOUDDREAM_API_KEY`
- `CLOUDDREAM_BASE_URL` 默认 `https://api.tutorial.clouddreamai.com`
- `CLOUDDREAM_MODEL` 默认 `auto-v2`

真实调用验证：
- 调用 `POST /api/cover-letters` 成功，返回 id `3b21f1b8-ee23-4f4b-9a0c-7b13801242ca`，说明 CloudDreamAI 通道可用。
- 调用 `POST /api/tasks/generate` 成功生成 5 个 Today 任务，说明 Today 的 AI 生成可用。
- 调用 Coach free chat 成功返回，但没有读取平台数据，且把“请基于我平台里的全部数据”误解成泛化焦虑咨询。

## 模块级智能审计

| 模块 | 能否跑 | 是否调用 AI | 上下文来源 | 策略成熟度 | 主要问题 |
|---|---|---|---|---|---|
| Auth/User | 能 | 否 | JWT/user | 基础 | 正常 |
| Resume/Diagnosis | 能 | 是 | 简历 + JD | 中 | 需要真实复杂 JD/简历 E2E 持续验证 |
| Coach Chat | 能 | 是 | 仅 free/diagnosis/opportunity 传入上下文 | 弱 | 不会自动读取全平台数据，不是 Coach Memory |
| Opportunity | 能 | 是 | 简历、历史诊断、Feed、薪资 | 强 | 当前最接近“懂你”；但 Feed URL/分类仍需修 |
| Applications | 能 | 否 | 用户投递数据 | 中 | 状态流转需异常测试 |
| Today | 能 | 是（手动 generate） | 简历、投递统计、面试 | 中 | 不读取机会、Feed、薪资、Chat；默认 today 不自动生成 |
| Overview | 能 | 否 | 聚合统计 | 中 | 只是 dashboard，不提供 AI 策略解释 |
| Interviews | 能 | 是 | 面试记录文本 | 中 | 不读取简历/机会/投递上下文 |
| Mock Interview | 能 | 是 | JD/company/role/答题 | 中 | 不读取用户简历、历史面试弱点 |
| Cover Letter | 能 | 是 | DTO + 可选简历 | 弱 | 无简历时仍写“在我的简历中”，输出泛化，未强贴公司岗位 |
| Career Map | 能 | 是 | 主简历 | 中 | 不读市场情报、薪资、机会、投递反馈 |
| Salary | 能 | 否 | 用户手工薪资数据 | 弱 | 不是市场调研型薪资雷达，仅数据录入/统计 |
| Digest/Feed | 能 | 是（分类/摘要） | 牛客/公众号/XHS source | 中 | XHS 可入库但 URL 空；搜索策略未成熟 |

## “Coach 懂你”为什么还不成立

真实 Coach 需要一个统一用户画像服务，而不是每个模块自己临时拼上下文。当前缺失：

1. 没有 `UserContextService` / `CoachMemoryService`。
2. Chat free conversation 不读取任何平台数据。
3. 各 AI prompt 没有共享用户目标、偏好、历史弱点、当前优先级。
4. 多模块数据没有形成统一事实表：简历、投递、机会、面试、Feed、薪资、任务、求职信彼此割裂。
5. 没有 AI 调用观测：看不到某次回答用了哪些上下文、调用了哪个模型、耗时、失败原因。
6. 没有“引用证据”机制：回答无法明确告诉用户“我根据你的哪份简历/哪次面试/哪条小红书面经得出这个建议”。

## 产品级整改建议

P0：建立统一 Coach Memory
- 新增 `CoachContextService`，统一读取并压缩用户上下文。
- 输出结构建议：profile、resume_summary、targets、active_opportunities、applications_funnel、recent_interviews、diagnosis_gaps、market_signals、salary_expectations、today_tasks、conversation_notes。
- 所有 AI 模块都从该服务取上下文，而不是自己散装查询。

P0：让 Chat 成为真正 Coach
- free chat 默认注入 CoachContextService 生成的全平台上下文。
- context chat 在全平台上下文基础上再叠加 diagnosis/opportunity 局部上下文。
- 回答必须引用具体数据来源；没有数据必须诚实说没有。

P0：修 Feed 数据质量
- XHS item 必须保存 URL/source_url，满足可跳转。
- 分类必须保留 source、company、role、post kind、confidence，低置信度不能混入高置信推荐。
- 搜索策略后续单独做：按公司、岗位、人群、阶段、来源拆 query，不把 PDD/字节/腾讯面经混在一起。

P1：AI 策略观测
- 记录每次 AI 调用：module、model、prompt version、context keys、duration、status、error。
- 页面可展示“本建议依据”：简历/诊断/机会/Feed/薪资/面试。

P1：补复杂场景验收
- 构造一个完整用户：上传简历、创建机会、导入面经、录入薪资、创建投递、面试复盘、生成 Today。
- 然后问 Coach：“我现在应该投字节 AI 产品实习吗？”
- 预期：回答必须引用该用户简历技能、机会评估分、XHS/牛客面经、薪资数据、当前投递状态和今日任务。

## 给 Claude Code 的监督意见

不能再把“API 200”和“页面能打开”当作产品完成。这个产品的核心承诺是 Coach 懂用户，而不是一组分散工具页。

如果 Claude Code 继续只补页面或只跑 tsc/build，会导致：
- 用户问 Coach 时得不到基于自己的建议；
- AI 输出泛化套话，削弱产品信任；
- Feed 即使抓到了 XHS 内容，也无法作为证据链影响决策；
- 模块越多越碎，后续维护成本急剧升高。

下一步建议不是新增功能，而是做“统一上下文和证据链”重构，把现有模块真正串起来。
