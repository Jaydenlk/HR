# Opportunity Intelligence Audit Log

> Codex 审计后修复记录  
> 日期：2026-05-25  
> 审计方：Codex  
> 修复方：Claude Code (Main Agent)

## Codex 审计发现 → 修复对照表

### Issue 1: Git 交付状态不干净

| 项 | 详情 |
|---|------|
| 问题 | pnpm-lock.yaml 未提交；.playwright-mcp/.tools/screenshots 等本地产物未被 .gitignore 排除 |
| 根因 | subagent 在 worktree 中安装依赖改了 lockfile；截图和工具是开发过程产物 |
| 修复 | 更新 .gitignore 排除本地产物；提交 pnpm-lock.yaml |
| 证据 | Commit `22264b8` |

### Issue 2+3: E2E 测试假阳性 + 集成端点缺失

| 项 | 详情 |
|---|------|
| 问题 | 17 tests 全 PASS 但评估实际 401 失败（假 API key）；/track /tasks /chat-context 未测试 |
| 根因 | fire-and-forget 模式 + .catch(() => {}) 吞掉错误；测试只验证 POST 201，不验证评估结果 |
| 修复 | mock AiService 返回确定性结构化数据；添加 waitForEvaluation 轮询；覆盖 36 个场景（CRUD + auth + evaluation lifecycle + integration + cross-user） |
| 证据 | Commit `7a58043`，36/36 PASS |

### Issue 4: AI 复杂场景未验证

| 项 | 详情 |
|---|------|
| 问题 | 从未用真实 AI 测试 OD/培训引流/JD过短/公司冲突/薪资虚高等场景 |
| 根因 | 之前只做了 probe 测试（2 个简单场景），跳过了设计文档要求的 6 个复杂场景 |
| 修复 | 创建 opportunity-ai.e2e-spec.ts，6 个场景全部用真实 CloudDreamAI 调用 |
| 证据 | Commit `4bd5cf0`，6/6 PASS。AI 正确识别：正常 JD (strongly_recommend, 92), OD (suspected_od, 25), 培训引流 (training_lure, 10), JD过短 (jd_too_short, 12), 公司冲突 (entity_mismatch, 25), 薪资虚高 (salary_unrealistic, 10) |

### Issue 5: 评估器不读用户数据

| 项 | 详情 |
|---|------|
| 问题 | evaluator 只做 JD 分析，不读简历/诊断/Feed/Salary 数据 |
| 根因 | Phase O2 实现时简化了 evaluator，注释写 "当前阶段没有用户简历数据"，但声称"完成" |
| 修复 | evaluator 注入 Resume/Diagnosis/FeedItem/SalaryEntry repositories；gatherUserContext() 查询用户主简历、最近诊断、相关面经、薪资数据；传入 AI 评估上下文；有简历时 confidence 可达 high，无简历时 cap 在 medium |
| 证据 | Commit `570ce88`，tsc PASS, nest build PASS |

### Issue 6: Chat 不处理 opportunity 上下文

| 项 | 详情 |
|---|------|
| 问题 | 前端跳转 /chat?context=opportunity&id=... 但后端只处理 diagnosis context |
| 根因 | conversations.service.ts 的 sendMessage 只有 diagnosis 的 if 分支 |
| 修复 | 添加 else if (context_type === 'opportunity') 分支；注入 Opportunity + OpportunityEvaluation repositories；格式化评估结果为 chat context |
| 证据 | Commit `570ce88`，conversations.module.ts 也更新了 entity imports |

### Issue 7: Track 不自动生成 Tasks

| 项 | 详情 |
|---|------|
| 问题 | POST /track 只创建 Application，不生成 DailyTask |
| 根因 | controller 中 track 和 tasks 是独立端点，前端只调 track |
| 修复 | track handler 完成后 fire-and-forget 调用 generateTasks() |
| 证据 | Commit `570ce88`，E2E test #24 验证 tasks 创建 |

## PJR 最终验证

| 检查 | 结果 |
|------|------|
| Backend tsc --noEmit | PASS |
| Backend nest build | PASS |
| Backend E2E (mock, 36 tests) | 36/36 PASS |
| Backend AI (real, 6 scenarios) | 6/6 PASS |
| Frontend eslint src/ | 0 errors PASS |
| Frontend next build | PASS |

## 验收诚实声明

### Playwright 前端验收状态

Playwright 桌面+移动完整链路（create→evaluate→track→today→chat）**本轮由用户允许暂缓**。Opportunity 模块**未通过完整前端验收**。后续验收需要：
- 启动 dev server
- 桌面端：创建机会→等待评估→查看结果→加入看板→确认 Today 任务→Chat 追问
- 移动端：375px 下全流程无溢出、按钮可达
- 不能只截图，必须完整点击/输入/提交/等待/跳转

### AI 复杂场景复现状态

`opportunity-ai.e2e-spec.ts` 6 个真实 AI 场景**已在 Claude 侧跑过并全部通过**（6/6 PASS，410s）。Codex 复跑时 4 分钟超时未完成复现（每个场景需约 60-90 秒 AI 调用，6 个场景总计需 7-10 分钟）。后续最终验收需单独留足时间（建议 `--testTimeout=180000`，总运行时间预计 10 分钟）。

### Track→Tasks 联动验证状态

`POST /:id/track` 成功后会 fire-and-forget 调用 `generateTasks()`。mock E2E 测试已验证 `POST /:id/tasks` 端点能创建 DailyTask 记录。但**尚未通过 Playwright 验证 Today 页面实际显示对应任务**。后续 Playwright E2E 必须包含：track 后导航到 /today → 确认出现与 Opportunity 关联的任务。

## 仍未完成项

| 项 | 状态 | 说明 |
|---|------|------|
| Playwright 完整 E2E（桌面+移动） | 用户允许暂缓 | 未通过完整前端验收 |
| Playwright Today 任务验证 | 待做 | track→tasks fire-and-forget，需验证 Today 页面实际出现任务 |
| 小红书 HTTP 桥接 | 待做 | RedNote-MCP 已授权，缺 MCP→REST 转换层 |
| 公众号订阅内容 | 待操作 | We-MP-RSS 已运行，用户需添加目标公众号 |
| 全产品审计 | 未开始 | WORKLIST 最后一项 |
