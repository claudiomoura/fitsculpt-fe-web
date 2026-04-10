# Tracking AI Capability Map

## Purpose

This document defines the modular capability architecture for FitSculpt's tracking intelligence layer.

It replaces a monolithic "smart tracking feature" approach with a set of standalone, independently callable capabilities that can be orchestrated into different screens and user journeys.

This architecture is intended for developers, product, design, and AI agents working in this repo.

## Why This Exists

The product direction is explicitly modular.

We do not want a single mega feature that mixes:

- check-in capture
- body scan
- projection
- recommendations
- upsell
- AI plan generation
- screen-specific UX

Instead, we want independent capabilities that can be:

- shipped separately
- tested separately
- entitlement-gated separately
- composed in different flows
- reused across tracking, onboarding, profile, and weekly review

## Current Repo Anchors

These are the most important integration points in the current codebase:

### Main screen surfaces
- `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx`
- `apps/web/src/app/(app)/app/profile/ProfileSummaryClient.tsx`
- `apps/web/src/app/(app)/app/profile/ProfileClient.tsx`
- `apps/web/src/app/(app)/app/onboarding/OnboardingClient.tsx`
- `apps/web/src/components/weekly-review/FutureProjectionPanel.tsx`
- `apps/web/src/components/tracking/PassiveHealthSummaryCard.tsx`

### Existing contracts and services
- `apps/web/src/services/tracking.ts`
- `apps/api/src/tracking/schemas.ts`
- `apps/web/src/services/futureProjection.ts`
- `apps/api/src/services/futureProjection.ts`
- `apps/web/src/domains/ai/index.ts`
- `apps/web/src/domains/training/index.ts`

### Modular capability foundation (current)
- `apps/web/src/domains/tracking-intelligence/contracts.ts`
- `apps/web/src/domains/tracking-intelligence/bodyScan.ts`
- `apps/web/src/domains/tracking-intelligence/projection.ts`
- `apps/web/src/domains/tracking-intelligence/recommendation.ts`
- `apps/web/src/domains/tracking-intelligence/recommendationPlanConsumer.ts`
- `apps/web/src/domains/tracking-intelligence/compliance.ts`
- `apps/web/src/domains/tracking-intelligence/analytics.ts`
- `apps/web/src/components/tracking-intelligence/TrackingCapabilitySnapshot.tsx`

The platform currently enforces fail-closed AI execution when token reservation is not connected. This is intentional to preserve the entitlement/token sequence as a hard rule.

## Architectural Rule

Screens orchestrate capabilities.

Screens do not own capability business logic.

This means:

- `TrackingClient.tsx` should become an orchestration surface, not the home for all intelligence logic.
- `FutureProjectionPanel.tsx` should consume a reusable projection capability, not define the only projection flow.
- profile and onboarding should consume capability outputs where useful instead of reimplementing logic.

## Golden Rule for AI Capability Execution

Any capability that invokes AI must pass a platform-owned preflight before execution.

This rule applies to Body Scan, AI-assisted recommendation extensions, AI plan generation, and any future AI-backed capability.

### Mandatory execution sequence
1. verify the user's entitlement/tier for that capability
2. estimate the token cost of the requested operation
3. check whether the user has sufficient token balance
4. reserve or charge the required tokens before invoking the AI operation
5. only then execute the capability

### Enforcement rules
- if the user does not have the required tier, the AI operation must not run
- if the user does not have sufficient balance, the AI operation must not run
- some AI capabilities may be restricted to Pro or higher tiers
- this sequence is a shared platform rule, not a screen-level concern and not a Body-Scan-only rule
- capability modules may declare their AI cost profile, but preflight enforcement belongs to platform/orchestration
- UI surfaces may explain why execution is unavailable, but must not bypass platform checks

### Architectural consequence
AI invocation is never "fire and forget".

Every AI-backed capability must be modeled as:
- eligibility check
- token-cost estimation
- balance validation
- reservation/charge step
- execution
- success/failure/release accounting as applicable

## Capability Inventory

### 1. Check-in Capture

#### Purpose
Collect and persist structured progress inputs used by all higher-order capabilities.

#### Inputs
- date
- weight
- body measurements
- `bodyFatPercent`
- `frontPhotoUrl`
- `sidePhotoUrl`
- notes
- energy
- hunger

#### Outputs
- normalized `CheckinEntry`
- latest progress snapshot
- historical trend-ready records
- profile-aligned updates

#### Existing source of truth
- `apps/web/src/services/tracking.ts`
- `apps/api/src/tracking/schemas.ts`

#### Main consumers
- tracking
- profile
- future body scan flows
- projection
- recommendation engine

### 2. Passive Health Ingestion

#### Purpose
Ingest passive health/device signals as a support capability.

This is not the primary source of progress truth. It is a supporting signal for adherence, recovery, and consistency.

#### Inputs
- device sync snapshots
- manual passive health inputs
- provider/source metadata

#### Outputs
- `PassiveHealthSnapshot[]`
- passive health overview
- support metrics for projection and recommendations

#### Existing source of truth
- `apps/web/src/components/tracking/PassiveHealthSummaryCard.tsx`
- `apps/web/src/lib/nativeHealthSync.ts`
- `apps/api/src/tracking/schemas.ts`

#### Main consumers
- tracking
- projection
- future adherence and weekly review experiences

### 3. Body Scan

#### Purpose
Produce a standalone body scan capability from visual and body-composition inputs.

This capability must be callable independently from tracking and independently from projection.

#### Inputs
- `frontPhotoUrl`
- `sidePhotoUrl`
- latest check-in metrics
- `bodyFatPercent`
- optional profile context:
  - sex
  - age
  - height
  - current weight
  - goal

#### Outputs
- scan status
- comparison artifacts
- structured body-composition insight payload
- confidence
- limitations
- insufficient-data state
- compliance/disclaimer metadata

#### Main consumers
- tracking
- profile
- standalone body scan entry flow
- recommendation engine
- premium conversion journeys

#### Rules
- must not require projection
- must not imply a medical diagnosis
- must support "not enough data" gracefully

### 4. Prediction / Projection

#### Purpose
Generate future progress projections as an independent capability.

This capability already exists in partial form and should be promoted into a screen-agnostic service boundary.

#### Inputs
- check-in history
- workout/logging consistency
- passive support signals
- user goal
- target sessions per week

#### Outputs
- horizons
- scenario ranges
- assumptions
- confidence
- limitations
- disclaimer
- analytics/experiment metadata

#### Existing source of truth
- `apps/web/src/components/weekly-review/FutureProjectionPanel.tsx`
- `apps/web/src/services/futureProjection.ts`
- `apps/api/src/services/futureProjection.ts`

#### Main consumers
- weekly review
- tracking summary
- future motivation surfaces
- recommendation engine

#### Rules
- deterministic baseline must exist
- AI explanation may be additive, not required
- projection must render with fallback states
- all outcomes must be framed as non-guaranteed

### 5. Recommendation / Transformation Program

#### Purpose
Turn user state into the best next action.

This capability decides what to recommend next based on progress state, capability outputs, and entitlement context.

#### Inputs
- body scan output
- projection output
- adherence metrics
- check-in history
- current plan state
- entitlement state
- profile goal/context

#### Outputs
- recommendation cards
- suggested next action
- program fit
- upsell reason
- CTA target
- deterministic fallback result
- optional AI-assisted extension

#### Main consumers
- tracking
- weekly review
- today/feed surfaces
- premium conversion flows
- plan adaptation flows

#### Rules
- must work with projection-only
- must work with body-scan-only
- must work with combined inputs
- must not require AI to render useful output

### 6. Capability Orchestration Layer

#### Purpose
Compose capabilities into different flows without coupling business logic to one page.

#### Inputs
- user context
- entitlements
- available capability outputs
- flow intent:
  - onboarding
  - tracking
  - profile
  - weekly review

#### Outputs
- ordered execution strategy
- presentation-ready payloads
- fallback behavior when a capability is missing
- screen-specific composition rules

#### Rules
- orchestration is platform logic
- orchestration does not own capability internals
- one capability failure must not collapse the whole flow

## Separation of Concerns

### Platform
Owns:
- orchestration
- analytics taxonomy
- entitlement plumbing
- AI entitlement, token estimation, balance validation, and reservation/charge enforcement before execution
- fallback conventions
- compliance metadata rules

### Capability modules
Own:
- their own input/output contracts
- computation
- confidence/failure semantics
- domain-specific business logic

### UX surfaces
Own:
- rendering
- navigation
- CTA placement
- user education
- progressive disclosure

### AI layer
Owns:
- AI-assisted generation or interpretation where needed
- executes only after platform preflight confirms tier eligibility and token availability
- never the only execution path
- must always have deterministic fallback when required by product

### Compliance layer
Owns:
- disclaimers
- prohibited claims
- low-confidence behavior
- non-medical framing
- premium-gating disclosure rules

## Data Contracts Already Present

### Check-in contract
From existing schemas and services:
- `bodyFatPercent`
- `frontPhotoUrl`
- `sidePhotoUrl`

These already make Body Scan feasible without inventing a brand new base model.

### Passive health contract
Existing schema already supports:
- steps
- active calories
- active minutes
- sleep
- resting heart rate
- optional body weight
- optional body fat
- exercise sessions

This should remain a separate support capability.

### Projection contract
Existing projection logic already supports:
- adherence
- consistency
- logging frequency
- weight trend
- scenario generation
- RCT instrumentation

This is a strong candidate for early capability extraction.

## Non-Goals

These are explicitly out of scope for this architecture:

- creating one giant "tracking intelligence" page module
- making Body Scan depend on Recommendation
- making Recommendation depend on AI-only paths
- making Passive Health the only source of truth for progress
- embedding upsell rules directly into UI components without a capability contract

## Required Delivery Principles

### Principle 1: Standalone capability first
Each capability must be invocable and testable independently.

### Principle 2: Reusable across multiple screens
A capability is not complete if it only works in one screen-specific component.

### Principle 3: Graceful degradation
Examples:
- if Body Scan is unavailable, Projection still works
- if Projection is unavailable, tracking still works
- if AI is unavailable, Recommendation still provides deterministic output

### Principle 4: Compliance by design
Every body/health-related capability must support:
- disclaimers
- confidence or limitation states
- non-medical framing
- no guaranteed-outcome language

### Principle 5: Screen logic stays thin
The long-term goal is reducing intelligence logic inside:
- `TrackingClient.tsx`
- screen-specific feature components

### Principle 6: AI execution requires economic preflight
Any AI-assisted capability must validate entitlement, estimate token usage, confirm sufficient balance, and reserve or charge tokens before execution begins.

## Recommended Execution Plan

### Phase 1
Define capability contracts and orchestration rules.

### Phase 2
Extract shared selectors and reusable tracking intelligence inputs from current tracking flow.

### Phase 3
Promote Projection into a reusable capability service.

### Phase 4
Formalize Body Scan contracts and launch Body Scan v1.

### Phase 5
Add Recommendation / Transformation Program capability with deterministic fallback and optional AI extensions.

### Phase 6
Refactor tracking, profile, onboarding, and weekly review to consume orchestration.

## Success Criteria

- Capabilities are independently deployable.
- Projection is reused in more than one surface.
- Body Scan is callable outside tracking.
- Recommendation works with partial inputs.
- Screen-owned business logic decreases.
- Compliance and analytics are defined per capability.
- AI is additive, not structurally required.

## Developer Guidance

When implementing:

- do not extend `TrackingClient.tsx` as the permanent owner of new domain logic
- add capability contracts before adding UI variants
- keep platform/orchestration separate from capability internals
- preserve deterministic fallback behavior
- prefer contracts that can be consumed by multiple screens immediately
- avoid merging scan, projection, and recommendation into one "smart result" API

## Suggested Future File Placement

Recommended repo path for this document:
- `docs/architecture/TRACKING_AI_CAPABILITY_MAP.md`

Recommended future code organization direction:
- capability contracts near domain boundaries
- orchestration separate from screen components
- shared selectors extracted from tracking/profile data sources
- analytics and compliance rules centralized, not duplicated per screen

## Final Decision

FitSculpt should implement tracking intelligence as a modular capability platform.

The first-class capabilities are:

- Check-in Capture
- Passive Health Ingestion
- Body Scan
- Prediction / Projection
- Recommendation / Transformation Program
- Capability Orchestration Layer

These capabilities should be composed across existing screens instead of being merged into a single monolithic feature.
