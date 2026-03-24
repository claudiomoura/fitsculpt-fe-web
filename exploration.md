## Exploration: beta-close-nutrition

### 1. Smoke Beta Infrastructure (Sprint 1)

#### What Exists
- **`apps/web/scripts/run-beta-smoke.mjs`**: Runs 2 specs sequentially: `e2e/core-loop.spec.ts` + `e2e/nutrition-checkin-core.spec.ts` (+ optional `e2e/token-lifecycle.spec.ts` via env var).
- **`package.json ci:e2e:smoke`**: Runs `e2e/library-smoke.spec.ts` — **different spec** from the beta smoke.
- **`docs/beta-readiness.md`**: References `e2e/gym-nutrition-flow.spec.ts` as the smoke pack spec — **third different spec**.
- **`apps/web/playwright.config.ts`**: Proper Playwright config with global setup, auth state, web server.

#### What's Missing / Broken
- **Three disconnected smoke concepts**:
  1. `run-beta-smoke.mjs` → core-loop + nutrition-checkin (what devs actually run)
  2. `ci:e2e:smoke` → library-smoke only (what CI runs)
  3. `beta-readiness.md` → gym-nutrition-flow (documented but not automated)
- **`gym-nutrition-flow.spec.ts`** is the most comprehensive spec (manager creates plan → assigns → member sees it → navigates days) but is **not in the automated smoke pack**.
- **No `smoke` npm script** exists in `apps/web/package.json` — the `beta-readiness.md` says `pnpm --filter web smoke` should work but there's no script for it.
- The `core-loop.spec.ts` spec doesn't actually write anything (anti-regression only) — it verifies the check-in page opens but doesn't submit.
- The `nutrition-checkin-core.spec.ts` spec is minimal: checks if a plan exists or shows empty state, clicks a breakfast button if present, then navigates to check-in and submits.

#### Key Files
| File | Purpose |
|------|---------|
| `apps/web/scripts/run-beta-smoke.mjs` | Beta smoke runner |
| `apps/web/e2e/core-loop.spec.ts` | Core loop E2E (no writes) |
| `apps/web/e2e/nutrition-checkin-core.spec.ts` | Nutrition + checkin E2E |
| `apps/web/e2e/gym-nutrition-flow.spec.ts` | Full gym nutrition flow (not in smoke) |
| `apps/web/e2e/library-smoke.spec.ts` | Library smoke (CI smoke target) |
| `apps/web/playwright.config.ts` | Playwright config |
| `docs/beta-readiness.md` | Smoke pack documentation |
| `docs/beta-catalog-checklist.md` | Recipe catalog validation |

#### Recommendation
- Unify: create a single `smoke` script in `apps/web/package.json` that runs the actual beta smoke pack.
- Decide which specs constitute the beta smoke: `run-beta-smoke.mjs` approach (core-loop + nutrition-checkin) vs. `beta-readiness.md` approach (gym-nutrition-flow).
- If `gym-nutrition-flow` is needed for beta, add it to `run-beta-smoke.mjs` with a timeout guard.
- Update `beta-readiness.md` to match the actual smoke pack.

---

### 2. Nutrition Quick Log Current State (Sprint 2)

#### What Exists
- **`apps/web/src/lib/nutritionAdherence.ts`**: Custom hook `useNutritionAdherence` that:
  - Fetches from `/api/tracking` (which proxies to backend `GET /tracking`)
  - Builds a `store: Record<string, string[]>` mapping date → mealKey arrays from `tracking.mealLog`
  - `toggle()` does POST to `/api/tracking` (creates mealLog entry) or DELETE to `/api/tracking/mealLog/{id}`
  - Uses a custom `fs:nutrition-adherence-changed` window event for cross-tab sync
- **`apps/web/src/lib/nutritionQuickFavorites.ts`**: Device-local `localStorage` only, no backend persistence.
- **`apps/web/src/services/tracking.ts`**: Types for `MealLogEntry`, `CheckinEntry`, `FoodEntry`, `WorkoutEntry`.

#### Backend Storage
- **All tracking data lives in `UserProfile.tracking` as a JSON blob** — no dedicated MealLog table in Prisma.
- `apps/api/src/tracking/service.ts`: Normalizes and upserts tracking entries into the JSON blob.
- `apps/api/src/tracking/schemas.ts`: Zod schemas including `mealLogEntrySchema`.
- `apps/api/src/index.ts`:
  - `GET /tracking` → returns normalized snapshot
  - `POST /tracking` → validates `trackingEntryCreateSchema`, upserts into JSON blob
  - `DELETE /tracking/:collection/:id` → removes from JSON blob array

#### Data Flow
```
Frontend (nutritionAdherence.toggle)
  → POST /api/tracking { collection: "mealLog", item: { ... } }
    → BFF /api/tracking/route.ts (proxies to backend)
      → Backend POST /tracking (upserts into UserProfile.tracking JSON)
```

#### What's Missing
- **No dedicated meal completion endpoint** — meals are "completed" by adding a `mealLog` entry to the tracking JSON blob. There's no `POST /meals/:id/complete` style endpoint.
- **No nutrition adherence aggregation** — the frontend must fetch ALL tracking data and filter `mealLog` entries client-side.
- **nutritionQuickFavorites are device-local only** — they don't survive device changes or account recovery.
- **`readNutritionAdherenceStore`** returns an empty object `{}` (line 37) — it's a no-op stub, not reading from localStorage.

#### Key Files
| File | Purpose |
|------|---------|
| `apps/web/src/lib/nutritionAdherence.ts` | Frontend adherence hook + toggle logic |
| `apps/web/src/lib/nutritionQuickFavorites.ts` | Device-local favorites (localStorage) |
| `apps/web/src/services/tracking.ts` | Tracking types (MealLogEntry, etc.) |
| `apps/web/src/app/api/tracking/route.ts` | BFF proxy for tracking |
| `apps/web/src/app/api/tracking/[collection]/[id]/route.ts` | BFF DELETE proxy |
| `apps/api/src/tracking/schemas.ts` | Backend Zod schemas for tracking |
| `apps/api/src/tracking/service.ts` | Backend normalize + upsert logic |
| `apps/api/src/index.ts` (lines 6527-6639) | Backend tracking CRUD endpoints |

---

### 3. Data Integrity in Check-in

#### What Exists
- **Frontend validation** in `TrackingClient.tsx` (line 498-500): `weightKg` must be 30-250.
- **Backend schema** in `tracking/schemas.ts`: `weightKg: z.number()` — **no range validation**.
- **`normalizeCheckinEntry`** in `tracking/service.ts`: Uses `toNumber(entry.weightKg)` — returns 0 as fallback.
- **Quick weight log** in `QuickLogHub.tsx`: `checkinFromWeight()` copies body measurements from `latestCheckin` — if null, writes 0s.

#### Health Snapshot
- **`POST /api/tracking/health/snapshots`** → proxies to backend `POST /tracking/health/snapshots`.
- Backend stores passive health data in the same `UserProfile.tracking` JSON blob under `passiveData.snapshots`.
- Schema validates `steps`, `activeCalories`, `sleepHours`, etc. with proper nullable bounds.

#### What's Missing
- Backend `weightKg` has no min/max validation — could accept 0, negative, or impossibly large values.
- No server-side sanitization of checkin body measurements when the user submits from QuickLogHub (0 values from missing latestCheckin).
- The `checkinSchema` makes all body measurement fields required numbers (not nullable) — they default to 0 when absent.

#### Key Files
| File | Purpose |
|------|---------|
| `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx` | Check-in form + weightKg validation |
| `apps/web/src/components/quick-log/QuickLogHub.tsx` | Quick weight log (copies from latestCheckin) |
| `apps/api/src/tracking/schemas.ts` | `checkinSchema` (no range validation) |
| `apps/api/src/tracking/service.ts` | `normalizeCheckinEntry` (0 fallback) |
| `apps/api/src/routes/passiveHealth.ts` | Passive health snapshot routes |

---

### 4. BFF Contract Gaps

#### Expected (from `docs/contracts/BETA11_CRITICAL_ENDPOINTS.md`)
- `POST /api/ai/nutrition-plan/generate` ✅ exists
- `GET /api/ai/quota` ✅ exists
- `GET /api/billing/status` ✅ exists
- `GET /api/training-plans/active` ✅ exists

#### Existing BFF Routes (from `bff-endpoints.md`)
- `/api/nutrition-plans` (GET) ✅
- `/api/nutrition-plans/[id]` (GET) ✅
- `/api/nutrition-plans/assigned` (GET) ✅
- `/api/tracking` (GET, POST, PUT) ✅
- `/api/tracking/[collection]/[id]` (DELETE) ✅
- `/api/tracking/health` (GET, PUT) ✅
- `/api/tracking/health/snapshots` (POST) ✅
- `/api/user-foods` (GET, POST) ✅
- `/api/user-foods/[id]` (PUT, DELETE) ✅

#### What's Missing
- No BFF route for **nutrition adherence aggregation** (today's meals, adherence %).
- No BFF route for **meal completion** separate from the generic tracking POST.
- The `BETA11_CRITICAL_ENDPOINTS.md` doesn't cover tracking or nutrition plan CRUD endpoints — it only covers AI, billing, and training-plans/active.
- The contracts test `apps/web/src/test/betaCriticalBff.contract.test.ts` tests AI + billing endpoints but **not tracking endpoints**.

---

### 5. Existing Test Coverage

#### E2E Specs
| Spec | What it covers | In smoke pack? |
|------|---------------|----------------|
| `core-loop.spec.ts` | Login → Today → Check-in CTA opens (no writes) | ✅ beta smoke |
| `nutrition-checkin-core.spec.ts` | Nutrition plan exists/empty → log breakfast → checkin submit | ✅ beta smoke |
| `gym-nutrition-flow.spec.ts` | Manager creates + assigns plan → member sees + navigates days | ❌ not automated |
| `library-smoke.spec.ts` | Login → Library → exercise detail | ✅ CI smoke |
| `token-lifecycle.spec.ts` | AI token balance lifecycle | ❌ optional (env gated) |
| `gym-flow.spec.ts` | Gym join flow | ❌ not in smoke |

#### Unit Tests (Web)
| Test | Coverage |
|------|----------|
| `nutritionPlan.test.ts` | `normalizeNutritionPlan` day expansion |
| `nutritionPlanLibrary.test.ts` | Plan library selection logic |
| `nutritionPlanLibrarySelection.test.tsx` | Library selection UI |
| `nutritionPlanSelectionPropagation.test.tsx` | Plan selection propagation |
| `trackingProfessionalMetrics.test.ts` | Weight trend, weekly averages |

#### Unit Tests (API)
| Test | Coverage |
|------|----------|
| `tracking.write.contract.test.ts` | Tracking entry upsert + normalization |
| `nutritionVarietyGuardRegression.test.ts` | Nutrition plan variety guard |
| `nutritionRecipeIds.contract.test.ts` | Recipe ID resolution |
| `nutritionPlanRegression.contract.test.ts` | Plan regression |
| `nutritionRetry.test.ts` | Nutrition retry logic |
| `nutritionRecipeCatalog.test.ts` | Recipe catalog resolution |
| `nutritionMathValidation.test.ts` | Macro math validation |
| `gymNutritionRoutes.contract.test.ts` | Gym nutrition route existence |

#### What's Missing
- **No E2E test for quick meal logging** (the QuickLogHub component flow).
- **No E2E test for nutrition adherence toggle** (clicking a meal to mark as consumed).
- **No unit test for `nutritionAdherence.ts`** (the `buildNutritionAdherenceStoreFromMealLog` function and `toggle` logic).
- **No integration test for the full tracking write → read cycle** (POST mealLog → GET tracking → verify mealLog appears).
- **No test for `nutritionQuickFavorites.ts`** (localStorage persistence).

---

### 6. Prisma Models for Nutrition

#### Relevant Models
| Model | Purpose | Relational? |
|-------|---------|-------------|
| `NutritionPlan` | User's nutrition plan | ✅ Full table |
| `NutritionDay` | Day within a plan | ✅ FK to plan |
| `NutritionMeal` | Meal within a day | ✅ FK to day |
| `NutritionIngredient` | Ingredient in a meal | ✅ FK to meal |
| `UserFood` | Custom food items | ✅ Full table |
| `Recipe` | Recipe catalog | ✅ Full table |
| `RecipeIngredient` | Ingredient in recipe | ✅ FK to recipe |
| `UserProfile` | Profile + tracking blob | JSON `tracking` field |
| `GymMembership` | Has `assignedNutritionPlanId` | ✅ FK to NutritionPlan |

**Key observation**: Nutrition plans are fully relational, but **meal logging (adherence) has no dedicated table** — it's embedded in the `UserProfile.tracking` JSON blob.

---

### Summary: Risks and Gotchas

1. **Smoke pack is fragmented**: 3 different smoke concepts exist. CI runs a different spec than the beta smoke script, and the docs reference a third. This will cause confusion.

2. **No `weightKg` backend validation**: The backend accepts any number for weight, including 0 or negative. The frontend validates 30-250 but the API doesn't enforce it.

3. **JSON blob for tracking**: All tracking data lives in `UserProfile.tracking` JSON. This works for beta but will not scale for:
   - Querying (can't use SQL WHERE on JSON fields efficiently)
   - Concurrent writes (upserting entire blob)
   - Analytics (need to parse JSON for every aggregation)

4. **QuickFavorites are device-local only**: `nutritionQuickFavorites.ts` uses `localStorage` exclusively. Users lose favorites when switching devices.

5. **`readNutritionAdherenceStore` is a no-op**: Returns `{}` always. The hook only works via the `fetchTrackingSnapshot` async path.

6. **QuickLogHub `checkinFromWeight` writes 0s**: When `latestCheckin` is null, it writes `chestCm: 0`, `waistCm: 0`, etc. — potentially corrupting the checkin history with zeroed measurements.

7. **No dedicated meal completion API**: Meal "completion" is done by POSTing to the generic `/tracking` endpoint with a `mealLog` collection item. This is functionally correct but not discoverable.

8. **`gym-nutrition-flow.spec.ts` is the best E2E smoke** but isn't in any automated smoke pack — it requires two authenticated users (manager + member) and API calls.
