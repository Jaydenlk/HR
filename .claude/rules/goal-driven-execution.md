---
globs: *
---

# Goal-Driven Execution

## Core Principle

Transform vague tasks into verifiable goals BEFORE starting work.

| Vague | Verifiable |
|-------|-----------|
| "Add validation" | "Write tests for invalid inputs, then make them pass" |
| "Fix the bug" | "Write a test that reproduces it, then make it pass" |
| "Refactor X" | "Ensure tests pass before and after" |
| "Make search faster" | "Measure current latency, define target, verify after change" |

## step→verify Format

Every multi-step task MUST use this format:

```
1. [Concrete action] → verify: [exact check with expected result]
2. [Concrete action] → verify: [exact check with expected result]
3. [Concrete action] → verify: [exact check with expected result]
```

Example:
```
1. Add rate limiter middleware → verify: 11th request returns 429
2. Integrate Redis persistence → verify: restart server, counter preserved
3. Add env-var config → verify: change env var, rate limit changes
```

## Rules

- "Make it work" is NOT a success criterion — be specific
- Each verify step must be independently runnable
- If you can't define a verify step, the task is underspecified — ask for clarification
- Reviewer will check that every step has a corresponding PASS/FAIL result
