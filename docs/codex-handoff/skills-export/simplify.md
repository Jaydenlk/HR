# Skill: simplify

## Purpose
Reviews changed code for reuse, quality, and efficiency, then fixes any issues found.

## How It Works
Runs 3 parallel review agents simultaneously:

### Agent 1: Code Reuse Review
- Find duplicate functionality across the codebase
- Identify shared patterns that should be extracted
- Flag copy-pasted code that should be a shared utility

### Agent 2: Code Quality Review
- Find hacky patterns:
  - Redundant state (state that can be derived from other state)
  - Parameter sprawl (functions with too many parameters)
  - Deeply nested conditionals
  - Unnecessary comments (comments that restate the code)
  - Over-engineering or under-engineering

### Agent 3: Efficiency Review
- Find unnecessary work (redundant computations, unnecessary re-renders)
- Missed concurrency opportunities (sequential operations that could be parallel)
- Memory issues (leaks, unbounded growth, unnecessary allocations)
- Suboptimal data structures or algorithms

## After Review
Once all 3 agents complete their analysis, issues are fixed directly in the code. No separate "fix" step needed — the skill handles both diagnosis and treatment.

## When to Use
- After completing a major feature implementation
- Before merging to develop
- When code "works but feels messy"

## Project Status
- Was run for Phase 1 (Resume Studio) only
- Phase 2-9 never received Simplify review — this is a known gap
