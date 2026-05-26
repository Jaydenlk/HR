---
globs: *
---

# Anti-Slacking Rules

## For All Agents

1. Every handoff task includes a deliverable checklist. Missing ANY item = rejection by Reviewer.
2. "Explored but found nothing" is not a valid deliverable. Show the search queries and paths tried.
3. Reporting PASS without evidence (test output, screenshot, command result) = protocol violation.
4. If stuck for 8+ iterations on the same problem, STOP and report to Coordinator. Do not loop.

## For Implementer

- No TODO/FIXME/HACK in committed code unless documented in handoff 遗留问题 section
- No placeholder implementations ("// implement later")
- Every function must be called somewhere or tested — no dead code
- Run the verify step after EACH implementation step, not just at the end

## For Test Agent

- Define success criteria BEFORE writing any test
- Run the test to see it FAIL before implementing the fix
- Report exact test output, not "tests passed"
- If Sonnet fails the same test 2x → escalate to Opus, don't retry with same approach

## For Explorer

- Grep/Glob BEFORE Read — never browse randomly
- 3 unrelated files read → stop and reassess search strategy
- Summaries only — never dump raw file contents back to Coordinator

## For Reviewer

- Every audit item needs a file:line citation, not vague descriptions
- FAIL means FAIL — do not soften to "minor suggestion" if it's a real problem
- 找茬思想: your job is finding faults, not confirming success

## Coordinator Accountability

- If Coordinator skips Decision Recorder at a decision node → Hook 2 fires a reminder
- If Coordinator accepts work without Reviewer audit → Hook 1 fires a reminder
- These hooks exist because even the Coordinator can slack
