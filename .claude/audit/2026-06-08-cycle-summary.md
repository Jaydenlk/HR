# SaaS 反哺 审计 → 修复 → 验收 全周期记录（2026-06-08）

分支：`dev`。范围：SaaS 反哺（packages/api NestJS + packages/web Next.js）+ 做减法删除（education-path / personal-brand / question-bank / role-transition 四模块 + 求职信合并内推 + 导航折叠）。

## 节奏
1. **审计 Round 1**（22 范围对抗式，44 agent）→ 113 发现（P0×3 / P1×32 / P2×44 / P3×34）。明细见 `2026-06-08-round1-findings.txt`。
2. **修复 Pass 1**：后端 9 模块 + 前端 9 页 + 残留 6 点（3 个工作流）。
3. **审计 Round 2 / 复审**（同 22 范围，43 agent）→ 112 发现（P0×3 / P1×19 / P2×42 / P3×48）。P1 较 R1 降（修复有效），但深挖出 3 个新 P0 + 大量"同类兄弟"漏洞。明细见 `2026-06-08-round2-reaudit-findings.txt`。
4. **修复 Pass 2**：按"类"修（每文件扫兄弟实例）+ 协调者手修关键项。
5. **验收**：后端非 AI（700 e2e）+ 后端 AI-live（9 套件真跑）+ 前端 Playwright（5 代表页）。

## 根因级修复
- **AiService 运行期 schema 校验**（缺 required→重试/降级；`null` 仅对数组型判非法——null 是防编造"无数据"合法信号）+ max_tokens 截断检测 + maxTokens 8192。灭 ~17 处崩溃簇。
- **生产事故级**：`env.validation.validate()` 曾剥离 `DB_*`/`NODE_ENV` → ConfigService 读不到 → postgres 退默认值 + `synchronize` 生产永不关。改为透传完整 config。
- **e2e 隔离**：新增 `test/jest-setup-env.ts` 强制 `:memory:`，根治 e2e 污染 dev 库（清 94 行假数据）。
- **防编造按类收口**：salary breakdown/comparison、offer effective_monthly/social_insurance_annual、applications create-IDOR、networking 内推联系人溯源 + 空 draft 收口、industry URL 验真（拒 localhost）、city-fit 城市对账。
- 红线清理：求职信合并内推、英文枚举中文化、"敬请期待"→合规空态、salary 全部按钮回归、(main) error 边界（Next16 `unstable_retry`）、破损 file: 依赖删除。

两轮 6 个 P0 + 51 个 P1 全部修复并测试验证。

## 最终质量门（全绿）
- API：`tsc` 0 / `nest build` clean / 单元 111 passed / e2e **36 套件 700 passed 0 failed** / **AI-live 9 套件全绿**
- Web：`eslint` 0 / `tsc` 0 / `next build` clean
- `pnpm install --frozen-lockfile` 恢复

## 验收找茬战果
- 前端 Playwright（桌面端，逐按钮/输入/跳转，正常+边界）：登录/求职信/薪资/投递/Offer 5 页，0 console error，验证 #26/#67/#30/#31/#15/#68 + 边界拦截。
- **AI-live 真跑当场抓出真 bug 并修掉**：networking 空 draft(null) + confidence≠insufficient 自相矛盾（旧 guard `!=null` 漏 null）。确定性 mock 测不出，live 才暴露。

## 诚实遗留（收敛取舍）
- 复审 P2×42 / P3×48 未逐条修（对抗式审计渐近；多为窄边界 / 测试覆盖 / 风格 / 需真实联网才能根治的 URL 验真）。→ **P2 批次将单独跟进。**
- documented medium：networking 同公司不同人编造、city-fit 顶层自由文本未门控、公司名黑名单可被长描述句绕过。
- 前端 Playwright 仅交互走了 5 代表页；industry-trend / learning-roadmap / interview-prep / follow-up / 校招诊断 页靠 e2e + 同构模式覆盖，未逐一交互。
- api 包无 ESLint（`lint`=`tsc --noEmit`），与 CLAUDE.md ESLint 标准冲突（既有项目状态）。

## 复跑入口
工作流脚本：`.claude/plans/saas-audit-workflow.js`（审计）、`saas-fix-backend.js` / `saas-fix-frontend.js` / `saas-fix-residuals.js` / `saas-fix-pass2.js`（修复）。AI-live：`RUN_AI_LIVE=1 jest --config test/jest-e2e.json <suite>`。
