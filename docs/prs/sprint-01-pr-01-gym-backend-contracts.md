# [Sprint 01][PR 01] Gym backend contracts

## Objetivo
Estabilizar contratos Gym del Backend (`gyms list`, `membership`, `join requests`) y resolver **Leave Gym** de forma real end-to-end.

## Endpoints reales backend (fuente de verdad)

### 1) Gym list
- `GET /gyms`
- Request query opcional: `q` (string)
- Response estable:

```json
{
  "gyms": [
    { "id": "cuid", "name": "FitSculpt Central" }
  ],
  "items": [
    { "id": "cuid", "name": "FitSculpt Central" }
  ]
}
```

### 2) Membership
- `GET /gyms/membership`
- `GET /gym/me` (alias)
- Response estable:

```json
{
  "status": "NONE | PENDING | ACTIVE",
  "state": "none | pending | active",
  "gym": { "id": "cuid", "name": "FitSculpt Central" } | null,
  "role": "ADMIN | TRAINER | MEMBER" | null
}
```

Notas:
- `status` es el contrato estable tipable.
- `state` se mantiene por compatibilidad legacy.
- Mapeo explícito: `REJECTED -> NONE` (no se expone como estado principal de membership actual).

### 3) Join requests list
- `GET /admin/gym-join-requests`
- Response estable:

```json
{
  "items": [
    {
      "id": "membershipId",
      "membershipId": "membershipId",
      "status": "PENDING",
      "gym": { "id": "cuid", "name": "FitSculpt Central" },
      "user": { "id": "cuid", "name": "Jane", "email": "jane@fit.com" },
      "createdAt": "2026-02-18T10:00:00.000Z"
    }
  ],
  "requests": [
    {
      "id": "membershipId",
      "membershipId": "membershipId",
      "status": "PENDING",
      "gym": { "id": "cuid", "name": "FitSculpt Central" },
      "user": { "id": "cuid", "name": "Jane", "email": "jane@fit.com" },
      "createdAt": "2026-02-18T10:00:00.000Z"
    }
  ]
}
```


### 4) Mi gimnasio (trainer/admin)
- `GET /trainer/gym`
- `PATCH /trainer/gym`
- Auth: `requireUser` + membresía activa `ADMIN|TRAINER`.
- Scope: solo devuelve/actualiza el gym vinculado al entrenador autenticado (no directorio).

Response estable (`GET` y `PATCH`):

```json
{
  "gym": {
    "id": "cuid",
    "name": "FitSculpt Central",
    "code": "CENTRAL01",
    "activationCode": "A1B2C3",
    "createdAt": "2026-02-18T10:00:00.000Z",
    "updatedAt": "2026-02-18T10:00:00.000Z"
  },
  "membership": {
    "role": "ADMIN | TRAINER"
  }
}
```

Errores consistentes:
- `403 FORBIDDEN` si el usuario no es `ADMIN|TRAINER` activo en un gym.
- `400 INVALID_INPUT` si el payload de `PATCH` es inválido o vacío.

### Accept / Reject
- `POST /admin/gym-join-requests/:membershipId/accept`
- `POST /admin/gym-join-requests/:membershipId/reject`
- Se mantienen, sin cambios de contrato.

## Leave Gym (resuelto)

Implementado de forma real y consistente:
- `DELETE /gyms/membership`
- `DELETE /gym/me` (alias)

Comportamiento:
- Busca membresía más reciente del usuario en estado `PENDING|ACTIVE`.
- Si existe, elimina la relación `GymMembership` (leave real, sin fake).
- Si no existe, responde 200 idempotente.

Response:

```json
{
  "left": true,
  "membership": {
    "status": "NONE",
    "state": "none",
    "gym": null,
    "role": null
  }
}
```

## Ejemplos curl

```bash
# List gyms
curl -X GET "$API_URL/gyms?q=fit" -H "Authorization: Bearer $TOKEN"

# Read membership
curl -X GET "$API_URL/gym/me" -H "Authorization: Bearer $TOKEN"

# Join by code
curl -X POST "$API_URL/gyms/join-by-code" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"CENTRAL01"}'

# Join requests list (admin/manager)
curl -X GET "$API_URL/admin/gym-join-requests" -H "Authorization: Bearer $TOKEN"

# Accept request
curl -X POST "$API_URL/admin/gym-join-requests/$MEMBERSHIP_ID/accept" -H "Authorization: Bearer $TOKEN"

# Reject request
curl -X POST "$API_URL/admin/gym-join-requests/$MEMBERSHIP_ID/reject" -H "Authorization: Bearer $TOKEN"

# Read my trainer gym
curl -X GET "$API_URL/trainer/gym" -H "Authorization: Bearer $TOKEN"

# Update my trainer gym
curl -X PATCH "$API_URL/trainer/gym" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"FitSculpt Central Updated"}'

# Leave gym
curl -X DELETE "$API_URL/gym/me" -H "Authorization: Bearer $TOKEN"
```

## DoD command output

```bash
$ npm run build
Error: Failed to fetch the engine file at https://binaries.prisma.sh/.../schema-engine.gz - 403 Forbidden
```

```bash
$ PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npm run build
Error: Failed to fetch the engine file at https://binaries.prisma.sh/.../schema-engine.gz - 403 Forbidden
```

```bash
$ npx tsc --noEmit
src/... error TS2305: Module '"@prisma/client"' has no exported member 'Prisma'.
# (pre-existing due to prisma client not generated in this environment)
```

```bash
$ npm test
authUtils tests passed
```

## Prisma / migraciones
- No hay cambios de `schema.prisma`.
- No hay migración en este PR.
