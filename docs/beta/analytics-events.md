# Beta analytics events

Estado actual: en este repo no hay proveedor de analytics de producto conectado en frontend.

Para no bloquear instrumentación mínima de `/app/hoy`, se usa un stub local `trackEvent()` en:

- `apps/web/src/lib/analytics.ts`

> TODO — Requiere implementación: conectar proveedor real (Segment/PostHog/GA/etc.) y reemplazar el noop.

## Eventos instrumentados en `/app/hoy`

### `today_view`

- Cuándo: al montar la vista de Hoy (`TodayQuickActionsClient`), una sola vez por montaje.
- Props mínimas: ninguna.

### `today_cta_click`

- Cuándo: al hacer click en cada CTA principal de las 3 cards del hub.
- Props mínimas:
  - `target: "training" | "nutrition" | "checkin"`

## Puntos de disparo

- `apps/web/src/app/(app)/app/hoy/TodayQuickActionsClient.tsx`
  - `trackEvent("today_view")`
  - `trackEvent("today_cta_click", { target })` para training/nutrition/checkin.
- `apps/web/src/app/(app)/app/hoy/TodayCard.tsx`
  - callback `onCtaClick` para disparar evento en links y botón.

