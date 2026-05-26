---
globs: *
---

# Karpathy Four Principles

Source: https://github.com/multica-ai/andrej-karpathy-skills

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Every changed line must trace directly to the user's request.
- Remove only imports/functions YOUR changes made unused. Leave pre-existing dead code.

## 4. Goal-Driven Execution

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"

Multi-step tasks use step→verify:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```
