# Auditoria_FitSculpt_2026-02-19.md
Fecha: 2026-02-19  
Autor/a auditoría: GPT-5.2 Thinking (Senior Staff Architects)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa verificable de “qué existe hoy” + gaps MVP modular + readiness para vender a un gym pequeño.

> Nota de evidencia: todo lo afirmado abajo se apoya en archivos del zip (rutas + líneas). Cuando falta prueba directa, queda marcado como **Assunção**.  
> Zips auditados: `front.zip` (Next.js web) y `back.zip` (Fastify/Prisma API).

---

## 1) Executive Summary (máx 12 bullets)

- **Estado general (Release-ready): NO.** La web ha tenido regresiones de TypeScript en build (bloqueador total). Evidencia: componente marketing con navegación y estado: `front/src/components/marketing/MarketingHeader.tsx`.  
- **Estado MVP Modular: NO.** Hay parsing defensivo/compat en servicios Gym (`parseMembership`, `parseGymJoinRequests`, etc.), lo que indica contratos no estables. Evidencia: `front/src/services/gym.ts` L206-L235.  
- **Estado Gym Pilot: PARCIAL.** Backend tiene endpoints admin de gyms implementados, pero el BFF introduce un shape distinto (wrapper `{ gyms: ... }`), lo que obliga a normalización y aumenta riesgo de mismatch. Evidencia: `back/src/index.ts` L7907-L7932 y `front/src/app/api/admin/gyms/route.ts` L12.  
- **Top 5 riesgos:**
  1) Contracts FE↔BFF↔BE sin “single source of truth” (normalizaciones, wrappers, parse defensivo). Evidencia: `front/src/services/gym.ts` L206-L235.  
  2) Duplicidad de rutas Trainer (`/trainer` y `/treinador`) amplía deuda y puntos de rotura. Evidencia: árbol `front/src/app/(app)/app/{trainer,treinador}`.  
  3) Build puede romper por módulos no-core (marketing), bloqueando el Gym MVP. Evidencia: `front/package.json` incluye `build` pero no hay gate documentado.  
  4) Capabilities declaradas vs reales: `supportsLeaveGym: true` con inventario que marca endpoints “exists true/false”. Evidencia: `front/src/services/gym.ts` L60-L101.  
  5) Roles: backend exige `requireAdmin` en `/admin/gyms`, y otras acciones requieren manager por gym. Si FE no refleja roles, habrá 403/UX roto. Evidencia: `back/src/index.ts` L7907-L7942.  
- **Top 5 quick wins:**
  1) Definir envelope estándar para listas en BFF y adoptarlo en FE (eliminar wrappers ad-hoc).  
  2) Retirar `/treinador` o convertirlo en redirect, para reducir rutas duplicadas.  
  3) “Build siempre PASS”: no merge sin `npm run build` en web y api.  
  4) Capability backend-driven (o feature flag real) en lugar de constantes hardcodeadas.  
  5) Normalizar errores de BFF (`code`, `message`, `fieldErrors`) para evitar parsing genérico.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación

**App (usuario autenticado)** vive en `front/src/app/(app)/app/*`

Rutas core detectadas:
- `/app/hoy` → `front/src/app/(app)/app/hoy`
- `/app/gym` → `front/src/app/(app)/app/gym`
- `/app/trainer/*` → `front/src/app/(app)/app/trainer`
- `/app/treinador/*` → `front/src/app/(app)/app/treinador` (duplicado)
- `/app/admin/*` → `front/src/app/(app)/app/admin`
  - `/app/admin/gyms` → `front/src/app/(app)/app/admin/gyms`
  - `/app/admin/gym-requests` → `front/src/app/(app)/app/admin/gym-requests`

**Auth/public**:
- `/login`, `/register` → `front/src/app/(auth)`
- `/pricing` → `front/src/app/pricing`
- Marketing UI → `front/src/components/marketing/*`

Callejones sin salida (riesgo por estructura):
- Duplicidad `/trainer` vs `/treinador`.
- Acciones declaradas como no soportadas en inventory deben estar siempre disabled. Evidencia: `front/src/services/gym.ts` L82-L99.

### 2.2 Flujos end-to-end (journeys) (evidencia en código)

- **Admin gyms: create/list/delete**
  - Backend implementa `POST/GET/DELETE /admin/gyms`. Evidencia: `back/src/index.ts` L7869-L7960.
  - BFF proxy `GET/POST /api/admin/gyms` y envuelve en `{ gyms: ... }`. Evidencia: `front/src/app/api/admin/gyms/route.ts` L12.
  - FE AdminGymsClient consume BFF y normaliza payload. Evidencia: `front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx` (función `loadGyms`).
- Login + `/app` protegido: estructura existe, validación runtime no incluida en zip. **Assunção**.
- Leave gym: capability declarada, backend endpoint exacto no validado en esta pasada. **Assunção**.

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

- Hay gating (`useAccess`) en UI. Evidencia: `front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx` imports.
- Backend compone entitlements (se observan funciones e imports en `back/src/index.ts`). El mapa completo por tier no se extrajo aquí. **Assunção**.

---

## 3) Auditoría UX (mobile-first)

- Existe kit de estados UI (`LoadingState`, `EmptyState`, `ErrorState`). Evidencia: imports en `front/src/app/(app)/app/admin/gyms/AdminGymsClient.tsx`.
- Riesgo UX: “unsupported endpoint caching” (404/405) puede degradar UI de forma pegajosa en sesión. Evidencia: `unsupportedEndpoints` en `front/src/services/gym.ts` L112-L170.

Fricciones concretas (prioridad):
1) Duplicidad de rutas trainer.
2) Contracts inconsistentes (arrays vs envelopes) provocan errores tipo `gyms.find is not a function` cuando algo recibe un objeto.
3) Capabilities hardcodeadas incentivan UI optimista y fallos en producción.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real

- Front: Next.js 16 App Router. Evidencia: `front/package.json`.
- BFF: `front/src/app/api/**/route.ts`. Evidencia: `front/src/app/api/admin/gyms/route.ts`.
- Backend: Fastify monolito (`back/src/index.ts`), Prisma. Evidencia: `back/src/index.ts`.

### 4.2 Contratos FE↔BE (Gym, parcial)

| FE consume | BFF | Backend | Estado |
|---|---|---|---|
| Admin gyms list | `GET /api/admin/gyms` | `GET /admin/gyms` | Backend devuelve array; BFF envuelve. **Mismatch controlado**. Evidencia: `back/src/index.ts` L7907-L7932, `front/src/app/api/admin/gyms/route.ts` L12 |
| Admin create gym | `POST /api/admin/gyms` | `POST /admin/gyms` | Requiere `name` + `code`. Evidencia: `back/src/index.ts` L7869-L7896 |
| Gym membership parsing | (varios) | (no verificado aquí) | FE parsea defensivo. **Riesgo**. Evidencia: `front/src/services/gym.ts` L206-L235 |

---

## 5) Calidad y Release Readiness (con evidencia)

Scripts disponibles:
- Web: `npm run build`, `npm run lint`, `npm run test`. Evidencia: `front/package.json`.
- API: `npm run build`, `npm run test`. Evidencia: `back/package.json`.

El zip no incluye logs de ejecución, por lo que PASS/FAIL final requiere ejecución local. **Assunção**.

---

## 6) Hallazgos priorizados

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| H-01 | P0 | Calidad | Falta disciplina/gate de build por commit | Venta bloqueada por build rojo | `front/package.json`, `back/package.json` | Bloquear merge sin build PASS | C | S |
| H-02 | P0 | Contratos | Envelopes inconsistentes (BFF envuelve, BE no) | Runtime crashes (`find is not a function`) | `front/src/app/api/admin/gyms/route.ts` L12 | Envelope estándar único | B+C | M |
| H-03 | P1 | Gym | Parsing defensivo en FE | FE adivina y enmascara bugs | `front/src/services/gym.ts` L206-L235 | Contrato estable y retirar parsers | B+C | M |
| H-04 | P1 | UX/Nav | `/trainer` y `/treinador` duplicado | Bugs y deuda | árbol rutas | Deprecar/redirect | A | M |

---

## 7) Próximos pasos (roadmap)

1) **Sprint Hotfix: “Build siempre PASS”** (bloqueador).
2) **Sprint Contracts Gym sin heurística** (membership, gyms list, join requests).
3) **Sprint Operación Gym vendible** (create/delete, approve/reject, members list), cronometrado.

---

## 8) Anexos
- Gym parsing defensivo: `front/src/services/gym.ts` L206-L235.
- Backend gyms list retorna array: `back/src/index.ts` L7907-L7932.
- BFF gyms list envuelve `{ gyms: ... }`: `front/src/app/api/admin/gyms/route.ts` L12.
