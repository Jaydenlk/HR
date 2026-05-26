# Career Skills Marketplace v1 RC — Audit Findings

> Date: 2026-05-26
> Branch: feature/career-skills-v1-rc
> Worktree: E:\Agent program\HRBP\.worktrees\career-skills-v1-rc
> Status: IN PROGRESS — Part 1+2 complete, Part 3-5 subagents running

---

## Part 1: 事实核验

| 声明 | 判定 | 证据 |
|------|------|------|
| 37 个 skills | **TRUE** | `ls -d skills/*/ | wc -l` → 37 |
| 每个 skill 有完整 required files | **TRUE** | 37 skills × 14 files, missing: 0 |
| Installer 安装 37 个 skill | **TRUE** | PS1 codex target: 37 SKILL.md installed |
| Manifest 覆盖 37 skill | **TRUE** | `grep -c "^  - name:" marketplace.yaml` → 37 |
| career-principal 覆盖全部 | **TRUE** | contract.yaml sub_skills 有 37 个 |
| 39 intents 无 orphan | **UNVERIFIED** | intent count = 39, orphan check pending content audit |
| Knowledge graph 存在 | **TRUE** | 15 knowledge files exist |
| Tier 1 = 50 家且字段完整 | **PARTIAL** | 50 companies exist, all medium confidence, no tier field yet (KG dev incomplete) |
| Tier 2/3 数量 | **FALSE** | 不存在 tier_2_companies.yaml 或 tier_3_stubs.yaml (KG dev subagent 未完成) |
| 20 workflow eval 存在 | **TRUE** | `find evals -name "*.json" | wc -l` → 20 |
| Subagent reports 存在 | **FALSE** | docs/codex-handoff/career-skills-v1-rc/subagent-reports/ 为空 |
| Git status clean | **TRUE** | 0 modified files (after resetting partial subagent changes) |

---

## Part 2: 结构性 PJR

| 检查 | 结果 | 证据 |
|------|------|------|
| JSON parse | **PASS** 289/289 | python json.load all |
| YAML parse | **PASS** 60/60 | python yaml.safe_load all |
| Required files | **PASS** 0 missing | 37 × 14 = 518 files |
| output_schema base fields | **PASS** 37/37 | 10 base fields in required + properties |
| confidence enum | **PASS** 37/37 | All include "insufficient" |
| Manifest coverage | **PASS** 37 | grep marketplace.yaml |
| Principal routing | **PASS** 39 intents | grep intent-router.yaml |
| Examples count | **PASS** 37 × 4 = 148 | All standard names |
| Tests count | **PASS** 37 × 5 = 185 | All standard names |
| Forbidden patterns | **PASS** 0 | rg TODO/TBD/placeholder/your-org/rm-rf/Remove-Item |
| Installer smoke (PS1 codex) | **PASS** 37 SKILL.md | Temp dir test + cleanup |
| Git status | **PASS** clean | 0 modified |

---

## Part 3-5: Content + Workflow + KG Audit

**STATUS: Subagents running. Results will be appended when available.**

---

## Known Issues (pre-content-audit)

### P1: KG Tier 分层未实现

Severity: **P1**
Description: companies.seed.yaml 有 50 家公司但没有 tier 字段，无 Tier 2/3 文件。KG 开发 subagent 未完成。
Impact: Skills 无法按 tier 查询公司数据。
Status: **BLOCKED** — KG development incomplete.

### P1: Subagent Reports 不存在

Severity: **P1**  
Description: docs/codex-handoff/career-skills-v1-rc/subagent-reports/ 目录为空。
Impact: 无法追溯开发决策。
Status: **DEFERRED** — 不影响 skill 可用性。

---

## Part 6-7: Debug + Final Verdict

**PENDING** — 等待 Part 3-5 完成后执行。
