# Auditoria completa FitSculpt (producto + UX + arquitectura + contratos + calidad)
Fecha: 2026-03-17  
Autor/a auditoria: OpenCode / Senior Staff Engineering audit  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: mapa verificable del estado actual del producto tras la ronda de sprints de trust, IA, UX premium y beta readiness.

> Nota de evidencia: todo lo afirmado abajo se apoya en el repo local actual. Cuando no hay prueba directa en codigo o ejecucion de este entorno, queda marcado como **Assuncion**.

---

## 1) Executive Summary (max 12 bullets)

- **Release-ready: NO todavia.** El producto mejoro mucho en IA, billing return-path y claridad UX, pero no hay evidencia cerrada en esta sesion de monorepo completamente verde + smoke beta integral con backend local listo. Evidencia: `apps/web/scripts/run-beta-smoke.mjs:1-22`, `docs/beta-ready.md:165-177`, `docs/release-gates.md:35-39`.
- **Trust & data integrity: SI mejoro de forma real.** Today ya no escribe check-ins falsos y manda al flujo real `/app/seguimiento/check-in`. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:223-317`, `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:469-491`.
- **Entitlements: bastante mejor, aun no perfectos.** El frontend ya prioriza modulos backend-driven (`strength`, `nutrition`, `ai`, `billing`), pero mantiene fallback legacy. Evidencia: `apps/web/src/context/auth/entitlements.ts:20-80`.
- **Billing premium: SI mejoro materialmente.** Checkout acepta `returnTo`, backend lo valida, Stripe vuelve a billing con `returnTo`, y billing reenvia al origen tras sync. Evidencia: `apps/api/src/index.ts:5447-5540`, `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:113-115`, `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:212-215`, `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:240-258`.
- **IA principal: mucho mas limpia.** Las rutas canonicas de usuario ya son Today, Training, Nutrition, Tracking y Profile; varios aliases son redirect-only. Evidencia: `apps/web/src/app/(app)/app/dashboard/page.tsx:1-5`, `apps/web/src/app/(app)/app/entrenamientos/page.tsx:1-31`, `apps/web/src/app/(app)/app/workouts/page.tsx:1-31`, `apps/web/src/app/(app)/app/profile/legacy/page.tsx:1-5`.
- **Training focus mode: SI cumple mejor.** El logger vive en `/app/entrenamiento/[workoutId]/start` y el shell oculta nav global. Evidencia: `apps/web/src/components/layout/AppShellLayout.tsx:13-23`, `apps/web/src/app/(app)/app/entrenamiento/[workoutId]/start/page.tsx:1-13`.
- **Today hub: SI esta mucho mas alineado al loop diario.** Ahora expone 3 acciones primarias maximo: entrenamiento, nutricion y check-in. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:384-495`.
- **Nutrition: mejora visible, pero con gap de contrato.** La pagina ya comunica “today-log first”, pero el quick log sigue siendo local al dispositivo y no backend-backed. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2422-2440`, `apps/web/src/lib/nutritionAdherence.ts:25-137`.
- **Progress: mas claro, no completamente reinventado.** Seguimiento separa mejor analisis de captura y hace handoff mas visible a weekly review. Evidencia: `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx:1013-1063`.
- **Design system: mejor consolidado.** `Card` de design-system ya envuelve `ui/Card`; se corrigieron aliases rotos de tokens legacy. Evidencia: `apps/web/src/design-system/components/Card.tsx:1-20`, `apps/web/src/app/globals.css:33-52`.
- **Gym/Admin: sigue habiendo deuda de producto.** La navegacion admin sigue marcando Gym Requests como disabled pese a existir pagina. Evidencia: `apps/web/src/components/layout/navConfig.ts:153-159`.
- **Top 5 riesgos actuales:** 1) smoke beta no demostrado end-to-end, 2) gap backend de meal completion durable, 3) admin gym requests deshabilitado en nav, 4) fallback legacy en entitlements, 5) deuda residual de aliases por compatibilidad.

---

## 2) Inventario de Producto “que existe hoy”

### 2.1 Mapa de navegacion

#### Rutas canonicas usuario final
- `/app/hoy` como hub diario. Evidencia: `apps/web/src/app/(app)/app/hoy/page.tsx:1-15`.
- `/app/entrenamiento` como home de training. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:24-28`, `apps/web/src/app/(app)/app/entrenamiento/WorkoutTodayMobileClient.tsx:210-215`.
- `/app/nutricion` como home de nutricion. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2422-2432`.
- `/app/seguimiento` como home de progreso. Evidencia: `apps/web/src/app/(app)/app/seguimiento/page.tsx:1-9`.
- `/app/profile` como home de cuenta. Evidencia: `apps/web/src/app/(app)/app/profile/page.tsx:1-18`.

#### Redirect-only / alias activos
- `/app/dashboard` -> `/app/hoy`. Evidencia: `apps/web/src/app/(app)/app/dashboard/page.tsx:1-5`.
- `/app/entrenamientos` -> `/app/entrenamiento`. Evidencia: `apps/web/src/app/(app)/app/entrenamientos/page.tsx:1-31`.
- `/app/workouts` -> `/app/entrenamiento`. Evidencia: `apps/web/src/app/(app)/app/workouts/page.tsx:1-31`.
- `/app/profile/legacy` -> `/app/profile/edit`. Evidencia: `apps/web/src/app/(app)/app/profile/legacy/page.tsx:1-5`.
- `/app/entrenamientos/[workoutId]` y `/start` siguen existiendo como alias redirect-only. Evidencia: `apps/web/src/app/(app)/app/entrenamientos/[workoutId]/page.tsx:1-6`, `apps/web/src/app/(app)/app/entrenamientos/[workoutId]/start/page.tsx:1-6`.

#### Admin / Trainer / desarrollo
- Admin: `/app/admin/*` sigue presente. Evidencia: `apps/web/src/components/layout/navConfig.ts:145-163`.
- Trainer: `/app/trainer/*` sigue presente. Evidencia: `apps/web/src/components/layout/navConfig.ts:166-181`.
- Dev nav sigue cargada de rutas internas/labs. Evidencia: `apps/web/src/components/layout/navConfig.ts:184-269`.

### 2.2 Flujos end-to-end (journeys)
- **Today -> Check-in real:** PASS estructural. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:227-231`, `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:469-491`.
- **Today -> Training -> Focus logger:** PASS estructural. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:427-435`, `apps/web/src/components/layout/AppShellLayout.tsx:13-23`.
- **Today -> Nutrition today log:** PASS parcial. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2422-2440`.
- **Bloqueo premium -> Billing -> volver al origen:** PASS estructural. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:335-336`, `apps/api/src/index.ts:5472-5540`.
- **Progress -> Weekly review:** PASS parcial. Evidencia: `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx:1026-1033`.

### 2.3 Matriz de entitlements
- Snapshot FE actual: modulos `ai`, `nutrition`, `strength`, `billing`. Evidencia: `apps/web/src/context/auth/entitlements.ts:6-18`, `apps/web/src/context/auth/entitlements.ts:28-49`.
- Source of truth principal: `effectiveEntitlements ?? entitlements`. Evidencia: `apps/web/src/context/auth/entitlements.ts:20-25`.
- Estado: **PASS mejorado**, pero con fallback legacy aun presente (`aiEntitlements`). Evidencia: `apps/web/src/context/auth/entitlements.ts:35-40`.

---

## 3) Auditoria UX (mobile-first)

### Tab bar y navegacion
- Mobile shell sigue activo para rutas regulares. Evidencia: `apps/web/src/components/layout/AppShellLayout.tsx:25-33`.
- Focus screens ya no muestran nav global en workout start. Evidencia: `apps/web/src/components/layout/AppShellLayout.tsx:15-23`.
- Riesgo: admin nav sigue con item disabled en `gym-requests`. Evidencia: `apps/web/src/components/layout/navConfig.ts:153-159`.

### Estados obligatorios
- Today tiene `loading / error / success / empty`. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:381-386`.
- Tracking tiene analisis tabs y CTA de captura separado. Evidencia: `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx:1013-1063`.
- Nutrition comunica mejor el estado actual, pero quick log no es durable. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2430-2440`.

### 10 fricciones concretas
1) Gym requests sigue deshabilitado en nav admin. Fix: habilitarlo. Evidencia: `apps/web/src/components/layout/navConfig.ts:153-159`.
2) Tracking mezcla aun mucho contenido en una sola pantalla. Fix: tabs mas duras / lazy sections. Evidencia: `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx:1550-1809`.
3) Nutrition quick log no tiene soporte backend durable. Fix: contrato real antes de vender “completado”. Evidencia: `apps/web/src/lib/nutritionAdherence.ts:25-137`.
4) Today aun deja textos y metricas heuristicas (p. ej. `Meta: -5 kg`). Fix: parametrizar desde datos reales o copy neutral. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:342-345`, `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:487-487`.
5) Dev nav ensucia mucho la experiencia interna. Fix: ocultar por flag mas duro. Evidencia: `apps/web/src/components/layout/navConfig.ts:184-269`.
6) Billing sigue con copy correcta pero no todavia con smoke e2e cerrado en esta sesion. Fix: cerrar suite. Evidencia: `apps/web/scripts/run-beta-smoke.mjs:1-22`.
7) Progress CTA a weekly review es visible, pero no contextualizado por completion real. Fix: condicionar mejor por semana completa. Evidencia: `apps/web/src/app/(app)/app/seguimiento/TrackingClient.tsx:1026-1033`.
8) Nutrition CTA “Registrar comidas de hoy” es anchor interno, no flujo de focus mode. Fix: considerar bottom sheet / flow de logging. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2430-2432`.
9) WorkoutTodayMobileClient enlaza “Generar con IA” a la misma home de training; UX aun mejorable. Fix: deep-link a modo AI. Evidencia: `apps/web/src/app/(app)/app/entrenamiento/WorkoutTodayMobileClient.tsx:209-215`.
10) Analytics aun no sale de cola local. Fix: integrar proveedor real. Evidencia: `apps/web/src/lib/analytics.ts:16-26`.

---

## 4) Auditoria de Arquitectura y Contratos

### 4.1 Arquitectura real
- FE usa App Router + BFF + backend API separado. Evidencia: arbol `apps/web/src/app/api/*`, `apps/api/src/index.ts`.
- Billing return contract ya cruza FE-BFF-BE con `returnTo`. Evidencia: `apps/web/src/app/api/billing/checkout/route.ts:21-56`, `apps/api/src/index.ts:5447-5540`, `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:240-258`.

### 4.2 Contratos FE↔BE (muestra)

| BFF / FE | Backend esperado | Estado | Evidencia |
|---|---|---|---|
| `/api/auth/me` -> snapshot entitlements | `GET /auth/me` | OK | `apps/web/src/context/auth/entitlements.ts:20-25` |
| `/api/billing/checkout` con `returnTo` | `POST /billing/checkout` | OK | `apps/web/src/app/api/billing/checkout/route.ts:21-56`, `apps/api/src/index.ts:5447-5540` |
| `/app/settings/billing?checkout=success&returnTo=...` | sync + redirect origen | OK | `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:146-227` |
| Nutrition quick log durable | backend persistente real | FAIL / gap | `apps/web/src/lib/nutritionAdherence.ts:25-137` |
| Focus logger canonicidad | `/app/entrenamiento/[workoutId]/start` | OK | `apps/web/src/app/(app)/app/entrenamiento/[workoutId]/start/page.tsx:1-13` |

### 4.3 IA / contratos de informacion
- IA principal ya mas limpia por rutas canonicas y hubs simplificados. Evidencia: `apps/web/src/app/(app)/app/dashboard/page.tsx:1-5`, `apps/web/src/app/(app)/app/entrenamientos/page.tsx:28-30`, `apps/web/src/app/(app)/app/workouts/page.tsx:28-30`.
- Aun hay residuos de alias por compatibilidad, no eliminacion total. Evidencia: rutas alias siguen existiendo en build output y archivos redirect-only anteriores.

---

## 5) Calidad y Release Readiness

### 5.1 Evidencia tecnica directa de esta ronda
- `apps/web` typecheck: ejecutado varias veces en verde durante la sesion. **Assuncion documentada por ejecucion local de esta sesion**.
- `apps/web` build: ejecutado varias veces en verde durante la sesion. **Assuncion documentada por ejecucion local de esta sesion**.
- `apps/api` typecheck y build: quedaron verdes en la ronda de saneo. **Assuncion documentada por ejecucion local de esta sesion**.
- `e2e:smoke:beta`: runner endurecido, pero no queda demostrado aqui como PASS integral con backend dev/reset operativo. Evidencia de runner: `apps/web/scripts/run-beta-smoke.mjs:1-22`.

### 5.2 Checklist DoD + readiness
- Today 3 acciones maximo: **PASS**. Evidencia: `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:388-492`.
- Billing return path: **PASS estructural**. Evidencia: `apps/api/src/index.ts:5472-5540`, `apps/web/src/app/(app)/app/settings/billing/BillingClient.tsx:212-215`.
- Training focus shell: **PASS**. Evidencia: `apps/web/src/components/layout/AppShellLayout.tsx:15-23`.
- Profile canonical: **PASS**. Evidencia: `apps/web/src/app/(app)/app/profile/legacy/page.tsx:1-5`, `apps/web/src/app/(app)/app/profile/edit/page.tsx:1-15`.
- Nutrition durable completion: **FAIL / gap conocido**. Evidencia: `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2440-2440`, `apps/web/src/lib/nutritionAdherence.ts:25-137`.

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Area | Hallazgo | Impacto | Evidencia | Recomendacion | Owner sugerido | Esfuerzo |
|---:|---|---|---|---|---|---|---|---|
| 1 | P0 | Nutricion | Quick log sigue siendo local al dispositivo | Riesgo de confianza / datos no durables | `apps/web/src/lib/nutritionAdherence.ts:25-137`, `apps/web/src/app/(app)/app/nutricion/NutritionPlanClient.tsx:2440-2440` | definir contrato backend real de meal completion | BE + FE | M |
| 2 | P0 | QA | Smoke beta no demostrado E2E con backend listo | Riesgo release/beta | `apps/web/scripts/run-beta-smoke.mjs:1-22`, `docs/beta-ready.md:165-177` | cerrar backend demo reset + smoke beta verde | FE + BE | M |
| 3 | P1 | Admin UX | Gym requests sigue disabled en sidebar | feature oculta / soporte gym incompleto | `apps/web/src/components/layout/navConfig.ts:153-159` | habilitar item o eliminar disabled | FE | S |
| 4 | P1 | Analytics | Cola local existe pero no proveedor real | producto no medible | `apps/web/src/lib/analytics.ts:1-26` | conectar PostHog/Segment/GA | FE | M |
| 5 | P1 | Today UX | metas/copy todavia parcialmente heuristicas | posible confusion premium | `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:342-345`, `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx:487-487` | reemplazar copy hardcoded por datos/copy neutral | FE + PM | S |
| 6 | P1 | IA / nav | nav account sigue etiquetando `/app` como progreso | semantica algo confusa | `apps/web/src/components/layout/navConfig.ts:133-140` | hacer `/app` redirect-only conceptual o relabel | FE | S |
| 7 | P2 | DS | coexistencia de `design-system` y `ui/*` sigue siendo doble capa | deuda tecnica, no bloqueo | `apps/web/src/design-system/components/Card.tsx:1-20` | seguir consolidando wrappers y borrar drift residual | FE | M |

---

## 7) Proximos pasos (roadmap)

### Sprint 1 - Cierre real de beta operativa
- Goal: smoke beta real verde con backend dev/reset operativo.
- Entra: cerrar `e2e:smoke:beta`, validar `returnTo`, validar focus mode, validar Today 3 acciones.
- Evidencia base: `docs/beta-ready.md:165-177`, `docs/rc-runbook.md:67-72`, `docs/release-gates.md:35-39`.

### Sprint 2 - Nutricion durable
- Goal: meal completion/logging real en backend.
- Entra: contrato BE, persistencia, multi-device truth, UI sin copy ambiguo.
- Evidencia gap actual: `apps/web/src/lib/nutritionAdherence.ts:25-137`.

### Sprint 3 - Hardening final de producto medible
- Goal: analytics real + smoke ampliado + limpieza residual de alias y admin nav.
- Entra: proveedor analytics, smoke journeys premium, habilitar gym requests admin.
- Evidencia base: `apps/web/src/lib/analytics.ts:1-26`, `apps/web/scripts/run-beta-smoke.mjs:1-22`, `apps/web/src/components/layout/navConfig.ts:153-159`.

---

## 8) Anexos

- Documentos de readiness ya alineados al estado premium actual:
  - `docs/beta-ready.md:165-177`
  - `docs/rc-runbook.md:67-72`
  - `docs/release-gates.md:35-39`
- Seguridad/secrets: no auditado en profundidad en esta pasada. **Assuncion**.
