# Workflow

## Purpose

This document defines how FitSculpt moves from idea to shipped work.

## Workflow Summary

FitSculpt runs a simple flow:

1. Direction starts in HQ chat.
2. Work is translated into Linear.
3. Rules and standards are checked in `GitHub /docs`.
4. Important context is saved to memory.
5. Work is completed and reviewed.
6. Release readiness is checked before shipping.
7. Learnings feed back into docs, Linear, and memory.

## End-To-End Flow

### 1. Direct
Use HQ chat to:
- state priorities
- make tradeoffs
- answer questions
- assign focus
- unblock work

Output:
- a clear instruction, decision, or priority

### 2. Define
If the work changes process, policy, or scope:
- update or create the relevant doc in `GitHub /docs`
- log the decision in `docs/decision-log.md` if it is meaningful

Output:
- written clarity before execution expands

### 3. Translate Into Execution
Create or update Linear items for:
- projects
- issues
- sub-issues if needed
- release tasks
- feedback work
- bugs

Output:
- executable work with status and priority

### 4. Execute
Execution happens through the active Linear work.

During execution:
- use docs for standards
- use HQ chat for ambiguity
- use memory for continuity
- keep Linear current

### 5. Record Context
Save to memory when there is:
- a decision
- a non-obvious discovery
- a bug root cause
- a meaningful preference
- important session context

### 6. Review
Before marking important work complete:
- confirm the issue outcome matches the ask
- confirm affected docs are updated if needed
- confirm release implications are captured

### 7. Ship
Before a beta release:
- run `docs/release-checklist.md`
- confirm founder approval
- confirm user-facing risk is acceptable

### 8. Learn
After release or feedback intake:
- update Linear
- update docs if the operating model changed
- log key decisions
- save durable lessons to memory

## Workflow By System

### HQ Chat
Used for:
- commands
- prioritization
- escalation
- interpretation
- final calls

### GitHub `/docs`
Used for:
- policies
- workflows
- templates
- checklists
- canonical operating guidance

### Linear
Used for:
- work tracking
- status
- ownership
- release execution
- feedback triage

### Memory
Used for:
- continuity between sessions
- decision rationale
- repeated context
- discoveries worth preserving

## Minimal Delivery Standard

A work item is not truly done unless:
- the execution is complete
- Linear reflects reality
- docs are updated if policy changed
- decision log is updated if a notable decision was made
- key context is preserved in memory if future continuity will matter

## Templates

### New Work Intake
```markdown
Objective:
Why now:
Expected outcome:
Known constraints:
What system should hold this:
- Docs / Linear / HQ chat / Memory
```

### Work Completion Note
```markdown
Completed:
User or business impact:
Docs updated:
Decision logged:
Memory saved:
Open risks:
```

## Explicitly Undecided

The following remain open:
- exact Linear workflow states if they change later
- required QA depth by issue type
- release cadence during and after beta
