# PR-03 — Observabilidad: definición de métricas RC e instrumentación mínima

## Estado actual del repositorio

**Conclusión:** hoy no existe una capa de analytics integrada en frontend para emitir eventos de producto (p. ej. `trackEvent`, `analytics.capture`, `gtag`, Segment, Mixpanel, PostHog).

Verificación realizada:
- Búsqueda de términos de tracking/eventos en `apps/web/src` sin resultados implementables de analytics.
- No se encontró carpeta o módulo de analytics en rutas equivalentes a `front/src/lib/analytics/*` o `front/src/services/analytics/*` dentro de este repo (estructura real: `apps/web/src/...`).

Por lo tanto, este PR **no inventa** un sistema nuevo; deja la definición de métricas y el contrato de eventos para implementar en un PR posterior.

## Dependency statement

**This PR can run now on origin/dev**

## Métricas RC (definiciones exactas)

> Objetivo: medir proxies de activación y capturar señales de intención de upgrade sin bloquear desarrollo.

### 1) Activation D0–D2

**Definición (usuario):**
Usuario registrado que completa al menos una `core action` dentro de los primeros 3 días desde `signup_at` (ventana inclusiva D0, D1, D2).

- **Cuenta como `core action`:** evento `core_action_completed` con persistencia exitosa de acción del loop principal “Hoy”.
- **No cuenta:** clicks UI sin persistencia, errores de red/API, navegación pasiva, eventos duplicados por re-render.

**Fórmula:**
- Numerador: usuarios con ≥1 `core_action_completed` en `[signup_at, signup_at + 72h)`.
- Denominador: usuarios registrados en el período analizado.

### 2) W1 proxy (retención temprana)

**Definición (usuario):**
Usuario que, además de activar en D0–D2, vuelve a completar una `core action` en ventana de semana 1.

- **Ventana W1:** día 7 ± 1 día (D6–D8) para tolerar variación horaria/uso.
- **Evento base:** `core_action_completed`.

**Fórmula sugerida:**
- Numerador: usuarios activados en D0–D2 con ≥1 `core_action_completed` en D6–D8.
- Denominador: usuarios activados en D0–D2.

### 3) WCAA proxy (Weekly Core Action Active)

**Definición (usuario-semana):**
Usuario activo semanal si realiza ≥1 `core_action_completed` en la semana calendario (o rolling 7 días, elegir una convención y mantenerla).

- **Recomendación inicial:** semana calendario ISO para reportes simples.
- **No cuenta:** eventos no persistidos o inválidos.

**Fórmula:**
- WCAA = `# usuarios con >=1 core_action_completed en la semana / # usuarios elegibles en la semana`.

## Taxonomía mínima de eventos (contrato)

> Estos eventos se deben emitir **cuando exista provider/capa analytics**.

### `core_action_completed`

- **Cuándo:** al confirmar persistencia de acción del core loop (Hoy).
- **Lugar esperado:** `apps/web/src/app/(app)/app/hoy/*` en el punto posterior a éxito de guardado.
- **Props mínimas:**
  - `action_type` (string corto: tipo de acción del loop)
  - `surface` = `"hoy"`
  - `plan` (si está disponible de forma real en sesión: `FREE | STRENGTH_AI | NUTRI_AI | PRO`)
  - `timestamp`

### `gated_intent`

- **Cuándo:** usuario intenta acceder/ejecutar feature bloqueada por entitlements.
- **Lugar esperado:** componente de gating (ej. `FeatureGate` o equivalente).
- **Props mínimas:**
  - `feature` (entitlement solicitado)
  - `surface` (pantalla/componente)
  - `plan` (si está disponible de forma real)
  - `timestamp`

### `upgrade_cta_click`

- **Cuándo:** click explícito en CTA de upgrade desde contexto bloqueado/upsell.
- **Lugar esperado:** CTA de upgrade (actualmente se renderiza vía `EmptyState.actions` en gating).
- **Props mínimas:**
  - `cta_id` (identificador del botón/ubicación)
  - `surface`
  - `plan` (si está disponible de forma real)
  - `timestamp`

## Reglas de calidad de instrumentación

- Emitir evento **una sola vez por acción de usuario** (evitar dobles disparos por re-render).
- Nunca bloquear UX si falla analytics (best effort, fire-and-forget).
- No enviar PII sensible en props de evento.
- Mantener naming estable y versionar cambios breaking en esquema.

## Requiere implementación (siguiente PR)

Como en esta base no hay provider de analytics ya integrado, quedan pendientes:

1. Crear una utilidad mínima de tracking (`trackEvent`) o adaptar provider existente cuando se apruebe (Segment/GA/PostHog/etc.).
2. Instrumentar los 3 puntos mínimos:
   - éxito de persistencia en “Hoy” → `core_action_completed`
   - intento de acceso bloqueado → `gated_intent`
   - click en CTA upgrade → `upgrade_cta_click`
3. Validar disparos por debug console/network/provider dashboard.
4. Añadir pruebas unitarias o de integración para evitar regressions de doble-disparo.

---

Si en una rama paralela ya aparece un módulo analytics, este documento sirve como contrato fuente de verdad para conectar eventos sin cambiar definiciones de negocio.
