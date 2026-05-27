# Career Skills Marketplace — v1 Beta Release Candidate

A Claude Code / Codex skill marketplace for Chinese job seekers. 37 callable skills across 5 layers, orchestrated by a "Career Principal" that handles 39 recognized intents.

**This is not a CLI tool, npm package, Web UI, or API.** It runs entirely inside Claude Code or Codex. No live internet scraping.

---

## Skill layers

| Layer | Count | Coverage |
|-------|-------|----------|
| Layer 1: Core Reasoning | 6 | JD parsing, profile building, match diagnosis, resume tailoring |
| Layer 2: Career Execution | 7 | Opportunity tracking, daily planning, networking, referrals |
| Layer 3: Interview | 8 | Mock interviews, question banks, behavioral stories, company playbooks |
| Layer 4: Market Intelligence | 8 | Salary radar, offer comparison, company risk, industry trends |
| Layer 5: Career Strategy | 8 | Path planning, role transitions, skill gaps, learning roadmaps |

## Knowledge graph

600 companies across three tiers:

- **Tier 1** — 50 companies with deep profiles (verified fields)
- **Tier 2** — 250 companies with standard profiles (`needs_verification: true`)
- **Tier 3** — 300 companies with lightweight profiles (`needs_verification: true`)

Also includes: 30 roles across 12 categories, 30 Chinese job-search terms, career path patterns, city-industry fit mappings, interview taxonomy, offer evaluation factors, and market source grades.

## No live adapters

Live adapters for XHS (小红书), 牛客, 公众号, and general web search are deferred. When real-time data is unavailable, skills degrade gracefully to `confidence: insufficient` rather than fabricating information.

## Install

```bash
# macOS / Linux — Claude Code (default)
git clone https://github.com/career-skills/career-skills-marketplace.git
cd career-skills-marketplace
bash install.sh

# macOS / Linux — Codex
bash install.sh --target codex

# Windows — Claude Code
.\install.ps1

# Windows — Codex
.\install.ps1 -Target codex
```

The installer dynamically discovers all skills and copies them to `~/.claude/skills/<skill-name>/` (Claude Code) or `~/.codex/skills/<skill-name>/` (Codex). It never deletes existing directories.

## Documentation

- Full Chinese guide, all skill descriptions, and usage examples: [README.zh-CN.md](README.zh-CN.md)
- Known limitations and deferred features: [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)
- Installation details and troubleshooting: [docs/installation.md](docs/installation.md)
- Usage examples (10 realistic scenarios): [docs/usage-examples.md](docs/usage-examples.md)

## License

- Code: [MIT License](LICENSE)
- Knowledge data (company taxonomy, role taxonomy, market vocabulary): [CC BY 4.0](LICENSE-KNOWLEDGE)
