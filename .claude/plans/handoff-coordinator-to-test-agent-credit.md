# Handoff: Coordinator → Test Agent (credit 集成验收)

## 状态: READY_FOR_QA(集成完成,feature/credit @ c529292 = api 6c1edce + web 7d67174 双合入,零冲突)
## 工作目录: E:\Agent program\HRBP-wt\credit-integration

## 协调者裁决后的剧本修订(以此为准,覆盖下文冲突处)
- 剧本 6 头像上限:>2MB 预期 **413**(Multer 硬上限,Nest 默认映射),非图片仍 400。
- 剧本 7 并发双扣:**必须在真 Postgres 上跑**(后端行锁只在 Postgres 驱动生效,sqlite 测不到)。用 Docker 起一次性容器(如 postgres:16,随机高位端口,跑完即删),对它跑 migration 后执行并发剧本;严禁碰任何非本地实例。
- api 包 lint 契约 = `npx tsc --noEmit`(api 无 eslint,这是项目既定约束);web 包才是 eslint+tsc。
- 已知预存在失败:packages/api/test tasks.e2e「POST /tasks/generate」无 AI key 时 503——非本次引入,复现它不算新 bug,但要在报告里单列。
- 本地起服可从主仓 E:\Agent program\HRBP\packages\api\.env 复制环境(永不提交);AI-live 调用走经济模式:涉及真 AI 的剧本用最小参数(模拟面试 2 题即可),不重复跑。
## 任务: Credit 计费全链路验收——找茬,不是确认成功。零 bug 报告默认不可信,必须附已走流程清单。

## 前置(先定成功标准再动手)
- 读设计稿 .claude/plans/coach-upgrade-design-2026-06-12.md §W2 与两份 credit handoff 的契约段。
- 本机起前后端(参考 docs/AGENT-HANDBOOK.md §3:web 3001 / api 3002,本地 DEV_LOGIN 可用)。pnpm install 后先跑全量既有 jest 确认基线。

## 必测剧本(后端 jest e2e + 前端 Playwright 桌面端,全部真跑)
1. 注册新用户 → 余额=50,流水恰 1 条 signup_grant,balance_after=50。
2. 触发一次 AI 端点(用最便宜的)成功 → 余额 49,流水 consume 带 endpoint;ai_usage 同步多 1 条(双轨都在记)。
3. AI 调用失败路径(断开 AI 或无效配置)→ 余额不变,无 consume 流水。
4. 余额清零(管理员负向?不支持——用测试数据直接置 0 或连续消耗)→ 调 AI 端点 → HTTP 402 + 文案"点数不足，请联系管理员充值";**前端**操作时出现可读提示,非白屏非裸报错。
5. 管理员给用户充 30 → 用户 /me 流水出现"管理员充值 +30",余额即时正确;非 admin 调充值接口 403。
6. /me 页:基本信息/余额/流水分页/价目文案全渲染真数据;头像上传 jpeg<2MB 成功且侧边栏头像更新;>2MB 与非图片被拒且提示友好。
7. 并发找茬:同一用户余额 1 时并发 2 个 AI 请求 → 最终余额 ≥ -1、流水条数与实际成功扣减一致(不丢账不重账)。
8. 按钮标注抽查:诊断/求职信/模拟面试/聊天 4 页"消耗 N 点"标注存在且与实际扣减一致(模拟面试一场全程走完,核对总扣点 = 出题1+每题1+总评1)。
9. 回归:诊断完整流程、求职信生成、聊天一问一答——功能不回退,只是扣点。
10. 旧配额痕迹找茬:UI 全局 grep"配额/今日剩余/quota"类文案残留;API 层 QuotaGuard 引用必须为 0。

## 交付物
- 测试代码入库(测试目录);Playwright 截图;jest/Playwright 原始输出全文摘要。
- 发现的 bug 列表(file:line + 复现步骤),不许自己顺手修产品代码——报回协调者。
- 更新本文件:验证结果逐条 PASS/FAIL + 证据。
