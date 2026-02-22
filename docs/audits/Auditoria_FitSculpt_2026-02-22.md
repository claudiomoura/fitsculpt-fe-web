# MISIÓN: Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)
Fecha: 2026-02-22
Autor/a auditoría: (audit automático asistido por IA, sin commit hash en ZIP)
Solicitado por: Founder/PM (FitSculpt)

> **Alcance real de esta auditoría**  
> Basado en revisión de código **solo lectura** de los ZIPs entregados:  
> - Frontend: `/mnt/data/fitsculpt_audit/front`  
> - Backend: `/mnt/data/fitsculpt_audit/back`  
> No se ejecutaron comandos (`npm run build/lint/test`) dentro de esta auditoría, por lo que todo lo que depende de ejecución queda marcado como **No Validado**.

---

## 1) Executive Summary (máx 12 bullets)

- **Release-ready (B2C): NO**. Falta evidencia de `build/lint/typecheck/tests` PASS y hay señales de fragilidad por normalizaciones y duplicación de rutas (ver secciones 4 y 5).
- **MVP Modular: PARCIAL**. Existe base de entitlements por plan (`FREE/STRENGTH_AI/NUTRI_AI/PRO`) en backend, pero no hay evidencia de gating completo feature a feature, ni de “Bundle” o “Gym tier” como tier comercial separado.
- **Gym Pilot: PARCIAL**. Hay endpoints y UI para gyms, memberships y trainer, pero hay señales de contratos en movimiento (normalizaciones BFF) y duplicación de arbol de rutas trainer, lo que complica mantener coherencia.
- **Top 5 riesgos**
  1) **Contrato Media de ejercicios roto en lista**: biblioteca puede caer en placeholder aunque exista `imageUrl` real (ver hallazgo P0).
  2) **Duplicación de rutas trainer/treinador**: riesgo alto de divergencia funcional y deuda técnica.
  3) **Entitlements incompletos**: modelo comercial solicitado (Free/Nutri/Fitness/Bundle/Gym) no está reflejado tal cual en backend.
  4) **Ausencia de evidencia de calidad (build/lint/tests)**: sin gate, cualquier cambio puede romper release.
  5) **BFF con normalizaciones ad hoc**: puede esconder mismatches hasta runtime si no hay tests de contrato.
- **Top 5 quick wins**
  1) Corregir normalización de `imageUrl` en backend para respetar `exercise.imageUrl` (impacto UX inmediato).
  2) Consolidar `/app/trainer` vs `/app/treinador` (decidir uno, redirigir el otro).
  3) Definir contrato “Entitlements vX” como fuente única y aplicarlo en UI (gating consistente).
  4) Añadir smoke test manual documentado (1 página) y un “build gate” en CI (bloquear merges con TS/build FAIL).
  5) Estandarizar estados loading/empty/error en pantallas core con componentes comunes.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

**Rutas detectadas (Next.js App Router):**
- `/` → `(public)/page.tsx`
- `/app` → `(app)/app/page.tsx`
- `/app/admin` → `(app)/app/admin/page.tsx`
- `/app/admin/gym-requests` → `(app)/app/admin/gym-requests/page.tsx`
- `/app/admin/gyms` → `(app)/app/admin/gyms/page.tsx`
- `/app/admin/labs` → `(app)/app/admin/labs/page.tsx`
- `/app/admin/preview` → `(app)/app/admin/preview/page.tsx`
- `/app/admin/users` → `(app)/app/admin/users/page.tsx`
- `/app/biblioteca` → `(app)/app/biblioteca/page.tsx`
- `/app/biblioteca/[exerciseId]` → `(app)/app/biblioteca/[exerciseId]/page.tsx`
- `/app/biblioteca/entrenamientos` → `(app)/app/biblioteca/entrenamientos/page.tsx`
- `/app/biblioteca/entrenamientos/[planId]` → `(app)/app/biblioteca/entrenamientos/[planId]/page.tsx`
- `/app/biblioteca/recetas` → `(app)/app/biblioteca/recetas/page.tsx`
- `/app/biblioteca/recetas/[recipeId]` → `(app)/app/biblioteca/recetas/[recipeId]/page.tsx`
- `/app/dashboard` → `(app)/app/dashboard/page.tsx`
- `/app/dietas` → `(app)/app/dietas/page.tsx`
- `/app/dietas/[planId]` → `(app)/app/dietas/[planId]/page.tsx`
- `/app/entrenamiento` → `(app)/app/entrenamiento/page.tsx`
- `/app/entrenamiento/[workoutId]` → `(app)/app/entrenamiento/[workoutId]/page.tsx`
- `/app/entrenamiento/editar` → `(app)/app/entrenamiento/editar/page.tsx`
- `/app/entrenamientos` → `(app)/app/entrenamientos/page.tsx`
- `/app/entrenamientos/[workoutId]` → `(app)/app/entrenamientos/[workoutId]/page.tsx`
- `/app/entrenamientos/[workoutId]/start` → `(app)/app/entrenamientos/[workoutId]/start/page.tsx`
- `/app/feed` → `(app)/app/feed/page.tsx`
- `/app/gym` → `(app)/app/gym/page.tsx`
- `/app/gym/admin` → `(app)/app/gym/admin/page.tsx`
- `/app/hoy` → `(app)/app/hoy/page.tsx`
- `/app/macros` → `(app)/app/macros/page.tsx`
- `/app/nutricion` → `(app)/app/nutricion/page.tsx`
- `/app/nutricion/editar` → `(app)/app/nutricion/editar/page.tsx`
- `/app/onboarding` → `(app)/app/onboarding/page.tsx`
- `/app/profile` → `(app)/app/profile/page.tsx`
- `/app/profile/legacy` → `(app)/app/profile/legacy/page.tsx`
- `/app/seguimiento` → `(app)/app/seguimiento/page.tsx`
- `/app/settings` → `(app)/app/settings/page.tsx`
- `/app/settings/billing` → `(app)/app/settings/billing/page.tsx`
- `/app/trainer` → `(app)/app/trainer/page.tsx`
- `/app/trainer/client/[id]` → `(app)/app/trainer/client/[id]/page.tsx`
- `/app/trainer/clients` → `(app)/app/trainer/clients/page.tsx`
- `/app/trainer/clients/[id]` → `(app)/app/trainer/clients/[id]/page.tsx`
- `/app/trainer/exercises` → `(app)/app/trainer/exercises/page.tsx`
- `/app/trainer/exercises/new` → `(app)/app/trainer/exercises/new/page.tsx`
- `/app/trainer/plans` → `(app)/app/trainer/plans/page.tsx`
- `/app/trainer/plans/[id]` → `(app)/app/trainer/plans/[id]/page.tsx`
- `/app/trainer/requests` → `(app)/app/trainer/requests/page.tsx`
- `/app/treinador` → `(app)/app/treinador/page.tsx`
- `/app/treinador/[...slug]` → `(app)/app/treinador/[...slug]/page.tsx`
- `/app/treinador/clientes` → `(app)/app/treinador/clientes/page.tsx`
- `/app/treinador/clientes/[id]` → `(app)/app/treinador/clientes/[id]/page.tsx`
- `/app/treinador/exercicios` → `(app)/app/treinador/exercicios/page.tsx`
- `/app/treinador/exercicios/novo` → `(app)/app/treinador/exercicios/novo/page.tsx`
- `/app/workouts` → `(app)/app/workouts/page.tsx`
- `/login` → `(auth)/login/page.tsx`
- `/pricing` → `pricing/page.tsx`
- `/register` → `(auth)/register/page.tsx`
- `/verify-email` → `(auth)/verify-email/page.tsx`

**Separación aparente**
- Público: `/` (landing), `/pricing`
- Auth: `/login`, `/register`, `/verify-email`
- App protegida: `/app/*` (incluye user, admin, trainer, gym)

**Dev/Admin vs Usuario final (evidencia por rutas)**
- Admin: `/app/admin/*` y endpoints BFF `/api/admin/*`
- Trainer: `/app/trainer/*` y `/app/treinador/*` (duplicado)
- Usuario final: `/app/hoy`, `/app/biblioteca`, `/app/entrenamiento`, `/app/nutricion`, `/app/seguimiento`, `/app/workouts`, `/app/profile`, `/app/settings`

**Callejones sin salida detectados (por estructura, No Validado E2E)**
- Duplicidad ``/app/trainer/*` y `/app/treinador/*`` (posibles rutas no enlazadas desde navegación principal).
- `profile/legacy` sugiere pantalla antigua aún accesible.

### 2.2 Flujos end-to-end (journeys)

> Nota: sin ejecutar entorno ni seed, estos flujos quedan como **Implementado en código** y **No Validado E2E** salvo que haya pruebas/fixtures explícitos.

- **Login + acceso a `/app` protegido**  
  Implementación: existen páginas `/login` y rutas `/app/*`. BFF usa cookie `fs_token` (ver `_proxy.ts`).  
  Estado: Implementado, No Validado E2E.

- **Hoy + 1 acción rápida**  
  Ruta: `/app/hoy` + componentes `TodaySummaryClient.tsx` (placeholder aparece en búsqueda, no validado).  
  Estado: Implementado, No Validado E2E.

- **Biblioteca: lista → detalle**  
  Rutas: `/app/biblioteca`, `/app/biblioteca/[exerciseId]`, `/app/biblioteca/recetas`…  
  Estado: Implementado, con riesgo de media placeholder (ver P0).

- **Tracking: crear 1 registro y confirmar persistencia**  
  BFF: `/api/tracking` y `/api/tracking/[collection]/[id]`  
  Backend: `GET /tracking`, `DELETE /tracking/:collection/:id`  
  Estado: Contrato existe, No Validado E2E (no se ve `POST` en backend en lista detectada, revisar en sección 4).

- **Food log: registrar ítems por gramos y ver macros/calorías**  
  BFF: `/api/user-foods`  
  Backend: `GET/POST/DELETE /user-foods`  
  UI: rutas `/app/macros` y `/app/dietas` (posible relacionado).  
  Estado: Implementado parcialmente, No Validado E2E y “macros/calorías” depende de payload real.

- **Onboarding**  
  Ruta: `/app/onboarding`  
  Estado: Implementado en UI, No Validado E2E.

- **Dashboard semanal**  
  Ruta: `/app/dashboard`  
  Estado: Implementado en UI, No Validado E2E.

- **IA Nutrición: generar plan semanal + lista compra + ajuste**  
  BFF: `/api/ai/nutrition-plan` y `/api/ai/nutrition-plan/generate`  
  Backend: `POST /ai/nutrition-plan` y `POST /ai/nutrition-plan/generate`  
  Estado: Implementado a nivel de endpoints, validación de schema existe (ver 4.3), No Validado E2E.

- **IA Fitness: generar plan + ajuste semanal**  
  BFF: `/api/ai/training-plan` y `/api/ai/training-plan/generate`  
  Backend: `POST /ai/training-plan` y `POST /ai/training-plan/generate`  
  Estado: Implementado a nivel de endpoints, No Validado E2E.

- **Gym Pilot: usuario se une a gym + admin gestiona + asigna plan**  
  BFF: `/api/gyms/*`, `/api/gym/*`, `/api/admin/gym-join-requests/*`, `/api/admin/gyms/*`, `/api/trainer/*`  
  Backend: endpoints `/gyms`, `/gyms/join`, `/gym/join-request`, `/admin/gym-join-requests/*`, `/admin/gyms/*`, `/trainer/*`  
  Estado: Implementado en endpoints y pantallas, No Validado E2E.

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

**Fuente de verdad encontrada (backend):** `back/src/entitlements.ts` (schema `effectiveEntitlementsSchema`, version `2026-02-01`)  
Planes soportados: `FREE, STRENGTH_AI, NUTRI_AI, PRO`.

> Gap: no aparece “Bundle” ni “Gym” como tier comercial en el modelo. “Gym” parece un dominio/rol, no un plan.

| Feature | FREE | STRENGTH_AI | NUTRI_AI | PRO | Evidencia |
|---|---:|---:|---:|---:|---|
| Módulo strength | ✖ | ✔ | ✖ | ✔ | `planHasStrength()` en `entitlements.ts` |
| Módulo nutrition | ✖ | ✖ | ✔ | ✔ | `planHasNutrition()` en `entitlements.ts` |
| Acceso IA (ai) | ✖ | ✔ | ✔ | ✔ | `planHasAi()` en `entitlements.ts` |
| Admin override | n/a | n/a | n/a | fuerza PRO | `adminOverride` retorna PRO |

**Assunção (a verificar en UI):** cómo se aplica esto en gating de rutas y features concretos (se ve `billing/*` y `userCapabilities`, pero requiere validación runtime).

---

## 3) Auditoría UX (mobile-first)

> Sin ejecutar UI, esto se basa en estructura de rutas/componentes y patrones comunes detectados (placeholders, rutas duplicadas).

### Observaciones principales
- Hay **muchas pantallas** para un MVP, con riesgo de dispersión. Prioridad: consolidar core loop: Hoy, Biblioteca, Entreno, Nutrición, Tracking.
- Hay **duplicidad de árbol** trainer (`/trainer`) y portugués (`/treinador`). Esto suele crear inconsistencias de navegación, permisos y copy.
- En componentes de media hay fallback a placeholders en `onError`, correcto, pero si el URL se construye mal se ve placeholder “desde el principio”.

### Estados obligatorios
Evidencia de componentes: `Skeleton`, `EmptyState`, `ErrorState` en biblioteca (`ExerciseLibraryClient.tsx` importa `SkeletonExerciseList`, `EmptyState`, `ErrorState`).  
Riesgo: no hay garantía de uso consistente en todas las pantallas.

### 10 fricciones concretas (con recomendación)
1) **Biblioteca muestra placeholder aunque haya imagen real**.  
   Reco: corregir normalización backend (P0, sección 6).
2) **Rutas duplicadas trainer/treinador**.  
   Reco: elegir una, redirigir la otra, y eliminar duplicados.
3) **Demasiadas entradas en navegación para un usuario Free** (potencial).  
   Reco: ocultar features no disponibles, y poner CTA de upgrade solo en el lugar adecuado.
4) **Admin y Gym admin mezclados en `/app`**.  
   Reco: navegación separada y roles claros, además de “no index” en UI para rutas no permitidas.
5) **Pantallas legacy accesibles** (`/app/profile/legacy`).  
   Reco: eliminar o redirigir a la nueva.
6) **Errores de contrato se manejan en BFF con shapes distintos** (riesgo de UI inconsistente).  
   Reco: unificar payload error standard (code, message, details).
7) **Copy multilingüe potencialmente inconsistente** por duplicidad de rutas y pantallas.  
   Reco: centralizar strings, prohibir hardcoded.
8) **Loading states probablemente no uniformes** fuera de biblioteca.  
   Reco: checklist UI por pantalla: loading/empty/error/disabled.
9) **Settings/Billing visible aunque billing no esté completo**.  
   Reco: esconder o marcar como “en preparación” solo si hay feature flag real backend.
10) **Múltiples rutas de entrenamiento** (`/app/entrenamiento`, `/app/entrenamientos`, `/app/workouts`).  
    Reco: decidir IA vs sesiones vs planes, y simplificar navegación.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

**Frontend**
- Next.js App Router: `front/src/app/*`
- BFF: `front/src/app/api/*` proxy hacia backend, reenviando cookie `fs_token`.
  - Evidencia: `front/src/app/api/gyms/_proxy.ts` (lee cookie `fs_token`, llama `getBackendUrl`)

**Backend**
- Fastify + Prisma (se observa `@prisma/client` en `back/dist/index.js` y `back/src/prismaClient.ts`).
- Endpoints montados en un “index” grande (`back/dist/index.js`).

**Dominios detectados por endpoints/rutas**
- Auth: `/auth/*`, Google OAuth.
- Profile: `/profile`
- Tracking: `/tracking`
- Exercises/Recipes: `/exercises`, `/recipes`
- Training plans, Workouts, Sessions: `/training-plans`, `/workouts`, `/workout-sessions`
- Nutrition plans + user foods: `/nutrition-plans`, `/user-foods`
- AI: `/ai/*` (quota, generate, daily-tip)
- Billing: `/billing/*` (plans, checkout, portal, webhook)
- Gym/Trainer/Admin: `/gyms/*`, `/gym/*`, `/trainer/*`, `/admin/*`

### 4.2 Contratos FE↔BE (mapa)

**BFF endpoints detectados (84):**
- `/api/admin/gym-join-requests/[membershipId]/[action]`
- `/api/admin/gym-join-requests/[membershipId]/accept`
- `/api/admin/gym-join-requests/[membershipId]/reject`
- `/api/admin/gym-join-requests`
- `/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan`
- `/api/admin/gyms/[gymId]/members/[userId]/role`
- `/api/admin/gyms/[gymId]/members`
- `/api/admin/gyms/[gymId]`
- `/api/admin/gyms`
- `/api/admin/users/[id]/block`
- `/api/admin/users/[id]/plan`
- `/api/admin/users/[id]/reset-password`
- `/api/admin/users/[id]`
- `/api/admin/users/[id]/tokens-allowance`
- `/api/admin/users/[id]/tokens/add`
- `/api/admin/users/[id]/tokens/balance`
- `/api/admin/users/[id]/tokens`
- `/api/admin/users/[id]/unblock`
- `/api/admin/users/[id]/verify-email`
- `/api/admin/users`
- `/api/ai/daily-tip`
- `/api/ai/nutrition-plan/generate`
- `/api/ai/nutrition-plan`
- `/api/ai/training-plan/generate`
- `/api/ai/training-plan`
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
- `/api/exercises/[id]`
- `/api/exercises`
- `/api/feed/generate`
- `/api/feed`
- `/api/gym/admin/members/[userId]/role`
- `/api/gym/join-code`
- `/api/gym/join-request`
- `/api/gym/me`
- `/api/gyms/join-by-code`
- `/api/gyms/join`
- `/api/gyms/membership`
- `/api/gyms`
- `/api/nutrition-plans/[id]`
- `/api/nutrition-plans`
- `/api/profile`
- `/api/recipes/[id]`
- `/api/recipes`
- `/api/tracking/[collection]/[id]`
- `/api/tracking`
- `/api/trainer/assign-training-plan`
- `/api/trainer/capabilities`
- `/api/trainer/clients/[id]/assigned-plan`
- `/api/trainer/clients/[id]/notes`
- `/api/trainer/clients/[id]/plan`
- `/api/trainer/clients/[id]`
- `/api/trainer/clients`
- `/api/trainer/join-requests/[membershipId]/[action]`
- `/api/trainer/join-requests/[membershipId]/accept`
- `/api/trainer/join-requests/[membershipId]/reject`
- `/api/trainer/join-requests`
- `/api/trainer/members/[id]/assigned-plan`
- `/api/trainer/members/[id]/training-plan-assignment`
- `/api/trainer/members`
- `/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]`
- `/api/trainer/plans/[id]/days/[dayId]/exercises`
- `/api/trainer/plans/[id]/days/[dayId]`
- `/api/trainer/plans/[id]`
- `/api/trainer/plans`
- `/api/training-plans/[id]/days/[dayId]/exercises`
- `/api/training-plans/[id]`
- `/api/training-plans/active`
- `/api/training-plans`
- `/api/user-foods/[id]`
- `/api/user-foods`
- `/api/workout-sessions/[id]/finish`
- `/api/workout-sessions/[id]`
- `/api/workouts/[id]`
- `/api/workouts/[id]/start`
- `/api/workouts`

**Backend endpoints detectados (99):**
- `GET /admin/gym-join-requests`
- `POST /admin/gym-join-requests/:membershipId/accept`
- `POST /admin/gym-join-requests/:membershipId/reject`
- `GET /admin/gyms`
- `POST /admin/gyms`
- `DELETE /admin/gyms/:gymId`
- `GET /admin/gyms/:gymId/members`
- `POST /admin/gyms/:gymId/members/:userId/assign-training-plan`
- `PATCH /admin/gyms/:gymId/members/:userId/role`
- `GET /admin/users`
- `POST /admin/users`
- `DELETE /admin/users/:id`
- `PATCH /admin/users/:id/block`
- `POST /admin/users/:id/reset-password`
- `PATCH /admin/users/:id/unblock`
- `POST /admin/users/:id/verify-email`
- `POST /ai/daily-tip`
- `POST /ai/nutrition-plan`
- `POST /ai/nutrition-plan/generate`
- `GET /ai/quota`
- `POST /ai/training-plan`
- `POST /ai/training-plan/generate`
- `POST /auth/change-password`
- `GET /auth/google/callback`
- `GET /auth/google/start`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/resend-verification`
- `POST /auth/signup`
- `GET /auth/verify-email`
- `POST /billing/admin/reset-customer-link`
- `POST /billing/checkout`
- `GET /billing/plans`
- `POST /billing/portal`
- `GET /billing/status`
- `POST /billing/stripe/webhook`
- `POST /dev/seed-exercises`
- `POST /dev/seed-recipes`
- `GET /exercises`
- `POST /exercises`
- `GET /exercises/:id`
- `GET /feed`
- `POST /feed/generate`
- `PATCH /gym/admin/members/:userId/role`
- `POST /gym/join-code`
- `POST /gym/join-request`
- `DELETE /gym/me`
- `GET /gym/me`
- `GET /gyms`
- `POST /gyms/join`
- `POST /gyms/join-by-code`
- `DELETE /gyms/membership`
- `GET /gyms/membership`
- `GET /health`
- `GET /nutrition-plans`
- `GET /nutrition-plans/:id`
- `GET /profile`
- `GET /recipes`
- `GET /recipes/:id`
- `GET /tracking`
- `DELETE /tracking/:collection/:id`
- `GET /trainer/clients`
- `DELETE /trainer/clients/:userId`
- `GET /trainer/clients/:userId`
- `DELETE /trainer/clients/:userId/assigned-plan`
- `GET /trainer/clients/:userId/assigned-plan`
- `POST /trainer/clients/:userId/assigned-plan`
- `GET /trainer/gym`
- `PATCH /trainer/gym`
- `DELETE /trainer/members/:id/training-plan-assignment`
- `POST /trainer/members/:id/training-plan-assignment`
- `GET /trainer/members/:userId/training-plan-assignment`
- `GET /trainer/plans`
- `POST /trainer/plans`
- `DELETE /trainer/plans/:planId`
- `GET /trainer/plans/:planId`
- `PATCH /trainer/plans/:planId`
- `DELETE /trainer/plans/:planId/days/:dayId`
- `POST /trainer/plans/:planId/days/:dayId/exercises`
- `DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId`
- `PATCH /trainer/plans/:planId/days/:dayId/exercises/:exerciseId`
- `GET /training-plans`
- `POST /training-plans`
- `GET /training-plans/:id`
- `POST /training-plans/:planId/days/:dayId/exercises`
- `GET /training-plans/active`
- `GET /user-foods`
- `POST /user-foods`
- `DELETE /user-foods/:id`
- `PATCH /workout-sessions/:id`
- `POST /workout-sessions/:id/finish`
- `GET /workouts`
- `POST /workouts`
- `DELETE /workouts/:id`
- `GET /workouts/:id`
- `PATCH /workouts/:id`
- `POST /workouts/:id/start`

#### Mismatches y puntos sensibles (evidencia en código)
- **`GET /api/admin/gyms`**: BFF envuelve respuesta como `{ gyms: ... }`.  
  Evidencia: `front/src/app/api/admin/gyms/route.ts` retorna `{ gyms: normalizeGymListPayload(...) }`.  
  Backend `GET /admin/gyms` (según index) probablemente retorna array. Esto no es “malo” si el contrato BFF es el oficial, pero exige consistencia en FE.

- **Tracking parece incompleto para “crear registro”**:  
  Backend listado detectado incluye `GET /tracking` y `DELETE /tracking/:collection/:id`, pero no se detectó `POST /tracking`.  
  Assunção: puede existir en otra parte no capturada o con otro verbo/patrón. Esto impacta el requisito “crear 1 registro y confirmar persistencia”.

- **Ejercicios media contract roto** (impacta UX):  
  Backend normaliza `imageUrl` solo desde `imageUrls[]`, ignorando el campo `imageUrl` seleccionado por Prisma. Esto puede devolver `imageUrl: null` aunque exista, forzando placeholders en la biblioteca. Evidencia: `back/dist/index.js` función `normalizeExercisePayload` (usa `exercise.imageUrls`), y `listExercises` selecciona `imageUrl`.

> Recomendación estructural: generar un “contract snapshot” (OpenAPI o zod schemas compartidos) desde backend, y que el BFF sea un passthrough salvo normalizaciones estrictamente necesarias.

### 4.3 IA (assistiva)

**Dónde se usa IA hoy (endpoints)**
- `POST /ai/training-plan`, `POST /ai/training-plan/generate`
- `POST /ai/nutrition-plan`, `POST /ai/nutrition-plan/generate`
- `POST /ai/daily-tip`
- `GET /ai/quota`

**Output JSON estructurado + validación**
- Evidencia: imports en `back/dist/index.js` de `nutritionPlanJsonSchema`, `trainingPlanJsonSchema`, `validateNutritionMath`, y parse helpers (`parseJsonFromText`, etc.).
- Esto sugiere pipeline: texto IA → extracción JSON → validación zod/schema → (posible) persistencia.

**Riesgos y mitigaciones**
- PII/logs: si se guardan prompts/respuestas, riesgo de datos sensibles.  
  Mitigación: redacción/anonimización, logs con sampling, y “no almacenar” por defecto salvo debugging opt-in.
- Robustez: parse de JSON desde texto es frágil.  
  Mitigación: forzar salida JSON estricta, reintentos controlados, y fallback UI.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)

> **No ejecutado en auditoría** (ZIP no incluye contexto de CI ni entorno Node).  
> Se marca como **No Validado**.

- `web`: scripts `dev/build/start/lint/test` en `front/package.json` → **No Validado**
- `api`: scripts `dev/build/start/test` + muchos scripts DB en `back/package.json` → **No Validado**
- Commit hash: **No disponible** (ZIP).  
- Node version: **No disponible** (no hay `.nvmrc`/tool-versions detectado en raíz de ZIP).

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) DoD mínimo
- Login + /app protegido: **PASS (Implementado), No Validado E2E**
- Tab bar: **PASS (Implementado), No Validado E2E** (no auditado visual)
- Hoy + 1 acción: **PASS (Implementado), No Validado E2E**
- Tracking persistente: **FAIL (E2E)** por falta de evidencia de endpoint de creación en backend detectado
- Biblioteca lista+detalle: **PASS (Implementado), FAIL UX P0** por bug media list
B) Entitlements modular: **FAIL (Modelo solicitado)**, backend solo define 4 planes y módulos, sin Bundle/Gym tier
C) Free: métricas básicas + rendimiento + food log con macros/calorías: **No Validado**
D) Nutrición Premium: plan semanal + lista compra + ajustes + validación IA: **PASS (Endpoints + schemas), No Validado E2E**
E) Fitness Premium: plan según contexto + ajuste semanal + validación IA: **PASS (Endpoints + schemas), No Validado E2E**
F) Gym Pilot: join + panel admin + asignación plan template: **PASS (Endpoints + pantallas), No Validado E2E**

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-P0-01 | P0 | Producto/UX | Biblioteca ejercicios muestra placeholders aunque haya imagen real | Percepción de baja calidad, rompe demo y confianza | `back/dist/index.js` `normalizeExercisePayload` ignora `exercise.imageUrl` y solo usa `imageUrls[]`. UI usa `getExerciseThumbUrl` y cae a placeholder. | Ajustar normalización: `imageUrl` debe usar `exercise.imageUrl` como fallback si `imageUrls` vacío. Añadir test de contrato sobre `GET /exercises` | Backend lead | S |
| FS-P0-02 | P0 | Arquitectura | Tracking E2E “crear registro” sin evidencia de `POST /tracking` | Core loop incompleto para MVP | Lista de endpoints detectada no incluye POST | Confirmar endpoint real. Si no existe, implementar en backend y exponer BFF. Si existe, documentarlo y añadir test | Backend lead | M |
| FS-P1-01 | P1 | UX/Navegación | Duplicidad `/app/trainer/*` y `/app/treinador/*` | Divergencia funcional, bugs por rutas distintas | Rutas detectadas en `front/src/app/(app)/app/*` | Consolidar y redirigir. Eliminar duplicados en sprints | Frontend lead | M |
| FS-P1-02 | P1 | Producto/Entitlements | Modelo comercial no coincide con requerimiento (Bundle/Gym) | Riesgo de gating incoherente y ventas confusas | `back/src/entitlements.ts` solo soporta 4 planes | Decidir modelo final. Si Bundle es PRO, documentar. Si Gym es rol aparte, definir cómo interactúa con plan. Backend-driven gating | PM + Backend | M |
| FS-P1-03 | P1 | Calidad | Sin evidencia de build/lint/tests PASS | Release impredecible | ZIP no incluye CI ni resultado. Scripts existen | Crear gate CI: build + lint + typecheck + tests mínimos. Requerir PASS antes de merge | DevOps | M |
| FS-P2-01 | P2 | Contratos | Normalizaciones BFF ad hoc (ej. admin gyms wrapper) | Debug difícil, deuda de contrato | `front/src/app/api/admin/gyms/route.ts` | Formalizar “BFF contract” y mantenerlo estable. Añadir contract tests | Architect | M |
| FS-P2-02 | P2 | UX | Rutas legacy accesibles | Confusión y soporte extra | `/app/profile/legacy` | Redirigir o eliminar | Frontend | S |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1 (Apuesta: Estabilidad de demo)
- **Goal:** demo B2C + Gym sin placeholders, sin rutas duplicadas, sin errores obvios de contrato
- **Entra:** FS-P0-01, FS-P1-01, smoke test manual documentado (5 flows), consolidación de navegación mínima
- **No entra:** features nuevas, white-label
- **Métricas:** 0 placeholders en biblioteca con dataset demo, 0 errores consola en flows, 5/5 smoke tests PASS
- **Riesgos/dependencias:** dataset de ejercicios con media real, decisión sobre ruta canonical trainer

### Sprint 2 (Apuesta: MVP Modular real)
- **Goal:** gating por entitlements backend-driven, coherente para Free/Strength/Nutri/Pro
- **Entra:** FS-P1-02, contratos FE gating, CTA upgrade en puntos clave, ocultar features sin entitlement
- **No entra:** Bundle/Gym comercial complejo si no es imprescindible
- **Métricas:** 100% pantallas core respetan entitlements, 0 “placeholder fake”
- **Riesgos:** decisiones comerciales, UI copy/i18n

### Sprint 3 (Apuesta: Gym Pilot autónomo)
- **Goal:** flujo join, accept, assign plan, y usuario ve plan, todo sin intervención manual
- **Entra:** validar endpoints gym/trainer, seed demo, fix tracking (FS-P0-02), checklist de regresión
- **Métricas:** 1 gym demo funciona end-to-end, 0 tickets P0 tras 1 semana de uso interno
- **Riesgos:** contratos en movimiento, roles/permisos

---

## 8) Anexos

### A) Endpoints backend detectados (lista)
- `GET /admin/gym-join-requests`
- `POST /admin/gym-join-requests/:membershipId/accept`
- `POST /admin/gym-join-requests/:membershipId/reject`
- `GET /admin/gyms`
- `POST /admin/gyms`
- `DELETE /admin/gyms/:gymId`
- `GET /admin/gyms/:gymId/members`
- `POST /admin/gyms/:gymId/members/:userId/assign-training-plan`
- `PATCH /admin/gyms/:gymId/members/:userId/role`
- `GET /admin/users`
- `POST /admin/users`
- `DELETE /admin/users/:id`
- `PATCH /admin/users/:id/block`
- `POST /admin/users/:id/reset-password`
- `PATCH /admin/users/:id/unblock`
- `POST /admin/users/:id/verify-email`
- `POST /ai/daily-tip`
- `POST /ai/nutrition-plan`
- `POST /ai/nutrition-plan/generate`
- `GET /ai/quota`
- `POST /ai/training-plan`
- `POST /ai/training-plan/generate`
- `POST /auth/change-password`
- `GET /auth/google/callback`
- `GET /auth/google/start`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/resend-verification`
- `POST /auth/signup`
- `GET /auth/verify-email`
- `POST /billing/admin/reset-customer-link`
- `POST /billing/checkout`
- `GET /billing/plans`
- `POST /billing/portal`
- `GET /billing/status`
- `POST /billing/stripe/webhook`
- `POST /dev/seed-exercises`
- `POST /dev/seed-recipes`
- `GET /exercises`
- `POST /exercises`
- `GET /exercises/:id`
- `GET /feed`
- `POST /feed/generate`
- `PATCH /gym/admin/members/:userId/role`
- `POST /gym/join-code`
- `POST /gym/join-request`
- `DELETE /gym/me`
- `GET /gym/me`
- `GET /gyms`
- `POST /gyms/join`
- `POST /gyms/join-by-code`
- `DELETE /gyms/membership`
- `GET /gyms/membership`
- `GET /health`
- `GET /nutrition-plans`
- `GET /nutrition-plans/:id`
- `GET /profile`
- `GET /recipes`
- `GET /recipes/:id`
- `GET /tracking`
- `DELETE /tracking/:collection/:id`
- `GET /trainer/clients`
- `DELETE /trainer/clients/:userId`
- `GET /trainer/clients/:userId`
- `DELETE /trainer/clients/:userId/assigned-plan`
- `GET /trainer/clients/:userId/assigned-plan`
- `POST /trainer/clients/:userId/assigned-plan`
- `GET /trainer/gym`
- `PATCH /trainer/gym`
- `DELETE /trainer/members/:id/training-plan-assignment`
- `POST /trainer/members/:id/training-plan-assignment`
- `GET /trainer/members/:userId/training-plan-assignment`
- `GET /trainer/plans`
- `POST /trainer/plans`
- `DELETE /trainer/plans/:planId`
- `GET /trainer/plans/:planId`
- `PATCH /trainer/plans/:planId`
- `DELETE /trainer/plans/:planId/days/:dayId`
- `POST /trainer/plans/:planId/days/:dayId/exercises`
- `DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId`
- `PATCH /trainer/plans/:planId/days/:dayId/exercises/:exerciseId`
- `GET /training-plans`
- `POST /training-plans`
- `GET /training-plans/:id`
- `POST /training-plans/:planId/days/:dayId/exercises`
- `GET /training-plans/active`
- `GET /user-foods`
- `POST /user-foods`
- `DELETE /user-foods/:id`
- `PATCH /workout-sessions/:id`
- `POST /workout-sessions/:id/finish`
- `GET /workouts`
- `POST /workouts`
- `DELETE /workouts/:id`
- `GET /workouts/:id`
- `PATCH /workouts/:id`
- `POST /workouts/:id/start`

### B) Endpoints BFF detectados (lista)
- `/api/admin/gym-join-requests/[membershipId]/[action]`
- `/api/admin/gym-join-requests/[membershipId]/accept`
- `/api/admin/gym-join-requests/[membershipId]/reject`
- `/api/admin/gym-join-requests`
- `/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan`
- `/api/admin/gyms/[gymId]/members/[userId]/role`
- `/api/admin/gyms/[gymId]/members`
- `/api/admin/gyms/[gymId]`
- `/api/admin/gyms`
- `/api/admin/users/[id]/block`
- `/api/admin/users/[id]/plan`
- `/api/admin/users/[id]/reset-password`
- `/api/admin/users/[id]`
- `/api/admin/users/[id]/tokens-allowance`
- `/api/admin/users/[id]/tokens/add`
- `/api/admin/users/[id]/tokens/balance`
- `/api/admin/users/[id]/tokens`
- `/api/admin/users/[id]/unblock`
- `/api/admin/users/[id]/verify-email`
- `/api/admin/users`
- `/api/ai/daily-tip`
- `/api/ai/nutrition-plan/generate`
- `/api/ai/nutrition-plan`
- `/api/ai/training-plan/generate`
- `/api/ai/training-plan`
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
- `/api/exercises/[id]`
- `/api/exercises`
- `/api/feed/generate`
- `/api/feed`
- `/api/gym/admin/members/[userId]/role`
- `/api/gym/join-code`
- `/api/gym/join-request`
- `/api/gym/me`
- `/api/gyms/join-by-code`
- `/api/gyms/join`
- `/api/gyms/membership`
- `/api/gyms`
- `/api/nutrition-plans/[id]`
- `/api/nutrition-plans`
- `/api/profile`
- `/api/recipes/[id]`
- `/api/recipes`
- `/api/tracking/[collection]/[id]`
- `/api/tracking`
- `/api/trainer/assign-training-plan`
- `/api/trainer/capabilities`
- `/api/trainer/clients/[id]/assigned-plan`
- `/api/trainer/clients/[id]/notes`
- `/api/trainer/clients/[id]/plan`
- `/api/trainer/clients/[id]`
- `/api/trainer/clients`
- `/api/trainer/join-requests/[membershipId]/[action]`
- `/api/trainer/join-requests/[membershipId]/accept`
- `/api/trainer/join-requests/[membershipId]/reject`
- `/api/trainer/join-requests`
- `/api/trainer/members/[id]/assigned-plan`
- `/api/trainer/members/[id]/training-plan-assignment`
- `/api/trainer/members`
- `/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]`
- `/api/trainer/plans/[id]/days/[dayId]/exercises`
- `/api/trainer/plans/[id]/days/[dayId]`
- `/api/trainer/plans/[id]`
- `/api/trainer/plans`
- `/api/training-plans/[id]/days/[dayId]/exercises`
- `/api/training-plans/[id]`
- `/api/training-plans/active`
- `/api/training-plans`
- `/api/user-foods/[id]`
- `/api/user-foods`
- `/api/workout-sessions/[id]/finish`
- `/api/workout-sessions/[id]`
- `/api/workouts/[id]`
- `/api/workouts/[id]/start`
- `/api/workouts`

### C) Evidencias de contrato media ejercicios (detalle)
- UI: `front/src/components/exercise-library/list/ExerciseCard.tsx` usa `onError` → `/placeholders/exercise-cover.jpg`.
- UI: `front/src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` calcula `coverUrl = getExerciseThumbUrl(exercise) ?? placeholder`.
- Backend: `back/dist/index.js` función `normalizeExercisePayload` pone `imageUrl` desde `exercise.imageUrls[]`, sin fallback a `exercise.imageUrl`.

### D) Feature flags/toggles
- No se detectó un sistema formal de feature flags en los archivos revisados (Assunção: podría existir fuera del ZIP o en env).
- Entitlements actúan como gating lógico a nivel backend: `back/src/entitlements.ts`.

### E) Seguridad
- Se detectan `.env` y `.env.example` en backend. **No se incluyen secretos** en este documento.
