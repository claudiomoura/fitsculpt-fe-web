# Proposal: Beta Close + Nutrition Durability

## Intent

FitSculpt is approaching beta closure with two critical gaps: (1) no unified smoke pipeline to validate the app end-to-end before shipping, and (2) nutrition meal logging uses fragile JSON blobs with no backend persistence, blocking multi-device durability. This change fixes both in two connected sprints.

## Scope

### In Scope

**Sprint 1 — Beta Close Smoke Gate**

- Create unified `smoke` npm script in `apps/web/package.json` that chains: `lint → typecheck → unit → e2e (core-loop + gym-nutrition-flow) → build`
- Fix `run-beta-smoke.mjs` to reference the actual spec paths used by the E2E suite
- Align `beta-readiness.md` spec path references with reality
- Run smoke to green 3x, fixing each failure
- Validate B2C checklist: login → plan visible → gating → AI flows
- Validate Gym checklist: 7-step flow
- Document smoke pack as a required CI gate

**Sprint 2 — Nutrition Meal Log Durability**

- Create dedicated `MealLog` Prisma model replacing JSON blob in `UserProfile.tracking`
- Create backend endpoints: `POST /meals/log`, `PATCH /meals/:id/complete`, `DELETE /meals/:id`
- Migrate `nutritionAdherence.ts` from localStorage + generic tracking to dedicated meal API
- Migrate `nutritionQuickFavorites.ts` from localStorage-only to backend persistence
- Add input validation: reject `weightKg <= 0 or > 500`; reject `energy === 0`
- Fix QuickLogHub: don't write zeroed body measurements when `latestCheckin` is null

### Out of Scope

- Full offline sync / conflict resolution (deferred to post-beta)
- Meal photo upload or OCR
- Nutrition plan generation from logged meals
- Historical data migration of existing JSON-blob meal logs (clean break)

## Approach

### Phase 1: Smoke Gate

1. Wire the `smoke` script in `apps/web/package.json` to run the existing tools in sequence: `npm run lint && npm run typecheck && npm run test && npx playwright test e2e/nutrition-checkin-core.spec.ts e2e/gym-nutrition-flow.spec.ts && npm run build`
2. Fix `run-beta-smoke.mjs` so its spec imports match the actual file paths
3. Update `beta-readiness.md` to reference the correct spec paths and checklist items
4. Run smoke iteratively until green 3 consecutive times
5. Add smoke as a required step in CI pipeline

### Phase 2: Meal Log Backend

1. Add `MealLog` model to `apps/api/prisma/schema.prisma` with fields: `id`, `userId`, `date`, `mealType`, `items` (Json), `completedAt`, `createdAt`, `updatedAt`
2. Generate Prisma migration
3. Implement `MealLogService` in `apps/api/src/meals/` with CRUD + complete
4. Register routes: `POST /meals/log`, `PATCH /meals/:id/complete`, `DELETE /meals/:id`
5. Update `apps/web/src/lib/nutritionAdherence.ts` to call new endpoints instead of `POST /tracking`
6. Update `apps/web/src/lib/nutritionQuickFavorites.ts` to persist favorites via a new endpoint or extend meal routes
7. Add validation in `apps/api/src/tracking/schemas.ts`: `weightKg` zod refinement (`>0 && <=500`), energy `>0`
8. Fix `QuickLogHub` component to skip zeroed measurements when `latestCheckin` is null

### Phase 3: Integration + Verification

1. Update smoke to cover the new meal endpoints
2. Verify multi-device: log meal on device A, confirm visible on device B
3. Run full smoke gate 3x green

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/package.json` | Modified | Add `smoke` npm script |
| `apps/web/scripts/run-beta-smoke.mjs` | Modified | Fix spec path references |
| `apps/web/e2e/nutrition-checkin-core.spec.ts` | Modified | Align with smoke script expectations |
| `apps/web/e2e/gym-nutrition-flow.spec.ts` | Referenced | Run as part of smoke gate |
| `beta-readiness.md` | Modified | Fix spec path references |
| `apps/api/prisma/schema.prisma` | Modified | Add `MealLog` model |
| `apps/api/prisma/migrations/` | New | Migration for MealLog |
| `apps/api/src/meals/` | New | MealLogService, controller, routes |
| `apps/api/src/tracking/schemas.ts` | Modified | Add weight/energy validation |
| `apps/api/src/tracking/service.ts` | Modified | Remove meal-log responsibility |
| `apps/web/src/lib/nutritionAdherence.ts` | Modified | Use new meal API |
| `apps/web/src/lib/nutritionQuickFavorites.ts` | Modified | Backend persistence |
| `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx` | Modified | Fix zeroed measurements |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend contract mismatches discovered during smoke escalate scope | Medium | Smoke-first approach catches mismatches early; fix iteratively |
| Prisma migration for MealLog needs careful data migration from JSON blob | Low | Out of scope — clean break, no migration of historical data |
| Multi-device sync race conditions on meal operations | Medium | Use optimistic locking with `updatedAt`; test explicitly in Phase 3 |
| Smoke gate takes too long for CI | Low | Playwright sharding; cache node_modules aggressively |
| `nutritionAdherence.ts` refactor breaks existing adherence calculations | Medium | Unit tests for adherence before refactor; smoke covers end-to-end |

## Rollback Plan

**Sprint 1 (Smoke):** Remove `smoke` script from `package.json`, revert `run-beta-smoke.mjs` and `beta-readiness.md` changes. No data impact.

**Sprint 2 (MealLog):** Revert Prisma migration (`npx prisma migrate reset`), revert `meals/` module and route registration, revert frontend changes to use `POST /tracking` with JSON blob. The old tracking flow still works — MealLog is additive until the old path is explicitly removed.

## Dependencies

- Prisma CLI available for migration generation
- Playwright installed for E2E smoke
- Existing test users/credentials for smoke auth flows
- CI pipeline access to add required gate

## Success Criteria

- [ ] `npm run smoke` passes green 3 consecutive times locally
- [ ] B2C checklist validated: login → plan visible → gating → AI flows
- [ ] Gym checklist validated: 7-step flow completes
- [ ] `MealLog` model exists in Prisma schema with migration applied
- [ ] `POST /meals/log`, `PATCH /meals/:id/complete`, `DELETE /meals/:id` endpoints return correct responses
- [ ] `nutritionAdherence.ts` uses new meal API (no `POST /tracking` with `collection: "mealLog"`)
- [ ] `nutritionQuickFavorites.ts` persists to backend (not localStorage-only)
- [ ] `weightKg <= 0` or `> 500` rejected with 400
- [ ] `energy === 0` rejected with 400
- [ ] QuickLogHub does not write `chestCm: 0, waistCm: 0` when latestCheckin is null
- [ ] Smoke gate runs in CI as required check
