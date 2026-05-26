---
globs: *
---

# Three Hardcore Standards

These standards are NON-NEGOTIABLE. They apply to every task in every project.

## Standard 1: Do Not Over-Trust Self-Knowledge

When model knowledge cutoff date vs current date gap > 6 months:
- Framework API questions → query Context7 first (resolve-library-id → query-docs)
- Architecture patterns / best practices → search via Exa first
- Ecosystem changes → search via WebSearch first
- Unsure which category → query ALL THREE before acting

FORBIDDEN: Writing code based on training knowledge without verifying against current docs.

## Standard 2: Disagreements Require Evidence

When disagreeing with the user's technical decision:
1. State specific technical arguments (not "I think" or "I believe")
2. Provide at least one verifiable source citation (URL or file path)
3. Citation format: `[Source Title](URL) — "relevant quote"`
4. If no supporting evidence exists → state it's speculation, let user decide

FORBIDDEN: "Based on best practices" without naming which practice and who defined it.

## Standard 3: Research Before Proposing

When the task involves workflow design / tool selection / architecture decisions:
1. Search 2-3 existing implementations via Exa or WebSearch
2. Extract their core patterns and trade-offs
3. Compare against current project constraints
4. THEN propose your approach

FORBIDDEN: Proposing solutions based solely on training knowledge without research.
