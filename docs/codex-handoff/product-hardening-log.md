# Product Hardening Log

> 日期：2026-05-25
> 分支：feature/product-hardening
> 目标：让现有产品达到真实用户可试用水平，不新增功能

## 修复对照表

| Issue | 问题 | 根因 | 修复 | 证据 |
|-------|------|------|------|------|
| P0-1 | 登录失败 /api%20/auth/login | start-dev.ps1 cmd.exe `set` 带空格 + PS5.1 Out-File 写 BOM | 脚本用 quoted set + BOM-free WriteAllText + api.ts trim | Playwright 登录跳转 /today ✓ |
| P0-2 | Today 首页 15s 超时 | getToday() 新用户自动触发 AI | getToday() 改为 DB-only；AI 移到 POST /tasks/generate | Today 瞬间加载 + "生成今日任务"按钮 ✓ |
| P1-1 | 机会→Chat 上下文断 | Chat 页不读 query params | Chat 读 ?context=opportunity&id，自动创建 context 对话 | Chat 回复引用评估分数和 JD 风险 ✓ |
| P1-2 | Track 吞错误 | fire-and-forget .catch(() => {}) | 改 await + 返回 tasks_generated/tasks_error | Track 后 Today 出现 3 条任务 ✓ |
| P1-3 | 简历上传失败存错误文本 | extractText catch 返回字符串 | catch 改 throw BadRequestException | 编译 PASS（Playwright 上传测试待做） |
| P1-4 | Digest 空数据编造 | AI 生成 filler 月刊 | 无数据返回 { status: 'empty' } | 编译 PASS |
| P1-5 | any 类型 | conversations.service (s: any) | 改 RewriteSuggestion 类型 | grep 无业务 any 违规 ✓ |

## 为什么不是补丁

| Fix | 根因层 | 修改位置 |
|-----|--------|---------|
| P0-1 | 脚本生成逻辑 + 前端防御 | start-dev.ps1 + api.ts |
| P0-2 | API 职责划分（查询 vs 生成） | tasks.service.ts |
| P1-1 | 前端路由状态机 | chat/page.tsx |
| P1-2 | API 契约（不吞错误） | opportunity.controller.ts |
| P1-3 | 错误处理流（抛异常 vs 返回字符串） | resumes.controller.ts |
| P1-4 | 产品原则（无数据不编造） | digest-generator.service.ts |
| P1-5 | 类型系统 | conversations.service.ts |

## PJR 结果

| 检查 | 结果 |
|------|------|
| Backend tsc --noEmit | PASS |
| Backend nest build | PASS |
| Frontend eslint src/ | 0 errors PASS |
| Frontend next build | PASS |
| grep any/ts-ignore | 无业务违规 |

## Playwright 桌面端验证

1. /login → 填写表单 → 登录成功跳转 /today ✓
2. Today 瞬间加载，不卡死 ✓
3. 空状态 + "生成今日任务"按钮 ✓
4. 机会中心 → 新建评估 → 粘贴 JD → 提交 ✓
5. AI 评估完成（匹配72/价值85/可信82） ✓
6. 诚实标注"简历数据缺失"+"薪资数据不足" ✓
7. 加入投递看板 → 侧边栏"投递追踪 1" ✓
8. Today 页面出现 3 条机会关联任务 ✓
9. 从机会详情点"在 Chat 中追问" → 自动创建 context 对话 ✓
10. 发送"我该不该投这个字节跳动的岗位？" → AI 引用评估分数和 JD 风险回答 ✓

## 未验证项

| 项 | 原因 |
|---|------|
| Playwright 移动端 375px | 本轮时间限制 |
| 简历上传失败 Playwright | 需要准备无法解析的文件 |
| Digest 空数据前端展示 | 需要清空 feed 数据后测试 |
