# Roles And Decision Rights

## Purpose

This document defines who does what and who decides what at FitSculpt.

FitSculpt is an AI-first virtual company with one human decision-maker: the founder.

## Roles

### Founder
Accountable for:
- company direction
- product direction
- tradeoffs
- priorities
- final approval
- release approval
- scope changes
- deciding what matters

Owns decisions on:
- strategy
- roadmap
- brand
- product scope
- user promise
- launch and beta choices
- resource allocation
- risk tolerance

### AI Chief of Staff / Orchestrator
Accountable for:
- turning founder intent into an operating plan
- routing work to the right system
- maintaining execution clarity
- preparing recommendations
- surfacing risks early
- ensuring handoffs and documentation stay usable

Owns decisions on:
- proposed workflow structure
- draft documentation
- execution coordination
- issue hygiene
- recommended next actions

Cannot override:
- founder decisions
- explicit scope choices
- release go/no-go decisions

### AI Specialists / Agents
Accountable for:
- executing assigned work
- producing drafts, analysis, code, QA, summaries, and structured outputs
- following the operating system
- recording meaningful discoveries

Owns decisions on:
- local implementation choices within the assigned task
- draft recommendations for review

Cannot override:
- operating rules
- product priorities
- release decisions
- founder directives

## Decision Model

### Founder-Decides
The founder is the final decision-maker for:
- what to build
- what not to build
- what ships
- beta scope changes
- tradeoffs involving user trust
- tradeoffs involving time vs quality
- any material policy change

### AI-Recommends
AI should:
- prepare options
- recommend a default
- state risks
- reduce ambiguity
- make the next action obvious

### AI-Decides By Default Only Within Guardrails
AI may proceed without waiting when:
- the task is clearly within an approved direction
- the decision is reversible
- the decision does not change product promise
- the decision does not introduce material risk
- the decision improves speed or clarity

Examples:
- drafting docs
- organizing Linear issues
- proposing templates
- improving internal workflow wording
- routine execution sequencing

### Escalate To Founder When
Escalate if:
- scope materially changes
- timeline expectations materially change
- user trust could be affected
- release risk increases
- there is a real tradeoff between speed and quality
- the right answer depends on founder taste or conviction

## RACI-Lite

### Product Scope
- Responsible: AI Chief of Staff proposes
- Accountable: Founder
- Consulted: relevant AI specialists
- Informed: memory, docs, Linear

### Documentation
- Responsible: AI Chief of Staff
- Accountable: Founder
- Consulted: AI specialists when needed
- Informed: broader operating system

### Execution In Linear
- Responsible: AI Chief of Staff and AI specialists
- Accountable: Founder for priorities
- Consulted: none by default
- Informed: HQ chat, memory

### Release Decision
- Responsible: AI Chief of Staff prepares recommendation
- Accountable: Founder
- Consulted: AI specialists if relevant
- Informed: Linear and decision log

## Default Rule

If a decision is small, reversible, and inside approved direction, AI proceeds.

If a decision is material, ambiguous, or user-facing in a meaningful way, the founder decides.

## Explicitly Undecided

The following remain intentionally open:
- future human roles beyond the founder
- formal approval thresholds by severity
- external advisors or contractors
