# Auditoria_FitSculpt_2026-02-18.md
Fecha: 2026-02-18  
Autor/a auditoría: GPT-5.2 Thinking (Senior Staff Architects)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa completo y verificable de “qué existe hoy” + gaps del MVP modular + readiness para vender a un gym pequeño.

> Nota de evidencia: todo lo afirmado abajo referencia archivos del zip (rutas + líneas). Cuando no hay prueba directa en el código, queda marcado como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Release-ready = NO.** Hay mismatches críticos en contratos FE↔BE (ej. “leave gym” implementado en BFF pero no existe en backend), y el Gym Pilot no cierra el loop admin→aceptación→miembros activos de forma consistente. Evidencia: FE define `DELETE /api/gyms/membership` pero BE no tiene `DELETE /gyms/membership` (solo GET). Ver: `front/src/app/api/gyms/membership/route.ts` L1-L9 y `back/src/index.ts` L6400.
- **MVP modular = PARCIAL, NO vendible como modular todavía.** Backend modela planes `FREE | STRENGTH_AI | NUTRI_AI | PRO`, pero el esquema “legacy” reduce a `FREE/PRO`, y no existe “Bundle” independiente ni plan/tier “Gym”. Evidencia: `back/prisma/schema.prisma` enum `SubscriptionPlan` L437-L442 y `back/src/entitlements.ts` L1-L95.
- **Gym Pilot = PARCIAL, NO.** Existen endpoints para join request, listado y aceptar/rechazar, crear gyms y listar miembros. Pero FE muestra capacidades que no existen (leave), y hay señales de parsing defensivo por contratos inconsistentes. Evidencia: BE `GET /admin/gym-join-requests`, `POST accept/reject`, `GET /admin/gyms/:gymId/members` en `back/src/index.ts` L6445-L6596; FE parsing defensivo en `front/src/services/gym.ts` (ver `parseMembership`, `parseGymList`, `parseJoinRequestList`).
- **Top 5 riesgos (bloqueantes):**
  1) Contratos inconsistentes Gym (membership/join/leave) rompen UX y paneles. Evidencia: FE inventario `gymEndpointInventory` declara `DELETE /api/gyms/membership` como existente, pero BE no lo implementa. `front/src/services/gym.ts` L34-L68 y `back/src/index.ts` L6400.
  2) Entitlements: FE/UX puede mostrar precios o accesos no alineados con `EffectiveEntitlements` del backend, especialmente si UI usa “legacy tier” o tokens ambiguos. Evidencia: `back/src/entitlements.ts` L1-L95 y `/auth/me` devuelve `subscriptionPlan`, `plan`, `entitlements`. `back/src/index.ts` L4115-L4155.
  3) IA: gating por tokens + plan es correcto en BE (402 UPGRADE_REQUIRED), pero el producto depende de que FE maneje bien 402/429 y errores de parsing, si no se degrada a “pantalla rota”. Evidencia: `back/src/index.ts` `aiAccessGuard` L917-L948 y `handleRequestError` L120-L170.
  4) Almacenamiento tracking en JSON (UserProfile.tracking) sin esquema versionado por colección, riesgo de corrupción silenciosa, migraciones dolorosas y queries limitadas. Evidencia: `back/prisma/schema.prisma` `UserProfile.tracking Json?` L69-L78 y tracking schemas en `back/src/index.ts` L950-L1015.
  5) “God file” backend: casi toda la API vive en `back/src/index.ts` (7000+ líneas), alta fricción para cambios, testabilidad y ownership. Evidencia: `back/src/index.ts`.
- **Top 5 quick wins (alta palanca, bajo coste):**
  1) Cerrar contrato de Gym: eliminar “leave” del FE o implementar BE `DELETE /gyms/membership` con semántica clara y actualizar UI. Evidencia mismatch arriba.
  2) Unificar payloads de Gym (lista, membership, join-requests) para que FE deje de “adivinar” (`parseMembership`, `parseGymList`). Reducirá bugs y soporte.
  3) Entitlements: acordar un solo modelo en FE basado en `entitlements.modules.*` y no en heurísticas o “legacy tier”.
  4) UX: normalizar estados loading/empty/error y bloquear acciones cuando hay `PENDING`. Ya hay componentes `EmptyState/ErrorState/Skeleton`, falta consistencia en pantallas.
  5) Backend modularización mínima: extraer módulos (auth, billing, gyms, plans) en archivos/routers, manteniendo contratos. No rompe runtime y mejora velocidad de equipo.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

**Rutas principales (Next App Router):**

- Público:
  - `/` (landing): `front/src/app/(public)/page.tsx`
- Auth:
  - `/login`: `front/src/app/(auth)/login/page.tsx`
  - `/register`: `front/src/app/(auth)/register/page.tsx`
  - `/verify-email`: `front/src/app/(auth)/verify-email/page.tsx`
- App protegida (prefijo `/app`, protegida por middleware):
  - `/app` (home): `front/src/app/(app)/app/page.tsx`
  - `/app/hoy`: `front/src/app/(app)/app/hoy/page.tsx`
  - `/app/biblioteca`: `front/src/app/(app)/app/biblioteca/page.tsx`
  - `/app/seguimiento`: `front/src/app/(app)/app/seguimiento/page.tsx`
  - `/app/nutricion`: `front/src/app/(app)/app/nutricion/page.tsx`
  - `/app/macros`: `front/src/app/(app)/app/macros/page.tsx`
  - `/app/dietas`: `front/src/app/(app)/app/dietas/page.tsx`
  - `/app/entrenamiento`: `front/src/app/(app)/app/entrenamiento/page.tsx`
  - `/app/entrenamientos`: `front/src/app/(app)/app/entrenamientos/page.tsx`
  - `/app/workouts`: `front/src/app/(app)/app/workouts/page.tsx`
  - `/app/dashboard`: `front/src/app/(app)/app/dashboard/page.tsx`
  - `/app/feed`: `front/src/app/(app)/app/feed/page.tsx`
  - `/app/gym`: `front/src/app/(app)/app/gym/page.tsx`
  - `/app/trainer`: `front/src/app/(app)/app/trainer/page.tsx`
  - `/app/treinador`: `front/src/app/(app)/app/treinador/page.tsx` (duplicidad PT)
  - `/app/admin`: `front/src/app/(app)/app/admin/page.tsx`
  - `/app/profile`: `front/src/app/(app)/app/profile/page.tsx`
  - `/app/settings`: `front/src/app/(app)/app/settings/page.tsx`
  - `/app/onboarding`: `front/src/app/(app)/app/onboarding/page.tsx`

**Protección y shell UI:**
- Middleware protege `/app/*` por cookie `fs_token`. Evidencia: `front/src/middleware.ts` L1-L32.
- Layout app muestra NavBar + Sidebar + MobileTabBar. Evidencia: `front/src/app/(app)/app/layout.tsx` L1-L12.

**Dev/Admin vs usuario final:**
- Separación conceptual existe (componentes `components/admin`, `components/trainer`, `components/gym`), pero la ruta `/app/admin` está bajo el mismo shell que usuario final, y el gating depende de `useUserRole` (payload `/api/auth/me`). Evidencia: `front/src/context/AccessProvider.tsx` L1-L47 y `front/src/hooks/useUserRole.ts` L1-L93.

**Callejones sin salida detectados (evidencia o Assunção):**
- Duplicidad de rutas trainer PT/EN/ES (`/trainer` y `/treinador`), riesgo de UX inconsistente y enlaces rotos. Evidencia: existencia de ambas rutas en `front/src/app/(app)/app/*/page.tsx`.
- **Assunção:** hay pantallas “dietas” y “nutricion” separadas, probable redundancia o navegación confusa, requiere decisión de IA/planes vs registro diario.

### 2.2 Flujos end-to-end (journeys)

> Nota: Aquí documento “lo que se puede inferir con evidencia de rutas, BFF y BE”. Para confirmar persistencia real se requeriría ejecutar el sistema con DB, pero en esta auditoría es solo lectura.

#### A) Login + acceso a `/app` protegido
- Paso 1: Usuario entra en `/login`.
- Paso 2: Login llama BFF `POST /api/auth/login` (ruta existe). Evidencia: `front/src/app/api/auth/*` y en BE `POST /auth/login`. `back/src/index.ts` L3687.
- Paso 3: BE emite cookie `fs_token` via JWT cookie plugin. Evidencia: `back/src/index.ts` registro `@fastify/jwt` con cookieName `fs_token` L70-L90.
- Paso 4: Acceso a `/app/*` permitido por middleware si cookie existe. Evidencia: `front/src/middleware.ts` L7-L27.

Resultado esperado: el usuario entra al layout con TabBar.

#### B) Hoy + 1 acción rápida
- Ruta: `/app/hoy` existe. Evidencia: `front/src/app/(app)/app/hoy/page.tsx`.
- **Assunção:** la “acción rápida” (ej. registrar comida o entreno) depende de componentes en `front/src/components/today/*`. No se verificó un CTA único sin ejecutar UI.

#### C) Biblioteca: lista → detalle
- BFF: `GET /api/exercises` y `GET /api/exercises/[id]`. Evidencia: `front/src/app/api/exercises/route.ts` y `front/src/app/api/exercises/[id]/route.ts`.
- BE: `GET /exercises` y `GET /exercises/:id`. Evidencia: `back/src/index.ts` L5404-L5448.
- Persistencia: ejercicios son entidad Prisma `Exercise`. Evidencia: `back/prisma/schema.prisma` L40-L63.

Resultado esperado: lista de ejercicios, al entrar detalle se carga por id.

#### D) Tracking: crear 1 registro y confirmar persistencia
- BFF: `GET/PUT /api/tracking`. Evidencia: `front/src/app/api/tracking/route.ts`.
- BE: `GET /tracking`, `PUT /tracking`, `DELETE /tracking/:collection/:id`. Evidencia: `back/src/index.ts` L4484-L4535.
- Persistencia: `UserProfile.tracking` JSON. Evidencia: `back/prisma/schema.prisma` `UserProfile.tracking Json?` L69-L78.

Resultado esperado: tras PUT, GET devuelve el tracking actualizado.

#### E) Food log: registrar ítems por gramos y ver macros/calorías
- BE define `foodEntrySchema` con `{ id, date, foodKey, grams }`. Evidencia: `back/src/index.ts` L973-L1006.
- BE también implementa CRUD de “user foods” con macros por unidad: `GET/POST/PUT/DELETE /user-foods`. Evidencia: `back/src/index.ts` L4542-L4598 y `back/prisma/schema.prisma` `UserFood` L80-L95.
- **Gap probable:** no se encontró en BE un cálculo automático de macros del food log por `grams` + `foodKey`. Eso parece responsabilidad FE, o falta un endpoint de agregación. **Assunção:** FE calcula macros client-side usando `/user-foods`.

#### F) Onboarding
- Ruta existe: `/app/onboarding`. Evidencia: `front/src/app/(app)/app/onboarding/page.tsx`.
- BE tiene guard `PROFILE_INCOMPLETE` usado por IA. Evidencia: `back/src/index.ts` `requireCompleteProfile` L880-L905 y error 409 en `handleRequestError` L135-L160.

Resultado esperado: completar perfil antes de IA.

#### G) Dashboard semanal
- Ruta existe: `/app/dashboard`. Evidencia: `front/src/app/(app)/app/dashboard/page.tsx`.
- **Assunção:** dashboard se alimenta de `/tracking` + planes activos, se necesita verificar UI.

#### H) IA Nutrición: generar plan semanal + lista compra + ajuste
- BFF: `POST /api/ai/nutrition-plan`. Evidencia: `front/src/app/api/ai/nutrition-plan/route.ts`.
- BE: `POST /ai/nutrition-plan` protegido por `aiAccessGuard`. Evidencia: `back/src/index.ts` L4803 y L917-L948.
- Persistencia: Prisma `NutritionPlan` + `NutritionDay/Meal/Ingredient`. Evidencia: `back/prisma/schema.prisma` L116-L175.

**Gap:** no hay endpoint explícito de “lista compra” separada, ni “ajuste” incremental como endpoint distinto. Probable que el plan generado ya incluya ingredientes y la “lista compra” sea derivada en FE. **Assunção.**

#### I) IA Fitness: generar plan + ajuste semanal
- BFF: `POST /api/ai/training-plan`. Evidencia: `front/src/app/api/ai/training-plan/route.ts`.
- BE: `POST /ai/training-plan` con `aiAccessGuard`. Evidencia: `back/src/index.ts` L4635 y guard L917-L948.
- Persistencia: Prisma `TrainingPlan` + `TrainingDay/TrainingExercise`. Evidencia: `back/prisma/schema.prisma` L176-L235.

**Gap:** ajuste semanal como operación de “update/replace” no está modelado como endpoint dedicado, más bien se crea un plan nuevo por fechas. `@@unique([userId, startDate, daysCount])`. Evidencia: `back/prisma/schema.prisma` L130-L136 y L199-L205.

#### J) Gym Pilot: usuario se une a gym + admin gestiona + asigna plan
- Listado gyms: BFF `GET /api/gyms`, BE `GET /gyms`. Evidencia: `front/src/app/api/gyms/route.ts` y `back/src/index.ts` L6262.
- Join request: BFF `POST /api/gyms/join` o `POST /api/gym/join-request`, BE acepta ambos (`/gyms/join` y `/gym/join-request`). Evidencia: `back/src/index.ts` L6327-L6330.
- Join por código: BFF `POST /api/gyms/join-by-code` y `POST /api/gym/join-code`, BE implementa ambos (`/gyms/join-by-code` y `/gym/join-code`). Evidencia: `back/src/index.ts` L6330-L6443.
- Admin lista requests: BFF `GET /api/admin/gym-join-requests`, BE `GET /admin/gym-join-requests`. Evidencia: `front/src/app/api/admin/gym-join-requests/route.ts` y `back/src/index.ts` L6445.
- Admin acepta/rechaza: BE `POST /admin/gym-join-requests/:membershipId/accept|reject`. Evidencia: `back/src/index.ts` L6487-L6528.
- Admin lista miembros: BE `GET /admin/gyms/:gymId/members`. Evidencia: `back/src/index.ts` L6557.
- Asignación de plan a miembro: BE `POST /admin/gyms/:gymId/members/:userId/assign-training-plan`. Evidencia: `back/src/index.ts` L5810.

**Gaps y contradicciones (con evidencia):**
- FE implementa “leave gym” vía `DELETE /api/gyms/membership`, pero BE no tiene `DELETE /gyms/membership`. Evidencia: `front/src/app/api/gyms/membership/route.ts` L1-L9 vs `back/src/index.ts` solo `GET /gyms/membership` L6400.
- FE incluye parsing defensivo para membership y listas, señal de payloads inconsistentes entre BFF/BE. Evidencia: `front/src/services/gym.ts` (funciones `parseMembership`, `parseGymList`, `parseJoinRequestList`).

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

**Fuente de verdad actual (BE):** `EffectiveEntitlements`.

- Planes reales: `FREE | STRENGTH_AI | NUTRI_AI | PRO`. Evidencia: `back/prisma/schema.prisma` L437-L442.
- Módulos: `strength`, `nutrition`, `ai`. Evidencia: `back/src/entitlements.ts` L10-L55.
- “Bundle”: `PRO` (incluye strength + nutrition + ai). Evidencia: `planHasStrength`, `planHasNutrition`, `planHasAi`. `back/src/entitlements.ts` L24-L41.
- “Gym” como tier: **NO existe** en entitlements ni en `SubscriptionPlan`. Solo existe dominio `Gym`/`GymMembership` con roles. Evidencia: `back/prisma/schema.prisma` enums L444-L456.

#### Tabla feature vs tier (implementado vs planeado)

| Feature | FREE | NUTRI_AI | STRENGTH_AI | PRO (Bundle) | GYM | Estado real | Evidencia |
|---|---:|---:|---:|---:|---:|---|---|
| Acceso app / tracking | ✅ | ✅ | ✅ | ✅ | ✅ | Implementado | `/tracking` en BE `back/src/index.ts` L4484-L4535 |
| IA (cualquier) | ❌ | ✅ | ✅ | ✅ | **N/A** | Implementado (gated) | `aiAccessGuard` `back/src/index.ts` L917-L948 |
| IA Nutrición (plan) | ❌ | ✅ | ❌ | ✅ | **N/A** | Implementado | `POST /ai/nutrition-plan` `back/src/index.ts` L4803 |
| IA Fitness (plan) | ❌ | ❌ | ✅ | ✅ | **N/A** | Implementado | `POST /ai/training-plan` `back/src/index.ts` L4635 |
| Biblioteca ejercicios | ✅ | ✅ | ✅ | ✅ | ✅ | Implementado | `GET /exercises` `back/src/index.ts` L5404 |
| Gym join request / join code | ✅ | ✅ | ✅ | ✅ | ✅ | Implementado | `POST /gyms/join` + `/gym/join-code` `back/src/index.ts` L6327-L6443 |
| Panel admin gyms | ✅* | ✅* | ✅* | ✅* | ✅ | Implementado (por rol) | `GET/POST /admin/gyms` `back/src/index.ts` L6709-L6776 |
| Leave gym | ❌ | ❌ | ❌ | ❌ | ❌ | **Mismatch** | FE declara DELETE, BE no existe |

\* Depende de rol admin, no de plan.

---

## 3) Auditoría UX (mobile-first)

### Consistencia tab bar y navegación
- Layout siempre renderiza `MobileTabBar` para `/app/*`. Evidencia: `front/src/app/(app)/app/layout.tsx` L1-L12.
- **Riesgo UX:** Tab bar fijo con `page-with-tabbar-safe-area`, pero no hay evidencia de que todas las pantallas usen ese wrapper o respeten safe-area, puede causar contenido oculto tras el tab bar. Evidencia parcial: layout aplica clase al `<main>`. `front/src/app/(app)/app/layout.tsx` L7.

### Estados obligatorios (loading/empty/error/success/disabled)
- Hay componentes `EmptyState`, `ErrorState` y skeletons (ej. Gym). Evidencia: `front/src/components/states/*` y uso en `GymPageClient`. `front/src/components/gym/GymPageClient.tsx`.
- Hay muchas pantallas que probablemente no están normalizadas (no verificado sin ejecución). **Assunção.**

### Copy/i18n: inconsistencias
- Existe `LanguageProvider` y `t(...)` en Gym. Evidencia: `front/src/context/LanguageProvider.tsx` y uso en `GymPageClient.tsx`.
- Hay duplicidad de rutas en idiomas (`trainer` vs `treinador`), y rutas en ES/EN mezcladas (`biblioteca`, `workouts`, `dashboard`). Esto sugiere i18n a nivel de strings pero no a nivel de rutas, lo que confunde el producto. Evidencia: listado de rutas en `front/src/app/(app)/app/*`.

### 10 fricciones concretas + recomendación

1) **Fricción:** el usuario puede ver acciones “leave gym” que no funcionan (o fallan 404/405).  
   Recomendación: ocultar UI si BE no soporta, o implementar endpoint.  
   Evidencia: FE `DELETE /api/gyms/membership` existe, BE no. `front/src/app/api/gyms/membership/route.ts` y `back/src/index.ts`.

2) **Fricción:** parsing defensivo de payloads gym implica estados “UNKNOWN” y badges incorrectos.  
   Recomendación: contrato único para membership/list/join requests, con esquema Zod compartido (o JSON schema).  
   Evidencia: `front/src/services/gym.ts` `parseMembership`.

3) **Fricción:** duplicidad `/app/trainer` y `/app/treinador`.  
   Recomendación: una única ruta canonical, y el idioma solo en strings.  
   Evidencia: rutas existen.

4) **Fricción:** secciones solapadas: `nutricion`, `dietas`, `macros`.  
   Recomendación: consolidar en una IA “Nutrición” con tabs internos (Plan, Registro, Macros) y ocultar lo no listo.  
   Evidencia: rutas múltiples, sin señal de gating por feature flag.

5) **Fricción:** entitlements en UI pueden depender de tokens ambiguos (role tokens, legacy tier).  
   Recomendación: FE debe usar `entitlements.modules.*` como fuente única.  
   Evidencia: `back/src/index.ts` `/auth/me` devuelve `entitlements`.

6) **Fricción:** estados de error de IA (402 upgrade, 429 limit, 409 profile incomplete) necesitan UX específica.  
   Recomendación: manejar por código, con CTA “Completar perfil” o “Upgrade”, no mensaje genérico.  
   Evidencia: `handleRequestError` L120-L170 y ai guard.

7) **Fricción:** tracking en JSON no tiene confirmación “guardada” ni errores de consistencia por colección en UI (no verificable, pero riesgo).  
   Recomendación: UX con “Saved” + retry + offline-safe, y BE con validación por colección.  
   Evidencia: tracking schemas en BE.

8) **Fricción:** Admin y usuario final comparten shell, y la navegación puede exponer enlaces a secciones sin permisos.  
   Recomendación: filtrar menús por `AccessProvider` y por gym role.  
   Evidencia: existe `useAccess`, falta ver menús (ver sección 4).

9) **Fricción:** dependencia fuerte de que `fs_token` exista, no hay refresh visible si expira, excepto en gym que muestra “session expired”.  
   Recomendación: patrón global de “session expired” con CTA a login.  
   Evidencia: `GymPageClient` maneja `unauthorized` explícitamente.

10) **Fricción:** precios mostrados en UI pueden no ser “source of truth” (reportado por Founder).  
   Recomendación: UI debe mostrar precios solo desde `GET /billing/plans` y/o Stripe price metadata via BE.  
   Evidencia: existen BFF `billing/plans` y `billing/status`. `front/src/app/api/billing/plans/route.ts`, `front/src/app/api/billing/status/route.ts`.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

**Frontend (Next.js):**
- App Router con grupos `(public)`, `(auth)`, `(app)`.
- Middleware protege `/app/*` por cookie. Evidencia: `front/src/middleware.ts`.
- UI shell centralizado en `front/src/app/(app)/app/layout.tsx`.

**BFF (Next route handlers `/api/*`):**
- Proxy a BE usando `getBackendUrl()` que toma `NEXT_PUBLIC_BACKEND_URL` o `BACKEND_URL`. Evidencia: `front/src/lib/backend.ts` L1-L3.
- BFF pasa cookie `fs_token` al backend como header `cookie: fs_token=...`. Ejemplo: `front/src/app/api/billing/status/route.ts` L10-L28.

**Backend (Fastify + Prisma):**
- Monolito `back/src/index.ts` contiene auth, billing, AI, tracking, gyms, recipes, workouts, plans. Evidencia: endpoints listados por `app.get/post/...` (ver `back/src/index.ts` en varias secciones).
- Auth cookie JWT: `@fastify/jwt` con cookieName `fs_token`. Evidencia: `back/src/index.ts` L70-L90.

**Dominios existentes (BE):**
- Auth: `/auth/*` + google oauth start/callback. Evidencia: `back/src/index.ts` L3684-L4300.
- Profile: `GET/PUT /profile`. Evidencia: `back/src/index.ts` L4332-L4440.
- Tracking: `GET/PUT /tracking`. Evidencia: `back/src/index.ts` L4484-L4535.
- Nutrition: `/user-foods`, `/nutrition-plans`, `/recipes`. Evidencia: `back/src/index.ts` L4542-L5990.
- Training: `/training-plans`, `/workouts`, `/workout-sessions`. Evidencia: `back/src/index.ts` L5514-L6180.
- Library: `/exercises`. Evidencia: `back/src/index.ts` L5404-L5472.
- AI: `/ai/*`. Evidencia: `back/src/index.ts` L4606-L5175.
- Billing: `/billing/*` + stripe webhook. Evidencia: `back/src/index.ts` L3785-L4110 y L3913+.
- Gyms/Admin: `/gyms`, `/admin/gyms`, `/admin/gym-join-requests`, `/trainer/*`. Evidencia: `back/src/index.ts` L6262-L7120.

**Zonas sensibles:**
- `fs_token` cookie y middleware. Evidencia: `front/src/middleware.ts` y `back/src/index.ts` jwt config.
- Entitlements y gating IA. Evidencia: `back/src/entitlements.ts` + `aiAccessGuard`.
- Contratos Gym (mismatches). Evidencia: sección 2.2J.

### 4.2 Contratos FE↔BE (mapa)

> Nota: Tabla enfocada en endpoints consumidos por FE (BFF `/api/*`) y su equivalente en BE.

| BFF (FE) | Método | BE real | Estado | Comentario |
|---|---:|---|---|---|
| `/api/auth/me` | GET | `/auth/me` | OK | FE usa para roles/entitlements. BE devuelve `entitlements` y `isTrainer`. `back/src/index.ts` L4115-L4155 |
| `/api/profile` | GET/PUT | `/profile` | OK | Persistencia en `UserProfile.profile` y `tracking`. `schema.prisma` |
| `/api/tracking` | GET/PUT | `/tracking` | OK | JSON schema server-side para checkins/foodLog/workoutLog |
| `/api/user-foods` | CRUD | `/user-foods` | OK | Macros por unidad, base para food log |
| `/api/ai/training-plan` | POST | `/ai/training-plan` | OK | 402/429/409 requieren UX |
| `/api/ai/nutrition-plan` | POST | `/ai/nutrition-plan` | OK | idem |
| `/api/billing/status` | GET | `/billing/status` | OK | Fuente de estado, útil para UI |
| `/api/billing/plans` | GET | **Assunção:** `/billing/plans` | MISSING? | No se encontró `GET /billing/plans` en BE (solo checkout/portal/status). Ver abajo |
| `/api/billing/checkout` | POST | `/billing/checkout` | OK | Checkout stripe |
| `/api/billing/portal` | POST | `/billing/portal` | OK | Portal stripe |
| `/api/gyms` | GET | `/gyms` | OK | Listado gyms |
| `/api/gyms/join` | POST | `/gyms/join` | OK | Request join |
| `/api/gym/join-request` | POST | `/gym/join-request` | OK | Alias |
| `/api/gyms/join-by-code` | POST | `/gyms/join-by-code` | OK | Join por code |
| `/api/gym/join-code` | POST | `/gym/join-code` | OK | Alias |
| `/api/gyms/membership` | GET | `/gyms/membership` | OK | Membership |
| `/api/gyms/membership` | DELETE | **NO existe** | MISMATCH | Bloqueante, BE no implementa leave |
| `/api/admin/gyms` | GET/POST | `/admin/gyms` | OK | Crear/listar gyms |
| `/api/admin/gym-join-requests` | GET | `/admin/gym-join-requests` | OK | Requests |

**Hallazgo concreto:**
- `GET /billing/plans` no se encontró en BE: en `back/src/index.ts` hay `POST /billing/checkout`, `POST /billing/portal`, `GET /billing/status`, pero no `GET /billing/plans`. Evidencia: grep endpoints en `back/src/index.ts` (L3785, L3869, L4441).

### 4.3 IA (assistiva)

**Dónde se usa IA hoy (BE):**
- `POST /ai/training-plan`
- `POST /ai/nutrition-plan`
- `POST /ai/daily-tip`
- Además: `GET /ai/quota`.

Evidencia: `back/src/index.ts` L4606-L5075.

**Output JSON estructurado + validación antes de persistir:**
- Hay schemas en `back/src/lib/ai/schemas/*JsonSchema.ts`. Evidencia: imports en `back/src/index.ts` L15-L20.
- Hay parsing robusto `parseJsonFromText`, `parseLargestJsonFromText`, etc. Evidencia: imports `back/src/index.ts` L10-L14 y archivo `back/src/aiParsing.ts`.

**Riesgos y mitigaciones:**
- PII/logs: Fastify logger por defecto podría loggear request/response si no se filtra, riesgo con contenido IA y perfil. **Assunção** (no se revisó config de logger/serializers). Recomendación: redaction de cookies, email, body IA.
- Persistencia: asegurar que solo se persiste JSON validado contra schema (parece intención, confirmar en handlers).

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)

**Entorno de auditoría:**
- Node: v22.16.0 (container)  
- npm: 10.9.2 (container)

**Commit hash auditado:**
- No disponible (zip sin `.git`). **Assunção:** corresponde a snapshot actual.

**Build / lint / tests:**
- **Web build (next build): FAIL en entorno de auditoría** porque no se pudo instalar `next` ni `react` desde npm (entorno sin acceso a internet/cache incompleta). Evidencia: `npm run build` devuelve `next: not found`.
- **API build/tests: NO EJECUTABLE en entorno de auditoría** por dependencia Prisma engines (postinstall) que requiere descarga. Evidencia: `npm ci` falla en `@prisma/engines`.

> Importante: lo anterior NO prueba que el repo falle en vuestro CI real, solo que esta auditoría no pudo ejecutar build offline. La evaluación de calidad se hace principalmente por inspección estática y consistencia de contratos.

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) **DoD mínimo**
- Login: **PASS (código)**. Evidencia: middleware + `/auth/login` + cookie jwt. `front/src/middleware.ts`, `back/src/index.ts`.
- `/app` protegido: **PASS**. Evidencia: `front/src/middleware.ts`.
- Tab bar: **PASS (estructura)**. Evidencia: `front/src/app/(app)/app/layout.tsx`.
- Hoy + 1 acción: **Assunção / NO VERIFICABLE** sin ejecutar UI.
- Tracking persistente: **PASS (diseño)**. Evidencia: `/tracking` BE + `UserProfile.tracking`.
- Biblioteca lista+detalle: **PASS (código)**. Evidencia: `/exercises` endpoints.

B) **Entitlements modular**
- Free vs Nutri vs Strength vs PRO: **PASS (modelo BE)**. Evidencia: `SubscriptionPlan` enum + `EffectiveEntitlements`.
- Bundle vs Gym: **FAIL** (no existe “Gym” como tier, y “Bundle” es solo PRO). Evidencia: `back/prisma/schema.prisma` enums.

C) **Free: métricas básicas + rendimiento + food log con macros/calorías**
- Food log por gramos: **PASS (schema)**. Evidencia: `foodEntrySchema`.
- Macros/calorías: **PARCIAL** (hay `UserFood` con macros, pero no se ve cálculo server-side del food log). Evidencia: `UserFood` + tracking schema.

D) **Nutrición Premium**
- Plan semanal: **PASS**. Evidencia: `POST /ai/nutrition-plan` + modelos `NutritionPlan*`.
- Lista compra: **Assunção** (derivable, no endpoint dedicado).
- Ajustes + validación IA: **PARCIAL** (validación existe por schema, pero no se confirmó flujo de “ajuste” incremental).

E) **Fitness Premium**
- Plan según contexto: **PASS** (endpoint y schema). Evidencia: `POST /ai/training-plan` + modelos.
- Ajuste semanal: **PARCIAL** (probablemente creando nuevo plan por fecha).

F) **Gym Pilot**
- Join por aceptación: **PASS**. Evidencia: join request + accept/reject.
- Join por código: **PASS**. Evidencia: `/gym/join-code`.
- Panel admin: **PASS (endpoints)**.
- Asignación de plan template: **PASS (endpoint)**.
- Gestión completa (miembros activos y solicitudes): **PARCIAL** (por mismatches y UX reportados). Evidencia: parsing defensivo en FE.

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-001 | P0 | Contratos | FE expone `DELETE /api/gyms/membership` pero BE no implementa `DELETE /gyms/membership` | UX rota, soporte, pérdida confianza | `front/src/app/api/gyms/membership/route.ts` vs `back/src/index.ts` L6400 | Implementar BE delete o remover/ocultar en FE | Backend | S |
| FS-002 | P0 | Billing/Entitlements | BFF tiene `/api/billing/plans`, pero BE no tiene `GET /billing/plans` | Precios/UI inconsistentes, checkout confusion | FE ruta existe, BE endpoints listados sin `billing/plans` | Añadir `GET /billing/plans` en BE con priceId + displayPrice (desde env/Stripe) | Backend | S-M |
| FS-003 | P0 | Gym Pilot UX | Parsing defensivo en FE (membership/list/requests) indica payloads inconsistentes | Estados “UNKNOWN”, panel admin no refleja realidad | `front/src/services/gym.ts` parse* | Definir contratos y tipar, ajustar BE responses, eliminar heurísticas | Full-stack | M |
| FS-004 | P1 | Producto | “Gym tier” no existe en entitlements, pero es requisito de roadmap | Modelo monetización incompleto | `back/prisma/schema.prisma` enums | Decidir: Gym como plan, como “org license”, o como feature flag por gymId | Producto/Backend | M |
| FS-005 | P1 | Backend arquitectura | `back/src/index.ts` monolítico, alta complejidad | Lentitud de equipo, bugs | tamaño/estructura | Extraer módulos por dominio manteniendo rutas | Backend | M |
| FS-006 | P1 | IA UX | Falta manejo UX dedicado de 402/409/429 | Pantallas rotas, churn | `handleRequestError` y `aiAccessGuard` | Componentes “UpgradeRequired”, “CompleteProfile”, “RateLimited” | Frontend | S |
| FS-007 | P2 | i18n/UX | Rutas duplicadas por idioma (`trainer`/`treinador`) | Confusión y enlaces | rutas | Canonical route + i18n strings | Frontend | S |
| FS-008 | P2 | Datos | Tracking en JSON sin versionado por colección | Migraciones y queries difíciles | `UserProfile.tracking Json?` | Introducir `trackingVersion` + validación server-side por version | Backend | M |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1 (apuesta): “Contratos y Gym Pilot estable”
- **Goal:** cerrar loop gym join (request/code) + admin acepta + miembros activos + asignación plan, sin estados UNKNOWN.
- **Entra:**
  - FS-001, FS-003.
  - Contratos BE: respuestas consistentes (`{ data: ... }` o directo, pero único).
  - UI: ocultar acciones no soportadas.
- **No entra:** nuevas features IA, white-label, nuevos roles globales.
- **Métricas:**
  - % de flujos gym completados sin error (join->active->ver miembro) > 95%.
  - 0 rutas que dependan de parsing heurístico.
- **Riesgos/dependencias:** coordinación FE/BE, migración suave de payloads.

### Sprint 2 (apuesta): “Entitlements + Billing source of truth”
- **Goal:** precios y acceso siempre correctos, upgrade/downgrade sin bucles.
- **Entra:**
  - FS-002, FS-006.
  - `GET /billing/plans` en BE con display data.
  - UI compra: decisión clara entre “comprar otro producto” vs “gestionar subscripción” (según estrategia). **Assunção:** depende de Stripe setup.
- **No entra:** rediseño completo de pricing page, marketplace.
- **Métricas:**
  - 0 discrepancias entre UI y `billing/status`.
  - tasa de checkout iniciado→completado.
- **Riesgos:** Stripe products/prices actuales, decisión de bundling.

### Sprint 3 (apuesta): “Core loop demo premium (mobile-first)”
- **Goal:** Demo para gym pequeño: Hoy (acción rápida) + biblioteca (visual) + tracking + un plan activo.
- **Entra:**
  - Consolidación navegación Nutrición (plan vs log), y unificar rutas duplicadas.
  - Estados UX coherentes en pantallas clave.
- **Métricas:**
  - Tiempo hasta primera acción (TTFA) < 60s desde login.
  - Retención D1 en piloto (proxy: sesiones por usuario).
- **Riesgos:** scope creep, assets visuales.

---

## 8) Anexos

### A) Árbol de rutas/pantallas (parcial)
- Ver sección 2.1 (listado de `page.tsx`).

### B) Feature flags/toggles
- No se detectó un sistema explícito de feature flags (ej. LaunchDarkly, env flags por feature). **Assunção:** gating actual se hace por entitlements y roles.

### C) Seguridad: secretos
- No se pegaron secretos en este documento. No se realizó escaneo exhaustivo de `.env` (no incluido en zip). **Assunção:** revisar que `COOKIE_SECRET`, `JWT_SECRET`, Stripe keys estén solo en env.

