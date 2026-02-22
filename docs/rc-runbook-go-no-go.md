# RC Runbook — GO/NO-GO operativo v1.1

**Dependency statement:** This PR can run now on origin/dev.

Objetivo: decisión de release objetiva y repetible en una sola pasada (`reset -> smoke -> checklist`) con guía de diagnóstico rápido ante fallos críticos.

## 1) Entradas obligatorias

- CI gates: `.github/workflows/pr-quality-gates.yml`
- E2E/smoke base: `docs/e2e.md`, `docs/demo-smoke-test.md`
- Checklist RC: `docs/rc-checklist.md`
- Incident tracker (SSOT): `docs/ops/incident-tracker.md`
- Triage workflow: `docs/ops/triage.md`

## 2) Stop-the-line

1. `npm run demo:reset` (2 veces) en `apps/api`.
2. Smoke completo (`docs/demo-smoke-test.md`).
3. RC checklist PASS en viewports definidos.
4. Consola limpia (0 errors).

Si falla cualquier punto: **NO-GO** y abrir/actualizar incidente en el tracker.

## 3) Diagnóstico rápido v1.1 (qué revisar si falla X)

### A) Auth/login falla

- Revisar estado de sesión/token y respuesta de login.
- Verificar errores 401/403/5xx en API auth.
- Reintentar flujo limpio tras `demo:reset`.
- Si impacto masivo: clasificar P0.

### B) Tracking write falla (`/api/tracking`)

- Confirmar status code y payload mínimo válido.
- Revisar logs de persistencia y errores 5xx.
- Validar workaround temporal (cola/reintento) si existe.
- Si usuario no puede guardar progreso: P1/P0 según alcance.

### C) Gating premium inconsistente

- Validar rol/entitlement del usuario demo.
- Contrastar comportamiento FREE vs premium en misma ruta.
- Verificar que no haya crash y que el bloqueo sea controlado.

### D) Biblioteca media no carga

- Revisar requests de media y placeholders.
- Confirmar que el listado no quede en pantalla vacía bloqueante.
- Si rompe flujo core de demo, elevar severidad.

## 4) Criterio GO / NO-GO

### GO
- Reset 2/2 OK.
- Smoke y checklist PASS.
- Console 0 errors.
- CI PASS y sin incidentes P0/P1 abiertos.

### NO-GO
- Cualquier stop-the-line en FAIL.
- Incidente P0/P1 sin mitigación verificada.

## 5) Evidencia mínima en PR

- Resultado reset/smoke/checklist.
- Links de CI/jobs y e2e/smoke.
- Referencia a incidente (si aplica) y estado final.
