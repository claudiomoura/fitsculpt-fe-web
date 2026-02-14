# Auditoria_FitSculpt_2026-02-14.md
Fecha: 2026-02-14  
Autor/a auditoría: Equipo Senior Staff Architects (auditoría asistida)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa completo y verificable de “qué existe hoy”, gaps del MVP modular, readiness para vender a un gym pequeño.

> Nota de evidencia: todo lo afirmado abajo se apoya en archivos del zip (rutas y line ranges indicados). Cuando no hay prueba en el código, queda marcado como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Estado general: Release-ready = NO**. Hay rutas y módulos admin/coach con contratos rotos o inexistentes, y un punto crítico de configuración de backend URL en billing status. Evidencia: BFF admin tokens apunta a endpoints que no existen en backend, y `billing/status` usa env distinta (ver Sección 4 y Hallazgos).
- **Estado MVP Modular = NO**. El backend solo implementa `SubscriptionPlan { FREE, PRO }` (sin Nutrición Premium/Fitness Premium/Bundle/Gym como tiers separados), por tanto no hay modularidad real por dominio. Evidencia: `prisma/schema.prisma` enum `SubscriptionPlan` (líneas 395-398).
- **Estado Gym Pilot = NO**. No hay modelo `Gym` ni endpoints de join/approval en backend, y el frontend muestra explícitamente “unsupported” cuando devuelve 404/405. Evidencia: `GymJoinRequestsManager.tsx` líneas 59-65 y 124-126, backend no lista rutas `/admin/gym-join-requests*`.
- **Core MVP individual (B2C) está “casi”**: login, /app protegido, tab bar, tracking persistente, biblioteca lista+detalle existen y tienen endpoints. Evidencia: `src/middleware.ts` (protección), `/tracking` GET/PUT en backend, páginas `biblioteca/*`.
- **Top 5 riesgos**
  1) Contratos admin rotos (tokens y cambio de plan) y UI potencialmente inútil para operar usuarios.  
  2) “Trainer/Coach/Gym” no existe en backend, y la lógica de acceso puede bloquear trainer por `gymMembershipState` desconocido.  
  3) Inconsistencia de persistencia de planes (se guardan en tablas y además se duplican dentro del JSON de `profile`).  
  4) `billing/status` usa `NEXT_PUBLIC_API_BASE_URL` en vez de `getBackendUrl`, riesgo de producción si no se configura.  
  5) Se incluye un `.env` con claves sensibles dentro del zip del backend (riesgo serio si esto llega a repo o despliegues).
- **Top 5 quick wins**
  1) Eliminar o arreglar BFF admin tokens y “plan patch” (o implementar endpoints reales en backend).  
  2) Unificar backend URL para billing status usando `getBackendUrl()` (igual que el resto).  
  3) Decidir una sola “fuente de verdad” para Training/Nutrition Plan (ideal: guardar id activo en profile y leer detalle desde tablas).  
  4) Revisar gating de trainer con `gymMembershipState` (no bloquear por `unknown` mientras Gym no exista).  
  5) Eliminar rutas duplicadas o redirigir (`/app/dashboard` vs `/app`), y limpiar duplicados PT/ES (`/treinador` vs `/trainer`).

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

#### 2.1.1 Rutas (pantallas) existentes (Next App Router)
Extraído de `src/app/**/page.tsx` (48 páginas):

**Público/Auth**
- `/` -> `src/app/(public)/page.tsx`
- `/login` -> `src/app/(auth)/login/page.tsx`
- `/register` -> `src/app/(auth)/register/page.tsx`
- `/verify-email` -> `src/app/(auth)/verify-email/page.tsx`

**App (usuario final)**
- `/app` (Dashboard) -> `src/app/(app)/app/page.tsx`
- `/app/hoy` -> `.../hoy/page.tsx`
- `/app/seguimiento` (Tracking + food log) -> `.../seguimiento/page.tsx`
- `/app/biblioteca` -> `.../biblioteca/page.tsx`
  - `/app/biblioteca/{exerciseId}` -> detalle ejercicio
  - `/app/biblioteca/recetas` + `/app/biblioteca/recetas/{recipeId}`
  - `/app/biblioteca/entrenamientos` + `/app/biblioteca/entrenamientos/{planId}`
- `/app/nutricion` (plan semanal, incluye IA) -> `.../nutricion/page.tsx`
- `/app/dietas` (lista planes guardados) + detalle -> `.../dietas/*`
- `/app/macros` -> `.../macros/page.tsx`
- `/app/feed` -> `.../feed/page.tsx`
- `/app/profile` y `/app/profile/legacy`
- `/app/settings` y `/app/settings/billing`
- `/app/onboarding`

**Duplicadas o potencialmente legacy**
- `/app/dashboard` (duplicado de dashboard) -> `src/app/(app)/app/dashboard/page.tsx` (muestra el mismo `DashboardClient`)
- `entrenamiento` y `entrenamientos` (dos árboles de rutas distintas)
- `/app/workouts` además de `/app/entrenamiento(s)/*`

**Dev/Admin/Trainer**
- `/app/admin`, `/app/admin/users`, `/app/admin/gym-requests`, `/app/admin/labs`, `/app/admin/preview`
- `/app/trainer/*` (ES) y también `/app/treinador/*` (PT)

#### 2.1.2 Qué es dev/admin vs usuario final
- La sidebar construye secciones y cierra “development” por defecto: `AppSidebar.tsx` usa `<details open={!isDevelopmentSection}>` (sección dev cerrada por defecto). Evidencia: `src/components/layout/AppSidebar.tsx` líneas 23-57.
- La navegación base para usuario está en `navConfig.ts`:
  - `sidebarUser` contiene hoy, dashboard, tracking, feed, training-plan, biblioteca, nutrición, dietas, macros, perfil, settings. Evidencia: `src/components/layout/navConfig.ts` (por ejemplo líneas 66-103).
  - `sidebarAdmin` y `sidebarDevelopment` agregan rutas admin/trainer/dev. Evidencia: `navConfig.ts` líneas 105-180 (aprox).
- Importante: la protección real de permisos no está en server components, sino en client (por ejemplo AdminDashboardClient). Evidencia: `AdminDashboardClient.tsx` muestra `unauthorized` si no admin.

#### 2.1.3 Callejones sin salida detectados
- **Gym requests (admin)** está “placeholder real” (no fake), devuelve “requires implementation” si 404/405. Evidencia: `GymJoinRequestsManager.tsx` líneas 59-65 y 124-126.
- **Rutas duplicadas** (`/app` y `/app/dashboard`), y duplicados PT/ES (`/trainer` y `/treinador`) elevan confusión y mantenimiento (no es un “dead end” funcional, pero sí una trampa UX/arquitectura).
- **Trainer real para gym**: hoy no existe backend para gym, por tanto el “trainer” es esencialmente dev/admin preview.

---

### 2.2 Flujos end-to-end (journeys)

> Nota: “confirmar persistencia” se valida por existencia de endpoints y modelos Prisma, no por ejecución runtime dentro de este sandbox. Donde pude ejecutar pruebas reales, lo indico.

#### Login + acceso a `/app` protegido
1) Usuario va a `/login` (`src/app/(auth)/login/page.tsx`).
2) Submit ejecuta Server Action `loginAction` (`src/app/(auth)/login/actions.ts`) que hace `POST ${BACKEND}/auth/login`.
3) Backend responde y la action setea cookie `fs_token` en Next (`cookies().set("fs_token", token, ...)`). Evidencia: `actions.ts` líneas 10-45.
4) Middleware protege `/app/*` verificando cookie `fs_token`. Evidencia: `src/middleware.ts` líneas 6-23.

Resultado esperado:
- Sin cookie, redirige a `/login?next=/app/...`.
- Con cookie, permite entrar.

#### Hoy + 1 acción rápida
1) Ir a `/app/hoy` (`.../hoy/page.tsx`) muestra `TodayQuickActionsClient`.
2) `TodayQuickActionsClient` carga `/api/tracking` y `/api/profile`. Evidencia: `TodayQuickActionsClient.tsx` líneas 33-70.
3) Acciones rápidas:
   - “Añadir comida” navega a `/app/seguimiento?focus=food`.
   - “Registrar entrenamiento” navega a `/app/seguimiento?focus=workout`.
   - “Generar plan” navega a `/app/entrenamiento?ai=1` o `/app/nutricion?ai=1` según disponibilidad.

Resultado esperado:
- Si `tracking` carga ok, muestra resumen.
- Si el perfil no tiene `trainingPlan/nutritionPlan` guardado en profile JSON, marca como “not ready”.

Gap:
- `GET /profile` en backend retorna `profile.profile` (JSON) y no agrega datos de tablas (TrainingPlan/NutritionPlan). El “ready” depende de que el frontend haya guardado plan dentro del profile JSON. Evidencia: backend `/profile` (index.ts líneas 4024-4033) y `profileService` en FE.

#### Biblioteca: lista → detalle
- Ejercicios:
  1) `/app/biblioteca` usa `ExerciseLibraryClient` que llama `/api/exercises` y muestra grid. Evidencia: `ExerciseLibraryClient.tsx`.
  2) Click en un ejercicio navega a `/app/biblioteca/{exerciseId}` (server component) que fetch a `GET /api/exercises/{id}`. Evidencia: `biblioteca/[exerciseId]/page.tsx`.

- Recetas:
  1) `/app/biblioteca/recetas` lista con `/api/recipes`.
  2) Detalle receta hace fetch directo a backend `/recipes/{id}` con cookie. Evidencia: `biblioteca/recetas/[recipeId]/page.tsx`.

- Entrenamientos (planes):
  1) `/app/biblioteca/entrenamientos` lista con `/api/training-plans`.
  2) Detalle hace fetch directo a backend `/training-plans/{id}` con cookie. Evidencia: `biblioteca/entrenamientos/[planId]/page.tsx`.

Resultado esperado:
- Listas y detalle funcionan si hay datos.
- Crear planes desde biblioteca no existe como feature (solo lectura).

#### Tracking: crear 1 registro y confirmar persistencia
1) `/app/seguimiento` usa `TrackingClient`.
2) Carga `/api/tracking` y permite:
   - Check-in (peso/medidas)
   - Food log por gramos
   - Workout log
3) Guarda con `PUT /api/tracking` y backend persiste en `UserTracking.tracking` (JSON). Evidencia backend: rutas `GET /tracking` y `PUT /tracking` (index.ts líneas 4171-4189), schema `trackingSchema` (index.ts líneas 848-858).

Resultado esperado:
- Tras guardar, recargando vuelve a mostrar datos (persistencia en DB).

#### Food log: registrar ítems por gramos y ver macros/calorías
- Existe:
  - CRUD de “user foods” en backend (`/user-foods` GET/POST/PUT/DELETE). Evidencia: backend index.ts líneas 4229-4277.
  - FE usa `/api/user-foods` y registra `foodLog` entries con `grams`. Evidencia: `TrackingClient.tsx` y schemas FE/BE.

Resultado esperado:
- Al añadir un alimento con gramos, se calcula aporte (según macros por 100g) y suma totales diarios.
- Persistencia: `tracking.foodLog` guarda `{foodKey, grams, date}`.

#### Onboarding (si existe)
- Existe `/app/onboarding` con `OnboardingClient` que recopila datos del perfil y hace `PUT /api/profile`. Evidencia: `OnboardingClient.tsx`.

Resultado esperado:
- Completar onboarding permite que AI endpoints no fallen con `PROFILE_INCOMPLETE` (backend exige perfil completo para IA). Evidencia backend: `requireCompleteProfile` (index.ts líneas 799-815) y uso en `/ai/*`.

#### Dashboard semanal (si existe)
- Existe dashboard en `/app` y duplicado `/app/dashboard`, ambos usan `DashboardClient`.
- `DashboardClient` intenta `/api/ai/weekly-summary`, pero no existe un route handler en `src/app/api/ai/weekly-summary`. Evidencia: `DashboardClient.tsx` maneja missing.
Resultado esperado:
- Muestra métricas no-AI, y la parte AI semanal queda desactivada o no aparece si 404.

#### IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)
- Generación IA nutrición existe en backend: `POST /ai/nutrition-plan` con validación (Zod + JSON schema) y persistencia en tablas `NutritionPlan/NutritionDay/...`. Evidencia: backend index.ts ruta 4505 y modelo prisma.
- FE: `NutritionPlanClient` llama `/api/ai/nutrition-plan` y luego guarda plan también dentro de `profile` JSON: `updateUserProfile({ nutritionPlan: planToSave })`. Evidencia: `NutritionPlanClient.tsx` líneas 1191-1208.
- Lista de compra: **no encontré evidencia clara de “shopping list” estructurada** en FE/BE. En el backend hay modelos de ingredientes, pero no un endpoint “shopping list”. Esto queda como **Assunção: no implementado**.

#### IA Fitness: generar plan + ajuste semanal (si existe)
- Generación IA fitness existe en backend: `POST /ai/training-plan` (index.ts 4318) con JSON schema y persistencia en tablas `TrainingPlan/...`.
- FE: `requestAiTrainingPlan` llama `/api/ai/training-plan` y además guarda plan en `profile` JSON (`saveAiTrainingPlan`). Evidencia: `aiPlanGeneration.ts` líneas 99-162.
- Ajuste semanal: hay lógica FE `trainingPlanAdjustment.ts` que reusa el mismo endpoint y guarda de nuevo (no hay endpoint dedicado). Evidencia: `src/lib/trainingPlanAdjustment.ts`.

#### Gym Pilot: usuario se une a gym + admin gestiona + asigna plan (si existe)
- **No existe en backend**: no hay modelos `Gym`, ni endpoints join/approval.
- FE muestra un manager que asume endpoints `/api/admin/gym-join-requests*`, y marca “unsupported” si 404/405. Evidencia: `GymJoinRequestsManager.tsx`.

---

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

> Hecho: hoy el backend tiene **FREE/PRO** (y tokens IA), no hay separación real por “nutrición vs fitness” ni “bundle” ni “gym”. Evidencia: `schema.prisma` enum `SubscriptionPlan` (FREE, PRO).

Tabla (lo pedido vs lo real):

| Feature | Free (real) | Nutrición Premium (pedido) | Fitness Premium (pedido) | Bundle (pedido) | Gym (pedido) | Evidencia actual |
|---|---:|---:|---:|---:|---:|---|
| Login + /app protegido | ✅ | ✅ | ✅ | ✅ | ✅ | `middleware.ts`, `/auth/login` |
| Tracking (check-in) | ✅ | ✅ | ✅ | ✅ | ✅ | `/tracking` GET/PUT |
| Food log gramos + macros | ✅ | ✅ | ✅ | ✅ | ✅ | `/user-foods`, `tracking.foodLog` |
| Biblioteca ejercicios/recetas | ✅ | ✅ | ✅ | ✅ | ✅ | `/exercises`, `/recipes` |
| Generar plan Nutrición IA | ❌ (tokens) | ✅ (si PRO) | N/A | ✅ | ✅ | `/ai/nutrition-plan` + guard tokens |
| Generar plan Fitness IA | ❌ (tokens) | N/A | ✅ (si PRO) | ✅ | ✅ | `/ai/training-plan` |
| Feed + daily tip IA | ❌ (tokens) | ✅ (si PRO) | ✅ (si PRO) | ✅ | ✅ | `/feed/generate`, `/ai/daily-tip` |
| Admin users | Solo Admin | Solo Admin | Solo Admin | Solo Admin | Solo Admin | `/admin/users` |
| Gym join + panel admin | ❌ | ❌ | ❌ | ❌ | ❌ | placeholder FE, sin BE |

Notas:
- El FE define `EntitlementTier = "FREE" | "PRO" | "GYM"` pero backend no produce `GYM`. Evidencia FE: `src/lib/entitlements.ts`.
- La IA en backend se controla por “token balance efectivo” y cuota diaria, no solo por `plan`. Evidencia: `aiAccessGuard` (index.ts líneas 792-801) y `getEffectiveTokenBalance` (index.ts 1093+).

---

## 3) Auditoría UX (mobile-first)

### Consistencia tab bar y navegación
- Existe `MobileTabBar` y usa `mainTabsMobile` de `navConfig.ts`. Evidencia: `src/components/layout/MobileTabBar.tsx`.
- Sidebar usa `<details>` y abre todas las secciones excepto development. Esto es correcto para usuario final, pero puede saturar en pantallas pequeñas.

Recomendación:
- En mobile, priorizar tab bar y minimizar sidebar, con un “More” para perfil/settings y dejar “sections” en desktop.

### Estados obligatorios (loading/empty/error/success/disabled)
Encontrado:
- Varias pantallas gestionan `loading/error/empty` (por ejemplo `DietPlansClient.tsx`, `FeedClient.tsx`, `AdminDashboardClient.tsx`).
- Para features no implementadas (Gym) se usa un estado “unsupported” real, esto cumple la regla de “nada fake”. Evidencia: `GymJoinRequestsManager.tsx`.

Gaps:
- Éxito consistente (toasts) es irregular. Algunas pantallas usan `setSaveMessage` con timeout, otras no.
- En errores de red, muchas pantallas muestran un `<p className="muted">` sin CTA de retry, excepto algunos casos (Gym manager sí ofrece retry).

### Copy/i18n: inconsistencias
- Solo hay `en.json` y `es.json` en `src/messages`. Evidencia: `src/messages/en.json`, `src/messages/es.json`.
- Hay rutas y carpetas PT (`/treinador`, `novo`, `exercicios`) conviviendo con ES. Esto rompe consistencia mental del producto y hace más difícil i18n real.

### 10 fricciones concretas y recomendación
1) Duplicidad dashboard (`/app` y `/app/dashboard`).  
   - Reco: redirigir una a la otra, o eliminar `/app/dashboard`.
2) Duplicidad training: `entrenamiento`, `entrenamientos`, `workouts`.  
   - Reco: una sola IA/plan y un solo “workouts” con nombres consistentes.
3) Duplicidad trainer ES/PT (`/trainer` vs `/treinador`).  
   - Reco: eliminar una variante (ideal: solo `/trainer`) y mapear a i18n via copy, no via rutas.
4) Gating trainer dependiente de `gymMembershipState` que hoy es `unknown`, puede bloquear sin necesidad.  
   - Reco: mientras no exista gym, no bloquear por `unknown`.
5) Admin: hay botones o secciones que intentan endpoints inexistentes (tokens/plan), genera frustración.  
   - Reco: ocultar UI hasta que endpoint exista (cumplir regla obligatoria).
6) `billing/status` usa env distinta (`NEXT_PUBLIC_API_BASE_URL`), riesgo de “pantalla billing rota”.  
   - Reco: unificar con `getBackendUrl()`.
7) IA: planes se guardan también dentro de `profile` JSON, puede crecer y afectar performance/costos.  
   - Reco: guardar solo `activePlanId` y leer plan completo desde tabla.
8) Feedback de “perfil incompleto”: AI endpoints devuelven `PROFILE_INCOMPLETE` (409), pero UX podría guiar mejor.  
   - Reco: interceptar 409 y navegar a onboarding con next param (en parte ya se hace en nutrición).
9) Estados de carga en listas grandes (ejercicios) sin skeleton, solo texto.  
   - Reco: skeleton cards en mobile.
10) Accesibilidad: tab bar iconos ok, pero algunos botones no tienen `aria-live` para mensajes de éxito/error.  
   - Reco: usar un componente de toast accesible.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

**Frontend**
- Next App Router, rutas en `src/app`.
- Protección de sesión por cookie `fs_token` en middleware (`src/middleware.ts`).
- BFF: route handlers `src/app/api/**/route.ts` que proxyean a backend y reinyectan cookie.
- Algunos server components fetch directo al backend (por ejemplo detalle receta y plan). Evidencia: `biblioteca/recetas/[recipeId]/page.tsx` y `biblioteca/entrenamientos/[planId]/page.tsx`.

**Backend**
- Fastify en un único archivo grande: `src/index.ts`.
- Auth por JWT en cookie `fs_token`. Evidencia: `cookieName: "fs_token"` (index.ts línea 93) y `reply.setCookie("fs_token"...` (index.ts ~3445 y ~4018).
- Persistencia Prisma, schema en `prisma/schema.prisma`.
- Dominios implementados:
  - Auth/Profile/Tracking/UserFoods/Library (exercises/recipes)/AI/Billing/Admin/Workouts/Feed.

**Zonas sensibles**
- Cookie `fs_token` y su forwarding en BFF.
- BFF `/api/*` como contrato estable para FE (regla del repo).
- Billing endpoints (Stripe) y AI token accounting.
- Perfil completo requerido para IA.

### 4.2 Contratos FE↔BE (mapa)

> Importante: el FE tiene 44 route handlers en `src/app/api`. Comparando contra rutas reales del backend (54 rutas en `src/index.ts`), hay **mismatches reales** en Admin (tokens y cambio plan).  
> Ojo: algunos “missing” automáticos eran falsos positivos por querystrings, aquí solo marco lo verificado manualmente.

Tabla resumida (principales):

| BFF `/api/*` | Backend real | Método | Estado | Evidencia |
|---|---|---:|---|---|
| `/api/tracking` | `/tracking` | GET/PUT | OK | backend index.ts 4171/4181 |
| `/api/tracking/[collection]/[id]` | `/tracking/:collection/:id` | DELETE | OK | backend index.ts 4207 |
| `/api/profile` | `/profile` | GET/PUT | OK | backend index.ts 4024/4034 |
| `/api/user-foods` | `/user-foods` | GET/POST | OK | backend index.ts 4229/4242 |
| `/api/user-foods/[id]` | `/user-foods/:id` | PUT/DELETE | OK | backend index.ts 4258/4277 |
| `/api/exercises` | `/exercises` | GET | OK | backend index.ts 5031 |
| `/api/exercises/[id]` | `/exercises/:id` | GET | OK | backend index.ts 5042 |
| `/api/recipes` | `/recipes` | GET | OK | backend index.ts 5056 |
| `/api/recipes/[id]` | `/recipes/:id` | GET | OK | backend index.ts 5079 |
| `/api/training-plans` | `/training-plans` | GET | OK | backend index.ts 5096 |
| `/api/training-plans/[id]` | `/training-plans/:id` | GET | OK | backend index.ts 5132 |
| `/api/nutrition-plans` | `/nutrition-plans` | GET | OK | backend index.ts 5156 |
| `/api/nutrition-plans/[id]` | `/nutrition-plans/:id` | GET | OK | backend index.ts 5190 |
| `/api/workouts` | `/workouts` | GET/POST | OK | backend index.ts 5216/5229 |
| `/api/workouts/[id]` | `/workouts/:id` | GET/PATCH/DELETE | OK | backend index.ts 5262/5280/5328 |
| `/api/workouts/[id]/start` | `/workouts/:id/start` | POST | OK | backend index.ts 5345 |
| `/api/workout-sessions/[id]` | `/workout-sessions/:id` | PATCH | OK | backend index.ts 5367 |
| `/api/workout-sessions/[id]/finish` | `/workout-sessions/:id/finish` | POST | OK | backend index.ts 5399 |
| `/api/feed` | `/feed` | GET | OK | backend index.ts 4895 |
| `/api/feed/generate` | `/feed/generate` | POST | OK | backend index.ts 4911 |
| `/api/ai/training-plan` | `/ai/training-plan` | POST | OK | backend index.ts 4318 |
| `/api/ai/nutrition-plan` | `/ai/nutrition-plan` | POST | OK | backend index.ts 4505 |
| `/api/ai/daily-tip` | `/ai/daily-tip` | POST | OK | backend index.ts 4774 |
| `/api/billing/checkout` | `/billing/checkout` | POST | OK | backend index.ts 3520 |
| `/api/billing/portal` | `/billing/portal` | POST | OK | backend index.ts 3606 |
| `/api/billing/status` | `/billing/status` | GET | **Riesgo de config** | FE usa `NEXT_PUBLIC_API_BASE_URL` (route.ts líneas 11-16) en vez de `getBackendUrl()` |

**Mismatches verificados (rompen UX real)**
- `/api/admin/users/[id]/tokens/*` apunta a:
  - `/admin/users/:id/tokens/balance`
  - `/admin/users/:id/tokens/add`
  - `/admin/users/:id/tokens-allowance`
  - `/admin/users/:id/tokens`
  Ninguno existe en backend. Evidencia: FE `route.ts` (por ej `tokens/balance` línea 12) y backend listado de rutas admin en index.ts 5429+ (no aparece tokens).
- `/api/admin/users/[id]/plan` apunta a `/admin/users/:id/plan`, **no existe** en backend. Evidencia: FE `src/app/api/admin/users/[id]/plan/route.ts` y backend no tiene esa ruta.
- Gym join requests: FE espera `/api/admin/gym-join-requests*`, no existe route handler ni backend. Evidencia: `GymJoinRequestsManager.tsx`.

### 4.3 IA (assistiva)

**Dónde se usa IA hoy**
- Training plan: `POST /ai/training-plan` (BE) y FE `/app/entrenamiento` (`TrainingPlanClient` + `aiPlanGeneration.ts`).
- Nutrition plan: `POST /ai/nutrition-plan` y FE `/app/nutricion` (`NutritionPlanClient`).
- Daily tip: `POST /ai/daily-tip` y FE `/app/feed` (`FeedClient`).
- Feed generate: `POST /feed/generate` (no es IA, es un resumen server-side, pero se comporta como “contenido generado”).

**Output JSON estructurado + validación + fallback**
- Backend usa `json_schema` estricto con modelo `gpt-4o-mini` para training plan (ver index.ts 4388-4397) y valida con Zod (parse y asserts).
- Tiene fallback por “template” si se puede construir (`buildTrainingTemplate`). Evidencia: index.ts 4336-4347.
- Cache: `getCachedAiPayload` y revalidación antes de usar. Evidencia: index.ts 4349-4365.

**Riesgos (PII/logs) y mitigaciones**
- Se almacenan contenidos AI en BD (`storeAiContent`, `safeStoreAiContent`), hay riesgo de incluir PII del usuario si prompts lo contienen. Mitigación recomendada:
  - Redactar campos sensibles antes de persistir logs/contenido (o guardar solo metadatos).
- Logging de cookie: la función `logAuthCookieDebug` no imprime token completo, solo flags (ok). Evidencia: index.ts 440-466.
- Control de cuota: `enforceAiQuota` y `AI_DAILY_LIMIT_*` en `.env`. Recomendación: exponer `/ai/quota` en UI para transparencias.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica

**Commit hash auditado**
- **No disponible**: los zips no incluyen `.git`. **Assunção**: audit sobre snapshot del zip recibido.

**Entorno**
- Node en sandbox: `v22.16.0`, npm `10.9.2` (observado al intentar ejecutar installs).
- Backend incluye `dist/` ya compilado.

**build web / lint web / tests web**
- No pude ejecutar un pipeline completo en este sandbox por limitaciones de instalación/ejecución de dependencias (la instalación crea y luego desaparece en este entorno). Evidencia directa de fallo previo:
  - `npm run lint` devolvió `sh: 1: eslint: not found` (observado durante la auditoría).
- Sí existe suite de tests FE (`src/test/*.test.*`), pero no se ejecutó aquí.

**tests api**
- Se pudieron ejecutar tests compilados del backend (sin dependencias externas):
  - `node dist/tests/aiParsing.test.js` -> **PASS** (“aiParsing tests passed”).
  - `node dist/tests/authUtils.test.js` -> **PASS** (“authUtils tests passed”).

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) DoD mínimo (login, /app protegido, tab bar, Hoy+1 acción, tracking persistente, biblioteca lista+detalle)
- Login: **PASS** (server action + `/auth/login`). Evidencia: `login/actions.ts`, backend `/auth/login`.
- `/app` protegido: **PASS**. Evidencia: `src/middleware.ts`.
- Tab bar: **PASS**. Evidencia: `MobileTabBar.tsx`.
- Hoy + 1 acción: **PASS** (navega a tracking/plan). Evidencia: `TodayQuickActionsClient.tsx`.
- Tracking persistente: **PASS** (GET/PUT `/tracking`). Evidencia: backend index.ts 4171/4181.
- Biblioteca lista+detalle: **PASS** (ejercicios/recetas/planes). Evidencia: páginas `biblioteca/*` y endpoints `/exercises`, `/recipes`, `/training-plans`.

B) Entitlements modular (Free vs Nutrición Premium vs Fitness Premium vs Bundle vs Gym)
- **FAIL**: no existen tiers separados, solo FREE/PRO. Evidencia: `schema.prisma` enum `SubscriptionPlan`.

C) Free: métricas básicas + rendimiento + food log macros/calorías
- Métricas básicas: **PASS parcial** (dashboard y tracking). Rendimiento no medido aquí. **Assunção** sobre performance real.
- Food log macros/calorías: **PASS**. Evidencia: `/user-foods`, `tracking.foodLog`.

D) Nutrición Premium: plan semanal + lista compra + ajustes + validación IA
- Plan semanal IA: **PASS** (endpoint + UI). Evidencia: `/ai/nutrition-plan`, `NutritionPlanClient`.
- Lista compra: **FAIL (no evidencia)** de endpoint/pantalla específica.
- Ajustes: **PASS parcial** (se puede regenerar, no vi “adjust” dedicado).
- Validación IA: **PASS** (Zod + JSON schema en BE).

E) Fitness Premium: plan según contexto + ajuste semanal + validación IA
- Plan IA: **PASS** (endpoint + UI).
- Ajuste semanal: **PASS parcial** (reusa mismo endpoint, FE tiene helpers).
- Validación IA: **PASS** (JSON schema + asserts).

F) Gym Pilot: join por aceptación o código + panel admin + asignación de plan template
- **FAIL**: no hay backend, FE marca unsupported. Evidencia: `GymJoinRequestsManager.tsx`.

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-001 | P0 | Seguridad | `.env` con secretos incluido en backend zip | Riesgo grave si se comitea o se distribuye | `Back/.env` presente (variables JWT/Stripe/OpenAI/Google) | Eliminar `.env` del repo y distribuir solo `.env.example`, rotar credenciales | Backend + DevOps | S |
| FS-002 | P0 | Contratos Admin | BFF admin tokens apunta a endpoints inexistentes | Admin UI rota, imposible gestionar tokens | FE `src/app/api/admin/users/[id]/tokens/*`, backend no tiene rutas | O bien implementar endpoints reales en backend, o esconder UI y borrar BFF | Backend + Frontend | M |
| FS-003 | P0 | Contratos Admin | BFF `/admin/users/:id/plan` no existe en backend | No se puede cambiar plan en admin | FE `.../plan/route.ts`, backend rutas admin no incluyen `/plan` | Definir endpoint oficial para cambiar plan, o quitar feature del UI | Backend | M |
| FS-004 | P1 | Billing/Config | `/api/billing/status` usa `NEXT_PUBLIC_API_BASE_URL` distinto a `getBackendUrl` | En prod puede apuntar al host equivocado y romper gating | FE `billing/status/route.ts` línea 12 | Cambiar a `getBackendUrl()` y estandarizar env vars | Frontend | S |
| FS-005 | P1 | Producto (MVP modular) | No hay tiers por módulo (solo FREE/PRO) | No se puede vender modular (nutrición/fitness/bundle) | `schema.prisma` SubscriptionPlan FREE/PRO | Diseñar entitlements por features, reflejarlo en BE y billing | PM + Backend | L |
| FS-006 | P1 | Gym/Trainer | Backend no soporta roles coach/gym, FE espera trainer/coach y membership | Trainer/Gym pilot bloqueado | `schema.prisma` Role USER/ADMIN, FE `roles.ts` tokens trainer, `roleAccess.ts` línea 32 | Alinear modelo de roles y membership, o desactivar gating hasta implementar | Backend + Frontend | M |
| FS-007 | P1 | Datos | Planes AI se persisten en tablas y además se duplican en `profile` JSON | Inconsistencia, payload grande, migraciones difíciles | BE `saveTrainingPlan` y FE `updateUserProfile({trainingPlan})` | Guardar solo `activePlanId` en profile y cargar detalle desde tablas | Backend + Frontend | M |
| FS-008 | P2 | UX | Duplicidad de rutas (dashboard, trainer ES/PT, entrenamiento(s)/workouts) | Confusión para usuarios y devs, más bugs | Árbol de rutas (Sección 2.1.1) | Consolidar rutas, redirecciones y limpieza de legacy | Frontend | M |
| FS-009 | P2 | UX | Estados de éxito/error inconsistentes (toasts, retry) | Menos claridad y confianza | Varios clients usan `<p className="muted">` sin CTA | Componente estándar de “Banner + Retry + Toast” | Frontend | M |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1 (Apuesta: “Release Candidate Hardening”)
**Goal:** cero enlaces rotos, contratos FE/BE consistentes para core y admin mínimo.  
**Entra:**
- FS-002, FS-003, FS-004, FS-008 (limpieza mínima), ocultar UI incompleta (cumplir regla).
- Redirección `/app/dashboard` -> `/app`.
- Unificar env backend URL.
**No entra:** gym pilot, modular tiers completos.
**Métricas:**
- 0 llamadas a endpoints inexistentes desde FE.
- 0 pantallas accesibles para usuario final con “unsupported” salvo explicitamente admin/dev.
**Riesgos/dependencias:** decisiones de producto sobre tokens/plan admin.

### Sprint 2 (Apuesta: “MVP Modular real (Nutrición vs Fitness)”)
**Goal:** vender modularidad a B2C y preparar base para gym.  
**Entra:**
- Nuevo modelo de entitlements por feature en backend (no inventar en FE).
- Billing: mapping Stripe -> entitlements (nutrición premium, fitness premium, bundle).
- UI gating basado en `/auth/me` (extender payload con capabilities reales).
**No entra:** multi-tenant gym completo.
**Métricas:**
- Conversión upgrade por módulo.
- Reducción de soporte por “feature locked”.
**Riesgos:** migración de suscripciones actuales PRO.

### Sprint 3 (Apuesta: “Gym Pilot mínimo vendible a gym pequeño”)
**Goal:** onboarding de gym por código, admin aprueba, asigna plan template.  
**Entra (mínimo):**
- Modelos BE: `Gym`, `GymMember`, `GymInvite` (o join request) y roles.
- Endpoints `/gym/join`, `/admin/gym-join-requests`, `/admin/gym-members`, `/trainer/assign-plan`.
- UI: flujo join + panel admin real, eliminar placeholder.
**Métricas:**
- Tiempo de activación del gym (desde código a primer plan asignado).
- Retención semanal de miembros.
**Dependencias:** decisiones de pricing y “quién paga” (gym vs usuario).

---

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (extracto)
- Público: `/`, `/login`, `/register`, `/verify-email`
- App core: `/app`, `/app/hoy`, `/app/seguimiento`, `/app/biblioteca/*`, `/app/nutricion`, `/app/dietas/*`, `/app/macros`, `/app/feed`, `/app/profile`, `/app/settings`, `/app/onboarding`
- Admin/dev: `/app/admin/*`, `/app/trainer/*`, `/app/treinador/*`
- Duplicados: `/app/dashboard`, `entrenamiento(s)`, `workouts`

### 8.2 Feature flags / toggles detectados
- Entitlements UI: `getUiEntitlements()` basado en `subscriptionPlan` (FE `src/lib/entitlements.ts`).
- Role access: `canAccessAdmin/canAccessTrainer/canAccessDevelopment` (FE `src/config/roleAccess.ts`).
- Gym membership gating (FE `src/lib/gymMembership.ts` + `roleAccess.ts`).
- Backend AI quotas via env `AI_DAILY_LIMIT_FREE/PRO`, endpoint `/ai/quota`.

### 8.3 Secretos
- Detectado `.env` en backend zip con múltiples claves (JWT, Stripe, OpenAI, Google, email). No se incluyen valores en este documento (seguridad). Recomendación: remover y rotar.

---
Fin del documento.
