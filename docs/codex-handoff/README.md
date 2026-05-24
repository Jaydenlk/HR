# Codex Handoff Channel

This folder is the working handoff channel between Codex, Claude Code, and the human operator.

Rules:
- Claims must include fresh evidence: command, timestamp/context, exit code, and observed result.
- Claude Code-only skills must be exported here before Codex treats them as binding instructions.
- Product work must happen inside the project-local worktree: `E:\Agent program\HRBP\.worktrees\product-hardening-audit`.
- No completion claim is accepted from screenshots or "looks fine" checks alone.

Current mandatory-but-missing Codex skills:
- Simplify
- PJR
- frontend design
- uiuxpromax
- git-merge-to-dev / git-merge-to-develop custom rule

Superpowers installed in Codex:
- using-superpowers
- brainstorming
- writing-plans
- using-git-worktrees
- subagent-driven-development
- executing-plans
- dispatching-parallel-agents
- test-driven-development
- requesting-code-review
- receiving-code-review
- systematic-debugging
- verification-before-completion
- finishing-a-development-branch
- writing-skills
