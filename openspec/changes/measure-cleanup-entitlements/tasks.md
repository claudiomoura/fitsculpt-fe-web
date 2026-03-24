# Tasks: Measure, Cleanup & Entitlements

**Change**: `measure-cleanup-entitlements`  
**Project**: FitSculpt  
**Mode**: openspec  

---

## Phase 1: Analytics Fix (Sprint 3)

### 1.1 Fix Analytics Queue Flush Bug

- [ ] **1.1.1** Add `flushQueue()` function to `apps/web/src/lib/analytics.ts`
  - **Description**: Implement `flushQueue()` function that iterates `__fsAnalyticsQueue` and calls `posthog.capture()` for each non-$pageview event after PostHog init resolves
  - **Affected files**: `apps/web/src/lib/analytics.ts`
  - **Dependencies**: PostHog SDK already imported
  - **Test strategy**: Unit test mocking `posthog.init` callback, assert `capture` called for queued events, assert $pageview filtered

- [ ] **1.1.2** Add `queueFlushed` flag to prevent duplicate sends
  - **Description**: Add module-level `queueFlushed` boolean to ensure queue is flushed only once
  - **Affected files**: `apps/web/src/lib/analytics.ts`
  - **Dependencies**: Task 1.1.1
  - **Test strategy**: Call flushQueue() twice, verify capture called only once

- [ ] **1.1.3** Integrate `flushQueue()` into `initPostHog()` loaded callback
  - **Description**: Call `flushQueue()` inside the `loaded` callback of `posthog.init()`
  - **Affected files**: `apps/web/src/lib/analytics.ts`
  - **Dependencies**: Task 1.1.1
  - **Test strategy**: Manual verification in PostHog debugger - pre-init events appear within 5s of page load

### 1.2 Implement Core Funnel Events

- [ ] **1.2.1** Create `apps/web/src/lib/analytics/events.ts` with typed constants
  - **Description**: Define `FunnelEvents` object with SIGNUP, ONBOARDING_COMPLETE, PLAN_GENERATED, WORKOUT_STARTED, MEAL_LOGGED, UPGRADE_CLICK constants and corresponding TypeScript types
  - **Affected files**: `apps/web/src/lib/analytics/events.ts` (NEW)
  - **Dependencies**: None
  - **Test strategy**: TypeScript compile check, verify exports match spec schema

- [ ] **1.2.2** Wire `signup` event in registration flow
  - **Description**: Add `trackEvent('signup', { method: 'email' })` call in `apps/web/src/app/(auth)/register/page.tsx` after auth success
  - **Affected files**: `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/lib/analytics/events.ts`
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - complete registration, verify event in PostHog debugger

- [ ] **1.2.3** Wire `onboarding_complete` event in onboarding wizard
  - **Description**: Add `trackEvent('onboarding_complete', { steps_completed, profile_complete: true })` on final step submit
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/page.tsx`
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - complete onboarding, verify event in PostHog debugger

- [ ] **1.2.4** Wire `plan_generated` event in plan generation flow
  - **Description**: Add `trackEvent('plan_generated', { plan_type: 'training' })` when backend returns plan
  - **Affected files**: `apps/web/src/app/(app)/app/entrenamiento/page.tsx`
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - generate a plan, verify event in PostHog debugger

- [ ] **1.2.5** Wire `workout_started` event in workout session
  - **Description**: Add `trackEvent('workout_started', { workout_id, day_index })` when user starts first exercise set
  - **Affected files**: `apps/web/src/app/(app)/app/entrenamiento/[workoutId]/start/page.tsx`
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - start workout, verify event in PostHog debugger

- [ ] **1.2.6** Wire `meal_logged` event in nutrition logging
  - **Description**: Add `trackEvent('meal_logged', { meal_type, calories? })` when user submits meal entry
  - **Affected files**: `apps/web/src/app/(app)/app/nutricion/page.tsx`
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - log a meal, verify event in PostHog debugger

- [ ] **1.2.7** Wire `upgrade_click` event in upgrade CTA components
  - **Description**: Add `trackEvent('upgrade_click', { source, target_plan })` on upgrade button click
  - **Affected files**: Upgrade CTA components (paywall modals, nav items, feature gates)
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - click upgrade button, verify event in PostHog debugger

### 1.3 Implement Missing Training Events

- [ ] **1.3.1** Find and replace TODO comments in `apps/web/src/lib/analytics.ts`
  - **Description**: Search for TODO markers in training components, replace with actual `trackEvent()` calls for 5 missing events
  - **Affected files**: `apps/web/src/lib/analytics.ts`, training components (`apps/web/src/components/training/*`)
  - **Dependencies**: Task 1.2.1
  - **Test strategy**: Manual - trigger each training interaction, verify events in PostHog debugger

### 1.4 PostHog Environment Configuration

- [ ] **1.4.1** Verify PostHog env vars are correctly wired
  - **Description**: Confirm `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are read from env and passed to `posthog.init()`
  - **Affected files**: `apps/web/src/lib/analytics.ts`
  - **Dependencies**: None
  - **Test strategy**: Verify no hardcoded API keys in codebase, check `.env.local.example` has docs

- [ ] **1.4.2** Update `.env.local.example` with PostHog variables
  - **Description**: Add `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to example env file
  - **Affected files**: `.env.local.example` (or `.env.example`)
  - **Dependencies**: None
  - **Test strategy**: Verify file exists with correct variables

---

## Phase 2: Route Cleanup (Sprint 3)

### 2.1 Shared `toQueryString` Utility

- [ ] **2.1.1** Create `apps/web/src/lib/toQueryString.ts`
  - **Description**: Create shared utility function that builds query string from params object, handling null/undefined/empty values
  - **Affected files**: `apps/web/src/lib/toQueryString.ts` (NEW)
  - **Dependencies**: None
  - **Test strategy**: Unit test - compare output against test cases for various inputs

- [ ] **2.1.2** Update 8 redirect pages to import shared util
  - **Description**: Replace inline `toQueryString` implementations in redirect pages with import from `@/lib/toQueryString`
  - **Affected files**: 
    - `apps/web/src/app/(app)/app/training/page.tsx`
    - `apps/web/src/app/(app)/app/nutrition/page.tsx`
    - `apps/web/src/app/(app)/app/workouts/page.tsx`
    - `apps/web/src/app/(app)/app/dashboard/page.tsx`
    - `apps/web/src/app/(app)/app/today/page.tsx`
    - `apps/web/src/app/(app)/app/dietas/page.tsx`
    - `apps/web/src/app/(app)/app/entrenamientos/page.tsx`
    - `apps/web/src/app/(app)/app/progress/page.tsx`
  - **Dependencies**: Task 2.1.1
  - **Test strategy**: Manual - navigate to each redirect, verify query params preserved

### 2.2 Duplicated Route Collapsing

- [ ] **2.2.1** Add 301 redirects in middleware for EN→ES routes
  - **Description**: Add route redirect rules in `apps/web/src/middleware.ts` for `/app/training/*` → `/app/entrenamiento/*`, `/app/nutrition/*` → `/app/nutricion/*`, etc.
  - **Affected files**: `apps/web/src/middleware.ts`
  - **Dependencies**: Task 2.1.2 (redirect pages can be removed after middleware verified)
  - **Test strategy**: E2E - `curl -I` to each EN route, assert 301 + correct Location header

- [ ] **2.2.2** Thin out redirect page files
  - **Description**: Remove duplicate `toQueryString` implementations from redirect pages, keep minimal redirect logic
  - **Affected files**: Same 8 files as Task 2.1.2
  - **Dependencies**: Task 2.2.1
  - **Test strategy**: Code review - verify ≤15 lines per redirect page

### 2.3 Enable Gym Requests Nav Item

- [ ] **2.3.1** Remove `disabled: true` from gym-requests entry in navConfig
  - **Description**: Edit `navConfig.ts` to remove disabled flag from admin-gym-requests nav item
  - **Affected files**: `apps/web/src/components/layout/navConfig.ts`
  **Dependencies**: None
  **Test strategy**: Manual - as admin, verify gym-requests nav item is clickable and navigates to `/app/admin/gym-requests`

---

## Phase 3: Entitlements Migration (Sprint 4)

### 3.1 Module-Level Entitlement Checks

- [ ] **3.1.1** Update `apps/web/src/context/auth/entitlements.ts` to expose module flags
  - **Description**: Ensure `useEntitlements` hook exposes module-level flags (nutritionModule, trainingModule, etc.) from backend
  - **Affected files**: `apps/web/src/context/auth/entitlements.ts`
  **Dependencies**: Backend `buildEffectiveEntitlements` returns module flags
  **Test strategy**: Console log entitlements object, verify module flags present

- [ ] **3.1.2** Update `apps/web/src/lib/entitlements.ts` to use module checks
  - **Description**: Replace all plan-derived checks (`if plan === 'PRO'`) with module-level entitlement checks (`if entitlements.nutritionModule`)
  - **Affected files**: `apps/web/src/lib/entitlements.ts`, various components
  **Dependencies**: Task 3.1.1
  **Test strategy**: Script - `rg "plan ===" apps/web/src --type tsx` returns 0 matches

- [ ] **3.1.3** Replace plan checks in frontend components
  - **Description**: Find and replace all `plan === 'PRO'` or `plan === 'FREE'` checks with entitlement module checks
  - **Affected files**: Various components using plan string comparisons
  **Dependencies**: Task 3.1.2
  **Test strategy**: Same grep as Task 3.1.2

### 3.2 Route-Level Entitlement Guards

- [ ] **3.2.1** Create `RouteEntitlementGuard` component
  - **Description**: Create component that checks entitlements against route→module mapping and redirects to `/app/hoy?upgrade={module}` if denied
  - **Affected files**: `apps/web/src/components/RouteEntitlementGuard.tsx` (NEW)
  **Dependencies**: Task 3.1.1
  **Test strategy**: Unit test - mock entitlements, navigate to gated route, verify redirect called

- [ ] **3.2.2** Wrap app layout with RouteEntitlementGuard
  - **Description**: Import and wrap children in `apps/web/src/app/(app)/layout.tsx` with the guard component
  - **Affected files**: `apps/web/src/app/(app)/layout.tsx`
  **Dependencies**: Task 3.2.1
  **Test strategy**: E2E - as FREE user navigate to `/app/nutricion`, verify redirect to `/app/hoy?upgrade=nutrition`

- [ ] **3.2.3** Add loading state to entitlement guard
  - **Description**: Add skeleton/spinner UI while entitlements are loading, prevent content flash
  - **Affected files**: `apps/web/src/components/RouteEntitlementGuard.tsx`
  **Dependencies**: Task 3.2.1
  **Test strategy**: Visual - navigate to gated route, verify loading indicator before redirect

- [ ] **3.2.4** Create route→module mapping config
  - **Description**: Define mapping: `/app/nutricion/*` → nutrition, `/app/entrenamiento/*` → strength, `/app/macros` → nutrition
  - **Affected files**: `apps/web/src/components/RouteEntitlementGuard.tsx`
  **Dependencies**: Task 3.2.1
  **Test strategy**: Unit test - call getRequiredModule() for each route, verify correct module returned

---

## Phase 4: Onboarding Enforcement (Sprint 4)

### 4.1 Profile Gate Expansion

- [ ] **4.1.1** Add profile gate middleware for all `/app/*` routes
  - **Description**: Implement `checkProfileComplete()` in `middleware.ts` that checks profile fields and redirects to `/app/onboarding` if incomplete
  - **Affected files**: `apps/web/src/middleware.ts`
  **Dependencies**: None
  **Test strategy**: E2E - as incomplete profile user navigate to any `/app/*` route, verify redirect to `/app/onboarding`

- [ ] **4.1.2** Add bypass routes for onboarding/auth
  - **Description**: Configure middleware to skip profile check for `/app/onboarding`, `/app/api/auth`, `/app/verify-email`
  - **Affected files**: `apps/web/src/middleware.ts`
  **Dependencies**: Task 4.1.1
  **Test strategy**: E2E - navigate to `/app/onboarding` as incomplete profile, verify no redirect

- [ ] **4.1.3** Add profile check caching (5-min TTL)
  - **Description**: Cache profile completeness check to avoid repeated API calls on every navigation
  - **Affected files**: `apps/web/src/middleware.ts`
  **Dependencies**: Task 4.1.1
  **Test strategy**: Performance - measure middleware response time, verify <50ms with cache

- [ ] **4.1.4** Remove per-page `redirectToOnboardingIfIncomplete` calls
  - **Description**: Remove individual page-level profile gate checks, rely on middleware
  - **Affected files**: Individual page files that call `redirectToOnboardingIfIncomplete`
  **Dependencies**: Task 4.1.1
  **Test strategy**: Code review - verify no page-level redirect calls remaining

- [ ] **4.1.5** Add `/app/perfil` escape hatch from onboarding redirect
  - **Description**: Allow users to access profile settings even with incomplete profile
  - **Affected files**: `apps/web/src/middleware.ts`
  **Dependencies**: Task 4.1.1
  **Test strategy**: E2E - as incomplete profile user navigate to `/app/perfil`, verify access granted

### 4.2 Onboarding Mobile Optimization

- [ ] **4.2.1** Audit onboarding wizard steps for action count
  - **Description**: Review each step, count interactive elements (inputs, selects, buttons)
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/*`
  **Dependencies**: None
  **Test strategy**: Visual - view each step at 375px, count actions

- [ ] **4.2.2** Split high-density steps (≤3 actions per step)
  - **Description**: Refactor steps with >3 actions into separate pages
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/*`
  **Dependencies**: Task 4.2.1
  **Test strategy**: Visual - verify each step has ≤3 actions at 375px

- [ ] **4.2.3** Add mobile-specific CSS for onboarding
  - **Description**: Add media queries for 375px viewport, ensure 44px minimum tap targets, adequate spacing
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/onboarding.module.css` (or global CSS)
  **Dependencies**: Task 4.2.2
  **Test strategy**: Visual - test on 375px viewport, verify no horizontal scroll, tap targets ≥44px

- [ ] **4.2.4** Defer optional fields to post-onboarding
  - **Description**: Move optional fields (medical conditions, equipment) from wizard to `/app/perfil`
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/*`, `apps/web/src/app/(app)/app/perfil/*`
  **Dependencies**: Task 4.2.2
  **Test strategy**: Visual - verify optional fields not in wizard, available in profile settings

---

## Phase 5: Feature Flags & Cleanup

### 5.1 Feature Flag Integration

- [ ] **5.1.1** Add `featureFlags.analyticsV2` to analytics code
  - **Description**: Wrap queue flush, funnel events, training events behind feature flag
  - **Affected files**: `apps/web/src/lib/analytics.ts`, related component files
  **Dependencies**: Tasks 1.1, 1.2, 1.3
  **Test strategy**: Disable flag, verify passive queue behavior (original)

- [ ] **5.1.2** Add `featureFlags.entitlementsV2` to entitlements code
  - **Description**: Wrap module-level checks, route guards, profile gate expansion behind feature flag
  - **Affected files**: `apps/web/src/context/auth/entitlements.ts`, `apps/web/src/components/RouteEntitlementGuard.tsx`, `middleware.ts`
  **Dependencies**: Tasks 3.1, 3.2, 4.1
  **Test strategy**: Disable flag, verify plan-derived checks + nav-only gating

- [ ] **5.1.3** Add `featureFlags.onboardingV2` to onboarding code
  - **Description**: Wrap mobile optimization changes behind feature flag
  - **Affected files**: `apps/web/src/app/(app)/app/onboarding/*`
  **Dependencies**: Task 4.2
  **Test strategy**: Disable flag, verify original wizard layout

### 5.2 Observability & Logging

- [ ] **5.2.1** Add logging for entitlement guard redirects
  - **Description**: Log user ID, requested route, entitlement checked, result (allowed/denied)
  - **Affected files**: `apps/web/src/components/RouteEntitlementGuard.tsx`
  **Dependencies**: Task 3.2.1
  **Test strategy**: Check logs when redirect occurs

- [ ] **5.2.2** Add logging for profile gate redirects
  - **Description**: Log user ID, missing fields when redirecting to onboarding
  - **Affected files**: `apps/web/src/middleware.ts`
  **Dependencies**: Task 4.1.1
  **Test strategy**: Check logs when redirect occurs

---

## Implementation Order

**Recommended sequence** (by dependency):

1. **Start with Analytics (Phase 1)** - Isolated, low risk
   - Queue flush fix → Core funnel events → Training events → PostHog config
   
2. **Route Cleanup (Phase 2)** - Can run in parallel with Phase 1
   - Shared util → Update redirect pages → Middleware redirects → Enable nav item
   
3. **Entitlements (Phase 3)** - Higher risk, requires testing all tiers
   - Module flags → Replace plan checks → Route guard component → Wrap layout
   
4. **Onboarding (Phase 4)** - Higher risk, affects all users
   - Profile gate middleware → Remove per-page calls → Mobile optimization
   
5. **Feature Flags (Phase 5)** - Last, ensures safe rollback
   - Add all three flags → Observability logging

---

## Test Strategy Summary

| Phase | Unit Tests | E2E Tests | Manual Tests |
|-------|------------|------------|--------------|
| Analytics | flushQueue dedup, types | - | PostHog debugger verification |
| Routing | toQueryString output | 301 redirects | Nav item click |
| Entitlements | guard logic | FREE→redirect, PRO→access | Loading state visual |
| Onboarding | - | Profile gate all routes | Mobile viewport count |
| Feature Flags | - | Flag disable behavior | - |

---

## Notes

- All feature flags must have clear disable behavior documented
- Profile gate middleware adds ~50ms latency per request (mitigate with cache)
- Route entitlement guard must handle loading state to prevent content flash
- Onboarding mobile optimization should not increase total step count