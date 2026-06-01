# Changelog

## v1.0.0-beta.2 (2026-06-02)

### Architecture: repackaged as a single-skill Claude Code plugin

- **Plugin install** (recommended): `/plugin marketplace add Jaydenlk/HR` then `/plugin install career-principal@career-skills`
- **career-principal** is now the sole auto-triggered skill (`skills/career-principal/SKILL.md`); all 37 workers have been renamed from `SKILL.md` to `PLAYBOOK.md` — they are read and executed by career-principal, not auto-loaded
- **Shared resources** (previously root `knowledge/` and `shared/`) consolidated into `skills/_career-skills-shared/`
- Plugin manifests: `.claude-plugin/plugin.json` (plugin name: career-principal) and `.claude-plugin/marketplace.json` (market name: career-skills)
- Install script updated to copy all `skills/` subdirectories (career-principal + 37 workers + _career-skills-shared) to `~/.claude/skills/`
## v1.0.0-beta.1 (2026-05-27)

### Skills

- 37 skills across 5 layers: Core Reasoning (6), Career Execution (7), Interview (8), Market Intelligence (8), Career Strategy (8)
- `career-principal` orchestrates 39 recognized intents and routes to downstream skills
- All skills include: `SKILL.md`, `contract.yaml`, input/output schemas, 4 examples (happy-path, low-evidence, source-conflict, bad-input), 5 tests
- All output schemas include 10 base required fields plus `confidence: insufficient` degradation path

### Knowledge Graph

- 600 companies: 50 Tier 1 (deep profiles) + 250 Tier 2 (standard) + 300 Tier 3 (lightweight)
- 30 roles across 12 categories
- 30 Chinese job-search terms
- Career path patterns, city-industry fit mappings, interview taxonomy, offer evaluation factors, market source grades

### Quality

- F3 audit: 15 P0 issues and 9 P1 issues found and resolved
- Hallucination guard: 37/37 skills validated; validator hardened against false positive pass results
- Workflow eval: 20 fixtures converted to unified structured assertions
- Validation suite: `validate-all.mjs` runs schemas, fixtures, skill routing, KG integrity, and guard checks

### Installer

- `install.sh` (macOS/Linux) and `install.ps1` (Windows) with `--target claude|codex` parameter
- Dynamically discovers all skills at install time — no hardcoded skill list
- Never deletes or overwrites existing directories

### Known Limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for the full list, including deferred live adapters, P2 issues, and knowledge graph verification status.
