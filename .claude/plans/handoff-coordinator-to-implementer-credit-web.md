# Handoff: Coordinator → Implementer (credit-web)

## 状态: READY_FOR_IMPL
## 任务: Credit 前端——"我的"页(/me,头像/余额/流水)+ 侧边栏头像入口 + 管理后台充值 + AI 按钮点数标注 + 402 拦截提示
## 工作目录(必须在此工作): E:\Agent program\HRBP-wt\credit-web(git worktree,分支 feature/credit-web)
## 输入文件: packages/web/src/(app/(main)/ 各页、lib/api.ts、components/)
## 禁止触碰: packages/api/**、.env*、deploy/**、components/ui/mobile-gate.tsx、其他 handoff 文件

## 背景(需求原文摘录)
"给的点数要在用户那边体现出来,先放到点击头像进入到'我的'这种,展示出基本内容,我的支付记录(后台给充值上去的就显示管理员充值),使用的 credit,基本信息这种,还可以上传头像,然后我的管理员面板也做一些适当改动"。价格文案 10 元/50 点,支付模块不做,充值引导"联系管理员"。

## 后端契约(并行开发中,后端在另一 worktree 实现,以此为准,不得擅改)
- `GET /me` → `{id,email,name,avatar_url,invite_code,created_at,credit_balance}`
- `GET /me/credits?limit=&offset=` → `{items:[{id,delta,type:'signup_grant'|'admin_grant'|'consume',balance_after,note,endpoint,created_at}],total}`(倒序)
- `POST /me/avatar`(multipart 字段 `file`,≤2MB,jpeg/png/webp)→ `{avatar_url}`
- `POST /admin/users/:id/credits` `{delta:正整数, note?}` → `{credit_balance}`;`GET /admin/users` 各项含 `credit_balance`
- AI 端点余额不足 → HTTP **402** `{message:"点数不足，请联系管理员充值"}`
- 本 worktree 内后端尚无这些端点,属预期;页面必须有完整 loading/空态/错误态,**严禁任何 mock 数据**;真数据 E2E 由集成阶段测试代理负责

## 规格
1. **/me 页**(app/(main)/me/page.tsx,新建):头像(显示+点击上传,前端限 2MB/jpeg/png/webp,上传中状态)、基本信息(姓名/邮箱/注册时间/邀请码)、credit 余额(醒目卡片)、流水列表(type 映射文案:admin_grant→"管理员充值"、signup_grant→"注册赠送"、consume→"使用"+endpoint 友好名,delta 正绿负灰,分页或加载更多)、价目说明("10 元 / 50 点,充值请联系管理员",平实文案不营销)。
2. **侧边栏入口**(app/(main)/(main)/layout.tsx 的 ShellLayout):侧边栏增加头像区(avatar_url 有则图、无则首字符圆形占位),点击进 /me;旁边小字显示当前余额(从 GET /me 拉,登录后缓存,402 触发时刷新)。位置与现有视觉风格一致,不大改布局。
3. **管理后台**(app/(main)/admin/page.tsx):用户列表加"余额"列;每行加"充值"操作→弹窗(点数正整数+备注)→调 POST credits→成功后行内余额更新;移除 daily_quota_override 的调整控件(若存在);其余区块不动。
4. **AI 按钮点数标注**:全部会扣点的提交按钮旁加轻量标注"消耗 1 点"(样式统一,小字灰色,不喧宾夺主)。定位方法:grep lib/api.ts 的调用方中 POST 到 AI 端点的页面(诊断/求职信/模拟面试[创建对话框注明"本场约 N+2 点",N=题数]/聊天输入框/机会评估/面试准备/薪资/offer对比/人脉/学习路线/行业趋势/跟进/职业地图等),逐页核对,列清单进交付物。
5. **402 全局处理**(lib/api.ts):统一捕获 402 → 抛带标记的错误,调用方或全局层弹提示"点数不足,请联系管理员充值"(对齐现有错误提示形态),并触发余额刷新。不要写成静默吞错。

## 执行计划 (step→verify)
1. pnpm install → verify: `pnpm --filter @coach/web build` 通过(基线)
2. /me 页 + 路由 → verify: 本地 dev 起 web,/me 渲染骨架与 loading/错误态截图(后端缺失时显示错误态而非崩溃)
3. 侧边栏头像入口 → verify: 截图(有/无 avatar 两种态)
4. 管理后台改动 → verify: 截图充值弹窗;grep 证明 daily_quota_override 控件已移除(若原本存在)
5. 按钮标注全清单 → verify: 列出"页面→按钮→标注"清单,逐项截图或代码行引用
6. 402 处理 → verify: 单测或本地以 stub fetch Response(402) 验证提示链路(测试代码可 stub,产品代码不可)
7. 全量门禁 → verify: `npx tsc --noEmit` 0 错;`npx eslint src/` 0 错;`pnpm --filter @coach/web build` 通过,贴原始输出
8. 提交 → verify: feature/credit-web 分支 commit(Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>),`git status` 干净,不 push

## 红线
- 严禁 mock 数据进产品代码、严禁空 onClick、严禁 any
- 视觉风格对齐现有页面(看 admin/today 等页的内联 style 体系),不引入新 UI 库
- 改动可追溯;不顺手重构
- 完成后更新本文件:已完成/产出物/验证结果(逐 step PASS/FAIL+证据)/遗留问题

## 决策上下文
- 完全替代制:旧"每日配额"概念在 UI 上消失,一律点数;若发现页面有"今日剩余次数"类文案一并替换为余额口径(列入清单)
