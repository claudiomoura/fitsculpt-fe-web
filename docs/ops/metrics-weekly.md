# PR-02 — Reporte semanal de métricas (Activation D0–D2, WCAA proxy, W1 proxy)

## Dependency statement

This PR can run now on origin/dev

## Objetivo

Definir un tablero/reporte semanal operable hoy para monitorear señales post-release, sin introducir plataforma nueva:

- Activation D0–D2
- WCAA proxy
- W1 proxy

> Estado de fuente actual: no hay capa dedicada de analytics de producto integrada en frontend; se usa proxy con datos persistidos y endpoints existentes.

---

## Fuente disponible hoy (confirmada)

1. **Tracking persistido**
   - Web proxy: `GET/PUT/POST /api/tracking`.
   - Backend real: `GET/PUT/POST /tracking`.
   - Uso: fuente para actividad/core action proxy con persistencia.

2. **Billing/plan para contexto elegibilidad y señal indirecta de upgrade**
   - Web proxy: `/api/billing/status`, `/api/billing/checkout`.
   - Backend real: `/billing/status`, `/billing/checkout`.

3. **Analytics de eventos de producto dedicado**
   - **No disponible en esta base** (Requiere implementación).

---

## Definiciones operativas del reporte semanal

> Semana recomendada: ISO week (Lunes 00:00:00 a Domingo 23:59:59, TZ fija del reporte).

### 1) Activation D0–D2

- **Definición:** % de usuarios nuevos que completan al menos 1 acción core persistida dentro de las primeras 72h desde signup.
- **Fórmula:**
  - Numerador: usuarios con `>=1 core action` en `[signup_at, signup_at + 72h)`.
  - Denominador: usuarios con `signup_at` dentro del cohorte semanal.
- **Fuente hoy:** proxy sobre tracking persistido (`/tracking`) + fecha de alta de usuario desde tablas internas ya existentes.
- **Fecha de corte:** cierre de semana ISO (ejemplo en tabla inferior).
- **Limitación:** no existe evento explícito `core_action_completed`; se usa inferencia por escrituras válidas de tracking.

### 2) WCAA proxy (Weekly Core Action Active)

- **Definición:** % de usuarios elegibles con al menos 1 acción core persistida durante la semana.
- **Fórmula:**
  - Numerador: usuarios con `>=1 core action` persistida en la semana.
  - Denominador: usuarios elegibles en la semana (definición operativa acordada por PM/Data).
- **Fuente hoy:** tracking persistido (`/tracking`).
- **Fecha de corte:** cierre de semana ISO.
- **Limitación:** al no existir taxonomía final de eventos en producción, no se separa perfectamente tipo de acción core por superficie/módulo.

### 3) W1 proxy

- **Definición:** % de usuarios activados en D0–D2 que vuelven a completar al menos 1 acción core en ventana D6–D8.
- **Fórmula:**
  - Numerador: usuarios activados D0–D2 con `>=1 core action` en D6–D8.
  - Denominador: usuarios activados D0–D2.
- **Fuente hoy:** tracking persistido (`/tracking`) + fecha de alta de usuario.
- **Fecha de corte:** semanal, evaluando cohortes cuyo D8 ya cerró al momento del corte.
- **Limitación:** la ventana D6–D8 es proxy; puede sub/over-estimar retención real semanal por zona horaria y patrón de uso.

---

## Formato de reporte semanal (2 cortes comparables)

> Completar cada lunes con el corte de la semana cerrada. Mantener Week N y Week N+1 para comparación directa.

| Métrica | Week N (corte YYYY-MM-DD) | Week N+1 (corte YYYY-MM-DD) | Δ abs | Δ % | Fuente | Limitación |
|---|---:|---:|---:|---:|---|---|
| Activation D0–D2 | TBD | TBD | TBD | TBD | Tracking persistido + signup interno | Proxy por ausencia de evento dedicado |
| WCAA proxy | TBD | TBD | TBD | TBD | Tracking persistido | Elegibilidad puede variar si cambia regla |
| W1 proxy | TBD | TBD | TBD | TBD | Tracking persistido + signup interno | D6–D8 proxy |

---

## Ejemplo de corte semanal (parcial, formato listo)

> Ejemplo operativo (valores ilustrativos hasta conectar query/report automático).

**Corte:** 2026-02-22 (ISO week 2026-W08)

| Métrica | Valor corte | Fuente usada | Estado |
|---|---:|---|---|
| Activation D0–D2 | TBD | `/tracking` + cohortes por `signup_at` | Parcial (manual/proxy) |
| WCAA proxy | TBD | `/tracking` semanal | Parcial (manual/proxy) |
| W1 proxy | TBD | `/tracking` D6–D8 + cohortes | Parcial (manual/proxy) |

---

## Procedimiento temporal manual (hasta extracción automatizada)

1. Definir ventana semanal ISO y timezone fija del reporte.
2. Extraer cohorte de signup semanal desde fuente interna disponible.
3. Cruce con tracking persistido para detectar acciones core válidas.
4. Calcular Activation D0–D2, WCAA proxy y W1 proxy.
5. Volcar resultados en la tabla de “2 cortes comparables”.
6. Documentar explícitamente limitaciones del corte.

---

## Fuente y limitaciones

- **Fuente primaria actual:** endpoints/proxy de tracking y billing existentes en web/backend.
- **Sin plataforma nueva:** este reporte no agrega provider de analytics ni nuevos endpoints.
- **Limitación principal:** sin eventos dedicados (`core_action_completed`, `upgrade_cta_click`) en producción, las métricas dependen de proxy sobre persistencia y cohorte.
- **Requiere implementación (futuro):** extracción automatizada reproducible (script/job) y contrato de eventos de producto para reducir ambigüedad.


## Instrumentación mínima Weekly Review (PR-04)

Para cerrar MVP medible de Weekly Review sin introducir plataforma nueva:

- Evento de apertura: `weekly_review_opened`
- Evento de decisión: `weekly_review_recommendation_decision` con `decision=accepted|dismissed` y `recommendationId`

### Dónde se registra hoy (proxy sin analytics externo)

- Cliente web guarda eventos en `localStorage` con key: `fitsculpt.weeklyReview.events`.
- Se conserva un buffer acotado (últimos 50 eventos) para validación QA/manual.
- También se emite `CustomEvent("fitsculpt:weekly-review-telemetry")` para debug local.

### Cómo validar rápido

1. Abrir `/app/weekly-review`.
2. En DevTools, inspeccionar `localStorage.getItem("fitsculpt.weeklyReview.events")`.
3. Pulsar `Accept` y `Not now` en recomendaciones disponibles.
4. Confirmar que se agregan eventos de `decision` con `recommendationId` y timestamp.

### Relación con métricas sprint 6/8

- Estos eventos no sustituyen WCAA proxy/Activation/W1; sirven como señal de interacción sobre la capa de recomendaciones semanales.
- El cálculo oficial semanal mantiene las definiciones de `docs/metrics-definition.md` y este runbook (`Activation D0–D2`, `WCAA proxy`, `W1 proxy`).
