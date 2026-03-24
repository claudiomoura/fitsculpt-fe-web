# Measure, Clean & Entitlements — Specification

**Change**: `measure-cleanup-entitlements`
**Sprints**: 3 (Analytics + Route Cleanup), 4 (Entitlements + Onboarding)
**Status**: Draft

---

## 1. Analytics — Queue Flush & Funnel Events

### 1.1 Requirement: Analytics Queue Flush

The system MUST preserve all analytics events captured before PostHog initialization and flush them immediately after `posthog.init()` resolves. Events SHALL NOT be silently lost.

#### Scenario: Pre-init events are preserved and flushed

- GIVEN the browser loads a page before PostHog has initialized
- WHEN user interactions trigger `trackEvent()` calls that are pushed to `__fsAnalyticsQueue`
- AND `initPostHog()` completes and `posthog.init()` resolves
- THEN all queued events are flushed to PostHog via individual `posthog.capture()` calls
- AND each flushed event is marked as already-sent (e.g., flagged or spliced from queue) to prevent duplicate captures on subsequent flushes

#### Scenario: No duplicate events after flush

- GIVEN `__fsAnalyticsQueue` contains events `[A, B, C]`
- WHEN `flushQueue()` runs and sends A, B, C to PostHog
- AND the user navigates to another page before PostHog fully initializes (edge case)
- THEN `flushQueue()` does NOT re-send A, B, C
- AND only new events queued after the first flush are sent

#### Scenario: `$pageview` events are excluded from flush

- GIVEN `__fsAnalyticsQueue` contains `[{ event: '$pageview', ... }, { event: 'signup', ... }]`
- WHEN `flushQueue()` runs
- THEN only non-pageview events (e.g., `signup`) are flushed
- AND `$pageview` events are discarded (PostHog captures these automatically)

### 1.2 Requirement: Core Funnel Events

The system MUST track exactly six core funnel events with typed constants and typed properties. These events SHALL be defined in `apps/web/src/lib/analytics/events.ts`.

#### Funnel Event Schema

| Event Name | Fired When | Required Properties |
|------------|-----------|-------------------|
| `signup` | User completes registration (email or social) | `method: 'email' \| 'google' \| 'apple'` |
| `onboarding_complete` | User submits the final onboarding wizard step | `steps_completed: number`, `profile_complete: boolean` |
| `plan_generated` | System generates a training or nutrition plan for the user | `plan_type: 'training' \| 'nutrition' \| 'both'` |
| `workout_started` | User begins a workout session (first exercise set started) | `workout_id: string`, `day_index: number` |
| `meal_logged` | User logs a meal entry (breakfast/lunch/dinner/snack) | `meal_type: 'breakfast' \| 'lunch' \| 'dinner' \| 'snack'`, `calories?: number` |
| `upgrade_click` | User clicks any upgrade/CTA button targeting a paid plan | `source: 'paywall' \| 'nav' \| 'feature-gate'`, `target_plan: string` |

#### Scenario: Signup event tracked on registration

- GIVEN a new user completes the email registration form
- WHEN the auth response returns success
- THEN `trackEvent('signup', { method: 'email' })` is called
- AND the event is captured by PostHog (either immediately or via queue flush)

#### Scenario: Onboarding complete event tracked

- GIVEN a user has filled all required onboarding steps
- WHEN the user clicks "Finish" on the last step
- THEN `trackEvent('onboarding_complete', { steps_completed: N, profile_complete: true })` is called

#### Scenario: Plan generated event tracked

- GIVEN the backend has generated a training plan for the user
- WHEN the plan generation API response is received by the frontend
- THEN `trackEvent('plan_generated', { plan_type: 'training' })` is called

#### Scenario: Workout started event tracked

- GIVEN a user opens a workout session
- WHEN the user starts the first exercise set (taps "Start" or "Begin set")
- THEN `trackEvent('workout_started', { workout_id: '...', day_index: 3 })` is called

#### Scenario: Meal logged event tracked

- GIVEN a user is on the meal logging screen
- WHEN the user submits a meal entry
- THEN `trackEvent('meal_logged', { meal_type: 'lunch', calories: 450 })` is called
- AND `calories` property is included only when the value is known (MAY be omitted)

#### Scenario: Upgrade click event tracked

- GIVEN a FREE user sees an upgrade CTA (paywall modal, nav item, or feature gate)
- WHEN the user clicks the upgrade button
- THEN `trackEvent('upgrade_click', { source: 'paywall', target_plan: 'PRO' })` is called
- THEN the user is navigated to the upgrade/payment flow

### 1.3 Requirement: Missing Training Analytics Events

The system MUST implement the 5 TODO training events currently stubbed in `apps/web/src/lib/analytics.ts`. Each event SHALL be tracked at its corresponding interaction point in the training components.

#### Scenario: Training TODO events fire correctly

- GIVEN the 5 TODO events are defined in `analytics.ts` with placeholder comments
- WHEN each event's trigger action occurs in the training UI
- THEN `trackEvent()` is called with the correct event name and properties
- AND each event appears in PostHog live debugger within 5 seconds

### 1.4 Requirement: PostHog Environment Configuration

The system MUST read the PostHog project API key and `api_host` from environment variables (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`). These values SHALL NOT be hardcoded.

#### Scenario: PostHog initializes with correct config

- GIVEN `NEXT_PUBLIC_POSTHOG_KEY` is set in `.env.local`
- WHEN the app boots and `initPostHog()` is called
- THEN `posthog.init()` receives the correct API key and host from env vars
- AND no hardcoded project keys exist in the codebase

---

## 2. Routing — Redirect Cleanup & Route Collapsing

### 2.1 Requirement: Shared `toQueryString` Utility

The system MUST extract the `toQueryString` helper function into a single shared module at `apps/web/src/lib/toQueryString.ts`. All redirect page files SHALL import from this module. Duplicated inline implementations SHALL be removed.

#### Scenario: Redirect pages use shared utility

- GIVEN 8 redirect `page.tsx` files each contain an inline `toQueryString` implementation
- WHEN `apps/web/src/lib/toQueryString.ts` is created with the shared function
- AND each redirect page is updated to `import { toQueryString } from '@/lib/toQueryString'`
- THEN zero duplicate `toQueryString` implementations remain in the codebase
- AND all redirect pages produce identical query string output as before

### 2.2 Requirement: Duplicated Route Collapsing

The system MUST collapse duplicated route pairs into a single canonical Spanish route. English legacy routes SHALL redirect permanently (301) to their Spanish canonical equivalents.

#### Route Pair Mapping

| Legacy Route (redirect FROM) | Canonical Route (redirect TO) |
|------------------------------|-------------------------------|
| `/app/training/*` | `/app/entrenamiento/*` |
| `/app/nutrition/*` | `/app/nutricion/*` |
| `/app/workouts/*` | `/app/entrenamientos/*` |
| `/app/dashboard` | `/app/hoy` |

#### Scenario: Legacy EN route redirects to ES canonical

- GIVEN a user navigates to `/app/training/day/3`
- WHEN the request is processed by middleware or Next.js redirect config
- THEN the system responds with HTTP 301 (permanent redirect)
- AND the `Location` header is `/app/entrenamiento/day/3`
- AND any query parameters are preserved in the redirect

#### Scenario: No duplicated redirect page files

- GIVEN the route collapsing is complete
- WHEN inspecting the `app/(app)/app/` directory structure
- THEN each legacy route directory contains either a minimal redirect page or no page (handled by middleware/next.config)
- AND redirect pages are thin (import shared util + single redirect call, ≤15 lines)

### 2.3 Requirement: Gym Requests Nav Item Enabled

The system MUST remove `disabled: true` from the Gym Requests entry in `apps/web/src/components/layout/navConfig.ts`.

#### Scenario: Gym Requests nav item is accessible

- GIVEN the nav config contains a Gym Requests entry
- WHEN the config is loaded by the layout component
- THEN the Gym Requests nav item renders as a clickable link
- AND navigation to `/app/gym-requests` succeeds without errors
- AND the item is visible to admin users per existing role checks

---

## 3. Entitlements — Route-Level Guards

### 3.1 Requirement: Module-Level Entitlement Checks

The system MUST consume module-level entitlement flags returned by the backend `buildEffectiveEntitlements` function. Frontend code SHALL NOT derive capabilities from raw plan string comparisons (e.g., `if plan === 'PRO'`).

#### Entitlement Check Contract

| Check Target | Source | Consumer |
|-------------|--------|----------|
| `entitlements.nutritionModule` | Backend `buildEffectiveEntitlements` | Nutrition feature routes, components |
| `entitlements.trainingModule` | Backend `buildEffectiveEntitlements` | Training feature routes, components |
| `entitlements.advancedAnalytics` | Backend `buildEffectiveEntitlements` | Analytics dashboard, charts |
| `entitlements.gymRequests` | Backend `buildEffectiveEntitlements` | Gym requests feature |
| `entitlements.fullAccess` | Backend `buildEffectiveEntitlements` | PRO-only features, no ads |

#### Scenario: Zero plan-derived checks in frontend

- GIVEN entitlement migration is complete
- WHEN `grep` is run for plan string comparisons in the frontend codebase
- THEN zero matches are found for patterns like `plan === 'PRO'`, `plan === 'FREE'`, or direct plan string checks
- AND all gating is done via `entitlements.nutritionModule`, `entitlements.trainingModule`, etc.

### 3.2 Requirement: Route-Level Entitlement Guards

The system MUST enforce entitlements at the route level via a `RouteEntitlementGuard` component (or middleware equivalent). Guards SHALL NOT rely solely on nav hiding — direct URL access to gated routes MUST be intercepted.

#### Route → Module Mapping

| Route Pattern | Required Entitlement |
|--------------|---------------------|
| `/app/nutricion/*` | `entitlements.nutritionModule` |
| `/app/entrenamiento/*` | `entitlements.trainingModule` |
| `/app/analytics/*` | `entitlements.advancedAnalytics` |

#### Scenario: FREE user accessing PRO route is redirected to upgrade

- GIVEN a user with plan `FREE` (no `nutritionModule` entitlement) is authenticated
- WHEN the user navigates directly to `/app/nutricion/plan`
- THEN the route-level guard checks `entitlements.nutritionModule`
- AND finding it `false`, redirects the user to `/app/hoy?upgrade=nutrition`
- AND an upgrade CTA is displayed on the destination page explaining the gated feature
- AND the `upgrade_click` analytics event is NOT auto-fired (user must click)

#### Scenario: PRO user accesses gated route without redirect

- GIVEN a user with plan `PRO` (all entitlements active) is authenticated
- WHEN the user navigates directly to `/app/nutricion/plan`
- THEN the route-level guard checks `entitlements.nutritionModule`
- AND finding it `true`, renders the requested page without redirect

#### Scenario: Entitlement guard does not block FREE routes

- GIVEN a FREE user navigates to `/app/hoy` (dashboard)
- WHEN the route-level guard evaluates entitlements
- THEN no entitlement check blocks access (dashboard is always available)
- AND the page renders normally

### 3.3 Requirement: Entitlement Guard Loading State

The system MUST show a loading state while entitlements are being fetched from the backend. Guards SHALL NOT flash the gated content before redirecting.

#### Scenario: No content flash during entitlement check

- GIVEN a FREE user navigates to a gated route
- WHEN the entitlement guard is fetching `entitlements` from the backend
- THEN a loading indicator (skeleton or spinner) is displayed
- AND no part of the gated page content is rendered
- AND once the entitlement check resolves as `false`, the redirect occurs

---

## 4. Onboarding — Profile Gate & Mobile Optimization

### 4.1 Requirement: Universal Profile Gate

The system MUST enforce the profile completeness gate on ALL `(app)` route group routes. The `redirectToOnboardingIfIncomplete` function SHALL be applied via middleware at the route group level, not per-page.

#### Profile Gate Contract

A profile is considered **complete** when ALL of the following are true:

| Field | Condition |
|-------|-----------|
| `user.name` | Non-empty string |
| `user.birthdate` | Valid date, user is ≥ 13 years old |
| `user.gender` | One of: `male`, `female`, `other`, `prefer_not_to_say` |
| `user.height` | Numeric value > 0 |
| `user.weight` | Numeric value > 0 |
| `user.fitnessGoal` | One of: `lose_weight`, `build_muscle`, `maintain`, `improve_fitness` |

If ANY required field is missing or invalid, the profile is considered incomplete.

#### Scenario: Incomplete profile forces onboarding on any app route

- GIVEN a user has completed registration but has NOT filled in their profile
- WHEN the user navigates to ANY route under `(app)` (e.g., `/app/hoy`, `/app/entrenamiento`, `/app/perfil`)
- THEN the middleware checks profile completeness
- AND finding it incomplete, redirects the user to `/app/onboarding`
- AND the user cannot access any app route until onboarding is completed

#### Scenario: Complete profile bypasses onboarding gate

- GIVEN a user has all required profile fields filled
- WHEN the user navigates to `/app/hoy`
- THEN the middleware checks profile completeness
- AND finding it complete, allows the request through
- AND no redirect to onboarding occurs

#### Scenario: Profile gate covers all (app) routes

- GIVEN the profile gate migration is complete
- WHEN inspecting the middleware configuration
- THEN the `redirectToOnboardingIfIncomplete` check applies to the `(app)` route group
- AND individual page-level `redirectToOnboardingIfIncomplete` calls are removed
- AND 100% of `(app)` routes are covered (not just the previous 4)

### 4.2 Requirement: Onboarding Mobile Optimization

The system MUST optimize the onboarding wizard for mobile viewports (375px width). Each step SHALL contain at most 3 interactive actions (input fields, toggles, or buttons).

#### Scenario: Onboarding step has ≤3 actions on mobile

- GIVEN the onboarding wizard is rendered at 375px viewport width
- WHEN each step is displayed
- THEN each step contains at most 3 interactive elements (text inputs, select dropdowns, radio groups, or CTAs counted as 1 action each)
- AND no step requires horizontal scrolling
- AND all tap targets are ≥ 44px for accessibility

#### Scenario: Optional fields deferred to post-onboarding

- GIVEN the onboarding wizard has been optimized
- WHEN the user progresses through all onboarding steps
- THEN only required fields (per Profile Gate Contract) are presented
- AND optional fields (e.g., medical conditions, equipment availability) are deferred to `/app/perfil` settings
- AND the total step count does not increase compared to the original wizard

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Analytics queue flush MUST complete within 100ms after PostHog init, regardless of queue size (up to 50 events).
- Route entitlement checks MUST NOT add more than 200ms to route transition time (measured from navigation start to first contentful paint).
- Profile gate checks in middleware MUST complete within 50ms (cached profile data, no extra API call per navigation).

### 5.2 Feature Flags

All changes MUST be behind feature flags with safe rollback paths:

| Flag | Controls |
|------|----------|
| `featureFlags.analyticsV2` | Queue flush, funnel events, training events |
| `featureFlags.entitlementsV2` | Module-level checks, route guards, profile gate expansion |
| `featureFlags.onboardingV2` | Mobile layout optimization, step restructuring |

When a flag is disabled, the system MUST fall back to current behavior (passive queue, plan-derived checks, limited profile gate).

### 5.3 Observability

- All 6 funnel events MUST appear in PostHog live debugger within 5 seconds of firing.
- Route entitlement guard redirects MUST be logged with: user ID, requested route, entitlement checked, result (allowed/denied).
- Profile gate redirects MUST be logged with: user ID, missing fields.

### 5.4 Accessibility

- Onboarding wizard steps MUST meet WCAG 2.1 AA for mobile.
- Upgrade CTA displayed after entitlement redirect MUST be screen-reader accessible.
- Loading states in entitlement guard MUST include `aria-busy="true"` and accessible labels.

---

## 6. Out of Scope

- **Analytics dashboards**: Building PostHog dashboards or reports (separate change).
- **A/B experiments**: PostHog experiment setup (separate change).
- **RBAC**: Role-based access control beyond the FREE/STRENGTH_AI/NUTRI_AI/PRO plan model.
- **Backend entitlements refactor**: `buildEffectiveEntitlements` logic is not changing.
- **Full i18n route migration**: English legacy routes beyond the 4 listed pairs. Other language routes remain as-is.
- **Payment flow**: Upgrade page implementation (separate change; this spec only covers the redirect + event tracking).
- **PostHog SDK upgrade**: If a newer PostHog SDK version is needed, it is a separate change.

---

## 7. Acceptance Criteria Summary

- [ ] Zero analytics events lost between page load and PostHog init (queue flush count = pre-init event count)
- [ ] All 5 training TODO events firing in PostHog live debugger
- [ ] 6 core funnel events defined in `analytics/events.ts` and tracked at correct interaction points
- [ ] `toQueryString` imported from single shared util — zero duplication in redirect pages
- [ ] 0 plan-derived capability checks remaining in frontend code
- [ ] Route-level entitlement guard active on all gated feature routes
- [ ] FREE user hitting a gated URL → redirected to `/app/hoy?upgrade={module}` with upgrade CTA
- [ ] Profile gate covers 100% of `(app)` routes via middleware
- [ ] Incomplete profile → forced onboarding on any `(app)` route
- [ ] Gym Requests nav item enabled and accessible
- [ ] Duplicated route pairs resolved with 301 permanent redirects
- [ ] Onboarding wizard steps have ≤3 actions on 375px viewport
- [ ] All changes behind feature flags with rollback paths
