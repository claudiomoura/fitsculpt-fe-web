# Contracts RC v1 (FE consume BFF `/api/*`)

Estado: **Release Candidate v1**  
Owner: **Equipo C**  
Dependencia: **This PR depends on PR-03 being merged**

## 1) Assunção oficial

El contrato oficial para frontend es el que se consume vía BFF en rutas `/api/*` de Next Route Handlers. Este documento fija la base mínima para flows core y evita inventar endpoints/payloads no observados en código.

## 2) Rutas críticas reales auditadas (FE → BFF → BE)

> Fuentes usadas: llamadas `fetch("/api/*")` en pantallas/servicios core + handlers BFF en `apps/web/src/app/api/**/route.ts`.

| Dominio | Método | Ruta BFF (FE consume) | Proxy BFF a BE | Evidencia FE/BFF |
|---|---|---|---|---|
| Auth/Entitlements | GET | `/api/auth/me` | `GET /auth/me` | FE usa `useAuthEntitlements` y hooks/pantallas core; BFF proxya cookie `fs_token` |
| Gym membership (lectura) | GET | `/api/gym/me` | `GET /gym/me` con fallback `GET /gyms/membership` | FE usa `services/gym.ts`; BFF normaliza payload |
| Gym membership (salida) | DELETE | `/api/gym/me` | `DELETE /gym/me` con fallback `DELETE /gyms/membership` | FE usa `services/gym.ts`; BFF retorna `UNSUPPORTED_OPERATION` cuando BE no soporta |
| Gym membership (legacy) | GET/DELETE | `/api/gyms/membership` | `GET/DELETE /gyms/membership` | FE mantiene fallback legacy |
| Tracking read | GET | `/api/tracking` | `GET /tracking` | FE usa dashboard/hoy/profile/seguimiento |
| Tracking write | POST/PUT | `/api/tracking` | `POST/PUT /tracking` | FE crea entradas y reintenta una vez en 5xx |
| Tracking delete | DELETE | `/api/tracking/:collection/:id` | `DELETE /tracking/:collection/:id` | FE borra entradas por colección |
| Exercises list | GET | `/api/exercises?…` | `GET /exercises?…` | FE biblioteca/workouts/trainer |
| Exercises detail | GET | `/api/exercises/:id` | `GET /exercises/:id` | FE pantalla detalle ejercicio |
| AI training generate | POST | `/api/ai/training-plan/generate` | `POST /ai/training-plan/generate` | FE plan entrenamiento IA |
| AI nutrition generate | POST | `/api/ai/nutrition-plan/generate` | `POST /ai/nutrition-plan/generate` | FE plan nutrición IA |

## 3) Shape esperado mínimo por endpoint crítico

> Solo campos clave realmente consumidos por FE. Si el backend agrega campos extra, no rompe este RC mientras se preserven estos mínimos.

### 3.1 `GET /api/auth/me` (AuthMe + Entitlements)

**200 (mínimo esperado):**

```json
{
  "subscriptionPlan": "string|null",
  "plan": "string|null",
  "entitlements": {
    "modules": {
      "ai": { "enabled": true },
      "nutrition": { "enabled": true },
      "strength": { "enabled": true }
    }
  }
}
```

Notas:
- FE deriva gating UX de `entitlements.modules.*.enabled`.
- Si `entitlements.modules` no viene, FE cae a estado `unknown` (degradación controlada).

### 3.2 Gym membership (`GET/DELETE /api/gym/me`, `GET/DELETE /api/gyms/membership`)

**GET 200 (normalizado por BFF):**

```json
{
  "data": {
    "status": "NONE|PENDING|ACTIVE|REJECTED|UNKNOWN",
    "gymId": "string|null",
    "gymName": "string|null",
    "role": "string|null"
  }
}
```

Acepta formas backend heterogéneas (`state` o `status`, `tenantId`, `gym.id`, etc.) y BFF normaliza.

**DELETE 200/204:**
- Confirmación de salida de gym (payload passthrough de backend o vacío).

### 3.3 Tracking (`GET/POST/PUT /api/tracking`, `DELETE /api/tracking/:collection/:id`)

**GET 200 / POST 200 / PUT 200 (snapshot mínimo):**

```json
{
  "checkins": [{ "id": "string", "date": "string", "weightKg": 0 }],
  "foodLog": [{ "id": "string", "date": "string", "foodKey": "string", "grams": 0 }],
  "workoutLog": [{ "id": "string", "date": "string", "name": "string", "durationMin": 0 }]
}
```

**POST/PUT request mínimo:**

```json
{
  "collection": "checkins|foodLog|workoutLog",
  "item": { "id": "string", "date": "string" }
}
```

**DELETE:**
- `204` sin body o error JSON.

### 3.4 Exercises (`GET /api/exercises`, `GET /api/exercises/:id`)

**List 200 (mínimo):**

```json
{
  "items": [
    {
      "id": "string",
      "name": "string",
      "imageUrl": "string|null",
      "mainMuscleGroup": "string|null"
    }
  ],
  "total": 0,
  "page": 1,
  "limit": 24
}
```

También aceptado por FE: `data` como array en lugar de `items`.

**Detail 200 (mínimo):**

```json
{
  "id": "string",
  "name": "string",
  "description": "string|null",
  "imageUrl": "string|null"
}
```

### 3.5 AI generate

#### `POST /api/ai/training-plan/generate`

**200 (mínimo):**

```json
{
  "plan": { "days": [] },
  "aiTokenBalance": 0,
  "aiTokenRenewalAt": "string|null"
}
```

`plan` puede venir serializado string JSON y FE intenta parsearlo.

#### `POST /api/ai/nutrition-plan/generate`

**200 (mínimo):**

```json
{
  "plan": {},
  "aiTokenBalance": 0,
  "aiTokenRenewalAt": "string|null"
}
```

## 4) Errores esperados + shape + mapeo UX (error/retry)

| Endpoint | Status esperado | Shape esperado | Estado UX | Retry UX |
|---|---|---|---|---|
| `/api/auth/me` | 401 | `{ "error": "UNAUTHORIZED" }` | usuario no autenticado / entitlements unknown | Re-login; no retry automático |
| `/api/auth/me` | 503 | `{ "error": "BACKEND_UNAVAILABLE" }` | bloqueo temporal de carga de perfil | retry manual |
| `/api/gym/me` o `/api/gyms/membership` DELETE | 405 | `{ "error": "UNSUPPORTED_OPERATION", "feature": "leave_gym" }` | acción no soportada por backend | sin retry automático |
| `/api/tracking` GET/POST/PUT/DELETE | 401 | `{ "error": "UNAUTHORIZED" }` | sesión expirada | re-login |
| `/api/tracking` GET/POST/PUT/DELETE | 502 | `{ "error": "BACKEND_UNAVAILABLE" }` | fallo temporal de persistencia/carga | retry manual; en write FE hace 1 retry automático si `>=500` |
| `/api/exercises*` | 401 | `{ "error": "UNAUTHORIZED" }` | biblioteca bloqueada por auth | re-login |
| `/api/ai/*/generate` | 401 | `{ "error": "UNAUTHORIZED_NO_FS_TOKEN", "debug": {...} }` | sesión inválida para IA | re-login |
| `/api/ai/training-plan/generate` | 4xx/5xx | `{ "error": "...", "message"?: "...", "hint"?: "..." }` o `{ "error": "AI_REQUEST_FAILED", "debug": {...} }` | estado de error IA entrenamiento | retry manual (según pantalla) |
| `/api/ai/nutrition-plan/generate` | 4xx/5xx→5xx mapeado a 502 | `{ "error": "...", "message"?: "...", "retryAfterSec"?: n, "details"?: any }` o `AI_REQUEST_FAILED` | estado de error IA nutrición con `canRetry` | retry manual con límite UI |

## 5) Cobertura mínima solicitada (checklist)

- [x] AuthMe/Entitlements
- [x] Gym membership
- [x] Tracking read/write/delete
- [x] Exercises list/detail
- [x] AI generate (training + nutrition)

## 6) Huecos / Requer implementação

- Definir contrato estricto/versionado para `entitlements.modules` (hoy FE tolera ausencia y cae a `unknown`). **Requer implementação**.
- Estandarizar envelope de lista de ejercicios (`items` vs `data`) para eliminar bifurcación en FE. **Requer implementação**.
- Homologar shape de errores AI entre training y nutrition (hoy nutrition aplica gateway `5xx -> 502` y training no). **Requer implementação**.

- Runtime validation (PR-05) se aplica en BFF para `/api/auth/me`, `/api/gym/me`, `/api/tracking`, `/api/exercises`, `/api/exercises/:id`, `/api/ai/training-plan/generate` y `/api/ai/nutrition-plan/generate`; drift devuelve `502 { error: "CONTRACT_DRIFT", endpoint, reason }` para fail-fast homogéneo.
- Normalización ad hoc que permanece (intencional por compatibilidad RC): `normalizeMembershipPayload` en `/api/gym/me` (mapea shapes legacy de backend) y normalización de músculos en SSR de detalle de ejercicio (`primaryMuscles`/`secondaryMuscles`).
