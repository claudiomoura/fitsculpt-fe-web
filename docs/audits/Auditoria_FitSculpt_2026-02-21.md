# Auditoria_FitSculpt_2026-02-21.md
Fecha: 2026-02-21  
Autor/a auditoría: GPT-5.2 Thinking (Senior Staff Architects)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa completo y verificable de “qué existe hoy” + gaps del MVP modular + readiness para vender a un gym pequeño.

> Nota de trazabilidad: auditoría basada en dos zips recibidos (solo lectura). No hay commit hash en los zips, por lo que se referencia por SHA-256.
>
> - Front zip SHA-256: `edbcba28aad6e0ff21924c9491540789359d5d49083858bda443ae2a2e7ed402`
> - Back zip SHA-256: `35d8725530faaa893b5d843ea2fcf4332c29c10c1f21b445c5375e451eae3f6e`

## 1) Executive Summary (máx 12 bullets)

- **Estado general: Release-ready = NO.** Hay fragilidad estructural de build y de contratos (especialmente entitlements y duplicidad de rutas), y varias áreas dependen de lógica defensiva en FE para tolerar respuestas variables. Evidencia: ausencia de CI/gates en repo front (no `.github/`), y normalizadores/parsers defensivos en BFF/FE (ver Sección 4.2).
- **Estado MVP Modular = NO.** El backend define planes modulares (`FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`), pero el frontend los colapsa a `FREE/PRO/GYM`, perdiendo modularidad real y creando gating ambiguo en UI. Evidencia: enum en Prisma `back/prisma/schema.prisma` L437-L442 y normalización FE `front/src/lib/entitlements.ts` L40-L80.
- **Estado Gym Pilot = DEMO asistida: SÍ, autónomo: NO.** Hay rutas/admin y trainer amplias, pero hay duplicidad de UX (`/app/trainer` vs `/app/treinador`) y puntos “coming soon” en navegación admin. Evidencia: rutas duplicadas en `src/app/(app)/app/trainer/*` y `src/app/(app)/app/treinador/*` (ver Sección 2.1) y nav admin con disabled `front/src/components/layout/navConfig.ts` L107-L123.
- **Top 5 riesgos (P0/P1):**
  1) **Entitlements no cerrados end-to-end** (planes modulares existen en BE, UI los simplifica). Impacto: upsell incorrecto, accesos inconsistentes. Evidencia: `back/src/entitlements.ts` L3-L101 y `front/src/lib/entitlements.ts` L40-L80.
  2) **Sin build gate obligatorio**. Impacto: regresiones de TypeScript/build en cualquier PR. Evidencia: no se encuentra workflow CI en front zip (`.github/` ausente).
  3) **Duplicidad de rutas/UX trainer** (`trainer` y `treinador`). Impacto: mantenimiento doble, bugs de permisos/links, i18n confuso. Evidencia: páginas en `front/src/app/(app)/app/trainer/page.tsx` L1-L200 y `front/src/app/(app)/app/treinador/page.tsx` L1-L200 (ver Sección 2.1).
  4) **Backend “god file”** (gran parte de rutas en `back/src/index.ts`). Impacto: cambios arriesgados, difícil testear/razonar, onboarding lento. Evidencia: rutas variadas en un solo archivo (ej. `/auth/me` `back/src/index.ts` L4700-L4744; `/tracking` `back/src/index.ts` L5069-L5103; `/admin/gyms` `back/src/index.ts` L8723-L8748).
  5) **IA: outputs deben validarse y aislar PII/logs**. Hay guardas de cuota/tokens, pero el flujo completo (JSON estructurado, validación, persistencia) depende de implementaciones dispersas. Evidencia: `aiAccessGuard` `back/src/index.ts` L1006-L1018 y rutas `/ai/*` (Sección 4.3).
- **Top 5 quick wins (1-3 días cada uno):**
  1) **Eliminar duplicidad `/treinador` o redirigir a `/trainer`** y consolidar links. (P0 UX, P0 mantenimiento).
  2) **CI mínimo obligatorio**: `npm ci && npm run build && npm run lint` en front, y `npm ci && npm run build` en back. (P0 estabilidad).
  3) **Entitlements UI = backend-driven**: exponer módulos `strength/nutrition/ai` en UI y dejar de colapsar `STRENGTH_AI/NUTRI_AI` a `PRO`. (P0 producto).
  4) **Contract tests ligeros** (zod schemas compartidos o snapshots por endpoint crítico). (P1).
  5) **Checklist de estados UI** en pantallas core (loading/empty/error/disabled). (P1).

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

**Rutas (App Router) detectadas (subset core):**

- Público/Auth:
  - `/login` -> `front/src/app/(auth)/login/page.tsx`
  - `/pricing` -> `front/src/app/pricing/page.tsx` (landing de pricing pública)
- App (protegido por cookie `fs_token`):
  - `/app` dashboard -> `front/src/app/(app)/app/page.tsx` L1-L15
  - `/app/hoy` -> `front/src/app/(app)/app/hoy/page.tsx` (ver en árbol, Sección 8)
  - `/app/entrenamiento` -> `front/src/app/(app)/app/entrenamiento/page.tsx`
  - `/app/nutricion` -> `front/src/app/(app)/app/nutricion/page.tsx` L1-L29
  - `/app/seguimiento` -> `front/src/app/(app)/app/seguimiento/page.tsx`
  - `/app/biblioteca` -> `front/src/app/(app)/app/biblioteca/page.tsx` + detalles (`[exerciseId]`, entrenamientos, recetas)
  - `/app/profile` -> `front/src/app/(app)/app/profile/page.tsx`
  - `/app/gym` -> `front/src/app/(app)/app/gym/page.tsx` L1-L5
- Admin:
  - `/app/admin` + `/app/admin/users` + `/app/admin/gyms` + `/app/admin/gym-requests` etc. (55 páginas totales encontradas).
- Trainer:
  - `/app/trainer/*` (planes, clientes, ejercicios, requests).
  - `/app/treinador/*` (duplicado parcial en PT). Evidencia: rutas listadas en repo, por ejemplo `front/src/app/(app)/app/treinador/page.tsx` L1-L120.

**Dev/Admin vs usuario final:**
- Usuario final: `mainTabsMobile` define tabs a `/app/hoy`, `/app`, `/app/entrenamiento`, `/app/biblioteca`, `/app/nutricion`, `/app/seguimiento`. Evidencia: `front/src/components/layout/navConfig.ts` L29-L66.
- Admin: `sidebarAdmin` agrega `/app/admin/*`. Evidencia: `front/src/components/layout/navConfig.ts` L107-L150.
- Trainer: rutas bajo `/app/trainer/*` y `/app/treinador/*` (mismo rol, dos árboles).

**Callejones sin salida detectados (probables):**
- `admin-gym-requests` aparece en navegación pero está marcado como `disabled: true` (coming soon), riesgo de enlace muerto si se fuerza acceso directo. Evidencia: `front/src/components/layout/navConfig.ts` L112-L123.
- Duplicidad trainer/treinador: los usuarios pueden llegar a flujos distintos según link/idioma (riesgo de “estado divergente”).

**Protección de rutas:**
- Middleware protege prefijo `/app` verificando cookie `fs_token`. Evidencia: `front/src/middleware.ts` L4-L23.

### 2.2 Flujos end-to-end (journeys)

> Importante: esta auditoría no ejecuta el entorno, por lo que “Validado E2E” solo se marca si hay evidencia explícita en scripts/tests. Si no, queda como **No Validado**.

1) **Login + acceso a `/app` protegido**
- Paso esperado: usuario autentica, recibe cookie `fs_token`, middleware permite `/app/*`.
- Evidencia FE protección: `front/src/middleware.ts` L4-L18.
- Evidencia BE `/auth/me` (sesión por cookie): `back/src/index.ts` L4700-L4744.
- Estado: **Implementado**, **No Validado** (no hay evidencia de e2e test/CI).

2) **Hoy + 1 acción rápida**
- Tabs móviles incluyen `/app/hoy` como primera acción. Evidencia: `front/src/components/layout/navConfig.ts` L29-L36.
- Estado: **Implementado** (ruta existe en repo), **No Validado**.

3) **Biblioteca: lista -> detalle**
- Rutas: `/app/biblioteca` y detalle `/app/biblioteca/[exerciseId]`. Evidencia: archivos `front/src/app/(app)/app/biblioteca/page.tsx` y `front/src/app/(app)/app/biblioteca/[exerciseId]/page.tsx`.
- Estado: **Implementado**, **No Validado**.

4) **Tracking: crear 1 registro y confirmar persistencia**
- FE consume `PUT /api/tracking` (BFF) y backend persiste en `userProfile.tracking`. Evidencia BFF: `front/src/app/api/tracking/route.ts` L29-L51, BE: `back/src/index.ts` L5079-L5103.
- Estado: **Implementado**.

5) **Food log: registrar ítems por gramos y ver macros/calorías**
- FE modela `FoodEntry { foodKey, grams }` en Tracking. Evidencia: `FoodEntry` en `front/src/app/(app)/app/seguimiento/TrackingClient.tsx` L54-L59.
- Persistencia: el food log se guarda dentro de `/tracking` snapshot (backend log incluye `foodLog`). Evidencia: `back/src/index.ts` L5094-L5099.
- Estado: **Implementado**, **No Validado** (no hay test e2e, y el cálculo de macros depende de `user-foods`, ver Sección 4.2).

6) **Onboarding (si existe)**
- No se identifica un flujo dedicado `/onboarding/*` en rutas. El backend define “profile complete” con error `PROFILE_INCOMPLETE` (409) como guard potencial. Evidencia: `back/src/index.ts` L968-L979.
- Estado: **Parcial** (guard existe), **Assunção** sobre UX real del onboarding (no se ve ruta explícita).

7) **Dashboard semanal (si existe)**
- Existe `/app/dashboard` como página. Evidencia: `front/src/app/(app)/app/dashboard/page.tsx`.
- Estado: **Implementado**, **No Validado**.

8) **IA Nutrición: generar plan semanal + lista compra + ajuste**
- Backend expone `/ai/nutrition-plan` y `/ai/nutrition-plan/generate`. Evidencia: `back/src/index.ts` L5388-L5405 y `back/src/index.ts` L5770-L5785.
- FE: botón `?ai=1` en nutrición. Evidencia: `front/src/app/(app)/app/nutricion/page.tsx` L16-L23.
- Estado: **Implementado**, **No Validado** (ver Sección 4.3 para validación/persistencia).

9) **IA Fitness: generar plan + ajuste semanal**
- Backend expone `/ai/training-plan` y `/ai/training-plan/generate`. Evidencia: `back/src/index.ts` L5220-L5235 y `back/src/index.ts` L5656-L5670.
- FE: tracking usa `requestAiTrainingPlan` y `generateAndSaveTrainingPlan`. Evidencia: imports en `front/src/app/(app)/app/seguimiento/TrackingClient.tsx` L8-L15.
- Estado: **Implementado**, **No Validado**.

10) **Gym Pilot: usuario se une a gym + admin gestiona + asigna plan**
- Backend: membership endpoints `/gyms/*` y admin gyms `/admin/gyms*` y trainer routes. Evidencia: `/gyms/membership` `back/src/index.ts` L7550-L7641, `/admin/gyms` `back/src/index.ts` L8685-L8748, trainer plans `back/src/index.ts` L7851-L7925.
- BFF: rutas `/api/gyms/join`, `/api/admin/gyms`, `/api/trainer/*`. Evidencia: `front/src/app/api/gyms/*` y `front/src/app/api/admin/gyms/route.ts` `front/src/app/api/admin/gyms/route.ts` L5-L27.
- Estado: **Implementado**, **No Validado** (no hay seed/guía e2e en repo).

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

**Fuente de verdad en backend:** enum `SubscriptionPlan` y `buildEffectiveEntitlements` definen módulos `strength/nutrition/ai`. Evidencia: `back/prisma/schema.prisma` L437-L442 y `back/src/entitlements.ts` L35-L100.

**Problema actual:** el frontend reduce `STRENGTH_AI` y `NUTRI_AI` a `PRO` (pierde modularidad). Evidencia: `front/src/lib/entitlements.ts` L40-L55.

| Feature / módulo | FREE | Fitness Premium (STRENGTH_AI) | Nutrición Premium (NUTRI_AI) | Bundle (PRO) | Gym (membresía) | Estado | Evidencia |
|---|---:|---:|---:|---:|---:|---|---|
| IA (acceso a `/ai/*`) | ✖ | ✔ | ✔ | ✔ | (depende plan) | Implementado | `back/src/entitlements.ts` L43-L45, `back/src/index.ts` L1006-L1018 |
| Módulo strength | ✖ | ✔ | ✖ | ✔ | (según UI) | Implementado en BE | `back/src/entitlements.ts` L35-L37 |
| Módulo nutrition | ✖ | ✖ | ✔ | ✔ | (según UI) | Implementado en BE | `back/src/entitlements.ts` L39-L41 |
| Gating UI (tiers) | FREE/PRO/GYM | (colapsa a PRO) | (colapsa a PRO) | PRO | GYM | Mismatch | `front/src/lib/entitlements.ts` L24-L80 |
| Gym role trainer/admin | n/a | n/a | n/a | n/a | ✔ | Implementado en BE | `back/src/index.ts` L4704-L4743 |

**Recomendación (P0):** UI debe consumir `entitlements.modules.*` y mostrar upsell por módulo, no por “PRO genérico”. El plan `legacy.tier` debería desaparecer del gating de UI una vez migrado. (Ver Sección 6, Hallazgos).

## 3) Auditoría UX (mobile-first)

### Consistencia tab bar y navegación
- Layout incluye `AppNavBar`, `AppSidebar` y `MobileTabBar` en todas las páginas `/app/*`. Evidencia: `front/src/app/(app)/app/layout.tsx` L1-L15.
- Tabs principales definidos centralmente. Evidencia: `front/src/components/layout/navConfig.ts` L29-L66.
- Riesgo: dos árboles trainer/treinador no están integrados en tabs, pero conviven con sidebar (posibles rutas “huérfanas”).

### Estados obligatorios (loading/empty/error/success/disabled)
- Hay patrones positivos: `FeedClient` maneja loading/empty/error/disabled, e incluye “AI locked” state. Evidencia: `front/src/app/(app)/app/feed/FeedClient.tsx` L43-L173.
- Gap: no se confirma que todas las pantallas core tengan el set completo y consistente (no hay checklist ni tests). **Assunção**: hay inconsistencias entre módulos.

### Copy/i18n
- El UI usa `useLanguage()`/`getServerT()` de forma consistente en páginas core. Evidencia: `DashboardClient` `front/src/app/(app)/app/DashboardClient.tsx` L3-L13 y páginas `page.tsx` (ej. nutrición `front/src/app/(app)/app/nutricion/page.tsx` L1-L23).
- Riesgo: duplicidad `trainer/treinador` puede duplicar traducciones y generar drift.

### 10 fricciones concretas (con recomendación)
1) **Duplicidad trainer/treinador**: dos rutas para lo mismo. Recomendación: una sola ruta canonical + i18n en labels.
2) **Admin nav con items disabled** (coming soon): si no está listo, esconderlo para usuarios finales, incluso admin, salvo entorno dev. Evidencia: `front/src/components/layout/navConfig.ts` L112-L123.
3) **Gating por plan no transparente**: UI simplifica planes. Recomendación: “Locks” por feature con CTA contextual (nutrition vs strength). Evidencia: `front/src/lib/entitlements.ts` L48-L50.
4) **Feed mezcla acciones AI y no-AI** en una misma tarjeta, riesgo de confusión para FREE. Recomendación: separar “Feed” de “AI tip” o agrupar bajo módulo AI con CTA.
5) **Ergonomía móvil**: el layout incluye safe-area class `page-with-tabbar-safe-area`, bien. Recomendación: definir estándar de paddings y alturas de tab bar en design tokens. Evidencia: `front/src/app/(app)/app/layout.tsx` L9-L14.
6) **Error messaging backend**: varias rutas devuelven `{ error: BACKEND_UNAVAILABLE }`. Recomendación: mapear a UI consistentemente (toast/global banner). Evidencia: `front/src/app/api/tracking/route.ts` L24-L26.
7) **Estados de permiso**: admin/trainer deberían ver UI distinta, pero no hay prueba de un “guard” UI consistente (solo `canAccessAdmin` en nav). Recomendación: guard central en layout.
8) **Gym join flow**: se recomienda UI con estado `PENDING/ACTIVE/REJECTED` visible, ya que BE los modela. Evidencia: enum `back/prisma/schema.prisma` L444-L448.
9) **IA token balance**: se expone en `/auth/me`, pero no se ve un componente global de “tokens restantes”. Recomendación: badge global (solo cuando AI enabled). Evidencia: `back/src/index.ts` L4734-L4736.
10) **Falta de pruebas de “0 consola errors”**: especialmente en flujos Gym/Trainer. Recomendación: smoke test manual documentado + Playwright mínimo (P1).

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)

**Frontend (Next.js App Router):**
- Next.js `16.1.1`. Evidencia: `front/package.json` (`dependencies.next`).
- Layout app centralizado en `src/app/(app)/app/layout.tsx` con `MobileTabBar`. Evidencia: `front/src/app/(app)/app/layout.tsx` L1-L15.

**BFF (Next route handlers `/api/*`):**
- Patrón: BFF reenvía cookie `fs_token` hacia backend mediante `cookie: fs_token=...`. Evidencia: `/api/auth/me` `front/src/app/api/auth/me/route.ts` L9-L21.
- Algunos BFF añaden normalización de payloads (ej. `/api/admin/gyms` envuelve lista). Evidencia: `front/src/app/api/admin/gyms/route.ts` L5-L13.

**Backend (Fastify + Prisma):**
- Muchas rutas y lógica viven en un solo archivo `back/src/index.ts` (alta concentración). Evidencia: endpoints críticos referenciados en Secciones 2.2 y 4.2.
- Prisma enum de planes y gym roles. Evidencia: `back/prisma/schema.prisma` L437-L454.

**Zonas sensibles:**
- Cookie `fs_token`: protege `/app` en FE, y autentica en BE. Evidencia: FE middleware `front/src/middleware.ts` L12-L18, BE `/auth/me` `back/src/index.ts` L4700-L4707.
- Contratos `/auth/me`, `/tracking`, `/profile`, `/admin/gyms`, `/gyms/membership`, `/trainer/*` son la columna vertebral del MVP.

### 4.2 Contratos FE↔BE (mapa)

> Tabla centrada en endpoints que sostienen journeys core + Gym Pilot. (Hay más endpoints; este es el set P0/P1).

| Endpoint FE (BFF) | Backend real | Req/Resp (esperado) | Estado | Evidencia |
|---|---|---|---|---|
| `GET /api/auth/me` | `GET /auth/me` | User + entitlements + gym info | OK | FE `front/src/app/api/auth/me/route.ts` L9-L21, BE `back/src/index.ts` L4700-L4744 |
| `GET/PUT /api/tracking` | `GET/PUT /tracking` | Snapshot tracking, foodLog y workoutLog | OK | FE `front/src/app/api/tracking/route.ts` L10-L51, BE `back/src/index.ts` L5069-L5103 |
| `GET/PUT /api/profile` | `GET/PUT /profile` | Perfil JSON | OK | BE `back/src/index.ts` L4917-L4936 |
| `GET/DELETE /api/gyms/membership` | `GET/DELETE /gyms/membership` | Membership activo o leave | OK (con fallback) | FE `front/src/app/api/gyms/membership/route.ts` L4-L17, BE `back/src/index.ts` L7550-L7641 |
| `GET /api/admin/gyms` | `GET /admin/gyms` | FE espera `{gyms:[...]}` (normalizado) | OK (transform) | BFF `front/src/app/api/admin/gyms/route.ts` L5-L13, BE devuelve array `back/src/index.ts` L8723-L8748 |
| `POST /api/admin/gyms` | `POST /admin/gyms` | Create gym (incluye `code`) | Riesgo de validación | BE requiere `code` único (409). Evidencia: `back/src/index.ts` L8714-L8718. |
| `DELETE /api/admin/gyms/[gymId]` | `DELETE /admin/gyms/:gymId` | Delete gym | OK | BE `back/src/index.ts` L8754-L8768 |
| `GET/POST /api/trainer/plans` | `GET/POST /trainer/plans` | List/create planes | OK | BE `back/src/index.ts` L7851-L7925 |
| `PATCH /api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]` | `PATCH /trainer/plans/:planId/days/:dayId/exercises/:exerciseId` | Edit set/reps/etc | OK | BE `back/src/index.ts` L8245-L8293 |

**Mismatches relevantes detectados:**
- **Entitlements:** BE es modular (`strength/nutrition/ai`), FE los colapsa a tier `PRO` (pierde distinción STRENGTH_AI/NUTRI_AI). Evidencia: `back/src/entitlements.ts` L35-L45 vs `front/src/lib/entitlements.ts` L48-L50.
- **Payload shape admin gyms:** BE devuelve array, BFF lo envuelve a `{gyms: ...}`. Es válido, pero añade riesgo de doble normalización si servicios FE esperan array en algún punto. Evidencia: `front/src/app/api/admin/gyms/route.ts` L12-L13 y `back/src/index.ts` L8742-L8748.

### 4.3 IA (assistiva)

**Dónde se usa IA hoy:**
- Backend: `/ai/quota`, `/ai/training-plan`, `/ai/nutrition-plan`, `/ai/*/generate`, `/ai/daily-tip`. Evidencia: rutas en `back/src/index.ts` alrededor de L5191+ (ver Sección 2.2).
- Front: `FeedClient` llama `/api/ai/daily-tip` y `/api/feed/generate`. Evidencia: `front/src/app/(app)/app/feed/FeedClient.tsx` L82-L131.

**Output JSON estructurado + validación + fallback:**
- Evidencia de guard de acceso por plan/tokens: `aiAccessGuard` bloquea con 402 `UPGRADE_REQUIRED`. Evidencia: `back/src/index.ts` L1006-L1017.
- **Assunção**: no se ha verificado aquí (por tiempo) el esquema exacto del JSON de planes IA y su validación antes de persistir, porque vive en secciones largas de `index.ts` y en helpers FE (`training-plan/aiPlanGeneration`). Recomendación: extraer schemas zod y añadir “contract tests” por versión.

**Riesgos (PII/logs) y mitigaciones:**
- Riesgo: logs de debug de auth cookie (`logAuthCookieDebug`) si imprime datos sensibles. Evidencia de llamadas: líneas que invocan `logAuthCookieDebug(request, "/ai/training-plan")` `back/src/index.ts` L5222-L5224 y similares.
- Mitigación: asegurar que logs no incluyan token/cookie completo (redaction), y habilitar debug solo en dev.

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)

> Esta auditoría no ejecutó `npm install` ni builds, por limitación del entorno y porque los zips no incluyen node_modules. Por tanto, se reporta como **No Ejecutado** con evidencia de scripts disponibles.

- Web `npm run build`: **No Ejecutado**. Script existe: `next build`. Evidencia: `front/package.json`.
- Web `lint`: **No Ejecutado**. Evidencia: `front/package.json` (`eslint`).
- Web `typecheck`: **No Ejecutado** (no se ve script dedicado, depende de `next build`). **Assunção**.
- Web `tests`: **No Ejecutado**. Evidencia: existe `vitest.config.ts` en front root.
- API `npm run build`: **No Ejecutado**. Script `prisma generate && tsc`. Evidencia: `back/package.json`.
- API `tests`: existe `src/tests/entitlements.test.ts` (unit tests). Evidencia: `back/src/tests/entitlements.test.ts` L1-L40.

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) **DoD mínimo**
- Login: **PASS (Implementado)**, **No Validado**. Evidencia: middleware `front/src/middleware.ts` L4-L18, `/auth/me` `back/src/index.ts` L4700-L4744.
- `/app` protegido: **PASS**. Evidencia: `front/src/middleware.ts` L4-L23.
- Tab bar: **PASS**. Evidencia: layout `front/src/app/(app)/app/layout.tsx` L1-L15.
- Hoy + 1 acción: **PASS (ruta en tabs)**, **No Validado**. Evidencia: `front/src/components/layout/navConfig.ts` L29-L36.
- Tracking persistente: **PASS**. Evidencia: `back/src/index.ts` L5079-L5103.
- Biblioteca lista+detalle: **PASS (rutas existen)**, **No Validado**.

B) **Entitlements modular**: **FAIL** (mismatch de modelo, UI no refleja módulos). Evidencia: `back/src/entitlements.ts` L35-L100 vs `front/src/lib/entitlements.ts` L48-L50.

C) **Free: métricas básicas + rendimiento + food log con macros/calorías**: **PARTIAL**. Tracking existe y food log por gramos existe, pero el cálculo completo “macros/calorías” depende de user foods y UX no está validada. Evidencia food log en TrackingClient `front/src/app/(app)/app/seguimiento/TrackingClient.tsx` L54-L77, persistencia `back/src/index.ts` L5094-L5099.

D) **Nutrición Premium**: **Implementado (endpoints)**, **No Validado E2E**. Evidencia: `/ai/nutrition-plan*` `back/src/index.ts` L5388-L5785.
E) **Fitness Premium**: **Implementado (endpoints)**, **No Validado E2E**. Evidencia: `/ai/training-plan*` `back/src/index.ts` L5220-L5670.
F) **Gym Pilot**: **PARTIAL** (dominio amplio implementado, pero UX/entitlements/duplicidad de rutas y ausencia de validación impiden autonomía). Evidencia: `/admin/gyms` `back/src/index.ts` L8685-L8748, `isTrainer` en `/auth/me` `back/src/index.ts` L4737-L4743.

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| H-001 | P0 | Producto/Entitlements | FE colapsa planes modulares (`STRENGTH_AI`, `NUTRI_AI`) a `PRO`, perdiendo gating por módulo | Upsell incorrecto, acceso inconsistente, difícil vender “módulos” | `back/src/entitlements.ts` L35-L45; `front/src/lib/entitlements.ts` L48-L50 | UI debe usar `entitlements.modules.*` como verdad, y mostrar locks/CTA por módulo | PM+FE Lead | M |
| H-002 | P0 | Calidad/Release | No hay CI/gate de build, regresiones no se bloquean | Build roto en demo/producción, pérdidas de tiempo | `.github/` no presente en zip front | Añadir GitHub Actions mínimo para build/lint | DevOps/FE Lead | S |
| H-003 | P0 | UX/Arquitectura | Doble árbol de rutas `trainer` y `treinador` | Bugs, enlaces inconsistentes, deuda alta | Lista de páginas en ambos árboles (Sección 2.1) | Canonical route + i18n; redirección 301 interna | FE Lead | S |
| H-004 | P1 | Arquitectura backend | `back/src/index.ts` concentra demasiada lógica (routes + business + schemas) | Cambios arriesgados, test difícil, onboarding lento | Ejemplos de rutas múltiples en mismo archivo (Sección 1/4) | Modularizar por dominio (auth, gym, trainer, ai, billing) manteniendo contratos | BE Lead | M-L |
| H-005 | P1 | Observabilidad/Seguridad | Posible debug de cookies/token en logs (`logAuthCookieDebug`) | Riesgo de exposición de sesión en logs | llamadas en `back/src/index.ts` L5222-L5230 | Redactar, y limitar debug a dev | BE Lead/Sec | S |
| H-006 | P1 | Contratos | `/admin/gyms` devuelve array, BFF envuelve, riesgo de inconsistencias de shape | Bugs en parsers/servicios, duplicación de normalizadores | `front/src/app/api/admin/gyms/route.ts` L12-L13; `back/src/index.ts` L8742-L8748 | Unificar contrato: o BE devuelve `{gyms:[]}` o BFF devuelve array, pero no ambos | FE+BE | S |
| H-007 | P1 | UX | Admin nav muestra “coming soon” en vez de ocultar | Fricción, percepción de producto incompleto | `front/src/components/layout/navConfig.ts` L112-L123 | Ocultar por defecto en prod, mostrar solo en dev | PM+FE | S |
| H-008 | P2 | Tests | Falta smoke tests automatizados (Playwright) para 3 journeys core | Regresiones silenciosas | No evidencia de tests e2e | Playwright: login, tracking save, gym join accept | QA/FE | M |

## 7) Próximos pasos (roadmap)

### Sprint 1 (Apuesta: Estabilidad absoluta de release)
- **Goal:** build verde reproducible, sin intervención manual.
- **Entra:** CI (front+back), scripts de smoke local, checklist PR, eliminación de rutas duplicadas (o redirección).
- **No entra:** features nuevas IA, nuevas pantallas marketing.
- **Métricas:** 100% PRs con build PASS, 0 fallos de `next build` en main/dev, 0 rutas duplicadas trainer.
- **Riesgos/deps:** acceso a GitHub Actions, decisión canonical route (trainer vs treinador).

### Sprint 2 (Apuesta: Entitlements real y upsell por módulo)
- **Goal:** Free/Strength/Nutrition/Pro reflejado en UI con locks y CTA coherentes.
- **Entra:** refactor `getUiEntitlements` para no colapsar planes, componentes de lock por módulo, validar que `/auth/me` se usa como fuente.
- **No entra:** nuevas reglas de pricing, white-label enterprise.
- **Métricas:** 0 pantallas muestran features no permitidas, 100% CTA correctos por plan.
- **Riesgos/deps:** diseño de UX de upsell, contenido i18n.

### Sprint 3 (Apuesta: Gym Pilot “autónomo” en demo)
- **Goal:** E2E Gym: join (code o request) -> accept -> role -> asignar plan -> usuario lo ve, sin consola errors.
- **Entra:** seed demo, hardening contratos admin/trainer, UI estados membership, Playwright para flujo gym.
- **No entra:** integraciones externas (wearables), nuevos módulos.
- **Métricas:** flujo completo en <3 min, 0 errores consola, 0 4xx inesperados.
- **Riesgos/deps:** datos seed en DB, permisos admin/trainer.

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (extracto)

Rutas detectadas (page.tsx) en `front/src/app` (55 páginas). Highlights:
- `/app` (dashboard), `/app/hoy`, `/app/seguimiento`, `/app/nutricion`, `/app/entrenamiento`, `/app/biblioteca`
- `/app/admin/*`: gyms, users, preview, labs, gym-requests
- `/app/trainer/*` y `/app/treinador/*` (duplicado)

### 8.2 Feature flags/toggles

- No se detecta un sistema explícito de feature flags. Sí hay `disabled` en nav para “coming soon”. Evidencia: `front/src/components/layout/navConfig.ts` L115-L123.

### 8.3 Seguridad (secretos)

- En el zip backend se incluye un archivo `.env`. **No se listan valores aquí**. Recomendación: asegurar que `.env` no se versiona en repos real y que el zip compartido no contiene credenciales en texto plano.

## Apéndice: FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-21
Branch de referência: **Assunção** (no incluida en zip)
Owner: Founder/PM (FitSculpt)

> Nota crítica: separa Implementado, Validado E2E, Vendible autónomo. Si no hay evidencia de build PASS + flujo manual probado, se marca como **No Validado**.

### Release Readiness (B2C general)
- **Estado real: NO Release-ready** (por falta de validación automatizada y entitlements no alineados).
- Implementado: login + `/app` protegido; tab bar; tracking persistente; feed con estados UI; i18n base.
- No validado formalmente: build/CI; flujos cronometrados; “0 consola errors”.

### Gym Pilot Readiness (B2B pequeño gym)
- **Estado real: demo asistida, no autónomo.**
- Implementado: dominio gym + endpoints admin/trainer + `isTrainer` en `/auth/me`.
- Gaps P0: entitlements modular en UI, rutas duplicadas trainer, ausencia de seed y smoke tests.
