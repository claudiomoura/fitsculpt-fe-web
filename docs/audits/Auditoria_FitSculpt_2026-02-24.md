# Auditoria_FitSculpt_2026-02-24
Fecha: 2026-02-24
Autor/a auditoría: GPT Auditor (Staff Architects)
Solicitado por: Founder/PM (FitSculpt)

> Alcance: auditoría estática de los zips entregados (solo lectura). No se ejecutaron builds ni flujos manuales en entorno real, por tanto todo lo que requiera runtime se marca como **No Ejecutado** o **Assunção**.

## Evidencia primaria (artefactos)
- Front zip SHA-256: `092c037ec3b1105dd58da89d07c53ecbef2d2fb29a540e001a3b4a5f57b197f8`
- Back zip SHA-256: `76990c6f6ee4a1cbae773909ecd4221dbd0ab919e2a408e58eecbafbf440b43d`
- Referencia de commit hash: **No disponible en zips** (assunção: snapshot fuera de git).

---
# 1) Executive Summary
**Estado general (B2C): NO Release-ready.** Razones principales: calidad de build no certificada (No Ejecutado) y varios contratos FE↔BE dependen de normalizadores defensivos, lo que sugiere inestabilidad de shapes.
**Estado MVP Modular: Parcial.** Hay entitlements backend-driven (módulos ai/nutrition/strength) consumidos en UI, pero el gating y la cobertura de journeys no están cerrados end-to-end para todos los módulos.
**Estado Gym Pilot: Demo asistida.** Existen rutas y BFF para gym/admin y normalizadores para contratos de gym, pero el propio UI “Labs” marca partes como “sem backend”, señalando huecos.

### Snapshot (máx 12 bullets)
- Implementado: /auth/me en backend expone entitlements, membership activa y datos de usuario (back/src/index.ts ~4643+ y back/src/auth/schemas.ts).
- Implementado: BFF Next /api/auth/me proxy a backend usando cookie fs_token (front/src/app/api/auth/me/route.ts).
- Implementado: entitlements en UI se derivan desde payload.entitlements.modules.*.enabled (front/src/lib/entitlements.ts).
- Implementado: Tracking con endpoints /tracking GET/PUT/POST/DELETE en backend (back/src/index.ts ~5007+), y BFF /api/tracking/* en frontend.
- Implementado: IA nutrición con gateway robusto en BFF (mapeo 5xx a 502 y manejo de body vacío) (front/src/app/api/ai/nutrition-plan/generate/route.ts).
- Implementado: Dominio Gym con BFF dedicado (/api/gym/*, /api/gyms/*, /api/admin/gyms/*) y normalizadores por mismatch (front/src/lib/gym-contracts.ts).
- Riesgo P0: ausencia de evidencia de build/lint/typecheck/test PASS para web y api en este snapshot (No Ejecutado).
- Riesgo P0: contratos FE↔BE de Gym han requerido normalización de claves (gymId/tenantId, state/status, gym.code/activationCode), señal de inestabilidad contractual.
- Riesgo P1: entitlements dependen de /auth/me y del shape entitlements.modules, cualquier regresión rompe gating global.
- Quick win: formalizar contrato AuthMe y Gym (zod/TS shared o OpenAPI) y eliminar normalizadores ad-hoc.
- Quick win: build gate obligatorio (CI) para bloquear TS/lint y tests contractuales.
- Quick win: ocultar en UI cualquier item marcado como “sem backend” fuera de entornos admin (ya existe AdminLabs, pero asegurar que no hay caminos expuestos).

### Top 5 riesgos
- P0. Build y typecheck no certificados en production, riesgo de bloqueo de release por fallos TS, o regresión silenciosa (No Ejecutado).
- P0. Contratos Gym con normalización defensiva, riesgo de estados incoherentes en joins y admin (evidencia: normalizeMembershipPayload en front/src/lib/gym-contracts.ts).
- P1. Gating por entitlements: UI asume entitlements.modules.*.enabled, si /auth/me cambia, navegación y tab bar se rompen (front/src/lib/entitlements.ts, hooks/useAuthEntitlements.ts).
- P1. IA: dependencias de output JSON estructurado, errores INVALID_AI_OUTPUT ya contemplados en UI, pero requiere validación estricta antes de persistir y fallback claro (front/app/app/nutricion/NutritionPlanClient.tsx, back/src/index.ts rutas /ai/nutrition-plan/*).
- P2. Superficie admin/trainer extensa sin evidencia de hardening, auditoría de permisos no ejecutada (Assunção: requireUser/guards cubren todo).

### Top 5 quick wins
- 1) CI mínimo: `npm ci && npm run build && npm run lint && npm run typecheck && npm test` (web y api), bloqueando merge si falla.
- 2) Contratos: publicar un contrato único para AuthMe, GymMembership y Planes, con zod schemas compartidos o OpenAPI, y tests contractuales FE↔BE.
- 3) UX states obligatorios en core loop (Hoy, Biblioteca, Seguimiento, Nutrición): loading/empty/error con copy consistente, sin placeholders fake.
- 4) Entitlements backend-driven en navegación, esconder tabs y rutas no accesibles, y devolver 404/redirect server-side si se fuerza URL.
- 5) Observabilidad: logging estructurado sin PII, y correlación BFF↔BE (requestId), especialmente en /ai/* y /gym/*.

---
# 2) Inventario de Producto, qué existe hoy
## 2.1 Mapa de navegación (rutas)
Fuente: filesystem Next.js App Router, archivos `page.tsx` bajo `front/src/app/(app)/app`.

### Usuario final (B2C)
- `/app/`
- `/app/biblioteca`
- `/app/biblioteca/[exerciseId]`
- `/app/biblioteca/entrenamientos`
- `/app/biblioteca/entrenamientos/[planId]`
- `/app/biblioteca/recetas`
- `/app/biblioteca/recetas/[recipeId]`
- `/app/dashboard`
- `/app/dietas`
- `/app/dietas/[planId]`
- `/app/entrenamiento`
- `/app/entrenamiento/[workoutId]`
- `/app/entrenamiento/editar`
- `/app/entrenamientos`
- `/app/entrenamientos/[workoutId]`
- `/app/entrenamientos/[workoutId]/start`
- `/app/feed`
- `/app/gym`
- `/app/gym/admin`
- `/app/hoy`
- `/app/macros`
- `/app/nutricion`
- `/app/nutricion/editar`
- `/app/onboarding`
- `/app/profile`
- `/app/profile/legacy`
- `/app/seguimiento`
- `/app/settings`
- `/app/settings/billing`
- `/app/treinador`
- `/app/treinador/[...slug]`
- `/app/weekly-review`
- `/app/workouts`

### Admin (dev/admin)
- `/app/admin`
- `/app/admin/gym-requests`
- `/app/admin/gyms`
- `/app/admin/labs`
- `/app/admin/preview`
- `/app/admin/users`

### Trainer (B2B)
- `/app/trainer`
- `/app/trainer/client/[id]`
- `/app/trainer/clients`
- `/app/trainer/clients/[id]`
- `/app/trainer/exercises`
- `/app/trainer/exercises/new`
- `/app/trainer/plans`
- `/app/trainer/plans/[id]`
- `/app/trainer/requests`

### Callejones sin salida detectados
- `AdminLabsClient` lista items con estado `sem backend`, lo que sugiere rutas expuestas sin soporte completo de backend, o con backend parcial (front/src/app/(app)/app/(admin)/admin/labs/AdminLabsClient.tsx).
- Rutas legacy: `/app/profile/legacy` existe, riesgo de duplicidad y divergencia de UX (assunção: deprecado pero aún accesible).

## 2.2 Flujos end-to-end (journeys)
> Nota: sin ejecución real, los pasos se derivan de rutas + BFF endpoints. Resultado “esperado” se marca como Assunção cuando no hay evidencia directa.

### Login + acceso a /app protegido
1. Usuario autentica (email/password o Google) (Assunção: UI existe en /auth/*).
2. Cookie `fs_token` se guarda.
3. Acceso a `/app/*` depende de `fs_token`, BFF usa cookie para llamar backend (ejemplo /api/auth/me).

Evidencia: BFF lee `fs_token` y proxya a backend: front/src/app/api/auth/me/route.ts (línea ~20). Backend expone `/auth/me`: back/src/index.ts (línea ~4643) y schema back/src/auth/schemas.ts.

### Hoy + 1 acción rápida
1. Abrir `/app/hoy`.
2. Ver acciones rápidas (Assunção: UI client-side).
3. Ejecutar una acción, por ejemplo iniciar un entrenamiento o registrar tracking, y ver confirmación.

Evidencia: Ruta existe: front/src/app/(app)/app/hoy/page.tsx. Endpoints relacionados: /api/workouts, /api/workout-sessions, /api/tracking/* (front/src/app/api/*).

### Biblioteca: lista → detalle
1. Abrir `/app/biblioteca`.
2. Cargar lista de ejercicios.
3. Abrir detalle `/app/biblioteca/[exerciseId]`.
4. Ver media (imagen/video/gif) si existe, placeholder solo si no hay media (Assunção: resolver implementado).

Evidencia: Rutas existen: front/src/app/(app)/app/biblioteca/page.tsx y [exerciseId]/page.tsx. BFF: /api/exercises, /api/exercises/[id] (front/src/app/api/exercises/*).

### Tracking: crear 1 registro y confirmar persistencia
1. Abrir `/app/seguimiento`.
2. Crear un registro (check-in, medidas, peso, etc. Assunção: collections).
3. Refrescar y verificar que el snapshot incluye el registro.

Evidencia: Backend implementa `/tracking` GET/PUT/POST y delete por colección/id: back/src/index.ts (línea ~5007). Front BFF: `front/src/app/api/tracking/*`.

### Food log: registrar ítems por gramos y ver macros/calorías (si existe)
1. Abrir `/app/macros` o `/app/nutricion`.
2. Buscar o crear alimento (user-foods).
3. Registrar gramos y ver cálculo de macros/calorías (Assunção: en UI).

Evidencia: BFF: /api/user-foods/* (front/src/app/api/user-foods/*). Backend: `/user-foods` CRUD (back/src/index.ts, evidencia por strings y dist).

### Onboarding (si existe)
1. Abrir `/app/onboarding`.
2. Completar pasos de perfil/contexto (Assunção).
3. Guardar y navegar a dashboard.

Evidencia: Ruta existe: front/src/app/(app)/app/onboarding/page.tsx. Persistencia exacta no verificada (Assunção).

### Dashboard semanal (si existe)
1. Abrir `/app/weekly-review`.
2. Ver resumen semanal (Assunção: derivado de tracking y workouts).

Evidencia: Ruta existe: front/src/app/(app)/app/weekly-review/page.tsx. Backend contiene ruta/servicio weeklyReview (back/src/routes/weeklyReview.ts, back/src/services/weeklyReview.ts).

### IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)
1. Abrir `/app/nutricion`.
2. Solicitar generación (POST a `/api/ai/nutrition-plan/generate`).
3. Backend valida output estructurado, persiste plan, UI muestra plan y permite ajustes (Assunção: ajustes completos).

Evidencia: BFF robusto: front/src/app/api/ai/nutrition-plan/generate/route.ts. Backend: `/ai/nutrition-plan` y `/ai/nutrition-plan/generate` (back/src/index.ts).

### IA Fitness: generar plan + ajuste semanal (si existe)
1. Abrir `/app/entrenamiento` o `/app/workouts`.
2. Solicitar generación (POST `/api/ai/training-plan/generate`).
3. UI muestra plan y permite ajuste semanal (Assunção).

Evidencia: BFF endpoints existen: front/src/app/api/ai/training-plan/*; backend tiene rutas `/ai/training-plan*` (string match en back/src/index.ts).

### Gym Pilot: usuario se une a gym (aceptación o código) + admin gestiona + asigna plan (si existe)
1. Usuario abre `/app/gym` y hace join request o join by code (Assunção: UI).
2. Admin abre `/app/admin/gyms` y gestiona members/requests.
3. Admin/trainer asigna plan a miembro.

Evidencia: BFF existe: /api/gym/*, /api/gyms/*, /api/admin/gyms/* (front/src/app/api). Normalización por mismatches: front/src/lib/gym-contracts.ts. UI Labs etiqueta `adminGymRequests` y `nutrition` como `sem backend` (front/src/app/(app)/app/(admin)/admin/labs/AdminLabsClient.tsx).

## 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)
> Importante: en backend el plan efectivo usa enum `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO` (back/src/entitlements.ts). La UI hoy gatea por módulos (ai/nutrition/strength) sobre `/auth/me`.

Tabla (estado = Implementado en código / Validado E2E / Planeado):

| Feature | Free | Nutrición Premium | Fitness Premium | Bundle/PRO | Gym | Evidencia |
|---|---:|---:|---:|---:|---:|---|
| Login + /app protegido | Impl | Impl | Impl | Impl | Impl | BFF /api/auth/me usa fs_token, backend /auth/me (front/src/app/api/auth/me/route.ts, back/src/index.ts) |
| Tracking persistente | Impl | Impl | Impl | Impl | Impl | backend /tracking (back/src/index.ts ~5007) |
| Biblioteca ejercicios | Impl | Impl | Impl | Impl | Impl | rutas /app/biblioteca + BFF /api/exercises |
| Food log (user foods) | Impl? | Impl | Impl? | Impl | Impl? | BFF /api/user-foods; backend /user-foods (assunção de UI completa) |
| IA Nutrición | Gateado | Gateado (on) | Gateado | Gateado (on) | Gateado | UI usa entitlements.modules.*.enabled (front/src/lib/entitlements.ts) |
| IA Fitness | Gateado | Gateado | Gateado (on) | Gateado (on) | Gateado | BFF /api/ai/training-plan/generate |
| Billing/Stripe | Impl | Impl | Impl | Impl | Impl? | BFF /api/billing/*, backend stripe handlers (back/src/index.ts) |
| Gym join by code | N/A | N/A | N/A | N/A | Impl | BFF /api/gyms/join-by-code y /api/gym/join-code |
| Admin gym management | N/A | N/A | N/A | N/A | Impl | rutas /app/admin/gyms + BFF /api/admin/gyms |

Leyenda: `Impl?` = endpoints existen pero UX/pantalla no validada end-to-end en esta auditoría.

---
# 3) Auditoría UX (mobile-first)
## Consistencia de navegación
- Existe `MobileTabBar` y el gating por entitlements influye en tabs (front/src/components/layout/MobileTabBar.tsx + hooks/useAuthEntitlements.ts). Assunção: tabs reflejan exactamente módulos accesibles.
- Hay rutas duplicadas para trainer en PT (`/app/treinador`) y EN/ES (`/app/trainer`), riesgo de confusión e i18n parcial.

## Estados obligatorios
- Positivo: `FeatureGate` centraliza gating y expone loading/error/reload (front/src/components/access/FeatureGate.tsx).
- Riesgo: páginas marcadas como “sem backend” en AdminLabs sugieren pantallas accesibles con backend parcial, deben ocultarse o degradar a “coming soon” real solo para admins.

## Copy/i18n
- Existe infra de i18n (front/src/lib/serverI18n y LanguageProvider). No se auditó cobertura completa de claves (No Ejecutado).

## 10 fricciones concretas (y recomendación)
- F1. Rutas trainer duplicadas (`/trainer` vs `/treinador`). Recomendar unificar y usar i18n para labels, no para rutas.
- F2. AdminLabs enumera features con estados, pero no garantiza bloqueo hard. Recomendar server-side guard + ocultar links para no-admin.
- F3. Normalizadores de Gym indican UX puede mostrar estados UNKNOWN. Recomendar mapear a estados UX concretos y copy accionable.
- F4. Entitlements se cargan client-side via `/api/auth/me`. Esto puede causar flicker (tabs cambian tras load). Recomendar prefetch server-side en layout.
- F5. Error handling heterogéneo. Recomendar patrón único: ErrorBanner + retry + códigos mapeados a copy.
- F6. Placeholders de media en biblioteca han sido tema recurrente. Recomendar resolver único (ya discutido en PR) y skeleton consistente.
- F7. Flujo de billing: riesgo de “dead-end” tras checkout/portal sin retorno claro. Recomendar CTA de retorno y estado de suscripción visible.
- F8. IA generation: errores `INVALID_AI_OUTPUT` existen. Recomendar fallback: plan mínimo o “reintentar con feedback”, y no bloquear toda la pantalla.
- F9. Tracking: colecciones múltiples (checkins/medidas). Recomendar IA de captura rápida, y confirmación persistida (timestamp + sync).
- F10. Dashboard semanal: si depende de tracking incompleto, mostrar empty state educacional, no vacío silencioso.

---
# 4) Auditoría de Arquitectura y Contratos
## 4.1 Arquitectura real (Frontend + BFF + Backend)
**Frontend**: Next.js App Router. BFF implementado como rutas `/api/*` en Next, que proxyean al backend usando cookie `fs_token` (ejemplo: front/src/app/api/auth/me/route.ts).
**Backend**: Fastify (monolito) con Prisma. Rutas declaradas en `back/src/index.ts`. Hay validación con zod en varios dominios (ejemplo: authMeResponseSchema en back/src/auth/schemas.ts).

Dominios detectados (por rutas y carpetas):
- Auth/Profile: `/auth/*`, `/auth/me`, change-password, Google OAuth.
- Tracking: `/tracking` + weekly review.
- Library: exercises, recipes, workouts.
- Training: training-plans, workouts, workout-sessions.
- Nutrition: user-foods, nutrition-plans, /ai/nutrition-plan.
- AI: /ai/daily-tip, /ai/nutrition-plan, /ai/training-plan.
- Billing: /billing/* y webhooks Stripe (assunção: implementado por handlers en index).
- Gym/Admin: /gyms, /gym/*, /admin/gyms/*, /trainer/*.

Zonas sensibles:
- `fs_token` como cookie de sesión. BFF lo reenvía como header `cookie` al backend.
- Guards: backend `requireUser` y `aiAccessGuard` (assunção: consistente en todas las rutas sensibles).

## 4.2 Contratos FE↔BE (mapa)
Fuente: rutas BFF en `front/src/app/api/**/route.ts` y búsqueda de `getBackendUrl()`.

### Mapa resumido (ejemplos críticos)

| BFF (/api/*) | Backend | Método(s) | Estado | Evidencia |
|---|---|---|---|---|
| `/api/auth/me` | `/auth/me` | GET | OK | front/src/app/api/auth/me/route.ts, back/src/index.ts |
| `/api/tracking` | `/tracking` | GET/PUT/POST | OK | front/src/app/api/tracking/route.ts, back/src/index.ts ~5007 |
| `/api/ai/nutrition-plan/generate` | `/ai/nutrition-plan/generate` | POST | OK (con gateway) | front/src/app/api/ai/nutrition-plan/generate/route.ts |
| `/api/admin/gyms` | `/admin/gyms` | GET/POST | OK pero normalizado | front/src/app/api/admin/gyms/route.ts + front/src/lib/gym-contracts.ts |
| `/api/billing/*` | `/billing/*` | varios | OK (no validado E2E) | rutas BFF /api/billing/* |

### Mismatches relevantes
- Gym: existe normalización de payloads con múltiples alias de campos (`gymId` vs `tenantId`, `state` vs `status`, `gym.code` vs `activationCode`). Esto es evidencia directa de drift contractual (front/src/lib/gym-contracts.ts).
- AuthMe: backend tiene un schema rico (id/email/role/modules/effectiveEntitlements), pero el frontend define un `AuthMeResponse` parcial en `front/src/lib/types.ts`. El código de entitlements usa solo `payload.entitlements.modules`, pero la divergencia de tipos reduce la protección TypeScript ante cambios de contrato.

## 4.3 IA (assistiva)
Dónde se usa:
- Nutrición: `/api/ai/nutrition-plan` y `/api/ai/nutrition-plan/generate` consumidos desde UI (front/src/services/nutrition.ts y NutritionPlanClient).
- Fitness: `/api/ai/training-plan/*` consumido desde componentes de entrenamiento (evidencia: rutas BFF existen).

Validación y fallback:
- BFF de nutrición maneja errores y asegura JSON de salida incluso con backend malformado, y convierte 5xx a 502 para aislar al cliente (front/src/app/api/ai/nutrition-plan/generate/route.ts).
- Backend contiene validación matemática de macros y retry logic (back/src/ai/nutritionMathValidation.ts, back/src/ai/nutritionRetry.ts, evidenciado por imports en back/src/index.ts).

Riesgos y mitigación:
- Riesgo: logs de debug pueden incluir contexto sensible. Mitigación: scrub PII, y habilitar debug solo en admin/dev.
- Riesgo: persistir output inválido. Mitigación: validar contra schema (zod/json schema) antes de escribir, con reintento automático y fallback.

---
# 5) Calidad y Release Readiness (con evidencia)
## 5.1 Evidencia técnica (PASS/FAIL)
> Este entorno no ejecutó `npm ci` ni `npm run build` de los zips. Por norma de auditoría, todo se marca como **No Ejecutado**.

| Item | Front | Back | Evidencia |
|---|---|---|---|
| build | No Ejecutado | No Ejecutado | scripts existen en package.json |
| lint | No Ejecutado | N/A (no script lint) | front/package.json scripts.lint |
| typecheck | No Ejecutado | N/A (TS compilación en build) | front/package.json scripts.typecheck |
| tests | No Ejecutado | No Ejecutado | back/package.json scripts.test incluye tests de contratos |

Entorno (assunção): Node version no capturada, no hay `.nvmrc` verificado.

## 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL)
> PASS solo si: implementado + validado E2E. Sin ejecución real, casi todo queda FAIL por falta de evidencia runtime.

### A) DoD mínimo
- Login: **FAIL (No Validado)**, implementado pero sin evidencia de build+flujo real.
- /app protegido: **FAIL (No Validado)**, existe middleware/guards (assunção), pero no ejecutado.
- Tab bar: **FAIL (No Validado)**, componente existe.
- Hoy + 1 acción: **FAIL (No Validado)**, ruta existe.
- Tracking persistente: **FAIL (No Validado)**, endpoints existen.
- Biblioteca lista+detalle: **FAIL (No Validado)**, rutas y BFF existen.

### B) Entitlements modular
- **FAIL (No Validado)**. Implementado: backend effective entitlements + UI gating por módulos. Falta validación de escenarios: Free vs Strength-only vs Nutrition-only vs PRO, y adminOverride.

### C) Free
- Métricas básicas + rendimiento: **FAIL (No Validado)**.
- Food log con macros/calorías: **FAIL (No Validado)**, endpoints existen.

### D) Nutrición Premium
- Plan semanal + lista compra + ajustes: **FAIL (No Validado)**.
- Validación IA antes de persistir: **Parcial** (evidencia de guardrails en BFF y backend). Sin evidencia E2E.

### E) Fitness Premium
- Plan según contexto + ajuste semanal: **FAIL (No Validado)**.

### F) Gym Pilot
- Join por aceptación o código: **FAIL (No Validado)**.
- Panel admin: **FAIL (No Validado)**, rutas existen.
- Asignación plan template: **FAIL (No Validado)**.

---
# 6) Hallazgos priorizados
| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-001 | P0 | Release/CI | No hay gate de build/typecheck/test antes de merge (no verificable en zips). | Bloqueo de release, regresiones frecuentes. | Scripts existen, pero no evidencia de ejecución. | Añadir CI (GitHub Actions) + prepush hook opcional. | DevOps/Staff Eng | M |
| FS-002 | P0 | Contratos Gym | Gym contracts requieren normalización defensiva de estados y campos. | Estados incoherentes, UX rota en join/admin. | front/src/lib/gym-contracts.ts (normalizeMembershipPayload). | Formalizar contrato y versionarlo, eliminar alias. | Backend+Frontend leads | M |
| FS-003 | P1 | Type Safety | `AuthMeResponse` en frontend es parcial vs backend schema rico. | Cambios backend no rompen TS, errores en runtime. | front/src/lib/types.ts vs back/src/auth/schemas.ts. | Generar tipos desde schema (zod-to-ts) o OpenAPI. | Frontend lead | S |
| FS-004 | P1 | UX/Gating | Entitlements se cargan client-side, riesgo de flicker y rutas accesibles por URL directa. | Experiencia inconsistente, posible exposure de features. | hooks/useAuthEntitlements.ts + AppNavBar/MobileTabBar. | Mover gating crítico a server layout + redirects. | Frontend | M |
| FS-005 | P1 | IA Robustness | Errores INVALID_AI_OUTPUT ya aparecen, pero UX fallback no estandarizado. | Plan no generado bloquea flujo premium. | NutritionPlanClient + BFF ai gateway. | Añadir flujo “retry con feedback”, y plan mínimo. | Full-stack | M |
| FS-006 | P2 | Admin Surface | AdminLabs marca items “sem backend” pero siguen siendo navegables. | Soporte y credibilidad en demos. | AdminLabsClient.tsx. | Ocultar o desactivar rutas, y mostrar “coming soon” real. | Frontend | S |
| FS-007 | P2 | Observabilidad | Debug en BFF devuelve `debug` en 401 y fallos AI. | Riesgo de info leakage y ruido. | ai/nutrition-plan/generate route.ts. | Feature flag debug + scrub PII + requestId. | Backend | M |

---
# 7) Próximos pasos (roadmap)
Propuesta de 3 sprints, 1 apuesta por sprint.

## Sprint 1: Estabilidad absoluta (Release Gate)
- Goal: cada PR mergeable implica build+typecheck+tests PASS en front y back.
- Entra: CI, scripts reproducibles, documentar Node version, smoke test básico Playwright para login y /app/hoy.
- No entra: features nuevas.
- Métricas: 0 merges con build rojo, tiempo medio de build, tasa de fallos TS.
- Riesgos/deps: tiempo de `npm ci`, flakiness e2e.

## Sprint 2: Gym Pilot rock solid (1 flujo)
- Goal: join por código + aprobación + asignación plan, sin errores consola, en seed demo.
- Entra: cerrar contrato Gym, limpiar normalizadores, hardening permisos, empty/error states, y checklist manual cronometrado.
- No entra: marketplace, white-label.
- Métricas: tasa de éxito del flujo en 10 runs, 0 errores consola, NPS de demo.
- Riesgos/deps: datos de seed, roles trainer/admin.

## Sprint 3: Modularización comercial real (Entitlements)
- Goal: tiers comprables y gating backend-driven consistente en UI (tabs, rutas, llamadas).
- Entra: mapear planes a módulos, tests por plan, pantallas de billing claras.
- No entra: multi-gym enterprise.
- Métricas: cobertura de tests de entitlements, 0 accesos indebidos.
- Riesgos/deps: Stripe products/prices.

---
# 8) Anexos
## 8.1 Árbol de rutas/pantallas (derivado)
- /app/
- /app/admin
- /app/admin/gym-requests
- /app/admin/gyms
- /app/admin/labs
- /app/admin/preview
- /app/admin/users
- /app/biblioteca
- /app/biblioteca/[exerciseId]
- /app/biblioteca/entrenamientos
- /app/biblioteca/entrenamientos/[planId]
- /app/biblioteca/recetas
- /app/biblioteca/recetas/[recipeId]
- /app/dashboard
- /app/dietas
- /app/dietas/[planId]
- /app/entrenamiento
- /app/entrenamiento/[workoutId]
- /app/entrenamiento/editar
- /app/entrenamientos
- /app/entrenamientos/[workoutId]
- /app/entrenamientos/[workoutId]/start
- /app/feed
- /app/gym
- /app/gym/admin
- /app/hoy
- /app/macros
- /app/nutricion
- /app/nutricion/editar
- /app/onboarding
- /app/profile
- /app/profile/legacy
- /app/seguimiento
- /app/settings
- /app/settings/billing
- /app/trainer
- /app/trainer/client/[id]
- /app/trainer/clients
- /app/trainer/clients/[id]
- /app/trainer/exercises
- /app/trainer/exercises/new
- /app/trainer/plans
- /app/trainer/plans/[id]
- /app/trainer/requests
- /app/treinador
- /app/treinador/[...slug]
- /app/weekly-review
- /app/workouts

## 8.2 Lista de BFF endpoints (/api/*)
- /api/admin/gym-join-requests
- /api/admin/gym-join-requests/[membershipId]/[action]
- /api/admin/gym-join-requests/[membershipId]/accept
- /api/admin/gym-join-requests/[membershipId]/reject
- /api/admin/gyms
- /api/admin/gyms/[gymId]
- /api/admin/gyms/[gymId]/members
- /api/admin/gyms/[gymId]/members/[userId]/assign-training-plan
- /api/admin/gyms/[gymId]/members/[userId]/role
- /api/admin/users
- /api/admin/users/[id]
- /api/admin/users/[id]/block
- /api/admin/users/[id]/reset-password
- /api/admin/users/[id]/unblock
- /api/admin/users/[id]/verify-email
- /api/ai/daily-tip
- /api/ai/nutrition-plan
- /api/ai/nutrition-plan/generate
- /api/ai/training-plan
- /api/ai/training-plan/generate
- /api/auth/change-password
- /api/auth/google/callback
- /api/auth/google/start
- /api/auth/me
- /api/auth/resend-verification
- /api/auth/verify-email
- /api/billing/checkout
- /api/billing/plans
- /api/billing/portal
- /api/billing/status
- /api/exercises
- /api/exercises/[id]
- /api/feed
- /api/feed/generate
- /api/gym/admin/members/[userId]/role
- /api/gym/join-code
- /api/gym/join-request
- /api/gym/me
- /api/gyms
- /api/gyms/join
- /api/gyms/join-by-code
- /api/gyms/membership
- /api/nutrition-plans
- /api/nutrition-plans/[id]
- /api/profile
- /api/recipes
- /api/recipes/[id]
- /api/review/weekly
- /api/tracking
- /api/tracking/[collection]/[id]
- /api/trainer/assign-training-plan
- /api/trainer/capabilities
- /api/trainer/clients
- /api/trainer/clients/[id]
- /api/trainer/clients/[id]/assigned-plan
- /api/trainer/clients/[id]/notes
- /api/trainer/clients/[id]/plan
- /api/trainer/join-requests
- /api/trainer/join-requests/[membershipId]/[action]
- /api/trainer/join-requests/[membershipId]/accept
- /api/trainer/join-requests/[membershipId]/reject
- /api/trainer/members
- /api/trainer/members/[id]/assigned-plan
- /api/trainer/members/[id]/training-plan-assignment
- /api/trainer/plans
- /api/trainer/plans/[id]
- /api/trainer/plans/[id]/days/[dayId]
- /api/trainer/plans/[id]/days/[dayId]/exercises
- /api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]
- /api/training-plans
- /api/training-plans/[id]
- /api/training-plans/[id]/days/[dayId]/exercises
- /api/training-plans/active
- /api/user-foods
- /api/user-foods/[id]
- /api/workout-sessions/[id]
- /api/workout-sessions/[id]/finish
- /api/workouts
- /api/workouts/[id]
- /api/workouts/[id]/start

## 8.3 Feature flags/toggles
- No se detectó un sistema formal de feature flags por env var. Existe una lista manual en AdminLabs (`LAB_ITEMS`) con estados (`read-only`, `sem backend`, `beta`), que funciona como inventario, no como toggle real.

## 8.4 Seguridad, secretos
- Se observan archivos `.env` en backend zip. No se incluyen valores en este documento por seguridad. Recomendación: rotar y mover secretos a secret manager si hay riesgo de exposición.

---
# FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-24
Branch de referência: **No disponible en zips** (Assunção)
Owner: Founder/PM (FitSculpt)

> Nota crítica: este status separa implementado vs validado. Sin ejecución de build y sin flows manuales reproducibles en esta auditoría, casi todo queda como **No Validado**.

## 1) Executive Snapshot Realista

### Release Readiness (B2C general)

**Estado real: NO Release-ready**

Lo que está implementado (evidencia en código)
- ✔ BFF obligatorio con cookie `fs_token` (front/src/app/api/auth/me/route.ts)
- ✔ Backend `/auth/me` con entitlements efectivos y membership activa (back/src/index.ts + back/src/auth/schemas.ts)
- ✔ Tracking backend `/tracking` CRUD (back/src/index.ts ~5007)
- ✔ Rutas core B2C: `/app/hoy`, `/app/biblioteca`, `/app/seguimiento`, `/app/nutricion`

Lo que está validado formalmente
- ⚠ **No Validado**: build/typecheck/lint/test PASS en front/back (No Ejecutado)
- ⚠ **No Validado**: flujos cronometrados sin errores consola

Conclusión honesta
- Demo plausible por evidencia de rutas y BFF, pero no production-grade sin gate de calidad y validación E2E.

### Gym Pilot Readiness (B2B pequeño gym)

**Estado real: MVP demostrable con supervisión. No autónomo.**

Implementado
- ✔ BFF y rutas admin gym: `/app/admin/gyms`, `/api/admin/gyms/*`
- ✔ Join por código y membership endpoints: `/api/gyms/join-by-code`, `/api/gym/me`
- ✔ Normalizadores de contrato para manejar drift (front/src/lib/gym-contracts.ts)

No validado
- ⚠ Flujo completo join→accept→assign plan no certificado (No Ejecutado)

---
