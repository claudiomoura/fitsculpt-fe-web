# PR-03 — Observabilidad RC: métricas y estrategia mínima de eventos

## Dependency statement

This PR can run now on origin/dev

## Decisión de alcance

En el estado actual de este repositorio **no existe una capa de analytics de producto integrada en frontend** (no se encontró `apps/web/src/lib/analytics/*` ni wrappers tipo `trackEvent`, ni SDKs como Segment/PostHog/Mixpanel/Amplitude/gtag inicializados para eventos de producto).

Por esta razón, este PR:
- **sí** define las métricas RC y el contrato de eventos.
- **no** introduce un provider nuevo de analytics.
- **sí** documenta un **proxy operativo mínimo** usando señales ya existentes (tracking persistido + billing/entitlements).

---

## Métricas RC (definiciones exactas)

### 1) Activation D0–D2

**Qué mide:** activación inicial del usuario en el loop core.

**Cuenta cuando:**
- un usuario completa al menos 1 `core_action_completed` con persistencia exitosa
- dentro de la ventana `[signup_at, signup_at + 72h)`.

**No cuenta cuando:**
- hay click sin persistencia real;
- hay intento fallido por validación/red/backend;
- hay duplicado técnico del mismo intento (doble click/re-render).

**Fórmula:**
- Numerador: usuarios con `>=1 core_action_completed` en D0–D2.
- Denominador: usuarios registrados en el mismo cohorte/período.

---

### 2) W1 proxy (retención temprana)

**Qué mide:** regreso temprano después de activar.

**Cuenta cuando:**
- el usuario activó en D0–D2, y
- vuelve a completar `core_action_completed` en ventana D6–D8 (proxy de semana 1).

**No cuenta cuando:**
- solo abre la app sin completar acción persistida;
- repite eventos inválidos/no persistidos.

**Fórmula:**
- Numerador: usuarios activados D0–D2 con `>=1 core_action_completed` en D6–D8.
- Denominador: usuarios activados D0–D2.

---

### 3) WCAA proxy (Weekly Core Action Active)

**Qué mide:** actividad semanal del core.

**Definición:**
- un usuario es WCAA en una semana si tiene `>=1 core_action_completed` válido en esa semana.

**Convención recomendada:**
- semana ISO calendario (consistente para reporting).

**Fórmula:**
- `WCAA = usuarios con >=1 core_action_completed en semana / usuarios elegibles en semana`.

---

## Contrato mínimo de eventos (cuando exista analytics)

> No implementado en este PR por ausencia de provider. Se define contrato fuente de verdad.

### `core_action_completed`
- **Cuándo:** al confirmar éxito de persistencia de acción core desde superficie “Hoy”.
- **Props mínimas:**
  - `module` (ej. `hoy`)
  - `action_type` (tipo de acción persistida)
  - `surface` (`hoy`)
  - `plan` (si ya existe en sesión; no inventar)
  - `timestamp`

### `gated_feature_attempt`
- **Cuándo:** cuando el usuario intenta usar una funcionalidad bloqueada por gating/entitlements.
- **Props mínimas:**
  - `module`
  - `feature`
  - `surface`
  - `plan` (si ya existe)
  - `timestamp`

### `upgrade_cta_click`
- **Cuándo:** click explícito en CTA de upgrade/upsell desde estado gated.
- **Props mínimas:**
  - `module`
  - `cta_id`
  - `surface`
  - `plan` (si ya existe)
  - `timestamp`

---

## Proxy mínimo (sin analytics provider nuevo)

Hasta integrar analytics, usar este proxy para seguimiento RC:

1. **`core_action_completed` (proxy):**
   - Fuente: escrituras exitosas de tracking ya persistidas vía `/api/tracking`.
   - Consulta: backend/store de tracking (mismo origen que alimenta vistas de seguimiento y “Hoy”).

2. **Intento gated + CTA upgrade (proxy):**
   - Fuente recomendada: conteos de exposición/click en superficie gated una vez exista hook técnico.
   - Mientras no exista hook de evento, usar **proxy de negocio**:
     - volumen de usuarios elegibles por plan (`/api/billing/status`),
     - tráfico a superficies premium,
     - conversiones/starts de checkout (`/api/billing/checkout`) como señal indirecta de intención.

3. **Dónde consultar:**
   - datos operativos de tracking en backend (`/tracking` proxied por `apps/web/src/app/api/tracking/route.ts`);
   - estado de plan/billing en endpoints `apps/web/src/app/api/billing/*`.

> Nota: este proxy no reemplaza instrumentación de eventos; solo permite lectura de tendencia mientras se aprueba provider de analytics.

---

## Criterios de calidad para la futura instrumentación

- Disparo **1:1 con intención del usuario** (sin duplicados por render).
- Fail-safe: fallo de analytics nunca bloquea UX.
- Sin PII sensible en payload.
- Nombres de eventos estables (`snake_case`) y contract-first.
