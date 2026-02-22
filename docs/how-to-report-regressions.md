# How to report regressions (demo / QA)

Objetivo: reportar regresiones con contexto suficiente para reproducir y priorizar sin idas y vueltas.

## Regla rápida

- Si un flujo que antes funcionaba ahora falla o se degrada, reportarlo como **regression**.
- Reportar en el momento con evidencia mínima.

## Plantilla breve (copiar/pegar)

```md
## Regression report

**Title**
[Regression] <area>: <resumen corto>

**Environment**
- Branch/commit:
- URL:
- Role/user:
- Fecha/hora:

**Steps to reproduce**
1.
2.
3.

**Expected result**
-

**Actual result**
-

**Console errors**
- [ ] No console errors
- [ ] Yes (paste exact error)

```text
<paste de consola>
```

**Network / endpoint affected**
- Method + URL:
- Status code:
- Response (relevante):

**Screenshot / video**
- Adjuntar evidencia visual (1 imagen mínima)

**Impact / severity**
- [ ] Blocker (rompe demo o flujo crítico)
- [ ] High
- [ ] Medium
- [ ] Low

**Notes**
- workaround temporal (si existe):
```

## Calidad mínima del reporte

Un reporte de regresión está completo cuando incluye:

- Pasos reproducibles.
- Expected vs Actual.
- Consola (o confirmación de que no hubo errores).
- Endpoint afectado (si aplica).
- Screenshot o video corto.
