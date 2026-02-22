# Cómo reportar regresiones (demo / QA)

Objetivo: reportar regresiones con información suficiente para reproducir, priorizar y asignar sin idas y vueltas.

## Cuándo reportar

Reportar como **regression** cuando un flujo que antes funcionaba ahora:
- falla,
- se degrada,
- o se comporta distinto sin cambio intencional.

## Regla operativa

- Reportar en el momento.
- Si afecta demo en vivo, priorizar evidencia mínima y abrir reporte antes de intentar cualquier fix.

## Plantilla (copiar / pegar)

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
- Request payload (si aplica):
- Response (fragmento relevante):

**Screenshot / video**
- Adjuntar evidencia visual (mínimo 1 screenshot)

**Impact / severity**
- [ ] Blocker (rompe demo o flujo crítico)
- [ ] High
- [ ] Medium
- [ ] Low

**Notes**
- workaround temporal (si existe):
- alcance (solo demo / también producción / unknown):
```

## Criterio de calidad mínimo

Un reporte está completo si incluye:
- pasos reproducibles,
- expected vs actual,
- consola,
- endpoint afectado (si aplica),
- evidencia visual.

## Ejemplo corto

- **Title:** `[Regression] /app/hoy: botón iniciar no persiste tras refresh`
- **Expected:** al refrescar, estado de sesión iniciado se mantiene.
- **Actual:** vuelve a estado inicial y muestra spinner infinito.
- **Endpoint:** `POST /workouts/:id/start` → `500`.
