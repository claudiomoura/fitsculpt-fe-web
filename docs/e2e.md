# E2E ligero (Playwright)

Dependency statement: **This PR depends on PR-01 being merged (and is recommended after PR-02)**.

## Qué cubre

- `apps/web/e2e/core-loop.spec.ts`
  - Login con usuario demo.
  - Navegación a `Hoy`.
  - Ejecuta 1 acción rápida (`Completar acción de hoy`).
  - Verifica persistencia en `/api/tracking` antes y después de recargar.

## Pre-requisitos

1. Backend corriendo en `http://127.0.0.1:4000`.
2. Frontend (Next.js) se levanta automáticamente desde Playwright con `npm run dev`.
3. Endpoint de reset demo habilitado (`POST /dev/reset-demo`) para evitar flakiness.

## Variables opcionales

```bash
export E2E_BASE_URL=http://127.0.0.1:3000
export E2E_BACKEND_URL=http://127.0.0.1:4000
export E2E_DEMO_USER_EMAIL=demo.user@fitsculpt.local
export E2E_DEMO_USER_PASSWORD=DemoUser123!
```

## Cómo correr local

Desde `apps/web`:

```bash
npm run e2e
```

Modo headed:

```bash
npm run e2e:headed
```

## Nota CI

Existe un job dedicado de smoke en `.github/workflows/e2e-smoke.yml` que levanta API + web para validar estos flujos en pull requests.
