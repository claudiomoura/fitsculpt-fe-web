# Decision Log

## Purpose

This document records meaningful operating and product decisions so FitSculpt can move fast without losing rationale.

This is not a complete history of every chat. It is a log of decisions worth remembering.

## What Belongs Here

Add an entry when a decision:
- changes how FitSculpt operates
- changes product or beta scope
- changes release criteria
- changes workflow or tooling
- resolves a recurring ambiguity
- creates a standing rule

Do not add an entry for:
- routine execution
- minor wording edits
- temporary task-level choices with no lasting impact

## System Relationship

- `GitHub /docs`: canonical written decision record
- Linear: tracks execution resulting from the decision
- HQ chat: where many decisions are first made
- Memory: stores the context and rationale for continuity

## Entry Format

```markdown
## [YYYY-MM-DD] Decision Title

Status: Proposed | Accepted | Replaced | Reversed
Owner: Founder | AI Chief of Staff
Area: Product | Beta | Ops | Workflow | Tooling | Release

Decision:
[one short paragraph]

Why:
- reason 1
- reason 2

Impact:
- what changes now
- what needs updating

Follow-up:
- docs to update
- Linear work to create or adjust

Replaces:
- if applicable

Notes:
- optional
```

## Active Entries

## [2026-04-24] GitHub `/docs` is the canonical written source

Status: Accepted  
Owner: Founder  
Area: Ops

Decision:
FitSculpt uses `GitHub /docs` as the canonical written source for operating rules, workflows, templates, and checklists.

Why:
- keeps written policy versioned and close to execution artifacts
- works with existing free tooling
- reduces fragmentation across tools

Impact:
- operating rules must be written and maintained in the repo
- other tools should point back to docs rather than replace them

Follow-up:
- maintain the core operating docs under `docs/`
- keep templates current

Replaces:
- none

Notes:
- Linear remains the execution system, not the policy system

## [2026-04-24] Linear is the execution system

Status: Accepted  
Owner: Founder  
Area: Workflow

Decision:
FitSculpt uses Linear to manage active execution, priorities, and work status.

Why:
- keeps work visible and structured
- separates execution tracking from long-form documentation

Impact:
- active work should exist in Linear
- docs should not become a task board

Follow-up:
- maintain Linear operating rules
- keep issues current

Replaces:
- none

Notes:
- HQ chat remains the command layer

## [2026-04-24] Beta is a free 4-week mobile-first Android APK validation period

Status: Accepted  
Owner: Founder  
Area: Beta

Decision:
The initial beta is a free, 4-week, mobile-first Android APK release aimed at early users from friends and friends-of-friends, with validation focused on usefulness, clarity, and completeness.

Why:
- creates a bounded validation window
- prioritizes learning over premature scaling

Impact:
- scope should stay lean
- feedback handling should focus on core usefulness and clarity

Follow-up:
- maintain beta scope, release checklist, and feedback model docs
- keep release decisions tied to beta goals

Replaces:
- none

Notes:
- KPI thresholds are still undecided

## Rules

- Keep entries short.
- Prefer one decision per entry.
- Update status when a decision is replaced or reversed.
- If a decision changes the company operating system, update the affected docs immediately.
