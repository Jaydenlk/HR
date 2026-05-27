# Career Skills Marketplace v1 RC — P1 Fix Report

> Date: 2026-05-27
> Branch: feature/career-skills-v1-rc
> Commits: 65c2991 (P1-1..4) + 354b74e (P1-5)

---

## P1-1: salary-radar 死路由

**根因:** intent-router.yaml 的 `salary_check` intent 将 `primary_skill` 设为 `source-quality-auditor`，salary-radar 只在 contract.yaml 注册但无调度路径。SKILL.md Pack C 也未列出 salary-radar 和 wechat-insight-reader。

**修复文件:**
- `skills/career-principal/references/intent-router.yaml` — primary_skill 改为 salary-radar
- `skills/career-principal/SKILL.md` — Pack C 从 6 种扩充为 8 种，补入 salary-radar + wechat-insight-reader

**为什么不是补丁:** 不是只改 intent-router 一行。还需要 SKILL.md 的 sub-skills 枚举与 intent-router 一致，否则主理人自身描述与路由规则矛盾。

**验证:** `grep primary_skill.*salary-radar intent-router.yaml` → 1 match

---

## P1-2: source-quality-auditor happy-path 矛盾

**根因:** happy-path 将 XHS 来源（src-003）标为 `verification_status: "verified"`，但 SKILL.md 和 hallucination-guard 规则规定"verified 需要实际 URL 访问验证内容一致"，XHS URL 无法通过 API 验证。

**修复文件:**
- `skills/source-quality-auditor/examples/happy-path.md` — src-003 改为 `"unverifiable"`，添加 issue 说明 XHS URL 无法验证

**为什么不是补丁:** 保持了 happy-path 作为"多源一致、证据充分"的好案例——src-001 (A, verified) + src-002 (B, verified) 仍然满足"2 个 B+ 来源"规则。仅修正了 XHS 的 verification_status 语义。

**验证:** `grep "unverifiable" happy-path.md` → present

---

## P1-3: market-radar grade 不一致

**根因:** happy-path example 的 evidence_used 将 猎聘 graded as "A"，但 shared/source-policy/grading-policy.yaml 和 salary-radar 都将猎聘归为 B 级。同一来源在不同位置有不同等级。

**修复文件:**
- `skills/market-radar/examples/happy-path.md` — 猎聘 grade 从 A 改为 B

**为什么不是补丁:** 对齐到唯一权威来源（shared grading policy）。如果猎聘行业报告质量比普通猎聘 JD 高，应在 source-quality-auditor 中定义子类型，而非在个别 example 中临时升级。

**验证:** `grep "grade.*B" happy-path.md | grep 猎聘` → match

---

## P1-4: opportunity-intelligence 公式未定义

**根因:** SKILL.md 给出了总公式 `综合分 = 匹配分×0.4 + 市场分×0.35 + (100−风险分)×0.25`，但未定义：(a) 如何从 risk_signals 的 severity 映射到数值风险分，(b) 如何计算市场分，(c) 无画像时如何处理匹配分。

**修复文件:**
- `skills/opportunity-intelligence/SKILL.md` — 新增风险分计算规则（red +30, yellow +15, notice +5）、市场分计算规则（基于公司 tier + hiring_relevance + 薪资数据）、无画像时匹配分处理

**为什么不是补丁:** 不是发明一个伪精确公式——而是给出可复现的 rubric 规则，让任何实现者（包括 AI）能产生一致的评分。如果规则不适用于某场景，会被 confidence 降级机制捕获。

**验证:** `grep "red.*+30\|yellow.*+15\|notice.*+5" SKILL.md` → all present

---

## P1-5: v1-complete fixtures prose 断言

**根因:** 10 个 v1-complete workflow eval fixtures 的 `assertions` 数组全部使用英文 prose 字符串（如 "salary-radar provides market benchmarks..."），而非结构化 assertion 对象（如 `{type, path, operator, value}`）。任何自动化 runner 无法执行这些断言。

**修复文件:**
- `evals/workflow/v1-complete/` 全部 10 个 .json 文件

**为什么不是补丁:** 不是只加 `type` 字段——每个 prose 断言都被分析后转为具体的字段路径检查。例如 "recommendation is conditional" → `{path: "recommendation.is_conditional", operator: "eq", value: true}`。保留 `description` 字段供人类阅读。

**验证:** 
```python
for f in v1-complete/*.json:
  prose = sum(1 for a in assertions if isinstance(a, str))
  assert prose == 0
```
Result: All 10 files, 0 prose, 77 structured assertions total.

---

## Final Verification Results

| # | Check | Result |
|---|-------|--------|
| 1 | JSON parse | 289/289 PASS |
| 2 | YAML parse | 61/61 PASS |
| 3 | Base fields | 37/37 PASS |
| 4 | Manifest | 37 skills |
| 5 | salary-radar routing | 1 match (routed) |
| 6 | Forbidden patterns | 0 |
| 7 | v1-complete prose assertions | 0 (all structured) |
| 8 | Git status | clean |

---

## Remaining Risk

- 35 个非 MVP skill 的 hallucination-guard tests 未逐个验证字段名与 output_schema 匹配。已修复 2 个 P0（nowcoder + offer-comparator），但其余 33 个未审查。建议后续全量字段名验证。
- KG Tier 2/3 未完成（subagent 速率限制），但不影响核心 skill 功能。

---

## 结论

5 个 P1 全部修复。建议可以进入 Codex 最终审计。
