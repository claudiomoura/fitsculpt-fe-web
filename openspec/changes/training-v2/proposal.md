# Proposal: Training v2

## Intent
Replace the LLM-centric training plan generation with a pipeline where the backend builds the structure and the AI only selects from pre-fetched candidates.

## Scope
### In Scope
- New endpoint `/ai/training-plan/generate-v2` that implements the v2 pipeline.
- Context resolver module.
- Candidate selector module (DB pre-filtering).
- Day skeleton builder.
- AI selector (only returns exerciseId).
- Local prescription engine (sets, reps, rest, tempo).
- Local validator/repair (per slot).
- Versioned caching for v2.
- Frontend update to use the v2 endpoint with fallback to v1.
- Tests for the v2 pipeline.

### Out of Scope
- Changing the existing v1 endpoint (to maintain backward compatibility).
- Removing the v1 endpoint in the short term.
- Changing the data model (we are still using the same TrainingPlan, TrainingDay, TrainingExercise models).

## Approach
We will create a new endpoint that follows the v2 pipeline. The pipeline steps are:
   1. Context Resolver: Validate and gather user context (age, sex, etc.) from the request and profile.
   2. Candidate Selector: Query the exercise catalog for exercises matching the user's equipment, focus, etc.
   3. Day Skeleton Builder: Build a skeleton of the training plan (which days, what muscle groups) based on goal, level, and days per week.
   4. AI Selector: For each slot in the skeleton, use the AI to choose the best exercise from the candidate list (returning only exerciseId).
   5. Prescription Engine: For each selected exercise, determine sets, reps, rest, and tempo based on user's level, goal, and day focus.
   6. Validator/Repair: Validate each slot (exerciseId exists, prescription is valid) and repair if possible (e.g., by selecting another candidate) without invalidating the entire plan.
   7. Versioned Cache: Cache the result with a version key to avoid stale data.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/domains/ai/registerAiRoutes.ts` | Modified | Add new endpoint for v2 and import v2 pipeline functions. |
| `apps/api/src/ai/training-plan/` | New | Create new modules for each step of the v2 pipeline. |
| `apps/web/src/components/training-plan/aiPlanGeneration.ts` | Modified | Update to call the v2 endpoint and fallback to v1 if necessary. |
| `apps/api/src/ai/trainingPlanExerciseResolution.ts` | Possibly Modified | May need to adjust for the new pipeline (but we are returning exerciseId only, so resolution might be simpler). |
| `apps/api/src/prisma/schema.prisma` | Unchanged | We are not changing the data model. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The v2 pipeline might not generate plans as good as the v1 AI-generated plans. | Medium | We will run A/B tests and compare user satisfaction. We can keep v1 as a fallback. |
| The AI selector might not be able to choose an exercise for a slot if the candidate list is empty or too small. | Low | We will ensure the candidate selector returns a reasonable list and have a local fallback (e.g., pick the first candidate). |
| The caching might serve stale data if the versioning is not done correctly. | Low | We will include a version in the cache key that changes when the pipeline logic changes. |
| Performance degradation due to additional DB queries. | Low | We will optimize the candidate selector queries and use caching for the exercise catalog. |

## Rollback Plan
Since we are adding a new endpoint and not changing the existing v1 endpoint, we can simply stop using the v2 endpoint and revert the frontend to use only v1. The backend changes for v2 can be left in place (they are not interfering with v1) or removed if necessary.

## Dependencies
- None external. We are using the existing Prisma client and OpenAI client.

## Success Criteria
- [ ] The v2 endpoint returns a valid training plan with exerciseIds filled in for all exercises.
- [ ] The v2 endpoint uses less AI tokens (lower cost) than the v1 endpoint.
- [ ] The v2 endpoint has a comparable or better user satisfaction (measured by plan completion rate or similar).
- [ ] The v2 endpoint does not break the existing v1 endpoint.
- [ ] Tests for the v2 pipeline pass.