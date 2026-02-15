# Auditoria_FitSculpt_2026-02-15.md
Fecha: 2026-02-15  
Autor/a auditoría: ChatGPT (Senior Staff Architects, Full-Stack + UI/UX + Producto)  
Solicitado por: Founder/PM (FitSculpt)  
Snapshot auditado: ZIPs recibidos  
- front.zip sha256: 48930bd942be9137ceca141ad7aaacb793781f5be61842f32a6a6e98a3a29046  
- back.zip sha256: 0a2deac0308f22a7a43e01144c222774716dcad7fc0a80337f89d1fd37d2a3f3  
Entorno auditoría:
- Timezone: Europe/Luxembourg
- Node: v22.16.0
- npm: 10.9.2
- Commit hash: N/A (no metadata git en ZIP)

> Nota de evidencia: todo lo afirmado se apoya en lectura del código. Donde no pude verificar por ejecución (build/lint) queda marcado explícitamente.  

---

## 1) Executive Summary (máx 12 bullets)

- Release-ready: **NO**. Motivo principal, **no se puede verificar un build reproducible** del frontend y hay **errores de código evidentes** en la biblioteca (ver 5.1 y Hallazgo FE-001).
- Estado MVP Modular: **PARCIAL (NO)**. Login y /app protegido están, tracking y food log existen, pero la biblioteca parece rota por errores de implementación y hay inconsistencias de contratos.
- Estado Gym Pilot: **PARCIAL (NO)**. Hay join por code y join request + paneles, pero hay **mismatches de endpoints y permisos** (ejemplo, panel admin de gym lista usuarios globales).
- Top 5 riesgos:
  1) **Frontend no instalable/ejecutable en el entorno auditado** (npm ci termina con SIGTERM, ver 5.1) y biblioteca con código inválido.
  2) **Entitlements inconsistentes**: FE asume que “Gym” da acceso a IA, BE bloquea por tokens (aiAccessGuard).
  3) **BFF expone rutas “admin tokens/plan” que no existen en backend** (contrato roto).
  4) **Index.ts del backend es un “god file”** con alto riesgo de regresiones, difícil de testear y modularizar.
  5) **Logging de IA**: el backend loguea rawResponse de IA sin guard en producción, potencial PII y ruido.
- Top 5 quick wins:
  1) Arreglar **ExerciseLibraryClient.tsx** (duplicados y referencias) y añadir CI typecheck mínimo.
  2) Alinear entitlements IA, decidir si Gym habilita tokens o no, y reflejarlo en /auth/me o en FE.
  3) Eliminar o implementar rutas BFF “admin users tokens/plan” para no romper UX.
  4) Cambiar OnboardingClient de `useState(() => …)` a `useEffect` para carga inicial.
  5) Desactivar log de rawResponse IA en producción.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

**Base**
- Middleware de protección de /app: `src/middleware.ts`  
  Evidencia: protege `/app/:path*` y exige cookie `fs_token`, redirige a `/login`.

**Auth**
- `/login` (pantalla login): `src/app/(auth)/login/page.tsx` + `actions.ts`  
  Evidencia: server action hace POST a `${getBackendUrl()}/auth/login`, y escribe cookie `fs_token`.
- `/signup` (registro): existe en rutas, revisar `src/app/(auth)/signup/*` (rutas detectadas por árbol).

**App core**
- `/app` (home contenedor): `src/app/(app)/app/page.tsx`  
- `/app/hoy` (Hoy): `src/app/(app)/app/hoy/page.tsx`  
- `/app/seguimiento` (tracking): `src/app/(app)/app/seguimiento/*`  
- `/app/biblioteca` (library ejercicios): `src/app/(app)/app/biblioteca/*`  
- `/app/macros` (targets y resumen): `src/app/(app)/app/macros/*`  
- `/app/nutricion` (plan nutrición + IA): `src/app/(app)/app/nutricion/*`  
- `/app/entrenamiento` (plan training + IA): `src/app/(app)/app/entrenamiento/*`  
- `/app/dashboard` (dashboard semanal): `src/app/(app)/app/dashboard/page.tsx` y `src/app/(app)/app/DashboardClient.tsx`  
- `/app/onboarding`: `src/app/(app)/app/onboarding/*`

**Gym**
- `/app/gym` (join a gym y estado): `src/app/(app)/app/gym/page.tsx` + `src/components/gym/GymPageClient.tsx`
- `/app/gym/admin` (gestión de miembros): `src/app/(app)/app/gym/admin/page.tsx` + `src/components/gym/GymAdminMembersClient.tsx`
- Rutas admin generales: `/app/admin/*` (`users`, `gyms`, etc).

**Trainer**
- `/app/trainer` y `/app/trainer/clients`: vistas trainer, `src/app/(app)/app/trainer/*`
- Existe además `/app/treinador/*` (duplicado en PT) detectado en rutas.

**Dev/Admin vs Usuario final**
- Usuario final: hoy, seguimiento, macros, nutrición, entrenamiento, dashboard, biblioteca.
- Admin/Dev: `/app/admin/*`, partes de sidebar marcadas como “Development” en `src/components/layout/navConfig.ts`.
- Trainer/Gym manager: `/app/trainer/*`, `/app/gym/admin`.

**Callejones sin salida**
- Biblioteca: el listado tiene señales fuertes de “merge roto” (duplicados). Esto puede bloquear el journey “biblioteca lista → detalle”. Evidencia en 5.2 y hallazgos FE-001.
- Gym Admin Members: usa `/api/admin/users` (global) en vez de miembros del gym, puede romper permisos y privacidad (hallazgo GYM-002).

---

### 2.2 Flujos end-to-end (journeys)

#### Login + acceso a `/app` protegido
1) Usuario abre `/login`.  
2) Envía credenciales.  
3) Server action `src/app/(auth)/login/actions.ts` hace POST a `${getBackendUrl()}/auth/login`.  
4) Backend setea cookie `fs_token` (httpOnly).  
5) Middleware `src/middleware.ts` permite `/app/*` si existe `fs_token`.  
Resultado esperado: acceso a `/app` sin redirect.  
Evidencia backend login: `back/src/index.ts` ruta `POST /auth/login`.

#### Hoy + 1 acción rápida
1) Entrar a `/app/hoy`.  
2) `TodayQuickActionsClient` fetch a `/api/tracking` y `/api/profile`.  
3) Si hay acciones disponibles, muestra CTAs a:
   - Check-in: `/app/seguimiento#checkin-entry`
   - Training: `/app/entrenamiento`
   - Macros: `/app/macros`  
Evidencia: `src/app/(app)/app/hoy/TodayQuickActionsClient.tsx`.

#### Biblioteca: lista → detalle
- Lista: `/app/biblioteca`, `ExerciseLibraryClient.tsx`  
- Detalle: `/app/biblioteca/[exerciseId]`, fetch a `/api/exercises/${id}`.  
Riesgo: el archivo de lista tiene duplicados, probable fallo de compilación (hallazgo FE-001).  
Evidencia: `src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` contiene duplicación de estados y lógica mezclada.

#### Tracking: crear 1 registro y confirmar persistencia
1) Entrar a `/app/seguimiento`.  
2) Crear check-in o food entry.  
3) UI hace PUT a `/api/tracking`.  
4) BFF proxy a backend `/tracking`.  
5) Backend persiste en `UserProfile.tracking` (JSON).  
Evidencia BE: `back/src/index.ts` rutas `GET /tracking`, `PUT /tracking`, `DELETE /tracking/:collection/:id`.  
Evidencia DB: `prisma/schema.prisma` modelo `UserProfile` con campo `tracking Json?`.

#### Food log: registrar ítems por gramos y ver macros/calorías
Existe.  
- UI: `src/app/(app)/app/seguimiento/TrackingClient.tsx` crea entries con `grams`, calcula macros y calorías combinando “defaultFoodProfiles” y `user-foods`.  
- BFF: `/api/user-foods` y `/api/tracking`.  
- BE: `GET/POST/PUT/DELETE /user-foods`, tracking schema incluye `foodLog: [{ foodKey, grams }]`.  
Evidencia BE: `back/src/index.ts` `userFoodSchema` y rutas `/user-foods`.

#### Onboarding (si existe)
Existe en `/app/onboarding`.  
Riesgo: usa `useState(() => { void loadProfile(); })` como efecto (bug).  
Evidencia: `src/app/(app)/app/onboarding/OnboardingClient.tsx`.

#### Dashboard semanal (si existe)
Existe `/app/dashboard` y muestra:
- progreso peso, grasa (series desde checkins)
- resumen del día y anillos de macros usando targets desde plan nutrición  
Evidencia: `src/app/(app)/app/DashboardClient.tsx`.

#### IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)
- Generación de plan: existe `/api/ai/nutrition-plan` (BFF) y backend `POST /ai/nutrition-plan` con validación y normalización.  
- Lista de compra: no vi un endpoint dedicado “shopping list” como contrato separado, parece que el plan incluye recetas e ingredientes, y la UI podría derivarlo. Necesita confirmación por ejecución (Assunção: UI lo puede construir).  
- Ajuste semanal: hay soporte para regenerar (por prompt) y guardado, pero no vi un “patch adjustments” específico, se re-genera plan.  
Evidencia BE: `back/src/index.ts` `POST /ai/nutrition-plan`, guardado en `UserProfile.nutritionPlan`.

#### IA Fitness: generar plan + ajuste semanal (si existe)
Existe `POST /ai/training-plan` y guardado.  
Evidencia BE: `back/src/index.ts` `POST /ai/training-plan`, `saveTrainingPlan`.

#### Gym Pilot: usuario se une a gym + admin gestiona + asigna plan (si existe)
- Join por code: backend `POST /gym/join-code`, FE lo usa en `GymPageClient.tsx` por `/api/gym/join-code`.  
- Join request: backend soporta `POST /gyms/join` y `/gym/join-request` (alias), y admin gestiona via `/admin/gym-join-requests` accept/reject. FE tiene BFF correspondientes.  
- Admin asigna plan: backend `POST /admin/gyms/:gymId/members/:userId/assign-training-plan`, FE lo llama desde `GymAdminMembersClient.tsx`.  
Riesgos: panel de miembros usa lista global de usuarios (ver GYM-002).

---

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

**Implementado de verdad (evidencia)**
Backend solo tiene `plan: FREE | PRO` en `prisma/schema.prisma` (modelo User). No existe una separación persistida “Nutrición Premium” vs “Fitness Premium”.  
Evidencia: `prisma/schema.prisma` enum `Plan`.

**Tabla (real vs planeado)**

| Feature | Free | Nutrición Premium | Fitness Premium | Bundle | Gym | Evidencia |
|---|---:|---:|---:|---:|---:|---|
| Login + /app protegido | Sí | Sí | Sí | Sí | Sí | `src/middleware.ts`, `POST /auth/login` |
| Tracking (checkins) | Sí | Sí | Sí | Sí | Sí | `GET/PUT /tracking` |
| Food log por gramos + macros | Sí | Sí | Sí | Sí | Sí | `TrackingClient.tsx`, `user-foods` |
| Biblioteca ejercicios lista/detalle | Parcial | Parcial | Parcial | Parcial | Parcial | FE lista con error (FE-001), BE `/exercises` OK |
| IA training plan | No (si tokens 0) | N/A | Sí (PRO) | Sí (PRO) | **Inconsistente** | BE `aiAccessGuard` exige tokens, FE asume gym=IA |
| IA nutrition plan | No (si tokens 0) | Sí (PRO) | N/A | Sí (PRO) | **Inconsistente** | idem |
| Gym join por code | N/A | N/A | N/A | N/A | Sí | BE `POST /gym/join-code` |
| Gym join request + accept/reject | N/A | N/A | N/A | N/A | Sí | BE `/admin/gym-join-requests` |
| Panel admin gyms | Admin only | Admin only | Admin only | Admin only | Admin | FE `/app/admin/gyms`, BE `/admin/gyms` |

Notas:
- “Nutrición Premium”, “Fitness Premium”, “Bundle” no existen como plan persistido hoy. Cualquier tabla por tier adicional es **planeado** (Assunção) hasta que haya schema/endpoint/billing real.
- FE implementa `hasAiEntitlement` como PRO o “in gym” (`src/components/access/aiEntitlements.ts`), pero BE no concede tokens por gym automáticamente (ver 4.2 y 5.2).

---

## 3) Auditoría UX (mobile-first)

### Consistencia tab bar y navegación
- Sidebar y secciones se construyen desde `src/components/layout/navConfig.ts`.  
- Hay distinción “Development section” con collapse en `AppSidebar.tsx`.
- Riesgo: duplicación de rutas trainer PT/ES crea confusión y navegación redundante.

### Estados obligatorios: loading/empty/error/success/disabled
Puntos positivos:
- Hay componentes dedicados: `LoadingState`, `EmptyState`, `ErrorState` usados en Hoy, Trainer, etc.  
Gaps:
- Varios endpoints BFF no capturan errores consistentemente. Ejemplo `/api/auth/me` no envuelve con try/catch (puede lanzar en fetch), mientras otras rutas sí lo hacen. Esto se nota en estados “error” inconsistentes.

### Copy/i18n: inconsistencias
- Uso de i18n server/client (`getServerT`, `useLanguage`) está extendido.  
- Inconsistencia por rutas duplicadas en PT (`/treinador`) y ES (`/trainer`) que pueden divergir en copy.

### 10 fricciones concretas + recomendación
1) Biblioteca rota por duplicados, bloquea descubrir ejercicios. Arreglar FE-001.
2) Gym admin muestra usuarios globales, no “miembros del gym”, confunde y es riesgo legal. Ver GYM-002.
3) Entitlement IA confuso: UI muestra IA disponible por gym, backend puede responder 402. Mostrar gating real por `/api/ai/quota` o `/auth/me`.
4) Onboarding carga usando `useState` como side-effect, puede causar comportamiento raro, doble render, o no ejecutar en algunos escenarios. Pasar a `useEffect`.
5) Respuestas de error de BFF heterogéneas. Normalizar shape `{error, code}` y manejo UI.
6) Duplicación de utilidades de backend URL (`src/lib/backend.ts` y `src/lib/getBackendUrl.ts`). Consolidar.
7) Falta un “no access” consistente al entrar a rutas premium. Hoy hay gating parcial en sidebar, pero deep links pueden fallar con errores.
8) Falta “optimistic save” y confirmación clara en tracking (depende de UI). Añadir toast o estado “guardado”.
9) En móviles, listas largas (biblioteca, recetas) deberían usar paginación real. Ya hay intentos, pero está mezclado.
10) Feed/IA tips: si existe, verificar que muestre estados offline y reintentos. Backend loguea y genera, FE debe reflejar.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

**Frontend (Next App Router)**
- Rutas en `src/app`, BFF en `src/app/api/*`.
- Auth basado en cookie `fs_token`.
- Middleware protege `/app/*`.

**BFF `/api/*`**
- Proxies a backend usando `getBackendUrl()` y reenvío de cookie `fs_token` vía header `cookie`.
- Algunos endpoints usan helper `proxyToBackend` (ejemplo admin gym join requests).

**Backend (Fastify + Prisma + Stripe + OpenAI)**
- Monolito en `src/index.ts` con rutas de:
  - Auth: `/auth/*`
  - Profile: `/profile`
  - Tracking: `/tracking`, `/user-foods`
  - Library: `/exercises`, `/recipes` (existen rutas para recipes más abajo)
  - AI: `/ai/*`
  - Billing: `/billing/*`
  - Gym: `/gyms/*`, `/gym/*`, `/admin/gym-join-requests`, `/admin/gyms/*`
  - Trainer: `/trainer/*`
- DB: Prisma. Plan actual: `FREE|PRO`. GymMembership con roles `ADMIN|TRAINER|MEMBER` y status `PENDING|ACTIVE|REJECTED|REMOVED`.

Zonas sensibles:
- `fs_token`: base de sesión. No romper.  
- BFF: no romper `/api/*`.  
- Reglas y cálculos: backend ya actúa como fuente de verdad para IA, tokens y persistencia.

---

### 4.2 Contratos FE↔BE (mapa)

Resumen de evidencia:
- Se detectaron 61 rutas BFF (`src/app/api/**/route.ts`).
- Backend principal define muchas rutas en `back/src/index.ts`, pero también hay rutas con prefijos registradas (por ejemplo `/gym/me`) que no aparecen en un grep simple de `app.get`.

**Mismatches críticos detectados**
1) FE asume IA habilitada por “Gym membership”.  
   - FE: `src/components/access/aiEntitlements.ts` y `src/lib/userCapabilities.ts` devuelven `hasAi=true` si `membership.state === "in_gym"`.  
   - BE: `aiAccessGuard` exige tokens efectivos (`getEffectiveTokenBalance(user) > 0`), no hay lógica que incremente tokens por gym membership por defecto.  
   Resultado: UI puede mostrar IA accesible y BE responde 402 “UPGRADE_REQUIRED”.  
   Evidencia: `back/src/index.ts` `aiAccessGuard()` y `getEffectiveTokenBalance()`.

2) BFF expone rutas admin que BE no implementa (según lectura del backend actual).
   - BFF presentes:
     - `/api/admin/users/[id]/plan` (proxy a `/admin/users/:id/plan`)
     - `/api/admin/users/[id]/tokens` y derivados
   - Backend: en `back/src/index.ts` sólo se ven `/admin/users`, `/admin/users/:id/verify-email`, `/reset-password`, `/block`, `/unblock`, `/delete`.  
   Resultado: pantallas que dependan de tokens/plan fallarán 404.  
   Evidencia: FE `src/app/api/admin/users/[id]/plan/route.ts` y backend `back/src/index.ts` secciones `/admin/users` sin esas rutas.

3) Gym Admin Members usa endpoint global de usuarios:
   - FE: `GymAdminMembersClient.tsx` llama `/api/admin/users`.  
   - Backend: esto devuelve todos los usuarios, no filtrado por gym.  
   Recomendación: usar `/api/admin/gyms/[gymId]/members`. Ya existe BFF.  
   Evidencia: `src/components/gym/GymAdminMembersClient.tsx` y BFF `src/app/api/admin/gyms/[gymId]/members/route.ts`, BE `/admin/gyms/:gymId/members`.

**Tabla de endpoints (muestra de core)**
(Para no hacer un muro enorme, incluyo el set que impacta MVP y Gym Pilot. El resto puede generarse desde el inventario de BFF).

| FE endpoint (`/api/*`) | Backend target | Estado | Evidencia |
|---|---|---|---|
| `/api/auth/me` | `GET /auth/me` | OK | FE `src/app/api/auth/me/route.ts`, BE `app.get("/auth/me")` |
| `/api/profile` | `GET/PUT /profile` | OK | FE `src/app/api/profile/route.ts`, BE `/profile` |
| `/api/tracking` | `GET/PUT /tracking` | OK | FE `src/app/api/tracking/route.ts`, BE `/tracking` |
| `/api/user-foods` | `GET/POST/PUT/DELETE /user-foods` | OK | FE `src/app/api/user-foods/*`, BE `/user-foods` |
| `/api/exercises` | `GET /exercises` | OK | FE `src/app/api/exercises/route.ts`, BE `/exercises` |
| `/api/ai/training-plan` | `POST /ai/training-plan` | OK (gated) | FE `src/app/api/ai/training-plan/route.ts`, BE `/ai/training-plan` |
| `/api/ai/nutrition-plan` | `POST /ai/nutrition-plan` | OK (gated) | idem |
| `/api/gym/join-code` | `POST /gym/join-code` | OK | FE `src/app/api/gym/join-code/route.ts`, BE `/gym/join-code` |
| `/api/gyms/membership` | `GET /gyms/membership` | OK | FE BFF, BE `app.get("/gyms/membership")` |
| `/api/admin/gym-join-requests` | `GET /admin/gym-join-requests` | OK | BFF `proxyToBackend`, BE ruta admin |
| `/api/admin/gym-join-requests/[id]/accept` | `POST /admin/gym-join-requests/:membershipId/accept` | OK | BFF `proxyToBackend`, BE admin |
| `/api/admin/users/[id]/plan` | `/admin/users/:id/plan` | Missing | No ruta en BE actual |
| `/api/admin/users/[id]/tokens/*` | `/admin/users/:id/tokens/*` | Missing | No ruta en BE actual |

---

### 4.3 IA (assistiva)

**Dónde se usa IA hoy**
- Backend: `/ai/training-plan`, `/ai/nutrition-plan`, `/ai/daily-tip`, `/feed/generate`.  
- Frontend: hay BFF `/api/ai/*` y pantallas de nutrición y entrenamiento lo invocan (por lectura de rutas, confirmar UI exacta requiere ejecución).

**Output JSON estructurado + validación antes de persistir + fallback**
- BE usa Zod y validadores de payload: `parseTrainingPlanPayload`, `parseNutritionPlanPayload`, asserts, normalización de días, y “template fallback” si coincide con presets.  
- Persiste planes en `UserProfile.trainingPlan` y `UserProfile.nutritionPlan` como JSON.  
Evidencia: secciones `/ai/training-plan` y `/ai/nutrition-plan` en `back/src/index.ts`.

**Riesgos (PII/logs) y mitigaciones**
- Riesgo alto: `callOpenAi` loguea `rawResponse` siempre (`app.log.info({ attempt, rawResponse: content }, "ai raw response")`). Esto en producción puede guardar contenido sensible y muy voluminoso.  
  Mitigación: loguear sólo metadata (requestId, tokens, hash) y guardar rawResponse sólo bajo feature flag y con redacción.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica

#### Backend
- `npm ci`: **FAIL** por SIGTERM durante postinstall de `@prisma/engines`.  
  Evidencia (salida):  
  - `npm error path .../node_modules/@prisma/engines`  
  - `npm error signal SIGTERM`  
  - `npm error command sh -c node scripts/postinstall.js`  
  Log: `/home/oai/.npm/_logs/2026-02-15T14_42_44_430Z-debug-0.log`
- `build`: **NO EJECUTADO** (depende de `prisma generate`, bloqueado por engines).  
- `typecheck`: **FAIL** si se omiten scripts, porque prisma client no se genera y faltan exports. Evidencia: `npx tsc --noEmit` reporta `Module '"@prisma/client"' has no exported member 'PrismaClient'`.
- `tests api`: **PASS** para tests que no dependen de Prisma.  
  Evidencia:
  - `npm test` imprime `authUtils tests passed`
  - `npx tsx src/tests/aiParsing.test.ts` imprime `aiParsing tests passed`

#### Frontend
- `npm ci`: **FAIL** por “process terminated” (SIGTERM).  
  Evidencia log: `/home/oai/.npm/_logs/2026-02-15T14_43_15_523Z-debug-0.log` con:
  - `Error: process terminated`
  - `error signal SIGTERM`
  Además intenta `npm audit` y el repo no soporta audit (E404), lo cual añade fricción.  
- `build/lint/test`: **NO EJECUTADOS** porque no se completa instalación.  
  Nota: aunque `npm ci` fallara por entorno, hay un error claro en código de biblioteca que probablemente rompería el build igualmente (FE-001).

Conclusión: Release readiness técnico actual: **FAIL**.

---

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) DoD mínimo
- Login: **PASS** (evidencia FE login server action + BE `/auth/login`).
- `/app` protegido: **PASS** (`src/middleware.ts`).
- Tab bar / navegación app: **PASS parcial** (estructura presente, requiere ejecución para validar estados activos y mobile).
- Hoy + 1 acción: **PASS** (acciones dependen de tracking/profile, con estados loading/empty/error).
- Tracking persistente: **PASS** (BE guarda JSON, FE usa PUT `/api/tracking`).
- Biblioteca lista+detalle: **FAIL** (riesgo extremo por `ExerciseLibraryClient.tsx` con duplicados y mezcla de implementaciones).

B) Entitlements modular (Free vs Nutrición Premium vs Fitness Premium vs Bundle vs Gym)
- **FAIL**: hoy sólo existe `FREE|PRO` en DB. Gym no es tier de billing, es pertenencia. Modularidad por “Nutrition Premium/Fitness Premium” no está soportada por schema ni `/billing/status`.  
  Evidencia: `prisma/schema.prisma` enum `Plan`.

C) Free: métricas básicas + rendimiento + food log con macros/calorías
- Métricas básicas (dashboard/checkins): **PASS**.
- Food log macros/calorías: **PASS** (por gramos, default y user foods).
- Rendimiento: **NO VERIFICADO** por falta de build y profiling (Assunção).

D) Nutrición Premium: plan semanal + lista compra + ajustes + validación IA
- Plan semanal IA + validación: **PASS** (BE).
- Lista compra: **PARCIAL** (no endpoint dedicado, podría derivarse de recetas).
- Ajustes: **PARCIAL** (re-generación sí, ajuste incremental no claro).
- Gating: **PASS** (por tokens) pero **UX inconsistente** si FE muestra IA por gym.

E) Fitness Premium: plan según contexto + ajuste semanal + validación IA
- Generación IA + validación: **PASS** (BE).
- Ajuste semanal: **PARCIAL** (re-generación sí).
- Gating UX: **PARCIAL** por mismatch FE/BE.

F) Gym Pilot: join por aceptación o código + panel admin + asignación de plan template
- Join por código: **PASS**.
- Join por aceptación: **PASS**.
- Panel admin: **PASS parcial** (existe, pero usa lista global de usuarios, no membresía).
- Asignación plan template: **PASS** (endpoint existe, FE lo llama).

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FE-001 | P0 | Frontend / Biblioteca | `ExerciseLibraryClient.tsx` parece tener duplicados y mezcla de dos implementaciones (variables repetidas, lógica duplicada). | Puede romper build y bloquea journey core “biblioteca”. | `src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` (duplicación visible en el archivo). | Limpiar el componente, una sola fuente de estado, paginación consistente y tests básicos. | FE Lead | M |
| FE-002 | P0 | Frontend / Tooling | `npm ci` falla con SIGTERM en el entorno auditado, impide build/lint/test. | Sin pipeline reproducible no hay release confiable. | Log npm: `/home/oai/.npm/_logs/2026-02-15T14_43_15_523Z-debug-0.log`. | Ajustar CI: `--no-audit`, cache, y revisar límites. Asegurar instalación completa y añadir `next build` en CI. | DevOps/FE | M |
| BE-001 | P0 | Backend / Build | `npm ci` falla por SIGTERM en postinstall de `@prisma/engines`. | Backend no buildable/instalable en entorno restringido. | Output npm y log `/home/oai/.npm/_logs/2026-02-15T14_42_44_430Z-debug-0.log`. | Asegurar instalación de Prisma engines (cache binarios, ajustar entorno CI). | DevOps/BE | M |
| ENT-001 | P0 | Entitlements | FE da IA por gym membership, BE exige tokens efectivos, posible 402 en producción. | UX rota, frustración y soporte. | FE `aiEntitlements.ts`, BE `aiAccessGuard` + `getEffectiveTokenBalance`. | Unificar: o gym otorga tokens en BE, o FE consulta `/api/ai/quota` y oculta IA si 0. | PM + BE + FE | S |
| API-001 | P1 | Contratos | BFF define rutas admin tokens/plan pero backend no las implementa. | Pantallas admin fallan 404. | BFF `/api/admin/users/[id]/plan` etc, BE no tiene `/admin/users/:id/plan`. | Eliminar rutas BFF o implementar endpoints BE, mantener coherencia. | BE + FE | M |
| GYM-002 | P1 | Gym Pilot | Gym admin usa `/api/admin/users` (global) en lugar de miembros del gym. | Riesgo privacidad y UX confusa, permisos. | `GymAdminMembersClient.tsx` y existe endpoint BE `/admin/gyms/:gymId/members`. | Cambiar a endpoint de miembros, paginar y filtrar. | FE | S |
| UX-001 | P2 | UX / Onboarding | Onboarding usa `useState` como side effect para cargar perfil. | Bugs intermitentes, doble render o no carga. | `OnboardingClient.tsx`. | Reemplazar por `useEffect` con dependencias correctas. | FE | S |
| AI-LOG-001 | P2 | Seguridad / Observabilidad | `callOpenAi` loguea rawResponse de IA siempre. | PII, ruido de logs, coste. | `back/src/index.ts` función `callOpenAi`. | Log sólo metadata en prod, redacción, feature flag. | BE | S |

---

## 7) Próximos pasos (roadmap)

### Sprint 1 (Goal: “Buildable + MVP core journeys verdes”)
Entra:
- Fix FE-001 biblioteca, añadir test básico o typecheck para ese módulo.
- Ajustar instalación FE (`--no-audit` en CI) y ejecutar `next build` en pipeline.
- Fix Onboarding `useEffect`.
No entra:
- Refactor grande del backend.
Métricas:
- CI green en `npm ci + build` (FE).
- Journey biblioteca lista → detalle completado.
Riesgos:
- Dependencias Next/React en versiones futuras, revisar compatibilidad.

### Sprint 2 (Goal: “Entitlements coherentes y Gym pilot usable”)
Entra:
- Resolver ENT-001: backend concede tokens por gym o FE gatea por cuota real.
- Gym admin usar endpoint de miembros del gym, no users global.
- Remover o implementar endpoints admin tokens/plan (API-001).
Métricas:
- 0 incidencias 402 inesperadas en rutas IA.
- Gym manager puede: ver miembros, aceptar requests, asignar plan.
Riesgos:
- Decisión de producto sobre modelo de negocio “Gym”.

### Sprint 3 (Goal: “Producto vendible a gym pequeño”)
Entra:
- Plantillas de planes asignables (training templates) consistentes, y flujo claro de asignación.
- UX polish mobile: estados, errores y confirmación de guardado en tracking.
- Telemetría mínima: funnels login, onboarding completion, IA usage.
No entra:
- White-label enterprise.
Métricas:
- Activación: % usuarios que completan onboarding y registran 1 checkin o 1 comida.
- Retención semana 1: usuarios con 3 acciones.
Riesgos:
- Ajustar permisos trainer/admin sin romper `/api/*`.

---

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (extracto)
Se detectaron 113 rutas de páginas y 61 rutas BFF. Extracto de core:
- `/login`, `/signup`
- `/app`, `/app/hoy`, `/app/seguimiento`, `/app/biblioteca`, `/app/biblioteca/[exerciseId]`
- `/app/macros`, `/app/nutricion`, `/app/entrenamiento`, `/app/dashboard`, `/app/onboarding`
- `/app/gym`, `/app/gym/admin`
- `/app/trainer`, `/app/trainer/clients`, `/app/trainer/clients/[id]`
- `/app/admin/*`

### 8.2 Lista de feature flags/toggles
No se observó un sistema formal de flags. Hay lógica por entorno:
- `canUseTrainerDemoPreview` en `src/lib/trainerCapability.ts` (solo no producción).

### 8.3 Secretos
No pego secretos. Se observan referencias a `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, etc, gestionadas por env.

---

## Cierre

Hoy hay una base sólida de dominios (auth, profile, tracking, IA, gym) con backend relativamente completo para un piloto. El bloqueo principal para vender a un gym pequeño es la confiabilidad de build y la coherencia de módulos (biblioteca y entitlements). Recomiendo priorizar Sprint 1 y 2 tal como arriba, porque convierten el producto en “demostrable” y “operable” sin inventar features.
