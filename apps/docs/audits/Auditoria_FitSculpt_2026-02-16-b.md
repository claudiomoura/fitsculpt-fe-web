# Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)
Fecha: 2026-02-16  
Autor/a auditoría: Senior Staff Architects (audit assisted by GPT-5.2 Thinking)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa completo y verificable de “qué existe hoy” + gaps del MVP modular + readiness para vender a un gym pequeño.

> Nota de evidencia: todo lo afirmado abajo se apoya en archivos de los zips (`front.zip`, `back.zip`) con rutas y rangos de líneas. Cuando no hay prueba en código, queda marcado como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Release-ready: NO.** Hay desalineación crítica FE↔BE en creación de gimnasios (frontend no envía `code`, backend lo exige), lo que rompe el flujo principal de admin y el piloto de gym. Evidencia: FE envía solo `name` (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L70-L104), BE exige `name` y `code` (back/src/index.ts:L6145-L6163) y parsea `{ name, code }` (back/src/index.ts:L6595-L6630).
- **MVP Modular: NO.** El backend define módulos (strength/nutrition/ai) por plan, pero el frontend colapsa planes en un tier “PRO” y además introduce un tier “GYM” que no existe en backend. Evidencia: BE `SubscriptionPlan` (back/prisma/schema.prisma:L437-L447) y `buildEffectiveEntitlements` (back/src/entitlements.ts:L12-L101); FE `EntitlementTier = "FREE" | "PRO" | "GYM"` y normalización (front/src/lib/entitlements.ts:L24-L57).
- **Gym Pilot: NO.** Join por solicitud/código existe en BE y FE, pero hay señales de “feature escondida” a admin (nav marca Gym Requests como disabled), lo que encaja con el fallo reportado de no ver solicitudes. Evidencia: sidebar admin con `disabled: true` (front/src/components/layout/navConfig.ts:L108-L127) y página existente `AdminGymRequestsPage` (front/src/app/(app)/app/admin/gym-requests/page.tsx:L1-L18).
- **Top 5 riesgos (impacto directo demo/piloto):**
  1) Creación de gym rota por contrato (400). Evidencia arriba.
  2) Entitlements inconsistentes (tier “GYM” inexistente, colapso de planes). Evidencia arriba.
  3) Endpoints BFF implementados en FE pero inexistentes en BE (tokens/plan admin user). Evidencia: FE `/api/admin/users/[id]/tokens-allowance` proxy a BE (front/src/app/api/admin/users/[id]/tokens-allowance/route.ts:L1-L22); BE no define esa ruta (solo `/admin/users/:id/...` para verify/reset/block/unblock/delete) (back/src/index.ts:L6745-L6927).
  4) Quality gates no demostrados en este entorno “clean” offline (deps no instalables), riesgo de regressions. Evidencia: `npm run lint` falla por `eslint: not found` (salida de auditoría).
  5) Duplicidad de función `getBackendUrl` con defaults distintos, riesgo de “config drift”. Evidencia: `front/src/lib/backend.ts` default `http://localhost:4000` (front/src/lib/backend.ts:L1-L3) vs `front/src/lib/getBackendUrl.ts` default `http://127.0.0.1:4000` y `.replace(/\/$/, "")` (front/src/lib/getBackendUrl.ts:L1-L10).
- **Top 5 quick wins (1-2 días cada uno, desbloquean demo):**
  1) En Admin Gyms, añadir campo `code` (y validación) y enviarlo al POST. Evidencia contrato BE (back/src/index.ts:L6145-L6163).
  2) Activar “Gym Join Requests” en navegación admin (quitar `disabled: true`) o enlazarlo desde Admin Gyms, el manager ya existe. Evidencia FE (front/src/components/layout/navConfig.ts:L108-L127) y `GymJoinRequestsManager` usado en Admin Gyms (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L169-L194).
  3) Eliminar tier “GYM” del FE y usar entitlements reales (módulos + plan efectivo). Evidencia FE (front/src/lib/entitlements.ts:L24-L80) y BE (back/src/entitlements.ts:L12-L101).
  4) Alinear mismatch `trainer/members/:clientId/training-plan-assignment` con BE `:userId` (o aceptar ambos en BE). Evidencia: BE expone `:userId` (back/src/index.ts:L5780-L5780).
  5) Unificar `getBackendUrl` en FE (una sola fuente) y asegurar trimming de slash. Evidencia: duplicidad (front/src/lib/backend.ts:L1-L3) y (front/src/lib/getBackendUrl.ts:L1-L10).

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

#### Rutas principales (usuario final) en `front/src/app/(app)/app/*`
- Dashboard: `/app` (layout con tab bar móvil). Evidencia: layout (front/src/app/(app)/app/layout.tsx:L1-L18).
- Hoy: `/app/hoy`. Evidencia: carpeta `front/src/app/(app)/app/hoy/*`.
- Biblioteca: `/app/biblioteca` y `/app/biblioteca/[exerciseId]`. Evidencia: carpeta `front/src/app/(app)/app/biblioteca/*`.
- Seguimiento/Tracking: `/app/seguimiento`. Evidencia: `TrackingClient` usa `/api/tracking` (front/src/app/(app)/app/seguimiento/TrackingClient.tsx:L360-L580).
- Nutrición: `/app/nutricion` y `/app/nutricion/editar`. Evidencia: carpeta `front/src/app/(app)/app/nutricion/*`.
- Entrenamiento: `/app/entrenamiento` y `/app/entrenamiento/editar`. Evidencia: carpeta `front/src/app/(app)/app/entrenamiento/*`.
- Gym: `/app/gym`. Evidencia: `GymPageClient` (front/src/components/gym/GymPageClient.tsx:L1-L210).

#### Admin (`/app/admin/*`)
- `/app/admin/users`. Evidencia: carpeta `front/src/app/(app)/app/admin/users/*`.
- `/app/admin/gyms`. Evidencia: `AdminGymsClient` (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L1-L210).
- `/app/admin/gym-requests`. Evidencia: `AdminGymRequestsPage` (front/src/app/(app)/app/admin/gym-requests/page.tsx:L1-L18).

#### Trainer (duplicidad de árboles)
- `/app/trainer/*` y `/app/treinador/*` coexisten. Evidencia: árbol de rutas (carpetas presentes) y navegación `sidebarTrainer` (front/src/components/layout/navConfig.ts:L129-L171).

#### Callejones sin salida detectados
- Admin Gym Requests existe pero está deshabilitado en el sidebar. Evidencia: `disabled: true` (front/src/components/layout/navConfig.ts:L108-L127).
- “Development/Labs” lista muchas rutas, riesgo de UX premium degradada. Evidencia: `sidebarDevelopment` (front/src/components/layout/navConfig.ts:L172-L240).

### 2.2 Flujos end-to-end (journeys)

#### Login + acceso a `/app` protegido
- Esperado: sin `fs_token`, redirige a `/login?next=...`.
- Estado: **OK (infra)**. Evidencia: `middleware.ts` (front/src/middleware.ts:L1-L29).

#### Hoy + 1 acción rápida
- Evidencia de wiring: componentes consultan `/api/tracking`. Estado: **Parcial**. Evidencia: `TodaySummaryClient` (front/src/app/(app)/app/hoy/TodaySummaryClient.tsx:L287-L300).

#### Biblioteca: lista → detalle
- Estado: **Parcial** (rutas existen, sin validación E2E aquí). Evidencia: helper de media (front/src/lib/exerciseMedia.ts:L1-L120).

#### Tracking: crear 1 registro y confirmar persistencia
- FE: GET/PUT `/api/tracking` y DELETE por colección/id. Estado: **Parcial**. Evidencia: (front/src/app/(app)/app/seguimiento/TrackingClient.tsx:L360-L580).
- BE: tracking se persiste en `UserProfile.tracking` JSON. Evidencia: prisma `UserProfile.tracking` (back/prisma/schema.prisma:L48-L60).

#### Food log: ítems por gramos + macros/calorías
- FE: CRUD `/api/user-foods`. Evidencia: (front/src/app/(app)/app/seguimiento/TrackingClient.tsx:L612-L640).
- BE: modelo `UserFood` con macros. Evidencia: (back/prisma/schema.prisma:L63-L83).
- Estado: **Parcial** (parece implementado, no ejecutado E2E).

#### IA Nutrición / IA Fitness
- BE valida outputs con schemas y controla rate limit IA. Evidencia: imports (back/src/index.ts:L13-L22) y limit handler (back/src/index.ts:L72-L96).
- Estado: **Parcial** (existe, falta coherencia con entitlements en FE).

#### Gym Pilot
- Usuario: lista gyms y join por solicitud/código. Evidencia FE (front/src/components/gym/GymPageClient.tsx:L80-L170); BE membership/join-code (back/src/index.ts:L6268-L6335).
- Admin: requests manager existe, pero nav lo esconde. Evidencia: (front/src/components/layout/navConfig.ts:L108-L127) y `GymJoinRequestsManager` (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L169-L194).
- Admin create gym: **FAIL** por contrato. Evidencia: FE (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L80-L104) vs BE schema (back/src/index.ts:L6145-L6163).

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

- Backend define planes: `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`. Evidencia: (back/prisma/schema.prisma:L437-L447).
- Backend expone módulos: `strength`, `nutrition`, `ai`. Evidencia: (back/src/entitlements.ts:L12-L101).
- Frontend colapsa y añade tier “GYM”. Evidencia: (front/src/lib/entitlements.ts:L24-L80).

Conclusión: **FAIL** (no hay correspondencia 1:1 de tiers/planes).

---

## 3) Auditoría UX (mobile-first)

### Tab bar y navegación
- `MobileTabBar` existe y está cableada. Evidencia: tabs (front/src/components/layout/navConfig.ts:L19-L72) y componente (front/src/components/layout/MobileTabBar.tsx:L1-L58).
- Riesgo: coexistencia de `/app` y `/app/dashboard` y rutas duplicadas trainer/treinador.

### Estados obligatorios
- Gym UX: buen manejo de estados (loading/error/empty/expired/unsupported). Evidencia: (front/src/components/gym/GymPageClient.tsx:L40-L160).
- Admin create gym: error genérico “create”, no muestra el motivo real (Zod P400). Evidencia: catch (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L70-L106).

### 10 fricciones concretas (acción)
1) Crear gym roto (contrato). Fix: input `code` + mostrar error detallado.
2) Gym Requests oculto. Fix: habilitar en nav y/o en Admin Gyms.
3) Entitlements inventados. Fix: modules-driven gating.
4) Doble dashboard route. Fix: consolidar.
5) Doble trainer route. Fix: canonical.
6) Labs: demasiadas entradas, degradación premium. Fix: accordion cerrado por defecto + search.
7) Errores BE (Zod) no visibles en FE. Fix: surface `details`.
8) `getBackendUrl` duplicado. Fix: unificar.
9) Admin gyms lista meta repetida por gym. Fix: summary del seleccionado.
10) Join by code: feedback parcial para errores no INVALID_GYM_CODE. Fix: manejar 400/409.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)
- FE protege por `fs_token` en middleware. Evidencia: (front/src/middleware.ts:L1-L29).
- BFF reinyecta cookie en proxy. Evidencia: auth/me (front/src/app/api/auth/me/route.ts:L1-L26) y gym proxy helper (front/src/app/api/gyms/_proxy.ts:L1-L63).
- BE JWT cookie `fs_token`. Evidencia: (back/src/index.ts:L44-L58).

### 4.2 Contratos FE↔BE (mapa)

| BFF `/api/*` | Backend esperado | Estado | Evidencia |
|---|---|---|---|
| `/api/auth/me` | `GET /auth/me` | OK | FE (front/src/app/api/auth/me/route.ts:L1-L26) |
| `/api/gyms` | `GET /gyms` | OK | FE (front/src/app/api/gyms/route.ts:L1-L9); BE (back/src/index.ts:L6175-L6205) |
| `/api/gym/me` | `GET /gym/me` | OK | FE (front/src/services/gym.ts:L152-L170); BE (back/src/index.ts:L6268-L6312) |
| `/api/gym/join-code` | `POST /gym/join-code` | OK | FE (front/src/components/gym/GymPageClient.tsx:L112-L149); BE (back/src/index.ts:L6314-L6335) |
| `/api/admin/gyms` (POST) | `POST /admin/gyms` | **Mismatch (input)** | FE (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L80-L99); BE (back/src/index.ts:L6145-L6163) |
| `/api/admin/users/[id]/tokens-allowance` | `PATCH /admin/users/:id/tokens-allowance` | **Missing** | FE (front/src/app/api/admin/users/[id]/tokens-allowance/route.ts:L1-L22); BE admin users block (back/src/index.ts:L6745-L6927) |
| `/api/admin/users/[id]/plan` | `POST /admin/users/:id/plan` | **Missing** | FE folder existe, BE no lo implementa (bloque admin users) (back/src/index.ts:L6745-L6927) |
| `/api/trainer/members/[id]/training-plan-assignment` | `GET /trainer/members/:userId/training-plan-assignment` | **Mismatch (naming)** | BE (back/src/index.ts:L5780-L5780) |

### 4.3 IA (assistiva)
- BE valida JSON output via schemas y tiene rate limit. Evidencia: (back/src/index.ts:L13-L22) y (back/src/index.ts:L72-L96).
- Riesgo PII/logs: **Assunção**.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica
- Node detectado: `v22.16.0` (auditoría local).
- `npm run lint` en FE: **FAIL** por `eslint: not found` (deps no instaladas en este entorno offline).
- build/typecheck/tests: **NOT RUN** en esta auditoría por dependencia de instalación de paquetes.

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL)
- Login + /app protegido: **PASS (infra)** (front/src/middleware.ts:L1-L29).
- Tab bar: **PASS (render)** (front/src/components/layout/MobileTabBar.tsx:L1-L58).
- Tracking + food log: **Parcial** (contratos presentes, no ejecutado E2E).
- Entitlements modular: **FAIL** (front/src/lib/entitlements.ts:L24-L80).
- Gym Pilot: **FAIL** (create gym) + **Parcial** (join/membership).

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---:|---|---|---|---|---|---|---|---|
| 1 | P0 | Gym/Admin | Crear gimnasio falla (FE no manda `code`) | Bloquea piloto y demo | FE (front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx:L80-L104); BE (back/src/index.ts:L6145-L6163) | Añadir input `code` + validación + surface error | FE + PM | S |
| 2 | P0 | Entitlements | Tier “GYM” inventado y colapso de planes | Gating incorrecto | FE (front/src/lib/entitlements.ts:L24-L80); BE (back/src/entitlements.ts:L12-L101) | Usar `entitlements.modules` como source of truth | FE + BE | M |
| 3 | P0 | Admin UX | Gym Requests disabled en sidebar | Admin no ve solicitudes | (front/src/components/layout/navConfig.ts:L108-L127) | Habilitar item, añadir contador | FE | S |
| 4 | P1 | Contratos | Endpoints tokens/plan admin existen en FE pero no en BE | Funciones fantasma | FE (front/src/app/api/admin/users/[id]/tokens-allowance/route.ts:L1-L22); BE (back/src/index.ts:L6745-L6927) | Implementar o esconder UI | BE + PM | M |
| 5 | P1 | Config | Doble `getBackendUrl` | Bugs intermitentes | (front/src/lib/backend.ts:L1-L3) vs (front/src/lib/getBackendUrl.ts:L1-L10) | Unificar helper | FE | S |
| 6 | P1 | Trainer | Mismatch training-plan-assignment | Trainer flow frágil | BE (back/src/index.ts:L5780-L5780) | Alinear ruta/params | FE + BE | S |

---

## 7) Próximos pasos (roadmap)

### Sprint 1, “Gym Pilot end-to-end”
- Goal: create gym, join (request/code), admin accept, miembros activos visibles.
- Entra: fix contrato create gym, habilitar gym requests en nav, checklist E2E demo.
- Métricas: 100% éxito del flujo, 0 errores console.

### Sprint 2, “Core loop premium impecable”
- Goal: Hoy + tracking + food log sin fricción.
- Entra: estados UX, food por gramos con macros, consolidar dashboard/hoy.
- Métricas: 0 dead ends, 0 placeholders fake.

### Sprint 3, “Entitlements reales y monetización lista”
- Goal: gating por módulos BE y planes reales.
- Entra: refactor entitlements FE, ocultar premium a FREE, admin override.
- Métricas: 0 accesos indebidos, telemetría básica de uso.

---

## 8) Anexos

- Seguridad: se detecta `back/.env` en el zip, no se incluye aquí.
