# 后续清单与现状档案 — SaaS Phase 2 / 双形态对等

> 用途:本轮(2026-06-02)受 5h 限制只做**准备阶段、不改代码**;此档为下次开工的参考文本之一(用户要求"留下文字档案 + 当前 worktree 状态")。
> 路线已确认:**P0→P1→P2→P3,P2 高价值先行**。

---

## 0. 一句话愿景(用户已确认)
**一个产品两形态,核心功能对等,差异只来自呈现环境。** Web SaaS `@coach`(34 页/20 后端模块)与 CC 插件 `career-principal`(单入口 + 37 worker)。skills 北极星=女娲式统一求职代表。**三条操作底线**:主动全面 / 句句有源 / 时效信息当场联网。**质量底线**:不差于用户直接拿 JD+CV 找 Opus 4.8 自由谋划。同源知识(90 标尺/600 公司:`packages/api/profession-presets`+`company-taxonomy`)是"一个产品"的根。

## 1. 当前 git / worktree 状态(2026-06-02 实测)
- **origin/dev = `1ed5c06` = 整合真相**:插件单 skill 重打包(6a6a441)+ 批1 criticals(7324738)+ 批2(1ed5c06),全部门禁过。
- **origin/main = `a7e44cf`**:落后 origin/dev **9 个 commit**——插件重打包 + 批1/2 **都未进 main**。
- **本地 dev** 落后 origin/dev 2 个 commit(7324738、1ed5c06 未 fetch)。
- **当前 worktree**:`.worktrees/saas-phase2`,branch `feature/saas-hardening-phase2` @ `1ed5c06`,**工作区干净**。
- worktree 冗余:13 个 locked + 16 个 feature worktree,后期可清理。
- **开工第一步**:`git fetch` + 本地 dev 同步 origin/dev,再在 worktree 拉起工作。

## 2. 前端 skill 真名(blocker 已解除)
- 前端"设计逻辑"skill 真名 = **`frontend-logic-design`**(plugin: clouddreamai-tools)
- 前端"UI/UX"skill 真名 = **`ui-ux-pro-max`**(plugin: ui-ux-pro-max-skill)
- ⚠️ 此前用 `frontend-design` / `uiuxpromax` 加载失败,纯命名问题。下次前端开工:`Skill(frontend-logic-design)` + `Skill(ui-ux-pro-max)`;若 bare 名不行,试 `<plugin>:<skill>` 全限定形(参照 `project-review:pjr` 范式)。

## 3. 后续清单(P0→P3,每项 file:line + 标准 + 验收)

### P0 —「稳」:修完既有缺陷达可发布基线
| # | 项 (file:line) | 标准 | 验收 |
|---|---|---|---|
| **P0-1** 🔴HIGH 已核实 | **对话越权泄露(IDOR)**:`conversations.service.ts:81`(diagnosis load 无 user_id)、`:88-92`(opp load 无 user_id)、`create():31-39`(context_id 不校验归属) | 上下文加载查询带 `user_id` 过滤;`create()` 收到 context_id 先校验归属、不属则 404。深度融合进查询不打补丁 | e2e:用户B 建会话填用户A 诊断 id → 上下文空/无泄露(或 create 即 404);自有 context 正常 200 |
| **P0-2** 🟠MED | **mock 幂等漏洞**:`mock.service.ts:318`(evaluation 为 null 时二次 complete() 重跑 AI) | complete() 对"已完成但 evaluation 缺失"确定性处理(补算落库或短路) | e2e:连调两次 complete(),第二次不触发 AI、同一结果 |
| **P0-3** 🟠MED | **debrief color 半成品**:`debrief.service.ts:81-84`(schema 定义 color 但 service 不填,interface line 6-11 无此字段) | 二选一:按阈值 green≥75/yellow≥50/red 填充进结果,或从 schema 删字段 | e2e 断言 color 正确,或 schema 无此字段 |
| **P0-4** 🟠MED | **feed 导入器静默失败**:`feed/importers/*.ts`(wechat/xhs/rss,catch 后仅 warn 不上抛) | 失败结构化返回 error/原因 或上抛;未配源则明确标"降级/未接入"不假装成功(CLAUDE.md 红线) | 导入失败时调用方拿到可见错误/降级标记 |
| **P0-5** 🟠MED | **tasks 模块无 controller(疑似死代码)**:`tasks/`(仅 service+dto+entity,无 .controller.ts) | 确认是否该有 HTTP 入口:有则补 controller+e2e,无则删(KISS / anti-slacking 无死代码) | tasks 有可调用端点+测试,或从代码树移除 |
| **P0-6** 🟡LOW批量 | `career.service.ts:125`(alumni NaN/Infinity)、`overview.service.ts:79-86`(recentGrades 排序)、`interviews.service.ts:73`(scores null length) | 随手补防御 | 各自单测/e2e 断言 |
| **P0-7** 🔴前端 | **DEFECT-1「null 人」**:`web/src/app/(main)/career/page.tsx:107` | alumni_count===null → 显示「暂无数据」 | Playwright:null 卡片显示「暂无」无「null」 |
| **P0-8** 🔴前端 | **DEFECT-3 salary seed 开发文案**:`web/src/app/(main)/salary/page.tsx:834` | 改用户向文案/空状态组件,不暴露运维指令 | 空数据态无「seed 脚本」字样 |
| **P0-9** 🟠前端 | **DEFECT-2 面试反馈/分数空白**:`mock-result.tsx:328`、`mock-stage.tsx:178` | 空 feedback/分数 → 占位文案非空段落 | Playwright 跑反馈空的题→有占位 |
| **P0-10** 🟠前端 | **DEFECT-4 分值标度混用**:`web/career/page.tsx:10,545`(fit_pct 按%、skill 按0-10);后端 `career.service.ts:76`(0-100)/`:93`(0-10) | fit_pct 按%、skill 按0-10 各自渲染;修 `Math.min(current,100)` 误用 | 两类分值数值/进度条与后端口径一致 |

### P1 —「打磨」:plugin 质量 + 宏观记忆档(纯 skills,零阻塞,**不需要 frontend skill**)
| # | 项 | 标准 | 验收 |
|---|---|---|---|
| **P1-1** 🔴 | **pressure 档总分拒报三层对齐**:campus 诊断的 `output_schema.json:48`(required 误含 total_score)/`contract.yaml:86`/`PLAYBOOK.md:114-115`(重打包后在 playbooks/ 下,开工先定位) | 统一为"pressure 档或信息不足下 total_score 可省略";schema 移出 required,contract+PLAYBOOK 明文区分 standard/pressure | 三文件口径一致;模拟 pressure 档诊断不被迫输出数值总分 |
| **P1-2** 🟠 | **career-principal 加 Write 权限**:`career-principal/SKILL.md:9-14` allowed-tools 现仅 [Read,Grep,Glob,WebSearch,WebFetch] | 增 Write(为宏观记忆档铺路) | frontmatter 含 Write、`claude plugin validate` 过 |
| **P1-3** ⭐ | **宏观记忆档(overview→主理人宏观视野)** | 见 §4 设计:`~/.career-coach/求职状态.md`,会话首读+产出后回写;守三底线标源标日期;career-principal 加「§0 求职状态档」读写章 | 模拟两次会话,第二次续接宏观上下文不重复追问;回写后档案含结构化字段 |
| **P1-4** 🟡核实 | 运行期调度命名 & check_fabrication | 静态审查显示 intent-router 41 意图映射干净、check_fabrication 退出码无假 → 派模拟用户高并发复测确认无复现,有则修无则销账 | 模拟用户复测无越权/无假 exit |

### P2 —「扩面」:达完整对等(**高价值先行**)
SaaS 缺 16 能力(web 原生形态),按价值优先做前 4-5 项:**① Offer 比对 ② 人脉/内推消息 ③ 行业趋势结构化 ④ 个人品牌/作品集 ⑤ 薪资趋势+市场对标**;其余(跟进消息/投递策略/面试题库/公司面试手册/STAR行为故事/技术面辅导/案例面辅导/转岗顾问/学习路线跟踪/读研vs就业/城市行业适配)分批补齐。plugin 缺 **cover-letter worker**。
- 标准:每项=后端模块(单一职责+DTO 校验+防编造+AI 决策/执行双测)+ 前端活页面(无 mock/无空按钮/中文);plugin worker=PLAYBOOK+注册意图+防编造对齐。
- 验收:每项 e2e(正常+异常,AI 决策+执行)+ Playwright 桌面真流程。

### P3 —「发布/收尾」
- 本地 dev 同步 origin/dev;**main 推送(dev→main,落后 9 commit)——需用户授权**(朋友 fork 默认装 main);worktree 清理。

## 4. 宏观记忆档设计(P1-3 细节)
- **形态**:career-principal 读写的持久 markdown `求职状态.md`(CLAUDE.md feel,人读机读都顺)。
- **位置**:`~/.career-coach/求职状态.md`(跨项目持久、单用户一份;插件本体只读,用户状态存此处可读写)。
- **读写时机**:① 每次会话首个实质分析前先读 → 拿宏观视野(不重复追问、续接不失忆);② 每次重要结论后回写新增/变化。
- **内容分段**:画像(称呼/背景/届数/学校专业)· 目标(岗位+行业+城市+难度倾向)· 已做(诊断 职业×档×分×日 / 简历版本 / 模拟面试 / 复盘要点)· 投递管线(公司×阶段)· Gap 待补(能力缺口 + 该看未看维度:落户/三方/时间窗)· 时间线(秋招批次/截止/主动提醒)· 已确认偏好决策。
- **守三底线**:每条标来源(据CV/据JD/用户确认/推断)、时效标日期。
- 这是把 career-principal 已有的"会话级输入复用/主动盘点/续接"从单次会话升级为**跨会话持久**,即 CLI 形态的"总览仪表盘"。看板/月刊=Web 原生,CLI 不做、不算缺口。

## 5. 通用质量门(每块强制)
worktree 开发 → using-superpowers →(前端)`frontend-logic-design`+`ui-ux-pro-max` → `simplify` → `pjr`(改哪端哪端 lint+build 0 error)→(前端)Playwright 桌面 E2E 找茬 → `git-merge-to-develop`;深度融合不打补丁、结果最简;**无 mock / 无空按钮 / AI 数据缺失必拒编造**;测试通过才合 dev;每个多步任务走 step→verify。

## 6. 产品方向笔记(用户 2026-06-02)
**"到后期对各个功能入口要做一些调整,好的产品要学会做减法。"** —— P2 扩面不是无脑堆功能;扩到一定程度后要回头审视功能入口/信息架构,该合并合并、该砍砍,保持主线清爽。落地时机:P2 中后段做一次"功能入口与导航做减法"评审。

## 7. 环境/MCP 备忘
- **clouddreamai-knowledge MCP** ✗ 连不上(localhost:3941 无监听,本地服务没起)——仅影响 research Route 5 兜底,非关键。
- **3× claude.ai(Gmail/日历/云盘)** ! 待 OAuth 认证——与本项目无关,可忽略。
- **Context7 / mem0** 未配置——研究走 Exa/WebSearch,决策/记忆走文件记忆(`memory/MEMORY.md`)。
- exa / playwright / figma ✓ 已连。
- SaaS AI 中转(auto-v2 主 + DeepSeek 备)对结构化并发调用不稳(并发即 503),已加护栏;`.env` 密钥齐(gitignored)。e2e 里 AI-live 走 503 标注分支属中转环境问题非代码。
- 测试起服务绕 pnpm:`cd packages/api && node dist/main.js`(用户 stray package.json 会致 pnpm install 失败)。

## 8. 下次开工指引
1. `git fetch` → 本地 dev 同步 origin/dev;在 saas-phase2 worktree(或新开)拉起。
2. 加载 superpowers;前端块加载 `frontend-logic-design`+`ui-ux-pro-max`。
3. 从 **P0-1(IDOR)** 起按表推进,每项 step→verify;后端非AI 接口正常+异常 e2e,AI 接口测决策+执行;前端 Playwright 桌面找茬。
4. 每块走 simplify → pjr → (前端)Playwright → git-merge-to-develop,测试过才合 dev。
5. P1-3 宏观记忆档 / P1 plugin 打磨纯 skills,不需前端 skill,可与 P0 并行派 subagent。
