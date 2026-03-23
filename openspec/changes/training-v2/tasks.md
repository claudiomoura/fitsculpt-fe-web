# Tasks: Training v2

## Phase 1: Infrastructure / Foundation

- [ ] 1.1 Create the directory `apps/api/src/ai/training-plan/` if it doesn't exist
- [ ] 1.2 Create the context resolver module: `apps/api/src/ai/training-plan/contextResolver.ts`
- [ ] 1.3 Create the candidate selector module: `apps/api/src/ai/training-plan/candidateSelector.ts`
- [ ] 1.4 Create the day skeleton builder module: `apps/api/src/ai/training-plan/daySkeletonBuilder.ts`
- [ ] 1.5 Create the AI selector module: `apps/api/src/ai/training-plan/aiSelector.ts`
- [ ] 1.6 Create the prescription engine module: `apps/api/src/ai/training-plan/prescriptionEngine.ts`
- [ ] 1.7 Create the validator/repair module: `apps/api/src/ai/training-plan/validatorRepair.ts`
- [ ] 1.8 Create the main orchestrator: `apps/api/src/ai/training-plan/trainingPlanGeneratorV2.ts`
- [ ] 1.9 Update `apps/api/src/domains/ai/registerAiRoutes.ts` to import the v2 pipeline and add the new route
- [ ] 1.10 Update the frontend component: `apps/web/src/components/training-plan/aiPlanGeneration.ts` to use the v2 endpoint

## Phase 2: Core Implementation

- [ ] 2.1 Implement `contextResolver.ts` to extract and validate user context from request and profile
- [ ] 2.2 Implement `candidateSelector.ts` to query exercises from DB based on equipment, focus, etc.
- [ ] 2.3 Implement `daySkeletonBuilder.ts` to create a skeleton of training days based on goal, level, daysPerWeek
- [ ] 2.4 Implement `aiSelector.ts` to call OpenAI for each slot to select the best exerciseId from candidates
- [ ] 2.5 Implement `prescriptionEngine.ts` to determine sets, reps, rest, tempo for each exercise
- [ ] 2.6 Implement `validatorRepair.ts` to validate each slot and repair if possible
- [ ] 2.7 Implement `trainingPlanGeneratorV2.ts` to orchestrate all steps and handle caching
- [ ] 2.8 Add versioned caching logic to the orchestrator
- [ ] 2.9 Ensure all modules return appropriate types and handle errors gracefully

## Phase 3: Integration / Wiring

- [ ] 3.1 Wire up the new endpoint in `registerAiRoutes.ts`: `/ai/training-plan/generate-v2`
- [ ] 3.2 Ensure the new endpoint follows the same authentication and authorization patterns as existing endpoints
- [ ] 3.3 Update the frontend to call the new v2 endpoint and implement fallback to v1
- [ ] 3.4 Test that the v2 endpoint returns the correct response format
- [ ] 3.5 Verify that the existing v1 endpoint (`/ai/training-plan/generate`) remains unchanged and functional
- [ ] 3.6 Ensure error handling in the v2 endpoint matches the patterns used in the v1 endpoint

## Phase 4: Testing / Verification

- [ ] 4.1 Write unit tests for contextResolver.ts
- [ ] 4.2 Write unit tests for candidateSelector.ts
- [ ] 4.3 Write unit tests for daySkeletonBuilder.ts
- [ ] 4.4 Write unit tests for aiSelector.ts (mocking OpenAI)
- [ ] 4.5 Write unit tests for prescriptionEngine.ts
- [ ] 4.6 Write unit tests for validatorRepair.ts
- [ ] 4.7 Write integration tests for the full v2 pipeline
- [ ] 4.8 Write contract tests for the v2 endpoint request/response
- [ ] 4.9 Write end-to-end tests for the frontend using the v2 endpoint
- [ ] 4.10 Run existing tests to ensure no regression in v1 endpoint
- [ ] 4.11 Perform manual QA to verify generated plans are valid and usable

## Phase 5: Cleanup / Documentation

- [ ] 5.1 Add JSDoc comments to all new modules
- [ ] 5.2 Update any relevant documentation in the codebase
- [ ] 5.3 Review code for adherence to existing patterns and conventions
- [ ] 5.4 Ensure all new files are properly linted and type-check clean