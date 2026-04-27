# Session Handoff

## Purpose

This document defines how FitSculpt preserves continuity when a working session ends.

A session handoff exists so work can restart quickly without relying on memory alone.

## When To Create A Handoff

Create or update a handoff when:
- a meaningful work block ends
- execution pauses mid-stream
- context would be expensive to reconstruct
- the next session needs clear restart instructions

## Where Things Go

- `GitHub /docs`: handoff standard and template
- Linear: current task status and next actions
- HQ chat: latest instruction or decision if needed
- Memory: durable summary and discoveries from the session

## Handoff Standard

A good handoff answers:
- what was being done
- what changed
- what is done
- what is not done
- what matters next
- what risks or unknowns remain

## Required Fields

```markdown
# Session Handoff

Date:
Owner:
Primary focus:

## Completed
- item
- item

## In Progress
- item
- current state

## Next Recommended Action
- single best next step

## Risks / Open Questions
- item
- item

## Linear Updates Needed
- item
- item

## Docs Updated
- file paths

## Memory Saved
- yes / no
- what was saved
```

## Operating Rules

- Keep it short enough to scan in under 2 minutes.
- Prefer facts over narrative.
- Link to the relevant Linear work.
- Mention affected docs explicitly.
- If something is blocked, say what is blocking it.
- If nothing remains, say so clearly.

## Example

```markdown
# Session Handoff

Date: 2026-04-24
Owner: AI Chief of Staff
Primary focus: Beta feedback operating model

## Completed
- drafted feedback triage rules
- aligned docs, Linear, and memory roles

## In Progress
- final severity labels still need founder confirmation

## Next Recommended Action
- approve severity labels and create matching Linear labels

## Risks / Open Questions
- escalation thresholds are not yet fixed

## Linear Updates Needed
- create feedback project
- add bug and insight issue templates

## Docs Updated
- docs/feedback-operating-model.md
- docs/linear-operating-rules.md

## Memory Saved
- yes
- stored documentation operating model and beta constraints
```

## Explicitly Undecided

The storage location for session handoff files in the repo is intentionally undecided.
If handoffs are stored as files later, define the folder and naming convention in this document.
