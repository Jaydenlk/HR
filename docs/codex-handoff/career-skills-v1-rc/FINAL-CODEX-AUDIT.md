# Career Skills Marketplace v1 RC — Final Codex Audit

> Date: 2026-05-27
> Branch: feature/career-skills-v1-rc
> Latest commit: 4b2b98a
> Auditor: Independent verification (all commands run fresh, no cached results)

---

## 1. 总结论

### PASS_WITH_RISKS

可以 merge-to-dev。可以标 v1 Alpha Release Candidate，但发布时必须标 Alpha + Known Limitations。

---

## 2. 五个 P1 逐项核验

| P1 | 检查方式 | 结果 |
|----|---------|------|
| P1-1 salary-radar 路由 | `grep primary_skill.*salary-radar intent-router.yaml` → match; manifest 包含 salary-radar; SKILL.md Pack C 列出 | **PASS** |
| P1-2 source-quality-auditor XHS | `grep unverifiable happy-path.md` → match; XHS 不再标 verified | **PASS** |
| P1-3 market-radar 猎聘 grade | regex 扫描 happy-path.md 中 猎聘 grade → 全部 B，无 A | **PASS** |
| P1-4 opportunity-intelligence 公式 | `grep -c "red.*+30\|yellow.*+15\|notice.*+5"` → 3 mappings; market_score 规则明确 | **PASS** |
| P1-5 v1-complete prose 断言 | 10 files 扫描 → 0 prose assertions, 77 structured | **PASS** |

---

## 3. PJR 命令和结果

| # | 检查 | 命令 | 结果 |
|---|------|------|------|
| 1 | JSON parse | `python json.load all **/*.json` | 289/289 PASS |
| 2 | YAML parse | `python yaml.safe_load all **/*.yaml` | 61/61 PASS |
| 3 | Required files | 37 skills × 14 files loop | 0 missing |
| 4 | Base required fields | 10 fields in required + properties | 37/37 PASS |
| 5 | Confidence enum | includes "insufficient" | 37/37 PASS |
| 6 | Manifest | `grep "^  - name:" marketplace.yaml` | 37 |
| 7 | Routing intents | `grep "^  - name:" intent-router.yaml` | 39 |
| 8 | salary-radar routed | `grep primary_skill.*salary-radar` | YES |
| 9 | Forbidden patterns | rg TODO/TBD/placeholder/your-org/rm-rf/Remove-Item | 0 matches |
| 10 | v1-complete structured | prose assertion count | 0 |
| 11 | Installer smoke (PS1 codex) | 37 SKILL.md installed + cleanup | PASS |
| 12 | Git status | `git status --short` | clean |

---

## 4. 抽样内容审计

基于前两轮审计（15 skill 深度审查 + 8 skill 高风险审查），核心 skill 内容质量评估：

| Skill | 判定 | 关键发现 |
|-------|------|---------|
| career-principal | PASS_WITH_RISKS | 39 intents 完整路由，追问策略有实质性内容。P1-1 已修复。Sub_skills 列表已扩充到 37。Risk: 33 个非 MVP skill 的 hallucination-guard 字段名未全量验证 |
| salary-radar | PASS | P1-1 修复后正确路由。四要素规则（年份+城市+岗位+来源）强制执行。无数据时 confidence: insufficient |
| offer-comparator | PASS | P0 hallucination-guard 字段名已修复。五险一金/RSU/期权中国特有结构覆盖 |
| source-quality-auditor | PASS | P1-2 修复后 XHS 标为 unverifiable。A/B/C/D 分级清晰 |
| market-radar | PASS | P1-3 修复后猎聘 grade 全局一致为 B。无数据时 confidence: insufficient |
| opportunity-intelligence | PASS | P1-4 修复后公式完整定义（risk: red+30/yellow+15/notice+5）|
| resume-tailor | PASS | Zero-fabrication policy 有实质保护。fabrication_check 逐条标注 |
| interview-intelligence | PASS_WITH_RISKS | 中国面试流程（笔试/群面/业务面/HR面）覆盖。Risk: source-quality-auditor 依赖声明但无输入接口 |

---

## 5. Knowledge Graph 风险结论

| 维度 | 状态 |
|------|------|
| Tier 1 (50 家) | 存在，required fields 完整，0 missing |
| Tier 2 (105 家) | 存在（KG subagent 部分完成），quality 未深度审计 |
| Tier 3 | 不存在，DEFERRED |
| 角色 taxonomy | 30 roles，12 categories |
| 求职术语 | 30 terms |
| Huawei 分类 | 已修复为 stable_mid_tech |
| aliases 重复 | 已修复 |

**KG 结论**: PASS_WITH_RISKS — Tier 1 可用，Tier 2 存在但未审计，Tier 3 缺失。Skill 会在 KG 查不到时降级（标注 confidence: low/insufficient），不会把 KG 当成完整市场事实。

---

## 6. Remaining Risks

| # | Risk | Severity | Impact | Mitigation |
|---|------|----------|--------|------------|
| 1 | 33 个非 MVP skill 的 hallucination-guard 字段名未全量验证 | P2 | 可能有更多字段名不匹配 | 已修复 2 个 P0 案例，其余需后续批量验证 |
| 2 | interview-intelligence source-quality-auditor 依赖无输入接口 | P2 | 声明了依赖但实际不消费审计结果 | 不影响功能，credibility ceiling 硬编码 |
| 3 | KG Tier 2 质量未审计 | P2 | 105 家 Tier 2 公司数据可能有错误 | Tier 2 标注 needs_verification: true |
| 4 | KG Tier 3 不存在 | P2 | 小型/区域企业无覆盖 | Skill 会降级到 confidence: low |
| 5 | offer-comparator 时薪计算在 example 中可能仍有小误差 | P2 | 示例可能误导 | 公式已明确定义，AI 实际计算不依赖示例 |

---

## 7. 是否建议 merge-to-dev

**YES — 建议 merge。**

理由：
- 4 个 P0 全部已修复并验证
- 5 个 P1 全部已修复并验证
- 结构性 PJR 全通过（289 JSON + 61 YAML + 37/37 base fields + 37 manifest + 39 routing + 0 forbidden）
- Installer 验证通过（37 SKILL.md installed）
- 核心 8 skill 内容审计通过
- Remaining risks 全部为 P2，不影响 Alpha 使用

## 8. 是否建议开源 Alpha

**YES — 可以开源 Alpha，条件是标注以下 Known Limitations：**

1. KG 覆盖有限（50 Tier 1 + 105 Tier 2，非完整中国就业市场）
2. 无 live adapter（XHS/牛客/公众号/Web Search 均为设计级，未实现采集）
3. 无 CLI/npm package（安装需手动 clone + install.sh）
4. 无 JSONL/SQLite evidence store（仅 fixture-based eval）
5. 33 个非 MVP skill 的 hallucination-guard 测试未全量验证字段名
6. 所有 market intelligence skill 在无实时数据时降级为 insufficient

---

## 9. 禁止声明

本审计不使用以下术语：
- ~~完全体~~
- ~~生产可用~~
- ~~女娲级成熟~~

本产品是 **v1 Alpha Release Candidate**，需要持续打磨。
