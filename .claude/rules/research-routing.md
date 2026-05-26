---
globs: *
---

# Research Routing Table

## Route 1: Library/Framework API — Exact Queries
- Primary: Context7 `resolve-library-id` → `query-docs`
- Fallback: WebFetch to official documentation URL

## Route 2: Tech Trends / Best Practices / Architecture Patterns
- Primary: Exa `web_search_exa` (high-precision semantic search)
- Fallback: WebSearch (broad coverage)

## Route 3: Competitors / Alternatives / Community Experience
- Primary: WebSearch → filter → WebFetch for deep read
- Alternative: Exa `web_search_exa` + `web_fetch_exa`

## Route 4: Specific Page Content Extraction
- Primary: WebFetch (known URL)
- Alternative: Exa `web_fetch_exa` (high-quality extraction)

## Route 5: Team Historical Experience
- Primary: mem0 `search_memories` (cross-session decisions)
- Secondary: clouddreamai-knowledge `project-debug` / `project-design`

## Hard Constraints
- Current date vs model knowledge cutoff > 6 months → Routes 1-3 are MANDATORY before coding
- All research results must include URL citations
- "Based on best practices" without a source is FORBIDDEN
