# Tasks: Adaptive Differentiation

## Phase 1: training-v2 Fixes (Sprint 7)

- [ ] 1.1 Fix `contextResolver.ts:251` stub — import `requireCompleteProfile` from user middleware and implement validation for age, sex, focus, equipment, sessionTime, timeAvailableMinutes
- [ ] 1.2 Add muscle group mapping to `candidateSelector.ts` — map day focus to muscle group filters: `full`→all, `upper`→chest/back/shoulders/biceps/triceps/forearms, `lower`→quads/hamstrings/glutes, `push`→chest/shoulders/triceps, `pull`→back/biceps, `legs`→quads/hamstrings/glutes
- [ ] 1.3 Pass muscle group filter to Prisma `where.mainMuscleGroup` when focus is not `full` in candidateSelector
- [ ] 1.4 Write unit test: `apps/api/src/ai/training-plan/__tests__/contextResolver.test.ts` — valid profile returns UserContext, incomplete throws 409 PROFILE_INCOMPLETE
- [ ] 1.5 Write unit test: `apps/api/src/ai/training-plan/__tests__/candidateSelector.test.ts` — equipment filter works, muscle group filter maps focus correctly
- [ ] 1.6 Write unit test: `apps/api/src/ai/training-plan/__tests__/daySkeletonBuilder.test.ts` — builds correct skeleton for each focus type
- [ ] 1.7 Write unit test: `apps/api/src/ai/training-plan/__tests__/prescriptionEngine.test.ts` — beginner/intermediate/advanced produce correct sets/reps ranges
- [ ] 1.8 Write unit test: `apps/api/src/ai/training-plan/__tests__/validatorRepair.test.ts` — null exerciseId replaced from same muscle group
- [ ] 1.9 Write integration test: `apps/api/src/ai/training-plan/__tests__/pipeline.integration.test.ts` — full pipeline with mocked Prisma and OpenAI, success path and AI failure fallback
- [ ] 1.10 Write contract test: `apps/api/src/ai/training-plan/__tests__/v2Contract.test.ts` — validate response shape matches TrainingPlanV2Response schema using Zod
- [ ] 1.11 Write E2E test: `apps/web/e2e/training-v2.spec.ts` — navigate to training page, select v2, submit, verify plan renders within 30s (Playwright)
- [ ] 1.12 Wire v2 endpoint in `apps/api/src/domains/ai/registerAiRoutes.ts` — add `POST /ai/training-plan/v2/generate` with try/catch fallback to v1
- [ ] 1.13 Run token cost benchmark — process same input through v1 and v2, verify v2 tokens ≤ 60% of v1
- [ ] 1.14 Run latency benchmark — 100 consecutive v2 requests, verify p95 ≤ 8000ms

**Affected files:**
- `apps/api/src/ai/training-plan/contextResolver.ts` (modify)
- `apps/api/src/ai/training-plan/candidateSelector.ts` (modify)
- `apps/api/src/ai/training-plan/__tests__/*.test.ts` (create)
- `apps/api/src/domains/ai/registerAiRoutes.ts` (modify)
- `apps/web/e2e/training-v2.spec.ts` (create)

**Dependencies:** Existing training-v2 pipeline modules (Phase 1-2 from training-v2/tasks.md already complete)

**Test strategy:** Reference training-v2 tasks.md 3.4-3.6, 4.1-4.11 for test patterns. Use Vitest for unit/integration, Playwright for E2E.

---

## Phase 2: Adaptive Nutrition (Sprint 8)

- [ ] 2.1 Create `apps/api/src/ai/nutrition/nutritionAdherenceScorer.ts` — compute 28-day adherence score with algorithm: mealLoggingScore*0.5 + calorieConsistencyScore*0.3 + macroLoggingScore*0.2. Minimum 3-day threshold returns {score: 0, insufficientData: true}
- [ ] 2.2 Create `apps/api/src/ai/nutrition/macroRecalculator.ts` — proportional macro redistribution on calorie adjustment. Enforce 1.6 g/kg protein floor. 10% max cap
- [ ] 2.3 Write unit test: `apps/api/src/ai/nutrition/__tests__/nutritionAdherenceScorer.test.ts` — perfect ≥0.95, no logging = 0, partial 0.3-0.6, insufficientData flag
- [ ] 2.4 Write unit test: `apps/api/src/ai/nutrition/__tests__/macroRecalculator.test.ts` — 5% increase redistributes proportionally, protein floor enforced
- [ ] 2.5 Modify `apps/api/src/services/weeklyReview.ts` — in buildNutritionRecommendation, after acceptance check, call nutritionAdherenceScorer, if eligible (score ≥ 0.5 && loggedDays ≥ 10), trigger macroRecalculator. Add audit log to userProfile.adaptiveEngine.nutritionAdjustments
- [ ] 2.6 Create `apps/api/src/domains/nutrition/registerNutritionRoutes.ts` — register `GET /nutrition/adherence-score` and `POST /nutrition/adjust` endpoints
- [ ] 2.7 Write contract test: verify GET /nutrition/adherence-score returns NutritionAdherenceResult shape
- [ ] 2.8 Write contract test: verify POST /nutrition/adjust clamps to 10%, returns 404 when no active plan
- [ ] 2.9 Create `apps/web/src/components/nutrition/AdherenceBadge.tsx` — display adherence score with color coding (green ≥0.7, yellow 0.4-0.69, red <0.4)
- [ ] 2.10 Create `apps/web/src/hooks/useNutritionAdherence.ts` — query GET /nutrition/adherence-score on mount, refetch after plan adjustment
- [ ] 2.11 Integrate AdherenceBadge into weekly review UI

**Affected files:**
- `apps/api/src/ai/nutrition/nutritionAdherenceScorer.ts` (create)
- `apps/api/src/ai/nutrition/macroRecalculator.ts` (create)
- `apps/api/src/ai/nutrition/__tests__/*.test.ts` (create)
- `apps/api/src/services/weeklyReview.ts` (modify)
- `apps/api/src/domains/nutrition/registerNutritionRoutes.ts` (create)
- `apps/web/src/components/nutrition/AdherenceBadge.tsx` (create)
- `apps/web/src/hooks/useNutritionAdherence.ts` (create)

**Dependencies:** Meal logging feature (Sprint 2), Phase 1 complete

**Test strategy:** Mock mealLog/foodLog data for adherence tests. Test progressive adjustment cap and protein floor enforcement.

---

## Phase 3: Future Self v2 (Sprint 9)

- [ ] 3.1 Modify `apps/api/src/services/futureProjection.ts` — add buildBodyCompositionProjection(input) with algorithm: leanMassMultiplier = 0.3 + trainingVolumeScore*0.5 + nutritionAdherenceScore*0.2. Project lean mass changes per goal (bulk +0.25/kg/mo, cut -0.05/kg/mo, maintain +0.1/kg/mo). Calculate body fat %. Add confidence intervals
- [ ] 3.2 Add bodyComposition to FutureProjectionHorizon type in `apps/web/src/types/futureProjection.ts`
- [ ] 3.3 Write unit test: `apps/api/src/services/__tests__/futureProjection.test.ts` — body composition: bulk gains lean mass, cut preserves lean mass
- [ ] 3.4 Add Prisma schema for RCT indexed tables: RctEvent and RctMetricSnapshot models with indexes in `apps/api/prisma/schema.prisma`
- [ ] 3.5 Run Prisma migration to create rct_event and rct_metric_snapshot tables
- [ ] 3.6 Create `apps/api/src/db/rctMigrations.ts` — one-time migration script: read JSON blob, insert to new tables, verify row count, preserve original blob in rct_backup field
- [ ] 3.7 Create `apps/api/src/services/rctDataStore.ts` — replace JSON blob reads with Prisma queries. Export sendRctEvent, getLatestStoredMetric, summarizeRctEvents
- [ ] 3.8 Verify RCT query performance ≤ 50ms vs JSON parse baseline
- [ ] 3.9 Add `sharp` package to package.json for image generation
- [ ] 3.10 Add share-image endpoint in futureProjection.ts — generate 1080x1080 PNG via sharp with projection data and FitSculpt branding
- [ ] 3.11 Create `apps/web/src/components/future-projection/AdherenceSparkline.tsx` — mini sparkline showing 8-week adherence trend from rct.metricsHistory
- [ ] 3.12 Modify `apps/web/src/components/future-projection/FutureProjectionPanel.tsx` — replace text with recharts LineChart (weight projection) and AreaChart (body composition stacked). Add scenario toggle buttons
- [ ] 3.13 Handle chart fallback: if recharts fails to load, render existing text output
- [ ] 3.14 Write E2E test: `apps/web/e2e/future-projection.spec.ts` — generate projection, verify chart renders, toggle scenario, share image returns 200

**Affected files:**
- `apps/api/src/services/futureProjection.ts` (modify)
- `apps/api/src/services/__tests__/futureProjection.test.ts` (modify)
- `apps/api/prisma/schema.prisma` (modify)
- `apps/api/src/db/rctMigrations.ts` (create)
- `apps/api/src/services/rctDataStore.ts` (create)
- `apps/web/src/types/futureProjection.ts` (modify)
- `apps/web/src/components/future-projection/FutureProjectionPanel.tsx` (modify)
- `apps/web/src/components/future-projection/AdherenceSparkline.tsx` (create)
- `apps/web/e2e/future-projection.spec.ts` (modify)

**Dependencies:** recharts package added, Prisma migration complete, Phase 2 complete

**Test strategy:** Test body composition model with mock input. Benchmark JSON parse vs indexed table query. Test chart rendering with Playwright.

---

## Phase 4: Integration & Verification

- [ ] 4.1 Verify all three sprints ship independently without breaking existing functionality
- [ ] 4.2 Run full test suite for all new components
- [ ] 4.3 Verify token cost reduction 40-60% between v1 and v2
- [ ] 4.4 Verify progressive adjustment respects max 10%/week
- [ ] 5.5 Verify body composition projections render with confidence intervals
- [ ] 4.6 Manual QA: generate v2 plan, weekly review with nutrition, future projection with charts

---

## Phase 5: Cleanup

- [ ] 5.1 Add JSDoc comments to all new modules
- [ ] 5.2 Update any relevant documentation
- [ ] 5.3 Review code for adherence to existing patterns
- [ ] 5.4 Ensure all new files pass lint and type-check

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 14 | training-v2 Fixes (contextResolver, candidateSelector, tests, endpoint, benchmark) |
| Phase 2 | 11 | Adaptive Nutrition (adherence scorer, macro recalculator, weekly review integration, endpoints) |
| Phase 3 | 14 | Future Self v2 (body composition, charts, share image, RCT migration) |
| Phase 4 | 6 | Integration & Verification |
| Phase 5 | 4 | Cleanup |
| **Total** | **49** | |

## Implementation Order

1. **Phase 1** completes the training-v2 pipeline bugs and adds tests (reference existing training-v2/tasks.md 3.4-3.6, 4.1-4.11)
2. **Phase 2** builds on meal logging data (Sprint 2 prerequisite) to add adaptive nutrition
3. **Phase 3** extends projection engine with body composition, adds charts, migrates RCT data
4. **Phases 4-5** verify all three sprints work together and clean up

**Reference:** Existing training-v2 tasks at `openspec/changes/training-v2/tasks.md` for test patterns and conventions.
