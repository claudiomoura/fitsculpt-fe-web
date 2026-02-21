# Auditoria_FitSculpt_2026-02-16.md
Fecha: 2026-02-16  
Autor/a auditoría: Equipo Senior Staff Architects (auditoría asistida)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa completo y verificable de “qué existe hoy”, gaps del MVP modular, readiness para vender a un gym pequeño.

> Nota de evidencia: todo lo afirmado abajo se apoya en archivos del zip (rutas y line ranges indicados). Cuando no hay prueba en el código, queda marcado como **Assunção**.

---

## 1) Executive Summary (máx 12 bullets)

- **Estado general: Release-ready = NO**. Hay un bloqueo P0 que rompe `/auth/me` y, por arrastre, deja la app sin menú admin/trainer, por un mismatch DB vs Prisma en `GymMembership.assignedTrainingPlanId`. Evidencia: `Back/prisma/schema.prisma` (L419-L425) y consultas `findFirst` sin `select` en `Back/src/index.ts` (L3974-L3987 y L6129-L6138).
- **MVP modular: mejora real, pero incompleto**. El backend ya separa planes `FREE | PRO | STRENGTH_AI | NUTRI_AI` (y mapea Stripe a cada uno). Aun así, el frontend sigue interpretando planes antiguos (`FREE | PRO | GYM`), por lo que el gating de UI puede quedar incorrecto. Evidencia: BE `Back/prisma/schema.prisma` (L391-L396) y `Back/src/index.ts` (L166-L197), FE `Front/src/lib/entitlements.ts` (L6-L23).
- **Gym Pilot: ya existe en código (BE + BFF + pantallas), pero no es operable aún**. Hay modelos `Gym`, `GymMembership`, `GymJoinRequest` y endpoints para crear gyms, unirse por código, pedir acceso, aprobar, gestionar miembros y asignar plan. Lo que lo frena es el P0 anterior y algunos mismatches en UI (miembros). Evidencia: schema `Back/prisma/schema.prisma` (L398-L439), endpoints gym/admin en `Back/src/index.ts` (por ejemplo L5840+ y L6170+), pantallas FE: `Front/src/app/(app)/app/gym/page.tsx`, `/app/admin/gyms`, `/app/admin/gym-requests`.
- **Biblioteca v2 (lo pedido): ya soporta “+ Añadir al plan”**. La biblioteca permite seleccionar día y postear ejercicio a un plan, y soporta modo trainer con `athleteUserId`. Evidencia: FE `Front/src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` (L294-L309), BE `Back/src/index.ts` (L5506-L5521).
- **Admin tokens y cambio de plan siguen rotos**. El frontend mantiene BFF para tokens y plan por usuario, pero el backend no expone esas rutas. Evidencia FE: `Front/src/app/api/admin/users/[id]/plan/route.ts`, `Front/src/app/api/admin/users/[id]/tokens/*`, BE: no existen rutas equivalentes (búsqueda en `Back/src/index.ts`).
- **Billing status: FIX aplicado**. En el frontend ya usa `getBackendUrl()` para `/api/billing/status`. Evidencia: `Front/src/app/api/billing/status/route.ts` (L8-L16).
- **Seguridad: sigue crítico**. El zip de backend incluye `.env` con secretos. Evidencia: `Back/.env` (presente en raíz).

**Top 5 riesgos**
1) P0 DB/Prisma mismatch en `GymMembership.assignedTrainingPlanId` rompe `/auth/me` y `/gym/me`.  
2) Entitlements FE desalineados con planes reales del backend (nuevo split Nutri/Strength).  
3) UI Gym Admin (miembros) no usa endpoints gym específicos, y depende de `profile` para `gymId` (no fiable).  
4) Admin tokens y plan patch siguen sin backend.  
5) `.env` con secretos empaquetado.

**Top 5 quick wins**
1) Aplicar migraciones Prisma a la DB o, como hotfix, añadir `select` explícito en consultas de `GymMembership` hasta migrar (ver FS-010).  
2) Alinear `Front/src/lib/entitlements.ts` con `SubscriptionPlan` real (FREE, PRO, STRENGTH_AI, NUTRI_AI).  
3) Conectar UI de miembros de gym a `/api/admin/gym/:gymId/members` y derivar `gymId` desde `/api/gym/me` o `/api/auth/me`.  
4) Ocultar o retirar UI de admin tokens/plan hasta implementar rutas reales.  
5) Eliminar `.env` del zip y rotar claves si este zip ha circulado.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación (Next App Router)

> Conteo del snapshot: 54 páginas `page.tsx` bajo `Front/src/app/**` (aprox).

**Público/Auth**
- `/`, `/login`, `/register`, `/verify-email`

**App core (usuario)**
- `/app` (dashboard), `/app/hoy`, `/app/seguimiento`, `/app/biblioteca` (lista + detalle), `/app/nutricion`, `/app/dietas`, `/app/macros`, `/app/feed`, `/app/profile`, `/app/settings`, `/app/onboarding`

**Gym / Trainer (nuevo)**
- `/app/gym` (estado y acciones: unirse por código, pedir acceso)
- `/app/trainer/clients` (lista de clientes)
- `/app/trainer/clients/[userId]` (gestión del atleta, “añadir ejercicios” y plan asignado)

**Admin (sigue existiendo)**
- `/app/admin`, `/app/admin/users`, `/app/admin/gyms`, `/app/admin/gym-requests`, `/app/admin/labs`, `/app/admin/preview`

### 2.2 Flujos end-to-end (journeys)

#### Biblioteca: “+ Añadir al plan” (usuario y trainer)
- FE: al pulsar “Añadir”, abre selector de día y hace:
  - `POST /api/training-plans/{planId}/days/{dayId}/exercises` con `{exerciseId}` y opcional `{athleteUserId}`.  
  Evidencia: `Front/src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` (L294-L309).
- BE: endpoint existe y, si viene `athleteUserId`, valida que el trainer sea coach/admin del gym del atleta, y que exista `assignedTrainingPlanId` activo en la membresía.  
  Evidencia: `Back/src/index.ts` (L5506-L5521 y L5570-L5596).

**Estado**: funcional “en teoría”, pero depende del P0 de migración, porque el endpoint usa `assignedTrainingPlanId` y la query del membership falla si falta la columna.

#### Gym: unirse a gym por código y “join request”
- FE: `GymPageClient` usa `/api/gym/me`, y acciones:
  - `POST /api/gym/join-code` (por código)
  - `POST /api/gym/join-request` (solicitud)  
  Evidencia: `Front/src/components/gym/GymPageClient.tsx`.
- BE: soporta ambas familias de rutas: `/gym/*` y `/gyms/*` para compatibilidad.  
  Evidencia: `Back/src/index.ts` (bloques L5840-L6070 aprox).

**Gap**: `/auth/me` solo reporta membresía **ACTIVE** (no pending), lo que puede ocultar estados intermedios en UI si no se consulta `/gym/me`.  
Evidencia: `Back/src/index.ts` (L3974-L3987).

#### Trainer: ver clientes y operar plan asignado
- FE: `/app/trainer/clients` llama a `/api/trainer/clients`. Evidencia: `Front/src/components/trainer/TrainerClientsList.tsx`.
- BE: `GET /trainer/clients` devuelve miembros del gym donde el usuario es coach/admin. Evidencia: `Back/src/index.ts` (L6321-L6369).
- FE: desde un cliente, se puede navegar a biblioteca con `athleteUserId` y usar “Añadir al plan”. Evidencia: `ExerciseLibraryClient.tsx` (L300-L309).

---

## 3) Entitlements y planes (estado real)

### 3.1 Backend (fuente de verdad)
Planes soportados hoy (DB):
- `FREE`
- `PRO`
- `STRENGTH_AI`
- `NUTRI_AI`  
Evidencia: `Back/prisma/schema.prisma` (L391-L396).

Stripe mapping en backend:
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_STRENGTH_AI`
- `STRIPE_PRICE_NUTRI_AI`  
Evidencia: `Back/src/index.ts` (L166-L197).

### 3.2 Frontend (desalineado)
- FE todavía define `EntitlementTier = "FREE" | "PRO" | "GYM"` y calcula capabilities en base a eso.  
Evidencia: `Front/src/lib/entitlements.ts` (L6-L23, L40-L112).

**Impacto**:
- Si el backend devuelve `NUTRI_AI` o `STRENGTH_AI`, la UI queda en `UNKNOWN_TIER` y el gating de features puede quedar inconsistente (dependiendo de dónde se use).
- Para vender modularidad, el FE debe entender esos planes y reflejar capacidades separadas por dominio.

---

## 4) Auditoría de Arquitectura y Contratos (cambios relevantes)

### 4.1 Nuevos dominios en backend
- Gym: `Gym`, `GymMembership`, `GymJoinRequest` en Prisma. Evidencia: `Back/prisma/schema.prisma` (L398-L439).
- Endpoints gym: join, join-code, membership, gym/me. Evidencia: `Back/src/index.ts` (L5840-L6070).
- Admin gym: CRUD gyms, join-requests, miembros, asignación de plan. Evidencia: `Back/src/index.ts` (L6170-L6265 y L6760+).
- Trainer: clientes + lectura de asignación de plan. Evidencia: `Back/src/index.ts` (L6321-L6420).

### 4.2 Contratos FE↔BE (resumen actualizado)

| Área | FE BFF `/api/*` | BE | Estado |
|---|---|---|---|
| Billing status | `/api/billing/status` | `/billing/status` | OK (config unificada) |
| Gym page | `/api/gym/*` | `/gym/*` (+ `/gyms/*`) | OK (bloqueado por P0 migración) |
| Admin gyms | `/api/admin/gyms` | `/admin/gyms` | OK |
| Admin gym join requests | `/api/admin/gym-join-requests` | `/admin/gym-join-requests` | OK (requiere membership ACTIVE ADMIN) |
| Trainer clients | `/api/trainer/clients` | `/trainer/clients` | OK |
| Add exercise to plan day | `/api/training-plans/:id/days/:dayId/exercises` | igual | OK (bloqueado por P0 migración si usa membership) |
| Admin user tokens | `/api/admin/users/:id/tokens/*` | (no existe) | FAIL |
| Admin user plan patch | `/api/admin/users/:id/plan` | (no existe) | FAIL |

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica
- Commit hash: **no disponible** (zips sin `.git`).
- Backend: sigue en un único `Back/src/index.ts` muy grande, con dominios añadidos.
- Prisma migrations: existen migraciones recientes para gym y `assigned_training_plan`. Evidencia: `Back/prisma/migrations/20260217090000_add_gym_member_assigned_training_plan`.

### 5.2 Bloqueos para RC (Release Candidate)
- **P0: DB sin migrar**. Prisma asume columna `assignedTrainingPlanId` y ejecuta `findFirst` sin `select` en:
  - `/auth/me` (L3974-L3987)
  - `getGymMembership` usado por `/gym/me` y por endpoints de trainer (L6129-L6138)  
  Evidencia: `Back/src/index.ts` (L3974-L3987, L6129-L6138), `Back/prisma/schema.prisma` (L419-L425).

---

## 6) Hallazgos priorizados (tabla)

| ID | Sev | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-001 | P0 | Seguridad | `.env` con secretos incluido en el zip backend | Riesgo grave si se comitea o circula | `Back/.env` | Eliminar `.env`, usar `.env.example`, rotar claves | Backend + DevOps | S |
| FS-010 | P0 | DB/Prisma | Columna `assignedTrainingPlanId` falta en DB o migración no aplicada, rompe `/auth/me` y gym/trainer flows | App sin admin/trainer y gym bloqueado | `schema.prisma` L419-L425, `index.ts` L3974-L3987 y L6129-L6138 | Aplicar migración. Hotfix: añadir `select` para evitar leer columna hasta migrar | Backend | S |
| FS-011 | P0 | Producto/Entitlements | FE no entiende `STRENGTH_AI` y `NUTRI_AI` | Gating inconsistente, modularidad no vendible | `Back/schema.prisma` L391-L396, `Front/entitlements.ts` L6-L23 | Alinear tipos y capabilities en FE con BE | PM + FE | S |
| FS-012 | P1 | Gym Admin UI | `GymAdminMembersClient` usa `/api/admin/users` y deriva `gymId` desde `profile`, no desde membership | No operable para membresías reales | `Front/GymAdminMembersClient.tsx` L31-L63 y L89-L120 | Cambiar a `/api/admin/gym/:gymId/members` y obtener `gymId` desde `/api/gym/me` | FE | M |
| FS-013 | P1 | Gym estados | `/auth/me` solo considera membership ACTIVE, ignora PENDING | Usuarios en pending quedan como “no gym” en UI | `Back/index.ts` L3974-L3987 | Incluir pending en `/auth/me` o usar `/gym/me` como fuente y mapear estados | Backend + FE | M |
| FS-002 | P1 | Admin tokens | BFF admin tokens sin rutas backend | Admin UI rota | FE rutas `/api/admin/users/[id]/tokens/*`, BE sin endpoints | Implementar endpoints o retirar UI | Backend + FE | M |
| FS-003 | P1 | Admin plan change | BFF `/admin/users/:id/plan` sin ruta backend | No se puede cambiar plan | `Front/.../plan/route.ts` | Implementar endpoint o retirar feature | Backend + FE | M |
| FS-014 | P2 | API design | Duplicidad `/gym/*` y `/gyms/*` | Superficie API mayor, más mantenimiento | `Back/index.ts` (bloques gym y gyms) | Elegir una familia y deprecar la otra | Backend | M |
| FS-015 | P2 | FE/Next | Warning “middleware deprecated, use proxy” | Deuda técnica, posible rotura futura | `Front/src/middleware.ts` (y warnings runtime) | Plan de migración a convención nueva de Next | FE | S |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1 (Apuesta: “Gym Pilot usable + RC hardening”)
**Goal:** gym y trainer operables end-to-end, sin bloqueos P0.  
**Entra:**
- FS-001, FS-010, FS-011, FS-012, FS-013.
- Desactivar o esconder admin tokens/plan (FS-002, FS-003) si no se implementan.
- Validación rápida: `/auth/me`, `/gym/me`, `/trainer/clients` y “add exercise to athlete plan” funcionando sin 500.
**Métricas:**
- 0 errores 500 en `/auth/me` y `/gym/me`.
- 0 llamadas desde FE a endpoints inexistentes (en navegación admin/trainer).

### Sprint 2 (Apuesta: “Modularidad vendible por dominio”)
**Goal:** vender Nutri vs Strength AI (y Bundle si decides).  
**Entra:**
- FE gating basado en `SubscriptionPlan` real, con UI clara de upgrades.
- Billing: unificar naming y documentación de precios (Stripe).
- Ajustar copy y pantallas de “locked feature” sin frustración.
**Métricas:** tasa de upgrade por módulo, reducción de “UNKNOWN_TIER”.

### Sprint 3 (Apuesta: “Gym pilot pequeño vendible”)
**Goal:** onboarding gym, aprobación, asignación de plan, operación trainer diaria.  
**Entra:**
- Templates de plan por gym (si producto lo requiere), o catálogo de planes asignables.
- Panel admin: miembros, roles, invitaciones, join requests, “assign plan” usable.
- Trainer: clientes, progreso, cambios de plan, biblioteca con atleta preseleccionado.
**Métricas:** tiempo de activación del gym y primer plan asignado.

---

## 8) Anexos

### 8.1 Evidencias clave (rutas y line ranges)
- Planes BE: `Back/prisma/schema.prisma` L391-L396  
- GymMembership + assignedTrainingPlanId: `Back/prisma/schema.prisma` L419-L425  
- `/auth/me` membership ACTIVE: `Back/src/index.ts` L3974-L3987  
- `getGymMembership` findFirst sin select: `Back/src/index.ts` L6129-L6138  
- Add exercise to plan day (BE): `Back/src/index.ts` L5506-L5521  
- Add exercise to plan day (FE): `Front/src/app/(app)/app/biblioteca/ExerciseLibraryClient.tsx` L294-L309  
- Entitlements FE desalineado: `Front/src/lib/entitlements.ts` L6-L23  
- Billing status fix FE: `Front/src/app/api/billing/status/route.ts` L8-L16  
- GymAdminMembersClient mismatch: `Front/src/components/gym/GymAdminMembersClient.tsx` L31-L63 y L89-L120  

### 8.2 Secretos
- Detectado `.env` en backend zip. No se incluyen valores aquí (seguridad). Recomendación: remover y rotar.

---
Fin del documento.
