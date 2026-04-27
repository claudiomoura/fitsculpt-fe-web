# Feedback Operating Model

## Purpose

This document defines how FitSculpt collects, interprets, and acts on beta feedback.

The goal is not to collect everything. The goal is to turn user signal into better decisions.

## Feedback Goal

Feedback is used to understand:
- usefulness
- clarity
- completeness

Every feedback item should help answer at least one of those.

## Sources

Expected early sources:
- direct founder conversations
- messages from friends and friends-of-friends
- observed friction during onboarding or use
- bug reports
- spontaneous comments

## System Roles

### GitHub `/docs`
Use for:
- the feedback operating model
- templates
- triage rules

### Linear
Use for:
- feedback issues
- bugs
- insights to evaluate
- follow-up actions
- status tracking

### HQ Chat
Use for:
- summarizing patterns
- escalating urgent issues
- making triage calls
- deciding what matters now

### Memory
Use for:
- preserving recurring patterns
- storing notable discoveries
- saving user preference patterns or major lessons

## Feedback Types

Classify feedback into one primary type:
- Bug
- Clarity
- Missing piece
- Usefulness signal
- Nice-to-have
- Praise
- Other

## Triage Rules

### Fix Now
Use when:
- the issue blocks core usage
- the issue creates major confusion
- the issue undermines usefulness directly

### Queue
Use when:
- the issue matters but is not blocking beta learning
- the issue should be grouped with similar signals

### Watch
Use when:
- the signal is weak or isolated
- more evidence is needed before action

### Ignore For Now
Use when:
- the request is out of beta scope
- the request does not support current validation goals

## Minimum Feedback Record

Each feedback item should capture:
- who it came from
- what happened
- which category it fits
- whether it affects usefulness, clarity, or completeness
- severity or urgency
- recommended action

## Feedback Entry Template

```markdown
## Feedback Entry

Source:
Date:
Type:
Summary:
Observed problem or signal:
Affects:
- usefulness / clarity / completeness

Severity:
Recommended action:
Linked Linear issue:
Notes:
```

## Pattern Review

At least weekly, review:
- repeated confusion
- repeated missing pieces
- repeated bug reports
- statements that suggest strong usefulness
- requests that are tempting but outside scope

## Rules

- Prefer repeated patterns over single anecdotes.
- Do not confuse feature requests with validated needs.
- Separate bugs from product misunderstandings.
- Log actionable feedback in Linear.
- Escalate major risks in HQ chat quickly.
- Save durable patterns to memory.

## Explicitly Undecided

The following are not defined yet:
- formal severity scale
- required response time targets
- exact user interview script
