# Handoff: Coordinator → Implementer (后端:自动 changelog → 公告)

## 状态: READY_FOR_IMPL
## 任务: 新增 CHANGELOG.md + changelog-reader.service + POST /admin/announcements/generate-from-changelog,复用现有 AnnouncementGeneratorService 起草草稿。

## 工作目录(绝对路径,只在此 worktree 干活)
`E:\Agent program\HRBP\.claude\worktrees\auto-changelog`
分支已在 `feat/auto-changelog` @ 89aa6e8,node_modules 已 junction 链接,**不要 pnpm install / 不要装任何依赖**。

## 只许改/建这些文件(精确清单)
1. 新建 `CHANGELOG.md`(仓库根:`E:\Agent program\HRBP\.claude\worktrees\auto-changelog\CHANGELOG.md`)
2. 改 `.dockerignore`(仓库根)
3. 改 `Dockerfile.api`(仓库根)
4. 新建 `packages/api/src/announcements/changelog-reader.service.ts`
5. 改 `packages/api/src/announcements/admin-announcements.controller.ts`
6. 改 `packages/api/src/announcements/announcements.module.ts`

## 禁止触碰(硬红线)
- `packages/api/src/interviews/**`、`speech/**`、`quota/**`、`diagnoses/**`、`feed/**`、`app.module.ts`
- `packages/api/src/ai/**`(只调用 AiService,不改它)
- `packages/api/src/announcements/announcement-generator.service.ts`(只复用,不改)
- 任何 `.env*`、`migrations/` 已有文件、`packages/web/**`(前端另有 agent)
- 任何测试文件(test agent 负责)

## 背景与已确认的设计(不要自由发挥,照此实现)

### 复用点(关键 — 不要重写 AI 逻辑)
现有 `AnnouncementGeneratorService.generateDraft(dto: GenerateAnnouncementDto)` 已封装:
- 防编造 system prompt(只依据要点,绝不编造)
- `AiService.completeStructured`(schema 校验 + 主备降级)
- title/body clamp + 草稿落库(status='draft', active=false, published_at=null, 公开端永不可见)
- 返回 `Promise<Announcement>` 实体

`GenerateAnnouncementDto` 形状:`{ source_content: string; preferred_display_type?: 'banner'|'modal' }`
你的新端点要做的就是:**读 CHANGELOG 最新条目 → 拼成 source_content 文本 → 调 generateDraft → 返回 AnnouncementResponseDto.from(item)**。

### CHANGELOG.md 内容(seed,真实近期部署,口语化用户向文案)
格式:Markdown,顶部一段说明,然后按 `## YYYY-MM-DD` 日期标题倒序分节(最新在最上),每节下用 `-` 列要点。
用以下真实近期部署内容(精炼、事实、用户能懂,不堆术语):
- 面试录音上传修复:支持 webm/m4a 等浏览器常见格式自动转码,上传更稳。
- 微信内打开时的上传引导(手机端扫码/引导上传)。
- 后台失败记录与成功率口径修正(运营能看到真实的 AI/转写失败)。
- AI 公告 + 引导按钮(运营一键起草更新公告,用户看到带跳转的引导)。
- 桌面端上传回执实时同步 + 复盘删除/重试。
- 稳定性加固(防卡死 / 防超量,小内存机更稳)。
- 转写说话人标注修复(谁说的标得更准)。
合理分到 2-3 个日期节(例如 2026-06-16 / 2026-06-15 / 2026-06-12),最新日期在最上。**只写真实发生过的,不要编造功能/数字/承诺。**

### changelog-reader.service.ts 规格
- `@Injectable()` 类 `ChangelogReaderService`
- 读取路径定位:容器里 api 进程 WORKDIR = `/repo/packages/api`,CHANGELOG 在 `/repo/CHANGELOG.md`;本机 cwd 同样是 `packages/api`。用 `path.join(process.cwd(), '..', '..', 'CHANGELOG.md')` 指向仓库根。**额外兜底**:若该路径不存在,再试 `path.join(process.cwd(), 'CHANGELOG.md')`(以防 cwd 变体)。用 `fs.readFileSync` + try/catch。
- 方法 `getLatestEntry(): { date: string; bullets: string[] } | null`:解析所有 `## <heading>` 节,取**第一个**(最新)节,提取其下以 `-` 或 `*` 开头的要点行(去掉前缀和首尾空白)。无文件/解析不到任何节/节内无要点 → 返回 null。
- 方法 `toSourceContent(entry): string`:把要点拼成每行一条的纯文本(给 generateDraft 的 source_content)。
- **graceful 铁律**:文件缺失、空文件、畸形内容(没有 ## 标题、没有要点)一律返回 null/空,**绝不 throw、绝不让端点 500**。用 try/catch 包住所有 fs 与解析。
- 严格类型:不用 any。fs/path 用 `import * as fs from 'fs'` / `import * as path from 'path'`(项目其它 service 的既有写法,先 grep 确认风格再写)。

### 新端点规格(admin-announcements.controller.ts)
在现有 `AdminAnnouncementsController`(已 `@UseGuards(JwtAuthGuard, AdminGuard)`)里新增:
```
@Post('generate-from-changelog')
async generateFromChangelog(): Promise<AnnouncementResponseDto>
```
逻辑:
1. `const entry = this.changelogReader.getLatestEntry();`
2. entry 为 null(无 changelog / 解析为空)→ 抛 `BadRequestException('暂无可用的更新日志,无法生成公告')`(这是「无内容可总结」的合法 4xx,不是 500;graceful 在 reader 层已保证不抛)。
3. 有 entry → `const dto: GenerateAnnouncementDto = { source_content: this.changelogReader.toSourceContent(entry) };` → `const item = await this.generator.generateDraft(dto);` → `return AnnouncementResponseDto.from(item);`
构造函数注入 `ChangelogReaderService`(已有 generator/announcements)。

### announcements.module.ts
把 `ChangelogReaderService` 加进 `providers`(import 它)。不动 imports 数组里的 AiModule/UsersModule/TypeOrmModule。

### Dockerfile.api(runner 阶段)
在 runner 阶段(`FROM node:22-alpine AS runner`,WORKDIR `/repo/packages/api`)里,与 `COPY --chown=node:node data /repo/data` 同区域,新增一行:
`COPY --chown=node:node CHANGELOG.md /repo/CHANGELOG.md`
放在 `USER node` 之前。构建上下文是仓库根(`docker build -f Dockerfile.api .`),CHANGELOG.md 在根,可被 COPY。

### .dockerignore(关键坑)
当前最后一行 `**/*.md` 会把 CHANGELOG.md 排除出构建上下文,导致上面的 COPY 失败/拿空。**必须**在 `**/*.md` 之后加一行否定模式白名单:
```
# CHANGELOG 需进镜像供 api 运行时读取,豁免上面的 **/*.md 排除。
!CHANGELOG.md
```
(.dockerignore 支持 `!` 否定,后面的规则覆盖前面的)。

## 执行计划 (step→verify)
1. 建 CHANGELOG.md(根) → verify: 文件存在,含至少 2 个 `## ` 日期节,最新在最上;`grep -c '^## ' CHANGELOG.md` ≥ 2
2. 改 .dockerignore 加 `!CHANGELOG.md` → verify: 文件末尾含该行;`grep -n '!CHANGELOG.md' .dockerignore` 有输出
3. 改 Dockerfile.api 加 COPY 行 → verify: `grep -n 'COPY.*CHANGELOG.md' Dockerfile.api` 有输出且在 `USER node` 之前
4. 建 changelog-reader.service.ts → verify: 文件存在,导出 ChangelogReaderService 含 getLatestEntry/toSourceContent,所有 fs/解析包 try-catch
5. 改 controller 加端点 → verify: `grep -n 'generate-from-changelog' admin-announcements.controller.ts` 有输出
6. 改 module 注册 provider → verify: `grep -n 'ChangelogReaderService' announcements.module.ts` 有输出(import + providers)
7. tsc 编译 → verify: `node packages/api/node_modules/typescript/bin/tsc -p packages/api/tsconfig.json --noEmit` 退出码 0,无错误。贴原始尾部输出。
   (注:api 的 lint 即 tsc --noEmit;若 tsconfig 路径不对,先看 packages/api/ 下有哪些 tsconfig*.json)

## 产出物(完成后在本 handoff 追加)
- 改动文件清单
- 每步 verify 的 PASS/FAIL + 原始命令输出尾部
- CHANGELOG.md 最终内容全文
- 新端点签名 + reader 读取路径说明

## 红线
- 不写 TODO/占位;每步做完立刻 verify 不攒到最后
- 不顺手重构无关代码;不新增依赖
- 卡同一问题 8 次停下写阻塞报告
- 严格类型,无 any
- 若遇瞬时 API/网络错误:把已完成的文件改动 `git add -A && git commit` 提交后再退出,便于恢复
