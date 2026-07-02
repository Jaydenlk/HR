# T5 · 投递追踪二级页(单公司求职全景)

## 目标
新建 `/applications/[id]` 详情页:一条投递下聚合该公司求职全程——进度时间线、面试及录音转写、模拟面试、求职信、发送的简历版本、公司背景、跟进消息生成;支持手动 link + AI 自动 link 建议。

## 现状坐标(侦察已核实,2026-07-02)
- 前端 `(main)/applications/page.tsx`(看板单页);卡片点击只开编辑弹层(`components/tracker/application-card.tsx:42`),**无详情路由**。
- 后端已备一半:`applications.controller.ts` 已有 `GET /applications/:id`(L47)+ `GET /applications/:id/events`(L66)+ 时间线实体 `application_events`。
- 关联现状:
  - `interviews.application_id` → **真外键**(SET NULL),Interview 有 `company` 字段;录音转写 `interview_transcribe_tasks.interview_id` 软引用挂在 Interview 下。
  - `mock_sessions.application_id` → 有字段**无外键无归属校验**(`mock.service.ts:366` 写入时不校验,越权洞,本任务顺手堵)。MockSession 有 `company` 字段。
  - `cover_letters.application_id` → 有字段无外键。
  - `applications.resume_id / diagnosis_id` → 软引用,service 层 `assertOwnedRefs` 校验(`applications.service.ts:36-52`)。**简历只到 Resume 级,没到版本级**(`resume_versions` 表已存在,经 `resume_id` 关联)。
  - 公司背景:此前不落库;T6 已建 `company_research` 实体(本任务前置依赖)。
  - 跟进消息:后端 `follow-up` 模块存在(无实体、一次性生成);独立页已在 T1 删除。

## 设计定稿

### 1. 数据打通(手写 migration,一次做齐)
- `mock_sessions.application_id` 补真外键(ON DELETE SET NULL)+ `mock.service.ts` 写入时补归属校验(对齐 `assertOwnedRefs` 模式)。
- `cover_letters.application_id` 补真外键(ON DELETE SET NULL)。
- `applications` 加 `resume_version_id`(nullable,软引用+归属校验,语义="发送的是哪一版")。
- `applications` 加 `company_research_id`(nullable,指向 T6 实体)。
- 存量数据零迁移(全部 nullable,不回填)。

### 2. 聚合 API
`GET /applications/:id/related`(JwtAuthGuard,只查归属当前用户的数据):
返回 `{ interviews:[{...含 transcribe 任务态}], mock_sessions:[], cover_letters:[], resume:{resume+version}, company_research:{}, }`。实现=对方表 `WHERE application_id=? AND user_id=?` 反查,Application 实体不加反向 relations(保持现状简单)。

### 3. link / unlink
- `PATCH /applications/:id/link` body `{ type: 'interview'|'mock'|'cover_letter'|'resume_version'|'company_research', target_id, action: 'link'|'unlink' }`——统一入口,内部按 type 更新对方表的 application_id(或本表字段),**每次都做双向归属校验**(target 与 application 都属当前用户)。
- **AI 自动 link 建议**:`GET /applications/:id/link-suggestions`——按公司名归一化模糊匹配(与 T6 同一套归一化函数,提炼为共享 util),扫当前用户尚未关联的 interviews/mock_sessions/cover_letters,返回建议清单+匹配理由。**建议永远只是建议,用户一键确认才写入**(与 T6 缓存同一哲学:模糊匹配只产生候选,不静默生效)。

### 4. 前端 `/applications/[id]`
- 卡片点击行为改为跳详情页;编辑改为详情页内动作(编辑弹层组件复用)。
- 版面:头部(公司/岗位/阶段/关键日期/阶段推进按钮)→ AI link 建议横幅(有建议时出现,一键采纳/忽略)→ 时间线(现有 ApplicationTimeline 组件从弹层挪出来复用)→ 聚合区块:面试&录音(含转写状态/入口)、模拟面试、求职信、简历版本(展示哪一版+跳简历馆)、公司背景(展示 T6 摘要+来源+核验时间,未有则提供"查一下"按钮触发 T6 搜索)、跟进消息(嵌 follow-up 生成面板,公司/岗位/阶段上下文自动预填)。
- 每个聚合区块带"关联已有记录"选择器(手动 link)。
- 空状态文案诚实:"暂无关联记录",不放假数据。

## 派工方案

**编排:一条 dynamic workflow** — stage1: A 后端 → stage2: B 前端(串行,依赖 API 形状)→ stage3: C(e2e/IDOR/Playwright)与 D(审计)**并行扇出** → 汇总。

**Agent A(implementer,Sonnet,worktree)** — 后端,prompt:
```
任务:按 docs/refactor2/T5-application-detail.md 设计定稿 1-3 实现数据打通+聚合+link API。
必读输入:该文档;applications 模块全部;mock.service.ts L360 附近写入逻辑;applications.service.ts assertOwnedRefs;T6 的 company_research 实体。
禁止触碰:前端;AI 服务;diagnoses。
硬规则:migration 手写且全部 nullable 零回填;link 双向归属校验缺一不可;归一化函数与 T6 共用一个 util,不许复制粘贴两份。
交付:worktree 分支 feat/t5-app-detail;单测:link 越权(他人 target)403、unlink、suggestions 模糊匹配命中/不命中、related 只返回本人数据。
验证:cd packages/api && npx jest applications --verbose 附输出;全量回归。
```

**Agent B(implementer,Sonnet,同 worktree 串行)** — 前端详情页(依赖 A 的 API 形状)。验证:eslint 0 错+build。

**Agent C(test-agent,Sonnet)** — Jest e2e:IDOR 双向(用他人 application link 自己的 mock / 用自己的 application link 他人的 interview 均 403);Playwright:创建投递→详情页→采纳一条 AI 建议→区块出现该记录→unlink 消失;跟进消息在详情页内生成成功。

**Agent D(reviewer,Sonnet,只读)** — 重点找茬:归属校验漏网(尤其 link 的 type 分支)、mock 越权洞是否真堵上、时间线组件挪动是否破坏看板页。

## step→verify
1. migration+外键+归属校验 → verify: 单测越权 403 全绿;mock 写入带校验
2. related/link/suggestions API → verify: jest e2e 全绿(附输出)
3. 详情页 → verify: Playwright 全流程过(含 AI 建议采纳)
4. 看板回归 → verify: 原看板拖拽/编辑/统计功能 Playwright 回归过

## 红线
- 建议不自动生效;模糊匹配不静默写库。
- 存量数据不回填不清洗。
- follow-up 后端能力只复用不重写。
