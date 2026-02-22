# RC Runbook (final) — reset → smoke → checklist + go/no-go

**Dependency statement:** This PR depends on PR-01 and PR-02 being merged (and PR-03 if instrumentation is included).

Objetivo: ejecutar la validación de RC de forma operativa y repetible sin depender del founder.

## Entradas obligatorias

1. Reset demo: `docs/demo-reset.md`
2. Smoke RC: `docs/demo-smoke-test.md`
3. Checklist mobile RC: `docs/rc-checklist.md`

## Flujo operativo (una corrida completa)

1. **Reset demo (stop the line)**
   - Ejecutar `npm run demo:reset` dos veces en `apps/api`.
   - Si no termina en OK dos veces seguidas: **NO-GO**.
2. **Smoke RC (stop the line)**
   - Ejecutar flujo completo de `docs/demo-smoke-test.md`.
   - Si falla login, guard de `/app`, persistencia o entitlements FREE vs premium: **NO-GO**.
3. **Checklist RC mobile (stop the line)**
   - Completar `docs/rc-checklist.md` en 2 viewports: `375x812` y `390x844`.
   - Si cualquier check aplicable queda FAIL: **NO-GO**.
4. **Consola limpia (stop the line)**
   - Durante toda la corrida: **0 console errors**.
   - Si aparece 1 error de consola: **NO-GO**.

## Criterios go/no-go

### GO (todos obligatorios)
- Reset demo idempotente verificado (2/2 OK).
- Smoke RC completo en PASS.
- RC checklist mobile en PASS en ambos viewports.
- Consola limpia (0 errors) durante la corrida.
- CI del PR en PASS (build/lint/typecheck/tests definidos por pipeline).

### NO-GO (cualquier condición)
- Falla cualquier paso marcado como **stop the line**.
- CI en rojo.
- No hay evidencia suficiente adjunta en el PR.

## Evidencias mínimas en PR description

Adjuntar estos artefactos (links o imágenes):
- Checklist RC completado (PASS/FAIL por viewport).
- 2 viewports con evidencia visual (`375x812` y `390x844`).
- Captura de consola final sin errores.
- Links a ejecución de CI y pruebas relevantes.

Plantilla rápida:

```md
## RC Evidence
- Reset demo (2x): PASS/FAIL + output
- Smoke RC: PASS/FAIL + notas
- RC checklist mobile: PASS/FAIL (375x812, 390x844)
- Console: 0 errors (adjuntar captura)
- CI links: <url>
- Test links/artifacts: <url>
```

## Resultado de esta versión

Este documento se considera la guía **final de ejecución RC** para cierre de demo/release.
