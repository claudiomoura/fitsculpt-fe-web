# FitSculpt UI Visual Plan (P0/P1)

## Goal
Close the visual blockers identified in the second audit and align core screens (`Hoy`, `Entrenamiento`, `Nutricion`, `Seguimiento`) to a single premium visual language, mobile-first.

## P0 (Launch Blockers)

### P0.1 Remove duplicate nutrition header
- Problem: `Nutricion` rendered a top header card in `page.tsx` and another hero header in `NutritionPlanClient`.
- User impact: visual duplication, noisy hierarchy.
- Status: done.
- Files:
  - `apps/web/src/app/(app)/app/nutricion/page.tsx`

### P0.2 Normalize tracking design tokens
- Problem: tracking module used undefined variables (`--brand`, `--border-color`), producing inconsistent colors across themes.
- User impact: broken visual consistency, dark/light mismatch.
- Status: done.
- Files:
  - `apps/web/src/app/(app)/app/seguimiento/TrackingClient.module.css`

### P0.3 Align core content width anchors (Today/Tracking)
- Problem: `Hoy` had explicit centered width while `Seguimiento` had no equivalent shell constraint.
- User impact: screen-to-screen layout jumps.
- Status: done.
- Files:
  - `apps/web/src/app/globals.css`

### P0.4 Unify Today empty/error state surfaces
- Problem: `Hoy` empty/error states used hardcoded inline dark styling.
- User impact: components looked out of system, especially in light theme.
- Status: done.
- Files:
  - `apps/web/src/app/(app)/app/hoy/TodayEmptyState.tsx`
  - `apps/web/src/app/(app)/app/hoy/TodayErrorState.tsx`
  - `apps/web/src/app/globals.css`

### P0.5 Canonical route consistency on modal fallback
- Problem: modal fallback redirects still pointed to legacy aliases.
- User impact: inconsistent continuity and route perception.
- Status: done.
- Files:
  - `apps/web/src/app/(app)/app/seguimiento/@modal/(.)check-in/page.tsx`
  - `apps/web/src/app/(app)/app/hoy/WeeklyReviewModal.tsx`

## P1 (High-Impact Premium Upgrade)

### P1.1 Iconography consistency pass
- Replace unicode arrows/emoji controls with DS icons in core navigation/controls.
- Status: partially done (nutrition weekly calendar arrows migrated).
- Files touched:
  - `apps/web/src/components/nutrition/WeeklyCalendar.tsx`

### P1.2 Reduce visual redundancy in Entrenamiento insights
- Merge repeated "plan access" and duplicated KPI/insight cards into fewer sections.
- Status: pending.
- Target file:
  - `apps/web/src/app/(app)/app/entrenamiento/TrainingPlanClient.tsx`

### P1.3 State components parity in Tracking
- Replace ad-hoc muted/error text blocks with consistent `EmptyState`/`ErrorState`-style surfaces.
- Status: pending.
- Target files:
  - `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx`
  - `apps/web/src/app/(app)/app/seguimiento/TrackingClient.module.css`

### P1.4 Token-only dark mode cleanup
- Remove remaining inline hardcoded colors in premium modals and state cards.
- Status: pending.
- Target files:
  - `apps/web/src/app/(app)/app/hoy/StartWorkoutModal.tsx`
  - `apps/web/src/app/(app)/app/hoy/UpgradePaywallModal.tsx`
  - `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx`

## Acceptance Criteria
- Core pages keep the same visual anchor width behavior on mobile and desktop.
- No undefined token usage in core visual modules.
- No hardcoded dark-only panels in core user states.
- No duplicate page-level + hero-level title stacks in `Nutricion`.
- No unicode arrows in primary calendar navigation controls.
