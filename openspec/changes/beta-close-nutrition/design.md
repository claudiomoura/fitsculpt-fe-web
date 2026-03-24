# Design: Beta Close + Nutrition Durability

## 1. Smoke Pipeline Architecture

### 1.1 Current State

The smoke pipeline is partially wired in `apps/web/package.json` (line 12):

```json
"smoke": "pnpm lint && pnpm lint:ds:imports && pnpm typecheck && pnpm test && pnpm e2e -- e2e/gym-nutrition-flow.spec.ts --reporter=line && pnpm build"
```

Pipeline stages:
1. `lint` → ESLint checks
2. `lint:ds:imports` → Design system import guardrails
3. `typecheck` → TypeScript compile check
4. `test` → Vitest unit tests
5. `e2e` → Playwright E2E (currently only gym-nutrition-flow.spec.ts)
6. `build` → Next.js production build

### 1.2 Design: Smoke Pipeline Enhancements

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMOKE PIPELINE FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐          │
│  │  lint   │───▶│ typecheck  │───▶│    test    │───▶│   e2e   │          │
│  └─────────┘    └─────────────┘    └─────────────┘    └─────────┘          │
│      │                                           │          │               │
│      │ FAIL                                      │ FAIL     │ FAIL          │
│      ▼                                           ▼          ▼               │
│  ┌─────────┐                                     EXIT 1 ────┴───┐           │
│  │  EXIT 1 │                                              │               │
│  └─────────┘                                              │               │
│                                                            ▼               │
│                                              ┌─────────────────────────┐   │
│                                              │  e2e/nutrition-checkin  │   │
│                                              │  e2e/gym-nutrition-flow │   │
│                                              │  e2e/gym-flow            │   │
│                                              └─────────────────────────┘   │
│                                                            │               │
│                                                            │ SUCCESS       │
│                                                            ▼               │
│                                              ┌─────────────────────────┐   │
│                                              │         build           │   │
│                                              │   (Next.js prod build)  │   │
│                                              └─────────────────────────┘   │
│                                                            │               │
│                                                            ▼               │
│                                              ┌─────────────────────────┐   │
│                                              │       EXIT 0           │   │
│                                              └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Modified Files

| File | Change |
|------|--------|
| `apps/web/package.json` | Update `smoke` script to include all required E2E specs |
| `apps/web/scripts/run-beta-smoke.mjs` | Fix spec path references to match actual files |

#### Updated smoke Script

```json
"smoke": "pnpm lint && pnpm lint:ds:imports && pnpm typecheck && pnpm test && pnpm e2e -- e2e/nutrition-checkin-core.spec.ts e2e/gym-nutrition-flow.spec.ts e2e/gym-flow.spec.ts --reporter=line && pnpm build"
```

---

## 2. Smoke Playwright Config Design

### 2.1 Current Config

Playwright config is at `apps/web/playwright.config.ts`.

### 2.2 Design: Smoke-Specific Config

For CI integration, create smoke-specific config that:
- Runs only critical path specs (not full suite)
- Uses parallelization where possible
- Reports pass/fail clearly

```typescript
// apps/web/playwright.config.ts (add smoke config)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... existing config
});
```

For CI, run with explicit config:

```bash
npx playwright test --config=playwright.config.ts \
  e2e/nutrition-checkin-core.spec.ts \
  e2e/gym-nutrition-flow.spec.ts \
  e2e/gym-flow.spec.ts \
  --reporter=line
```

#### Test Users for Smoke

| User Type | Email | Plan | Purpose |
|-----------|-------|------|---------|
| B2C Free | `smoke-free@test.com` | FREE | Gating tests |
| B2C Pro | `smoke-pro@test.com` | PRO | AI flow tests |
| Gym Manager | `smoke-gym@test.com` | ADMIN | Gym flow |
| Gym Member | `smoke-member@test.com` | MEMBER | Member view |

---

## 3. Prisma Schema: MealLog Model

### 3.1 New Model

Add to `apps/api/prisma/schema.prisma`:

```prisma
model MealLog {
  id          String   @id @default(cuid())
  userId      String
  date        String   // YYYY-MM-DD
  mealType    String   // breakfast, lunch, dinner, snack
  title       String
  items       Json     // Array of food items
  calories    Float
  protein     Float
  carbs       Float
  fats        Float
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, date])
}
```

Relation to User model:
- `userId` → `User.id` with `onDelete: Cascade`

### 3.2 Migration Strategy

```bash
cd apps/api
npx prisma migrate dev --name add_meal_log_model
```

Migration SQL (PostgreSQL):
```sql
CREATE TABLE "MealLog" (
  "id" TEXT NOT NULL DEFAULT cuid(),
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "mealType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fats" DOUBLE PRECISION NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MealLog_userId_idx" ON "MealLog"("userId");
CREATE INDEX "MealLog_userId_date_idx" ON "MealLog"("userId", "date");
```

---

## 4. API Endpoints

### 4.1 Module Structure

```
apps/api/src/meals/
├── service.ts      # MealLogService
├── routes.ts       # Route registration
└── schemas.ts      # Zod request/response schemas
```

### 4.2 POST /meals/log

Create a new meal log entry.

**Request:**
```typescript
{
  date: string;       // REQUIRED, format: YYYY-MM-DD
  mealType: string;   // REQUIRED, non-empty
  title: string;     // REQUIRED, non-empty
  items: Array<{     // REQUIRED, at least one item
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

**Response (201):**
```typescript
{
  id: string;
  userId: string;
  date: string;
  mealType: string;
  title: string;
  items: Array<{...}>;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- 400: Missing required fields, empty items array
- 401: Unauthorized

### 4.3 PATCH /meals/:id/complete

Mark meal as completed (idempotent).

**Response (200):**
```typescript
{
  id: string;
  // ... full MealLog object
  completedAt: string;  // ISO timestamp
}
```

**Error Responses:**
- 404: Meal not found or belongs to another user

### 4.4 DELETE /meals/:id

Delete a meal log entry.

**Response:** 204 No Content

**Error Responses:**
- 404: Meal not found or belongs to another user

### 4.5 GET /meals?date=

Query meals by date.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | YES | YYYY-MM-DD |

**Response (200):**
```typescript
{
  meals: Array<{
    id: string;
    userId: string;
    date: string;
    mealType: string;
    title: string;
    items: Array<{...}>;
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

**Error Responses:**
- 400: Missing or invalid date parameter

---

## 5. Data Migration Strategy

### 5.1 Current State

`UserProfile.tracking` stores meal logs as JSON:
```json
{
  "mealLog": [
    { "id": "2026-03-20:breakfast", "date": "2026-03-20", "mealKey": "breakfast", ... }
  ]
}
```

### 5.2 Migration: JSON Blob → MealLog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DATA MIGRATION: TRACKING → MEALLOG                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BEFORE                                  AFTER                              │
│  ┌─────────────────────────┐            ┌─────────────────────────┐       │
│  │  UserProfile.tracking  │            │      MealLog table       │       │
│  │  { mealLog: [...] }    │   ──────▶  │  (new dedicated model)   │       │
│  └─────────────────────────┘            └─────────────────────────┘       │
│                                                                             │
│  Note: Clean break - NOT migrated. UserProfile.tracking.mealLog continues  │
│        to work as fallback. Post-beta, we can deprecate and remove.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

Per spec, this is a **clean break** — no migration of existing JSON blob data.

### 5.3 Why No Migration

1. JSON blob may contain malformed/incomplete data
2. Meal IDs may conflict with new CUID-based IDs
3. Simpler to start fresh with proper relational data
4. Spec explicitly states: "Historical data migration of existing JSON-blob meal logs (clean break)"

---

## 6. Frontend Service Migration

### 6.1 nutritionAdherence.ts Changes

**Current Implementation** (`apps/web/src/lib/nutritionAdherence.ts`):

```typescript
// Line 109-128: POST /tracking with collection: "mealLog"
const response = await fetch("/api/tracking", {
  method: "POST",
  body: JSON.stringify({
    collection: "mealLog",
    item: { ... }
  }),
});
```

**Target Implementation:**

```typescript
// NEW: POST /meals/log
const response = await fetch("/api/meals/log", {
  method: "POST",
  body: JSON.stringify(mealPayload),
});

// NEW: PATCH /meals/:id/complete  
const response = await fetch(`/api/meals/${mealId}/complete`, {
  method: "PATCH",
});

// NEW: DELETE /meals/:id
const response = await fetch(`/api/meals/${mealId}`, {
  method: "DELETE",
});
```

### 6.2 Service Layer Refactor

Create `apps/web/src/services/mealApi.ts`:

```typescript
export async function createMealLog(data: CreateMealLogInput): Promise<MealLog>
export async function completeMealLog(id: string): Promise<MealLog>
export async function deleteMealLog(id: string): Promise<void>
export async function getMealLogsByDate(date: string): Promise<MealLog[]>
```

### 6.3 API Response Shape

The new API returns different shape than tracking JSON:

| Aspect | Old (tracking) | New (meals) |
|--------|----------------|-------------|
| ID | `date:mealKey` composite | CUID |
| Date | In ID + field | Standalone field |
| Completed | `completedAt` timestamp | `completedAt` timestamp |
| Query | All tracking + filter | Direct by date |

### 6.4 Backward Compatibility

Keep both paths working:
- New meals created via `/meals/log`
- Legacy meals still in `UserProfile.tracking.mealLog`
- `nutritionAdherence.ts` reads from tracking snapshot (still includes mealLog)

---

## 7. Data Validation Guards

### 7.1 weightKg Validation

Located in `apps/api/src/tracking/schemas.ts`.

**Current:** No validation (line 6: `weightKg: z.number()`)

**New:** Add Zod refinement:

```typescript
const checkinSchema = z.object({
  // ... other fields
  weightKg: z.number()
    .positive("weightKg must be greater than 0")
    .max(500, "weightKg must be at most 500"),
});
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "weightKg", "message": "weightKg must be greater than 0" }
    ]
  }
}
```

### 7.2 Energy Validation

**Current:** No validation

**New:**
```typescript
const checkinSchema = z.object({
  // ... other fields
  energy: z.number()
    .refine(val => val !== 0, { message: "energy must be non-zero" }),
});
```

### 7.3 QuickLogHub Zero-Guard

Current bug at `apps/web/src/components/quick-log/QuickLogHub.tsx:66-75`:

```typescript
function checkinFromWeight(date, weightKg, latestCheckin) {
  return {
    // BUG: Uses ?? 0 which defaults to 0 when latestCheckin is null
    chestCm: Number(latestCheckin?.chestCm ?? 0),
    waistCm: Number(latestCheckin?.waistCm ?? 0),
    // ...
  };
}
```

**Fix:** Skip body measurements entirely when no prior checkin:

```typescript
function checkinFromWeight(date, weightKg, latestCheckin) {
  const hasPriorCheckin = latestCheckin !== null;
  return {
    id: `${date}-${Date.now()}-quick-weight`,
    date,
    weightKg,
    // Only copy body measurements if we have prior data
    chestCm: hasPriorCheckin ? Number(latestCheckin.chestCm ?? 0) : null,
    waistCm: hasPriorCheckin ? Number(latestCheckin.waistCm ?? 0) : null,
    hipsCm: hasPriorCheckin ? Number(latestCheckin.hipsCm ?? 0) : null,
    bicepsCm: hasPriorCheckin ? Number(latestCheckin.bicepsCm ?? 0) : null,
    thighCm: hasPriorCheckin ? Number(latestCheckin.thighCm ?? 0) : null,
    calfCm: hasPriorCheckin ? Number(latestCheckin.calfCm ?? 0) : null,
    neckCm: hasPriorCheckin ? Number(latestCheckin.neckCm ?? 0) : null,
    bodyFatPercent: hasPriorCheckin ? Number(latestCheckin.bodyFatPercent ?? 0) : 0,
    energy: Number(latestCheckin?.energy ?? 3),
    hunger: Number(latestCheckin?.hunger ?? 3),
    notes: "",
    recommendation: "Quick weight log",
    frontPhotoUrl: null,
    sidePhotoUrl: null,
  };
}
```

---

## 8. File Changes Table

### 8.1 Sprint 1 — Smoke

| File | Action | Description |
|------|--------|-------------|
| `apps/web/package.json` | MODIFY | Update `smoke` script |
| `apps/web/scripts/run-beta-smoke.mjs` | MODIFY | Fix spec path references |
| `apps/web/playwright.config.ts` | MODIFY | Add smoke-specific config (if needed) |

### 8.2 Sprint 2 — Nutrition Persistence

| File | Action | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` | MODIFY | Add MealLog model |
| `apps/api/prisma/migrations/*.sql` | NEW | Migration for MealLog |
| `apps/api/src/meals/service.ts` | NEW | MealLogService |
| `apps/api/src/meals/routes.ts` | NEW | Route registration |
| `apps/api/src/meals/schemas.ts` | NEW | Zod schemas |
| `apps/api/src/tracking/schemas.ts` | MODIFY | Add weight/energy validation |
| `apps/api/src/routes.ts` | MODIFY | Register /meals routes |
| `apps/web/src/services/mealApi.ts` | NEW | Frontend meal API client |
| `apps/web/src/lib/nutritionAdherence.ts` | MODIFY | Use new meal API |
| `apps/web/src/lib/nutritionQuickFavorites.ts` | MODIFY | Backend persistence |
| `apps/web/src/components/quick-log/QuickLogHub.tsx` | MODIFY | Fix zeroed measurements |

---

## 9. Testing Strategy

### 9.1 Unit Tests

| File | Test Coverage |
|------|---------------|
| `apps/api/src/meals/service.test.ts` | MealLogService CRUD |
| `apps/api/src/tracking/validation.test.ts` | weightKg, energy guards |
| `apps/web/src/lib/nutritionAdherence.test.ts` | Toggle, clearDay functions |

### 9.2 Integration Tests

| File | Test Coverage |
|------|---------------|
| `apps/api/test/meals-api.test.ts` | Full endpoint tests |
| `apps/api/test/tracking-validation.test.ts` | Validation middleware |

### 9.3 E2E Smoke Tests

| Spec File | Coverage |
|-----------|----------|
| `e2e/nutrition-checkin-core.spec.ts` | B2C core flow |
| `e2e/gym-nutrition-flow.spec.ts` | Gym 7-step flow |
| `e2e/gym-flow.spec.ts` | Gym manager + member flows |

### 9.4 Test Data Setup

```typescript
// Create test user with meal logs
async function createTestUserWithMeals() {
  const user = await createUser({ plan: 'PRO' });
  await prisma.mealLog.createMany({
    data: [
      { userId: user.id, date: '2026-03-23', mealType: 'breakfast', title: 'Oatmeal', items: [...], ... },
    ]
  });
  return user;
}
```

---

## 10. Implementation Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IMPLEMENTATION DEPENDENCY DAG                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sprint 1: Smoke                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  package.json:smoke ──▶ run-beta-smoke.mjs ──▶ E2E specs ──▶ build │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  Sprint 2: Nutrition                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  schema.prisma ──▶ migrate ──▶ meals/service ──▶ meals/routes      │    │
│  │         │                                         │                 │    │
│  │         ▼                                         ▼                 │    │
│  │  validation guards ◀───────────────────── mealApi.ts              │    │
│  │         │                          │              │                 │    │
│  │         ▼                          ▼              ▼                 │    │
│  │  QuickLogHub.tsx ◀──────── nutritionAdherence.ts ──────────────────┘    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Rollback Plan

### Sprint 1 (Smoke)
1. Remove `smoke` script from `package.json`
2. Revert `run-beta-smoke.mjs` changes
3. No data impact

### Sprint 2 (MealLog)
1. `npx prisma migrate reset`
2. Revert `meals/` module changes
3. Revert frontend to use `POST /tracking` with JSON blob
4. Old tracking flow still works (MealLog is additive)

---

## 12. Success Criteria Checklist

- [ ] `npm run smoke` passes green 3x locally
- [ ] B2C checklist: login → plan visible → gating → AI flows
- [ ] Gym checklist: 7-step flow completes
- [ ] `MealLog` model in Prisma schema with migration
- [ ] `POST /meals/log` returns 201
- [ ] `PATCH /meals/:id/complete` returns 200
- [ ] `DELETE /meals/:id` returns 204
- [ ] `GET /meals?date=` filters correctly
- [ ] `nutritionAdherence.ts` uses new meal API
- [ ] `nutritionQuickFavorites.ts` persists to backend
- [ ] `weightKg <= 0` or `> 500` → 400
- [ ] `energy === 0` → 400
- [ ] QuickLogHub no zeroed measurements when null checkin
- [ ] Smoke gate runs in CI
