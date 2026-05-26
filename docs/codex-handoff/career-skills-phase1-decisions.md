# Career Skills Marketplace — Phase 1 Decisions

> 日期：2026-05-26
> 状态：用户确认，可进入 writing-plans

---

## Phase 1 Runtime

**Claude Code / Codex Skills Marketplace — Skill Files Only**

不是 CLI-first。不是 Local API。不是 Web UI。不是 npm package。

用户体验：
1. 用户 clone marketplace repo
2. 运行 `install.sh` / `install.ps1` 安装到 Claude Code skills 目录
3. 在 Claude Code / Codex 中对话，career-principal 自动触发
4. career-principal 根据任务调用同 repo 内其他 skills
5. skills 使用本地 knowledge / examples / schemas / evals
6. 可选 adapters 后续再接

---

## Phase 1 必须做

| 产物 | 说明 |
|------|------|
| `marketplace.yaml` | Marketplace manifest（版本、skill 列表、依赖） |
| `skills/` 目录 | 6 个 MVP skill，每个含 SKILL.md + contract.yaml + schemas + examples + tests |
| `shared/` 目录 | evidence-schema / source-policy / rubrics / prompt-parts |
| `knowledge/` 目录 | company-taxonomy / role-taxonomy / market-vocabulary / rubrics |
| `install.ps1` / `install.sh` | 安装到 Claude Code / Codex skills 目录 |
| `evals/` | 30 个 skill-level + 10 个 workflow eval fixtures |
| `README.zh-CN.md` | 中文文档 |

### 每个 Skill 必须有

```
skills/<name>/
  SKILL.md              # LLM 执行说明
  contract.yaml         # 契约
  input_schema.json     # 输入约束
  output_schema.json    # 输出结构
  examples/
    happy-path.md
    low-evidence.md
    source-conflict.md
    bad-input.md
  tests/
    happy-path.json
    low-evidence.json
    source-conflict.json
    hallucination-guard.json
  README.md
```

### Installer 做什么

1. 检查目标 skills 目录（`~/.claude/skills/`）
2. 复制/链接 skills + shared + knowledge
3. 验证 6 个 SKILL.md 文件存在
4. 输出安装结果

### Installer 不做什么

- 不检查 Node/pnpm
- 不启动服务
- 不创建 API
- 不跑 Web
- 不做 SQLite/JSONL
- 不 kill 进程

---

## Phase 1 明确不做 (Deferred)

| 内容 | 推迟到 | 原因 |
|------|--------|------|
| `career` CLI 工具 | Phase 3 | 需要 npm bin |
| `career doctor` | Phase 3 | 依赖 CLI |
| npm package | Phase 3 | 需要发布到 registry |
| `npx skills add` | Phase 3 | 需要 npm 包 |
| JSONL evidence store | Phase 2 | Phase 1 用 fixtures |
| SQLite evidence store | Phase 3+ | 更重 |
| Live adapters | Phase 3+ | 需要外部 API |
| Local API | Phase 4+ | 需要 HTTP server |
| Web UI | 不做 | 产品形态是 plugin |
| Eval runner 脚本 | Phase 2 | Phase 1 只要 fixtures |

---

## 仍保留（不受此修订影响）

- 6 MVP skill（career-principal + profile-builder + jd-analyzer + resume-tailor + match-diagnosis + source-quality-auditor）
- Skill contract (contract.yaml)
- Evidence schema (shared/evidence-schema/)
- Source policy (shared/source-policy/)
- China Knowledge Base (knowledge/)
- Examples (每 skill 4 个)
- Eval fixtures (每 skill 4 个 + 10 workflow)
- 50 → 300 → 600 公司图谱（Stage A seed 在 Phase 1）
- License: Code MIT, Knowledge CC BY 4.0
- Privacy / contribution policy

---

## 已确认决策汇总

| 决策 | 值 |
|------|-----|
| repo name | `career-skills-marketplace` |
| Phase 1 runtime | Skill Files (Claude Code / Codex) |
| MVP 语言 | 中文输出，schema 英文字段 |
| License | Code: MIT, Knowledge: CC BY 4.0 |
| AI Provider | 完全可插拔，无默认 |
| Evidence store (Phase 1) | File-based fixtures only |
| Evidence store (Phase 2) | JSONL |
| CLI | Phase 3 |
| Initial companies | 50 (Stage A seed) |
| Initial roles | 12-15 大类 |

---

## Roadmap 修订总结

```
Phase 1: Skills marketplace skeleton + 6 MVP skills
         → Skill files + installer + knowledge seed + eval fixtures
         
Phase 2: Local evidence store + eval runner + Interview skills
         → JSONL store + eval automation + 5 interview/opportunity skills
         
Phase 3: CLI / doctor / npm packaging + Market Intelligence
         → career CLI + npm publish + market-radar + salary-radar + live research
         
Phase 4: Offer/Salary + Career Strategy
         → offer-comparator + career-path-planner + daily-plan-generator
         
Phase 5: Knowledge Graph expansion (300 companies)
         → Tier 1/2 company profiles + community contribution
         
Phase 5.5: Community Extended (600 companies)
           → Tier 3 lightweight profiles + automated review
           
Phase 6: Multi-environment adapters
         → Gemini CLI / Cursor validation + XHS / Nowcoder adapters
         
Phase 7: Evaluation Benchmark
         → Full eval suite + benchmark dataset + automated CI
```

---

## 可以进入 writing-plans 吗？

**Yes** — 所有 Phase 1 决策已确认，无未解决的阻塞问题。

剩余可在 writing-plans 过程中确定的细节：
- 初始 50 家公司具体名单（按分类配额选取）
- eval fixture 的具体格式（JSON 结构）
- skill 间调用的 SKILL.md 内 reference 机制
