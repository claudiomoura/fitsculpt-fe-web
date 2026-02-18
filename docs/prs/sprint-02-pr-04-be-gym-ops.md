# [Sprint 02][PR 04] BE Gym ops (create/delete/join/members)

## Inventario de rutas Gym existentes (backend source of truth)

Handlers en `apps/api/src/index.ts`:

| Endpoint | Método | Auth | Handler |
|---|---|---|---|
| `/admin/gyms` | `POST` | `requireAdmin` | create gym |
| `/admin/gyms/:gymId` | `DELETE` | `requireAdmin` | delete gym |
| `/gyms` | `GET` | `requireUser` | list gyms |
| `/gyms/join` y `/gym/join-request` | `POST` | `requireUser` | create join request |
| `/admin/gym-join-requests` | `GET` | `requireUser` + manager/admin gating | list join requests |
| `/admin/gym-join-requests/:membershipId/accept` | `POST` | `requireUser` + manager/admin gating | accept join request |
| `/admin/gym-join-requests/:membershipId/reject` | `POST` | `requireUser` + manager/admin gating | reject join request |
| `/admin/gyms/:gymId/members` | `GET` | `requireUser` + `requireGymManagerForGym` | list active members |

## Cambios aplicados en este PR

1. **List join requests**: bloqueo explícito para usuarios autenticados que no son `ADMIN` global ni `TRAINER/ADMIN` activo en algún gym (`403 FORBIDDEN` con mensaje accionable).
2. **Create gym**: conflicto de código duplicado ahora responde `409 GYM_CODE_ALREADY_EXISTS`.
3. **Delete gym**: permite borrado admin aunque tenga memberships (cascade), devolviendo `deletedMemberships` para trazabilidad.

No se añadieron entidades ni campos de base de datos. No hay migración Prisma.

## Contratos request/response (estables)

| Endpoint | Request | Response success | Errores accionables |
|---|---|---|---|
| `POST /admin/gyms` | `{ name: string(2..120), code: string(4..24, A-Z0-9_-)} ` | `201 { id, name, code, activationCode }` | `409 GYM_CODE_ALREADY_EXISTS`, `400` zod validation |
| `DELETE /admin/gyms/:gymId` | path `gymId` | `200 { ok: true, gymId, deletedMemberships }` | `404 NOT_FOUND` |
| `GET /gyms` | query opcional `q` | `200 { gyms: [{id,name}], items: [{id,name}] }` | `401/403` auth |
| `POST /gym/join-request` | `{ gymId }` | `200 { status, state, gym, role }` | `404 Gym not found`, `400` zod validation |
| `GET /admin/gym-join-requests` | sin body | `200 { items: [...], requests: [...] }` | `403 Only gym admins or trainers can list join requests.` |
| `POST /admin/gym-join-requests/:membershipId/accept` | path `membershipId` | `200 { membershipId, status: "ACTIVE" }` | `404 Membership request not found`, `400 INVALID_MEMBERSHIP_STATUS` |
| `POST /admin/gym-join-requests/:membershipId/reject` | path `membershipId` | `200 { membershipId, status: "REJECTED" }` | `404 Membership request not found`, `400 INVALID_MEMBERSHIP_STATUS` |
| `GET /admin/gyms/:gymId/members` | path `gymId` | `200 [{ id, name, email, user, status, role }]` (solo `ACTIVE`) | `403 FORBIDDEN` por scope/rol |

## cURL examples

```bash
# 1) Admin create gym
curl -X POST "$API_URL/admin/gyms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"FitSculpt Central","code":"CENTRAL01"}'

# 2) User list gyms
curl -X GET "$API_URL/gyms?q=fit" \
  -H "Authorization: Bearer $USER_TOKEN"

# 3) User submit join request
curl -X POST "$API_URL/gym/join-request" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"gymId":"<gym_id>"}'

# 4) Trainer/Admin list join requests
curl -X GET "$API_URL/admin/gym-join-requests" \
  -H "Authorization: Bearer $TRAINER_OR_ADMIN_TOKEN"

# 5) Accept join request
curl -X POST "$API_URL/admin/gym-join-requests/<membership_id>/accept" \
  -H "Authorization: Bearer $TRAINER_OR_ADMIN_TOKEN"

# 6) Reject join request
curl -X POST "$API_URL/admin/gym-join-requests/<membership_id>/reject" \
  -H "Authorization: Bearer $TRAINER_OR_ADMIN_TOKEN"

# 7) List active members (trainer/admin scoped to gym)
curl -X GET "$API_URL/admin/gyms/<gym_id>/members" \
  -H "Authorization: Bearer $TRAINER_OR_ADMIN_TOKEN"

# 8) Admin delete gym
curl -X DELETE "$API_URL/admin/gyms/<gym_id>" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## DoD command output (local)

```bash
$ npm test
authUtils tests passed
```

```bash
$ npm run build
Error: Failed to fetch sha256 checksum at https://binaries.prisma.sh/... - 403 Forbidden
```

```bash
$ PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npm run build
Error: Failed to fetch the engine file at https://binaries.prisma.sh/.../schema-engine.gz - 403 Forbidden
```

```bash
$ npx tsc --noEmit
error TS2305: Module '"@prisma/client"' has no exported member 'Prisma'.
# pre-existing in this environment without generated prisma client
```
