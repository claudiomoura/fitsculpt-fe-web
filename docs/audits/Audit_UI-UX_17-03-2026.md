**Audit Plan**

- Inspect app IA from `apps/web/src/app/**`, shell/navigation from `apps/web/src/components/layout/**`, and route aliases/redirects.
- Trace each core screen to real BFF contracts in `apps/web/src/app/api/**` and usage in page/client components; flag any UX idea that lacks backend support as a contract gap.
- Review core journeys screen-by-screen for CTA clarity, hierarchy, mobile density, states, DS consistency, accessibility, perceived performance, and premium polish.
- Audit growth surfaces: auth, onboarding, Today loop, weekly review, feed, billing, entitlements, and paywalls.
- Audit UI architecture: primitives, tokens, globals, one-off styling, duplicate components, and missing mobile primitives.
- Output: severity-ranked findings, target IA, redesign spec, DS plan, epics/stories, QA plan, and backend dependencies.

**Executive Summary**

- The biggest blocker to “WOW” is not missing features; it is fragmented IA. Home/Today/Progress overlap, training routes are duplicated, profile is split across `/app/profile`, `/app/profile/legacy`, and `/app/onboarding`, and library/navigation logic is inconsistent.
- The second blocker is trust. Today currently allows a one-tap check-in that writes fake zero-value body data in `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:343`, and several progress signals are heuristic rather than true logged outcomes.
- The third blocker is system inconsistency. The repo has a newer design-system layer plus older global CSS primitives plus feature-local one-offs; the result is uneven quality across key screens like onboarding, tracking, feed, and workout logging.
- Billing is relatively solid and backend-backed, but paywall logic is not fully aligned to the richer module entitlements contract; frontend gating still derives a lot from normalized plan names in `apps/web/src/context/auth/entitlements.ts:20`.
- The app is already close to a strong mobile-first product if it simplifies to one primary daily loop: `Today -> Training/Nutrition -> Focus logger -> Success -> Back to Today`.

**Screen Map**

- `Onboarding`
  - Auth: `/login`, `/register`, `/verify-email`
  - Onboarding: `/app/onboarding`
  - Data: `/api/profile`, `/api/auth/verify-email`, auth actions in `apps/web/src/app/(auth)/login/actions.ts`
- `Today / Home`
  - `/app` -> user redirect to `/app/hoy` in `apps/web/src/app/(app)/app/page.tsx:12`
  - `/app/hoy`
  - `/app/dashboard`
  - `/app/weekly-review` and modal variant from Today
  - Data: `/api/tracking`, `/api/training-plans/active?includeDays=1`, `/api/nutrition-plans?limit=1`, `/api/nutrition-plans/[id]`, `/api/auth/me`, `/api/review/weekly`
- `Training`
  - Canonical list/calendar: `/app/entrenamiento`
  - Redirect aliases: `/app/entrenamientos`, `/app/workouts`
  - Detail: both `/app/entrenamiento/[workoutId]` and `/app/entrenamientos/[workoutId]`
  - Focus logger: `/app/entrenamientos/[workoutId]/start`
  - Editor: `/app/entrenamiento/editar`
  - Data: `/api/workouts`, `/api/workouts/[id]`, `/api/workouts/[id]/start`, `/api/workout-sessions/[id]`, `/api/workout-sessions/[id]/finish`, `/api/training-plans/*`, `/api/exercises/*`, `/api/ai/quota`
- `Nutrition`
  - `/app/nutricion`
  - `/app/nutricion/editar`
  - `/app/dietas`, `/app/dietas/[planId]`
  - `/app/macros`
  - Data: `/api/nutrition-plans`, `/api/nutrition-plans/[id]`, `/api/nutrition-plans/assigned`, `/api/billing/status`, `/api/ai/quota`, `/api/auth/me`
- `Tracking / Progress`
  - `/app/seguimiento`
  - `/app/seguimiento/check-in` and modal variant
  - `/app/feed`
  - `/app/weekly-review`
  - Data: `/api/tracking`, `/api/tracking/[collection]/[id]`, `/api/user-foods*`, `/api/feed`, `/api/feed/generate`, `/api/ai/daily-tip`
- `Library`
  - `/app/biblioteca`
  - `/app/biblioteca/[exerciseId]`
  - `/app/biblioteca/entrenamientos`, `/app/biblioteca/entrenamientos/[planId]`
  - `/app/biblioteca/recetas`, `/app/biblioteca/recetas/[recipeId]`
  - Data: `/api/exercises*`, `/api/training-plans*`, `/api/trainer/plans`, `/api/recipes*`
- `Profile / Settings`
  - `/app/profile`
  - `/app/profile/legacy`
  - `/app/settings`
  - `/app/settings/billing`
  - Data: `/api/profile`, `/api/auth/me`, `/api/gym/me`, legacy `/api/gyms/membership`, `/api/billing/*`
- `Gym / Trainer / Admin`
  - User gym: `/app/gym`, `/app/gym/admin`
  - Trainer: `/app/trainer/*`, plus Portuguese aliases `/app/treinador/*`
  - Admin: `/app/admin/*`
  - Data: `/api/gym/*`, `/api/gyms/*`, `/api/gym-flow/*`, `/api/trainer/*`, `/api/admin/*`

**Findings By Severity**

- `P0`
  - Fake health data can be created from Today quick check-in: `weightKg: 0`, `energy: 0`, body metrics `0` in `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:343`. This breaks trust and corrupts progress.
  - Entitlement source of truth is inconsistent. FE gating relies on plan-derived capabilities in `apps/web/src/context/auth/entitlements.ts:20`, while contracts expect module-level entitlements to be authoritative; Today already checks modules directly in `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:269`.
- `P1`
  - IA fragmentation: `/app`, `/app/hoy`, `/app/dashboard`, `/app/seguimiento` all compete for “home/progress” meaning; nav even labels `/app` as progress in `apps/web/src/components/layout/navConfig.ts:134`.
  - Training duplication: `/app/entrenamiento`, `/app/entrenamientos`, `/app/workouts`, and two live workout detail routes create inconsistent entry/return paths.
  - Onboarding is not the real first-run flow. Docs say auth should lead to onboarding, but code leads most users straight to Today; see `apps/web/src/app/(app)/app/page.tsx:12` vs `docs/UI-UX/03_User_Flows.md:3`.
  - Nutrition logging is not a real focused logging system. Meal adherence is local/device-only in `apps/web/src/lib/nutritionAdherence.ts`, so “meal completed” cannot be trusted cross-device.
  - Profile is split between summary hub, legacy editor, and onboarding; `apps/web/src/app/(app)/app/profile/ProfileSummaryClient.tsx:129` still sends core profile edits back to onboarding.
  - Mobile density is too high in onboarding, training, nutrition, and tracking; too many actions are visible at once.
- `P2`
  - Billing return flow loses purchase intent. After checkout sync, user is forced back to billing in `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:210` instead of the blocked feature.
  - Feed and verify-email have weak state design; they rely on plain text states instead of stronger state components.
  - App shell brand link goes to marketing `/` from inside the authenticated shell in `apps/web/src/components/layout/AppNavBar.tsx:115`.
  - Admin nav marks a live page as disabled: `/app/admin/gym-requests` in `apps/web/src/components/layout/navConfig.ts:153`.

**Core Screen Heuristic Audit**

- Scores are `CTA / hierarchy / mobile / states / DS / a11y / perf / premium`
- `Login` `/login` — `4/4/4/3/3/3/4/3` — mixed auth paths and off-DS password input — `P2`
- `Register` `/register` — `3/4/3/3/3/3/4/3` — promo code friction, weak inline validation — `P1`
- `Verify email` `/verify-email` — `2/3/5/2/3/2/3/2` — almost no success/error/next-step UX — `P1`
- `Onboarding` `/app/onboarding` — `3/3/2/3/2/2/3/2` — six-step dense form, weak DS use — `P1`
- `Today` `/app/hoy` — `4/4/3/3/3/3/4/4` — strong visual intent, but fake check-in and heuristic progress — `P1`
- `Training` `/app/entrenamiento` — `4/4/3/4/3/3/4/4` — good intent, too dense on mobile, completion logic weak — `P1`
- `Workout detail` — `5/4/3/3/3/3/3/3` — clear CTA, but card-heavy and generic state handling — `P2`
- `Workout start` — `5/4/4/4/2/2/4/4` — focus mode works; internal logger controls need DS/a11y cleanup — `P1`
- `Nutrition` `/app/nutricion` — `4/4/2/4/4/3/4/4` — premium sections, but too many competing modules — `P1`
- `Tracking` `/app/seguimiento` — `4/4/2/4/3/3/3/3` — powerful but overloaded — `P1`
- `Library` `/app/biblioteca*` — `4/4/3/4/3/3/4/3` — IA fragmented across subsections — `P2`
- `Profile` `/app/profile` — `2/3/4/2/3/3/4/3` — mostly a link hub, no clear primary action — `P2`
- `Settings` `/app/settings` — `3/4/4/4/4/4/4/3` — useful but no clear primary next action — `P2`
- `Billing` `/app/settings/billing` — `4/4/4/4/4/4/4/3` — solid backend integration, but weak persuasion and recovery flow — `P2`
- `Weekly review` `/app/weekly-review` — `4/4/4/4/4/4/4/3` — clean, but outcomes are shallow/local — `P2`
- `Feed` `/app/feed` — `3/3/4/2/3/3/3/2` — plain states and low-premium presentation — `P2`
- `Gym` `/app/gym` — `4/4/3/4/4/4/4/3` — robust states, still too many decisions in one pass — `P2`

**Recommended Target IA**

- Bottom tab bar:
  - `Today` -> `/app/hoy`
  - `Training` -> `/app/entrenamiento`
  - `Nutrition` -> `/app/nutricion`
  - `Progress` -> `/app/seguimiento`
  - `Profile` -> `/app/profile`
- Secondary destinations:
  - Library becomes sub-navigation from Training/Nutrition/Profile, not a primary tab.
  - Weekly review becomes a Today/Progress module, not a separate primary nav destination.
  - Feed becomes optional within Today or Progress, not a primary account detour.
- Route cleanup:
  - Keep `/app/entrenamiento` as canonical training hub.
  - Convert `/app/entrenamientos` and `/app/workouts` to redirect-only.
  - Keep one workout detail route only.
  - Keep `/app/profile` as the canonical account home; fold `/app/profile/legacy` behavior into it; keep onboarding only for first-run + profile-completion gaps.
- Focus mode rule:
  - Keep current workout focus shell behavior from `apps/web/src/components/layout/AppShellLayout.tsx:15`.
  - Add the same shell rule for future meal logging focus routes; do not keep logging inside the full nutrition page if the experience becomes high-frequency.

**Growth Funnel Map**

- Current funnel:
  - `Register -> Login -> /app -> /app/hoy -> maybe onboarding later -> training/nutrition gated contextually`
- Biggest drop-off risks:
  - Forced login after register.
  - Promo code requirement on register.
  - No enforced onboarding before empty Today.
  - Billing does not return users to the blocked action.
  - Analytics stub limits measurement; `apps/web/src/lib/analytics.ts` is not production-grade.
- Top 10 conversion/retention improvements:
  - Enforce onboarding before empty Today for incomplete profiles.
  - Remove fake quick check-in; replace with 30-second real mini-check-in.
  - Make Today show only 3 actions: `Start workout`, `Log meal`, `Check in`.
  - Return users to the exact blocked action after billing success.
  - Use module entitlements as the only paywall source.
  - Promote weekly review as a completion reward inside Today/Progress.
  - Make streaks and small wins real, not heuristic.
  - Elevate nutrition adherence to a first-class logged behavior.
  - Simplify register and explain promo-code gating clearly if still required.
  - Implement real funnel/paywall/core-loop analytics before redesign rollout.

**Redesign Spec**

- `Today`
  - Purpose: one-screen daily hub.
  - Layout: hero status + exactly 3 cards/actions max.
  - Components: `DailyHero`, `ActionCard`, `StreakPill`, `TodaySummaryStrip`.
  - States: loading skeleton, no-plan empty, gated nutrition/training, partial-complete, fully-complete.
  - CTAs: `Start workout`, `Log meal`, `Check in`.
- `Training`
  - Purpose: weekly plan navigator.
  - Layout: week strip first, selected-day detail second, contextual CTA footer.
  - Components: `WeekCalendar`, `DayWorkoutCard`, `WorkoutFocusCTA`, `PlanMetaSheet`.
  - States: no plan, assigned plan, rest day, completed workout, loading, entitlement gate.
  - CTA: one dominant CTA per selected day.
- `Workout Focus Logger`
  - Purpose: zero-distraction execution.
  - Layout: sticky top stats, one exercise card at a time, bottom action rail.
  - Components: `FocusShell`, `ExerciseSetTable`, `RestTimerChip`, `SessionFinishSheet`.
  - States: active, rest, save error, finish success, offline retry if supported later.
- `Nutrition`
  - Purpose: today’s meal log first, weekly plan second.
  - Layout: today summary -> meal list -> quick add/log -> week view secondary.
  - Components: `MealProgressHeader`, `MealLogCard`, `QuickAddSheet`, `NutritionWeekStrip`.
  - States: no plan, today plan ready, meal logged, gated nutrition, loading/error.
  - Contract gap: true per-meal server-backed completion is missing; current local adherence should not be treated as durable logging.
- `Progress`
  - Purpose: simplified analysis, not data entry overload.
  - Layout: tabs `Check-in / Training / Nutrition`.
  - Components: `ProgressRangeTabs`, `MetricTrendCard`, `InsightCard`, `CheckinEntryCTA`.
  - States: empty history, loading, partial data, adjustment available.
- `Profile`
  - Purpose: account home + profile completeness.
  - Layout: identity card, plan card, profile completion, settings links.
  - Components: `ProfileHeaderCard`, `PlanStatusCard`, `ProfileCompletionCard`, `AccountList`.
- `Billing`
  - Purpose: one decision: keep current plan or upgrade.
  - Layout: current plan summary -> plan picker -> FAQ/trust -> portal/support.
  - Components: `PlanCompareCard`, `BillingStatusCard`, `PurchaseRecoveryBanner`.
- `Weekly Review`
  - Purpose: reward and reflection loop.
  - Layout: weekly score, 3 insights, 1 recommended next action.
  - Components: `WeeklyScoreCard`, `RecommendationCard`, `AcceptActionSheet`.

**Flow Diagrams**

```text
Auth -> Verify email -> Onboarding -> Today
Today -> Start workout -> Workout detail -> Focus logger -> Finish success -> Back to Today
Today -> Log meal -> Nutrition today log -> Confirm meal -> Back to Today
Today -> Check in -> Mini check-in -> Success microcelebration -> Back to Today
Today/Training/Nutrition -> Blocked premium action -> Billing -> Checkout -> Return to originating action
Today end-of-week -> Weekly review -> Accept recommendation -> Deep link to target screen -> Back to Today
```

**Design System Plan**

- Consolidate canonical primitives under:
  - `apps/web/src/components/ui/Button.tsx`
  - `apps/web/src/components/ui/Input.tsx`
  - `apps/web/src/components/ui/Card.tsx`
  - `apps/web/src/components/ui/Modal.tsx`
  - `apps/web/src/components/ui/Toast.tsx`
  - `apps/web/src/components/ui/Skeleton.tsx`
  - `apps/web/src/components/states/*`
- Consolidate/remove duplicates:
  - `apps/web/src/design-system/components/Button.tsx`
  - `apps/web/src/components/landing/Button.tsx`
  - `apps/web/src/components/landing/Card.tsx`
  - `apps/web/src/components/surfaces/SurfaceCard.tsx`
  - feature-local empty/error states in gym, trainer-dashboard, Today
- Token cleanup:
  - Align TS tokens in `apps/web/src/design-system/tokens.ts`, `spacing.ts`, `typography.ts` with CSS vars in `apps/web/src/app/globals.css:2`
  - Remove undefined alias references like `--fs-*` in `apps/web/src/app/globals.css:34`
  - Normalize spacing to one scale; stop inline drift called out by `apps/web/src/design-system/README.md:7`
- Missing primitives to add:
  - `Tabs`
  - `BottomSheet`
  - `Textarea`
  - `Select/Combobox`
  - `Switch`
  - `Checkbox/Radio`
  - `FormField`
  - `Avatar`
  - `Banner/InlineNotice`
  - `FocusShell`
- Typography note:
  - Current DS font stack is still generic in `apps/web/src/design-system/typography.ts:2`; for premium polish, use a more intentional brand stack, but keep it compatible with current frontend infra.

**Backlog For PM**

- `Epic 1: IA Simplification`
  - Story: canonicalize training routes
  - Story: collapse dashboard/progress/home semantics
  - Story: move library to secondary nav
  - Story: unify profile/account destinations
- `Epic 2: Today Core Loop`
  - Story: redesign Today to 3 actions max
  - Story: replace fake check-in shortcut with real mini flow
  - Story: add success returns to Today
- `Epic 3: Training Experience`
  - Story: week-first training hub
  - Story: single workout detail route
  - Story: polish focus logger with DS controls and accessibility
- `Epic 4: Nutrition Experience`
  - Story: today log-first nutrition page
  - Story: quick add / quick log flow
  - Story: define backend contract for persistent meal completion
- `Epic 5: Progress Simplification`
  - Story: split analysis tabs from capture actions
  - Story: simplify check-in entry
  - Story: better insight cards and weekly review handoff
- `Epic 6: Billing and Entitlements`
  - Story: module-based gating only
  - Story: purchase recovery / return-to-origin
  - Story: paywall copy/value cleanup
- `Epic 7: Design System Consolidation`
  - Story: unify primitives
  - Story: token alignment
  - Story: empty/error/loading standardization
- `Epic 8: Measurement and QA`
  - Story: implement core funnel analytics
  - Story: expand Playwright smoke coverage
  - Story: enforce route/entitlement regression checks

**PR Plan**

- `PR1` route inventory and canonical navigation cleanup behind safe redirects only
- `PR2` entitlement normalization and paywall return-to-origin plumbing
- `PR3` DS consolidation: states, tabs, sheet, focus shell
- `PR4` Today redesign with no fake check-in writes
- `PR5` Training hub and workout detail consolidation
- `PR6` Nutrition today-log redesign using only supported data
- `PR7` Progress simplification and weekly review integration
- `PR8` Profile/settings/billing polish and analytics/e2e hardening

**Acceptance Criteria**

- `IA`
  - One canonical route per core task
  - Bottom tabs match target IA
  - Legacy/alias routes redirect cleanly
- `Today`
  - Max 3 primary actions visible on mobile
  - No CTA creates fake health data
  - All actions return to Today with refreshed state
- `Training`
  - Week calendar is default landing
  - One dominant CTA per selected day
  - Focus logger hides global nav/tab bar
- `Nutrition`
  - Today log is primary
  - Weekly plan is secondary
  - No “logged/completed” state is shown unless backend can support it
- `Progress`
  - Capture and analysis are clearly separated
  - Empty/loading/error/success states are standardized
- `Billing`
  - Gating reads real entitlements only
  - Checkout returns to originating action
- `DS`
  - No new one-off primitives
  - Shared states and tokens used across all redesigned screens

**Test & QA Plan**

- CI gates
  - `npm run ci:typecheck`
  - `npm run ci:test`
  - `npm run ci:build`
  - `npm run ci:e2e:smoke`
- Web-specific checks
  - `npm --prefix apps/web run build`
  - `npm --prefix apps/web run typecheck`
  - `npm --prefix apps/web run test`
  - `npm --prefix apps/web run e2e -- e2e/library-smoke.spec.ts`
- Expand Playwright smoke beyond current files in `apps/web/e2e/*`
  - Auth -> onboarding -> Today
  - Today -> training start -> finish
  - Today -> billing gate -> checkout return path
  - Nutrition log happy path
  - Progress check-in happy path
- Add contract smoke for
  - `/api/auth/me`
  - `/api/billing/status`
  - `/api/training-plans/active`
  - `/api/nutrition-plans/assigned`
  - `/api/tracking`

**Risks & Dependencies**

- Contract gap: frontend gating should read module entitlements directly; current snapshot logic is too plan-centric.
- Contract gap: no durable backend meal-completion/logging model equivalent to the desired nutrition quick-log loop.
- Contract gap: no purchase return-to-origin support is visible in current billing flow.
- Data integrity risk: Today quick check-in currently pollutes tracking data.
- Visual confidence risk: this audit is code-based; screenshots of `/app/hoy`, `/app/entrenamiento`, `/app/nutricion`, `/app/seguimiento`, and `/app/settings/billing` would sharpen the polish audit, but the structural issues are already clear from code.

Do you want me to proceed with implementation (PR plan) or produce V0 wireframes first?
