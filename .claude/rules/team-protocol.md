---
globs: *
---

# Team Agent Dispatch Protocol

## Team Roster

| Agent | Model | Access | Role |
|-------|-------|--------|------|
| Main (Coordinator) | Opus (session) | Full | Architecture decisions, task decomposition, dispatch |
| test-agent | Sonnet→Opus | Full + Playwright | Unit / integration / E2E tests |
| implementer | Sonnet | Full (worktree) | Code execution per handoff |
| explorer | Sonnet | Read-only | Codebase research |
| decision-recorder | Sonnet | Read + mem0 | Decision logging |
| reviewer | Sonnet | Read-only | Independent audit |

## Dispatch Rules

When Coordinator assigns a task to any agent, the handoff MUST include:
1. Task description (one sentence)
2. Input file scope (only files the agent needs)
3. Forbidden paths (explicitly)
4. Expected deliverables (what to produce, where to write)
5. Decision context (relevant prior decisions from mem0)

## Execution Flow

```
Coordinator dispatches → Implementer builds (worktree)
                       → Test Agent verifies
                       → Reviewer audits (read-only)
                       → Decision Recorder logs choices
                       → Coordinator integrates
```

## Communication Rules

- Agents do NOT communicate with each other directly
- All coordination goes through Coordinator via handoff files in `.claude/plans/`
- Agents ONLY read their own handoff file
- Agents MUST update their handoff file on completion
- Coordinator bridges between agents: reads output from agent A, distills into handoff for agent B

## Anti-Nesting

Subagents CANNOT spawn other subagents. If an agent needs help, it records a blocker in its handoff and returns to Coordinator.
