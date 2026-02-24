# Auditoría FitSculpt (2026-02-24)

- **Autor/a auditoría:** AI Audit Team (GPT-5.2)
- **Solicitado por:** Founder/PM (FitSculpt)
- **Modo:** Solo lectura sobre zips
- **Front zip SHA-256:** `c0e43b2b3c910d5543ff669b394dbcf361583fac06dbd668eb4c54a70330e4c1`
- **Back zip SHA-256:** `6f83310d44d8b1d7f91d9b051a8a8377fc96b31199939dc65306695ad24cb18a`

> Nota de evidencia: esta auditoría es estática (código). Build, lint, typecheck, tests y flujos E2E están marcados como **No Ejecutado** salvo que exista evidencia explícita en los zips.

## 1) Executive Summary

- **Estado general (Release-ready B2C): NO**. Falta evidencia de build y flujos E2E validados, y hay riesgos de contratos y gating.

- **Estado MVP Modular (Nutrición vs Fitness): NO**. Backend distingue planes `NUTRI_AI` y `STRENGTH_AI`, pero UI colapsa a tier `PRO` y la matriz comercial solicitada no está modelada end-to-end.

- **Estado Gym Pilot (pequeño gym): PARCIAL**. Hay modelos y endpoints de gym, admin y membership, pero requiere hardening de flujos, seed y QA de consola.

### Top 5 riesgos
- Contratos FE↔BE con endpoints BFF que no existen en backend (admin tokens/plan).
- Doble árbol de rutas trainer en ES/PT (`/app/trainer/*` y `/app/treinador/*`) aumenta coste de QA y riesgo de regresión.
- Entitlements: UI colapsa `NUTRI_AI` y `STRENGTH_AI` dentro de tier `PRO`, riesgo de gating incorrecto para MVP modular.
- IA: rutas existen pero robustez depende de data en BD (catálogo ejercicios) y de validación de output (hay validadores, pero sin evidencia E2E).
- Release readiness sin gate automático (en zips no hay evidencia de CI que bloquee merge por TS/lint/tests).

### Top 5 quick wins
- Eliminar o redirigir el árbol duplicado `/app/treinador/*` o hacerlo alias real hacia `/app/trainer/*` con una sola fuente.
- Alinear entitlements UI con planes reales del backend y exponer tiers modulares (Nutrition vs Strength) sin colapsar a `PRO`.
- Resolver mismatches admin: eliminar BFF routes `tokens*` y `plan` si backend no los soporta, o implementar endpoints en backend con contratos.
- Seed demo determinista (ya existe `apps/api` scripts `demo:reset`, `db:seed:safe`, `db:import:free-exercise-db`) y documentar runbook.
- Definir checklist DoD mínimo por PR y script local `npm run build && npm run typecheck && npm test` en FE y `npm run build && npm run test` en BE.

## 2) Inventario de Producto, qué existe hoy

### 2.1 Mapa de navegación (rutas)

**Marketing**
- `/` ((marketing)/page.tsx)

**Auth**
- `/design-system` ((auth)/design-system/page.tsx)
- `/login` ((auth)/login/page.tsx)
- `/register` ((auth)/register/page.tsx)
- `/verify-email` ((auth)/verify-email/page.tsx)

**App (usuario final)** (31 rutas)
- `/app` ((app)/app/page.tsx)
- `/app/biblioteca` ((app)/app/biblioteca/page.tsx)
- `/app/biblioteca/[exerciseId]` ((app)/app/biblioteca/[exerciseId]/page.tsx)
- `/app/dashboard` ((app)/app/dashboard/page.tsx)
- `/app/dietas` ((app)/app/dietas/page.tsx)
- `/app/dietas/[planId]` ((app)/app/dietas/[planId]/page.tsx)
- `/app/entrenamiento` ((app)/app/entrenamiento/page.tsx)
- `/app/nutricion` ((app)/app/nutricion/page.tsx)
- `/app/seguimiento` ((app)/app/seguimiento/page.tsx)

**Admin**
- `/app/admin` ((app)/app/(admin)/admin/page.tsx)
- `/app/admin/gym-requests` ((app)/app/(admin)/admin/gym-requests/page.tsx)
- `/app/admin/gyms` ((app)/app/(admin)/admin/gyms/page.tsx)
- `/app/admin/labs` ((app)/app/(admin)/admin/labs/page.tsx)
- `/app/admin/preview` ((app)/app/(admin)/admin/preview/page.tsx)
- `/app/admin/users` ((app)/app/(admin)/admin/users/page.tsx)

**Trainer** (duplicado ES/PT)
- `/app/trainer` ((app)/app/(trainer)/trainer/page.tsx)
- `/app/trainer/client/[id]` ((app)/app/(trainer)/trainer/client/[id]/page.tsx)
- `/app/trainer/clients` ((app)/app/(trainer)/trainer/clients/page.tsx)
- `/app/trainer/clients/[id]` ((app)/app/(trainer)/trainer/clients/[id]/page.tsx)
- `/app/trainer/exercises` ((app)/app/(trainer)/trainer/exercises/page.tsx)
- `/app/trainer/exercises/new` ((app)/app/(trainer)/trainer/exercises/new/page.tsx)
- `/app/trainer/plans` ((app)/app/(trainer)/trainer/plans/page.tsx)
- `/app/trainer/plans/[id]` ((app)/app/(trainer)/trainer/plans/[id]/page.tsx)
- `/app/trainer/requests` ((app)/app/(trainer)/trainer/requests/page.tsx)
- `/app/treinador` ((app)/app/(trainer)/treinador/page.tsx)
- ... (ver Anexos para lista completa)

**Evidencia de protección de rutas y roles**
- `apps/web/src/middleware.ts` protege `/app` y aplica gating por roles para `/app/admin` y `/app/trainer|/app/treinador`.
- Cookie de sesión: `fs_token` (BFF y backend).
- Shell: `apps/web/src/components/layout/AppShellLayout.tsx` incluye `MobileTabBar`.

### 2.2 Flujos end-to-end (journeys) (desde código)

**Login + acceso a /app protegido**
  - Ir a `/login`.
  - Acción server `src/app/(auth)/login/actions.ts` hace `fetch(${getBackendUrl()}/auth/login)` y guarda `set-cookie` en `fs_token`.
  - Tras login, navegar a `/app` pasa middleware (si `fs_token` existe).
  - Resultado esperado: render `AppShellLayout` con tab bar y sidebar.
  - No Ejecutado: flujo manual real. Evidencia solo por código.
**Hoy + 1 acción rápida**
  - Entrar a `/app` (home).
  - Home delega en componentes bajo `src/app/(app)/app/*` (acción rápida visible desde DashboardClient/Hoy según implementación).
  - Resultado esperado: al menos una acción accionable (ej. registrar comida, check-in, abrir entrenamiento).
  - Assunção parcial: 'Hoy' como core loop depende del contenido del componente actual.
**Biblioteca: lista → detalle**
  - Ir a `/app/biblioteca`.
  - Seleccionar un ejercicio, navega a `/app/biblioteca/[exerciseId]`.
  - Backend expone `GET /exercises` y `GET /exercises/:id` (src/index.ts).
  - Resultado esperado: lista paginada/filtrable (si existe), y detalle con media.
  - Evidencia: endpoints backend + rutas FE. No Ejecutado E2E.
**Tracking: crear 1 registro y confirmar persistencia**
  - Ir a `/app/seguimiento`.
  - Cliente `TrackingClient.tsx` usa servicios de perfil y tracking (incluye `saveCheckinAndSyncProfileMetrics`).
  - BFF `src/app/api/tracking/route.ts` proxy a backend `/tracking` con cookie `fs_token`.
  - Backend expone `GET/PUT/POST /tracking` y `DELETE /tracking/:collection/:id`.
  - No Ejecutado: persistencia verificada manualmente.
**Food log: registrar ítems por gramos y ver macros/calorías**
  - Dashboard/Tracking usa `FoodEntry` con `grams` (ver `src/app/(app)/app/DashboardClient.tsx`).
  - Macros se calculan con `defaultFoodProfiles` y/o `user-foods` (endpoint `GET/POST/PUT/DELETE /user-foods`).
  - BFF `src/app/api/user-foods/*` proxy a backend `/user-foods*`.
  - Resultado esperado: añadir ítem, guardar, y ver totales (proteína, carbs, grasa, calorías).
  - Assunção: la UI exacta de 'registrar' depende de componentes internos, pero cálculo por gramos está implementado en código.
**Onboarding (si existe)**
  - No se identificó un flujo dedicado de onboarding con rutas propias en `src/app` (solo `register`, `verify-email`, y `profile`).
  - Evidencia: inventario de rutas.
**Dashboard semanal (si existe)**
  - Existe endpoint backend `src/routes/weeklyReview.ts` y contrato de test `src/tests/weeklyReview.contract.test.ts` (backend).
  - En frontend existe `/app/dashboard` (page) y `DashboardClient.tsx`.
  - Assunção: el dashboard semanal completo no se puede confirmar sin ejecución.
**IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)**
  - BFF: `/api/ai/nutrition-plan` y `/api/ai/nutrition-plan/generate` proxyean a backend `/ai/nutrition-plan` y `/ai/nutrition-plan/generate`.
  - Backend: `POST /ai/nutrition-plan` y `POST /ai/nutrition-plan/generate` existen en `src/index.ts` (además de `validateNutritionMath` y normalizadores).
  - Persistencia: modelos Prisma `NutritionPlan`, `NutritionDay`, `NutritionMeal`, `NutritionIngredient`.
  - No Ejecutado: generación real, reintentos, y persistencia verificada.
**IA Fitness: generar plan + ajuste semanal (si existe)**
  - BFF: `/api/ai/training-plan` y `/api/ai/training-plan/generate` proxyean a backend `/ai/training-plan*`.
  - Backend: `POST /ai/training-plan` y `POST /ai/training-plan/generate` existen; hay validación de ejercicio IDs (`trainingPlanExerciseIds.contract.test.ts`) y fallback (`trainingPlanFallback.contract.test.ts`).
  - Persistencia: modelos Prisma `TrainingPlan`, `TrainingDay`, `TrainingExercise`.
  - No Ejecutado: generación real en entorno con BD poblada.
**Gym Pilot: join + admin gestiona + asigna plan (si existe)**
  - Backend: modelos `Gym`, `GymMembership` y enums `GymMembershipStatus`, `GymRole`.
  - Backend endpoints: `/gyms/join`, `/gyms/membership`, `/gym/me`, `/admin/gyms*`, `/admin/gym-join-requests*` (ver `src/index.ts`).
  - Frontend: rutas admin `/app/admin/gyms`, `/app/admin/gym-requests`; rutas trainer `/app/trainer/*` (y duplicado `/app/treinador/*`).
  - Resultado esperado: usuario envía join request, admin acepta, membership pasa a ACTIVE, asignación de plan a miembro (BFF `assign-training-plan`).
  - No Ejecutado: flujo completo cronometrado sin errores de consola.

### 2.3 Matriz de entitlements (estado real)

- Backend: `apps/api/src/entitlements.ts` (planes `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`).

- Frontend: `apps/web/src/lib/entitlements.ts` (tier UI `FREE | PRO | GYM`, features por `modules.*`).


| Feature | Free | Nutrición Premium | Fitness Premium | Bundle | Gym |
|---|---:|---:|---:|---:|---:|

| Navegación app base | Implementado | Implementado | Implementado | Implementado | Implementado |

| Food log (grams + macros) | Implementado | Implementado | Implementado | Implementado | Implementado |

| IA Nutrición | Gated | Implementado | Assunção | Implementado | Assunção |

| IA Fitness | Gated | Assunção | Implementado | Implementado | Assunção |

| Packaging modular en UI | **FAIL** | FAIL | FAIL | Parcial | FAIL |

| Gym membership | Assunção | Assunção | Assunção | Assunção | Implementado |


Gap: la matriz comercial solicitada no está cerrada como contrato end-to-end.

## 3) Auditoría UX (mobile-first)

- Tab bar mobile y sidebar centralizados.
- Estados loading/error/empty existen, pero no se puede certificar cobertura sin ejecución.
- Duplicación trainer ES/PT es la principal fuente de fricción estructural.

### 10 fricciones concretas
| ID | Fricción |
|---|---|
| UX-01 | Duplicación trainer ES/PT. Unificar árbol de rutas y redirects. |
| UX-02 | Entitlements no comunican claramente qué desbloquea cada plan. Añadir upgrade paths por feature. |
| UX-03 | Shell layout renderiza sidebar + tab bar siempre. Condicionar por `shell` si admin/trainer requieren layouts distintos. |
| UX-04 | Estados empty/error no garantizados en páginas core. Crear `PageState` reusable. |
| UX-05 | Food profiles defaults + user-foods sin señalización. Indicar origen y evitar duplicados. |
| UX-06 | Rutas de recetas existen sin evidencia de datos. Ocultar en nav si no hay contenido. |
| UX-07 | Solape `Dietas` vs `Nutrición`. Consolidar IA plan + diario en una experiencia única. |
| UX-08 | Admin panel sin marca clara. Añadir breadcrumbs/badge 'Admin'. |
| UX-09 | `debug` AI en respuestas. Separar dev/prod y sanitizar. |
| UX-10 | No evidencia de DoD '0 errores consola'. Checklist obligatorio antes de demo. |

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real
- FE: Next.js App Router + BFF `/api/*`.
- BE: Fastify + Prisma, endpoints en `apps/api/src/index.ts`.
- Contratos sensibles: `fs_token`, `/auth/me`, `/tracking`, `/exercises`, `/ai/*`, `/gyms/*`.

### 4.2 Contratos FE↔BE (subset)
| BFF `/api/*` | Backend esperado | Método | Estado |
|---|---|---:|---|

| `/api/auth/me` | `/auth/me` | GET | OK |
| `/api/tracking` | `/tracking` | GET/POST/PUT | OK |
| `/api/user-foods` | `/user-foods` | GET/POST | OK |
| `/api/user-foods/[id]` | `/user-foods/:id` | PUT/DELETE | OK |
| `/api/ai/training-plan/generate` | `/ai/training-plan/generate` | POST | OK |
| `/api/ai/nutrition-plan/generate` | `/ai/nutrition-plan/generate` | POST | OK |
| `/api/admin/gyms` | `/admin/gyms` | GET/POST | OK |
| `/api/admin/gym-join-requests` | `/admin/gym-join-requests` | GET | OK |

| `/api/admin/users/[id]/plan` | `/admin/users/:id/plan` | (varios) | **MISSING** |

| `/api/admin/users/[id]/tokens` | `/admin/users/:id/tokens` | (varios) | **MISSING** |

| `/api/admin/users/[id]/tokens-allowance` | `/admin/users/:id/tokens-allowance` | (varios) | **MISSING** |

| `/api/admin/users/[id]/tokens/add` | `/admin/users/:id/tokens/add` | (varios) | **MISSING** |

| `/api/admin/users/[id]/tokens/balance` | `/admin/users/:id/tokens/balance` | (varios) | **MISSING** |



### 4.3 IA
- Endpoints AI en backend: `/ai/training-plan*`, `/ai/nutrition-plan*`, `/ai/quota`, `/ai/daily-tip`.
- Validación: Zod + parsing JSON dedicado.
- Riesgo: `debug` y logs con payload.

## 5) Calidad y Release Readiness

| Área | Estado | Evidencia |
|---|---|---|

| FE build/lint/typecheck/test/e2e | No Ejecutado | scripts en `apps/web/package.json`. |

| BE build/test | No Ejecutado | scripts en `apps/api/package.json`. |


Entorno Node: **Assunção** (no hay engines).

## 6) Hallazgos priorizados
| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|

| F-001 | P0 | Contratos | BFF expone admin endpoints `tokens*` y `plan` pero backend no los implementa | Pantallas admin pueden fallar | BFF `apps/web/src/app/api/admin/users/[id]/*`, BE endpoints ausentes en `apps/api/src/index.ts` | Eliminar rutas BFF o implementar endpoints BE | Backend+Frontend | M |
| F-002 | P0 | MVP Modular | UI colapsa `NUTRI_AI` y `STRENGTH_AI` dentro de tier `PRO` | Paywall/packaging incorrecto | `apps/web/src/lib/entitlements.ts` normalizeTier() | Modelar tiers UI reales y gating por `modules.*` | Frontend+Producto | M |
| F-003 | P1 | Arquitectura FE | Doble árbol de rutas trainer (`/app/trainer/*` y `/app/treinador/*`) | Duplicación QA y bugs | Inventario rutas en `apps/web/src/app` | Unificar y redirigir | Frontend | M |
| F-004 | P1 | Release | Sin evidencia de CI gate en zips | Regresiones TS/build | Scripts existen en package.json | Añadir CI obligatorio | DevOps | M |
| F-005 | P1 | Gym Pilot | Seed demo no documentado, BD vacía rompe IA y biblioteca | Demo frágil | Scripts BE: `demo:reset`, `db:import:free-exercise-db` | Runbook + seed determinista | Backend+PM | S |

## 7) Próximos pasos (3 sprints)

### Sprint 1: Estabilidad + contratos
- Cerrar mismatches admin (eliminar o implementar).
- Unificar rutas trainer.
- Gate CI: build+typecheck+tests FE/BE.

### Sprint 2: Seed demo + Gym Pilot
- Runbook 1-click con scripts existentes.
- Validar flujo join, accept, assign plan sin errores consola.

### Sprint 3: MVP modular comercial
- Modelar tiers UI reales y gating backend-driven.
- Ocultar secciones sin contenido, pulir copy, telemetría básica.

## 8) Anexos

### 8.1 Rutas (páginas)
```text
/
/app
/app/admin
/app/admin/gym-requests
/app/admin/gyms
/app/admin/labs
/app/admin/preview
/app/admin/users
/app/biblioteca
/app/biblioteca/[exerciseId]
/app/biblioteca/entrenamientos
/app/biblioteca/entrenamientos/[planId]
/app/biblioteca/recetas
/app/biblioteca/recetas/[recipeId]
/app/dashboard
/app/dietas
/app/dietas/[planId]
/app/entrenamiento
/app/entrenamiento/[workoutId]
/app/entrenamiento/editar
/app/entrenamientos
/app/entrenamientos/[workoutId]
/app/entrenamientos/[workoutId]/start
/app/feed
/app/gym
/app/gym/admin
/app/hoy
/app/macros
/app/nutricion
/app/nutricion/editar
/app/onboarding
/app/profile
/app/profile/legacy
/app/seguimiento
/app/settings
/app/settings/billing
/app/trainer
/app/trainer/client/[id]
/app/trainer/clients
/app/trainer/clients/[id]
/app/trainer/exercises
/app/trainer/exercises/new
/app/trainer/plans
/app/trainer/plans/[id]
/app/trainer/requests
/app/treinador
/app/treinador/[...slug]
/app/treinador/clientes
/app/treinador/clientes/[id]
/app/treinador/exercicios
/app/treinador/exercicios/novo
/app/weekly-review
/app/workouts
/design-system
/login
/register
/verify-email
```

### 8.2 Endpoints backend
```text
GET /admin/gym-join-requests  (src/index.ts)
POST /admin/gym-join-requests/:membershipId/accept  (src/index.ts)
POST /admin/gym-join-requests/:membershipId/reject  (src/index.ts)
GET /admin/gyms  (src/index.ts)
POST /admin/gyms  (src/index.ts)
DELETE /admin/gyms/:gymId  (src/index.ts)
GET /admin/gyms/:gymId/members  (src/index.ts)
POST /admin/gyms/:gymId/members/:userId/assign-training-plan  (src/index.ts)
PATCH /admin/gyms/:gymId/members/:userId/role  (src/index.ts)
GET /admin/users  (src/index.ts)
POST /admin/users  (src/index.ts)
DELETE /admin/users/:id  (src/index.ts)
PATCH /admin/users/:id/block  (src/index.ts)
POST /admin/users/:id/reset-password  (src/index.ts)
PATCH /admin/users/:id/unblock  (src/index.ts)
POST /admin/users/:id/verify-email  (src/index.ts)
POST /ai/daily-tip  (src/index.ts)
POST /ai/nutrition-plan  (src/index.ts)
POST /ai/nutrition-plan/generate  (src/index.ts)
GET /ai/quota  (src/index.ts)
POST /ai/training-plan  (src/index.ts)
POST /ai/training-plan/generate  (src/index.ts)
POST /auth/change-password  (src/index.ts)
GET /auth/google/callback  (src/index.ts)
GET /auth/google/start  (src/index.ts)
POST /auth/login  (src/index.ts)
POST /auth/logout  (src/index.ts)
GET /auth/me  (src/index.ts)
POST /auth/register  (src/index.ts)
POST /auth/resend-verification  (src/index.ts)
POST /auth/signup  (src/index.ts)
GET /auth/verify-email  (src/index.ts)
POST /billing/admin/reset-customer-link  (src/index.ts)
POST /billing/checkout  (src/index.ts)
GET /billing/plans  (src/index.ts)
POST /billing/portal  (src/index.ts)
GET /billing/status  (src/index.ts)
POST /billing/stripe/webhook  (src/index.ts)
POST /dev/reset-demo  (src/index.ts)
POST /dev/seed-exercises  (src/index.ts)
POST /dev/seed-recipes  (src/index.ts)
GET /exercises  (src/index.ts)
POST /exercises  (src/index.ts)
GET /exercises/:id  (src/index.ts)
GET /feed  (src/index.ts)
POST /feed/generate  (src/index.ts)
PATCH /gym/admin/members/:userId/role  (src/index.ts)
POST /gym/join-code  (src/index.ts)
POST /gym/join-request  (src/index.ts)
DELETE /gym/me  (src/index.ts)
GET /gym/me  (src/index.ts)
GET /gyms  (src/index.ts)
POST /gyms/join  (src/index.ts)
POST /gyms/join-by-code  (src/index.ts)
DELETE /gyms/membership  (src/index.ts)
GET /gyms/membership  (src/index.ts)
GET /health  (src/index.ts)
GET /nutrition-plans  (src/index.ts)
GET /nutrition-plans/:id  (src/index.ts)
GET /profile  (src/index.ts)
PUT /profile  (src/index.ts)
GET /recipes  (src/index.ts)
GET /recipes/:id  (src/index.ts)
GET /review/weekly  (src/routes/weeklyReview.ts)
GET /tracking  (src/index.ts)
POST /tracking  (src/index.ts)
PUT /tracking  (src/index.ts)
DELETE /tracking/:collection/:id  (src/index.ts)
GET /trainer/clients  (src/index.ts)
DELETE /trainer/clients/:userId  (src/index.ts)
GET /trainer/clients/:userId  (src/index.ts)
DELETE /trainer/clients/:userId/assigned-plan  (src/index.ts)
GET /trainer/clients/:userId/assigned-plan  (src/index.ts)
POST /trainer/clients/:userId/assigned-plan  (src/index.ts)
GET /trainer/gym  (src/index.ts)
PATCH /trainer/gym  (src/index.ts)
DELETE /trainer/members/:id/training-plan-assignment  (src/index.ts)
POST /trainer/members/:id/training-plan-assignment  (src/index.ts)
GET /trainer/members/:userId/training-plan-assignment  (src/index.ts)
GET /trainer/plans  (src/index.ts)
POST /trainer/plans  (src/index.ts)
DELETE /trainer/plans/:planId  (src/index.ts)
GET /trainer/plans/:planId  (src/index.ts)
PATCH /trainer/plans/:planId  (src/index.ts)
DELETE /trainer/plans/:planId/days/:dayId  (src/index.ts)
POST /trainer/plans/:planId/days/:dayId/exercises  (src/index.ts)
DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId  (src/index.ts)
PATCH /trainer/plans/:planId/days/:dayId/exercises/:exerciseId  (src/index.ts)
GET /training-plans  (src/index.ts)
POST /training-plans  (src/index.ts)
GET /training-plans/:id  (src/index.ts)
POST /training-plans/:planId/days/:dayId/exercises  (src/index.ts)
GET /training-plans/active  (src/index.ts)
GET /user-foods  (src/index.ts)
POST /user-foods  (src/index.ts)
DELETE /user-foods/:id  (src/index.ts)
PUT /user-foods/:id  (src/index.ts)
PATCH /workout-sessions/:id  (src/index.ts)
POST /workout-sessions/:id/finish  (src/index.ts)
GET /workouts  (src/index.ts)
POST /workouts  (src/index.ts)
DELETE /workouts/:id  (src/index.ts)
GET /workouts/:id  (src/index.ts)
PATCH /workouts/:id  (src/index.ts)
POST /workouts/:id/start  (src/index.ts)
```

### 8.3 Secretos
- `.env` presente en backend zip. No se expone.
