# Claude Code Skills Inventory

All available marketplace skills used during Coach platform development.

## Core Workflow Skills (superpowers)

| Skill | Purpose |
|-------|---------|
| `superpowers:using-superpowers` | Entry point; establishes skill usage rules. Must be loaded at conversation start. |
| `superpowers:brainstorming` | Required before any creative work — exploring intent, requirements, design before implementation. |
| `superpowers:writing-plans` | Implementation plan creation from spec/requirements before touching code. |
| `superpowers:executing-plans` | Plan execution with review checkpoints in a separate session. |
| `superpowers:subagent-driven-development` | Task execution with independent parallel tasks and review checkpoints. |
| `superpowers:test-driven-development` | TDD workflow — write tests before implementation code. |
| `superpowers:systematic-debugging` | Bug investigation before proposing fixes. |
| `superpowers:verification-before-completion` | Evidence before claims. Must run verification commands and confirm output BEFORE claiming work is complete. |
| `superpowers:requesting-code-review` | Code review template for completed work. |
| `superpowers:receiving-code-review` | Handling review feedback with technical rigor, not blind agreement. |
| `superpowers:finishing-a-development-branch` | Branch completion — merge, PR, or cleanup decision. |
| `superpowers:using-git-worktrees` | Isolated git worktrees for feature work. |
| `superpowers:dispatching-parallel-agents` | Parallel task execution for 2+ independent tasks. |

## Quality & Review Skills

| Skill | Purpose |
|-------|---------|
| `simplify` | Code review with 3 parallel agents: reuse, quality, efficiency. Fixes issues directly after review. |
| `project-review:pjr` | Project Review: lint + build for frontend AND backend, workspace cleanliness, merge readiness. |
| `git-merge-to-develop:git-merge-to-develop` | Rebase + smart conflict resolution + AI code review + push + MR creation. |

## Design & UI Skills

| Skill | Purpose |
|-------|---------|
| `frontend-logic-design:frontend-logic-design` | Frontend UX logic review using MECE, progressive disclosure, Shneiderman's rules. For when UI feels "off" or illogical. |
| `ui-ux-pro-max:ui-ux-pro-max` | UI/UX design intelligence: 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, 25 chart types across 10 stacks. |

## Framework-Specific Code Review

| Skill | Purpose |
|-------|---------|
| `react-code-review:react-code-review` | React/Next.js code review and architecture design based on 2024-2025 best practices. Covers component design, TypeScript, hooks, performance, security, state management, accessibility. |
| `nestjs-code-review:nestjs-code-review` | NestJS + TypeScript + TypeORM + PostgreSQL backend code review and architecture design. |

## Team Knowledge Base

| Skill | Purpose |
|-------|---------|
| `clouddreamai-knowledge:clouddreamai-project-debug` | Search team knowledge base for prior bug fixes and solutions. Invoke BEFORE proposing fixes. |
| `clouddreamai-knowledge:clouddreamai-project-verify` | Search team knowledge base for code standards and review norms. Invoke BEFORE completing review. |
| `clouddreamai-knowledge:clouddreamai-project-design` | Search team knowledge base for design best practices. Invoke BEFORE proposing design decisions. |

## Usage Rules

1. `superpowers:using-superpowers` must be invoked at the start of every conversation
2. `superpowers:brainstorming` is required before any creative work (features, components, modifications)
3. `superpowers:verification-before-completion` is required before claiming anything is done
4. `simplify` should be run after every major feature implementation
5. `project-review:pjr` should be the final gate before merge
6. Never skip steps — the violations log in CLAUDE.md documents what happens when you do
