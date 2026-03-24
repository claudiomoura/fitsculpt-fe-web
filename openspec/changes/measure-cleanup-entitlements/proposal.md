# Proposal: Measure, Clean & Entitlements

## Intent

FitSculpt has accumulated technical debt across analytics, routing, entitlements, and onboarding that blocks reliable measurement and safe feature gating. Analytics pre-init events are silently lost, duplicated routes require scattered redirect pages, entitlement enforcement is nav-only (bypassed via direct URL), and the onboarding profile gate covers fewer than half of app routes. This change consolidates these four areas to produce a measurable, well-gated application ready for Sprint 3–4 deliverables.

## Scope

### In Scope

**Sprint 3 — Measure & Clean**
- Fix analytics queue flush bug: `__fsAnalyticsQueue` events are lost when PostHog initializes late. Implement a flush-on-init mechanism.
- Implement 5 missing training analytics events from the TODO list in `apps/web/src/lib/analytics.ts`.
- Verify PostHog environment config (project API key, `api_host`) is correctly wired.
- Define and register core funnel events: `signup`, `onboarding_complete`, `plan_generated`, `workout_started`, `meal_logged`, `upgrade_click`.
- Extract `toQueryString` to a shared utility (`apps/web/src/lib/toQueryString.ts`) and remove duplication from 8 redirect page files.
- Enable Gym Requests nav item in `apps/web/src/components/layout/navConfig.ts` (remove `disabled: true`).
- Collapse residual duplicated routes (training/entrenamiento, nutrition/nutricion, workouts/entrenamientos, dashboard/hoy) — ensure single canonical Spanish route per feature.

**Sprint 4 — Entitlements & Onboarding**
- Migrate frontend gating from plan-derived capability checks to module-level entitlements returned by `buildEffectiveEntitlements` (BE).
- Add route-level entitlement middleware/guards in `apps/web` — not just nav hiding.
- Expand `redirectToOnboardingIfIncomplete` profile gate to ALL `(app)` routes (currently only 4 of 11+).
- Optimize onboarding wizard for mobile (reduce action density per step).
- Enable gym-requests nav item (overlaps with Sprint 3 task — single toggle).

### Out of Scope
- New analytics dashboards or PostHog experiments (separate change).
- Role-based access control (RBAC) beyond the FREE/STRENGTH_AI/NUTRI_AI/PRO plan model.
- Backend entitlements logic refactor (`buildEffectiveEntitlements` is not changing).
- Full i18n route migration (English legacy redirects remain for now).

## Approach

### Analytics
1. In `apps/web/src/lib/analytics.ts`, replace the passive `__fsAnalyticsQueue` array with a `flushQueue()` function called inside `initPostHog()` after `posthog.init()` resolves. Guard against duplicate captures by marking flushed events.
2. Implement the 5 TODO training events by adding `trackEvent()` calls at the relevant component interaction points.
3. Add typed funnel event constants to a new `analytics/events.ts` file and wire `trackEvent` calls at: signup completion, onboarding finish, plan generation, workout start, meal log, upgrade CTA click.

### Routing
4. Create `apps/web/src/lib/toQueryString.ts` exporting the shared helper. Update all 8 redirect `page.tsx` files to import from it.
5. Audit duplicated routes — for each pair (e.g., `entrenamiento` ↔ `training`), keep the Spanish canonical route and convert the duplicate into a permanent redirect in `next.config.js` or `middleware.ts`.

### Entitlements
6. In `apps/web/src/lib/entitlements.ts`, deprecate plan-derived checks (`if plan === 'PRO'`) in favor of module checks (`if entitlements.nutritionModule`). Backend already returns module-level flags — frontend should consume them exclusively.
7. Create a `RouteEntitlementGuard` component (or middleware) that wraps protected route segments and checks `entitlements` against a route→module mapping. FREE users hitting a direct URL to a gated route get redirected to upgrade.
8. Expand `redirectToOnboardingIfIncomplete` in `apps/web/src/lib/server/profileGate.ts` to apply to the entire `(app)` route group via middleware, not individual page files.

### Onboarding
9. Audit wizard steps — reduce per-step action density by splitting high-friction steps and deferring optional fields to post-onboarding.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/lib/analytics.ts` | Modified | Queue flush bug fix, funnel event constants |
| `apps/web/src/lib/analytics/events.ts` | New | Typed funnel event definitions |
| `apps/web/src/components/training/*` | Modified | 5 missing analytics event hooks |
| `apps/web/src/lib/toQueryString.ts` | New | Shared query string builder |
| `apps/web/src/app/(app)/app/*/page.tsx` (8 files) | Modified | Import shared util, thin redirects |
| `apps/web/src/components/layout/navConfig.ts` | Modified | Enable gym-requests nav item |
| `apps/web/src/lib/entitlements.ts` | Modified | Module-level checks replace plan checks |
| `apps/web/src/context/auth/entitlements.ts` | Modified | Expose module flags to consumers |
| `apps/web/src/components/RouteEntitlementGuard.tsx` | New | Route-level gating component |
| `apps/web/src/lib/server/profileGate.ts` | Modified | Expand gate to all app routes |
| `apps/web/src/middleware.ts` | Modified | Profile gate + entitlement guard integration |
| `next.config.js` or middleware | Modified | Permanent redirects for collapsed routes |
| `apps/web/src/app/(app)/app/onboarding/*` | Modified | Mobile layout optimization |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Analytics queue flush duplicates events if PostHog auto-captures pageviews | Medium | Deduplicate by event ID; flush only custom events, not `$pageview` |
| Route-level entitlement guards break existing flows for FREE users accessing gated URLs | High | Graceful redirect to `/app/hoy` with upgrade CTA, not hard 404; test all plan tiers |
| Profile gate expansion locks out users with partially complete profiles | Medium | Implement progressive gate — incomplete fields shown inline, not full redirect; add `/app/perfil` escape hatch |
| Collapsing duplicated routes breaks bookmarks or external links | Low | Permanent (301) redirects in middleware; monitor 404 rates post-deploy |
| Onboarding mobile optimization increases step count, raising drop-off | Low | A/B funnel measurement via new analytics events before full rollout |

## Rollback Plan

1. **Analytics**: Revert `analytics.ts` to previous commit; queue returns to passive (lossy) mode. No data corruption risk.
2. **Routing**: Re-enable legacy redirect pages from git history; remove `toQueryString` import changes.
3. **Entitlements**: Revert frontend to plan-derived checks; disable `RouteEntitlementGuard` by removing the middleware integration. Nav gating remains functional.
4. **Onboarding**: Restore original `redirectToOnboardingIfIncomplete` scope (4 routes only).
5. **Feature flags**: All changes can be gated behind `featureFlags.entitlementsV2` and `featureFlags.analyticsV2` for staged rollout.

## Dependencies

- Backend `buildEffectiveEntitlements` must return module-level flags (already in place).
- PostHog project API key must be configured in environment variables (`NEXT_PUBLIC_POSTHOG_KEY`).
- Design approval for onboarding mobile wireframes (if step count changes).

## Success Criteria

- [ ] Zero analytics events lost between page load and PostHog init (measured by queue flush count)
- [ ] All 5 training TODO events firing in PostHog live debugger
- [ ] 6 core funnel events defined and tracked: `signup`, `onboarding_complete`, `plan_generated`, `workout_started`, `meal_logged`, `upgrade_click`
- [ ] `toQueryString` imported from single shared util — zero duplication in redirect pages
- [ ] 0 plan-derived capability checks remaining in frontend code (`grep` for plan string comparisons)
- [ ] Route-level entitlement guard active on all gated feature routes
- [ ] Profile gate covers 100% of `(app)` routes (not just 4)
- [ ] Gym Requests nav item enabled and accessible to admin users
- [ ] Duplicated route pairs resolved (permanent redirects in place)
- [ ] Onboarding wizard tested on mobile viewport (375px) with ≤3 actions per step
- [ ] All changes behind feature flags with safe rollback path
