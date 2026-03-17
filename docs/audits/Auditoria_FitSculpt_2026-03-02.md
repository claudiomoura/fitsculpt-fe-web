# Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)

Fecha: 2026-03-02  
Autor/a auditoría: GPT-5.2 (Senior Staff Architect)  
Solicitado por: Founder/PM (FitSculpt)  
Artefactos auditados (SHA-256):
- docs.zip: `4290585c6368a7a2f5213938e8fb1a9c06cd2511610ebe911571bb16fceed22c`
- front.zip: `d4135d1d6b004e7d1620120c197a38c51cdc32575f6d264e69a47442d55d4306`
- api.zip: `2edd968caff482457a5fb6392b95bfedc22c6d5ebe6e155b892d9555bed18009`

Contexto de auditoría:
- Auditado en modo solo lectura, a partir de los zips entregados.
- Cualquier afirmación sin evidencia directa en código se marca como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Release-ready (B2C): NO.** Hay 2 gaps P0 que rompen la premisa “backend source of truth”: Tracking y Core Loop escriben en un store en memoria en el BFF (`src/app/api/tracking/route.ts`), mientras el backend persiste tracking en DB (`src/index.ts`), lo que deja el producto inconsistente y no vendible.
- **MVP Modular: NO.** Hay doble fuente de verdad para planes: planes en `UserProfile.profile` (JSON) consumidos por `/app/entrenamiento` y `/app/nutricion`, y planes en tablas `TrainingPlan`/`NutritionPlan` consumidos por `/app/biblioteca/entrenamientos` y `/app/dietas`. Esto rompe coherencia de UX y complica módulos.
- **Gym Pilot: NO autónomo.** Backend soporta join y asignación, pero el flujo “trainer asigna plan de nutrición desde UI” está roto por drift FE/BFF/BE (UI llama endpoints inexistentes).
- **Top 5 riesgos**
  1) Tracking no durable (se pierde en reinicios y no funciona multi-dispositivo), además invalida métricas y Weekly Review.
  2) Flujo trainer de nutrición no operable desde UI, bloquea propuesta B2B a gimnasios.
  3) Google Login visible pero backend no implementa `/auth/google/*`, genera “dead end” en login.
  4) Doble sistema de planes (profile JSON vs tablas) crea inconsistencias de producto y técnica.
  5) Backend `src/index.ts` sigue siendo “god file” (≈350 KB), aumenta riesgo de regresiones.
- **Top 5 quick wins**
  1) Reemplazar `/api/tracking` (BFF) por proxy real a `/tracking` (backend), eliminar `Map` en memoria.
  2) Ajustar E2E `core-loop.spec.ts` para validar persistencia real (DB), no solo “reload”.
  3) Corregir UI trainer para asignación de nutrición usando endpoints existentes (y ocultar el resto hasta que BE lo soporte).
  4) Ocultar Google Login (botón) hasta que BE implemente OAuth o haya flag explícito.
  5) Unificar UX de planes: una sola “fuente” y una sola pantalla por dominio (Training y Nutrition).

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

Rutas core más relevantes:

| Ruta | Audiencia | Evidencia (archivo) |
|---|---|---|
| /login | Auth/Marketing | src/app/(auth)/login/page.tsx |
| /register | Auth/Marketing | src/app/(auth)/register/page.tsx |
| /verify-email | Auth/Marketing | src/app/(auth)/verify-email/page.tsx |
| /app | User | src/app/(app)/app/page.tsx |
| /app/hoy | User | src/app/(app)/app/hoy/page.tsx |
| /app/entrenamiento | User | src/app/(app)/app/entrenamiento/page.tsx |
| /app/biblioteca | User | src/app/(app)/app/biblioteca/page.tsx |
| /app/seguimiento | User | src/app/(app)/app/seguimiento/page.tsx |
| /app/nutricion | User | src/app/(app)/app/nutricion/page.tsx |
| /app/dietas | User | src/app/(app)/app/dietas/page.tsx |
| /app/weekly-review | User | src/app/(app)/app/weekly-review/page.tsx |
| /app/gym | User | src/app/(app)/app/gym/page.tsx |
| /app/settings | User | src/app/(app)/app/settings/page.tsx |
| /app/trainer | Trainer | src/app/(app)/app/(trainer)/trainer/page.tsx |
| /app/trainer/clients | Trainer | src/app/(app)/app/(trainer)/trainer/clients/page.tsx |
| /app/trainer/plans | Trainer | src/app/(app)/app/(trainer)/trainer/plans/page.tsx |
| /app/trainer/nutrition-plans | Trainer | src/app/(app)/app/(trainer)/trainer/nutrition-plans/page.tsx |
| /app/admin | Admin | src/app/(app)/app/(admin)/admin/page.tsx |
| /app/admin/users | Admin | src/app/(app)/app/(admin)/admin/users/page.tsx |
| /app/admin/gyms | Admin | src/app/(app)/app/(admin)/admin/gyms/page.tsx |
| /app/admin/gym-requests | Admin | src/app/(app)/app/(admin)/admin/gym-requests/page.tsx |

Notas:
- Protección de `/app/*` por middleware usando cookie `fs_token` (`src/middleware.ts`).
- Redirección canónica `/app/treinador/*` → `/app/trainer/*` (`src/middleware.ts`).

#### Dev/Admin vs usuario final
- Usuario final: `/app/*` (excepto `/app/admin/*` y `/app/trainer/*`).
- Trainer: `/app/trainer/*` (existe también `/app/treinador/*` pero se redirige).
- Admin global: `/app/admin/*`.
- Dev/Design: `/design-system`, `/app/admin/labs`, `/app/admin/preview` (potencialmente no vendibles).

#### Callejones sin salida detectados (evidencia)
- **Google Login**: la UI muestra un botón que navega a `/api/auth/google/start` (`src/app/(auth)/login/page.tsx`, `GoogleLoginButton.tsx`), pero el backend no registra rutas `/auth/google/start` ni `/auth/google/callback` (no aparecen en `apps/api/src/index.ts`). Resultado esperado: flujo roto o redirect con error.
- **Tracking**: UI escribe y lee de `/api/tracking` (`src/app/(app)/app/seguimiento/TrackingClient.tsx`, E2E `e2e/core-loop.spec.ts`), pero `/api/tracking` usa `Map` en memoria (`src/app/api/tracking/route.ts`) y no proxy a backend. Backend sí persiste tracking en `UserProfile.tracking` vía `/tracking` (`apps/api/src/index.ts`).
- **Trainer asigna nutrición**: UI usa `/api/trainer/members/:id/nutrition-plan-assignment` y GET `/api/trainer/clients/:id/assigned-nutrition-plan` (`TrainerMemberNutritionPlanAssignmentCard.tsx`), pero BE no expone esos endpoints (solo existe `POST /trainer/clients/:userId/assigned-nutrition-plan`).

---

### 2.2 Flujos end-to-end (journeys)

A continuación se documenta “Implementado” (código) vs “Validado” (tests o docs). Si no hay evidencia, se marca **No Validado**.

#### Login + acceso a `/app` protegido
- Implementado: Middleware redirige a `/login?next=...` si falta `fs_token` (`src/middleware.ts`).
- Validación automatizada: E2E cubre navegación a `/app/hoy` con sesión demo (`e2e/core-loop.spec.ts`, `e2e/support.ts`).
- Riesgo: Google OAuth visible pero backend no lo soporta (ver hallazgos).

#### Hoy + 1 acción rápida
- Implementado: Ruta `/app/hoy` (`src/app/(app)/app/hoy/page.tsx`) y componente `TodaySummaryClient.tsx`.
- Validación automatizada: `e2e/core-loop.spec.ts`.
- Gap P0: La acción rápida incrementa tracking vía `/api/tracking` (BFF en memoria). No hay evidencia de persistencia DB ni de consistencia con Weekly Review.

#### Biblioteca: lista → detalle
- Implementado: `/app/biblioteca` + detalle `/app/biblioteca/:exerciseId`.
- Validación automatizada: `e2e/library-smoke.spec.ts`.
- Nota: Backend normaliza `imageUrl` con fallback a `imageUrls[0]` (`apps/api/src/exercises/normalizeExercisePayload.ts`), mitigando placeholders.

#### Tracking: crear 1 registro y confirmar persistencia
- Implementado en UI: `/app/seguimiento` (`TrackingClient.tsx`) crea entries vía `POST /api/tracking`.
- Persistencia real en backend: `/tracking` persiste JSON en `UserProfile.tracking` (`apps/api/src/index.ts`).
- Estado real: **FAIL** como “persistencia verificable” porque el BFF no escribe al backend (usa `Map` en memoria).

#### Food log: registrar ítems por gramos y ver macros/calorías
- Implementado parcialmente:
  - Catálogo de alimentos del usuario: `/api/user-foods` proxy a backend `/user-foods` (tabla `UserFood`).
  - Registro de consumo por gramos vive dentro de tracking snapshot (foodLog), pero hoy se guarda por `/api/tracking` en memoria, no en DB.
- Estado real: **FAIL** como feature vendible (no durable).

#### Onboarding
- Evidencia: No existe wizard dedicado. Solo `/register`, `/verify-email` y páginas de settings/perfil.

#### Dashboard semanal
- Implementado: `/app/weekly-review` (`WeeklyReviewClient`) llama a `/api/review/weekly` (`src/services/weeklyReview.ts`) que proxy a backend `/review/weekly` (`apps/api/src/routes/weeklyReview.ts`).
- Estado real: **Inconsistente** si el usuario usa Tracking/Hoy, porque esos writes no llegan a backend.

#### IA Nutrición: generar plan semanal + lista compra + ajuste
- Implementado:
  - BFF `POST /api/ai/nutrition-plan/generate` proxy a `/ai/nutrition-plan/generate` con validación runtime (`src/app/api/ai/nutrition-plan/generate/route.ts`).
  - UI `/app/nutricion` construye shopping list desde ingredientes (`NutritionPlanClient.tsx`).
  - Existe también módulo “Dietas” basado en `/api/nutrition-plans` (planes en DB), separado de `/app/nutricion`.
- Estado: **Parcial**, con doble UX y doble almacenamiento.

#### IA Fitness: generar plan + ajuste semanal
- Implementado: BFF `POST /api/ai/training-plan/generate` y endpoints de planes en DB.
- Validación: No hay evidencia de un E2E dedicado al “generate + ajuste semanal” para usuario final. **No Validado**.

#### Gym Pilot: unirse + admin gestiona + asigna plan
- Implementado (backend):
  - Join por gymId o por código: `/gyms/join`, `/gyms/join-by-code` (estado PENDING o ACTIVE).
  - Gestión de join requests: `/admin/gym-join-requests` + accept/reject.
  - Asignación de training plan a miembro: endpoints trainer y admin (ver anexos).
  - Asignación de nutrition plan a miembro: `POST /trainer/clients/:userId/assigned-nutrition-plan`, y lectura miembro: `/members/me/assigned-nutrition-plan`.
- Validación: E2E `e2e/gym-flow.spec.ts` y `e2e/gym-nutrition-flow.spec.ts` validan la parte de BE y la visualización en UI del miembro. La asignación se hace vía API directa, no por UI.
- Estado real para “vendible sin supervisión”: **FAIL**, porque la UI de trainer para nutrición está rota (drift de endpoints).

---

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

#### Lo implementado realmente (código)
- Backend define planes: `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO` (`apps/api/src/entitlements.ts`).
- Backend calcula módulos: `strength`, `nutrition`, `ai` con razones `plan` o `admin_override` (`apps/api/src/entitlements.ts`).
- El “Gym” no existe como plan. Existe como **rol y membership** (`GymMembershipStatus` y `GymRole` en `prisma/schema.prisma`).

#### Mapping propuesto (Assunção, para alinearlo con negocio)
- Free = `FREE`
- Fitness Premium = `STRENGTH_AI`
- Nutrición Premium = `NUTRI_AI`
- Bundle = `PRO`
- Gym = membership ACTIVE con rol `ADMIN|TRAINER|MEMBER` (no es plan)

#### Estado por feature (implementado vs vendible)
| Feature | Gating actual | Estado real | Evidencia |
|---|---|---|---|
| Acceso a /app protegido | Sesión `fs_token` | OK | `src/middleware.ts` |
| Tabs core (Hoy, Entrenamiento, Biblioteca) | No (FREE) | OK | `src/components/layout/navConfig.ts` |
| Nutrición tab + Dietas/Recetas | `nutrition` | OK (gated) | `navConfig.ts` (feature `"nutrition"`) |
| AI Training generate | `ai` + strength | OK (endpoint) | BFF `/api/ai/training-plan/generate` |
| AI Nutrition generate | `ai` + nutrition | OK (endpoint) | BFF `/api/ai/nutrition-plan/generate` |
| Tracking + Food log persistente | No (FREE) | **FAIL** | `/api/tracking` usa `Map` |
| Weekly Review (métricas) | `ai` | Inconsistente | `/api/review/weekly` usa backend DB |
| Gym join + membership | Rol/membership | OK (backend), UI parcial | BE `/gyms/*`, FE `/app/gym` |
| Trainer asigna Training plan | Rol/membership | Parcial (E2E por API) | `e2e/gym-flow.spec.ts` |
| Trainer asigna Nutrition plan | Rol/membership | **FAIL (UI)** | `TrainerMemberNutritionPlanAssignmentCard.tsx` |

---

## 3) Auditoría UX (mobile-first)

### Consistencia de tab bar y navegación
- Tab bar existe y aplica entitlement gating (`src/components/layout/MobileTabBar.tsx`, `navConfig.ts`).
- Inconsistencia notable: iconos duplicados (Hoy y Nutrición usan `sparkles`) en `navConfig.ts`, reduce claridad en móvil.

### Estados obligatorios (loading/empty/error/success/disabled)
- Hay componentes estándar de estado (`src/components/states`), usados en varias pantallas (Gym, Trainer, etc.).
- Riesgo UX: “persistencia aparente” en Tracking (por store en memoria) genera sensación de éxito, pero Weekly Review puede salir vacío.

### Copy/i18n
- i18n ES/EN existe (`src/messages/es.json`, `src/messages/en.json`) y se usa vía `useLanguage` y `getServerT`.
- Rutas mixtas (ES y PT) mitigadas con redirect, pero siguen existiendo pantallas duplicadas (`/app/treinador`).

### 10 fricciones concretas (con recomendación)
1) Tracking parece persistir pero no llega a DB, rompe confianza. Solución: proxy real y test que reinicie servidor.
2) Nutrición tiene 2 paradigmas: `/app/nutricion` (calendario) vs `/app/dietas` (lista DB). Solución: una “hub” única.
3) Entrenamiento también está fragmentado: `/app/entrenamiento`, `/app/entrenamientos`, `/app/workouts`. Solución: consolidar rutas y navegación.
4) Google Login visible, pero sin backend. Solución: ocultar botón o implementar OAuth end-to-end.
5) Trainer: asignación nutrición UI rota. Solución: corregir endpoints y estados de error visibles.
6) Capabilities hardcoded en trainer (`/api/trainer/capabilities`) puede ocultar features reales y desalinear UI. Solución: backend-driven capabilities.
7) Sidebar/tabs con features gated, pero acceso por URL directa puede exponer pantallas sin UX de “upgrade”. Solución: guard uniforme por página.
8) “Labs/Preview” en admin puede contaminar demo. Solución: ocultar en builds beta.
9) Feedback de errores: algunos endpoints devuelven 403 “FEATURE_NOT_AVAILABLE_IN_BETA”, pero no siempre hay CTA clara. Solución: CTA estándar (upgrade o “coming soon”).
10) Doble fuente de verdad de planes genera inconsistencias entre “lo que veo hoy” y “lo que tengo en biblioteca”. Solución: elegir un sistema, migrar.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

Frontend:
- Next.js App Router con BFF en `src/app/api/*`.
- Middleware de protección por cookie `fs_token` (`src/middleware.ts`).
- Entitlements en FE leídos desde `/api/auth/me` y aplicados en navegación (`navConfig.ts`).

BFF:
- En general proxy a backend usando `fetch` con cookie `fs_token` o helper `proxyToBackend` (`src/app/api/gyms/_proxy`).
- P0: excepción crítica en `/api/tracking`, que no proxya y usa memoria.

Backend:
- Fastify + Prisma.
- Persistencia mixta:
  - Tracking y perfil en `UserProfile` (JSON).
  - Planes en tablas `TrainingPlan` y `NutritionPlan`.
  - Gym membership en `GymMembership` con assignedTrainingPlanId y assignedNutritionPlanId.

Zonas sensibles:
- `fs_token` (sesión), middleware, BFF proxying, y los schemas de entitlements.
- “God file”: `apps/api/src/index.ts` (~350 KB) concentra la mayoría de routes y lógica.

### 4.2 Contratos FE↔BE (mapa)

#### Mapa crítico (core + gym + trainer)

| BFF (FE) | Backend (BE) | Estado | Impacto |
|---|---|---|---|
| `POST /auth/login` (server action) | `POST /auth/login` | OK | Login core |
| `GET /api/auth/me` | `GET /auth/me` | OK (valida runtime) | Entitlements, tokens, membership |
| `GET/PUT /api/profile` | `GET/PUT /profile` | OK | Perfil y planes en profile JSON |
| `GET/POST/PUT /api/tracking` | `GET/POST/PUT /tracking` | **Mismatch** | Datos no persistidos, Weekly Review inconsistente |
| `DELETE /api/tracking/:collection/:id` | `DELETE /tracking/:collection/:id` | OK | Borrado sí toca backend |
| `GET /api/review/weekly` | `GET /review/weekly` | OK | Pero depende de tracking DB |
| `POST /api/auth/google/start` | `GET /auth/google/start` | **Missing** | Dead end en login |
| `GET /api/gyms` | `GET /gyms` | OK | Lista de gyms |
| `POST /api/gyms/join-by-code` | `POST /gyms/join-by-code` | OK | Join por código |
| `GET /api/gym/me` | `GET /gym/me` | OK | Membership actual |
| `POST /api/admin/gym-join-requests/:id/accept` | `POST /admin/gym-join-requests/:id/accept` | OK | Aprobación |
| `POST /api/trainer/members/:id/training-plan-assignment` | `POST /trainer/members/:id/training-plan-assignment` | OK | Asignación training (manager) |
| `POST /api/trainer/members/:id/nutrition-plan-assignment` | (no existe) | **Missing** | Asignación nutrición rota en UI |
| `GET /api/trainer/clients/:id/assigned-nutrition-plan` | (no existe) | **Missing** | UI no puede leer asignación |
| `POST /api/trainer/clients/:id/assigned-nutrition-plan` | `POST /trainer/clients/:id/assigned-nutrition-plan` | OK | Backend soporta asignación |

Notas:
- Hay endpoints BFF que proxean PATCH/DELETE para nutrition-plans trainer, pero BE solo tiene GET/POST. Si se exponen en UI sin gating, habrá 404/405.
- La auditoría automática completa de contratos (92 BFF endpoints vs 115 BE endpoints) se incluye en anexos como inventario; varios paths son dinámicos y requieren revisión manual por módulo.

### 4.3 IA (assistiva)

Dónde se usa:
- BFF: `/api/ai/*` (training-plan, nutrition-plan, daily-tip, quota).
- Backend: `/ai/*` con normalización, pricing y charge de tokens (carpeta `apps/api/src/ai/`).

Evidencia de output estructurado + validación:
- FE valida payloads críticos (`src/lib/runtimeContracts.ts` usado en `src/app/api/ai/*`).
- BE tiene normalizadores (por ejemplo `apps/api/src/ai/normalizeNutritionPlan.ts`) y pricing (`apps/api/src/ai/pricing.ts`).

Riesgos y mitigación recomendada:
- PII/logs: backend hace `app.log.info` en tracking updates. Mitigación: redacción de payloads, logs por agregados, y evitar imprimir contenido sensible.
- Drift de schemas: mantener tests contractuales (ya existen en FE y BE), y versionar schemas (por ejemplo `effectiveEntitlementsSchema.version = "2026-02-01"`).

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)

Entorno de auditoría:
- No se ejecutaron `npm ci` ni `npm run build/test` por falta de dependencias en los zips, por lo que el estado se reporta como **No Validado** en este informe.
- Sí existe infraestructura de tests y documentación interna.

Frontend (front.zip):
- Scripts presentes: `build`, `lint`, `typecheck`, `test` (vitest), `e2e` (playwright) (`front/package.json`).
- E2E specs presentes: `core-loop`, `library-smoke`, `gym-flow`, `gym-nutrition-flow`, `token-lifecycle` (`front/e2e/*`).

Backend (api.zip):
- Scripts presentes: `build`, `lint`, `typecheck`, `test` (tsx), `db:bootstrap` (`api/package.json`).
- Tests contractuales presentes: `src/tests/*.contract.test.ts` (por ejemplo `routeParity.contract.test.ts`, `exercises.contract.test.ts`).

Resultado (sin ejecutar):
- build web: **No Validado**
- lint web: **No Validado**
- typecheck web: **No Validado**
- tests web: **No Validado**
- tests api: **No Validado**

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) DoD mínimo
- Login + `/app` protegido: **PASS** (middleware + E2E base).
- Tab bar: **PASS**.
- Hoy + 1 acción rápida: **PASS en UI**, **FAIL como persistencia real** (tracking en memoria).
- Tracking persistente en backend: **FAIL** (BFF `/api/tracking` no proxeado).
- Biblioteca lista + detalle: **PASS** (E2E library-smoke).

B) Entitlements modular
- Backend-driven entitlements: **PASS** (schema y cálculo existentes).
- Tiers del negocio (Free/Nutri/Fitness/Bundle/Gym): **FAIL** (Bundle/Gym no existen como plan; Gym es membership).

C) Free: métricas básicas + food log con macros/calorías
- Métricas basadas en tracking DB: **FAIL** (writes no llegan a backend).
- Catálogo alimentos (UserFood): **PASS**.
- Food log durable: **FAIL**.

D) Nutrición Premium: plan semanal + lista compra + ajustes + validación IA
- Generación IA: **PASS** (endpoints + validación runtime).
- Lista compra: **PASS** (derivada de ingredientes en UI).
- Ajustes consistentes y persistidos en un solo sistema: **FAIL** (doble sistema profile vs DB).

E) Fitness Premium: plan según contexto + ajuste semanal + validación IA
- Generación IA: **PASS** (endpoints).
- Ajuste semanal validado E2E: **No Validado**.

F) Gym Pilot: join + panel admin + asignación de plan template
- Join por código y approval: **PASS** (BE + E2E por API).
- Asignación training desde UI: **Parcial** (E2E usa API, no UI).
- Asignación nutrición desde UI: **FAIL** (endpoints inexistentes en BE).

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-AUD-001 | P0 | Contratos, Datos | `/api/tracking` usa store en memoria (Map) en lugar de backend `/tracking` | Pérdida de datos, rompe multi-dispositivo y Weekly Review | `front/src/app/api/tracking/route.ts`, `api/src/index.ts` | Proxiar GET/POST/PUT a backend, eliminar Map, ajustar E2E | Backend+FE | M |
| FS-AUD-002 | P0 | Producto Gym | UI trainer nutrición llama endpoints inexistentes (`/trainer/members/:id/nutrition-plan-assignment`, GET assigned-nutrition-plan) | Gym no puede operar nutrición sin soporte manual | `TrainerMemberNutritionPlanAssignmentCard.tsx`, backend routes | Cambiar UI a endpoint real y añadir GET/DELETE en BE o capability fallback | FE+BE | M |
| FS-AUD-003 | P0 | UX, Auth | Google login visible, BE no implementa `/auth/google/*` | Dead end en login, viola DoD “no dead ends” | `GoogleLoginButton.tsx`, ausencia en `api/src/index.ts` | Ocultar botón o implementar OAuth completo | FE+BE | S-M |
| FS-AUD-004 | P1 | Arquitectura | Doble fuente de verdad para planes (profile JSON vs tablas) | UX inconsistente, dificulta modularidad | `ProfileData` incluye `trainingPlan`/`nutritionPlan`, existen tablas `TrainingPlan`/`NutritionPlan` | Elegir una fuente, plan de migración y deprecación | Arquitectura | L |
| FS-AUD-005 | P1 | UX | Entrenamiento y Nutrición fragmentados (rutas y pantallas duplicadas) | Confusión, mayor soporte | Rutas `/app/entrenamiento`, `/app/entrenamientos`, `/app/nutricion`, `/app/dietas` | Consolidar IA y vistas en “hub” por dominio | FE/PM | M-L |
| FS-AUD-006 | P2 | Calidad | E2E “persistencia tras reload” no valida DB, solo memoria del servidor | Falsa confianza de green bar | `e2e/core-loop.spec.ts`, BFF tracking Map | Reiniciar server en test o leer backend `/tracking` | QA/FE | M |
| FS-AUD-007 | P2 | Backend | `src/index.ts` demasiado grande, difícil de auditar y extender | Riesgo de regresión, onboarding lento | `api/src/index.ts` tamaño | Modularizar por dominios usando `src/routes/*` | Backend | L |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1 (apuesta): “Datos y Core Loop reales”
- Goal: Tracking y Weekly Review consistentes con DB, sin falsos positivos.
- Entra:
  - Proxy real `/api/tracking` → `/tracking` (GET/POST/PUT).
  - Ajuste de E2E core-loop para validar persistencia real (por ejemplo, re-crear contexto y verificar backend `/tracking`).
  - Smoke manual mínimo documentado (alineado con `docs/DEFINITION_OF_DONE.md`).
- No entra: mejoras visuales, nuevas features.
- Métricas:
  - 0 “dead ends” en login y core loop.
  - Weekly Review refleja acciones de Hoy y Tracking.
- Riesgos/deps: migración de datos desde store en memoria a DB (posible pérdida de estado de demo). Mitigar con `demo:reset`.

### Sprint 2 (apuesta): “Gym Pilot autónomo (nutrición + trainer UX)”
- Goal: Un gym pequeño puede asignar planes (training y nutrition) desde UI sin soporte.
- Entra:
  - Fix UI trainer nutrición: endpoints correctos, estados de error, y visibilidad del plan asignado.
  - Añadir en BE endpoints faltantes para leer y desasignar nutrition plan (o extender payload de `/trainer/clients/:id`).
  - Capabilities reales: FE lee de BE qué está soportado.
- No entra: marketplace, white-label, enterprise.
- Métricas:
  - “Happy path” gym: join, approve, assign training, assign nutrition, miembro ve ambos, todo sin consola errors.
- Riesgos/deps: decisiones de contrato (nombres de endpoints) y compatibilidad retro.

### Sprint 3 (apuesta): “Unificación de UX de planes”
- Goal: 1 sola experiencia por dominio (Training y Nutrition) y 1 sola fuente de verdad.
- Entra:
  - Decidir fuente: DB plans o profile JSON, y plan de migración.
  - Consolidar rutas duplicadas y actualizar navegación.
  - Simplificar pantallas legacy, esconder las que queden sin datos.
- No entra: features nuevas de IA.
- Métricas:
  - Reducción de rutas duplicadas, y reducción de paths “solo para demo”.
  - Menos soporte manual en gym piloto.
- Riesgos/deps: migración de datos, cambios en UI y en contratos.

---

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (55 páginas)

| Ruta | Audiencia | Archivo |
|---|---|---|
| / | Marketing/Other | src/app/(marketing)/page.tsx |
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
| /app/trainer/nutrition-plans | Trainer | src/app/(app)/app/(trainer)/trainer/nutrition-plans/page.tsx |
| /app/trainer/plans | Trainer | src/app/(app)/app/(trainer)/trainer/plans/page.tsx |
| /app/trainer/plans/:id | Trainer | src/app/(app)/app/(trainer)/trainer/plans/[id]/page.tsx |
| /app/trainer/requests | Trainer | src/app/(app)/app/(trainer)/trainer/requests/page.tsx |
| /app/treinador | Trainer | src/app/(app)/app/(trainer)/treinador/page.tsx |
| /app/treinador/*slug | Trainer | src/app/(app)/app/(trainer)/treinador/[...slug]/page.tsx |
| /app/weekly-review | User | src/app/(app)/app/weekly-review/page.tsx |
| /app/workouts | User | src/app/(app)/app/workouts/page.tsx |
| /design-system | Auth/Marketing | src/app/(auth)/design-system/page.tsx |
| /login | Auth/Marketing | src/app/(auth)/login/page.tsx |
| /pricing | Marketing/Other | src/app/(marketing)/pricing/page.tsx |
| /register | Auth/Marketing | src/app/(auth)/register/page.tsx |
| /verify-email | Auth/Marketing | src/app/(auth)/verify-email/page.tsx |

### 8.2 Inventario BFF `/api/*` (92 endpoints)

| Endpoint (BFF) | Handlers | Archivo |
|---|---|---|
| /api/admin/gym-join-requests | GET | src/app/api/admin/gym-join-requests/route.ts |
| /api/admin/gym-join-requests/:membershipId/:action | POST | src/app/api/admin/gym-join-requests/[membershipId]/[action]/route.ts |
| /api/admin/gym-join-requests/:membershipId/accept | POST | src/app/api/admin/gym-join-requests/[membershipId]/accept/route.ts |
| /api/admin/gym-join-requests/:membershipId/reject | POST | src/app/api/admin/gym-join-requests/[membershipId]/reject/route.ts |
| /api/admin/gyms | GET,POST | src/app/api/admin/gyms/route.ts |
| /api/admin/gyms/:gymId | DELETE | src/app/api/admin/gyms/[gymId]/route.ts |
| /api/admin/gyms/:gymId/members | GET | src/app/api/admin/gyms/[gymId]/members/route.ts |
| /api/admin/gyms/:gymId/members/:userId/assign-training-plan | POST | src/app/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan/route.ts |
| /api/admin/gyms/:gymId/members/:userId/role | PATCH | src/app/api/admin/gyms/[gymId]/members/[userId]/role/route.ts |
| /api/admin/users | GET,POST | src/app/api/admin/users/route.ts |
| /api/admin/users/:id | DELETE | src/app/api/admin/users/[id]/route.ts |
| /api/admin/users/:id/block | PATCH | src/app/api/admin/users/[id]/block/route.ts |
| /api/admin/users/:id/gym-role | GET,POST | src/app/api/admin/users/[id]/gym-role/route.ts |
| /api/admin/users/:id/reset-password | POST | src/app/api/admin/users/[id]/reset-password/route.ts |
| /api/admin/users/:id/unblock | PATCH | src/app/api/admin/users/[id]/unblock/route.ts |
| /api/admin/users/:id/verify-email | POST | src/app/api/admin/users/[id]/verify-email/route.ts |
| /api/ai/daily-tip | POST | src/app/api/ai/daily-tip/route.ts |
| /api/ai/nutrition-plan | POST | src/app/api/ai/nutrition-plan/route.ts |
| /api/ai/nutrition-plan/generate | POST | src/app/api/ai/nutrition-plan/generate/route.ts |
| /api/ai/quota | GET | src/app/api/ai/quota/route.ts |
| /api/ai/training-plan | POST | src/app/api/ai/training-plan/route.ts |
| /api/ai/training-plan/generate | POST | src/app/api/ai/training-plan/generate/route.ts |
| /api/auth/change-password | POST | src/app/api/auth/change-password/route.ts |
| /api/auth/google/callback | GET | src/app/api/auth/google/callback/route.ts |
| /api/auth/google/start | GET | src/app/api/auth/google/start/route.ts |
| /api/auth/me | GET | src/app/api/auth/me/route.ts |
| /api/auth/resend-verification | POST | src/app/api/auth/resend-verification/route.ts |
| /api/auth/verify-email | GET | src/app/api/auth/verify-email/route.ts |
| /api/billing/checkout | POST | src/app/api/billing/checkout/route.ts |
| /api/billing/plans | GET | src/app/api/billing/plans/route.ts |
| /api/billing/portal | POST | src/app/api/billing/portal/route.ts |
| /api/billing/status | GET | src/app/api/billing/status/route.ts |
| /api/exercises | GET,POST | src/app/api/exercises/route.ts |
| /api/exercises/:id | GET | src/app/api/exercises/[id]/route.ts |
| /api/feed | GET | src/app/api/feed/route.ts |
| /api/feed/generate | POST | src/app/api/feed/generate/route.ts |
| /api/gym-flow/approve | POST | src/app/api/gym-flow/approve/route.ts |
| /api/gym-flow/assign | DELETE,POST | src/app/api/gym-flow/assign/route.ts |
| /api/gym-flow/assigned-plan | DELETE,GET,POST | src/app/api/gym-flow/assigned-plan/route.ts |
| /api/gym-flow/join | POST | src/app/api/gym-flow/join/route.ts |
| /api/gym-flow/members | GET | src/app/api/gym-flow/members/route.ts |
| /api/gym/admin/members/:userId/role | PATCH | src/app/api/gym/admin/members/[userId]/role/route.ts |
| /api/gym/join-code | POST | src/app/api/gym/join-code/route.ts |
| /api/gym/join-request | POST | src/app/api/gym/join-request/route.ts |
| /api/gym/me | DELETE,GET | src/app/api/gym/me/route.ts |
| /api/gyms | GET | src/app/api/gyms/route.ts |
| /api/gyms/join | POST | src/app/api/gyms/join/route.ts |
| /api/gyms/join-by-code | POST | src/app/api/gyms/join-by-code/route.ts |
| /api/gyms/membership | DELETE,GET | src/app/api/gyms/membership/route.ts |
| /api/nutrition-plans | GET | src/app/api/nutrition-plans/route.ts |
| /api/nutrition-plans/:id | GET | src/app/api/nutrition-plans/[id]/route.ts |
| /api/nutrition-plans/assigned | GET | src/app/api/nutrition-plans/assigned/route.ts |
| /api/profile | GET,PUT | src/app/api/profile/route.ts |
| /api/recipes | GET | src/app/api/recipes/route.ts |
| /api/recipes/:id | GET | src/app/api/recipes/[id]/route.ts |
| /api/review/weekly | GET | src/app/api/review/weekly/route.ts |
| /api/tracking | GET,POST,PUT | src/app/api/tracking/route.ts |
| /api/tracking/:collection/:id | DELETE | src/app/api/tracking/[collection]/[id]/route.ts |
| /api/trainer/assign-training-plan | POST | src/app/api/trainer/assign-training-plan/route.ts |
| /api/trainer/capabilities | GET | src/app/api/trainer/capabilities/route.ts |
| /api/trainer/clients | GET | src/app/api/trainer/clients/route.ts |
| /api/trainer/clients/:id | DELETE,GET | src/app/api/trainer/clients/[id]/route.ts |
| /api/trainer/clients/:id/assigned-nutrition-plan | DELETE,GET,POST | src/app/api/trainer/clients/[id]/assigned-nutrition-plan/route.ts |
| /api/trainer/clients/:id/assigned-plan | DELETE,GET,POST | src/app/api/trainer/clients/[id]/assigned-plan/route.ts |
| /api/trainer/clients/:id/notes | GET,POST | src/app/api/trainer/clients/[id]/notes/route.ts |
| /api/trainer/clients/:id/plan |  | src/app/api/trainer/clients/[id]/plan/route.ts |
| /api/trainer/join-requests | GET | src/app/api/trainer/join-requests/route.ts |
| /api/trainer/join-requests/:membershipId/:action | POST | src/app/api/trainer/join-requests/[membershipId]/[action]/route.ts |
| /api/trainer/join-requests/:membershipId/accept | POST | src/app/api/trainer/join-requests/[membershipId]/accept/route.ts |
| /api/trainer/join-requests/:membershipId/reject | POST | src/app/api/trainer/join-requests/[membershipId]/reject/route.ts |
| /api/trainer/members | GET | src/app/api/trainer/members/route.ts |
| /api/trainer/members/:id/assigned-plan |  | src/app/api/trainer/members/[id]/assigned-plan/route.ts |
| /api/trainer/members/:id/nutrition-plan-assignment | DELETE,POST | src/app/api/trainer/members/[id]/nutrition-plan-assignment/route.ts |
| /api/trainer/members/:id/training-plan-assignment | DELETE,POST | src/app/api/trainer/members/[id]/training-plan-assignment/route.ts |
| /api/trainer/nutrition-plans | GET,POST | src/app/api/trainer/nutrition-plans/route.ts |
| /api/trainer/nutrition-plans/:id | DELETE,GET,PATCH | src/app/api/trainer/nutrition-plans/[id]/route.ts |
| /api/trainer/plans | GET,POST | src/app/api/trainer/plans/route.ts |
| /api/trainer/plans/:id | DELETE,GET,PATCH,PUT | src/app/api/trainer/plans/[id]/route.ts |
| /api/trainer/plans/:id/days/:dayId | DELETE | src/app/api/trainer/plans/[id]/days/[dayId]/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises | POST | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/route.ts |
| /api/trainer/plans/:id/days/:dayId/exercises/:exerciseId | DELETE,PATCH | src/app/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]/route.ts |
| /api/training-plans | GET,POST | src/app/api/training-plans/route.ts |
| /api/training-plans/:id | GET | src/app/api/training-plans/[id]/route.ts |
| /api/training-plans/:id/days/:dayId/exercises | POST | src/app/api/training-plans/[id]/days/[dayId]/exercises/route.ts |
| /api/training-plans/active | GET,POST | src/app/api/training-plans/active/route.ts |
| /api/user-foods | GET,POST | src/app/api/user-foods/route.ts |
| /api/user-foods/:id | DELETE,PUT | src/app/api/user-foods/[id]/route.ts |
| /api/workout-sessions/:id | PATCH | src/app/api/workout-sessions/[id]/route.ts |
| /api/workout-sessions/:id/finish | POST | src/app/api/workout-sessions/[id]/finish/route.ts |
| /api/workouts | GET,POST | src/app/api/workouts/route.ts |
| /api/workouts/:id | DELETE,GET,PATCH | src/app/api/workouts/[id]/route.ts |
| /api/workouts/:id/start | POST | src/app/api/workouts/[id]/start/route.ts |

### 8.3 Inventario backend (Fastify) (115 endpoints)

| Método | Endpoint (API) |
|---|---|
| GET | /admin/gym-join-requests |
| POST | /admin/gym-join-requests/:membershipId/accept |
| POST | /admin/gym-join-requests/:membershipId/reject |
| GET | /admin/gyms |
| POST | /admin/gyms |
| DELETE | /admin/gyms/:gymId |
| GET | /admin/gyms/:gymId/members |
| POST | /admin/gyms/:gymId/members/:userId/assign-training-plan |
| PATCH | /admin/gyms/:gymId/members/:userId/role |
| GET | /admin/users |
| POST | /admin/users |
| DELETE | /admin/users/:id |
| PATCH | /admin/users/:id/block |
| PATCH | /admin/users/:id/plan |
| POST | /admin/users/:id/reset-password |
| PATCH | /admin/users/:id/tokens |
| PATCH | /admin/users/:id/tokens-allowance |
| POST | /admin/users/:id/tokens/add |
| PATCH | /admin/users/:id/tokens/balance |
| PATCH | /admin/users/:id/unblock |
| POST | /admin/users/:id/verify-email |
| POST | /ai/daily-tip |
| POST | /ai/nutrition-plan |
| POST | /ai/nutrition-plan/generate |
| GET | /ai/quota |
| POST | /ai/training-plan |
| POST | /ai/training-plan/generate |
| POST | /auth/change-password |
| GET | /auth/google/callback |
| GET | /auth/google/start |
| POST | /auth/login |
| POST | /auth/logout |
| GET | /auth/me |
| POST | /auth/register |
| POST | /auth/resend-verification |
| POST | /auth/signup |
| GET | /auth/verify-email |
| POST | /billing/admin/reset-customer-link |
| POST | /billing/checkout |
| GET | /billing/plans |
| POST | /billing/portal |
| GET | /billing/status |
| POST | /billing/stripe/webhook |
| POST | /dev/reset-demo |
| POST | /dev/seed-exercises |
| POST | /dev/seed-recipes |
| GET | /exercises |
| POST | /exercises |
| GET | /exercises/:id |
| GET | /feed |
| POST | /feed/generate |
| PATCH | /gym/admin/members/:userId/role |
| POST | /gym/join-code |
| POST | /gym/join-request |
| DELETE | /gym/me |
| GET | /gym/me |
| GET | /gyms |
| POST | /gyms/join |
| POST | /gyms/join-by-code |
| DELETE | /gyms/membership |
| GET | /gyms/membership |
| GET | /health |
| GET | /members/me/assigned-nutrition-plan |
| GET | /members/me/assigned-training-plan |
| GET | /nutrition-plans |
| GET | /nutrition-plans/:id |
| GET | /profile |
| PUT | /profile |
| GET | /recipes |
| GET | /recipes/:id |
| GET | /tracking |
| POST | /tracking |
| PUT | /tracking |
| DELETE | /tracking/:collection/:id |
| GET | /trainer/clients |
| DELETE | /trainer/clients/:userId |
| GET | /trainer/clients/:userId |
| POST | /trainer/clients/:userId/assigned-nutrition-plan |
| DELETE | /trainer/clients/:userId/assigned-plan |
| GET | /trainer/clients/:userId/assigned-plan |
| POST | /trainer/clients/:userId/assigned-plan |
| GET | /trainer/gym |
| PATCH | /trainer/gym |
| DELETE | /trainer/members/:id/training-plan-assignment |
| POST | /trainer/members/:id/training-plan-assignment |
| GET | /trainer/members/:userId/training-plan-assignment |
| GET | /trainer/nutrition-plans |
| POST | /trainer/nutrition-plans |
| GET | /trainer/nutrition-plans/:id |
| GET | /trainer/plans |
| POST | /trainer/plans |
| DELETE | /trainer/plans/:planId |
| GET | /trainer/plans/:planId |
| PATCH | /trainer/plans/:planId |
| DELETE | /trainer/plans/:planId/days/:dayId |
| POST | /trainer/plans/:planId/days/:dayId/exercises |
| DELETE | /trainer/plans/:planId/days/:dayId/exercises/:exerciseId |
| PATCH | /trainer/plans/:planId/days/:dayId/exercises/:exerciseId |
| GET | /training-plans |
| POST | /training-plans |
| GET | /training-plans/:id |
| POST | /training-plans/:planId/days/:dayId/exercises |
| GET | /training-plans/active |
| GET | /user-foods |
| POST | /user-foods |
| DELETE | /user-foods/:id |
| PUT | /user-foods/:id |
| PATCH | /workout-sessions/:id |
| POST | /workout-sessions/:id/finish |
| GET | /workouts |
| POST | /workouts |
| DELETE | /workouts/:id |
| GET | /workouts/:id |
| PATCH | /workouts/:id |
| POST | /workouts/:id/start |

### 8.4 Feature flags/toggles detectados
- `NEXT_PUBLIC_BACKEND_URL` o `BACKEND_URL` (fallback a `http://localhost:4000`) en `front/src/lib/backend.ts`.
- No se detectaron flags explícitos para Google OAuth o para activar/desactivar módulos; el gating se hace por entitlements y role.

### 8.5 Manejo seguro de secretos
- Se detecta `.env` en `api/.env`. No se incluyen valores en este documento. Recomendación: asegurar que no se suben secretos a repos públicos y usar `.env.example` como referencia.

---
