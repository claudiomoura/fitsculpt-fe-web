# Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)

Fecha: **2026-02-26**  
Autor/a auditoría: **Senior Staff Architects (GPT)**  
Solicitado por: Founder/PM (FitSculpt)  
Modo: Solo lectura (auditoría estática de zips front.zip, back.zip, docs.zip)

> Nota crítica: este documento separa claramente: Implementado en código, Validado end-to-end, Vendible sin supervisión.
>
> En esta auditoría no se ejecutaron builds ni tests (sin dependencias instaladas en el entorno offline). Todo lo que sea runtime queda marcado como **No Validado**.

---

# 1) Executive Summary


- **Estado general (B2C): NO Release-ready.** Razones: existen stubs y pantallas no vendibles accesibles por URL, hay al menos 1 mismatch FE-BFF-BE bloqueante (admin gym-role), y no hay evidencia ejecutada de build/lint/typecheck/tests en este snapshot.

- **Estado MVP Modular: NO.** La base de entitlements existe en backend (FREE/STRENGTH_AI/NUTRI_AI/PRO) pero la semántica modular no está cerrada en UI y en IA (la habilitación de IA no discrimina por dominio).

- **Estado Gym Pilot: Parcial.** El dominio Gym existe en backend y hay UI admin/trainer, pero hay fricción de acceso (Gym page está gated por strength), y falta cierre de contratos en asignación de roles a usuarios.

- **Top 5 riesgos (prioridad):**
  1. P0 Contrato roto Admin: `/api/admin/users/:id/gym-role` apunta a un endpoint inexistente en backend (rompe asignación de rol gym/trainer).
  2. Entitlements y gating inconsistentes (Gym atado a módulo strength, IA habilitada de forma cross-domain).
  3. Pantallas y rutas no vendibles accesibles (ej. `/app/admin/gym-requests` hardcoded y “Not available”).
  4. No hay evidencia de “release gates” ejecutados (build/lint/typecheck/tests).
  5. Riesgos de logs/PII en flows IA (preview de respuesta en no-prod, payloads de perfil en prompts).

- **Top 5 quick wins (alto impacto, bajo riesgo):**
  1. Corregir el contrato Admin gym-role (BFF + UI) para usar backend `/admin/users/:userId/assign-gym-role` y `GET /admin/gyms` para opciones.
  2. Desacoplar `/app/gym` de `FeatureGate strength` y definir gating por membership o por plan Gym (B2B).
  3. Ocultar o proteger rutas no vendibles (admin/gym-requests, dev dashboard, stubs) con guards y remover del build de producción.
  4. Ajustar gating IA por dominio (nutrition vs training) usando `entitlements.modules.nutrition/strength` además de `modules.ai`.
  5. Añadir un checklist de smoke test reproducible (manual + comandos) y hacerlo gate de merge (CI).

---

# 2) Inventario de Producto, qué existe hoy

## 2.1 Mapa de navegación (rutas Next.js)

Evidencia: `front/src/app/**/page.tsx`


| Ruta | Tipo | Archivo (evidencia) |
| --- | --- | --- |
| / | Public | src/app/(marketing)/page.tsx |
| /app | User | src/app/(app)/app/page.tsx |
| /app/admin | Admin | src/app/(app)/app/(admin)/admin/page.tsx |
| /app/admin/gym-requests | Admin | src/app/(app)/app/(admin)/admin/gym-requests/page.tsx |
| /app/admin/gyms | Admin | src/app/(app)/app/(admin)/admin/gyms/page.tsx |
| /app/admin/labs | Admin | src/app/(app)/app/(admin)/admin/labs/page.tsx |
| /app/admin/preview | Admin | src/app/(app)/app/(admin)/admin/preview/page.tsx |
| /app/admin/users | Admin | src/app/(app)/app/(admin)/admin/users/page.tsx |
| /app/biblioteca | User | src/app/(app)/app/biblioteca/page.tsx |
| /app/biblioteca/:exerciseId | User | src/app/(app)/app/biblioteca/[exerciseId]/page.tsx |
| /app/biblioteca/entrenamientos | User | src/app/(app)/app/biblioteca/entrenamientos/page.tsx |
| /app/biblioteca/entrenamientos/:planId | User | src/app/(app)/app/biblioteca/entrenamientos/[planId]/page.tsx |
| /app/biblioteca/recetas | User | src/app/(app)/app/biblioteca/recetas/page.tsx |
| /app/biblioteca/recetas/:recipeId | User | src/app/(app)/app/biblioteca/recetas/[recipeId]/page.tsx |
| /app/dashboard | User | src/app/(app)/app/dashboard/page.tsx |
| /app/dietas | User | src/app/(app)/app/dietas/page.tsx |
| /app/dietas/:planId | User | src/app/(app)/app/dietas/[planId]/page.tsx |
| /app/entrenamiento | User | src/app/(app)/app/entrenamiento/page.tsx |
| /app/entrenamiento/:workoutId | User | src/app/(app)/app/entrenamiento/[workoutId]/page.tsx |
| /app/entrenamiento/editar | User | src/app/(app)/app/entrenamiento/editar/page.tsx |
| /app/entrenamientos | User | src/app/(app)/app/entrenamientos/page.tsx |
| /app/entrenamientos/:workoutId | User | src/app/(app)/app/entrenamientos/[workoutId]/page.tsx |
| /app/entrenamientos/:workoutId/start | User | src/app/(app)/app/entrenamientos/[workoutId]/start/page.tsx |
| /app/feed | User | src/app/(app)/app/feed/page.tsx |
| /app/gym | User | src/app/(app)/app/gym/page.tsx |
| /app/gym/admin | User | src/app/(app)/app/gym/admin/page.tsx |
| /app/hoy | User | src/app/(app)/app/hoy/page.tsx |
| /app/macros | User | src/app/(app)/app/macros/page.tsx |
| /app/nutricion | User | src/app/(app)/app/nutricion/page.tsx |
| /app/nutricion/editar | User | src/app/(app)/app/nutricion/editar/page.tsx |
| /app/onboarding | User | src/app/(app)/app/onboarding/page.tsx |
| /app/profile | User | src/app/(app)/app/profile/page.tsx |
| /app/profile/legacy | User | src/app/(app)/app/profile/legacy/page.tsx |
| /app/seguimiento | User | src/app/(app)/app/seguimiento/page.tsx |
| /app/settings | User | src/app/(app)/app/settings/page.tsx |
| /app/settings/billing | User | src/app/(app)/app/settings/billing/page.tsx |
| /app/trainer | Trainer | src/app/(app)/app/(trainer)/trainer/page.tsx |
| /app/trainer/client/:id | Trainer | src/app/(app)/app/(trainer)/trainer/client/[id]/page.tsx |
| /app/trainer/clients | Trainer | src/app/(app)/app/(trainer)/trainer/clients/page.tsx |
| /app/trainer/clients/:id | Trainer | src/app/(app)/app/(trainer)/trainer/clients/[id]/page.tsx |
| /app/trainer/exercises | Trainer | src/app/(app)/app/(trainer)/trainer/exercises/page.tsx |
| /app/trainer/exercises/new | Trainer | src/app/(app)/app/(trainer)/trainer/exercises/new/page.tsx |
| /app/trainer/plans | Trainer | src/app/(app)/app/(trainer)/trainer/plans/page.tsx |
| /app/trainer/plans/:id | Trainer | src/app/(app)/app/(trainer)/trainer/plans/[id]/page.tsx |
| /app/trainer/requests | Trainer | src/app/(app)/app/(trainer)/trainer/requests/page.tsx |
| /app/treinador | Trainer | src/app/(app)/app/(trainer)/treinador/page.tsx |
| /app/treinador/:slug | Trainer | src/app/(app)/app/(trainer)/treinador/[...slug]/page.tsx |
| /app/weekly-review | User | src/app/(app)/app/weekly-review/page.tsx |
| /app/workouts | User | src/app/(app)/app/workouts/page.tsx |
| /design-system | Public | src/app/(auth)/design-system/page.tsx |
| /login | Auth | src/app/(auth)/login/page.tsx |
| /pricing | Public | src/app/(marketing)/pricing/page.tsx |
| /register | Auth | src/app/(auth)/register/page.tsx |
| /verify-email | Auth | src/app/(auth)/verify-email/page.tsx |


### Dev/Admin vs Usuario final

- **Usuario final (B2C):** rutas bajo `/app/*` excluyendo `/app/admin/*`, `/app/trainer/*`, `/app/treinador/*`.
- **Trainer (Gym):** `/app/trainer/*` y alias `/app/treinador/*` (duplicación).
- **Admin:** `/app/admin/*`.

### Callejones sin salida detectados

- `/app/admin/gym-requests` muestra texto hardcoded “Not available.” y está deshabilitado en nav, pero accesible por URL (no cumple regla de ocultar funcionalidad incompleta). Evidencia: `front/src/app/(app)/app/(admin)/admin/gym-requests/page.tsx`.
- Stubs explícitos en BFF que devuelven 501/405 (UI debe tratarlos como “no disponible” y ocultar acciones). Ej: `POST /api/training-plans/active` devuelve 501. Evidencia: `front/src/app/api/training-plans/active/route.ts`.

## 2.2 Flujos end-to-end (journeys)

> Nota: Flujos descritos según código y contratos, sin validación runtime en este entorno.

### Login + acceso a /app protegido

1. Usuario entra en `/login`.
2. Submit ejecuta `loginAction` (server action) y llama backend `POST /auth/login`. Evidencia: `front/src/app/(auth)/login/actions.ts`.
3. Backend setea cookie `fs_token` (o en modo BFF devuelve token).
4. Middleware protege `/app/*` y redirige a `/login?next=...` si no hay cookie. Evidencia: `front/src/middleware.ts`.
5. En trainer role, middleware redirige `/app/*` a `/app/trainer` (routing convenience, no seguridad).

Resultado esperado: acceso a `/app` sin loops, cookie presente, y `/api/auth/me` responde 200.

### Hoy + 1 acción rápida

- Pantalla: `/app/hoy`. Evidencia: `front/src/app/(app)/app/hoy/page.tsx` y `TodaySummaryClient.tsx`.
- Acciones rápidas inferidas por componentes: lectura de tracking, recents, links a entreno/nutrición (depende del perfil).

Resultado esperado: render sin errores, CTA accionable (ej. registrar peso o abrir entrenamiento).

### Biblioteca: lista -> detalle

1. Usuario abre `/app/biblioteca`.
2. FE llama `GET /api/exercises` y renderiza cards con placeholder solo si no hay media válido. Evidencia: `ExerciseLibraryClient.tsx` + `getExerciseThumbUrl` (`front/src/lib/exerciseMedia.ts`).
3. Click en ejercicio navega a `/app/biblioteca/:exerciseId` y llama `GET /api/exercises/:id`.

Resultado esperado: lista paginada, búsqueda/filters, y detalle con media (si existe).

### Tracking: crear 1 registro y confirmar persistencia

1. Usuario abre `/app/seguimiento`.
2. FE carga snapshot `GET /api/tracking` y auto-save `PUT /api/tracking` con debounce 600ms cuando cambian arrays. Evidencia: `TrackingClient.tsx` (auto-save).
3. Backend persiste tracking en `UserProfile.tracking` (JSON). Evidencia: `back/src/index.ts` endpoints `/tracking`.

Resultado esperado: al recargar, `GET /api/tracking` incluye el entry creado.

### Food log: registrar ítems por gramos y ver macros/calorías

- Implementado dentro de `/app/seguimiento` (foodLog). Se registran items `{foodKey, grams}` y se calculan macros/calorías (por 100g) usando perfiles por defecto y `UserFood` personalizados. Evidencia: `TrackingClient.tsx` (`macroTotals`, `resolveFoodProfile`) y endpoints `/user-foods` (backend).

Resultado esperado: item aparece en el día, y totales se actualizan. Persistencia vía `/tracking`.

### Onboarding

- Ruta `/app/onboarding` con `OnboardingClient`. Evidencia: `front/src/app/(app)/app/onboarding/page.tsx`.
- Persiste perfil mediante `PUT /api/profile` (backend `/profile`).

Resultado esperado: completar datos mínimos y redirigir a `next` o `/app`.

### Dashboard semanal

- Ruta `/app/weekly-review`. Evidencia: `front/src/app/(app)/app/weekly-review/page.tsx`.
- Usa BFF `GET /api/review/weekly` -> backend `GET /review/weekly`. Evidencia: `front/src/app/api/review/weekly/route.ts` y `back/src/routes/weeklyReview.ts`.

Resultado esperado: resumen semanal derivado de tracking, sin errores.

### IA Nutrición: generar plan semanal + lista compra + ajuste

- UI: `/app/nutricion` con CTA `?ai=1`. Evidencia: `front/src/app/(app)/app/nutricion/page.tsx` + `NutritionPlanClient.tsx`.
- Llamada: `POST /api/ai/nutrition-plan/generate` (BFF) -> backend `POST /ai/nutrition-plan/generate`. Evidencia: `front/src/app/api/ai/nutrition-plan/generate/route.ts` y `back/src/index.ts` ruta correspondiente.
- Persistencia: FE guarda snapshot en perfil via `updateUserProfile({ nutritionPlan })`. Evidencia: `NutritionPlanClient.tsx` (múltiples llamadas a `updateUserProfile`). Backend también persiste en tablas `NutritionPlan*` (función `saveNutritionPlan`).
- Lista de compra: implementada en client (shopping list). Evidencia: `NutritionPlanClient.tsx` (ShoppingItem).

Resultado esperado: plan válido con 7 días, mealsPerDay consistente, y token accounting actualizado.

### IA Fitness: generar plan + ajuste semanal

- UI: `/app/entrenamiento?ai=1` (trigger). Evidencia: `TrainingPlanClient.tsx` (`shouldTriggerAiGeneration`).
- Llamada: `POST /api/ai/training-plan/generate` (BFF) -> backend `POST /ai/training-plan/generate`.
- Persistencia: FE guarda snapshot en perfil via `updateUserProfile({ trainingPlan })` (evidencia en `TrainingPlanClient.tsx`). Backend persiste en tablas `TrainingPlan*` (función `saveTrainingPlan`).

### Gym Pilot: unirse + admin gestiona + asigna plan

1. Usuario navega a `/app/gym` (hoy está gated por `FeatureGate feature="strength"`). Evidencia: `front/src/app/(app)/app/gym/page.tsx`.
2. Solicitud de unión: `POST /api/gyms/join` o `POST /api/gyms/join-by-code`. Evidencia: rutas en `front/src/app/api/gyms/*`.
3. Manager (admin/trainer) lista requests via `GET /api/admin/gym-join-requests` o `GET /api/trainer/join-requests` (BFF proxy a backend).
4. Accept/reject via `POST /api/admin/gym-join-requests/:id/accept|reject` (o variante `:action`).
5. Asignación de plan a miembro: `POST /api/admin/gyms/:gymId/members/:userId/assign-training-plan`. Evidencia: `front/src/app/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan/route.ts` y backend `POST /admin/gyms/:gymId/members/:userId/assign-training-plan`.

Resultado esperado: membership pasa a ACTIVE, y el usuario ve plan asignado en área trainer.

## 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

Evidencia backend: `back/src/entitlements.ts` define planes `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`. No existe tier "Gym" como plan, Gym es un dominio por membership (`GymMembership`).

Propuesta de mapeo (documental):
- Free -> `FREE`
- Fitness Premium -> `STRENGTH_AI`
- Nutrición Premium -> `NUTRI_AI`
- Bundle -> `PRO`
- Gym -> Dimensión separada: `GymMembershipStatus=ACTIVE` + `GymRole`

| Feature | Free | Nutri Premium (NUTRI_AI) | Fitness Premium (STRENGTH_AI) | Bundle (PRO) | Gym (membership) | Implementado de verdad | Evidencia |
|---|---:|---:|---:|---:|---:|---|---|
| Acceso pantallas nutrition (nav) | ❌ | ✅ | ❌ | ✅ | n/a | Parcial (nav gating) | `navConfig.ts` feature=nutrition |
| Acceso pantallas training | ✅ | ✅ | ✅ | ✅ | n/a | Sí | rutas `/app/entrenamiento*` |
| IA Training generate | ❌ | ⚠ (hoy sí, por ai module) | ✅ | ✅ | n/a | Sí, pero gating cross-domain | `aiAccessGuard` solo mira modules.ai |
| IA Nutrition generate | ❌ | ✅ | ⚠ (hoy sí, por ai module) | ✅ | n/a | Sí, pero gating cross-domain | `hasNutritionAiEntitlement` permite si ai enabled |
| Gym UI /app/gym | ❌ (hoy) | ❌ (hoy) | ✅ | ✅ | ✅ esperable | No alineado | `FeatureGate feature="strength"` |
| Admin gyms / members | Admin-only | Admin-only | Admin-only | Admin-only | Admin-only | Parcial (permiso gym manager) | backend `requireGymManagerForGym` |

Leyenda: ✅ disponible, ❌ no disponible, ⚠ inconsistencia actual.

---

# 3) Auditoría UX (mobile-first)

## Consistencia tab bar y navegación

- Existe tab bar mobile (`MobileTabBar.tsx`) con gating por entitlements.
- Nav drawer (`AppNavBar.tsx`) usa `buildNavigationSections` + `applyEntitlementGating`.
- Inconsistencia: label aria `"Abrir menú"` está hardcoded en español, no i18n. Evidencia: `AppNavBar.tsx`.

## Estados obligatorios (loading/empty/error/success/disabled)

- Hay componentes reutilizables `LoadingState`, `EmptyState`, `ErrorState` en múltiples pantallas. Evidencia: `front/src/components/states/*`.
- En gym/admin/trainer hay manejo explícito de 404/405 como "unsupported". Evidencia: `AdminGymsClient.tsx`, rutas BFF con 405/501.

## Copy/i18n

- Base i18n ES/EN/PT presente (`front/src/messages/*.json`).
- Problemas detectados:
  - Textos hardcoded sin i18n: `/app/admin/gym-requests` y algunos mensajes de stubs.
  - Mezcla de rutas ES/PT (trainer vs treinador) aumenta superficie y complejidad de copy y QA.

## 10 fricciones concretas (con recomendación)

1. **Gym Pilot bloqueado por plan strength**: `/app/gym` requiere `FeatureGate strength`, impide onboarding B2B en Free. Recomendar gating por `gymMembershipState` y rol.
2. **Pantalla admin "Gym requests" no vendible** accesible por URL. Recomendar eliminar o proteger con feature flag dev-only.
3. **Mismatch admin gym-role** rompe asignación de roles a usuarios desde Admin UI. Recomendar alinear contratos y UI.
4. **Gating IA cross-domain**: `hasNutritionAiEntitlement` y `hasStrengthAiEntitlement` permiten IA si `modules.ai` enabled, lo que rompe la promesa modular. Recomendar separar `ai` como requisito adicional, pero no sustituto de `nutrition/strength`.
5. **Duplicación trainer routes** (`/app/trainer` y `/app/treinador`) complica QA y analytics. Recomendar unificar y mantener alias con redirect si hace falta.
6. **Rutas de entreno duplicadas** (`/app/entrenamiento`, `/app/entrenamientos`, `/app/workouts`) generan confusión. Recomendar consolidar una IA y un calendario, mantener redirects.
7. **Auto-save tracking cada 600ms** puede generar spam de requests en móvil. Recomendar batching o save explícito con indicador de guardado.
8. **Recipe library sin fotos**: `Recipe.photoUrl` existe, seed no carga imágenes. Si no se va a tener media, optimizar UI para no sugerirlo o incluir dataset con foto.
9. **Admin acceso a miembros depende de membership**: backend `requireGymManagerForGym` no permite global admin sin membership. Recomendar bypass para role ADMIN o bootstrap admin.
10. **Stubs 501/405 visibles**: hay endpoints que devuelven 501/405. Asegurar que la UI oculta botones y no ofrece acciones que fallan. Evidencia: `training-plans/active` POST 501, `trainer/clients/:id/notes` 501.

---

# 4) Auditoría de Arquitectura y Contratos

## 4.1 Arquitectura real (Frontend + BFF + Backend)

### Frontend
- Next.js App Router. Rutas en `front/src/app`.
- Middleware protege `/app/*` por cookie `fs_token`. Evidencia: `front/src/middleware.ts`.
- UI usa `fetch('/api/*')` (BFF) para la mayoría de dominios, pero Auth login/register/logout usan server actions directas a backend. Evidencia: `front/src/app/(auth)/login/actions.ts`.

### BFF
- Implementado en `front/src/app/api/**/route.ts`.
- Patrón: reenviar `fs_token` en header `cookie` al backend, y normalizar errores. Evidencia: `front/src/app/api/gyms/_proxy.ts`, `front/src/app/api/ai/*`.
- Hay validaciones runtime (contract drift) para endpoints críticos. Evidencia: `front/src/lib/runtimeContracts.ts` y `front/src/test/bffContractsRcV1.contract.test.ts`.

### Backend
- Fastify + Prisma. Rutas principales en `back/src/index.ts` (archivo muy grande) y módulos puntuales en `back/src/routes/*`.
- Persistencia: PostgreSQL via Prisma (`back/prisma/schema.prisma`).
- Entitlements: `back/src/entitlements.ts`.
- IA: openai client + schemas + persistencia en `AiUsage*`, `AiContent`.

### Zonas sensibles
- `fs_token`: cookie + JWT signing en backend (`reply.jwtSign`) y lectura superficial en middleware (no verificación).
- BFF /api/*: es el contrato de UI, cualquier drift rompe UX.
- Contratos Gym Pilot documentados. Evidencia: `docs/docs/contracts.md`.

## 4.2 Contratos FE↔BE (mapa)

Tabla (BFF endpoints detectados). Estado:
- **OK**: proxy directo o implementado local.
- **Mismatch**: BFF apunta a endpoint inexistente o incompatible.
- **Stub**: endpoint devuelve 501/405 deliberado.
- **Local**: endpoint no llama a backend (capabilities).
- **Unknown**: target computado no inferible por regex, revisar archivo.


| BFF /api/* | Métodos | Backend target (best-effort) | Estado | Notas | Archivo |
| --- | --- | --- | --- | --- | --- |
| /api/admin/gym-join-requests | GET | /admin/gym-join-requests | OK |  | src/app/api/admin/gym-join-requests/route.ts |
| /api/admin/gym-join-requests/:membershipId/:action | POST | /admin/gym-join-requests/${normalizedMembershipId}/${normalizedAction} | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/[action]/route.ts |
| /api/admin/gym-join-requests/:membershipId/accept | POST | /admin/gym-join-requests/${membershipId}/accept | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/accept/route.ts |
| /api/admin/gym-join-requests/:membershipId/reject | POST | /admin/gym-join-requests/${membershipId}/reject | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/reject/route.ts |
| /api/admin/gyms | GET,POST | /admin/gyms | OK |  | src/app/api/admin/gyms/route.ts |
| /api/admin/gyms/:gymId | DELETE | /admin/gyms/${gymId} | Unknown |  | src/app/api/admin/gyms/[gymId]/route.ts |
| /api/admin/gyms/:gymId/members | GET | /admin/gyms/${gymId}/members | Unknown |  | src/app/api/admin/gyms/[gymId]/members/route.ts |
| /api/admin/gyms/:gymId/members/:userId/assign-training-plan | POST | /admin/gyms/${gymId}/members/${userId}/assign-training-plan | Unknown |  | src/app/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan/route.ts |
| /api/admin/gyms/:gymId/members/:userId/role | PATCH | /admin/gyms/${gymId}/members/${userId}/role | Unknown |  | src/app/api/admin/gyms/[gymId]/members/[userId]/role/route.ts |
| /api/admin/users | GET,POST | /admin/users, /admin/users?${url.searchParams.toString()} | OK |  | src/app/api/admin/users/route.ts |
| /api/admin/users/:id | DELETE | /admin/users/${id} | Unknown |  | src/app/api/admin/users/[id]/route.ts |
| /api/admin/users/:id/block | PATCH | /admin/users/${id}/block | Unknown |  | src/app/api/admin/users/[id]/block/route.ts |
| /api/admin/users/:id/gym-role | GET,POST | /admin/users/${id}/gym-role | Mismatch | BFF targets /admin/users/:id/gym-role but backend implements POST /admin/users/:userId/assign-gym-role (no GET). | src/app/api/admin/users/[id]/gym-role/route.ts |
| /api/admin/users/:id/reset-password | POST | /admin/users/${id}/reset-password | Unknown |  | src/app/api/admin/users/[id]/reset-password/route.ts |
| /api/admin/users/:id/unblock | PATCH | /admin/users/${id}/unblock | Unknown |  | src/app/api/admin/users/[id]/unblock/route.ts |
| /api/admin/users/:id/verify-email | POST | /admin/users/${id}/verify-email | Unknown |  | src/app/api/admin/users/[id]/verify-email/route.ts |
| /api/ai/daily-tip | POST | /ai/daily-tip | OK |  | src/app/api/ai/daily-tip/route.ts |
| /api/ai/nutrition-plan | POST | /ai/nutrition-plan | OK |  | src/app/api/ai/nutrition-plan/route.ts |
| /api/ai/nutrition-plan/generate | POST | /ai/nutrition-plan/generate | OK |  | src/app/api/ai/nutrition-plan/generate/route.ts |
| /api/ai/training-plan | POST | /ai/training-plan | OK |  | src/app/api/ai/training-plan/route.ts |
| /api/ai/training-plan/generate | POST | /ai/training-plan/generate | OK |  | src/app/api/ai/training-plan/generate/route.ts |
| /api/auth/change-password | POST | /auth/change-password | OK |  | src/app/api/auth/change-password/route.ts |
| /api/auth/google/callback | GET | /auth/google/callback | OK |  | src/app/api/auth/google/callback/route.ts |
| /api/auth/google/start | GET | /auth/google/start | OK |  | src/app/api/auth/google/start/route.ts |
| /api/auth/me | GET | /auth/me | OK |  | src/app/api/auth/me/route.ts |
| /api/auth/resend-verification | POST | /auth/resend-verification | OK |  | src/app/api/auth/resend-verification/route.ts |
| /api/auth/verify-email | GET | /auth/verify-email?token=${encodeURIComponent(token ?? "")} | Unknown |  | src/app/api/auth/verify-email/route.ts |
| /api/billing/checkout | POST | /billing/checkout | OK |  | src/app/api/billing/checkout/route.ts |
| /api/billing/plans | GET | /billing/plans | OK |  | src/app/api/billing/plans/route.ts |
| /api/billing/portal | POST | /billing/portal | OK |  | src/app/api/billing/portal/route.ts |
| /api/billing/status | GET | /billing/status?${url.searchParams.toString()} | Unknown |  | src/app/api/billing/status/route.ts |
| /api/exercises | GET,POST | /exercises, /exercises?${url.searchParams.toString()} | OK |  | src/app/api/exercises/route.ts |
| /api/exercises/:id | GET | /exercises/${id} | Unknown |  | src/app/api/exercises/[id]/route.ts |
| /api/gym/admin/members/:userId/role | PATCH | /gym/admin/members/${userId}/role | Unknown |  | src/app/api/gym/admin/members/[userId]/role/route.ts |
| /api/gym/join-code | POST | /gym/join-code | OK |  | src/app/api/gym/join-code/route.ts |
| /api/gym/join-request | POST | /gym/join-request, /gyms/join | OK |  | src/app/api/gym/join-request/route.ts |
| /api/gym/me | DELETE,GET | /gym/me, /gyms/membership | OK |  | src/app/api/gym/me/route.ts |
| /api/gyms | GET |  | OK |  | src/app/api/gyms/route.ts |
| /api/gyms/join | POST | /gyms/join | OK |  | src/app/api/gyms/join/route.ts |
| /api/gyms/join-by-code | POST | /gyms/join-by-code | OK |  | src/app/api/gyms/join-by-code/route.ts |
| /api/gyms/membership | DELETE,GET | /gyms/membership | OK |  | src/app/api/gyms/membership/route.ts |
| /api/nutrition-plans | GET | /nutrition-plans?${url.searchParams.toString()} | Unknown |  | src/app/api/nutrition-plans/route.ts |
| /api/nutrition-plans/:id | GET | /nutrition-plans/${id} | Unknown |  | src/app/api/nutrition-plans/[id]/route.ts |
| /api/profile | GET,PUT | /profile | OK |  | src/app/api/profile/route.ts |
| /api/recipes | GET | /recipes?${url.searchParams.toString()} | Unknown |  | src/app/api/recipes/route.ts |
| /api/recipes/:id | GET | /recipes/${id} | Unknown |  | src/app/api/recipes/[id]/route.ts |
| /api/review/weekly | GET |  | OK |  | src/app/api/review/weekly/route.ts |
| /api/tracking | GET,POST,PUT | /tracking | OK |  | src/app/api/tracking/route.ts |
| /api/tracking/:collection/:id | DELETE | /tracking/${collection}/${id} | Unknown |  | src/app/api/tracking/[collection]/[id]/route.ts |
| /api/trainer/assign-training-plan | POST |  | Unknown |  | src/app/api/trainer/assign-training-plan/route.ts |
| /api/trainer/capabilities | GET |  | Local |  | src/app/api/trainer/capabilities/route.ts |
| /api/trainer/clients | GET | /trainer/clients | OK |  | src/app/api/trainer/clients/route.ts |
| /api/trainer/clients/:id | DELETE,GET | /trainer/clients/${id} | Unknown |  | src/app/api/trainer/clients/[id]/route.ts |
| /api/trainer/clients/:id/assigned-plan | DELETE,GET,POST | /trainer/clients/${id}/assigned-plan | Unknown |  | src/app/api/trainer/clients/[id]/assigned-plan/route.ts |
| /api/trainer/clients/:id/notes | GET,OPTIONS,POST |  | Local |  | src/app/api/trainer/clients/[id]/notes/route.ts |
| /api/trainer/clients/:id/plan |  |  | OK |  | src/app/api/trainer/clients/[id]/plan/route.ts |
| /api/trainer/join-requests | GET | /admin/gym-join-requests | OK |  | src/app/api/trainer/join-requests/route.ts |
| /api/trainer/join-requests/:membershipId/:action | POST | /admin/gym-join-requests/${normalizedMembershipId}/${normalizedAction} | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/[action]/route.ts |
| /api/trainer/join-requests/:membershipId/accept | POST | /admin/gym-join-requests/${membershipId}/accept | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/accept/route.ts |
| /api/trainer/join-requests/:membershipId/reject | POST | /admin/gym-join-requests/${membershipId}/reject | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/reject/route.ts |
| /api/trainer/members | GET | /admin/gyms/${gymId}/members, /gyms/membership | OK |  | src/app/api/trainer/members/route.ts |
| /api/trainer/members/:id/assigned-plan |  |  | OK |  | src/app/api/trainer/members/[id]/assigned-plan/route.ts |
| /api/trainer/members/:id/training-plan-assignment | DELETE,OPTIONS,POST | /trainer/members/${id}/training-plan-assignment | Unknown |  | src/app/api/trainer/members/[id]/training-plan-assignment/route.ts |
| /api/trainer/plans | GET,POST | /trainer/plans | OK |  | src/app/api/trainer/plans/route.ts |
| /api/trainer/plans/:id | DELETE,GET,OPTIONS,PATCH,PUT | /trainer/plans/${id} | Unknown |  | src/app/api/trainer/plans/[id]/route.ts |
| /api/trainer/plans/:id/days/:dayId | DELETE,OPTIONS | /trainer/plans/${id}/days/${dayId} | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises | OPTIONS,POST | /trainer/plans/${id}/days/${dayId}/exercises | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises/:exerciseId | DELETE,OPTIONS,PATCH | /trainer/plans/${id}/days/${dayId}/exercises/${exerciseId} | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]/route.ts |
| /api/training-plans | GET,POST | /training-plans | OK |  | src/app/api/training-plans/route.ts |
| /api/training-plans/:id | GET | /training-plans/${id} | Unknown |  | src/app/api/training-plans/[id]/route.ts |
| /api/training-plans/:id/days/:dayId/exercises | POST | /training-plans/${id}/days/${dayId}/exercises | Unknown |  | src/app/api/training-plans/[id]/days/[dayId]/exercises/route.ts |
| /api/training-plans/active | GET,POST |  | Partial |  | src/app/api/training-plans/active/route.ts |
| /api/workouts | GET,POST | /workouts | OK |  | src/app/api/workouts/route.ts |
| /api/workouts/:id | DELETE,GET,PATCH | /workouts/${id} | Unknown |  | src/app/api/workouts/[id]/route.ts |
| /api/workouts/:id/start | POST | /workouts/${id}/start | Unknown |  | src/app/api/workouts/[id]/start/route.ts |


### Mismatches y stubs más relevantes

- **P0 Mismatch:** `/api/admin/users/:id/gym-role` (GET/POST) no existe en backend. Backend implementa `POST /admin/users/:userId/assign-gym-role` (sin GET). Evidencia FE: `front/src/app/api/admin/users/[id]/gym-role/route.ts`. Evidencia BE: `back/src/routes/admin/assignGymRole.ts`.
- **Stub:** `POST /api/training-plans/active` responde 501. Evidencia: `front/src/app/api/training-plans/active/route.ts`.
- **Stub:** `/api/trainer/clients/:id/notes` (GET/POST) responde 501. Evidencia: `front/src/app/api/trainer/clients/[id]/notes/route.ts`.

## 4.3 IA (assistiva)

### Dónde se usa IA hoy
- Training: `/ai/training-plan` y `/ai/training-plan/generate` (backend), consumido vía BFF `/api/ai/training-plan/*`.
- Nutrition: `/ai/nutrition-plan` y `/ai/nutrition-plan/generate` (backend), consumido vía BFF `/api/ai/nutrition-plan/*`.
- Daily tip: `/ai/daily-tip`.

### Output JSON estructurado + validación + fallback
- Backend fuerza `response_format` JSON y reintento en parse error (openai client). Evidencia: `back/src/ai/provider/openaiClient.ts`.
- Hay schemas Zod para requests/respuestas (ej. `aiTrainingSchema`, `aiNutritionSchema` y response schemas).
- Persistencia se hace después de normalización y checks (ej. `assertNutritionMatchesRequest`).
- Fallbacks: plantillas (`buildNutritionTemplate`), cache (`AiPromptCache`), variety guard y catalog resolution. Evidencia: `back/src/ai/nutrition-plan/*` y funciones en `back/src/index.ts`.

### Riesgos y mitigaciones
- **PII en logs**: en no-prod se loggea preview de respuesta IA (hasta 300 chars). Puede incluir datos del usuario. Mitigación: sanitizar o desactivar preview siempre. Evidencia: `createOpenAiClient` logging.
- **Gating de IA**: `aiAccessGuard` solo valida `modules.ai` + tokens, no discrimina por dominio (nutrition vs training). Mitigación: añadir guard por endpoint (o por request).

---

# 5) Calidad y Release Readiness (con evidencia)

## 5.1 Evidencia técnica (PASS/FAIL)

Entorno de auditoría:
- Node: `v22.16.0` (solo para referencia, no implica compatibilidad).
- Fuente: zips sin carpeta `.git` (commit hash no disponible).

Ejecución: **No Ejecutado** (sin `node_modules`, entorno offline).

| Check | Front (Next) | Backend (Fastify) | Evidencia en repo | Resultado auditado |
|---|---|---|---|---|
| build | `npm run build` | `npm run build` | `front/package.json`, `back/package.json` | No Validado |
| lint | `npm run lint` | (no definido) | `front/package.json` | No Validado |
| typecheck | `npm run typecheck` | (TS compile en build) | `front/package.json` | No Validado |
| tests | `npm test` (vitest), e2e (playwright) | `npm test` (vitest) | `front/package.json`, `back/package.json` | No Validado |

## 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL)

> Regla: si no hay evidencia de build PASS + flujo manual probado, se marca **No Validado** aunque esté implementado.

### A) DoD mínimo
- Login + /app protegido: **Implementado**, **No Validado**. Evidencia: `middleware.ts`, `login/actions.ts`.
- Tab bar: **Implementado**, **No Validado**. Evidencia: `MobileTabBar.tsx`.
- Hoy + 1 acción: **Implementado**, **No Validado**. Evidencia: `/app/hoy`.
- Tracking persistente: **Implementado**, **No Validado** (requiere prueba). Evidencia: `/tracking` endpoints + TrackingClient auto-save.
- Biblioteca lista+detalle: **Implementado**, **No Validado**. Evidencia: `/exercises` endpoints + páginas biblioteca.

### B) Entitlements modular
- Backend: **Implementado** (FREE/STRENGTH_AI/NUTRI_AI/PRO), **No Validado** en flows de compra. Evidencia: `entitlements.ts`, `/billing/*`.
- UI gating: **Parcial** (nav gating + FeatureGate en gym), con inconsistencias.

### C) Free (métricas + food log)
- Tracking + food log existe. **Implementado**, **No Validado**.

### D) Nutrición Premium
- Plan semanal + shopping list + ajustes UI: **Implementado**, **No Validado**.
- Validación IA: **Implementado** con retries y asserts.

### E) Fitness Premium
- Plan entrenamiento generado + edición básica: **Implementado**, **No Validado**.

### F) Gym Pilot
- Join request + accept/reject + lista miembros: **Implementado**, **No Validado**.
- Asignación de plan: **Implementado**.
- Asignación de rol gym desde admin users: **FAIL (P0)** por mismatch endpoint.

---

# 6) Hallazgos priorizados

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| P0-01 | P0 | Contratos | `/api/admin/users/:id/gym-role` no existe en backend | Rompe asignación de roles de gym/trainer desde Admin | FE: `front/src/app/api/admin/users/[id]/gym-role/route.ts`, BE: `back/src/routes/admin/assignGymRole.ts` | Cambiar BFF+UI a `POST /admin/users/:userId/assign-gym-role` y usar `GET /admin/gyms` para listado | Backend+FE | M |
| P0-02 | P0 | Entitlements/Gym | `/app/gym` gated por `strength` | Bloquea Gym Pilot para cuentas Free o Nutri-only | `front/src/app/(app)/app/gym/page.tsx`, `navConfig.ts` | Gate por membership (`gymMembershipState`) o por tier Gym (B2B) separado | FE+Producto | S |
| P1-01 | P1 | UX | Ruta `/app/admin/gym-requests` accesible y hardcoded | Inconsistencia, mala UX, rompe regla de ocultar incompleto | `front/src/app/(app)/app/(admin)/admin/gym-requests/page.tsx` | Eliminar o proteger (dev-only) y quitar de build prod | FE | S |
| P1-02 | P1 | Entitlements/IA | IA habilitada cross-domain por `modules.ai` | Vende modularidad falsa, riesgo de abuso | `back/src/index.ts` `aiAccessGuard`, `front/src/components/access/aiEntitlements.ts` | Cambiar guard y checks por dominio (`modules.strength`/`modules.nutrition`) + `modules.ai` como adicional | Backend+FE+Producto | M |
| P1-03 | P1 | Arquitectura | `back/src/index.ts` es monolito con 100+ endpoints | Dificulta mantenimiento y control de regresión | `back/src/index.ts` | Modularizar por dominio (Auth/Profile/Gym/AI/etc) y registrar rutas | Backend | L |
| P2-01 | P2 | UX/Rutas | Duplicación `/app/trainer` y `/app/treinador` | Coste de QA, analytics e i18n | rutas en `front/src/app/(app)/app/(trainer)` | Unificar, dejar redirect y mantener una ruta canonical | FE | M |
| P2-02 | P2 | UX | Tab bar/Drawer no bloquea acceso directo a rutas premium | Usuarios pueden entrar por URL y ver errores/CTAs inconsistentes | `navConfig.ts` vs páginas sin FeatureGate | Añadir `FeatureGate` o guard a nivel página para features premium | FE | M |
| P2-03 | P2 | Data | Recipes seed no incluye `photoUrl` | Recipe library se ve “vacía” visualmente | `back/src/index.ts` seed-recipes | Añadir dataset con fotos o UX sin imagen y sin prometer media | Producto+Data | M |
| P2-04 | P2 | Perf | Auto-save tracking (600ms) puede saturar móvil | Mayor latencia, consumo | `TrackingClient.tsx` | Batch/save explícito, indicador de guardado, retry offline | FE | M |
| P3-01 | P3 | Seguridad | `.env` presente en zip backend | Riesgo de leak si se commitea | `back/.env` (no incluir valores) | Asegurar `.gitignore`, rotar secretos, usar env vars en deploy | Backend/DevOps | S |

---

# 7) Próximos pasos (roadmap)

Propuesta de 3 sprints, 1 apuesta por sprint.

## Sprint 1 (Estabilidad + contratos cerrados)
- Goal: build estable y contratos críticos cerrados para Gym Pilot + AI.
- Entra: fix P0-01, P0-02, P1-01, P1-02, smoke checklist y CI gate mínimo (aunque sea local).
- No entra: features nuevas (UI extra, white-label).
- Métricas: 0 rutas "Not available" accesibles, 0 mismatches conocidos, IA genera plan en <2 intentos en demo seed, 0 errores consola en flows core.
- Riesgos/deps: coordinación FE/BE, ajuste de entitlements sin romper usuarios existentes.

## Sprint 2 (Gym Pilot autonomizable)
- Goal: flujo Gym completo sin soporte: join por código, aceptación, members list, assign plan, trainer view.
- Entra: gating por membership, permisos global admin, pantallas trainer pulidas, seed demo reproducible.
- Métricas: un usuario nuevo puede unirse a gym, y en 3 min un trainer asigna plan y el usuario lo ve.
- Riesgos: roles y permisos, UX de errores.

## Sprint 3 (MVP modular vendible B2C)
- Goal: cerrar Nutri y Strength como módulos coherentes (pantallas, IA, billing).
- Entra: FeatureGate consistente en páginas premium, mejoras food log/macros, recipe catalog mínimo presentable, ajustes de onboarding para perfil completo.
- Métricas: conversión de onboarding completado, generación de plan sin fallos, percepción premium (UX).

---

# 8) Anexos

## 8.1 Árbol de rutas/pantallas

- `/` (Public)  [src/app/(marketing)/page.tsx]
- `/app` (User)  [src/app/(app)/app/page.tsx]
- `/app/admin` (Admin)  [src/app/(app)/app/(admin)/admin/page.tsx]
- `/app/admin/gym-requests` (Admin)  [src/app/(app)/app/(admin)/admin/gym-requests/page.tsx]
- `/app/admin/gyms` (Admin)  [src/app/(app)/app/(admin)/admin/gyms/page.tsx]
- `/app/admin/labs` (Admin)  [src/app/(app)/app/(admin)/admin/labs/page.tsx]
- `/app/admin/preview` (Admin)  [src/app/(app)/app/(admin)/admin/preview/page.tsx]
- `/app/admin/users` (Admin)  [src/app/(app)/app/(admin)/admin/users/page.tsx]
- `/app/biblioteca` (User)  [src/app/(app)/app/biblioteca/page.tsx]
- `/app/biblioteca/:exerciseId` (User)  [src/app/(app)/app/biblioteca/[exerciseId]/page.tsx]
- `/app/biblioteca/entrenamientos` (User)  [src/app/(app)/app/biblioteca/entrenamientos/page.tsx]
- `/app/biblioteca/entrenamientos/:planId` (User)  [src/app/(app)/app/biblioteca/entrenamientos/[planId]/page.tsx]
- `/app/biblioteca/recetas` (User)  [src/app/(app)/app/biblioteca/recetas/page.tsx]
- `/app/biblioteca/recetas/:recipeId` (User)  [src/app/(app)/app/biblioteca/recetas/[recipeId]/page.tsx]
- `/app/dashboard` (User)  [src/app/(app)/app/dashboard/page.tsx]
- `/app/dietas` (User)  [src/app/(app)/app/dietas/page.tsx]
- `/app/dietas/:planId` (User)  [src/app/(app)/app/dietas/[planId]/page.tsx]
- `/app/entrenamiento` (User)  [src/app/(app)/app/entrenamiento/page.tsx]
- `/app/entrenamiento/:workoutId` (User)  [src/app/(app)/app/entrenamiento/[workoutId]/page.tsx]
- `/app/entrenamiento/editar` (User)  [src/app/(app)/app/entrenamiento/editar/page.tsx]
- `/app/entrenamientos` (User)  [src/app/(app)/app/entrenamientos/page.tsx]
- `/app/entrenamientos/:workoutId` (User)  [src/app/(app)/app/entrenamientos/[workoutId]/page.tsx]
- `/app/entrenamientos/:workoutId/start` (User)  [src/app/(app)/app/entrenamientos/[workoutId]/start/page.tsx]
- `/app/feed` (User)  [src/app/(app)/app/feed/page.tsx]
- `/app/gym` (User)  [src/app/(app)/app/gym/page.tsx]
- `/app/gym/admin` (User)  [src/app/(app)/app/gym/admin/page.tsx]
- `/app/hoy` (User)  [src/app/(app)/app/hoy/page.tsx]
- `/app/macros` (User)  [src/app/(app)/app/macros/page.tsx]
- `/app/nutricion` (User)  [src/app/(app)/app/nutricion/page.tsx]
- `/app/nutricion/editar` (User)  [src/app/(app)/app/nutricion/editar/page.tsx]
- `/app/onboarding` (User)  [src/app/(app)/app/onboarding/page.tsx]
- `/app/profile` (User)  [src/app/(app)/app/profile/page.tsx]
- `/app/profile/legacy` (User)  [src/app/(app)/app/profile/legacy/page.tsx]
- `/app/seguimiento` (User)  [src/app/(app)/app/seguimiento/page.tsx]
- `/app/settings` (User)  [src/app/(app)/app/settings/page.tsx]
- `/app/settings/billing` (User)  [src/app/(app)/app/settings/billing/page.tsx]
- `/app/trainer` (Trainer)  [src/app/(app)/app/(trainer)/trainer/page.tsx]
- `/app/trainer/client/:id` (Trainer)  [src/app/(app)/app/(trainer)/trainer/client/[id]/page.tsx]
- `/app/trainer/clients` (Trainer)  [src/app/(app)/app/(trainer)/trainer/clients/page.tsx]
- `/app/trainer/clients/:id` (Trainer)  [src/app/(app)/app/(trainer)/trainer/clients/[id]/page.tsx]
- `/app/trainer/exercises` (Trainer)  [src/app/(app)/app/(trainer)/trainer/exercises/page.tsx]
- `/app/trainer/exercises/new` (Trainer)  [src/app/(app)/app/(trainer)/trainer/exercises/new/page.tsx]
- `/app/trainer/plans` (Trainer)  [src/app/(app)/app/(trainer)/trainer/plans/page.tsx]
- `/app/trainer/plans/:id` (Trainer)  [src/app/(app)/app/(trainer)/trainer/plans/[id]/page.tsx]
- `/app/trainer/requests` (Trainer)  [src/app/(app)/app/(trainer)/trainer/requests/page.tsx]
- `/app/treinador` (Trainer)  [src/app/(app)/app/(trainer)/treinador/page.tsx]
- `/app/treinador/:slug` (Trainer)  [src/app/(app)/app/(trainer)/treinador/[...slug]/page.tsx]
- `/app/weekly-review` (User)  [src/app/(app)/app/weekly-review/page.tsx]
- `/app/workouts` (User)  [src/app/(app)/app/workouts/page.tsx]
- `/design-system` (Public)  [src/app/(auth)/design-system/page.tsx]
- `/login` (Auth)  [src/app/(auth)/login/page.tsx]
- `/pricing` (Public)  [src/app/(marketing)/pricing/page.tsx]
- `/register` (Auth)  [src/app/(auth)/register/page.tsx]
- `/verify-email` (Auth)  [src/app/(auth)/verify-email/page.tsx]

## 8.2 Feature flags / toggles observados

Backend (`back/src/config.ts`): `OPENAI_API_KEY`, `STRIPE_*`, `EMAIL_PROVIDER`, `AI_DAILY_LIMIT_*`, `PRO_MONTHLY_TOKENS`, `BOOTSTRAP_ADMIN_EMAILS`, etc.

Frontend: `BACKEND_URL` o `NEXT_PUBLIC_BACKEND_URL` (`front/src/lib/backend.ts`).

## 8.3 Mapa completo BFF endpoints

| BFF /api/* | Métodos | Backend target (best-effort) | Estado | Notas | Archivo |
| --- | --- | --- | --- | --- | --- |
| /api/admin/gym-join-requests | GET | /admin/gym-join-requests | OK |  | src/app/api/admin/gym-join-requests/route.ts |
| /api/admin/gym-join-requests/:membershipId/:action | POST | /admin/gym-join-requests/${normalizedMembershipId}/${normalizedAction} | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/[action]/route.ts |
| /api/admin/gym-join-requests/:membershipId/accept | POST | /admin/gym-join-requests/${membershipId}/accept | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/accept/route.ts |
| /api/admin/gym-join-requests/:membershipId/reject | POST | /admin/gym-join-requests/${membershipId}/reject | Unknown |  | src/app/api/admin/gym-join-requests/[membershipId]/reject/route.ts |
| /api/admin/gyms | GET,POST | /admin/gyms | OK |  | src/app/api/admin/gyms/route.ts |
| /api/admin/gyms/:gymId | DELETE | /admin/gyms/${gymId} | Unknown |  | src/app/api/admin/gyms/[gymId]/route.ts |
| /api/admin/gyms/:gymId/members | GET | /admin/gyms/${gymId}/members | Unknown |  | src/app/api/admin/gyms/[gymId]/members/route.ts |
| /api/admin/gyms/:gymId/members/:userId/assign-training-plan | POST | /admin/gyms/${gymId}/members/${userId}/assign-training-plan | Unknown |  | src/app/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan/route.ts |
| /api/admin/gyms/:gymId/members/:userId/role | PATCH | /admin/gyms/${gymId}/members/${userId}/role | Unknown |  | src/app/api/admin/gyms/[gymId]/members/[userId]/role/route.ts |
| /api/admin/users | GET,POST | /admin/users, /admin/users?${url.searchParams.toString()} | OK |  | src/app/api/admin/users/route.ts |
| /api/admin/users/:id | DELETE | /admin/users/${id} | Unknown |  | src/app/api/admin/users/[id]/route.ts |
| /api/admin/users/:id/block | PATCH | /admin/users/${id}/block | Unknown |  | src/app/api/admin/users/[id]/block/route.ts |
| /api/admin/users/:id/gym-role | GET,POST | /admin/users/${id}/gym-role | Mismatch | BFF targets /admin/users/:id/gym-role but backend implements POST /admin/users/:userId/assign-gym-role (no GET). | src/app/api/admin/users/[id]/gym-role/route.ts |
| /api/admin/users/:id/reset-password | POST | /admin/users/${id}/reset-password | Unknown |  | src/app/api/admin/users/[id]/reset-password/route.ts |
| /api/admin/users/:id/unblock | PATCH | /admin/users/${id}/unblock | Unknown |  | src/app/api/admin/users/[id]/unblock/route.ts |
| /api/admin/users/:id/verify-email | POST | /admin/users/${id}/verify-email | Unknown |  | src/app/api/admin/users/[id]/verify-email/route.ts |
| /api/ai/daily-tip | POST | /ai/daily-tip | OK |  | src/app/api/ai/daily-tip/route.ts |
| /api/ai/nutrition-plan | POST | /ai/nutrition-plan | OK |  | src/app/api/ai/nutrition-plan/route.ts |
| /api/ai/nutrition-plan/generate | POST | /ai/nutrition-plan/generate | OK |  | src/app/api/ai/nutrition-plan/generate/route.ts |
| /api/ai/training-plan | POST | /ai/training-plan | OK |  | src/app/api/ai/training-plan/route.ts |
| /api/ai/training-plan/generate | POST | /ai/training-plan/generate | OK |  | src/app/api/ai/training-plan/generate/route.ts |
| /api/auth/change-password | POST | /auth/change-password | OK |  | src/app/api/auth/change-password/route.ts |
| /api/auth/google/callback | GET | /auth/google/callback | OK |  | src/app/api/auth/google/callback/route.ts |
| /api/auth/google/start | GET | /auth/google/start | OK |  | src/app/api/auth/google/start/route.ts |
| /api/auth/me | GET | /auth/me | OK |  | src/app/api/auth/me/route.ts |
| /api/auth/resend-verification | POST | /auth/resend-verification | OK |  | src/app/api/auth/resend-verification/route.ts |
| /api/auth/verify-email | GET | /auth/verify-email?token=${encodeURIComponent(token ?? "")} | Unknown |  | src/app/api/auth/verify-email/route.ts |
| /api/billing/checkout | POST | /billing/checkout | OK |  | src/app/api/billing/checkout/route.ts |
| /api/billing/plans | GET | /billing/plans | OK |  | src/app/api/billing/plans/route.ts |
| /api/billing/portal | POST | /billing/portal | OK |  | src/app/api/billing/portal/route.ts |
| /api/billing/status | GET | /billing/status?${url.searchParams.toString()} | Unknown |  | src/app/api/billing/status/route.ts |
| /api/exercises | GET,POST | /exercises, /exercises?${url.searchParams.toString()} | OK |  | src/app/api/exercises/route.ts |
| /api/exercises/:id | GET | /exercises/${id} | Unknown |  | src/app/api/exercises/[id]/route.ts |
| /api/gym/admin/members/:userId/role | PATCH | /gym/admin/members/${userId}/role | Unknown |  | src/app/api/gym/admin/members/[userId]/role/route.ts |
| /api/gym/join-code | POST | /gym/join-code | OK |  | src/app/api/gym/join-code/route.ts |
| /api/gym/join-request | POST | /gym/join-request, /gyms/join | OK |  | src/app/api/gym/join-request/route.ts |
| /api/gym/me | DELETE,GET | /gym/me, /gyms/membership | OK |  | src/app/api/gym/me/route.ts |
| /api/gyms | GET |  | OK |  | src/app/api/gyms/route.ts |
| /api/gyms/join | POST | /gyms/join | OK |  | src/app/api/gyms/join/route.ts |
| /api/gyms/join-by-code | POST | /gyms/join-by-code | OK |  | src/app/api/gyms/join-by-code/route.ts |
| /api/gyms/membership | DELETE,GET | /gyms/membership | OK |  | src/app/api/gyms/membership/route.ts |
| /api/nutrition-plans | GET | /nutrition-plans?${url.searchParams.toString()} | Unknown |  | src/app/api/nutrition-plans/route.ts |
| /api/nutrition-plans/:id | GET | /nutrition-plans/${id} | Unknown |  | src/app/api/nutrition-plans/[id]/route.ts |
| /api/profile | GET,PUT | /profile | OK |  | src/app/api/profile/route.ts |
| /api/recipes | GET | /recipes?${url.searchParams.toString()} | Unknown |  | src/app/api/recipes/route.ts |
| /api/recipes/:id | GET | /recipes/${id} | Unknown |  | src/app/api/recipes/[id]/route.ts |
| /api/review/weekly | GET |  | OK |  | src/app/api/review/weekly/route.ts |
| /api/tracking | GET,POST,PUT | /tracking | OK |  | src/app/api/tracking/route.ts |
| /api/tracking/:collection/:id | DELETE | /tracking/${collection}/${id} | Unknown |  | src/app/api/tracking/[collection]/[id]/route.ts |
| /api/trainer/assign-training-plan | POST |  | Unknown |  | src/app/api/trainer/assign-training-plan/route.ts |
| /api/trainer/capabilities | GET |  | Local |  | src/app/api/trainer/capabilities/route.ts |
| /api/trainer/clients | GET | /trainer/clients | OK |  | src/app/api/trainer/clients/route.ts |
| /api/trainer/clients/:id | DELETE,GET | /trainer/clients/${id} | Unknown |  | src/app/api/trainer/clients/[id]/route.ts |
| /api/trainer/clients/:id/assigned-plan | DELETE,GET,POST | /trainer/clients/${id}/assigned-plan | Unknown |  | src/app/api/trainer/clients/[id]/assigned-plan/route.ts |
| /api/trainer/clients/:id/notes | GET,OPTIONS,POST |  | Local |  | src/app/api/trainer/clients/[id]/notes/route.ts |
| /api/trainer/clients/:id/plan |  |  | OK |  | src/app/api/trainer/clients/[id]/plan/route.ts |
| /api/trainer/join-requests | GET | /admin/gym-join-requests | OK |  | src/app/api/trainer/join-requests/route.ts |
| /api/trainer/join-requests/:membershipId/:action | POST | /admin/gym-join-requests/${normalizedMembershipId}/${normalizedAction} | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/[action]/route.ts |
| /api/trainer/join-requests/:membershipId/accept | POST | /admin/gym-join-requests/${membershipId}/accept | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/accept/route.ts |
| /api/trainer/join-requests/:membershipId/reject | POST | /admin/gym-join-requests/${membershipId}/reject | Unknown |  | src/app/api/trainer/join-requests/[membershipId]/reject/route.ts |
| /api/trainer/members | GET | /admin/gyms/${gymId}/members, /gyms/membership | OK |  | src/app/api/trainer/members/route.ts |
| /api/trainer/members/:id/assigned-plan |  |  | OK |  | src/app/api/trainer/members/[id]/assigned-plan/route.ts |
| /api/trainer/members/:id/training-plan-assignment | DELETE,OPTIONS,POST | /trainer/members/${id}/training-plan-assignment | Unknown |  | src/app/api/trainer/members/[id]/training-plan-assignment/route.ts |
| /api/trainer/plans | GET,POST | /trainer/plans | OK |  | src/app/api/trainer/plans/route.ts |
| /api/trainer/plans/:id | DELETE,GET,OPTIONS,PATCH,PUT | /trainer/plans/${id} | Unknown |  | src/app/api/trainer/plans/[id]/route.ts |
| /api/trainer/plans/:id/days/:dayId | DELETE,OPTIONS | /trainer/plans/${id}/days/${dayId} | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises | OPTIONS,POST | /trainer/plans/${id}/days/${dayId}/exercises | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises/:exerciseId | DELETE,OPTIONS,PATCH | /trainer/plans/${id}/days/${dayId}/exercises/${exerciseId} | Unknown |  | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]/route.ts |
| /api/training-plans | GET,POST | /training-plans | OK |  | src/app/api/training-plans/route.ts |
| /api/training-plans/:id | GET | /training-plans/${id} | Unknown |  | src/app/api/training-plans/[id]/route.ts |
| /api/training-plans/:id/days/:dayId/exercises | POST | /training-plans/${id}/days/${dayId}/exercises | Unknown |  | src/app/api/training-plans/[id]/days/[dayId]/exercises/route.ts |
| /api/training-plans/active | GET,POST |  | Partial |  | src/app/api/training-plans/active/route.ts |
| /api/workouts | GET,POST | /workouts | OK |  | src/app/api/workouts/route.ts |
| /api/workouts/:id | DELETE,GET,PATCH | /workouts/${id} | Unknown |  | src/app/api/workouts/[id]/route.ts |
| /api/workouts/:id/start | POST | /workouts/${id}/start | Unknown |  | src/app/api/workouts/[id]/start/route.ts |


## 8.4 Nota de seguridad

Se detecta archivo `.env` en el zip backend. No se incluyen valores en este documento. Recomendación: rotar claves si este archivo estuvo expuesto fuera del entorno controlado.
