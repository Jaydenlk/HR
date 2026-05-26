---
globs: *
---

# Decision Node Enumeration

The Coordinator MUST invoke the Decision Recorder agent at these nodes. Skipping is a protocol violation.

| Node | Trigger | Required Fields |
|------|---------|-----------------|
| After brainstorming selects approach | brainstorming skill completes | chosen + rejected + tradeoffs |
| When rejecting user's proposal | Coordinator disagrees with user | rejected + evidence (Standard 2) |
| Bug-fix strategy selection | After debugging determines fix route | chosen + rejected + context |
| Dependency / tool selection | Choosing one library/tool over another | chosen + rejected + evidence |
| Architecture change | Modifying component boundaries / data flow / interfaces | full schema |
| Discovering reinvented wheels | Existing solution found after work started | context + related_decisions |
| Overturning prior decision | Changing a previously confirmed approach | full schema + related_decisions |
