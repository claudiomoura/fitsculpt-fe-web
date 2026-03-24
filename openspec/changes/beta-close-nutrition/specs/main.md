# Specification: Beta Close + Nutrition Durability

## Purpose

This specification covers two connected sprints for FitSculpt beta closure: (1) a unified smoke pipeline validating the app end-to-end before shipping, and (2) backend persistence for nutrition meal logging replacing fragile JSON blob storage.

---

## 1. Sprint 1 — Beta Close Smoke Gate

### 1.1 Smoke Pipeline

#### Requirement: Unified Smoke Script

The system SHALL provide a single `smoke` npm script in `apps/web/package.json` that chains lint, typecheck, unit tests, E2E tests, and build in sequence.

##### Scenario: Smoke script runs all stages in order

- GIVEN the developer runs `npm run smoke` from `apps/web/`
- WHEN the script executes
- THEN it runs `lint` first
- AND upon lint success, runs `typecheck`
- AND upon typecheck success, runs `test` (unit tests)
- AND upon test success, runs Playwright E2E for spec files `e2e/nutrition-checkin-core.spec.ts` and `e2e/gym-nutrition-flow.spec.ts`
- AND upon E2E success, runs `build`
- AND the process exits with code 0 if ALL stages pass

##### Scenario: Smoke script fails fast on first failure

- GIVEN the developer runs `npm run smoke`
- WHEN `lint` fails
- THEN the script exits with a non-zero code immediately
- AND subsequent stages (typecheck, test, e2e, build) are NOT executed

#### Requirement: Beta Smoke Runner Alignment

The system SHALL ensure `apps/web/scripts/run-beta-smoke.mjs` references spec file paths that match the actual E2E suite file names.

##### Scenario: Run-beta-smoke imports correct spec paths

- GIVEN `run-beta-smoke.mjs` imports or references E2E spec files
- WHEN the smoke runner is invoked
- THEN it references `e2e/nutrition-checkin-core.spec.ts` and `e2e/gym-nutrition-flow.spec.ts` (matching the actual files on disk)
- AND no "file not found" or "module not found" errors occur during import

#### Requirement: Beta Readiness Documentation Alignment

The system SHALL ensure `beta-readiness.md` references spec paths and checklist items that match the actual E2E suite structure.

##### Scenario: Beta readiness checklist matches reality

- GIVEN a developer reads `beta-readiness.md`
- WHEN they compare the referenced spec paths to the filesystem
- THEN all referenced paths resolve to existing files
- AND all checklist items correspond to testable E2E scenarios in the spec files

### 1.2 B2C User Flow Validation

#### Requirement: B2C Core Flow

The smoke E2E suite SHALL validate the complete B2C user flow: login, plan visibility, gating behavior, and AI flows.

##### Scenario: B2C user logs in and sees plan

- GIVEN a B2C test user with valid credentials exists
- WHEN the user submits the login form
- THEN the user is authenticated and redirected to the app dashboard
- AND the user's assigned nutrition or training plan is visible

##### Scenario: B2C user encounters gating for premium features

- GIVEN a B2C user on a FREE subscription plan
- WHEN the user attempts to access a premium-gated feature (e.g., AI token flows or advanced plan customization)
- THEN the system displays a gating prompt (upgrade/paywall)
- AND the user is NOT granted access to the premium feature

##### Scenario: B2C user with premium accesses AI flows

- GIVEN a B2C user on a PRO or STRENGTH_AI or NUTRI_AI subscription with positive AI token balance
- WHEN the user triggers an AI flow (e.g., AI plan generation or AI meal suggestion)
- THEN the system processes the request and returns a result
- AND the user's AI token balance is decremented

### 1.3 Gym Flow Validation

#### Requirement: Gym 7-Step Flow

The smoke E2E suite SHALL validate the complete gym flow: manager login, member join, plan assignment, and member plan visibility.

##### Scenario: Gym manager creates gym and receives activation code

- GIVEN a gym manager user with ADMIN gym role
- WHEN the manager creates a new gym
- THEN the system generates a unique activation code for the gym
- AND the gym is persisted with status ACTIVE

##### Scenario: Member joins gym via activation code

- GIVEN a gym exists with a valid activation code
- AND a non-member user provides the activation code
- WHEN the user submits the join request
- THEN a `GymMembership` is created with status `PENDING`
- AND the gym manager can approve the membership to set status `ACTIVE`

##### Scenario: Manager assigns training plan to member

- GIVEN an active gym membership exists for a member
- AND the gym manager has an existing training plan
- WHEN the manager assigns the training plan to the member
- THEN the `GymMembership.assignedTrainingPlanId` is set to the plan's ID
- AND the member can view the assigned training plan

##### Scenario: Manager assigns nutrition plan to member

- GIVEN an active gym membership exists for a member
- AND the gym manager has an existing nutrition plan
- WHEN the manager assigns the nutrition plan to the member
- THEN the `GymMembership.assignedNutritionPlanId` is set to the plan's ID
- AND the member can view the assigned nutrition plan

##### Scenario: Member sees assigned plan in their dashboard

- GIVEN a member has an assigned training plan and nutrition plan
- WHEN the member navigates to their plan view
- THEN the member sees the training plan with its days and exercises
- AND the member sees the nutrition plan with its days and meals

### 1.4 Smoke Gate CI Integration

#### Requirement: CI Required Gate

The system SHALL include the smoke pipeline as a required check in the CI pipeline.

##### Scenario: CI blocks merge on smoke failure

- GIVEN a pull request triggers CI
- WHEN the `smoke` job fails at any stage
- THEN the CI check is marked as failed
- AND the pull request cannot be merged until the smoke job passes

##### Scenario: CI allows merge on smoke pass

- GIVEN a pull request triggers CI
- WHEN the `smoke` job passes all stages
- THEN the CI check is marked as passed
- AND the pull request is eligible for merge

---

## 2. Sprint 2 — Nutrition Meal Log Durability

### 2.1 Prisma Model: MealLog

#### Requirement: MealLog Data Model

The system SHALL add a dedicated `MealLog` model to `apps/api/prisma/schema.prisma` replacing the JSON blob array stored in `UserProfile.tracking`.

##### MealLog Model Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Unique identifier |
| `userId` | `String` | required, foreign key to `User.id`, `onDelete: Cascade` | Owner of the meal log |
| `date` | `String` | required | ISO date string `YYYY-MM-DD` |
| `mealType` | `String` | required | e.g., `breakfast`, `lunch`, `dinner`, `snack` |
| `title` | `String` | required | Human-readable meal name |
| `items` | `Json` | required | Array of food items with `name`, `grams`, `calories`, `protein`, `carbs`, `fats` |
| `calories` | `Float` | required | Total meal calories |
| `protein` | `Float` | required | Total protein in grams |
| `carbs` | `Float` | required | Total carbs in grams |
| `fats` | `Float` | required | Total fats in grams |
| `completedAt` | `DateTime?` | nullable | Timestamp when the meal was marked complete; `null` = not yet completed |
| `createdAt` | `DateTime` | `@default(now())` | Creation timestamp |
| `updatedAt` | `DateTime` | `@updatedAt` | Last update timestamp |

##### Indexes

- `@@index([userId])` — query by user
- `@@index([userId, date])` — query by user and date (primary access pattern)

##### Scenario: MealLog model is created in schema

- GIVEN the Prisma schema at `apps/api/prisma/schema.prisma`
- WHEN the migration is generated
- THEN the `MealLog` model exists with all fields listed above
- AND the migration applies without errors on a PostgreSQL database

##### Scenario: MealLog relation to User

- GIVEN the `MealLog` model defines a relation to `User` via `userId`
- WHEN a user is deleted
- THEN all associated `MealLog` records are cascade-deleted

### 2.2 API: POST /meals/log

#### Requirement: Create Meal Log Entry

The system SHALL expose `POST /meals/log` to create a new meal log entry for the authenticated user.

##### Request Schema

```typescript
{
  date: string;       // REQUIRED, format: YYYY-MM-DD
  mealType: string;   // REQUIRED, non-empty
  title: string;      // REQUIRED, non-empty
  items: Array<{      // REQUIRED, at least one item
    name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }>;
  calories: number;   // REQUIRED, >= 0
  protein: number;    // REQUIRED, >= 0
  carbs: number;      // REQUIRED, >= 0
  fats: number;       // REQUIRED, >= 0
}
```

##### Response: 201 Created

```typescript
{
  id: string;
  userId: string;
  date: string;
  mealType: string;
  title: string;
  items: Array<{ name: string; grams: number; calories: number; protein: number; carbs: number; fats: number }>;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

##### Scenario: Create meal log entry successfully

- GIVEN an authenticated user
- WHEN the user sends `POST /meals/log` with valid body `{ date: "2026-03-23", mealType: "breakfast", title: "Oatmeal Bowl", items: [{ name: "Oats", grams: 80, calories: 300, protein: 10, carbs: 50, fats: 6 }], calories: 300, protein: 10, carbs: 50, fats: 6 }`
- THEN the server responds with `201 Created`
- AND the response body contains the created `MealLog` with a generated `id`
- AND `completedAt` is `null`
- AND `userId` matches the authenticated user

##### Scenario: Reject meal log with missing required fields

- GIVEN an authenticated user
- WHEN the user sends `POST /meals/log` with body missing `mealType`
- THEN the server responds with `400 Bad Request`
- AND the response body contains an error message identifying the missing field

##### Scenario: Reject meal log with empty items array

- GIVEN an authenticated user
- WHEN the user sends `POST /meals/log` with `items: []`
- THEN the server responds with `400 Bad Request`
- AND the error message indicates "items must contain at least one entry"

##### Scenario: Reject unauthenticated request

- GIVEN no valid authentication token
- WHEN a request is made to `POST /meals/log`
- THEN the server responds with `401 Unauthorized`

### 2.3 API: PATCH /meals/:id/complete

#### Requirement: Mark Meal as Completed

The system SHALL expose `PATCH /meals/:id/complete` to mark an existing meal log entry as completed.

##### Response: 200 OK

Returns the updated `MealLog` with `completedAt` set to the current server timestamp.

##### Scenario: Complete a meal log entry

- GIVEN an authenticated user owns a `MealLog` with id `meal_123` where `completedAt` is `null`
- WHEN the user sends `PATCH /meals/meal_123/complete`
- THEN the server responds with `200 OK`
- AND the response body has `completedAt` set to a non-null ISO 8601 timestamp
- AND `updatedAt` is updated

##### Scenario: Idempotent completion

- GIVEN an authenticated user owns a `MealLog` with id `meal_123` where `completedAt` is already set
- WHEN the user sends `PATCH /meals/meal_123/complete`
- THEN the server responds with `200 OK`
- AND `completedAt` retains its original value (no error, no duplicate update)

##### Scenario: Complete non-existent meal

- GIVEN an authenticated user
- WHEN the user sends `PATCH /meals/nonexistent_id/complete`
- THEN the server responds with `404 Not Found`

##### Scenario: Complete another user's meal

- GIVEN an authenticated user A
- AND a `MealLog` owned by user B
- WHEN user A sends `PATCH /meals/{userB_meal_id}/complete`
- THEN the server responds with `404 Not Found` (NOT 403 — no information leakage)

### 2.4 API: DELETE /meals/:id

#### Requirement: Delete Meal Log Entry

The system SHALL expose `DELETE /meals/:id` to delete an existing meal log entry.

##### Response: 204 No Content

No response body.

##### Scenario: Delete a meal log entry

- GIVEN an authenticated user owns a `MealLog` with id `meal_123`
- WHEN the user sends `DELETE /meals/meal_123`
- THEN the server responds with `204 No Content`
- AND the `MealLog` record is removed from the database
- AND subsequent `GET /meals?date=` requests do not include the deleted entry

##### Scenario: Delete non-existent meal

- GIVEN an authenticated user
- WHEN the user sends `DELETE /meals/nonexistent_id`
- THEN the server responds with `404 Not Found`

##### Scenario: Delete another user's meal

- GIVEN an authenticated user A
- AND a `MealLog` owned by user B
- WHEN user A sends `DELETE /meals/{userB_meal_id}`
- THEN the server responds with `404 Not Found`

### 2.5 API: GET /meals?date=

#### Requirement: Query Meal Log Entries by Date

The system SHALL expose `GET /meals?date=YYYY-MM-DD` to retrieve all meal log entries for the authenticated user on the given date.

##### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | `string` | YES | Date in `YYYY-MM-DD` format |

##### Response: 200 OK

```typescript
{
  meals: Array<{
    id: string;
    userId: string;
    date: string;
    mealType: string;
    title: string;
    items: Array<{ name: string; grams: number; calories: number; protein: number; carbs: number; fats: number }>;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

##### Scenario: Retrieve meals for a specific date

- GIVEN an authenticated user has 3 `MealLog` entries for `2026-03-23` and 1 entry for `2026-03-22`
- WHEN the user sends `GET /meals?date=2026-03-23`
- THEN the server responds with `200 OK`
- AND the response body contains exactly 3 meals in the `meals` array
- AND all meals have `date: "2026-03-23"`

##### Scenario: Retrieve meals for date with no entries

- GIVEN an authenticated user has no `MealLog` entries for `2026-01-01`
- WHEN the user sends `GET /meals?date=2026-01-01`
- THEN the server responds with `200 OK`
- AND the response body contains `meals: []`

##### Scenario: Reject request without date parameter

- GIVEN an authenticated user
- WHEN the user sends `GET /meals` (no `date` query param)
- THEN the server responds with `400 Bad Request`
- AND the error message indicates "date query parameter is required"

##### Scenario: Reject invalid date format

- GIVEN an authenticated user
- WHEN the user sends `GET /meals?date=not-a-date`
- THEN the server responds with `400 Bad Request`
- AND the error message indicates invalid date format

### 2.6 Meal Persistence Across Devices

#### Requirement: Multi-Device Meal Visibility

Meals created on one device SHALL be visible on all other devices for the same authenticated user after a data refresh.

##### Scenario: Meal logged on device A appears on device B

- GIVEN a user is authenticated on device A and device B with the same account
- WHEN the user creates a meal via `POST /meals/log` on device A
- AND the user triggers a data refresh (navigate to tracking view or pull-to-refresh) on device B
- THEN device B fetches `GET /meals?date=...` and the newly created meal appears in the response

##### Scenario: Meal completed on device A shows completed on device B

- GIVEN a meal exists and is not completed
- WHEN the user completes the meal via `PATCH /meals/:id/complete` on device A
- AND the user refreshes data on device B
- THEN device B sees `completedAt` as a non-null timestamp for that meal

##### Scenario: Meal deleted on device A disappears on device B

- GIVEN a meal exists
- WHEN the user deletes the meal via `DELETE /meals/:id` on device A
- AND the user refreshes data on device B
- THEN device B no longer sees the deleted meal in `GET /meals?date=...` results

### 2.7 Frontend Migration: nutritionAdherence

#### Requirement: nutritionAdherence Uses Meal API

The system SHALL migrate `apps/web/src/lib/nutritionAdherence.ts` to use the new `POST /meals/log`, `PATCH /meals/:id/complete`, `DELETE /meals/:id` endpoints instead of `POST /tracking` with `collection: "mealLog"`.

##### Scenario: Adherence logging creates meal via new API

- GIVEN the user logs a meal from the adherence tracking UI
- WHEN `nutritionAdherence.ts` executes the log action
- THEN it calls `POST /meals/log` with the meal payload
- AND it does NOT call `POST /tracking` with `collection: "mealLog"`

##### Scenario: Adherence completion uses new API

- GIVEN a meal log entry exists
- WHEN the user marks it complete from the adherence UI
- THEN `nutritionAdherence.ts` calls `PATCH /meals/:id/complete`
- AND it does NOT call `PATCH /tracking` or similar legacy endpoint

##### Scenario: Adherence deletion uses new API

- GIVEN a meal log entry exists
- WHEN the user deletes the meal from the adherence UI
- THEN `nutritionAdherence.ts` calls `DELETE /meals/:id`
- AND it does NOT call `DELETE /tracking` with `collection: "mealLog"`

### 2.8 Frontend Migration: nutritionQuickFavorites

#### Requirement: Quick Favorites Persist to Backend

The system SHALL migrate `apps/web/src/lib/nutritionQuickFavorites.ts` from localStorage-only persistence to backend persistence, ensuring favorites are available across devices.

##### Scenario: Favorite saved on device A is available on device B

- GIVEN a user adds a quick favorite meal on device A
- WHEN the user opens the quick favorites panel on device B
- THEN the favorite from device A is displayed
- AND no localStorage-only dependency prevents cross-device visibility

### 2.9 Data Validation

#### Requirement: Weight Validation

The system SHALL reject `weightKg` values that are `<= 0` or `> 500` with a `400 Bad Request` response.

##### Scenario: Reject zero weightKg

- GIVEN an authenticated user
- WHEN the user submits a checkin with `weightKg: 0`
- THEN the server responds with `400 Bad Request`
- AND the error specifies `weightKg` must be greater than 0 and at most 500

##### Scenario: Reject negative weightKg

- GIVEN an authenticated user
- WHEN the user submits a checkin with `weightKg: -5`
- THEN the server responds with `400 Bad Request`

##### Scenario: Reject weightKg exceeding 500

- GIVEN an authenticated user
- WHEN the user submits a checkin with `weightKg: 501`
- THEN the server responds with `400 Bad Request`

##### Scenario: Accept valid weightKg

- GIVEN an authenticated user
- WHEN the user submits a checkin with `weightKg: 85.5`
- THEN the server responds with `200 OK` or `201 Created`

#### Requirement: Energy Validation

The system SHALL reject `energy` values equal to `0` with a `400 Bad Request` response.

##### Scenario: Reject zero energy

- GIVEN an authenticated user
- WHEN the user submits a checkin with `energy: 0`
- THEN the server responds with `400 Bad Request`
- AND the error specifies `energy` must be non-zero

##### Scenario: Accept positive energy

- GIVEN an authenticated user
- WHEN the user submits a checkin with `energy: 7`
- THEN the server responds with `200 OK` or `201 Created`

#### Requirement: Body Measurement Zero-Guard in QuickLogHub

The system SHALL prevent `QuickLogHub` from writing zeroed body measurements (`chestCm: 0, waistCm: 0, hipsCm: 0, bicepsCm: 0, thighCm: 0, calfCm: 0, neckCm: 0`) when the user's `latestCheckin` is `null`.

##### Scenario: QuickLogHub skips zeroed measurements when no prior checkin

- GIVEN a user has no prior checkin (`latestCheckin` is `null`)
- WHEN the user opens QuickLogHub
- THEN the body measurement fields are left empty (not pre-filled with `0`)
- AND if the user submits without filling measurements, the system does NOT create a checkin with all measurements at `0`

##### Scenario: QuickLogHub pre-fills from latest checkin

- GIVEN a user has a prior checkin with `chestCm: 100, waistCm: 80`
- WHEN the user opens QuickLogHub
- THEN the body measurement fields are pre-filled with the latest checkin values
- AND the user can edit and submit updated values

---

## 3. Non-Functional Requirements

### 3.1 Performance

#### Requirement: Meal Query Latency

The system SHALL return `GET /meals?date=` responses within 200ms (p95) under normal load for a single user with up to 20 meals per day.

##### Scenario: Query completes within latency budget

- GIVEN a user has 20 meal log entries for a given date
- WHEN the user sends `GET /meals?date=YYYY-MM-DD`
- THEN the response is returned within 200ms

#### Requirement: Smoke Pipeline Duration

The smoke pipeline SHOULD complete within 10 minutes on CI with cached dependencies.

##### Scenario: CI smoke run completes in time

- GIVEN CI has cached `node_modules` and Playwright browsers
- WHEN the `smoke` job executes all stages
- THEN the total wall-clock time is under 10 minutes

### 3.2 Reliability

#### Requirement: Meal Mutation Atomicity

Meal create, complete, and delete operations SHALL be atomic — partial writes are not permitted.

##### Scenario: No partial meal creation

- GIVEN the database is under normal load
- WHEN `POST /meals/log` is called
- THEN either the full `MealLog` record is persisted or nothing is written
- AND no orphaned records with missing fields exist after a failed request

#### Requirement: Optimistic Concurrency for Meal Updates

The system SHOULD use `updatedAt` as an optimistic lock field to prevent stale writes during concurrent meal modifications across devices.

##### Scenario: Concurrent update detected

- GIVEN device A reads a meal with `updatedAt: T1`
- AND device B updates the same meal, setting `updatedAt: T2`
- WHEN device A attempts to update with stale data expecting `updatedAt: T1`
- THEN the system detects the conflict and responds with `409 Conflict` or applies last-write-wins with the latest `updatedAt`

---

## 4. Out of Scope

The following are explicitly OUT OF SCOPE for this change:

| Item | Reason |
|------|--------|
| Full offline sync / conflict resolution | Deferred to post-beta; requires CRDT or sync engine |
| Meal photo upload or OCR | Separate feature; no infrastructure in this sprint |
| Nutrition plan generation from logged meals | AI feature for post-beta; depends on meal data accumulation |
| Historical data migration of existing JSON-blob meal logs | Clean break; existing `UserProfile.tracking.mealLog` JSON data is NOT migrated to `MealLog` table |
| Real-time push notifications for meal updates | WebSockets/SSE not in scope; relies on client-side refresh |
| Meal sharing between users | Single-user meal ownership only |
| Calorie/macro goal tracking and alerts | Adherence percentage is in scope, but proactive goal alerts are not |
| Batch meal operations (bulk delete, bulk complete) | Single-record operations only |

---

## 5. Error Response Shape

All API endpoints SHALL use a consistent error response format:

```typescript
{
  error: {
    code: string;       // Machine-readable error code (e.g., "VALIDATION_ERROR", "NOT_FOUND", "UNAUTHORIZED")
    message: string;    // Human-readable description
    details?: Array<{   // Optional field-level errors
      field: string;
      message: string;
    }>;
  }
}
```

### Error Codes

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `VALIDATION_ERROR` | 400 | Invalid input fields |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Authenticated but not allowed (not used for meal cross-user access — use NOT_FOUND) |
| `NOT_FOUND` | 404 | Resource does not exist or belongs to another user |
| `CONFLICT` | 409 | Optimistic lock failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 6. Success Criteria

- [ ] `npm run smoke` passes green 3 consecutive times locally
- [ ] B2C checklist validated: login → plan visible → gating → AI flows
- [ ] Gym checklist validated: 7-step flow completes
- [ ] `MealLog` model exists in Prisma schema with migration applied
- [ ] `POST /meals/log` returns `201` with correct body
- [ ] `PATCH /meals/:id/complete` returns `200` with `completedAt` set
- [ ] `DELETE /meals/:id` returns `204` and removes record
- [ ] `GET /meals?date=` returns correct meals filtered by date
- [ ] `nutritionAdherence.ts` uses new meal API (no `POST /tracking` with `collection: "mealLog"`)
- [ ] `nutritionQuickFavorites.ts` persists to backend (not localStorage-only)
- [ ] `weightKg <= 0` or `> 500` rejected with `400`
- [ ] `energy === 0` rejected with `400`
- [ ] QuickLogHub does not write `chestCm: 0, waistCm: 0` when `latestCheckin` is null
- [ ] Smoke gate runs in CI as required check
- [ ] Meal logged on device A visible on device B after refresh
