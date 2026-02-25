# E2E Smoke RC (demo safety)

Dependency statement: **This PR depends on PR-01 being merged**.

## Objetivo

Agregar una barrera mínima automatizada para detectar regresiones que rompan el demo core.

## Flujos cubiertos

1. `core-loop.spec.ts`
   - Login con usuario demo.
   - Navegación a `Hoy`.
   - Ejecuta una acción rápida.
   - Verifica persistencia en tracking incluso tras `reload`.
2. `library-smoke.spec.ts`
   - Login con usuario demo.
   - Navegación a Biblioteca (lista).
   - Apertura de detalle de ejercicio.

## Anti-flaky aplicado

- Reset de dataset demo al inicio de cada test (`POST /dev/reset-demo`).
- Selectores y aserciones sobre UI/requests críticas del flujo.
- Polling de persistencia para tracking en lugar de sleeps fijos.

## Validación de consola

Cada smoke adjunta un colector de errores y falla si detecta:

- `console.error(...)`
- `pageerror` (errores runtime no capturados)

## Precondiciones

- API disponible en `http://127.0.0.1:4000`.
- Frontend levantado por Playwright en `http://127.0.0.1:3000`.
- Dataset demo reseteable con `/dev/reset-demo`.

## Comandos

Desde repo root:

```bash
npm --prefix apps/web run e2e
```

Desde `apps/web`:

```bash
npm run e2e
```

## CI job

Workflow: `.github/workflows/e2e-smoke.yml`

- Instala dependencias API + Web.
- Bootstrap de DB API.
- Levanta API y espera `/health`.
- Instala navegador Chromium de Playwright.
- Ejecuta smoke E2E y sube artifacts (`playwright-report`, `test-results`, logs de API).

## Evidencia requerida en PR

- Output del job E2E smoke en PASS.
- Artifact/video/screenshot generado por Playwright (si aplica).
- Flujos cubiertos y precondiciones usadas.
