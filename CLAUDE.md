# CLAUDE.md — Development Standards & Lessons Learned

## 0. 接手必读(任何模型,包括 Opus 4.8)

- **先读 `docs/AGENT-HANDBOOK.md`**(干活手册:代码地图/命令/坑位清单/prompt 模板/部署概要),再动手。
- **再读 `docs/FABLE-PLAYBOOK.md`**(作业法移植手册:做事风格八习惯/重点排序/编队设计六队形/经济与效率平衡/熔断线)——前任模型的隐性经验全部显性化在那里,照着执行可以直接继承产出水准。
- **线上有真实用户**:产品已上线免费试运行。线上坐标与密钥不在仓库里,见本机记忆与 `E:\coach-deploy\运维手册.md`。
- **主代理不写产品代码**:产品代码一律经 subagent 完成;主代理只做分解、派工、质量门、集成、提交。文档/配置/运维操作可直接做。
- 沟通与汇报用中文,说人话:先结论后展开,少黑话,多打比方。

## 行为内核(Proactive Operating Core)

接手这个项目的代理按以下方式工作,这些不是建议,是默认行为:

1. **证据优先**:"完成"必须附可复跑的证据(测试原始输出/截图/命令结果)。没有证据 = 没有完成。`tsc --noEmit` 不是 lint,编译通过不是测试通过。
2. **主动闭环**:发现问题 → 复现 → 定根因 → 最小修复 → 验证 → 汇报。不要把问题清单丢回给用户,不要问"要不要我修"——可逆的、在任务范围内的,直接修掉再汇报。
3. **先查证后动手**:涉及框架 API/生态的知识,训练记忆与当前日期差距大时,先查官方文档(Context7/WebFetch/WebSearch)再写代码。`.claude/rules/hardcore-standards.md` 是硬约束。
4. **卡住会换路**:同一思路失败 3 次就换思路;同一问题缠斗 8 次就停下来写清楚卡在哪、试过什么、下一步建议。不许无脑重试。
5. **假设要说出口**:不确定时先陈述假设和验证方式再动手;有多种解读时列出来选一个并说明理由,不许默默挑一个。
6. **影响真实系统的操作先想回滚**:部署、迁移、删除前,先确认备份/回滚路径存在。破坏性操作(删库、覆盖用户数据)必须停下来确认。
7. **范围纪律**:每行改动可追溯到需求;不顺手重构、不加没人要的配置项和"灵活性";做减法是产品哲学,也是代码哲学。

## Development Principles (MANDATORY)

1. **Single Responsibility** — Each service/method handles one clear domain
2. **Simplest Code** — No backward compatibility; breaking updates > complexity
3. **Strict Types** — No `any`, no `as unknown as`, all TypeScript errors fixed immediately
4. **KISS** — If it needs explanation, it's too complex
5. **Documentation Confidence** — Never code based on speculation; verify with real docs

## Violations Log

### Pattern: Claiming completion without verification
- Phase 5-9 were implemented without writing implementation plans first (plans were written retroactively)
- `tsc --noEmit` was called "lint" when actual ESLint was failing with 7 errors
- API tests were claimed as "verified" when zero Jest tests existed
- `/digest` page said "建设中" while Phase 8 was claimed complete

### Pattern: Non-functional UI shipped as "done"
- Many buttons had `onClick={() => {}}` empty handlers
- Sidebar badges showed hardcoded numbers (3, 18) instead of API data
- Career Map generated recommendations without any resume data (fabrication)
- GitHub and RSS importers returned 0 items but were marked as working
- Digest page cards rendered only gradient backgrounds with no visible content

### Pattern: Mock data disguised as real
- Cover letter generated in English despite Chinese-only requirement
- Feed content URLs were fabricated or broken
- AI suggestions sometimes invented resume content not present in original

## Acceptance Standards (DO NOT SKIP)

### Frontend
- Playwright E2E: desktop (mobile deferred), every button/input/navigation tested
- Full user flow interaction, not just page screenshots
- Normal flows AND edge cases
- Find bugs, don't verify correctness
- ESLint (`npx eslint src/`) must pass with 0 errors — `tsc --noEmit` is NOT lint

### Backend
- Non-AI APIs: expected normal + expected abnormal result tests (Jest e2e)
- AI APIs: complex scenario testing for decision and execution capability
- All tests must actually RUN and PASS, not just compile

### Quality Gates (in order)
1. Simplify skill — code review for reuse/quality/efficiency
2. PJR skill — lint + build both frontend AND backend
3. Playwright E2E — full user flows
4. git-merge-to-develop — rebase + review + merge

### Code Quality Red Lines
- NO glue code or patches — deep integration via refactoring
- NO mock data in production frontend
- NO buttons without real functionality
- NO claiming completion without evidence
- Every AI feature must refuse to fabricate when data is missing

## Workflow
- **以 dynamic workflow 为主力(2026-06-22 用户指令)**:实质任务优先用 dynamic workflow 编排(并行/竞标/评审/流水线)。**team-agent-workflow(jayden-workflow 那套 5-agent + enforcement hook)不准随便用**——它在含空格的家目录(`C:\Users\Jayden park`)下 hook 报错刷屏,已在全局 settings.json 禁用(`team-agent-workflow@jayden-workflow: false`,2026-06-22)。单点重活可用 fable-dev,但编排默认走 dynamic workflow。
- All development in worktrees (unless trivial)
- Subagents for code/tests, main agent for quality control
- Load superpowers skills before any creative work
- Maximum 10 concurrent subagents, default Sonnet, Opus 4.8 for important/complex tasks; subagent 禁用 Fable(2026-06-12 用户指令)
- 并行派工前提:各 agent 改动的文件集不相交;有共享文件就拆出串行的集成 agent 收口
- 派工/测试/审计/排障的 prompt 模板:`docs/AGENT-HANDBOOK.md` §6,直接复制改空格

## 提交与部署纪律
- 推送模式:`git push origin dev && git push origin dev:main`(main 直推已获用户授权)
- 密钥永不入库:`.env` / `.env.production` / `E:\coach-deploy\` 内容不进提交、不进文档
- 数据库变更一律手写 migration(`migration:generate` 伪 diff 不可信),命名与冒烟见 `deploy/README.md` §2.1
- 生产部署顺序铁律:先 migration/seed(`run --rm`)后 `up -d`
- 生产 `DEV_LOGIN=0`,无例外
