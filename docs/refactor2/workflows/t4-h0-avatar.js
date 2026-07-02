export const meta = {
  name: 't4-h0-avatar',
  description: 'T4·H0 热修:头像上传裂图(鉴权/ACL 下载路径 + 前端 Blob 渲染)+ 顺带清 resume.file_url 死字段,侦察→实现→验证三段式',
  phases: [
    { title: '侦察', detail: '核实设计文档 H0 节与实时代码坐标,产出精确执行清单' },
    { title: '实现', detail: '按清单在 feat/t4-h0-avatar 分支执行' },
    { title: '验证', detail: '质量门与只读审计并行' },
  ],
}

const RECON_PROMPT = `你是侦察代理(只读,不许改任何文件)。任务:为「头像上传裂图热修」产出一份「当前精确执行清单」。

## 第一步:读设计文档
仓库根 E:\\Agent program\\HRBP,基线分支 dev。先读 docs/refactor2/T4-hardening.md 的「H0 热修:头像上传裂图」一节(约第 8-11 行),吃透 bug 描述与修法要求:
- bug:me.service.ts 的头像上传返回裸存储 key(如 avatars/uuid.jpg),全站没有路由/静态服务能把它解析成可加载图片,上传必裂,且全链路报 200 成功。
- 修法:返回可访问 URL,走带鉴权/ACL 的下载路由生成;不许用静态目录挂载图省事(会绕过 files 的 assertOwner ACL)。顺带清 resume.file_url 死字段。
- verify:Playwright 上传头像→刷新→图片可见;非本人构造 URL 访问被拒。

## 第二步:核实以下预调研线索(2026-07-02 侦察结论,坐标/行号可能已漂移,一切以你此刻读到的实时代码为准;如发现漂移在清单里注明,如发现目标内容已不存在标 [缺失-需人工],不许猜)

1. 核心 bug 点:packages/api/src/users/me.service.ts 的 updateAvatar() 方法(约第 65-81 行)。当前逻辑是调用 FilesService.upload() 拿到裸 key(形如 "avatars/uuid.jpg"),原样存进 users.avatar_url,并原样返回给前端;前端把这个裸 key 直接当 img 的 src 用,浏览器根本没法当 URL 加载,这就是裂图的根因。注意第 63-64 行和 users.service.ts 第 58 行各有一条注释提到"对齐简历 file_url 现行模式"——这个被对齐的模式本身就是错的(resume.file_url 是死字段,见第 8 条),两条注释在改完之后会变成误导性说明,需要一并更新或删除。

2. 已经存在、不需要新建的鉴权/ACL 下载出口:packages/api/src/files/files.controller.ts 的 GET /files/download/:folder/:name(约第 38-55 行)已经实现了先 assertOwner 后流式返回文件的逻辑;files.service.ts 的 assertOwner()(约第 33-38 行)按 key+user_id 查 file_metadata 表,非属主 404,不泄露存在性。这条路由是 folder 无关的通用逻辑(folder 只是字符串拼接的一部分,没有按 folder 分支的权限差异)。结论:复用这条已有路由,不要新建下载端点,也不要改这两个文件里的 ACL 逻辑。

3. main.ts(全局前缀 'api',setGlobalPrefix 约第 73 行)目前没有挂载任何静态目录服务上传文件——这是好状态,必须保持。红线:不许为了省事新增 express.static / useStaticAssets / ServeStaticModule 之类直接暴露 uploads 目录的东西,那会绕开 assertOwner,等于开后门。

4. 认证方式是纯 Bearer Header 型:packages/api/src/common/guards/jwt.strategy.ts 用 ExtractJwt.fromAuthHeaderAsBearerToken(),没有 cookie 会话。这意味着即便把 avatar_url 从裸 key 换成类似 "/files/download/avatars/uuid.jpg" 这样的路径字符串,直接塞进 <img src> 依然加载不出来——浏览器发起 img 请求不会带 Authorization 头,后端会 401。真正的修法是:前端必须先用带 Authorization 头的请求把图片字节拉下来(Blob),再用这个 Blob 生成一个 object URL 给 <img> 用。

5. 好消息:这套"认证拉 Blob 转 object URL"的机制前端已经有现成实现,不要发明新的:
   - packages/web/src/lib/api.ts 的 api.getBlob(path)(约第 268-278 行)已经是带 Authorization 头拉取并返回 Blob 的封装,内部会拼上 API_BASE 前缀,失败时走统一 handleError。
   - packages/web/src/components/mock/mock-stage.tsx(约第 55-98 行)有一套完整范例:objectUrlRef 记录上一个 object URL、每次重新拉取前先 stopPlayback() 里 URL.revokeObjectURL 清理旧的、拉取失败显式置错误态不静默。新代码要照这个范式抄(不强制复用同一个 ref 命名,但"记录上一个 URL 并在下次拉取前/组件卸载时 revoke"这个行为必须有,否则算内存泄漏)。这个文件本身不在本次修改范围内,只作为参考,不要动它。

6. 需要接入 Blob 机制的两处 <img> 渲染点(都要改,漏一个算没修完,因为两处都会裂图):
   - packages/web/src/app/(main)/me/page.tsx(约第 297-306 行),img 直接用 profile.avatar_url 当 src,profile 来自 GET /me。
   - packages/web/src/app/(main)/layout.tsx(约第 454-469 行),img 直接用 user.avatar_url 当 src,user 来自 GET /auth/me(约第 168-174 行发起请求)。
   两处是否抽一个共享的极简 hook(比如新建 packages/web/src/lib/use-authed-image.ts)还是各自照抄范式,由你判断,但两处的行为必须一致:加载中/无 avatar_url 时的回退展示(目前是首字母圆形头像)不能丢,拉取失败要有降级(至少不崩、不留碎图图标),object URL 在依赖变化和组件卸载时都要 revoke。

7. avatar_url 有三个读取出口,只需要在写入点改一次,DRY,不要三处分别格式化:
   - POST /me/avatar 的响应(me.service.ts updateAvatar() 的返回值)。
   - GET /me(packages/api/src/users/dto/me-profile.dto.ts 的 toMeProfile(),约第 14-24 行)——只是透传 user.avatar_url,本身不需要改。
   - GET /auth/me(packages/api/src/auth/auth.controller.ts 第 38-41 行 → auth.service.ts getProfile() 约第 139-143 行)——直接返回整个 User 实体,avatar_url 也是透传,不需要改。
   只要 me.service.ts 的 updateAvatar() 在存库和返回值这两处都换成同一个正确的可用路径(建议:字符串 "/files/download/" 与 files.upload() 返回的 key 拼接,例如 key 是 "avatars/uuid.jpg" 时拼成 "/files/download/avatars/uuid.jpg"),上面三个出口会自动全部一致。核实这个拼接结果确实能被 files.controller.ts 的路由参数 :folder/:name 正确解析回原 key(folder="avatars", name="uuid.jpg")。

8. resume.file_url 死字段(顺带清理项,和头像修复共享 me.service.ts / users.service.ts 里两条误导性注释,所以放一起处理)。核实它是否仍是真死字段(2026-07-02 侦察结论:packages/api/src/resumes/resumes.service.ts 的 create() 从未写入过它;前端从不读它,唯一出现处是 DTO 透传 null;全局 grep file_url 没有发现同名不同物的混用)。涉及三处:
   - packages/api/src/resumes/entities/resume.entity.ts 约第 28-29 行(@Column({nullable:true}) file_url: string;)。
   - packages/api/src/resumes/dto/resume-response.dto.ts 约第 42 行(接口字段)和第 88 行(file_url: resume.file_url ?? null 透传赋值)。
   - packages/web/src/lib/types.ts 约第 41 行(Resume 类型的 file_url 字段)。
   清理方式(既定设计判断,不是你要重新决策的开放项):只删代码引用,不写 DROP COLUMN migration。理由:packages/api/src/app.module.ts(约第 78-80 行)的红线注释写明生产 Postgres 一律 synchronize:false,schema 变更只走迁移文件;删掉实体上的 @Column 之后,生产表里这一列会变成 TypeORM 不再识别、内容全是 NULL 的孤儿列,留着完全无害。为一个"小活"热修去写一条生产 DROP COLUMN 迁移,风险收益不成比例,不做。如果你核实后认为必须要建迁移,不要自己悄悄改主意,停下来在清单里标注分歧并说明理由。

9. 已经踩过这个坑、把旧(裂图)格式编码进了断言的测试,必须同步改掉,否则会因为断言过时而 FAIL——这不是回归,是断言在验证错误行为:
   - packages/api/test/credit.e2e-spec.ts 约第 217-229 行,头像上传测试组。第 226 行 expect(res.body.avatar_url).toMatch(/^avatars\\//) 断言的是裸 key 格式,要改成断言新格式(比如以 "/files/download/avatars/" 开头)。第 228 行 expect(u.avatar_url).toBe(res.body.avatar_url) 只要写入点存库值和响应值保持一致(见第 7 条),这行不需要改,但要核实确实还成立。
   - packages/web/e2e/credit-full-flow.spec.ts 约第 160-194 行(A3 用例)。第 187 行同样的裸 key 正则 expect(uploadBody.avatar_url).toMatch(/^avatars\\//) 要同步改。

10. 设计要求的验收动作里,"非本人构造 URL 访问被拒"这一半已经被 packages/api/test/files-isolation.e2e-spec.ts 证明过(它用 resumes 文件夹跑穿了同一条 GET /files/download/:folder/:name 路由的属主校验,路由逻辑与 folder 值无关),不需要为 avatars 文件夹重复写一份相同性质的新用例,回归时把这个套件也跑进去当证据即可。"上传→刷新→图片可见"这一半目前没有任何测试真正验证"图片视觉上真的加载出来了"——credit-full-flow.spec.ts 的 A3 用例只断言了 JSON 格式并截了个图,没断言图片没碎。核实并在清单里列一条:给 A3 用例(或紧邻新增一条)补一个真断言,思路是上传后 reload /me 页,等待 img[alt="头像"] 出现,断言其 naturalWidth 大于 0(证明不是碎图,不是"元素存在但加载失败")。

11. 确认过和本次改动无关、不要碰的 avatar 相关命中(同名不同物 / 纯存在性检查,与 URL 格式无关,复核一下仍然成立即可,不用列为要改的条目):packages/api/test/admin-isolation.e2e-spec.ts 约第 237 行、admin-new-endpoints.e2e-spec.ts 约第 218/229 行(管理员字段白名单存在性检查)、packages/web/e2e/admin-overview-dual-success-rate.spec.ts 约第 39/128 行(mock 数据 avatar_url: null)、packages/web/e2e/credit-me-page.spec.ts 约第 128 行(临时文件名叫 test-avatar.txt,和 URL 格式无关)。

12. 遗留问题(明确不做,写进清单末尾提醒实现代理不要自己扩大范围):修复前已经写入 DB 的旧格式 avatar_url(裸 key)本次不做读时兼容或数据回填。这个 bug 是"上传必裂"100% 必现,旧值本来就没人看得到能加载的图,修复后到用户下次重新上传前维持现状不会更差,不需要加"识别到不是新格式就自动转换"这种没人要的兼容层。

## 第三步:产出格式
逐条按下面的格式给出最终清单(纯文本,不要用 markdown 代码块包裹整体):
- 文件路径
- 内容锚点(不止行号,给一句能 grep 到的独特文字或函数名,因为行号可能已漂移)
- 改法(一句话讲清楚要改成什么样)
- 该条的 verify(具体到能直接执行的命令或可观察的现象)
目标内容不存在的条目标注 [缺失-需人工],不许替它瞎编一个改法。
清单最后单列一节「红线禁碰清单」,把上面第 2/3/8/12 条涉及的红线原样列出来。`

const IMPL_PROMPT = `你是实现代理,执行「头像上传裂图热修 + 清理 resume.file_url 死字段」。仓库 E:\\Agent program\\HRBP,当前在 dev。

## 操作规程
- 先 git status 确认当前工作区状态;工作区里已有的未跟踪杂物、CLAUDE.md 等既有改动不是你的,不许 stage、不许清理。
- 基于 dev 创建分支 feat/t4-h0-avatar 并切换,就在主工作区做(本任务是小型修复型,不建 worktree)。
- 严格按照下面「侦察产出的执行清单」逐条执行,范围外一行不改。每改一处先 Read 确认现状与清单描述一致再动手。
- 遇到清单标 [缺失-需人工] 的条目,或某条改法与「红线禁碰清单」冲突,就停在该条,在最终回复里如实报告,不许猜、不许绕过红线硬着头皮做。
- 允许触碰的文件范围严格以「侦察产出的执行清单」点名的文件为准,清单外一个文件都不许碰,不许因为"顺手""更彻底""看着也该改"等理由扩大范围。下面列出的是清单预计会点到的文件,供你核对清单有没有遗漏,不是额外授权,若清单点名的文件与这份预期列表不一致,以清单为准:packages/api/src/users/me.service.ts、packages/api/src/users/users.service.ts(仅注释类改动)、packages/api/src/resumes/entities/resume.entity.ts、packages/api/src/resumes/dto/resume-response.dto.ts、packages/web/src/lib/types.ts、packages/web/src/app/(main)/me/page.tsx、packages/web/src/app/(main)/layout.tsx、packages/web/src/lib/api.ts(如清单要求新增极简复用函数)、清单可能要求新增的一个前端小文件如 packages/web/src/lib/use-authed-image.ts、packages/api/test/credit.e2e-spec.ts、packages/web/e2e/credit-full-flow.spec.ts。
- 红线禁碰(不许因为"顺手"或"更彻底"就碰):
  1) packages/api/src/files/files.controller.ts、packages/api/src/files/files.service.ts——已有的 assertOwner/getFilePath/下载路由 ACL 逻辑是对的,只许复用,不许修改。
  2) packages/api/src/main.ts——不许新增任何形式的静态目录服务(express.static / useStaticAssets / ServeStaticModule 等)来直接暴露上传目录,那会绕过 assertOwner。
  3) 不写任何数据库 migration(尤其是 DROP COLUMN file_url,或任何改 resumes/users 表结构的迁移)。resume.file_url 只删代码引用(实体字段 + DTO 字段 + 前端类型字段),留着无害的孤儿列不处理。
  4) 不碰 diagnoses.service.ts、ai.service.ts、conversations.controller.ts、限流器/看门狗相关文件——那些是 T4 文档里 S0/D1 段落的范围,是另一批任务,和本次头像热修无关。
  5) 不做通用文件下载/图片加载框架化重构,只修头像这一条链路,能力止步于清单范围。
  6) 不对修复前已写入 DB 的旧格式 avatar_url 做读时兼容或数据回填,不加"自动识别格式转换"这类没人要的灵活性。
- 全部完成后自验(残留 grep + tsc 探针,不冒充测试),在最终回复里附原始输出:
  1) 残留扫描三条:
     git grep -n "file_url" -- ':!docs' ':!packages/api/src/database/migrations' ':!packages/api/dist'  —— 应为空(resume.file_url 三处代码引用清干净,迁移历史文件和编译产物不算残留)。
     git grep -n "avatar_url: key" -- packages/api/src/users/me.service.ts  —— 应为空(确认不再把裸 key 原样存/返)。
     git grep -n "express.static\\|useStaticAssets\\|ServeStaticModule" -- packages/api/src/main.ts  —— 应为空。
  2) cd packages/api && npx tsc --noEmit(编译探针)。
  3) cd packages/web && npx tsc --noEmit(编译探针)。
  4) 只提交本次涉及的文件:git add 逐路径,git commit -m "fix(avatar): 头像上传裂图热修(鉴权ACL下载路径+前端Blob渲染)+ 清理resume.file_url死字段"。
- 最终回复必须是交付报告,包含:清单逐条 DONE/SKIP(附原因,尤其是标了 [缺失-需人工] 或红线冲突而 SKIP 的条目),三条残留扫描的原始输出,两个 tsc 的原始输出,commit hash,git diff --stat 结果。遇到清单与现实不符(目标内容不存在/行号漂移到找不到)立即停在该条,报告不猜。`

phase('侦察')
const checklist = await agent(RECON_PROMPT, { label: 'recon:t4-h0-avatar', phase: '侦察', model: 'sonnet' })
if (!checklist) throw new Error('侦察代理未返回,中止后续实现')

phase('实现')
const impl = await agent(IMPL_PROMPT + '\n\n## 侦察产出的执行清单(照此逐条做)\n' + checklist,
  { label: 'impl:t4-h0-avatar', phase: '实现', model: 'sonnet' })
if (!impl) throw new Error('实现代理未返回,中止后续验证')

phase('验证')
const GATE = {
  type: 'object', required: ['gates', 'overall_pass'],
  properties: {
    gates: { type: 'array', items: { type: 'object', required: ['name', 'pass', 'evidence'], properties: {
      name: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string', description: '原始输出关键段,失败时含完整错误' } } } },
    overall_pass: { type: 'boolean' },
    notes: { type: 'string' },
  },
}
const REVIEW = {
  type: 'object', required: ['verdict', 'findings'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    findings: { type: 'array', items: { type: 'object', required: ['severity', 'file', 'issue'], properties: {
      severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, file: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' } } } },
  },
}

const GATES_PROMPT = `你是测试代理。仓库 E:\\Agent program\\HRBP,切到分支 feat/t4-h0-avatar(实现代理刚提交完毕,先 git log -1 确认在该分支最新提交上)。逐门跑质量门,每门附原始输出关键段(失败必须贴完整错误,不许说"通过"两个字了事),不改任何代码,挂了如实报 FAIL 附错误,不许自己修:

1) cd packages/api && npx jest --config ./test/jest-e2e.json --forceExit —— 这才是 e2e 套件的正确跑法(等价于 docs/AGENT-HANDBOOK.md §3 记录的基线跑法 pnpm --filter @coach/api test:e2e,基线约 69 个 e2e-spec 文件,全绿才算过)。陷阱提醒(已实测确认,不是猜测):不许跑裸的 npx jest——packages/api/jest.config.json 的 testRegex 只匹配以 ".spec.ts" 结尾的单测文件,credit.e2e-spec.ts、files-isolation.e2e-spec.ts 这类 ".e2e-spec.ts" 文件会被裸 npx jest 安静地跳过(0 匹配,不报错、不报"跳过",只是列表里根本没有这两个文件),那样跑出来"全部通过"是假通过,一条头像验收相关的用例都没真正跑。必须从 packages/api 目录跑(从仓库根跑会走 babel-jest 报 TS 语法错,那是另一个环境坑,和上面这条是两回事,两条都要注意)。重点关注 credit.e2e-spec.ts(头像上传测试组,断言应已对齐新的 URL 格式)和 files-isolation.e2e-spec.ts(用于佐证"非本人构造 URL 访问被拒"这条验收在本次改动后依然成立)。
2) cd packages/api && npm run build(nest build)。
3) cd packages/web && npx eslint src/ —— 0 错误。
4) cd packages/web && npm run build —— 通过。
5) Playwright 视觉验收:验收一律用 build+start,不用 dev 模式(docs/AGENT-HANDBOOK.md §3 明文:dev 模式编译极慢且吃内存,验收一律用 build+start;第 2/4 步已经跑过两个包的 build,产物已在,直接复用起服务,不用重新 build)。在两个终端分别起:packages/api 目录 npm run start(即 node dist/main,端口由 process.env.PORT ?? 3002 决定,本机不设 PORT 环境变量时就是 3002,和 playwright.config.ts 的假设一致,不用额外处理);packages/web 目录不要用 npm run start 裸起——package.json 里 web 的 start 脚本是裸的 "next start",不带端口参数,默认监听 3000 而不是 3001(已实测确认,终端会打印 "Local: http://localhost:3000"),必须显式加端口:npx next start --port 3001,否则会和 playwright.config.ts 里写死的 baseURL http://localhost:3001 对不上,导致全部用例因连不上服务器而报错——这是环境坑,不是产品代码的 bug,不要去改产品代码。等两边都就绪后,在 packages/web 目录跑 npx playwright test e2e/credit-full-flow.spec.ts e2e/credit-me-page.spec.ts。重点核对:A3 头像上传用例(或实现代理新增的紧邻断言)是否真的验证了上传后 /me 页的 img[alt="头像"] naturalWidth 大于 0(证明图片真的加载出来了,不是碎图);6c/6d 两条头像格式/大小拒绝用例(在 credit-me-page.spec.ts 里)是否仍然通过(确认没有被这次改动误伤)。
6) 残留复扫三条(与实现代理自验相同,独立复核一遍):
   git grep -n "file_url" -- ':!docs' ':!packages/api/src/database/migrations' ':!packages/api/dist'  —— 应为空。
   git grep -n "avatar_url: key" -- packages/api/src/users/me.service.ts  —— 应为空。
   git grep -n "express.static\\|useStaticAssets\\|ServeStaticModule" -- packages/api/src/main.ts  —— 应为空。
实现背景:头像上传原先返回裸存储 key 直接塞进 <img src>,浏览器既不能拿裸 key 当 URL,也拿不到走鉴权下载路由所需的 Authorization 头,双重原因导致上传必裂;修复后端写入点统一格式为可复用的鉴权下载路径,前端两处 <img> 渲染点改为用带 Authorization 头拉 Blob 再转 object URL 的方式加载,并顺带清了 resumes.file_url 死字段。`

const REVIEW_PROMPT = `你是只读审计代理(找茬,不背书)。仓库 E:\\Agent program\\HRBP,审计分支 feat/t4-h0-avatar 相对 dev 的完整 diff(git diff dev...feat/t4-h0-avatar)。不改任何文件。

对照下面的侦察执行清单逐条核对:
${checklist}

找茬重点,每条发现附 file:line:
1) 范围外改动——diff 里任何不在清单内的文件/行,尤其是碰了 diagnoses.service.ts / ai.service.ts / conversations.controller.ts / 限流器或看门狗相关文件(那是 T4 文档里 S0/D1 段落的范围,和本次头像热修无关,一旦出现判 blocking)。
2) 清单条目漏做——逐条对 diff 打勾,标出漏做的。
3) 危险区红线是否被触碰:
   a) packages/api/src/main.ts 是否新增了 express.static / useStaticAssets / ServeStaticModule 之类直接暴露上传目录的东西——有则 blocking(绕过 assertOwner)。
   b) packages/api/src/files/files.controller.ts、packages/api/src/files/files.service.ts 的 ACL 逻辑(assertOwner / getFilePath / 下载路由)是否被修改——不应该被动,出现改动视为范围外,除非清单里明确要求过。
   c) 是否新增了任何数据库 migration 文件,尤其是针对 resumes 或 users 表结构的——按侦察阶段的既定设计判断这次不该有迁移,一旦出现判 blocking,需要在发现里说明为什么这个判断可能有问题或者确认是误增。
4) avatar_url 的三个读取出口(POST /me/avatar 响应、GET /me 的 toMeProfile、GET /auth/me 的 getProfile)是否值保持一致——应该是同一份 DB 值直接透传,不应该在三处分别格式化出不一样的结果。
5) 前端两处 <img> 渲染点(packages/web/src/app/(main)/me/page.tsx、packages/web/src/app/(main)/layout.tsx)是否都改成了"带 Authorization 头拉 Blob 再转 object URL"的方式——如果仍然直接把某个路径字符串塞进 <img src>,那是没修好(浏览器拿不到 Authorization 头,照样裂图),必须判 blocking。
6) object URL 生命周期——依赖变化或组件卸载时是否 revoke 了旧的 object URL(对照 packages/web/src/components/mock/mock-stage.tsx 的既有范式判断),没 revoke 算内存泄漏,判 major。
7) 测试断言修改是否是"真的对齐新行为"而不是"改成怎么都能过"——重点看 packages/api/test/credit.e2e-spec.ts 和 packages/web/e2e/credit-full-flow.spec.ts 里改过的行,正则/断言是否精确匹配新的 URL 格式,而不是放宽到可以匹配任何字符串,或者干脆删掉了断言。
8) 新增的"图片视觉可加载"断言是否真的验证了 naturalWidth 大于 0 这类能证明非碎图的信号,而不是只截了个图或者只检查了元素存在。
9) resume.file_url 清理是否漏了 resume.entity.ts / resume-response.dto.ts / lib/types.ts 三处里的任何一处,或者误删了别的同名不同物字段。
10) 提交范围是否干净——git diff --stat 里是否混入了本任务不该碰的文件(比如无关的 .claude/plans 草稿、docs 下其它文档)。
verdict PASS 要求以上红线全部干净且清单条目全部落实;否则 FAIL,并按 severity 分级列出每条发现。`

const [gates, review] = await parallel([
  () => agent(GATES_PROMPT, { label: 'gates:t4-h0-avatar', phase: '验证', schema: GATE, model: 'sonnet' }),
  () => agent(REVIEW_PROMPT, { label: 'review:t4-h0-avatar', phase: '验证', schema: REVIEW, model: 'sonnet' }),
])

return {
  checklist,
  impl_report: impl,
  gates,
  review,
}
