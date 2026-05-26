# Career Skills Marketplace v1 RC — Final Verdict

> Date: 2026-05-27
> Branch: feature/career-skills-v1-rc
> Commit: 68e8206 (post P0 fixes)
> Auditor: Independent content audit (2 reviewer subagents + structural PJR)

---

## Verdict: PASS_WITH_MAJOR_RISKS

可以继续内部打磨，不能开源宣传为"可信求职工具"。

---

## Reasoning

### What passed

- **结构完整性**: 37 skills × 14 files = 518 required files, zero missing
- **Schema 合规**: 289 JSON + 61 YAML 全部解析通过, 37/37 base required fields, 37/37 confidence enum
- **Installer**: 动态发现 37 skills, codex/claude 双 target, 拒绝覆盖
- **Manifest + Routing**: 37 skills in manifest, 39 intents in router
- **MVP 6 core skills**: career-principal, profile-builder, jd-analyzer, resume-tailor, match-diagnosis, source-quality-auditor 通过内容审计（PASS 或 PASS_WITH_RISKS）
- **China market specificity**: 中国求职黑话、大小周、五险一金、秋招/春招节奏、JD 风险信号等深度适配
- **Zero-fabrication policy**: resume-tailor 的不编造策略有实质性保护

### What has major risks

- **4 个 P0 已修复但暴露系统性问题**: 2 个 hallucination-guard 测试引用了错误的 schema 字段名（nowcoder-tech-miner, offer-comparator），说明测试没有与 schema 联动验证——其余 35 个 skill 可能存在同类问题但未被审查
- **salary-radar 是死路由**: 注册在 contract.yaml 但 career-principal 不路由到它。salary_check intent 路由到 market-radar。用户问薪资问题时不会调用专门的 salary-radar skill
- **v1-complete workflow fixtures 半数不可执行**: 10/20 workflow eval 使用 prose 断言而非结构化 `type/path/expected` 格式，无法被任何自动化 runner 执行
- **KG 无 Tier 分层**: 50 家公司全部 tier_1，无 Tier 2/3 文件（KG 扩展 subagent 因速率限制未完成）。tier_2_companies.yaml 存在但内容来自部分完成的 subagent，质量未审计
- **source-quality-auditor happy-path 矛盾**: 将 XHS URL 标为 verified，但 hallucination-guard 禁止这种行为

### What blocks "可以开源宣传"

1. 测试-schema 联动缺失——不能确信其余 35 个 skill 的 hallucination-guard 引用的字段名正确
2. salary-radar 死路由——用户关心的核心场景之一无法触达
3. 半数 workflow eval 不可执行——声称的 20 个 eval 实际只有 10 个可机器验证

---

## P0 Issues (Fixed)

| # | Skill | Issue | Fix |
|---|-------|-------|-----|
| 1 | nowcoder-tech-miner | hallucination-guard 引用 `questions` 但 schema 字段是 `technical_questions` | Fixed: 改为正确字段名 |
| 2 | offer-comparator | hallucination-guard 引用 `comparison_table` 但 schema 字段是 `comparison` | Fixed: 改为正确字段名 + missing_info |
| 3 | companies.seed.yaml | 华为 company_type 错误标为 `new_energy` | Fixed: 改为 `stable_mid_tech` |
| 4 | aliases.yaml | `ningde-times` 重复键导致静默数据丢失 | Fixed: 删除重复项 |

## P1 Issues (Not Fixed — require next session)

| # | Skill | Issue | Impact |
|---|-------|-------|--------|
| 5 | career-principal | SKILL.md Pack C 不列 salary-radar/wechat-insight-reader | 死路由 |
| 6 | source-quality-auditor | happy-path 将 XHS 标为 verified 矛盾 | 示例与规则冲突 |
| 7 | market-radar | happy-path 猎聘 grade A vs B 不一致 | 分级混乱 |
| 8 | opportunity-intelligence | risk_score 计算公式未定义 | 评分不可复现 |
| 9 | interview-intelligence | source-quality-auditor 依赖声明但无输入接口 | 死依赖 |
| 10 | v1-complete fixtures | 10/20 使用 prose 断言 | 不可自动化 |

## P2 Issues (Deferred)

| # | Issue | Reason for deferral |
|---|-------|---------------------|
| 11 | KG Tier 2/3 扩展未完成 | KG subagent 速率限制，不影响核心 skill |
| 12 | autonomous-driving 角色未定义但被引用 | 少数公司影响 |
| 13 | resume-tailor example MySQL主从架构 应为 NEED_USER_CONFIRM | 示例细节 |
| 14 | match-diagnosis 静默校准评分未告知用户 | 设计选择 |
| 15 | CLI/npm/live adapter | Phase 3+ |

---

## Structural PJR (Final)

| Check | Result |
|-------|--------|
| JSON parse | 289/289 PASS |
| YAML parse | 61/61 PASS |
| Required files | 0 missing |
| Base fields | 37/37 PASS |
| Confidence enum | 37/37 PASS |
| Manifest | 37 skills |
| Routing | 39 intents |
| Forbidden patterns | 0 |
| Installer smoke | 37 SKILL.md installed |
| Git status | clean (after commit) |

---

## Recommendation

**不建议现在 merge 到 dev 和 push。**

建议下一步：
1. 修复 5 个 P1（salary-radar 路由、source-quality-auditor 示例、market-radar grade、opportunity-intelligence 公式、v1-complete fixture 格式）
2. 全量 hallucination-guard 字段名验证（37 个 skill 逐个检查 test 引用的 path 是否在 output_schema 中存在）
3. 重新提交 Codex 审计

**等用户确认后再决定是否 merge。**
