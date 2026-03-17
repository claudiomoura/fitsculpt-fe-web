# MISIÓN: Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)

Fecha: 2026-03-04  
Autor/a auditoría: FS-Audit (GPT)  
Solicitado por: Founder/PM (FitSculpt)  
Chat: auditoria fitsculpt 2026-03-04

Repositorio auditado (fuente): zips entregados por el founder (solo lectura).  
Huella (SHA-256):
- front.zip: `8093a409ef0d81b8758ecc77a60c8beedd7fb62019e93034ae31c732eb845343`
- api.zip: `2315fefcd65ecaad9734400c1ea8597418d31d754e3dd5199ebffe534d56cd25`
- docs.zip: `915bd6089ffbbf96ccde5195e95bba0ede07d76295b7e55c9c52b6e0d093b2db`

> Regla de evidencia: Todo lo que afirmo abajo referencia rutas/archivos del zip. Si algo no se puede verificar con esos zips, lo marco como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Release-ready (B2C general): NO**, porque no hay evidencia ejecutada en esta auditoría de `npm run build/lint/typecheck/test` (solo inspección estática), y hay riesgo de regresión por contratos y gating de entitlements (ver secciones 4 y 5).
- **MVP Modular: PARCIAL**, existe un modelo de módulos en backend (`api/src/entitlements.ts`) con planes `FREE | STRENGTH_AI | NUTRI_AI | PRO`, pero el documento solicitado menciona tiers adicionales (Bundle, Gym) que **no existen en backend** (gap de alineación comercial y de UI).
- **Gym Pilot: DEMO-READY, no autónomo**, porque hay flujo y endpoints admin/gym en backend y BFF, pero faltan evidencias de pruebas e2e y checklist DoD formal ejecutado en esta auditoría, además de fricciones UX en roles y navegación (ver 3 y 5).
- **Top 5 riesgos**
  1) Entitlements: diferencias entre lo que se quiere vender (Bundle/Gym) y lo que realmente existe en backend (4 planes), riesgo de UI mostrando gates erróneos.
  2) Contratos FE (BFF) vs BE: hay muchos endpoints y normalizaciones, sin contrato versionado formal tipo OpenAPI, riesgo de drift.
  3) Monolito de rutas en backend: `api/src/index.ts` concentra lógica y endpoints, riesgo de regresión y dificultad de test.
  4) Validación IA y persistencia: hay validadores, pero riesgo de fallos de cuota/proveedor y degradación UX si no hay fallback consistente.
  5) Calidad: sin evidencia de pipeline ejecutada aquí, release depende del founder.
- **Top 5 quick wins**
  1) Unificar matriz de planes: declarar oficialmente los 4 planes del backend en producto y UI, o extender backend con los tiers deseados.
  2) Generar mapa de contratos a partir del BFF (`front/src/app/api/**/route.ts`) y backend (`api/src/index.ts`) y bloquear mismatches con tests de contrato.
  3) Añadir smoke tests mínimos obligatorios (core loop + gym join + assign plan) en CI, usando los scripts existentes en web.
  4) Eliminar rutas duplicadas PT (`/app/treinador`) manteniendo redirect ya implementado en `front/src/middleware.ts`.
  5) Asegurar que cualquier feature incompleta quede escondida (no flags hardcode como `SHOW_WORKOUT_LOG = false` en tracking).

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación (rutas reales)

**Evidencia base:** Next.js App Router en `front/src/app/**/page.tsx`.

#### Usuario final (cliente)
Rutas detectadas (subset core):
- `/app`
- `/app/biblioteca`
- `/app/dashboard`
- `/app/gym`
- `/app/hoy`
- `/app/macros`
- `/app/nutricion`
- `/app/onboarding`
- `/app/profile`
- `/app/seguimiento`
- `/login`
- `/register`
- `/verify-email`

Otras rutas cliente detectadas (no exhaustivo, primeras 25):
- `/app/biblioteca/[exerciseId]`
- `/app/biblioteca/entrenamientos`
- `/app/biblioteca/entrenamientos/[planId]`
- `/app/biblioteca/recetas`
- `/app/biblioteca/recetas/[recipeId]`
- `/app/dietas`
- `/app/dietas/[planId]`
- `/app/entrenamiento`
- `/app/entrenamiento/[workoutId]`
- `/app/entrenamiento/editar`
- `/app/entrenamientos`
- `/app/entrenamientos/[workoutId]`
- `/app/entrenamientos/[workoutId]/start`
- `/app/feed`
- `/app/nutricion/editar`
- `/app/profile/legacy`
- `/app/settings`
- `/app/settings/billing`
- `/app/weekly-review`
- `/app/workouts`
- ... (ver anexo para listado completo)

#### Trainer
Rutas trainer:
- `/app/trainer`
- `/app/trainer/client/[id]`
- `/app/trainer/clients`
- `/app/trainer/clients/[id]`
- `/app/trainer/exercises`
- `/app/trainer/exercises/new`
- `/app/trainer/nutrition-plans`
- `/app/trainer/plans`
- `/app/trainer/plans/[id]`
- `/app/trainer/requests`
- `/app/treinador`
- `/app/treinador/[...slug]`

Nota: existe redirect de `/app/treinador` a `/app/trainer` en `front/src/middleware.ts`.

#### Admin
Rutas admin:
- `/app/admin`
- `/app/admin/gym-requests`
- `/app/admin/gyms`
- `/app/admin/labs`
- `/app/admin/preview`
- `/app/admin/users`

#### Marketing / público
Rutas públicas detectadas:
- `/`
- `/design-system`
- `/pricing`

#### Callejones sin salida detectados (evidencia en código)
- Feature apagada sin gate backend: `SHOW_WORKOUT_LOG = false` en `front/src/app/(app)/app/seguimiento/TrackingClient.tsx`.
- Deuda de rutas PT: `/app/treinador/*` existe pero se redirige, evitar duplicación de páginas.

### 2.2 Flujos end-to-end (journeys)

> Nota: Estos journeys se documentan por evidencia de páginas y endpoints. No se ejecutaron flujos manuales en esta auditoría, por tanto el estado “Validado end-to-end” se marca como **No Validado**.

#### Login + acceso a `/app` protegido
- UI: `front/src/app/(auth)/login/page.tsx`
- Protección: `front/src/middleware.ts` protege prefijo `/app` y requiere cookie `fs_token`.
- Backend: endpoints auth en `api/src/index.ts` incluyen `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/register`, `/auth/verify-email`.
- Resultado esperado: sin `fs_token` redirige a `/login?next=/app/...` (implementado en middleware).
- Estado: **Implementado**. **No Validado**.

#### Hoy + 1 acción rápida
- UI: `front/src/app/(app)/app/hoy/page.tsx`.
- BFF: `/api/tracking`, `/api/workouts`, `/api/training-plans/active`.
- Estado: **Implementado**. **No Validado**.

#### Biblioteca: lista → detalle
- UI: `front/src/app/(app)/app/biblioteca/page.tsx`.
- BFF: `/api/exercises`, `/api/recipes`.
- Backend: normalización `api/src/exercises/normalizeExercisePayload.ts`.
- Estado: **Implementado**. **No Validado**.

#### Tracking: crear 1 registro y confirmar persistencia
- UI: `front/src/app/(app)/app/seguimiento/TrackingClient.tsx`.
- BFF: `/api/tracking`.
- Backend: `api/src/tracking/schemas.ts`, `api/src/tracking/service.ts`.
- Estado: **Implementado**. **No Validado**.

#### Food log: registrar ítems por gramos y ver macros/calorías
- UI: `TrackingClient.tsx` define `FoodEntry` con `{{ foodKey, grams }}` y `UserFood` con macros y unidad.
- BFF: `/api/user-foods`, `/api/user-foods/[id]`.
- Estado: **Implementado**. **No Validado**.

#### Onboarding (si existe)
- UI: `front/src/app/(app)/app/onboarding/page.tsx`.
- Estado: **Implementado**. **No Validado**.

#### Dashboard semanal (si existe)
- UI: `front/src/app/(app)/app/dashboard/page.tsx`.
- Estado: **Implementado**. **No Validado**.

#### IA Nutrición: generar plan semanal + lista compra + ajuste
- BFF: rutas bajo `/api/ai/nutrition-plan/*`.
- Backend: `/ai/nutrition-plan`, `/ai/nutrition-plan/generate`.
- Validaciones: `api/src/lib/ai/schemas/nutritionPlanJsonSchema.ts`, `api/src/ai/nutritionMathValidation.ts`.
- Estado: **Implementado**. **No Validado**.

#### IA Fitness: generar plan + ajuste semanal
- Backend: `/ai/training-plan`, `/ai/training-plan/generate`.
- Fallback: `api/src/ai/training-plan/fallbackBuilder.ts`.
- Estado: **Implementado**. **No Validado**.

#### Gym Pilot: usuario se une a gym + admin gestiona + asigna plan
- UI: `/app/gym` y `/app/gym/admin`.
- BFF: `/api/gyms/membership`, `/api/admin/gyms/*`, `/api/admin/gym-join-requests/*`.
- Backend: `/admin/gyms`, `/admin/gym-join-requests/*`, `api/src/routes/admin/assignGymRole.ts`.
- Estado: **Implementado**. **No Validado**.

### 2.3 Matriz de entitlements (implementado vs solicitado)

**Fuente de verdad (backend):** `api/src/entitlements.ts`

Planes implementados:
- `FREE`
- `STRENGTH_AI`
- `NUTRI_AI`
- `PRO`

Módulos:
- `modules.strength`
- `modules.nutrition`
- `modules.ai`

**Gap clave:** los tiers solicitados (Nutrición Premium, Fitness Premium, Bundle, Gym) no existen como enum en backend. Cualquier tabla con “Bundle” o “Gym” sería **Assunção**.

Tabla real (según backend):

| Feature / módulo | FREE | NUTRI_AI | STRENGTH_AI | PRO | Evidencia |
|---|---:|---:|---:|---:|---|
| Acceso app / tracking / biblioteca | Sí | Sí | Sí | Sí | Rutas `/app/*` en FE y endpoints base en BE |
| AI Nutrition | No | Sí | No | Sí | `planHasNutrition()` en `api/src/entitlements.ts` |
| AI Strength (training) | No | No | Sí | Sí | `planHasStrength()` en `api/src/entitlements.ts` |
| AI (cualquier) | No | Sí | Sí | Sí | `planHasAi()` en `api/src/entitlements.ts` |

---

## 3) Auditoría UX (mobile-first)

**Evidencia:** páginas App Router + componentes client en `front/src/app/(app)/app/**`.

### Consistencia tab bar y navegación
- Separación de roles en middleware (`front/src/middleware.ts`) con redirects básicos.
- Riesgo: mezcla de rutas ES/PT/EN y duplicidad PT histórica.

### Estados obligatorios (loading, empty, error, success, disabled)
- Hay `Skeleton` en tracking (ej: `TrackingClient.tsx`).
- No hay evidencia en esta auditoría de un patrón global obligatorio (Assunção parcial), debe auditase pantalla por pantalla con checklist.

### Copy e i18n
- Se usa `useLanguage()` (ej: `TrackingClient.tsx`).
- Recomendación: normalizar rutas públicas y evitar mezcla de idiomas en URLs, manteniendo redirects compat.

### 10 fricciones concretas + recomendación
1) Rutas duplicadas PT: mantener redirect, eliminar duplicación de páginas.
2) Feature toggle hardcode (`SHOW_WORKOUT_LOG`): mover a flag real o eliminar.
3) Gates por plan: siempre desde `auth/me` entitlements, nunca constantes.
4) Errores IA (429/5xx): UX de reintento y fallback consistente.
5) Tracking denso: dividir en tabs (Check-in, Food, Workouts) con mobile-first.
6) Formularios largos: acciones sticky en todos los flows críticos.
7) Empty states: biblioteca/dashboard deben guiar al “primer paso”.
8) Roles: al redirigir, mostrar explicación breve en UI.
9) Errores API: estándar de toasts y retries por código.
10) Consistencia visual: reforzar uso del design system.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

Frontend:
- Next.js App Router, rutas en `front/src/app`.
- Middleware auth y roles en `front/src/middleware.ts`.
- BFF: `front/src/app/api/**/route.ts` (92 rutas detectadas).

Backend:
- Fastify + Prisma.
- Muchas rutas en `api/src/index.ts` (91 rutas detectadas).
- Rutas extra en `api/src/routes/**`.

Zonas sensibles:
- `fs_token`: FE middleware + configuración JWT cookie en `api/src/index.ts`.
- Entitlements: `api/src/entitlements.ts` y parsing FE en `front/src/context/auth/entitlements.ts`.
- Normalizaciones: ejercicios, tracking, parsing IA.

### 4.2 Contratos FE↔BE (mapa)

Estado actual:
- Inventario: 92 rutas BFF y 91 rutas backend detectadas.
- No hay contrato formal versionado (OpenAPI) evidenciado en los zips.
- Se observa que backend ya incluye endpoints admin plan/tokens (`/admin/users/:id/plan`, `/admin/users/:id/tokens*`), lo que sugiere cierre de gaps históricos.

Recomendación:
- Script que recorra `front/src/app/api/**/route.ts`, extraiga método y path backend, lo cruce con inventario backend, y falle CI si hay mismatch.
- Contract tests mínimos para endpoints críticos: auth/me, entitlements, tracking, gyms join/accept, assign plan.

### 4.3 IA (assistiva)

Backend expone:
- `/ai/nutrition-plan/generate`, `/ai/training-plan/generate`, `/ai/daily-tip`, `/ai/quota`.

Hardening ya presente:
- Parsing defensivo (`api/src/aiParsing.ts`).
- Schemas (`api/src/lib/ai/schemas/*`).
- Validación nutricional (`api/src/ai/nutritionMathValidation.ts`).
- Fallback training (`api/src/ai/training-plan/fallbackBuilder.ts`).

Riesgos:
- Logs con payload sensible (Assunção, requiere revisión).
- 429/5xx: UX debe degradar con fallback y retry.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)

**Limitación:** no se instalaron dependencias ni se ejecutaron comandos. Se marca FAIL por falta de evidencia.

Web (`front/package.json`):
- build: **FAIL (no evidence)**, `npm run build`
- lint: **FAIL (no evidence)**, `npm run lint`
- typecheck: **FAIL (no evidence)**, `npm run typecheck`
- test: **FAIL (no evidence)**, `npm run test`
- e2e: **FAIL (no evidence)**, `npm run e2e:*`

API (`api/package.json`):
- build: **FAIL (no evidence)**, `npm run build`
- test: **FAIL (no evidence)**, `npm run test`

Entorno:
- No hay `engines.node` en package.json. Recomendación: fijar `.nvmrc` y `engines` y reflejarlo en CI.

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL)

A) DoD mínimo (Implementado vs Validado)
- Login: **PASS implementado**, **FAIL validación**.
- `/app` protegido: **PASS implementado**, **FAIL validación**.
- Tab bar: **FAIL (no evidence)**.
- Hoy + 1 acción: **PASS implementado**, **FAIL validación**.
- Tracking persistente: **PASS implementado**, **FAIL validación**.
- Biblioteca lista+detalle: **PASS implementado**, **FAIL validación**.

B) Entitlements modular
- Backend-driven: **PASS implementado**.
- Bundle/Gym tiers: **FAIL**.

C) Free: métricas básicas + food log
- **PASS implementado**, **FAIL validación**.

D) Nutrición Premium: plan + lista compra + ajustes + validación IA
- Validación IA: **PASS implementado**, **FAIL validación**.

E) Fitness Premium: plan + ajuste + validación IA
- **PASS implementado**, **FAIL validación**.

F) Gym Pilot: join + admin + asignación plan template
- **PASS implementado**, **FAIL validación** (especialmente seed y journey cronometrado).

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-AUD-001 | P0 | Producto/Entitlements | Bundle/Gym no existen en BE, solo 4 planes | Gates y propuesta comercial incoherentes | `api/src/entitlements.ts` | Ajustar oferta a 4 planes o extender BE con tiers + migración | Founder + BE | M |
| FS-AUD-002 | P0 | Calidad | No hay pruebas ejecutadas en esta auditoría | Release depende de intervención manual | `front/package.json`, `api/package.json` | CI con gates obligatorios | DevOps/FE/BE | M |
| FS-AUD-003 | P1 | Contratos | 92 rutas BFF sin contrato formal | Drift rompe UX | `front/src/app/api/**` | Script inventario + contract tests | Arquitecto Jefe | M |
| FS-AUD-004 | P1 | UX | Toggle hardcode `SHOW_WORKOUT_LOG=false` | Inconsistencia | `TrackingClient.tsx` | Flag real o remover | FE | S |
| FS-AUD-005 | P1 | Arquitectura | `api/src/index.ts` monolítico | Difícil mantener y testear | `api/src/index.ts` | Modularizar por dominios | BE | L |
| FS-AUD-006 | P1 | Navegación | Duplicidad `/app/treinador` | Deuda y confusión | `front/src/middleware.ts` | Eliminar páginas duplicadas, mantener redirect | FE | S |

---

## 7) Próximos pasos (3 sprints)

### Sprint 1: Release gating real
Goal: Green bar obligatorio antes de merge.  
Entra: build + lint + typecheck + tests + e2e smoke web, build + tests api, Node version fijada.  
Métricas: 0 merges sin checks, 0 regresiones por TS.  

### Sprint 2: Contratos cerrados FE↔BFF↔BE
Goal: drift imposible.  
Entra: inventario automático de endpoints, contract tests críticos, tabla generada en docs.  
Métricas: 0 mismatches en endpoints críticos.  

### Sprint 3: Gym Pilot autónomo
Goal: demo reproducible sin soporte del founder.  
Entra: seed demo estable, journey completo cronometrado, 0 errores consola, estados empty/error correctos.  
Métricas: 1 guion de demo reproducible, 0 bloqueos.

---

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (cliente)
- `/app`
- `/app/biblioteca`
- `/app/biblioteca/[exerciseId]`
- `/app/biblioteca/entrenamientos`
- `/app/biblioteca/entrenamientos/[planId]`
- `/app/biblioteca/recetas`
- `/app/biblioteca/recetas/[recipeId]`
- `/app/dashboard`
- `/app/dietas`
- `/app/dietas/[planId]`
- `/app/entrenamiento`
- `/app/entrenamiento/[workoutId]`
- `/app/entrenamiento/editar`
- `/app/entrenamientos`
- `/app/entrenamientos/[workoutId]`
- `/app/entrenamientos/[workoutId]/start`
- `/app/feed`
- `/app/gym`
- `/app/hoy`
- `/app/macros`
- `/app/nutricion`
- `/app/nutricion/editar`
- `/app/onboarding`
- `/app/profile`
- `/app/profile/legacy`
- `/app/seguimiento`
- `/app/settings`
- `/app/settings/billing`
- `/app/weekly-review`
- `/app/workouts`

### 8.2 Rutas BFF `/api/*` detectadas
Total: 92  
- `/api/admin/gym-join-requests`
- `/api/admin/gym-join-requests/[membershipId]/[action]`
- `/api/admin/gym-join-requests/[membershipId]/accept`
- `/api/admin/gym-join-requests/[membershipId]/reject`
- `/api/admin/gyms`
- `/api/admin/gyms/[gymId]`
- `/api/admin/gyms/[gymId]/members`
- `/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan`
- `/api/admin/gyms/[gymId]/members/[userId]/role`
- `/api/admin/users`
- `/api/admin/users/[id]`
- `/api/admin/users/[id]/block`
- `/api/admin/users/[id]/gym-role`
- `/api/admin/users/[id]/reset-password`
- `/api/admin/users/[id]/unblock`
- `/api/admin/users/[id]/verify-email`
- `/api/ai/daily-tip`
- `/api/ai/nutrition-plan`
- `/api/ai/nutrition-plan/generate`
- `/api/ai/quota`
- `/api/ai/training-plan`
- `/api/ai/training-plan/generate`
- `/api/auth/change-password`
- `/api/auth/google/callback`
- `/api/auth/google/start`
- `/api/auth/me`
- `/api/auth/resend-verification`
- `/api/auth/verify-email`
- `/api/billing/checkout`
- `/api/billing/plans`
- `/api/billing/portal`
- `/api/billing/status`
- `/api/exercises`
- `/api/exercises/[id]`
- `/api/feed`
- `/api/feed/generate`
- `/api/gym-flow/approve`
- `/api/gym-flow/assign`
- `/api/gym-flow/assigned-plan`
- `/api/gym-flow/join`
- `/api/gym-flow/members`
- `/api/gym/admin/members/[userId]/role`
- `/api/gym/join-code`
- `/api/gym/join-request`
- `/api/gym/me`
- `/api/gyms`
- `/api/gyms/join`
- `/api/gyms/join-by-code`
- `/api/gyms/membership`
- `/api/nutrition-plans`
- `/api/nutrition-plans/[id]`
- `/api/nutrition-plans/assigned`
- `/api/profile`
- `/api/recipes`
- `/api/recipes/[id]`
- `/api/review/weekly`
- `/api/tracking`
- `/api/tracking/[collection]/[id]`
- `/api/trainer/assign-training-plan`
- `/api/trainer/capabilities`
- `/api/trainer/clients`
- `/api/trainer/clients/[id]`
- `/api/trainer/clients/[id]/assigned-nutrition-plan`
- `/api/trainer/clients/[id]/assigned-plan`
- `/api/trainer/clients/[id]/notes`
- `/api/trainer/clients/[id]/plan`
- `/api/trainer/join-requests`
- `/api/trainer/join-requests/[membershipId]/[action]`
- `/api/trainer/join-requests/[membershipId]/accept`
- `/api/trainer/join-requests/[membershipId]/reject`
- `/api/trainer/members`
- `/api/trainer/members/[id]/assigned-plan`
- `/api/trainer/members/[id]/nutrition-plan-assignment`
- `/api/trainer/members/[id]/training-plan-assignment`
- `/api/trainer/nutrition-plans`
- `/api/trainer/nutrition-plans/[id]`
- `/api/trainer/plans`
- `/api/trainer/plans/[id]`
- `/api/trainer/plans/[id]/days/[dayId]`
- `/api/trainer/plans/[id]/days/[dayId]/exercises`
- `/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]`
- `/api/training-plans`
- `/api/training-plans/[id]`
- `/api/training-plans/[id]/days/[dayId]/exercises`
- `/api/training-plans/active`
- `/api/user-foods`
- `/api/user-foods/[id]`
- `/api/workout-sessions/[id]`
- `/api/workout-sessions/[id]/finish`
- `/api/workouts`
- `/api/workouts/[id]`
- `/api/workouts/[id]/start`

### 8.3 Rutas backend detectadas
Total: 91  
- `/admin/gym-join-requests`
- `/admin/gym-join-requests/:membershipId/accept`
- `/admin/gym-join-requests/:membershipId/reject`
- `/admin/gyms`
- `/admin/gyms/:gymId`
- `/admin/gyms/:gymId/members`
- `/admin/gyms/:gymId/members/:userId/assign-training-plan`
- `/admin/gyms/:gymId/members/:userId/role`
- `/admin/users`
- `/admin/users/:id`
- `/admin/users/:id/block`
- `/admin/users/:id/plan`
- `/admin/users/:id/reset-password`
- `/admin/users/:id/tokens`
- `/admin/users/:id/tokens-allowance`
- `/admin/users/:id/tokens/add`
- `/admin/users/:id/tokens/balance`
- `/admin/users/:id/unblock`
- `/admin/users/:id/verify-email`
- `/ai/daily-tip`
- `/ai/nutrition-plan`
- `/ai/nutrition-plan/generate`
- `/ai/quota`
- `/ai/training-plan`
- `/ai/training-plan/generate`
- `/auth/change-password`
- `/auth/google/callback`
- `/auth/google/start`
- `/auth/login`
- `/auth/logout`
- `/auth/me`
- `/auth/register`
- `/auth/resend-verification`
- `/auth/signup`
- `/auth/verify-email`
- `/billing/admin/reset-customer-link`
- `/billing/checkout`
- `/billing/plans`
- `/billing/portal`
- `/billing/status`
- `/billing/stripe/webhook`
- `/dev/reset-demo`
- `/dev/seed-exercises`
- `/dev/seed-recipes`
- `/exercises`
- `/exercises/:id`
- `/feed`
- `/feed/generate`
- `/gym/admin/members/:userId/role`
- `/gym/join-code`
- `/gym/join-request`
- `/gym/me`
- `/gyms`
- `/gyms/join`
- `/gyms/join-by-code`
- `/gyms/membership`
- `/health`
- `/members/me/assigned-nutrition-plan`
- `/members/me/assigned-training-plan`
- `/nutrition-plans`
- `/nutrition-plans/:id`
- `/profile`
- `/recipes`
- `/recipes/:id`
- `/tracking`
- `/tracking/:collection/:id`
- `/trainer/clients`
- `/trainer/clients/:userId`
- `/trainer/clients/:userId/assigned-nutrition-plan`
- `/trainer/clients/:userId/assigned-plan`
- `/trainer/gym`
- `/trainer/members/:id/training-plan-assignment`
- `/trainer/members/:userId/training-plan-assignment`
- `/trainer/nutrition-plans`
- `/trainer/nutrition-plans/:id`
- `/trainer/plans`
- `/trainer/plans/:planId`
- `/trainer/plans/:planId/days/:dayId`
- `/trainer/plans/:planId/days/:dayId/exercises`
- `/trainer/plans/:planId/days/:dayId/exercises/:exerciseId`
- `/training-plans`
- `/training-plans/:id`
- `/training-plans/:planId/days/:dayId/exercises`
- `/training-plans/active`
- `/user-foods`
- `/user-foods/:id`
- `/workout-sessions/:id`
- `/workout-sessions/:id/finish`
- `/workouts`
- `/workouts/:id`
- `/workouts/:id/start`

### 8.4 Flags / toggles detectados
- `SHOW_WORKOUT_LOG = false` en `front/src/app/(app)/app/seguimiento/TrackingClient.tsx`

### 8.5 Seguridad
- No incluir secretos en docs. El zip incluye `.env` en API, tratarlo como comprometido si salió del equipo.
