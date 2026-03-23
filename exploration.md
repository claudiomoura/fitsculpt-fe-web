## Exploration: Training v2 Implementation

### Current State
The current training plan generation endpoint (`/ai/training-plan/generate`) uses an AI-first approach with fallbacks. It calls OpenAI to generate a training plan, then resolves exercise IDs, and if that fails, uses a deterministic fallback. The endpoint supports caching and has a complex flow for handling AI responses, retries, and fallbacks.

The frontend (`apps/web/src/components/training-plan/aiPlanGeneration.ts`) calls the endpoint at `/api/ai/training-plan/generate`.

The current flow does not separate the concerns of:
- Context resolution (gathering user data)
- Candidate selection (pre-filtering exercises from DB)
- Day skeleton building
- AI selection (only choosing from pre-fetched candidates)
- Local prescription (sets, reps, rest, tempo)
- Local validation and repair (per slot, without falling back the entire plan for one invalid ID)

The goal of Training v2 is to replace the LLM-centric generation with a pipeline where:
- The backend builds the structure/prescription locally.
- The AI only chooses between candidates from the DB.
- The output is operationally DB-only (exerciseId).
- This aims for better quality and lower cost.

### Affected Areas
- `apps/api/src/domains/ai/registerAiRoutes.ts`: We will add a new endpoint for v2 and modify the existing training plan generation logic to support the new pipeline.
- `apps/api/src/ai/training-plan/*`: We will need to create new modules for the v2 pipeline (context resolver, candidate selector, etc.)
- `apps/web/src/components/training-plan/aiPlanGeneration.ts`: We will update the frontend to use the new v2 endpoint (with fallback to v1 for safety).
- We may need to adjust the exercise catalog loading to support pre-filtering.
- We will need to adjust the caching to version the v2 cache.

### Approaches
We can consider two main approaches:

1. **Complete Replacement**: Replace the existing training plan generation with the new v2 pipeline entirely, but keep the old endpoint for backward compatibility.
   - Pros: Clean separation, easier to maintain v2 without interfering with v1.
   - Cons: More duplication initially, but we can share some utilities.

2. **Incremental Refactor**: Gradually replace parts of the existing pipeline with v2 components, but this might be more complex and risky.

Given the requirement to not break existing endpoints and to have a safe rollout, we choose Approach 1.

We will:
- Keep the existing `/ai/training-plan/generate` endpoint (v1) unchanged.
- Add a new endpoint `/ai/training-plan/generate-v2` (or similar) that uses the new pipeline.
- Update the frontend to use the new endpoint, but with a fallback to the old one if the new one fails (for a temporary period).

The v2 pipeline will consist of:
a. Context Resolver: Gathers and validates user context (age, sex, etc.) from profile and request.
b. Candidate Selector: Queries the DB for exercises that match the user's equipment, focus, etc., and returns a curated list.
c. Day Skeleton Builder: Creates a basic structure of the training plan (which days, what focus per day) based on the user's goal, level, and days per week.
d. AI Selector: Takes the day skeleton and the candidate list, and uses the AI to select the best exercise for each slot (only returning exerciseId).
e. Prescription Engine: Locally determines sets, reps, rest, tempo for each selected exercise based on the user's level, goal, and day focus.
f. Validator/Repair: Checks each slot for validity (exerciseId exists in DB, prescription is appropriate) and repairs locally without invalidating the entire plan.
g. Versioned Cache: Uses a cache key that includes a version for the v2 pipeline to avoid stale caches.

We will also define a clear contract for the v2 endpoint request and response.

The request will be similar to the current training plan generate request, but we may streamline it.
The response will include the training plan with exerciseIds filled in, and metadata about the generation (mode, usage, etc.).

We will ensure that the v2 endpoint does not break the existing v1 endpoint.

We will also write tests for the v2 pipeline.

We will maintain consistency of media/images by always hydrating from the DB (which we already do in the exercise resolution).

### Risks
- The new pipeline might not cover all edge cases that the current AI-generated plans handle.
- There might be a performance impact due to additional DB queries (we will need to optimize and cache).
- The AI selector might not be as creative as the current full prompt, but we expect it to be more reliable and cheaper.

### Mitigations
- We will run the v2 pipeline in parallel with v1 for a period and compare results.
- We will start with a limited rollout (e.g., only for new users or a percentage of traffic).
- We will ensure that the v2 pipeline has a robust fallback to v1 in the frontend (temporarily) and eventually to a deterministic fallback in the backend.

### Ready for Proposal
Yes