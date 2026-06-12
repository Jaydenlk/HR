# Handoff: Coordinator → Implementer (Phase C:Coach 双手——任务交接卡片与四模块接待)

## 状态: 待 B2 合 dev 后启动(协调者届时建 worktree 并填路径)
## 工作目录: 【派工时填写】
## 前置依赖: B2 已上线(SSE 流式对话/七要素 prompt/rich_card 字段在 Message 实体早已预留)
## 输入文件: packages/api/src/conversations/**、packages/api/src/database/migrations/、packages/web/src/app/(main)/chat|mock|diagnoses|cover-letter|resumes/**、packages/web/src/components/chat/**
## 禁止触碰: ai/**、credit 模块内核(只挂现成装饰器)、feed/**、.env 入库

## 目标(用户原话,这是产品形态的灵魂,逐字理解)
"对话里聊到了之后,假如说聊到模拟面试,要做模拟面试了,然后 coach 帮我把模拟面试配置好,根据对话内容和 CV 版本,然后一个链接,一键跳转,然后在对应模块跳转过去之后有个提示,coachAI 对话来了一个模拟面试,是否开始?然后弄完之后…多了一个返回 coachAI 的弹出确认(当然也可以不选),就算没有通过这个选择,做完模拟面试回到 coach 继续聊天,coach 是可以查到他已经做完模拟面试了的。"

## 规格

### 数据层
1. 新表 `coach_handoffs`(手写 migration,命名冒烟按 deploy/README.md §2.1):id(uuid)/user_id/conversation_id/message_id(可空)/target('mock'|'diagnosis'|'cover_letter'|'resume_rewrite')/payload(simple-json:按 target 放预填字段,如 mock 为 {company,role,jd_text,resume_version_note})/status('proposed'|'accepted'|'dismissed'|'completed')/created_at/updated_at。索引 (user_id,status)。

### 后端
2. **提议产出**:扩展 B2 的 system prompt(模块地图节):当对话自然到达"该去做 X"的时刻且用户已表达意愿,在回复正文结束后输出一行机器标记 `<handoff>{"target":"mock","payload":{...}}</handoff>`(单个、合法 JSON、放最末尾;不适时不输出;一次最多一张)。payload 由模型从对话内容+用户数据组装(公司/岗位/JD 摘录等)。
3. **流式剥离(关键)**:SSE 转发时检测 `<handoff` 起始——一旦命中即停止向客户端转发后续增量并入缓冲;流结束解析缓冲:合法→建 coach_handoffs 记录(proposed)+把卡片数据写入 assistant 消息的 rich_card+SSE 推 `card` 事件;非法→把缓冲文本原样补发给客户端(优雅降级,正文完好)。存库的 message content 必须已剥离标记。非流式旧端点同样剥离(同一解析函数,单元可测)。
4. **接待接口**:GET /coach-handoffs/:id(JwtAuthGuard,owner-only,404 不泄露存在性)→ {target,payload,status,conversation_id};PATCH /coach-handoffs/:id/status {status:'accepted'|'dismissed'|'completed'}(owner-only,只允许合法流转 proposed→accepted/dismissed、accepted→completed)。
5. 不动各模块的创建端点——预填后走它们现有的创建接口,credit 在用户确认创建时照常被现有 CreditGuard/Interceptor 扣(这正是"确认才扣点"的来源,不需要新计费代码)。

### 前端
6. **行动卡片**:components/chat/ 新增卡片组件,assistant 消息有 rich_card 时渲染:"已为你配置好{模块名}:{摘要}"+主按钮"一键开始"(跳 {模块路径}?handoff={id})+次按钮"暂不"(PATCH dismissed,卡片置灰显示"已跳过")。SSE `card` 事件到达即在当前消息下渲染。样式对齐现有 message-bubble 体系。
7. **四模块接待**(mock/page.tsx、diagnoses/new/page.tsx、cover-letter/page.tsx、resumes 改写入口页):载入时检测 ?handoff= → GET 拉 payload → 弹确认框"Coach 对话为你准备了一个{X}({摘要}),是否开始?"——确认:预填表单(用户可改)+PATCH accepted,用户点创建时照常扣点;取消:PATCH dismissed,页面回常态零副作用。已 accepted/dismissed 的 handoff 再次访问按其状态处理(不重复弹)。
8. **完成回流**:四模块各自的"完成"时刻(模拟面试 complete 返回后/诊断生成后/求职信生成后/改写保存后),若本次产物源于 handoff(创建时携带过 handoff id,放组件状态或 query 透传),弹一次性提示"返回 Coach 继续聊?"(确认→跳 /chat/{conversation_id} 并 PATCH completed;不选→仅 PATCH completed)。不选也没关系——Coach 下轮经平台数据自然看到新产出并接话(B2 已具备)。

## 执行计划 (step→verify)
1. pnpm install + .env → verify: 双端 build 基线绿
2. migration+实体+接待接口 → verify: jest——owner-only 404/非法流转 400/合法流转链;migration 冒烟
3. 标记解析+流式剥离 → verify: jest——合法标记(建记录/剥离/card 事件)、非法 JSON(正文完好补发)、无标记(零影响)、标记字符出现在正文中段的误检场景;非流式端点同函数复用
4. prompt 扩展 → verify: jest 断言标记格式说明与"不适时不输出"约束存在
5. 卡片+四模块接待+回流 → verify: Playwright 全链路——聊出一张卡(可用 mock AI 注入含标记的回复)→点卡跳转→确认框→预填创建(查流水:此刻才扣点)→完成→回流弹窗→回到对话;拒绝路径:dismissed 后零副作用、卡片置灰;直接访问已处理 handoff 不重复弹。截图每个节点
6. AI 真跑 1 次(花真钱):真用户对话引导到"想练模拟面试"→ 验证模型真的产出合法标记且 payload 引用了对话中的公司/岗位;贴全文
7. 门禁 → verify: api tsc 0 错+全量 jest;web eslint+tsc 0 错+build
8. commit 不 push

## 红线
- 流式剥离宁可误缓冲不可漏出 JSON 到用户屏幕;解析失败必须正文无损
- 不适合提议时模型不输出标记——prompt 里写明,且后端对每回复最多处理一张卡
- 各模块现有直接使用路径(不带 handoff)零变化
- 范围手术刀;完成写回本文件(隔离则副本+说明)
