# Adaptive Differentiation — Full Specification

## Domain: Training-v2 Pipeline

### Requirement: contextResolver requireCompleteProfile

The `contextResolver.ts:251` stub SHALL be replaced with a real implementation that imports and calls `requireCompleteProfile` from the existing middleware. The function MUST validate that the user has age, sex, focus, equipment, sessionTime, and timeAvailableMinutes before proceeding.

#### Scenario: Incomplete profile blocks v2 generation

- GIVEN a user whose UserProfile is missing age
- WHEN `resolveUserContext` is called
- THEN the function SHALL throw a 409 `PROFILE_INCOMPLETE` error with `missingContext: ["age"]`

#### Scenario: Complete profile passes validation

- GIVEN a user whose UserProfile has all required fields (age, sex, focus, equipment, sessionTime, timeAvailableMinutes)
- WHEN `resolveUserContext` is called
- THEN the function SHALL return a valid `UserContext` object

#### Scenario: Payload fields override profile fields

- GIVEN a user whose profile has `focus: "full"`
- WHEN the request payload includes `focus: "ppl"`
- THEN the resolved context SHALL use `"ppl"` as the focus

#### Scenario: Combined restrictions merge sources

- GIVEN a user with `profile.notes: "bad knee"` and payload `injuries: "shoulder impingement"`
- WHEN `resolveUserContext` is called
- THEN the combined `restrictions` field SHALL contain both notes and injuries joined by `" | "`

---

### Requirement: candidateSelector muscle group filtering

The `candidateSelector.ts` SHALL map day focus/exercise category to muscle group filters and pass them to the Prisma query. The mapping MUST cover all three focus types: `full`, `upperLower`, and `ppl`.

#### Scenario: Upper/Lower focus filters by muscle groups

- GIVEN a day skeleton with `focus: "upper"`
- WHEN `selectCandidateExercises` is called
- THEN the Prisma query SHALL include a `mainMuscleGroup` filter matching: `"chest"`, `"back"`, `"shoulders"`, `"biceps"`, `"triceps"`, `"forearms"`

#### Scenario: PPL focus filters push/pull/legs

- GIVEN a day skeleton with `focus: "push"`
- WHEN `selectCandidateExercises` is called
- THEN the Prisma query SHALL include a `mainMuscleGroup` filter matching: `"chest"`, `"shoulders"`, `"triceps"`

#### Scenario: Full focus returns all muscle groups

- GIVEN a day skeleton with `focus: "full"`
- WHEN `selectCandidateExercises` is called
- THEN no muscle group filter SHALL be applied (all groups included)

#### Scenario: Empty candidates trigger catalog fallback

- GIVEN the Prisma query returns 0 exercises matching the equipment + muscle group filter
- WHEN `generateTrainingPlanV2` processes the result
- THEN the pipeline SHALL fall back to the full exercise catalog as candidate pool

---

### Requirement: training-v2 unit tests

Each pipeline module SHALL have dedicated unit tests. Modules: `contextResolver`, `candidateSelector`, `daySkeletonBuilder`, `aiSelector`, `prescriptionEngine`, `validatorRepair`.

#### Scenario: contextResolver unit test — valid profile

- GIVEN a mocked Prisma UserProfile with complete fields
- WHEN `resolveUserContext` is called with minimal payload
- THEN it SHALL return a `UserContext` with all required fields populated from profile

#### Scenario: candidateSelector unit test — equipment filtering

- GIVEN a mocked Prisma with exercises for "gym" and "home" equipment
- WHEN `selectCandidateExercises` is called with `context.equipment = "gym"`
- THEN only gym and null-equipment exercises SHALL be returned

#### Scenario: prescriptionEngine unit test — experience level

- GIVEN user context with `level: "beginner"` and `focus: "full"`
- WHEN `computePrescriptionFromContext` is called
- THEN the prescription SHALL return sets in range 2-3, reps in range 10-15

#### Scenario: validatorRepair unit test — missing exercise

- GIVEN a day with one exercise selection that has `exerciseId: null`
- WHEN `validateAndRepairDay` is called
- THEN it SHALL replace the null exercise with a candidate from the same muscle group

---

### Requirement: training-v2 integration test

The full pipeline SHALL be tested end-to-end from `generateTrainingPlanV2` input to output, using a mocked Prisma and mocked `callOpenAi`.

#### Scenario: Full pipeline with AI selection

- GIVEN a valid user request and mocked AI returning 5 exercises per day
- WHEN `generateTrainingPlanV2` is called
- THEN the output plan SHALL contain exactly `daysPerWeek` days, each with exercises, prescriptions, and valid exercise IDs

#### Scenario: Full pipeline with AI failure fallback

- GIVEN a valid user request and mocked `callOpenAi` throwing an error
- WHEN `generateTrainingPlanV2` is called
- THEN the output SHALL still produce a valid plan via the local fallback selector with `mode: "FALLBACK"`

---

### Requirement: training-v2 contract test

The v2 endpoint response shape SHALL be validated against a Zod schema that matches `TrainingPlanV2Response`.

#### Scenario: Successful response shape validation

- GIVEN a successful v2 generation
- WHEN the endpoint returns 200
- THEN the response body SHALL match the `TrainingPlanV2Response` schema with `plan.days[].exercises[].sets` as number, `reps` as string, `tempo` as string

#### Scenario: Error response shape validation

- GIVEN an incomplete profile
- WHEN the endpoint returns 409
- THEN the response body SHALL include `{ code: "PROFILE_INCOMPLETE", missingContext: string[] }`

---

### Requirement: training-v2 E2E test

A Playwright E2E test SHALL cover the user flow: navigate to training generation → select v2 option → submit → verify plan renders.

#### Scenario: User generates v2 plan

- GIVEN an authenticated user with complete profile
- WHEN they navigate to the training plan page and select "Generate v2"
- THEN a plan SHALL appear within 30 seconds with at least one day containing exercises

---

### Requirement: v2 endpoint registration

A new route `POST /ai/training-plan/v2/generate` SHALL be registered in `registerAiRoutes.ts`. It SHALL accept the same request schema as v1 and return `TrainingPlanV2Response`.

#### Scenario: v2 endpoint succeeds

- GIVEN a valid request body and authenticated user with complete profile
- WHEN `POST /ai/training-plan/v2/generate` is called
- THEN the response SHALL be 200 with `{ plan, mode, usage, planId }`

#### Scenario: v2 endpoint falls back to v1

- GIVEN a v2 generation that throws an unhandled error
- WHEN `POST /ai/training-plan/v2/generate` is called
- THEN the endpoint SHALL log the error and return the v1 plan with `mode: "FALLBACK"`

#### Scenario: v2 endpoint rejects unauthorized

- GIVEN no authentication cookie or token
- WHEN `POST /ai/training-plan/v2/generate` is called
- THEN the response SHALL be 401

---

### Requirement: training-v2 performance — token cost reduction

The v2 pipeline SHALL reduce AI token consumption by 40-60% compared to v1. Token cost SHALL be measured as `totalTokens` from OpenAI usage.

#### Scenario: Token cost comparison benchmark

- GIVEN the same user input processed by both v1 and v2
- WHEN `usage.totalTokens` is compared
- THEN v2's total tokens SHALL be ≤ 60% of v1's total tokens

#### Scenario: v2 latency target

- GIVEN a valid v2 request
- WHEN the endpoint processes the request
- THEN the response SHALL complete within 8 seconds (p95)

---

### Requirement: v2 fallback to v1 on failure

When any step of the v2 pipeline throws an unhandled error, the system SHALL automatically fall back to the v1 generation path.

#### Scenario: contextResolver throws → v1 fallback

- GIVEN `resolveUserContext` throws an error
- WHEN `generateTrainingPlanV2` catches the error
- THEN the system SHALL call the existing v1 training plan generation and return the result with `mode: "FALLBACK"`

#### Scenario: aiSelector fails for all days → v1 fallback

- GIVEN `selectExercisesWithAi` returns empty selections for every day and the local fallback also returns empty
- WHEN `generateTrainingPlanV2` completes
- THEN the system SHALL call v1 generation as final fallback

#### Scenario: v2 timeout → v1 fallback

- GIVEN the v2 pipeline exceeds 10 seconds total execution time
- WHEN the timeout fires
- THEN the system SHALL abort v2 and return the v1 result

---

## Domain: Adaptive Nutrition Engine

### Requirement: nutritionAdherenceScorer — 28-day scoring algorithm

A new module `nutritionAdherenceScorer.ts` SHALL compute a 0-1 adherence score based on the user's meal logging consistency over the past 28 days.

**Algorithm:**
- `loggedDays` = count of unique days in `[mealLog, foodLog]` within last 28 days
- `mealLoggingScore` = `loggedDays / 28` (clamped 0-1)
- `calorieConsistencyScore` = proportion of days where logged calories fall within ±20% of the user's plan `dailyCalories` (0 if no plan)
- `macroLoggingScore` = proportion of days where at least 2 of {protein, carbs, fat} were logged
- `adherenceScore` = `mealLoggingScore * 0.5 + calorieConsistencyScore * 0.3 + macroLoggingScore * 0.2`

#### Scenario: Perfect adherence

- GIVEN a user who logged meals all 28 days with calories within ±20% of plan and full macros
- WHEN `computeNutritionAdherence` is called
- THEN the score SHALL be ≥ 0.95

#### Scenario: No logging → zero score

- GIVEN a user with zero meal log entries in the past 28 days
- WHEN `computeNutritionAdherence` is called
- THEN the score SHALL be 0.0

#### Scenario: Partial logging

- GIVEN a user who logged 14 of 28 days, 10 within calorie range, 8 with full macros
- WHEN `computeNutritionAdherence` is called
- THEN the score SHALL be between 0.3 and 0.6

#### Scenario: Minimum data threshold

- GIVEN a user with fewer than 3 logged days in the past 28 days
- WHEN `computeNutritionAdherence` is called
- THEN it SHALL return `{ score: 0, insufficientData: true }` and no auto-adjustment SHALL trigger

---

### Requirement: nutritionAdherenceScorer output format

The scorer SHALL return a typed result.

**Output type:**
```typescript
type NutritionAdherenceResult = {
  score: number;           // 0-1, rounded to 3 decimal places
  period: { start: string; end: string }; // ISO dates
  loggedDays: number;      // 0-28
  calorieConsistencyDays: number;
  macroLoggingDays: number;
  insufficientData: boolean; // true if loggedDays < 3
  computedAt: string;      // ISO datetime
};
```

#### Scenario: Output shape validation

- GIVEN a valid adherence computation
- WHEN the result is returned
- THEN it SHALL match the `NutritionAdherenceResult` type with `score` between 0 and 1, `loggedDays` between 0 and 28

---

### Requirement: auto-adjustment trigger

The system SHALL trigger automatic nutrition plan adjustment when ALL of the following are true:
1. `adherenceScore >= 0.5` (sufficient consistency)
2. `loggedDays >= 10` in the past 28 days
3. The user has accepted a nutrition recommendation from weekly review (`decision === "accepted"`)
4. The recommendation direction is `"increase"` or `"decrease"`

#### Scenario: Accepted decrease recommendation triggers adjustment

- GIVEN a user with `adherenceScore: 0.7`, `loggedDays: 20`, and an accepted `"nutrition-recovery"` recommendation with `direction: "increase"`, `adjustmentPct: 5`
- WHEN the auto-adjustment check runs
- THEN the system SHALL recalculate the nutrition plan with +5% calories

#### Scenario: Rejected recommendation does not trigger

- GIVEN a user with accepted training recommendation but rejected nutrition recommendation
- WHEN the auto-adjustment check runs
- THEN no nutrition plan adjustment SHALL occur

#### Scenario: Insufficient data prevents adjustment

- GIVEN a user with `loggedDays: 2` and an accepted nutrition recommendation
- WHEN the auto-adjustment check runs
- THEN no adjustment SHALL occur due to the minimum 3-day threshold

---

### Requirement: proportional macro recalculation

When calories are adjusted, macros SHALL be redistributed proportionally.

**Algorithm:**
- Let `deltaCalories = newCalories - currentCalories`
- For each macro {protein, carbs, fat}:
  - `macroRatio = currentMacroGrams * macroCaloriesPerGram / currentTotalCalories`
  - `newMacroGrams = currentMacroGrams + (deltaCalories * macroRatio / macroCaloriesPerGram)`
- Where: protein = 4 kcal/g, carbs = 4 kcal/g, fat = 9 kcal/g
- Protein minimum floor: 1.6 g/kg body weight (never reduce below this)

#### Scenario: 5% calorie increase redistributes macros proportionally

- GIVEN a plan with 2000 kcal (150g protein, 200g carbs, 67g fat)
- WHEN calories increase by 5% (+100 kcal)
- THEN protein SHALL increase proportionally, carbs SHALL increase proportionally, fat SHALL increase proportionally, total SHALL equal 2100 kcal

#### Scenario: Protein floor enforcement

- GIVEN a plan where the proportional reduction would bring protein below 1.6 g/kg
- WHEN the recalculation runs
- THEN protein SHALL be clamped to the floor and the remaining calorie delta redistributed to carbs and fat

---

### Requirement: progressive adjustment cap

Adjustments SHALL be limited to a maximum of 10% per week. The system SHALL enforce progressive ramping.

#### Scenario: 10% cap enforcement

- GIVEN a recommendation with `adjustmentPct: 15`
- WHEN the adjustment is applied
- THEN the actual adjustment SHALL be clamped to 10%

#### Scenario: Progressive ramping over weeks

- GIVEN a user who received a 5% increase last week and a new recommendation for 10%
- WHEN the cumulative adjustment would exceed 10% from the original baseline
- THEN the adjustment SHALL be clamped so the total change from baseline is ≤ 10%

#### Scenario: No adjustment on maintenance recommendation

- GIVEN a recommendation with `direction: "maintain"` and `adjustmentPct: 0`
- WHEN the adjustment is applied
- THEN the plan SHALL remain unchanged

---

### Requirement: weekly review integration — accepted decisions trigger plan regeneration

When a user accepts a nutrition recommendation via `POST /review/weekly/decision`, the system SHALL check eligibility and auto-regenerate the nutrition plan.

#### Scenario: Accept nutrition recommendation triggers regeneration

- GIVEN a stored weekly review with a nutrition recommendation
- WHEN the user calls `POST /review/weekly/decision` with `{ recommendationId: "nutrition-recovery", decision: "accepted" }`
- THEN the system SHALL call `computeNutritionAdherence`, check eligibility, and if eligible, regenerate the nutrition plan with the adjusted macros

#### Scenario: Accept training recommendation does not affect nutrition

- GIVEN a stored weekly review with a training recommendation
- WHEN the user accepts it
- THEN no nutrition plan adjustment SHALL occur (only training adjustments apply)

#### Scenario: Regeneration audit log

- GIVEN an auto-adjustment triggered by an accepted recommendation
- WHEN the regeneration completes
- THEN an entry SHALL be stored in `userProfile.adaptiveEngine.nutritionAdjustments` with `{ date, previousCalories, newCalories, reason, recommendationId }`

---

## Domain: Adaptive Nutrition — API Contract

### Requirement: GET /nutrition/adherence-score

A new endpoint SHALL return the user's current nutrition adherence score.

**Request:** `GET /nutrition/adherence-score`
**Query params:** `{ days?: number }` (default 28)

**Response (200):**
```json
{
  "score": 0.742,
  "period": { "start": "2026-02-23", "end": "2026-03-23" },
  "loggedDays": 18,
  "calorieConsistencyDays": 12,
  "macroLoggingDays": 10,
  "insufficientData": false,
  "computedAt": "2026-03-23T10:30:00.000Z"
}
```

#### Scenario: Returns adherence score for authenticated user

- GIVEN an authenticated user with meal logging data
- WHEN `GET /nutrition/adherence-score` is called
- THEN the response SHALL be 200 with the `NutritionAdherenceResult` shape

#### Scenario: Unauthenticated request rejected

- GIVEN no authentication
- WHEN `GET /nutrition/adherence-score` is called
- THEN the response SHALL be 401

---

### Requirement: POST /nutrition/adjust

A new endpoint SHALL trigger a manual nutrition plan adjustment.

**Request:** `POST /nutrition/adjust`
**Body:**
```json
{
  "adjustmentPct": 5,
  "direction": "increase",
  "reason": "weekly-review-manual"
}
```

**Response (200):**
```json
{
  "ok": true,
  "previousPlan": { "dailyCalories": 2000 },
  "newPlan": { "dailyCalories": 2100, "planId": "clx..." },
  "adjustmentApplied": { "pct": 5, "clamped": false }
}
```

#### Scenario: Manual 5% increase succeeds

- GIVEN an authenticated user with an active nutrition plan at 2000 kcal
- WHEN `POST /nutrition/adjust` is called with `{ adjustmentPct: 5, direction: "increase" }`
- THEN a new plan SHALL be created at 2100 kcal with proportionally adjusted macros

#### Scenario: Adjustment capped at 10%

- GIVEN an authenticated user with an active nutrition plan
- WHEN `POST /nutrition/adjust` is called with `{ adjustmentPct: 20 }`
- THEN the adjustment SHALL be clamped to 10% and `adjustmentApplied.clamped` SHALL be true

#### Scenario: Rejects when no active plan

- GIVEN an authenticated user with no active nutrition plan
- WHEN `POST /nutrition/adjust` is called
- THEN the response SHALL be 404 with `{ error: "NO_ACTIVE_PLAN" }`

---

## Domain: Future Self Visualization v2

### Requirement: body composition projection model

The `futureSelfEngine.ts` SHALL be extended with a body composition model that projects lean mass and fat mass separately.

**Inputs:**
- `currentWeightKg: number` (from latest check-in)
- `trainingVolumeScore: number` (0-1, derived from workout frequency vs target)
- `nutritionAdherenceScore: number` (0-1, from nutritionAdherenceScorer)
- `goal: "cut" | "maintain" | "bulk"`
- `weeklyCaloriesDelta: number` (from nutrition plan adjustments)
- `horizonMonths: 3 | 6 | 12`

**Model:**
- `leanMassMultiplier = 0.3 + trainingVolumeScore * 0.5 + nutritionAdherenceScore * 0.2`
- If `goal === "bulk"`: `leanMassDeltaKg = +0.25 * horizonMonths * leanMassMultiplier`
- If `goal === "cut"`: `leanMassDeltaKg = -0.05 * horizonMonths * leanMassMultiplier` (minimal loss if training is high)
- If `goal === "maintain"`: `leanMassDeltaKg = +0.1 * horizonMonths * leanMassMultiplier`
- `totalWeightDeltaKg` = existing projection engine output
- `fatMassDeltaKg = totalWeightDeltaKg - leanMassDeltaKg`
- `leanMassKg = currentLeanMass + leanMassDeltaKg`
- `fatMassKg = currentFatMass + fatMassDeltaKg`
- `bodyFatPct = fatMassKg / (leanMassKg + fatMassKg) * 100`

**Confidence interval:** apply the same uncertainty factor from the existing projection (0.25 / 0.35 / 0.5 based on consistency score).

**Output type addition to `FutureProjectionHorizon`:**
```typescript
bodyComposition?: {
  currentLeanMassKg: number | null;
  currentFatMassKg: number | null;
  projectedLeanMassKg: { min: number; max: number; expected: number };
  projectedFatMassKg: { min: number; max: number; expected: number };
  projectedBodyFatPct: { min: number; max: number; expected: number };
};
```

#### Scenario: Bulk goal projects lean mass gain

- GIVEN a user with `goal: "bulk"`, `trainingVolumeScore: 0.8`, `nutritionAdherenceScore: 0.7`, `horizonMonths: 6`
- WHEN `buildBodyCompositionProjection` is called
- THEN `projectedLeanMassKg.expected` SHALL be positive and greater than `projectedFatMassKg.expected`

#### Scenario: Cut goal with high training preserves lean mass

- GIVEN a user with `goal: "cut"`, `trainingVolumeScore: 0.9`, `nutritionAdherenceScore: 0.8`
- WHEN the projection runs
- THEN `leanMassDeltaKg` SHALL be minimal (close to 0) while `fatMassDeltaKg` SHALL be negative and significant

#### Scenario: Missing weight data returns nulls

- GIVEN a user with no check-in weight data
- WHEN `buildBodyCompositionProjection` is called
- THEN `currentLeanMassKg` and `currentFatMassKg` SHALL be null and the composition block SHALL be omitted from the response

---

### Requirement: interactive chart specifications

The `FutureProjectionPanel.tsx` SHALL be replaced with recharts-based interactive charts.

**Charts required:**
1. **Weight Projection Line Chart** — X axis: months (0-12), Y axis: weight (kg). Two lines: current-consistency and improved-consistency. Shaded confidence interval band.
2. **Body Composition Stacked Area Chart** — X axis: months, Y axis: kg. Two stacked areas: lean mass and fat mass. Switches based on selected scenario.
3. **Adherence Trend Sparkline** — mini chart showing adherence score trend over past 8 weeks.

**Interactions:**
- Hover on line chart shows tooltip with exact values at that month
- Click scenario toggle buttons to show/hide scenario lines
- Legend click toggles visibility of lean mass vs fat mass areas

#### Scenario: Weight projection chart renders with data

- GIVEN projection data with 3 horizons (3, 6, 12 months) and 2 scenarios
- WHEN the panel mounts
- THEN a recharts `LineChart` SHALL render with data points at months 0, 3, 6, 12 for each scenario

#### Scenario: Body composition chart renders stacked areas

- GIVEN body composition projection data for all horizons
- WHEN the user selects the "improved-consistency" scenario
- THEN a stacked area chart SHALL show lean mass and fat mass projections

#### Scenario: Chart graceful fallback

- GIVEN recharts fails to load (network error, lazy-load failure)
- WHEN the panel renders
- THEN it SHALL fall back to the existing text-only display with the same data

#### Scenario: Sparkline renders adherence history

- GIVEN the user has 8 weeks of adherence score data in `rct.metricsHistory`
- WHEN the panel mounts
- THEN a sparkline SHALL show the adherence trend

---

### Requirement: social sharing — projection snapshot

The system SHALL generate a shareable image from the projection data.

**Image spec:**
- Format: PNG, 1080x1080px (Instagram square)
- Content: User's projected weight change for 3-month horizon, FitSculpt branding, "generated by FitSculpt" watermark
- Generation: server-side via canvas or sharp library
- Endpoint: `GET /projection/share-image?horizon=3`

#### Scenario: Share image generates successfully

- GIVEN an authenticated user with projection data
- WHEN `GET /projection/share-image?horizon=3` is called
- THEN a PNG image SHALL be returned with Content-Type `image/png`

#### Scenario: Share image includes projection data

- GIVEN a user with projected 3-month delta of -2.5 to -1.8 kg
- WHEN the share image is generated
- THEN the image SHALL display the weight range and scenario label

#### Scenario: Share image requires auth

- GIVEN no authentication
- WHEN `GET /projection/share-image` is called
- THEN the response SHALL be 401

---

### Requirement: RCT migration — JSON blob to indexed table

RCT data currently stored in `userProfile.profile.research.rct` (JSON blob) SHALL be migrated to a dedicated Prisma model with indexed columns.

**New Prisma model:**
```prisma
model RctEvent {
  id          String   @id @default(cuid())
  userId      String
  experimentId String
  event       String
  context     Json?
  timestamp   DateTime

  @@index([userId, experimentId, timestamp])
  @@index([userId, event])
  @@map("rct_event")
}

model RctMetricSnapshot {
  id              String   @id @default(cuid())
  userId          String
  experimentId    String
  weekKey         String   // YYYY-MM-DD
  weeklyActivitySessions Int
  adherenceScore  Float
  recommendationAcceptanceRate Float?
  loggingFrequencyDays Int
  capturedAt      DateTime

  @@unique([userId, experimentId, weekKey])
  @@index([userId, experimentId, capturedAt])
  @@map("rct_metric_snapshot")
}
```

#### Scenario: New RCT events write to table

- GIVEN the migration is complete
- WHEN `sendRctEvent` is called
- THEN the event SHALL be inserted into the `rct_event` table instead of the JSON blob

#### Scenario: RCT metric snapshots query from table

- GIVEN 16 weeks of metric snapshots in the `rct_metric_snapshot` table
- WHEN `getLatestStoredMetric` is called
- THEN the query SHALL use the `[userId, experimentId, capturedAt]` index and return in < 50ms

#### Scenario: Historical data migration script

- GIVEN existing RCT data in JSON blob format
- WHEN the migration script runs
- THEN all events and metric snapshots SHALL be extracted from the JSON blob and inserted into the new tables
- AND the original JSON blob fields SHALL be preserved for rollback

#### Scenario: Query performance improvement

- GIVEN a user with 240 RCT events and 16 metric snapshots
- WHEN RCT data is queried
- THEN the query SHALL complete in ≤ 50ms (vs current JSON parse of full blob)

---

## Domain: Performance Spec

### Requirement: v1 vs v2 token cost comparison

Token cost SHALL be measured and compared between v1 and v2 for the same input profile.

**Benchmark criteria:**
- v1: `buildTrainingPrompt` sends full exercise catalog (~300 exercises) to GPT-4o-mini → ~1800 maxTokens
- v2: `selectExercisesWithAi` sends only 20 candidates per day → ~200 maxTokens per day, 3-7 days
- Expected reduction: 40-60%

#### Scenario: v2 uses fewer prompt tokens

- GIVEN identical user input
- WHEN both v1 and v2 generate a plan
- THEN v2's `usage.promptTokens` SHALL be ≤ 60% of v1's `usage.promptTokens`

---

### Requirement: v2 latency target

The v2 endpoint SHALL complete within defined latency targets.

#### Scenario: p95 latency under 8 seconds

- GIVEN 100 consecutive v2 generation requests
- WHEN latency is measured
- THEN the 95th percentile SHALL be ≤ 8000ms

---

## Domain: Out of Scope (Explicitly)

The following are NOT part of this change:

1. **Exercise video/3D model integration** — future sprint
2. **Multi-language nutrition plan support** — deferred
3. **Wearable device integration for passive tracking** — deferred
4. **Social features (plan sharing between users)** — deferred
5. **Migration of existing v1 training plans to v2 format** — users receive v2 on next generation only
6. **Body composition hardware integration** (DEXA, smart scale sync) — deferred
7. **AI-powered nutrition plan generation v2** — nutrition remains v1 generation with adaptive post-adjustment
8. **Real-time chart animations** — static chart rendering only
