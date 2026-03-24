# Tasks: Backend Decomposition + Design System Completion

## Phase 1: Auth Middleware Extraction

- [ ] 1.1 Create `apps/api/src/middleware/auth.ts` with `normalizeToken()` function — preserve workarounds for quoted tokens, percent-encoding, fallback to query param
- [ ] 1.2 Implement `requireUser(request)` in `middleware/auth.ts` — JWT validation, user lookup, blocked user check
- [ ] 1.3 Implement `requireAdmin(request)` in `middleware/auth.ts` — calls requireUser, checks role === "ADMIN"
- [ ] 1.4 Implement `isGlobalAdminUser(user)` in `middleware/auth.ts` — checks env.ADMIN_EMAILS
- [ ] 1.5 Export all auth middleware functions from `middleware/auth.ts` index
- [ ] 1.6 Run `npm run typecheck` to verify no TS errors
- **Test Strategy**: Manual test auth flows (signup → verify → login → logout) — ensure existing behavior preserved

---

## Phase 2: AppContext Definition

- [ ] 2.1 Create `apps/api/src/types/appContext.ts` with full typed interface (prisma, app, env, auth helpers, gym helpers, AI helpers, schemas, utils, enums)
- [ ] 2.2 Add AppContext type to existing extracted domains (gym, training, nutrition, ai, billing) — update their register functions to accept `ctx: AppContext` instead of deps object
- [ ] 2.3 Create `buildAppContext()` function in `index.ts` that constructs typed AppContext from dependency object
- [ ] 2.4 Run `npm run typecheck` — zero errors
- **Test Strategy**: Verify TypeScript compiles with AppContext in all existing domain modules

---

## Phase 3a: Extract Auth Domain Routes

- [ ] 3a.1 Create `apps/api/src/domains/auth/` directory structure
- [ ] 3a.2 Create `registerAuthRoutes.ts` entry point accepting `(app: FastifyInstance, ctx: AppContext)`
- [ ] 3a.3 Extract POST `/auth/signup` route from index.ts into `domains/auth/handlers/signup.ts`
- [ ] 3a.4 Extract POST `/auth/register` route from index.ts into `domains/auth/handlers/register.ts`
- [ ] 3a.5 Extract POST `/auth/login` route from index.ts into `domains/auth/handlers/login.ts`
- [ ] 3a.6 Extract POST `/auth/logout` route from index.ts into `domains/auth/handlers/logout.ts`
- [ ] 3a.7 Extract POST `/auth/verify-email` route from index.ts into `domains/auth/handlers/verifyEmail.ts`
- [ ] 3a.8 Extract GET `/auth/me` route from index.ts into `domains/auth/handlers/me.ts`
- [ ] 3a.9 Extract POST `/auth/google` (start/callback) routes from index.ts into `domains/auth/handlers/googleOAuth.ts`
- [ ] 3a.10 Extract POST `/auth/forgot-password` and POST `/auth/reset-password` routes from index.ts
- [ ] 3a.11 Extract auth-specific Zod schemas to `domains/auth/schemas.ts`
- [ ] 3a.12 Wire `registerAuthRoutes(app, ctx)` in index.ts
- [ ] 3a.13 Run `npm run test:contract` — all auth route tests pass
- **Test Strategy**: Run contract tests after extraction — verify all 13 auth routes work identically

---

## Phase 3b: Extract Profile Domain Routes

- [ ] 3b.1 Create `apps/api/src/domains/profile/` directory
- [ ] 3b.2 Create `registerProfileRoutes.ts` entry point
- [ ] 3b.3 Extract GET `/profile` route from index.ts into `domains/profile/`
- [ ] 3b.4 Extract PUT `/profile` route from index.ts into `domains/profile/`
- [ ] 3b.5 Wire `registerProfileRoutes(app, ctx)` in index.ts
- [ ] 3b.6 Run `npm run test:contract` — profile route tests pass
- **Test Strategy**: Run contract tests — verify GET/PUT /profile works

---

## Phase 3c: Extract Tracking Domain Routes

- [ ] 3c.1 Create `apps/api/src/domains/tracking/` directory
- [ ] 3c.2 Create `registerTrackingRoutes.ts` entry point
- [ ] 3c.3 Extract GET `/tracking` route from index.ts into `domains/tracking/`
- [ ] 3c.4 Extract PUT `/tracking` route from index.ts into `domains/tracking/`
- [ ] 3c.5 Extract POST `/tracking` route from index.ts into `domains/tracking/`
- [ ] 3c.6 Extract DELETE `/tracking/:collection/:id` route from index.ts into `domains/tracking/`
- [ ] 3c.7 Wire `registerTrackingRoutes(app, ctx)` in index.ts
- [ ] 3c.8 Run `npm run test:contract` — tracking route tests pass
- **Test Strategy**: Run contract tests — verify all 4 tracking CRUD operations work

---

## Phase 3d: Extract Feed Domain Routes

- [ ] 3d.1 Create `apps/api/src/domains/feed/` directory
- [ ] 3d.2 Create `registerFeedRoutes.ts` entry point
- [ ] 3d.3 Extract GET `/feed` route from index.ts into `domains/feed/`
- [ ] 3d.4 Extract POST `/feed/generate` route from index.ts into `domains/feed/`
- [ ] 3d.5 Wire `registerFeedRoutes(app, ctx)` in index.ts
- [ ] 3d.6 Run `npm run test:contract` — feed route tests pass
- **Test Strategy**: Run contract tests — verify GET/POST /feed work

---

## Phase 3e: Merge Gym Routes into domains/gym/

- [ ] 3e.1 Review existing `domains/gym/` structure
- [ ] 3e.2 Extract remaining gym routes from index.ts into `domains/gym/registerGymRoutes.ts` (GET /gyms, POST /gyms/join, POST /gyms/join-by-code, GET /gyms/membership, DELETE /gyms/membership)
- [ ] 3e.3 Merge admin gym routes (from index.ts lines ~8072-8480) into `domains/admin/registerAdminRoutes.ts`
- [ ] 3e.4 Run `npm run test:contract` — all gym route tests pass
- **Test Strategy**: Run contract tests — verify gym membership and join flows work

---

## Phase 3f: Extract Admin Domain Routes

- [ ] 3f.1 Create `apps/api/src/domains/admin/` directory
- [ ] 3f.2 Create `registerAdminRoutes.ts` entry point
- [ ] 3f.3 Extract GET `/admin/users`, POST `/admin/users` from index.ts
- [ ] 3f.4 Extract DELETE `/admin/users/:id` from index.ts
- [ ] 3f.5 Extract PATCH `/admin/users/:id/plan`, PATCH `/admin/users/:id/tokens` from index.ts
- [ ] 3f.6 Extract admin user action routes (verify-email, reset-password, block, unblock, tokens-allowance, tokens/add, tokens/balance)
- [ ] 3f.7 Extract GET `/admin/gyms`, POST `/admin/gyms`, DELETE `/admin/gyms/:gymId`
- [ ] 3f.8 Extract admin gym-join-requests routes (GET, accept, reject)
- [ ] 3f.9 Extract admin gym-members routes (GET members, PATCH role)
- [ ] 3f.10 Wire `registerAdminRoutes(app, ctx)` in index.ts
- [ ] 3f.11 Run `npm run test:contract` — all admin route tests pass
- **Test Strategy**: Run contract tests — verify admin CRUD operations for users and gyms

---

## Phase 3g: Merge Trainer Routes into domains/trainer/

- [ ] 3g.1 Review existing `domains/trainer/` structure
- [ ] 3g.2 Extract remaining trainer routes from index.ts into `domains/trainer/registerTrainerRoutes.ts`:
  - GET/POST /trainer/plans, GET/PATCH/DELETE /trainer/plans/:planId
  - DELETE /trainer/plans/:planId/days/:dayId
  - POST /trainer/plans/:planId/days/:dayId/exercises
  - PATCH/DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId
  - GET /trainer/nutrition-plans, POST /trainer/nutrition-plans, GET/PATCH /trainer/nutrition-plans/:id
  - POST /trainer/clients/:userId/assigned-plan, GET/DELETE /trainer/clients/:userId/assigned-plan
  - POST /trainer/clients/:userId/assigned-nutrition-plan
  - POST /trainer/members/:id/training-plan-assignment, DELETE /trainer/members/:id/training-plan-assignment
  - GET /trainer/clients, GET /trainer/clients/:userId, DELETE /trainer/clients/:userId
  - GET/POST /trainer/recipes, GET/PUT/DELETE /trainer/recipes/:id
  - GET /trainer/gym, PATCH /trainer/gym
- [ ] 3g.3 Run `npm run test:contract` — trainer route tests pass
- **Test Strategy**: Run contract tests — verify all trainer operations work

---

## Phase 3h: Extract Dev Domain Routes

- [ ] 3h.1 Create `apps/api/src/domains/dev/` directory
- [ ] 3h.2 Create `registerDevRoutes.ts` entry point
- [ ] 3h.3 Extract POST `/dev/seed-exercises` route from index.ts
- [ ] 3h.4 Extract POST `/dev/seed-recipes` route from index.ts
- [ ] 3h.5 Extract POST `/dev/reset-demo` route from index.ts
- [ ] 3h.6 Wire `registerDevRoutes(app, ctx)` in index.ts (only in non-production)
- [ ] 3h.7 Run `npm run test:contract` — dev routes tested
- **Test Strategy**: Verify seed and reset routes work in dev environment

---

## Phase 4: Stripe Types Extraction

- [ ] 4.1 Create `apps/api/src/domains/billing/stripe.ts` file
- [ ] 4.2 Extract Stripe interfaces from index.ts:137-200 to `domains/billing/stripe.ts`:
  - StripeCheckoutSession, StripePortalSession, StripeSubscription
  - StripeInvoiceLineItem, StripeInvoice, StripeSubscriptionList
  - StripeCustomer, StripeProduct, StripePrice, StripeInterval
- [ ] 4.3 Add helper functions: parseStripeAmount(), getStripePricePlanMap(), resolvePlanByPriceId()
- [ ] 4.4 Remove inline Stripe type definitions from index.ts
- [ ] 4.5 Import Stripe types from `domains/billing/stripe.ts` where needed
- [ ] 4.6 Run `npm run typecheck` — zero errors
- **Test Strategy**: Verify billing routes still compile and work — no runtime type errors

---

## Phase 5: Index.ts Cleanup

- [ ] 5.1 Remove all inline route handlers from `apps/api/src/index.ts`
- [ ] 5.2 Keep only: imports, Fastify setup, plugin registration, AppContext building, domain registration calls, server start
- [ ] 5.3 Verify index.ts line count < 500 (including blank lines and comments)
- [ ] 5.4 Run `npm run test:contract` — all 87+ routes pass
- [ ] 5.5 Run `npm run typecheck` — zero errors
- [ ] 5.6 Run `npm run lint` — zero errors
- **Test Strategy**: Full contract test suite passes, verify all 87 routes respond correctly

---

## Phase 6: Design System Components — Tabs

- [ ] 6.1 Create `apps/web/src/design-system/components/Tabs/` directory
- [ ] 6.2 Implement `Tabs.tsx` — controlled/uncontrolled mode, orientation prop
- [ ] 6.3 Implement `TabsList.tsx` — tab list container with aria-label
- [ ] 6.4 Implement `TabsTrigger.tsx` — individual tab buttons with keyboard navigation
- [ ] 6.5 Implement `TabsContent.tsx` — panel content, forceMount support
- [ ] 6.6 Create `Tabs.module.css` with `--theme-*` variables
- [ ] 6.7 Create `index.ts` exports
- [ ] 6.8 Add keyboard navigation: ArrowRight/ArrowLeft (horizontal), ArrowUp/ArrowDown (vertical), Home/End, Enter/Space
- [ ] 6.9 Implement ARIA roles: tablist, tab, tabpanel, aria-selected, aria-labelledby
- [ ] 6.10 Add stories to `stories/Tabs.stories.tsx` — default, controlled, uncontrolled, disabled, keyboard navigation
- **Test Strategy**: Write unit tests for controlled/uncontrolled modes, keyboard nav, accessibility verification

---

## Phase 7: Design System Components — Select

- [ ] 7.1 Create `apps/web/src/design-system/components/Select/` directory
- [ ] 7.2 Implement `Select.tsx` — controlled/uncontrolled, placeholder, disabled
- [ ] 7.3 Implement `SelectTrigger.tsx` — combobox trigger element
- [ ] 7.4 Implement `SelectContent.tsx` — popper/listbox positioning, searchable input
- [ ] 7.5 Implement `SelectItem.tsx` — individual options with aria-selected
- [ ] 7.6 Implement `SelectGroup.tsx`, `SelectLabel.tsx`, `SelectSeparator.tsx`
- [ ] 7.7 Create `Select.module.css` with `--theme-*` variables
- [ ] 7.8 Implement searchable filtering (case-insensitive)
- [ ] 7.9 Implement keyboard navigation: ArrowUp/ArrowDown, Enter to select, Escape to close
- [ ] 7.10 Add clearable prop support
- [ ] 7.11 Add stories to `stories/Select.stories.tsx` — default, searchable, clearable, disabled, grouped
- **Test Strategy**: Write unit tests for searchable filter, keyboard navigation, controlled/uncontrolled

---

## Phase 8: Design System Components — BottomSheet

- [ ] 8.1 Create `apps/web/src/design-system/components/BottomSheet/` directory
- [ ] 8.2 Implement `BottomSheet.tsx` — open/onClose, title, className
- [ ] 8.3 Implement `BottomSheetOverlay.tsx` — dismissOnOverlay click handler
- [ ] 8.4 Implement `BottomSheetContent.tsx` — snap points, swipe-to-dismiss
- [ ] 8.5 Implement `BottomSheetHandle.tsx` — drag handle visual
- [ ] 8.6 Create `BottomSheet.module.css` — mobile-first styling, full-width on mobile, max-width 480px on desktop
- [ ] 8.7 Implement touch gesture handling: swipe down past 50% threshold dismisses
- [ ] 8.8 Implement snap points animation (0.25, 0.5, 0.9 fractions)
- [ ] 8.9 Add dismissOnEsc keyboard support
- [ ] 8.10 Implement focus trap for accessibility
- [ ] 8.11 Add ARIA: role="dialog", aria-modal="true"
- [ ] 8.12 Add stories to `stories/BottomSheet.stories.tsx` — default, snap points, swipe dismiss, mobile/desktop
- **Test Strategy**: Write unit tests for swipe gesture, snap points, focus trap, keyboard dismiss

---

## Phase 9: Design System Components — DateRangePicker

- [ ] 9.1 Create `apps/web/src/design-system/components/DateRangePicker/` directory
- [ ] 9.2 Implement `DateRangePicker.tsx` — controlled startDate/endDate, onRangeChange
- [ ] 9.3 Implement `DateRangePickerTrigger.tsx` — opens picker, shows selected range
- [ ] 9.4 Implement `DateRangePickerContent.tsx` — dialog container
- [ ] 9.5 Implement `Calendar.tsx` — month grid rendering
- [ ] 9.6 Implement `CalendarDay.tsx` — individual day cells
- [ ] 9.7 Implement `CalendarHeader.tsx` — month/year navigation
- [ ] 9.8 Implement `PresetMenu.tsx` — preset date range buttons
- [ ] 9.9 Create `DateRangePicker.module.css` with `--theme-*` variables
- [ ] 9.10 Implement two-month view (numberOfMonths prop: 1 or 2)
- [ ] 9.11 Implement range selection: click start, click end to complete range
- [ ] 9.12 Implement preset ranges: "Last 7 days", "Last 30 days", "This month", etc.
- [ ] 9.13 Implement keyboard navigation: Arrow keys move focus, Enter selects
- [ ] 9.14 Add ARIA: role="grid", role="gridcell", aria-selected, aria-live for month heading
- [ ] 9.15 Add minDate/maxDate constraints
- [ ] 9.16 Add stories to `stories/DateRangePicker.stories.tsx` — default, two-month, presets, keyboard, disabled
- **Test Strategy**: Write unit tests for range selection, presets, keyboard nav, two-month view

---

## Phase 10: CSS Variable Consolidation

- [ ] 10.1 Audit all CSS variable usages: grep for `--fs-*`, `--dni-*`, `--brand-*` across codebase
- [ ] 10.2 Create mapping table: each old variable → canonical `--theme-*` name
- [ ] 10.3 Create `apps/web/src/design-system/variables.css` with new canonical `--theme-*` variables
- [ ] 10.4 Add backward compatibility aliases: `--fs-*` → `var(--theme-*)`, etc.
- [ ] 10.5 Update `apps/web/src/design-system/tokens.ts` to reference new `--theme-*` namespace
- [ ] 10.6 Test dark/light theme switching with backward-compat aliases
- [ ] 10.7 Replace CSS usages incrementally (per-component during design system work)
- [ ] 10.8 Verify: grep for old namespaces returns zero results in source files
- **Test Strategy**: Visual regression check on light/dark themes, verify all old references resolve via aliases

---

## Phase 11: Storybook Setup

- [ ] 11.1 Install Storybook dependencies: `@storybook/react-vite`, `@storybook/addon-*`
- [ ] 11.2 Create `.storybook/main.ts` — configure framework, addons, stories glob
- [ ] 11.3 Create `.storybook/preview.ts` — global decorators, parameters, theme setup
- [ ] 11.4 Create `.storybook/theme.ts` — FitSculpt branded theme
- [ ] 11.5 Run `npx storybook dev` — verify builds without errors on port 6006
- [ ] 11.6 Add stories for existing components: Button, Modal, Input, Card, DropdownMenu, SegmentedControl
- [ ] 11.7 Add stories for new components (from Phases 6-9): Tabs, Select, BottomSheet, DateRangePicker
- [ ] 11.8 Verify all stories render without console errors
- [ ] 11.9 Add `@storybook/addon-a11y` — verify accessibility addon works
- **Test Strategy**: Storybook builds, all stories render, no console errors, a11y addon reports issues

---

## Implementation Order

**Sprint 5 (Backend Decomposition) — sequential, contract tests after each phase:**

1. Phase 1 → Phase 2 → Phase 3a → 3b → 3c → 3d → 3e → 3f → 3g → 3h → Phase 4 → Phase 5
2. Each domain extraction (3a-3h) is atomic: extract routes → run contract tests → commit
3. Never extract two domains simultaneously

**Sprint 6 (Design System) — can be parallelized somewhat:**

1. Phase 6-9: Components can be built in parallel by different developers
2. Phase 10: CSS consolidation happens alongside component build (each component uses `--theme-*`)
3. Phase 11: Storybook setup (prerequisite: components exist)

**Recommended Start:**
- Begin Phase 1 (auth middleware) first — all other phases depend on it
- AppContext (Phase 2) should complete before domain extractions (Phase 3a-h)
