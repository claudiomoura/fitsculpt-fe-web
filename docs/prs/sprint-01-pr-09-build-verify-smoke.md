# Sprint 01 — PR-09 Build Verify + Smoke

## Contexto
- Dependencias verificadas sobre el estado actual con integración de PR-07 y PR-08.
- Objetivo: validar build de `apps/api` y `apps/web`, y ejecutar smoke de detalle de ejercicio.

## Build evidence

### API (`apps/api`)
Comando ejecutado:

```bash
npm run build
```

Resultado:
- **FAIL por dependencia externa de Prisma engines**.
- Error observado: `403 Forbidden` al descargar `libquery_engine` desde `https://binaries.prisma.sh/...`.
- No se aplicó workaround estructural para evitar cambios de alcance en este PR de verificación.

### Web (`apps/web`)
Comando ejecutado:

```bash
npm run build
```

Resultado final:
- **PASS**.
- Se aplicaron fixes mínimos de tipado para destrabar compilación TypeScript en `ExerciseDetailClient`, `TrainingPlanClient`, `FeedClient`, `NutritionPlanClient`, `TrackingClient` y `AppUserBadge`.

## Smoke mínimo — detalle de ejercicio

Ruta validada:
- `http://localhost:3000/app/biblioteca/invalid-id`

Resultado:
- La navegación resuelve al flujo esperado (redirección a login sin sesión), confirmando que la ruta de detalle de ejercicio responde en runtime.
- Captura tomada durante smoke:
  - `browser:/tmp/codex_browser_invocations/1e02231167268de7/artifacts/artifacts/pr09-smoke-exercise-detail.png`

## Notas
- En entorno local sin backend levantado, `GET /api/auth/me` devolvió `500` con `ECONNREFUSED`; no bloquea la validación de routing/smoke visual del detalle.
