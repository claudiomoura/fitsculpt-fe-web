# Design: Adaptive Differentiation

This design covers three sprints: training-v2 pipeline completion, adaptive nutrition engine, and future self visualization v2.

## Technical Approach

### Sprint 7: Training-v2 Pipeline Completion

The training-v2 pipeline follows a modular, deterministic approach: resolve context → select candidates → build day skeletons → AI select → prescribe → validate → cache. This reduces token cost by limiting AI to exercise selection from a pre-filtered pool rather than generating full plans from scratch.

### Sprint 8: Adaptive Nutrition Engine

The nutrition engine builds on existing meal logging data (Sprint 2) to compute adherence scores. When users accept weekly review recommendations, the system auto-regenerates nutrition plans with proportional macro redistribution. All adjustments are progressive (max 10%/week) and respect minimum logging thresholds (3 days).

### Sprint 9: Future Self Visualization v2

Extends the deterministic projection engine with body composition modeling (lean mass vs fat mass), replaces text output with interactive recharts, and migrates RCT data from JSON blob to indexed tables.

---

## Architecture Decisions

### Decision: v2 endpoint wraps v1 as fallback
**Choice**: `POST /ai/training-plan/v2/generate` catches all errors and returns v1 result with `mode: "FALLBACK"`.
**Alternatives considered**: Separate feature flag, version header.
**Rationale**: Safe rollout without regression. Users receive valid plans even if v2 pipeline fails.

### Decision: 28-day adherence scoring window
**Choice**: Nutrition adherence uses 28-day rolling window with three weighted components.
**Alternatives considered**: 7-day window (too volatile), 90-day window (too slow to respond).
**Rationale**: 28 days captures weekly patterns while remaining responsive to behavior changes. Weighting (50% meal logging, 30% calorie consistency, 20% macro logging) reflects data quality priorities.

### Decision: Progressive adjustment cap at 10%/week
**Choice**: Auto-adjustments clamp to maximum 10% change per week from original baseline.
**Alternatives considered**: No cap (risky), fixed absolute values (not personalized).
**Rationale**: Prevents drastic swings while allowing cumulative adjustment over time. Cumulative cap ensures total change from baseline never exceeds 10%.

### Decision: Body composition model adds lean mass estimation
**Choice**: Extend `FutureProjectionHorizon` with `bodyComposition` block rather than replacing existing weight projection.
**Alternatives considered**: Replace weight projection entirely, separate endpoint.
**Rationale**: Non-breaking. Existing consumers continue working. New consumers opt into body composition data.

### Decision: RCT migration via batch script
**Choice**: One-time migration script converts JSON blob to indexed tables; original blob preserved for rollback.
**Alternatives considered**: Real-time migration on read, dual-write.
**Rationale**: Simpler. JSON blob is read-only after migration. Dual-write adds complexity.

---

## File Changes

### Sprint 7: Training-v2 Pipeline

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/ai/training-plan/contextResolver.ts` | Modify | Replace stub at line 251 with real import. Import `requireCompleteProfile` from `../../index.js`. |
| `apps/api/src/ai/training-plan/candidateSelector.ts` | Modify | Add muscle group mapping from day focus. Map `full`→all, `upper`→upper muscle groups, `lower`→lower muscle groups, `push`→chest/shoulders/triceps, `pull`→back/biceps, `legs`→quads/hamstrings/glutes. Pass filter to Prisma `where.mainMuscleGroup` when focus is not `full`. |
| `apps/api/src/ai/training-plan/__tests__/contextResolver.test.ts` | Create | Unit test: valid profile returns UserContext, incomplete profile throws 409 PROFILE_INCOMPLETE. |
| `apps/api/src/ai/training-plan/__tests__/candidateSelector.test.ts` | Create | Unit test: equipment filter works, muscle group filter maps focus correctly. |
| `apps/api/src/ai/training-plan/__tests__/daySkeletonBuilder.test.ts` | Create | Unit test: builds correct skeleton for each focus type. |
| `apps/api/src/ai/training-plan/__tests__/prescriptionEngine.test.ts` | Create | Unit test: beginner/intermediate/advanced produce correct sets/reps ranges. |
| `apps/api/src/ai/training-plan/__tests__/validatorRepair.test.ts` | Create | Unit test: null exerciseId replaced from same muscle group candidates. |
| `apps/api/src/ai/training-plan/__tests__/pipeline.integration.test.ts` | Create | Integration test: full pipeline with mocked Prisma and OpenAI. Tests success path and AI failure fallback. |
| `apps/api/src/domains/ai/registerAiRoutes.ts` | Modify | Add new route `POST /ai/training-plan/v2/generate`. Register under existing AI route group. Wire `generateTrainingPlanV2` with try/catch fallback to v1. |
| `apps/api/src/ai/training-plan/__tests__/v2Contract.test.ts` | Create | Contract test: validate response shape matches `TrainingPlanV2Response` schema using Zod. |
| `apps/web/e2e/training-v2.spec.ts` | Create | E2E test (Playwright): authenticated user navigates to training page, selects v2, submits, verifies plan renders within 30s. |

### Sprint 8: Adaptive Nutrition

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/ai/nutrition/nutritionAdherenceScorer.ts` | Create | Compute 28-day adherence score. Export `computeNutritionAdherence(userId, days?)`. Returns `NutritionAdherenceResult`. Minimum 3-day threshold returns `{ score: 0, insufficientData: true }`. |
| `apps/api/src/ai/nutrition/macroRecalculator.ts` | Create | Proportional macro redistribution on calorie adjustment. Export `recalculateMacros(currentPlan, adjustmentPct, direction, userWeightKg)`. Enforce 1.6 g/kg protein floor. |
| `apps/api/src/ai/nutrition/__tests__/nutritionAdherenceScorer.test.ts` | Create | Unit test: perfect adherence ≥0.95, no logging = 0, partial logging in range 0.3-0.6. |
| `apps/api/src/ai/nutrition/__tests__/macroRecalculator.test.ts` | Create | Unit test: 5% increase redistributes proportionally, protein floor enforced. |
| `apps/api/src/services/weeklyReview.ts` | Modify | In `buildNutritionRecommendation`, after acceptance check, call `nutritionAdherenceScorer` and if eligible, trigger `macroRecalculator`. Add audit log entry to `userProfile.adaptiveEngine.nutritionAdjustments`. |
| `apps/api/src/domains/nutrition/registerNutritionRoutes.ts` | Create | Register `GET /nutrition/adherence-score` and `POST /nutrition/adjust`. Validate request schemas. |
| `apps/web/src/components/nutrition/AdherenceBadge.tsx` | Create | Display adherence score with color coding (green ≥0.7, yellow 0.4-0.69, red <0.4). |
| `apps/web/src/hooks/useNutritionAdherence.ts` | Create | Query `GET /nutrition/adherence-score` on mount, refetch after plan adjustment. |

### Sprint 9: Future Self Visualization v2

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/services/futureProjection.ts` | Modify | Add `buildBodyCompositionProjection(input: BodyCompositionInput): BodyCompositionResult`. Integrate into `buildFutureProjection` output. |
| `apps/api/src/services/futureProjection.ts` | Modify | Add `GET /projection/share-image` endpoint. Generate 1080x1080 PNG via `sharp`. Return image/png. |
| `apps/api/src/services/__tests__/futureProjection.test.ts` | Modify | Add tests for body composition model: bulk gains lean mass, cut preserves lean mass. |
| `apps/api/prisma/schema.prisma` | Modify | Add `RctEvent` and `RctMetricSnapshot` models with indexes. |
| `apps/api/src/db/rctMigrations.ts` | Create | One-time migration script: read JSON blob, insert to new tables, verify row count matches. Preserve original blob in `rct_backup` field. |
| `apps/api/src/services/rctDataStore.ts` | Create | Replace JSON blob reads with Prisma queries on new tables. Export `sendRctEvent`, `getLatestStoredMetric`, `summarizeRctEvents`. |
| `apps/web/src/components/future-projection/FutureProjectionPanel.tsx` | Modify | Replace text output with recharts `LineChart` for weight projection, `AreaChart` stacked for body composition. Add scenario toggle buttons. |
| `apps/web/src/components/future-projection/AdherenceSparkline.tsx` | Create | Mini sparkline showing 8-week adherence trend from `rct.metricsHistory`. |
| `apps/web/src/types/futureProjection.ts` | Modify | Add `bodyComposition` to `FutureProjectionHorizon` type. Add `BodyCompositionProjection` type. |
| `apps/web/e2e/future-projection.spec.ts` | Modify | Add tests for chart rendering, scenario toggle, share image endpoint. |

---

## Interfaces

### Training-v2 Pipeline

```typescript
// New: v2 endpoint response
interface TrainingPlanV2Response {
  planId: string;
  plan: {
    title?: string;
    notes?: string;
    days: Array<{
      label: string;
      exercises: Array<{
        exerciseId?: string | null;
        name: string;
        sets: number;
        reps: string;
        tempo?: string;
        rest?: number;
        imageUrl?: string;
      }>;
    }>;
  };
  mode: "AI" | "FALLBACK" | "CACHE";
  usage?: { totalTokens: number; promptTokens: number; completionTokens: number; };
  // ... existing billing fields
}
```

### Nutrition Adherence

```typescript
interface NutritionAdherenceResult {
  score: number; // 0-1, 3 decimal places
  period: { start: string; end: string }; // ISO dates
  loggedDays: number; // 0-28
  calorieConsistencyDays: number;
  macroLoggingDays: number;
  insufficientData: boolean;
  computedAt: string;
}

interface NutritionAdjustmentResult {
  ok: boolean;
  previousPlan: { dailyCalories: number };
  newPlan: { dailyCalories: number; planId: string };
  adjustmentApplied: { pct: number; clamped: boolean };
}
```

### Body Composition

```typescript
interface BodyCompositionInput {
  currentWeightKg: number;
  trainingVolumeScore: number; // 0-1 from workout frequency
  nutritionAdherenceScore: number; // 0-1
  goal: "cut" | "maintain" | "bulk";
  weeklyCaloriesDelta: number;
  horizonMonths: 3 | 6 | 12;
}

interface BodyCompositionProjection {
  currentLeanMassKg: number | null;
  currentFatMassKg: number | null;
  projectedLeanMassKg: { min: number; max: number; expected: number };
  projectedFatMassKg: { min: number; max: number; expected: number };
  projectedBodyFatPct: { min: number; max: number; expected: number };
}
```

---

## Data Flow

### Training-v2 Pipeline

```
Request (TrainingPlanGeneratePayload)
    │
    ▼
contextResolver.resolveUserContext()
    │ Validates profile completeness, merges payload/profile
    ▼
candidateSelector.selectCandidateExercises()
    │ Filters by equipment + muscle group from focus
    ▼
daySkeletonBuilder.buildDaySkeleton()
    │ Creates day slots based on focus/daysPerWeek
    ▼
aiSelector.selectExercisesWithAi()
    │ AI picks exerciseId from candidate list per slot
    ▼
prescriptionEngine.computePrescription()
    │ Maps level to sets/reps/rest/tempo
    ▼
validatorRepair.validateAndRepair()
    │ Replaces null exerciseId, logs warnings
    ▼
Cache (versioned key)
    ▼
Response (TrainingPlanV2Response)
```

### Adaptive Nutrition Flow

```
Weekly Review Decision (POST /review/weekly/decision)
    │
    ├─ decision === "accepted" && recommendation.type === "nutrition"
    │   ▼
    ▼
nutritionAdherenceScorer.computeNutritionAdherence()
    │ Returns score + sufficient data flag
    ▼
Check: score >= 0.5 && loggedDays >= 10
    │
    ├─ PASS → macroRecalculator.recalculateMacros()
    │   │ Enforces 10% cap, protein floor
    │   ▼
    │ Regenerate NutritionPlan
    │ ▼
    │ Audit log to userProfile.adaptiveEngine.nutritionAdjustments
    │
    └─ FAIL → No adjustment, log insufficient data
```

---

## Testing Strategy

### Unit Tests (per module)

| Module | Test File | Coverage |
|--------|-----------|----------|
| contextResolver | `__tests__/contextResolver.test.ts` | Valid profile → UserContext, incomplete → 409 PROFILE_INCOMPLETE, payload overrides profile, restrictions merge |
| candidateSelector | `__tests__/candidateSelector.test.ts` | Equipment filter (gym/home), muscle group filter from focus |
| daySkeletonBuilder | `__tests__/daySkeletonBuilder.test.ts` | Focus → correct day labels, daysPerWeek → correct count |
| prescriptionEngine | `__tests__/prescriptionEngine.test.ts` | Beginner/intermediate/advanced → correct sets/reps ranges |
| validatorRepair | `__tests__/validatorRepair.test.ts` | Null exerciseId → replaced, empty candidates → logged warning |
| nutritionAdherenceScorer | `__tests__/nutritionAdherenceScorer.test.ts` | Perfect ≥0.95, zero = 0, partial 0.3-0.6, insufficientData flag |
| macroRecalculator | `__tests__/macroRecalculator.test.ts` | 5% increase → proportional macros, protein floor enforced, 10% cap |
| futureProjection | `__tests__/futureProjection.test.ts` | Body composition: bulk → lean gain, cut → preserve lean |

### Integration Tests

- `pipeline.integration.test.ts`: Full v2 pipeline with mocked Prisma + OpenAI. Tests success path and AI failure → fallback.
- `weeklyReview.nutrition.integration.test.ts`: Accept nutrition recommendation → verify plan regenerated with adjusted macros.

### Contract Tests

- `v2Contract.test.ts`: Validate `TrainingPlanV2Response` matches Zod schema. Error responses include correct `PROFILE_INCOMPLETE` shape.
- `nutritionContract.test.ts`: `GET /nutrition/adherence-score` returns correct shape, `POST /nutrition/adjust` clamps to 10%.

### E2E Tests (Playwright)

- `training-v2.spec.ts`: Navigate → select v2 → submit → plan renders (≤30s).
- `future-projection.spec.ts`: Generate projection → verify chart renders → toggle scenario → share image endpoint returns 200.

### Performance Tests

- Token cost benchmark: Run same input through v1 and v2, assert v2 tokens ≤ 60% of v1.
- Latency benchmark: 100 consecutive v2 requests, assert p95 ≤ 8000ms.
- RCT query benchmark: Query new tables, assert ≤ 50ms vs JSON parse baseline.

---

## API Endpoints

### Sprint 7: Training-v2

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/ai/training-plan/v2/generate` | POST | Required | Same as v1 | 200: `TrainingPlanV2Response`, 409: `{ code: "PROFILE_INCOMPLETE", missingContext: string[] }`, 500: Falls back to v1 |

### Sprint 8: Adaptive Nutrition

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/nutrition/adherence-score` | GET | Required | Query: `days?: number` (default 28) | 200: `NutritionAdherenceResult` |
| `/nutrition/adjust` | POST | Required | Body: `{ adjustmentPct: number, direction: "increase" \| "decrease", reason: string }` | 200: `NutritionAdjustmentResult`, 404: `{ error: "NO_ACTIVE_PLAN" }` |

### Sprint 9: Future Self v2

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/projection/share-image` | GET | Required | Query: `horizon=3\|6\|12` | 200: `image/png` (1080x1080) |

---

## Rollback Plan

- **Sprint 7**: v2 endpoint wraps v1 as fallback. If v2 fails, disable `TRAINING_V2_ENABLED` env flag → all requests route to v1.
- **Sprint 8**: Auto-adjustment requires user acceptance. If adjustment produces bad results, set `NUTRITION_AUTO_ADJUST_ENABLED=false`. Manual adjustment flow remains intact.
- **Sprint 9**: Body composition model is additive to existing projection. Set `BODY_COMPOSITION_ENABLED=false` → existing weight-only projections continue. Chart rendering falls back to text on error.

---

## Dependencies

- Sprint 2 meal logging must be complete before Sprint 8 activates.
- Exercise catalog must have `mainMuscleGroup` populated for candidateSelector enhancement.
- `recharts` package must be added to `package.json` before Sprint 9 UI work.
- Prisma migration for RCT tables must run before Sprint 9 data migration.

---

## Open Questions

- [ ] How many candidates should candidateSelector return per day? (Currently 20, may need tuning based on token cost vs selection quality.)
- [ ] Should nutrition auto-adjustment require consecutive weeks of high adherence, or single-week threshold? (Spec uses single week ≥10 logged days, but team may prefer streak.)
- [ ] Share image: use server-side canvas (node-canvas) or sharp for image generation? (Sharp is simpler for text overlay.)
