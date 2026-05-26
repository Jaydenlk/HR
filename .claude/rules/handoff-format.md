---
globs: *
---

# Handoff File Format

## State Machine

```
READY_FOR_IMPL → READY_FOR_REVIEW → READY_FOR_QA → DONE
```

## Naming Convention

`handoff-{from}-to-{to}-{topic}.md` stored in `.claude/plans/`

## Template

```markdown
# Handoff: {from} → {to}

## 状态: READY_FOR_{NEXT}
## 任务: {one sentence}
## 输入文件: {list}
## 禁止触碰: {list}

## 执行计划 (step→verify):
1. [Step] → verify: [check method]
2. [Step] → verify: [check method]
3. [Step] → verify: [check method]

## 已完成:
- {completed item 1}
- {completed item 2}

## 产出物:
- {file path}: {brief description}

## 验证结果:
- Step 1: PASS/FAIL — {evidence}
- Step 2: PASS/FAIL — {evidence}

## 遗留问题:
- {if any}

## 决策上下文:
- 已选方案: {summary}
- 已排除方案: {summary + reason} (see mem0 decision ID)
```

## Rules

1. Agent reads ONLY its own handoff file at startup
2. Agent MUST update its handoff file on completion
3. Coordinator bridges between agents — reads A's output, distills into B's handoff
4. File read discipline: Grep/Glob to confirm target, then Read. No "read and hope."
5. Red lines: no out-of-scope work, no editing decision records, no reading other handoffs, no nesting subagents
