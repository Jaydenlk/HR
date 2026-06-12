# Handoff: Coordinator → Test Agent (credit 复验轮:补环境跳过项 + 修复批回归)

## 状态: READY_FOR_QA(待微修 commit 落地后协调者派工)
## 工作目录: E:\Agent program\HRBP-wt\credit-integration(分支 feature/credit)
## 背景: 首轮 10 剧本中 2 项因环境跳过(Docker 停/服务未起),其后落了修复批 e8ccf78 + F2 两次返工。本轮职责:补跳过项 + 验修复 + 全量回归。Docker 引擎已就绪(29.2.1)。

## 必做清单
1. **Postgres 真并发双扣**:docker run 一次性 postgres 容器(随机高位端口,跑完 rm),对其跑 AddCreditSystem migration,设用户余额 1 → 并发 2 个 consume → 断言:最终余额 ≥ -1、consume 流水条数 = 实际扣减数、无丢账重账;再做余额 50 并发 10 consume → 余额 40、流水 10 条 balance_after 连续无跳号。证据:原始输出。严禁触碰任何非本容器实例。
2. **Playwright 真服务全流程**(桌面端,起 api+web,本地 .env 可从主仓复制不提交):
   - /me 页:真数据渲染(余额/流水/价目)、头像上传真传一张 <2MB png、流水出现"注册赠送"。
   - admin:登录管理员 → 用户列表余额列 → 充值 30 → 用户侧流水"管理员充值 +30"且余额行内用后端返回值。
   - 402 链路:把测试用户余额置 0 → 任一 AI 按钮 → 页面出现"点数不足"提示(toast),非白屏。
   - **聊天页标注 DOM 实测**:/chat 进任一会话,输入区附近"消耗 1 点"在渲染 DOM 中**恰好出现 1 次**(不是 0 次也不是 2 次)——此项此前被静态检查误导过,只认 DOM。
   - 模拟面试创建框:标注含"7 点"且口径=出题1+作答5+总评1。
   - 每项截图。
3. **修复批针对回归**(jest):头像魔数(伪造 Content-Type 的非图 400/真 png 201)、GrantCreditsDto 边界(delta 99999→400,note 201字→400)、CreditGuard 无 user 401、CREDIT_CONSUME_FAILED 结构化日志断言——这些用例修复批已写,确认全绿即可。
4. **全量门禁**:api tsc 0 错 + jest 单测/e2e 全量(已知例外仅 tasks.e2e 预存在项);web eslint+tsc 0 错 + build。贴原始摘要数字。

## 红线
- 不改产品代码;发现 bug 记 file:line 报回。
- 找茬思想:特别盯修复批改过的文件有没有改坏别的(admin/page.tssx 余额回填、me.service 魔数误拒真图)。
- 完成后逐条 PASS/FAIL+证据写回本文件,返回中文总结。
