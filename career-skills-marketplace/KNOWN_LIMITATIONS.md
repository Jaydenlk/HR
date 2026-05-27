# Career Skills Marketplace v1 Alpha RC — Known Limitations

> 状态: v1 Alpha Release Candidate
> 审计结论: PASS_WITH_RISKS
> 审计文档: docs/codex-handoff/career-skills-v1-rc/FINAL-CODEX-AUDIT.md

---

## 测试覆盖

- 37 个 skill 的 hallucination-guard 测试字段名尚未全量验证。已修复 2 个 P0 级字段名错误（nowcoder-tech-miner, offer-comparator），其余 35 个未逐一核对 test assertion path 与 output_schema 字段名是否一致。
- Workflow eval fixtures 中 10 个 v1-complete fixtures 已转为结构化断言，但尚无自动化 eval runner 执行它们。

## 知识图谱

- Tier 1 公司：50 家，字段完整，可用于 skill 判断。
- Tier 2 公司：105 家，已有基础数据但未经深度审计。标注 `needs_verification: true`。
- Tier 3 公司：暂缺。用户查询不在图谱中的公司时，skill 会降级到 `confidence: low` 或 `insufficient`。
- 知识图谱是静态编译数据，不代表实时市场状态。skill 输出引用知识图谱时会标注 freshness。

## 依赖与集成

- `interview-intelligence` 声明依赖 `source-quality-auditor` 但无输入接口消费审计结果。credibility ceiling 硬编码（B 级），不影响功能但未来需修复。
- `xhs-interview-miner` 和 `nowcoder-tech-miner` 的 `source-quality-auditor` 依赖同样为名义声明。

## 产品形态

- 当前是 Claude Code / Codex skill marketplace，通过 `install.sh` / `install.ps1` 安装。
- 不是 CLI 工具、npm 包、Web App 或 Local API。
- 不包含 live adapter——不会自动联网抓取小红书、牛客、公众号或任何外部数据。
- 所有 market intelligence skill（market-radar, salary-radar, xhs-interview-miner 等）在无实时数据时降级为 `confidence: insufficient`。

## 使用警告

- 市场/薪资/offer 判断基于知识图谱历史数据和用户提供的信息，必须遵循 `confidence` 和 `evidence_used` 字段，不保证替代人工判断。
- 不编造不在用户简历中的经历（zero-fabrication policy）。
- 不对知识图谱范围外的公司给出高置信判断。
- 所有建议标注来源和置信度，用户应自行交叉验证。
