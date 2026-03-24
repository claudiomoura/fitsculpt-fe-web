# Proposal: Adaptive Differentiation

## Intent

FitSculpt currently generates training plans via a monolithic AI prompt (v1) that dumps the full exercise catalog and trusts GPT to produce everything. Nutrition plans are static with no feedback loop. Projections are text-only with no body composition modeling. This change closes all three gaps by: (1) completing the deterministic training-v2 pipeline, (2) building an adaptive nutrition engine that adjusts plans based on adherence data, and (3) adding body composition projections with interactive visualization.

## Scope

### In Scope

**Sprint 7 — training-v2 Pipeline Completion**
- Fix `contextResolver.ts:251` stub — import real `requireCompleteProfile` from user context
- Enhance `candidateSelector.ts` — add muscle group mapping from day focus/exercise category
- Write Phase 4 test suite: unit, integration, contract, E2E
- Wire v2 endpoint (`POST /ai/training-plan/v2/generate`) with v1 fallback on failure
- Performance benchmark: token cost comparison v1 vs v2 (expect 40-60% reduction)

**Sprint 8 — Adaptive Nutrition Engine**
- Create `nutritionAdherenceScorer.ts` — 28-day meal logging consistency score
- Wire accepted weekly review decisions → automatic `NutritionPlan` regeneration
- Add proportional macro recalculation engine (protein/fat/carb redistribution on calorie adjustment)
- Progressive adjustment logic (gradual deficit/surplus ramping, max 10% per week)
- Integration with `weeklyReview.ts` for coherent feedback loop

**Sprint 9 — Future Self Visualization v2**
- Add body composition projection model (lean mass from training volume + nutrition intake)
- Replace text-only output with interactive charts (recharts library)
- Connect projection data to training adjustment recommendations
- Shareable projection snapshot — generate image for social sharing
- Migrate RCT data from JSON blob column to separate indexed table

### Out of Scope

- Exercise video/3D model integration (future sprint)
- Multi-language nutrition plan support
- Wearable device integration for passive tracking
- Social features (plan sharing between users)
- Migration of v1 training plans to v2 format (users get v2 on next generation)

## Approach

**Incremental delivery across 3 sprints with independent ship points.**

- **Sprint 7** focuses on completing the already-architected training-v2 pipeline. The SDD artifacts exist at `openspec/changes/training-v2/`. Two bugs need fixing (contextResolver stub, candidateSelector filtering) and a full test suite must be written before wiring the endpoint. The v2 endpoint wraps v1 as fallback, so rollout is safe.

- **Sprint 8** builds a new `nutritionAdherenceScorer` module that reads from existing meal logging data (Sprint 2 prerequisite). The scorer feeds into `weeklyReview.ts` which already has `buildNutritionRecommendation()`. Accepted recommendations trigger automatic plan regeneration through proportional macro recalculation. All adjustments are progressive (max 10%/week) and respect minimum logging thresholds (3 days).

- **Sprint 9** extends the existing deterministic projection engine (`futureSelfEngine.ts`) with a body composition model that factors training volume and nutrition intake into lean mass estimates. The UI replaces `FutureProjectionPanel.tsx` text output with recharts-based interactive charts. RCT data migrates from the JSON blob to a dedicated indexed table for query performance.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `modules/training-v2/contextResolver.ts` | Modified | Replace stub with real `requireCompleteProfile` import |
| `modules/training-v2/candidateSelector.ts` | Modified | Add muscle group mapping from day focus |
| `modules/training-v2/*.ts` | New tests | Unit + integration + contract + E2E test suite |
| `routes/registerAiRoutes.ts` | Modified | Wire v2 endpoint with v1 fallback |
| `modules/nutrition/nutritionAdherenceScorer.ts` | New | 28-day adherence scoring module |
| `modules/nutrition/macroRecalculator.ts` | New | Proportional macro redistribution engine |
| `modules/weeklyReview/weeklyReview.ts` | Modified | Wire adherence scorer + auto-adjustment trigger |
| `modules/futureSelf/futureSelfEngine.ts` | Modified | Add body composition projection model |
| `components/FutureProjectionPanel.tsx` | Modified | Replace text with recharts interactive charts |
| `modules/rct/rctDataStore.ts` | New | Migrate RCT data to indexed table |
| Prisma schema | Modified | Add RCT indexed table, body composition fields |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| training-v2 pipeline complexity underestimated | Medium | Pipeline modules already exist; fix 2 bugs + test suite is bounded work. Timebox to 1 week. |
| Adaptive nutrition depends on meal logging data quality | High | Enforce minimum 3-day logging threshold before adjustments activate. Log warnings for insufficient data. |
| Body composition projection accuracy expectations | Medium | Label all projections as "estimates based on model assumptions." Include confidence intervals. Show methodology disclaimer. |
| AI token cost increases before v2 savings materialize | Low | v2 pipeline is deterministic-first, AI-last. Benchmark token cost before rollout. v1 fallback prevents regression. |
| recharts bundle size increase | Low | Lazy-load chart components. Measure bundle impact. Fall back to text if charts fail to load. |

## Rollback Plan

- **Sprint 7 (training-v2):** v2 endpoint wraps v1 as fallback. If v2 fails or produces worse results, disable the v2 route flag — users automatically fall back to v1. No data migration needed.
- **Sprint 8 (Adaptive Nutrition):** Weekly review adjustments are user-acceptance only. If auto-adjustment produces bad recommendations, disable the auto-regeneration flag in `weeklyReview.ts`. Existing manual adjustment flow remains intact.
- **Sprint 9 (Future Self v2):** Projection engine changes are additive. If body composition model is inaccurate, disable it via feature flag — deterministic projections continue working. Chart rendering failures fall back to text output (already implemented in current panel).

## Dependencies

- Meal logging feature (Sprint 2) must be complete before Sprint 8 activates
- Exercise catalog data must have muscle group annotations for candidateSelector enhancement
- recharts package must be added to `package.json` before Sprint 9 UI work
- Prisma migration for RCT indexed table must run before Sprint 9 data migration

## Success Criteria

- [ ] training-v2 endpoint generates valid plans with 40-60% fewer tokens than v1
- [ ] Phase 4 test suite passes: unit, integration, contract, E2E coverage
- [ ] nutritionAdherenceScorer produces scores that correlate with actual meal logging frequency
- [ ] Accepted weekly review recommendations auto-trigger nutrition plan regeneration
- [ ] Progressive adjustment respects max 10% per week constraint
- [ ] Body composition projection renders with confidence intervals on interactive chart
- [ ] RCT data queries perform 3x faster after migration to indexed table
- [ ] All three sprints ship independently without breaking existing functionality
