# Proposal: Backend Decomposition + Design System Completion

## Intent

The FitSculpt API's `index.ts` has grown to 10,368 lines with 87 inline routes, making it a maintenance bottleneck that blocks parallel development. Meanwhile, the frontend design system has 4 missing components and fragmented CSS variable namespaces. This change decomposes the backend monolith into domain modules and completes the design system to unblock Sprint 5–6 work.

## Scope

### In Scope

**Sprint 5 — Backend Decomposition:**
- Extract all inline routes into 8 domain modules: `auth`, `profile`, `tracking`, `feed`, `gym`, `admin`, `trainer`, `dev`
- Introduce typed `AppContext` interface to replace the massive untyped `deps` object
- Extract Stripe types from `index.ts:137-200` into `domains/billing/stripe.ts`
- Extract auth middleware (`requireUser`, `requireAdmin`, `normalizeToken`) into `middleware/auth.ts`
- Target: `index.ts` reduced to < 500 lines (app setup, plugin registration, domain mounting only)
- Maintain all 37+ contract tests green throughout extraction

**Sprint 6 — Design System Completion:**
- Implement `Tabs` component (controlled/uncontrolled, keyboard navigation)
- Implement `Select` component (combobox, search/filter, accessible)
- Implement `BottomSheet` component (mobile-first, swipe-to-dismiss)
- Implement `DateRangePicker` component (calendar, two-month view, presets)
- Consolidate CSS variable namespaces (`--fs-*`, `--dni-*`, `--brand-*` → single namespace with `--theme-*` aliases)
- Add Storybook for component documentation

### Out of Scope
- Creating a shared types package (`packages/shared/`) — deferred to a follow-up change
- Changing the existing contract test infrastructure (`contractTestServer.ts` pattern)
- Removing or modifying already-extracted domain modules beyond DI pattern improvement
- Removing v1 endpoints or changing API contracts
- Visual regression testing (requires Storybook first)

## Approach

### Backend Extraction Strategy

1. **Phase 1 — Auth infrastructure**: Extract `normalizeToken`, `requireUser`, `requireAdmin` into `middleware/auth.ts`. This is the foundation all routes depend on.
2. **Phase 2 — Define `AppContext`**: Create a typed interface that replaces the ~100-property `deps` object. Each domain module receives `AppContext` instead of raw deps.
3. **Phase 3 — Domain extraction** (one domain at a time, contract tests green after each):
   - `auth` (signup, register, login, logout, verify-email, auth/me, Google OAuth, etc.)
   - `profile` (GET/PUT `/profile`)
   - `tracking` (GET/PUT/POST/DELETE `/tracking`)
   - `feed` (GET/POST `/feed`)
   - `gym` (join, join-by-code, membership, admin join requests)
   - `admin` (users CRUD, gyms CRUD, token management, block/unblock)
   - `trainer` (plans CRUD, clients, recipes, nutrition plans)
   - `dev` (seed-exercises, seed-recipes, reset-demo)
4. **Phase 4 — Stripe extraction**: Move types from inline definitions to `domains/billing/stripe.ts`, replace `stripeRequest<T>` wrapper with typed SDK or documented wrapper.
5. **Phase 5 — Cleanup**: `index.ts` should contain only Fastify setup, plugin registration, domain mounting, and server start.

### Design System Approach

1. Build each component following existing patterns in `apps/web/src/design-system/`
2. Use existing token files (`tokens.ts`, `typography.ts`, `spacing.ts`, `elevation.ts`, `motion.ts`, `layout.ts`)
3. CSS consolidation: audit all usages of `--brand-*`, `--fs-*`, `--dni-*`, create unified namespace, add `--theme-*` aliases for backward compat
4. Set up Storybook with existing components first, then add new ones

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/index.ts` | Modified | Reduced from ~10,368 to < 500 lines. Only setup, plugins, domain mounting. |
| `apps/api/src/middleware/auth.ts` | New | Extracted `normalizeToken`, `requireUser`, `requireAdmin` |
| `apps/api/src/domains/auth/` | New | Auth routes (signup, login, logout, verify, OAuth, etc.) |
| `apps/api/src/domains/profile/` | New | Profile GET/PUT routes |
| `apps/api/src/domains/tracking/` | New | Tracking CRUD routes |
| `apps/api/src/domains/feed/` | New | Feed GET/POST routes |
| `apps/api/src/domains/gym/` | Modified | Gym routes (join, membership, admin) — already partially extracted |
| `apps/api/src/domains/admin/` | New | Admin CRUD routes |
| `apps/api/src/domains/trainer/` | Modified | Trainer routes — already partially extracted |
| `apps/api/src/domains/dev/` | New | Dev/seed routes |
| `apps/api/src/domains/billing/stripe.ts` | Modified | Extracted Stripe types from inline definitions |
| `apps/api/src/types/appContext.ts` | New | Typed `AppContext` interface |
| `apps/web/src/design-system/components/Tabs/` | New | Tabs component |
| `apps/web/src/design-system/components/Select/` | New | Select/combobox component |
| `apps/web/src/design-system/components/BottomSheet/` | New | BottomSheet component |
| `apps/web/src/design-system/components/DateRangePicker/` | New | DateRangePicker component |
| `apps/web/src/design-system/tokens.ts` | Modified | Consolidated CSS variable namespace |
| `.storybook/` | New | Storybook configuration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing routes during extraction | High | Extract one domain at a time, run full contract test suite after each extraction. Never extract two domains simultaneously. |
| `deps` injection pattern is awkward and fragile | High | Replace with typed `AppContext` early (Phase 2). All subsequent extractions benefit. |
| CSS variable consolidation breaks theme switching | Medium | Audit all CSS variable usages before consolidation. Add `--theme-*` aliases as backward-compat layer. Test dark/light themes after each namespace change. |
| `normalizeToken` workarounds are fragile | Medium | Preserve all existing workarounds verbatim in extraction. Add regression tests for edge cases (quoted tokens, percent-encoding). |
| No shared types between frontend/backend | Low | Defer `packages/shared/` to follow-up. Current scope only improves backend internal typing. |
| Storybook setup conflicts with existing build | Low | Use `@storybook/react-vite` matching the project's Vite setup. |

## Rollback Plan

**Backend**: Each domain extraction is an atomic commit. If a domain extraction breaks contract tests, `git revert` the specific commit and re-extract after fixing. The original inline routes remain in git history.

**Design System**: New components are additive — removing them has zero impact on existing code. CSS consolidation can be reverted by restoring the original token files from git. Storybook config is isolated in `.storybook/` and can be deleted without side effects.

**Rollback command**: `git revert HEAD` (per extraction commit) or `git checkout main -- apps/api/src/index.ts` to restore the monolith.

## Dependencies

- All existing contract tests must pass before starting (`npm run test:contract` or equivalent)
- Fastify plugin system (@fastify/cors, @fastify/cookie, @fastify/jwt) — already installed
- Storybook dependencies need to be installed (`@storybook/react-vite`, addons)

## Success Criteria

- [ ] `apps/api/src/index.ts` is < 500 lines
- [ ] All 87 existing routes pass contract tests after extraction
- [ ] Each domain module has a clear file structure: `registerXxxRoutes.ts` + related handlers
- [ ] `AppContext` type replaces raw `deps` object across all domain modules
- [ ] Stripe types are extracted and typed (no inline type definitions)
- [ ] Auth middleware is centralized in `middleware/auth.ts`
- [ ] 4 new design system components (Tabs, Select, BottomSheet, DateRangePicker) are implemented
- [ ] CSS variables consolidated to single namespace with backward-compat aliases
- [ ] Storybook renders existing + new components
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
