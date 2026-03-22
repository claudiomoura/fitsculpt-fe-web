# Design: Training v2

## Technical Approach

We will implement a new endpoint `/ai/training-plan/generate-v2` that follows a pipeline approach:
1. Context Resolver: Extracts and validates user context from request and profile.
2. Candidate Selector: Queries the exercise catalog for exercises matching user's equipment, focus, etc.
3. Day Skeleton Builder: Builds a skeleton of the training plan (which days, what muscle groups) based on goal, level, and days per week.
4. AI Selector: For each slot in the skeleton, uses the AI to choose the best exercise from the candidate list (returning only exerciseId).
5. Prescription Engine: For each selected exercise, determines sets, reps, rest, and tempo based on user's level, goal, and day focus.
6. Validator/Repair: Validates each slot (exerciseId exists, prescription is valid) and repairs if possible (e.g., by selecting another candidate) without invalidating the entire plan.
7. Versioned Cache: Caches the result with a version key to avoid stale data.

The existing v1 endpoint remains unchanged for backward compatibility.

## Architecture Decisions

### Decision: Separate v2 endpoint
**Choice**: Create a new endpoint `/ai/training-plan/generate-v2` instead of modifying the existing `/ai/training-plan/generate`.
**Alternatives considered**: 
- Replace the existing endpoint with v2 logic (risky, no rollback)
- Use a version header or query parameter to switch between v1 and v2 (more complex, less clear)
**Rationale**: Keeping the existing endpoint ensures backward compatibility and allows for a safe rollout. We can monitor v2 usage and switch the frontend gradually.

### Decision: AI selects only exerciseId
**Choice**: In the AI Selector step, the AI is only responsible for choosing an exercise from a pre-defined list of candidates (returning the exerciseId). All other fields (sets, reps, rest, tempo) are determined locally by the Prescription Engine.
**Alternatives considered**: 
- Let the AI generate the entire exercise object (as in v1)
- Let the AI choose from a larger set of candidates and also suggest sets/reps (more complex, higher cost)
**Rationale**: By limiting the AI's responsibility to selecting an exerciseId, we reduce the token cost and increase reliability. The AI is less likely to produce invalid JSON or invalid exercise choices when constrained to a known list.

### Decision: Local fallback without invalidating entire plan
**Choice**: The Validator/Repair step attempts to fix invalid slots (e.g., missing exerciseId) by selecting another candidate from the list for that slot. If no candidates are available, it leaves the exerciseId as null and logs a warning, but does not invalidate the entire plan.
**Alternatives considered**: 
- If any slot is invalid, fall back to a deterministic plan for the entire week (as in v1)
- Retry the AI selection for the invalid slot (could lead to infinite loops)
**Rationale**: This approach maximizes the chance of generating a usable plan even if some slots cannot be filled perfectly. It avoids the cost of regenerating the entire plan due to a single issue.

### Decision: Versioned cache
**Choice**: The cache key for v2 includes a version string (e.g., "training-v2") that is incremented whenever the pipeline logic changes significantly.
**Alternatives considered**: 
- Use the same cache key as v1 (risk of stale data if the logic changes)
- Cache indefinitely and rely on cache expiration (could serve stale data for too long)
**Rationale**: Versioned caching allows us to safely update the pipeline without worrying about stale cache entries. When the version changes, old caches are automatically ignored.

## Data Flow

```
+----------------+     +------------------+     +-------------------+
| HTTP Request   -->| Context Resolver | --> | User Context      |
+----------------+     +------------------+     +-------------------+
                                                   |
                                                   v
+----------------+     +------------------+     +-------------------+
| Exercise Catalog| -->| Candidate Selector| --> | Candidate Exercises|
+----------------+     +------------------+     +-------------------+
                                                   |
                                                   v
+----------------+     +------------------+     +-------------------+
| Goal, Level,   -->| Day Skeleton Builder| --> | Day Skeleton      |
| DaysPerWeek    |     +------------------+     +-------------------+
+----------------+                                          |
                                                   |       v
                                                   |   +-------------------+
                                                   +-->| AI Selector       |
                                                       | (per slot)        |
                                                       +-------------------+
                                                                  |
                                                                  v
                                                       +-------------------+
                                                       | Selected Exercise |
                                                       | (exerciseId only) |
                                                       +-------------------+
                                                                  |
                                                                  v
                                                       +-------------------+
                                                       | Prescription Engine|
                                                       | (sets, reps, rest,|
                                                       |  tempo)           |
                                                       +-------------------+
                                                                  |
                                                                  v
                                                       +-------------------+
                                                       | Validator/Repair  |
                                                       | (per slot)        |
                                                       +-------------------+
                                                                  |
                                                                  v
                                                       +-------------------+
                                                       | Versioned Cache   |
                                                       | (store/retrieve)  |
                                                       +-------------------+
                                                                  |
                                                                  v
                                                       +-------------------+
                                                       | HTTP Response     |
                                                       | (Training Plan)   |
                                                       +-------------------+
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/domains/ai/registerAiRoutes.ts` | Modify | Add new route for `/ai/training-plan/generate-v2` and import v2 pipeline functions. |
| `apps/api/src/ai/training-plan/contextResolver.ts` | Create | Implements the Context Resolver step. |
| `apps/api/src/ai/training-plan/candidateSelector.ts` | Create | Implements the Candidate Selector step. |
| `apps/api/src/ai/training-plan/daySkeletonBuilder.ts` | Create | Implements the Day Skeleton Builder step. |
| `apps/api/src/ai/training-plan/aiSelector.ts` | Create | Implements the AI Selector step (calls OpenAI to choose exerciseId). |
| `apps/api/src/ai/training-plan/prescriptionEngine.ts` | Create | Implements the Prescription Engine step. |
| `apps/api/src/ai/training-plan/validatorRepair.ts` | Create | Implements the Validator/Repair step. |
| `apps/api/src/ai/training-plan/trainingPlanGeneratorV2.ts` | Create | Orchestrates the v2 pipeline steps. |
| `apps/web/src/components/training-plan/aiPlanGeneration.ts` | Modify | Update to call the v2 endpoint and fallback to v1 if necessary. |
| `apps/api/src/ai/trainingPlanExerciseResolution.ts` | Possibly Modify | May adjust to handle exerciseId-only input (though we are already returning exerciseId, so resolution might be a no-op). |

## Interfaces / Contracts

### Request Body (same as v1 training plan generate request)
We reuse the existing `aiTrainingPlanGenerateRequestSchema` from `registerAiRoutes.ts` for consistency.

### Response Body
```typescript
interface TrainingPlanV2Response {
  planId: string; // ID of the saved training plan
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
  aiTokenBalance?: number;
  aiTokenRenewalAt?: string | null;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  costCents: number;
  costEur: number;
  balanceBefore: number;
  balanceAfter: number;
  aiRequestId?: string;
}
```

### Internal Interfaces (TypeScript)
```typescript
// Context Resolver output
interface UserContext {
  userId: string;
  name?: string;
  age: number;
  sex: "male" | "female";
  level: "beginner" | "intermediate" | "advanced";
  goal: string;
  focus: string;
  equipment: "gym" | "home";
  sessionTime: "short" | "medium" | "long";
  timeAvailableMinutes: number;
  includeCardio: boolean;
  includeMobilityWarmups: boolean;
  workoutLength?: "30m" | "45m" | "60m" | "flexible";
  timerSound?: "ding" | "repsToDo";
  injuries?: string;
  restrictions: string;
  daysPerWeek: number;
  daysCount: number;
  startDate: Date;
}

// Candidate Selector output
interface CandidateExercise {
  id: string;
  name: string;
  imageUrl?: string | null;
  equipment?: string | null;
  mainMuscleGroup?: string | null;
}

// Day Skeleton output
interface DaySkeleton {
  label: string;
  focus: string; // e.g., "push", "pull", "legs", "upper", "lower"
  // We will have one slot per exercise per day; the number of slots can be configurable
  // For simplicity, we assume a fixed number of exercises per day (e.g., 4)
  exerciseSlots: number; // e.g., 4
}

// AI Selector output (per slot)
interface ExerciseSelection {
  exerciseId: string; // must be one of the candidate IDs
}

// Prescription Engine output (per exercise)
interface ExercisePrescription {
  sets: number;
  reps: string;
  tempo?: string;
  rest?: number;
}

// Validator/Repair output (per slot)
interface ValidatedExerciseSlot {
  exerciseId: string | null; // null if could not be resolved
  name: string;
  sets: number;
  reps: string;
  tempo?: string;
  rest?: number;
  imageUrl?: string | null;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each step of the v2 pipeline (Context Resolver, Candidate Selector, etc.) | Unit tests with mocked dependencies (e.g., mock Prisma for Candidate Selector, mock OpenAI for AI Selector). |
| Integration | The v2 pipeline as a whole (from request to response) | Integration tests using a test database and mocking external services (OpenAI) where necessary. |
| Contract | The v2 endpoint request and response | Contract tests to ensure the endpoint matches the specified schema. |
| E2E | Frontend using the v2 endpoint (with fallback to v1) | End-to-end tests using a testing framework like Cypress or Playwright, testing the flow from the UI to the backend. |

## Migration / Rollout

No migration is required as we are not changing the data model.

Rollout plan:
1. Deploy the v2 endpoint and leave it inactive (frontend still uses v1).
2. Enable the v2 endpoint for a small percentage of users (e.g., via a feature flag) and monitor metrics (error rates, token usage, user satisfaction).
3. Gradually increase the percentage until 100% of users are using v2.
4. Once confident, remove the feature flag and consider deprecating v1 after a grace period.

## Open Questions

- [ ] How many exercise slots per day should we have in the day skeleton? (Currently assuming 4, but this might need to be configurable based on workout length or goal.)
- [ ] Should the Candidate Selector return a fixed number of candidates, or all matching exercises? (We might want to limit to avoid too many tokens passed to the AI.)
- [ ] What should the AI prompt look like for the AI Selector? (We need to design a prompt that asks the AI to choose the best exercise for a given slot from a list of candidates, considering the day focus and user level.)
- [ ] How do we handle days that are supposed to include cardio or mobility warmups? (We might need to adjust the day skeleton to include special slots for these.)