# API Specification for Training v2

## Purpose
This specification describes the new endpoint and pipeline for generating training plans using the v2 approach, where the backend builds the structure and the AI only selects from pre-fetched candidates.

## Requirements

### Requirement: New Endpoint for Training v2
The system SHALL provide a new endpoint for generating training plans using the v2 pipeline.

#### Scenario: Generate a training plan via v2 endpoint
- GIVEN a user is authenticated and has a complete profile
- WHEN the user sends a POST request to `/ai/training-plan/generate-v2` with valid training plan parameters (goal, daysPerWeek, level, etc.)
- THEN the system SHALL return a 200 response with a training plan object that includes:
  - A `planId` (string)
  - A `plan` object with:
    - `title` (string)
    - `notes` (string, optional)
    - `days` array of length matching the requested `daysCount` (or default)
  - Each day in `days` SHALL have:
    - `label` (string)
    - `exercises` array of exercises
  - Each exercise SHALL have:
    - `exerciseId` (string, referencing an existing exercise in the database)
    - `name` (string)
    - `sets` (integer)
    - `reps` (string)
    - `tempo` (string, optional)
    - `rest` (integer, optional)
    - `imageUrl` (string, optional)
  - The response SHALL include metadata about the generation:
    - `mode` (string, either "AI" or "FALLBACK")
    - `aiTokenBalance` (number, optional)
    - `aiTokenRenewalAt` (string, optional)
    - `usage` object with token counts (optional)
    - `costCents` (number)
    - `costEur` (number)
    - `balanceBefore` (number)
    - `balanceAfter` (number)

#### Scenario: v2 endpoint returns error for missing context
- GIVEN a user is authenticated but missing required context (age, sex, etc.) in profile and request
- WHEN the user sends a POST request to `/ai/training-plan/generate-v2`
- THEN the system SHALL return a 409 error with:
  - Error code: "PROFILE_INCOMPLETE"
  - Message indicating missing context
  - List of missing context fields

#### Scenario: v2 endpoint uses cache when available
- GIVEN a user has previously requested a training plan with the same parameters (and the cache is valid)
- WHEN the user sends a POST request to `/ai/training-plan/generate-v2` with the same parameters
- THEN the system SHALL return the cached training plan (with mode "CACHE") without calling the AI service

#### Scenario: v2 endpoint falls back to local generation on AI failure
- GIVEN the AI service is unavailable or returns an invalid response
- WHEN the user sends a POST request to `/ai/training-plan/generate-v2`
- THEN the system SHALL generate a training plan using the local fallback pipeline (without AI) and return it with mode "FALLBACK"

### Requirement: V2 Pipeline Steps
The system SHALL implement the v2 pipeline with the following steps:
  1. Context Resolver: Validates and gathers user context (age, sex, etc.) from the request and profile.
  2. Candidate Selector: Queries the exercise catalog for exercises matching the user's equipment, focus, etc.
  3. Day Skeleton Builder: Builds a skeleton of the training plan (which days, what muscle groups) based on goal, level, and days per week.
  4. AI Selector: For each slot in the skeleton, uses the AI to choose the best exercise from the candidate list (returning only exerciseId).
  5. Prescription Engine: For each selected exercise, determines sets, reps, rest, and tempo based on user's level, goal, and day focus.
  6. Validator/Repair: Validates each slot (exerciseId exists, prescription is valid) and repairs if possible (e.g., by selecting another candidate) without invalidating the entire plan.
  7. Versioned Cache: Caches the result with a version key to avoid stale data.

#### Scenario: Candidate Selector returns appropriate exercises
- GIVEN a user with specific equipment (e.g., "gym") and focus (e.g., "upperLower")
- WHEN the Candidate Selector runs
- THEN it SHALL return a list of exercises that match the equipment and focus (or are suitable for the focus)

#### Scenario: Day Skeleton Builder creates a valid structure
- GIVEN a user's goal (e.g., "buildStrength"), level (e.g., "intermediate"), and daysPerWeek (e.g., 4)
- WHEN the Day Skeleton Builder runs
- THEN it SHALL create a plan skeleton with 4 days, each day having a label and focus appropriate for a strength training split

#### Scenario: AI Selector chooses an exercise for each slot
- GIVEN a day skeleton with slots for exercises and a list of candidate exercises
- WHEN the AI Selector runs for a slot
- THEN it SHALL return an exerciseId that exists in the candidate list

#### Scenario: Prescription Engine sets appropriate values
- GIVEN an exercise, user's level (e.g., "beginner"), and day focus (e.g., "push")
- WHEN the Prescription Engine runs
- THEN it SHALL return sets, reps, rest, and tempo that are appropriate for a beginner push day

#### Scenario: Validator/Repair handles invalid exerciseId
- GIVEN an exercise slot with an exerciseId that does not exist in the database
- WHEN the Validator/Repair runs
- THEN it SHALL attempt to replace the exercise with another candidate from the list for that slot
- IF no candidates are available, it SHALL leave the exerciseId as null and log a warning (but not fail the entire plan)

#### Scenario: Versioned Cache uses a version in the key
- GIVEN the v2 pipeline logic has changed (version incremented)
- WHEN a request is made for a training plan
- THEN the cache key SHALL include the version, preventing stale cache hits