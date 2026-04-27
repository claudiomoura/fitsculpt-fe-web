# Linear Operating Rules

## Purpose

This document defines how FitSculpt uses Linear as the execution system.

Linear should show the real state of work without becoming a second documentation system.

## Core Rule

If work is active, prioritized, blocked, or release-relevant, it should be represented in Linear.

## What Goes In Linear

Use Linear for:
- projects
- issues
- bugs
- feedback follow-ups
- release tasks
- priorities
- current status
- blockers

Do not use Linear for:
- canonical process documentation
- long-form operating policy
- decision rationale that belongs in the decision log
- transient chat-only direction without an execution need

## Field Quality Rules

Each important issue should be clear on:
- problem or objective
- expected outcome
- priority
- current status
- blocker if any

Good issue quality means someone can understand the work without re-reading the full chat history.

## Recommended Issue Template

```markdown
## Context
[why this exists]

## Outcome
[what done looks like]

## Notes
[important constraints or links]

## Source
HQ chat / decision log / feedback / release
```

## Project Rules

Use a Linear project when:
- several issues support one outcome
- a beta milestone needs coordination
- a release needs grouped tracking
- a cross-cutting effort needs visibility

Do not create a project for trivial one-off tasks.

## Status Discipline

- Update status when reality changes.
- Mark blocked work as blocked.
- Close completed work promptly.
- Do not leave stale priorities active.
- If a decision changes the work, update Linear the same day.

## Relationship To Other Systems

### With GitHub `/docs`
- Docs define the rules.
- Linear executes within those rules.

### With HQ Chat
- HQ chat gives direction.
- Linear holds the resulting work.

### With Memory
- Memory preserves context across sessions.
- Linear should still contain enough operational clarity to resume work.

## Naming Rules

Prefer issue titles that are:
- short
- specific
- outcome-oriented

Good examples:
- Clarify onboarding step copy
- Fix Android APK install confusion
- Triage beta feedback from week 1

Weak examples:
- Misc updates
- App stuff
- Notes

## Hygiene Rules

Review Linear regularly for:
- stale issues
- duplicates
- issues with unclear outcomes
- release work missing links
- feedback items that were never triaged

## Explicitly Undecided

The following remain open:
- exact workflow states
- final label taxonomy
- SLA or aging rules
- whether separate teams are needed later
