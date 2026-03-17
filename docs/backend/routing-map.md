# Backend routing map (API)

> Si buscas una ruta, empieza por su dominio.

Este mapa está pensado para ubicar rápidamente dónde se registra cada endpoint.

## AI
- **Registro principal:** `apps/api/src/domains/ai/registerAiRoutes.ts`
- Rutas clave:
  - `/ai/quota`
  - `/ai/training-plan`
  - `/ai/training-plan/generate`
  - `/ai/nutrition-plan`
  - `/ai/nutrition-plan/generate`
  - `/ai/daily-tip`

## Billing / Entitlements
- **Registro principal:** `apps/api/src/domains/billing/registerBillingRoutes.ts`
- Rutas clave:
  - `/billing/checkout`
  - `/billing/plans`
  - `/billing/portal`
  - `/billing/status`
  - `/billing/admin/reset-customer-link`
  - `/billing/stripe/webhook`

## Gym
- **Registro principal:** `apps/api/src/domains/gym/registerGymRoutes.ts`
- Rutas clave:
  - `/gyms`
  - `/gyms/join`
  - `/gyms/join-by-code`
  - `/gyms/membership`
  - `/trainer/gym`
  - `/trainer/plans`
  - `/trainer/plans/:planId`
  - `/trainer/clients`
  - `/workouts`
  - `/workout-sessions/:id/finish`

## Training
- **Registro principal:** `apps/api/src/domains/training/registerTrainingRoutes.ts`
- Rutas clave:
  - `/exercises`
  - `/exercises/:id`
  - `/training-plans`
  - `/training-plans/:id`
  - `/training-plans/active`
  - `/training-plans/:planId/days/:dayId/exercises`

## Nutrition
- **Registros principales:**
  - `apps/api/src/domains/nutrition/registerNutritionRoutes.ts`
  - `apps/api/src/domains/gym/registerGymRoutes.ts` (planes de nutrición de trainer/member)
- Rutas clave:
  - `/user-foods`
  - `/user-foods/:id`
  - `/nutrition-plans`
  - `/nutrition-plans/:id`
  - `/trainer/nutrition-plans`
  - `/members/me/assigned-nutrition-plan`

## Tracking (existente, aún inline)
- **Registro actual:** `apps/api/src/index.ts`
- Rutas clave:
  - `/tracking`
  - `/tracking/:collection/:id`
  - `/review/weekly`

## Library / Content (existente, aún inline)
- **Registro actual:** `apps/api/src/index.ts`
- Rutas clave:
  - `/feed`
  - `/feed/generate`
  - `/recipes`
  - `/recipes/:id`
  - `/exercises`
