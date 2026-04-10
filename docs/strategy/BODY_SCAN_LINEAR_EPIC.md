# Epic: Modular Tracking Intelligence Platform

## Epic Title

Modular Tracking Intelligence Platform: Body Scan, Projection, and Recommendation Capabilities

## Epic Description

Build a modular capability architecture for FitSculpt’s tracking intelligence layer instead of a single monolithic feature. The system must expose standalone capabilities that can be shipped, tested, gated, and reused independently across onboarding, profile, tracking, weekly review, and future premium flows.

Initial capability set:

- Body Scan
- Prediction / Projection
- Recommendation / Upsell / Transformation Program

Primary repo anchors:

- `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx`
- `apps/web/src/app/(app)/app/profile/ProfileSummaryClient.tsx`
- `apps/web/src/app/(app)/app/profile/ProfileClient.tsx`
- `apps/web/src/app/(app)/app/onboarding/OnboardingClient.tsx`
- `apps/web/src/components/weekly-review/FutureProjectionPanel.tsx`
- `apps/web/src/components/tracking/PassiveHealthSummaryCard.tsx`

## Implementation Progress (Living)

### 2026-04-10 checkpoint

#### Completed foundations
- [x] Linear project and issue tree created (`FIT-30` to `FIT-40`).
- [x] Modular domain introduced under `apps/web/src/domains/tracking-intelligence/`.
- [x] Shared capability contracts/selectors/projection helpers added.
- [x] Shared AI preflight added in `apps/web/src/domains/ai/preflight.ts` with fail-closed behavior.
- [x] Golden rule of AI token accounting documented and applied as platform rule.

#### Completed UX increments
- [x] Tracking intelligence preview integrated in `TrackingClient.tsx`.
- [x] `FutureProjectionPanel` moved toward reusable projection domain consumption.
- [x] `TrackingSummaryPreview.tsx` extracted from `TrackingClient.tsx`.
- [x] Guided Body Scan capture v1 (guided photos with stepper + prompts) integrated in Seguimiento full check-in.

#### In progress
- [ ] Connect AI preflight to real token reservation/balance adapter.
- [ ] Expand guided capture from guided photos to richer camera guidance.
- [ ] Further split `TrackingClient.tsx` intelligence sections into dedicated components/hooks.

#### Validation status
- [x] Typecheck passing (`apps/web`).
- [x] Domain and guided-capture tests passing (`apps/web/src/test/*tracking*`, `aiPreflight`, `GuidedBodyScanCapture`, `TrackingSummaryPreview`).

## Success Metrics

- 80%+ of new progress UX ships through standalone capability modules, not direct feature logic inside `TrackingClient.tsx`.
- Projection can be rendered in at least 2 surfaces without duplicating business logic.
- Body Scan can be invoked independently from tracking flow and from at least one secondary flow.
- Recommendation engine can run with projection only, body scan only, or combined inputs.
- Capability failures degrade gracefully.
- Compliance, analytics, and entitlement gating are defined per capability.
- Every AI-backed capability enforces entitlement, token estimation, balance validation, and reservation/charge before execution.

## Golden Rule for AI Capability Execution

Any AI-backed capability in this epic must follow a mandatory platform preflight before execution.

This includes Body Scan where AI is used, AI-assisted recommendation extensions, AI plan generation, and any future capability introduced under this platform.

### Mandatory sequence
1. verify the user's entitlement/tier
2. estimate token consumption for the requested operation
3. confirm sufficient token balance
4. reserve or charge tokens before invoking the AI operation
5. only then execute

### Product and platform implications
- if tier eligibility fails, the operation does not execute
- if balance is insufficient, the operation does not execute
- some capabilities may be Pro-only or limited to higher tiers
- this must be implemented as shared platform/orchestration behavior, not duplicated ad hoc inside Body Scan or a single UI flow
- acceptance criteria for AI-related issues must include explicit entitlement and token-preflight behavior

## Milestones

### M1 — Capability contracts and boundaries
**Goal:** Define capability interfaces, inputs/outputs, entitlement rules, fallback behavior, and orchestration rules.

**Exit criteria:**
- Architecture doc approved
- Capability boundaries explicit
- Screen orchestration rules documented for Tracking, Profile, Onboarding, Weekly Review

### M2 — Data foundation and reusable selectors
**Goal:** Extract capability-ready inputs from tracking/profile/passive health sources.

**Exit criteria:**
- Shared selectors exist for latest check-in, photo availability, passive support, adherence context
- Downstream capabilities can consume shared selectors without page-local coupling

### M3 — Projection capability hardening
**Goal:** Promote current Future Projection into a reusable, screen-agnostic capability.

**Exit criteria:**
- Projection usable outside `FutureProjectionPanel.tsx`
- Existing weekly review behavior preserved
- Standard fallback/error/disclaimer states defined

### M4 — Body Scan capability v1
**Goal:** Deliver standalone Body Scan workflow and structured output contract.

**Exit criteria:**
- Body Scan launches from at least one primary and one secondary surface
- Body Scan works without Projection
- Confidence/limitations/disclaimer state defined

### M5 — Recommendation / Transformation Program capability
**Goal:** Add recommendation engine that consumes scan/projection/adherence state and outputs next best action.

**Exit criteria:**
- Recommendation works with partial inputs
- Deterministic fallback exists
- AI plan generation can act as downstream consumer, not orchestrator

### M6 — Screen orchestration rollout
**Goal:** Wire modular capabilities into real product surfaces.

**Exit criteria:**
- Tracking, Profile, Onboarding, Weekly Review consume capability orchestration
- No single page owns the whole feature logic

## Capability Map

### Check-in Capture
- **Purpose:** Collect structured progress inputs
- **Inputs:** weight, body measurements, `bodyFatPercent`, `frontPhotoUrl`, `sidePhotoUrl`, notes, energy, hunger
- **Outputs:** normalized `CheckinEntry`, history, latest progress snapshot
- **Consumers:** Tracking, Profile, Projection, Recommendation, future Body Scan flows

### Passive Health Ingestion
- **Purpose:** Provide support signals, not the primary source of truth
- **Inputs:** device sync snapshots, manual passive health entry, provider metadata
- **Outputs:** passive snapshots, overview, support metrics
- **Consumers:** Tracking, Projection, future adherence/review experiences

### Body Scan
- **Purpose:** Standalone visual/body-composition capability
- **Inputs:** `frontPhotoUrl`, `sidePhotoUrl`, latest check-in metrics, `bodyFatPercent`, optional profile context
- **Outputs:** scan status, comparison artifacts, structured body-composition insight payload, confidence, limitations
- **Consumers:** Tracking, Profile, recommendation flows, premium journeys

### Prediction / Projection
- **Purpose:** Independent future-state projection capability
- **Inputs:** check-in history, consistency, passive support, goal, target sessions
- **Outputs:** horizon ranges, assumptions, confidence, disclaimer, analytics metadata
- **Consumers:** Weekly Review, Tracking summary, recommendation engine

### Recommendation / Transformation Program
- **Purpose:** Convert user state into next best action and monetizable recommendation
- **Inputs:** body scan output, projection output, adherence, plan state, entitlements, profile goal/context
- **Outputs:** recommendation card, CTA target, upsell reason, deterministic fallback, optional AI-assisted extension
- **Consumers:** Tracking, Weekly Review, Today/feed, premium conversion flows

### Capability Orchestration Layer
- **Purpose:** Compose capabilities into screen-specific flows without embedding all logic in one page
- **Inputs:** user context, entitlements, available capability outputs, flow intent
- **Outputs:** execution order, presentation payloads, fallback behavior
- **Consumers:** Onboarding, Tracking, Profile, Weekly Review, future conversion journeys

## Linear Issues

### 1) Define modular capability architecture and contracts
- **Capability:** Platform / Orchestration
- **Why:** Need a stable non-monolithic foundation before UX or AI growth.
- **Scope:**
  - Define capability boundaries
  - Define input/output contracts
  - Define orchestration rules per screen
  - Define failure/fallback model
- **Acceptance criteria:**
  - Architecture doc exists and is approved
  - Each capability has explicit purpose, inputs, outputs, owner boundary
  - Screen orchestration rules are documented
  - Monolithic tracking-page-owned approach is explicitly rejected
- **Dependencies:** None
- **Suggested owner profile:** Staff engineer / architect

### 2) Extract reusable tracking intelligence selectors from current tracking flow
- **Capability:** Data
- **Why:** Current logic is too concentrated in `TrackingClient.tsx`.
- **Scope:**
  - Isolate selectors for latest check-in, trend windows, passive support, photo availability, adherence context
- **Acceptance criteria:**
  - Shared selectors exist for downstream capability inputs
  - Projection and recommendation can consume shared selectors without page-local state
  - No regression in tracking UX
- **Dependencies:** Issue 1
- **Suggested owner profile:** Senior frontend engineer

### 3) Formalize Body Scan input contract on top of existing photo/body-fat model
- **Capability:** Body Scan
- **Why:** Photos and `bodyFatPercent` already exist, but not as a standalone capability contract.
- **Scope:**
  - Define scan request payload
  - Define scan result payload
  - Define low-confidence and insufficient-data states
  - Define output storage/reference strategy
- **Acceptance criteria:**
  - Body Scan contract documented
  - Contract references `frontPhotoUrl`, `sidePhotoUrl`, `bodyFatPercent`, latest metrics
  - Insufficient-data state supported
  - Disclaimer/compliance fields included
- **Dependencies:** Issues 1, 2
- **Suggested owner profile:** Product-minded backend or full-stack engineer

### 4) Promote future projection into a reusable capability service
- **Capability:** Projection
- **Why:** Projection exists but remains too coupled to Weekly Review presentation.
- **Scope:**
  - Separate capability contract from panel UX
  - Preserve deterministic model and RCT hooks
  - Define reusable consumer API for multiple screens
- **Acceptance criteria:**
  - Projection usable outside `FutureProjectionPanel.tsx`
  - Existing weekly review behavior remains intact
  - Inputs/outputs are screen-agnostic
  - Fallback/error/disclaimer states standardized
- **Dependencies:** Issues 1, 2
- **Suggested owner profile:** Senior full-stack engineer

### 5) Add capability-level analytics and experimentation taxonomy
- **Capability:** Platform / Analytics
- **Why:** Capabilities must be measured independently across surfaces.
- **Scope:**
  - Define events for compute/view/success/fallback/CTA/accept-reject
  - Align projection RCT telemetry with broader capability analytics
  - Add capability identifiers and origin metadata
- **Acceptance criteria:**
  - Analytics spec exists per capability
  - Projection events remain supported
  - Body Scan and Recommendation taxonomy defined
  - Events distinguish capability success vs screen exposure
- **Dependencies:** Issues 1, 4
- **Suggested owner profile:** Product analytics engineer

### 6) Add shared AI entitlement and token-preflight platform layer
- **Capability:** Platform / Orchestration / Billing
- **Why:** AI capabilities must be governed by one shared execution rule instead of ad hoc checks inside Body Scan, recommendation flows, or AI plan generation.
- **Scope:**
  - Define entitlement/tier check contract for AI capabilities
  - Define token estimation contract per AI operation
  - Define sufficient-balance validation rules
  - Define reservation or charge-before-execution behavior
  - Define failure responses for ineligible tier and insufficient balance
  - Define how shared preflight is consumed by Body Scan, Recommendation AI extensions, and AI plan generation
- **Acceptance criteria:**
  - A shared preflight contract exists for AI capability execution
  - AI operations cannot run without passing entitlement and balance checks
  - Token estimation happens before execution
  - Reservation or charge occurs before execution begins
  - Tier-restricted capability behavior is explicit and testable
  - The rule is documented as platform behavior, not as Body-Scan-only logic
- **Dependencies:** Issue 1
- **Suggested owner profile:** Staff engineer / full-stack platform engineer

### 7) Build Body Scan capability v1 UX and orchestration entrypoints
- **Capability:** Body Scan / UX
- **Why:** Body Scan must be independently invokable, not hidden inside a page.
- **Scope:**
  - Add standalone invocation path
  - Add loading, success, missing-data, failure states
  - Add integration entrypoints from Tracking and Profile
- **Acceptance criteria:**
  - Body Scan launches from at least one primary and one secondary surface
  - Body Scan works independently from Projection
  - Users see limitations/disclaimer
  - Recommendation is not required for Body Scan UI to render
- **Dependencies:** Issues 3, 5, 6
- **Suggested owner profile:** Senior frontend engineer

### 8) Build recommendation engine contract for transformation program and upsell
- **Capability:** Recommendation / Upsell
- **Why:** Recommendations must remain independent from scan and projection and work with partial inputs.
- **Scope:**
  - Define recommendation input matrix
  - Define deterministic fallback rules
  - Define AI-assisted extension points
  - Define CTA targets: plan update, premium, program, next check-in
- **Acceptance criteria:**
  - Recommendation runs with projection-only, scan-only, or combined inputs
  - Output includes rationale, CTA, and gating state
  - Upsell logic is not hardcoded into one screen
  - Entitlement-aware behavior documented
- **Dependencies:** Issues 1, 3, 4, 6
- **Suggested owner profile:** Senior product engineer

### 9) Integrate existing AI plan generation as recommendation consumer, not orchestrator
- **Capability:** AI
- **Why:** AI plans already exist and should consume recommendation outputs instead of owning the whole flow.
- **Scope:**
  - Map recommendation outputs to AI plan invocation
  - Preserve existing entitlement checks
  - Define deterministic fallback when AI is unavailable
- **Acceptance criteria:**
  - Recommendation can trigger AI plan generation through a clear boundary
  - No direct coupling from Body Scan to training-plan internals
  - AI unavailability does not block recommendation rendering
  - Entitlement behavior is explicit and testable
- **Dependencies:** Issues 6, 8
- **Suggested owner profile:** Full-stack engineer with AI integration experience

### 10) Add compliance, safety, and claim-governance layer for scan/projection/recommendation
- **Capability:** Compliance
- **Why:** Body and prediction outputs need explicit risk controls.
- **Scope:**
  - Define disclaimer rules
  - Define prohibited claims and copy boundaries
  - Define low-confidence / insufficient-data behavior
  - Define premium-gating disclosure rules
- **Acceptance criteria:**
  - Each capability output includes compliance metadata or rendering guidance
  - Projection avoids guaranteed-outcome language
  - Body Scan avoids medical-diagnostic framing
  - Recommendation/upsell copy rules documented
- **Dependencies:** Issues 3, 4, 6, 8
- **Suggested owner profile:** PM + compliance-minded product engineer

### 11) Refactor Tracking, Profile, Onboarding, and Weekly Review to consume capability orchestration
- **Capability:** UX / Orchestration
- **Why:** The value is only real when multiple screens consume the same modular system.
- **Scope:**
  - Wire capabilities into:
    - `TrackingClient.tsx`
    - `ProfileSummaryClient.tsx`
    - `ProfileClient.tsx`
    - `OnboardingClient.tsx`
    - weekly review / `FutureProjectionPanel.tsx`
  - Remove screen-owned business logic where replaced by capabilities
- **Acceptance criteria:**
  - At least 4 surfaces consume the capability layer
  - Tracking screen is lighter
  - One capability can be disabled without collapsing the overall flow
  - UX parity or improvement validated
- **Dependencies:** Issues 7, 8, 9, 10
- **Suggested owner profile:** Senior frontend engineer / tech lead

## Execution Order

1. Define modular capability architecture and contracts
2. Extract reusable tracking intelligence selectors
3. Promote Projection into reusable capability service
4. Formalize Body Scan input contract
5. Add capability-level analytics taxonomy
6. Add shared AI entitlement and token-preflight platform layer
7. Build Body Scan capability v1 UX
8. Build recommendation engine contract
9. Integrate AI plan generation as downstream recommendation consumer
10. Add compliance and claim-governance layer
11. Refactor real product surfaces to consume orchestration

## Developer Handoff Notes

- Do **not** create a new mega feature module that owns capture, scan, projection, recommendation, and upsell together.
- Treat `TrackingClient.tsx` as a current integration surface, not the long-term owner of domain logic.
- Keep platform/orchestration separate from capability internals.
- Any AI capability must pass shared entitlement and token preflight before execution; do not implement this as ad hoc screen logic.
- Body Scan must not require Projection.
- Recommendation must not require AI.
- Passive Health remains a support input, not the single source of truth.
- Preserve deterministic fallback paths for premium/AI features.
- Keep all body/health messaging non-medical and non-guaranteed.

## Suggested Owner Breakdown

- **Architect / staff engineer:** capability contracts, boundaries, orchestration
- **Frontend senior:** selectors, Body Scan entry UX, surface refactors
- **Full-stack / backend:** projection service extraction, body-scan contract, recommendation service
- **Product / design:** claims, UX sequencing, upsell clarity
- **Analytics / growth:** event taxonomy and funnel instrumentation

## Recommended Start Point

Do **not** start implementation in app surfaces first.

Start with:
1. Issue 1 — architecture/contracts
2. Issue 2 — shared selectors
3. Issue 4 — reusable projection capability

Only after those are clear should the team start building Body Scan v1 UX and recommendation flows.
