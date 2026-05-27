# Career Skills Marketplace v1 Beta — Known Limitations

> Version: v1.0.0-beta.1
> Audit conclusion: PASS_WITH_RISKS
> Audit document: docs/codex-handoff/career-skills-v1-rc/FINAL-CODEX-AUDIT.md

---

## Live adapters — deferred

Live adapters for the following sources are not implemented in v1:

- 小红书 (XHS) interview mining
- 牛客 tech discussion mining
- 微信公众号 articles
- General web search

When these data sources are absent, affected skills (`xhs-interview-miner`, `nowcoder-tech-miner`, `market-radar`, `salary-radar`) degrade to `confidence: insufficient`. They will not fabricate data to fill the gap.

There is no automatic internet scraping of any kind in this release.

## CLI and npm package — deferred

This is a Claude Code / Codex skill marketplace installed via `install.sh` / `install.ps1`. There is no CLI binary, no npm package, and no `npx` invocation path. These are deferred to a future release.

## Web UI — not planned

No web interface is planned for this project. It operates inside Claude Code or Codex only.

## Knowledge graph — verification status

The knowledge graph covers 600 companies:

- **Tier 1 (50 companies)**: Deep profiles with verified fields. Suitable for high-confidence skill judgments.
- **Tier 2 (250 companies)**: Standard profiles. Marked `needs_verification: true`. Community verification needed before treating as authoritative.
- **Tier 3 (300 companies)**: Lightweight profiles. Marked `needs_verification: true`. Significant gaps expected.

For companies not in the knowledge graph, skills fall back to `confidence: low` or `confidence: insufficient`.

## Temporal limits on market information

All market data (salary ranges, company status, industry trends) is derived from static knowledge graph data compiled at build time. It does not update automatically.

Every skill output that references knowledge graph data includes a `freshness` field. Always check this field. Do not treat outputs as current market intelligence without cross-referencing live sources.

## Not a substitute for professional judgment

This system provides structured analysis, not decisions. It does not replace:

- Personal career judgment based on individual circumstances
- Professional legal advice on employment contracts or labor disputes
- Professional financial advice on compensation or equity evaluation

All outputs should be cross-verified by the user before acting on them.

## Output quality depends on input quality

Skills produce outputs grounded in user-provided information. Vague or incomplete inputs produce lower-confidence outputs. The system will not invent details not present in what you provided.

## Hallucination guard — fixture-based, not runtime enforcement

Hallucination-guard tests cover all 37 skills and validate that `confidence: insufficient` is returned when evidence is missing. However, these tests run against static fixtures during development. They are not runtime enforcement that executes on every user interaction.

## Known P2 issues remaining

The following issues were identified during F3 audit and left as P2 (low severity, non-blocking):

- `career-path-planner`: feasibility score may deviate by 1 point from expected due to rounding at boundary conditions
- City data in knowledge graph: undated — collection period is not recorded per city entry
- Knowledge path prefix inconsistency: some skills use `_career-skills-shared/` prefix, others use relative paths

These do not affect correctness of core outputs but are noted for future cleanup.

## Dependency declarations vs actual wiring

`interview-intelligence` declares a dependency on `source-quality-auditor` but does not consume its output through a formal input interface. The credibility ceiling is hardcoded at grade B. Similarly, `xhs-interview-miner` and `nowcoder-tech-miner` declare `source-quality-auditor` as a dependency without consuming its structured output. This is a naming inconsistency, not a functional bug.
