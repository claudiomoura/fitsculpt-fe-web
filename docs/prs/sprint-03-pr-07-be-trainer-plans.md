# [Sprint 03][PR 07] BE Trainer plans + assignment

## Scope implemented

Backend mínimo para trainers sobre `TrainingPlan` + asignación a clientes del gym:

- `GET /trainer/plans`: listar planes visibles del gym del trainer.
- `POST /trainer/plans`: crear plan base (persistido en `TrainingPlan` + `TrainingDay`).
- `GET /trainer/plans/:planId`: detalle plan con días y ejercicios persistidos.
- `PATCH /trainer/plans/:planId`: actualizar plan del trainer (solo campos persistentes soportados).
- `POST /trainer/clients/:userId/assigned-plan`: asignar plan a cliente del mismo gym.
- `DELETE /trainer/clients/:userId/assigned-plan`: quitar plan asignado a cliente del mismo gym.

Además, se amplió respuesta de:
- `GET /trainer/clients`
- `GET /trainer/clients/:userId`

para incluir `assignedPlan` (si existe).

## Entidades reales usadas (Prisma)

- `TrainingPlan`
  - Campos persistentes: `id`, `userId`, `title`, `notes`, `goal`, `level`, `daysPerWeek`, `focus`, `equipment`, `startDate`, `daysCount`, timestamps.
- `TrainingDay`
  - Estructura por día del plan.
- `TrainingExercise`
  - Ejercicios persistidos por día.
- `GymMembership`
  - Scoping por gym y relación de asignación con `assignedTrainingPlanId`.

No se agregaron campos nuevos al modelo.

## Contract (request/response)

### GET `/trainer/plans`

Response `200`:

```json
{
  "items": [
    {
      "id": "clx...",
      "userId": "clu...",
      "title": "Plan fuerza base",
      "notes": null,
      "goal": "general_fitness",
      "level": "beginner",
      "daysPerWeek": 4,
      "focus": "full_body",
      "equipment": "bodyweight",
      "startDate": "2026-01-01T00:00:00.000Z",
      "daysCount": 4,
      "createdAt": "2026-01-01T10:00:00.000Z",
      "updatedAt": "2026-01-01T10:00:00.000Z"
    }
  ]
}
```

### POST `/trainer/plans`

Request mínimo:

```json
{
  "title": "Plan fuerza base",
  "daysCount": 4
}
```

Notas:
- `daysPerWeek` default: `min(daysCount, 7)`.
- `startDate` default: fecha actual del servidor.
- Defaults persistidos: `goal`, `level`, `focus`, `equipment`.

Response `201`: `TrainingPlan` con `days[]` + `days[].exercises[]`.

### GET `/trainer/plans/:planId`

Response `200`: `TrainingPlan` completo con `days[]` y `days[].exercises[]`.

### PATCH `/trainer/plans/:planId`

Request (cualquier subset soportado):

```json
{
  "title": "Plan fuerza base v2",
  "daysCount": 5,
  "focus": "upper_lower",
  "notes": null
}
```

Comportamiento:
- Solo actualiza campos persistentes del modelo.
- Si cambia `daysCount`, `focus` o `startDate`, se reconstruyen `TrainingDay` del plan.

Response `200`: plan actualizado con `days[]`.

### POST `/trainer/clients/:userId/assigned-plan`

Request:

```json
{
  "trainingPlanId": "clx..."
}
```

Response `200`:

```json
{
  "memberId": "clu_member...",
  "gymId": "clu_gym...",
  "assignedPlan": {
    "id": "clx...",
    "title": "Plan fuerza base",
    "goal": "general_fitness",
    "level": "beginner",
    "daysPerWeek": 4,
    "focus": "full_body",
    "equipment": "bodyweight",
    "startDate": "2026-01-01T00:00:00.000Z",
    "daysCount": 4
  }
}
```

### DELETE `/trainer/clients/:userId/assigned-plan`

Response `200`:

```json
{
  "memberId": "clu_member...",
  "gymId": "clu_gym...",
  "assignedPlan": null
}
```

## Gym scoping aplicado

- Trainer/Admin debe tener membership `ACTIVE` con role `ADMIN|TRAINER`.
- Listado/detalle de planes de trainer se limita al propio trainer + planes ya asignados a miembros de su gym.
- Asignación/desasignación solo opera sobre `GymMembership` dentro del `gymId` del trainer.
- No hay acceso cross-gym.

## Campos persistidos vs NO soportados

### Persistidos (backend truth)

- En plan: `title`, `notes`, `goal`, `level`, `daysPerWeek`, `focus`, `equipment`, `startDate`, `daysCount`.
- En días: `date`, `label`, `focus`, `duration`, `order`.
- En ejercicios por día: `name`, `sets`, `reps`, `tempo`, `rest`, `notes` (cuando se creen por endpoint existente).
- En asignación: `GymMembership.assignedTrainingPlanId`.

### NO existen / no persistir desde FE en este PR

- `weight/load` por ejercicio de plantilla de plan (no hay campo de carga objetivo en `TrainingExercise`).
- `completed` flags por ejercicio de plantilla.
- Campos de periodización avanzada (mesociclos, bloques, deload, etc.).
- Marketplace metadata.

## Ejemplos cURL

```bash
# 1) Listar planes del gym del trainer
curl -X GET "$API_URL/trainer/plans" \
  -H "Authorization: Bearer $TRAINER_TOKEN"

# 2) Crear plan mínimo
curl -X POST "$API_URL/trainer/plans" \
  -H "Authorization: Bearer $TRAINER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Plan fuerza base","daysCount":4}'

# 3) Obtener detalle plan
curl -X GET "$API_URL/trainer/plans/$PLAN_ID" \
  -H "Authorization: Bearer $TRAINER_TOKEN"

# 4) Actualizar plan
curl -X PATCH "$API_URL/trainer/plans/$PLAN_ID" \
  -H "Authorization: Bearer $TRAINER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Plan fuerza base v2","daysCount":5}'

# 5) Asignar plan a cliente
curl -X POST "$API_URL/trainer/clients/$CLIENT_USER_ID/assigned-plan" \
  -H "Authorization: Bearer $TRAINER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trainingPlanId":"'$PLAN_ID'"}'

# 6) Verificar cliente con plan asignado
curl -X GET "$API_URL/trainer/clients/$CLIENT_USER_ID" \
  -H "Authorization: Bearer $TRAINER_TOKEN"

# 7) Quitar plan asignado
curl -X DELETE "$API_URL/trainer/clients/$CLIENT_USER_ID/assigned-plan" \
  -H "Authorization: Bearer $TRAINER_TOKEN"
```

## DoD backend commands (ejecutados)

```bash
npm test
npx tsc --noEmit
```

> `npx tsc --noEmit` actualmente falla por baseline de tipado en el repo (no introducido por este PR).
